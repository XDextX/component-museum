import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The preparations a test file asks for: `need('x')` or `inject('x')` with a literal name, each once. */
export function preparations(source: string): string[] {
  const names = [...source.matchAll(/\b(?:need|inject)\(\s*'(\w+)'\s*\)/g)].map((match) => match[1]);
  return [...new Set(names)];
}

/**
 * Spec 017 RF-7: the test files under `root`, split by whether they need the globalSetup. Read from the files,
 * so a new file that asks for a preparation lands in e2e on its own.
 */
export function splitTests(root: string): { unit: string[]; e2e: string[] } {
  // Walks by hand: tests/fixtures holds installed packages, and a recursive readdir over them takes a minute.
  const walk = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return entry.name === 'fixtures' || entry.name === 'node_modules' ? [] : walk(path);
      return path.endsWith('.test.ts') ? [path] : [];
    });
  const files = walk('tests').sort();
  const needs = (file: string) => preparations(readFileSync(join(root, file), 'utf8')).length > 0;
  return { unit: files.filter((file) => !needs(file)), e2e: files.filter(needs) };
}
