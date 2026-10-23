import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 008, RF-3 and RF-4: the Astro cases keep the Button apart from its code, and the code wraps.
const story = 'iframe.html?id=button-astro--variants&viewMode=story';

describe('gallery Astro layout (spec 008, RF-3 and RF-4)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    // Playwright hides scrollbars by default; with overlay bars the overflow would not show (spec 007 notes).
    browser = await chromium.launch({ channel: 'msedge', ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  async function open(width: number) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(served.url + story);
    await page.locator('#astro-primary pre').waitFor();
    return page;
  }

  it('RF-3: the code block starts at least 8 px below the Button in all 6 cases', async () => {
    const page = await open(1024);
    try {
      const gaps = await page.locator('section[id^="astro-"]').evaluateAll((sections) =>
        sections.map((section) => {
          const button = section.querySelector('[data-museum-button]')!.getBoundingClientRect();
          const block = section.querySelector('[data-radix-scroll-area-viewport]')!.getBoundingClientRect();
          return { id: section.id, gap: block.top - button.bottom };
        }),
      );
      expect(gaps).toHaveLength(6);
      for (const { id, gap } of gaps) expect(gap, id).toBeGreaterThanOrEqual(8);
    } finally {
      await page.close();
    }
  });

  for (const width of [320, 542]) {
    it(`RF-6 (007) at ${width} px: every case has its copy button, visible, inside the viewport and focusable`, async () => {
      const page = await open(width);
      try {
        const sections = page.locator('section[id^="astro-"]');
        expect(await sections.count()).toBe(6);
        for (let i = 0; i < 6; i++) {
          const section = sections.nth(i);
          const copy = section.locator('button:not([data-museum-button])');
          expect(await copy.count(), `case ${i}`).toBe(1);
          // Scroll the page only: scrolling the button into view would also scroll its clipping wrapper and hide the fault.
          await section.evaluate((el) => el.scrollIntoView());
          const seen = await copy.evaluate((button) => {
            const r = button.getBoundingClientRect();
            // The topmost element at the button's centre must be the button: not clipped, not covered.
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { hit: !!top && button.contains(top), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
          });
          expect(seen, `case ${i}`).toEqual({ hit: true, inside: true });
          await copy.focus();
          expect(await copy.evaluate((button) => document.activeElement === button), `case ${i} focus`).toBe(true);
        }
      } finally {
        await page.close();
      }
    });

    for (const long of [false, true]) {
      it(`RF-4 at ${width} px${long ? ' with a 600 px word added' : ''}: every code block has scrollWidth <= clientWidth`, async () => {
        const page = await open(width);
        try {
          if (long) {
            // A word wider than the viewport: only overflow-wrap can break it.
            await page.locator('section[id^="astro-"] pre code').evaluateAll((codes) => {
              for (const code of codes) code.append(document.createTextNode('W'.repeat(80)));
            });
          }
          const seen = await page.locator('[data-radix-scroll-area-viewport]').evaluateAll((views) =>
            views.map((v) => ({ scroll: v.scrollWidth, client: v.clientWidth })),
          );
          expect(seen).toHaveLength(6);
          for (const { scroll, client } of seen) expect(scroll, JSON.stringify(seen)).toBeLessThanOrEqual(client);
        } finally {
          await page.close();
        }
      });
    }
  }
});
