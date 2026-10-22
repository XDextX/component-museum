import { readFileSync } from 'node:fs';
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
} from './lib/contract.ts';

const root = resolve(import.meta.dirname, '..');
const button = loadContract(resolve(root, 'contracts/button.contract.json'));

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

describe('RF-7, RF-8, RF-10: each implementation against the contract', () => {
  const impls = {
    react: { file: resolve(root, 'packages/react/src/Button/Button.tsx'), type: 'ButtonProps' },
    astro: { file: resolve(root, 'packages/astro/src/Button/Button.astro'), type: 'Props' },
  } as const;

  for (const framework of ['react', 'astro'] as const) {
    const { file, type } = impls[framework];
    const other = framework === 'react' ? 'class' : 'className';

    it(`${framework}: own props match the translated contract (RF-7, RF-10)`, () => {
      const { own, all } = declaredProps(file, type);
      expect(diffApi(expectedApi(button, framework), own)).toEqual([]);
      expect(all).toContain(classProp(framework));
      expect(all).not.toContain(other);
    });
  }

  it('react: on* props are exactly the contract events (RF-8)', () => {
    const { own } = declaredProps(impls.react.file, impls.react.type);
    expect(Object.keys(own).filter((n) => /^on[A-Z]/.test(n))).toEqual(
      button.events.map((e) => eventName('react', 'button', e)),
    );
  });

  it('astro: dispatches only the derived DOM events (RF-8)', () => {
    expect(eventLiterals(readFileSync(impls.astro.file, 'utf8'))).toEqual(
      button.events.map((e) => eventName('astro', 'button', e)).sort(),
    );
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
