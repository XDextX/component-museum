import { defineConfig } from 'vitest/config';

// Own config, with no globalSetup: the way the unit project runs, so nothing is provided.
export default defineConfig({
  test: { include: ['*.test.ts'], cache: false },
});
