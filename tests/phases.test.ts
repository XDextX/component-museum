import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { astroRenderInputs, cacheDir, inputKey, repoRoot, storybookInputs } from '../scripts/cache.mjs';

type Phases = Record<string, { seconds: number; cache: 'hit' | 'built' | null }>;
const phases = (): Phases => JSON.parse(readFileSync(join(cacheDir, 'phases.json'), 'utf8'));

// scripts/test.mjs clears phases.json before its first step; a bare vitest run does not, so it can see an
// earlier run's entries beside this run's.
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
