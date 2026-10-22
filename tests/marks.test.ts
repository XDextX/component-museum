import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mark = /pendientes? de la spec de arquitectura/g;

/** Joins a file into one line (marks wrap across lines) after dropping `Changed:` entries, which keep history. */
function oneLine(file: string): string {
  const kept: string[] = [];
  let inChanged = false;
  for (const line of readFileSync(resolve(repo, file), 'utf8').split(/\r?\n/)) {
    if (line.startsWith('Changed:')) inChanged = true;
    else if (line.trim() === '') inChanged = false;
    if (!inChanged) kept.push(line);
  }
  return kept.join(' ').replace(/\s+/g, ' ');
}

describe('marks «pendiente de la spec de arquitectura» (004, RF-11)', () => {
  it.each(['docs/constitution.md', 'AGENTS.md'])('%s no deja ninguna', (file) => {
    expect(oneLine(file).match(mark) ?? []).toEqual([]);
  });
});
