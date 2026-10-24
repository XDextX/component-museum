import { inject } from 'vitest';
import type { ProvidedContext } from 'vitest';

/**
 * Spec 017 RF-8: what a test file asks of the globalSetup. A file that calls this runs in the e2e project;
 * without that setup the value is missing, and the failure names the preparation instead of a TypeError.
 */
export function need<K extends keyof ProvidedContext>(name: K): ProvidedContext[K] {
  const value = inject(name);
  if (value === undefined) throw new Error(`falta la preparación \`${name}\`: ejecuta el proyecto e2e o npm test`);
  return value;
}
