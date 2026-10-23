import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { argTypesFromContract, astroCases, usageSnippet, type ArgTypes, type Contract } from '../gallery/lib/contract-args.ts';
import { loadContract } from './lib/contract.ts';
import { declaredTitles, exportedContracts, packageExports, slug, storyFile, storyProblems } from './lib/gallery-pages.ts';

const repo = resolve(import.meta.dirname, '..');
const contract: Contract = loadContract(resolve(repo, 'contracts/button.contract.json'));
const variants = (c: Contract) => (c.props.variant as { values: string[] }).values;
const grow = (c: Contract) => {
  const grown = structuredClone(c);
  variants(grown).push('ghost');
  return grown;
};

type AstroCase = { id: string; props: Record<string, unknown>; html: string; usage: string };

// Every component a package exports with a contract: the rules below hold for each (spec 009, RF-10).
const components = exportedContracts(repo);
const exports = packageExports(repo);

/** RF-3: differences between the story's controls and what the contract asks for. */
function argTypeProblems(c: Contract, argTypes: ArgTypes, exampleClasses: string[]): string[] {
  const out: string[] = [];
  for (const [name, spec] of Object.entries(c.props)) {
    const got = argTypes[name];
    if (!got) out.push(`missing control ${name}`);
    else if (spec.type === 'enum') {
      if (got.control.type !== 'select') out.push(`${name} is not a closed list`);
      if (JSON.stringify(got.options) !== JSON.stringify(spec.values)) out.push(`${name} options differ from the contract`);
    } else if (spec.type === 'string') {
      if (got.control.type !== 'text') out.push(`${name} is not a text field`);
    } else if (got.control.type !== 'boolean') out.push(`${name} is not a switch`);
  }
  if (c.content && !argTypes.children) out.push('missing control children');
  if (c.classProp) {
    const cls = argTypes.className;
    if (!cls) out.push('missing control className');
    else if (JSON.stringify(cls.options) !== JSON.stringify(['', ...exampleClasses])) out.push('className offers something besides none and the example classes');
  }
  const allowed = new Set([...Object.keys(c.props), 'children', 'className']);
  for (const name of Object.keys(argTypes)) if (!allowed.has(name)) out.push(`control ${name} is not a contract prop`);
  return out;
}

/** RF-5 and RF-6 for Button: one message per missing case, wrong HTML, empty accessible name or foreign usage code. */
function astroProblems(c: Contract, cases: AstroCase[]): string[] {
  const out: string[] = [];
  for (const v of variants(c)) {
    for (const disabled of [false, true]) {
      const id = disabled ? `${v}-disabled` : v;
      const found = cases.find((x) => x.id === id);
      if (!found) {
        out.push(`${id}: no Astro case`);
        continue;
      }
      if (!found.html.includes(`museum-button--${v}`)) out.push(`${id}: html lacks museum-button--${v}`);
      if (!/^<button[\s\S]*<\/button>$/.test(found.html)) out.push(`${id}: html is not a <button>`);
      const text = found.html.replace(/<[^>]*>/g, '').trim();
      if (!text && !/\saria-label="[^"]+"/.test(found.html)) out.push(`${id}: no accessible name`);
      if (!found.usage?.trim()) out.push(`${id}: no usage code`);
      else {
        const named = found.usage.match(/variant="(\w+)"/)?.[1] ?? (c.props.variant as { default: string }).default;
        if (named !== v) out.push(`${id}: usage code names variant ${named}`);
        if (/\bdisabled\b/.test(found.usage) !== disabled) out.push(`${id}: usage code disagrees on disabled`);
      }
    }
  }
  for (const { id } of cases) if (cases.filter((x) => x.id === id).length > 1) out.push(`${id}: duplicated`);
  return out;
}

/** RF-5 and RF-6 for any contract: every `astroCases` state, with the component's class, a name, its own usage code and no script. */
function astroCaseProblems(c: Contract, cases: AstroCase[]): string[] {
  const out: string[] = [];
  const wanted = astroCases(c);
  for (const { id, props } of wanted) {
    const found = cases.find((x) => x.id === id);
    if (!found) {
      out.push(`${id}: no Astro case`);
      continue;
    }
    if (!found.html.includes(`museum-${slug(c.name)}`)) out.push(`${id}: html lacks museum-${slug(c.name)}`);
    if (/<script/i.test(found.html)) out.push(`${id}: html carries a <script>`);
    if (!found.html.replace(/<[^>]*>/g, '').trim() && !/\saria-label="[^"]+"/.test(found.html)) out.push(`${id}: no accessible name`);
    if (found.usage !== usageSnippet('astro', props, c)) out.push(`${id}: usage code is not the contract's usage of those props`);
  }
  for (const { id } of cases) if (cases.filter((x) => x.id === id).length > 1) out.push(`${id}: duplicated`);
  if (cases.length !== wanted.length) out.push(`expected ${wanted.length} cases, got ${cases.length}`);
  return out;
}

