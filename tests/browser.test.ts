import { describe, expect, it } from 'vitest';
import { readStyle } from './lib/browser.ts';

const page = new URL('./fixtures/style-page.html', import.meta.url).href;

// Edge starts in about a second; the default 10 s leaves too little room on a cold start.
describe('computed style in a real Edge (RF-3)', { timeout: 30_000 }, () => {
  it('reads the dark color when the dark scheme is emulated', async () => {
    const color = await readStyle(page, '#scheme', 'color', { colorScheme: 'dark' });
    expect(color).toBe('rgb(240, 240, 240)');
  });

  it('reads the light color when the light scheme is emulated', async () => {
    const color = await readStyle(page, '#scheme', 'color', { colorScheme: 'light' });
    expect(color).toBe('rgb(20, 20, 20)');
  });

  it('keeps the original color without JavaScript', async () => {
    const color = await readStyle(page, '#scripted', 'color', { javaScriptEnabled: false });
    expect(color).toBe('rgb(0, 0, 255)');
  });

  it('sees the color the script sets when JavaScript runs', async () => {
    const color = await readStyle(page, '#scripted', 'color', { javaScriptEnabled: true });
    expect(color).toBe('rgb(255, 0, 0)');
  });
});
