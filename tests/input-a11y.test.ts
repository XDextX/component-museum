import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { visibleTexts } from './lib/contrast.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import type { Framework } from './lib/paths.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 009 T-6: Input as a consumer gets it, built from the packed package, in real Edge (RF-2 to RF-9
// and the focus rules). The instances come from tests/lib/consumer.ts.
const consumers = inject('consumers');
const frameworks: Framework[] = ['react', 'astro'];
const themes = ['light', 'dark'] as const;
const sizes = ['sm', 'md', 'lg'];

/** A control by its own id, or by `name` for the twins, which get generated ids. */
const sel = (key: string) => (key.startsWith('twins-') ? `input[name="${key}"]` : `#${key}`);
const labelOf: Record<string, string> = {
  'input-sm': 'Size sm', 'input-md': 'Size md', 'input-lg': 'Size lg', 'input-hint': 'With hint', 'input-error': 'With error',
  'input-both': 'With both', 'input-required': 'Required field', 'input-disabled': 'Disabled field', 'input-own': 'Own wiring',
};
const enabled = ['input-sm', 'input-md', 'input-lg', 'input-hint', 'input-error', 'input-both', 'input-required', 'input-own', 'twins-a', 'twins-b'];
const withError = ['input-error', 'input-both', 'input-disabled'];
const withoutError = enabled.filter((k) => !withError.includes(k));
const fieldTexts = new Set([...Object.values(labelOf), 'Twin', 'Hint text', 'Error text', 'Disabled error', 'Own hint', '*']);

type AxNode = { name: string; description: string; invalid: string | undefined; required: boolean };

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
});
afterAll(() => closeBrowserAndServers(browser, []));

