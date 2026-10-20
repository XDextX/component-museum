import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/fixtures/**', 'node_modules/**'],
    testTimeout: 10_000,
    // Creates the shared external consumers once per run (plan 001, T-6b).
    globalSetup: ['tests/global-setup.ts'],
  },
});
