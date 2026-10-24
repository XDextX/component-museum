import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright-core';
import type { ProvidedContext } from 'vitest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeBrowserAndServers } from './browser.ts';
import { visibleTexts } from './contrast.ts';
import { contrastRatio, parseRgb } from './css.ts';
import { checkboxLongLabel } from './consumer.ts';
import type { Framework } from './paths.ts';
import { serve, type Served } from './serve.ts';

// Spec 009 T-6, spec 010 T-4 and spec 012 T-4: Input, Textarea and Checkbox as a consumer gets them, built from the
// packed package, in real Edge (RF-2 to RF-8, the focus rules, for Textarea RF-9 to RF-11, and Checkbox's own RF-2 to
// RF-13 block at the end). The instances come from tests/lib/consumer.ts.
// Spec 017 T-12: one test file per kind (tests/field-a11y-*.test.ts) so Vitest runs them in parallel. Each file calls
// need('consumers') itself, which is what splitTests reads to send it to the e2e project.
const frameworks: Framework[] = ['react', 'astro'];
// How the page gets its theme (spec 011): dark is asked for with data-theme under a light system; light is what a
// page that asks for nothing gets under a dark system; "system" follows the dark system.
const modes = [
  { name: 'light', scheme: 'dark', attribute: undefined, surface: 'rgb(255, 255, 255)' },
  { name: 'dark', scheme: 'light', attribute: 'dark', surface: 'rgb(17, 24, 39)' },
  { name: 'system', scheme: 'dark', attribute: 'system', surface: 'rgb(17, 24, 39)' },
] as const;
const sizes = ['sm', 'md', 'lg'];

type Kind = {
  name: 'Input' | 'Textarea' | 'Checkbox';
  tag: 'input' | 'textarea';
  prefix: string;
  twins: string[];
  /** The attribute that marks the component's control. */
  hook: string;
  twinLabel: string;
  /** Start of the twins' `name`s. */
  twinPrefix: string;
  /** How many controls on the page carry the twins' label. */
  twinTotal: number;
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
    name: 'Input', tag: 'input', prefix: 'input', twins: ['twins-a', 'twins-b'], hook: 'data-museum-input', twinLabel: 'Twin', twinPrefix: 'twins-', twinTotal: 4,
    labels: () => ({
      'input-sm': 'Size sm', 'input-md': 'Size md', 'input-lg': 'Size lg', 'input-hint': 'With hint', 'input-error': 'With error',
      'input-both': 'With both', 'input-required': 'Required field', 'input-disabled': 'Disabled field', 'input-own': 'Own wiring',
    }),
    hint: 'Hint text', error: 'Error text', disabledError: 'Disabled error', ownHint: 'Own hint', ownNote: 'Own note',
  },
  {
    name: 'Textarea', tag: 'textarea', prefix: 'textarea', twins: ['twins-ta-a', 'twins-ta-b'], hook: 'data-museum-textarea', twinLabel: 'Twin', twinPrefix: 'twins-', twinTotal: 4,
    labels: (framework) => ({
      'textarea-sm': 'Area sm', 'textarea-md': 'Area md', 'textarea-lg': 'Area lg', 'textarea-hint': 'Area hint', 'textarea-error': 'Area error',
      'textarea-both': 'Area both', 'textarea-required': 'Area required', 'textarea-disabled': 'Area disabled', 'textarea-own': 'Area own',
      'textarea-escape': 'Area escape', 'textarea-newline': 'Area newline',
      ...(framework === 'react' ? { 'textarea-readonly': 'Area read only' } : {}),
    }),
    hint: 'Area hint text', error: 'Area error text', disabledError: 'Area disabled error', ownHint: 'Area own hint', ownNote: 'Area own note',
  },
  {
    name: 'Checkbox', tag: 'input', prefix: 'checkbox', twins: ['pair-a', 'pair-b'], hook: 'data-museum-checkbox', twinLabel: 'Pair', twinPrefix: 'pair-', twinTotal: 2,
    labels: () => ({
      'checkbox-sm': 'Tick sm', 'checkbox-md': 'Tick md', 'checkbox-lg': 'Tick lg', 'checkbox-hint': 'Tick hint', 'checkbox-error': 'Tick error',
      'checkbox-both': 'Tick both', 'checkbox-required': 'Tick required', 'checkbox-disabled': 'Tick disabled', 'checkbox-checked': 'Tick checked',
      'checkbox-own': 'Tick own', 'checkbox-long': checkboxLongLabel,
    }),
    hint: 'Tick hint text', error: 'Tick error text', disabledError: 'Tick disabled error', ownHint: 'Tick own hint', ownNote: 'Tick own note',
  },
];

