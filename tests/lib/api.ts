import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { Api } from './contract.ts';

/** Differences between the expected API and the declared one; empty when they match. */
export function diffApi(expected: Api, declared: Api): string[] {
  const out: string[] = [];
  for (const [name, want] of Object.entries(expected)) {
    const got = declared[name];
    if (got === undefined) out.push(`missing prop ${name}`);
    else if (want !== 'any' && JSON.stringify(Array.isArray(want) ? [...want].sort() : want) !== JSON.stringify(Array.isArray(got) ? [...got].sort() : got)) {
      out.push(`prop ${name} is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }
  for (const name of Object.keys(declared)) if (!(name in expected)) out.push(`extra prop ${name}`);
  return out;
}

export type Declared = { own: Api; all: string[] };

/**
 * Props of the exported type `typeName` in `file`: `own` are those declared in the file itself
 * (inherited HTML attributes excluded), `all` every property name. A `.astro` file is read as
 * its frontmatter, compiled as a TypeScript sibling so `astro/types` still resolves.
 */
export function declaredProps(file: string, typeName: string, source?: string): Declared {
  const isAstro = file.endsWith('.astro');
  const text = source ?? readFileSync(file, 'utf8');
  const virtual = (isAstro ? `${file}.ts` : file).replaceAll('\\', '/'); // ts normalises to forward slashes
  const code = isAstro ? /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)![1] : text;
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, // astro/types uses extensionless relative imports
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  const get = host.getSourceFile.bind(host);
  host.readFile = (f) => (f === virtual ? code : read(f));
  host.fileExists = ((exists) => (f: string) => f === virtual || exists(f))(host.fileExists.bind(host));
  host.getSourceFile = (f, ...rest) =>
    f === virtual ? ts.createSourceFile(f, code, options.target!, true) : get(f, ...rest);
  const program = ts.createProgram([virtual], options, host);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(virtual)!;
  const target = checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find((s) => s.name === typeName);
  if (!target) throw new Error(`${typeName} not found in ${file}`);
  const type = checker.getDeclaredTypeOfSymbol(target);
  const own: Api = {};
  const all: string[] = [];
  for (const prop of checker.getPropertiesOfType(type)) {
    all.push(prop.name);
    if (!prop.declarations?.some((d) => d.getSourceFile() === sf)) continue;
    const t = checker.getNonNullableType(checker.getTypeOfSymbol(prop));
    if (t.flags & ts.TypeFlags.Boolean) own[prop.name] = 'boolean';
    else if (t.isUnion() && t.types.every((u) => u.isStringLiteral())) own[prop.name] = t.types.map((u) => (u as ts.StringLiteralType).value);
    else if (t.flags & ts.TypeFlags.String) own[prop.name] = prop.flags & ts.SymbolFlags.Optional ? 'string' : 'string!';
    else own[prop.name] = 'any';
  }
  return { own, all };
}

/** Every `museum:<component>:<event>` literal in a source text. */
export function eventLiterals(source: string): string[] {
  return [...new Set(source.match(/museum:[a-z0-9-]+:[a-z0-9-]+/g) ?? [])].sort();
}
