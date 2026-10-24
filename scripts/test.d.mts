export interface TestStep { name: string; command: string }
export const testSteps: TestStep[];
export function formatTable(rows: { name: string; seconds: number; cache: 'hit' | 'built' | null }[], total: number): string;
export function runTests(options?: {
  steps?: TestStep[];
  run?: (step: TestStep) => number | Promise<number>;
  dir?: string;
  log?: (line: string) => void;
}): Promise<number>;
