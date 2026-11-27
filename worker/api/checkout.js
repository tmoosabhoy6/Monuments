// POST /api/checkout: re-prices the design on the server from option ids alone, writes the order,
// creates a Stripe Checkout Session and returns its URL. Never accepts an amount from the browser.
import { json, notConfigured, invalid, forbidden, has, readJson, siteUrl, clientIp } from '../lib/http.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { validateCheckout, config } from '../lib/validate.js';
import { stripe } from '../lib/stripe.js';
import { reference as newReference } from '../lib/sign.js';
import { quote } from '../../src/js/builder/pricing.js';
import { encode } from '../../src/js/builder/share.js';

export async function create(request, env) {
  if (!has(env, 'DB', 'STRIPE_SECRET_KEY', 'TURNSTILE_SECRET_KEY')) return notConfigured();
  const body = await readJson(request);
  if (!body) return invalid(['body']);
  const v = validateCheckout(body);
  if (v.errors.length) return invalid(v.errors);
  if (!(await verifyTurnstile(env, body.turnstile, clientIp(request)))) return forbidden();
  const q = quote(v.design, config);
  if (!q.priced || !(q.deposit > 0)) return invalid(['design']);

  const id = crypto.randomUUID();
  const reference = newReference();
  const d = v.data;
  await env.DB.prepare(
    `INSERT INTO orders (id, reference, created_at, name, email, phone, zip, design, total, deposit, payment_status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'unpaid')`,
  ).bind(id, reference, new Date().toISOString(), d.name, d.email, d.phone, d.zip, JSON.stringify(v.design), q.total, q.deposit).run();

  const base = siteUrl(env, request);
  const session = await stripe(env, 'POST', '/v1/checkout/sessions', {
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: config.pricing.currency || 'usd',
        unit_amount: q.deposit * 100,
        product_data: { name: `Deposit for monument sign ${reference}` },
      },
    }],
    customer_creation: 'always',
    customer_email: d.email,
    invoice_creation: { enabled: true },
    client_reference_id: id,
    metadata: { order_id: id, reference },
    payment_intent_data: { metadata: { order_id: id, reference } },
    success_url: `${base}/design/?reserved={CHECKOUT_SESSION_ID}#design`,
    cancel_url: `${base}/design/?cancelled=1&d=${encode(v.design)}#design`,
  }, { idempotencyKey: id });

  await env.DB.prepare('UPDATE orders SET stripe_session_id = ?1 WHERE id = ?2').bind(session.id, id).run();
  return json({ url: session.url, reference });
}
