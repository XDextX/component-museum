import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { argTypesFromContract, astroCases, defaultSummary, exampleText, usageSnippet } from '../gallery/lib/contract-args.ts';
import { loadContract, type Contract } from './lib/contract.ts';

const button = loadContract(resolve(import.meta.dirname, '..', 'contracts/button.contract.json'));
const example = { 'my-button': '.my-button { color: red; }' };
// In memory on purpose: the Input contract file belongs to another task.
const input: Contract = {
  name: 'Input',
  props: {
    label: { type: 'string', required: true },
    hint: { type: 'string', default: '' },
    error: { type: 'string', default: '' },
    type: { type: 'enum', values: ['text', 'email', 'password', 'search', 'tel', 'url', 'number'], default: 'text' },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    disabled: { type: 'boolean', default: false },
    required: { type: 'boolean', default: false },
  },
  events: [],
  content: false,
  classProp: true,
};

describe('argTypesFromContract (RF-3)', () => {
  const types = argTypesFromContract(button, example);

  it('gives a closed list per enum and a switch per boolean', () => {
    for (const name of ['variant', 'size', 'type']) {
      expect(types[name].options).toEqual((button.props[name] as { values: string[] }).values);
      expect(types[name].control).toEqual({ type: 'select' });
    }
    expect(types.disabled.control).toEqual({ type: 'boolean' });
  });

  it('closes the class control to none plus the example classes, with the CSS shown', () => {
    expect(types.className.options).toEqual(['', 'my-button']);
    expect(types.className.control).toEqual({ type: 'select', labels: { '': 'none' } });
    expect(types.className.description).toContain('.my-button { color: red; }');
  });

  it('gives the content a text control and the events none', () => {
    expect(types.children.control).toEqual({ type: 'text' });
    expect(Object.keys(types).some((k) => /click/i.test(k))).toBe(false);
  });
});

describe('usageSnippet (RF-7, RF-8)', () => {
  const imports = (fw: 'react' | 'astro') => [
    `import { Button } from '@component-museum/${fw}';`,
    `import '@component-museum/${fw}/styles.css';`,
  ];

  it('always writes both imports and omits default props', () => {
    for (const fw of ['react', 'astro'] as const) {
      const s = usageSnippet(fw, { variant: 'primary', size: 'md', disabled: false }, button);
      for (const line of imports(fw)) expect(s).toContain(line);
      expect(s).not.toMatch(/variant=|size=|disabled/);
    }
  });

  it('writes only non-default props, with the framework class name', () => {
    const args = { variant: 'outline', disabled: true, children: 'Hi', className: 'my-button' };
    expect(usageSnippet('react', args, button)).toContain(
      '<Button variant="outline" disabled className="my-button">Hi</Button>',
    );
    expect(usageSnippet('astro', args, button)).toContain(
      '<Button variant="outline" disabled class="my-button">Hi</Button>',
    );
  });

  it('self-closes without content and ignores an empty class', () => {
    expect(usageSnippet('react', { className: '', children: '' }, button)).toContain('<Button />');
  });
});

describe('astroCases', () => {
  it('gives every variant, normal and disabled', () => {
    const cases = astroCases(button);
    expect(cases.map((c) => c.id)).toEqual([
      'primary', 'primary-disabled', 'secondary', 'secondary-disabled', 'outline', 'outline-disabled',
    ]);
    expect(cases[1].props).toMatchObject({ variant: 'primary', disabled: true });
    expect(cases[0].props).toMatchObject({ variant: 'primary', disabled: false });
  });
});

describe('defaultSummary and table.defaultValue (spec 007, RF-1)', () => {
  it('writes each contract default the way the props table shows it', () => {
    const summaries = Object.fromEntries(Object.entries(button.props).map(([n, s]) => [n, defaultSummary(s)]));
    expect(summaries).toEqual({ variant: 'primary', size: 'md', type: 'button', disabled: 'false' });
  });

  it('puts that default on the control of every contract prop', () => {
    const types = argTypesFromContract(button, example);
    for (const [name, spec] of Object.entries(button.props)) {
      expect(types[name].table?.defaultValue?.summary).toBe(defaultSummary(spec));
    }
  });
});

describe('text props (spec 009, RF-1)', () => {
  const types = argTypesFromContract(input, {});

  it('gives a text control to every string, and a default only to the optional ones', () => {
    for (const name of ['label', 'hint', 'error']) expect(types[name].control).toEqual({ type: 'text' });
    expect(types.label.table).toBeUndefined();
    expect(types.hint.table?.defaultValue.summary).toBe('""');
  });

  it('writes an empty default as "" and nothing for a required text', () => {
    expect(defaultSummary(input.props.hint)).toBe('""');
    expect(defaultSummary(input.props.error)).toBe('""');
    expect(defaultSummary(input.props.label)).toBeUndefined();
  });

  it('writes label="…" in the usage, the required text always and the optional ones off default', () => {
    const s = usageSnippet('react', { label: 'Name', hint: '', type: 'email', size: 'md' }, input);
    expect(s).toContain('<Input label="Name" type="email" />');
    expect(usageSnippet('astro', { label: 'Name', hint: 'Help' }, input)).toContain('<Input label="Name" hint="Help" />');
  });

  it('capitalises the prop name as the example text', () => {
    expect(exampleText('label')).toBe('Label');
    expect(exampleText('hint')).toBe('Hint');
    expect(exampleText('error')).toBe('Error');
  });

  it('gives the 14 Astro cases of a contract without variant, the hint and error together last (spec 010)', () => {
    const cases = astroCases(input);
    expect(cases.map((c) => c.id)).toEqual([
      'default', 'hint', 'error',
      'type-email', 'type-password', 'type-search', 'type-tel', 'type-url', 'type-number',
      'size-sm', 'size-lg', 'disabled', 'required', 'hint-error',
    ]);
    expect(cases[0].props).toEqual({ label: 'Label' });
    expect(cases[1].props).toEqual({ label: 'Label', hint: 'Hint' });
    expect(cases[3].props).toEqual({ label: 'Label', type: 'email' });
    expect(cases[11].props).toEqual({ label: 'Label', disabled: true });
    expect(cases[13].props).toEqual({ label: 'Label', hint: 'Hint', error: 'Error' });
  });
});
