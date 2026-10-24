import { need } from './lib/need.ts';
import { defineFieldA11y } from './lib/field-a11y.ts';

// Spec 017 T-12: the Input half of the field accessibility suite (body in tests/lib/field-a11y.ts).
defineFieldA11y('Input', need('consumers'));
