# Progress

The record of state for the build. Pick up from this file and the git history.

## Steps (SPEC §14)

- [x] 1. Set up: repository layout, CLAUDE.md, PROGRESS.md, fonts, package.json, wrangler.jsonc
- [x] 2. Static pages: tokens, base styles, every section with final copy, build script
- [x] 3. Drawing: glyph-width table, draw.js, pre-rendered hero, size lineup, stage 4 drawings
- [x] 4. Builder: state, pricing, interface, title block, sharing, print sheet, tests
- [x] 5. Forms and Worker: endpoints, D1, R2, email, Turnstile, Stripe Checkout, webhook, invoices
- [x] 6. Critique and polish; accessibility; performance; search and sharing assets
- [x] 7. All checks, README, report

## Definition of done (SPEC §12)

Full output of the last run: `design/review/check-results.txt` (`./scripts/run-all-checks.sh`).

- [x] `npm run build`: exits 0, 5 pages, no unresolved tokens
- [x] `npm test`: 31 of 31 pass (pricing, sharing, drawing, pre-rendered hero, config, every endpoint, webhook signatures)
- [x] `npm run test:browser`: 13 of 13 pass
- [x] `npm run check:rules`: passes
- [x] `npm run check:size`: HTML 3.6–11.4 KB a page, CSS 5.9 KB, JS 21.5 KB, fonts 64.3 KB
- [x] `npm run check:scroll`: desktop 99.7–100% of frames within 16.7 ms; throttled phone worst frame 16.8 ms, no long tasks
- [x] Lighthouse (mobile, `wrangler dev`): performance 100, accessibility 100, best practices 100 on every page; SEO 100 with draft off (66 on the draft build, which is noindex by design); LCP 0.77–0.78 s, CLS 0, TBT ≤ 10 ms
- [x] Visual review: `design/review/` at 1440×900, 834×1112, 390×844, both hero states; hero and lineup compared with the comp
- [x] Copy review: `npm run check:copy`, 254 phrases word for word; 5 deliberate or conditional differences listed
- [x] `npm run build:production` fails, naming `draft` and 48 unconfirmed values (the correct result)
- [x] Extra: `npm run check:a11y` (touch targets, contrast, 200% zoom, headings, dialogs) passes

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

- Header rule on scroll uses the `--rule` hairline, not ink: it sits on every screen while
  scrolling, and an ink line there reads as a heavier structural break than the spec intends.
- Section rules sit inside the content width (as in the reference comp), not across the viewport.
- On pages other than home, the page's section heading is the `h1` (styled as an h2).
- Page titles and meta descriptions for the new pages are built from the spec's own headings and
  sentences ("How it works | Business Name"). The 404 page has one new line, "There is no page at
  this address.", because the spec has no copy for it.
- FAQ "How much does a monument sign cost?": "priced on this page" became "priced on this site",
  because the sizes and the questions are now on different pages.
- Footer links gain "More from our shop": the brief says that section is linked from the
  menu/footer, and as its own page it needs a link.
- "Policies" is shown as a small label before the six policy links in the footer.
- Optional quote-form fields carry "(optional)" like the dialog fields do, so the two forms
  read the same. Rough size has "Width" and "Height" labels; the date field is labelled by its
  radio, "By a date". Pillar caps sit under a visually hidden legend "Cap".
- Option rows show each choice's own price ("+$300"), not a difference from the current
  choice, so a row's figure does not change meaning when it is selected. Free choices show none.
- Price lines in the summary use the config's `line` labels ("Stone-look base", "Peaked top",
  "Pillars with peaked caps", "Cut metal letters", "Installation").
- Error summary grammar: "1 thing needs fixing before we can send this." for a single error.
- Messages the spec does not give: a network failure says "This did not go through. Try again,
  or call {{phone}}."; an empty invoice number says "Enter the invoice number."; too many or too
  large files repeat the help text "Up to five files, 25 MB each."; the honeypot's hidden label
  is "Leave this field empty".
- The hero has two pre-rendered drawings (with and without dimension lines) in a fixed aspect
  ratio. A container query shows the dimensioned one only when the drawing is at least 522px wide,
  which is where its figures reach 12px, so nothing shifts when the script loads and nothing
  changes size when an option changes. The dimension figure is a fixed fraction (2.3%) of the frame.
- The overall width dimension measures the sign structure (panel, or pillar to pillar, or post to
  post); the cap slab's 6 in overhang is trim and not included, as in the comp.
