import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// Spec 015: one smoke test per story, in the system Edge (no browser download), as a `stories` project of the root run.
// Spec 016 RF-3: one project per gallery theme (a config file holds one project, so the dark one is vitest.dark.config.ts).
export const themed = (theme: 'light' | 'dark') =>
  defineConfig({
    plugins: [storybookTest({ configDir: join(import.meta.dirname, '.storybook'), initialGlobals: { theme } })],
    test: {
      name: `stories-${theme}`,
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

export default themed('light');
