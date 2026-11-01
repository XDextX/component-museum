import { defineConfig } from 'vitest/config';
import { splitTests } from './tests/lib/projects.ts';

// Spec 017 RF-7: the files that ask for no preparation run in `unit`, with no globalSetup; the rest, in `e2e`.
// Vitest skips the globalSetup of a project that has no file to run, so `vitest run tests/contract.test.ts`
// packs and builds nothing.
const { unit, e2e } = splitTests(import.meta.dirname);

export default defineConfig({
  test: {
    testTimeout: 10_000,
    // Closing Edge takes 0.1-0.4 s alone but 0.8-3.7 s when several test files close theirs at once
    // (five overlapping, measured 2026-10-22), and has passed 10 s on a busier run: the afterAll that
    // closes Edge needs headroom, not a hang (spec 005, T-7 correction).
    hookTimeout: 30_000,
    projects: [
      // Spec 015: one test per story, in the system Edge; its own config lives in gallery/, where storybook resolves.
      'gallery/vitest.config.ts',
      { extends: true, test: { name: 'unit', include: unit } },
      {
        extends: true,
        // Creates the shared external consumers once per run (plan 001, T-6b).
        test: { name: 'e2e', include: e2e, globalSetup: ['tests/global-setup.ts'] },
      },
    ],
  },
});
