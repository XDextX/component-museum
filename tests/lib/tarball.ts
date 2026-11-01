import { gunzipSync } from 'node:zlib';

/** Every entry of a .tgz in archive order; npm tarballs are plain ustar with short names. */
function entries(tgz: Buffer): { name: string; data: Buffer }[] {
  const tar = gunzipSync(tgz);
  const field = (from: number, length: number) => tar.toString('utf8', from, from + length).replace(/\0.*$/s, '');
  const found: { name: string; data: Buffer }[] = [];
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const name = field(offset, 100);
    if (!name) break;
    const size = parseInt(field(offset + 124, 12).trim() || '0', 8);
    found.push({ name, data: tar.subarray(offset + 512, offset + 512 + size) });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return found;
}

/** Every file path inside a .tgz, in archive order (`package/...` for an npm tarball). */
export const tarballFiles = (tgz: Buffer): string[] => entries(tgz).map((entry) => entry.name);

/** The bytes of `path` inside a .tgz, or undefined. */
export const fileInTarball = (tgz: Buffer, path: string): Buffer | undefined => entries(tgz).find((entry) => entry.name === path)?.data;
