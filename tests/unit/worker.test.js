import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { route } from '../../worker/index.js';
import { verifyStripeSignature } from '../../worker/lib/stripe.js';
import { hmac, hex, signFileLink, signToken, REF_ALPHABET } from '../../worker/lib/sign.js';
import { validateRequest, validateCheckout, validateInvoice, config } from '../../worker/lib/validate.js';
import { defaults } from '../../src/js/builder/state.js';
import { quote } from '../../src/js/builder/pricing.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const schema = await readFile(root + 'worker/migrations/0001_init.sql', 'utf8');

// ---------- fakes: D1 on node:sqlite, R2 in memory, fetch stubbed per test ----------
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  const prepare = (sql) => {
    const stmt = db.prepare(sql);
    let args = [];
    const self = {
      bind: (...a) => { args = a.map((v) => (v === undefined ? null : v)); return self; },
      run: async () => { const r = stmt.run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      first: async () => stmt.get(...args) || null,
      all: async () => ({ results: stmt.all(...args) }),
    };
    return self;
  };
  return { prepare, _db: db };
}
function fakeR2() {
  const store = new Map();
  return {
    store,
    async put(key, body, opts) { const buf = Buffer.from(await new Response(body).arrayBuffer()); store.set(key, { buf, ...opts }); return {}; },
    async head(key) { return store.has(key) ? { key } : null; },
    async get(key) { const o = store.get(key); return o ? { body: o.buf, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata } : null; },
  };
}
const sent = [];
const fakeEmail = { send: async (m) => { sent.push(m); return { messageId: 'm1' }; } };
const fakeLimiter = (ok = true) => ({ limit: async () => ({ success: ok }) });
const ctx = () => { const p = []; return { waitUntil: (x) => p.push(x), done: () => Promise.all(p) }; };

let realFetch, stripeCalls;
beforeEach(() => {
  realFetch = globalThis.fetch;
  stripeCalls = [];
  sent.length = 0;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('turnstile/v0/siteverify')) {
      const token = init.body.get('response');
      return Response.json({ success: token === 'good-token' });
    }
    if (u.startsWith('https://api.stripe.com')) {
      stripeCalls.push({ url: u, init });
      if (u.includes('/v1/checkout/sessions') && init.method === 'POST') return Response.json({ id: 'cs_test_abc1234567', url: 'https://checkout.stripe.com/c/pay/cs_test_abc1234567' });
      if (u.includes('/v1/checkout/sessions/cs_test_')) return Response.json({ amount_total: 255000, metadata: { reference: 'MS-ABCDEF' }, payment_status: 'paid' });
      if (u.includes('/v1/invoices/search')) return Response.json({ data: [{ id: 'in_1', customer_email: 'pat@example.com' }] });
      if (u.includes('/v1/invoices/in_1')) return Response.json({ id: 'in_1', status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/abc' });
      return Response.json({ error: { message: 'unknown' } }, { status: 404 });
    }
    throw new Error('unexpected fetch ' + u);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const fullEnv = () => ({
  DB: fakeD1(), UPLOADS: fakeR2(), EMAIL: fakeEmail, RATE_LIMITER: fakeLimiter(),
  TURNSTILE_SECRET_KEY: 'ts', SIGNING_SECRET: 'signing-secret', STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test',
  FROM_EMAIL: 'shop@example.com', NOTIFY_EMAIL: 'owner@example.com', SITE_URL: 'https://example.com',
});
const call = async (env, method, path, body, headers = {}) => {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } };
  if (body !== undefined) init.body = typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body);
  const c = ctx();
  const res = await route(new Request('https://example.com' + path, init), env, c);
  await c.done();
  const text = await res.text();
  let data = null; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
};
const quoteBody = (o = {}) => ({ type: 'quote', name: 'Pat Lee', email: 'pat@example.com', zip: '30301', need: 'monument', details: 'An entry sign for our subdivision.', turnstile: 'good-token', ...o });

