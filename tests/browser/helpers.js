import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { serve } from '../../scripts/lib/serve.js';

export const root = fileURLToPath(new URL('../../', import.meta.url));

// A stand-in for Turnstile, so tests never depend on a third-party network. It hands out a token
// straight away, as Cloudflare's always-pass test key does.
export const FAKE_TURNSTILE = 'window.turnstile={render:function(el,o){setTimeout(function(){o.callback("test-token")},5);return 1},reset:function(){},getResponse:function(){return "test-token"}};';

export async function start(api = null) {
  const server = await serve(root + 'dist', { api });
  const browser = await chromium.launch();
  return { server, browser, async close() { await browser.close(); await server.close(); } };
}

export async function open(browser, url, { width = 1440, height = 900, js = true, errors = [], permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion: 'reduce', permissions });
  await context.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE }));
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  return { context, page };
}

export const heroSvg = (page) => page.locator('[data-sign] .variant-dims').innerHTML();
export const heroTotal = (page) => page.locator('[data-price-total]').textContent();

// A JSON API stub for /api/*: handlers keyed by "METHOD /path-prefix".
export function apiStub(handlers) {
  return async (req, res, url) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const key = Object.keys(handlers).find((k) => {
      const [m, p] = k.split(' ');
      return m === req.method && url.pathname.startsWith(p);
    });
    const [status, data] = key ? handlers[key](body ? safeJson(body) : null, url) : [404, { error: 'not_found' }];
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(data));
  };
}
const safeJson = (s) => { try { return JSON.parse(s); } catch { return s; } };
