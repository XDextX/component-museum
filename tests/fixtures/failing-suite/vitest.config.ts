import { defineConfig } from 'vitest/config';

// Own config so the meta-test never picks up the repo's, which excludes this folder.
export default defineConfig({
  // No results cache: it would write into tests/fixtures on every run and break RF-6.
  test: { include: ['*.test.ts'], cache: false },
});
