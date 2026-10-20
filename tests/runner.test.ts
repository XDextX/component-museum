import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { run } from './lib/run.ts';

const fixture = fileURLToPath(new URL('./fixtures/failing-suite/', import.meta.url));
// vitest's exports hide its CLI file; reach it from package.json, the way npm's bin link does.
const vitestPackage = createRequire(import.meta.url).resolve('vitest/package.json');
const vitestCli = join(dirname(vitestPackage), 'vitest.mjs');

describe('a failing test (RF-2)', () => {
  it('stops the suite with a non-zero code and names the test and its file', () => {
    const result = run(process.execPath, [vitestCli, 'run', '--root', fixture], { cwd: fixture });

    expect(result.code).not.toBe(0);
    expect(result.output).toContain('fixture test that always fails');
    expect(result.output).toContain('failing.test.ts');
  });
});

describe('run', () => {
  it('returns the code and output of a command without throwing', () => {
    const result = run(process.execPath, ['-e', 'console.log("out"); console.error("err"); process.exit(3)']);

    expect(result.code).toBe(3);
    expect(result.output).toContain('out');
    expect(result.output).toContain('err');
  });
});
