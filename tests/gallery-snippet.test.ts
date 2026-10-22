import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { serve, type Served } from './lib/serve.ts';

const imports = ["import { Button } from '@component-museum/react';", "import '@component-museum/react/styles.css';"];

/** The usage code under the docs page's <Canvas>: the <pre> beside the rendered story. */
async function usageCode(page: Page): Promise<string> {
  const canvas = page.locator('.docs-story').first().locator('xpath=..');
  return (await canvas.locator('pre').first().innerText()).replace(/\r\n/g, '\n');
}

/** Waits until the usage code contains `text`, and returns it. */
async function waitForCode(page: Page, text: string): Promise<string> {
  await expect.poll(() => usageCode(page), { timeout: 15_000 }).toContain(text);
  return usageCode(page);
}

describe('the usage code follows the controls on the docs page (spec 005, RF-2)', { timeout: 120_000 }, () => {
  let served: Served;
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
    page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
    await page.goto(`${served.url}iframe.html?id=button-documentation--docs&viewMode=docs`);
    await page.locator('.docs-story button').first().waitFor();
  });
  afterAll(async () => {
    await browser?.close();
    await served?.close();
  });

  it('starts with both imports and the default Button', async () => {
    const code = await waitForCode(page, '<Button');
    for (const line of imports) expect(code).toContain(line);
    expect(code).not.toContain('variant=');
  });

  it('writes variant="secondary" once the variant control says so, keeping both imports', async () => {
    await page.locator('select[id$="-variant"]').selectOption('secondary');
    const code = await waitForCode(page, 'variant="secondary"');
    for (const line of imports) expect(code).toContain(line);
  });

  it('writes className="my-button" once the class control picks it', async () => {
    await page.locator('select[id$="-className"]').selectOption({ label: 'my-button' });
    const code = await waitForCode(page, 'className="my-button"');
    for (const line of imports) expect(code).toContain(line);
  });
});
