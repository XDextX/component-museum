import { execFile } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { loadContract } from './contract.ts';
import { consumerDir, type Framework } from './paths.ts';
import { run, type RunResult } from './run.ts';

const execFileAsync = promisify(execFile);

// shortcut: npm-cli.js next to node.exe is the Windows layout; under `npm test` npm_execpath wins.
export const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

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

export type ConsumerOptions = {
  /** Adds the RF-5 resolution guard to the consumer's config; without it the config stays the starter's. */
  guardResolution?: boolean;
  /** A starter already scaffolded by `scaffold`, copied instead of running the starter again. */
  starter?: string;
  /** Framework packages installed with the test package; the entry then renders Button from them. */
  packages?: string[];
  /** Spec 003 T-7: Tailwind v4 in the consumer, with one page per import order (see `tailwindPages`). */
  tailwind?: boolean;
};

/** Where each Tailwind consumer's two pages end up in its `dist/`: one per order of the two imports. */
export const tailwindPages: Record<Framework, { tailwindFirst: string; packageFirst: string }> = {
  react: { tailwindFirst: 'index.html', packageFirst: 'reverse.html' },
  astro: { tailwindFirst: 'index.html', packageFirst: join('reverse', 'index.html') },
};

async function npm(args: string[], cwd: string, failure: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [npmCli, ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    throw new Error(`${failure}\n${stdout}${stderr}`, { cause: error });
  }
}

function patch(file: string, edit: (source: string) => string): void {
  const source = readFileSync(file, 'utf8');
  const updated = edit(source);
  if (updated === source) throw new Error(`the pinned starter changed: nothing to patch in ${file}`);
  writeFileSync(file, updated);
}

/** Runs the pinned starter into `<parent>/<framework>`, from scratch, and returns that folder. */
export async function scaffold(parent: string, framework: Framework): Promise<string> {
  const dir = join(parent, framework);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(parent, { recursive: true });
  const starter = starters[framework].map((arg) => (arg === '<dir>' ? framework : arg));
  await npm(['exec', '--yes', ...starter], parent, `sin red: no se pudo crear el starter de ${framework}`);
  return dir;
}

/** Packs `packageDir` into `destination` and returns the package name and the tarball path. */
export async function packPackage(packageDir: string, destination: string): Promise<{ name: string; path: string }> {
  mkdirSync(destination, { recursive: true });
  const [packed] = JSON.parse(await npm(['pack', packageDir, '--json', '--pack-destination', destination], destination, `npm pack failed for ${packageDir}`));
  return { name: packed.name, path: join(destination, packed.filename) };
}

/** Packs each package next to the consumer, never inside the repo, and installs the tarballs at once. */
export async function installPackage(dir: string, ...packageDirs: string[]): Promise<string[]> {
  // One pack folder per consumer: two consumers installing at once never share a tarball.
  const destination = join(dirname(dir), `pack-${basename(dir)}`);
  const packed = await Promise.all(packageDirs.map((packageDir) => packPackage(packageDir, destination)));
  // No --prefer-offline: with it npm trusts stale cached metadata and misses the starter's versions.
  await npm(['install', '--no-audit', '--no-fund', ...packed.map((p) => p.path)], dir, `npm install failed in ${dir}`);
  return packed.map((p) => p.name);
}

/** Runs the consumer's own build script. */
export function buildConsumer(dir: string): RunResult {
  return run(process.execPath, [npmCli, 'run', 'build'], { cwd: dir });
}

/** buildConsumer without blocking, so several consumers build at once. */
export async function buildConsumerAsync(dir: string): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [npmCli, 'run', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    const { code, stdout = '', stderr = '' } = error as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof code === 'number' ? code : 1, output: `${stdout}${stderr}` };
  }
}

function importPackage(framework: Framework, dir: string, name: string): void {
  const line = `import '${name}';`;
  // An .astro file imports inside its frontmatter fence; a .tsx at the top.
  patch(join(dir, entries[framework]), (source) =>
    framework === 'astro' ? source.replace(/^---\r?\n/, `---\n${line}\n`) : `${line}\n${source}`,
  );
}

