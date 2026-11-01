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
const html = readFileSync(join(repo, 'tests', 'fixtures', 'field.html'), 'utf8').replace('<!-- museum.css -->', `<style>${css}</style>`);
const sizes = ['sm', 'md', 'lg'];
const tokens = ['control-bg', 'control-fg', 'control-border', 'control-placeholder', 'field-label', 'field-hint', 'field-error', 'checkbox-checked-bg', 'checkbox-mark', 'radio-checked-bg', 'radio-mark'];

// The five ways a page gets a theme (spec 011): it asks for light, dark or the system's, or asks for nothing and gets light.
const modes = [
  { name: 'light, data-theme', scheme: 'dark', attribute: 'light' },
  { name: 'dark, data-theme', scheme: 'light', attribute: 'dark' },
  { name: 'system, system light', scheme: 'light', attribute: 'system' },
  { name: 'system, system dark', scheme: 'dark', attribute: 'system' },
  { name: 'no data-theme, system dark', scheme: 'dark', attribute: undefined },
] as const;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
});
afterAll(async () => {
  await closeBrowserAndServers(browser, []);
});

async function open(mode: Pick<(typeof modes)[number], 'scheme' | 'attribute'>, width = 1024): Promise<Page> {
  const page = await (await browser.newContext({ colorScheme: mode.scheme, viewport: { width, height: 900 } })).newPage();
  await page.setContent(html);
  if (mode.attribute) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), mode.attribute);
  return page;
}

/** What a control paints: its border, text, placeholder and own background, plus the surface under it: its field's own, else the page's. */
const paint = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      border: s.borderTopColor, fg: s.color, placeholder: getComputedStyle(el, '::placeholder').color,
      bg: s.backgroundColor, surface: getComputedStyle(el.closest('.museum-field') ?? document.body).backgroundColor, opacity: s.opacity,
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
    .filter((m) => /\.museum-(field|input|textarea)/.test(m[1]))
    .flatMap((m) => m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => ({ rule: m[1].trim(), decl: d })));
  it('has rules', () => expect(bodies.length).toBeGreaterThan(5));
  it('includes the Textarea rules grouped with Input', () => expect(bodies.some(({ rule }) => rule.includes('.museum-textarea'))).toBe(true));
  it('has no literal color or length', () => {
    expect(bodies.filter(({ decl }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\d(px|rem|em)\b/i.test(decl.replace(/var\([^)]*\)/g, '')))).toEqual([]);
  });
});

/** RF-7 of 009: the control border is 3:1 against the page surface and against its own background. */
async function expectBorders(page: Page): Promise<void> {
  for (const id of ['in-md', 'in-error', 'ta-md', 'ta-error']) {
    const p = await paint(page, id);
    expect(contrastRatio(parseRgb(p.border), parseRgb(p.surface)), `${id} border`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(parseRgb(p.border), parseRgb(p.bg)), `${id} border on its own background`).toBeGreaterThanOrEqual(3);
  }
}

/** RF-8 of 009: label, hint, error, value and placeholder are 4.5:1. */
async function expectTexts(page: Page): Promise<void> {
  const texts = await visibleTexts(page);
  expect(texts.length).toBeGreaterThan(5);
  const rated = texts.map((t) => ({ text: t.text, ratio: contrastRatio(parseRgb(t.fg), parseRgb(t.bg)) }));
  expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
  // Input values are not text nodes, so they and the placeholder are measured apart.
  for (const id of ['in-md', 'in-placeholder', 'ta-md', 'ta-placeholder']) {
    const p = await paint(page, id);
    expect(contrastRatio(parseRgb(p.fg), parseRgb(p.bg)), `${id} value`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseRgb(p.placeholder), parseRgb(p.bg)), `${id} placeholder`).toBeGreaterThanOrEqual(4.5);
  }
}

describe('every Checkbox rule reads only var(--museum-*) or a system color (spec 012)', () => {
  const bodies = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /\.museum-(checkbox|field--inline)/.test(m[1]))
    .flatMap((m) => m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => ({ rule: m[1].trim(), decl: d })));
  it('has rules, among them the forced-colors ones', () => {
    expect(bodies.length).toBeGreaterThan(10);
    expect(bodies.some(({ decl }) => /^forced-color-adjust:\s*none$/.test(decl))).toBe(true);
  });
  it('has no literal color or length', () => {
    expect(bodies.filter(({ decl }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\d(px|rem|em)\b/i.test(decl.replace(/var\([^)]*\)/g, '')))).toEqual([]);
  });
});

