import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// Spec 015: one smoke test per story, in the system Edge (no browser download), as the `stories` project of the root run.
export default defineConfig({
  plugins: [storybookTest({ configDir: join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'stories',
    // Spec 015 RF-6: a command-line run takes the lock of `npm test`; the panel's watch run does not.
    globalSetup: [join(import.meta.dirname, '..', 'tests', 'stories-setup.ts')],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'msedge' } }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
