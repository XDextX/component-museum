import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
// @ts-expect-error react-dom ships no types and @types/react-dom is not a declared dependency (plan 002).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, inject, it } from 'vitest';
import { Button } from '../packages/react/dist/index.js';
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
    const astro = await readElements(astroHtml, 'button[id^="button-"]');

    expect(react).toHaveLength(ids.length);
    expect(astro).toEqual(react);
  });
});
