import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { consumerKey, starterKey } from './lib/consumer.ts';

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
