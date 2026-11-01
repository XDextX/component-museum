import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { astroRenderInputs, cached, inputKey, recordPhase, storybookInputs } from '../scripts/cache.mjs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cm-cache-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const put = (path: string, text: string) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
};

describe('inputKey (spec 017, RF-4)', () => {
  it('gives the same key for the same files and versions, and ignores node_modules, dist and .astro inside a folder', () => {
    put('a/one.txt', '1');
    put('a/two.txt', '2');
    const before = inputKey(dir, ['a'], { node: 'v22' });
    put('a/dist/out.js', 'built');
    put('a/node_modules/x/index.js', 'dep');
    put('a/.astro/types.d.ts', 'types');
    expect(inputKey(dir, ['a'], { node: 'v22' })).toBe(before);
  });

  it('changes with one byte, a file added, a path renamed or a version', () => {
    put('a/one.txt', '1');
    const base = inputKey(dir, ['a'], { node: 'v22' });
    expect(inputKey(dir, ['a'], { node: 'v24' })).not.toBe(base);
    put('a/one.txt', '2');
    expect(inputKey(dir, ['a'], { node: 'v22' })).not.toBe(base);
    put('a/one.txt', '1');
    put('a/extra.txt', '');
    expect(inputKey(dir, ['a'], { node: 'v22' })).not.toBe(base);
    rmSync(join(dir, 'a/extra.txt'));
    put('a/renamed.txt', '1');
    rmSync(join(dir, 'a/one.txt'));
    expect(inputKey(dir, ['a'], { node: 'v22' })).not.toBe(base);
  });

  it('tells a missing input from an empty one', () => {
    const missing = inputKey(dir, ['gone.txt']);
    put('gone.txt', '');
    expect(inputKey(dir, ['gone.txt'])).not.toBe(missing);
  });
});

describe('real inputs of each build: a byte in any of them changes the key (spec 017, RF-4)', () => {
  const layout: Record<string, string> = {
    'gallery/.storybook/main.ts': 'config',
    'gallery/stories/Button.mdx': 'story',
    'gallery/lib/matrix.ts': 'lib',
    'gallery/generated/astro-button.json': '[]',
    'gallery/package.json': '{}',
    'gallery/tsconfig.json': '{}',
    'gallery/env.d.ts': '',
    'gallery/astro-render/src/pages/index.astro': 'page',
    'gallery/astro-render/astro.config.mjs': 'config',
    'gallery/lib/contract-args.ts': 'args',
    'gallery/scripts/extract-astro.mjs': 'extract',
    'packages/react/dist/index.js': 'react',
    'packages/react/styles.css': 'css',
    'packages/react/package.json': '{}',
    'packages/astro/index.js': 'index',
    'packages/astro/index.d.ts': 'types',
    'packages/astro/package.json': '{}',
    'packages/astro/src/Button/Button.astro': 'button',
    'packages/astro/styles.css': 'css',
    'contracts/button.contract.json': '{}',
    'styles/museum.css': 'sheet',
    'package-lock.json': '{}',
  };
  type Inputs = { files: string[]; extra: Record<string, string> };
  const key = (inputs: Inputs) => inputKey(dir, inputs.files, inputs.extra);
  const cases: [string, () => Inputs, string[]][] = [
    [
      'Storybook',
      storybookInputs,
      [
        'gallery/stories/Button.mdx',
        'gallery/.storybook/main.ts',
        'gallery/lib/matrix.ts',
        'gallery/generated/astro-button.json',
        'packages/react/dist/index.js',
        'packages/react/styles.css',
        'packages/astro/styles.css',
        'contracts/button.contract.json',
        'styles/museum.css',
        'package-lock.json',
      ],
    ],
    [
      'astro-render',
      astroRenderInputs,
      [
        'gallery/astro-render/src/pages/index.astro',
        'packages/astro/src/Button/Button.astro',
        'packages/astro/index.js',
        'packages/astro/styles.css',
        'gallery/lib/contract-args.ts',
        'gallery/scripts/extract-astro.mjs',
        'contracts/button.contract.json',
        'styles/museum.css',
        'package-lock.json',
      ],
    ],
  ];
  for (const [name, inputs, files] of cases) {
    for (const file of files) {
      it(`${name}: ${file}`, () => {
        for (const [path, text] of Object.entries(layout)) put(path, text);
        const before = key(inputs());
        put(file, `${layout[file]} changed`);
        expect(key(inputs())).not.toBe(before);
      });
    }
  }

  it('Storybook ignores the astro-render build output, astro-render ignores the stories', () => {
    for (const [path, text] of Object.entries(layout)) put(path, text);
    const storybook = key(storybookInputs());
    const astro = key(astroRenderInputs());
    put('gallery/astro-render/dist/index.html', 'built');
    put('gallery/stories/Button.mdx', 'story changed');
    expect(key(astroRenderInputs())).toBe(astro);
    put('gallery/stories/Button.mdx', 'story');
    expect(key(storybookInputs())).toBe(storybook);
  });
});

