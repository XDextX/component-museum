import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, inject } from 'vitest';
import { tailwindPages } from './lib/consumer.ts';
import type { Framework } from './lib/paths.ts';

const frameworks: Framework[] = ['react', 'astro'];
const consumers = inject('consumers');
const builds = inject('builds');

/** Every stylesheet the built page links, as one string; absent for a page that was not built. */
function pageCss(dist: string, page: string): string | undefined {
  const html = join(dist, page);
  if (!existsSync(html)) return undefined;
  const links = [...readFileSync(html, 'utf8').matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]);
  const inline = [...readFileSync(html, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return [...inline, ...links.map((href) => readFileSync(join(dist, href.replace(/^\//, '')), 'utf8'))].join('\n');
}

describe('the Tailwind consumers (spec 003 T-7)', { timeout: 120_000 }, () => {
  for (const framework of frameworks) {
    const dir = consumers.tailwind[framework];
    it(`builds the ${framework} consumer`, () => {
      expect(builds.tailwind[framework].code, builds.tailwind[framework].output).toBe(0);
    });
    for (const [order, page] of Object.entries(tailwindPages[framework])) {
      it(`generates .px-8 in the ${framework} page with ${order}`, () => {
        const css = pageCss(join(dir, 'dist'), page);
        expect(css, `${page} was not built`).toBeDefined();
        expect(css, 'Tailwind did not generate px-8').toMatch(/\.px-8\s*\{/);
        expect(css, 'the package sheet is missing').toContain('museum-button');
      });
    }
  }

});
