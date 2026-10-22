import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join } from 'node:path';

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

export type Served = { url: string; close: () => Promise<void> };

/**
 * Serves the built `dir` over HTTP on a free port (a React SPA needs a server to run its module).
 * Edge refuses a module script without a JavaScript Content-Type, so the types above are not optional.
 */
export function serve(dir: string): Promise<Served> {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    try {
      // A path that climbs out of `dir` is a 404, never a file.
      if (path.includes('..')) throw new Error('outside');
      const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
  });
}
