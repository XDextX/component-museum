import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { consumerDir, type Framework } from './paths.ts';
import { run } from './run.ts';

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

function npm(args: string[], cwd: string, failure: string): string {
  const result = run(process.execPath, [npmCli, ...args], { cwd });
  if (result.code !== 0) throw new Error(`${failure}\n${result.output}`);
  return result.output;
}

function importPackage(framework: Framework, file: string, name: string): void {
  const source = readFileSync(file, 'utf8');
  const line = `import '${name}';`;
  // An .astro file imports inside its frontmatter fence; a .tsx at the top.
  const updated = framework === 'astro' ? source.replace(/^---\r?\n/, `---\n${line}\n`) : `${line}\n${source}`;
  if (updated === source) throw new Error(`no frontmatter to import ${name} in ${file}`);
  writeFileSync(file, updated);
}

/**
 * Creates `<base>/cm-<runId>/<framework>` from its pinned starter, from scratch, and installs the
 * package at `packageDir` packed as a tarball, the way a consumer outside the repo gets it.
 */
export function createConsumer(base: string, runId: string, framework: Framework, packageDir: string): string {
  const dir = consumerDir(base, runId, framework);
  const parent = dirname(dir);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(parent, { recursive: true });

  const starter = starters[framework].map((arg) => (arg === '<dir>' ? framework : arg));
  npm(['exec', '--yes', ...starter], parent, `sin red: no se pudo crear el starter de ${framework}`);

  const [packed] = JSON.parse(npm(['pack', packageDir, '--json', '--pack-destination', parent], parent, `npm pack failed for ${packageDir}`));
  // No --prefer-offline: with it npm trusts stale cached metadata and misses the starter's versions.
  npm(['install', '--no-audit', '--no-fund', join(parent, packed.filename)], dir, `npm install failed in ${dir}`);

  importPackage(framework, join(dir, entries[framework]), packed.name);
  return dir;
}
