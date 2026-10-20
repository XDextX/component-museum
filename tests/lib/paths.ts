import { isAbsolute, join, relative, sep } from 'node:path';

export type Framework = 'react' | 'astro';

/** True when `target` is not `root` nor inside it; on Windows another drive counts as outside. */
export function isOutside(root: string, target: string): boolean {
  const rel = relative(root, target);
  // relative() returns an absolute path when there is no relative route, e.g. across drives.
  return isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`);
}

/** `<base>/cm-<runId>/<framework>`; the caller generates `runId` once per run. */
export function consumerDir(base: string, runId: string, framework: Framework): string {
  return join(base, `cm-${runId}`, framework);
}
