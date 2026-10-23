import type { StorybookConfig } from '@storybook/react-vite';

// The gallery is official Storybook for React only; Astro is shown prerendered (spec 004).
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  // Spec 007 RF-4: the gallery shows no backgrounds, grid, measure or outline tools in the toolbar.
  features: { backgrounds: false, measure: false, outline: false },
  // npm test builds the gallery on every run: no usage reports leave the machine from it.
  core: { disableTelemetry: true },
};

export default config;
