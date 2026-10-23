import { resolve } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { docsId, exportedContracts, packageExports, slug, storyId } from './lib/gallery-pages.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(import.meta.dirname, '..');
const exports = packageExports(repo);

// Every exported component: its docs page and the story of each framework that exports it (spec 009, RF-10).
const pages = exportedContracts(repo).flatMap((c) => {
  const hook = `[data-museum-${slug(c.name)}]`;
  return [
    [`${c.name} docs page`, `${docsId(c.name)}&viewMode=docs`, ''],
    ...(exports.React.includes(c.name) ? [[`the ${c.name} React story`, `${storyId(c.name, 'react')}&viewMode=story`, hook]] : []),
    ...(exports.Astro.includes(c.name) ? [[`the ${c.name} Astro story`, `${storyId(c.name, 'astro')}&viewMode=story`, hook]] : []),
  ] as [string, string, string][];
});
const widths = [320, 542];

describe('the gallery does not overflow horizontally from 320 px (spec 007, RF-7)', { timeout: 180_000 }, () => {
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

  for (const [name, query, hook] of pages) {
    for (const width of widths) {
      it(`${name} at ${width} px: scrollWidth <= clientWidth`, async () => {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        try {
          await page.goto(`${served.url}iframe.html?id=${query}`);
          await page.locator(`${hook ? `#storybook-root ${hook}, ` : ''}.sbdocs-wrapper`).first().waitFor();
          // Test hook: lets the injection check add a fixed-width element (task T-6).
          if (process.env.MUSEUM_OVERFLOW_INJECT) {
            await page.addStyleTag({ content: 'body::after{content:"";display:block;width:600px;height:1px}' });
          }
          const seen = await page.evaluate(() => {
            const root = document.documentElement;
            const widest = [...document.querySelectorAll('body *')]
              .filter((el) => !el.closest('table, [data-radix-scroll-area-viewport]'))
              .map((el) => ({ el, right: el.getBoundingClientRect().right }))
              .sort((a, b) => b.right - a.right)[0];
            return {
              scroll: root.scrollWidth,
              client: root.clientWidth,
              widest: `${widest?.el.parentElement?.outerHTML.slice(0, 200)} right=${widest?.right}`,
            };
          });
          expect(seen.scroll, JSON.stringify(seen)).toBeLessThanOrEqual(seen.client);
        } finally {
          await page.close();
        }
      });
    }
  }
});
