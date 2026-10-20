// No JSX on purpose: tsc checks it without react and its types (plan 001, block 6).
export function greet(name: string): string {
  // type-error-slot
  return `Hello, ${name}`;
}
