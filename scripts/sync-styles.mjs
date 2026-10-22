// Copies styles/museum.css, byte for byte, to the styles.css of the package it runs in (its prepack).
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(new URL('../styles/museum.css', import.meta.url));
const target = join(process.cwd(), 'styles.css');

let current;
try {
  current = readFileSync(target);
} catch {
  current = undefined;
}

// Two packs of one package can run at once (the test consumers): skip an identical copy, and
// replace a stale one through a rename, so no pack ever reads a half-written file.
if (!current?.equals(source)) {
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, source);
  renameSync(temporary, target);
}
