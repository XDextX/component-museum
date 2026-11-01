import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';
import { ensureAstroRender } from '../gallery/scripts/astro-cached.mjs';
import { cached, inputKey, recordPhase, storybookInputs } from '../scripts/cache.mjs';
import { buildCached, cachedStarter, consumerBuildKey, createConsumer, npmCli, packPackage, type ConsumerOptions, type Tarball } from './lib/consumer.ts';
import { cleanup, isAlive, killTree, listProcesses, writeOwner } from './lib/cleanup.ts';
import { acquireLock } from './lib/lock.ts';
import { consumerDir, type Framework } from './lib/paths.ts';
import type { RunResult } from './lib/run.ts';
import { snapshotRoots, takeSnapshot, type Snapshot } from './lib/snapshot.ts';

export type SharedConsumers = {
  base: string;
  runId: string;
  /** Untouched consumers (RF-4): read-only for every test. */
  plain: Record<Framework, string>;
  /** Consumers with the resolution guard (RF-5): each one modified only by its own RF-5 test. */
  guarded: Record<Framework, string>;
  /** Spec 002: guarded consumers with the framework packages, so an undeclared import fails (read-only). */
  packageGuarded: Record<Framework, string>;
  /** Starters as scaffolded, not installed: the reference for the untouched config. */
  starters: Record<Framework, string>;
  /** Spec 003 T-7: consumers with Tailwind v4 and two pages (tailwindPages), built once and read-only. */
  tailwind: Record<Framework, string>;
  /** Parent of the guarded consumers, where RF-5 puts museum-undeclared in node_modules. */
  guardParent: string;
  /** The test package plus an import of museum-undeclared it does not declare. */
  undeclaringPackage: string;
};

declare module 'vitest' {
  export interface ProvidedContext {
    consumers: SharedConsumers;
    /** Spec 017 RF-1: the one tarball of each package for the whole run, packed (prepack included) before anything else. */
    tarballs: Record<'react' | 'astro' | 'testPackage' | 'undeclaring', Tarball>;
    /** The repo before anything ran (RF-6). */
    treeBefore: Snapshot;
    /** Spec 002 RF-3: each consumer that installs the framework packages, built once here. */
    builds: Record<'plain' | 'packageGuarded' | 'tailwind', Record<Framework, RunResult>>;
    /** Spec 002 RF-5: each guarded 002 consumer's type check, clean and with variant="nope". */
    typeChecks: Record<Framework, { clean: RunResult; nope: RunResult }>;
    /** Spec 004: the built Storybook and the extracted Astro cases. */
    gallery: { storybook: string; astroJson: string };
  }
}

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const testPackage = join(repo, 'tests', 'fixtures', 'test-package');
const frameworks: Framework[] = ['react', 'astro'];
const frameworkPackage = (framework: Framework) => join(repo, 'packages', framework);

const execFileAsync = promisify(execFile);

/** Runs npm in `cwd` to completion; a failure is a result, never a thrown error. */
async function npmRun(args: string[], cwd: string): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [npmCli, ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    const { code, stdout = '', stderr = '' } = error as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof code === 'number' ? code : 1, output: `${stdout}${stderr}` };
  }
}

const gallery = join(repo, 'gallery');

/** Times one setup phase into node_modules/.museum-cache/phases.json; `fn` may return whether a cache hit. */
async function phase<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await fn();
  recordPhase(`globalSetup: ${name}`, (performance.now() - started) / 1000, result === 'hit' ? 'hit' : result === 'built' ? 'built' : null);
  return result;
}

/**
 * Spec 004 and 017: makes sure the Astro cases are extracted (a hit when
 * `npm run gallery:astro` just ran) and builds Storybook, unless nothing it depends on changed. A failing
 * step fails the whole run.
 */
async function buildGallery(): Promise<{ storybook: string; astroJson: string }> {
  const fail = (name: string, result: RunResult) => {
    if (result.code !== 0) throw new Error(`gallery: ${name} failed\n${result.output.slice(-4000)}`);
  };
  // Each package's styles.css and dist/ were written by the prepack of the run's one pack, which finished before this.
  // The Astro story imports the JSON, so it exists before Storybook builds.
  await ensureAstroRender('globalSetup: astro-render');
  const storybook = join(gallery, 'storybook-static');
  const { files, extra } = storybookInputs();
  await phase('storybook', () =>
    cached('storybook', inputKey(repo, files, extra), [join(storybook, 'index.html')], async () => {
      fail('storybook build', await npmRun(['run', 'build', '--workspace=@component-museum/gallery'], repo));
    }),
  );
  return { storybook, astroJson: join(gallery, 'generated', 'astro-button.json') };
}

