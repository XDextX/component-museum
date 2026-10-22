import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { describe, expect, inject, it } from 'vitest';
import { serve } from './lib/serve.ts';

const consumers = inject('consumers');

// T-5 smoke test: the served React SPA runs its module and renders the own-class Button.
describe('serve and the own-class Button (spec 003, T-5)', { timeout: 60_000 }, () => {
  it('serves the React dist so Edge executes it and renders the museum-test-own Button', async () => {
    const server = await serve(join(consumers.plain.react, 'dist'));
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
      const page = await browser.newPage();
      await page.goto(server.url);
      const own = page.locator('button.museum-test-own');
      await own.waitFor({ timeout: 10_000 });
      expect(await own.evaluate((e) => [...e.classList].includes('museum-button'))).toBe(true);
      expect(await page.locator('button[id^="button-"]:not(#button-attrs)').count()).toBe(9);
    } finally {
      await browser.close();
      await server.close();
    }
  });

  it('closes its port when done', async () => {
    const server = await serve(join(consumers.plain.react, 'dist'));
    await server.close();
    await expect(fetch(server.url)).rejects.toThrow();
  });

  it('puts the same own-class Button in the Astro page', () => {
    const html = readFileSync(join(consumers.plain.astro, 'dist', 'index.html'), 'utf8');
    expect(html).toMatch(/class="[^"]*museum-test-own[^"]*"/);
  });
});
