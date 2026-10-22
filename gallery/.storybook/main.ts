import type { StorybookConfig } from '@storybook/react-vite';

// The gallery is official Storybook for React only; Astro is shown prerendered (spec 004).
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  // npm test builds the gallery on every run: no usage reports leave the machine from it.
  core: { disableTelemetry: true },
};

export default config;
