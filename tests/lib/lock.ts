import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export type LockOwner = { pid: number; runId: string; startedAt: number };

export type LockOptions = {
  runId: string;
  /** How long to wait for another run before failing; 10 minutes by default. */
  waitMs?: number;
  pollMs?: number;
  /** Older than this, a lock is an orphan even if its pid is alive; 15 minutes by default. */
  maxAgeMs?: number;
  log?: (message: string) => void;
};

/** True when the lock's owner no longer runs, or took it more than `maxAgeMs` ago. */
export function isStale(owner: LockOwner, now: number, isAlive: (pid: number) => boolean, maxAgeMs: number): boolean {
  return !isAlive(owner.pid) || now - owner.startedAt > maxAgeMs;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

function readOwner(lockDir: string): LockOwner | undefined {
  try {
    return JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8'));
  } catch {
    // Taken a moment ago and owner.json not written yet: treat it as held.
    return undefined;
  }
}

/**
 * Takes the lock at `lockDir` (an atomic mkdir), waiting while another live run holds it and
 * removing an orphan. Returns the release, which deletes the lock only if it is still this run's.
 */
export async function acquireLock(lockDir: string, options: LockOptions): Promise<() => void> {
  const { runId, waitMs = 10 * 60_000, pollMs = 2_000, maxAgeMs = 15 * 60_000, log = console.log } = options;
  const deadline = Date.now() + waitMs;
  let warned = false;

  for (;;) {
    try {
      mkdirSync(lockDir);
      const owner: LockOwner = { pid: process.pid, runId, startedAt: Date.now() };
      writeFileSync(join(lockDir, 'owner.json'), JSON.stringify(owner));
      return () => {
        if (readOwner(lockDir)?.runId === runId) rmSync(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }

    const owner = readOwner(lockDir);
    if (owner && isStale(owner, Date.now(), isAlive, maxAgeMs)) {
      rmSync(lockDir, { recursive: true, force: true });
      continue;
    }
    const holder = owner ? `pid ${owner.pid}` : 'pid unknown';
    const since = owner ? new Date(owner.startedAt).toISOString() : 'just now';
    if (!warned) {
      log(`waiting for another npm test (${holder}, since ${since})`);
      warned = true;
    }
    if (Date.now() >= deadline) {
      throw new Error(`another npm test (${holder}) has held ${lockDir} since ${since}; wait for it to finish, or delete that folder if it died`);
    }
    await sleep(pollMs);
  }
}
