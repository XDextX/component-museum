import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import type { Framework } from './lib/paths.ts';
import { serve, type Served } from './lib/serve.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = readFileSync(join(repo, 'styles', 'museum.css'), 'utf8').replace(/\r\n/g, '\n');
const consumers = inject('consumers');
const frameworks: Framework[] = ['react', 'astro'];
const variants = ['primary', 'secondary', 'outline'];
const sizes = ['sm', 'md', 'lg'];
const colorTokens = ['surface', 'focus', ...variants.flatMap((v) => ['bg', 'fg', 'border'].map((p) => `button-${v}-${p}`))];

/** The `--museum-*` hex tokens a theme block declares in the source sheet, as `{ name: '#rrggbb' }`. */
function themeTokens(theme: 'light' | 'dark'): Record<string, string> {
  const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/--museum-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}
const themes = { light: themeTokens('light'), dark: themeTokens('dark') };

let browser: Browser;
const servers: Partial<Record<Framework, Served>> = {};

beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
  for (const f of frameworks) servers[f] = await serve(join(consumers.plain[f], 'dist'));
});
afterAll(async () => {
  await browser?.close();
  await Promise.all(Object.values(servers).map((s) => s.close()));
});

/** Opens the built consumer in a fresh context with an explicit viewport; the page is ready once Button is in the DOM. */
async function open(f: Framework, scheme: 'light' | 'dark', javaScriptEnabled = true): Promise<Page> {
  const context = await browser.newContext({ colorScheme: scheme, javaScriptEnabled, viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await page.goto(servers[f]!.url);
  await page.waitForSelector('#button-primary-md');
  return page;
}

/** The value of each custom property on the first element matching `selector`. */
const tokensAt = async (page: Page, selector: string, names: string[]): Promise<Record<string, string>> => {
  const raw = await page.locator(selector).first().evaluate(
    (el, list) => Object.fromEntries(list.map((n) => [n, getComputedStyle(el).getPropertyValue(`--museum-${n}`).trim().toLowerCase()])),
    names,
  );
  // Edge serialises `#ffffff` as `#fff`: expand it so the comparison is with the source's spelling.
  return Object.fromEntries(Object.entries(raw).map(([n, v]) => [n, v.replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3')]));
};

/** Computed colours of a Button next to what its own tokens resolve to, read with a probe in the same parent. */
const buttonColours = (page: Page, id: string, variant: string) =>
  page.locator(`#${id}`).evaluate((el, v) => {
    const style = getComputedStyle(el);
    const probe = (token: string) => {
      const p = document.createElement('span');
      p.style.color = `var(--museum-button-${v}-${token})`;
      el.parentElement!.appendChild(p);
      const value = getComputedStyle(p).color;
      p.remove();
      return value;
    };
    return {
      got: [style.backgroundColor, style.color, style.borderTopColor],
      want: [probe('bg'), probe('fg'), probe('border')],
    };
  }, variant);

/** Every light/dark colour token the source sheet declares for `theme`, as a matcher object. */
const themeMatcher = (theme: 'light' | 'dark') =>
  Object.fromEntries(colorTokens.filter((n) => themes[theme][n]).map((n) => [n, themes[theme][n]]));

describe('RF-1: Button wears the package styles', { timeout: 60_000 }, () => {
  for (const f of frameworks) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const js of f === 'astro' ? [true, false] : [true]) {
        it(`${f}, ${scheme}${js ? '' : ', without JavaScript'}: background, text and border are the variant's tokens`, async () => {
          const page = await open(f, scheme, js);
          for (const v of variants) for (const s of sizes) {
            const { got, want } = await buttonColours(page, `button-${v}-${s}`, v);
            expect(got, `${v} ${s}`).toEqual(want);
          }
          // A raw colour in a rule would still render a colour, so the tokens must also be the theme's own.
          expect(await tokensAt(page, '#button-primary-md', colorTokens)).toMatchObject(themeMatcher(scheme));
        });
      }
    }
    it(`${f}: both package sheets at once look the same`, async () => {
      const page = await open(f, 'light');
      const before = await buttonColours(page, 'button-primary-md', 'primary');
      await page.addStyleTag({ content: source });
      expect(await buttonColours(page, 'button-primary-md', 'primary')).toEqual(before);
      expect(before.got).toEqual(before.want);
    });
  }
});

describe('RF-4: each token category reaches Button', { timeout: 60_000 }, () => {
  // [category, declaration, CSSStyleDeclaration property, expected computed value]
  const cases: [string, string, string, string][] = [
    ['color: bg', '--museum-button-primary-bg: rgb(1, 2, 3)', 'backgroundColor', 'rgb(1, 2, 3)'],
    ['color: fg', '--museum-button-primary-fg: rgb(4, 5, 6)', 'color', 'rgb(4, 5, 6)'],
    ['color: border', '--museum-button-primary-border: rgb(7, 8, 9)', 'borderTopColor', 'rgb(7, 8, 9)'],
    ['radius', '--museum-radius: 17px', 'borderTopLeftRadius', '17px'],
    ['spacing', '--museum-space-md-x: 21px', 'paddingLeft', '21px'],
    ['typography: family', '--museum-font-family: monospace', 'fontFamily', 'monospace'],
    ['typography: size', '--museum-font-size-md: 23px', 'fontSize', '23px'],
    ['typography: weight', '--museum-font-weight: 300', 'fontWeight', '300'],
  ];
  for (const f of frameworks) {
    for (const [name, declaration, property, expected] of cases) {
      it(`${f}: overriding ${name} in :root changes ${property}`, async () => {
        const page = await open(f, 'light');
        const read = (sel: string) => page.locator(sel).evaluate((el, p) => (getComputedStyle(el) as unknown as Record<string, string>)[p], property);
        const other = await read('#button-secondary-lg');
        await page.addStyleTag({ content: `:root { ${declaration}; }` });
        expect(await read('#button-primary-md')).toBe(expected);
        // Half-defined tokens: a colour or a size of another button stays as it was.
        if (name.startsWith('color') || name === 'spacing') expect(await read('#button-secondary-lg')).toBe(other);
      });
    }
    it(`${f}: a token redefined in a container only changes what it contains`, async () => {
      const page = await open(f, 'light');
      await page.evaluate(() => {
        const box = document.createElement('div');
        box.id = 'box';
        box.style.setProperty('--museum-radius', '19px');
        box.appendChild(document.querySelector('#button-primary-md')!.cloneNode(true));
        document.body.appendChild(box);
      });
      const radius = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
      expect(await radius('#box .museum-button')).toBe('19px');
      expect(await radius('#button-secondary-md')).toBe('6px');
    });
  }
});

/** Nests `<div data-theme=...>` elements, outermost first, with a probe inside; returns the tokens read at the probe. */
async function themedProbe(page: Page, chain: string[]): Promise<Record<string, string>> {
  await page.evaluate((list) => {
    document.getElementById('probe-root')?.remove();
    let parent: HTMLElement = document.body;
    for (const t of list) {
      const div = document.createElement('div');
      if (parent === document.body) div.id = 'probe-root';
      div.setAttribute('data-theme', t);
      parent.appendChild(div);
      parent = div;
    }
    const probe = document.createElement('span');
    probe.id = 'probe';
    parent.appendChild(probe);
  }, chain);
  return tokensAt(page, '#probe', colorTokens);
}

describe('RF-5: with no data-theme, the system preference decides', { timeout: 60_000 }, () => {
  for (const f of frameworks) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`${f}: ${scheme} emulation gives the ${scheme} tokens`, async () => {
        const page = await open(f, scheme);
        expect(await tokensAt(page, '#button-primary-md', colorTokens)).toMatchObject(themeMatcher(scheme));
      });
      it(`${f}: an unknown data-theme on <html> is treated as absent under ${scheme} emulation`, async () => {
        const page = await open(f, scheme);
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'sepia'));
        expect(await tokensAt(page, '#button-primary-md', colorTokens)).toMatchObject(themeMatcher(scheme));
      });
    }
  }
});

