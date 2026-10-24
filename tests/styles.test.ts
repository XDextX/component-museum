import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { describe, expect, inject, it } from 'vitest';
import { atRules } from './lib/css.ts';
import type { Framework } from './lib/paths.ts';
import { fileInTarball } from './lib/tarball.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = readFileSync(join(repo, 'styles', 'museum.css'));
const frameworks: Framework[] = ['react', 'astro'];

describe('one CSS source, copied into each package when it is packed', () => {
  for (const framework of frameworks) {
    it(`ships styles/museum.css byte for byte as @component-museum/${framework}/styles.css`, () => {
      // The run's own tarball (spec 017 RF-1): the globalSetup packed it once, prepack included.
      const shipped = fileInTarball(readFileSync(inject('tarballs')[framework].path), 'package/styles.css');
      expect(shipped, 'styles.css is not in the tarball').toBeDefined();
      expect(shipped!.equals(source), 'the packed styles.css differs from styles/museum.css').toBe(true);
    });
  }
});

/** Every style rule in `css` as Edge parses it: its selector, the layers it sits in, and its properties. */
async function styleRules(css: string): Promise<{ selector: string; layers: string[]; properties: string[] }[]> {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><style>${css}</style>`);
    return await page.evaluate(() => {
      const found: { selector: string; layers: string[]; properties: string[] }[] = [];
      const walk = (rules: CSSRuleList, layers: string[]) => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            found.push({ selector: rule.selectorText, layers, properties: [...rule.style] });
          } else if (rule instanceof CSSLayerBlockRule) {
            walk(rule.cssRules, [...layers, rule.name]);
          } else if (rule instanceof CSSGroupingRule) {
            walk(rule.cssRules, layers);
          }
        }
      };
      walk(document.styleSheets[0].cssRules, []);
      return found;
    });
  } finally {
    await browser.close();
  }
}

describe('the stylesheet itself', { timeout: 60_000 }, () => {
  const css = source.toString('utf8');

  it('uses no at-rule but @layer and @media, so the browser applies it as is (RF-2)', () => {
    expect(atRules(css).filter((name) => name !== 'layer' && name !== 'media')).toEqual([]);
  });

  it('styles only museum elements, or declares only --museum-* tokens (RF-3), all inside the museum layer (RF-7)', async () => {
    const rules = await styleRules(css);
    expect(rules.length).toBeGreaterThan(0);
    const problems = rules.flatMap(({ selector, layers, properties }) => [
      // Every selector in a list must name a museum class: `button, .museum-button` styles all buttons.
      ...(selector.split(',').every((part) => part.includes('.museum-')) || properties.every((p) => p.startsWith('--museum-'))
        ? []
        : [`${selector} styles something that is not a museum element`]),
      ...(layers.at(-1)?.split('.').at(-1) === 'museum' ? [] : [`${selector} is outside the museum layer`]),
    ]);
    expect(problems).toEqual([]);
  });
});
