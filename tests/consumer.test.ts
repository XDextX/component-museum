import { cpSync, existsSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { buildConsumer, configFiles, installPackage, packPackage } from './lib/consumer.ts';
import { consumerDir, isOutside, type Framework } from './lib/paths.ts';
import { diffSnapshots, snapshotRoots, takeSnapshot } from './lib/snapshot.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const frameworks: Framework[] = ['react', 'astro'];
// Created once per run by tests/global-setup.ts; the plain ones are read-only here.
const consumers = inject('consumers');

// RF-6: the tree as global-setup.ts saw it before creating anything; the suite must leave it so.
afterAll(() => {
  expect(diffSnapshots(inject('treeBefore'), takeSnapshot(repo, snapshotRoots))).toEqual([]);
});

/** Where the consumer's own require finds the package, with links resolved. */
function resolvedFrom(dir: string): string {
  return realpathSync(createRequire(join(dir, 'package.json')).resolve('museum-test-package'));
}

describe('external consumer (RF-4)', () => {
  for (const framework of frameworks) {
    it(`creates the ${framework} consumer outside the repo, under cm-<runId>`, () => {
      const dir = consumers.plain[framework];
      expect(dir).toBe(consumerDir(consumers.base, consumers.runId, framework));
      expect(isOutside(repo, dir)).toBe(true);
    });

    it(`resolves the test package from the ${framework} consumer's own node_modules`, () => {
      const dir = consumers.plain[framework];
      const resolved = resolvedFrom(dir);
      expect(isOutside(realpathSync(join(dir, 'node_modules')), resolved)).toBe(false);
      expect(isOutside(repo, resolved)).toBe(true);
    });

    // The 002 builds on an untouched consumer: only the RF-5 consumers carry the guard.
    it(`leaves the ${framework} consumer's config exactly as its starter writes it`, () => {
      const file = configFiles[framework];
      const dir = consumers.plain[framework];
      expect(readFileSync(join(dir, file), 'utf8')).toBe(readFileSync(join(consumers.starters[framework], file), 'utf8'));
      expect(existsSync(join(dir, 'museum-guard.mjs'))).toBe(false);
    });
  }

  it('wipes and recreates a consumer left by an earlier run at the same path', () => {
    // global-setup.ts left leftover.txt at this path before creating the consumer.
    const dir = consumers.plain.react;
    expect(existsSync(join(dir, 'leftover.txt'))).toBe(false);
    expect(existsSync(join(dir, 'node_modules', 'museum-test-package', 'package.json'))).toBe(true);
  });
});

describe('undeclared module (RF-5)', { timeout: 300_000 }, () => {
  const undeclaredFixture = join(repo, 'tests', 'fixtures', 'undeclared-module');
  const inRepoRoot = join(repo, 'node_modules', 'museum-undeclared');
  const inParent = join(consumers.guardParent, 'node_modules', 'museum-undeclared');

  for (const framework of frameworks) {
    it(`fails the ${framework} build with the module in the repo root's node_modules, then in the consumer's parent, and passes once declared`, async () => {
      // This test is the only one that touches its guarded consumer, and the last to use it.
      const dir = consumers.guarded[framework];
      expect(existsSync(inRepoRoot), `${inRepoRoot} exists before the test; refusing to touch it`).toBe(false);

      cpSync(undeclaredFixture, inRepoRoot, { recursive: true });
      const fromRepoRoot = buildConsumer(dir);
      rmSync(inRepoRoot, { recursive: true });
      expect(fromRepoRoot.code, fromRepoRoot.output).not.toBe(0);
      expect(fromRepoRoot.output).toContain('museum-undeclared');

      cpSync(undeclaredFixture, inParent, { recursive: true });
      const fromParent = buildConsumer(dir);
      rmSync(inParent, { recursive: true });
      expect(fromParent.code, fromParent.output).not.toBe(0);
      expect(fromParent.output).toContain('resolves outside the consumer');

      const declaring = join(consumers.guardParent, `pkg-declaring-${framework}`);
      cpSync(consumers.undeclaringPackage, declaring, { recursive: true });
      const manifest = join(declaring, 'package.json');
      const undeclaredTarball = await packPackage(undeclaredFixture, join(consumers.guardParent, `pack-undeclared-${framework}`));
      const json = JSON.parse(readFileSync(manifest, 'utf8'));
      json.dependencies = { 'museum-undeclared': `file:${undeclaredTarball.path}` };
      writeFileSync(manifest, JSON.stringify(json, null, 2));
      await installPackage(dir, declaring);
      const declared = buildConsumer(dir);
      expect(declared.code, declared.output).toBe(0);
    });
  }
});

/** True when some file under the consumer's dist/ contains `text`: the build really used Button. */
function builtWith(dir: string, text: string): boolean {
  const dist = join(dir, 'dist');
  return readdirSync(dist, { recursive: true, withFileTypes: true }).some(
    (entry) => entry.isFile() && readFileSync(join(entry.parentPath, entry.name), 'utf8').includes(text),
  );
}

describe('framework packages in the consumers (RF-3)', () => {
  // Built once by global-setup.ts, so the shared consumers stay read-only here.
  const builds = inject('builds');

  for (const framework of frameworks) {
    for (const [kind, dirs] of [['untouched', consumers.plain], ['guarded 002', consumers.packageGuarded]] as const) {
      it(`builds the ${kind} ${framework} consumer with @component-museum/${framework}, Button and its stylesheet`, () => {
        const build = builds[kind === 'untouched' ? 'plain' : 'packageGuarded'][framework];
        expect(build.code, build.output).toBe(0);
        const dir = dirs[framework];
        expect(existsSync(join(dir, 'node_modules', '@component-museum', framework, 'package.json'))).toBe(true);
        // The package's class and an instance id from the entry: Button and the entry both reached the build.
        expect(builtWith(dir, 'museum-button')).toBe(true);
        expect(builtWith(dir, 'button-outline-lg')).toBe(true);
      });
    }
  }
});

describe('Button types in the consumers (002 RF-5)', () => {
  // Checked once by global-setup.ts in the 002 guarded consumers: tsc -b (React), astro check (Astro).
  const typeChecks = inject('typeChecks');

  for (const framework of frameworks) {
    it(`passes the ${framework} consumer's type check, and fails it once a Button has variant="nope"`, () => {
      const { clean, nope } = typeChecks[framework];
      expect(clean.code, clean.output).toBe(0);
      expect(nope.code, nope.output).not.toBe(0);
      expect(nope.output).toContain('"nope"');
    });
  }
});
