import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { astroCases } from '../gallery/lib/contract-args.ts';
import { Checkbox, Input, RadioGroup, Select, Textarea } from '../packages/react/dist/index.js';
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

// Spec 012, T-3: the same field with the control before the label (inline), and a checkbox for a control.
const cbHtml = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(Checkbox, { id: 'f', label: 'Label', ...props }));
// React's server renderer writes `checked` last, after the data attribute.
const cbControl = (attrs = '', checked = false) =>
  `<input id="f" class="museum-checkbox museum-checkbox--md" type="checkbox"${attrs} data-museum-checkbox=""${checked ? ' checked=""' : ''}/>`;
const inline = (...parts: string[]) => `<div class="museum-field museum-field--inline">${parts.join('')}</div>`;

describe('Checkbox markup in React (spec 012, RF-2 to RF-6, RF-12)', () => {
  it('RF-2, RF-5: without hint or error it is a control and a label after it, with no ARIA and no empty nodes', () => {
    expect(cbHtml({})).toBe(inline(cbControl(), label()));
  });

  it('RF-3: a hint is described by the control', () => {
    expect(cbHtml({ hint: 'Hint' })).toBe(inline(cbControl(' aria-describedby="f-hint"'), label(), hint));
  });

  it('RF-4: an error marks the control invalid and is described by it', () => {
    expect(cbHtml({ error: 'Error' })).toBe(inline(cbControl(' aria-describedby="f-error" aria-invalid="true"'), label(), error));
  });

  it('RF-3, RF-4: with both, the error comes first in the description', () => {
    expect(cbHtml({ hint: 'Hint', error: 'Error' })).toBe(
      inline(cbControl(' aria-describedby="f-error f-hint" aria-invalid="true"'), label(), hint, error),
    );
  });

  it('RF-6: required is native and the label shows a marker hidden from reading', () => {
    expect(cbHtml({ required: true })).toBe(inline(cbControl(' required=""'), label(star)));
  });

  it('disabled is native, on the control only', () => {
    expect(cbHtml({ disabled: true })).toBe(inline(cbControl(' disabled=""'), label()));
  });

  it('RF-12: defaultChecked is the checked attribute, and false writes none', () => {
    expect(cbHtml({ defaultChecked: true })).toBe(inline(cbControl('', true), label()));
    expect(cbHtml({ defaultChecked: false })).toBe(inline(cbControl(), label()));
  });

  it('a consumer checked with its onChange is the checked attribute, and defaultChecked is not sent beside it', () => {
    const errors: unknown[] = [];
    const spy = console.error;
    console.error = (...a: unknown[]) => void errors.push(a);
    try {
      expect(cbHtml({ checked: true, onChange: () => {} })).toBe(inline(cbControl('', true), label()));
      expect(cbHtml({ checked: true, defaultChecked: true, onChange: () => {} })).toBe(inline(cbControl('', true), label()));
      expect(cbHtml({ checked: false, defaultChecked: true, onChange: () => {} })).toBe(inline(cbControl(), label()));
    } finally {
      console.error = spy;
    }
    expect(errors).toEqual([]);
  });

  it('keeps the consumer id and appends its aria-describedby after the component ids', () => {
    const out = cbHtml({ id: 'mine', hint: 'Hint', 'aria-describedby': 'extra' });
    expect(out).toContain('<input id="mine"');
    expect(out).toContain('for="mine"');
    expect(out).toContain('id="mine-hint"');
    expect(out).toContain('aria-describedby="mine-hint extra"');
    expect(cbHtml({ 'aria-describedby': 'extra' })).toContain('aria-describedby="extra"');
  });

  it('sends free attributes and the class to the input, and the component wins a clash', () => {
    const out = cbHtml({ name: 'q', value: 'yes', className: 'mine', 'data-museum-checkbox': 'x' });
    expect(out).toContain('class="museum-checkbox museum-checkbox--md mine"');
    expect(out).toContain('name="q"');
    expect(out).toContain('value="yes"');
    expect(out.match(/data-museum-checkbox/g)).toHaveLength(1);
    expect(out).toContain('class="museum-field museum-field--inline"');
  });

  it('writes the size', () => {
    expect(cbHtml({ size: 'lg' })).toContain('class="museum-checkbox museum-checkbox--lg"');
  });

  it('gives two Checkbox in one tree different ids, each label pointing at its own control', () => {
    const out = renderToStaticMarkup(createElement(Fragment, null, createElement(Checkbox, { label: 'Same' }), createElement(Checkbox, { label: 'Same' })));
    const ids = [...out.matchAll(/<input id="([^"]+)"/g)].map((m) => m[1]);
    const fors = [...out.matchAll(/for="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(fors).toEqual(ids);
  });
});

// Spec 013, T-4: the same field as a group (fieldset + legend) with one radio per option.
const opts = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];
const rgHtml = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(RadioGroup, { id: 'f', label: 'Label', name: 'n', options: opts, ...props }));
const legend = (required = '') => `<legend class="museum-field__label">Label${required}</legend>`;
// React writes required and disabled before the name, and checked between the name and the value.
const radio = (i: number, value: string, text: string, attrs = '') =>
  `<div class="museum-radiogroup__option"><input id="f-${i}" type="radio" class="museum-radio"${attrs.replace(' checked=""', '')} name="n"${attrs.includes('checked') ? ' checked=""' : ''} value="${value}"/><label for="f-${i}">${text}</label></div>`;
