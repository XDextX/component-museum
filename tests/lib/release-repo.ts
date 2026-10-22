import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './run.ts';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const checkModule = join(repoRoot, 'node_modules', '@s-ui', 'mono', 'src', 'check.js');
const manifests = ['package.json', 'packages/react/package.json', 'packages/astro/package.json', 'gallery/package.json'];

export type ReleaseStatus = Record<string, { increment: number; commits: unknown[] }>;
export type ReleaseRepo = {
  commit(message: string, body?: string): void;
  /** `check()` of @s-ui/mono, run in its own process with the temporary repo as cwd. Never `release`. */
  check(): ReleaseStatus;
  dispose(): void;
};

/**
 * A temporary git repo in os.tmpdir() holding only the manifests, with a release commit per package.
 * `rootMutation` edits the copy of the root manifest (the injection); the real one is never touched.
 */
export function createReleaseRepo(
  options: { rootMutation?: (manifest: Record<string, unknown>) => Record<string, unknown> } = {},
): ReleaseRepo {
  const dir = mkdtempSync(join(tmpdir(), 'cm-release-'));
  const git = (...args: string[]) => {
    const identity = ['-c', 'commit.gpgsign=false', '-c', 'user.name=cm', '-c', 'user.email=cm@example.test'];
    const result = run('git', [...identity, ...args], { cwd: dir });
    if (result.code !== 0) throw new Error(`git ${args.join(' ')}: ${result.output}`);
  };
  for (const file of manifests) {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    cpSync(join(repoRoot, file), join(dir, file));
  }
  if (options.rootMutation) {
    const copy = join(dir, 'package.json');
    writeFileSync(copy, JSON.stringify(options.rootMutation(JSON.parse(readFileSync(copy, 'utf8')))));
  }
  git('init', '-q');
  git('add', '.');
  git('commit', '-q', '-m', 'chore: manifests');
  for (const pkg of ['react', 'astro']) git('commit', '-q', '--allow-empty', '-m', `release(packages/${pkg}): v0.1.0`);

  return {
    commit: (message, body) => git('commit', '-q', '--allow-empty', '-m', message, ...(body ? ['-m', body] : [])),
    check() {
      const script = `require(${JSON.stringify(checkModule)}).check().then(s => console.log(JSON.stringify(s)))`;
      const result = run(process.execPath, ['-e', script], { cwd: dir });
      if (result.code !== 0) throw new Error(`check() failed: ${result.output}`);
      return JSON.parse(result.output.trim());
    },
    dispose: () => rmSync(dir, { recursive: true, force: true }),
  };
}
