import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireLock, isStale, type LockOwner } from './lib/lock.ts';
import { run } from './lib/run.ts';

const minute = 60_000;
const lockModule = new URL('./lib/lock.ts', import.meta.url).href;

describe('isStale', () => {
  const owner: LockOwner = { pid: 42, runId: 'r1', startedAt: 1_000_000 };
  const alive = () => true;
  const dead = () => false;

  it('is false for a live owner that took the lock recently', () => {
    expect(isStale(owner, owner.startedAt + minute, alive, 15 * minute)).toBe(false);
  });

  it('is true when the owner process is gone', () => {
    expect(isStale(owner, owner.startedAt + minute, dead, 15 * minute)).toBe(true);
  });

  it('is true after more than 15 minutes, even if the pid is alive (Windows reuses pids)', () => {
    expect(isStale(owner, owner.startedAt + 15 * minute + 1, alive, 15 * minute)).toBe(true);
  });
});

describe('a lock two processes fight over (T-9)', { timeout: 30_000 }, () => {
  let dir: string;
  let holder: ReturnType<typeof spawn> | undefined;

  afterEach(() => {
    holder?.kill();
    holder = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  /** A script that takes the lock at `lockDir` with the given wait limit, in its own process. */
  const script = (lockDir: string, runId: string, waitMs: number, then: string) =>
    `const { acquireLock } = await import(${JSON.stringify(lockModule)});
     await acquireLock(${JSON.stringify(lockDir)}, { runId: ${JSON.stringify(runId)}, waitMs: ${waitMs}, pollMs: 100 });
     ${then}`;

  it('makes the second run say it waits, then fail with the holder named once the limit passes', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    holder = spawn(process.execPath, ['--input-type=module', '-e', script(lockDir, 'first', 1_000, "console.log('held'); setInterval(() => {}, 1_000);")]);
    await new Promise<void>((resolve, reject) => {
      holder!.stdout!.on('data', (chunk: Buffer) => chunk.toString().includes('held') && resolve());
      holder!.on('exit', (code) => reject(new Error(`holder exited with ${code}`)));
    });

    const second = run(process.execPath, ['--input-type=module', '-e', script(lockDir, 'second', 1_000, "console.log('ran');")]);

    expect(second.code).not.toBe(0);
    expect(second.output).toContain(`waiting for another npm test (pid ${holder.pid}`);
    expect(second.output).toContain(`another npm test (pid ${holder.pid}) has held ${lockDir} since`);
    expect(second.output).not.toContain('ran');
  });

  it('removes an orphan lock left by a dead process and takes it', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    const deadPid = spawnSync(process.execPath, ['-e', '']).pid!;
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'owner.json'), JSON.stringify({ pid: deadPid, runId: 'dead', startedAt: Date.now() }));

    // A short limit: without orphan removal this fails in a second instead of hanging for ten minutes.
    const release = await acquireLock(lockDir, { runId: 'alive', waitMs: 1_000, pollMs: 100, log: () => {} });

    expect(JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8')).runId).toBe('alive');
    release();
    expect(existsSync(lockDir)).toBe(false);
  });

  it('releases only a lock that is still its own', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    const release = await acquireLock(lockDir, { runId: 'mine', waitMs: 1_000, pollMs: 100, log: () => {} });
    writeFileSync(join(lockDir, 'owner.json'), JSON.stringify({ pid: process.pid, runId: 'someone-else', startedAt: Date.now() }));

    release();

    expect(existsSync(lockDir)).toBe(true);
  });

  const deadOwner = () => ({ pid: spawnSync(process.execPath, ['-e', '']).pid!, runId: 'dead', startedAt: Date.now() });

  it('does not delete a lock a rival took while this run was reclaiming a dead one', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'owner.json'), JSON.stringify(deadOwner()));
    // The rival (A) replaces the dead lock after B read it and before B removes it.
    const rival = { pid: process.pid, runId: 'A', startedAt: Date.now() };
    const beforeReclaim = () => {
      rmSync(lockDir, { recursive: true, force: true });
      mkdirSync(lockDir);
      writeFileSync(join(lockDir, 'owner.json'), JSON.stringify(rival));
    };

    await expect(acquireLock(lockDir, { runId: 'B', waitMs: 500, pollMs: 50, beforeReclaim, log: () => {} })).rejects.toThrow('pid ' + process.pid);

    expect(JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8')).runId).toBe('A');
  });

  it('takes a lock whose owner.json was never written once the folder is old', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    mkdirSync(lockDir);
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockDir, old, old);

    const release = await acquireLock(lockDir, { runId: 'alive', waitMs: 1_000, pollMs: 50, log: () => {} });

    expect(JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8')).runId).toBe('alive');
    release();
  });

  it('keeps waiting for a lock without owner.json that is still new', async () => {
    dir = mkdtempSync(join(tmpdir(), 'cm-lock-'));
    const lockDir = join(dir, '.museum-test-lock');
    mkdirSync(lockDir);

    await expect(acquireLock(lockDir, { runId: 'alive', waitMs: 300, pollMs: 50, log: () => {} })).rejects.toThrow('pid unknown');
  });
});
