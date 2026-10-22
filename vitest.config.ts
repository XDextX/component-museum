import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/fixtures/**', 'node_modules/**'],
    testTimeout: 10_000,
    // Closing Edge takes 0.1-0.4 s alone but 0.8-3.7 s when several test files close theirs at once
    // (five overlapping, measured 2026-10-22), and has passed 10 s on a busier run: the afterAll that
    // closes Edge needs headroom, not a hang (spec 005, T-7 correction).
    hookTimeout: 30_000,
    // Creates the shared external consumers once per run (plan 001, T-6b).
    globalSetup: ['tests/global-setup.ts'],
  },
});
