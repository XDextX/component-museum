import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { astroCases } from '../gallery/lib/contract-args.ts';
import { Input, Textarea } from '../packages/react/dist/index.js';
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

// Spec 010, T-3: the same canonical markup with a <textarea> where the <input> was.
const taHtml = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(Textarea, { id: 'f', label: 'Label', ...props }));
const taControl = (attrs = '', value = '') =>
  `<textarea id="f" class="museum-textarea museum-textarea--md"${attrs} data-museum-textarea="">${value}</textarea>`;

describe('Textarea markup in React (spec 010, RF-2 to RF-6, RF-11)', () => {
  it('RF-2, RF-5: without hint or error it is a label and a control, with no ARIA and no empty nodes', () => {
    expect(taHtml({})).toBe(field(label(), taControl()));
  });

  it('RF-3: a hint is described by the control', () => {
    expect(taHtml({ hint: 'Hint' })).toBe(field(label(), taControl(' aria-describedby="f-hint"'), hint));
  });

  it('RF-4: an error marks the control invalid and is described by it', () => {
    expect(taHtml({ error: 'Error' })).toBe(field(label(), taControl(' aria-describedby="f-error" aria-invalid="true"'), error));
  });

  it('RF-3, RF-4: with both, the error comes first in the description', () => {
    expect(taHtml({ hint: 'Hint', error: 'Error' })).toBe(
      field(label(), taControl(' aria-describedby="f-error f-hint" aria-invalid="true"'), hint, error),
    );
  });

  it('RF-6: required is native and the label shows a marker hidden from reading', () => {
    expect(taHtml({ required: true })).toBe(field(label(star), taControl(' required=""')));
  });

  it('disabled is native, on the control only', () => {
    expect(taHtml({ disabled: true })).toBe(field(label(), taControl(' disabled=""')));
  });

  it('keeps the consumer id and appends its aria-describedby after the component ids', () => {
    const out = taHtml({ id: 'mine', hint: 'Hint', 'aria-describedby': 'extra' });
    expect(out).toContain('<textarea id="mine"');
    expect(out).toContain('for="mine"');
    expect(out).toContain('id="mine-hint"');
    expect(out).toContain('aria-describedby="mine-hint extra"');
    expect(taHtml({ 'aria-describedby': 'extra' })).toContain('aria-describedby="extra"');
  });

  it('sends free attributes and the class to the textarea, and the component wins a clash', () => {
    const out = taHtml({ name: 'q', rows: 4, className: 'mine', 'data-museum-textarea': 'x' });
    expect(out).toContain('class="museum-textarea museum-textarea--md mine"');
    expect(out).toContain('name="q"');
    expect(out).toContain('rows="4"');
    expect(out.match(/data-museum-textarea/g)).toHaveLength(1);
    expect(out).toContain('class="museum-field"');
  });

  it('RF-11: value and defaultValue are the text of the control', () => {
    expect(taHtml({ value: 'Hi' })).toBe(field(label(), taControl('', 'Hi')));
    expect(taHtml({ defaultValue: 'Hi' })).toBe(field(label(), taControl('', 'Hi')));
  });

  it('writes the size', () => {
    expect(taHtml({ size: 'lg' })).toContain('class="museum-textarea museum-textarea--lg"');
  });

  it('gives two Textarea in one tree different ids, each label pointing at its own control', () => {
    const out = renderToStaticMarkup(createElement(Fragment, null, createElement(Textarea, { label: 'Same' }), createElement(Textarea, { label: 'Same' })));
    const ids = [...out.matchAll(/<textarea id="([^"]+)"/g)].map((m) => m[1]);
    const fors = [...out.matchAll(/for="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(fors).toEqual(ids);
  });
});

const repo = resolve(import.meta.dirname, '..');
type Rendered = { id: string; props: Record<string, unknown>; html: string }[];
const generated = (slug: string) => JSON.parse(readFileSync(resolve(repo, `gallery/generated/astro-${slug}.json`), 'utf8')) as Rendered;
// Only the generated ids are normalised: the control's id stands for every occurrence.
const normalise = (tag: string, markup: string) => {
  const id = new RegExp(`<${tag}[^>]*? id="([^"]+)"`).exec(markup)?.[1];
  expect(id, 'the control has an id').toBeTruthy();
  return markup.split(id!).join('ID');
};
// Where the two serialisers write the same DOM differently: `/>` against `>`, and an empty boolean value.
const serialised = (markup: string) => markup.replace(/ ?\/>/g, '>').replace(/=""/g, '');

// Spec 009, T-5: the Astro Input must render the same markup as the React one, case by case.
describe('Input markup in Astro against React (spec 009, RF-1 to RF-6)', () => {
  const contract = loadContract(resolve(repo, 'contracts/input.contract.json'));
  const rendered = generated('input');
  const norm = (m: string) => serialised(normalise('input', m));

  it('has one Astro render per case of the contract (14)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered).toHaveLength(14);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(Input, props as never));
      expect(norm(astro), `case ${id}`).toBe(norm(react));
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

describe('Textarea markup in Astro against React (spec 010, RF-1 to RF-6, RF-11)', () => {
  const contract = loadContract(resolve(repo, 'contracts/textarea.contract.json'));
  const rendered = generated('textarea');
  const norm = (m: string) => serialised(normalise('textarea', m));
  // Two Textarea, value "<b>&\nx" then "\nx" (gallery/astro-render/src/pages/textarea-values.astro).
  const values = readFileSync(resolve(repo, 'gallery/astro-render/dist/textarea-values/index.html'), 'utf8');
  const texts = [...values.matchAll(/<textarea[^>]*>([^<]*)<\/textarea>/g)].map((m) => m[1]);

  it('has one Astro render per case of the contract (8, the owner\'s hint-error one last)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered.map((c) => c.id)).toEqual(['default', 'hint', 'error', 'size-sm', 'size-lg', 'disabled', 'required', 'hint-error']);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(Textarea, props as never));
      expect(norm(astro), `case ${id}`).toBe(norm(react));
    }
  });

  it('RF-11: a value is escaped and keeps its line break', () => {
    expect(texts[0]).toBe('&lt;b&gt;&amp;\nx');
    expect(values).not.toContain('<b>');
  });

  it('RF-11: a value that starts with a line break keeps it, as React does', () => {
    const react = renderToStaticMarkup(createElement(Textarea, { label: 'L', value: '\nx' }));
    expect(texts[1]).toBe(/<textarea[^>]*>([^<]*)<\/textarea>/.exec(react)![1]);
    expect(texts[1]).toBe('\n\nx');
  });

  it('emits no <script> in any case', () => {
    expect(rendered.filter((c) => /<script/i.test(c.html)).map((c) => c.id)).toEqual([]);
    expect(values).not.toMatch(/<script/i);
  });
});
