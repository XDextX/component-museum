/**
 * Spec 016 RF-4: the only axe rules the gallery turns off, each with the reason. `preview.ts` builds the axe
 * configuration from this list, and tests/addon-a11y.test.ts fails when a rule is disabled anywhere else.
 */
export const a11yExceptions: { rule: string; reason: string }[] = [
  { rule: 'region', reason: 'A story is a fragment, with no page regions; the addon already turns it off by default.' },
];
