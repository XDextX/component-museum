import { join } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { contrastRatio, parseRgb } from './lib/css.ts';
import type { Framework } from './lib/paths.ts';
import { serve, type Served } from './lib/serve.ts';

const consumers = inject('consumers');
const frameworks: Framework[] = ['react', 'astro'];
const themes = ['light', 'dark'] as const;

type Measured = { id: string; fg: string; bg: string; outlineWidth: number; outlineStyle: string; outlineColor: string; ground: string };

// Buttons are focused with real Tab presses; the disabled ones are exempt from the WCAG contrast rule
// (1.4.3 excludes inactive components), and the consumers render none, so they are skipped here by :disabled.
async function measure(url: string, colorScheme: 'light' | 'dark'): Promise<Measured[]> {
  const browser: Browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await (await browser.newContext({ colorScheme })).newPage();
    await page.goto(url);
    await page.waitForSelector('#button-primary-md');
    const total = await page.locator('button, a, input, select, textarea, [tabindex]').count();
    const out: Measured[] = [];
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Tab');
      const m = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || !/^button-(primary|secondary|outline)-(sm|md|lg)$/.test(el.id) || (el as HTMLButtonElement).disabled) return null;
        const s = getComputedStyle(el);
        // The ring sits outside the box, on the ground the theme draws: its --museum-surface token, resolved
        // by the browser (the build may have shortened it to #fff).
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'var(--museum-surface)';
        document.body.append(probe);
        const ground = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          id: el.id, fg: s.color, bg: s.backgroundColor, outlineWidth: parseFloat(s.outlineWidth), outlineStyle: s.outlineStyle,
          outlineColor: s.outlineColor, ground,
        };
      });
      if (m) out.push(m);
    }
    return out;
  } finally {
    await browser.close();
  }
}

describe('Button accessibility in both themes (RF-11, constitution 7)', { timeout: 60_000 }, () => {
  const servers: Served[] = [];
  const urls = {} as Record<Framework, string>;
  beforeAll(async () => {
    for (const f of frameworks) {
      const s = await serve(join(consumers.plain[f], 'dist'));
      servers.push(s);
      urls[f] = s.url;
    }
  });
  afterAll(() => Promise.all(servers.map((s) => s.close())));

  for (const framework of frameworks) {
    for (const theme of themes) {
      it(`${framework}, ${theme}: text is 4.5:1 on its own background and Tab shows a 3:1 ring of 2px or more`, async () => {
        const buttons = await measure(urls[framework], theme);
        expect(buttons.map((b) => b.id).sort(), 'Tab did not reach all nine Buttons').toHaveLength(9);
        const report = buttons.map((b) => {
          const ratio = contrastRatio(parseRgb(b.fg), parseRgb(b.bg));
          const ring = contrastRatio(parseRgb(b.outlineColor), parseRgb(b.ground));
          return { id: b.id, text: Number(ratio.toFixed(2)), ring: Number(ring.toFixed(2)), width: b.outlineWidth, style: b.outlineStyle };
        });
        console.log(`${framework} ${theme}`, JSON.stringify(report));
        for (const r of report) {
          expect(r.text, `${r.id} text contrast`).toBeGreaterThanOrEqual(4.5);
          expect(r.style, `${r.id} focus outline style`).not.toBe('none');
          expect(r.width, `${r.id} focus outline width`).toBeGreaterThanOrEqual(2);
          expect(r.ring, `${r.id} focus ring contrast`).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }
});
