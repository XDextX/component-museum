import { need } from './lib/need.ts';
import { defineFieldA11y } from './lib/field-a11y.ts';

// Spec 013 T-5: the RadioGroup half of the field accessibility suite (body in tests/lib/field-a11y.ts).
defineFieldA11y('RadioGroup', need('consumers'));
