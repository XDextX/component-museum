import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';
import { createConsumer, scaffold } from './lib/consumer.ts';
import { consumerDir, type Framework } from './lib/paths.ts';
import { snapshotRoots, takeSnapshot, type Snapshot } from './lib/snapshot.ts';

export type SharedConsumers = {
  base: string;
  runId: string;
  /** Untouched consumers (RF-4): read-only for every test. */
  plain: Record<Framework, string>;
  /** Consumers with the resolution guard (RF-5): each one modified only by its own RF-5 test. */
  guarded: Record<Framework, string>;
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
  }
}

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const testPackage = join(repo, 'tests', 'fixtures', 'test-package');
const frameworks: Framework[] = ['react', 'astro'];

/** Creates every consumer once per run, in parallel, and removes them all when the run ends. */
export default async function setup(project: TestProject): Promise<() => void> {
  // Before any consumer exists, so whatever creating them changes in the repo shows in RF-6.
  project.provide('treeBefore', takeSnapshot(repo, snapshotRoots));
  const base = tmpdir();
  const runId = randomUUID().slice(0, 8);
  const guardRunId = `${runId}-guard`;
  const guardParent = join(base, `cm-${guardRunId}`);
  const starterParent = join(base, `cm-${runId}-starter`);
  const created = [join(base, `cm-${runId}`), guardParent, starterParent];
  const teardown = () => created.forEach((dir) => rmSync(dir, { recursive: true, force: true }));

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

    const [plainReact, plainAstro, guardedReact, guardedAstro] = await Promise.all([
      createConsumer(base, runId, 'react', testPackage, { starter: starters.react }),
      createConsumer(base, runId, 'astro', testPackage, { starter: starters.astro }),
      createConsumer(base, guardRunId, 'react', undeclaringPackage, { starter: starters.react, guardResolution: true }),
      createConsumer(base, guardRunId, 'astro', undeclaringPackage, { starter: starters.astro, guardResolution: true }),
    ]);

    project.provide('consumers', {
      base,
      runId,
      plain: { react: plainReact, astro: plainAstro },
      guarded: { react: guardedReact, astro: guardedAstro },
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
