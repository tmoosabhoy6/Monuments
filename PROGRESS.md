# Progress

The record of state for the build. Pick up from this file and the git history.

## Steps (SPEC §14)

- [x] 1. Set up: repository layout, CLAUDE.md, PROGRESS.md, fonts, package.json, wrangler.jsonc
- [ ] 2. Static pages: tokens, base styles, every section with final copy, build script
- [ ] 3. Drawing: glyph-width table, draw.js, pre-rendered hero, size lineup, stage 4 drawings
- [ ] 4. Builder: state, pricing, interface, title block, sharing, print sheet, tests
- [ ] 5. Forms and Worker: endpoints, D1, R2, email, Turnstile, Stripe Checkout, webhook, invoices
- [ ] 6. Critique and polish; accessibility; performance; search and sharing assets
- [ ] 7. All checks, README, report

## Definition of done (SPEC §12)

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run test:browser`
- [ ] `npm run check:rules`
- [ ] `npm run check:size`
- [ ] `npm run check:scroll`
- [ ] Lighthouse (mobile, against `wrangler dev`)
- [ ] Visual review (screenshots in `design/review/`)
- [ ] Copy review
- [ ] `npm run build:production` fails naming draft and each unconfirmed value

## Decisions made

- **Several pages instead of one (owner instruction).** The person commissioning the build asked
  for a multi-page site, overriding "single page" in SPEC §2. Pages: `/` (hero and builder,
  standard sizes, signs we have built), `/how-it-works/` (the six stages, policies, quote form at
  `#quote`), `/questions/`, `/more-from-our-shop/`. Sizes stay on the home page because "Start
  with this size" opens the builder in place and the home page then carries the two strongest
  trust signals together (your name on a sign, a published price). Section ids are unchanged, so
  every link in the spec still has one target.
- Stripe API version pinned to `2026-11-18.endive` (current on Stripe's versioning page on
  2026-11-23).
- Cloudflare docs checked 2026-11-23: the `assets` settings in SPEC §10.3 are current. Added a
  `ratelimits` binding (`RATE_LIMITER`) because SPEC §9.2 asks for rate limiting and Workers do
  it through that binding. Email uses the `send_email` binding's `env.EMAIL.send({ to, from,
  subject, text, html })` form (Cloudflare Email Service), with Resend as the fallback driver.

## Declined suggestions

(none yet)

## Not verified

(none yet)
