import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from './lib/run.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = join(repo, 'tests', 'fixtures', 'test-package');
const require = createRequire(import.meta.url);
const tscCli = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const astroCli = join(dirname(require.resolve('astro/package.json')), 'bin', 'astro.mjs');

let copy: string | undefined;

/** Copies the test package outside the repo, with the repo's node_modules reachable through a junction. */
function copyFixture(): string {
  const base = mkdtempSync(join(tmpdir(), 'cm-typecheck-'));
  copy = join(base, 'test-package');
  cpSync(fixture, copy, { recursive: true, filter: (src) => !/[\\/](node_modules|\.astro)$/.test(src) });
  // Without it, astro check cannot find @astrojs/check, prompts to install it and exits 0.
  symlinkSync(join(repo, 'node_modules'), join(base, 'node_modules'), 'junction');
  return copy;
}

function inject(file: string, from: string, to: string): void {
  const source = readFileSync(file, 'utf8');
  expect(source).toContain(from);
  writeFileSync(file, source.replace(from, to));
}

const tsc = (dir: string) => run(process.execPath, [tscCli, '--noEmit', '-p', dir]);
const astroCheck = (dir: string) => run(process.execPath, [astroCli, 'check', '--root', dir]);

afterEach(() => {
  if (!copy) return;
  const base = dirname(copy);
  // Remove the junction itself first, so the recursive delete can never follow it into the repo.
  rmSync(join(base, 'node_modules'));
  rmSync(base, { recursive: true });
  copy = undefined;
});

describe('type checking (RF-8)', { timeout: 120_000 }, () => {
  it('passes on the clean test package', () => {
    const dir = copyFixture();
    const result = { tsc: tsc(dir), astro: astroCheck(dir) };
    expect(result.tsc.code, result.tsc.output).toBe(0);
    expect(result.astro.code, result.astro.output).toBe(0);
    expect(result.astro.output).toContain('0 errors');
  });

  it('fails tsc on a type error in the .tsx', () => {
    const dir = copyFixture();
    inject(join(dir, 'src', 'sample.tsx'), '// type-error-slot', "const injected: number = 'x';");
    const result = tsc(dir);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('sample.tsx');
  });

  it('fails astro check on a type error in the .astro', () => {
    const dir = copyFixture();
    inject(join(dir, 'src', 'Sample.astro'), '// type-error-slot', "const injected: number = 'x';");
    const result = astroCheck(dir);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('Sample.astro');
  });
});