describe.each(frameworks)('Input in the %s consumer, built (constitution 7)', (framework) => {
  let server: Served;
  beforeAll(async () => {
    server = await serve(join(consumers.plain[framework], 'dist'));
  });
  afterAll(() => server.close());

  describe.each(themes)('%s', (theme) => {
    let context: BrowserContext;
    let page: Page;
    let cdp: CDPSession;
    /** The sheet's own ground (--museum-surface) and whether the consumer's page paints any background of its own. */
    let ground: { surface: string; painted: boolean };
    beforeAll(async () => {
      context = await browser.newContext({ colorScheme: theme, viewport: { width: 1024, height: 900 } });
      page = await context.newPage();
      cdp = await context.newCDPSession(page);
      await page.goto(server.url);
      await page.waitForSelector('#input-md');
      // An unpainted page under a dark theme is the browser's white canvas, a page the consumer never styled
      // (the Astro minimal starter): the field is then measured on the sheet's own ground, as Button's ring is.
      ground = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'var(--museum-surface)';
        document.body.append(probe);
        const surface = getComputedStyle(probe).backgroundColor;
        probe.remove();
        let painted = false;
        for (let n: Element | null = document.getElementById('input-md')!.parentElement; n; n = n.parentElement) {
          if (!['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(n).backgroundColor)) painted = true;
        }
        return { surface, painted };
      });
    }, 60_000);
    afterAll(() => context.close());

    /** What the browser's accessibility tree says about the control: name, description, invalid, required. */
    async function ax(key: string): Promise<AxNode> {
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel(key) });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const props = Object.fromEntries((nodes[0].properties ?? []).map((p) => [p.name, p.value.value]));
      return { name: nodes[0].name?.value ?? '', description: nodes[0].description?.value ?? '', invalid: props.invalid, required: props.required === true };
    }
    const activeKey = () => page.evaluate(() => (document.activeElement as HTMLInputElement).name || (document.activeElement as HTMLInputElement).id);

    it('RF-2: each label finds its control and pressing it focuses it, twins included', { timeout: 60_000 }, async () => {
      for (const [key, label] of Object.entries(labelOf)) {
        const found = page.getByLabel(label);
        expect(await found.count(), `${key} found by its label`).toBe(1);
        expect(await found.evaluate((el) => el.id), key).toBe(key);
        expect((await ax(key)).name, `${key} accessible name`).toBe(label);
        if (key === 'input-disabled') continue; // a disabled control cannot take the focus
        await page.locator('label', { hasText: new RegExp(`^${label}\\*?$`) }).click();
        expect(await activeKey(), `${key} focused from its label`).toBe(key);
      }
      // Two fields with the same label: each label focuses its own control and the ids differ.
      expect(await page.getByLabel('Twin').count()).toBe(2);
      const twins = page.locator('label', { hasText: /^Twin$/ });
      const ids = [];
      for (const [i, key] of ['twins-a', 'twins-b'].entries()) {
        ids.push(await twins.nth(i).getAttribute('for'));
        await twins.nth(i).click();
        expect(await activeKey(), `${key} focused from its own label`).toBe(key);
        expect((await ax(key)).name).toBe('Twin');
      }
      expect(new Set(ids).size, 'twin ids').toBe(2);
      console.log(`${framework} ${theme} RF-2`, JSON.stringify({ labelled: Object.keys(labelOf).length, twinIds: ids }));
    });

    it('RF-3 and RF-4: the description holds the hint and the error, the error first, and the control is invalid', async () => {
      expect((await ax('input-hint')).description).toBe('Hint text');
      const both = await ax('input-both');
      expect(both.description).toBe('Error text Hint text');
      expect(both.description.indexOf('Error text')).toBeLessThan(both.description.indexOf('Hint text'));
      for (const [key, text] of [['input-error', 'Error text'], ['input-both', 'Error text'], ['input-disabled', 'Disabled error']]) {
        const node = await ax(key);
        expect(await page.locator(sel(key)).getAttribute('aria-invalid'), `${key} attribute`).toBe('true');
        expect(node.invalid, `${key} invalid in the accessibility tree`).toBe('true');
        expect(node.description, key).toContain(text);
      }
      // The consumer's own aria-describedby adds to the component's, and its id stays the control's.
      const own = await ax('input-own');
      expect(own.description).toBe('Own hint Own note');
      console.log(`${framework} ${theme} RF-3/4`, JSON.stringify({ both: both.description, own: own.description }));
    });

    it('RF-5: without an error there is no aria-invalid and no error text', async () => {
      for (const key of withoutError) {
        expect(await page.locator(sel(key)).getAttribute('aria-invalid'), `${key} aria-invalid`).toBeNull();
        expect([undefined, 'false'], `${key} invalid in the accessibility tree`).toContain((await ax(key)).invalid);
        expect(await page.locator(sel(key)).evaluate((el) => el.closest('.museum-field')!.querySelectorAll('.museum-field__error').length), `${key} error nodes`).toBe(0);
      }
    });

    it('RF-6: required marks the control and shows a marker in the label; the rest show none', async () => {
      expect((await ax('input-required')).required).toBe(true);
      expect(await page.locator('#input-required').evaluate((el: HTMLInputElement) => el.required)).toBe(true);
      const marker = page.locator('label[for="input-required"] .museum-field__required');
      expect(await marker.textContent()).toBe('*');
      expect(await marker.isVisible()).toBe(true);
      expect(await marker.getAttribute('aria-hidden')).toBe('true');
      for (const key of enabled.filter((k) => k !== 'input-required')) {
        expect((await ax(key)).required, `${key} required`).toBe(false);
        expect(await page.locator(sel(key)).evaluate((el) => el.closest('.museum-field')!.querySelectorAll('.museum-field__required').length), `${key} marker`).toBe(0);
      }
    });

    it('RF-7: the control border is 3:1 against the page and its own background, at rest and in error', async () => {
      const rows = await page.evaluate(({ keys, surface, painted }) => {
        type C = [number, number, number, number];
        const parse = (c: string): C => {
          const m = /rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(c)!;
          return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
        };
        const over = (top: C, under: C): C => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as C;
        const rgb = (c: C) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;
        // What really lies under `node`: the first opaque background up the tree, else the canvas.
        const ground = (node: Element | null): C => {
          const layers: C[] = [];
          for (; node; node = node.parentElement) {
            const c = parse(getComputedStyle(node).backgroundColor);
            if (c[3] === 0) continue;
            layers.push(c);
            if (c[3] === 1) break;
          }
          return layers.reduceRight<C>((under, top) => over(top, under), painted ? [255, 255, 255, 1] : parse(surface));
        };
        return keys.map((key) => {
          const el = document.querySelector<HTMLElement>(key.startsWith('twins-') ? `input[name="${key}"]` : `#${key}`)!;
          const s = getComputedStyle(el);
          const page = ground(el.parentElement);
          return { key, border: s.borderTopColor, page: rgb(page), own: rgb(over(parse(s.backgroundColor), page)), width: parseFloat(s.borderTopWidth) };
        });
      }, { keys: [...enabled, 'input-disabled'], ...ground });
      const report = rows.map((r) => ({
        key: r.key, page: Number(contrastRatio(parseRgb(r.border), parseRgb(r.page)).toFixed(2)), own: Number(contrastRatio(parseRgb(r.border), parseRgb(r.own)).toFixed(2)), width: r.width,
      }));
      console.log(`${framework} ${theme} RF-7`, JSON.stringify(report));
      // A disabled control is exempt from WCAG 1.4.11 (inactive component), so it is listed but not asserted.
      for (const r of report.filter((r) => r.key !== 'input-disabled')) {
        expect(r.page, `${r.key} border on the page`).toBeGreaterThanOrEqual(3);
        expect(r.own, `${r.key} border on its own background`).toBeGreaterThanOrEqual(3);
      }
    });

    it('RF-8: label, hint, error, marker, value and placeholder are 4.5:1, the disabled error included', async () => {
      // visibleTexts composes over white when nothing is painted: swap in the sheet's ground then.
      const texts = (await visibleTexts(page)).filter((t) => fieldTexts.has(t.text)).map((t) => (ground.painted ? t : { ...t, bg: ground.surface }));
      const rated = texts.map((t) => ({ text: t.text, ratio: Number(contrastRatio(parseRgb(t.fg), parseRgb(t.bg)).toFixed(2)) }));
      console.log(`${framework} ${theme} RF-8 texts`, JSON.stringify(rated));
      expect(new Set(texts.map((t) => t.text)), 'every field text was found').toEqual(fieldTexts);
      expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
      // The opacity of a disabled field dims the control only: the error is not dimmed.
      const opacity = await page.locator('#input-disabled-error').evaluate((el) => {
        let o = 1;
        for (let n: Element | null = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
        return o;
      });
      expect(opacity, 'disabled error opacity').toBe(1);
      // Values and placeholders are not text nodes: measured from the control (value on its own background).
      const fields = await page.evaluate((keys) => keys.map((key) => {
        const el = document.getElementById(key)!;
        const s = getComputedStyle(el);
        return { key, value: s.color, placeholder: getComputedStyle(el, '::placeholder').color, bg: s.backgroundColor };
      }), sizes.map((s) => `input-${s}`));
      const values = fields.map((f) => ({
        key: f.key, value: Number(contrastRatio(parseRgb(f.value), parseRgb(f.bg)).toFixed(2)), placeholder: Number(contrastRatio(parseRgb(f.placeholder), parseRgb(f.bg)).toFixed(2)),
      }));
      console.log(`${framework} ${theme} RF-8 value/placeholder`, JSON.stringify(values));
      for (const v of values) {
        expect(v.value, `${v.key} value`).toBeGreaterThanOrEqual(4.5);
        expect(v.placeholder, `${v.key} placeholder`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('RF-9: Input and Button of the same size are the same height', async () => {
      const heights = await page.evaluate((list) => list.map((size) => ({
        size,
        input: document.getElementById(`input-${size}`)!.getBoundingClientRect().height,
        buttons: ['primary', 'secondary', 'outline'].map((v) => document.getElementById(`button-${v}-${size}`)!.getBoundingClientRect().height),
      })), sizes);
      console.log(`${framework} ${theme} RF-9`, JSON.stringify(heights));
      for (const h of heights) expect(h.buttons.map((b) => +b.toFixed(2)), `${h.size} Button heights`).toEqual(h.buttons.map(() => +h.input.toFixed(2)));
    });

    it('focus: Tab reaches every enabled Input with a 3:1 ring of 2px or more, and skips the disabled one', { timeout: 60_000 }, async () => {
      await page.goto(server.url);
      await page.waitForSelector('#input-md');
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const total = await page.locator('button, a, input, select, textarea, [tabindex]').count();
      const reached: Record<string, { ring: number; width: number; style: string; haloIsSurface: boolean }> = {};
      for (let i = 0; i < total + 1; i++) {
        await page.keyboard.press('Tab');
        const m = await page.evaluate(() => {
          const el = document.activeElement as HTMLInputElement | null;
          if (!el || !el.hasAttribute('data-museum-input')) return null;
          const s = getComputedStyle(el);
          // As the Button test does: the ring sits on the halo when the halo reaches past it, else on the page canvas.
          const probe = document.createElement('div');
          probe.style.backgroundColor = 'var(--museum-surface)';
          document.body.append(probe);
          const surface = getComputedStyle(probe).backgroundColor;
          probe.remove();
          const shadow = /^(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/.exec(s.boxShadow);
          const offset = parseFloat(s.outlineOffset);
          let canvas = 'rgb(255, 255, 255)';
          for (let n = el.parentElement; n; n = n.parentElement) {
            const b = getComputedStyle(n).backgroundColor;
            if (b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { canvas = b; break; }
          }
          const past = shadow !== null && parseFloat(shadow[2]) > offset + parseFloat(s.outlineWidth);
          return { key: el.name || el.id, color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle, around: past ? shadow![1] : canvas, haloIsSurface: shadow?.[1] === surface };
        });
        if (m && !(m.key in reached)) {
          reached[m.key] = { ring: contrastRatio(parseRgb(m.color), parseRgb(m.around)), width: m.width, style: m.style, haloIsSurface: m.haloIsSurface };
        }
      }
      const report = Object.entries(reached).map(([key, r]) => ({ key, ...r, ring: Number(r.ring.toFixed(2)) }));
      console.log(`${framework} ${theme} focus`, JSON.stringify(report));
      expect(Object.keys(reached).sort(), 'Tab reached exactly the enabled Inputs').toEqual([...enabled].sort());
      expect(Object.keys(reached)).not.toContain('input-disabled');
      for (const r of report) {
        expect(r.style, `${r.key} outline style`).not.toBe('none');
        expect(r.width, `${r.key} outline width`).toBeGreaterThanOrEqual(2);
        expect(r.ring, `${r.key} ring against what surrounds it`).toBeGreaterThanOrEqual(3);
        expect(r.haloIsSurface, `${r.key} halo is the package surface`).toBe(true);
      }
    });
  });
});
