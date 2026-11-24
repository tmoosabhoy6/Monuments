# Monument sign website

A marketing and ordering site for a business that makes monument signs and nothing else. Visitors
see standard sizes with prices, design their own sign in a builder that draws it live and prices it
instantly, request a custom quote or an approval drawing, pay a deposit through Stripe, and later
pay an invoice online. It runs on Cloudflare: static pages plus one Worker for `/api/*`.

- `SPEC.md` is the full specification. `PROGRESS.md` records decisions, declined suggestions and
  what could not be verified. `CLAUDE.md` holds the hard constraints for anyone editing with Claude.
- `design/` holds the reference comp and the review screenshots (`design/review/`). It is not deployed.

## Pages

| URL | What it is |
|---|---|
| `/` | The sign with "Put your name on it", the builder (`#design`), standard sizes (`#sizes`), and photographs of finished signs (`#work`) once supplied |
| `/how-it-works/` | The six stages of an order, every policy (`#policy-…`), the custom quote form (`#quote`) |
| `/questions/` | Questions, in four groups |
| `/more-from-our-shop/` | Panels, mailboxes and custom foam pieces |

## Run it locally

Needs Node 22 or later.

```sh
npm install                                            # wrangler and playwright (dev only)
cp .dev.vars.example .dev.vars                         # local secrets; never commit .dev.vars
npx wrangler d1 migrations apply monument-signs --local
npm run dev                                            # builds dist/ and starts wrangler dev on :8787
```

`.dev.vars` starts with Cloudflare's always-pass Turnstile test secret and a local signing
secret, so the forms and uploads work locally against local D1 and R2. Payments answer "not
switched on yet" until you add a Stripe test key (below).

## Commands

| Command | Does |
|---|---|
| `npm run build` | Builds `dist/` from `src/` and `content/site.config.json`. Fails on any unresolved `{{token}}` or missing file. |
| `npm run build:production` | The launch gate first: fails while `draft` is true or any value is unconfirmed, naming each. Then builds. |
| `npm test` | Unit tests: pricing, sharing, drawing, the pre-rendered hero, config, every Worker endpoint, webhook signatures. |
| `npm run test:browser` | Playwright tests on the built site (pre-installed Chromium). |
| `npm run check:rules` | Scans `dist/` for anything the hard constraints forbid. |
| `npm run check:size` | Compressed size budgets: HTML 50 KB a page, CSS 14 KB, JavaScript 30 KB, fonts 70 KB. |
| `npm run check:copy` | Every phrase of SPEC §7 appears word for word on the site or in the emails. |
| `npm run check:scroll` | Scroll frame timing, desktop and throttled phone. |
| `npm run check:lighthouse` | Lighthouse (mobile) against a running `wrangler dev`. |
| `npm run check:a11y` | Touch targets, text contrast, 200% zoom, headings, dialogs. |
| `npm run screenshots` | Every page at 1440×900, 834×1112 and 390×844, both hero states, into `design/review/`. |
| `npm run og` | Regenerates the 1200×630 sharing image from the drawing. |
| `npm run glyphs` | Re-measures the lettering width table. Only if a font file changes. |

## Changing prices, facts and text

Everything the owner decides lives in **`content/site.config.json`**. Edit it, run `npm run
build`, and every page, the builder, the Worker and the emails pick up the change. Nothing in the
HTML needs touching.

- **Unconfirmed values** are written `{ "value": …, "confirmed": false }`. When the owner confirms
  one, change `false` to `true` (and the value, if it differs). The launch gate lists every one
  still unconfirmed.
- **Sizes and prices** are under `pricing.sizes`: each size has an id, the face width and height
  and the base height in inches, and `single`, `double` and `install` prices in whole dollars.
  Changing the list changes the lineup, the builder, the heading ("Four standard sizes…") and the
  Worker's prices together.
- **Option prices** (`pricing.shape`, `pricing.base`, `pricing.pillars`, `pricing.lettering`) are
  either one number for every size or an object keyed by size id, for example
  `"stone": { "48x30": 200, "60x36": 250, "72x42": 300, "96x48": 350 }`. A `null` price makes the
  builder say "Priced with your drawing" and offer the approval drawing instead of a deposit.
- **Deposit percentage** is `pricing.deposit_percent`.
- **Paint colors** are `paints` (id, name, hex). The order is the order shown.
- **Policies, the warranty, the privacy text and three answers** are in `policies`, `privacy_text`
  and `questions`. They may contain `{{tokens}}` such as `{{deposit_percent}}`.
- **Photographs of finished signs**: add AVIF or WebP files to `src/static/photos/` and list them in
  `gallery` as `{ "src": "/photos/name.webp", "width": …, "height": …, "alt": "…", "place": "…",
  "size": "8 ft × 4 ft", "options": "stone-look base, pillars" }`. The "Signs we have built"
  section appears on the home page once there is at least one.
- **Customer portal**: set `stripe_portal_url` to the Stripe customer portal login link and "See
  your orders and payments" appears.
- **Prototype switches** (`features`): `deposits`, `invoice_payment`, `email_design` and
  `file_uploads`. Each is `false` in the prototype, which builds that feature hidden: no
  "Reserve with deposit" (the approval drawing becomes the main action and no deposit line is
  shown), no "Pay an invoice", no "Email it to me", and no file fields. Set one to `true` once its
  service is set up (Stripe; Stripe; an email sender; R2) and rebuild. Tests build everything
  with `--all-features`.
