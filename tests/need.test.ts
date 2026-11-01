import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { run } from './lib/run.ts';

const fixture = fileURLToPath(new URL('./fixtures/missing-preparation/', import.meta.url));
// vitest's exports hide its CLI file; reach it from package.json, the way npm's bin link does.
const vitestPackage = createRequire(import.meta.url).resolve('vitest/package.json');
const vitestCli = join(dirname(vitestPackage), 'vitest.mjs');

describe('a test that asks for a preparation nobody made (spec 017, RF-8)', () => {
  it('fails and names the preparation', () => {
    const result = run(process.execPath, [vitestCli, 'run', '--root', fixture], { cwd: fixture });

    expect(result.code).not.toBe(0);
    expect(result.output).toContain('falta la preparación `gallery`');
    expect(result.output).toContain('needs-gallery.test.ts');
  });
});
