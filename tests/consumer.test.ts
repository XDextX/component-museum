import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildConsumer, configFiles, createConsumer, installPackage, packPackage, scaffold } from './lib/consumer.ts';
import { consumerDir, isOutside, type Framework } from './lib/paths.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const testPackage = join(repo, 'tests', 'fixtures', 'test-package');
const base = tmpdir();
const runId = randomUUID().slice(0, 8);
const frameworks: Framework[] = ['react', 'astro'];
const consumers = new Map<Framework, string>();

/** Where the consumer's own require finds the package, with links resolved. */
function resolvedFrom(dir: string): string {
  return realpathSync(createRequire(join(dir, 'package.json')).resolve('museum-test-package'));
}

// Each consumer is a clean install from npm: minutes on a cold cache, not seconds.
describe('external consumer (RF-4)', { timeout: 300_000 }, () => {
  beforeAll(() => {
    for (const framework of frameworks) {
      consumers.set(framework, createConsumer(base, runId, framework, testPackage));
    }
  }, 300_000);

  afterAll(() => {
    rmSync(join(base, `cm-${runId}`), { recursive: true, force: true });
    rmSync(join(base, `cm-${runId}-starter`), { recursive: true, force: true });
  });

  for (const framework of frameworks) {
    it(`creates the ${framework} consumer outside the repo, under cm-<runId>`, () => {
      const dir = consumers.get(framework)!;
      expect(dir).toBe(consumerDir(base, runId, framework));
      expect(isOutside(repo, dir)).toBe(true);
    });

    it(`resolves the test package from the ${framework} consumer's own node_modules`, () => {
      const dir = consumers.get(framework)!;
      const resolved = resolvedFrom(dir);
      expect(isOutside(realpathSync(join(dir, 'node_modules')), resolved)).toBe(false);
      expect(isOutside(repo, resolved)).toBe(true);
    });

    // The 002 builds on an untouched consumer: only the RF-5 test opts into the guard.
    it(`leaves the ${framework} consumer's config exactly as its starter writes it`, () => {
      const starter = scaffold(join(base, `cm-${runId}-starter`), framework);
      const file = configFiles[framework];
      const dir = consumers.get(framework)!;
      expect(readFileSync(join(dir, file), 'utf8')).toBe(readFileSync(join(starter, file), 'utf8'));
      expect(existsSync(join(dir, 'museum-guard.mjs'))).toBe(false);
    });
  }

  it('wipes and recreates a consumer left by an earlier run at the same path', () => {
    const dir = consumers.get('react')!;
    const leftover = join(dir, 'leftover.txt');
    writeFileSync(leftover, 'from an earlier run');

    expect(createConsumer(base, runId, 'react', testPackage)).toBe(dir);
    expect(existsSync(leftover)).toBe(false);
    expect(existsSync(join(dir, 'node_modules', 'museum-test-package', 'package.json'))).toBe(true);
  });
});

describe('undeclared module (RF-5)', { timeout: 300_000 }, () => {
  const guardRunId = `${runId}-guard`;
  const guardParent = join(base, `cm-${guardRunId}`);
  const undeclaredFixture = join(repo, 'tests', 'fixtures', 'undeclared-module');
  const inRepoRoot = join(repo, 'node_modules', 'museum-undeclared');
  const inParent = join(guardParent, 'node_modules', 'museum-undeclared');
  // A copy of the test package that imports museum-undeclared without declaring it.
  const undeclaringPackage = join(guardParent, 'pkg-undeclaring');

  beforeAll(() => {
    expect(existsSync(inRepoRoot), `${inRepoRoot} exists before the test; refusing to touch it`).toBe(false);
    mkdirSync(guardParent, { recursive: true });
    cpSync(testPackage, undeclaringPackage, { recursive: true });
    const index = join(undeclaringPackage, 'index.js');
    writeFileSync(index, `import 'museum-undeclared';
${readFileSync(index, 'utf8')}`);
  });

  afterAll(() => {
    rmSync(inRepoRoot, { recursive: true, force: true });
    rmSync(guardParent, { recursive: true, force: true });
  });

  for (const framework of frameworks) {
    it(`fails the ${framework} build with the module in the repo root's node_modules, then in the consumer's parent, and passes once declared`, () => {
      const dir = createConsumer(base, guardRunId, framework, undeclaringPackage, { guardResolution: true });

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

      const declaring = join(guardParent, `pkg-declaring-${framework}`);
      cpSync(undeclaringPackage, declaring, { recursive: true });
      const manifest = join(declaring, 'package.json');
      const undeclaredTarball = packPackage(undeclaredFixture, guardParent);
      const json = JSON.parse(readFileSync(manifest, 'utf8'));
      json.dependencies = { 'museum-undeclared': `file:${undeclaredTarball.path}` };
      writeFileSync(manifest, JSON.stringify(json, null, 2));
      installPackage(dir, declaring);
      const declared = buildConsumer(dir);
      expect(declared.code, declared.output).toBe(0);
    });
  }
});
