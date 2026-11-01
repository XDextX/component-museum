import { need } from './lib/need.ts';
import { defineFieldA11y } from './lib/field-a11y.ts';

// Spec 014 T-4: the Select half of the field accessibility suite (body in tests/lib/field-a11y.ts).
defineFieldA11y('Select', need('consumers'));
