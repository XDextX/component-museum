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
type Step = { name: string; group?: string };
const typeSteps = names.slice(1, 6);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('scripts/test.mjs steps (spec 017, RF-9)', () => {
  it('keeps the commands of the old chain, without the packages/react build', () => {
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

  it('runs the five type steps as one parallel group, between gallery:astro and vitest', () => {
    expect(testSteps.map((step: Step) => step.group)).toEqual([undefined, 'tipos', 'tipos', 'tipos', 'tipos', 'tipos', undefined]);
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
      run: (step: Step) => (ran.push(step.name), step.name === 'gallery:astro' ? 2 : 0),
      dir,
      log: (line: string) => out.push(line),
    });
    expect(code).toBe(2);
    expect(ran).toEqual(['gallery:astro']);
    expect(out.join('\n')).not.toContain('vitest');
  });

  it('starts the whole type group together, and waits for the slow step before moving on', async () => {
    const events: string[] = [];
    await runTests({
      run: async (step: Step) => {
        events.push(`start ${step.name}`);
        if (step.name === 'tsc --noEmit') await sleep(150);
        events.push(`end ${step.name}`);
        return 0;
      },
      dir,
      log: () => {},
    });
    const at = (event: string) => events.indexOf(event);
    expect(Math.max(...typeSteps.map((name) => at(`start ${name}`)))).toBeLessThan(at('end tsc --noEmit'));
    expect(at('start vitest')).toBeGreaterThan(at('end tsc --noEmit'));
    expect(at('start tsc --noEmit')).toBeGreaterThan(at('end gallery:astro'));
  });

  it('a failing type step stops before vitest with its own code and still lets the others finish', async () => {
    const ran: string[] = [];
    const out: string[] = [];
    const code = await runTests({
      run: async (step: Step) => {
        await sleep(step.name === 'tsc --noEmit' ? 100 : 0);
        ran.push(step.name);
        return step.name === 'tsc --noEmit' ? 2 : 0;
      },
      dir,
      log: (line: string) => out.push(line),
    });
    expect(code).toBe(2);
    expect(ran).toEqual(expect.arrayContaining(typeSteps));
    expect(ran).not.toContain('vitest');
    expect(out.join('\n')).toMatch(/tsc --noEmit.*2/);
  });

  it('with several failing type steps returns non-zero and names every one', async () => {
    const out: string[] = [];
    const code = await runTests({
      run: (step: Step) => (step.name === 'tsc --noEmit' ? 2 : step.name === 'astro check --root packages/astro' ? 3 : 0),
      dir,
      log: (line: string) => out.push(line),
    });
    expect(code).not.toBe(0);
    const text = out.join('\n');
    expect(text).toMatch(/tsc --noEmit.*2/);
    expect(text).toMatch(/astro check --root packages\/astro.*3/);
    expect(text).not.toMatch(/\bvitest\b/);
  });

  it('gives each type step its time and the group its own, without counting them twice in the total', async () => {
    const out: string[] = [];
    await runTests({ run: () => sleep(20).then(() => 0), dir, log: (line: string) => out.push(line) });
    const rows = out.join('\n').split('\n');
    for (const name of typeSteps) expect(rows.some((row) => row.includes(name))).toBe(true);
    expect(rows.find((row) => row.startsWith('tipos'))).toMatch(/\|\s+0\.\d\s+\|/);
    // 3 serial stages of ~20 ms: summing the five steps too would give a total >= 0.1 s
    const total = Number(rows.at(-1)!.match(/\|\s+([\d.]+)\s+\|/)![1]);
    expect(total).toBeLessThan(0.2);
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
