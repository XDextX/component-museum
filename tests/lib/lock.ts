import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
  /** A lock whose owner.json cannot be read is an orphan after this long; 30 seconds by default. */
  unreadableMs?: number;
  /** Test seam: runs after a lock is judged stale and before it is reclaimed, to place a rival in that window. */
  beforeReclaim?: () => void;
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

function ageOf(lockDir: string): number {
  try {
    return Date.now() - statSync(lockDir).mtimeMs;
  } catch {
    return 0;
  }
}

function readOwner(lockDir: string): LockOwner | undefined {
  try {
    return JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Removes the stale lock `owner` held. It is renamed away first, so only one of several waiters gets it,
 * and the renamed folder is checked: if a rival took the lock in between, it is put back, not deleted.
 */
function reclaim(lockDir: string, runId: string, owner: LockOwner | undefined): void {
  const tomb = `${lockDir}.stale-${runId}`;
  try {
    renameSync(lockDir, tomb);
  } catch {
    return; // Someone else reclaimed it first.
  }
  if (readOwner(tomb)?.runId === owner?.runId) {
    rmSync(tomb, { recursive: true, force: true });
    return;
  }
  try {
    renameSync(tomb, lockDir);
  } catch {
    // shortcut: a third run took the path in this window, so the displaced lock is lost; upgrade if it ever shows up.
  }
}

/**
 * Takes the lock at `lockDir` (an atomic mkdir), waiting while another live run holds it and
 * removing an orphan. Returns the release, which deletes the lock only if it is still this run's.
 */
export async function acquireLock(lockDir: string, options: LockOptions): Promise<() => void> {
  const { runId, waitMs = 10 * 60_000, pollMs = 2_000, maxAgeMs = 15 * 60_000, unreadableMs = 30_000, beforeReclaim, log = console.log } = options;
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
    // No readable owner: taken a moment ago (held), or its run died before writing it (orphan once old).
    const orphan = owner ? isStale(owner, Date.now(), isAlive, maxAgeMs) : ageOf(lockDir) > unreadableMs;
    if (orphan) {
      beforeReclaim?.();
      reclaim(lockDir, runId, owner);
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
