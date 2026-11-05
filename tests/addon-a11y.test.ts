import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { a11yExceptions } from '../gallery/lib/a11y-exceptions.ts';

const root = join(import.meta.dirname, '..');
const installed = (name: string): string =>
  JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
// Comments are dropped first: a rule named only in a comment is not disabled.
// shortcut: a `//` inside a string literal would cut the line, none of these files has one; upgrade if one does.
const code = (...path: string[]): string =>
  readFileSync(join(root, ...path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

// Spec 016 RF-1: the addon goes with the exact version of storybook.
describe('the accessibility addon (spec 016 RF-1)', () => {
  it('@storybook/addon-a11y is the installed version of storybook', () => {
    expect(installed('@storybook/addon-a11y')).toBe(installed('storybook'));
  });

  it('is registered in main.ts', () => {
    expect(code('gallery', '.storybook', 'main.ts')).toMatch(/addons:\s*\[[^\]]*'@storybook\/addon-a11y'/);
  });
});

// Spec 016 RF-2: a violation fails the story test of every story.
describe('axe fails the story tests (spec 016 RF-2)', () => {
  it("sets a11y.test to 'error' in preview.ts", () => {
    expect(code('gallery', '.storybook', 'preview.ts')).toMatch(/a11y:\s*\{\s*test:\s*'error'/);
  });

  it('no story file overrides the a11y parameters', () => {
    const dir = join(root, 'gallery', 'stories');
    for (const file of readdirSync(dir)) expect(code('gallery', 'stories', file), file).not.toMatch(/\ba11y\b/);
  });
});

// Spec 016 RF-4: no rule is off without a written reason.
describe('the rules axe skips are the listed exceptions (spec 016 RF-4)', () => {
  it('gives every exception a rule and a reason', () => {
    expect(a11yExceptions.length).toBeGreaterThan(0);
    for (const { rule, reason } of a11yExceptions) {
      expect(rule.trim(), 'rule').not.toBe('');
      expect(reason.trim().length, `reason of ${rule}`).toBeGreaterThan(10);
    }
  });

  it('lists each rule once', () => {
    const rules = a11yExceptions.map(({ rule }) => rule);
    expect(new Set(rules).size).toBe(rules.length);
  });

  it('disables rules in preview.ts only from that list', () => {
    const preview = code('gallery', '.storybook', 'preview.ts');
    // The one place a rule is switched off is the map over the list; any other `enabled: false` or `disable` is a hidden exception.
    expect(preview.match(/enabled:\s*false/g)).toHaveLength(1);
    expect(preview).toMatch(/a11yExceptions\.map\(\(\{ rule \}\) => \(\{ id: rule, enabled: false \}\)\)/);
    expect(preview).not.toMatch(/\bdisable\s*:|\bexclude\s*:|\bruleset\b|runOnly|\bdisableOtherRules\b|test:\s*'(?:off|todo)'/);
  });
});

// Spec 016 RF-3: axe runs once on each gallery theme. Read as text, like the wiring of the 015: unplugging a project leaves the rest green.
describe('axe runs on the light and the dark canvas (spec 016 RF-3)', () => {
  it("lists the dark project's config in the projects of vitest.config.ts", () => {
    expect(code('vitest.config.ts')).toMatch(/'gallery\/vitest\.dark\.config\.ts'/);
  });

  it('gives each project the initial theme it is named for', () => {
    // One builder, so one place to check: the theme it receives sets both the name and the initial global.
    const light = code('gallery', 'vitest.config.ts');
    expect(light).toMatch(/initialGlobals:\s*\{\s*theme\s*\}/);
    expect(light).toMatch(/name:\s*`stories-\$\{theme\}`/);
    expect(light).toMatch(/export default themed\('light'\)/);
    expect(code('gallery', 'vitest.dark.config.ts')).toMatch(/export default themed\('dark'\)/);
  });
});
