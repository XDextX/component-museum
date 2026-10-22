import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { exampleClasses } from '../gallery/lib/example-classes.ts';
import { loadContract } from './lib/contract.ts';
import { closeBrowserAndServers } from './lib/browser.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const contract = loadContract(join(repo, 'contracts', 'button.contract.json'));
const exampleClass = 'my-button';
const themes = ['light', 'dark'] as const;

type Rendered = { classes: string[]; attributes: Record<string, string>; text: string; error: boolean };

/**
 * One arg per contract prop, off its default, with how it must show on the <button>: an enum as the
 * class `museum-button--<value>` or the attribute `<prop>="<value>"`, a boolean as its attribute.
 * Then the content and the class controls (RF-4).
 */
const cases: { arg: string; shows: (b: Rendered) => boolean }[] = [
  ...Object.entries(contract.props).map(([name, spec]) => {
    if (spec.type === 'boolean') return { arg: `${name}:!${!spec.default}`, shows: (b: Rendered) => name in b.attributes };
    const value = spec.values.find((v) => v !== spec.default)!;
    return {
      arg: `${name}:${value}`,
      shows: (b: Rendered) => b.classes.includes(`museum-button--${value}`) || b.attributes[name] === value,
    };
  }),
  { arg: 'children:Hola', shows: (b) => b.text === 'Hola' },
  { arg: `className:${exampleClass}`, shows: (b) => b.classes.includes(exampleClass) },
  // An empty text leaves Button without text and without an error (spec 004, edge case).
  { arg: 'children:', shows: (b) => b.text === '' },
];

/** Opens the React story with `args` (the URL path the controls share) and reads its <button>. */
async function render(browser: Browser, url: string, colorScheme: 'light' | 'dark', args: string): Promise<Rendered> {
  const page = await (await browser.newContext({ colorScheme })).newPage();
  try {
    await page.goto(`${url}iframe.html?id=button-react--default&viewMode=story&args=${args}`);
    const button = page.locator('#storybook-root button');
    await button.waitFor();
    return await button.evaluate((b) => ({
      classes: [...b.classList],
      attributes: Object.fromEntries(b.getAttributeNames().map((n) => [n, b.getAttribute(n) ?? ''])),
      text: b.textContent ?? '',
      // Storybook shows a story that throws in its own error display on <body>.
      error: document.body.classList.contains('sb-show-errordisplay'),
    }));
  } finally {
    await page.context().close();
  }
}

describe('the React story re-renders Button for each control (RF-4)', { timeout: 120_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  for (const theme of themes) {
    it(`changes the attribute, class or text of the <button>, in the ${theme} theme`, async () => {
      const base = await render(browser, served.url, theme, '');
      const problems: string[] = [];
      for (const { arg, shows } of cases) {
        const after = await render(browser, served.url, theme, arg);
        if (after.error) problems.push(`${arg}: the story shows an error`);
        if (!shows(after)) problems.push(`${arg}: the <button> does not show it (${JSON.stringify(after)})`);
        if (shows(base)) problems.push(`${arg}: the default <button> already shows it, so the case proves nothing`);
      }
      expect(problems).toEqual([]);
    });
  }
});

// Keeps the example class in step with the one source the story offers it from.
it('offers the example class the cases use', () => {
  expect(Object.keys(exampleClasses)).toContain(exampleClass);
});

/** Every non-empty line of a CSS text, trimmed: what must be readable on the page, whatever the layout. */
const cssLines = (css: string) => css.split('\n').map((l) => l.trim()).filter(Boolean);

describe('the example CSS is seen beside its control and on the docs page (RF-9)', { timeout: 120_000 }, () => {
  let served: Served;
  let browser: Browser;
  beforeAll(async () => {
    served = await serve(inject('gallery').storybook);
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(async () => {
    await closeBrowserAndServers(browser, [served]);
  });

  it('shows each example class CSS in the className row of the controls panel', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      await page.goto(`${served.url}index.html?path=/story/button-react--default`);
      const row = page.locator('tr', { has: page.locator('text=className') }).first();
      await row.waitFor();
      const text = await row.innerText();
      for (const [name, css] of Object.entries(exampleClasses)) {
        for (const line of cssLines(css)) expect(text, `.${name}: ${line}`).toContain(line);
      }
    } finally {
      await page.close();
    }
  });

  // The page shows one language at a time (spec 005, T-2): pick each with the switch and look there.
  it('shows each example class CSS on the docs page, in each language', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${served.url}iframe.html?id=button-documentation--docs&viewMode=docs`);
      for (const language of ['Español', 'English']) {
        await page.getByRole('button', { name: language }).click();
        for (const [name, css] of Object.entries(exampleClasses)) {
          const [first, last] = [cssLines(css)[0], cssLines(css).at(-2)!];
          // <Source> renders after the page: wait until the chosen language carries the rule.
          await page.waitForFunction(
            ([a, b]) => new RegExp(`${a}[\\s\\S]*?${b}`).test(document.body.innerText),
            [first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')],
            { timeout: 30_000 },
          ).catch(() => expect.fail(`.${name}: the docs page does not show its CSS in ${language}`));
        }
      }
    } finally {
      await page.close();
    }
  });
});
