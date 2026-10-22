import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { usageSnippet, type Contract } from '../gallery/lib/contract-args.ts';
import { loadContract } from './lib/contract.ts';

const repo = resolve(import.meta.dirname, '..');
const gallery = join(repo, 'gallery');
const contract = loadContract(join(repo, 'contracts/button.contract.json')) as Contract;
const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const mdx = read(join(gallery, 'stories/Button.mdx'));
const reactStory = read(join(gallery, 'stories/Button.react.stories.tsx'));

// The sheet's own classes, and the example classes the React story defines and shows (RF-8, RF-9).
const sheetClasses = new Set(read(join(repo, 'styles/museum.css')).match(/\.museum-[\w-]+/g)!.map((c) => c.slice(1)));
const exampleBlock = reactStory.match(/const exampleClasses = (\{[\s\S]*?\n\});/)![1];
const exampleClasses = new Function(`return ${exampleBlock}`)() as Record<string, string>;
const norm = (css: string) => css.replace(/\s+/g, ' ').trim();

type Block = { lang: string; code: string };
const blocks = (text: string): Block[] =>
  [...text.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], code: m[2] }));

/** Splits the MDX at its language anchors (`<a id="es">`, `<a id="en">`). */
function languages(text: string): Record<string, string> {
  const [, ...rest] = text.split(/<a id="(es|en)"><\/a>/);
  const out: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) out[rest[i]] = rest[i + 1];
  return out;
}

const SECTIONS = {
  es: ['Uso', 'Construcción', 'Cómo alterarlo'],
  en: ['Usage', 'How it is built', 'How to alter it'],
};

/** Returns every violation of RF-7 and RF-8 in one usage snippet (tsx or astro). */
function snippetProblems(lang: 'tsx' | 'astro', code: string): string[] {
  const fw = lang === 'tsx' ? 'react' : 'astro';
  const problems: string[] = [];
  const imports = [...code.matchAll(/^import .*? from '([^']+)';$/gm)].map((m) => m[1]);
  const sheet = [...code.matchAll(/^import '([^']+)';$/gm)].map((m) => m[1]);
  if (!imports.includes(`@component-museum/${fw}`)) problems.push(`no component import for ${fw}`);
  if (!sheet.includes(`@component-museum/${fw}/styles.css`)) problems.push(`no sheet import for ${fw}`);
  for (const spec of [...imports, ...sheet]) {
    if (!spec.startsWith(`@component-museum/${fw}`)) problems.push(`import ${spec} is not by package name`);
  }
  const classAttr = lang === 'tsx' ? 'className' : 'class';
  for (const [, attrs] of code.matchAll(/<Button\b([^>]*)>/g)) {
    for (const [, name, value] of attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
      if (name === classAttr) {
        for (const cls of value.split(/\s+/).filter(Boolean)) {
          if (!sheetClasses.has(cls) && !(cls in exampleClasses)) problems.push(`class ${cls} is neither museum-* nor an example class`);
        }
      } else if (!(name in contract.props)) problems.push(`prop ${name} is not in the contract`);
    }
  }
  return problems;
}

const mdxSnippets = blocks(mdx).filter((b) => b.lang === 'tsx' || b.lang === 'astro');
const allArgs = { variant: 'outline', size: 'lg', type: 'submit', disabled: true, children: 'Hi', className: 'my-button' };
const STATES = (['react', 'astro'] as const).flatMap((fw) => [{}, allArgs].map((args) => ({ fw, args })));

