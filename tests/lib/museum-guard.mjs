import { existsSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';

/**
 * Vite plugin for the RF-5 test consumer only: fails the build when an import resolves to a file
 * outside `root`, so a module found in some parent node_modules cannot pass for a declared one.
 */
export default function museumGuard(root) {
  const outside = (file) => {
    if (!file || !existsSync(file)) return false;
    const rel = relative(root, file);
    return isAbsolute(rel) || rel.split(sep)[0] === '..';
  };
  return {
    name: 'museum-guard-resolution',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith('\0')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      // An external keeps its bare id; where it was found is in packageJsonPath.
      const found = [resolved?.id.split('?')[0], resolved?.packageJsonPath].find(outside);
      if (found) this.error(`"${source}" imported from ${importer} resolves outside the consumer: ${found}`);
      return resolved;
    },
  };
}
