import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { consumerDir, isOutside } from './lib/paths.ts';

const root = resolve('/work/repo');

describe('isOutside', () => {
  it('is false for the root itself', () => {
    expect(isOutside(root, root)).toBe(false);
  });

  it('is false for a path inside the root', () => {
    expect(isOutside(root, join(root, 'tests', 'fixtures'))).toBe(false);
  });

  it('is true for the parent and for a sibling', () => {
    expect(isOutside(root, resolve('/work'))).toBe(true);
    expect(isOutside(root, resolve('/work/other'))).toBe(true);
  });

  it('is true for a sibling that shares the root as a name prefix', () => {
    expect(isOutside(root, resolve('/work/repo-copy'))).toBe(true);
  });

  it('is false for a child whose name starts with two dots', () => {
    expect(isOutside(root, join(root, '..cache'))).toBe(false);
  });

  it.runIf(process.platform === 'win32')('is true for another drive on Windows', () => {
    expect(isOutside('C:\\work\\repo', 'D:\\work\\repo')).toBe(true);
  });

  it.runIf(process.platform === 'win32')('ignores letter case on Windows', () => {
    expect(isOutside('C:\\Work\\Repo', 'c:\\work\\repo\\tests')).toBe(false);
  });
});

describe('consumerDir', () => {
  it('nests each framework under cm-<runId> in the base', () => {
    const base = resolve('/tmp');
    expect(consumerDir(base, 'abc', 'react')).toBe(join(base, 'cm-abc', 'react'));
    expect(consumerDir(base, 'abc', 'astro')).toBe(join(base, 'cm-abc', 'astro'));
  });

  it('gives two runs different folders', () => {
    const base = resolve('/tmp');
    expect(consumerDir(base, 'a', 'react')).not.toBe(consumerDir(base, 'b', 'react'));
  });
});
