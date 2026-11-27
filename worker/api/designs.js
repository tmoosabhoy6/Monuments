// POST /api/designs/email: emails a design link to the address given. Turnstile, rate-limited.
import { json, notConfigured, invalid, forbidden, tooMany, has, readJson, siteUrl, clientIp, limited } from '../lib/http.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { validateEmailDesign } from '../lib/validate.js';
import { sendEmail, emailConfigured } from '../lib/email.js';
import { designEmail } from '../lib/messages.js';
import { designUrl } from '../../src/js/builder/share.js';

export async function email(request, env) {
  if (!has(env, 'TURNSTILE_SECRET_KEY', 'RATE_LIMITER') || !emailConfigured(env)) return notConfigured();
  if (await limited(env, `design-email:${clientIp(request)}`)) return tooMany();
  const body = await readJson(request);
  if (!body) return invalid(['body']);
  const v = validateEmailDesign(body);
  if (v.errors.length) return invalid(v.errors);
  if (!(await verifyTurnstile(env, body.turnstile, clientIp(request)))) return forbidden();
  const link = designUrl(siteUrl(env, request) + '/design/', v.design);
  await sendEmail(env, { to: v.email, ...designEmail({ link }) });
  return json({ sent: true });
}
