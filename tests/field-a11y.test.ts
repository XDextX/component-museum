import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { closeBrowserAndServers } from './lib/browser.ts';
import { visibleTexts } from './lib/contrast.ts';
import { contrastRatio, parseRgb } from './lib/css.ts';
import type { Framework } from './lib/paths.ts';
import { serve, type Served } from './lib/serve.ts';

// Spec 009 T-6 and spec 010 T-4: Input and Textarea as a consumer gets them, built from the packed package,
// in real Edge (RF-2 to RF-8, the focus rules, and for Textarea RF-9 to RF-11). The instances come from
// tests/lib/consumer.ts.
const consumers = inject('consumers');
const frameworks: Framework[] = ['react', 'astro'];
const themes = ['light', 'dark'] as const;
const sizes = ['sm', 'md', 'lg'];

type Kind = {
  name: 'Input' | 'Textarea';
  tag: 'input' | 'textarea';
  prefix: string;
  twins: string[];
  /** Every labelled control by id, in page order. */
  labels: (framework: Framework) => Record<string, string>;
  hint: string;
  error: string;
  disabledError: string;
  ownHint: string;
  ownNote: string;
};

const kinds: Kind[] = [
  {
    name: 'Input', tag: 'input', prefix: 'input', twins: ['twins-a', 'twins-b'],
    labels: () => ({
      'input-sm': 'Size sm', 'input-md': 'Size md', 'input-lg': 'Size lg', 'input-hint': 'With hint', 'input-error': 'With error',
      'input-both': 'With both', 'input-required': 'Required field', 'input-disabled': 'Disabled field', 'input-own': 'Own wiring',
    }),
    hint: 'Hint text', error: 'Error text', disabledError: 'Disabled error', ownHint: 'Own hint', ownNote: 'Own note',
  },
  {
    name: 'Textarea', tag: 'textarea', prefix: 'textarea', twins: ['twins-ta-a', 'twins-ta-b'],
    labels: (framework) => ({
      'textarea-sm': 'Area sm', 'textarea-md': 'Area md', 'textarea-lg': 'Area lg', 'textarea-hint': 'Area hint', 'textarea-error': 'Area error',
      'textarea-both': 'Area both', 'textarea-required': 'Area required', 'textarea-disabled': 'Area disabled', 'textarea-own': 'Area own',
      'textarea-escape': 'Area escape', 'textarea-newline': 'Area newline',
      ...(framework === 'react' ? { 'textarea-readonly': 'Area read only' } : {}),
    }),
    hint: 'Area hint text', error: 'Area error text', disabledError: 'Area disabled error', ownHint: 'Area own hint', ownNote: 'Area own note',
  },
];

type AxNode = { name: string; description: string; invalid: string | undefined; required: boolean };

// What really lies under a node: the first opaque background up the tree, else the browser's white canvas
// (a page the consumer never painted, as in the Astro starter, stays white even in dark). Plain JS in a
// string so it can be installed in the page once and used by every measurement.
const GROUND = `(() => {
  const parse = (c) => {
    const m = /rgba?\\(([\\d.]+)[ ,]+([\\d.]+)[ ,]+([\\d.]+)(?:[ ,/]+([\\d.]+))?/.exec(c);
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const rgb = (c) => 'rgb(' + c.slice(0, 3).map(Math.round).join(', ') + ')';
  window.__museum = {
    parse, over, rgb,
    ground(node) {
      const layers = [];
      for (; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c[3] === 0) continue;
        layers.push(c);
        if (c[3] === 1) break;
      }
      return layers.reduceRight((under, top) => over(top, under), [255, 255, 255, 1]);
    },
  };
})()`;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge' });
});
afterAll(() => closeBrowserAndServers(browser, []));

