import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { need } from './lib/need.ts';
import { buildConsumerAsync, installPackage, packPackage } from './lib/consumer.ts';
import type { RunResult } from './lib/run.ts';
import type { Framework } from './lib/paths.ts';
import { diffSnapshots, snapshotRoots, takeSnapshot } from './lib/snapshot.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const frameworks: Framework[] = ['react', 'astro'];
// Created once per run by tests/global-setup.ts; this file is the only one that touches the guarded ones.
const consumers = need('consumers');

// RF-6: the tree as global-setup.ts saw it before creating anything; the suite must leave it so. Checked here, after
// the module put in the repo root is gone: in consumer.test.ts it would race with that module.
afterAll(() => {
  expect(diffSnapshots(need('treeBefore'), takeSnapshot(repo, snapshotRoots))).toEqual([]);
});

// Spec 017, T-13: the RF-5 block of consumer.test.ts, with both frameworks building at once. The module sits in
// the repo root and in the consumer's parent, which both consumers share, so each step runs for both together.
describe('undeclared module (RF-5)', { timeout: 300_000 }, () => {
  const undeclaredFixture = join(repo, 'tests', 'fixtures', 'undeclared-module');
  const inRepoRoot = join(repo, 'node_modules', 'museum-undeclared');
  const inParent = join(consumers.guardParent, 'node_modules', 'museum-undeclared');
  const results = {} as Record<Framework, { fromRepoRoot: RunResult; fromParent: RunResult; declared: RunResult }>;

  /** Puts the module at `where`, builds both consumers at once, and takes it away again. */
  async function buildBoth(where: string): Promise<RunResult[]> {
    cpSync(undeclaredFixture, where, { recursive: true });
    try {
      return await Promise.all(frameworks.map((framework) => buildConsumerAsync(consumers.guarded[framework])));
    } finally {
      rmSync(where, { recursive: true, force: true });
    }
  }

  // The describe's timeout does not reach its hooks, and this one builds four times, two at once: it gets its own.
  beforeAll(async () => {
    expect(existsSync(inRepoRoot), `${inRepoRoot} exists before the test; refusing to touch it`).toBe(false);
    const fromRepoRoot = await buildBoth(inRepoRoot);
    const fromParent = await buildBoth(inParent);
    const declared = await Promise.all(
      frameworks.map(async (framework) => {
        const dir = consumers.guarded[framework];
        const declaring = join(consumers.guardParent, `pkg-declaring-${framework}`);
        cpSync(consumers.undeclaringPackage, declaring, { recursive: true });
        const manifest = join(declaring, 'package.json');
        const undeclaredTarball = await packPackage(undeclaredFixture, join(consumers.guardParent, `pack-undeclared-${framework}`));
        const json = JSON.parse(readFileSync(manifest, 'utf8'));
        json.dependencies = { 'museum-undeclared': `file:${undeclaredTarball.path}` };
        writeFileSync(manifest, JSON.stringify(json, null, 2));
        // This copy's manifest is rewritten here, so it is the one package packed outside the globalSetup.
        await installPackage(dir, await packPackage(declaring, join(consumers.guardParent, `pack-declaring-${framework}`)));
        return buildConsumerAsync(dir);
      }),
    );
    frameworks.forEach((framework, i) => {
      results[framework] = { fromRepoRoot: fromRepoRoot[i], fromParent: fromParent[i], declared: declared[i] };
    });
  }, 300_000);

  for (const framework of frameworks) {
    it(`fails the ${framework} build with the module in the repo root's node_modules, then in the consumer's parent, and passes once declared`, () => {
      const { fromRepoRoot, fromParent, declared } = results[framework];
      expect(fromRepoRoot.code, fromRepoRoot.output).not.toBe(0);
      expect(fromRepoRoot.output).toContain('museum-undeclared');
      expect(fromParent.code, fromParent.output).not.toBe(0);
      expect(fromParent.output).toContain('resolves outside the consumer');
      expect(declared.code, declared.output).toBe(0);
    });
  }
});
