import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';
import { buildConsumerAsync, createConsumer, npmCli, scaffold } from './lib/consumer.ts';
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
  /** Parent of the guarded consumers, where RF-5 puts museum-undeclared in node_modules. */
  guardParent: string;
  /** The test package plus an import of museum-undeclared it does not declare. */
  undeclaringPackage: string;
};

declare module 'vitest' {
  export interface ProvidedContext {
    consumers: SharedConsumers;
    /** The repo before anything ran (RF-6). */
    treeBefore: Snapshot;
    /** Spec 002 RF-3: each consumer that installs the framework packages, built once here. */
    builds: Record<'plain' | 'packageGuarded', Record<Framework, RunResult>>;
    /** Spec 002 RF-5: each guarded 002 consumer's type check, clean and with variant="nope". */
    typeChecks: Record<Framework, { clean: RunResult; nope: RunResult }>;
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

/** The consumer's type check, clean and then with a Button whose variant is not in the contract. */
async function checkButtonTypes(framework: Framework, dir: string): Promise<{ clean: RunResult; nope: RunResult }> {
  if (framework === 'astro') {
    // The Astro starter has no type checker: only this consumer gets one (the untouched one never does).
    const install = await npmRun(['install', '--no-audit', '--no-fund', '--save-dev', '@astrojs/check@^0.9.11', 'typescript@^6.0.3'], dir);
    if (install.code !== 0) throw new Error(`npm install @astrojs/check failed in ${dir}\n${install.output}`);
  }
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

/** Creates every consumer once per run, in parallel, and removes them all when the run ends. */
export default async function setup(project: TestProject): Promise<() => void> {
  const runId = randomUUID().slice(0, 8);
  // One run per checkout (T-9): a second npm test would see this run's RF-5 module in RF-6.
  const releaseLock = await acquireLock(join(repo, 'node_modules', '.museum-test-lock'), { runId });
  // Before any consumer exists, so whatever creating them changes in the repo shows in RF-6.
  project.provide('treeBefore', takeSnapshot(repo, snapshotRoots));
  const base = tmpdir();
  const guardRunId = `${runId}-guard`;
  const guardParent = join(base, `cm-${guardRunId}`);
  const packageRunId = `${runId}-pkg`;
  const starterParent = join(base, `cm-${runId}-starter`);
  const created = [join(base, `cm-${runId}`), guardParent, join(base, `cm-${packageRunId}`), starterParent];
  const teardown = () => {
    created.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    releaseLock();
  };

  try {
    const [reactStarter, astroStarter] = await Promise.all(frameworks.map((f) => scaffold(starterParent, f)));
    const starters = { react: reactStarter, astro: astroStarter };

    const undeclaringPackage = join(guardParent, 'pkg-undeclaring');
    cpSync(testPackage, undeclaringPackage, { recursive: true });
    const index = join(undeclaringPackage, 'index.js');
    writeFileSync(index, `import 'museum-undeclared';\n${readFileSync(index, 'utf8')}`);

    // A consumer left at the same path by an earlier run: createConsumer must wipe it (RF-4).
    const leftoverDir = consumerDir(base, runId, 'react');
    mkdirSync(leftoverDir, { recursive: true });
    writeFileSync(join(leftoverDir, 'leftover.txt'), 'from an earlier run');

    const [plainReact, plainAstro, guardedReact, guardedAstro, packageReact, packageAstro] = await Promise.all([
      createConsumer(base, runId, 'react', testPackage, { starter: starters.react, packages: [frameworkPackage('react')] }),
      createConsumer(base, runId, 'astro', testPackage, { starter: starters.astro, packages: [frameworkPackage('astro')] }),
      createConsumer(base, guardRunId, 'react', undeclaringPackage, { starter: starters.react, guardResolution: true }),
      createConsumer(base, guardRunId, 'astro', undeclaringPackage, { starter: starters.astro, guardResolution: true }),
      createConsumer(base, packageRunId, 'react', testPackage, { starter: starters.react, guardResolution: true, packages: [frameworkPackage('react')] }),
      createConsumer(base, packageRunId, 'astro', testPackage, { starter: starters.astro, guardResolution: true, packages: [frameworkPackage('astro')] }),
    ]);

    // Built here, not in a test: the shared consumers stay read-only for every test file.
    const [buildPlainReact, buildPlainAstro, buildPackageReact, buildPackageAstro] = await Promise.all(
      [plainReact, plainAstro, packageReact, packageAstro].map(buildConsumerAsync),
    );
    project.provide('builds', {
      plain: { react: buildPlainReact, astro: buildPlainAstro },
      packageGuarded: { react: buildPackageReact, astro: buildPackageAstro },
    });

    // 002 RF-5, after the builds: a wrong variant must break each guarded consumer's own type check.
    const typeChecks = Object.fromEntries(
      await Promise.all(
        frameworks.map(async (framework) => [framework, await checkButtonTypes(framework, framework === 'react' ? packageReact : packageAstro)] as const),
      ),
    ) as Record<Framework, { clean: RunResult; nope: RunResult }>;
    project.provide('typeChecks', typeChecks);

    project.provide('consumers', {
      base,
      runId,
      plain: { react: plainReact, astro: plainAstro },
      guarded: { react: guardedReact, astro: guardedAstro },
      packageGuarded: { react: packageReact, astro: packageAstro },
      starters,
      guardParent,
      undeclaringPackage,
    });
  } catch (error) {
    teardown();
    throw error;
  }
  return teardown;
}
