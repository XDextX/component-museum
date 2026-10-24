import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { preparations, splitTests } from './lib/projects.ts';

const root = resolve(import.meta.dirname, '..');
// Built, not written out: a literal call here would make this file ask for a preparation itself.
const call = (fn: string, name: string) => `${fn}('${name}')`;

// Looks at the import, not at the calls splitTests reads: a second way to see the same thing.
const importsPreparation = (source: string) => /^import [^;]*\b(?:need|inject)\b[^;]*from '(?:vitest|\.\/lib\/need\.ts)'/m.test(source);

describe('which preparations a test file asks for (spec 017, RF-7)', () => {
  it('reads the name from need and from inject', () => {
    expect(preparations(`const a = ${call('need', 'gallery')};\nconst b = ${call('inject', 'consumers')}.plain;`)).toEqual(['gallery', 'consumers']);
  });

  it('lists each preparation once', () => {
    expect(preparations(`${call('need', 'gallery')}; ${call('need', 'gallery')};`)).toEqual(['gallery']);
  });

  it('ignores a function that happens to be called inject', () => {
    expect(preparations(`function inject(file: string) {}\ninject(join(dir, 'src'), '// slot');`)).toEqual([]);
  });

  it('puts a new file with inject in e2e and one without in unit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'museum-projects-'));
    try {
      mkdirSync(join(dir, 'tests'));
      writeFileSync(join(dir, 'tests', 'new-with.test.ts'), `import { inject } from 'vitest';\nconst x = ${call('inject', 'builds')};\n`);
      writeFileSync(join(dir, 'tests', 'new-without.test.ts'), `import { it } from 'vitest';\nit('x', () => {});\n`);
      expect(splitTests(dir)).toEqual({ unit: ['tests/new-without.test.ts'], e2e: ['tests/new-with.test.ts'] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the unit and e2e projects of this repo (spec 017, RF-7, RF-8)', () => {
  const { unit, e2e } = splitTests(root);

  it('together hold every test file once, and the contract test is in unit', () => {
    expect(new Set([...unit, ...e2e]).size).toBe(unit.length + e2e.length);
    expect(unit).toContain('tests/contract.test.ts');
    expect(e2e).toContain('tests/gallery.test.ts');
  });

  it('sends the three field-a11y files to e2e, each asking for the consumers itself (spec 017, T-12)', () => {
    for (const kind of ['input', 'textarea', 'checkbox']) expect(e2e).toContain(`tests/field-a11y-${kind}.test.ts`);
    expect(unit.filter((file) => file.includes('field-a11y'))).toEqual([]);
  });

  it('sends consumer-undeclared to e2e, asking for the consumers itself (spec 017, T-13)', () => {
    expect(e2e).toContain('tests/consumer-undeclared.test.ts');
    expect(unit).not.toContain('tests/consumer-undeclared.test.ts');
  });

  it('keeps in e2e only files that import a preparation,so none pays for the globalSetup for nothing', () => {
    expect(e2e.filter((file) => !importsPreparation(readFileSync(join(root, file), 'utf8')))).toEqual([]);
  });

  it('keeps in unit only files that ask for no preparation, so they run without the globalSetup', () => {
    const asking = unit.flatMap((file) => {
      const source = readFileSync(join(root, file), 'utf8');
      return importsPreparation(source) ?[`${file} asks for the preparation ${preparations(source).join(', ')}`] : [];
    });
    expect(asking).toEqual([]);
  });
});

import { exportedContracts, packageExports, slug } from './lib/gallery-pages.ts';

describe('the gallery-browser files (spec 017, T-14)', () => {
  const { unit, e2e } = splitTests(root);
  const files = e2e.filter((file) => file.startsWith('tests/gallery-browser-'));
  const perComponent = files.filter((file) => file !== 'tests/gallery-browser-classes.test.ts');

  it('are all in e2e, each asking for the gallery itself, and none is left in unit', () => {
    expect(unit.filter((file) => file.includes('gallery-browser'))).toEqual([]);
    expect(files.filter((file) => !preparations(readFileSync(join(root, file), 'utf8')).includes('gallery'))).toEqual([]);
    expect(files).toContain('tests/gallery-browser-classes.test.ts');
  });

  it('have one file for each contract with a React story, so a new component cannot go untested in the browser', () => {
    const wanted = exportedContracts(root).filter((c) => packageExports(root).React.includes(c.name)).map((c) => `tests/gallery-browser-${slug(c.name)}.test.ts`);
    expect(perComponent.sort()).toEqual(wanted.sort());
  });
});
