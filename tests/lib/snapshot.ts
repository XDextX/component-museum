import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { run } from './run.ts';

export type Snapshot = { status: string; hashes: Record<string, string> };

/** Differences between two snapshots, git status first, then files sorted by path; empty if equal. */
export function diffSnapshots(before: Snapshot, after: Snapshot): string[] {
  const diffs: string[] = [];
  if (before.status !== after.status) diffs.push(`git status changed:\n${before.status}→\n${after.status}`);
  const paths = [...new Set([...Object.keys(before.hashes), ...Object.keys(after.hashes)])].sort();
  for (const path of paths) {
    const [was, is] = [before.hashes[path], after.hashes[path]];
    if (was === is) continue;
    diffs.push(`${was === undefined ? 'added' : is === undefined ? 'removed' : 'changed'}: ${path}`);
  }
  return diffs;
}

/**
 * `git status --porcelain` of `repo` plus the sha256 of every file under `roots` (relative to the
 * repo), so a change git ignores still shows; a root that does not exist adds no files.
 */
export function takeSnapshot(repo: string, roots: string[]): Snapshot {
  const status = run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repo });
  if (status.code !== 0) throw new Error(`git status failed in ${repo}\n${status.output}`);
  const hashes: Record<string, string> = {};
  for (const root of roots) {
    const dir = join(repo, root);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const file = join(entry.parentPath, entry.name);
      hashes[relative(repo, file).split('\\').join('/')] = createHash('sha256').update(readFileSync(file)).digest('hex');
    }
  }
  return { status: status.output, hashes };
}

/** What RF-6 hashes: the fixtures, and the one path RF-5 injects into the repo (git ignores it). */
export const snapshotRoots = ['tests/fixtures', 'node_modules/museum-undeclared'];
