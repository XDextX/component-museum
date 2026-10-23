import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findContractFiles, loadContract, type Contract } from './contract.ts';

export type Fw = 'react' | 'astro';

/** Value exports of an entry file: `export { A, default as B }` yes, `export type { ... }` no. */
export function entryExports(source: string): string[] {
  const code = source.replace(/\/\/.*$/gm, '');
  return [...code.matchAll(/export\s*\{([^}]*)\}/g)].flatMap(([, names]) =>
    names.split(',').map((n) => n.trim().split(/\s+as\s+/).pop()!).filter(Boolean),
  );
}

/** The names each package entry exports, keyed by the framework as the Storybook title writes it. */
export function packageExports(repo: string): { React: string[]; Astro: string[] } {
  const read = (p: string) => readFileSync(join(repo, p), 'utf8');
  return { React: entryExports(read('packages/react/src/index.ts')), Astro: entryExports(read('packages/astro/index.js')) };
}

/** Every contract whose component a package exports (the gallery shows exactly these). */
export function exportedContracts(repo: string): Contract[] {
  const exported = new Set(Object.values(packageExports(repo)).flat());
  return findContractFiles(repo)
    .map((f) => loadContract(join(repo, f)))
    .filter((c) => exported.has(c.name));
}

const label = { react: 'React', astro: 'Astro' } as const;
export const slug = (name: string) => name.toLowerCase();
/** The Storybook title of a component's story: `Button/React`. */
export const storyTitle = (name: string, fw: Fw) => `${name}/${label[fw]}`;
/** The Storybook id of the story the tests open. */
export const storyId = (name: string, fw: Fw) => `${slug(name)}-${fw}--${fw === 'react' ? 'default' : 'variants'}`;
export const docsId = (name: string) => `${slug(name)}-documentation--docs`;
export const storyFile = (name: string, fw: Fw) => `gallery/stories/${name}.${fw}.stories.tsx`;
export const docsFile = (name: string) => `gallery/stories/${name}.mdx`;

/** The body of each `<Lang lang="…">` block of a docs page, keyed by language. */
export function docLanguages(mdx: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, lang, body] of mdx.matchAll(/^<Lang lang="(es|en)">\n([\s\S]*?)\n<\/Lang>$/gm)) out[lang] = body;
  return out;
}

/** The `##` titles of one language of a docs page. */
export const sectionTitles = (body: string) => [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());

/** Reads a repo file with LF endings, or undefined when it does not exist. */
export function readText(repo: string, path: string): string | undefined {
  const file = join(repo, path);
  return existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : undefined;
}

/**
 * The docs page problems every component shares: both languages, the same number of sections in
 * each with content, the switch, and nothing outside a `<Lang>`. `mdx` is undefined when the file is missing.
 */
export function docsProblems(name: string, mdx: string | undefined): string[] {
  if (mdx === undefined) return [`${name} has no docs page ${docsFile(name)}`];
  const out: string[] = [];
  const langs = docLanguages(mdx);
  for (const lang of ['es', 'en']) {
    const body = langs[lang];
    if (body === undefined) {
      out.push(`${name} docs: no <Lang lang="${lang}"> block`);
      continue;
    }
    if (sectionTitles(body).length === 0) out.push(`${name} docs: ${lang} has no section`);
    for (const part of body.split(/^## .+$/m).slice(1)) if (!part.trim()) out.push(`${name} docs: an empty ${lang} section`);
  }
  if (langs.es !== undefined && langs.en !== undefined && sectionTitles(langs.es).length !== sectionTitles(langs.en).length) {
    out.push(`${name} docs: es and en have a different number of sections`);
  }
  if (!/^<LanguageSwitch \/>$/m.test(mdx)) out.push(`${name} docs: no language switch`);
  const outside = mdx.replace(/^<Lang lang="(es|en)">\n[\s\S]*?\n<\/Lang>$/gm, '');
  if (sectionTitles(outside).length) out.push(`${name} docs: a section outside a <Lang>`);
  return out;
}

/** One message per export lacking its story in a framework, titled `<Export>/<Framework>`. */
export function storyProblems(exports: Record<string, string[]>, titles: string[]): string[] {
  return Object.entries(exports).flatMap(([framework, names]) =>
    names
      .filter((name) => !titles.includes(`${name}/${framework}`))
      .map((name) => `${name} has no ${framework} story titled ${name}/${framework}`),
  );
}

/** The story titles a component's story files declare, in the frameworks whose file exists. */
export function declaredTitles(repo: string, name: string): string[] {
  return (['react', 'astro'] as const).flatMap((fw) =>
    [...(readText(repo, storyFile(name, fw)) ?? '').matchAll(/title:\s*'([^']+)'/g)].map((m) => m[1]),
  );
}
