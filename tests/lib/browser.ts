import { chromium, type Browser } from 'playwright-core';

export type PageOptions = { colorScheme?: 'light' | 'dark'; javaScriptEnabled?: boolean };

/**
 * The one teardown for a test file's Edge and its servers: every context first, then Edge, then the
 * servers, in that order. A step still running at 10 s or 20 s is reported by name, so a hook
 * timeout names its own cause (see hookTimeout in vitest.config.ts).
 */
export async function closeBrowserAndServers(
  browser: Browser | undefined,
  servers: ({ close: () => Promise<void> } | undefined)[],
): Promise<void> {
  const step = async (name: string, run: () => Promise<unknown>) => {
    // Warn while the step is still running, so a hook timeout still names its cause.
    const timers = [10_000, 20_000].map((ms) =>
      setTimeout(() => console.warn(`[museum] teardown: ${name} still running after ${ms} ms`), ms),
    );
    try {
      await run();
    } finally {
      timers.forEach(clearTimeout);
    }
  };
  if (browser) {
    await step('closing the contexts', () => Promise.all(browser.contexts().map((context) => context.close())));
    await step('closing Edge', () => browser.close());
  }
  await step('closing the servers', () => Promise.all(servers.map((server) => server?.close())));
}

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

export type ElementShape = { id: string; tag: string; classes: string[]; attributes: Record<string, string> };

/**
 * Loads `html` in the system Edge without JavaScript and describes every element matching
 * `selector`: tag, sorted classes and every other attribute. Only the explicit list below is
 * normalised away; any other extra attribute on one side makes the comparison fail.
 */
export async function readElements(html: string, selector: string): Promise<ElementShape[]> {
  const browser = await launchEdge();
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setContent(html);
    return await page.locator(selector).evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.id,
        tag: element.tagName.toLowerCase(),
        classes: [...element.classList].sort(),
        attributes: Object.fromEntries(
          element.getAttributeNames()
            // `class` is compared sorted above; `data-astro-*` is Astro's own bookkeeping.
            .filter((name) => name !== 'class' && name !== 'id' && !name.startsWith('data-astro-'))
            .sort()
            .map((name) => [name, element.getAttribute(name) ?? '']),
        ),
      })),
    );
  } finally {
    await browser.close();
  }
}
