import { need } from './lib/need.ts';
import { defineFieldA11y } from './lib/field-a11y.ts';

// Spec 017 T-12: the Textarea half of the field accessibility suite (body in tests/lib/field-a11y.ts).
defineFieldA11y('Textarea', need('consumers'));
