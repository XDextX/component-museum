import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';
import { acquireLock } from './lib/lock.ts';

/**
 * Spec 015 RF-6: the story tests wait for a running `npm test` like the e2e project does, and share its lock when
 * both run in this process. The Storybook panel keeps a watch-mode Vitest alive for as long as the gallery is open,
 * so it must not take the lock (C-1): it would make `npm test` wait ten minutes and fail.
 */
export default async function setup(project: TestProject): Promise<() => void> {
  if (project.vitest.config.watch) return () => {};
  return acquireLock(join(import.meta.dirname, '..', 'node_modules', '.museum-test-lock'), { runId: randomUUID().slice(0, 8), shareWithProcess: true });
}
