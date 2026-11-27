// Entry point for wrangler.bundled.jsonc only: the Worker serves the built pages itself, with
// the same headers dist/_headers gives them, and hands /api/* to the normal router. It mirrors the
// static-asset settings in wrangler.jsonc: auto-trailing-slash and a 404 page.
import { route } from './index.js';
import { FILES, HEADERS } from './generated/site-files.js';

// Parse the two blocks of _headers ("/*" and "/assets/*").
const RULES = [];
let current = null;
for (const line of HEADERS.split('\n')) {
  if (!line.trim()) continue;
  if (!/^\s/.test(line)) { current = { pattern: line.trim(), headers: {} }; RULES.push(current); continue; }
  const i = line.indexOf(':');
  if (current && i > 0) current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
// Addresses from the earlier site (dist/_redirects does the same in the static-asset setup).
const MOVED = { 'monument-signs': '/products/', 'sizes-and-prices': '/pricing/', 'how-it-works': '/process/', 'request-a-quote': '/contact/', industries: '/gallery/', 'more-from-our-shop': '/products/' };

const matches = (pattern, path) => (pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);

const bytes = new Map();
function body(path) {
  const f = FILES[path];
  if (f.text !== undefined) return f.text;
  if (!bytes.has(path)) bytes.set(path, Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)));
  return bytes.get(path);
}

function serve(request, path, status = 200) {
  const f = FILES[path];
  const h = new Headers({ 'content-type': f.type, etag: f.etag });
  for (const r of RULES) if (matches(r.pattern, path)) for (const [k, v] of Object.entries(r.headers)) h.set(k, v);
  if (!path.startsWith('/assets/')) h.set('cache-control', 'public, max-age=0, must-revalidate');
  if (status === 200 && request.headers.get('if-none-match') === f.etag) return new Response(null, { status: 304, headers: h });
  return new Response(request.method === 'HEAD' ? null : body(path), { status, headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname.startsWith('/api/')) return route(request, env, ctx);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const moved = MOVED[pathname.replace(/^\/|\/$/g, '')];
    if (moved) return Response.redirect(url.origin + moved + url.search, 301);
    if (FILES[pathname] && !pathname.endsWith('.html') && pathname !== '/_redirects') return serve(request, pathname);
    if (pathname.endsWith('/') && FILES[pathname + 'index.html']) return serve(request, pathname + 'index.html');
    // auto-trailing-slash: /how-it-works -> /how-it-works/, and /x/index.html -> /x/
    if (FILES[pathname + '/index.html']) return Response.redirect(url.origin + pathname + '/' + url.search, 307);
    if (pathname.endsWith('/index.html') && FILES[pathname]) return Response.redirect(url.origin + pathname.slice(0, -10) + url.search, 307);
    if (pathname.endsWith('.html') && FILES[pathname] && pathname !== '/404.html') return serve(request, pathname);
    return serve(request, '/404.html', 404);
  },
};
