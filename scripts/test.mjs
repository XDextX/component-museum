// `npm test` (spec 017, RF-9, T-10): runs the steps in order, with the steps of one `group` side by side;
// stops at the first stage that fails, with its exit code, and ends with a table of phases (seconds,
// cache hit or build). Node only, no dependencies.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cacheDir, repoRoot } from './cache.mjs';

// gallery:astro goes first and alone: the astro checks read its output.
export const testSteps = [
  { name: 'gallery:astro', command: 'npm run gallery:astro' },
  ...[
    'tsc --noEmit',
    'tsc --noEmit -p gallery',
    'astro check --root tests/fixtures/test-package',
    'astro check --root packages/astro',
    'astro check --root gallery/astro-render',
  ].map((command) => ({ name: command, command, group: 'tipos' })),
  { name: 'vitest', command: 'vitest run' },
];

const label = { hit: 'acierto', built: 'construido' };

/** A text table: fase | segundos | caché, one row per phase and a total line. */
export function formatTable(rows, total) {
  const lines = [...rows.map((row) => [(row.nested ? '  ' : '') + row.name, row.seconds.toFixed(1), label[row.cache] ?? '—']), ['total', total.toFixed(1), '']];
  const head = ['fase', 'segundos', 'caché'];
  const width = [0, 1].map((i) => Math.max(head[i].length, ...lines.map((line) => line[i].length)));
  const format = (line) => `${line[0].padEnd(width[0])} | ${line[1].padStart(width[1])} | ${line[2]}`.trimEnd();
  return [format(head), `${'-'.repeat(width[0] + 1)}|${'-'.repeat(width[1] + 2)}|${'-'.repeat(8)}`, ...lines.map(format)].join('\n');
}

/** Runs one step; its output is printed whole when it ends, so parallel steps do not interleave. */
function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, { cwd: repoRoot, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => chunks.push(chunk));
    child.on('error', () => resolve(1));
    child.on('close', (status) => {
      process.stdout.write(Buffer.concat(chunks));
      resolve(status ?? 1);
    });
  });
}

/**
 * Runs the steps; consecutive steps with the same `group` run together. Returns 0, or the exit code of the
 * first failing step; a group lets every step finish and names each one that failed. `run` (sync or async),
 * `dir` and `log` are for tests.
 */
export async function runTests({ steps = testSteps, run = runStep, dir = cacheDir, log = console.log } = {}) {
  // An entry from an earlier run must not be added to this run's table.
  mkdirSync(dir, { recursive: true });
  rmSync(join(dir, 'phases.json'), { force: true });
  const rows = [];
  let code = 0;
  for (let i = 0; i < steps.length && code === 0; ) {
    const group = steps[i].group;
    const stage = group ? steps.filter((step, at) => at >= i && step.group === group) : [steps[i]];
    i += stage.length;
    const started = performance.now();
    const codes = await Promise.all(
      stage.map(async (step) => {
        const stepStarted = performance.now();
        const status = await run(step);
        rows.push({ name: step.name, seconds: (performance.now() - stepStarted) / 1000, cache: null, nested: Boolean(group) });
        return status;
      }),
    );
    if (group) rows.push({ name: group, seconds: (performance.now() - started) / 1000, cache: null, parallel: true });
    code = codes.find((status) => status !== 0) ?? 0;
    if (group && code !== 0) log(`
fallaron: ${stage.flatMap((step, at) => (codes[at] === 0 ? [] : [`${step.name} (${codes[at]})`])).join(', ')}`);
  }
  let phases = {};
  try {
    phases = JSON.parse(readFileSync(join(dir, 'phases.json'), 'utf8'));
  } catch {}
  for (const row of rows) row.cache = row.parallel ? null : (phases[row.name]?.cache ?? null);
  // The globalSetup runs inside the vitest step: list its phases just before it.
  const setup = Object.entries(phases)
    .filter(([name]) => name.startsWith('globalSetup: '))
    .map(([name, phase]) => ({ name, seconds: phase.seconds, cache: phase.cache }));
  const at = rows.findIndex((row) => row.name === 'vitest');
  rows.splice(at < 0 ? rows.length : at, 0, ...setup);
  const total = rows.filter((row) => !row.nested && !row.name.startsWith('globalSetup: ')).reduce((sum, row) => sum + row.seconds, 0);
  log(`\n${formatTable(rows, total)}`);
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runTests();
