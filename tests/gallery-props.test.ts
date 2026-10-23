import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { serve, type Served } from './lib/serve.ts';

// Literal on purpose: this is what the contract says, checked against what the page renders.
const expected: Record<string, string> = { variant: 'primary', size: 'md', type: 'button', disabled: 'false' };

describe('gallery props table defaults (spec 007, RF-1)', { timeout: 180_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  it('the documentation page shows the contract default of variant, size, type and disabled', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${served.url}iframe.html?viewMode=docs&id=button-documentation--docs`);
      // The table first renders a loading skeleton; the real one is `.docblock-argstable`.
      await page.locator('table.docblock-argstable tbody tr', { hasText: 'variant' }).first().waitFor();
      // Name is the first cell, Default the third; the control's own label is not part of either.
      const seen = await page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll('table.docblock-argstable tbody tr')].map((tr) => {
            const cells = tr.querySelectorAll('td');
            return [cells[0].textContent!.trim(), (cells[2].textContent ?? '').trim()];
          }),
        ),
      );
      expect(Object.fromEntries(Object.keys(expected).map((n) => [n, seen[n]]))).toEqual(expected);
    } finally {
      await page.close();
    }
  });
});
