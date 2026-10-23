import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { visibleTexts } from './lib/contrast.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 008, RF-1, RF-2 and rule 7: the story views follow the gallery theme.
const stories = ['button-react--default', 'button-astro--variants'];
const docs = ['button-documentation--docs', 'matrix--docs'];
const cases = [
  { globals: 'dark', system: 'light', expected: 'dark' },
  { globals: 'light', system: 'dark', expected: 'light' },
  { globals: 'system', system: 'dark', expected: 'dark' },
  { globals: 'system', system: 'light', expected: 'light' },
] as const;

const luminance = (computed: string) => {
  const bg = parseRgb(computed);
  return contrastRatio(bg, { r: 0, g: 0, b: 0, a: 1 }) < contrastRatio(bg, { r: 255, g: 255, b: 255, a: 1 }) ? 'dark' : 'light';
};

/**
 * The root and every element that scrolls on its own, with its resolved `color-scheme`. The docs
 * page's explicit code blocks (`.docblock-source`) and the code panel of a canvas are Storybook's own and out of scope in spec 008.
 */
const schemes = (page: Page) =>
  page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll('*')]
      .filter((el) => el === document.documentElement || (el.checkVisibility() && !el.closest('.docblock-source, .sbdocs-preview [data-radix-scroll-area-viewport]') && /auto|scroll/.test(getComputedStyle(el).overflowX + getComputedStyle(el).overflowY)))
      .map((el) => ({ el: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ')[0]}` : ''), scheme: getComputedStyle(el).colorScheme })),
  );

describe('story views follow the gallery theme (spec 008)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  async function open(id: string, globals: string, system: 'light' | 'dark') {
    const context = await browser.newContext({ colorScheme: system, viewport: { width: 800, height: 600 } });
    const page = await context.newPage();
    const view = id.endsWith('--docs') ? 'docs' : 'story';
    await page.goto(`${served.url}iframe.html?id=${id}&viewMode=${view}&globals=theme:${globals}`);
    await page.locator(view === 'docs' ? '.sbdocs-wrapper p:visible' : '#storybook-root button').first().waitFor();
    await page.waitForLoadState('networkidle');
    return { page, close: () => context.close() };
  }

  // RF-1: corners and centre of the viewport paint the decorator's surface.
  async function paintAtPoints(page: Page) {
    return page.evaluate(() => {
      const w = innerWidth;
      const h = innerHeight;
      const surface = getComputedStyle(document.querySelector('#storybook-root > div')!).backgroundColor;
      const painted = ([[2, 2], [w - 2, 2], [2, h - 2], [w - 2, h - 2], [w / 2, h / 2]] as const).map(([x, y]) => {
        let el: Element | null = document.elementFromPoint(x, y);
        while (el && !/^rgb\(/.test(getComputedStyle(el).backgroundColor)) el = el.parentElement;
        return el ? getComputedStyle(el).backgroundColor : 'none';
      });
      return { surface, painted };
    });
  }

  for (const id of stories) {
    for (const { globals, system, expected } of cases) {
      it(`${id}, theme:${globals} under a ${system} system: four corners and the centre paint the ${expected} surface (RF-1)`, async () => {
        const { page, close } = await open(id, globals, system);
        try {
          const before = await paintAtPoints(page);
          expect(luminance(before.surface)).toBe(expected);
          expect(before.painted).toEqual(Array(5).fill(before.surface));
          // The Astro story is taller than the viewport: the bottom corners must be painted after scrolling too.
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          const after = await paintAtPoints(page);
          expect(after.painted).toEqual(Array(5).fill(after.surface));
        } finally {
          await close();
        }
      });

      it(`${id}, theme:${globals} under a ${system} system: all visible text at 4.5:1 (rule 7)`, async () => {
        const { page, close } = await open(id, globals, system);
        try {
          const rated = (await visibleTexts(page)).map((t) => ({ ...t, ratio: Number(contrastRatio(parseRgb(t.fg), parseRgb(t.bg)).toFixed(2)) }));
          console.log(`[story-theme] ${id} theme:${globals} / ${system}: ${rated.length} texts, lowest ${Math.min(...rated.map((t) => t.ratio))}`);
          expect(rated.length).toBeGreaterThan(0);
          expect(rated.filter((t) => t.ratio < 4.5)).toEqual([]);
        } finally {
          await close();
        }
      });
    }
  }

  // RF-2: the root and every self-scrolling element resolve the gallery's colour scheme.
  for (const id of [...stories, ...docs]) {
    for (const globals of ['dark', 'light'] as const) {
      it(`${id}, theme:${globals}: the root and every scroll container resolve color-scheme ${globals} (RF-2)`, async () => {
        const { page, close } = await open(id, globals, globals === 'dark' ? 'light' : 'dark');
        try {
          const found = await schemes(page);
          expect(found.length).toBeGreaterThan(0);
          expect(found.filter((f) => f.scheme !== globals)).toEqual([]);
        } finally {
          await close();
        }
      });
    }
  }

  for (const id of ['button-react--default', 'button-documentation--docs']) {
    it(`${id}: the root colour scheme changes with the page open when the toolbar changes the theme (RF-2)`, async () => {
      const context = await browser.newContext({ colorScheme: 'light' });
      const page = await context.newPage();
      try {
        await page.goto(`${served.url}?path=/${id.endsWith('--docs') ? 'docs' : 'story'}/${id}&globals=theme:light`);
        const frame = page.frameLocator('#storybook-preview-iframe');
        const root = () => frame.locator('html').evaluate((el) => getComputedStyle(el).colorScheme);
        await frame.locator('#storybook-root button, .sbdocs-wrapper').first().waitFor();
        expect(await root()).toBe('light');
        await page.getByRole('button', { name: /Tema de la galería/ }).click();
        await page.getByText('Oscuro', { exact: true }).first().click();
        await expect.poll(root).toBe('dark');
      } finally {
        await context.close();
      }
    });
  }
});