describe('every RadioGroup rule reads only var(--museum-*) or a system color (spec 013)', () => {
  const bodies = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /\.museum-radio/.test(m[1]))
    .flatMap((m) => m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => ({ rule: m[1].trim(), decl: d })));
  it('has rules, among them the forced-colors ones', () => {
    expect(bodies.length).toBeGreaterThan(10);
    expect(bodies.some(({ rule, decl }) => rule.includes('.museum-radio') && /^forced-color-adjust:\s*none$/.test(decl))).toBe(true);
  });
  it('has no literal color or length', () => {
    expect(bodies.filter(({ decl }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\d(px|rem|em)\b/i.test(decl.replace(/var\([^)]*\)/g, '')))).toEqual([]);
  });
});

describe('every Select rule reads only var(--museum-*) or a system color (spec 014)', () => {
  const bodies = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /\.museum-select/.test(m[1]))
    .flatMap((m) => m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => ({ rule: m[1].trim(), decl: d })));
  it('has rules, among them the forced-colors ones', () => {
    expect(bodies.length).toBeGreaterThan(10);
    expect(bodies.some(({ rule, decl }) => rule.includes('.museum-select') && /^forced-color-adjust:\s*none$/.test(decl))).toBe(true);
  });
  it('shares the Input rules: Select is grouped with them, not copied', () => {
    for (const size of sizes) {
      const rule = css.split('{').map((s) => s.slice(s.lastIndexOf('}') + 1)).find((s) => s.includes(`.museum-input--${size}`) && s.includes(`.museum-textarea--${size}`));
      expect(rule, size).toContain(`.museum-select--${size}`);
    }
  });
  it('has no literal color (the arrow geometry is in em)', () => {
    expect(bodies.filter(({ decl }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(decl.replace(/var\([^)]*\)/g, '')))).toEqual([]);
  });
  it('--museum-select-arrow is declared in the three theme blocks, and a system color under forced colors', () => {
    expect(css.split('--museum-select-arrow: var(--museum-control-fg);').length - 1).toBe(3);
    expect(css.split('--museum-select-arrow: CanvasText;').length - 1).toBe(1);
  });
});

describe('RF-5 (spec 011): a field on a dark page that asks for no theme stays legible', { timeout: 60_000 }, () => {
  // The page is dark (#111827) and sets no data-theme: the package is light, and the field paints its own surface.
  for (const scheme of ['light', 'dark'] as const) {
    it(`system ${scheme}: borders are 3:1 and texts 4.5:1 over the page`, async () => {
      const page = await open({ scheme, attribute: undefined });
      await page.addStyleTag({ content: 'body { background: #111827; }' });
      // The page really is dark, and the surface under the control is the field's own, not the page's.
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(17, 24, 39)');
      expect((await paint(page, 'in-md')).surface).toBe('rgb(255, 255, 255)');
      await expectBorders(page);
      await expectTexts(page);
      await page.context().close();
    });
  }
});

