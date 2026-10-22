// Compiles the package it runs in (its prepack) from src/ to dist/, with tsconfig.build.json, so a
// pack from a fresh clone ships dist/ built from the current code (spec 006, rule 2).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const dist = join(process.cwd(), 'dist');
// Several packs of one package can run at once (the test consumers): each compiles on its own, then
// moves file by file into dist/ by rename, so no pack ever reads a half-written or deleted file.
const fresh = mkdtempSync(join(process.cwd(), '.dist-build-'));

const files = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));

const read = (file) => {
  try {
    return readFileSync(file);
  } catch {
    return undefined;
  }
};

try {
  execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json', '--outDir', fresh], { stdio: 'inherit' });
  const built = files(fresh);
  for (const file of built) {
    const target = join(dist, file);
    if (read(target)?.equals(readFileSync(join(fresh, file)))) continue;
    mkdirSync(dirname(target), { recursive: true });
    renameSync(join(fresh, file), target);
  }
  // A file whose source is gone does not linger in dist/.
  for (const file of files(dist)) if (!built.includes(file)) rmSync(join(dist, file), { force: true });
} finally {
  rmSync(fresh, { recursive: true, force: true });
}