const buttonContract = loadContract(fileURLToPath(new URL('../../contracts/button.contract.json', import.meta.url)));

/** One Button per variant and size, each with a stable id (`button-<variant>-<size>`) for later specs. */
function buttonInstances(framework: Framework, tailwind = false): string {
  const { variant, size } = buttonContract.props;
  if (variant.type !== 'enum' || size.type !== 'enum') throw new Error('Button contract: variant and size must be enums');
  return variant.values
    .flatMap((v) => size.values.map((s) => `<Button id="button-${v}-${s}" variant="${v}" size="${s}">${v} ${s}</Button>`))
    // RF-11: free HTML attributes, a consumer class, and a clash with the component's own hook.
    .concat(`<Button id="button-attrs" data-x="1" aria-label="Etiqueta" ${framework === 'react' ? 'className' : 'class'}="consumer-class" data-museum-button="consumer">attrs</Button>`)
    // Spec 003 T-5: a Button a test rule can target; its id avoids the `button-` prefix the 002 comparison selects.
    .concat(`<Button id="own-class" ${framework === 'react' ? 'className' : 'class'}="museum-test-own">own</Button>`)
    // Spec 003 T-7: the Tailwind utility RF-9 measures; only the Tailwind consumers render it.
    .concat(tailwind ? `<Button id="tw-px8" ${framework === 'react' ? 'className' : 'class'}="px-8">px-8</Button>` : [])
    .join(framework === 'react' ? '\n      ' : '\n\t\t');
}

/** Makes the consumer's entry import Button and the stylesheet once, and render every instance. */
function useButtons(framework: Framework, dir: string, name: string): void {
  if (framework === 'react') {
    writeFileSync(
      join(dir, 'src', 'MuseumButtons.tsx'),
      `import { Button } from '${name}'\nimport '${name}/styles.css'\n\nexport default function MuseumButtons() {\n  return (\n    <>\n      ${buttonInstances(framework)}\n    </>\n  )\n}\n`,
    );
    patch(join(dir, entries.react), (source) =>
      `import MuseumButtons from './MuseumButtons.tsx'\n${source.replace('<App />', '<App />\n    <MuseumButtons />')}`,
    );
  } else {
    patch(join(dir, entries.astro), (source) =>
      source
        .replace(/^---\r?\n/, `---\nimport { Button } from '${name}';\nimport '${name}/styles.css';\n`)
        .replace('</body>', `\t${buttonInstances(framework)}\n\t</body>`),
    );
  }
}

/**
 * Spec 003 T-7: Tailwind v4 through its Vite plugin and two pages that differ only in the order of
 * `@import "tailwindcss"` and the package sheet. Each page has its own CSS file so no bundle shares
 * (and reorders) the two. The starter's unlayered `index.css` is dropped: it would beat any utility.
 */