describe('the fixed field page, in Edge', { timeout: 60_000 }, () => {
  for (const mode of modes) {
    describe(mode.name, () => {
      it('RF-7: the control border is 3:1 against the surface, at rest and in error', async () => {
        const page = await open(mode);
        await expectBorders(page);
        await page.context().close();
      });

      it('RF-8: label, hint, error, value and placeholder are 4.5:1', async () => {
        const page = await open(mode);
        await expectTexts(page);
        await page.context().close();
      });

      it('the error of a disabled field keeps 4.5:1: the opacity dims only the control', async () => {
        const page = await open(mode);
        for (const id of ['in-disabled', 'ta-disabled']) {
          const error = await page.locator(`#${id}-error`).evaluate((el) => {
            let opacity = 1;
            for (let n: Element | null = el; n; n = n.parentElement) opacity *= +getComputedStyle(n).opacity;
            return { fg: getComputedStyle(el).color, opacity };
          });
          expect(error.opacity, id).toBe(1);
          const p = await paint(page, id);
          expect(+p.opacity, id).toBeLessThan(1);
          expect(contrastRatio(parseRgb(error.fg), parseRgb(p.surface)), id).toBeGreaterThanOrEqual(4.5);
        }
        await page.context().close();
      });

      it('the focus ring is 3:1 against the halo around it', async () => {
        const page = await open(mode);
        // Input by Tab, Textarea by focus(): a text control always matches :focus-visible.
        await page.keyboard.press('Tab');
        for (const id of ['in-sm', 'ta-sm']) {
          if (id === 'ta-sm') await page.locator('#ta-sm').focus();
          const ring = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const s = getComputedStyle(el);
            return { id: el.id, color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, surface: getComputedStyle(document.body).backgroundColor };
          });
          expect(ring.id).toBe(id);
          expect(ring.style, id).not.toBe('none');
          expect(ring.width, id).toBeGreaterThanOrEqual(2);
          expect(contrastRatio(parseRgb(ring.color), parseRgb(ring.surface)), id).toBeGreaterThanOrEqual(3);
        }
        await page.context().close();
      });
    });
  }

  const cbSizes = ['sm', 'md', 'lg'];
  /** What a Checkbox paints: its square, its mark, and the surface under it (the field's own). */
  const cb = (page: Page, id: string) =>
    page.locator(`#${id}`).evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopColor, bg: s.backgroundColor, mark: getComputedStyle(el, '::before').backgroundColor, scale: getComputedStyle(el, '::before').transform, markWidth: parseFloat(getComputedStyle(el, '::before').width), surface: getComputedStyle(el.closest('.museum-field')!).backgroundColor };
    });

  for (const mode of modes) {
    describe(`Checkbox, ${mode.name}`, () => {
      it('RF-7: the border of the unchecked square is 3:1 against the surface, at rest and in error', async () => {
        const page = await open(mode);
        for (const id of ['cb-md', 'cb-error', 'cb-disabled']) {
          const p = await cb(page, id);
          expect(contrastRatio(parseRgb(p.border), parseRgb(p.surface)), id).toBeGreaterThanOrEqual(3);
        }
        // In error the border is the error colour, not the resting one.
        const [rest, error] = [await cb(page, 'cb-md'), await cb(page, 'cb-error')];
        expect(error.border).not.toBe(rest.border);
        await page.context().close();
      });

      it('RF-8: the mark is 3:1 against the checked square, and the square against the surface', async () => {
        const page = await open(mode);
        for (const id of ['cb-sm-checked', 'cb-md-checked', 'cb-lg-checked', 'cb-error-checked', 'cb-disabled-checked']) {
          const p = await cb(page, id);
          expect(contrastRatio(parseRgb(p.mark), parseRgb(p.bg)), `${id} mark`).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(parseRgb(p.bg), parseRgb(p.surface)), `${id} square`).toBeGreaterThanOrEqual(3);
          expect(p.scale, `${id} mark is shown`).toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(p.markWidth, `${id} mark has a size`).toBeGreaterThanOrEqual(8);
        }
        // Unchecked, the mark is scaled away.
        expect((await cb(page, 'cb-md')).scale).toBe('matrix(0, 0, 0, 0, 0, 0)');
        await page.context().close();
      });

      it('RF-9: the label, hint and error of every Checkbox (also the disabled with error) keep 4.5:1', async () => {
        const page = await open(mode);
        const texts = await visibleTexts(page);
        const rated = texts.filter((t) => /Small|Medium|Large|Error|Disabled|Hint|very long/.test(t.text)).map((t) => ({ text: t.text, ratio: contrastRatio(parseRgb(t.fg), parseRgb(t.bg)) }));
        expect(rated.length).toBeGreaterThan(15);
        expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
        await page.context().close();
      });

      it('RF-10: control and label together measure at least 24 x 24 px in every size', async () => {
        const page = await open(mode);
        for (const id of ['cb-sm', 'cb-md', 'cb-lg', 'cb-sm-checked', 'cb-lg-checked']) {
          const box = await page.evaluate((i) => {
            const a = document.getElementById(i)!.getBoundingClientRect();
            const b = document.querySelector(`label[for="${i}"]`)!.getBoundingClientRect();
            return { w: Math.max(a.right, b.right) - Math.min(a.left, b.left), h: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top) };
          }, id);
          expect(box.w, id).toBeGreaterThanOrEqual(24);
          expect(box.h, id).toBeGreaterThanOrEqual(24);
        }
        await page.context().close();
      });

      it('RF-11: the focus ring is 3:1 around the square, and in error the border stays the error one', async () => {
        const page = await open(mode);
        await page.keyboard.press('Tab');
        for (const id of ['cb-md', 'cb-error', 'cb-error-checked']) {
          await page.locator(`#${id}`).focus();
          const ring = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const s = getComputedStyle(el);
            return { id: el.id, visible: el.matches(':focus-visible'), color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset), border: s.borderTopColor, surface: getComputedStyle(el.closest('.museum-field')!).backgroundColor };
          });
          expect(ring.id).toBe(id);
          expect(ring.visible, id).toBe(true);
          expect(ring.style, id).not.toBe('none');
          expect(ring.width, id).toBeGreaterThanOrEqual(2);
          expect(ring.offset, id).toBeGreaterThan(0);
          expect(contrastRatio(parseRgb(ring.color), parseRgb(ring.surface)), id).toBeGreaterThanOrEqual(3);
          if (id.startsWith('cb-error')) {
            const error = await page.locator('#cb-error-error').evaluate((el) => getComputedStyle(el).color);
            expect(ring.border, id).toBe(error);
          }
        }
        await page.context().close();
      });

      it('a long label breaks on the right of the square, which sits on its first line, with no overflow', async () => {
        const page = await open(mode, 800);
        const box = await page.evaluate(() => {
          const field = document.getElementById('long-field-cb')!;
          const input = document.getElementById('cb-long')!.getBoundingClientRect();
          const labelEl = document.querySelector('label[for="cb-long"]')!;
          const label = labelEl.getBoundingClientRect();
          return { field: field.getBoundingClientRect().width, scroll: field.scrollWidth, height: label.height, line: parseFloat(getComputedStyle(labelEl).lineHeight), top: input.top - label.top, h: input.height };
        });
        expect(box.field).toBe(320);
        expect(box.scroll).toBeLessThanOrEqual(320);
        expect(box.height).toBeGreaterThan(box.line * 1.5);
        // The square is centred on the first line.
        expect(box.top + box.h / 2).toBeCloseTo(box.line / 2, 0);
        await page.context().close();
      });
    });
  }

  it('RF-13: with forced colors, the checked square and the unchecked one differ, and the mark differs from its square', async () => {
    for (const mode of [modes[0], modes[3]]) {
      const page = await (await browser.newContext({ colorScheme: mode.scheme, forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
      await page.setContent(html);
      if (mode.attribute) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), mode.attribute);
      for (const size of cbSizes) {
        const off = await cb(page, `cb-${size}`);
        const on = await cb(page, `cb-${size}-checked`);
        expect(on.bg, `${size} checked vs unchecked fill`).not.toBe(off.bg);
        expect(on.mark, `${size} mark vs its square`).not.toBe(on.bg);
        expect(on.scale, `${size} mark shown`).toBe('matrix(1, 0, 0, 1, 0, 0)');
        expect(off.border, `${size} border vs the canvas`).not.toBe(off.bg);
      }
      await page.context().close();
    }
  });

  // Forced colours light and dark, each under data-theme light and dark: the theme's tokens must not leak in.
  it('RF-13: with forced colors, every square border is 3:1 against what surrounds it, and an unchecked one against its own fill, the error ones included', async () => {
    const report: Record<string, number>[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      for (const theme of ['light', 'dark']) {
        const page = await (await browser.newContext({ colorScheme: scheme, forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
        await page.setContent(html);
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        for (const id of ['cb-md', 'cb-error', 'cb-md-checked', 'cb-error-checked']) {
          const box = await cb(page, id);
          const around = contrastRatio(parseRgb(box.border), parseRgb(box.surface));
          // A checked square is filled with its border's colour, so only the unchecked one has a fill to stand out from.
          const own = id.endsWith('-checked') ? Infinity : contrastRatio(parseRgb(box.border), parseRgb(box.bg));
          report.push({ [`${scheme}/${theme} ${id} around`]: +around.toFixed(2), [`${scheme}/${theme} ${id} own`]: +own.toFixed(2) });
        }
        await page.context().close();
      }
    }
    console.log('RF-13 forced borders', JSON.stringify(report));
    const low = report.flatMap((r) => Object.entries(r)).filter(([, ratio]) => ratio < 3);
    expect(low, JSON.stringify(report)).toEqual([]);
  });

  /** What a radio paints: its circle, its dot, and the surface under it (the group's own). */
  const rd = (page: Page, id: string) =>
    page.locator(`#${id}`).evaluate((el) => {
      const s = getComputedStyle(el);
      const dot = getComputedStyle(el, '::before');
      return { border: s.borderTopColor, bg: s.backgroundColor, dot: dot.backgroundColor, scale: dot.transform, dotWidth: parseFloat(dot.width), radius: s.borderTopLeftRadius, surface: getComputedStyle(el.closest('.museum-field')!).backgroundColor };
    });

  for (const mode of modes) {
    describe(`RadioGroup, ${mode.name}`, () => {
      it('RF-10: the circle border is 3:1 against the surface, at rest and in error, and in error it is the error one', async () => {
        const page = await open(mode);
        for (const id of ['rg-md-0', 'rg-error-0', 'rg-disabled-0']) {
          const p = await rd(page, id);
          expect(contrastRatio(parseRgb(p.border), parseRgb(p.surface)), id).toBeGreaterThanOrEqual(3);
          expect(p.radius, id).toBe('50%');
        }
        const [rest, error] = [await rd(page, 'rg-md-0'), await rd(page, 'rg-error-0')];
        expect(error.border).not.toBe(rest.border);
        expect(error.border).toBe(await page.locator('#rg-error-error').evaluate((el) => getComputedStyle(el).color));
        await page.context().close();
      });

      it('RF-11: the dot is 3:1 against the checked circle, and the circle against the surface', async () => {
        const page = await open(mode);
        for (const id of ['rg-sm-1', 'rg-md-1', 'rg-lg-1', 'rg-error-1', 'rg-disabled-1']) {
          const p = await rd(page, id);
          expect(contrastRatio(parseRgb(p.dot), parseRgb(p.bg)), `${id} dot`).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(parseRgb(p.bg), parseRgb(p.surface)), `${id} circle`).toBeGreaterThanOrEqual(3);
          expect(p.scale, `${id} dot is shown`).toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(p.dotWidth, `${id} dot has a size`).toBeGreaterThanOrEqual(4);
        }
        // Unchecked, the dot is scaled away.
        expect((await rd(page, 'rg-md-0')).scale).toBe('matrix(0, 0, 0, 0, 0, 0)');
        await page.context().close();
      });

      it('RF-12: legend, labels, hint and error of every group (also the disabled with error) keep 4.5:1', async () => {
        const page = await open(mode);
        const texts = await visibleTexts(page);
        const rated = texts.filter((t) => /Radio|Option|very long/.test(t.text)).map((t) => ({ text: t.text, ratio: contrastRatio(parseRgb(t.fg), parseRgb(t.bg)) }));
        expect(rated.length).toBeGreaterThan(15);
        expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
        await page.context().close();
      });

      it('RF-13: circle and label together measure at least 24 x 24 px in every size', async () => {
        const page = await open(mode);
        for (const id of ['rg-sm-0', 'rg-sm-1', 'rg-md-0', 'rg-lg-0', 'rg-lg-1']) {
          const box = await page.evaluate((i) => {
            const a = document.getElementById(i)!.getBoundingClientRect();
            const b = document.querySelector(`label[for="${i}"]`)!.getBoundingClientRect();
            return { w: Math.max(a.right, b.right) - Math.min(a.left, b.left), h: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top) };
          }, id);
          expect(box.w, id).toBeGreaterThanOrEqual(24);
          expect(box.h, id).toBeGreaterThanOrEqual(24);
        }
        await page.context().close();
      });

      it('RF-14: the focus ring is 3:1 around the circle, and in error the border stays the error one', async () => {
        const page = await open(mode);
        await page.keyboard.press('Tab');
        for (const id of ['rg-md-0', 'rg-error-0', 'rg-error-1']) {
          await page.locator(`#${id}`).focus();
          const ring = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const s = getComputedStyle(el);
            return { id: el.id, visible: el.matches(':focus-visible'), color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset), border: s.borderTopColor, surface: getComputedStyle(el.closest('.museum-field')!).backgroundColor };
          });
          expect(ring.id).toBe(id);
          expect(ring.visible, id).toBe(true);
          expect(ring.style, id).not.toBe('none');
          expect(ring.width, id).toBeGreaterThanOrEqual(2);
          expect(ring.offset, id).toBeGreaterThan(0);
          expect(contrastRatio(parseRgb(ring.color), parseRgb(ring.surface)), id).toBeGreaterThanOrEqual(3);
          if (id.startsWith('rg-error')) {
            const error = await page.locator('#rg-error-error').evaluate((el) => getComputedStyle(el).color);
            expect(ring.border, id).toBe(error);
          }
        }
        await page.context().close();
      });

      it('a long label breaks on the right of the circle, which sits on its first line, with no overflow', async () => {
        const page = await open(mode, 800);
        const box = await page.evaluate(() => {
          const field = document.getElementById('long-field-rg')!;
          const input = document.getElementById('rg-long-0')!.getBoundingClientRect();
          const labelEl = document.querySelector('label[for="rg-long-0"]')!;
          const label = labelEl.getBoundingClientRect();
          return { field: field.getBoundingClientRect().width, scroll: field.scrollWidth, height: label.height, line: parseFloat(getComputedStyle(labelEl).lineHeight), top: input.top - label.top, h: input.height };
        });
        expect(box.field).toBe(320);
        expect(box.scroll).toBeLessThanOrEqual(320);
        expect(box.height).toBeGreaterThan(box.line * 1.5);
        expect(box.top + box.h / 2).toBeCloseTo(box.line / 2, 0);
        await page.context().close();
      });
    });
  }

  it('RF-14: with focus, the ring box of the circle leaves at least 2 px before its label, in every size (the Checkbox gap is the same)', async () => {
    const page = await open(modes[2]);
    await page.keyboard.press('Tab');
    for (const id of ['rg-sm-0', 'rg-md-0', 'rg-lg-0', 'cb-md']) {
      await page.locator(`#${id}`).focus();
      const gap = await page.evaluate((i) => {
        const el = document.getElementById(i)!;
        const s = getComputedStyle(el);
        const reach = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        return { visible: el.matches(':focus-visible'), gap: document.querySelector(`label[for="${i}"]`)!.getBoundingClientRect().left - (el.getBoundingClientRect().right + reach) };
      }, id);
      expect(gap.visible, id).toBe(true);
      expect(gap.gap, id).toBeGreaterThanOrEqual(2);
    }
    await page.context().close();
  });

  it('the options of a group stack in a column, and the legend sits above them', async () => {
    const page = await open(modes[2]);
    const pos = await page.evaluate(() => {
      const top = (e: Element) => e.getBoundingClientRect().top;
      const g = document.getElementById('rg-md')!;
      return { legend: top(g.querySelector('legend')!), a: top(document.getElementById('rg-md-0')!), b: top(document.getElementById('rg-md-1')!), hint: top(document.getElementById('rg-md-hint')!), border: getComputedStyle(g).borderTopWidth };
    });
    expect(pos.border).toBe('0px');
    expect(pos.legend).toBeLessThan(pos.a);
    expect(pos.a).toBeLessThan(pos.b);
    expect(pos.b).toBeLessThan(pos.hint);
    await page.context().close();
  });

  it('RF-15: with forced colors, the checked circle and the unchecked one differ, the dot differs from its circle, also in error', async () => {
    for (const mode of [modes[0], modes[3]]) {
      const page = await (await browser.newContext({ colorScheme: mode.scheme, forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
      await page.setContent(html);
      if (mode.attribute) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), mode.attribute);
      for (const group of ['rg-sm', 'rg-md', 'rg-lg', 'rg-error']) {
        const off = await rd(page, `${group}-0`);
        const on = await rd(page, `${group}-1`);
        expect(on.bg, `${group} checked vs unchecked fill`).not.toBe(off.bg);
        expect(on.dot, `${group} dot vs its circle`).not.toBe(on.bg);
        expect(on.scale, `${group} dot shown`).toBe('matrix(1, 0, 0, 1, 0, 0)');
        expect(off.border, `${group} border vs the canvas`).not.toBe(off.bg);
      }
      await page.context().close();
    }
  });

  it('RF-15: with forced colors, every circle border is 3:1 against what surrounds it, and an unchecked one against its own fill, the error ones included', async () => {
    const report: Record<string, number>[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      for (const theme of ['light', 'dark']) {
        const page = await (await browser.newContext({ colorScheme: scheme, forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
        await page.setContent(html);
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        for (const id of ['rg-md-0', 'rg-error-0', 'rg-md-1', 'rg-error-1']) {
          const box = await rd(page, id);
          const around = contrastRatio(parseRgb(box.border), parseRgb(box.surface));
          const own = id.endsWith('-1') ? Infinity : contrastRatio(parseRgb(box.border), parseRgb(box.bg));
          report.push({ [`${scheme}/${theme} ${id} around`]: +around.toFixed(2), [`${scheme}/${theme} ${id} own`]: +own.toFixed(2) });
        }
        await page.context().close();
      }
    }
    console.log('RF-15 forced borders', JSON.stringify(report));
    const low = report.flatMap((r) => Object.entries(r)).filter(([, ratio]) => ratio < 3);
    expect(low, JSON.stringify(report)).toEqual([]);
  });

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

  it('RF-9: Textarea has the same font, border, radius, padding and colors as the Input of its size', async () => {
    const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderTopLeftRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'color', 'backgroundColor', 'boxSizing'] as const;
    const pairs = [...sizes.map((s) => [`in-${s}`, `ta-${s}`]), ['in-error', 'ta-error'], ['in-disabled', 'ta-disabled']];
    for (const mode of modes) {
      const page = await open(mode);
      for (const [input, textarea] of pairs) {
        const [a, b] = await page.evaluate(({ list, ids }) => ids.map((id) => {
          const s = getComputedStyle(document.getElementById(id)!);
          return { ...Object.fromEntries(list.map((p) => [p, s[p as keyof CSSStyleDeclaration]])), opacity: s.opacity };
        }), { list: [...props], ids: [input, textarea] });
        expect(b, `${mode.name}, ${textarea}`).toEqual(a);
      }
      await page.context().close();
    }
  });

  it('RF-10: the Textarea resizes only vertically', async () => {
    const page = await open(modes[2]);
    const resize = await page.evaluate((ids) => ids.map((id) => getComputedStyle(document.getElementById(id)!).resize), sizes.map((s) => `ta-${s}`));
    expect(resize).toEqual(['vertical', 'vertical', 'vertical']);
    await page.context().close();
  });

  it('a 600 px error with no spaces does not widen a 320 px Textarea field', async () => {
    const page = await open(modes[2], 800);
    const box = await page.evaluate(() => {
      const field = document.getElementById('long-field-ta')!;
      const s = getComputedStyle(field);
      const content = field.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      return { field: field.getBoundingClientRect().width, content, control: document.getElementById('ta-long')!.getBoundingClientRect().width, scroll: field.scrollWidth };
    });
    expect(box.field).toBe(320);
    expect(box.control).toBe(box.content);
    expect(box.scroll).toBeLessThanOrEqual(320);
    await page.context().close();
  });

  // Spec 014: Select, on the same fixed page.
  /** What a Select paints: border, chosen text, own background, the arrow's colors, the surface under it, and its height. */
  const sel = (page: Page, id: string) =>
    page.locator(`#${id}`).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        border: s.borderTopColor, fg: s.color, bg: s.backgroundColor, arrow: s.backgroundImage.match(/rgb\([^)]*\)/g) ?? [],
        surface: getComputedStyle(el.closest('.museum-field') ?? document.body).backgroundColor, height: el.getBoundingClientRect().height,
      };
    });
  const worst = (ratios: number[]) => +Math.min(...ratios).toFixed(2);

  for (const mode of modes) {
    describe(`Select, ${mode.name}`, () => {
      it('RF-10: the border is 3:1 against the surface and the control background, at rest and in error', async () => {
        const page = await open(mode);
        const ratios: number[] = [];
        for (const id of ['sel-md', 'sel-error']) {
          const p = await sel(page, id);
          ratios.push(contrastRatio(parseRgb(p.border), parseRgb(p.surface)), contrastRatio(parseRgb(p.border), parseRgb(p.bg)));
        }
        console.log('SELECT RF-10', mode.name, worst(ratios));
        expect(worst(ratios)).toBeGreaterThanOrEqual(3);
        await page.context().close();
      });

      it('RF-11: the arrow is drawn in one color, 3:1 against the control background, in every size and in error', async () => {
        const page = await open(mode);
        const ratios: number[] = [];
        for (const id of ['sel-sm', 'sel-md', 'sel-lg', 'sel-error']) {
          const p = await sel(page, id);
          expect(p.arrow.length, id).toBe(2);
          expect(new Set(p.arrow).size, id).toBe(1);
          ratios.push(contrastRatio(parseRgb(p.arrow[0] ?? ''), parseRgb(p.bg)));
        }
        console.log('SELECT RF-11', mode.name, worst(ratios));
        expect(worst(ratios)).toBeGreaterThanOrEqual(3);
        await page.context().close();
      });

      it('RF-12: label, chosen text, indication, hint and error are 4.5:1, also the error of the disabled one', async () => {
        const page = await open(mode);
        const ratios = (await visibleTexts(page)).map((t) => contrastRatio(parseRgb(t.fg), parseRgb(t.bg)));
        // A select shows its chosen option as part of the control, so it is measured apart.
        for (const id of ['sel-md', 'sel-placeholder', 'sel-error']) {
          const p = await sel(page, id);
          ratios.push(contrastRatio(parseRgb(p.fg), parseRgb(p.bg)));
        }
        // The indication is the placeholder color of Input, not the chosen-text one.
        expect((await sel(page, 'sel-placeholder')).fg).toBe((await paint(page, 'in-placeholder')).placeholder);
        const error = await page.locator('#sel-disabled-error').evaluate((el) => {
          let opacity = 1;
          for (let n: Element | null = el; n; n = n.parentElement) opacity *= +getComputedStyle(n).opacity;
          return { fg: getComputedStyle(el).color, opacity };
        });
        expect(error.opacity).toBe(1);
        ratios.push(contrastRatio(parseRgb(error.fg), parseRgb((await sel(page, 'sel-disabled')).surface)));
        console.log('SELECT RF-12', mode.name, worst(ratios));
        expect(worst(ratios)).toBeGreaterThanOrEqual(4.5);
        await page.context().close();
      });

      it('the open list: options paint the control colors, a disabled one reads as placeholder, an empty-value one is normal', async () => {
        const page = await open(mode);
        const r = await page.evaluate(() => {
          const c = (q: string) => { const s = getComputedStyle(document.querySelector(q)!); return { fg: s.color, bg: s.backgroundColor }; };
          return { select: c('#sel-empty'), normal: c('#sel-md'), on: c('#sel-empty option[value="a"]'), off: c('#sel-empty option:disabled'), empty: c('#sel-empty option[value=""]') };
        });
        expect(r.on.bg).not.toBe('rgba(0, 0, 0, 0)');
        expect(r.on.bg).toBe(r.select.bg);
        expect(r.on.fg).toBe(r.select.fg);
        expect(r.off.fg).not.toBe(r.on.fg);
        expect(r.off.bg).toBe(r.select.bg);
        expect(r.select.fg).toBe(r.normal.fg);
        expect(r.empty.fg).toBe(r.normal.fg);
        const ratio = contrastRatio(parseRgb(r.off.fg), parseRgb(r.off.bg));
        console.log('SELECT option:disabled', mode.name, +ratio.toFixed(2), 'active', +contrastRatio(parseRgb(r.on.fg), parseRgb(r.on.bg)).toFixed(2));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        await page.context().close();
      });

      it('RF-14: the focus ring is 3:1 around the control, and in error the border stays the error one and the ring stands off it', async () => {
        const page = await open(mode);
        const ratios: number[] = [];
        for (const id of ['sel-md', 'sel-error']) {
          await page.keyboard.press('Tab');
          await page.locator(`#${id}`).focus();
          const ring = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const s = getComputedStyle(el);
            const error = el.closest('.museum-field')!.querySelector('.museum-field__error');
            return { id: el.id, color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset), border: s.borderTopColor, error: error ? getComputedStyle(error).color : '', surface: getComputedStyle(document.body).backgroundColor };
          });
          expect(ring.id).toBe(id);
          expect(ring.style, id).not.toBe('none');
          expect(ring.width, id).toBeGreaterThanOrEqual(2);
          ratios.push(contrastRatio(parseRgb(ring.color), parseRgb(ring.surface)));
          if (id === 'sel-error') {
            expect(ring.border).toBe(ring.error);
            expect(ring.offset).toBeGreaterThan(0);
          }
        }
        console.log('SELECT RF-14', mode.name, worst(ratios));
        expect(worst(ratios)).toBeGreaterThanOrEqual(3);
        await page.context().close();
      });
    });
  }

  it('RF-13: Select and Input of the same size are the same height, and at least 24 px', async () => {
    for (const mode of modes) {
      const page = await open(mode);
      for (const size of sizes) {
        const s = (await sel(page, `sel-${size}`)).height;
        const i = await page.locator(`#in-${size}`).evaluate((el) => el.getBoundingClientRect().height);
        expect(+s.toFixed(2), `${mode.name}, ${size}`).toBe(+i.toFixed(2));
        expect(s, size).toBeGreaterThanOrEqual(24);
      }
      await page.context().close();
    }
  });

  it('RF-15: with forced colors, the border and the arrow differ from the background, also in error', async () => {
    const report: Record<string, number>[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      for (const theme of ['light', 'dark']) {
        const page = await (await browser.newContext({ colorScheme: scheme, forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
        await page.setContent(html);
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        for (const id of ['sel-md', 'sel-error']) {
          const p = await sel(page, id);
          expect(p.arrow.length, id).toBe(2);
          report.push({
            [`${scheme}/${theme} ${id} border`]: +contrastRatio(parseRgb(p.border), parseRgb(p.surface)).toFixed(2),
            [`${scheme}/${theme} ${id} arrow`]: +contrastRatio(parseRgb(p.arrow[0] ?? ''), parseRgb(p.bg)).toFixed(2),
          });
        }
        await page.context().close();
      }
    }
    console.log('SELECT RF-15 forced', JSON.stringify(report));
    expect(report.flatMap((r) => Object.entries(r)).filter(([, ratio]) => ratio < 3), JSON.stringify(report)).toEqual([]);
  });

  it('forced colors: a disabled option is GrayText, an active one CanvasText', async () => {
    const page = await (await browser.newContext({ forcedColors: 'active', viewport: { width: 1024, height: 900 } })).newPage();
    await page.setContent(html);
    const r = await page.evaluate(() => {
      const probe = (v: string) => { const d = document.createElement('i'); d.style.color = v; document.body.append(d); return getComputedStyle(d).color; };
      const fg = (q: string) => getComputedStyle(document.querySelector(q)!).color;
      return { off: fg('#sel-empty option:disabled'), on: fg('#sel-empty option[value="a"]'), gray: probe('GrayText'), text: probe('CanvasText') };
    });
    expect(r.off).toBe(r.gray);
    expect(r.on).toBe(r.text);
    await page.context().close();
  });

  it('a 200-character option does not widen a 320 px Select field', async () => {
    const page = await open(modes[2], 800);
    const box = await page.evaluate(() => {
      const field = document.getElementById('long-field-sel')!;
      const s = getComputedStyle(field);
      const content = field.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      return { field: field.getBoundingClientRect().width, content, control: document.getElementById('sel-long')!.getBoundingClientRect().width, scroll: field.scrollWidth, ellipsis: getComputedStyle(document.getElementById('sel-long')!).textOverflow };
    });
    expect(box.field).toBe(320);
    expect(box.control).toBe(box.content);
    expect(box.scroll).toBeLessThanOrEqual(320);
    expect(box.ellipsis).toBe('ellipsis');
    await page.context().close();
  });
});
