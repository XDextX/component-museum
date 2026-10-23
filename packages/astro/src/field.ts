/**
 * Shared id and aria-describedby logic of the form fields. Internal: not exported from the entry.
 * A counter, never Math.random(): the id is the same build after build, and unique within a page.
 * Astro has no module scope in a component, so the counts live on globalThis, one per prefix.
 */
export function fieldIds(
  prefix: 'museum-input' | 'museum-textarea',
  id: string | null | undefined,
  hint: string,
  error: string,
  describedBy: string | null | undefined,
) {
  const counts = ((globalThis as { __museumFieldCount?: Record<string, number> }).__museumFieldCount ??= {});
  const controlId = id ?? `${prefix}-${(counts[prefix] = (counts[prefix] ?? 0) + 1)}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  // The error first, then the hint, then the consumer's own ids.
  const description = [errorId, hintId, describedBy].filter(Boolean).join(' ') || undefined;
  return { controlId, hintId, errorId, describedBy: description };
}
