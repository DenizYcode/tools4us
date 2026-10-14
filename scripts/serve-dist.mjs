// Static server for dist/ under the Pages base path, for the browser checks (Lighthouse, axe). Text files are gzipped
// like GitHub Pages does, so transfer sizes are realistic.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

export const BASE = '/tools4us';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

/** Starts the server and resolves to `{ origin, close }`. Run `npm run build` first. */
export async function serveDist(port, dir = 'dist') {
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${dir}/ is missing: run npm run build first`);
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(`${BASE}/`)) {
      res.writeHead(404).end('not found');
      return;
    }
    path = path.slice(BASE.length);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(dir, normalize(path));
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
      const page = join(dir, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] }).end(existsSync(page) ? readFileSync(page) : 'not found');
      return;
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const body = readFileSync(file);
    const headers = { 'content-type': type, 'cache-control': 'max-age=600' };
    if (/^(text\/|application\/json|image\/svg)/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
      headers['content-encoding'] = 'gzip';
      res.writeHead(200, headers).end(gzipSync(body));
    } else res.writeHead(200, headers).end(body);
  });
  await new Promise((resolve) => server.listen(port, resolve));
  return { origin: `http://localhost:${port}${BASE}`, close: () => server.close() };
}
