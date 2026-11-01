import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const installed = (name: string): string =>
  JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;

// Spec 015 RF-1: the addon and its peers go with the exact version of what they plug into.
describe('the story-test addon and its peers (spec 015 RF-1)', () => {
  it('@storybook/addon-vitest is the installed version of storybook', () => {
    expect(installed('@storybook/addon-vitest')).toBe(installed('storybook'));
  });

  it('@vitest/browser-playwright is the installed version of vitest', () => {
    expect(installed('@vitest/browser-playwright')).toBe(installed('vitest'));
  });

  it('playwright is the installed version of playwright-core', () => {
    expect(installed('playwright')).toBe(installed('playwright-core'));
  });
});

// Spec 015 RF-3: the story tests run in the system Edge, so nothing downloads a browser.
describe('the story-test project launches the system Edge (spec 015 RF-3)', () => {
  it("names the 'msedge' channel in gallery/vitest.config.ts", () => {
    const config = readFileSync(join(root, 'gallery', 'vitest.config.ts'), 'utf8');
    expect(config).toMatch(/channel:\s*'msedge'/);
  });
});
