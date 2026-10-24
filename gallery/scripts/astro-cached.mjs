// astro build of astro-render plus the extraction of its cases, once per set of inputs (spec 017, RF-2,
// RF-3, RF-4). `npm run gallery:astro` runs this; the globalSetup calls ensureAstroRender too and, when
// the script already ran, gets a hit instead of a second astro build.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { astroRenderInputs, cached, inputKey, recordPhase, repoRoot } from '../../scripts/cache.mjs';

/** The files extract-astro.mjs writes: one JSON per contract whose component the Astro package exports. */
function outputs() {
  const entry = readFileSync(join(repoRoot, 'packages', 'astro', 'index.js'), 'utf8');
  const exported = new Set([...entry.matchAll(/default as (\w+)/g)].map((m) => m[1]));
  const json = readdirSync(join(repoRoot, 'contracts'))
    .filter((f) => f.endsWith('.contract.json'))
    .map((f) => JSON.parse(readFileSync(join(repoRoot, 'contracts', f), 'utf8')).name)
    .filter((name) => exported.has(name))
    .map((name) => join(repoRoot, 'gallery', 'generated', `astro-${name.toLowerCase()}.json`));
  return [join(repoRoot, 'gallery', 'astro-render', 'dist', 'index.html'), ...json];
}

/** Builds and extracts unless the stored build is still valid; records the phase under `phase`. */
export async function ensureAstroRender(phase = 'gallery:astro') {
  const started = performance.now();
  const { files, extra } = astroRenderInputs();
  const result = await cached('astro-render', inputKey(repoRoot, files, extra), outputs(), async () => {
    const run = (args) => execFileSync(process.execPath, args, { cwd: repoRoot, stdio: 'inherit' });
    run([join(repoRoot, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build', '--root', join(repoRoot, 'gallery', 'astro-render')]);
    run([join(repoRoot, 'gallery', 'scripts', 'extract-astro.mjs')]);
  });
  recordPhase(phase, (performance.now() - started) / 1000, result);
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await ensureAstroRender();
  console.log(`astro-render: ${result === 'hit' ? 'unchanged, reusing the stored build' : 'built'}`);
}
