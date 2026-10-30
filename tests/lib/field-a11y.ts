import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright-core';
import type { ProvidedContext } from 'vitest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeBrowserAndServers } from './browser.ts';
import { visibleTexts } from './contrast.ts';
import { contrastRatio, parseRgb } from './css.ts';
import { checkboxLongLabel, radiogroupLongLabel, selectLongOption } from './consumer.ts';
import type { Framework } from './paths.ts';
import { serve, type Served } from './serve.ts';

// Spec 009 T-6, spec 010 T-4, spec 012 T-4 and spec 014 T-4 (RadioGroup: spec 013 T-5, at the end): Input, Textarea, Checkbox and Select as a consumer gets them, built from the
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
  name: 'Input' | 'Textarea' | 'Checkbox' | 'Select';
  tag: 'input' | 'textarea' | 'select';
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
  {
    name: 'Select', tag: 'select', prefix: 'select', twins: ['twins-sel-a', 'twins-sel-b'], hook: 'data-museum-select', twinLabel: 'Chooser', twinPrefix: 'twins-sel-', twinTotal: 2,
    labels: () => ({
      'select-sm': 'Menu sm', 'select-md': 'Menu md', 'select-lg': 'Menu lg', 'select-hint': 'Menu hint', 'select-error': 'Menu error', 'select-both': 'Menu both',
      'select-required': 'Menu required', 'select-disabled': 'Menu disabled', 'select-placeholder': 'Menu placeholder', 'select-selected': 'Menu selected',
      'select-partial': 'Menu partial', 'select-own': 'Menu own', 'select-long': 'Menu long',
    }),
    hint: 'Menu hint text', error: 'Menu error text', disabledError: 'Menu disabled error', ownHint: 'Menu own hint', ownNote: 'Menu own note',
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
export function defineFieldA11y(kindName: Kind['name'] | 'RadioGroup', consumers: ProvidedContext['consumers']): void {
  if (kindName === 'RadioGroup') return defineRadioGroupA11y(consumers);
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
      // Checkbox changes state when a label is pressed and Select when an option is chosen: their tests start from a fresh page.
      if (kind.name === 'Checkbox' || kind.name === 'Select') {
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
      /** The numbering of the spec: Select's RF-10 to RF-12 are Input's RF-7 and RF-8. */
      const n = (input: string, select: string) => (kind.name === 'Select' ? select : input);
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
          // Edge reports an unchecked required checkbox, and a required select on its indication, as invalid on its own (native validity, no aria-invalid): measured, not ours.
          if (!['Checkbox', 'Select'].includes(kind.name) || key !== id('required')) expect([undefined, 'false'], `${key} invalid in the accessibility tree`).toContain((await ax(key)).invalid);
          expect(await page.locator(sel(key)).evaluate((el) => el.closest('.museum-field')!.querySelectorAll('.museum-field__error').length), `${key} error nodes`).toBe(0);
        }
      });

      it('RF-6: required marks the control and shows a marker in the label; the rest show none', async () => {
        // The checkbox and the select roles have no "required" property in Edge's accessibility tree: their control is read from the DOM.
        if (kind.name !== 'Checkbox' && kind.name !== 'Select') expect((await ax(id('required'))).required).toBe(true);
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
        it(`${n('RF-7', 'RF-10')}: the control border is 3:1 against the page and its own background, at rest and in error`, async () => {
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

        it(`${n('RF-8', 'RF-12')}: label, hint, error, marker, value and placeholder are 4.5:1, the disabled error included`, async () => {
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
              return { key, value: fg(s.color), placeholder: fg(el.tagName === 'SELECT' ? s.color : getComputedStyle(el, '::placeholder').color), bg: m.rgb(bg) };
            });
          }, [...sizes, ...(kind.tag === 'select' ? ['placeholder', 'selected'] : [])].map((s) => id(s)));
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
      } else if (kind.name === 'Select') {
        it('RF-13: Select and Input of the same size are the same height, and at least 24 px', async () => {
          const heights = await page.evaluate((list) => list.map((size) => ({
            size,
            select: document.getElementById(`select-${size}`)!.getBoundingClientRect().height,
            input: document.getElementById(`input-${size}`)!.getBoundingClientRect().height,
          })), sizes);
          console.log(`${framework} ${theme} RF-13`, JSON.stringify(heights));
          for (const h of heights) {
            expect(+h.select.toFixed(2), `${h.size} Select against Input`).toBe(+h.input.toFixed(2));
            expect(h.select, `${h.size} height`).toBeGreaterThanOrEqual(24);
          }
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

      if (kind.name === 'Select') {
        type Museum = { parse(c: string): number[]; over(a: number[], b: number[]): number[]; rgb(c: number[]): string; ground(n: Element | null): number[] };
        const ratio = (a: string, b: string) => Number(contrastRatio(parseRgb(a), parseRgb(b)).toFixed(2));
        type Row = { value: string; label: string; disabled: boolean };
        const abc: Row[] = [
          { value: 'a', label: 'Option A', disabled: false }, { value: 'b', label: 'Option B', disabled: false }, { value: 'c', label: 'Option C', disabled: false },
        ];
        const indication: Row = { value: '', label: 'Choose one', disabled: true };
        const listed: Record<string, Row[]> = {
          ...Object.fromEntries([...sizes, 'hint', 'error', 'both', 'own', 'disabled'].map((k) => [id(k), abc])),
          ...Object.fromEntries(['required', 'placeholder', 'selected'].map((k) => [id(k), [indication, ...abc]])),
          [id('partial')]: [abc[0], abc[1], { ...abc[2], disabled: true }],
          [id('long')]: [abc[0], { value: 'l', label: selectLongOption, disabled: false }],
          'twins-sel-a': [abc[0]], 'twins-sel-b': [abc[0]],
        };
        const rowsOf = (key: string) => page.locator(sel(key)).evaluate((el: HTMLSelectElement) => [...el.options].map((o) => ({ value: o.value, label: o.label, disabled: o.disabled })));
        const valueOf = (key: string) => page.locator(sel(key)).inputValue();
        const shownOf = (key: string) => page.locator(sel(key)).evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.label);
        /** The value the accessibility tree reports for the control: the text of the chosen option. */
        async function axValue(key: string): Promise<unknown> {
          const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel(key) });
          const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
          return nodes[0].value?.value;
        }
        /** The distinct colours painted by the arrow's gradients, read from the computed background-image. */
        const arrowColours = (image: string) => [...new Set((image.match(/rgba?\([^)]*\)/g) ?? []).filter((c) => c !== 'rgba(0, 0, 0, 0)'))];

        it('RF-6: with the indication chosen the form does not send, and after a choice it does', async () => {
          const sent = await page.evaluate(() => {
            const select = document.getElementById('select-required') as HTMLSelectElement;
            const form = document.createElement('form');
            form.id = 'select-form';
            document.body.append(form);
            select.setAttribute('form', 'select-form');
            let count = 0;
            form.addEventListener('submit', (e) => { e.preventDefault(); count++; });
            const start = { value: select.value, missing: select.validity.valueMissing };
            form.requestSubmit();
            const blocked = count;
            select.value = 'a';
            form.requestSubmit();
            return { start, blocked, after: count };
          });
          console.log(`${framework} ${theme} RF-6 submit`, JSON.stringify(sent));
          expect(sent).toEqual({ start: { value: '', missing: true }, blocked: 0, after: 1 });
        });

        it('RF-7: the options come in their order with their value and text, can be chosen one by one, and a disabled one cannot', async () => {
          for (const [key, expected] of Object.entries(listed)) expect(await rowsOf(key), `${key} options`).toEqual(expected);
          for (const o of abc) {
            await page.locator('#select-md').selectOption(o.value);
            expect(await valueOf('select-md'), `chose ${o.value}`).toBe(o.value);
            expect(await shownOf('select-md')).toBe(o.label);
            expect(await axValue('select-md'), `${o.value} in the accessibility tree`).toBe(o.label);
          }
          // A user reaches the last enabled option with End: the disabled C is not chosen.
          await page.locator('#select-partial').focus();
          await page.keyboard.press('End');
          expect(await valueOf('select-partial'), 'End stops before the disabled option').toBe('b');
          // Typing its text does not reach it either.
          await page.keyboard.type('Option C');
          expect(await valueOf('select-partial'), 'typing the disabled option does not choose it').not.toBe('c');
          console.log(`${framework} ${theme} RF-7`, JSON.stringify(Object.fromEntries(Object.entries(listed).map(([k, v]) => [k, v.length]))));
        });

        it('RF-8 and RF-9: defaultValue starts chosen, also over the indication; with none the indication shows, empty, and cannot be chosen again', async () => {
          expect(await valueOf('select-selected'), 'defaultValue wins over the indication').toBe('b');
          expect(await shownOf('select-selected')).toBe('Option B');
          expect(await axValue('select-selected'), 'chosen text in the accessibility tree').toBe('Option B');
          expect(await valueOf('select-md'), 'no defaultValue and no indication: the first option').toBe('a');
          for (const key of ['select-placeholder', 'select-required']) {
            expect(await valueOf(key), `${key} value`).toBe('');
            expect(await shownOf(key), `${key} shows the indication`).toBe('Choose one');
            expect(await axValue(key), `${key} indication in the accessibility tree`).toBe('Choose one');
            // After a choice, no way back: Home goes to the first enabled option, never to the indication.
            await page.locator(sel(key)).selectOption('c');
            await page.locator(sel(key)).focus();
            await page.keyboard.press('Home');
            expect(await valueOf(key), `${key} Home`).toBe('a');
            await page.keyboard.press('ArrowUp');
            expect(await valueOf(key), `${key} ArrowUp`).toBe('a');
          }
          console.log(`${framework} ${theme} RF-8/9`, JSON.stringify({ selected: await valueOf('select-selected'), md: await valueOf('select-md') }));
        });

        it('RF-11: the arrow is 3:1 against the background of the control, at rest and in error', async () => {
          const rows = await page.evaluate((keys) => {
            const m = (window as unknown as { __museum: Museum }).__museum;
            return keys.map((key) => {
              const el = document.getElementById(key)!;
              const s = getComputedStyle(el);
              return { key, image: s.backgroundImage, own: m.rgb(m.over(m.parse(s.backgroundColor), m.ground(el.parentElement))) };
            });
          }, [...sizes, 'hint', 'error', 'both', 'required', 'placeholder', 'selected', 'partial', 'own', 'long'].map(id));
          const report = rows.map((r) => ({ key: r.key, arrow: arrowColours(r.image), ratio: arrowColours(r.image).length === 1 ? ratio(arrowColours(r.image)[0], r.own) : 0 }));
          console.log(`${framework} ${theme} RF-11`, JSON.stringify(report.map((r) => [r.key, r.arrow[0], r.ratio])));
          for (const r of report) {
            expect(r.arrow.length, `${r.key} has one arrow colour`).toBe(1);
            expect(r.ratio, `${r.key} arrow on its control`).toBeGreaterThanOrEqual(3);
          }
        });

        it('RF-14: with Tab, a focused control in error keeps its error border, and the ring stands off the border', { timeout: 60_000 }, async () => {
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          await page.keyboard.press('Tab'); // keyboard modality, so a script focus shows the ring
          const rows: { key: string; border: string; error: string; offset: number; width: number; ground: string }[] = [];
          for (const key of [id('error'), id('both')]) {
            await page.locator(sel(key)).focus();
            rows.push(await page.evaluate((k) => {
              const el = document.getElementById(k)!;
              const s = getComputedStyle(el);
              const g = (window as unknown as { __museum: Museum }).__museum;
              const probe = document.createElement('div');
              probe.style.color = 'var(--museum-field-error)';
              document.body.append(probe);
              const error = getComputedStyle(probe).color;
              probe.remove();
              return { key: k, border: s.borderTopColor, error, offset: parseFloat(s.outlineOffset), width: parseFloat(s.outlineWidth), ground: g.rgb(g.ground(el.parentElement)) };
            }, key));
          }
          console.log(`${framework} ${theme} RF-14 error`, JSON.stringify(rows));
          for (const r of rows) {
            expect(r.border, `${r.key} focused border is the error colour`).toBe(r.error);
            expect(r.offset, `${r.key} ring offset`).toBeGreaterThan(0);
            expect(r.width, `${r.key} ring width`).toBeGreaterThanOrEqual(2);
            expect(ratio(r.border, r.ground), `${r.key} border on the page while focused`).toBeGreaterThanOrEqual(3);
          }
        });

        it('RF-15: with forced colours the border and the arrow differ from the background, in error too', async () => {
          await page.emulateMedia({ forcedColors: 'active' });
          try {
            const rows = await page.evaluate((keys) => keys.map((key) => {
              const s = getComputedStyle(document.getElementById(key)!);
              return { key, border: s.borderTopColor, bg: s.backgroundColor, image: s.backgroundImage, forced: matchMedia('(forced-colors: active)').matches };
            }), [id('md'), id('error'), id('both')]);
            console.log(`${framework} ${theme} RF-15`, JSON.stringify(rows.map((r) => [r.key, r.border, r.bg, arrowColours(r.image)])));
            for (const r of rows) {
              expect(r.forced, 'forced colours are on').toBe(true);
              expect(r.border, `${r.key} border differs from the background`).not.toBe(r.bg);
              expect(r.border, `${r.key} border is painted`).not.toBe('rgba(0, 0, 0, 0)');
              expect(arrowColours(r.image).length, `${r.key} has an arrow`).toBe(1);
              expect(arrowColours(r.image)[0], `${r.key} arrow differs from the background`).not.toBe(r.bg);
            }
          } finally {
            await page.emulateMedia({ forcedColors: null });
          }
        });

        it('RF-16: ArrowDown skips the disabled option and never reaches the indication, and the disabled control takes no focus', async () => {
          await page.locator('#select-partial').focus();
          expect(await valueOf('select-partial')).toBe('a');
          await page.keyboard.press('ArrowDown');
          expect(await valueOf('select-partial'), 'ArrowDown reaches B').toBe('b');
          await page.keyboard.press('ArrowDown');
          expect(await valueOf('select-partial'), 'ArrowDown does not land on the disabled C').toBe('b');
          await page.keyboard.press('ArrowUp');
          expect(await valueOf('select-partial'), 'ArrowUp goes back').toBe('a');
          await page.locator('#select-placeholder').focus();
          await page.keyboard.press('ArrowDown');
          expect(await valueOf('select-placeholder'), 'ArrowDown leaves the indication').toBe('a');
          expect(await page.locator('#select-disabled').isDisabled()).toBe(true);
          await page.evaluate(() => document.getElementById('select-disabled')!.focus());
          expect(await activeKey(), 'a disabled select takes no focus').not.toBe('select-disabled');
        });

        it('a long option is cut inside the field at 320 px and the field does not widen', async () => {
          await page.setViewportSize({ width: 320, height: 800 });
          try {
            const m = await page.evaluate(() => {
              const select = document.getElementById('select-long')!;
              const field = select.closest('.museum-field')!;
              const s = select.getBoundingClientRect();
              return { right: s.right, width: s.width, fieldRight: field.getBoundingClientRect().right, scroll: field.scrollWidth, client: field.clientWidth, view: innerWidth, sm: document.getElementById('select-md')!.getBoundingClientRect().width };
            });
            console.log(`${framework} ${theme} long option`, JSON.stringify(m));
            expect(m.scroll, 'the field does not overflow').toBeLessThanOrEqual(m.client);
            expect(m.right, 'the select stays in the field').toBeLessThanOrEqual(m.fieldRight + 0.5);
            expect(m.right, 'and in the viewport').toBeLessThanOrEqual(m.view);
            expect(m.width, 'as wide as a select with short options').toBe(m.sm);
          } finally {
            await page.setViewportSize({ width: 1024, height: 900 });
          }
        });
      }

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

