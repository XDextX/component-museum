import { defineConfig } from 'vitest/config';

// Own config so the meta-test never picks up the repo's, which excludes this folder.
export default defineConfig({
  test: { include: ['*.test.ts'] },
});
