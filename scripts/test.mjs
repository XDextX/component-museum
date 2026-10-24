// `npm test` (spec 017, RF-9): runs the steps in order, stops at the first failure with its exit code,
// and ends with a table of phases (seconds, cache hit or build). Node only, no dependencies.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cacheDir, repoRoot } from './cache.mjs';

export const testSteps = [
  { name: 'gallery:astro', command: 'npm run gallery:astro' },
  ...[
    'tsc --noEmit',
    'tsc --noEmit -p gallery',
    'astro check --root tests/fixtures/test-package',
    'astro check --root packages/astro',
    'astro check --root gallery/astro-render',
    'vitest run',
  ].map((command) => ({ name: command === 'vitest run' ? 'vitest' : command, command })),
];

const label = { hit: 'acierto', built: 'construido' };

/** A text table: fase | segundos | caché, one row per phase and a total line. */
export function formatTable(rows, total) {
  const lines = [...rows.map((row) => [row.name, row.seconds.toFixed(1), label[row.cache] ?? '—']), ['total', total.toFixed(1), '']];
  const head = ['fase', 'segundos', 'caché'];
  const width = [0, 1].map((i) => Math.max(head[i].length, ...lines.map((line) => line[i].length)));
  const format = (line) => `${line[0].padEnd(width[0])} | ${line[1].padStart(width[1])} | ${line[2]}`.trimEnd();
  return [format(head), `${'-'.repeat(width[0] + 1)}|${'-'.repeat(width[1] + 2)}|${'-'.repeat(8)}`, ...lines.map(format)].join('\n');
}

function runStep(step) {
  return spawnSync(step.command, { cwd: repoRoot, stdio: 'inherit', shell: true }).status ?? 1;
}

/** Runs the steps; returns 0, or the exit code of the first one that fails. `run` and `dir` are for tests. */
export async function runTests({ steps = testSteps, run = runStep, dir = cacheDir, log = console.log } = {}) {
  // An entry from an earlier run must not be added to this run's table.
  mkdirSync(dir, { recursive: true });
  rmSync(join(dir, 'phases.json'), { force: true });
  const rows = [];
  let code = 0;
  for (const step of steps) {
    const started = performance.now();
    code = await run(step);
    rows.push({ name: step.name, seconds: (performance.now() - started) / 1000, cache: null });
    if (code !== 0) break;
  }
  let phases = {};
  try {
    phases = JSON.parse(readFileSync(join(dir, 'phases.json'), 'utf8'));
  } catch {}
  for (const row of rows) row.cache = phases[row.name]?.cache ?? null;
  // The globalSetup runs inside the vitest step: list its phases just before it.
  const setup = Object.entries(phases)
    .filter(([name]) => name.startsWith('globalSetup: '))
    .map(([name, phase]) => ({ name, seconds: phase.seconds, cache: phase.cache }));
  const at = rows.findIndex((row) => row.name === 'vitest');
  rows.splice(at < 0 ? rows.length : at, 0, ...setup);
  const total = rows.filter((row) => !row.name.startsWith('globalSetup: ')).reduce((sum, row) => sum + row.seconds, 0);
  log(`\n${formatTable(rows, total)}`);
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runTests();
