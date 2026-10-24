import { need } from './lib/need.ts';
import { defineExampleClasses } from './lib/gallery-browser.ts';

// Spec 017 T-14: the example classes of the gallery browser suite (body in tests/lib/gallery-browser.ts).
defineExampleClasses(need('gallery').storybook);
