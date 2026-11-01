import { need } from './lib/need.ts';
import { defineGalleryBrowser } from './lib/gallery-browser.ts';

// Spec 017 T-14: the RadioGroup block of the gallery browser suite (body in tests/lib/gallery-browser.ts).
defineGalleryBrowser('RadioGroup', need('gallery').storybook);
