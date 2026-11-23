// A tiny static server for dist/, used by screenshots, browser tests and the scroll check.
// /api/* answers 503 { error: "not_configured" } unless a handler is given, which is exactly
// what the real Worker does before its keys exist (SPEC §9.6).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webp': 'image/webp', '.avif': 'image/avif',
};

export async function serve(dir, { port = 0, api = null } = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (api) return api(req, res, url);
      res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ error: 'not_configured' }));
    }
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith('/')) p += 'index.html';
    let file = join(dir, p);
    let s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) {
      res.writeHead(307, { location: url.pathname + '/' });
      return res.end();
    }
    let status = 200;
    if (!s) { file = join(dir, '404.html'); status = 404; }
    const body = await readFile(file);
    res.writeHead(status, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const { port: actual } = server.address();
  return { url: `http://127.0.0.1:${actual}`, close: () => new Promise((r) => server.close(r)) };
}
