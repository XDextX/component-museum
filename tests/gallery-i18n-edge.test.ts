import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec 016, T-5. Closing Edge takes 0.3 s alone, ~2.4 s with 12 closing at once and up to 24 s in the full
// `npm test` (measured 2026-11-04), so every launch of Edge in a file is one more chance of a `Hook timed out`.
// gallery-i18n launched Edge once per component docs page (6 times in a row); one per file is enough, as each
// test opens its own context. Timing under load cannot be asserted; the structure that causes it can.
describe('gallery-i18n.test.ts launches Edge once per file (spec 016, T-5)', () => {
  const source = readFileSync(resolve(import.meta.dirname, 'gallery-i18n.test.ts'), 'utf8');

  it('launches it before the per-component describe, not inside it', () => {
    expect(source.indexOf('chromium.launch(')).toBeLessThan(source.indexOf('describe.each('));
  });
});
