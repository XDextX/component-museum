import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, inject, it } from 'vitest';
import { Button, type ButtonProps } from '../packages/react/dist/index.js';
import { readElements } from './lib/browser.ts';
import { loadContract } from './lib/contract.ts';

const { variant, size } = loadContract(fileURLToPath(new URL('../contracts/button.contract.json', import.meta.url))).props;
if (variant.type !== 'enum' || size.type !== 'enum') throw new Error('Button contract: variant and size must be enums');
const ids = variant.values.flatMap((v) => size.values.map((s) => ({ id: `button-${v}-${s}`, v, s })));

// Two Edge launches on a cold machine; the default 10 s is too tight.
describe('same HTML in React and Astro (RF-9)', { timeout: 60_000 }, () => {
  it('renders the same element, classes and attributes for every variant and size', async () => {
    const reactHtml = ids
      .map(({ id, v, s }) => renderToStaticMarkup(createElement(Button, { id, variant: v as 'primary', size: s as 'sm' }, `${v} ${s}`)))
      .join('');
    const astroHtml = readFileSync(join(inject('consumers').plain.astro, 'dist', 'index.html'), 'utf8');

    const react = await readElements(reactHtml, 'button');
    const astro = await readElements(astroHtml, 'button[id^="button-"]:not(#button-attrs)');

    expect(react).toHaveLength(ids.length);
    expect(astro).toEqual(react);
  });
});

// The consumer's attributes on the `button-attrs` instance of tests/lib/consumer.ts (RF-11).
const consumerAttributes = { id: 'button-attrs', 'data-x': '1', 'aria-label': 'Etiqueta', 'data-museum-button': 'consumer' };

describe('HTML attributes reach the <button> (RF-11)', { timeout: 60_000 }, () => {
  it('passes data-x, aria-label and id, adds the consumer class, and keeps the component’s own data-museum-button', async () => {
    const reactHtml = renderToStaticMarkup(
      createElement(Button, { ...consumerAttributes, className: 'consumer-class' } as ButtonProps, 'attrs'),
    );
    const astroHtml = readFileSync(join(inject('consumers').plain.astro, 'dist', 'index.html'), 'utf8');

    const [react] = await readElements(reactHtml, '#button-attrs');
    const [astro] = await readElements(astroHtml, '#button-attrs');

    expect(react.attributes).toMatchObject({ 'data-x': '1', 'aria-label': 'Etiqueta', 'data-museum-button': '' });
    expect(react.classes).toEqual(expect.arrayContaining(['museum-button', 'consumer-class']));
    expect(astro).toEqual(react);
  });

  it('takes type and disabled only through their own props in React', () => {
    expectTypeOf<ButtonProps['type']>().toEqualTypeOf<'button' | 'submit' | 'reset' | undefined>();
    expectTypeOf<ButtonProps['disabled']>().toEqualTypeOf<boolean | undefined>();
  });
});