// ---------- not configured ----------
test('every endpoint answers 503 not_configured when its bindings or secrets are missing', async () => {
  const env = {};
  for (const [m, p] of [['POST', '/api/uploads/start'], ['PUT', '/api/uploads/x/0'], ['POST', '/api/requests'], ['POST', '/api/designs/email'],
    ['POST', '/api/checkout'], ['POST', '/api/stripe/webhook'], ['GET', '/api/orders/cs_test_abc1234567'], ['POST', '/api/invoices/find']]) {
    const r = await call(env, m, p, m === 'GET' ? undefined : {});
    assert.equal(r.status, 503, `${m} ${p}`);
    assert.deepEqual(r.data, { error: 'not_configured' });
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
  const dbOnly = { DB: fakeD1() };
  assert.equal((await call(dbOnly, 'POST', '/api/checkout', {})).status, 503);
});

// ---------- validation ----------
test('server validation rejects bad input', () => {
  assert.deepEqual(validateRequest(quoteBody()).errors, []);
  assert.deepEqual(validateRequest(quoteBody({ name: ' ', email: 'not-an-email', zip: '3030', details: '' })).errors.sort(), ['details', 'email', 'name', 'zip']);
  assert.ok(validateRequest(quoteBody({ need: 'banners' })).errors.includes('need'));
  assert.ok(validateRequest(quoteBody({ type: 'other' })).errors.includes('type'));
  assert.ok(validateRequest(quoteBody({ name: 'x'.repeat(500) })).errors.includes('name'));
  assert.ok(validateRequest(quoteBody({ files: Array.from({ length: 6 }, (_, i) => ({ key: 'k' + i })) })).errors.includes('files'));
  const good = { name: 'Pat', email: 'pat@example.com', zip: '30301', design: defaults(config) };
  assert.deepEqual(validateCheckout(good).errors, []);
  for (const bad of [{ size: '999x1' }, { shape: 'star' }, { field: 'chartreuse' }, { base: 'marble' }, { sides: 3 }, { lines: ['x'.repeat(40)] }]) {
    assert.ok(validateCheckout({ ...good, design: { ...good.design, ...bad } }).errors.includes('design'), JSON.stringify(bad));
  }
  assert.ok(validateCheckout({ ...good, zip: 'abcde' }).errors.includes('zip'));
  assert.deepEqual(validateInvoice({ number: 'ABC-0001', email: 'a@b.co' }).errors, []);
  assert.ok(validateInvoice({ number: 'x" OR 1', email: 'a@b.co' }).errors.includes('number'));
});

test('requests: invalid input is refused with 400 and the failing fields', async () => {
  const r = await call(fullEnv(), 'POST', '/api/requests', quoteBody({ email: 'nope' }));
  assert.equal(r.status, 400);
  assert.deepEqual(r.data.fields, ['email']);
  const bad = await call(fullEnv(), 'POST', '/api/requests', quoteBody({ turnstile: 'bad-token' }));
  assert.equal(bad.status, 403);
  const notJson = await call(fullEnv(), 'POST', '/api/requests', '{not json');
  assert.equal(notJson.status, 400);
});

test('requests: a valid quote is saved first, then both emails go out', async () => {
  const env = fullEnv();
  const r = await call(env, 'POST', '/api/requests', quoteBody());
  assert.equal(r.status, 200);
  assert.match(r.data.reference, new RegExp(`^MS-[${REF_ALPHABET}]{6}$`));
  const row = env.DB._db.prepare('SELECT * FROM requests').get();
  assert.equal(row.reference, r.data.reference);
  assert.equal(row.type, 'quote');
  assert.equal(JSON.parse(row.fields).details, 'An entry sign for our subdivision.');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].subject, `New quote request: Pat Lee, ${r.data.reference}`);
  assert.equal(sent[1].subject, 'We have your quote request');
  assert.match(sent[1].text, /^Thank you, Pat\. We have your request and will reply within one business day\./);
});

