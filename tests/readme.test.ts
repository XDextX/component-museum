import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoUrl = 'https://github.com/XDextX/component-museum';
const headings = ['## Español', '## English'];

/** Splits a README into its two language sections; a missing heading gives an empty section. */
function sectionsOf(readme: string): string[] {
  const text = `\n${readme.replace(/\r\n/g, '\n')}`;
  const at = headings.map((heading) => text.indexOf(`\n${heading}\n`));
  return at.map((start) => {
    if (start < 0) return '';
    const next = at.filter((p) => p > start).sort((a, b) => a - b)[0] ?? text.length;
    return text.slice(start, next);
  });
}

/** What each language section of `readme` lacks for the package `name` (RF-9). */
function readmeProblems(readme: string, name: string): string[] {
  const needs: [string, RegExp][] = [
    ['npm install', new RegExp(`npm install ${name}\\b`)],
    ['stylesheet import', new RegExp(`import ['"]${name}/styles\\.css['"]`)],
    ['Button', new RegExp(`import \\{[^}]*\\bButton\\b[^}]*\\} from ['"]${name}['"][\\s\\S]*<Button\\b`)],
    ['repository link', new RegExp(repoUrl.replace(/\./g, '\\.'))],
  ];
  return sectionsOf(readme).flatMap((body, i) =>
    body === '' ? [`${headings[i]}: missing`] : needs.filter(([, re]) => !re.test(body)).map(([what]) => `${headings[i]}: no ${what}`),
  );
}

const readme = (pkg: string) => readFileSync(fileURLToPath(new URL(`../packages/${pkg}/README.md`, import.meta.url)), 'utf8');

describe('package READMEs (RF-9)', () => {
  it.each(['react', 'astro'])('the %s README has every part in both languages', (pkg) => {
    expect(readmeProblems(readme(pkg), `@component-museum/${pkg}`)).toEqual([]);
  });

  it('flags a README whose English section lacks the stylesheet import', () => {
    const text = readme('astro').replace(/\r\n/g, '\n');
    const english = text.indexOf('\n## English\n');
    const cut = text.slice(0, english) + text.slice(english).replace(/^.*styles\.css.*\n/m, '');
    expect(readmeProblems(cut, '@component-museum/astro')).toEqual(['## English: no stylesheet import']);
  });

  it('flags a missing language section', () => {
    expect(readmeProblems('# x\n\n## Español\nnpm install @a/b\n', '@a/b')).toContain('## English: missing');
  });
});
