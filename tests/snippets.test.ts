import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exampleText, usageSnippet, type Contract } from '../gallery/lib/contract-args.ts';
import { exampleClasses } from '../gallery/lib/example-classes.ts';
import { initialLanguage } from '../gallery/lib/Lang.tsx';
import { loadContract } from './lib/contract.ts';
import { docLanguages, docsFile, docsProblems, exportedContracts, readText, storyFile } from './lib/gallery-pages.ts';

const repo = resolve(import.meta.dirname, '..');
const gallery = join(repo, 'gallery');
const contract = loadContract(join(repo, 'contracts/button.contract.json')) as Contract;
const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const mdx = read(join(gallery, 'stories/Button.mdx'));
const reactStory = read(join(gallery, 'stories/Button.react.stories.tsx'));

// Every component a package exports with a contract (spec 009, RF-10); Button keeps its own exact checks.
const components = exportedContracts(repo);
const mdxOf = (name: string) => readText(repo, docsFile(name));

// The sheet's own classes, and the example classes the gallery defines once and shows (RF-8, RF-9).
const sheetClasses = new Set(read(join(repo, 'styles/museum.css')).match(/\.museum-[\w-]+/g)!.map((c) => c.slice(1)));

type Block = { lang: string; code: string };
const blocks = (text: string): Block[] =>
  [...text.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], code: m[2] }));

const languages = docLanguages;

const SECTIONS = {
  es: ['Uso', 'Construcción', 'Cómo alterarlo'],
  en: ['Usage', 'How it is built', 'How to alter it'],
};

/** Returns every violation of RF-7 and RF-8 in one usage snippet (tsx or astro) of the component `c`. */
function snippetProblems(lang: 'tsx' | 'astro', code: string, c: Contract = contract): string[] {
  const fw = lang === 'tsx' ? 'react' : 'astro';
  const problems: string[] = [];
  const imports = [...code.matchAll(/^import .*? from '([^']+)';$/gm)].map((m) => m[1]);
  const sheet = [...code.matchAll(/^import '([^']+)';$/gm)].map((m) => m[1]);
  if (!imports.includes(`@component-museum/${fw}`)) problems.push(`no component import for ${fw}`);
  if (!sheet.includes(`@component-museum/${fw}/styles.css`)) problems.push(`no sheet import for ${fw}`);
  for (const spec of [...imports, ...sheet]) {
    if (!spec.startsWith(`@component-museum/${fw}`)) problems.push(`import ${spec} is not by package name`);
  }
  if (lang === 'astro') {
    // Astro only reads imports inside the frontmatter fence: one outside it is page text, not an import.
    const front = /^---\n([\s\S]*?)\n---\n/.exec(code);
    if (!front) problems.push('no frontmatter fence (---) at the top');
    const outside = front ? code.slice(front[0].length) : code;
    if (/^import\b/m.test(outside)) problems.push('an import outside the frontmatter');
  }
  const classAttr = lang === 'tsx' ? 'className' : 'class';
  for (const [, attrs] of code.matchAll(new RegExp(`<${c.name}\\b([^>]*)>`, 'g'))) {
    for (const [, name, value] of attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
      if (name === classAttr) {
        for (const cls of value.split(/\s+/).filter(Boolean)) {
          if (!sheetClasses.has(cls) && !(cls in exampleClasses)) problems.push(`class ${cls} is neither museum-* nor an example class`);
        }
      } else if (!(name in c.props)) problems.push(`prop ${name} is not in the contract`);
    }
  }
  return problems;
}

/** Every prop off its default at once: the fullest state a usage snippet can show for a contract. */
function fullArgs(c: Contract): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(c.props)) {
    args[name] = spec.type === 'enum' ? spec.values.find((v) => v !== spec.default) : spec.type === 'boolean' ? true : exampleText(name);
  }
  if (c.content) args.children = 'Hi';
  if (c.classProp) args.className = Object.keys(exampleClasses)[0];
  return args;
}

const mdxSnippets = blocks(mdx).filter((b) => b.lang === 'tsx' || b.lang === 'astro');
const allArgs = { variant: 'outline', size: 'lg', type: 'submit', disabled: true, children: 'Hi', className: 'my-button' };
const statesOf = (c: Contract, full: Record<string, unknown>) =>
  (['react', 'astro'] as const).flatMap((fw) => [{}, full].map((args) => ({ fw, args })));
const STATES = statesOf(contract, allArgs);