describe('RF-6: the nearest data-theme wins over the system preference', { timeout: 60_000 }, () => {
  for (const f of frameworks) {
    for (const [attr, scheme] of [['dark', 'light'], ['light', 'dark']] as const) {
      it(`${f}: <html data-theme="${attr}"> under ${scheme} emulation gives ${attr}`, async () => {
        const page = await open(f, scheme);
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), attr);
        expect(await tokensAt(page, '#button-primary-md', colorTokens)).toMatchObject(themeMatcher(attr));
      });
      it(`${f}: a ${attr} container under ${scheme} emulation gives ${attr} inside`, async () => {
        const page = await open(f, scheme);
        expect(await themedProbe(page, [attr])).toMatchObject(themeMatcher(attr));
      });
    }
    it(`${f}: a light container inside a dark one gives light, and the reverse`, async () => {
      const page = await open(f, 'dark');
      expect(await themedProbe(page, ['dark', 'light'])).toMatchObject(themeMatcher('light'));
      expect(await themedProbe(page, ['light', 'dark'])).toMatchObject(themeMatcher('dark'));
    });
    it(`${f}: an unknown container value inherits from the ancestor, and with no ancestor from the system`, async () => {
      const light = await open(f, 'light');
      expect(await themedProbe(light, ['dark', 'sepia'])).toMatchObject(themeMatcher('dark'));
      expect(await themedProbe(light, ['sepia'])).toMatchObject(themeMatcher('light'));
      const dark = await open(f, 'dark');
      expect(await themedProbe(dark, ['sepia'])).toMatchObject(themeMatcher('dark'));
    });
    it(`${f}: a :root token of the consumer loses inside a nearer data-theme`, async () => {
      const page = await open(f, 'light');
      await page.addStyleTag({ content: ':root { --museum-button-primary-bg: #010203; }' });
      expect((await tokensAt(page, '#button-primary-md', ['button-primary-bg']))['button-primary-bg']).toBe('#010203');
      expect((await themedProbe(page, ['dark']))['button-primary-bg']).toBe(themes.dark['button-primary-bg']);
    });
  }
});
