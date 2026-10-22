import type { Meta, StoryObj } from '@storybook/react-vite';
import '@component-museum/astro/styles.css';
// Written by gallery/scripts/extract-astro.mjs from the real Astro build (spec 004, RF-5 and RF-6).
import cases from '../generated/astro-button.json';

type AstroCase = { id: string; html: string; usage: string };

/**
 * Storybook has no official Astro support yet (constitution, rule 5): each contract variant is shown
 * prerendered by the real component, normal and disabled, with its usage code below.
 */
const meta = {
  title: 'Button/Astro',
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;

export const Variants: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {(cases as AstroCase[]).map(({ id, html, usage }) => (
        <section key={id} id={`astro-${id}`} aria-label={id}>
          <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'system-ui', fontSize: '0.875rem' }}>{id}</h3>
          {/* The HTML Astro rendered, as is: Storybook only shows it. */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <pre style={{ margin: '0.5rem 0 0' }}>
            <code>{usage}</code>
          </pre>
        </section>
      ))}
    </div>
  ),
};