test('requests: with email not configured the request still succeeds, because it is saved', async () => {
  const env = fullEnv();
  delete env.EMAIL; delete env.FROM_EMAIL;
  const r = await call(env, 'POST', '/api/requests', quoteBody({ type: 'drawing', design: defaults(config) }));
  assert.equal(r.status, 200);
  assert.equal(env.DB._db.prepare('SELECT count(*) AS n FROM requests').get().n, 1);
  assert.equal(sent.length, 0);
});

// ---------- uploads and file links ----------
test('uploads: token, size and type rules, then the request lists only its own files', async () => {
  const env = fullEnv();
  const start = await call(env, 'POST', '/api/uploads/start', { turnstile: 'good-token', count: 2 });
  assert.equal(start.status, 200);
  const t = encodeURIComponent(start.data.token);
  const body = new Uint8Array([137, 80, 78, 71]);
  const noLength = await route(new Request(`https://example.com/api/uploads/${t}/0`, { method: 'PUT', body: new ReadableStream({ start(c) { c.enqueue(body); c.close(); } }), duplex: 'half', headers: { 'content-type': 'image/png' } }), env, ctx());
  assert.equal(noLength.status, 413);
  const big = await call(env, 'PUT', `/api/uploads/${t}/0`, body, { 'content-type': 'image/png', 'content-length': String(26 * 1024 * 1024) });
  assert.equal(big.status, 413);
  const exe = await call(env, 'PUT', `/api/uploads/${t}/0`, body, { 'content-type': 'application/x-msdownload', 'content-length': '4' });
  assert.equal(exe.status, 415);
  const octetBad = await call(env, 'PUT', `/api/uploads/${t}/0`, body, { 'content-type': 'application/octet-stream', 'content-length': '4', 'x-file-name': 'run.exe' });
  assert.equal(octetBad.status, 415);
  const octetAi = await call(env, 'PUT', `/api/uploads/${t}/1`, body, { 'content-type': 'application/octet-stream', 'content-length': '4', 'x-file-name': 'logo.ai' });
  assert.equal(octetAi.status, 200);
  const png = await call(env, 'PUT', `/api/uploads/${t}/0`, body, { 'content-type': 'image/png', 'content-length': '4', 'x-file-name': 'logo%20final.png' });
  assert.equal(png.status, 200);
  assert.match(png.data.key, /^uploads\/[0-9a-f-]{36}\/0-[0-9a-f-]{36}-logo-final\.png$/);
  const beyond = await call(env, 'PUT', `/api/uploads/${t}/2`, body, { 'content-type': 'image/png', 'content-length': '4' });
  assert.equal(beyond.status, 400);
  const forged = await call(env, 'PUT', `/api/uploads/${t}x/0`, body, { 'content-type': 'image/png', 'content-length': '4' });
  assert.equal(forged.status, 403);
  const r = await call(env, 'POST', '/api/requests', quoteBody({ turnstile: undefined, uploadToken: start.data.token,
    files: [{ key: png.data.key, name: 'logo final.png' }, { key: 'uploads/someone-else/0-x-a.png', name: 'a.png' }] }));
  assert.equal(r.status, 200);
  const row = env.DB._db.prepare('SELECT files FROM requests').get();
  assert.deepEqual(JSON.parse(row.files).map((f) => f.key), [png.data.key]);
  assert.match(sent[0].text, /https:\/\/example\.com\/api\/files\/uploads\//);
});

test('files: a signed link serves the file; a bad or expired one is 404', async () => {
  const env = fullEnv();
  await env.UPLOADS.put('uploads/r1/0-u-a.png', new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/png' }, customMetadata: { name: 'a.png' } });
  const link = await signFileLink('https://example.com', 'uploads/r1/0-u-a.png', env.SIGNING_SECRET);
  const ok = await call(env, 'GET', link.replace('https://example.com', ''));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'image/png');
  const tampered = await call(env, 'GET', link.replace('https://example.com', '').replace(/sig=./, 'sig=Z'));
  assert.equal(tampered.status, 404);
  const old = await signFileLink('https://example.com', 'uploads/r1/0-u-a.png', env.SIGNING_SECRET, Date.now() - 40 * 86400000);
  assert.equal((await call(env, 'GET', old.replace('https://example.com', ''))).status, 404);
});

// ---------- checkout ----------
test('checkout: the deposit is computed on the server from option ids; amounts from the browser are ignored', async () => {
  const env = fullEnv();
  const design = { ...defaults(config), lines: ['Alder Creek'], sides: 2, total: 1, deposit: 1 };
  const r = await call(env, 'POST', '/api/checkout', { design, name: 'Pat Lee', email: 'pat@example.com', zip: '30301', turnstile: 'good-token', amount: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.data.url, 'https://checkout.stripe.com/c/pay/cs_test_abc1234567');
  const q = quote({ ...defaults(config), sides: 2 }, config);
  const call0 = stripeCalls[0];
  const params = new URLSearchParams(call0.init.body);
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), String(q.deposit * 100));
  assert.equal(params.get('mode'), 'payment');
  assert.equal(params.get('customer_creation'), 'always');
  assert.equal(params.get('invoice_creation[enabled]'), 'true');
  assert.equal(params.get('customer_email'), 'pat@example.com');
  assert.match(params.get('line_items[0][price_data][product_data][name]'), /^Deposit for monument sign MS-[A-Z2-9]{6}$/);
  assert.equal(params.get('success_url'), 'https://example.com/?reserved={CHECKOUT_SESSION_ID}#design');
  assert.ok(params.get('payment_intent_data[metadata][order_id]'));
  assert.equal(params.get('payment_intent_data[metadata][order_id]'), params.get('metadata[order_id]'));
  assert.equal(call0.init.headers['stripe-version'], '2026-11-18.endive');
  assert.equal(call0.init.headers['idempotency-key'], params.get('client_reference_id'));
  const order = env.DB._db.prepare('SELECT * FROM orders').get();
  assert.equal(order.deposit, q.deposit);
  assert.equal(order.total, q.total);
  assert.equal(order.stripe_session_id, 'cs_test_abc1234567');
});

