import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { astroRenderKey } from '../gallery/scripts/astro-cached.mjs';
import { astroRenderInputs, inputKey, repoRoot } from '../scripts/cache.mjs';

let root: string;
beforeEach(() => {
  // A tiny repo: the new stylesheet, an old copy of it in each package, and the sync script.
  root = mkdtempSync(join(tmpdir(), 'cm-key-'));
  mkdirSync(join(root, 'styles'));
  mkdirSync(join(root, 'scripts'));
  cpSync(join(repoRoot, 'scripts', 'sync-styles.mjs'), join(root, 'scripts', 'sync-styles.mjs'));
  writeFileSync(join(root, 'LICENSE'), 'license');
  writeFileSync(join(root, 'styles', 'museum.css'), '.new {}');
  for (const name of ['react', 'astro']) {
    mkdirSync(join(root, 'packages', name), { recursive: true });
    writeFileSync(join(root, 'packages', name, 'styles.css'), '.old {}');
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const staleKey = () => {
  const { files, extra } = astroRenderInputs();
  return inputKey(root, files, extra);
};

describe("the astro-render key reads this run's stylesheet (spec 017, RF-3, RF-4)", () => {
  it('copies the stylesheet into both packages before the key is computed: the key changes after the copy, not before', () => {
    const before = staleKey();
    expect(staleKey()).toBe(before);
    const key = astroRenderKey(root);
    expect(key).not.toBe(before);
    for (const name of ['react', 'astro']) {
      expect(readFileSync(join(root, 'packages', name, 'styles.css')).equals(readFileSync(join(root, 'styles', 'museum.css'))), name).toBe(true);
    }
    expect(staleKey()).toBe(key);
    expect(astroRenderKey(root)).toBe(key);
  });
});
