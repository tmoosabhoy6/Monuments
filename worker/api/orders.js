// GET /api/orders/{session_id}: for the return from Checkout. Asks Stripe for the session, so
// the "Reserved" message reflects what Stripe says rather than a URL parameter.
import { json, notConfigured, notFound, has } from '../lib/http.js';
import { stripe } from '../lib/stripe.js';

export async function get(request, env, ctx, [sessionId]) {
  if (!has(env, 'STRIPE_SECRET_KEY')) return notConfigured();
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return notFound();
  try {
    const s = await stripe(env, 'GET', `/v1/checkout/sessions/${sessionId}`);
    return json({
      amount: Math.round((s.amount_total || 0) / 100),
      reference: (s.metadata && s.metadata.reference) || '',
      payment_status: s.payment_status,
    });
  } catch {
    return notFound();
  }
}
