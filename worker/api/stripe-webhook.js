// POST /api/stripe/webhook: verifies the signature against the unmodified raw body, ignores event
// ids it has already stored, marks the order paid, and sends the two deposit emails in waitUntil.
import { json, notConfigured, has, siteUrl } from '../lib/http.js';
import { verifyStripeSignature } from '../lib/stripe.js';
import { trySend, emailConfigured } from '../lib/email.js';
import { toBusiness, depositPaid } from '../lib/messages.js';
import { tokens } from '../lib/validate.js';
import { money } from '../../src/js/builder/pricing.js';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export async function webhook(request, env, ctx) {
  if (!has(env, 'DB', 'STRIPE_WEBHOOK_SECRET')) return notConfigured();
  const raw = await request.text();
  const ok = await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: 'bad_signature' }, 400);
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: 'bad_body' }, 400); }
  if (!event || typeof event.id !== 'string') return json({ error: 'bad_body' }, 400);

  // Stripe retries; an event id we have already stored is acknowledged and ignored.
  const seen = await env.DB.prepare('INSERT OR IGNORE INTO stripe_events (id, received_at) VALUES (?1, ?2)')
    .bind(event.id, new Date().toISOString()).run();
  if (!seen.meta || seen.meta.changes === 0) return json({ received: true, duplicate: true });
  if (!HANDLED.has(event.type)) return json({ received: true });

  const session = event.data && event.data.object;
  if (!session || session.payment_status !== 'paid') return json({ received: true });
  const orderId = (session.metadata && session.metadata.order_id) || session.client_reference_id;
  if (!orderId) return json({ received: true });

  const paidAt = new Date().toISOString();
  const res = await env.DB.prepare(
    `UPDATE orders SET payment_status = 'paid', paid_at = ?1, stripe_session_id = COALESCE(stripe_session_id, ?2)
     WHERE id = ?3 AND payment_status != 'paid'`,
  ).bind(paidAt, session.id, orderId).run();

  if (res.meta && res.meta.changes > 0 && emailConfigured(env)) {
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?1').bind(orderId).first();
    if (order) {
      const base = siteUrl(env, request);
      const design = JSON.parse(order.design);
      ctx.waitUntil((async () => {
        const biz = toBusiness({ kind: 'deposit', name: order.name, reference: order.reference, base, design, fileLinks: [],
          fields: { name: order.name, email: order.email, phone: order.phone, zip: order.zip, deposit: money(order.deposit), total: money(order.total), stripe_session: session.id } });
        await trySend(env, { to: env.NOTIFY_EMAIL || tokens.email, ...biz, replyTo: order.email });
        await trySend(env, { to: order.email, ...depositPaid({ name: order.name, reference: order.reference, amount: order.deposit }) });
      })());
    }
  }
  return json({ received: true });
}
