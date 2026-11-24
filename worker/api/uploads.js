// POST /api/uploads/start and PUT /api/uploads/{token}/{n}
import { json, notConfigured, invalid, forbidden, has, readJson, clientIp } from '../lib/http.js';
import { signToken, verifyToken } from '../lib/sign.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { MAX_FILES, MAX_FILE_BYTES, FILE_TYPES, fileExtension } from '../../src/js/rules.js';

const TOKEN_MINUTES = 15;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf', 'image/webp', 'application/postscript', 'application/illustrator']);

// Verifies a Turnstile token and returns a short-lived signed upload token. Turnstile tokens are
// single-use, so this token is what authorizes the following uploads and the submit.
export async function start(request, env) {
  if (!has(env, 'DB', 'UPLOADS', 'TURNSTILE_SECRET_KEY', 'SIGNING_SECRET')) return notConfigured();
  const body = await readJson(request);
  if (!body) return invalid(['body']);
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_FILES) return invalid(['count']);
  if (!(await verifyTurnstile(env, body.turnstile, clientIp(request)))) return forbidden();
  const exp = Date.now() + TOKEN_MINUTES * 60000;
  const token = await signToken({ rid: crypto.randomUUID(), exp, count }, env.SIGNING_SECRET);
  return json({ token, expires: exp });
}

const sanitizeName = (name) => String(name || 'file').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file';

// Streams the raw body to R2 without buffering it.
export async function put(request, env, ctx, [token, n]) {
  if (!has(env, 'UPLOADS', 'SIGNING_SECRET')) return notConfigured();
  const payload = await verifyToken(decodeURIComponent(token), env.SIGNING_SECRET);
  if (!payload) return forbidden();
  const index = Number(n);
  if (!Number.isInteger(index) || index < 0 || index >= Math.min(payload.count, MAX_FILES)) return invalid(['n']);
  const length = request.headers.get('content-length');
  if (!length || !/^\d+$/.test(length) || Number(length) === 0 || Number(length) > MAX_FILE_BYTES) {
    return json({ error: 'too_large' }, 413);
  }
  const name = sanitizeName(decodeURIComponent(request.headers.get('x-file-name') || ''));
  const ext = fileExtension(name);
  let type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type === 'application/octet-stream') {
    // allowed only with a known extension, and stored under that extension's type
    if (!FILE_TYPES[ext]) return json({ error: 'unsupported_type' }, 415);
    type = FILE_TYPES[ext];
  }
  if (!ALLOWED.has(type)) return json({ error: 'unsupported_type' }, 415);
  if (!request.body) return json({ error: 'too_large' }, 413);
  const key = `uploads/${payload.rid}/${index}-${crypto.randomUUID()}-${name}`;
  await env.UPLOADS.put(key, request.body, {
    httpMetadata: { contentType: type, contentDisposition: `attachment; filename="${name}"` },
    customMetadata: { name },
  });
  return json({ key });
}
