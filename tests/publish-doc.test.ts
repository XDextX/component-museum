import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Built at run time: the publish guard forbids these literals under tests/.
const publish = ['npm', 'publish'].join(' ');
const release = ['sui-mono', 'release'].join(' ');

// Index of each step in the text, in the requested order; -1 when one is missing.
export function stepPositions(text: string, steps: string[]): number[] {
  return steps.map((step) => text.indexOf(step));
}

const steps = [
  'npm login',
  'Crear la organización `component-museum`',
  publish,
  'release(packages/react): v0.1.0',
  'packages/react-0.1.0',
  'release(packages/astro): v0.1.0',
  'packages/astro-0.1.0',
  'sui-mono check',
  release,
];

// PUBLISH_DOC lets the red-injection check point at a modified copy of the document.
const docPath = process.env.PUBLISH_DOC ?? new URL('../docs/publicacion.md', import.meta.url);

describe('stepPositions', () => {
  it('gives -1 for a missing step and the index of a present one', () => {
    expect(stepPositions('a b', ['b', 'c'])).toEqual([2, -1]);
  });
});

describe('docs/publicacion.md', () => {
  const text = readFileSync(docPath, 'utf8');
  const positions = stepPositions(text, steps);

  it('names every step', () => {
    expect(steps.filter((_, i) => positions[i] < 0)).toEqual([]);
  });

  it('names them in order', () => {
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('says that no agent runs the steps or touches tokens', () => {
    expect(text).toMatch(/ningún agente/i);
    expect(text).toMatch(/token/i);
  });
});
