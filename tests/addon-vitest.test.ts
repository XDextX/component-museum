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

// Spec 015 RF-2 and RF-6: the wiring that makes `npm test` run the stories, and run them under the lock. Read as text
// like RF-3: unplugging any of the three links leaves every other test green, so something must name them.
describe('the story tests are wired into npm test (spec 015 RF-2, RF-6)', () => {
  // Comments are dropped first: a line commented out unplugs the link as surely as deleting it.
  // shortcut: a `//` inside a string literal would cut the line, none of the three files has one; upgrade if one does.
  const read = (...path: string[]): string =>
    readFileSync(join(root, ...path), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it("lists 'gallery/vitest.config.ts' in the projects of vitest.config.ts", () => {
    expect(read('vitest.config.ts')).toMatch(/'gallery\/vitest\.config\.ts'/);
  });

  it('gives the stories project the globalSetup that takes the lock', () => {
    expect(read('gallery', 'vitest.config.ts')).toMatch(/\bglobalSetup:\s*\[[^\]]*stories-setup\.ts/);
  });

  it('takes the lock in stories-setup.ts unless it is a watch run', () => {
    // The two statements back to back: the watch guard, then the lock. Losing, inverting or short-circuiting either breaks the pair.
    expect(read('tests', 'stories-setup.ts')).toMatch(
      /if \(project\.vitest\.config\.watch\) return \(\) => \{\};\s*return acquireLock\(/,
    );
  });
});
