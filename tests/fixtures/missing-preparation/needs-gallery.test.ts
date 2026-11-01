import { expect, it } from 'vitest';
import { need } from '../../lib/need.ts';

it('asks for the gallery preparation that nobody made', () => {
  expect(need('gallery').storybook).toBeTruthy();
});
