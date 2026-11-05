import type { BrowserContext } from 'playwright-core';

// Errors Playwright raises in a route handler that is still working when its page, context or browser closes.
const closing = /Target (page, context or browser )?has been closed|Browser has been closed|has been disposed|Request context disposed|ECONNRESET/;

/** Runs a route handler; a close-time error is dropped, any other error is rethrown so the test still fails. */
export async function untilClosed(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    if (!closing.test(error instanceof Error ? error.message : String(error))) throw error;
  }
}

/** Serves `url` with `data-theme="<attribute>"` written on <html>, as a page asking for the theme would. */
export async function setThemeAttribute(context: BrowserContext, url: string, attribute: string): Promise<void> {
  await context.route(url + '**', (route) =>
    untilClosed(async () => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({ response, body: response.headers()['content-type']?.includes('text/html') ? body.replace('<html', `<html data-theme="${attribute}"`) : body });
    }),
  );
}
