import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Framework } from './paths.ts';

export type PropSpec =
  | { type: 'enum'; values: string[]; default: string }
  | { type: 'boolean'; default: boolean };

export type Contract = {
  name: string;
  props: Record<string, PropSpec>;
  events: string[];
  content: boolean;
  classProp: boolean;
};

/** What an implementation must declare per prop: its literal values, 'boolean', or 'any'. */
export type Api = Record<string, string[] | 'boolean' | 'any'>;

/** `museum:<component>:<event>` (DOM event) in Astro, `on<Event>` in React. */
export function eventName(framework: Framework, component: string, event: string): string {
  return framework === 'astro'
    ? `museum:${component}:${event}`
    : `on${event[0].toUpperCase()}${event.slice(1)}`;
}

/** `class` in Astro, `className` in React. */
export function classProp(framework: Framework): string {
  return framework === 'astro' ? 'class' : 'className';
}

/** The content prop: `children` in React, null in Astro (the default slot). */
export function contentProp(framework: Framework): string | null {
  return framework === 'react' ? 'children' : null;
}

/** The own props an implementation declares: contract props, class, content and events, translated. */
export function expectedApi(contract: Contract, framework: Framework): Api {
  const api: Api = {};
  for (const [name, spec] of Object.entries(contract.props)) {
    api[name] = spec.type === 'enum' ? spec.values : 'boolean';
  }
  if (contract.classProp) api[classProp(framework)] = 'any';
  const content = contentProp(framework);
  if (contract.content && content) api[content] = 'any';
  // Astro events are DOM events, not props; only React declares them.
  if (framework === 'react') {
    for (const e of contract.events) api[eventName(framework, contract.name.toLowerCase(), e)] = 'any';
  }
  return api;
}

export function loadContract(file: string): Contract {
  return JSON.parse(readFileSync(file, 'utf8')) as Contract;
}

// .claude holds agent worktrees: whole copies of the repo, so their contracts would count twice.
const SKIP = new Set(['node_modules', '.git', '.claude', 'dist']);

/** Repo-relative paths (forward slashes) of every `*.contract.json` under `root`. */
export function findContractFiles(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : findContractFiles(root, path);
    return entry.name.endsWith('.contract.json') ? [relative(root, path).replaceAll(sep, '/')] : [];
  });
}

/** Component folder names found under `packages/<fw>/src/` (empty until a package exists). */
export function componentDirs(root: string): string[] {
  const packages = join(root, 'packages');
  if (!existsSync(packages)) return [];
  const names = readdirSync(packages).flatMap((fw) => {
    const src = join(packages, fw, 'src');
    return existsSync(src)
      ? readdirSync(src, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
  });
  return [...new Set(names)];
}

/** RF-6: one message per component with zero or several contracts, or a contract with no component. */
export function problems(contracts: { file: string; name: string }[], components: string[]): string[] {
  const byName = new Map<string, string[]>();
  for (const c of contracts) byName.set(c.name, [...(byName.get(c.name) ?? []), c.file]);
  const out: string[] = [];
  for (const name of components) {
    const files = byName.get(name) ?? [];
    if (files.length === 0) out.push(`${name} has no contract`);
    else if (files.length > 1) out.push(`${name} has ${files.length} contracts: ${files.join(', ')}`);
  }
  for (const name of byName.keys()) {
    if (!components.includes(name)) out.push(`${name} has a contract but no component folder`);
  }
  return out;
}
