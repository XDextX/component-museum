import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { cached, cacheDir, inputKey, recordPhase, repoRoot, toolVersions } from '../../scripts/cache.mjs';
import { loadContract } from './contract.ts';
import { consumerDir, type Framework } from './paths.ts';
import { run, type RunResult } from './run.ts';

const execFileAsync = promisify(execFile);

// shortcut: npm-cli.js next to node.exe is the Windows layout; under `npm test` npm_execpath wins.
export const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

/**
 * Copies a folder tree, reading `from` and never writing to it. robocopy (in Windows) copies with 16 threads, about
 * 3 times faster than fs.cp on a node_modules; where it is missing, fs.cp does the same, slower.
 */
async function copyTree(from: string, to: string, options: { recursive: true }): Promise<void> {
  try {
    await execFileAsync('robocopy', [from, to, '/E', '/MT:16', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'], { maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const { code } = error as { code?: number | string };
    // robocopy exits 0 to 7 when it copied; 8 and up is a failure.
    if (typeof code === 'number' && code < 8) return;
    if (code !== 'ENOENT') throw new Error(`robocopy failed copying ${from} to ${to} (exit ${code})`, { cause: error });
    await cp(from, to, options);
  }
}

/** Pinned starters (plan 001, block 6): a new starter release never changes the suite. */
const starters: Record<Framework, string[]> = {
  react: ['--package=create-vite@9.3.0', '--', 'create-vite', '<dir>', '--template', 'react-ts', '--no-interactive', '--no-immediate'],
  astro: ['--package=create-astro@5.3.0', '--', 'create-astro', '<dir>', '--template', 'minimal', '--no-install', '--no-git', '--no-ai', '--skip-houston', '--yes'],
};

/** The pinned starters, as scaffolded and stored (spec 017 RF-5): the reference for the untouched config. */
const storedStarters = join(cacheDir, 'consumers', 'starters');

/** Key of a stored starter: its pin and the tools; the registry is never an input. */
export function starterKey(framework: Framework, pin: string[] = starters[framework]): string {
  return inputKey(cacheDir, [], { framework, pin: pin.join(' '), ...toolVersions() });
}

/**
 * Key of a stored consumer (spec 017 RF-5): its shape and framework, the pinned starter, the starter's
 * package.json and lockfile (never the run's tarballs), what is installed on top, and Node and npm.
 */
export function consumerKey(starter: string, framework: Framework, shape: string, install: string[], pin: string[] = starters[framework]): string {
  return inputKey(starter, ['package.json', 'package-lock.json'], { framework, shape, install: install.join(' '), pin: pin.join(' '), ...toolVersions() });
}

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
  /** With `starter`: the shape (plain, guarded, package, tailwind) under which its installed dependencies are stored between runs. */
  cache?: string;
  /** Astro only: the type checker, which the starter lacks, installed with the dependencies. */
  typeCheck?: boolean;
  /** Framework package tarballs installed with the test package; the entry then renders Button from them. */
  packages?: Tarball[];
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

/** The starter scaffolded once and stored; a copy of it is made in `parent/<framework>` on every run. */
export async function cachedStarter(parent: string, framework: Framework): Promise<string> {
  const started = performance.now();
  const result = await cached(`starter-${framework}`, starterKey(framework), [join(storedStarters, framework, 'package.json')], async () => {
    await scaffold(storedStarters, framework);
  });
  const dir = join(parent, framework);
  await copyTree(join(storedStarters, framework), dir, { recursive: true });
  recordPhase(`globalSetup: starter ${framework}`, (performance.now() - started) / 1000, result);
  return dir;
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

/** A packed package: its name and the .tgz that `npm pack` wrote. */
export type Tarball = { name: string; path: string };

/** Packs `packageDir` into `destination` and returns the package name and the tarball path. */
export async function packPackage(packageDir: string, destination: string): Promise<Tarball> {
  mkdirSync(destination, { recursive: true });
  const [packed] = JSON.parse(await npm(['pack', packageDir, '--json', '--pack-destination', destination], destination, `npm pack failed for ${packageDir}`));
  return { name: packed.name, path: join(destination, packed.filename) };
}

/** Installs already packed tarballs at once (spec 017 RF-1: the run packs each package once, never here). */
export async function installPackage(dir: string, ...tarballs: Tarball[]): Promise<string[]> {
  // --offline: the dependencies are already in the consumer, so a run never needs the registry for a tarball.
  await npm(['install', '--offline', '--no-audit', '--no-fund', ...tarballs.map((t) => t.path)], dir, `npm install failed in ${dir}`);
  return tarballs.map((t) => t.name);
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

/**
 * Key of a stored build (spec 017 RF-5, RF-6): the consumer's key plus the sha256 of the bytes of every tarball
 * installed in it, by package name; where a tarball sits (the run's folder) is not an input.
 */
export function buildKey(consumer: string, tarballs: Tarball[]): string {
  const hash = createHash('sha256').update(`consumer:${consumer}\0`);
  for (const { name, path } of [...tarballs].sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(`tarball:${name}=${createHash('sha256').update(readFileSync(path)).digest('hex')}\0`);
  }
  return hash.digest('hex');
}

/**
 * The key of the build of the consumer `createConsumer` makes from these arguments. It also holds the files
 * that write the consumer's sources (this one, the guard, the contract), so a change to how a consumer is
 * assembled never reuses an old `dist/`.
 */
export function consumerBuildKey(framework: Framework, tarball: Tarball, options: ConsumerOptions): string {
  const assembly = inputKey(repoRoot, ['tests/lib/consumer.ts', 'tests/lib/museum-guard.mjs', 'contracts/button.contract.json'], {
    guard: String(Boolean(options.guardResolution)),
    tailwind: String(Boolean(options.tailwind)),
  });
  return buildKey(`${consumerKey(options.starter!, framework, options.cache!, extraInstall(framework, options))} ${assembly}`, [tarball, ...(options.packages ?? [])]);
}

/**
 * Builds the consumer in `dir`, or restores the `dist/` stored under `key` and its output (spec 017 RF-5): on a
 * hit nothing is built and nothing is written to the cache; on a miss the build runs, and only a build that
 * ends in 0 is stored. A failed build is a result, never a throw.
 */
export async function buildCached(dir: string, name: string, key: string, cache = cacheDir): Promise<{ result: RunResult; cache: 'hit' | 'built' }> {
  const entry = join(cache, 'consumers', 'builds', name);
  let failed: RunResult | undefined;
  const status = await cached(`build-${name}`, key, [join(entry, 'dist'), join(entry, 'output.txt')], async () => {
    rmSync(entry, { recursive: true, force: true });
    const result = await buildConsumerAsync(dir);
    if (result.code !== 0) {
      failed = result;
      throw new Error('build failed');
    }
    await copyTree(join(dir, 'dist'), join(entry, 'dist'), { recursive: true });
    writeFileSync(join(entry, 'output.txt'), result.output);
  }, cache).catch((error) => {
    if (failed) return 'failed' as const;
    throw error;
  });
  if (failed) return { result: failed, cache: 'built' };
  if (status === 'hit') await copyTree(join(entry, 'dist'), join(dir, 'dist'), { recursive: true });
  return { result: { code: 0, output: readFileSync(join(entry, 'output.txt'), 'utf8') }, cache: status === 'hit' ? 'hit' : 'built' };
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

/**
 * Spec 009 T-6: the Input instances `field-a11y.test.ts` measures. Ids are the control's own (RF-2:
 * a consumer id is respected); the twins share a label and tell apart by `name`.
 */
function inputInstances(framework: Framework): string {
  // React needs defaultValue: a `value` without onChange is read-only and warns.
  const value = framework === 'react' ? 'defaultValue' : 'value';
  return [
    ...['sm', 'md', 'lg'].map((s) => `<Input id="input-${s}" label="Size ${s}" size="${s}" ${value}="Value" placeholder="Placeholder" />`),
    '<Input id="input-hint" label="With hint" hint="Hint text" />',
    '<Input id="input-error" label="With error" error="Error text" />',
    '<Input id="input-both" label="With both" hint="Hint text" error="Error text" />',
    '<Input id="input-required" label="Required field" required />',
    '<Input id="input-disabled" label="Disabled field" error="Disabled error" disabled />',
    '<Input name="twins-a" label="Twin" />',
    '<Input name="twins-b" label="Twin" />',
    '<p id="own-note">Own note</p>',
    '<Input id="input-own" label="Own wiring" hint="Own hint" aria-describedby="own-note" />',
  ].join(framework === 'react' ? '\n      ' : '\n\t\t');
}

/**
 * Spec 010 T-4: the Textarea instances `field-a11y.test.ts` measures, in the shapes of Input's but with
 * their own labels and texts, so an Input and a Textarea sit on one page (the twins share "Twin" on purpose).
 * `textarea-escape` and `textarea-newline` carry the RF-11 values; React alone adds a `value` without
 * `onChange`, which is read-only there.
 */
function textareaInstances(framework: Framework): string {
  const value = framework === 'react' ? 'defaultValue' : 'value';
  return [
    ...['sm', 'md', 'lg'].map((s) => `<Textarea id="textarea-${s}" label="Area ${s}" size="${s}" ${value}="Value" placeholder="Placeholder" />`),
    '<Textarea id="textarea-hint" label="Area hint" hint="Area hint text" />',
    '<Textarea id="textarea-error" label="Area error" error="Area error text" />',
    '<Textarea id="textarea-both" label="Area both" hint="Area hint text" error="Area error text" />',
    '<Textarea id="textarea-required" label="Area required" required />',
    '<Textarea id="textarea-disabled" label="Area disabled" error="Area disabled error" disabled />',
    '<Textarea name="twins-ta-a" label="Twin" />',
    '<Textarea name="twins-ta-b" label="Twin" />',
    '<p id="textarea-own-note">Area own note</p>',
    '<Textarea id="textarea-own" label="Area own" hint="Area own hint" aria-describedby="textarea-own-note" />',
    `<Textarea id="textarea-escape" label="Area escape" ${value}={'<b>&\\nx'} />`,
    `<Textarea id="textarea-newline" label="Area newline" ${value}={'\\nx'} />`,
    ...(framework === 'react' ? ['<Textarea id="textarea-readonly" label="Area read only" value="Fixed text" />'] : []),
  ].join(framework === 'react' ? '\n      ' : '\n\t\t');
}

/**
 * Spec 012 T-4: the Checkbox instances `field-a11y.test.ts` measures. Labels start with "Tick" (the twins,
 * "Pair") so none contains a label of Input or Textarea: `getByLabel` matches substrings. The twins' names do
 * not start with `twins-`, which Input's twin selectors read. `checkbox-checked` starts marked,
 * `checkbox-locked` is marked and disabled, `checkbox-disabled` is disabled with an error, and `checkbox-long`
 * carries a 200-character label with an 80-character word in it.
 */
export const checkboxLongLabel = `Tick long ${'lorem ipsum dolor sit amet '.repeat(3)}${'x'.repeat(80)} end`;
function checkboxInstances(framework: Framework): string {
  return [
    ...['sm', 'md', 'lg'].map((s) => `<Checkbox id="checkbox-${s}" label="Tick ${s}" size="${s}" />`),
    '<Checkbox id="checkbox-hint" label="Tick hint" hint="Tick hint text" />',
    '<Checkbox id="checkbox-error" label="Tick error" error="Tick error text" />',
    '<Checkbox id="checkbox-both" label="Tick both" hint="Tick hint text" error="Tick error text" />',
    '<Checkbox id="checkbox-required" label="Tick required" required />',
    '<Checkbox id="checkbox-disabled" label="Tick disabled" error="Tick disabled error" disabled />',
    '<Checkbox id="checkbox-locked" label="Tick locked" defaultChecked disabled />',
    '<Checkbox id="checkbox-checked" label="Tick checked" defaultChecked />',
    '<Checkbox name="pair-a" label="Pair" />',
    '<Checkbox name="pair-b" label="Pair" />',
    '<p id="checkbox-own-note">Tick own note</p>',
    '<Checkbox id="checkbox-own" label="Tick own" hint="Tick own hint" aria-describedby="checkbox-own-note" />',
    `<Checkbox id="checkbox-long" label="${checkboxLongLabel}" />`,
  ].join(framework === 'react' ? '\n      ' : '\n\t\t');
}

/**
 * Spec 013 T-5: the RadioGroup instances `field-a11y-radiogroup.test.ts` measures. Legends start with "Pick" and
 * the options are "Choice A", "Choice B" and "Choice C" in every group (found inside their group). `radiogroup-selected`
 * starts on B, `radiogroup-partial` has C disabled, `radiogroup-disabled` is disabled whole with an error, and
 * `radiogroup-long` carries a 200-character option label with an 80-character word in it.
 */
export const radiogroupLongLabel = `Choice long ${'lorem ipsum dolor sit amet '.repeat(3)}${'x'.repeat(80)} end`;
function radiogroupInstances(): string {
  const options = (third = '') => `options={[{ value: 'a', label: 'Choice A' }, { value: 'b', label: 'Choice B' }, { value: 'c', label: 'Choice C'${third} }]}`;
  const group = (key: string, legend: string, extra = '') => `<RadioGroup id="radiogroup-${key}" name="rg-${key}" label="${legend}" ${options()} ${extra}/>`;
  return [
    ...['sm', 'md', 'lg'].map((s) => group(s, `Pick ${s}`, `size="${s}" `)),
    group('hint', 'Pick hint', 'hint="Pick hint text" '),
    group('error', 'Pick error', 'error="Pick error text" '),
    group('both', 'Pick both', 'hint="Pick hint text" error="Pick error text" '),
    group('required', 'Pick required', 'required '),
    group('disabled', 'Pick disabled', 'error="Pick disabled error" disabled '),
    `<RadioGroup id="radiogroup-partial" name="rg-partial" label="Pick partial" ${options(', disabled: true')} />`,
    group('selected', 'Pick selected', 'defaultValue="b" '),
    '<p id="radiogroup-own-note">Pick own note</p>',
    group('own', 'Pick own', 'hint="Pick own hint" aria-describedby="radiogroup-own-note" '),
    `<RadioGroup id="radiogroup-long" name="rg-long" label="Pick long" options={[{ value: 'a', label: 'Choice A' }, { value: 'l', label: "${radiogroupLongLabel}" }]} />`,
  ].join('\n');
}

/** Makes the consumer's entry import Button, Input, Textarea, Checkbox, RadioGroup and the stylesheet once, and render every instance. */
function useButtons(framework: Framework, dir: string, name: string): void {
  if (framework === 'react') {
    writeFileSync(
      join(dir, 'src', 'MuseumButtons.tsx'),
      `import { Button, Checkbox, Input, RadioGroup, Textarea } from '${name}'\nimport '${name}/styles.css'\n\nexport default function MuseumButtons() {\n  return (\n    <>\n      ${buttonInstances(framework)}\n      ${inputInstances(framework)}\n      ${textareaInstances(framework)}\n      ${checkboxInstances(framework)}\n      ${radiogroupInstances()}\n    </>\n  )\n}\n`,
    );
    patch(join(dir, entries.react), (source) =>
      `import MuseumButtons from './MuseumButtons.tsx'\n${source.replace('<App />', '<App />\n    <MuseumButtons />')}`,
    );
  } else {
    patch(join(dir, entries.astro), (source) =>
      source
        .replace(/^---\r?\n/, `---\nimport { Button, Checkbox, Input, RadioGroup, Textarea } from '${name}';\nimport '${name}/styles.css';\n`)
        .replace('</body>', `\t${buttonInstances(framework)}\n\t\t${inputInstances(framework)}\n\t\t${textareaInstances(framework)}\n\t\t${checkboxInstances(framework)}\n\t\t${radiogroupInstances()}\n\t</body>`),
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

/** What goes on top of the starter's own dependencies, installed once and stored with them. */
function extraInstall(framework: Framework, options: ConsumerOptions): string[] {
  // Pinned (plan 003): a new Tailwind release never changes the suite.
  if (options.tailwind) return ['tailwindcss@4.3.3', '@tailwindcss/vite@4.3.3'];
  if (options.typeCheck && framework === 'astro') return ['--save-dev', '@astrojs/check@^0.9.11', 'typescript@^6.0.3'];
  return [];
}

/**
 * Copies the starter with its dependencies installed into `dir`. The stored copy (spec 017 RF-5) is only
 * read on a hit; on a miss it is made from the starter and the registry, and stored without any tarball.
 */
async function restoreDependencies(dir: string, framework: Framework, shape: string, starter: string, install: string[]): Promise<void> {
  const started = performance.now();
  const entry = join(cacheDir, 'consumers', `${shape}-${framework}`);
  const result = await cached(`consumer-${shape}-${framework}`, consumerKey(starter, framework, shape, install), [join(entry, 'node_modules')], async () => {
    rmSync(entry, { recursive: true, force: true });
    await copyTree(starter, entry, { recursive: true });
    await npm(['install', '--no-audit', '--no-fund', ...install], entry, `npm install failed in ${entry}`);
  });
  await copyTree(entry, dir, { recursive: true });
  recordPhase(`globalSetup: consumer ${shape}-${framework}`, (performance.now() - started) / 1000, result);
}

/**
 * Creates `<base>/cm-<runId>/<framework>` from its pinned starter and installs the
 * package from `tarball`, the way a consumer outside the repo gets it. The starter's dependencies come
 * from the stored copy when `cache` is given. The
 * starter's config stays untouched unless `guardResolution` adds the RF-5 resolution guard.
 */
export async function createConsumer(base: string, runId: string, framework: Framework, tarball: Tarball, options: ConsumerOptions = {}): Promise<string> {
  const dir = consumerDir(base, runId, framework);
  if (options.starter) {
    if (existsSync(dir)) rmSync(dir, { recursive: true });
    if (options.cache) await restoreDependencies(dir, framework, options.cache, options.starter, extraInstall(framework, options));
    else await copyTree(options.starter, dir, { recursive: true });
  } else {
    await scaffold(dirname(dir), framework);
  }
  const packages = options.packages ?? [];
  const [name, ...frameworkPackages] = await installPackage(dir, tarball, ...packages);
  importPackage(framework, dir, name);
  if (options.tailwind) {
    useTailwind(framework, dir, frameworkPackages[0]);
  } else {
    for (const frameworkPackage of frameworkPackages) useButtons(framework, dir, frameworkPackage);
  }
  if (options.guardResolution) guardResolution(framework, dir, [name, ...frameworkPackages]);
  return dir;
}
