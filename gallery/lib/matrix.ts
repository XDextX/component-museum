// Dependency-free on purpose: the 002 test, the matrix test and the Matrix page share it.

export type Framework = 'react' | 'astro';
export type Cell = 'present' | 'missing';

const frameworks: Framework[] = ['react', 'astro'];

/**
 * Value exports of an entry file: `export { A, default as B }` yes, `export type { ... }` no.
 * @param source The text of a package entry.
 * @returns The exported names, aliases resolved to the public one.
 */
export function entryExports(source: string): string[] {
  const names: string[] = [];
  for (const [, list] of source.matchAll(/^export\s+(?!type)\{([^}]*)\}/gm)) {
    for (const item of list.split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop();
      if (name) names.push(name);
    }
  }
  return names;
}

/**
 * Per component and framework, whether the framework's entry exports it (constitution rule 4).
 * @param entries The text of each framework's package entry, read by specifier.
 * @param components The component names, from the contracts.
 * @returns One row per component; `missing` where the entry does not export it.
 */
export function frameworkMatrix(entries: Record<Framework, string>, components: string[]): Record<string, Record<Framework, Cell>> {
  const exported = Object.fromEntries(frameworks.map((f) => [f, new Set(entryExports(entries[f]))])) as Record<Framework, Set<string>>;
  return Object.fromEntries(
    components.map((name) => [name, Object.fromEntries(frameworks.map((f) => [f, exported[f].has(name) ? 'present' : 'missing'])) as Record<Framework, Cell>]),
  );
}
