import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, parseProcesses, userDataDir, writeOwner, type Processes } from './lib/cleanup.ts';

// Spec 017, RF-10, as data: every case runs against a throwaway folder that stands in for %TEMP%, with
// fake owners and fake processes. Nothing here lists, deletes or closes anything real.
const HOUR = 3_600_000;
const PROFILE = 'playwright_chromiumdev_profile-';

let temp: string;
let killed: number[];
/** The pids that "live" in the fake system. */
let alive: Set<number>;
let processes: Processes;

beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), 'museum-cleanup-test-'));
  killed = [];
  alive = new Set([100]);
  processes = [];
});
afterEach(() => rmSync(temp, { recursive: true, force: true }));

const run = () =>
  cleanup({
    temp,
    isAlive: (pid) => alive.has(pid),
    processes: () => processes,
    kill: (pid) => {
      killed.push(pid);
      alive.delete(pid);
    },
  });

const folder = (name: string, ageHours = 0) => {
  const dir = join(temp, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'file.txt'), 'x');
  const when = new Date(Date.now() - ageHours * HOUR);
  utimesSync(dir, when, when);
  return dir;
};
const owned = (name: string, pid: number) => {
  const dir = folder(name);
  writeOwner(dir, { runId: name, pid });
  return dir;
};
const edge = (pid: number, parentPid: number, dir: string, name = 'msedge.exe') => ({
  pid,
  parentPid,
  name,
  commandLine: `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --user-data-dir=${dir} --no-first-run`,
});

describe('RF-10: the cm-* folders', () => {
  it('removes the folder of a dead run and keeps the one of a live run', () => {
    const dead = owned('cm-aaaa0000', 999);
    const live = owned('cm-bbbb0000', 100);
    run();
    expect(existsSync(dead)).toBe(false);
    expect(existsSync(live)).toBe(true);
  });

  it('keeps a recent folder with no readable owner, and one whose owner.json is garbage', () => {
    const none = folder('cm-cccc0000');
    const garbage = folder('cm-dddd0000');
    writeFileSync(join(garbage, 'owner.json'), '{not json');
    const noPid = folder('cm-eeee0000');
    writeFileSync(join(noPid, 'owner.json'), JSON.stringify({ runId: 'x' }));
    run();
    expect([none, garbage, noPid].map(existsSync)).toEqual([true, true, true]);
  });

  it('removes a folder with no readable owner once it is older than 24 hours', () => {
    const old = folder('cm-ffff0000', 25);
    const recent = folder('cm-ffff1111', 23);
    run();
    expect(existsSync(old)).toBe(false);
    expect(existsSync(recent)).toBe(true);
  });

  it('touches nothing that is not a cm-* folder directly in the temp folder', () => {
    const other = owned('other-aaaa0000', 999);
    const prefixed = owned('xcm-aaaa0000', 999);
    const file = join(temp, 'cm-file');
    writeFileSync(file, 'x');
    const nested = owned('keep/cm-aaaa0000', 999);
    run();
    expect([other, prefixed, file, nested].map(existsSync)).toEqual([true, true, true, true]);
  });

  it('writeOwner leaves the pid and the run id that cleanup reads', () => {
    const dir = join(temp, 'cm-gggg0000');
    writeOwner(dir, { runId: 'gggg0000', pid: 100 });
    expect(JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8'))).toEqual({ runId: 'gggg0000', pid: 100 });
  });
});

describe('RF-10: the Edge of the tests', () => {
  it('closes, by pid, the Edge of a Playwright profile in temp whose launcher is dead', () => {
    const profile = folder(`${PROFILE}orphan`);
    processes = [edge(500, 999, profile), edge(501, 500, profile)];
    alive.add(500).add(501);
    run();
    // Only the root: its child has a live parent (the root), and the tree goes with the root.
    expect(killed).toEqual([500]);
  });

  it('a kill that throws does not stop the cleanup, and that Edge does not count as closed', () => {
    const dead = owned('cm-dead', 999);
    const stuck = folder(`${PROFILE}stuck`);
    const closed = folder(`${PROFILE}closed`);
    processes = [edge(800, 999, stuck), edge(801, 999, closed)];
    alive.add(800).add(801);
    const result = cleanup({
      temp,
      isAlive: (pid) => alive.has(pid),
      processes: () => processes,
      kill: (pid) => {
        if (pid === 800) throw new Error('taskkill failed');
        alive.delete(pid);
      },
    });
    expect(result.edges).toEqual([801]);
    expect([dead, stuck, closed].map(existsSync)).toEqual([false, true, false]);
  });

  it('keeps the Edge whose launcher lives, and its profile', () => {
    const profile = folder(`${PROFILE}running`, 5);
    processes = [edge(500, 100, profile)];
    alive.add(500);
    run();
    expect(killed).toEqual([]);
    expect(existsSync(profile)).toBe(true);
  });

  it('never closes the Edge of the user: no profile of Playwright, or not directly in temp', () => {
    const elsewhere = join(temp, 'nested', `${PROFILE}x`);
    mkdirSync(elsewhere, { recursive: true });
    processes = [
      edge(600, 999, 'C:\\Users\\<user>\\AppData\\Local\\Microsoft\\Edge\\User Data'),
      edge(601, 999, join(temp, 'Default')),
      edge(602, 999, elsewhere),
      { pid: 603, parentPid: 999, name: 'msedge.exe', commandLine: '"msedge.exe"' },
      { pid: 604, parentPid: 999, name: 'msedge.exe', commandLine: '' },
      edge(605, 999, folder(`${PROFILE}orphan2`), 'chrome.exe'),
    ];
    run();
    expect(killed).toEqual([]);
  });

  it('removes the profiles no live Edge uses, and the ones of the Edge it just closed', () => {
    const used = folder(`${PROFILE}used`, 5);
    const unused = folder(`${PROFILE}unused`, 5);
    const closed = folder(`${PROFILE}closed`);
    const fresh = folder(`${PROFILE}fresh`);
    processes = [edge(700, 100, used), edge(701, 999, closed)];
    alive.add(700).add(701);
    run();
    expect([used, unused, closed, fresh].map(existsSync)).toEqual([true, false, false, true]);
  });

  it('removes only profiles directly in temp', () => {
    const nested = folder(`keep/${PROFILE}old`, 5);
    const other = folder('playwright-artifacts-old', 5);
    run();
    expect([nested, other].map(existsSync)).toEqual([true, true]);
  });
});

describe('RF-10: reading the process list', () => {
  it('takes the user data dir with or without quotes', () => {
    expect(userDataDir('msedge.exe --user-data-dir=C:\\a\\b --x')).toBe('C:\\a\\b');
    expect(userDataDir('msedge.exe --user-data-dir="C:\\a b\\c" --x')).toBe('C:\\a b\\c');
    expect(userDataDir('msedge.exe')).toBeUndefined();
    expect(userDataDir('')).toBeUndefined();
  });

  it('parses one process, many, none and an empty output', () => {
    const one = { ProcessId: 1, ParentProcessId: 2, Name: 'msedge.exe', CommandLine: 'c' };
    expect(parseProcesses(JSON.stringify(one))).toEqual([{ pid: 1, parentPid: 2, name: 'msedge.exe', commandLine: 'c' }]);
    expect(parseProcesses(JSON.stringify([one, { ...one, ProcessId: 3, CommandLine: null }])).map((p) => [p.pid, p.commandLine])).toEqual([
      [1, 'c'],
      [3, ''],
    ]);
    expect(parseProcesses('')).toEqual([]);
    expect(parseProcesses('[]')).toEqual([]);
  });
});