describe('cached (spec 017, RF-3, RF-4)', () => {
  const cache = () => join(dir, 'cache');
  const output = () => join(dir, 'out.txt');
  const build = (log: string[]) => async () => {
    log.push('build');
    writeFileSync(output(), 'built');
  };

  it('builds the first time and hits the second with the same key', async () => {
    const log: string[] = [];
    expect(await cached('x', 'k1', [output()], build(log), cache())).toBe('built');
    expect(await cached('x', 'k1', [output()], build(log), cache())).toBe('hit');
    expect(log).toEqual(['build']);
  });

  it('rebuilds when the key changes, when the stored key is corrupt, absent or empty', async () => {
    const log: string[] = [];
    await cached('x', 'k1', [output()], build(log), cache());
    expect(await cached('x', 'k2', [output()], build(log), cache())).toBe('built');
    writeFileSync(join(cache(), 'x.key'), '');
    expect(await cached('x', 'k2', [output()], build(log), cache())).toBe('built');
    writeFileSync(join(cache(), 'x.key'), 'k2\ngarbage');
    expect(await cached('x', 'k2', [output()], build(log), cache())).toBe('built');
    rmSync(join(cache(), 'x.key'));
    expect(await cached('x', 'k2', [output()], build(log), cache())).toBe('built');
    expect(log).toHaveLength(5);
  });

  it('rebuilds when an output is missing', async () => {
    const log: string[] = [];
    await cached('x', 'k1', [output()], build(log), cache());
    rmSync(output());
    expect(await cached('x', 'k1', [output()], build(log), cache())).toBe('built');
    expect(log).toHaveLength(2);
  });

  it('leaves no key when the build fails or is cut short, and the next call builds', async () => {
    const log: string[] = [];
    await cached('x', 'k1', [output()], build(log), cache());
    const cut = async () => {
      throw new Error('cut');
    };
    await expect(cached('x', 'k2', [output()], cut, cache())).rejects.toThrow('cut');
    expect(existsSync(join(cache(), 'x.key'))).toBe(false);
    expect(await cached('x', 'k2', [output()], build(log), cache())).toBe('built');
    expect(readFileSync(join(cache(), 'x.key'), 'utf8')).toBe('k2');
  });

  it('keeps each name apart', async () => {
    const log: string[] = [];
    await cached('x', 'k', [output()], build(log), cache());
    expect(await cached('y', 'k', [output()], build(log), cache())).toBe('built');
  });
});

describe('recordPhase (spec 017, RF-3)', () => {
  it('writes each phase with its seconds and cache result, and keeps the others', () => {
    recordPhase('a', 1.26, 'hit', dir);
    recordPhase('b', 2, 'built', dir);
    recordPhase('a', 0.04, 'built', dir);
    expect(JSON.parse(readFileSync(join(dir, 'phases.json'), 'utf8'))).toEqual({
      a: { seconds: 0, cache: 'built' },
      b: { seconds: 2, cache: 'built' },
    });
  });
});