describe('documentation in both languages (spec 004, RF-2)', () => {
  const langs = languages(mdx);

  it.each(Object.entries(SECTIONS))('%s has its three sections, each with content', (lang, titles) => {
    const body = langs[lang] ?? '';
    const found = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(found).toEqual(titles);
    for (const part of body.split(/^## .+$/m).slice(1)) expect(part.trim()).not.toBe('');
  });
});

describe('usage code (RF-7, RF-8)', () => {
  it('reads snippets from the MDX, in both languages and both frameworks', () => {
    expect(mdxSnippets.length).toBeGreaterThanOrEqual(6);
  });

  it.each(mdxSnippets.map((b, i) => [i, b] as const))('MDX snippet %i is clean', (_i, b) => {
    expect(snippetProblems(b.lang as 'tsx' | 'astro', b.code)).toEqual([]);
  });

  it.each(STATES.map((s) => [s.fw, JSON.stringify(s.args), s] as const))('usageSnippet(%s, %s) is clean', (_fw, _a, s) => {
    expect(snippetProblems(s.fw === 'react' ? 'tsx' : 'astro', usageSnippet(s.fw, s.args, contract))).toEqual([]);
  });

  it('flags a utility class, an invented prop and the wrong class attribute (the guard bites)', () => {
    const base = "import { Button } from '@component-museum/react';\nimport '@component-museum/react/styles.css';\n\n";
    expect(snippetProblems('tsx', base + '<Button className="px-4">x</Button>')).not.toEqual([]);
    expect(snippetProblems('tsx', base + '<Button tone="loud">x</Button>')).not.toEqual([]);
    expect(snippetProblems('tsx', base + '<Button class="my-button">x</Button>')).not.toEqual([]);
  });
});

describe('example class CSS in every place (RF-9)', () => {
  const langs = languages(mdx);
  const used = new Set(
    [...mdxSnippets.map((b) => b.code), ...STATES.map((s) => usageSnippet(s.fw, s.args, contract))]
      .flatMap((c) => [...c.matchAll(/class(?:Name)?="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)))
      .filter((c) => c && !sheetClasses.has(c)),
  );

  it('uses only example classes the story defines', () => {
    expect([...used].filter((c) => !(c in exampleClasses))).toEqual([]);
  });

  // The story holds the CSS once (exampleClasses); the control description and the decorator read it.
  it('shows the story CSS beside the control: description and decorator read the same object', () => {
    expect(reactStory).toMatch(/argTypesFromContract\(contract, exampleClasses\)/);
    expect(reactStory).toMatch(/Object\.values\(exampleClasses\)\.join/);
  });

  // The MDX cannot import the story's constant, so its copy is held equal by this test (byte-normalised).
  it.each(Object.entries(SECTIONS))('%s "how to alter it" carries the same CSS as the story', (lang) => {
    const how = langs[lang].split(/^## /m).find((s) => s.startsWith(SECTIONS[lang as 'es' | 'en'][2]))!;
    const css = blocks(how).filter((b) => b.lang === 'css').map((b) => norm(b.code));
    for (const [name, rule] of Object.entries(exampleClasses)) {
      expect(css, `${lang}: .${name}`).toContain(norm(rule));
    }
  });
});

describe('gallery imports by package name (RF-10)', () => {
  const skip = new Set(['node_modules', 'generated', 'storybook-static', 'dist', '.astro']);
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      skip.has(e.name) ? [] : e.isDirectory() ? files(join(dir, e.name)) : /\.(ts|tsx|mjs|astro|mdx)$/.test(e.name) ? [join(dir, e.name)] : [],
    );
  const specifiers = (text: string) =>
    [...text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);

  /** Whether a package specifier resolves from `gallery/` through the workspace link and the package's exports. */
  function resolves(spec: string): boolean {
    const [scope, name, ...sub] = spec.split('/');
    const manifest = join(repo, 'node_modules', scope, name, 'package.json');
    if (!existsSync(manifest)) return false;
    const exp = JSON.parse(read(manifest)).exports ?? {};
    return (sub.length ? `./${sub.join('/')}` : '.') in exp;
  }

  /** Returns why a specifier breaks RF-10, or null. */
  function verdict(file: string, spec: string): string | null {
    if (/(^|\/)packages\//.test(spec)) return 'path into packages/';
    if (/^(\.|\/|[A-Za-z]:)/.test(spec)) {
      const top = relative(repo, resolve(dirname(file), spec)).split(/[\\/]/)[0];
      if (top === 'packages') return 'path into packages/';
    }
    if (spec.startsWith('@component-museum/') && !resolves(spec)) return 'does not resolve';
    return null;
  }

  it('finds the gallery files it is meant to check', () => {
    expect(files(gallery).map((f) => relative(gallery, f).replace(/\\/g, '/'))).toEqual(
      expect.arrayContaining(['.storybook/preview.ts', 'stories/Button.mdx', 'stories/Button.react.stories.tsx']),
    );
  });

  it('has no path into a package and every package specifier resolves', () => {
    const bad = files(gallery).flatMap((f) =>
      specifiers(read(f)).flatMap((s) => {
        const why = verdict(f, s);
        return why ? [`${relative(repo, f)}: ${s} (${why})`] : [];
      }),
    );
    expect(bad).toEqual([]);
  });

  it('flags a relative path, an absolute path and an unresolved package (the guard bites)', () => {
    const f = join(gallery, '.storybook/preview.ts');
    expect(verdict(f, '../../packages/react/styles.css')).not.toBeNull();
    expect(verdict(f, join(repo, 'packages/react/styles.css'))).not.toBeNull();
    expect(verdict(f, '@component-museum/react/nope.css')).not.toBeNull();
    expect(verdict(f, '@component-museum/react/styles.css')).toBeNull();
  });
});
