import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { serve, type Served } from './lib/serve.ts';

const removed = ['Preview background', 'Grid visibility', 'Measure tool', 'Outline tool'];

describe('the manager toolbar of the built Storybook (RF-4)', { timeout: 120_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  it('has no background, grid, measure or outline tool, and keeps the gallery theme', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      await page.goto(`${served.url}index.html?path=/story/button-react--default`);
      // The theme tool is ours: once it is there, the toolbar has rendered its addons.
      await page.getByRole('button', { name: /Tema de la galería/ }).first().waitFor();
      const names = await page.locator('button, [role="button"]').evaluateAll((els) =>
        els.map((el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''} ${el.textContent ?? ''}`),
      );
      const present = removed.filter((name) => names.some((n) => n.includes(name)));
      expect(present).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