function useTailwind(framework: Framework, dir: string, packageName: string): void {
  const tailwind = '@import "tailwindcss";';
  const sheet = `@import "${packageName}/styles.css";`;
  writeFileSync(join(dir, 'src', 'tailwind-first.css'), `${tailwind}\n${sheet}\n`);
  writeFileSync(join(dir, 'src', 'package-first.css'), `${sheet}\n${tailwind}\n`);
  const config = join(dir, configFiles[framework]);
  if (framework === 'react') {
    writeFileSync(
      join(dir, 'src', 'MuseumButtons.tsx'),
      `import { Button } from '${packageName}'\n\nexport default function MuseumButtons() {\n  return (\n    <>\n      ${buttonInstances(framework, true)}\n    </>\n  )\n}\n`,
    );
    patch(join(dir, entries.react), (source) =>
      `import MuseumButtons from './MuseumButtons.tsx'\n${source.replace(/import '\.\/index\.css'\r?\n/, '').replace('<App />', '<App />\n    <MuseumButtons />')}`,
    );
    const main = readFileSync(join(dir, entries.react), 'utf8');
    writeFileSync(join(dir, entries.react), `import './tailwind-first.css'\n${main}`);
    writeFileSync(join(dir, 'src', 'main-reverse.tsx'), `import './package-first.css'\n${main}`);
    writeFileSync(join(dir, 'reverse.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace('/src/main.tsx', '/src/main-reverse.tsx'));
    const build = "build: { rollupOptions: { input: { main: 'index.html', reverse: 'reverse.html' } } }";
    patch(config, (source) => `import tailwindcss from '@tailwindcss/vite'\n${source.replace('plugins: [react()]', `plugins: [tailwindcss(), react()], ${build}`)}`);
  } else {
    const page = (css: string) => (source: string) =>
      source
        .replace(/^---\r?\n/, `---\nimport { Button } from '${packageName}';\nimport '../${css}.css';\n`)
        .replace('</body>', `\t${buttonInstances(framework, true)}\n\t</body>`);
    const index = join(dir, entries.astro);
    const original = readFileSync(index, 'utf8');
    writeFileSync(join(dir, 'src', 'pages', 'reverse.astro'), page('package-first')(original));
    patch(index, page('tailwind-first'));
    patch(config, (source) => `import tailwindcss from '@tailwindcss/vite';\n${source.replace('defineConfig({})', 'defineConfig({ vite: { plugins: [tailwindcss()] } })')}`);
  }
}

function guardResolution(framework: Framework, dir: string, names: string[]): void {
  copyFileSync(new URL('./museum-guard.mjs', import.meta.url), join(dir, 'museum-guard.mjs'));
  const root = JSON.stringify(dir);
  const config = join(dir, configFiles[framework]);
  if (framework === 'react') {
    writeFileSync(join(dir, 'museum-guard.d.mts'), "import type { Plugin } from 'vite'\nexport default function museumGuard(root: string): Plugin\n");
    patch(config, (source) => `import museumGuard from './museum-guard.mjs'\n${source.replace('plugins: [react()]', `plugins: [museumGuard(${root}), react()]`)}`);
  } else {
    // Bundling the packages under test lets the guard see their imports; Node would resolve them later.
    const vite = `{ plugins: [museumGuard(${root})], resolve: { noExternal: ${JSON.stringify(names)} } }`;
    patch(config, (source) => `import museumGuard from './museum-guard.mjs';\n${source.replace('defineConfig({})', `defineConfig({ vite: ${vite} })`)}`);
  }
}

/**
 * Creates `<base>/cm-<runId>/<framework>` from its pinned starter, from scratch, and installs the
 * package at `packageDir` packed as a tarball, the way a consumer outside the repo gets it. The
 * starter's config stays untouched unless `guardResolution` adds the RF-5 resolution guard.
 */
export async function createConsumer(base: string, runId: string, framework: Framework, packageDir: string, options: ConsumerOptions = {}): Promise<string> {
  const dir = consumerDir(base, runId, framework);
  if (options.starter) {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
    cpSync(options.starter, dir, { recursive: true });
  } else {
    await scaffold(dirname(dir), framework);
  }
  const packages = options.packages ?? [];
  const [name, ...frameworkPackages] = await installPackage(dir, packageDir, ...packages);
  importPackage(framework, dir, name);
  if (options.tailwind) {
    // Pinned (plan 003): a new Tailwind release never changes the suite.
    await npm(['install', '--no-audit', '--no-fund', 'tailwindcss@4.3.3', '@tailwindcss/vite@4.3.3'], dir, `npm install tailwindcss failed in ${dir}`);
    useTailwind(framework, dir, frameworkPackages[0]);
  } else {
    for (const frameworkPackage of frameworkPackages) useButtons(framework, dir, frameworkPackage);
  }
  if (options.guardResolution) guardResolution(framework, dir, [name, ...frameworkPackages]);
  return dir;
}
