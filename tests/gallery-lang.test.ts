import { join } from 'node:path';
import { chromium, type Browser, type Locator, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { contrastRatio, parseRgb, type Rgb } from './lib/css.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 007, RF-2 and RF-3: the language switch takes the style of the documentation page.
const computed = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

/** Paints `top` (maybe translucent) over the opaque `under`. */
const over = (top: Rgb, under: Rgb): Rgb => ({
  r: top.r * top.a + under.r * (1 - top.a),
  g: top.g * top.a + under.g * (1 - top.a),
  b: top.b * top.a + under.b * (1 - top.a),
  a: 1,
});

const themes = ['light', 'dark'] as const;
const languages = [
  { code: 'es', name: 'Español', other: 'English' },
  { code: 'en', name: 'English', other: 'Español' },
] as const;

describe('language switch style (RF-2, RF-3)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  async function open(theme: (typeof themes)[number], lang: string): Promise<Page> {
    const context = await browser.newContext({ colorScheme: theme });
    await context.addInitScript((l) => localStorage.setItem('museum:lang', l), lang);
    const page = await context.newPage();
    await page.goto(`${served.url}iframe.html?id=button-documentation--docs&viewMode=docs&globals=theme:${theme}`);
    await page.getByRole('button', { name: 'Español' }).waitFor();
    return page;
  }

  for (const theme of themes) {
    for (const { code, name, other } of languages) {
      it(`theme:${theme}, ${code} active: page font, no outset border, 4.5:1, distinct active background`, async () => {
        const page = await open(theme, code);
        try {
          const active = page.getByRole('button', { name });
          const inactive = page.getByRole('button', { name: other });
          const pageBg = parseRgb(await computed(page.locator('.sbdocs-wrapper'), 'background-color'));
          const pageFont = await computed(page.locator('.sbdocs-wrapper p:visible').first(), 'font-family');

          const backgrounds: Rgb[] = [];
          for (const button of [active, inactive]) {
            expect(await computed(button, 'font-family')).toBe(pageFont);
            expect(await computed(button, 'border-top-style')).not.toBe('outset');
            const bg = over(parseRgb(await computed(button, 'background-color')), pageBg);
            backgrounds.push(bg);
            const ratio = contrastRatio(parseRgb(await computed(button, 'color')), bg);
            console.log(`[lang] ${theme}/${code} ${await button.innerText()}: ratio ${ratio.toFixed(2)}`);
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          }
          expect(await active.getAttribute('aria-pressed')).toBe('true');
          expect(await inactive.getAttribute('aria-pressed')).toBe('false');
          expect(backgrounds[0]).not.toEqual(backgrounds[1]);

          // Optional: save the header of the page (title + switch) for the owner's review.
          const dir = process.env.MUSEUM_T2_SHOTS;
          if (dir && (theme === 'light' || code === 'es')) {
            await page.screenshot({ path: join(dir, `t2-${theme}${code === 'en' ? '-en' : ''}.png`), clip: { x: 0, y: 0, width: 900, height: 160 } });
          }
        } finally {
          await page.context().close();
        }
      });
    }

    it(`theme:${theme}: both buttons are reached with Tab and show a focus ring`, async () => {
      const page = await open(theme, 'es');
      try {
        const buttons = [page.getByRole('button', { name: 'Español' }), page.getByRole('button', { name: 'English' })];
        const focused = (button: Locator) => button.evaluate((el) => el === document.activeElement);
        for (let i = 0; i < 30 && !(await focused(buttons[0])); i++) await page.keyboard.press('Tab');
        for (const button of buttons) {
          expect(await focused(button)).toBe(true);
          expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
          expect(await computed(button, 'outline-style')).not.toBe('none');
          expect(parseFloat(await computed(button, 'outline-width'))).toBeGreaterThan(0);
          await page.keyboard.press('Tab');
        }
      } finally {
        await page.context().close();
      }
    });
  }
});
