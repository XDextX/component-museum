import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { tailwindPages } from './lib/consumer.ts';
import type { Framework } from './lib/paths.ts';
import { serve, type Served } from './lib/serve.ts';

const frameworks: Framework[] = ['react', 'astro'];
const consumers = inject('consumers');

let browser: Browser;
const servers: Served[] = [];

beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
});
afterAll(async () => {
  await browser?.close();
  await Promise.all(servers.map((s) => s.close()));
});

/** Opens `route` of the built consumer in `dir` and waits until its Buttons are rendered. */
async function open(dir: string, route = ''): Promise<Page> {
  const server = await serve(join(dir, 'dist'));
  servers.push(server);
  const page = await (await browser.newContext({ colorScheme: 'light' })).newPage();
  await page.goto(server.url + route.replaceAll('\\', '/'));
  await page.locator('#button-primary-md').waitFor();
  return page;
}

const read = (page: Page, selector: string, property: string) =>
  page.locator(selector).evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), property);

/** A token's computed value, resolved by the browser the way Button's own rule would use it. */
const token = (page: Page, property: string, token: string) =>
  page.evaluate(
    ([p, t]) => {
      const probe = document.createElement('div');
      probe.style.setProperty(p, `var(${t})`);
      document.body.append(probe);
      const value = getComputedStyle(probe).getPropertyValue(p);
      probe.remove();
      return value;
    },
    [property, token],
  );

describe('an unlayered consumer rule wins (spec 003 RF-8)', { timeout: 60_000 }, () => {
  for (const framework of frameworks) {
    it(`in the ${framework} consumer, on the component class and on a consumer class`, async () => {
      const page = await open(consumers.plain[framework]);
      await page.addStyleTag({
        content: '.museum-button { background-color: rgb(1, 2, 3); } .museum-test-own { background-color: rgb(4, 5, 6); }',
      });
      // #own-class has both classes; the more specific-by-order own rule is the later one.
      expect(await read(page, '#button-primary-md', 'background-color')).toBe('rgb(1, 2, 3)');
      expect(await read(page, '#own-class', 'background-color')).toBe('rgb(4, 5, 6)');
    });
  }
});

describe('Tailwind v4 in both import orders (spec 003 RF-9, RF-10)', { timeout: 60_000 }, () => {
  for (const framework of frameworks) {
    for (const [order, route] of Object.entries(tailwindPages[framework])) {
      describe(`${framework}, ${order}`, () => {
        it('RF-9: px-8 gives 32px of padding-left', async () => {
          const page = await open(consumers.tailwind[framework], route);
          expect(await read(page, '#tw-px8', 'padding-left')).toBe('32px');
        });

        it('RF-10: Button without utilities keeps the background and padding of its tokens', async () => {
          const page = await open(consumers.tailwind[framework], route);
          const background = await token(page, 'background-color', '--museum-button-primary-bg');
          const padding = await token(page, 'padding-left', '--museum-space-md-x');
          expect(background).not.toBe('');
          expect(padding).toMatch(/px$/);
          expect(await read(page, '#button-primary-md', 'background-color')).toBe(background);
          expect(await read(page, '#button-primary-md', 'padding-left')).toBe(padding);
        });
      });
    }
  }
});
