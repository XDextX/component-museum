import { describe, expect, it } from 'vitest';
import { atRules, contrastRatio, parseRgb } from './lib/css.ts';

const black = { r: 0, g: 0, b: 0, a: 1 };
const white = { r: 255, g: 255, b: 255, a: 1 };
const grey767676 = { r: 0x76, g: 0x76, b: 0x76, a: 1 };

describe('atRules', () => {
  it('lists the at-rules in order, nested ones included', () => {
    const css = '@layer base, components; @layer components.museum { @media (min-width: 1px) { a { color: red } } }';
    expect(atRules(css)).toEqual(['layer', 'layer', 'media']);
  });

  it('lists the non-standard ones the guard must catch', () => {
    expect(atRules('a { @apply px-4; } @import "x.css"; @tailwind base;')).toEqual(['apply', 'import', 'tailwind']);
  });

  it('ignores at-rules inside comments, on one line or several', () => {
    expect(atRules('/* @apply x */ a { color: red } /*\n@import "y";\n*/')).toEqual([]);
  });

  it('is empty for a sheet with no at-rules', () => {
    expect(atRules('a { color: red }')).toEqual([]);
  });
});

describe('parseRgb', () => {
  it('reads rgb() with an opaque alpha', () => {
    expect(parseRgb('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it('reads rgba() with its alpha', () => {
    expect(parseRgb('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it('reads the space-separated form with a slash alpha', () => {
    expect(parseRgb('rgb(255 0 128 / 0.25)')).toEqual({ r: 255, g: 0, b: 128, a: 0.25 });
  });

  it('throws on a value that is not rgb()', () => {
    expect(() => parseRgb('transparent')).toThrow();
    expect(() => parseRgb('#fff')).toThrow();
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, in both directions', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 4);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 4);
  });

  it('is 1 for two equal colours', () => {
    expect(contrastRatio(white, white)).toBeCloseTo(1, 4);
  });

  it('is 4.5422 for #767676 on white (WCAG reference)', () => {
    expect(contrastRatio(grey767676, white)).toBeCloseTo(4.5422, 4);
  });
});
