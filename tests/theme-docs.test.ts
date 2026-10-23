import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec 011, RF-6 and RF-7: the docs say how a theme is asked for, in both languages, as data.
const repo = resolve(import.meta.dirname, '..');
const read = (p: string) => readFileSync(resolve(repo, p), 'utf8').replace(/\r\n/g, '\n');

const docs = [
  'packages/react/README.md',
  'packages/astro/README.md',
  'gallery/stories/Button.mdx',
  'gallery/stories/Input.mdx',
  'gallery/stories/Textarea.mdx',
];

// Each document holds a Spanish and an English half; RF-6 asks for the sentence in both.
const halves = (text: string): string[] => {
  const at = text.search(/^## English$|^<Lang lang="en">$/m);
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at)];
};

// A phrase that presents the system preference as an automatic switch to dark.
const automatic = /(llega|arrives)\s+(con|through|via)\s+`?prefers-color-scheme/i;

describe('how a theme is asked for is documented (spec 011, RF-6)', () => {
  for (const doc of docs) {
    const text = read(doc);
    it(`${doc} names dark and system in Spanish and in English`, () => {
      const [es, en] = halves(text);
      for (const half of [es, en]) {
        expect(half).toContain('data-theme="dark"');
        expect(half).toContain('data-theme="system"');
      }
      expect(es).toMatch(/por defecto/);
      expect(en).toMatch(/default/);
    });
    it(`${doc} does not present prefers-color-scheme as automatic`, () => {
      expect(text).not.toMatch(automatic);
    });
  }
});

describe('the spec 003 records the change (spec 011, RF-7)', () => {
  it('has a Changed line naming spec 011 and its RF-5', () => {
    const lines = read('specs/003-estilos-temas/spec.md').split('\n');
    const line = lines.find((l) => l.startsWith('**Changed:**') && /RF-5/.test(l) && /spec 011/.test(l));
    expect(line).toBeDefined();
    expect(line).toContain('data-theme');
  });
});
