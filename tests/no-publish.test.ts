import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Built at run time so this file never contains the terms it forbids (spec 006, RF-6).
export function forbiddenTerms(): string[] {
  return [
    ['npm', 'publish'].join(' '),
    ['sui-mono', 'release'].join(' '),
    ['NPM', 'TOKEN'].join('_'),
    ['_auth', 'Token'].join(''),
  ];
}

const inScope = (f: string) => /(^|\/)package\.json$/.test(f) || /^(scripts|tests)\//.test(f);

// Problems in the tracked files of `root`: forbidden terms in scope, and any tracked .npmrc.
export function publishProblems(root: string, tracked: string[]): string[] {
  const problems = tracked.filter((f) => /(^|\/)\.npmrc$/.test(f)).map((f) => `${f} is tracked`);
  for (const f of tracked.filter(inScope)) {
    const text = readFileSync(join(root, f), 'utf8');
    for (const t of forbiddenTerms()) if (text.includes(t)) problems.push(`${f} contains "${t}"`);
  }
  return problems;
}

const root = resolve('.');
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

function inTempDir(body: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'cm-nopub-'));
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('no publishing from the repo (RF-6)', () => {
  it('finds no forbidden term and no tracked .npmrc in the real repo', () => {
    expect(publishProblems(root, tracked)).toEqual([]);
  });

  it('passes a test that builds its terms at run time', () => {
    inTempDir((dir) => {
      writeFileSync(join(dir, 'x.test.ts'), "const s = ['npm', 'publish'].join(' ');\n");
      expect(publishProblems(dir, ['x.test.ts'])).toEqual([]);
    });
  });

  it('goes red on a release script in a copy of the root manifest', () => {
    inTempDir((dir) => {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      pkg.scripts = { ...pkg.scripts, release: forbiddenTerms()[1] };
      writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
      expect(publishProblems(dir, ['package.json'])).toEqual([`package.json contains "${forbiddenTerms()[1]}"`]);
    });
  });

  it('goes red on a tracked .npmrc in a copy of the tree', () => {
    inTempDir((dir) => {
      cpSync(join(root, 'scripts'), join(dir, 'scripts'), { recursive: true });
      writeFileSync(join(dir, '.npmrc'), 'registry=https://registry.npmjs.org/\n');
      expect(publishProblems(dir, ['.npmrc', 'scripts/sync-styles.mjs'])).toEqual(['.npmrc is tracked']);
    });
  });
});
