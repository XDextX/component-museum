import { describe, expect, it } from 'vitest';
import { untilClosed } from './lib/route.ts';

describe('untilClosed', () => {
  it.each(['route.fetch: read ECONNRESET', 'apiResponse.text: Response has been disposed', 'Target page, context or browser has been closed', 'route.fetch: Request context disposed.'])('ignores a close error: %s', async (message) => {
    await expect(untilClosed(async () => { throw new Error(message); })).resolves.toBeUndefined();
  });

  it('rethrows any other error', async () => {
    await expect(untilClosed(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
});
