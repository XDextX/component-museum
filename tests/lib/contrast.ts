import type { Page } from 'playwright-core';

export type VisibleText = { tag: string; text: string; fg: string; bg: string };

/**
 * Every element holding visible text on `page`: its colour and the background composed under it,
 * layer by layer (spec 007, RF-5; moved here by spec 008, T-1 so the story views share it).
 */
export async function visibleTexts(page: Page): Promise<VisibleText[]> {
  return page.evaluate(() => {
    type C = [number, number, number, number];
    const parse = (c: string): C => {
      const m = /rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/.exec(c);
      return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 0];
    };
    const over = (top: C, under: C): C => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as C;
    const rgb = (c: C) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;
    const out: { tag: string; text: string; fg: string; bg: string }[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement!;
      if (!t.textContent!.trim() || seen.has(el)) continue;
      seen.add(el);
      const box = el.getBoundingClientRect();
      // Visually hidden text (sb-sr-only: 1px, clipped) is read, not seen.
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || box.width <= 1 || box.height <= 1) continue;
      const layers: C[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c[3] === 0) continue;
        layers.push(c);
        if (c[3] === 1) break;
      }
      const ground = layers.reduceRight<C>((under, top) => over(top, under), [255, 255, 255, 1]);
      out.push({ tag: el.tagName.toLowerCase(), text: t.textContent!.trim().slice(0, 40), fg: rgb(over(parse(getComputedStyle(el).color), ground)), bg: rgb(ground) });
    }
    return out;
  });
}