const optionsMarkup = (attrs: [string, string] = ['', '']) => radio(0, 'a', 'Option A', attrs[0]) + radio(1, 'b', 'Option B', attrs[1]);

describe('RadioGroup markup in React (spec 013, RF-2 to RF-9, RF-16)', () => {
  // The attribute order is the one of the canonical markup: id, class, role, aria-*, disabled, hook.
  const g = (extra: { describedby?: string; invalid?: boolean; required?: boolean; disabled?: boolean }, ...parts: string[]) =>
    `<fieldset id="f" class="museum-field museum-radiogroup museum-radiogroup--md" role="radiogroup"${
      extra.describedby ? ` aria-describedby="${extra.describedby}"` : ''
    }${extra.invalid ? ' aria-invalid="true"' : ''}${extra.required ? ' aria-required="true"' : ''}${extra.disabled ? ' disabled=""' : ''} data-museum-radiogroup="">${parts.join('')}</fieldset>`;

  it('RF-2, RF-5: without hint or error it is a legend and the options, with no ARIA and no empty nodes', () => {
    expect(rgHtml({})).toBe(g({}, legend(), optionsMarkup()));
  });

  it('RF-4: a hint is described by the group', () => {
    expect(rgHtml({ hint: 'Hint' })).toBe(g({ describedby: 'f-hint' }, legend(), optionsMarkup(), hint));
  });

  it('RF-5: an error marks the group invalid and is described by it', () => {
    expect(rgHtml({ error: 'Error' })).toBe(g({ describedby: 'f-error', invalid: true }, legend(), optionsMarkup(), error));
  });

  it('RF-4, RF-5: with both, the error comes first in the description', () => {
    expect(rgHtml({ hint: 'Hint', error: 'Error' })).toBe(
      g({ describedby: 'f-error f-hint', invalid: true }, legend(), optionsMarkup(), hint, error),
    );
  });

  it('RF-6: required is on the group and on every radio, and the legend shows a hidden marker', () => {
    expect(rgHtml({ required: true })).toBe(g({ required: true }, legend(star), optionsMarkup([' required=""', ' required=""'])));
  });

  it('RF-16: disabled of the group is the fieldset\'s, and of one option is that radio\'s', () => {
    expect(rgHtml({ disabled: true })).toBe(g({ disabled: true }, legend(), optionsMarkup()));
    const out = rgHtml({ options: [opts[0], { ...opts[1], disabled: true }] });
    expect(out).toBe(g({}, legend(), optionsMarkup(['', ' disabled=""'])));
    expect(out).not.toMatch(/<fieldset[^>]* disabled/);
  });

  it('RF-9: defaultValue checks the option with that value, and no other', () => {
    expect(rgHtml({ defaultValue: 'b' })).toBe(g({}, legend(), optionsMarkup(['', ' checked=""'])));
    expect(rgHtml({ defaultValue: '' })).toBe(g({}, legend(), optionsMarkup()));
    expect(rgHtml({ defaultValue: 'zzz' })).toBe(g({}, legend(), optionsMarkup()));
  });

  it('RF-9: a controlled value checks its option, with no defaultChecked and no React warning', () => {
    const errors: unknown[] = [];
    const spy = console.error;
    console.error = (...a: unknown[]) => void errors.push(a);
    try {
      expect(rgHtml({ value: 'a', onChange: () => {} })).toBe(g({}, legend(), optionsMarkup([' checked=""', ''])));
      expect(rgHtml({ value: 'a', defaultValue: 'b', onChange: () => {} })).toBe(g({}, legend(), optionsMarkup([' checked=""', ''])));
      expect(rgHtml({ value: '', defaultValue: 'b', onChange: () => {} })).toBe(g({}, legend(), optionsMarkup()));
    } finally {
      console.error = spy;
    }
    expect(errors).toEqual([]);
  });

  it('keeps the consumer id and appends its aria-describedby after the component ids', () => {
    const out = rgHtml({ id: 'mine', hint: 'Hint', 'aria-describedby': 'extra' });
    expect(out).toContain('<fieldset id="mine"');
    expect(out).toContain('id="mine-0"');
    expect(out).toContain('for="mine-1"');
    expect(out).toContain('id="mine-hint"');
    expect(out).toContain('aria-describedby="mine-hint extra"');
    expect(rgHtml({ 'aria-describedby': 'extra' })).toContain('aria-describedby="extra"');
  });

  it('sends the class and the free attributes to the fieldset, and the component wins a clash', () => {
    const out = rgHtml({ className: 'mine', 'data-x': 'y', 'data-museum-radiogroup': 'x' });
    expect(out).toContain('class="museum-field museum-radiogroup museum-radiogroup--md mine"');
    expect(out).toMatch(/<fieldset[^>]* data-x="y"/);
    expect(out.match(/data-museum-radiogroup/g)).toHaveLength(1);
    expect(out.match(/data-x/g)).toHaveLength(1);
  });

  it('writes the size on the group, not on the radios', () => {
    const out = rgHtml({ size: 'lg' });
    expect(out).toContain('museum-radiogroup--lg');
    expect(out).not.toContain('museum-radio--');
  });

  it('with no options it is a legend and nothing else', () => {
    expect(rgHtml({ options: [] })).toBe(g({}, legend()));
  });

  it('gives two RadioGroup in one tree different ids, each label pointing at its own radio', () => {
    const out = renderToStaticMarkup(
      createElement(Fragment, null, createElement(RadioGroup, { label: 'Same', name: 'x', options: opts }), createElement(RadioGroup, { label: 'Same', name: 'y', options: opts })),
    );
    const ids = [...out.matchAll(/<input id="([^"]+)"/g)].map((m) => m[1]);
    const fors = [...out.matchAll(/for="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(4);
    expect(fors).toEqual(ids);
  });
});

// Spec 014, T-3: the same field around a native <select>, with one <option> per option.
const slHtml = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(Select, { id: 'f', label: 'Label', options: opts, ...props }));
// The attribute order of the canonical markup: id, class, aria-*, required, disabled, hook.
const sel = (attrs: string, ...inner: string[]) => `<select id="f" class="museum-select museum-select--md"${attrs} data-museum-select="">${inner.join('')}</select>`;
const opt = (value: string, text: string, attrs = '') => `<option value="${value}"${attrs}>${text}</option>`;
const optsMarkup = (a = '', b = '') => opt('a', 'Option A', a) + opt('b', 'Option B', b);
const ph = (selected = true) => opt('', 'Choose', ` disabled=""${selected ? ' selected=""' : ''}`);
const SEL = ' selected=""';

describe('Select markup in React (spec 014, RF-2 to RF-9, RF-16)', () => {
  it('RF-2, RF-5: without hint or error it is a label and a select, with no ARIA and no empty nodes', () => {
    expect(slHtml({})).toBe(field(label(), sel('', optsMarkup())));
  });

  it('RF-3: a hint is described by the select', () => {
    expect(slHtml({ hint: 'Hint' })).toBe(field(label(), sel(' aria-describedby="f-hint"', optsMarkup()), hint));
  });

  it('RF-4: an error marks the select invalid and is described by it', () => {
    expect(slHtml({ error: 'Error' })).toBe(field(label(), sel(' aria-describedby="f-error" aria-invalid="true"', optsMarkup()), error));
  });

  it('RF-3, RF-4: with both, the error comes first in the description', () => {
    expect(slHtml({ hint: 'Hint', error: 'Error' })).toBe(
      field(label(), sel(' aria-describedby="f-error f-hint" aria-invalid="true"', optsMarkup()), hint, error),
    );
  });

  it('RF-6: required is native and the label shows a marker hidden from reading', () => {
    expect(slHtml({ required: true })).toBe(field(label(star), sel(' required=""', optsMarkup())));
  });

  it('RF-16: disabled of the select and of one option are the native ones', () => {
    expect(slHtml({ disabled: true })).toBe(field(label(), sel(' disabled=""', optsMarkup())));
    expect(slHtml({ options: [opts[0], { ...opts[1], disabled: true }] })).toBe(field(label(), sel('', optsMarkup('', ' disabled=""'))));
  });

  it('RF-8: defaultValue selects the option with that value, and no other', () => {
    expect(slHtml({ defaultValue: 'b' })).toBe(field(label(), sel('', optsMarkup('', SEL))));
    expect(slHtml({ defaultValue: '' })).toBe(field(label(), sel('', optsMarkup())));
  });

  it('RF-9: a placeholder is a first disabled option, selected when there is no defaultValue', () => {
    expect(slHtml({ placeholder: 'Choose' })).toBe(field(label(), sel('', ph() + optsMarkup())));
  });

  it('RF-8, RF-9: with a placeholder and a defaultValue, defaultValue wins', () => {
    expect(slHtml({ placeholder: 'Choose', defaultValue: 'b' })).toBe(field(label(), sel('', ph(false) + optsMarkup('', SEL))));
  });

  it('RF-8: a defaultValue that is not in options counts as absent', () => {
    expect(slHtml({ defaultValue: 'zzz' })).toBe(slHtml({}));
    expect(slHtml({ defaultValue: 'zzz', placeholder: 'Choose' })).toBe(slHtml({ placeholder: 'Choose' }));
  });

  it('RF-8: a controlled value selects its option, with no defaultValue and no React warning', () => {
    const errors: unknown[] = [];
    const spy = console.error;
    console.error = (...a: unknown[]) => void errors.push(a);
    try {
      expect(slHtml({ value: 'a', onChange: () => {} })).toBe(field(label(), sel('', optsMarkup(SEL))));
      expect(slHtml({ value: 'a', defaultValue: 'b', onChange: () => {} })).toBe(field(label(), sel('', optsMarkup(SEL))));
    } finally {
      console.error = spy;
    }
    expect(errors).toEqual([]);
  });

  it('keeps the consumer id and appends its aria-describedby after the component ids', () => {
    const out = slHtml({ id: 'mine', hint: 'Hint', 'aria-describedby': 'extra' });
    expect(out).toContain('<select id="mine"');
    expect(out).toContain('for="mine"');
    expect(out).toContain('id="mine-hint"');
    expect(out).toContain('aria-describedby="mine-hint extra"');
    expect(slHtml({ 'aria-describedby': 'extra' })).toContain('aria-describedby="extra"');
  });

  it('sends free attributes and the class to the select, and the component wins a clash', () => {
    const out = slHtml({ name: 'q', className: 'mine', 'data-museum-select': 'x' });
    expect(out).toContain('class="museum-select museum-select--md mine"');
    expect(out).toMatch(/<select[^>]* name="q"/);
    expect(out.match(/data-museum-select/g)).toHaveLength(1);
  });

  it('writes the size as a class of the select', () => {
    expect(slHtml({ size: 'lg' })).toContain('class="museum-select museum-select--lg"');
  });

  it('with no options it is a label and an empty select (or only the placeholder)', () => {
    expect(slHtml({ options: [] })).toBe(field(label(), sel('')));
    expect(slHtml({ options: [], placeholder: 'Choose' })).toBe(field(label(), sel('', ph())));
  });

  it('gives two Select in one tree different ids, each label pointing at its own select', () => {
    const out = renderToStaticMarkup(
      createElement(Fragment, null, createElement(Select, { label: 'Same', options: opts }), createElement(Select, { label: 'Same', options: opts })),
    );
    const ids = [...out.matchAll(/<select id="([^"]+)"/g)].map((m) => m[1]);
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

describe('Checkbox markup in Astro against React (spec 012, RF-1 to RF-6, RF-12)', () => {
  const contract = loadContract(resolve(repo, 'contracts/checkbox.contract.json'));
  const rendered = generated('checkbox');
  const norm = (m: string) => serialised(normalise('input', m));

  it('has one Astro render per case of the contract (9, the owner\'s hint-error one last)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered.map((c) => c.id)).toEqual(['default', 'hint', 'error', 'size-sm', 'size-lg', 'disabled', 'required', 'defaultChecked', 'hint-error']);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(Checkbox, props as never));
      expect(norm(astro), `case ${id}`).toBe(norm(react));
    }
  });

  it('RF-12: the default case has no checked attribute and defaultChecked has it', () => {
    expect(rendered.find((c) => c.id === 'default')!.html).not.toMatch(/\schecked/);
    expect(rendered.find((c) => c.id === 'defaultChecked')!.html).toMatch(/\schecked/);
  });

  it('emits no <script> in any case', () => {
    expect(rendered.filter((c) => /<script/i.test(c.html)).map((c) => c.id)).toEqual([]);
  });
});

describe('RadioGroup markup in Astro against React (spec 013, RF-1 to RF-9)', () => {
  const contract = loadContract(resolve(repo, 'contracts/radiogroup.contract.json'));
  const rendered = generated('radiogroup');
  // The group's id stands for every occurrence, the options' ids included (`ID-0`).
  const norm = (m: string) => serialised(normalise('fieldset', m));

  it('has one Astro render per case of the contract (9, the owner\'s hint-error one last)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered.map((c) => c.id)).toEqual(['default', 'hint', 'error', 'size-sm', 'size-lg', 'disabled', 'required', 'defaultValue', 'hint-error']);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(RadioGroup, props as never));
      expect(norm(astro), `case ${id}`).toBe(norm(react));
    }
  });

  it('RF-9: the default case checks no radio and defaultValue checks only option b', () => {
    const checked = (id: string) =>
      [...rendered.find((c) => c.id === id)!.html.matchAll(/<input[^>]*>/g)].filter((m) => /\schecked/.test(m[0])).map((m) => /value="([^"]+)"/.exec(m[0])![1]);
    expect(checked('default')).toEqual([]);
    expect(checked('defaultValue')).toEqual(['b']);
  });

  it('emits no <script> in any case', () => {
    expect(rendered.filter((c) => /<script/i.test(c.html)).map((c) => c.id)).toEqual([]);
  });
});

