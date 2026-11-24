// Response helpers. `_headers` does not apply to Worker responses, so every API response sets
// its own Content-Type, Cache-Control: no-store and X-Content-Type-Options (SPEC §10.3).
const BASE = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...BASE, ...headers } });

export const notConfigured = () => json({ error: 'not_configured' }, 503);
export const invalid = (fields = []) => json({ error: 'invalid', fields }, 400);
export const forbidden = () => json({ error: 'forbidden' }, 403);
export const notFound = () => json({ error: 'not_found' }, 404);
export const tooMany = () => json({ error: 'rate_limited' }, 429);
export const methodNotAllowed = () => json({ error: 'method_not_allowed' }, 405);
export const raw = (body, status, headers) => new Response(body, { status, headers: { ...BASE, ...headers } });

// True when every named binding or secret is present.
export const has = (env, ...names) => names.every((n) => env[n] !== undefined && env[n] !== null && env[n] !== '');

export async function readJson(request, limit = 64 * 1024) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > limit) return null;
  const text = await request.text();
  if (text.length > limit) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export const siteUrl = (env, request) => (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
export const clientIp = (request) => request.headers.get('cf-connecting-ip') || 'unknown';

// Rate limiting through the Workers rate-limit binding. Missing binding means not configured.
export async function limited(env, key) {
  const { success } = await env.RATE_LIMITER.limit({ key });
  return !success;
}