for (const kind of kinds) describe.each(frameworks)(`${kind.name} in the %s consumer, built (constitution 7)`, (framework) => {
  const labelOf = kind.labels(framework);
  const id = (key: string) => `${kind.prefix}-${key}`;
  /** A control by its own id, or by `name` for the twins, which get generated ids. */
  const sel = (key: string) => (key.startsWith('twins-') ? `${kind.tag}[name="${key}"]` : `#${key}`);
  const withError = [id('error'), id('both'), id('disabled')];
  // React's read-only Textarea (a `value` without `onChange`) is still enabled: Tab reaches it.
  const enabled = [...Object.keys(labelOf).filter((k) => k !== id('disabled')), ...kind.twins];
  const withoutError = enabled.filter((k) => !withError.includes(k));
  const fieldTexts = new Set([...Object.values(labelOf), 'Twin', kind.hint, kind.error, kind.disabledError, kind.ownHint, '*']);

  let server: Served;
  beforeAll(async () => {
    server = await serve(join(consumers.plain[framework], 'dist'));
  });
  afterAll(() => server.close());

  describe.each(themes)('%s', (theme) => {
    let context: BrowserContext;
    let page: Page;
    let cdp: CDPSession;
    beforeAll(async () => {
      context = await browser.newContext({ colorScheme: theme, viewport: { width: 1024, height: 900 } });
      page = await context.newPage();
      cdp = await context.newCDPSession(page);
      await page.goto(server.url);
      await page.waitForSelector(`#${id('md')}`);
      await page.evaluate(GROUND);
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
        if (key === id('disabled')) continue; // a disabled control cannot take the focus
        await page.locator('label', { hasText: new RegExp(`^${label}\\*?$`) }).click();
        expect(await activeKey(), `${key} focused from its label`).toBe(key);
      }
      // Two fields with the same label, and the other kind's pair sharing it too: each label focuses its own control and the ids differ.
      const sameKind = page.getByLabel('Twin').and(page.locator(kind.tag));
      expect(await sameKind.count()).toBe(2);
      expect(await page.getByLabel('Twin').count(), 'both kinds share the label').toBe(4);
      const twins = page.locator(`.museum-field:has(${kind.tag}[name^="twins-"]) > label`, { hasText: /^Twin$/ });
      const ids = [];
      for (const [i, key] of kind.twins.entries()) {
        ids.push(await twins.nth(i).getAttribute('for'));
        await twins.nth(i).click();
        expect(await activeKey(), `${key} focused from its own label`).toBe(key);
        expect((await ax(key)).name).toBe('Twin');
      }
      expect(new Set(ids).size, 'twin ids').toBe(2);
      console.log(`${framework} ${theme} RF-2`, JSON.stringify({ labelled: Object.keys(labelOf).length, twinIds: ids }));
    });

    it('RF-3 and RF-4: the description holds the hint and the error, the error first, and the control is invalid', async () => {
      expect((await ax(id('hint'))).description).toBe(kind.hint);
      const both = await ax(id('both'));
      expect(both.description).toBe(`${kind.error} ${kind.hint}`);
      expect(both.description.indexOf(kind.error)).toBeLessThan(both.description.indexOf(kind.hint));
      for (const [key, text] of [[id('error'), kind.error], [id('both'), kind.error], [id('disabled'), kind.disabledError]]) {
        const node = await ax(key);
        expect(await page.locator(sel(key)).getAttribute('aria-invalid'), `${key} attribute`).toBe('true');
        expect(node.invalid, `${key} invalid in the accessibility tree`).toBe('true');
        expect(node.description, key).toContain(text);
      }
      // The consumer's own aria-describedby adds to the component's, and its id stays the control's.
      const own = await ax(id('own'));
      expect(own.description).toBe(`${kind.ownHint} ${kind.ownNote}`);
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
      expect((await ax(id('required'))).required).toBe(true);
      expect(await page.locator(`#${id('required')}`).evaluate((el: HTMLInputElement) => el.required)).toBe(true);
      const marker = page.locator(`label[for="${id('required')}"] .museum-field__required`);
      expect(await marker.textContent()).toBe('*');
      expect(await marker.isVisible()).toBe(true);
      expect(await marker.getAttribute('aria-hidden')).toBe('true');
      for (const key of enabled.filter((k) => k !== id('required'))) {
        expect((await ax(key)).required, `${key} required`).toBe(false);
        expect(await page.locator(sel(key)).evaluate((el) => el.closest('.museum-field')!.querySelectorAll('.museum-field__required').length), `${key} marker`).toBe(0);
      }
    });

    it('RF-7: the control border is 3:1 against the page and its own background, at rest and in error', async () => {
      const rows = await page.evaluate((selectors) => {
        const m = (window as unknown as { __museum: { parse(c: string): number[]; over(a: number[], b: number[]): number[]; rgb(c: number[]): string; ground(n: Element | null): number[] } }).__museum;
        return selectors.map(([key, selector]) => {
          const el = document.querySelector<HTMLElement>(selector)!;
          const s = getComputedStyle(el);
          const page = m.ground(el.parentElement);
          return { key, border: s.borderTopColor, page: m.rgb(page), own: m.rgb(m.over(m.parse(s.backgroundColor), page)), width: parseFloat(s.borderTopWidth) };
        });
      }, [...enabled, id('disabled')].map((key) => [key, sel(key)]));
      const report = rows.map((r) => ({
        key: r.key, page: Number(contrastRatio(parseRgb(r.border), parseRgb(r.page)).toFixed(2)), own: Number(contrastRatio(parseRgb(r.border), parseRgb(r.own)).toFixed(2)), width: r.width,
      }));
      console.log(`${framework} ${theme} RF-7`, JSON.stringify(report));
      // A disabled control is exempt from WCAG 1.4.11 (inactive component), so it is listed but not asserted.
      for (const r of report.filter((r) => r.key !== id('disabled'))) {
        expect(r.page, `${r.key} border on the page`).toBeGreaterThanOrEqual(3);
        expect(r.own, `${r.key} border on its own background`).toBeGreaterThanOrEqual(3);
      }
    });

    it('RF-8: label, hint, error, marker, value and placeholder are 4.5:1, the disabled error included', async () => {
      // Against the background really composed behind each text, never a stand-in for it.
      const texts = (await visibleTexts(page)).filter((t) => fieldTexts.has(t.text));
      const rated = texts.map((t) => ({ text: t.text, ratio: Number(contrastRatio(parseRgb(t.fg), parseRgb(t.bg)).toFixed(2)) }));
      console.log(`${framework} ${theme} RF-8 texts`, JSON.stringify(rated));
      expect(new Set(texts.map((t) => t.text)), 'every field text was found').toEqual(fieldTexts);
      expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
      // The opacity of a disabled field dims the control only: the error is not dimmed.
      const opacity = await page.locator(`#${id('disabled')}-error`).evaluate((el) => {
        let o = 1;
        for (let n: Element | null = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
        return o;
      });
      expect(opacity, 'disabled error opacity').toBe(1);
      // Values and placeholders are not text nodes of a field: measured from the control, over the background really under it.
      const fields = await page.evaluate((keys) => {
        const m = (window as unknown as { __museum: { parse(c: string): number[]; over(a: number[], b: number[]): number[]; rgb(c: number[]): string; ground(n: Element | null): number[] } }).__museum;
        return keys.map((key) => {
          const el = document.getElementById(key)!;
          const s = getComputedStyle(el);
          const bg = m.over(m.parse(s.backgroundColor), m.ground(el.parentElement));
          const fg = (c: string) => m.rgb(m.over(m.parse(c), bg));
          return { key, value: fg(s.color), placeholder: fg(getComputedStyle(el, '::placeholder').color), bg: m.rgb(bg) };
        });
      }, sizes.map((s) => id(s)));
      const values = fields.map((f) => ({
        key: f.key, value: Number(contrastRatio(parseRgb(f.value), parseRgb(f.bg)).toFixed(2)), placeholder: Number(contrastRatio(parseRgb(f.placeholder), parseRgb(f.bg)).toFixed(2)),
      }));
      console.log(`${framework} ${theme} RF-8 value/placeholder`, JSON.stringify(values));
      for (const v of values) {
        expect(v.value, `${v.key} value`).toBeGreaterThanOrEqual(4.5);
        expect(v.placeholder, `${v.key} placeholder`).toBeGreaterThanOrEqual(4.5);
      }
    });

    if (kind.name === 'Input') {
      it('RF-9: Input and Button of the same size are the same height', async () => {
        const heights = await page.evaluate((list) => list.map((size) => ({
          size,
          input: document.getElementById(`input-${size}`)!.getBoundingClientRect().height,
          buttons: ['primary', 'secondary', 'outline'].map((v) => document.getElementById(`button-${v}-${size}`)!.getBoundingClientRect().height),
        })), sizes);
        console.log(`${framework} ${theme} RF-9`, JSON.stringify(heights));
        for (const h of heights) expect(h.buttons.map((b) => +b.toFixed(2)), `${h.size} Button heights`).toEqual(h.buttons.map(() => +h.input.toFixed(2)));
      });
    } else {
      it('RF-9: Textarea and Input of the same size share font, border, radius, padding and colours', async () => {
        const props = ['fontFamily', 'fontSize', 'fontWeight', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderTopColor',
          'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
          'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'color', 'backgroundColor'] as const;
        const pairs = [...sizes, 'error', 'disabled'].map((s) => [`input-${s}`, `textarea-${s}`]);
        const styles = await page.evaluate(([list, names]) => list.map(([a, b]) => {
          const read = (key: string): Record<string, string> => {
            const el = document.getElementById(key)!;
            const s = getComputedStyle(el);
            return { ...Object.fromEntries(names.map((n) => [n, (s as unknown as Record<string, string>)[n]])), placeholder: getComputedStyle(el, '::placeholder').color };
          };
          return { pair: `${a} / ${b}`, input: read(a), textarea: read(b) };
        }), [pairs, [...props]] as const);
        console.log(`${framework} ${theme} RF-9`, JSON.stringify(styles.map((p) => ({ pair: p.pair, size: p.textarea.fontSize, padding: p.textarea.paddingTop, radius: p.textarea.borderTopLeftRadius, border: p.textarea.borderTopWidth }))));
        for (const p of styles) expect(p.textarea, p.pair).toEqual(p.input);
      });

      it('RF-10: the control resizes vertically only', async () => {
        const resize = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((el) => [el.id || el.name, getComputedStyle(el).resize]));
        console.log(`${framework} ${theme} RF-10`, JSON.stringify(resize));
        expect(resize.length).toBeGreaterThan(10);
        for (const [key, value] of resize) expect(value, key).toBe('vertical');
      });

      it('RF-11: value is the initial text, shown as text and not as HTML, with its line breaks', async () => {
        const read = (key: string) => page.locator(`#${key}`).inputValue();
        expect(await read('textarea-escape'), 'escape').toBe('<b>&\nx');
        expect(await read('textarea-newline'), 'newline').toBe('\nx');
        expect(await read('textarea-md')).toBe('Value');
        expect(await page.locator('#textarea-escape').evaluate((el) => el.closest('.museum-field')!.querySelectorAll('b').length), 'no <b> element').toBe(0);
        // The initial text is editable (Astro's `value` and React's `defaultValue`)...
        await page.locator('#textarea-sm').fill('Edited');
        expect(await read('textarea-sm'), 'editable').toBe('Edited');
        // ...while a React `value` without `onChange` stays as given.
        if (framework === 'react') {
          const fixed = page.locator('#textarea-readonly');
          expect(await fixed.inputValue()).toBe('Fixed text');
          await fixed.focus();
          await page.keyboard.type('xyz');
          expect(await fixed.inputValue(), 'read-only in React').toBe('Fixed text');
        }
        console.log(`${framework} ${theme} RF-11`, JSON.stringify({ escape: await read('textarea-escape'), newline: await read('textarea-newline') }));
      });
    }

    it(`focus: Tab reaches every enabled ${kind.name} with a 3:1 ring of 2px or more, and skips the disabled one`, { timeout: 60_000 }, async () => {
      await page.goto(server.url);
      await page.waitForSelector(`#${id('md')}`);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const total = await page.locator('button, a, input, select, textarea, [tabindex]').count();
      const reached: Record<string, { ring: number; width: number; style: string; haloIsSurface: boolean }> = {};
      for (let i = 0; i < total + 1; i++) {
        await page.keyboard.press('Tab');
        const m = await page.evaluate((hook) => {
          const el = document.activeElement as HTMLInputElement | null;
          if (!el || !el.hasAttribute(hook)) return null;
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
        }, `data-museum-${kind.tag}`);
        if (m && !(m.key in reached)) {
          reached[m.key] = { ring: contrastRatio(parseRgb(m.color), parseRgb(m.around)), width: m.width, style: m.style, haloIsSurface: m.haloIsSurface };
        }
      }
      const report = Object.entries(reached).map(([key, r]) => ({ key, ...r, ring: Number(r.ring.toFixed(2)) }));
      console.log(`${framework} ${theme} focus`, JSON.stringify(report));
      expect(Object.keys(reached).sort(), `Tab reached exactly the enabled ${kind.name}s`).toEqual([...enabled].sort());
      expect(Object.keys(reached)).not.toContain(id('disabled'));
      for (const r of report) {
        expect(r.style, `${r.key} outline style`).not.toBe('none');
        expect(r.width, `${r.key} outline width`).toBeGreaterThanOrEqual(2);
        expect(r.ring, `${r.key} ring against what surrounds it`).toBeGreaterThanOrEqual(3);
        expect(r.haloIsSurface, `${r.key} halo is the package surface`).toBe(true);
      }
    });
  });
});
