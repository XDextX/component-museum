import { need } from './lib/need.ts';
import { defineGalleryBrowser } from './lib/gallery-browser.ts';

// Spec 017 T-14: the Checkbox block of the gallery browser suite (body in tests/lib/gallery-browser.ts).
defineGalleryBrowser('Checkbox', need('gallery').storybook);
