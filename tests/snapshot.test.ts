import { describe, expect, it } from 'vitest';
import { diffSnapshots, type Snapshot } from './lib/snapshot.ts';

const before: Snapshot = {
  status: ' M tests/a.ts\n',
  hashes: { 'tests/fixtures/a.txt': 'aaa', 'tests/fixtures/b.txt': 'bbb' },
};

describe('diffSnapshots', () => {
  it('is empty for two equal snapshots', () => {
    expect(diffSnapshots(before, structuredClone(before))).toEqual([]);
  });

  it('reports a change in git status', () => {
    const after = { ...before, status: ' M tests/a.ts\n?? tests/new.ts\n' };
    expect(diffSnapshots(before, after)).toEqual([
      'git status changed:\n M tests/a.ts\n→\n M tests/a.ts\n?? tests/new.ts\n',
    ]);
  });

  it('reports a changed, an added and a removed file, sorted by path', () => {
    const after: Snapshot = {
      status: before.status,
      hashes: { 'tests/fixtures/a.txt': 'zzz', 'tests/fixtures/c.txt': 'ccc' },
    };
    expect(diffSnapshots(before, after)).toEqual([
      'changed: tests/fixtures/a.txt',
      'removed: tests/fixtures/b.txt',
      'added: tests/fixtures/c.txt',
    ]);
  });
});