- **Draft**: while `"draft": true`, every page shows "Draft site. Prices and terms shown are
  samples." and asks search engines not to index it.

Words that are not owner facts (headings, labels, the page paragraphs) are in the templates in
`src/` and in `src/messages.json`; they are the final copy from SPEC §7.

## Configure Cloudflare

1. `npx wrangler login`
2. Create the database and put its id in `wrangler.jsonc` (replacing the placeholder id), then
   apply the schema:
   ```sh
   npx wrangler d1 create monument-signs
   npx wrangler d1 migrations apply monument-signs --remote
   ```
3. Create the private bucket for uploads: `npx wrangler r2 bucket create monument-signs-uploads`
4. Turnstile: create a widget for the site's domain in the Cloudflare dashboard. Put the **site
   key** in `content/site.config.json` → `turnstile_site_key` and set the **secret**:
   `npx wrangler secret put TURNSTILE_SECRET_KEY`
5. `npx wrangler secret put SIGNING_SECRET` with a long random string
   (`node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`). It signs upload tokens
   and the 30-day file links in notification emails.
6. Set the vars in `wrangler.jsonc`: `SITE_URL` (for example `https://example.com`),
   `NOTIFY_EMAIL` (where requests go) and `FROM_EMAIL` (the sending address).
7. Email, one of:
   - **Cloudflare Email Service** (recommended): onboard the sending domain under Email Service,
     then uncomment the `send_email` binding named `EMAIL` in `wrangler.jsonc`.
   - **Resend**: verify the domain in Resend and `npx wrangler secret put RESEND_API_KEY`.

   Without either, requests are still saved to D1; only the emails are skipped.
8. The rate limiter (`RATE_LIMITER`) needs no setup beyond `wrangler.jsonc`.

## Configure Stripe

The site uses Stripe-hosted Checkout by redirect and the Stripe REST API with `fetch`; it never
loads Stripe.js and never sees card details. **API version pinned: `2026-11-18.endive`**
(`worker/lib/stripe.js`; current on Stripe's versioning page on 2026-11-23).

1. Create a **restricted key** with Checkout Sessions: write and Invoices: read.
   `npx wrangler secret put STRIPE_SECRET_KEY`
2. Add a webhook endpoint at `https://<your domain>/api/stripe/webhook` for the events
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then
   `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with its signing secret (`whsec_…`).
3. Send invoices from the Stripe dashboard as usual. Customers can find and pay an open invoice from
   "Pay an invoice" on the site (by invoice number and the email it was sent to).
4. Optionally enable the customer portal and put its login link in `stripe_portal_url`.

To test locally, put test-mode keys in `.dev.vars` and forward webhooks with the Stripe CLI:
`stripe listen --forward-to localhost:8787/api/stripe/webhook`.

Until the keys exist, every endpoint answers `503 not_configured` and the site says so plainly
("Online deposits are not switched on yet…", "This form is not switched on yet…").

## Deploy

**Current deployment (draft):** https://monument-signs.tmoosabhoy6.workers.dev, deployed
2026-11-24 from the draft build (sample prices, "Draft site" notice, `noindex`). In place on
Cloudflare: the Worker `monument-signs`, the D1 database `monument-signs` with its schema, a
Turnstile widget for that hostname (and localhost), the rate limiter, and the secrets
`TURNSTILE_SECRET_KEY` and `SIGNING_SECRET`. Not yet in place: R2 (not enabled on the account,
so file uploads are off and requests are sent without their files), Stripe, and email.

Two ways to deploy:

- **`npm run deploy`** (the intended setup, `wrangler.jsonc`): Cloudflare serves the pages as
  static assets and the Worker runs only for `/api/*`. Use this from an ordinary machine.
- **`npm run deploy:bundled`** (`wrangler.bundled.jsonc`): the Worker serves the built pages
  itself, with the same headers. It exists because the draft was deployed from a cloud session
  whose proxy replaces the short-lived token Cloudflare's asset upload uses. It behaves the same,
  but every page view counts as a Worker request. The next `npm run deploy` from an ordinary
  machine replaces it with the intended setup; nothing else changes.

To switch uploads on: enable R2 in the Cloudflare dashboard, run
`npx wrangler r2 bucket create monument-signs-uploads`, uncomment the `r2_buckets` line in both
wrangler files, and deploy again.

For the launch itself, `npm run build:production` must pass first (the launch gate), then deploy.
For a preview without touching production: `npx wrangler preview` (open beta in Wrangler 4.167).

## Launch checklist

- [ ] Every value in `content/site.config.json` confirmed (`npm run check:launch` lists them),
      including the real prices, sizes, policies, warranty, lead time and contact details.
- [ ] `"draft": false`.
- [ ] `site_url` is the real domain; `SITE_URL` var matches.
- [ ] Turnstile site key and secret for the real domain.
- [ ] D1 created, id in `wrangler.jsonc`, migration applied with `--remote`.
- [ ] R2 bucket created.
- [ ] `SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` set; webhook endpoint added.
- [ ] Email Service binding or `RESEND_API_KEY`; `FROM_EMAIL` and `NOTIFY_EMAIL` set; a test
      request received by the business and the customer.
- [ ] A live test deposit made and refunded; the "Reserved" message and both emails seen.
- [ ] `npm run og` re-run if the business name changed, then `npm run build:production`.
- [ ] Photographs added to `gallery` if any.
- [ ] Privacy text from the owner.
