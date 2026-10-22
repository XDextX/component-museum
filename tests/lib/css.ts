export type Rgb = { r: number; g: number; b: number; a: number };

/** Names of the at-rules in a CSS text, comments excluded: `['layer', 'media', ...]`. */
export function atRules(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...code.matchAll(/@([a-zA-Z-]+)/g)].map((m) => m[1]);
}

/** Reads `rgb(1, 2, 3)` or `rgba(1, 2, 3, 0.5)` as `getComputedStyle` gives them; throws on anything else. */
export function parseRgb(computed: string): Rgb {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(computed.trim());
  if (!m) throw new Error(`Not an rgb() colour: ${computed}`);
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
}

// WCAG 2.1 relative luminance: sRGB channels linearised, then weighted.
function luminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio between two opaque colours, from 1 to 21; alpha is ignored. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
