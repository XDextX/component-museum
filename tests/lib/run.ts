import { spawnSync } from 'node:child_process';

export type RunResult = { code: number; output: string };

/** Runs a command to completion; a failure is a result, never a thrown error. */
export function run(command: string, args: string[], options: { cwd?: string } = {}): RunResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`;
  return { code: result.status ?? 1, output };
}
