import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { docsScheme, themeFromSearch } from '../gallery/.storybook/preview.ts';
import { closeBrowserAndServers } from './lib/browser.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 007, RF-5: the documentation page follows the gallery theme.
describe('docsScheme (RF-5, as data)', () => {
  it('takes light and dark from the global, whatever the system prefers', () => {
    expect(docsScheme('dark', false)).toBe('dark');
    expect(docsScheme('light', true)).toBe('light');
  });

  it('follows the system for "system", for no global and for anything else', () => {
    for (const global of ['system', undefined, null, 'sepia', 3]) {
      expect(docsScheme(global, true)).toBe('dark');
      expect(docsScheme(global, false)).toBe('light');
    }
  });
});

describe('themeFromSearch (RF-5, as data)', () => {
  it('reads theme from the globals query, among other globals', () => {
    expect(themeFromSearch('?id=x&globals=theme:dark')).toBe('dark');
    expect(themeFromSearch('?globals=theme%3Alight')).toBe('light');
    expect(themeFromSearch('?globals=other:x;theme:dark')).toBe('dark');
    expect(themeFromSearch('?globals=theme:dark;other:x')).toBe('dark');
  });

  it('gives undefined when theme or globals are absent, so the page follows the system', () => {
    expect(themeFromSearch('')).toBeUndefined();
    expect(themeFromSearch('?id=x')).toBeUndefined();
    expect(themeFromSearch('?globals=other:x')).toBeUndefined();
    expect(docsScheme(themeFromSearch('?globals=theme:sepia'), true)).toBe('dark');
    expect(docsScheme(themeFromSearch('?globals=theme:sepia'), false)).toBe('light');
  });
});

const cases = [
  { globals: 'dark', system: 'light', expected: 'dark' },
  { globals: 'dark', system: 'dark', expected: 'dark' },
  { globals: 'system', system: 'dark', expected: 'dark' },
  { globals: 'light', system: 'dark', expected: 'light' },
  { globals: 'light', system: 'light', expected: 'light' },
  { globals: 'system', system: 'light', expected: 'light' },
] as const;

describe('documentation page theme (RF-5)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  for (const id of ['button-documentation--docs', 'matrix--docs']) {
    for (const { globals, system, expected } of cases) {
      it(`${id}, theme:${globals} under a ${system} system paints the page ${expected}, all its visible text at 4.5:1`, async () => {
        const context = await browser.newContext({ colorScheme: system });
        const page = await context.newPage();
        try {
          await page.goto(`${served.url}iframe.html?id=${id}&viewMode=docs&globals=theme:${globals}`);
          const wrapper = page.locator('.sbdocs-wrapper');
          await wrapper.waitFor();
          await page.locator('.sbdocs-wrapper p:visible').first().waitFor();
          await page.waitForLoadState('networkidle');
          const bg = parseRgb(await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor));
          const black = { r: 0, g: 0, b: 0, a: 1 };
          const white = { r: 255, g: 255, b: 255, a: 1 };
          expect(contrastRatio(bg, black) < contrastRatio(bg, white) ? 'dark' : 'light').toBe(expected);
          // Every element holding visible text, its colour and the background composed under it, layer by layer.
          const texts = await page.evaluate(() => {
            type C = [number, number, number, number];
            const parse = (c: string): C => {
              const m = /rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(c);
              return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 0];
            };
            const over = (top: C, under: C): C => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as C;
            const rgb = (c: C) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;
            const out: { tag: string; text: string; fg: string; bg: string }[] = [];
            const seen = new Set<Element>();
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let t = walker.nextNode(); t; t = walker.nextNode()) {
              const el = t.parentElement!;
              if (!t.textContent!.trim() || seen.has(el)) continue;
              seen.add(el);
              const box = el.getBoundingClientRect();
              // Visually hidden text (sb-sr-only: 1px, clipped) is read, not seen.
              if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || box.width <= 1 || box.height <= 1) continue;
              const layers: C[] = [];
              for (let n: Element | null = el; n; n = n.parentElement) {
                const c = parse(getComputedStyle(n).backgroundColor);
                if (c[3] === 0) continue;
                layers.push(c);
                if (c[3] === 1) break;
              }
              const ground = layers.reduceRight<C>((under, top) => over(top, under), [255, 255, 255, 1]);
              out.push({ tag: el.tagName.toLowerCase(), text: t.textContent!.trim().slice(0, 40), fg: rgb(over(parse(getComputedStyle(el).color), ground)), bg: rgb(ground) });
            }
            return out;
          });
          const rated = texts.map((t) => ({ ...t, ratio: Number(contrastRatio(parseRgb(t.fg), parseRgb(t.bg)).toFixed(2)) }));
          console.log(`[docs-theme] ${id} theme:${globals} / ${system}: ${rated.length} texts, lowest ${Math.min(...rated.map((t) => t.ratio))}`);
          expect(rated.length).toBeGreaterThan(5);
          expect(rated.filter((t) => t.ratio < 4.5)).toEqual([]);
        } finally {
          await context.close();
        }
      });
    }
  }

  it('changes with the page open when the toolbar changes the theme', async () => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    try {
      await page.goto(`${served.url}?path=/docs/button-documentation--docs&globals=theme:light`);
      const wrapper = page.frameLocator('#storybook-preview-iframe').locator('.sbdocs-wrapper');
      const dark = async () => {
        const bg = parseRgb(await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor));
        return contrastRatio(bg, { r: 0, g: 0, b: 0, a: 1 }) < contrastRatio(bg, { r: 255, g: 255, b: 255, a: 1 });
      };
      await wrapper.waitFor();
      expect(await dark()).toBe(false);
      await page.getByRole('button', { name: /Tema de la galer\u00eda/ }).click();
      await page.getByText('Oscuro', { exact: true }).first().click();
      await expect.poll(dark).toBe(true);
    } finally {
      await context.close();
    }
  });
});
