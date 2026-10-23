import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { exampleText, type Contract } from '../gallery/lib/contract-args.ts';
import { exampleClasses } from '../gallery/lib/example-classes.ts';
import { closeBrowserAndServers } from './lib/browser.ts';
import { exportedContracts, packageExports, slug, storyId } from './lib/gallery-pages.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const exampleClass = 'my-button';
const themes = ['light', 'dark'] as const;

type Rendered = { classes: string[]; attributes: Record<string, string>; text: string; shown: string; error: boolean };

// Every component a package exports with a contract and a React story (spec 009, RF-10).
const components = exportedContracts(repo).filter((c) => packageExports(repo).React.includes(c.name));

/**
 * One arg per contract prop, off its default, with how it must show on the component's root element
 * (`[data-museum-<name>]`): an enum as the class `museum-<name>--<value>` or the attribute
 * `<prop>="<value>"`, a boolean as its attribute, a text as part of what the story shows. Then the
 * content and the class controls (RF-4). Button's own cases come out exactly as they always did.
 */
function casesOf(contract: Contract): { arg: string; shows: (b: Rendered) => boolean }[] {
  const name = slug(contract.name);
  return [
    ...Object.entries(contract.props).flatMap(([prop, spec]) => {
      if (spec.type === 'string') {
        const text = exampleText(prop);
        return [{ arg: `${prop}:${text}`, shows: (b: Rendered) => b.shown.includes(text) }];
      }
      if (spec.type === 'boolean') return [{ arg: `${prop}:!${!spec.default}`, shows: (b: Rendered) => prop in b.attributes }];
      const value = spec.values.find((v) => v !== spec.default)!;
      return [{
        arg: `${prop}:${value}`,
        shows: (b: Rendered) => b.classes.includes(`museum-${name}--${value}`) || b.attributes[prop] === value,
      }];
    }),
    ...(contract.content ? [{ arg: 'children:Hola', shows: (b: Rendered) => b.text === 'Hola' }] : []),
    { arg: `className:${exampleClass}`, shows: (b: Rendered) => b.classes.includes(exampleClass) },
    // An empty text leaves the component without text and without an error (spec 004, edge case).
    ...(contract.content ? [{ arg: 'children:', shows: (b: Rendered) => b.text === '' }] : []),
  ];
}

/** Opens the React story with `args` (the URL path the controls share) and reads the component's root element. */
async function render(browser: Browser, url: string, contract: Contract, colorScheme: 'light' | 'dark', args: string): Promise<Rendered> {
  const page = await (await browser.newContext({ colorScheme })).newPage();
  try {
    await page.goto(`${url}iframe.html?id=${storyId(contract.name, 'react')}&viewMode=story&args=${args}`);
    const root = page.locator(`#storybook-root [data-museum-${slug(contract.name)}]`);
    await root.waitFor();
    return await root.evaluate((b) => ({
      classes: [...b.classList],
      attributes: Object.fromEntries(b.getAttributeNames().map((n) => [n, b.getAttribute(n) ?? ''])),
      text: b.textContent ?? '',
      // Everything the story shows, for a text prop that lands beside the element (a label, a hint).
      shown: document.getElementById('storybook-root')?.textContent ?? '',
      // Storybook shows a story that throws in its own error display on <body>.
      error: document.body.classList.contains('sb-show-errordisplay'),
    }));
  } finally {
    await page.context().close();
  }
}

describe.each(components.map((c) => [c.name, c] as const))('the React story re-renders %s for each control (RF-4)', { timeout: 120_000 }, (_name, contract) => {
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
    it(`changes the attribute, class or text of the component, in the ${theme} theme`, async () => {
      const base = await render(browser, served.url, contract, theme, '');
      const problems: string[] = [];
      for (const { arg, shows } of casesOf(contract)) {
        const after = await render(browser, served.url, contract, theme, arg);
        if (after.error) problems.push(`${arg}: the story shows an error`);
        if (!shows(after)) problems.push(`${arg}: the component does not show it (${JSON.stringify(after)})`);
        if (shows(base)) problems.push(`${arg}: the default component already shows it, so the case proves nothing`);
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

  it.each(components.filter((c) => c.classProp).map((c) => [c.name] as const))('shows each example class CSS in the className row of the %s controls panel', async (name) => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      await page.goto(`${served.url}index.html?path=/story/${storyId(name, 'react')}`);
      const row = page.locator('tr', { has: page.locator('text=className') }).first();
      await row.waitFor();
      const text = await row.innerText();
      for (const [cls, css] of Object.entries(exampleClasses)) {
        for (const line of cssLines(css)) expect(text, `.${cls}: ${line}`).toContain(line);
      }
    } finally {
      await page.close();
    }
  });

  // The page shows one language at a time (spec 005, T-2): pick each with the switch and look there.
  // Button's docs page is where the example classes are shown in full.
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
