import { createElement } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
// By specifier, exactly as an outside project imports it (constitution, rule 1; spec 004, RF-10).
import '@component-museum/react/styles.css';

// Spec 005, RF-3. No JSX here: gallery/tsconfig.json only includes `.storybook/*.ts`.
// "system" sets no attribute, so the package's prefers-color-scheme rule decides.
const withTheme: Decorator = (Story, { globals }) => {
  const theme = globals.theme === 'light' || globals.theme === 'dark' ? globals.theme : undefined;
  // The surface token paints the canvas, so dark buttons do not sit on a white one.
  return createElement(
    'div',
    { 'data-theme': theme, style: { background: 'var(--museum-surface)', padding: '1rem' } },
    createElement(Story),
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      toolbar: {
        title: 'Tema',
        icon: 'circlehollow',
        items: [
          { value: 'system', title: 'Sistema' },
          { value: 'light', title: 'Claro' },
          { value: 'dark', title: 'Oscuro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'system' },
};

export default preview;