/** The consumer's type check, clean and then with a Button whose variant is not in the contract. */
async function checkButtonTypes(framework: Framework, dir: string): Promise<{ clean: RunResult; nope: RunResult }> {
  // The Astro consumer's type checker (@astrojs/check) is installed with its stored dependencies (`typeCheck`).
  const check = () => npmRun(framework === 'react' ? ['exec', '--', 'tsc', '-b'] : ['exec', '--', 'astro', 'check'], dir);
  const clean = await check();
  const file = framework === 'react' ? join(dir, 'src', 'Nope.tsx') : join(dir, 'src', 'Nope.astro');
  writeFileSync(
    file,
    framework === 'react'
      ? `import { Button } from '@component-museum/react'\n\nexport const Nope = () => <Button variant="nope">nope</Button>\n`
      : `---\nimport { Button } from '@component-museum/astro';\n---\n\n<Button variant="nope">nope</Button>\n`,
  );
  try {
    return { clean, nope: await check() };
  } finally {
    rmSync(file);
  }
}

/**
 * One consumer's chain (spec 017 T-11): restore and install its tarballs, build it (or restore its stored build),
 * and type check it. Each step records its own phase; the type check runs every time, never from the cache.
 */
async function chain(
  base: string,
  runId: string,
  framework: Framework,
  tarball: Tarball,
  options: ConsumerOptions,
  steps: { build?: boolean; check?: boolean },
): Promise<{ dir: string; build?: RunResult; check?: { clean: RunResult; nope: RunResult } }> {
  const name = `${options.cache}-${framework}`;
  const started = performance.now();
  const dir = await createConsumer(base, runId, framework, tarball, options);
  let build: RunResult | undefined;
  let check: { clean: RunResult; nope: RunResult } | undefined;
  if (steps.build) {
    const buildStarted = performance.now();
    const built = await buildCached(dir, name, consumerBuildKey(framework, tarball, options));
    recordPhase(`globalSetup: build ${name}`, (performance.now() - buildStarted) / 1000, built.cache);
    build = built.result;
  }
  if (steps.check) {
    const checkStarted = performance.now();
    check = await checkButtonTypes(framework, dir);
    recordPhase(`globalSetup: type check ${name}`, (performance.now() - checkStarted) / 1000);
  }
  recordPhase(`globalSetup: chain ${name}`, (performance.now() - started) / 1000);
  return { dir, build, check };
}

/**
 * Creates every consumer once per run, in parallel, and removes them all when the run ends. Only the e2e
 * project has it (vitest.config.ts): a run of unit files alone never gets here (spec 017, RF-7).
 */
