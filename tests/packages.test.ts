import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findContractFiles, loadContract } from './lib/contract.ts';
import { npmCli } from './lib/consumer.ts';
import { entryExports } from '../gallery/lib/matrix.ts';
import type { Framework } from './lib/paths.ts';
import { run } from './lib/run.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** One row per package. `peers` is the only dependency a package may declare (RF-4). */
const packages: { framework: Framework; dir: string; peers: string[]; keywords: string[] }[] = [
  { framework: 'react', dir: join(repo, 'packages', 'react'), peers: ['react'], keywords: [] },
  // astro-component is how Astro tells a component package it must compile, without ssr.noExternal.
  { framework: 'astro', dir: join(repo, 'packages', 'astro'), peers: ['astro'], keywords: ['astro-component'] },
];

type Manifest = Record<string, unknown> & {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  keywords?: string[];
};

const manifestOf = (dir: string): Manifest => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

/** What `npm pack` would publish, without writing a tarball. */
function packedFiles(dir: string): { name: string; files: string[] } {
  // --silent: the prepack banner goes to stderr, which run() appends after the JSON.
  const result = run(process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--silent'], { cwd: dir });
  expect(result.code, result.output).toBe(0);
  const [packed] = JSON.parse(result.output.slice(result.output.indexOf('[')));
  return { name: packed.name, files: packed.files.map((file: { path: string }) => file.path) };
}

/** RF-2: one message per component missing from a set the other two have. */
export function crossProblems(folders: string[], exported: string[], contracts: string[]): string[] {
  const sets = { folder: folders, export: exported, contract: contracts };
  const all = [...new Set([...folders, ...exported, ...contracts])].sort();
  return all.flatMap((name) =>
    Object.entries(sets).filter(([, names]) => !names.includes(name)).map(([kind]) => `${name} has no ${kind}`),
  );
}

describe('crossProblems (RF-2)', () => {
  it('is quiet when the three sets agree', () => {
    expect(crossProblems(['Button'], ['Button'], ['Button'])).toEqual([]);
  });
  it('names the component and where it is missing', () => {
    expect(crossProblems(['Button', 'Ghost'], ['Button'], ['Button'])).toEqual(['Ghost has no export', 'Ghost has no contract']);
    expect(crossProblems(['Button'], ['Button', 'Phantom'], ['Button'])).toEqual(['Phantom has no folder', 'Phantom has no contract']);
    expect(crossProblems(['Button'], [], ['Button'])).toEqual(['Button has no export']);
  });
  it('reads value exports only, aliases included', () => {
    const source = ["export { Button } from './B.js';", "export type { ButtonProps } from './B.js';", "export { default as Card } from './C.astro';"].join('\n');
    expect(entryExports(source)).toEqual(['Button', 'Card']);
  });
});

/** Spec 006 RF-1: what a publishable manifest still lacks; `folder` is the package folder under packages/. */
export function publishProblems(manifest: Record<string, unknown>, folder: string): string[] {
  const repository = manifest.repository as { type?: string; url?: string; directory?: string } | undefined;
  const publishConfig = manifest.publishConfig as { access?: string } | undefined;
  const problems: string[] = [];
  if (manifest.license !== 'MIT') problems.push('license is not MIT');
  if (repository?.url !== 'git+https://github.com/XDextX/component-museum.git') problems.push('repository.url is missing or wrong');
  if (repository?.directory !== `packages/${folder}`) problems.push(`repository.directory is not packages/${folder}`);
  if (publishConfig?.access !== 'public') problems.push('publishConfig.access is not public');
  return problems;
}

/** Spec 006 RF-1: the root LICENSE must be the MIT text in the name of XDextX. */
export function licenseProblems(text: string): string[] {
  const problems: string[] = [];
  if (!text.startsWith('MIT License')) problems.push('LICENSE is not the MIT License');
  if (!/^Copyright \(c\) \d{4} XDextX$/m.test(text.replace(/\r\n/g, '\n'))) problems.push('LICENSE is not in the name of XDextX');
  return problems;
}

describe('publishProblems and licenseProblems (spec 006 RF-1)', () => {
  const good = {
    license: 'MIT',
    repository: { type: 'git', url: 'git+https://github.com/XDextX/component-museum.git', directory: 'packages/react' },
    publishConfig: { access: 'public' },
  };
  it('is quiet for a complete manifest', () => {
    expect(publishProblems(good, 'react')).toEqual([]);
  });
  it('names each missing or wrong field', () => {
    expect(publishProblems({ ...good, license: 'ISC' }, 'react')).toEqual(['license is not MIT']);
    expect(publishProblems({ ...good, repository: { ...good.repository, directory: 'packages/otro' } }, 'react')).toEqual(['repository.directory is not packages/react']);
    expect(publishProblems({ ...good, publishConfig: undefined }, 'react')).toEqual(['publishConfig.access is not public']);
    expect(publishProblems({ ...good, repository: undefined }, 'react')).toHaveLength(2);
  });
  it('accepts only an MIT LICENSE in the name of XDextX', () => {
    expect(licenseProblems('MIT License\n\nCopyright (c) 2026 XDextX\n')).toEqual([]);
    expect(licenseProblems('MIT License\n\nCopyright (c) 2026 Someone\n')).toEqual(['LICENSE is not in the name of XDextX']);
    expect(licenseProblems('Apache License\n\nCopyright (c) 2026 XDextX\n')).toEqual(['LICENSE is not the MIT License']);
  });
});

for (const { framework, dir, peers, keywords } of packages) {
  describe(`@component-museum/${framework}`, () => {
    it('packs under the @component-museum scope with its entry, stylesheet and type declarations (RF-1)', () => {
      const { name, files } = packedFiles(dir);
      expect(name).toBe(`@component-museum/${framework}`);
      const manifest = manifestOf(dir);
      const exports = manifest.exports as Record<string, string | Record<string, string>>;
      const entry = exports['.'] as Record<string, string>;
      for (const path of [entry.import, entry.types, exports['./styles.css'] as string, './LICENSE']) {
        expect(files, `${path} is not in the packed files`).toContain(path.replace(/^\.\//, ''));
      }
      expect(files.some((file) => file.endsWith('.d.ts'))).toBe(true);
    });

    it('declares license, repository directory and public access, and the root LICENSE is MIT by XDextX (spec 006 RF-1)', () => {
      expect(publishProblems(manifestOf(dir), framework)).toEqual([]);
      expect(licenseProblems(readFileSync(join(repo, 'LICENSE'), 'utf8'))).toEqual([]);
    });

    it('crosses src/ folders, entry exports and contracts on the same components (RF-2)', () => {
      const folders = readdirSync(join(dir, 'src'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
      const entry = framework === 'react' ? 'src/index.ts' : 'index.js';
      const contracts = findContractFiles(repo).map((file) => loadContract(join(repo, file)).name);
      expect(existsSync(join(dir, entry))).toBe(true);
      expect(crossProblems(folders, entryExports(readFileSync(join(dir, entry), 'utf8')), contracts)).toEqual([]);
    });

    it(`declares no dependency but ${peers.join(', ')} as a peer (RF-4)`, () => {
      const manifest = manifestOf(dir);
      const declared = {
        dependencies: Object.keys(manifest.dependencies ?? {}),
        peerDependencies: Object.keys(manifest.peerDependencies ?? {}),
        optionalDependencies: Object.keys(manifest.optionalDependencies ?? {}),
      };
      expect(declared).toEqual({ dependencies: [], peerDependencies: peers, optionalDependencies: [] });
    });

    it('declares the same engines.node as the repo root (NFR Plataformas)', () => {
      const root = manifestOf(repo).engines as Record<string, string> | undefined;
      const own = manifestOf(dir).engines as Record<string, string> | undefined;
      expect(root?.node).toBeTruthy();
      expect(own?.node).toBe(root?.node);
    });

    it.runIf(keywords.length > 0)(`lists the keywords ${keywords.join(', ')}`, () => {
      expect(manifestOf(dir).keywords ?? []).toEqual(expect.arrayContaining(keywords));
    });
  });
}
