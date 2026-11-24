// POST /api/invoices/find: finds a Stripe invoice by number, requires the email to match the
// invoice's customer email, and returns a freshly fetched hosted_invoice_url only if it is open.
// Every failure returns the same not-found answer, so invoice numbers cannot be probed.
import { json, notConfigured, notFound, tooMany, has, readJson, clientIp, limited } from '../lib/http.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { validateInvoice } from '../lib/validate.js';
import { stripe } from '../lib/stripe.js';

export async function find(request, env) {
  if (!has(env, 'STRIPE_SECRET_KEY', 'TURNSTILE_SECRET_KEY', 'RATE_LIMITER')) return notConfigured();
  if (await limited(env, `invoice:${clientIp(request)}`)) return tooMany();
  const body = await readJson(request);
  if (!body) return notFound();
  const v = validateInvoice(body);
  if (v.errors.length) return notFound();
  if (!(await verifyTurnstile(env, body.turnstile, clientIp(request)))) return notFound();
  try {
    const found = await stripe(env, 'GET', '/v1/invoices/search', { query: `number:"${v.number}"`, limit: 1 });
    const inv = found.data && found.data[0];
    if (!inv || String(inv.customer_email || '').toLowerCase() !== v.email) return notFound();
    const fresh = await stripe(env, 'GET', `/v1/invoices/${inv.id}`);
    if (fresh.status !== 'open' || !fresh.hosted_invoice_url) return notFound();
    return json({ url: fresh.hosted_invoice_url });
  } catch {
    return notFound();
  }
}
