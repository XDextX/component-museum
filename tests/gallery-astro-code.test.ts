import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 007, RF-6: every Astro case shows highlighted usage code and a copy button.
type AstroCase = { id: string; usage: string };
const cases = JSON.parse(readFileSync(inject('gallery').astroJson, 'utf8')) as AstroCase[];

describe('gallery Astro code (spec 007, RF-6)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(served.url).origin });
    page = await context.newPage();
    await page.goto(`${served.url}iframe.html?id=button-astro--variants&viewMode=story`);
    await page.locator('#astro-primary pre').waitFor();
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  it('has the 6 cases of the 004 JSON', () => {
    expect(cases).toHaveLength(6);
  });

  for (const { id, usage } of cases) {
    it(`${id}: highlighted marks, and a named copy button that copies the exact usage`, async () => {
      const section = page.locator(`#astro-${id}`);
      expect(await section.locator('pre span[class], pre span[style]').count()).toBeGreaterThan(0);
      const copy = section.locator('button:not([data-museum-button])');
      expect(await copy.count()).toBe(1);
      expect(((await copy.getAttribute('aria-label')) ?? (await copy.textContent()) ?? '').trim()).not.toBe('');
      await copy.click();
      // The Windows clipboard turns every LF into CRLF; undo only that.
      const copied = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n');
      expect(copied).toBe(usage);
    });
  }

  it('reaches a copy button with Tab', async () => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(
        () => document.activeElement?.matches('#astro-primary button:not([data-museum-button])') ?? false,
      );
    }
    expect(reached).toBe(true);
  });

  // The highlighter follows the gallery theme global (spec 007, RF-5 and RF-6), against the system preference.
  for (const theme of ['light', 'dark'] as const) {
    it(`theme:${theme}: the code block is ${theme} and every highlighted mark has 4.5:1 text`, async () => {
      const context = await browser.newContext({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      try {
        const themed = await context.newPage();
        await themed.goto(`${served.url}iframe.html?id=button-astro--variants&viewMode=story&globals=theme:${theme}`);
        await themed.locator('#astro-primary pre').waitFor();
        const seen = await themed.locator('#astro-primary pre').evaluate((pre) => {
          const background = (el: Element | null): string => {
            for (; el; el = el.parentElement) {
              const c = getComputedStyle(el).backgroundColor;
              if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
            }
            return 'rgb(255, 255, 255)';
          };
          const bg = background(pre);
          return { bg, colors: [...pre.querySelectorAll('span'), pre.querySelector('code') ?? pre].map((el) => getComputedStyle(el).color) };
        });
        const bg = parseRgb(seen.bg);
        expect(bg.r + bg.g + bg.b < 384).toBe(theme === 'dark');
        for (const color of seen.colors) expect(contrastRatio(parseRgb(color), bg)).toBeGreaterThanOrEqual(4.5);
      } finally {
        await context.close();
      }
    });

    // Spec 007 NFR: the copy button is a gallery control, so it gets the museum's bar without being a museum Button.
    it(`theme:${theme}: the copy button has 4.5:1 text and, on Tab, a 2px focus indicator 3:1 against its background`, async () => {
      const context = await browser.newContext({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      try {
        const themed = await context.newPage();
        await themed.goto(`${served.url}iframe.html?id=button-astro--variants&viewMode=story&globals=theme:${theme}`);
        const copy = themed.locator('#astro-primary button:not([data-museum-button])');
        await copy.waitFor();
        const look = () =>
          copy.evaluate((el) => {
            const s = getComputedStyle(el);
            let bg = 'rgb(255, 255, 255)';
            for (let node: Element | null = el; node; node = node.parentElement) {
              const c = getComputedStyle(node).backgroundColor;
              if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
                bg = c;
                break;
              }
            }
            return { focused: el === document.activeElement, fg: s.color, bg, outline: [s.outlineStyle, parseFloat(s.outlineWidth), s.outlineColor] as const, shadow: s.boxShadow };
          });
        const rest = await look();
        let seen = rest;
        for (let i = 0; i < 40 && !seen.focused; i++) {
          await themed.keyboard.press('Tab');
          seen = await look();
        }
        expect(seen.focused, 'Tab never reaches the copy button').toBe(true);
        // The indicator is the outline, or else a box-shadow that only focus adds; its width is its largest length.
        const [style, width, ring] = seen.outline;
        const shadow = seen.shadow !== rest.shadow && seen.shadow !== 'none' ? seen.shadow : '';
        const indicator =
          style !== 'none' && width >= 2
            ? { color: ring, width }
            : { color: /rgba?\([^)]*\)/.exec(shadow)?.[0] ?? '', width: Math.max(0, ...[...shadow.matchAll(/(-?[\d.]+)px/g)].map((m) => Math.abs(Number(m[1])))) };
        const report = {
          text: Number(contrastRatio(parseRgb(seen.fg), parseRgb(seen.bg)).toFixed(2)),
          width: indicator.width,
          indicator: indicator.color ? Number(contrastRatio(parseRgb(indicator.color), parseRgb(seen.bg)).toFixed(2)) : 0,
        };
        expect(report.text, JSON.stringify(report)).toBeGreaterThanOrEqual(4.5);
        expect(report.width, JSON.stringify(report)).toBeGreaterThanOrEqual(2);
        expect(report.indicator, JSON.stringify(report)).toBeGreaterThanOrEqual(3);
      } finally {
        await context.close();
      }
    });
  }
});