describe('RF-1: a story per framework for every exported component', () => {
  const titles = components.flatMap((c) => declaredTitles(repo, c.name));

  it('finds the exports', () => {
    expect(exports.React).toContain('Button');
    expect(exports.Astro).toContain('Button');
  });

  it('has no export without its story', () => {
    expect(storyProblems(exports, titles)).toEqual([]);
  });

  it('is built into Storybook under the same name', () => {
    const index = JSON.parse(readFileSync(resolve(inject('gallery').storybook, 'index.json'), 'utf8')) as {
      entries: Record<string, { title: string; type: string }>;
    };
    const built = Object.values(index.entries).filter((e) => e.type === 'story').map((e) => e.title);
    expect(storyProblems(exports, built)).toEqual([]);
  });

  it('bites: an export without a story, or a story under another name, is reported', () => {
    expect(storyProblems({ React: ['Button', 'Card'], Astro: ['Button'] }, ['Button/React', 'Button/Astro'])).toEqual(['Card has no React story titled Card/React']);
    expect(storyProblems({ React: ['Button'], Astro: ['Button'] }, ['Button/React'])).toEqual(['Button has no Astro story titled Button/Astro']);
  });

  it('bites: a second exported component without a story is reported in both frameworks', () => {
    const second = { React: [...exports.React, 'Second'], Astro: [...exports.Astro, 'Second'] };
    expect(storyProblems(second, titles)).toEqual(['Second has no React story titled Second/React', 'Second has no Astro story titled Second/Astro']);
  });
});

describe.each(components.map((c) => [c.name, c] as const))('RF-3: the %s React story has a control per contract prop', (name, c) => {
  it('matches the contract', async () => {
    // A variable specifier keeps the root tsc out of gallery/, which has its own build (Storybook).
    const story = `../${storyFile(name, 'react')}`;
    const { default: meta } = (await import(/* @vite-ignore */ story)) as { default: { argTypes: ArgTypes } };
    const { argTypes } = meta;
    expect(argTypeProblems(c, argTypes, argTypes.className?.options?.slice(1) ?? [])).toEqual([]);
    if (name === 'Button') expect(argTypes.className.options).toEqual(['', 'my-button']);
  });
});

describe('RF-3: the controls check bites', () => {
  const good = argTypesFromContract(contract, { 'my-button': 'x' });
  it('bites: a variant list short of one value, a text variant, no class control or a foreign class', () => {
    const short = { ...good, variant: { control: { type: 'select' as const }, options: variants(contract).slice(1) } };
    expect(argTypeProblems(contract, short, ['my-button'])).toEqual(['variant options differ from the contract']);
    const text = { ...good, variant: { control: { type: 'text' as const }, options: variants(contract) } };
    expect(argTypeProblems(contract, text, ['my-button'])).toEqual(['variant is not a closed list']);
    const { className: _dropped, ...noClass } = good;
    expect(argTypeProblems(contract, noClass, ['my-button'])).toEqual(['missing control className']);
    expect(argTypeProblems(contract, good, ['my-button', 'px-4'])).toHaveLength(1);
  });

  it('bites: a contract variant the controls do not know', () => {
    expect(argTypeProblems(grow(contract), good, ['my-button'])).toEqual(['variant options differ from the contract']);
  });

  it('bites: a text prop whose control is not a text field', () => {
    const withText: Contract = { ...contract, props: { ...contract.props, label: { type: 'string', required: true } } };
    const switchy = { ...argTypesFromContract(withText, { 'my-button': 'x' }), label: { control: { type: 'boolean' as const } } };
    expect(argTypeProblems(withText, switchy, ['my-button'])).toEqual(['label is not a text field']);
  });
});

describe('RF-5 and RF-6: every state of every Astro component is prerendered with its usage code', () => {
  const casesOf = (name: string) =>
    JSON.parse(readFileSync(join(dirname(inject('gallery').astroJson), `astro-${slug(name)}.json`), 'utf8')) as AstroCase[];
  const astroComponents = components.filter((c) => exports.Astro.includes(c.name));

  it.each(astroComponents.map((c) => [c.name, c] as const))('%s has every case, with museum-%s, a name and its own usage code', (name, c) => {
    expect(astroCaseProblems(c, casesOf(name))).toEqual([]);
  });

  it('bites: a case with a <script>, a missing case or foreign usage code is reported', () => {
    const cases = casesOf('Button');
    const first = cases[0];
    const swap = (patch: Partial<AstroCase>) => cases.map((x) => (x === first ? { ...x, ...patch } : x));
    expect(astroCaseProblems(contract, swap({ html: `${first.html}<script>1</script>` }))).toEqual([`${first.id}: html carries a <script>`]);
    expect(astroCaseProblems(contract, cases.slice(1))).toEqual([`${first.id}: no Astro case`, `expected ${cases.length} cases, got ${cases.length - 1}`]);
    expect(astroCaseProblems(contract, swap({ usage: 'x' }))).toEqual([`${first.id}: usage code is not the contract's usage of those props`]);
  });

  // Button's own checks stay as they were: the exact <button>, its variant class and the six cases.
  describe('Button', () => {
    const cases = casesOf('Button');

    it('has every case, with museum-button--<variant>, an accessible name and its own usage code', () => {
      expect(astroProblems(contract, cases)).toEqual([]);
      expect(cases).toHaveLength(variants(contract).length * 2);
    });

    it('bites: a variant new to the contract without its Astro case is reported', () => {
      expect(astroProblems(grow(contract), cases)).toEqual(['ghost: no Astro case', 'ghost-disabled: no Astro case']);
    });

    it('bites: wrong class, empty name, missing usage code, or usage code naming another variant', () => {
      const first = cases[0];
      const swap = (patch: Partial<AstroCase>) => cases.map((x) => (x === first ? { ...x, ...patch } : x));
      expect(astroProblems(contract, swap({ html: first.html.replaceAll('museum-button--', 'x-') }))).not.toEqual([]);
      expect(astroProblems(contract, swap({ html: '<button class="museum-button--primary"></button>' }))).toEqual([`${first.id}: no accessible name`]);
      expect(astroProblems(contract, swap({ usage: '' }))).toEqual([`${first.id}: no usage code`]);
      expect(astroProblems(contract, swap({ usage: first.usage.replace('<Button', '<Button variant="outline"') }))).toEqual([`${first.id}: usage code names variant outline`]);
    });
  });
});
