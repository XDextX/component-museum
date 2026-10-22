import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { argTypesFromContract, astroCases, usageSnippet } from '../gallery/lib/contract-args.ts';
import { loadContract } from './lib/contract.ts';

const button = loadContract(resolve(import.meta.dirname, '..', 'contracts/button.contract.json'));
const example = { 'my-button': '.my-button { color: red; }' };

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
