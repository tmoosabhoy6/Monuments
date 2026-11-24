// POST /api/requests: a quote or approval-drawing request.
// Validates on the server, writes to D1 first, then emails the business and the customer.
import { json, notConfigured, invalid, forbidden, has, readJson, siteUrl, clientIp } from '../lib/http.js';
import { verifyToken, signFileLink, reference as newReference } from '../lib/sign.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { validateRequest } from '../lib/validate.js';
import { trySend, emailConfigured } from '../lib/email.js';
import { toBusiness, quoteReceived, drawingReceived } from '../lib/messages.js';
import { designUrl } from '../../src/js/builder/share.js';
import { tokens } from '../lib/validate.js';

export async function create(request, env, ctx) {
  if (!has(env, 'DB', 'TURNSTILE_SECRET_KEY', 'SIGNING_SECRET')) return notConfigured();
  const body = await readJson(request);
  if (!body) return invalid(['body']);

  // Authorized by a fresh Turnstile token, or by a valid upload token from /api/uploads/start.
  let id = null;
  if (body.uploadToken) {
    const payload = await verifyToken(body.uploadToken, env.SIGNING_SECRET);
    if (!payload) return forbidden();
    id = payload.rid;
  } else if (await verifyTurnstile(env, body.turnstile, clientIp(request))) {
    id = crypto.randomUUID();
  } else {
    return forbidden();
  }

  const v = validateRequest(body);
  if (v.errors.length) return invalid(v.errors);
  // the honeypot: a filled field gets an ordinary-looking answer and nothing is stored
  if (typeof body.website === 'string' && body.website) return json({ reference: newReference() });

  // Files must have been uploaded under this request's id.
  const files = [];
  for (const f of v.files) {
    if (!f.key.startsWith(`uploads/${id}/`) || !env.UPLOADS) continue;
    if (await env.UPLOADS.head(f.key)) files.push(f);
  }

  const reference = newReference();
  const d = v.data;
  const lighting = v.design ? v.design.lighting : false;
  await env.DB.prepare(
    `INSERT INTO requests (id, reference, type, created_at, name, email, phone, organization, zip, fields, design, files, lighting)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
  ).bind(id, reference, v.type, new Date().toISOString(), d.name, d.email, d.phone, d.organization, d.zip,
    JSON.stringify(d), v.design ? JSON.stringify(v.design) : null, JSON.stringify(files), lighting ? 1 : 0).run();

  // Emails after the record is safe. A missing email setup still counts as success: it is saved.
  if (emailConfigured(env)) {
    const base = siteUrl(env, request);
    const link = v.design ? designUrl(base + '/', v.design) : '';
    ctx.waitUntil((async () => {
      const fileLinks = await Promise.all(files.map(async (f) => ({ name: f.name || f.key, url: await signFileLink(base, f.key, env.SIGNING_SECRET) })));
      const biz = toBusiness({ kind: v.type, name: d.name, reference, fields: d, design: v.design, fileLinks, base });
      await trySend(env, { to: env.NOTIFY_EMAIL || tokens.email, ...biz, replyTo: d.email });
      const mine = v.type === 'quote' ? quoteReceived({ name: d.name, reference }) : drawingReceived({ name: d.name, reference, link });
      await trySend(env, { to: d.email, ...mine, replyTo: env.NOTIFY_EMAIL || tokens.email });
    })());
  }
  return json({ reference });
}
