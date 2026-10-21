import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { npmCli } from './lib/consumer.ts';
import type { Framework } from './lib/paths.ts';
import { run } from './lib/run.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** One row per package; T-3 adds Astro here. `peers` is the only dependency a package may declare (RF-4). */
const packages: { framework: Framework; dir: string; peers: string[] }[] = [
  { framework: 'react', dir: join(repo, 'packages', 'react'), peers: ['react'] },
];

type Manifest = Record<string, unknown> & {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

const manifestOf = (dir: string): Manifest => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

/** What `npm pack` would publish, without writing a tarball. */
function packedFiles(dir: string): { name: string; files: string[] } {
  const result = run(process.execPath, [npmCli, 'pack', '--dry-run', '--json'], { cwd: dir });
  expect(result.code, result.output).toBe(0);
  const [packed] = JSON.parse(result.output.slice(result.output.indexOf('[')));
  return { name: packed.name, files: packed.files.map((file: { path: string }) => file.path) };
}

for (const { framework, dir, peers } of packages) {
  describe(`@component-museum/${framework}`, () => {
    it('packs under the @component-museum scope with its entry, stylesheet and type declarations (RF-1)', () => {
      const { name, files } = packedFiles(dir);
      expect(name).toBe(`@component-museum/${framework}`);
      const manifest = manifestOf(dir);
      const exports = manifest.exports as Record<string, string | Record<string, string>>;
      const entry = exports['.'] as Record<string, string>;
      for (const path of [entry.import, entry.types, exports['./styles.css'] as string]) {
        expect(files, `${path} is not in the packed files`).toContain(path.replace(/^\.\//, ''));
      }
      expect(files.some((file) => file.endsWith('.d.ts'))).toBe(true);
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
  });
}
