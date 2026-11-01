// Honest build cache (spec 017): a stored build is reused only when its key, a hash of everything its
// output depends on, matches and its outputs exist. Node only, no dependencies.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const cacheDir = join(repoRoot, 'node_modules', '.museum-cache');

const skipped = new Set(['node_modules', 'dist', '.astro']);

/** Every file under each entry (a file, or a folder walked without node_modules, dist and .astro), sorted. */
function expand(root, entries) {
  const out = new Set();
  const walk = (path) => {
    if (existsSync(path) && statSync(path).isDirectory()) {
      for (const name of readdirSync(path)) if (!skipped.has(name)) walk(join(path, name));
    } else out.add(path);
  };
  for (const entry of entries) walk(resolve(root, entry));
  return [...out].sort();
}

/**
 * sha256 over each input file's repo-relative path and bytes (sorted by path, a missing file counts as
 * missing), then over `extra` sorted by key. `files` are paths relative to `root`: files or folders.
 */
export function inputKey(root, files, extra = {}) {
  const hash = createHash('sha256');
  for (const file of expand(root, files)) {
    hash.update(`file:${relative(root, file).split(sep).join('/')}\0`);
    hash.update(existsSync(file) ? readFileSync(file) : 'missing');
    hash.update('\0');
  }
  for (const key of Object.keys(extra).sort()) hash.update(`extra:${key}=${extra[key]}\0`);
  return hash.digest('hex');
}

/** Node and npm versions, which belong to every key. */
export function toolVersions() {
  const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  let npm = 'unknown';
  try {
    npm = JSON.parse(readFileSync(join(dirname(npmCli), '..', 'package.json'), 'utf8')).version;
  } catch {}
  return { node: process.version, npm };
}

/**
 * Runs `build` unless the stored key equals `key` and every output exists. The stored key is removed
 * before building and written last, atomically, so a build cut short never has a key.
 */
export async function cached(name, key, outputs, build, dir = cacheDir) {
  const keyFile = join(dir, `${name}.key`);
  let stored = null;
  try {
    stored = readFileSync(keyFile, 'utf8');
  } catch {}
  if (stored === key && outputs.every((output) => existsSync(output))) return 'hit';
  rmSync(keyFile, { force: true });
  await build();
  mkdirSync(dir, { recursive: true });
  const temporary = `${keyFile}.${process.pid}.tmp`;
  writeFileSync(temporary, key);
  renameSync(temporary, keyFile);
  return 'built';
}

/** Adds one phase to phases.json: its seconds and whether the cache hit, built, or does not apply (null). */
export function recordPhase(name, seconds, cache = null, dir = cacheDir) {
  const file = join(dir, 'phases.json');
  let phases = {};
  try {
    phases = JSON.parse(readFileSync(file, 'utf8'));
  } catch {}
  phases[name] = { seconds: Math.round(seconds * 10) / 10, cache };
  mkdirSync(dir, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(phases, null, 2));
  renameSync(temporary, file);
}

/** Inputs of the astro-render build and its extraction. */
export function astroRenderInputs() {
  return {
    files: [
      'gallery/astro-render',
      'packages/astro/index.js',
      'packages/astro/index.d.ts',
      'packages/astro/package.json',
      'packages/astro/src',
      'packages/astro/styles.css',
      'gallery/lib/contract-args.ts',
      'gallery/scripts/extract-astro.mjs',
      'contracts',
      'styles/museum.css',
      'package-lock.json',
    ],
    extra: toolVersions(),
  };
}

/** Inputs of the Storybook build; compute the key after prepack, which writes dist and the stylesheets. */
export function storybookInputs() {
  return {
    files: [
      'gallery/.storybook',
      'gallery/stories',
      'gallery/lib',
      'gallery/generated',
      'gallery/package.json',
      'gallery/tsconfig.json',
      'gallery/env.d.ts',
      'packages/react/dist',
      'packages/react/styles.css',
      'packages/react/package.json',
      'packages/astro/styles.css',
      'contracts',
      'styles/museum.css',
      'package-lock.json',
    ],
    extra: toolVersions(),
  };
}