describe('documentation in both languages (spec 004, RF-2)', () => {
  const langs = languages(mdx);

  it.each(Object.entries(SECTIONS))('%s has its three sections, each with content', (lang, titles) => {
    const body = langs[lang] ?? '';
    const found = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(found).toEqual(titles);
    for (const part of body.split(/^## .+$/m).slice(1)) expect(part.trim()).not.toBe('');
  });

  // Spec 005, T-2: the switch sits above both languages, and nothing is left outside a <Lang>.
  it('offers the language switch, and keeps no section outside a <Lang>', () => {
    expect(mdx).toMatch(/^<LanguageSwitch \/>$/m);
    const outside = mdx.replace(/^<Lang lang="(es|en)">\n[\s\S]*?\n<\/Lang>$/gm, '');
    expect([...outside.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual([]);
  });
});

// Spec 009, RF-10: the same rules for every exported component, not only Button.
describe.each(components.map((c) => [c.name] as const))('%s has a docs page in both languages', (name) => {
  it('has both languages with sections, the switch, and nothing outside a <Lang>', () => {
    expect(docsProblems(name, mdxOf(name))).toEqual([]);
  });
});

describe('the docs page check bites (spec 009, RF-10)', () => {
  it('reports a component with no docs page, no English block, no switch or a stray section', () => {
    expect(docsProblems('Second', undefined)).toEqual([`Second has no docs page ${docsFile('Second')}`]);
    const es = '<Lang lang="es">\n## Uso\n\nTexto\n</Lang>';
    expect(docsProblems('Second', `<LanguageSwitch />\n\n${es}`)).toEqual(['Second docs: no <Lang lang="en"> block']);
    expect(docsProblems('Second', `${es}\n\n<Lang lang="en">\n## Usage\n\nText\n</Lang>`)).toEqual(['Second docs: no language switch']);
    expect(docsProblems('Second', `<LanguageSwitch />\n\n${es}\n\n<Lang lang="en">\n## Usage\n\nText\n</Lang>\n\n## Loose`)).toEqual(['Second docs: a section outside a <Lang>']);
  });
});

describe('initial language (spec 005, RF-5)', () => {
  it('is Spanish with nothing saved, or with anything but a known language saved', () => {
    expect(initialLanguage(null)).toBe('es');
    expect(initialLanguage('fr')).toBe('es');
    expect(initialLanguage('')).toBe('es');
  });

  it('is the saved language when it is Spanish or English', () => {
    expect(initialLanguage('es')).toBe('es');
    expect(initialLanguage('en')).toBe('en');
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

  it('flags an Astro snippet whose imports sit outside the frontmatter (the guard bites)', () => {
    const imports = "import { Button } from '@component-museum/astro';\nimport '@component-museum/astro/styles.css';\n";
    expect(snippetProblems('astro', imports + '\n<Button>x</Button>')).not.toEqual([]);
    expect(snippetProblems('astro', '---\n---\n' + imports + '\n<Button>x</Button>')).not.toEqual([]);
    expect(snippetProblems('astro', '---\n' + imports + '---\n\n<Button>x</Button>')).toEqual([]);
  });
});

// Spec 009, RF-10: every other exported component's snippets, MDX and generated, under the same rules.
describe.each(components.filter((c) => c.name !== 'Button').map((c) => [c.name, c] as const))('usage code of %s (RF-7, RF-8)', (name, c) => {
  const snippets = blocks(mdxOf(name) ?? '').filter((b) => b.lang === 'tsx' || b.lang === 'astro');

  it('has MDX snippets in both frameworks', () => {
    expect(snippets.map((b) => b.lang).sort()).toEqual(expect.arrayContaining(['astro', 'tsx']));
  });

  it('has clean MDX snippets', () => {
    expect(snippets.flatMap((b) => snippetProblems(b.lang as 'tsx' | 'astro', b.code, c))).toEqual([]);
  });

  it('has clean generated snippets', () => {
    for (const s of statesOf(c, fullArgs(c))) {
      expect(snippetProblems(s.fw === 'react' ? 'tsx' : 'astro', usageSnippet(s.fw, s.args, c), c), JSON.stringify(s)).toEqual([]);
    }
  });
});

describe('example class CSS in every place (RF-9)', () => {
  const langs = languages(mdx);
  const used = new Set(
    [
      ...mdxSnippets.map((b) => b.code),
      ...STATES.map((s) => usageSnippet(s.fw, s.args, contract)),
      ...components.filter((c) => c.name !== 'Button').flatMap((c) => [
        ...blocks(mdxOf(c.name) ?? '').map((b) => b.code),
        ...statesOf(c, fullArgs(c)).map((s) => usageSnippet(s.fw, s.args, c)),
      ]),
    ]
      .flatMap((c) => [...c.matchAll(/class(?:Name)?="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)))
      .filter((c) => c && !sheetClasses.has(c)),
  );

  it('uses only example classes the story defines', () => {
    expect([...used].filter((c) => !(c in exampleClasses))).toEqual([]);
  });

  // One source (gallery/lib/example-classes.ts): a copy anywhere else could drift. That it is seen
  // beside the control and on the docs page is checked in the built Storybook (gallery-browser.test.ts).
  it('the story and the docs page import the example CSS and keep no copy of it', () => {
    for (const [file, text] of [['story', reactStory], ['MDX', mdx]] as const) {
      expect(text, `${file} imports it`).toMatch(/import \{ exampleClasses \} from '\.\.\/lib\/example-classes\.ts';/);
      for (const name of Object.keys(exampleClasses)) expect(text, `${file} has its own .${name} rule`).not.toContain(`.${name} {`);
    }
  });

  // Every component with a class prop takes its class control from the same source and keeps no copy.
  it.each(components.filter((c) => c.name !== 'Button').map((c) => [c.name, c] as const))('the %s story and docs keep no copy of the example CSS', (name, c) => {
    const story = readText(repo, storyFile(name, 'react')) ?? '';
    if (c.classProp) expect(story, 'the story imports it').toMatch(/import \{ exampleClasses \} from '\.\.\/lib\/example-classes\.ts';/);
    for (const text of [story, mdxOf(name) ?? '']) {
      for (const cls of Object.keys(exampleClasses)) expect(text, `.${cls} rule`).not.toContain(`.${cls} {`);
    }
  });

  it.each(Object.entries(SECTIONS))('%s "how to alter it" shows every example class from that source', (lang) => {
    const how = langs[lang].split(/^## /m).find((s) => s.startsWith(SECTIONS[lang as 'es' | 'en'][2]))!;
    for (const name of Object.keys(exampleClasses)) {
      expect(how, `${lang}: .${name}`).toContain(`<Source language="css" code={exampleClasses['${name}']} />`);
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
    // Vite queries such as ?raw do not change which export resolves.
    const [scope, name, ...sub] = spec.split('?')[0].split('/');
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
