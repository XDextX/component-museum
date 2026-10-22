import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { closeBrowserAndServers } from './lib/browser.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sheet = readFileSync(join(repo, 'styles', 'museum.css'), 'utf8');
const themes = ['light', 'dark'] as const;
const stories = ['button-react--default', 'button-astro--variants'];

/** A token's value in the sheet's `[data-theme="<theme>"]` block, as getComputedStyle writes it. */
function token(theme: string, name: string): string {
  const block = new RegExp(`\\[data-theme="${theme}"\\] \\{([^}]*)\\}`).exec(sheet)![1];
  const hex = new RegExp(`--museum-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)![1];
  return `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
}

/** Presses Tab up to `limit` times and returns the accessible names of what gets focus. */
async function tabNames(page: Page, limit: number): Promise<string[]> {
  const names: string[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    names.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return '';
        return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
      }),
    );
  }
  return names;
}

describe('gallery theme and keyboard access (spec 005, RF-3 and accessibility)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  /** Opens a story with the theme global set, under the opposite system preference. */
  async function story(id: string, theme: 'light' | 'dark'): Promise<Page> {
    const context = await browser.newContext({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
    const page = await context.newPage();
    await page.goto(`${served.url}iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
    await page.locator('#storybook-root button').first().waitFor();
    return page;
  }

  for (const id of stories) {
    for (const theme of themes) {
      it(`${id}, ${theme}: data-theme, the canvas and Button take the 003 ${theme} tokens, against the system preference`, async () => {
        const page = await story(id, theme);
        try {
          const seen = await page.locator('#storybook-root .museum-button--primary').first().evaluate((el) => {
            const wrapper = el.closest('[data-theme]');
            return {
              theme: wrapper?.getAttribute('data-theme'),
              canvas: wrapper ? getComputedStyle(wrapper).backgroundColor : '',
              bg: getComputedStyle(el).backgroundColor,
            };
          });
          expect(seen).toEqual({ theme, canvas: token(theme, 'surface'), bg: token(theme, 'button-primary-bg') });
        } finally {
          await page.context().close();
        }
      });

      it(`${id}, ${theme}: every enabled Button has 4.5:1 text and, on Tab, a 2px ring 3:1 against its halo (rule 7)`, async () => {
        const page = await story(id, theme);
        try {
          const enabled = await page.locator('#storybook-root button:not(:disabled)').count();
          const problems: string[] = [];
          for (let i = 0; i < enabled; i++) {
            await page.keyboard.press('Tab');
            const b = await page.evaluate(() => {
              const el = document.activeElement as HTMLElement;
              const s = getComputedStyle(el);
              const halo = /^(rgba?\([^)]*\))/.exec(s.boxShadow)?.[1] ?? '';
              return { name: el.textContent ?? '', fg: s.color, bg: s.backgroundColor, ring: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, halo };
            });
            const text = contrastRatio(parseRgb(b.fg), parseRgb(b.bg));
            if (text < 4.5) problems.push(`${b.name}: text ${text.toFixed(2)}`);
            if (b.style === 'none' || b.width < 2) problems.push(`${b.name}: no visible ring`);
            if (!b.halo) problems.push(`${b.name}: no halo`);
            else if (contrastRatio(parseRgb(b.ring), parseRgb(b.halo)) < 3) problems.push(`${b.name}: ring against halo below 3:1`);
          }
          expect(enabled).toBeGreaterThan(0);
          expect(problems).toEqual([]);
        } finally {
          await page.context().close();
        }
      });
    }
  }

  it('reaches both language buttons with Tab, each named by its language', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${served.url}iframe.html?id=button-documentation--docs&viewMode=docs`);
      await page.getByRole('button', { name: 'English' }).waitFor();
      const names = await tabNames(page, 30);
      expect(names).toEqual(expect.arrayContaining(['Español', 'English']));
    } finally {
      await page.close();
    }
  });

  it('reaches the matrix with Tab, as a named region holding a captioned table', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${served.url}iframe.html?id=matrix--docs&viewMode=docs`);
      const region = page.locator('[role="region"]:has(table)');
      await region.waitFor();
      const label = (await region.getAttribute('aria-label')) ?? '';
      expect(label).not.toBe('');
      expect(await tabNames(page, 30)).toContain(label);
      expect((await region.locator('caption').innerText()).trim()).not.toBe('');
    } finally {
      await page.close();
    }
  });

  // Storybook's toolbar has one Tab stop and moves inside with the arrow keys (roving tabindex), so
  // the selector is reached as a keyboard user would: Tab into the toolbar, then ArrowRight.
  it('reaches the toolbar theme selector by keyboard, named after its description and current choice', async () => {
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    try {
      await page.goto(`${served.url}index.html?path=/story/button-react--default`);
      await page.locator('#storybook-preview-iframe').waitFor();
      await page.locator('button', { hasText: 'Sistema' }).first().waitFor();
      const inToolbar = () => page.evaluate(() => !!document.activeElement?.closest('[role="toolbar"]'));
      for (let i = 0; i < 40 && !(await inToolbar()); i++) await page.keyboard.press('Tab');
      expect(await inToolbar(), 'Tab never reaches the toolbar').toBe(true);
      const names: string[] = [];
      for (let i = 0; i < 20; i++) {
        names.push(await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? '').trim()));
        await page.keyboard.press('ArrowRight');
      }
      expect(names.some((n) => n.startsWith('Tema de la galería') && n.includes('Sistema')), JSON.stringify(names)).toBe(true);
    } finally {
      await page.close();
    }
  });
});
