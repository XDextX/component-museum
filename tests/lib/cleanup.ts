import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

// Spec 017, RF-10. A run that is cut leaves its `cm-*` folders, its Edge and Playwright's profile in %TEMP%.
// This clears what belongs to a dead run, and nothing else: when in doubt, it keeps.

export type Process = { pid: number; parentPid: number; name: string; commandLine: string };
export type Processes = Process[];

export type CleanupOptions = {
  /** The folder to clean: %TEMP% in a run, a throwaway folder in the tests. */
  temp: string;
  isAlive: (pid: number) => boolean;
  /** Every process, not only Edge: the name is filtered here. */
  processes: () => Processes;
  /** Closes the process `pid` and its children. */
  kill: (pid: number) => void;
  now?: () => number;
  /** A `cm-*` folder with no readable owner is left until it is this old; 24 hours by default. */
  maxAgeMs?: number;
  /** A profile no Edge uses is left until it is this old, so the one an Edge is about to open survives; 2 minutes. */
  profileGraceMs?: number;
};

const PROFILE = 'playwright_chromiumdev_profile-';

/** Marks `dir` (created if missing) as the folder of the run `runId`, which `pid` executes. */
export function writeOwner(dir: string, owner: { runId: string; pid: number }): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'owner.json'), JSON.stringify(owner));
}

function readPid(dir: string): number | undefined {
  try {
    const { pid } = JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8'));
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

/** The value of `--user-data-dir` in an Edge command line, quoted or not. */
export function userDataDir(commandLine: string): string | undefined {
  const match = /--user-data-dir=(?:"([^"]*)"|(\S+))/.exec(commandLine);
  return match?.[1] ?? match?.[2];
}

/** The output of `ConvertTo-Json` over Win32_Process: nothing, one object or an array. */
export function parseProcesses(json: string): Processes {
  if (!json.trim()) return [];
  const parsed = JSON.parse(json);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((p) => ({
    pid: p.ProcessId,
    parentPid: p.ParentProcessId,
    name: String(p.Name ?? ''),
    commandLine: String(p.CommandLine ?? ''),
  }));
}

/** The real process list; only Edge is asked for, and anything but Windows has none. */
export function listProcesses(): Processes {
  if (process.platform !== 'win32') return [];
  const command = `@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Select-Object ProcessId,ParentProcessId,Name,CommandLine) | ConvertTo-Json -Compress`;
  return parseProcesses(execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', timeout: 30_000 }));
}

/** Closes the process `pid` and its tree, by pid. */
export function killTree(pid: number): void {
  execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

const real = (path: string) => {
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
};
const same = (a: string, b: string) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);

const remove = (dir: string) => {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // Still in use: the next run tries again.
  }
};

/**
 * Removes from `temp` the `cm-*` folders whose owner is dead, closes the Edge of Playwright's profiles whose
 * launcher is dead, and removes the profiles no live Edge uses. Returns what it removed and closed.
 */
export function cleanup(options: CleanupOptions): { folders: string[]; edges: number[]; profiles: string[] } {
  const { temp, isAlive, now = Date.now, maxAgeMs = 24 * 3_600_000, profileGraceMs = 120_000 } = options;
  const entries = readdirSync(temp, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const ageOf = (dir: string) => now() - statSync(dir).mtimeMs;

  const folders = entries
    .filter((entry) => entry.name.startsWith('cm-'))
    .map((entry) => join(temp, entry.name))
    .filter((dir) => {
      const pid = readPid(dir);
      return pid === undefined ? ageOf(dir) > maxAgeMs : !isAlive(pid);
    });
  folders.forEach(remove);

  // An Edge of the tests is the root of a tree started with a Playwright profile directly in temp. Its launcher
  // is its parent; with the parent dead it is an orphan. A child has the root as parent, so only roots are closed.
  const tempReal = real(temp);
  const ofTests = options
    .processes()
    .filter((p) => p.name.toLowerCase() === 'msedge.exe')
    .flatMap((p) => {
      const dir = userDataDir(p.commandLine);
      if (!dir || !basename(dir).startsWith(PROFILE) || !same(real(dirname(dir)), tempReal)) return [];
      return [{ ...p, profile: basename(dir) }];
    });
  const orphans = ofTests.filter((p) => !isAlive(p.parentPid));
  orphans.forEach((p) => options.kill(p.pid));
  const closed = new Set(orphans.map((p) => p.profile.toLowerCase()));
  const used = new Set(ofTests.filter((p) => !orphans.includes(p)).map((p) => p.profile.toLowerCase()));

  const profiles = entries
    .filter((entry) => entry.name.startsWith(PROFILE))
    .filter((entry) => {
      const name = entry.name.toLowerCase();
      return !used.has(name) && (closed.has(name) || ageOf(join(temp, entry.name)) > profileGraceMs);
    })
    .map((entry) => join(temp, entry.name));
  profiles.forEach(remove);

  return { folders, edges: orphans.map((p) => p.pid), profiles };
}
