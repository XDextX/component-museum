import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { consumerDir, type Framework } from './paths.ts';
import { run, type RunResult } from './run.ts';

// shortcut: npm-cli.js next to node.exe is the Windows layout; under `npm test` npm_execpath wins.
const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

/** Pinned starters (plan 001, block 6): a new starter release never changes the suite. */
const starters: Record<Framework, string[]> = {
  react: ['--package=create-vite@9.3.0', '--', 'create-vite', '<dir>', '--template', 'react-ts', '--no-interactive', '--no-immediate'],
  astro: ['--package=create-astro@5.3.0', '--', 'create-astro', '<dir>', '--template', 'minimal', '--no-install', '--no-git', '--no-ai', '--skip-houston', '--yes'],
};

/** The file each starter builds from, where the package import goes. */
const entries: Record<Framework, string> = {
  react: join('src', 'main.tsx'),
  astro: join('src', 'pages', 'index.astro'),
};

/** Each starter's build config, the file the resolution guard patches. */
export const configFiles: Record<Framework, string> = {
  react: 'vite.config.ts',
  astro: 'astro.config.mjs',
};

export type ConsumerOptions = { guardResolution?: boolean };

function npm(args: string[], cwd: string, failure: string): string {
  const result = run(process.execPath, [npmCli, ...args], { cwd });
  if (result.code !== 0) throw new Error(`${failure}\n${result.output}`);
  return result.output;
}

function patch(file: string, edit: (source: string) => string): void {
  const source = readFileSync(file, 'utf8');
  const updated = edit(source);
  if (updated === source) throw new Error(`the pinned starter changed: nothing to patch in ${file}`);
  writeFileSync(file, updated);
}

/** Runs the pinned starter into `<parent>/<framework>`, from scratch, and returns that folder. */
export function scaffold(parent: string, framework: Framework): string {
  const dir = join(parent, framework);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(parent, { recursive: true });
  const starter = starters[framework].map((arg) => (arg === '<dir>' ? framework : arg));
  npm(['exec', '--yes', ...starter], parent, `sin red: no se pudo crear el starter de ${framework}`);
  return dir;
}

/** Packs `packageDir` into `destination` and returns the package name and the tarball path. */
export function packPackage(packageDir: string, destination: string): { name: string; path: string } {
  const [packed] = JSON.parse(npm(['pack', packageDir, '--json', '--pack-destination', destination], destination, `npm pack failed for ${packageDir}`));
  return { name: packed.name, path: join(destination, packed.filename) };
}

/** Packs `packageDir` next to the consumer, never inside the repo, and installs the tarball. */
export function installPackage(dir: string, packageDir: string): string {
  const packed = packPackage(packageDir, dirname(dir));
  // No --prefer-offline: with it npm trusts stale cached metadata and misses the starter's versions.
  npm(['install', '--no-audit', '--no-fund', packed.path], dir, `npm install failed in ${dir}`);
  return packed.name;
}

/** Runs the consumer's own build script. */
export function buildConsumer(dir: string): RunResult {
  return run(process.execPath, [npmCli, 'run', 'build'], { cwd: dir });
}

function importPackage(framework: Framework, dir: string, name: string): void {
  const line = `import '${name}';`;
  // An .astro file imports inside its frontmatter fence; a .tsx at the top.
  patch(join(dir, entries[framework]), (source) =>
    framework === 'astro' ? source.replace(/^---\r?\n/, `---\n${line}\n`) : `${line}\n${source}`,
  );
}

function guardResolution(framework: Framework, dir: string, name: string): void {
  copyFileSync(new URL('./museum-guard.mjs', import.meta.url), join(dir, 'museum-guard.mjs'));
  const root = JSON.stringify(dir);
  const config = join(dir, configFiles[framework]);
  if (framework === 'react') {
    writeFileSync(join(dir, 'museum-guard.d.mts'), "import type { Plugin } from 'vite'\nexport default function museumGuard(root: string): Plugin\n");
    patch(config, (source) => `import museumGuard from './museum-guard.mjs'\n${source.replace('plugins: [react()]', `plugins: [museumGuard(${root}), react()]`)}`);
  } else {
    // Bundling the package under test lets the guard see its imports; Node would resolve them later.
    const vite = `{ plugins: [museumGuard(${root})], resolve: { noExternal: [${JSON.stringify(name)}] } }`;
    patch(config, (source) => `import museumGuard from './museum-guard.mjs';\n${source.replace('defineConfig({})', `defineConfig({ vite: ${vite} })`)}`);
  }
}

/**
 * Creates `<base>/cm-<runId>/<framework>` from its pinned starter, from scratch, and installs the
 * package at `packageDir` packed as a tarball, the way a consumer outside the repo gets it. The
 * starter's config stays untouched unless `guardResolution` adds the RF-5 resolution guard.
 */
export function createConsumer(base: string, runId: string, framework: Framework, packageDir: string, options: ConsumerOptions = {}): string {
  const dir = consumerDir(base, runId, framework);
  scaffold(dirname(dir), framework);
  const name = installPackage(dir, packageDir);
  importPackage(framework, dir, name);
  if (options.guardResolution) guardResolution(framework, dir, name);
  return dir;
}
