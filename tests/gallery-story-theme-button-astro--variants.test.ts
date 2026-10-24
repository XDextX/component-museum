import { need } from './lib/need.ts';
import { defineStoryTheme } from './lib/story-theme.ts';

// Spec 017 T-15: the button-astro--variants story of the theme suite (body in tests/lib/story-theme.ts).
defineStoryTheme('button-astro--variants', need('gallery').storybook);
