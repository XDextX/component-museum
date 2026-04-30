export function generateId(label: string, depth: number): string {
    return `tree-${label.replace(/\s+/g, '-').toLowerCase()}-${depth}-${Math.random().toString(36).slice(2, 9)}`;
}