import { resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { docLanguages, docsFile, docsId, exportedContracts, readText, sectionTitles } from './lib/gallery-pages.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(import.meta.dirname, '..');

/** The section titles (h2) the docs page shows right now. */
const shown = (page: Page) => page.locator('h2').allInnerTexts();

// Every exported component's docs page, with the titles its own MDX declares in each language (spec 009, RF-10).
const docs = exportedContracts(repo).map((c) => {
  const langs = docLanguages(readText(repo, docsFile(c.name)) ?? '');
  return [c.name, { es: sectionTitles(langs.es ?? ''), en: sectionTitles(langs.en ?? '') }] as const;
});

describe.each(docs)('the %s docs page language switch in the browser (spec 005, RF-1 and RF-5)', { timeout: 120_000 }, (name, titles) => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  it('starts in Spanish, switches to English, and keeps English after a reload', async () => {
    expect(titles.es.length, 'the MDX has Spanish sections').toBeGreaterThan(0);
    expect(titles.en.length, 'the MDX has English sections').toBeGreaterThan(0);
    // A new context has empty localStorage: no saved preference.
    const page = await (await browser.newContext()).newPage();
    try {
      await page.goto(`${served.url}iframe.html?id=${docsId(name)}&viewMode=docs`);
      const es = page.getByRole('button', { name: 'Español' });
      const en = page.getByRole('button', { name: 'English' });
      await es.waitFor();

      expect(await shown(page)).toEqual(expect.arrayContaining(titles.es));
      expect(await shown(page)).not.toEqual(expect.arrayContaining([titles.en[0]]));
      expect(await es.getAttribute('aria-pressed')).toBe('true');
      expect(await en.getAttribute('aria-pressed')).toBe('false');

      await en.click();
      await page.getByRole('heading', { name: titles.en[0] }).waitFor();
      const after = await shown(page);
      expect(after).toEqual(expect.arrayContaining(titles.en));
      for (const title of titles.es) expect(after).not.toContain(title);
      expect(await en.getAttribute('aria-pressed')).toBe('true');
      expect(await es.getAttribute('aria-pressed')).toBe('false');
      expect(await page.evaluate(() => localStorage.getItem('museum:lang'))).toBe('en');

      await page.reload();
      await page.getByRole('heading', { name: titles.en[0] }).waitFor();
      const reloaded = await shown(page);
      expect(reloaded).toEqual(expect.arrayContaining(titles.en));
      for (const title of titles.es) expect(reloaded).not.toContain(title);
      expect(await page.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    } finally {
      await page.context().close();
    }
  });
});
