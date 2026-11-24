// The Worker. Static files are served by Cloudflare directly; this code runs only for /api/*
// (assets.run_worker_first in wrangler.jsonc).
import { json, notFound, methodNotAllowed } from './lib/http.js';
import * as uploads from './api/uploads.js';
import * as requests from './api/requests.js';
import * as designs from './api/designs.js';
import * as checkout from './api/checkout.js';
import * as stripeWebhook from './api/stripe-webhook.js';
import * as orders from './api/orders.js';
import * as invoices from './api/invoices.js';
import * as files from './api/files.js';

const ROUTES = [
  ['POST', /^\/api\/uploads\/start$/, uploads.start],
  ['PUT', /^\/api\/uploads\/([^/]+)\/(\d+)$/, uploads.put],
  ['POST', /^\/api\/requests$/, requests.create],
  ['POST', /^\/api\/designs\/email$/, designs.email],
  ['POST', /^\/api\/checkout$/, checkout.create],
  ['POST', /^\/api\/stripe\/webhook$/, stripeWebhook.webhook],
  ['GET', /^\/api\/orders\/([^/]+)$/, orders.get],
  ['POST', /^\/api\/invoices\/find$/, invoices.find],
  ['GET', /^\/api\/files\/(.+)$/, files.get],
];

export async function route(request, env, ctx) {
  const { pathname } = new URL(request.url);
  let pathMatched = false;
  for (const [method, re, handler] of ROUTES) {
    const m = pathname.match(re);
    if (!m) continue;
    pathMatched = true;
    if (request.method !== method) continue;
    try {
      return await handler(request, env, ctx, m.slice(1));
    } catch (e) {
      console.error('api error', pathname, e && e.stack);
      return json({ error: 'server_error' }, 500);
    }
  }
  return pathMatched ? methodNotAllowed() : notFound();
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return route(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};
