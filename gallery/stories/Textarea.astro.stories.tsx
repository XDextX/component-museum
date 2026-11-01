import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { ThemeProvider, convert, getPreferredColorScheme, themes } from 'storybook/theming';
import '@component-museum/astro/styles.css';
// Written by gallery/scripts/extract-astro.mjs from the real Astro build (spec 004, RF-5 and RF-6).
import cases from '../generated/astro-textarea.json';

type AstroCase = { id: string; html: string; usage: string };

/**
 * Storybook has no official Astro support yet (constitution, rule 5): each contract state is shown
 * prerendered by the real component, with its usage code below.
 */
const meta = {
  title: 'Textarea/Astro',
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;

export const Variants: StoryObj = {
  render: (_args, { globals }) => {
    // The gallery `theme` global; "system" (or unset) follows prefers-color-scheme.
    const dark = globals.theme === 'dark' || (globals.theme !== 'light' && getPreferredColorScheme() === 'dark');
    return (
      // SyntaxHighlighter reads Storybook's theme, which a story iframe does not provide.
      <ThemeProvider theme={convert(dark ? themes.dark : themes.light)}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {(cases as AstroCase[]).map(({ id, html, usage }) => (
            <section
              key={id}
              id={`astro-${id}`}
              aria-label={id}
              // anywhere breaks a word wider than the view (spec 008, RF-4). Not a grid or flex container: the
              // code block's copy button is clipped below the block when it is a grid item (spec 007, RF-6).
              style={{ overflowWrap: 'anywhere' }}
            >
              <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'system-ui', fontSize: '0.875rem' }}>{id}</h3>
              {/* The HTML Astro rendered, as is: Storybook only shows it. 8 px above the code (spec 008, RF-3). */}
              <div style={{ marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: html }} />
              {/* "astro" is not a registered language; Astro files are HTML plus a frontmatter fence. */}
              <SyntaxHighlighter language="html" copyable wrapLongLines>
                {usage}
              </SyntaxHighlighter>
            </section>
          ))}
        </div>
      </ThemeProvider>
    );
  },
};
