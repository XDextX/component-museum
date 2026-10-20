import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createConsumer } from './lib/consumer.ts';
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
