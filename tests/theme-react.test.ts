import { need } from './lib/need.ts';
import { defineTheme } from './lib/theme.ts';

// Spec 017 T-15: the react half of the theme suite (body in tests/lib/theme.ts).
defineTheme('react', need('consumers'));
