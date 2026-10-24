export const repoRoot: string;
export const cacheDir: string;
export function inputKey(root: string, files: string[], extra?: Record<string, string>): string;
export function toolVersions(): { node: string; npm: string };
export function cached(name: string, key: string, outputs: string[], build: () => Promise<void>, dir?: string): Promise<'hit' | 'built'>;
export function recordPhase(name: string, seconds: number, cache?: 'hit' | 'built' | null, dir?: string): void;
export function astroRenderInputs(): { files: string[]; extra: Record<string, string> };
export function storybookInputs(): { files: string[]; extra: Record<string, string> };
