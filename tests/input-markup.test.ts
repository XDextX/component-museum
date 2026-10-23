import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input } from '../packages/react/dist/index.js';

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
