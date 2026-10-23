import { createElement, lazy, Suspense, useEffect, useState, type ComponentProps } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { themes } from 'storybook/theming';
// By specifier, exactly as an outside project imports it (constitution, rule 1; spec 004, RF-10).
import '@component-museum/react/styles.css';

// Spec 005, RF-3. No JSX here: gallery/tsconfig.json only includes `.storybook/*.ts`.
// "system" sets no attribute, so the package's prefers-color-scheme rule decides.
const withTheme: Decorator = (Story, { globals }) => {
  const theme = globals.theme === 'light' || globals.theme === 'dark' ? globals.theme : undefined;
  // The surface token paints the canvas, so dark buttons do not sit on a white one. The gallery's own
  // text (headings, usage code) takes the system text colour of the same scheme, so it reads on that
  // canvas in every theme without a text token in the package.
  return createElement(
    'div',
    {
      'data-theme': theme,
      style: { background: 'var(--museum-surface)', colorScheme: theme ?? 'light dark', color: 'CanvasText', padding: '1rem' },
    },
    createElement(Story),
  );
};

/** Spec 007, RF-5. The scheme of the documentation page: light or dark from the gallery global, else the system's. */
export function docsScheme(global: unknown, prefersDark: boolean): 'light' | 'dark' {
  return global === 'light' || global === 'dark' ? global : prefersDark ? 'dark' : 'light';
}

// Lazy: the blocks need `document`, and the tests import this file in Node for `docsScheme` and the decorator.
const DocsContainer = lazy(async () => ({ default: (await import('@storybook/addon-docs/blocks')).DocsContainer }));

const darkQuery = '(prefers-color-scheme: dark)';

/**
 * The `theme` in a `?globals=theme:dark;other:x` query string, or undefined. Button.mdx has no primary
 * story, so the docs context gives no story context to read globals from (spec 007, T-4): the manager
 * puts the globals in the iframe URL instead.
 */
export function themeFromSearch(search: string): string | undefined {
  const globals = new URLSearchParams(search).get('globals') ?? '';
  return globals.split(';').map((pair) => pair.split(':')).find(([key]) => key === 'theme')?.[1];
}

// The docs page is not a story, so the decorator does not reach it: this container reads the global itself.
function ThemedDocsContainer(props: ComponentProps<typeof DocsContainer>) {
  const { context } = props;
  const [global, setGlobal] = useState<unknown>(() => themeFromSearch(location.search));
  const [prefersDark, setPrefersDark] = useState(() => matchMedia(darkQuery).matches);
  useEffect(() => {
    const onGlobals = ({ globals }: { globals: Record<string, unknown> }) => setGlobal(globals.theme);
    const media = matchMedia(darkQuery);
    const onMedia = () => setPrefersDark(media.matches);
    context.channel.on('globalsUpdated', onGlobals);
    media.addEventListener('change', onMedia);
    return () => {
      context.channel.off('globalsUpdated', onGlobals);
      media.removeEventListener('change', onMedia);
    };
  }, [context]);
  const theme = docsScheme(global, prefersDark) === 'dark' ? themes.dark : themes.light;
  // The container paints the theme's background but colours only the elements it styles (p, th…);
  // the rest, a table caption among them, would inherit the body's black: give them the theme's text.
  return createElement(
    'div',
    { style: { color: theme.textColor } },
    createElement(Suspense, { fallback: null }, createElement(DocsContainer, { ...props, theme })),
  );
}

const preview: Preview = {
  decorators: [withTheme],
  parameters: { docs: { container: ThemedDocsContainer } },
  globalTypes: {
    theme: {
      // Storybook names the toolbar button from this description (the toolbar title is not read):
      // without it, screen readers hear the internal key, "theme".
      description: 'Tema de la galería',
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
