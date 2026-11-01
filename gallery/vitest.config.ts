import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// Spec 015: one smoke test per story, in the system Edge (no browser download), as the `stories` project of the root run.
export default defineConfig({
  plugins: [storybookTest({ configDir: join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'stories',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'msedge' } }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