type AxNode = { name: string; description: string; invalid: string | undefined; required: boolean; checked: string | undefined };

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

/** Defines the accessibility suite of one kind of field, in both consumers and the three theme modes. */
export function defineFieldA11y(kindName: Kind['name'], consumers: ProvidedContext['consumers']): void {
  const kind = kinds.find((k) => k.name === kindName)!;
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(() => closeBrowserAndServers(browser, []));

  describe.each(frameworks)(`${kind.name} in the %s consumer, built (constitution 7)`, (framework) => {
    const labelOf = kind.labels(framework);
    const id = (key: string) => `${kind.prefix}-${key}`;
    /** A control by its own id, or by `name` for the twins, which get generated ids. */
    const sel = (key: string) => (kind.twins.includes(key) ? `${kind.tag}[name="${key}"]` : `#${key}`);
    const withError = [id('error'), id('both'), id('disabled')];
    // React's read-only Textarea (a `value` without `onChange`) is still enabled: Tab reaches it.
    const enabled = [...Object.keys(labelOf).filter((k) => k !== id('disabled')), ...kind.twins];
    const withoutError = enabled.filter((k) => !withError.includes(k));
    const fieldTexts = new Set([...Object.values(labelOf).map((label) => label.slice(0, 40)), kind.twinLabel, kind.hint, kind.error, kind.disabledError, kind.ownHint, '*']);

    let server: Served;
    beforeAll(async () => {
      server = await serve(join(consumers.plain[framework], 'dist'));
    });
    afterAll(() => server.close());

    describe.each(modes)('$name', ({ name: theme, scheme, attribute, surface }) => {
      let context: BrowserContext;
      let page: Page;
      let cdp: CDPSession;
      beforeAll(async () => {
        context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1024, height: 900 } });
        // The attribute is written into the served HTML, on <html>, as a page asking for the theme would.
        if (attribute) {
          await context.route(server.url + '**', async (route) => {
            const response = await route.fetch();
            const body = await response.text();
            await route.fulfill({ response, body: response.headers()['content-type']?.includes('text/html') ? body.replace('<html', `<html data-theme="${attribute}"`) : body });
          });
        }
        page = await context.newPage();
        cdp = await context.newCDPSession(page);
        await page.goto(server.url);
        await page.waitForSelector(`#${id('md')}`);
        await page.evaluate(GROUND);
      }, 60_000);
      afterAll(() => context.close());
      // Checkbox changes state when a label is pressed: every Checkbox test starts from a fresh page.
      if (kind.name === 'Checkbox') {
        beforeEach(async () => {
          await page.goto(server.url);
          await page.waitForSelector(`#${id('md')}`);
          await page.evaluate(GROUND);
        });
      }

      /** What the browser's accessibility tree says about the control: name, description, invalid, required. */
      async function ax(key: string): Promise<AxNode> {
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel(key) });
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
        const props = Object.fromEntries((nodes[0].properties ?? []).map((p) => [p.name, p.value.value]));
        return { name: nodes[0].name?.value ?? '', description: nodes[0].description?.value ?? '', invalid: props.invalid, required: props.required === true, checked: props.checked };
      }
      const activeKey = () => page.evaluate(() => (document.activeElement as HTMLInputElement).name || (document.activeElement as HTMLInputElement).id);

      it('the mode gives the theme it stands for', async () => {
        const resolved = await page.evaluate(() => {
          const probe = document.createElement('div');
          probe.style.backgroundColor = 'var(--museum-surface)';
          document.body.append(probe);
          const color = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return color;
        });
        expect(resolved).toBe(surface);
      });

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
        const sameKind = page.getByLabel(kind.twinLabel).and(page.locator(kind.tag));
        expect(await sameKind.count()).toBe(2);
        expect(await page.getByLabel(kind.twinLabel).count(), 'both kinds share the label').toBe(kind.twinTotal);
        const twins = page.locator(`.museum-field:has(${kind.tag}[name^="${kind.twinPrefix}"]) > label`, { hasText: new RegExp(`^${kind.twinLabel}$`) });
        const ids = [];
        for (const [i, key] of kind.twins.entries()) {
          ids.push(await twins.nth(i).getAttribute('for'));
          await twins.nth(i).click();
          expect(await activeKey(), `${key} focused from its own label`).toBe(key);
          expect((await ax(key)).name).toBe(kind.twinLabel);
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
          // Edge reports an unchecked required checkbox as invalid on its own (native validity, no aria-invalid): measured, not ours.
          if (kind.name !== 'Checkbox' || key !== id('required')) expect([undefined, 'false'], `${key} invalid in the accessibility tree`).toContain((await ax(key)).invalid);
          expect(await page.locator(sel(key)).evaluate((el) => el.closest('.museum-field')!.querySelectorAll('.museum-field__error').length), `${key} error nodes`).toBe(0);
        }
      });

      it('RF-6: required marks the control and shows a marker in the label; the rest show none', async () => {
        // The checkbox role has no "required" property in Edge's accessibility tree: its control is read from the DOM.
        if (kind.name !== 'Checkbox') expect((await ax(id('required'))).required).toBe(true);
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

      if (kind.name !== 'Checkbox') {
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
      }

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
      } else if (kind.name === 'Textarea') {
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
          }, kind.hook);
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

      if (kind.name === 'Checkbox') {
        type Museum = { parse(c: string): number[]; over(a: number[], b: number[]): number[]; rgb(c: number[]): string; ground(n: Element | null): number[] };
        const ratio = (a: string, b: string) => Number(contrastRatio(parseRgb(a), parseRgb(b)).toFixed(2));
        /** The field that holds a control, found from the control. */
        const fieldOf = (key: string) => page.locator('.museum-field', { has: page.locator(sel(key)) });
        const everyBox = [...Object.keys(labelOf), 'checkbox-locked'];

        it('RF-2: pressing the label flips its control, twins each their own, and a disabled one stays', { timeout: 60_000 }, async () => {
          const flips: Record<string, string> = {};
          for (const key of [...enabled, 'checkbox-locked', id('disabled')]) {
            const box = page.locator(sel(key));
            const before = await box.isChecked();
            const disabled = await box.isDisabled();
            await fieldOf(key).locator('label').click({ force: disabled });
            const after = await box.isChecked();
            expect(after, `${key} after pressing its label`).toBe(disabled ? before : !before);
            expect((await ax(key)).checked, `${key} checked in the accessibility tree`).toBe(String(after));
            flips[key] = `${before}>${after}`;
          }
          // Each twin flipped alone: pressing pair-a leaves pair-b as it was.
          await page.goto(server.url);
          await page.waitForSelector(`#${id('md')}`);
          await fieldOf('pair-a').locator('label').click();
          expect([await page.locator(sel('pair-a')).isChecked(), await page.locator(sel('pair-b')).isChecked()]).toEqual([true, false]);
          console.log(`${framework} ${theme} RF-2 flips`, JSON.stringify(flips));
        });

        it('RF-7: the unchecked border is 3:1 against the page and the box, at rest and in error, and in error it is the error colour', async () => {
          const rows = await page.evaluate((selectors) => {
            const m = (window as unknown as { __museum: Museum }).__museum;
            const probe = document.createElement('div');
            probe.style.color = 'var(--museum-field-error)';
            document.body.append(probe);
            const errorColour = getComputedStyle(probe).color;
            probe.remove();
            return selectors.map(([key, selector]) => {
              const el = document.querySelector<HTMLInputElement>(selector)!;
              const s = getComputedStyle(el);
              const ground = m.ground(el.parentElement);
              return {
                key, checked: el.checked, invalid: el.getAttribute('aria-invalid') === 'true', border: s.borderTopColor, errorColour,
                page: m.rgb(ground), own: m.rgb(m.over(m.parse(s.backgroundColor), ground)), width: parseFloat(s.borderTopWidth),
              };
            });
          }, [...enabled, id('disabled')].map((key) => [key, sel(key)]));
          const report = rows.filter((r) => !r.checked).map((r) => ({
            key: r.key, invalid: r.invalid, page: ratio(r.border, r.page), own: ratio(r.border, r.own), width: r.width,
          }));
          console.log(`${framework} ${theme} RF-7`, JSON.stringify(report));
          expect(report.length, 'unchecked boxes measured').toBeGreaterThan(8);
          // A disabled control is exempt from WCAG 1.4.11 (inactive component): listed, not asserted.
          for (const r of report.filter((r) => r.key !== id('disabled'))) {
            expect(r.page, `${r.key} border on the page`).toBeGreaterThanOrEqual(3);
            expect(r.own, `${r.key} border on its own background`).toBeGreaterThanOrEqual(3);
          }
          for (const r of rows.filter((r) => r.invalid)) expect(r.border, `${r.key} border is the error colour`).toBe(r.errorColour);
          expect(rows.filter((r) => r.invalid).map((r) => r.key).sort()).toEqual(withError.sort());
        });

        it('RF-8: checked, the mark is 3:1 against the box and the box 3:1 against the page, in every size and in error', { timeout: 60_000 }, async () => {
          // Real checking: each enabled unchecked control is clicked, the way a user flips it.
          await page.evaluate((hook) => document.querySelectorAll<HTMLInputElement>(`input[${hook}]`).forEach((el) => { if (!el.disabled && !el.checked) el.click(); }), kind.hook);
          const rows = await page.evaluate(() => {
            const m = (window as unknown as { __museum: Museum }).__museum;
            return [...document.querySelectorAll<HTMLInputElement>('input[data-museum-checkbox]')].map((el) => {
              const s = getComputedStyle(el);
              const mark = getComputedStyle(el, '::before');
              const ground = m.ground(el.parentElement);
              const box = m.over(m.parse(s.backgroundColor), ground);
              return {
                key: el.name || el.id, checked: el.checked, invalid: el.hasAttribute('aria-invalid'), disabled: el.disabled, opacity: +s.opacity, size: s.width,
                border: s.borderTopColor, box: m.rgb(box), page: m.rgb(ground), mark: mark.backgroundColor, scale: mark.transform, markWidth: parseFloat(mark.width), markHeight: parseFloat(mark.height),
              };
            });
          });
          const report = rows.map((r) => ({
            key: r.key, size: r.size, mark: ratio(r.mark, r.box), box: ratio(r.box, r.page), border: ratio(r.border, r.page), opacity: r.opacity, scale: r.scale, markPx: `${r.markWidth}x${r.markHeight}`,
          }));
          console.log(`${framework} ${theme} RF-8`, JSON.stringify(report));
          const checked = rows.filter((r) => r.checked);
          expect(checked.map((r) => r.key).sort(), 'every box but the disabled unchecked one is checked').toEqual(rows.filter((r) => r.key !== id('disabled')).map((r) => r.key).sort());
          for (const r of checked) {
            expect(r.scale, `${r.key} mark is drawn at full size`).toBe('matrix(1, 0, 0, 1, 0, 0)');
            expect(Math.min(r.markWidth, r.markHeight), `${r.key} mark has a size`).toBeGreaterThan(8);
          }
          // The disabled box is exempt from 1.4.11 but its mark must still be there, dimmed.
          const locked = checked.find((r) => r.key === 'checkbox-locked')!;
          expect(locked.opacity, 'disabled box is dimmed').toBeLessThan(1);
          expect(locked.opacity, 'disabled box is not gone').toBeGreaterThan(0.2);
          for (const r of checked.filter((r) => !r.disabled)) {
            expect(ratio(r.mark, r.box), `${r.key} mark on box`).toBeGreaterThanOrEqual(3);
            expect(ratio(r.box, r.page), `${r.key} box on the page`).toBeGreaterThanOrEqual(3);
            if (!r.invalid) expect(ratio(r.border, r.page), `${r.key} border on the page`).toBeGreaterThanOrEqual(3);
          }
          expect(new Set(checked.filter((r) => !r.disabled).map((r) => r.size)), 'the three sizes were measured').toEqual(new Set(['16px', '18px']));
        });

        it('RF-9: label, hint, error and marker are 4.5:1, the disabled error included', async () => {
          const texts = (await visibleTexts(page)).filter((t) => fieldTexts.has(t.text));
          const rated = texts.map((t) => ({ text: t.text, ratio: ratio(t.fg, t.bg) }));
          console.log(`${framework} ${theme} RF-9 texts`, JSON.stringify(rated));
          expect(new Set(texts.map((t) => t.text)), 'every field text was found').toEqual(fieldTexts);
          expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
          const opacity = await page.locator(`#${id('disabled')}-error`).evaluate((el) => {
            let o = 1;
            for (let n: Element | null = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
            return o;
          });
          expect(opacity, 'disabled error opacity').toBe(1);
          // The locked box is dimmed, its label is not.
          expect(await page.locator('label[for="checkbox-locked"]').evaluate((el) => +getComputedStyle(el).opacity), 'disabled label opacity').toBe(1);
        });

        it('RF-10: the control and its label together are at least 24 x 24 px, in every size', async () => {
          const rows = await page.evaluate((keys) => keys.map((key) => {
            const box = document.getElementById(key)!.getBoundingClientRect();
            const label = document.querySelector(`label[for="${key}"]`)!.getBoundingClientRect();
            const left = Math.min(box.left, label.left), right = Math.max(box.right, label.right);
            const top = Math.min(box.top, label.top), bottom = Math.max(box.bottom, label.bottom);
            return { key, box: `${box.width}x${box.height}`, label: `${label.width.toFixed(1)}x${label.height.toFixed(1)}`, width: right - left, height: bottom - top, labelHeight: label.height };
          }), everyBox);
          console.log(`${framework} ${theme} RF-10`, JSON.stringify(rows.map((r) => ({ ...r, width: +r.width.toFixed(1), height: +r.height.toFixed(1) }))));
          expect(rows.length).toBeGreaterThan(10);
          for (const r of rows) {
            expect(r.width, `${r.key} width`).toBeGreaterThanOrEqual(24);
            expect(r.height, `${r.key} height`).toBeGreaterThanOrEqual(24);
          }
          for (const size of sizes) expect(rows.find((r) => r.key === id(size))!.labelHeight, `${size} label alone`).toBeGreaterThanOrEqual(24);
        });

        it('RF-11: with Tab the ring stays outside the box, the border stays visible (the error one in the error colour), and Space flips', { timeout: 60_000 }, async () => {
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          const total = await page.locator('button, a, input, select, textarea, [tabindex]').count();
          const seen: Record<string, { offset: number; width: number; border: number; invalid: boolean; borderIsError: boolean; box: string }> = {};
          let space: { on: boolean; off: boolean; ax: string | undefined } | undefined;
          for (let i = 0; i < total + 1; i++) {
            await page.keyboard.press('Tab');
            const m = await page.evaluate(() => {
              const el = document.activeElement as HTMLInputElement | null;
              if (!el || !el.hasAttribute('data-museum-checkbox')) return null;
              const s = getComputedStyle(el);
              const probe = document.createElement('div');
              probe.style.color = 'var(--museum-field-error)';
              document.body.append(probe);
              const errorColour = getComputedStyle(probe).color;
              probe.remove();
              const g = (window as unknown as { __museum: Museum }).__museum;
              const r = el.getBoundingClientRect();
              return {
                key: el.name || el.id, offset: parseFloat(s.outlineOffset), width: parseFloat(s.outlineWidth), border: s.borderTopColor, page: g.rgb(g.ground(el.parentElement)),
                invalid: el.getAttribute('aria-invalid') === 'true', errorColour, box: `${r.width}x${r.height}`,
              };
            });
            if (!m || m.key in seen) continue;
            seen[m.key] = { offset: m.offset, width: m.width, border: ratio(m.border, m.page), invalid: m.invalid, borderIsError: m.border === m.errorColour, box: m.box };
            if (m.key === id('sm')) {
              await page.keyboard.press('Space');
              const on = await page.locator(sel(m.key)).isChecked();
              const axChecked = (await ax(m.key)).checked;
              await page.keyboard.press('Space');
              space = { on, off: !(await page.locator(sel(m.key)).isChecked()), ax: axChecked };
            }
          }
          console.log(`${framework} ${theme} RF-11`, JSON.stringify({ seen, space }));
          expect(Object.keys(seen).sort(), 'Tab reached the enabled boxes and not the disabled one').toEqual([...enabled].sort());
          for (const [key, r] of Object.entries(seen)) {
            expect(r.offset, `${key} ring offset`).toBeGreaterThan(0);
            expect(r.width, `${key} ring width`).toBeGreaterThanOrEqual(2);
            expect(r.border, `${key} border against the page while focused`).toBeGreaterThanOrEqual(3);
            if (r.invalid) expect(r.borderIsError, `${key} keeps the error border while focused`).toBe(true);
          }
          expect(Object.entries(seen).filter(([, r]) => r.invalid).map(([key]) => key).sort()).toEqual(withError.filter((k) => k !== id('disabled')).sort());
          expect(space, 'Space flips the focused box and again flips it back').toEqual({ on: true, off: true, ax: 'true' });
        });

        it('RF-12: defaultChecked starts checked, in the page and the accessibility tree, and one press unchecks it', async () => {
          const starts = await page.evaluate((hook) => [...document.querySelectorAll<HTMLInputElement>(`input[${hook}]`)].map((el) => [el.name || el.id, el.checked] as const), kind.hook);
          console.log(`${framework} ${theme} RF-12`, JSON.stringify(starts.filter(([, c]) => c)));
          expect(starts.filter(([, c]) => c).map(([k]) => k).sort(), 'only the two defaultChecked boxes start checked').toEqual(['checkbox-checked', 'checkbox-locked']);
          expect((await ax('checkbox-checked')).checked).toBe('true');
          expect((await ax('checkbox-md')).checked).toBe('false');
          await fieldOf('checkbox-checked').locator('label').click();
          expect(await page.locator('#checkbox-checked').isChecked(), 'unchecked by one press').toBe(false);
          expect((await ax('checkbox-checked')).checked).toBe('false');
          await fieldOf('checkbox-checked').locator('label').click();
          expect(await page.locator('#checkbox-checked').isChecked(), 'and checked again').toBe(true);
        });

        it('RF-13: with forced colours the checked and the unchecked box differ, and the mark differs from its box', async () => {
          await page.emulateMedia({ forcedColors: 'active' });
          try {
            const read = () => page.evaluate(() => Object.fromEntries(['checkbox-md', 'checkbox-checked', 'checkbox-disabled', 'checkbox-locked'].map((key) => {
              const el = document.getElementById(key)!;
              const s = getComputedStyle(el);
              const mark = getComputedStyle(el, '::before');
              return [key, { box: s.backgroundColor, border: s.borderTopColor, mark: mark.backgroundColor, scale: mark.transform, forced: matchMedia('(forced-colors: active)').matches }];
            })));
            const r = await read();
            console.log(`${framework} ${theme} RF-13`, JSON.stringify(r));
            expect(r['checkbox-md'].forced, 'forced colours are on').toBe(true);
            expect(r['checkbox-checked'].box, 'checked box vs unchecked box').not.toBe(r['checkbox-md'].box);
            expect(r['checkbox-checked'].border, 'checked border vs unchecked border').not.toBe(r['checkbox-md'].border);
            expect(r['checkbox-checked'].mark, 'mark vs its box').not.toBe(r['checkbox-checked'].box);
            expect(r['checkbox-checked'].scale, 'mark drawn').toBe('matrix(1, 0, 0, 1, 0, 0)');
            expect(r['checkbox-md'].scale, 'no mark when unchecked').not.toBe('matrix(1, 0, 0, 1, 0, 0)');
            expect(r['checkbox-locked'].box, 'disabled: checked vs unchecked').not.toBe(r['checkbox-disabled'].box);
            expect(r['checkbox-locked'].mark, 'disabled: mark vs its box').not.toBe(r['checkbox-locked'].box);
          } finally {
            await page.emulateMedia({ forcedColors: null });
          }
        });

        it('a long label wraps at 320 px beside the box, which stays on the first line, without overflowing', async () => {
          await page.setViewportSize({ width: 320, height: 800 });
          try {
            const m = await page.evaluate(() => {
              const box = document.getElementById('checkbox-long')!.getBoundingClientRect();
              const label = document.querySelector('label[for="checkbox-long"]')!.getBoundingClientRect();
              const field = document.getElementById('checkbox-long')!.closest('.museum-field')!;
              return { box: { top: box.top, width: box.width, height: box.height }, label: { top: label.top, right: label.right, height: label.height }, fieldRight: field.getBoundingClientRect().right, scroll: field.scrollWidth, client: field.clientWidth, view: innerWidth };
            });
            console.log(`${framework} ${theme} long label`, JSON.stringify(m));
            expect(m.label.height, 'the label wraps').toBeGreaterThan(48);
            expect(m.scroll, 'the field does not overflow').toBeLessThanOrEqual(m.client);
            expect(m.label.right, 'label inside the field').toBeLessThanOrEqual(m.fieldRight + 0.5);
            expect(m.label.right, 'label inside the viewport').toBeLessThanOrEqual(m.view);
            expect(m.box.width, 'the box keeps its size').toBeGreaterThanOrEqual(16);
            expect(Math.abs(m.box.top - m.label.top - (24 - m.box.height) / 2), 'box centred on the first line').toBeLessThanOrEqual(0.5);
          } finally {
            await page.setViewportSize({ width: 1024, height: 900 });
          }
        });
      }
    });
  });
}
