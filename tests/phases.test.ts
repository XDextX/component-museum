import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { astroRenderInputs, cacheDir, inputKey, repoRoot, storybookInputs } from '../scripts/cache.mjs';
import { fileInTarball } from './lib/tarball.ts';

type Phases = Record<string, { seconds: number; cache: 'hit' | 'built' | null }>;
const phases = (): Phases => JSON.parse(readFileSync(join(cacheDir, 'phases.json'), 'utf8'));

// scripts/test.mjs clears phases.json before its first step; a bare vitest run does not, so it can see an
// earlier run's entries beside this run's.
describe('the run packs each package once and installs that tarball everywhere (spec 017, RF-1)', () => {
  const packs = ['react', 'astro', 'testPackage', 'undeclaring'] as const;

  it('records exactly one pack, and so one prepack, per package, and no other prepack of the run', () => {
    const recorded = Object.keys(phases()).filter((name) => /pack/.test(name));
    expect(recorded.sort()).toEqual(packs.map((name) => `globalSetup: pack ${name}`).sort());
    for (const name of packs) expect(existsSync(inject('tarballs')[name].path), `${name} has no tarball`).toBe(true);
  });

  it('installs the run tarball in every consumer: same package.json bytes as inside it', () => {
    const consumers = inject('consumers');
    const installed = (dir: string, framework: 'react' | 'astro') => readFileSync(join(dir, 'node_modules', '@component-museum', framework, 'package.json'));
    for (const framework of ['react', 'astro'] as const) {
      const shipped = fileInTarball(readFileSync(inject('tarballs')[framework].path), 'package/package.json');
      for (const dirs of [consumers.plain, consumers.packageGuarded, consumers.tailwind]) {
        expect(installed(dirs[framework], framework).equals(shipped!), `${dirs[framework]} does not hold the run tarball`).toBe(true);
      }
    }
  });
});

describe('the run records its builds (spec 017, RF-2, RF-3)', () => {
  it('builds astro-render at most once, between gallery:astro and the globalSetup', () => {
    expect(inject('gallery').storybook).toBeTruthy();
    const built = ['gallery:astro', 'globalSetup: astro-render'].filter((name) => phases()[name]?.cache === 'built');
    expect(built.length).toBeLessThanOrEqual(1);
    expect(phases()['globalSetup: astro-render']?.cache).toMatch(/^(hit|built)$/);
  });

  it('records Storybook as a hit or a build', () => {
    expect(phases()['globalSetup: storybook']?.cache).toMatch(/^(hit|built)$/);
  });

  it('leaves each build with the key of the inputs it ends the run with', () => {
    for (const [name, inputs] of [
      ['astro-render', astroRenderInputs()],
      ['storybook', storybookInputs()],
    ] as const) {
      const keyFile = join(cacheDir, `${name}.key`);
      expect(existsSync(keyFile), `${name} has no stored key`).toBe(true);
      expect(readFileSync(keyFile, 'utf8')).toBe(inputKey(repoRoot, inputs.files, inputs.extra));
    }
  });
});
