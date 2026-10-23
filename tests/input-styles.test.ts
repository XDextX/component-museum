import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import { visibleTexts } from './lib/contrast.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const css = readFileSync(join(repo, 'styles', 'museum.css'), 'utf8').replace(/\r\n/g, '\n');
const html = readFileSync(join(repo, 'tests', 'fixtures', 'input-field.html'), 'utf8').replace('<!-- museum.css -->', `<style>${css}</style>`);
const sizes = ['sm', 'md', 'lg'];
const tokens = ['control-bg', 'control-fg', 'control-border', 'control-placeholder', 'field-label', 'field-hint', 'field-error'];

// The four ways a page gets a theme: the attribute, or the system preference (the attribute wins over it).
const modes = [
  { name: 'light, data-theme', scheme: 'dark', attribute: 'light' },
  { name: 'dark, data-theme', scheme: 'light', attribute: 'dark' },
  { name: 'light, system', scheme: 'light', attribute: undefined },
  { name: 'dark, system', scheme: 'dark', attribute: undefined },
] as const;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
});
afterAll(async () => {
  await closeBrowserAndServers(browser, []);
});

async function open(mode: (typeof modes)[number], width = 1024): Promise<Page> {
  const page = await (await browser.newContext({ colorScheme: mode.scheme, viewport: { width, height: 900 } })).newPage();
  await page.setContent(html);
  if (mode.attribute) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), mode.attribute);
  return page;
}

/** What a control paints: its border, text, placeholder and own background, plus the page surface under it. */
const paint = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      border: s.borderTopColor, fg: s.color, placeholder: getComputedStyle(el, '::placeholder').color,
      bg: s.backgroundColor, surface: getComputedStyle(document.body).backgroundColor, opacity: s.opacity,
    };
  });

describe('the field tokens live in the three theme blocks', () => {
  for (const token of tokens) {
    it(`--museum-${token} is declared in the light, system-dark and data-theme dark blocks`, () => {
      expect(css.split(`--museum-${token}:`).length - 1).toBe(3);
    });
  }
  it('--museum-font-weight-regular is a fixed token', () => {
    expect(css).toMatch(/--museum-font-weight-regular:\s*400/);
  });
});

describe('every Input rule reads only var(--museum-*)', () => {
  const bodies = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /\.museum-(field|input)/.test(m[1]))
    .flatMap((m) => m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => ({ rule: m[1].trim(), decl: d })));
  it('has rules', () => expect(bodies.length).toBeGreaterThan(5));
  it('has no literal color or length', () => {
    expect(bodies.filter(({ decl }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\d(px|rem|em)\b/i.test(decl.replace(/var\([^)]*\)/g, '')))).toEqual([]);
  });
});

describe('the fixed field page, in Edge', { timeout: 60_000 }, () => {
  for (const mode of modes) {
    describe(mode.name, () => {
      it('RF-7: the control border is 3:1 against the surface, at rest and in error', async () => {
        const page = await open(mode);
        for (const id of ['in-md', 'in-error']) {
          const p = await paint(page, id);
          expect(contrastRatio(parseRgb(p.border), parseRgb(p.surface)), `${id} border`).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(parseRgb(p.border), parseRgb(p.bg)), `${id} border on its own background`).toBeGreaterThanOrEqual(3);
        }
        await page.context().close();
      });

      it('RF-8: label, hint, error, value and placeholder are 4.5:1', async () => {
        const page = await open(mode);
        const texts = await visibleTexts(page);
        expect(texts.length).toBeGreaterThan(5);
        const rated = texts.map((t) => ({ text: t.text, ratio: contrastRatio(parseRgb(t.fg), parseRgb(t.bg)) }));
        expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
        // Input values are not text nodes, so they and the placeholder are measured apart.
        for (const id of ['in-md', 'in-placeholder']) {
          const p = await paint(page, id);
          expect(contrastRatio(parseRgb(p.fg), parseRgb(p.bg)), `${id} value`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(parseRgb(p.placeholder), parseRgb(p.bg)), `${id} placeholder`).toBeGreaterThanOrEqual(4.5);
        }
        await page.context().close();
      });

      it('the error of a disabled field keeps 4.5:1: the opacity dims only the control', async () => {
        const page = await open(mode);
        const error = await page.locator('#in-disabled-error').evaluate((el) => {
          let opacity = 1;
          for (let n: Element | null = el; n; n = n.parentElement) opacity *= +getComputedStyle(n).opacity;
          return { fg: getComputedStyle(el).color, opacity };
        });
        expect(error.opacity).toBe(1);
        const p = await paint(page, 'in-disabled');
        expect(+p.opacity).toBeLessThan(1);
        expect(contrastRatio(parseRgb(error.fg), parseRgb(p.surface))).toBeGreaterThanOrEqual(4.5);
        await page.context().close();
      });

      it('the focus ring is 3:1 against the halo around it', async () => {
        const page = await open(mode);
        await page.keyboard.press('Tab');
        const ring = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const s = getComputedStyle(el);
          return { id: el.id, color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, surface: getComputedStyle(document.body).backgroundColor };
        });
        expect(ring.id).toBe('in-sm');
        expect(ring.style).not.toBe('none');
        expect(ring.width).toBeGreaterThanOrEqual(2);
        expect(contrastRatio(parseRgb(ring.color), parseRgb(ring.surface))).toBeGreaterThanOrEqual(3);
        await page.context().close();
      });
    });
  }

  it('RF-9: Input and Button of the same size are the same height', async () => {
    const page = await open(modes[2]);
    const heights = await page.evaluate((list) => list.map((size) => ({
      size, input: document.getElementById(`in-${size}`)!.getBoundingClientRect().height, button: document.getElementById(`btn-${size}`)!.getBoundingClientRect().height,
    })), sizes);
    expect(heights.map((h) => [h.size, +h.input.toFixed(2)])).toEqual(heights.map((h) => [h.size, +h.button.toFixed(2)]));
    await page.context().close();
  });

  it('a 600 px error with no spaces does not widen a 320 px field', async () => {
    const page = await open(modes[2], 800);
    const box = await page.evaluate(() => {
      const field = document.getElementById('long-field')!;
      const s = getComputedStyle(field);
      // The field paints a padded surface (009, validation round 1): the control fills its content box.
      const content = field.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      return { field: field.getBoundingClientRect().width, content, input: document.getElementById('in-long')!.getBoundingClientRect().width, scroll: field.scrollWidth };
    });
    expect(box.field).toBe(320);
    expect(box.input).toBe(box.content);
    expect(box.scroll).toBeLessThanOrEqual(320);
    await page.context().close();
  });
});
