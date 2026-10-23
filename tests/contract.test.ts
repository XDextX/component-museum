import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { declaredProps, diffApi, eventLiterals } from './lib/api.ts';
import {
  classProp,
  componentDirs,
  contentProp,
  eventName,
  expectedApi,
  findContractFiles,
  loadContract,
  problems,
  type Contract,
} from './lib/contract.ts';

const root = resolve(import.meta.dirname, '..');
const button = loadContract(resolve(root, 'contracts/button.contract.json'));
const field: Contract = {
  name: 'Field',
  props: {
    label: { type: 'string', required: true },
    hint: { type: 'string', default: '' },
    size: { type: 'enum', values: ['sm', 'md'], default: 'md' },
    disabled: { type: 'boolean', default: false },
  },
  events: [],
  content: false,
  classProp: true,
};
const fieldType = (label: string, hint = 'hint?: string') =>
  `export type FieldProps = { ${label}; ${hint}; size?: "sm" | "md"; disabled?: boolean; className?: string };`;

describe('name rules', () => {
  it('derives event names per framework (RF-8)', () => {
    expect(eventName('astro', 'button', 'click')).toBe('museum:button:click');
    expect(eventName('react', 'button', 'click')).toBe('onClick');
  });

  it('names the class prop per framework (RF-10)', () => {
    expect(classProp('astro')).toBe('class');
    expect(classProp('react')).toBe('className');
  });

  it('names the content prop per framework', () => {
    expect(contentProp('astro')).toBeNull();
    expect(contentProp('react')).toBe('children');
  });
});

describe('expectedApi', () => {
  it('translates Button for React', () => {
    expect(expectedApi(button, 'react')).toEqual({
      variant: ['primary', 'secondary', 'outline'],
      size: ['sm', 'md', 'lg'],
      type: ['button', 'submit', 'reset'],
      disabled: 'boolean',
      className: 'any',
      children: 'any',
      onClick: 'any',
    });
  });

  it('translates Button for Astro, with no content prop (slot)', () => {
    expect(expectedApi(button, 'astro')).toEqual({
      variant: ['primary', 'secondary', 'outline'],
      size: ['sm', 'md', 'lg'],
      type: ['button', 'submit', 'reset'],
      disabled: 'boolean',
      class: 'any',
    });
  });
});

describe('expectedApi with text props', () => {
  it('translates an optional text prop to string and a required one to string!', () => {
    expect(expectedApi(field, 'react')).toEqual({
      label: 'string!',
      hint: 'string',
      size: ['sm', 'md'],
      disabled: 'boolean',
      className: 'any',
    });
    expect(expectedApi(field, 'astro')).toMatchObject({ label: 'string!', hint: 'string', class: 'any' });
  });

  it('reads text props from a declared type, optional or required', () => {
    const { own } = declaredProps('virtual-field.tsx', 'FieldProps', fieldType('label: string'));
    expect(own).toMatchObject({ label: 'string!', hint: 'string' });
    expect(diffApi(expectedApi(field, 'react'), own)).toEqual([]);
  });

  it('flags a required text prop declared optional, and a text prop of another type', () => {
    const optional = declaredProps('virtual-field.tsx', 'FieldProps', fieldType('label?: string'));
    expect(diffApi(expectedApi(field, 'react'), optional.own)).toEqual(['prop label is "string", expected "string!"']);
    const mistyped = declaredProps('virtual-field.tsx', 'FieldProps', fieldType('label: string', 'hint?: boolean'));
    expect(diffApi(expectedApi(field, 'react'), mistyped.own)).toHaveLength(1);
  });
});

describe('problems', () => {
  const c = (name: string) => ({ file: `${name}.contract.json`, name });

  it('is empty when every component has exactly one contract', () => {
    expect(problems([c('Button')], ['Button'])).toEqual([]);
  });

  it('flags a component without a contract', () => {
    expect(problems([c('Button')], ['Button', 'Ghost'])).toEqual(['Ghost has no contract']);
  });

  it('flags a component with more than one contract', () => {
    expect(problems([c('Button'), { file: 'other/b.contract.json', name: 'Button' }], ['Button'])).toEqual([
      'Button has 2 contracts: Button.contract.json, other/b.contract.json',
    ]);
  });

  it('flags a contract whose component has no folder', () => {
    expect(problems([c('Button'), c('Orphan')], ['Button'])).toEqual(['Orphan has a contract but no component folder']);
  });
});

describe('RF-6: one contract per component, in the real repo', () => {
  it('has exactly one definition for each component, and Button is one', () => {
    const found = findContractFiles(root).map((file) => ({
      file,
      name: JSON.parse(readFileSync(resolve(root, file), 'utf8')).name as string,
    }));
    expect(found.map((f) => f.name)).toContain('Button');
    expect(problems(found, componentDirs(root))).toEqual([]);
  });
});

describe('RF-7, RF-8, RF-10: each implementation against its contract', () => {
  const impl = (name: string, framework: 'react' | 'astro') => ({
    file: resolve(root, `packages/${framework}/src/${name}/${name}.${framework === 'react' ? 'tsx' : 'astro'}`),
    type: framework === 'react' ? `${name}Props` : 'Props',
  });
  const contracts = findContractFiles(root).map((f) => loadContract(resolve(root, f)));

  // Every contract, in every framework whose folder exists (Button always does).
  for (const contract of contracts) {
    for (const framework of ['react', 'astro'] as const) {
      const { file, type } = impl(contract.name, framework);
      if (!existsSync(file)) continue;
      const lower = contract.name.toLowerCase();
      const other = framework === 'react' ? 'class' : 'className';

      it(`${contract.name} ${framework}: own props match the translated contract (RF-7, RF-10)`, () => {
        const { own, all } = declaredProps(file, type);
        expect(diffApi(expectedApi(contract, framework), own)).toEqual([]);
        expect(all).toContain(classProp(framework));
        expect(all).not.toContain(other);
      });

      if (framework === 'react') {
        it(`${contract.name} react: on* props are exactly the contract events (RF-8)`, () => {
          const { own } = declaredProps(file, type);
          expect(Object.keys(own).filter((n) => /^on[A-Z]/.test(n))).toEqual(
            contract.events.map((e) => eventName('react', lower, e)),
          );
        });
      } else {
        it(`${contract.name} astro: dispatches only the derived DOM events (RF-8)`, () => {
          expect(eventLiterals(readFileSync(file, 'utf8'))).toEqual(
            contract.events.map((e) => eventName('astro', lower, e)).sort(),
          );
        });
      }
    }
  }

  it('Button is among the contracts checked', () => {
    expect(contracts.map((c) => c.name)).toContain('Button');
  });

  it('flags a prop that is missing, extra, mistyped or misnamed', () => {
    const want = expectedApi(button, 'react');
    const { size: _size, ...withoutSize } = want;
    expect(diffApi(want, withoutSize)).toEqual(['missing prop size']);
    expect(diffApi(want, { ...want, foo: 'any' })).toEqual(['extra prop foo']);
    expect(diffApi(want, { ...want, size: ['sm'] })).toHaveLength(1);
    const { onClick: _o, ...renamed } = want;
    expect(diffApi(want, { ...renamed, onPress: 'any' })).toEqual(['missing prop onClick', 'extra prop onPress']);
  });
});