describe('Select markup in Astro against React (spec 014, RF-1 to RF-9)', () => {
  const contract = loadContract(resolve(repo, 'contracts/select.contract.json'));
  const rendered = generated('select');
  const norm = (m: string) => serialised(normalise('select', m));

  it('has one Astro render per case of the contract (10, the owner\'s hint-error one last)', () => {
    expect(rendered.map((c) => c.id)).toEqual(astroCases(contract).map((c) => c.id));
    expect(rendered.map((c) => c.id)).toEqual(['default', 'hint', 'error', 'placeholder', 'size-sm', 'size-lg', 'disabled', 'required', 'defaultValue', 'hint-error']);
  });

  it('renders every case with the same markup as React', () => {
    for (const { id, props, html: astro } of rendered) {
      const react = renderToStaticMarkup(createElement(Select, props as never));
      expect(norm(astro), `case ${id}`).toBe(norm(react));
    }
  });

  it('RF-8, RF-9: the default case selects nothing, defaultValue only option b, and the placeholder case its own option', () => {
    const selected = (id: string) =>
      [...rendered.find((c) => c.id === id)!.html.matchAll(/<option[^>]*>/g)].filter((m) => /\sselected/.test(m[0])).map((m) => /value="([^"]*)"/.exec(m[0])![1]);
    expect(selected('default')).toEqual([]);
    expect(selected('defaultValue')).toEqual(['b']);
    expect(selected('placeholder')).toEqual(['']);
  });

  it('emits no <script> in any case', () => {
    expect(rendered.filter((c) => /<script/i.test(c.html)).map((c) => c.id)).toEqual([]);
  });
});
