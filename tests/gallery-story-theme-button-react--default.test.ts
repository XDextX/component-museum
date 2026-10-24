import { need } from './lib/need.ts';
import { defineStoryTheme } from './lib/story-theme.ts';

// Spec 017 T-15: the button-react--default story of the theme suite (body in tests/lib/story-theme.ts).
defineStoryTheme('button-react--default', need('gallery').storybook);