// Spec 013 T-5: RadioGroup as a consumer gets it (RF-2 to RF-16), in both consumers and the three theme modes, plus forced colours.
const groupLegends: Record<string, string> = {
  sm: 'Pick sm', md: 'Pick md', lg: 'Pick lg', hint: 'Pick hint', error: 'Pick error', both: 'Pick both', required: 'Pick required',
  disabled: 'Pick disabled', partial: 'Pick partial', selected: 'Pick selected', own: 'Pick own', long: 'Pick long',
};
const optionLabels = ['Choice A', 'Choice B', 'Choice C'];
const groupTexts = {
  hint: 'Pick hint text', error: 'Pick error text', disabledError: 'Pick disabled error', ownHint: 'Pick own hint', ownNote: 'Pick own note',
};

function defineRadioGroupA11y(consumers: ProvidedContext['consumers']): void {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch({ channel: 'msedge' });
  });
  afterAll(() => closeBrowserAndServers(browser, []));

  describe.each(frameworks)('RadioGroup in the %s consumer, built (constitution 7)', (framework) => {
    type Museum = { parse(c: string): number[]; over(a: number[], b: number[]): number[]; rgb(c: number[]): string; ground(n: Element | null): number[] };
    const ratio = (a: string, b: string) => Number(contrastRatio(parseRgb(a), parseRgb(b)).toFixed(2));
    const keys = Object.keys(groupLegends);
    /** The radios of one group, by id, in order. */
    const radio = (key: string, i: number) => `radiogroup-${key}-${i}`;
    const withError = ['error', 'both', 'disabled'];
    // Groups whose radios Tab can reach: the disabled group is out.
    const reachable = keys.filter((k) => k !== 'disabled');
    const fieldTexts = new Set([...Object.values(groupLegends), ...optionLabels, radiogroupLongLabel.slice(0, 40), ...Object.values(groupTexts), '*']);

    let server: Served;
    beforeAll(async () => {
      server = await serve(join(consumers.plain[framework], 'dist'));
    });
    afterAll(() => server.close());

    describe.each(modes)('$name', ({ name: theme, scheme, attribute, surface }) => {
      let context: BrowserContext;
      let page: Page;
      let cdp: CDPSession;
      const load = async () => {
        await page.goto(server.url);
        await page.waitForSelector('#radiogroup-md');
        await page.evaluate(GROUND);
      };
      beforeAll(async () => {
        context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1024, height: 900 } });
        if (attribute) {
          await context.route(server.url + '**', async (route) => {
            const response = await route.fetch();
            const body = await response.text();
            await route.fulfill({ response, body: response.headers()['content-type']?.includes('text/html') ? body.replace('<html', `<html data-theme="${attribute}"`) : body });
          });
        }
        page = await context.newPage();
        cdp = await context.newCDPSession(page);
      }, 60_000);
      afterAll(() => context.close());
      // Pressing an option changes state: every test starts from a fresh page.
      beforeEach(load);

      /** What the accessibility tree says about an element: name, description, invalid, required, checked. */
      async function ax(selector: string): Promise<AxNode> {
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
        const props = Object.fromEntries((nodes[0].properties ?? []).map((p) => [p.name, p.value.value]));
        return { name: nodes[0].name?.value ?? '', description: nodes[0].description?.value ?? '', invalid: props.invalid, required: props.required === true, checked: props.checked };
      }
      const group = (key: string) => page.locator(`#radiogroup-${key}`);
      const checkedOf = (key: string) => page.evaluate((k) => [...document.querySelectorAll<HTMLInputElement>(`#radiogroup-${k} input`)].map((el) => el.checked), key);
      const activeId = () => page.evaluate(() => (document.activeElement as HTMLElement).id);

      /** Tab through the whole page once; every radio reached, with the ring it wears. */
      async function walk() {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        const total = await page.locator('button, a, input, select, textarea, [tabindex]').count();
        const reached: { id: string; group: string; offset: number; width: number; style: string; ring: string; around: string; border: string; ground: string; borderIsError: boolean }[] = [];
        for (let i = 0; i < total + 1; i++) {
          await page.keyboard.press('Tab');
          const m = await page.evaluate(() => {
            const el = document.activeElement as HTMLInputElement | null;
            if (!el || !el.classList.contains('museum-radio')) return null;
            const s = getComputedStyle(el);
            const g = (window as unknown as { __museum: Museum }).__museum;
            const probe = document.createElement('div');
            probe.style.color = 'var(--museum-field-error)';
            document.body.append(probe);
            const errorColour = getComputedStyle(probe).color;
            probe.remove();
            const shadow = /^(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/.exec(s.boxShadow);
            const offset = parseFloat(s.outlineOffset);
            const past = shadow !== null && parseFloat(shadow[2]) > offset + parseFloat(s.outlineWidth);
            const ground = g.rgb(g.ground(el.parentElement));
            return {
              id: el.id, group: el.closest('fieldset')!.id, offset, width: parseFloat(s.outlineWidth), style: s.outlineStyle, ring: s.outlineColor,
              around: past ? shadow![1] : ground, border: s.borderTopColor, ground, borderIsError: s.borderTopColor === errorColour,
            };
          });
          if (m) reached.push(m);
        }
        return reached;
      }

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

      it('RF-2: each group is found by its role and its name, and each option by its label', { timeout: 60_000 }, async () => {
        for (const [key, legend] of Object.entries(groupLegends)) {
          const found = page.getByRole('radiogroup', { name: legend, exact: true });
          expect(await found.count(), `${key} found by role and name`).toBe(1);
          expect(await found.evaluate((el) => el.id), key).toBe(`radiogroup-${key}`);
          expect((await ax(`#radiogroup-${key}`)).name, `${key} accessible name`).toBe(legend);
          expect(await found.evaluate((el) => el.tagName + ':' + el.getAttribute('role')), `${key} is a fieldset with the role`).toBe('FIELDSET:radiogroup');
          if (key === 'long') continue;
          for (const [i, label] of optionLabels.entries()) {
            const option = found.getByLabel(label);
            expect(await option.count(), `${key}/${label} found by its label`).toBe(1);
            expect(await option.evaluate((el) => el.id), `${key}/${label}`).toBe(radio(key, i));
            expect((await ax(`#${radio(key, i)}`)).name, `${key}/${label} accessible name`).toBe(label);
          }
        }
        // A group has a legend, and an empty-looking name never finds the wrong one.
        expect(await page.getByRole('radiogroup').count(), 'one radiogroup per instance').toBe(keys.length);
        console.log(`${framework} ${theme} RF-2`, JSON.stringify({ groups: keys.length }));
      });

      it('RF-3: pressing an option label selects it and unselects the previous one, and only in its own group', async () => {
        const flips: string[] = [];
        for (const key of ['md', 'sm', 'lg']) {
          const box = page.getByRole('radiogroup', { name: groupLegends[key], exact: true });
          await box.locator('label', { hasText: 'Choice A' }).click();
          expect(await checkedOf(key), `${key} after A`).toEqual([true, false, false]);
          await box.locator('label', { hasText: 'Choice B' }).click();
          expect(await checkedOf(key), `${key} after B`).toEqual([false, true, false]);
          expect((await ax(`#${radio(key, 1)}`)).checked, `${key} B checked in the accessibility tree`).toBe('true');
          expect((await ax(`#${radio(key, 0)}`)).checked, `${key} A unchecked in the accessibility tree`).toBe('false');
          flips.push(key);
        }
        // Pressing the middle group left the others as they started.
        expect(await checkedOf('hint'), 'another group untouched').toEqual([false, false, false]);
        expect(await checkedOf('selected'), 'the selected group untouched').toEqual([false, true, false]);
        console.log(`${framework} ${theme} RF-3`, JSON.stringify({ flips }));
      });

      it('RF-4 and RF-5: the description holds the hint and the error, the error first, and the group is invalid', async () => {
        expect((await ax('#radiogroup-hint')).description).toBe(groupTexts.hint);
        const both = await ax('#radiogroup-both');
        expect(both.description).toBe(`${groupTexts.error} ${groupTexts.hint}`);
        expect(both.description.indexOf(groupTexts.error)).toBeLessThan(both.description.indexOf(groupTexts.hint));
        for (const [key, text] of [['error', groupTexts.error], ['both', groupTexts.error], ['disabled', groupTexts.disabledError]]) {
          const node = await ax(`#radiogroup-${key}`);
          expect(await group(key).getAttribute('aria-invalid'), `${key} attribute`).toBe('true');
          expect(node.invalid, `${key} invalid in the accessibility tree`).toBe('true');
          expect(node.description, key).toContain(text);
        }
        // The description sits on the group, never on its radios; the consumer's own aria-describedby adds to it.
        expect(await page.locator('#radiogroup-both input').evaluateAll((els) => els.map((el) => el.getAttribute('aria-describedby') ?? el.getAttribute('aria-invalid'))), 'radios carry neither').toEqual([null, null, null]);
        const own = await ax('#radiogroup-own');
        expect(own.description).toBe(`${groupTexts.ownHint} ${groupTexts.ownNote}`);
        expect(await group('own').getAttribute('id'), 'the consumer id stays the group id').toBe('radiogroup-own');
        console.log(`${framework} ${theme} RF-4/5`, JSON.stringify({ both: both.description, own: own.description }));
      });

      it('RF-6: without an error there is no aria-invalid and no error text', async () => {
        for (const key of keys.filter((k) => !withError.includes(k))) {
          expect(await group(key).getAttribute('aria-invalid'), `${key} aria-invalid`).toBeNull();
          expect([undefined, 'false'], `${key} invalid in the accessibility tree`).toContain((await ax(`#radiogroup-${key}`)).invalid);
          expect(await group(key).locator('.museum-field__error').count(), `${key} error nodes`).toBe(0);
        }
      });

      it('RF-7: required marks the group and shows a marker in the legend, and the form does not send without a choice', async () => {
        const required = await ax('#radiogroup-required');
        expect(required.required).toBe(true);
        expect(await group('required').getAttribute('aria-required')).toBe('true');
        const marker = group('required').locator('legend .museum-field__required');
        expect(await marker.textContent()).toBe('*');
        expect(await marker.isVisible()).toBe(true);
        expect(await marker.getAttribute('aria-hidden')).toBe('true');
        for (const key of keys.filter((k) => k !== 'required')) {
          expect((await ax(`#radiogroup-${key}`)).required, `${key} required`).toBe(false);
          expect(await group(key).locator('.museum-field__required').count(), `${key} marker`).toBe(0);
        }
        // Native validation: the radios of the group are required, so a form around them refuses to send until one is chosen.
        const sent = await page.evaluate(() => {
          const form = document.createElement('form');
          form.id = 'rg-form';
          document.body.append(form);
          let sends = 0;
          form.addEventListener('submit', (e) => { e.preventDefault(); sends++; });
          document.querySelectorAll('input[name="rg-required"]').forEach((el) => el.setAttribute('form', 'rg-form'));
          form.requestSubmit();
          const empty = sends;
          document.querySelectorAll<HTMLInputElement>('input[name="rg-required"]')[1].click();
          form.requestSubmit();
          return { empty, chosen: sends };
        });
        expect(sent, 'no send without a choice, one send with it').toEqual({ empty: 0, chosen: 1 });
        console.log(`${framework} ${theme} RF-7`, JSON.stringify(sent));
      });

      it('RF-8: Tab enters each group once and ArrowDown selects the next option, wrapping', { timeout: 60_000 }, async () => {
        const reached = await walk();
        for (const key of reachable) {
          const mine = reached.filter((r) => r.group === `radiogroup-${key}`);
          expect(mine.length, `Tab enters ${key} once`).toBe(1);
        }
        expect(reached.filter((r) => r.group === 'radiogroup-selected')[0].id, 'a group with a selection is entered on it').toBe(radio('selected', 1));
        expect(reached.filter((r) => r.group === 'radiogroup-md')[0].id, 'a group with none is entered on its first').toBe(radio('md', 0));
        // From the entry point, the arrows move focus and selection together.
        await group('md').locator('input').first().focus();
        const steps: string[] = [];
        for (const expected of [1, 2, 0]) {
          await page.keyboard.press('ArrowDown');
          expect(await activeId(), `focus after ArrowDown`).toBe(radio('md', expected));
          expect((await checkedOf('md')).indexOf(true), `selection after ArrowDown`).toBe(expected);
          steps.push(await activeId());
        }
        await page.keyboard.press('ArrowUp');
        expect((await checkedOf('md')).indexOf(true), 'ArrowUp goes back (wrapping)').toBe(2);
        console.log(`${framework} ${theme} RF-8`, JSON.stringify({ entries: reached.map((r) => r.id), steps }));
      });

      it('RF-9: defaultValue starts on its option and the others start unselected; the options of a group are still one choice', async () => {
        const starts = await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('input.museum-radio')].filter((el) => el.checked).map((el) => el.id));
        console.log(`${framework} ${theme} RF-9`, JSON.stringify(starts));
        expect(starts, 'only the selected group starts with a choice').toEqual([radio('selected', 1)]);
        expect((await ax(`#${radio('selected', 1)}`)).checked).toBe('true');
        expect((await ax(`#${radio('selected', 0)}`)).checked).toBe('false');
        expect((await ax(`#${radio('md', 0)}`)).checked).toBe('false');
      });

      it('RF-10: the circle border is 3:1 against the surface, at rest and in error, and in error it is the error colour', async () => {
        const rows = await page.evaluate(() => {
          const g = (window as unknown as { __museum: Museum }).__museum;
          const probe = document.createElement('div');
          probe.style.color = 'var(--museum-field-error)';
          document.body.append(probe);
          const errorColour = getComputedStyle(probe).color;
          probe.remove();
          return [...document.querySelectorAll<HTMLInputElement>('input.museum-radio')].filter((el) => !el.checked).map((el) => {
            const ground = g.rgb(g.ground(el.parentElement));
            const s = getComputedStyle(el);
            return {
              id: el.id, group: el.closest('fieldset')!.id, invalid: el.closest('fieldset')!.getAttribute('aria-invalid') === 'true', disabled: el.closest('fieldset')!.disabled,
              border: s.borderTopColor, errorColour, ground, own: g.rgb(g.over(g.parse(s.backgroundColor), g.parse(ground))), width: parseFloat(s.borderTopWidth), radius: s.borderTopLeftRadius,
            };
          });
        });
        const report = rows.map((r) => ({ id: r.id, invalid: r.invalid, page: ratio(r.border, r.ground), own: ratio(r.border, r.own) }));
        console.log(`${framework} ${theme} RF-10`, JSON.stringify(report));
        expect(rows.length, 'unchecked circles measured').toBeGreaterThan(25);
        // A disabled control is exempt from WCAG 1.4.11 (inactive component): listed, not asserted.
        for (const [i, r] of rows.entries()) {
          if (r.disabled) continue;
          expect(r.radius, `${r.id} is round`).toBe('50%');
          expect(report[i].page, `${r.id} border on the surface`).toBeGreaterThanOrEqual(3);
          expect(report[i].own, `${r.id} border on its own fill`).toBeGreaterThanOrEqual(3);
          if (r.invalid) expect(r.border, `${r.id} border is the error colour`).toBe(r.errorColour);
          else expect(r.border, `${r.id} border is not the error colour`).not.toBe(r.errorColour);
        }
        expect(new Set(rows.filter((r) => r.invalid).map((r) => r.group)), 'error groups').toEqual(new Set(withError.map((k) => `radiogroup-${k}`)));
      });

      it('RF-11: selected, the dot is 3:1 against the circle and the circle 3:1 against the surface, in every size and in error', { timeout: 60_000 }, async () => {
        // Real selecting: the second option of each enabled group is pressed, the way a user does.
        for (const key of keys.filter((k) => k !== 'disabled' && k !== 'selected')) await page.locator(`label[for="${radio(key, 1)}"]`).click();
        const rows = await page.evaluate(() => {
          const g = (window as unknown as { __museum: Museum }).__museum;
          return [...document.querySelectorAll<HTMLInputElement>('input.museum-radio')].map((el) => {
            const s = getComputedStyle(el);
            const dot = getComputedStyle(el, '::before');
            const ground = g.ground(el.parentElement);
            return {
              id: el.id, checked: el.checked, invalid: el.closest('fieldset')!.getAttribute('aria-invalid') === 'true', size: s.width,
              dot: dot.backgroundColor, scale: dot.transform, dotWidth: parseFloat(dot.width), circle: g.rgb(g.over(g.parse(s.backgroundColor), ground)), page: g.rgb(ground), border: s.borderTopColor,
            };
          });
        });
        const checked = rows.filter((r) => r.checked);
        console.log(`${framework} ${theme} RF-11`, JSON.stringify(checked.map((r) => ({ id: r.id, size: r.size, dot: ratio(r.dot, r.circle), circle: ratio(r.circle, r.page) }))));
        expect(checked.map((r) => r.id).sort(), 'every enabled group has its choice').toEqual(keys.filter((k) => k !== 'disabled').map((k) => radio(k, 1)).sort());
        for (const r of checked) {
          expect(r.scale, `${r.id} dot is shown`).toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(r.dotWidth, `${r.id} dot has a size`).toBeGreaterThanOrEqual(4);
          expect(ratio(r.dot, r.circle), `${r.id} dot on circle`).toBeGreaterThanOrEqual(3);
          expect(ratio(r.circle, r.page), `${r.id} circle on the surface`).toBeGreaterThanOrEqual(3);
        }
        expect(checked.filter((r) => r.invalid).length, 'error groups measured selected').toBeGreaterThanOrEqual(2);
        expect(new Set(checked.map((r) => r.size)), 'the three sizes were measured').toEqual(new Set(['16px', '18px']));
        for (const r of rows.filter((r) => !r.checked)) expect(r.scale, `${r.id} unselected has no dot`).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
      });

      it('RF-12: legend, labels, hint, error and marker are 4.5:1, the disabled group and its error included', async () => {
        const texts = (await visibleTexts(page)).filter((t) => fieldTexts.has(t.text));
        const rated = texts.map((t) => ({ text: t.text, ratio: ratio(t.fg, t.bg) }));
        console.log(`${framework} ${theme} RF-12 texts`, JSON.stringify(rated));
        expect(new Set(texts.map((t) => t.text)), 'every group text was found').toEqual(fieldTexts);
        expect(rated.filter((r) => r.ratio < 4.5)).toEqual([]);
        // The dimming of a disabled group reaches the circles only: its legend, labels and error keep their full opacity.
        const opacity = await page.evaluate(() => {
          const total = (el: Element) => {
            let o = 1;
            for (let n: Element | null = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
            return o;
          };
          return ['#radiogroup-disabled legend', '#radiogroup-disabled label', '#radiogroup-disabled-error'].map((s) => total(document.querySelector(s)!));
        });
        expect(opacity, 'disabled legend, label and error opacity').toEqual([1, 1, 1]);
      });

      it('RF-13: circle and label together are at least 24 x 24 px, in every size', async () => {
        const rows = await page.evaluate((ids) => ids.map((id) => {
          const box = document.getElementById(id)!.getBoundingClientRect();
          const label = document.querySelector(`label[for="${id}"]`)!.getBoundingClientRect();
          return { id, width: Math.max(box.right, label.right) - Math.min(box.left, label.left), height: Math.max(box.bottom, label.bottom) - Math.min(box.top, label.top) };
        }), keys.flatMap((k) => [0, 1].map((i) => radio(k, i))));
        console.log(`${framework} ${theme} RF-13`, JSON.stringify(rows.map((r) => ({ ...r, width: +r.width.toFixed(1), height: +r.height.toFixed(1) }))));
        expect(rows.length).toBeGreaterThan(20);
        for (const r of rows) {
          expect(r.width, `${r.id} width`).toBeGreaterThanOrEqual(24);
          expect(r.height, `${r.id} height`).toBeGreaterThanOrEqual(24);
        }
      });

      it('RF-14: with Tab the ring is 3:1 and outside the circle, and the border stays visible (the error one in the error colour)', { timeout: 60_000 }, async () => {
        const reached = await walk();
        const report = reached.map((r) => ({ id: r.id, ring: ratio(r.ring, r.around), border: ratio(r.border, r.ground), width: r.width, offset: r.offset, error: r.borderIsError }));
        console.log(`${framework} ${theme} RF-14`, JSON.stringify(report));
        expect(reached.map((r) => r.group).sort(), 'Tab reached each enabled group').toEqual(reachable.map((k) => `radiogroup-${k}`).sort());
        for (const r of reached) {
          expect(r.style, `${r.id} outline style`).not.toBe('none');
          expect(r.width, `${r.id} ring width`).toBeGreaterThanOrEqual(2);
          expect(r.offset, `${r.id} ring offset`).toBeGreaterThan(0);
          expect(ratio(r.ring, r.around), `${r.id} ring against what surrounds it`).toBeGreaterThanOrEqual(3);
          expect(ratio(r.border, r.ground), `${r.id} border against the surface while focused`).toBeGreaterThanOrEqual(3);
        }
        expect(reached.filter((r) => r.borderIsError).map((r) => r.group).sort(), 'the error border survives the focus').toEqual(['radiogroup-both', 'radiogroup-error']);
      });

      it('RF-15: with forced colours the selected and the unselected circle differ, and the dot differs from its circle, also in error', async () => {
        await page.locator(`label[for="${radio('error', 1)}"]`).click();
        await page.emulateMedia({ forcedColors: 'active' });
        try {
          const read = () => page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
            const el = document.getElementById(id)!;
            const s = getComputedStyle(el);
            const dot = getComputedStyle(el, '::before');
            return [id, { bg: s.backgroundColor, border: s.borderTopColor, dot: dot.backgroundColor, scale: dot.transform, forced: matchMedia('(forced-colors: active)').matches }];
          })), [radio('selected', 0), radio('selected', 1), radio('error', 0), radio('error', 1)]);
          const r = await read();
          console.log(`${framework} ${theme} RF-15`, JSON.stringify(r));
          expect(r[radio('selected', 0)].forced, 'forced colours are on').toBe(true);
          expect(r[radio('selected', 1)].bg, 'selected vs unselected fill').not.toBe(r[radio('selected', 0)].bg);
          expect(r[radio('selected', 1)].border, 'selected vs unselected border').not.toBe(r[radio('selected', 0)].border);
          expect(r[radio('selected', 1)].dot, 'dot vs its circle').not.toBe(r[radio('selected', 1)].bg);
          expect(r[radio('selected', 1)].scale, 'dot drawn').toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(r[radio('selected', 0)].scale, 'no dot when unselected').not.toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(r[radio('error', 1)].bg, 'error: selected vs unselected fill').not.toBe(r[radio('error', 0)].bg);
          expect(r[radio('error', 1)].dot, 'error: dot vs its circle').not.toBe(r[radio('error', 1)].bg);
          expect(r[radio('error', 0)].border, 'error: unselected border vs its fill').not.toBe(r[radio('error', 0)].bg);
        } finally {
          await page.emulateMedia({ forcedColors: null });
        }
      });

      it('RF-16: a disabled group or option is skipped by Tab and the arrows, and pressing it changes nothing', { timeout: 60_000 }, async () => {
        const reached = await walk();
        expect(reached.map((r) => r.id).filter((id) => id.startsWith('radiogroup-disabled')), 'Tab skips the disabled group').toEqual([]);
        expect(reached.map((r) => r.id), 'Tab skips the disabled option').not.toContain(radio('partial', 2));
        for (const i of [0, 1, 2]) expect(await page.locator(`#${radio('disabled', i)}`).isDisabled(), `disabled/${i}`).toBe(true);
        expect(await page.locator(`#${radio('partial', 2)}`).isDisabled()).toBe(true);
        expect(await page.locator(`#${radio('partial', 1)}`).isDisabled()).toBe(false);
        // The arrows jump over the disabled option: A, B, then back to A.
        await page.locator(`#${radio('partial', 0)}`).focus();
        await page.keyboard.press('ArrowDown');
        expect(await activeId(), 'ArrowDown reaches B').toBe(radio('partial', 1));
        await page.keyboard.press('ArrowDown');
        expect(await activeId(), 'ArrowDown skips C and wraps to A').toBe(radio('partial', 0));
        expect(await checkedOf('partial')).toEqual([true, false, false]);
        // Pressing a disabled label (forced, since a disabled control is not actionable) selects nothing.
        await page.locator(`label[for="${radio('disabled', 1)}"]`).click({ force: true });
        await page.locator(`label[for="${radio('partial', 2)}"]`).click({ force: true });
        expect(await checkedOf('disabled'), 'the disabled group stays empty').toEqual([false, false, false]);
        expect(await checkedOf('partial'), 'the disabled option stays unselected').toEqual([true, false, false]);
        console.log(`${framework} ${theme} RF-16`, JSON.stringify({ entries: reached.map((r) => r.id) }));
      });

      it('a long label wraps at 320 px beside the circle, which stays on the first line, without overflowing', async () => {
        await page.setViewportSize({ width: 320, height: 800 });
        try {
          const m = await page.evaluate(() => {
            const box = document.getElementById('radiogroup-long-1')!.getBoundingClientRect();
            const label = document.querySelector('label[for="radiogroup-long-1"]')!.getBoundingClientRect();
            const field = document.getElementById('radiogroup-long')!;
            return { box: { top: box.top, width: box.width, height: box.height }, label: { top: label.top, right: label.right, height: label.height }, fieldRight: field.getBoundingClientRect().right, scroll: field.scrollWidth, client: field.clientWidth, view: innerWidth };
          });
          console.log(`${framework} ${theme} long label`, JSON.stringify(m));
          expect(m.label.height, 'the label wraps').toBeGreaterThan(48);
          expect(m.scroll, 'the group does not overflow').toBeLessThanOrEqual(m.client);
          expect(m.label.right, 'label inside the group').toBeLessThanOrEqual(m.fieldRight + 0.5);
          expect(m.label.right, 'label inside the viewport').toBeLessThanOrEqual(m.view);
          expect(m.box.width, 'the circle keeps its size').toBeGreaterThanOrEqual(16);
          expect(Math.abs(m.box.top - m.label.top - (24 - m.box.height) / 2), 'circle centred on the first line').toBeLessThanOrEqual(0.5);
        } finally {
          await page.setViewportSize({ width: 1024, height: 900 });
        }
      });
    });
  });
}