- Pillars are drawn stone-look with a stone-look base and plain with a plain base ("stone-look
  applies to the base and to any pillars together").
- The lineup and the option drawings use "Alder Creek" as sample wording, as the comp does.
- The anatomy section is drawn with its face toward the labels so each leader is a short
  horizontal line ending on the surface it names.
- Printing produces the design sheet on the home page only; other pages print as themselves.
  The sheet's options table uses the builder's own group names; a paint code prints as "Paint code".
- On phones in the builder state only the drawing is sticky; the name field and hero price are
  hidden there, since the wording group and the title block carry them.
- The Turnstile site key lives in the site config (`turnstile_site_key`, Cloudflare's always-pass
  test key while in draft), because the static pages need it at build time. It is therefore not a
  Worker var.
- `orders` has a `phone` column in addition to the columns SPEC §9.5 lists, because the reserve
  dialog asks for a phone number and it should not be thrown away.
- Checkout's `cancel_url` carries the design (`?cancelled=1&d=…#design`) so the design is intact
  even in a browser that blocks storage.
- A filled honeypot gets an ordinary-looking reference back and nothing is stored or sent.
- Uploads are stored as `uploads/{request id}/{n}-{uuid}-{sanitized name}`; the request id is
  minted with the upload token, so `/api/requests` only accepts keys under its own id.
- `wrangler.jsonc` carries a placeholder `database_id`; the owner replaces it with the id from
  `wrangler d1 create monument-signs` (README). Local development does not need a real one.
- `.dev.vars` holds Cloudflare's published always-pass Turnstile test secret and a local signing
  secret; `.dev.vars.example` is the committed template.

- The build empties `dist/` in place instead of deleting it: deleting it left a running
  `wrangler dev` serving 404s for the new hashed files (found by the Impeccable detector).
- Validation after the first submit checks only the field that lost focus and clears a field's
  error while it is being corrected, so nothing above the submit button moves when it is pressed
  (the browser tests found clicks being lost to that shift).
- The hero's 200ms cross-fade runs only after the visitor switches states; it had also run on
  first load, fading the lede in from transparent.
- When a dialog's opener has been hidden (deposits switched off), focus goes to "Request approval
  drawing", the action that replaced it.
- Standalone links get a 44px hit area on phones (wordmark, phone, "Start with this size", stage 1
  links, footer links); their text does not move.
- Questions page: the group rule was removed, because it doubled the first question's hairline;
  space separates the groups (the "remove one thing" of the frontend-design critique).
- Tablet (820–1180px): the header links no longer wrap (that rule applies from 820px up; on
  narrow phones the wordmark may wrap so 320px never scrolls sideways), and in the builder state the name field
  and price stack under the drawing instead of squeezing.
- Accepted from the Vercel guidelines: scroll padding so the sticky header and the bottom bar
  never cover a focused field; `spellcheck="false"` on email, ZIP and invoice fields;
  `overscroll-behavior: contain` on dialogs; `touch-action: manipulation`; `translate="no"` on the
  business name; long emails wrap in messages.
- Cast-shadow colours are computed in `draw.js` with the same oklab arithmetic as
  `color-mix(in oklab, <field> 78%, black)` and written into the SVG as hex. Inline `style` is
  barred by the CSP, and a hex value prints and screenshots identically everywhere. The default
  green gives `#133227` (the comp's tone is `#143326`; the unit test allows ±3 per channel).
- The text alternative of the drawing names a double-sided sign. An elevation cannot show the
  second face, so "double-sided" changes the drawing's description and the price, not its lines.

## Deployment (2026-11-24, on the owner's instruction)

- Live draft at https://monument-signs.tmoosabhoy6.workers.dev (Worker version
  3b48b20d-8839-452d-910e-fbac363bf371). Created on the account: D1 `monument-signs`
  (5aa201f1-f697-4846-80c1-4ce98f007a98, schema applied), Turnstile widget `0x4AAAAAAGQB5zK1fPEN2ZBo`
  (hostname, localhost, 127.0.0.1), secrets `TURNSTILE_SECRET_KEY` and `SIGNING_SECRET`.
- Deployed with `wrangler.bundled.jsonc` (the Worker serves the pages), because the static-asset
  upload authenticates with a short-lived token that the session's credential proxy replaces;
  both wrangler and the Cloudflare API connector got 401 on `/workers/assets/upload`. Every other
  call worked. `npm run deploy` from an ordinary machine moves it to the intended static-asset setup.
- R2 is not enabled on the account (API error 10042), so the `r2_buckets` binding is commented
  out. The quote and drawing forms now send the request without its files when uploads are
  unavailable and say which file did not upload (SPEC §9.1's message), instead of failing whole.
- `site_url` is the workers.dev address and `turnstile_site_key` the real widget key, both still
  marked unconfirmed until the owner's domain is decided.
- Live checks: every page 200, `/how-it-works` 307 to the slash, unknown paths 404, CSP and the
  other headers present, `/assets/*` immutable, draft notice and `noindex` present, unconfigured
  endpoints answer 503, `/api/requests` without a Turnstile token answers 403. A headless browser's
  quote request was refused by Turnstile (managed mode), which is the intended protection; the
  stored secret was confirmed valid against Siteverify.

- Prototype (owner, 2026-11-24): "just need the prototype". Deposits, invoice payment, emailing a
  design and file uploads are switched off in `features` and built hidden, so everything on the
  live draft works: the builder, sharing link and print sheet, and quote and drawing requests
  saved to D1. Redeployed as version 19b98b69-69d2-4ce6-bc11-6f495c38135f. Stage 3's paragraph
  still mentions reserving from the builder; it is SPEC copy and returns to being true when
  deposits are switched on.

## Skills used (SPEC §13)

- frontend-design (Anthropic): used for the build; its planning step skipped because SPEC §5–6
  are the approved plan; its critique step run (screenshots, self-review, one thing removed).
- Impeccable, commit `b49177d32788f2dc585c42831d845dacf1ebed2c` (skill 4.10.0, engine 0.1.27),
  copied without hooks into `.claude/skills/` (git-ignored). Detector run on `dist/*.html` and on
  the `wrangler dev` URLs. Telemetry off.
- web-design-guidelines (Vercel, guidelines snapshot `434b7f9`): interface audit of the HTML, CSS
  and JavaScript.
- review-animations and animation-performance (emilkowalski/skills): asked whether the hero
  animation and the four interface transitions meet the duration, easing, origin, reduced-motion
  and compositor rules, and whether any fires on first load.
- design:accessibility-review and design:design-critique: final measured accessibility pass
  (`scripts/a11y-audit.js`) and the hierarchy check.
- Cloudflare docs (MCP) for the assets, rate-limit and Email Service settings.

## Declined suggestions

- Impeccable, file-mode detector: 33 "cramped padding" and "oversized h1" findings. A file scan
  cannot load the root-absolute `/assets/` stylesheet, so it judged unstyled markup; the same
  pages scanned live raise none of these.
- Impeccable, live: "first-viewport column overflow" on How it works (stage 1 holds the quote
  form beside a short name column). That is the spec's structure (§6.4); a sticky column or a
  moved form would change it.
- Vercel guidelines: Title Case headings and buttons, numerals for counts ("Four standard
  sizes"), avoiding first person, placeholders ending in "…", a spinner while sending, preconnect
  for Turnstile, `Intl.NumberFormat` for money (output identical; the pure modules stay simple),
  an intentional tap-highlight colour, and a `beforeunload` guard. Each conflicts with SPEC §5.3,
  §7 or §10.5, or adds an element or behaviour the spec does not have.
- review-animations: "pure-fade entrances need an initial transform" and "reduced motion should
  be gentler, not zero" for the 200ms cross-fade and the hero. SPEC §5.7 specifies a cross-fade
  and the finished state immediately under reduced motion.
- animation-performance: SVG `transform` animations repaint rather than composite. Kept: they
  run once per load for under a second and the scroll and Lighthouse checks show no long task.

## Not verified

- A live Stripe payment, the webhook from Stripe, the return message from a real Checkout
  session and the hosted-invoice lookup: no Stripe account or keys were provided. The code paths
  are covered by unit tests against a stubbed Stripe API and by browser tests against a stubbed
  Worker; the not-configured path was run for real on `wrangler dev`.
- Real email delivery (Cloudflare Email Service or Resend): no sending domain or key. Emails are
  rendered and checked in unit tests; on `wrangler dev` without a binding the request still saves.
- The production Turnstile widget with the owner's site key: tested with Cloudflare's published
  always-pass test keys (real Siteverify call on `wrangler dev`) and with a stub in browser tests.
- Deployment to Cloudflare: not done, by instruction.
- Safari and Firefox: all automated runs use Chromium; the CSS uses features both support
  (`:has()`, container queries, `@layer`, `color-mix` is not used at runtime), but nothing was
  run in them.
- Screen readers (VoiceOver, NVDA): structure checked with Lighthouse/axe, the accessibility
  tree of the dialogs, and keyboard-only tests, but not with a screen reader.
- check:scroll on a real mid-range phone: measured with phone emulation and 4× CPU throttling in
  headless Chromium. Headless Chromium does not scroll the page for synthesized touch gestures,
  so the phone run uses the default gesture source.
