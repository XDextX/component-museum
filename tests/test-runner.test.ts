import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recordPhase, repoRoot } from '../scripts/cache.mjs';
import { formatTable, runTests, testSteps } from '../scripts/test.mjs';

// The runner is data: the steps, the stop-at-first-failure rule and the table (spec 017, RF-9).
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cm-runner-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const names = testSteps.map((step) => step.name);
type Step = { name: string };

describe('scripts/test.mjs steps (spec 017, RF-9)', () => {
  it('keeps the order of the old chain, without the packages/react build', () => {
    expect(testSteps.map((step) => step.command)).toEqual([
      'npm run gallery:astro',
      'tsc --noEmit',
      'tsc --noEmit -p gallery',
      'astro check --root tests/fixtures/test-package',
      'astro check --root packages/astro',
      'astro check --root gallery/astro-render',
      'vitest run',
    ]);
  });

  it('is what `npm test` runs', () => {
    const scripts = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts;
    expect(scripts.test).toBe('node scripts/test.mjs');
  });
});

describe('runTests', () => {
  it('runs every step in order and returns 0', async () => {
    const ran: string[] = [];
    const code = await runTests({ run: (step: Step) => (ran.push(step.name), 0), dir, log: () => {} });
    expect(code).toBe(0);
    expect(ran).toEqual(names);
  });

  it('stops at the first failing step and returns its code', async () => {
    const ran: string[] = [];
    const out: string[] = [];
    const code = await runTests({
      run: (step: Step) => (ran.push(step.name), step.name === 'tsc --noEmit' ? 2 : 0),
      dir,
      log: (line: string) => out.push(line),
    });
    expect(code).toBe(2);
    expect(ran).toEqual(names.slice(0, 2));
    expect(out.join('\n')).not.toContain('vitest');
  });

  it('clears phases.json first, so an old entry is not counted', async () => {
    writeFileSync(join(dir, 'phases.json'), JSON.stringify({ 'globalSetup: old': { seconds: 99, cache: 'built' } }));
    const out: string[] = [];
    await runTests({
      run: (step: Step) => {
        if (step.name === 'vitest') recordPhase('globalSetup: storybook', 1.5, 'hit', dir);
        return 0;
      },
      dir,
      log: (line: string) => out.push(line),
    });
    const table = out.join('\n');
    expect(table).not.toContain('old');
    expect(table).toContain('globalSetup: storybook');
  });

  it('puts each step cache state from phases.json in the table', async () => {
    const out: string[] = [];
    mkdirSync(dir, { recursive: true });
    await runTests({
      run: (step: Step) => {
        if (step.name === 'gallery:astro') recordPhase('gallery:astro', 0.4, 'hit', dir);
        return 0;
      },
      dir,
      log: (line: string) => out.push(line),
    });
    expect(out.join('\n')).toMatch(/gallery:astro\s*\|\s*[\d.]+\s*\|\s*acierto/);
  });
});

describe('formatTable', () => {
  const table = formatTable(
    [
      { name: 'gallery:astro', seconds: 0.4, cache: 'hit' },
      { name: 'tsc --noEmit', seconds: 12.34, cache: null },
      { name: 'globalSetup: storybook', seconds: 30, cache: 'built' },
    ],
    42.74,
  ).split('\n');

  it('has a header, a separator, one row per phase and a total', () => {
    expect(table).toHaveLength(2 + 3 + 1);
    expect(table[0]).toMatch(/^fase\s+\|\s+segundos\s+\|\s+caché$/);
    expect(table[1]).toMatch(/^-+-\|-+-\|-+$/);
    expect(table.at(-1)).toMatch(/^total\s+\|\s+42\.7\s+\|\s*$/);
  });

  it('writes seconds with one decimal and the cache as acierto, construido or a dash', () => {
    expect(table[2]).toMatch(/^gallery:astro\s+\|\s+0\.4\s+\|\s+acierto$/);
    expect(table[3]).toMatch(/^tsc --noEmit\s+\|\s+12\.3\s+\|\s+—$/);
    expect(table[4]).toMatch(/^globalSetup: storybook\s+\|\s+30\.0\s+\|\s+construido$/);
  });

  it('aligns every line to the same column widths', () => {
    expect(new Set(table.map((line) => line.indexOf('|'))).size).toBe(1);
  });
});
