import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { packPackage } from './lib/consumer.ts';
import type { Framework } from './lib/paths.ts';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = readFileSync(join(repo, 'styles', 'museum.css'));
const frameworks: Framework[] = ['react', 'astro'];

/** The bytes of `path` inside a .tgz, or undefined; npm tarballs are plain ustar with short names. */
export function fileInTarball(tgz: Buffer, path: string): Buffer | undefined {
  const tar = gunzipSync(tgz);
  const field = (from: number, length: number) => tar.toString('utf8', from, from + length).replace(/\0.*$/s, '');
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const name = field(offset, 100);
    if (!name) return undefined;
    const size = parseInt(field(offset + 124, 12).trim() || '0', 8);
    if (name === path) return tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return undefined;
}

describe('one CSS source, copied into each package when it is packed', { timeout: 120_000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'cm-styles-'));
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  for (const framework of frameworks) {
    it(`ships styles/museum.css byte for byte as @component-museum/${framework}/styles.css`, async () => {
      const packed = await packPackage(join(repo, 'packages', framework), join(out, framework));
      const shipped = fileInTarball(readFileSync(packed.path), 'package/styles.css');
      expect(shipped, 'styles.css is not in the tarball').toBeDefined();
      expect(shipped!.equals(source), 'the packed styles.css differs from styles/museum.css').toBe(true);
    });
  }
});
