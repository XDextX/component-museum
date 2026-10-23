import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import preview from '../gallery/.storybook/preview.ts';

// Spec 005, RF-3 (content): the theme global and the decorator that applies it.
const story = () => createElement('p', null, 'story');
const wrap = (theme?: string) => {
  const decorate = (preview.decorators as unknown as ((s: () => unknown, c: unknown) => unknown)[])[0];
  return renderToStaticMarkup(decorate(story, { globals: { theme } }) as never);
};

describe('gallery theme global (RF-3)', () => {
  it('offers Sistema, Claro and Oscuro in the toolbar, with a title', () => {
    const theme = preview.globalTypes!.theme as { toolbar: { title: string; items: { value: string; title: string }[] } };
    expect(theme.toolbar.title).toBeTruthy();
    expect(theme.toolbar.items.map((i) => [i.value, i.title])).toEqual([
      ['system', 'Sistema'],
      ['light', 'Claro'],
      ['dark', 'Oscuro'],
    ]);
  });

  it('wraps the story in data-theme for light and dark, and in data-theme="system" for system (spec 011)', () => {
    expect(wrap('dark')).toMatch(/^<div[^>]* data-theme="dark"[^>]*><p>story<\/p><\/div>$/);
    expect(wrap('light')).toContain('data-theme="light"');
    expect(wrap('system')).toContain('data-theme="system"');
    expect(wrap(undefined)).toContain('data-theme="system"');
  });

  it('paints the canvas with the package surface token', () => {
    expect(wrap('dark')).toContain('var(--museum-surface)');
  });
});
