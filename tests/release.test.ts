import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReleaseRepo, type ReleaseRepo } from './lib/release-repo.ts';

// Each check() is a git repo plus a Node process: about 10 s under load (measured 2026-10-22).
vi.setConfig({ testTimeout: 60_000 });

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const react = 'packages/react';
const astro = 'packages/astro';

let repo: ReleaseRepo | undefined;
afterEach(() => {
  repo?.dispose();
  repo = undefined;
});

/** The status of a repo whose only commit after the two v0.1.0 releases is `message`. */
function statusAfter(message: string, body?: string) {
  repo = createReleaseRepo();
  repo.commit(message, body);
  return repo.check();
}

describe('RF-3 — @s-ui/mono in the root manifest', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  it('declares @s-ui/mono as a dev dependency and publishes with public access', () => {
    expect(manifest.devDependencies['@s-ui/mono']).toBe('^2.46.0');
    expect(manifest.config['sui-mono'].access).toBe('public');
  });
});

describe('RF-4 — the next version follows the commit type', () => {
  it('lists packages/react and packages/astro, and not the gallery', () => {
    repo = createReleaseRepo();
    expect(Object.keys(repo.check()).sort()).toEqual([astro, react]);
  });

  it.each(['fix', 'feat', 'perf', 'refactor'])('a %s with a package scope is a minor release', (type) => {
    const status = statusAfter(`${type}(${react}): change something`);
    expect(status[react].increment).toBe(2);
    expect(status[astro].increment).toBe(0);
  });

  it('BREAKING CHANGE in the body is a major release', () => {
    const status = statusAfter(`feat(${react}): change something`, 'BREAKING CHANGE: the API moved');
    expect(status[react].increment).toBe(3);
  });

  it('a docs commit releases nothing', () => {
    const status = statusAfter(`docs(${react}): explain something`);
    expect(status[react].increment).toBe(0);
  });

  it('without a packages/* workspace, check() lists no package to release', () => {
    repo = createReleaseRepo({ rootMutation: (m) => ({ ...m, workspaces: ['gallery'] }) });
    repo.commit(`feat(${react}): change something`);
    expect(repo.check()).toEqual({});
  });
});

describe('RF-5 — a commit without a package scope belongs to no package', () => {
  it('a feat without scope gives no release to either package', () => {
    const status = statusAfter('feat: change something');
    expect(status[react].increment).toBe(0);
    expect(status[astro].increment).toBe(0);
  });
});
