import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { astroCases } from '../gallery/lib/contract-args.ts';
import { Input } from '../packages/react/dist/index.js';
import { loadContract } from './lib/contract.ts';

// The canonical markup of plan 009, block 4. `id` is passed so the output is exact.
const html = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(Input, { id: 'f', label: 'Label', ...props }));
const label = (required = '') => `<label class="museum-field__label" for="f">Label${required}</label>`;
const star = '<span class="museum-field__required" aria-hidden="true">*</span>';
const control = (attrs = '') => `<input id="f" class="museum-input museum-input--md" type="text"${attrs} data-museum-input=""/>`;
const hint = '<p id="f-hint" class="museum-field__hint">Hint</p>';
const error = '<p id="f-error" class="museum-field__error">Error</p>';
const field = (...parts: string[]) => `<div class="museum-field">${parts.join('')}</div>`;

describe('Input markup in React (spec 009, RF-2 to RF-6)', () => {
  it('RF-2, RF-5: without hint or error it is a label and a control, with no ARIA and no empty nodes', () => {
    expect(html({})).toBe(field(label(), control()));
  });

  it('RF-3: a hint is described by the control', () => {
    expect(html({ hint: 'Hint' })).toBe(field(label(), control(' aria-describedby="f-hint"'), hint));
  });

  it('RF-4: an error marks the control invalid and is described by it', () => {
    expect(html({ error: 'Error' })).toBe(field(label(), control(' aria-describedby="f-error" aria-invalid="true"'), error));
  });

  it('RF-3, RF-4: with both, the error comes first in the description', () => {
    expect(html({ hint: 'Hint', error: 'Error' })).toBe(
      field(label(), control(' aria-describedby="f-error f-hint" aria-invalid="true"'), hint, error),
    );
  });

  it('RF-6: required is native and the label shows a marker hidden from reading', () => {
    expect(html({ required: true })).toBe(field(label(star), control(' required=""')));
  });

  it('disabled is native, on the control only', () => {
    expect(html({ disabled: true })).toBe(field(label(), control(' disabled=""')));
  });

  it('keeps the consumer id and appends its aria-describedby after the component ids', () => {
    const out = html({ id: 'mine', hint: 'Hint', 'aria-describedby': 'extra' });
    expect(out).toContain('<input id="mine"');
    expect(out).toContain('for="mine"');
    expect(out).toContain('id="mine-hint"');
    expect(out).toContain('aria-describedby="mine-hint extra"');
    expect(html({ 'aria-describedby': 'extra' })).toContain('aria-describedby="extra"');
  });

  it('sends free attributes and the class to the input, and the component wins a clash', () => {
    const out = html({ name: 'q', placeholder: 'Find', className: 'mine', 'data-museum-input': 'x' });
    expect(out).toContain('class="museum-input museum-input--md mine"');
    expect(out).toContain('name="q"');
    expect(out).toContain('placeholder="Find"');
    expect(out.match(/data-museum-input/g)).toHaveLength(1);
    expect(out).toContain('class="museum-field"');
  });

  it('writes the type and the size', () => {
    expect(html({ type: 'email', size: 'lg' })).toContain('class="museum-input museum-input--lg" type="email"');
  });

  it('gives two Input in one tree different ids, each label pointing at its own control', () => {
    const out = renderToStaticMarkup(createElement(Fragment, null, createElement(Input, { label: 'Same' }), createElement(Input, { label: 'Same' })));
    const ids = [...out.matchAll(/<input id="([^"]+)"/g)].map((m) => m[1]);
    const fors = [...out.matchAll(/for="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(fors).toEqual(ids);
  });
});

// Spec 009, T-5: the Astro Input must render the same markup as the React one, case by case.
describe('Input markup in Astro against React (spec 009, RF-1 to RF-6)', () => {
  const repo = resolve(import.meta.dirname, '..');
  const contract = loadContract(resolve(repo, 'contracts/input.contract.json'));
  const rendered = JSON.parse(readFileSync(resolve(repo, 'gallery/generated/astro-input.json'), 'utf8')) as {
    id: string;
    props: Record<string, unknown>;
    html: string;
  }[];

  // Only the generated ids are normalised: the control's id stands for every occurrence.
  const normalise = (markup: string) => {
    const id = /<input[^>]*? id="([^"]+)"/.exec(markup)?.[1];
    expect(id, 'the control has an id').toBeTruthy();
    return markup.split(id!).join('ID');
  };
  // Where the two serialisers write the same DOM differently: `/>` against `>`, and an empty boolean value.
  const serialised = (markup: string) => markup.replace(/ ?\/>/g, '>').replace(/=""/g, '');

  it('has one Astro render per case of the contract (13)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered).toHaveLength(13);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(Input, props as never));
      expect(serialised(normalise(astro)), `case ${id}`).toBe(serialised(normalise(react)));
    }
  });

  it('emits no <script> in any case', () => {
    expect(rendered.filter((c) => /<script/i.test(c.html)).map((c) => c.id)).toEqual([]);
  });

  it('is reproducible: two builds of the render page give the same ids', () => {
    const astro = resolve(repo, 'node_modules/astro/bin/astro.mjs');
    const dir = mkdtempSync(join(tmpdir(), 'museum-astro-'));
    try {
      const pages = [0, 1].map((n) => {
        execFileSync(process.execPath, [astro, 'build', '--root', 'gallery/astro-render', '--outDir', join(dir, String(n))], { cwd: repo, stdio: 'pipe' });
        return readFileSync(join(dir, String(n), 'index.html'), 'utf8');
      });
      expect(pages[0]).toBe(pages[1]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