export default async function setup(project: TestProject): Promise<() => void> {
  const runId = randomUUID().slice(0, 8);
  // One run per checkout (T-9): a second npm test would see this run's RF-5 module in RF-6.
  const releaseLock = await acquireLock(join(repo, 'node_modules', '.museum-test-lock'), { runId, shareWithProcess: true });
  // Before any consumer exists, so whatever creating them changes in the repo shows in RF-6.
  project.provide('treeBefore', takeSnapshot(repo, snapshotRoots));
  const base = tmpdir();
  // Spec 017 RF-10: before this run's folders exist, clear what runs that died left; a live run (this checkout's or another's) is not touched.
  await phase('cleanup', async () => {
    const gone = cleanup({ temp: base, isAlive, processes: listProcesses, kill: killTree });
    if (gone.folders.length + gone.edges.length + gone.profiles.length > 0) {
      console.log(`[museum] cleanup: ${gone.folders.length} cm-* folders, ${gone.edges.length} Edge, ${gone.profiles.length} profiles of dead runs`);
    }
  });
  const guardRunId = `${runId}-guard`;
  const guardParent = join(base, `cm-${guardRunId}`);
  const packageRunId = `${runId}-pkg`;
  const tailwindRunId = `${runId}-tw`;
  const starterParent = join(base, `cm-${runId}-starter`);
  const packParent = join(base, `cm-${runId}-pack`);
  const created = [join(base, `cm-${runId}`), guardParent, join(base, `cm-${packageRunId}`), join(base, `cm-${tailwindRunId}`), starterParent, packParent];
  // Each folder names its owner, so a later run can tell this run's leftovers from a live run's.
  created.forEach((dir) => writeOwner(dir, { runId, pid: process.pid }));
  const teardown = () => {
    created.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    releaseLock();
  };

  try {
    const undeclaringPackage = join(guardParent, 'pkg-undeclaring');
    cpSync(testPackage, undeclaringPackage, { recursive: true });
    const index = join(undeclaringPackage, 'index.js');
    writeFileSync(index, `import 'museum-undeclared';\n${readFileSync(index, 'utf8')}`);

    // Spec 017 RF-1: each package is packed once, here, and every consumer and test installs or reads that tarball.
    // npm pack runs the prepack (dist/ and styles.css), so the gallery below can only start after it.
    const packDirs = { react: frameworkPackage('react'), astro: frameworkPackage('astro'), testPackage, undeclaring: undeclaringPackage };
    const [[reactStarter, astroStarter], ...packed] = await Promise.all([
      Promise.all(frameworks.map((f) => cachedStarter(starterParent, f))),
      ...Object.entries(packDirs).map(([name, dir]) => phase(`pack ${name}`, () => packPackage(dir, join(packParent, name)))),
    ]);
    const starters = { react: reactStarter, astro: astroStarter };
    const tarballs = Object.fromEntries(Object.keys(packDirs).map((name, i) => [name, packed[i]])) as Record<keyof typeof packDirs, Tarball>;
    project.provide('tarballs', tarballs);

    // A consumer left at the same path by an earlier run: createConsumer must wipe it (RF-4).
    const leftoverDir = consumerDir(base, runId, 'react');
    mkdirSync(leftoverDir, { recursive: true });
    writeFileSync(join(leftoverDir, 'leftover.txt'), 'from an earlier run');

    // The gallery builds alongside the consumers; it touches only gallery/ and its own outputs.
    const galleryBuilt = buildGallery();
    // Awaited after the consumers; this keeps an early failure from being an unhandled rejection meanwhile.
    galleryBuilt.catch(() => {});

    // Spec 017 T-11: each consumer is its own chain (restore, install tarballs, build or restore the stored build,
    // type check), and all the chains run side by side. The builds are stored by key; the type checks (002 RF-5) never are.
    const chains = await phase('consumer chains', () =>
      Promise.all([
        chain(base, runId, 'react', tarballs.testPackage, { starter: starters.react, cache: 'plain', packages: [tarballs.react] }, { build: true }),
        chain(base, runId, 'astro', tarballs.testPackage, { starter: starters.astro, cache: 'plain', packages: [tarballs.astro] }, { build: true }),
        chain(base, guardRunId, 'react', tarballs.undeclaring, { starter: starters.react, cache: 'guarded', guardResolution: true }, {}),
        chain(base, guardRunId, 'astro', tarballs.undeclaring, { starter: starters.astro, cache: 'guarded', guardResolution: true }, {}),
        chain(base, packageRunId, 'react', tarballs.testPackage, { starter: starters.react, cache: 'package', typeCheck: true, guardResolution: true, packages: [tarballs.react] }, { build: true, check: true }),
        chain(base, packageRunId, 'astro', tarballs.testPackage, { starter: starters.astro, cache: 'package', typeCheck: true, guardResolution: true, packages: [tarballs.astro] }, { build: true, check: true }),
        // Spec 003 T-7: Tailwind v4 consumers (no guard), two pages each.
        chain(base, tailwindRunId, 'react', tarballs.testPackage, { starter: starters.react, cache: 'tailwind', packages: [tarballs.react], tailwind: true }, { build: true }),
        chain(base, tailwindRunId, 'astro', tarballs.testPackage, { starter: starters.astro, cache: 'tailwind', packages: [tarballs.astro], tailwind: true }, { build: true }),
      ]),
    );
    const [plainReact, plainAstro, guardedReact, guardedAstro, packageReact, packageAstro, tailwindReact, tailwindAstro] = chains;
    // Built in the chains, not in a test: the shared consumers stay read-only for every test file.
    project.provide('builds', {
      plain: { react: plainReact.build!, astro: plainAstro.build! },
      packageGuarded: { react: packageReact.build!, astro: packageAstro.build! },
      tailwind: { react: tailwindReact.build!, astro: tailwindAstro.build! },
    });
    project.provide('typeChecks', { react: packageReact.check!, astro: packageAstro.check! });
    project.provide('gallery', await galleryBuilt);

    project.provide('consumers', {
      base,
      runId,
      plain: { react: plainReact.dir, astro: plainAstro.dir },
      guarded: { react: guardedReact.dir, astro: guardedAstro.dir },
      packageGuarded: { react: packageReact.dir, astro: packageAstro.dir },
      starters,
      tailwind: { react: tailwindReact.dir, astro: tailwindAstro.dir },
      guardParent,
      undeclaringPackage,
    });
  } catch (error) {
    teardown();
    throw error;
  }
  return teardown;
}
