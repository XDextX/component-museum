import { chromium, type Browser } from 'playwright-core';

export type PageOptions = { colorScheme?: 'light' | 'dark'; javaScriptEnabled?: boolean };

async function launchEdge(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch (error) {
    throw new Error('no se encontró Microsoft Edge (canal msedge)', { cause: error });
  }
}

/**
 * Opens `url` in the system Edge with the given scheme and JavaScript setting, and returns the
 * computed value of `property` on the first element matching `selector`.
 */
export async function readStyle(
  url: string,
  selector: string,
  property: string,
  options: PageOptions = {},
): Promise<string> {
  const browser = await launchEdge();
  try {
    const context = await browser.newContext({
      colorScheme: options.colorScheme ?? 'light',
      javaScriptEnabled: options.javaScriptEnabled ?? true,
    });
    const page = await context.newPage();
    await page.goto(url);
    // evaluate runs in Playwright's own world, so it answers even with page JavaScript disabled.
    return await page
      .locator(selector)
      .first()
      .evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
  } finally {
    await browser.close();
  }
}
