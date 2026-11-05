import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { need } from './lib/need.ts';
import { closeBrowserAndServers } from './lib/browser.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 007, RF-6: every Astro case shows highlighted usage code and a copy button.
type AstroCase = { id: string; usage: string };
const cases = JSON.parse(readFileSync(need('gallery').astroJson, 'utf8')) as AstroCase[];

describe('gallery Astro code (spec 007, RF-6)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    served = await serve(need('gallery').storybook);
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

  // Spec 016, T-1 (C-5): every text of the usage code of the 6 Astro stories reaches 4.5:1, in both themes.
  // Storybook paints `value:` and `label:` as an HTML namespace, 3.55:1 on white, in RadioGroup and Select.
  for (const theme of ['light', 'dark'] as const) {
    for (const story of ['button', 'checkbox', 'input', 'radiogroup', 'select', 'textarea']) {
      it(`${story}/Astro theme:${theme}: every text of every usage code is 4.5:1 (spec 016, C-5)`, async () => {
        const context = await browser.newContext({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
        try {
          const themed = await context.newPage();
          await themed.goto(`${served.url}iframe.html?id=${story}-astro--variants&viewMode=story&globals=theme:${theme}`);
          await themed.locator('#storybook-root pre').first().waitFor();
          const seen = await themed.locator('#storybook-root pre').evaluateAll((pres) =>
            pres.flatMap((pre) => {
              let bg = 'rgb(255, 255, 255)';
              for (let el: Element | null = pre; el; el = el.parentElement) {
                const c = getComputedStyle(el).backgroundColor;
                if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
                  bg = c;
                  break;
                }
              }
              // Only the elements that own text: a span with child spans paints no text of its own.
              return [...pre.querySelectorAll('span'), pre.querySelector('code') ?? pre]
                .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()))
                .map((el) => {
                  // The opacity of the element and its ancestors fades the text into the background (the namespace token has 0.7).
                  let alpha = 1;
                  for (let node: Element | null = el; node; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity);
                  const [fr = 0, fg = 0, fb = 0, fa = 1] = (getComputedStyle(el).color.match(/[\d.]+/g) ?? []).map(Number);
                  const [br = 255, bgn = 255, bb = 255] = (bg.match(/[\d.]+/g) ?? []).map(Number);
                  const a = alpha * fa;
                  const mix = (f: number, b: number) => Math.round(f * a + b * (1 - a));
                  return { text: (el.textContent ?? '').trim().slice(0, 20), color: `rgb(${mix(fr, br)}, ${mix(fg, bgn)}, ${mix(fb, bb)})`, bg };
                });
            }),
          );
          expect(seen.length).toBeGreaterThan(0);
          const low = seen
            .map((s) => ({ text: s.text, color: s.color, ratio: Number(contrastRatio(parseRgb(s.color), parseRgb(s.bg)).toFixed(2)) }))
            .filter((s) => s.ratio < 4.5);
          expect(low, JSON.stringify(low.slice(0, 5))).toEqual([]);
        } finally {
          await context.close();
        }
      });
    }
  }

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
