// Stripe over the REST API with fetch; no SDK (SPEC §9.3).
import { hmac, hex, safeEqual } from './sign.js';

// The API version is pinned; it was current on Stripe's versioning page when this was built.
export const STRIPE_VERSION = '2026-11-18.endive';
const API = 'https://api.stripe.com';

// Flatten { a: { b: [ { c: 1 } ] } } into a[b][0][c]=1, as Stripe expects.
export function formEncode(params, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (item !== null && typeof item === 'object' ? formEncode(item, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(item))));
    else if (typeof v === 'object') formEncode(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}

export async function stripe(env, method, path, params = null, { idempotencyKey } = {}) {
  const headers = { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'stripe-version': STRIPE_VERSION };
  let url = API + path;
  let body;
  if (params && method === 'GET') url += '?' + formEncode(params).toString();
  else if (params) { body = formEncode(params).toString(); headers['content-type'] = 'application/x-www-form-urlencoded'; }
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Stripe ${method} ${path} failed: ${res.status} ${data.error && data.error.message}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Webhook signature check, as Stripe documents it: HMAC-SHA256 of "{timestamp}.{rawBody}" with
// the endpoint's signing secret, constant-time compared against each v1 signature, with a
// five-minute tolerance. The body must be the unmodified raw text.
export async function verifyStripeSignature(rawBody, header, secret, { now = Date.now(), tolerance = 300 } = {}) {
  if (!header || typeof header !== 'string') return false;
  let t = null;
  const sigs = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2).map((s) => s && s.trim());
    if (k === 't') t = v;
    else if (k === 'v1' && v) sigs.push(v);
  }
  if (!t || !/^\d+$/.test(t) || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > tolerance) return false;
  const expected = hex(await hmac(secret, `${t}.${rawBody}`));
  return sigs.some((s) => safeEqual(s, expected));
}
