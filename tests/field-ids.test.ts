import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { Field } from '../packages/react/src/field.tsx';
import { fieldIds } from '../packages/astro/src/field.ts';

// Spec 010, T-1 and spec 012, T-1: the id and aria-describedby logic shared by the Astro fields, as data.
const counter = globalThis as { __museumFieldCount?: Record<string, number> };
beforeEach(() => {
  delete counter.__museumFieldCount;
});

describe('fieldIds (spec 010, RF-2 to RF-5)', () => {
  it('keeps the consumer id as the control id', () => {
    expect(fieldIds('museum-input', 'mine', '', '', undefined).controlId).toBe('mine');
  });

  it('counts per prefix, from 1, so the ids are reproducible', () => {
    expect(fieldIds('museum-input', undefined, '', '', undefined).controlId).toBe('museum-input-1');
    expect(fieldIds('museum-input', undefined, '', '', undefined).controlId).toBe('museum-input-2');
    expect(fieldIds('museum-textarea', undefined, '', '', undefined).controlId).toBe('museum-textarea-1');
  });

  it('does not spend the counter when the consumer gives an id', () => {
    fieldIds('museum-input', 'mine', '', '', undefined);
    expect(fieldIds('museum-input', undefined, '', '', undefined).controlId).toBe('museum-input-1');
  });

  it('describes by error, then hint, then the consumer ids', () => {
    expect(fieldIds('museum-input', 'f', 'Hint', 'Error', 'extra')).toEqual({
      controlId: 'f',
      hintId: 'f-hint',
      errorId: 'f-error',
      describedBy: 'f-error f-hint extra',
    });
  });

  it('gives undefined when there is nothing to describe by', () => {
    expect(fieldIds('museum-input', 'f', '', '', undefined)).toEqual({ controlId: 'f', hintId: undefined, errorId: undefined, describedBy: undefined });
    expect(fieldIds('museum-input', 'f', '', '', '').describedBy).toBeUndefined();
  });

  it('keeps only the consumer ids when there is no hint or error', () => {
    expect(fieldIds('museum-input', 'f', '', '', 'extra').describedBy).toBe('extra');
  });
});

describe('fieldIds, checkbox prefix (spec 012, RF-2 to RF-6)', () => {
  it('counts museum-checkbox apart from the other prefixes', () => {
    expect(fieldIds('museum-checkbox', undefined, '', '', undefined).controlId).toBe('museum-checkbox-1');
    expect(fieldIds('museum-input', undefined, '', '', undefined).controlId).toBe('museum-input-1');
    expect(fieldIds('museum-checkbox', undefined, '', '', undefined).controlId).toBe('museum-checkbox-2');
  });
});

describe('Field inline in React (spec 012, RF-2)', () => {
  const render = (inline?: boolean) =>
    renderToStaticMarkup(
      createElement(Field, { label: 'L', hint: '', error: '', required: false, id: 'f', describedBy: undefined, inline, children: () => createElement('input', { id: 'f' }) }),
    );
  it('draws the control before the label and adds museum-field--inline', () => {
    expect(render(true)).toBe('<div class="museum-field museum-field--inline"><input id="f"/><label class="museum-field__label" for="f">L</label></div>');
  });
  it('without inline keeps the label first and no modifier', () => {
    expect(render()).toBe('<div class="museum-field"><label class="museum-field__label" for="f">L</label><input id="f"/></div>');
  });
});
