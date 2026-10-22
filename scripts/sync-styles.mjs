// Copies styles/museum.css to styles.css and the root LICENSE to LICENSE, byte for byte, in the
// package it runs in (its prepack).
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const copies = [
  ['../styles/museum.css', 'styles.css'],
  ['../LICENSE', 'LICENSE'],
];

for (const [from, to] of copies) {
  const source = readFileSync(new URL(from, import.meta.url));
  const target = join(process.cwd(), to);

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
}
