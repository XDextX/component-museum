import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCached, buildKey, consumerKey, starterKey, type Tarball } from './lib/consumer.ts';

let starter: string;
beforeEach(() => {
  starter = mkdtempSync(join(tmpdir(), 'cm-consumer-key-'));
  writeFileSync(join(starter, 'package.json'), JSON.stringify({ dependencies: { react: '^19.0.0' } }));
});
afterEach(() => rmSync(starter, { recursive: true, force: true }));

describe('consumerKey (spec 017, RF-5)', () => {
  const key = (overrides: Partial<{ framework: 'react' | 'astro'; shape: string; install: string[]; pin: string[] }> = {}) => {
    const { framework = 'react', shape = 'plain', install = [], pin } = overrides;
    return consumerKey(starter, framework, shape, install, pin);
  };

  it('is the same for the same starter, shape and tools', () => {
    expect(key()).toBe(key());
    // Whatever a build leaves in the starter folder is not an input.
    mkdirSync(join(starter, 'node_modules', 'x'), { recursive: true });
    writeFileSync(join(starter, 'node_modules', 'x', 'index.js'), 'dep');
    expect(key()).toBe(key());
  });

  it('changes with the pinned starter version', () => {
    expect(key({ pin: ['--package=create-vite@9.3.0'] })).not.toBe(key({ pin: ['--package=create-vite@9.4.0'] }));
  });

  it('changes with a dependency of the starter package.json, or its lockfile', () => {
    const before = key();
    writeFileSync(join(starter, 'package.json'), JSON.stringify({ dependencies: { react: '^19.1.0' } }));
    const edited = key();
    expect(edited).not.toBe(before);
    writeFileSync(join(starter, 'package-lock.json'), '{}');
    expect(key()).not.toBe(edited);
  });

  it('changes with the shape, the framework and what is installed on top of the starter', () => {
    const base = key();
    expect(key({ shape: 'guarded' })).not.toBe(base);
    expect(key({ framework: 'astro' })).not.toBe(base);
    expect(key({ install: ['tailwindcss@4.3.3'] })).not.toBe(base);
  });
});

describe('starterKey (spec 017, RF-5)', () => {
  it('differs per framework and with the pin', () => {
    expect(starterKey('react')).not.toBe(starterKey('astro'));
    expect(starterKey('react', ['--package=create-vite@9.4.0'])).not.toBe(starterKey('react'));
  });
});

// A consumer's build is stored by the consumer's key plus the sha256 of the tarballs installed in it (spec 017, RF-5, RF-6).
describe('stored consumer builds (spec 017, T-11)', () => {
  let work: string;
  let cacheRoot: string;
  beforeEach(() => {
    work = mkdtempSync(join(tmpdir(), 'cm-build-cache-'));
    cacheRoot = join(work, 'cache');
  });
  afterEach(() => rmSync(work, { recursive: true, force: true }));

  /** A consumer whose build writes dist/ and counts its runs in a file outside dist. */
  function fakeConsumer(name: string, build = "mkdirSync('dist/sub', { recursive: true }); writeFileSync('dist/sub/index.html', 'page');"): string {
    const dir = join(work, name);
    mkdirSync(dir);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'node build.mjs' } }));
    writeFileSync(
      join(dir, 'build.mjs'),
      `import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';\nappendFileSync('runs.txt', 'x');\n${build}\nconsole.log('built ok');\n`,
    );
    return dir;
  }
  const runs = (dir: string) => (existsSync(join(dir, 'runs.txt')) ? readFileSync(join(dir, 'runs.txt'), 'utf8').length : 0);
  const tarball = (name: string, bytes: string): Tarball => {
    const path = join(work, `${name}.tgz`);
    writeFileSync(path, bytes);
    return { name, path };
  };

  describe('buildKey', () => {
    it('is the same for the same consumer and tarball bytes, wherever the tarballs are', () => {
      const a = tarball('pkg', 'one');
      const moved = { name: 'pkg', path: join(work, 'elsewhere.tgz') };
      writeFileSync(moved.path, 'one');
      expect(buildKey('consumer', [a])).toBe(buildKey('consumer', [moved]));
    });

    it('changes with one byte of any tarball, and with the consumer', () => {
      const a = tarball('a', 'one');
      const b = tarball('b', 'two');
      const before = buildKey('consumer', [a, b]);
      writeFileSync(b.path, 'twp');
      expect(buildKey('consumer', [a, b])).not.toBe(before);
      expect(buildKey('other', [a, tarball('b', 'two')])).not.toBe(before);
    });
  });

  describe('buildCached', () => {
    it('builds on a miss, and restores dist/ and the output on a hit without running the build', async () => {
      const first = fakeConsumer('first');
      const miss = await buildCached(first, 'fake', 'key-1', cacheRoot);
      expect(miss.cache).toBe('built');
      expect(miss.result.code).toBe(0);
      expect(runs(first)).toBe(1);

      const second = fakeConsumer('second');
      const hit = await buildCached(second, 'fake', 'key-1', cacheRoot);
      expect(hit.cache).toBe('hit');
      expect(hit.result).toEqual({ code: 0, output: miss.result.output });
      expect(runs(second)).toBe(0);
      expect(readFileSync(join(second, 'dist', 'sub', 'index.html'), 'utf8')).toBe('page');
    });

    it('rebuilds once a tarball byte differs, so a changed component never reuses an old dist/', async () => {
      const pkg = tarball('pkg', 'one');
      await buildCached(fakeConsumer('first'), 'fake', buildKey('consumer', [pkg]), cacheRoot);
      writeFileSync(pkg.path, 'two');
      const second = fakeConsumer('second', "mkdirSync('dist', { recursive: true }); writeFileSync('dist/size.txt', 'new');");
      const again = await buildCached(second, 'fake', buildKey('consumer', [pkg]), cacheRoot);
      expect(again.cache).toBe('built');
      expect(readFileSync(join(second, 'dist', 'size.txt'), 'utf8')).toBe('new');
    });

    it('never writes the cache on a hit', async () => {
      await buildCached(fakeConsumer('first'), 'fake', 'key-1', cacheRoot);
      const files = () => readdirSync(cacheRoot, { recursive: true }).map((f) => `${f}:${statSync(join(cacheRoot, String(f))).mtimeMs}`);
      const before = files();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect((await buildCached(fakeConsumer('second'), 'fake', 'key-1', cacheRoot)).cache).toBe('hit');
      expect(files()).toEqual(before);
    });

    it('returns a failed build as a result and stores nothing for it', async () => {
      const failed = await buildCached(fakeConsumer('broken', 'process.exit(3);'), 'fake', 'key-1', cacheRoot);
      expect(failed.result.code).not.toBe(0);
      expect(failed.cache).toBe('built');
      const retried = await buildCached(fakeConsumer('retry'), 'fake', 'key-1', cacheRoot);
      expect(retried.cache).toBe('built');
      expect(retried.result.code).toBe(0);
    });
  });
});
