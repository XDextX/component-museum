import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findContractFiles, loadContract } from './lib/contract.ts';
import { frameworkMatrix } from '../gallery/lib/matrix.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const entryFiles = { react: join(repo, 'packages', 'react', 'src', 'index.ts'), astro: join(repo, 'packages', 'astro', 'index.js') };
const components = findContractFiles(repo).map((file) => loadContract(join(repo, file)).name);

/** Copies the real entries to disk (rule: injections run on copies), lets `edit` change one, returns their text. */
function entriesFromCopies(edit: (copies: { react: string; astro: string }) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'matrix-'));
  try {
    const copies = { react: join(dir, 'react.ts'), astro: join(dir, 'astro.js') };
    copyFileSync(entryFiles.react, copies.react);
    copyFileSync(entryFiles.astro, copies.astro);
    edit(copies);
    return { react: readFileSync(copies.react, 'utf8'), astro: readFileSync(copies.astro, 'utf8') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('frameworkMatrix (RF-4)', () => {
  it('marks Button present in both frameworks with the real entries', () => {
    expect(frameworkMatrix(entriesFromCopies(() => {}), components).Button).toEqual({ react: 'present', astro: 'present' });
  });

  it('marks Button x astro missing when a copy of the Astro entry lacks its export (rule 4)', () => {
    const entries = entriesFromCopies((copies) => {
      const source = readFileSync(copies.astro, 'utf8');
      writeFileSync(copies.astro, source.replace(/^export \{ default as Button \}.*$/m, ''));
    });
    expect(frameworkMatrix(entries, components).Button).toEqual({ react: 'present', astro: 'missing' });
  });

  it('ignores type-only exports and gives an empty matrix without components', () => {
    expect(frameworkMatrix({ react: "export type { Button } from './B.js';", astro: '' }, ['Button']).Button.react).toBe('missing');
    expect(frameworkMatrix({ react: '', astro: '' }, [])).toEqual({});
  });
});