test('checkout: an id the config does not contain is rejected', async () => {
  const r = await call(fullEnv(), 'POST', '/api/checkout', { design: { ...defaults(config), size: '999x999' }, name: 'Pat', email: 'pat@example.com', zip: '30301', turnstile: 'good-token' });
  assert.equal(r.status, 400);
  assert.deepEqual(r.data.fields, ['design']);
  assert.equal(stripeCalls.length, 0);
});

test('orders: the return message reflects what Stripe says', async () => {
  const r = await call(fullEnv(), 'GET', '/api/orders/cs_test_abc1234567');
  assert.deepEqual(r.data, { amount: 2550, reference: 'MS-ABCDEF', payment_status: 'paid' });
  assert.equal((await call(fullEnv(), 'GET', '/api/orders/not-a-session')).status, 404);
});

// ---------- webhook ----------
const signed = async (body, secret, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${hex(await hmac(secret, `${t}.${body}`))}`;

test('webhook signature: valid accepted, tampered body and stale timestamp rejected', async () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const header = await signed(body, 'whsec_test');
  assert.equal(await verifyStripeSignature(body, header, 'whsec_test'), true);
  assert.equal(await verifyStripeSignature(body.replace('evt_1', 'evt_2'), header, 'whsec_test'), false);
  assert.equal(await verifyStripeSignature(body, header, 'whsec_other'), false);
  const stale = await signed(body, 'whsec_test', Math.floor(Date.now() / 1000) - 301);
  assert.equal(await verifyStripeSignature(body, stale, 'whsec_test'), false);
  const twoSigs = `${header},v1=${'0'.repeat(64)}`;
  assert.equal(await verifyStripeSignature(body, twoSigs, 'whsec_test'), true);
  assert.equal(await verifyStripeSignature(body, 'garbage', 'whsec_test'), false);
});

test('webhook: marks the order paid once, ignores repeats, and sends the two deposit emails', async () => {
  const env = fullEnv();
  const c = await call(env, 'POST', '/api/checkout', { design: defaults(config), name: 'Pat Lee', email: 'pat@example.com', zip: '30301', turnstile: 'good-token' });
  assert.equal(c.status, 200);
  const order = env.DB._db.prepare('SELECT * FROM orders').get();
  const event = { id: 'evt_paid_1', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_abc1234567', payment_status: 'paid', client_reference_id: order.id, metadata: { order_id: order.id } } } };
  const body = JSON.stringify(event);
  const bad = await call(env, 'POST', '/api/stripe/webhook', body, { 'stripe-signature': await signed(body + ' ', 'whsec_test') });
  assert.equal(bad.status, 400);
  const ok = await call(env, 'POST', '/api/stripe/webhook', body, { 'stripe-signature': await signed(body, 'whsec_test') });
  assert.equal(ok.status, 200);
  const paid = env.DB._db.prepare('SELECT * FROM orders').get();
  assert.equal(paid.payment_status, 'paid');
  assert.ok(paid.paid_at);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].subject, 'Reserved: your monument sign');
  assert.match(sent[1].text, /Your deposit of \$2,550 is paid/);
  const again = await call(env, 'POST', '/api/stripe/webhook', body, { 'stripe-signature': await signed(body, 'whsec_test') });
  assert.equal(again.status, 200);
  assert.equal(again.data.duplicate, true);
  assert.equal(sent.length, 2);
  const unpaid = { ...event, id: 'evt_unpaid', data: { object: { ...event.data.object, payment_status: 'unpaid' } } };
  const ub = JSON.stringify(unpaid);
  assert.equal((await call(env, 'POST', '/api/stripe/webhook', ub, { 'stripe-signature': await signed(ub, 'whsec_test') })).status, 200);
});

// ---------- invoices and design emails ----------
test('invoices: only an open invoice with the matching email returns a link; everything else is the same 404', async () => {
  const env = fullEnv();
  const ok = await call(env, 'POST', '/api/invoices/find', { number: 'ABC-0001', email: 'Pat@Example.com', turnstile: 'good-token' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.url, 'https://invoice.stripe.com/i/abc');
  const wrong = await call(env, 'POST', '/api/invoices/find', { number: 'ABC-0001', email: 'other@example.com', turnstile: 'good-token' });
  const badToken = await call(env, 'POST', '/api/invoices/find', { number: 'ABC-0001', email: 'pat@example.com', turnstile: 'bad-token' });
  const badNumber = await call(env, 'POST', '/api/invoices/find', { number: '"; drop', email: 'pat@example.com', turnstile: 'good-token' });
  for (const r of [wrong, badToken, badNumber]) { assert.equal(r.status, 404); assert.deepEqual(r.data, { error: 'not_found' }); }
  const limitedEnv = { ...fullEnv(), RATE_LIMITER: fakeLimiter(false) };
  assert.equal((await call(limitedEnv, 'POST', '/api/invoices/find', { number: 'ABC-0001', email: 'pat@example.com', turnstile: 'good-token' })).status, 429);
});

test('designs/email: sends the link to the address given', async () => {
  const env = fullEnv();
  const r = await call(env, 'POST', '/api/designs/email', { email: 'pat@example.com', design: { ...defaults(config), lines: ['Alder Creek'] }, turnstile: 'good-token' });
  assert.equal(r.status, 200);
  assert.equal(sent[0].subject, 'Your monument sign design');
  assert.match(sent[0].text, /^Here is the sign you designed: https:\/\/example\.com\/\?d=[A-Za-z0-9_-]+#design\. The link opens this exact sign/);
  assert.equal((await call(env, 'POST', '/api/designs/email', { email: 'x', design: {}, turnstile: 'good-token' })).status, 400);
});

test('unknown routes and wrong methods', async () => {
  assert.equal((await call(fullEnv(), 'GET', '/api/nothing')).status, 404);
  assert.equal((await call(fullEnv(), 'GET', '/api/checkout')).status, 405);
  const token = await signToken({ rid: 'r', exp: Date.now() - 1, count: 1 }, 'signing-secret');
  assert.equal((await call(fullEnv(), 'PUT', `/api/uploads/${token}/0`, new Uint8Array([1]), { 'content-type': 'image/png', 'content-length': '1' })).status, 403);
});
