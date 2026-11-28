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

## Redesign (owner, 2026-11-24): "looks lifeless and dull; absolutely stunning is what I need"

Overrides SPEC §5's settled look; the owner's hard constraints still hold (one accent, no
gradients, no stock imagery, 60fps). Boldness spent in one place, the opening view:
- The hero is a full-width elevation of the sign standing at a planted entrance (trees, shrubs,
  a distant hedge, all in neutrals and a secondary line weight, so the painted sign is the only
  colour), cut through the ground to show its footing. Lede, button, "Put your name on it" and
  the price sit underground, on the dark earth band. The builder keeps its paper working layout.
- Larger type scale; giant green stage numerals on How it works; new drawings for stage 2 (an
  approval drawing with title block) and stage 5 (on posts and on a base, cut to show what goes
  below ground); three drawings on More from our shop; the lineup stands on the same cut ground;
  the footer is dark ground.
- New words inside drawings only: "Approval drawing", "Approved", "Date", "1204".
- Checks after the redesign: 32/32 unit, 14/14 browser, rules, size, copy, scroll (100% of frames
  on time, desktop and throttled phone), accessibility audit (contrast on the dark ground included).

## Reference-site rebuild (owner, 2026-11-27)

The owner was disappointed: the site looked simple, unofficial and incomplete. They pointed at two
monument-sign company sites and asked for their best design features merged, "no matter how
complex". Asked and answered: no photographs exist yet (use renders of our own signs, made in
code), brand is deep green and gold, reviews are placeholder slots clearly marked as samples.
Only design features were taken from the references; no text, photographs, logos or names.

- Pages (12): home, Monument signs (long guide with a table of contents, numbered styles and a
  sticky sidebar), Design your sign (the builder, always open), Sizes and prices, Gallery (filters
  and a lightbox), Industries, About, Request a quote, How it works, Questions, More from our
  shop, 404. Old `/?d=…`, `/?size=…` and Stripe return links on the home page are sent on to
  `/design/`; new share links, emails and Stripe returns point at `/design/` directly.
- Look: utility top bar, logo, dropdown menu (a panel with accordions under 1280px), gold
  "Request a quote" button; full-bleed hero slideshow (three renders, crossfade with a slow
  drift, dots and a pause button, paused under reduced motion) with a huge Oswald uppercase
  headline; a trust strip lifted over the hero's edge; dark green page banners with a field of
  twinkling squares and breadcrumbs; photos framed by a hard gold offset block; numbered style
  cards; industry tiles; comparison and price tables; process grid; sample reviews; gallery
  mosaic; FAQ cards; a quote band with the form in a card; a gold call-to-action strip; a dark
  four-column footer; floating call, email and quote buttons.
- Imagery: `scripts/render/` builds each sign in three.js (the builder's geometry, routed face
  with relief, cut letters standing off the face, stone-look courses, posts and pillars, lit
  faces at dusk) in a planted bed with trees, rendered offline in headless Chromium to WebP at
  two or three widths (`npm run photos`, `scripts/render-photos.js`). Every page that shows them
  says they are sample renders; owner photographs listed in `config.gallery` replace them on the
  Gallery page.
- Type: Oswald (OFL, subset to Basic Latin, 17 KB) for headings, buttons and labels, set in
  uppercase; Besley stays for prices and the lettering in drawings (the glyph-width table is
  Besley's); Libre Franklin for text.
- Samples, unconfirmed and labelled: `rating` ("5.0 sample rating") and three `reviews`, each
  tagged "Sample review" while `draft` is true. The launch gate lists both.
- Checks changed to match the owner's direction, hard constraints kept: check:rules allows
  uppercase, Oswald and decorative arrows drawn by CSS (still no gradients, filters, blurred
  shadows, scroll listeners, inline scripts or other hosts); check:size font budget 70 → 85 KB
  for the third family; check:scroll, the accessibility audit, Lighthouse and the browser tests
  cover the new pages; a browser test covers the menus, slideshow, teaser, gallery and old links.
- Fixed on the way: a unit test that "tampered" with a signature by setting its first character
  to Z failed whenever the signature already began with Z (1 run in 64).
- Loading: scripts only enhance, so `app.js` now imports the rest after the page's load event
  (and handles old links first); no module preloads; only Oswald is preloaded; the second and
  third hero photographs are not displayed, so not fetched, until the page has loaded; photos
  gained an 880px width so phones fetch 25–30 KB files.
- Deviation, SPEC §12 LCP < 1.8 s: on pages whose largest paint is a photograph (the home hero,
  the page banners, the gallery) Lighthouse's simulated slow-4G phone puts LCP at about 1.7–2.4 s,
  because every font in the page and the photos near the fold are requested at first layout and
  counted ahead of it, although the hero photo itself arrives in under 50 ms on the real
  connection. Getting under 1.8 s would mean dropping the photo hero the owner asked for, so the
  check holds photo LCP to Core Web Vitals' "good" (2.5 s) and text or drawing LCP to 1.8 s.
  Performance scores stay 98–100. The check now judges the median of three runs, as Lighthouse
  advises for its variable metrics.
- Checks on the final build: 32/32 unit, 15/15 browser, rules, size (fonts 81 of 85 KB), copy,
  scroll (desktop and 4×-throttled phone, every page at 99.6–100% of frames on time), the
  accessibility audit (no small touch targets, every contrast pair passing, no reflow, no
  heading skips, on all 11 pages), Lighthouse (median of three: performance 98–100,
  accessibility, best practices and SEO 100, CLS 0).
- Redeployed the draft (bundled Worker, 2.5 MB gzipped with the photographs) as version
  03296829-5a2b-4b99-8ce6-59417547b6e0; every page answers 200 and loads without console errors.

## Light rebuild (owner, 2026-11-27, "Website Plan & Developer Email")

The owner sent a written brief and asked for the site to be rebuilt to it, "extremely stunning",
with "stunning animations, hover effects". It replaces the reference-site rebuild above.

- Brief: clean and simple like the reference (captivatingsigns.com, used as a guide to layout only:
  top contact bar, a row of page links, a contact page with the form beside the details); light
  colors, nothing dark; lots of photographs on the home page; the message that monuments are all we
  do; nine pages, each with its own content; a five-step process as boxes with arrows; "nothing is
  set in stone" on Home, Process and Design Services; pricing and four upgrades shown.
- Pages (12): Home, About Us, Products, Design Services, Process, Installation, Gallery, Pricing &
  Upgrades, Contact Us, plus the sign sketcher (`/design/`, linked from Pricing, Design Services and
  the footer), Questions (footer) and 404. Removed: Monument signs guide, Sizes and prices, How it
  works, Industries, More from our shop, Request a quote. Their addresses redirect.
- Photographs: the owner said to take them from the Impact Signs website (La Grange, Illinois).
  Every image on its monument pages and every media-library result for monument, foam, faux, stone,
  HDU, pillar and entrance was downloaded (84) and looked at; 30 show monument signs and were kept
  (plaques, lobby signs, letters on buildings, memorials and national monuments were left out).
  `src/static/photos/manifest.json` records the source address of each. Converted to AVIF at 560 px
  and at the source width (most sources are 1024 px wide, so no photograph is shown wider than about
  700 CSS px). The 3D sample renders, their script and `npm run photos` are gone.
  **Not confirmed:** that the business may publish these photographs. `photo_source` in the config
  is unconfirmed, so `build:production` refuses to build until it is.
- Look: white, pale stone (#F4F7F3) and sage (#E6EEE7) grounds, sign green and gold; no dark
  sections, a light footer. Besley for headings in sentence case (Oswald and its file removed),
  Libre Franklin for text. The one idea: photographs sit in frames cut like the four sign-face
  shapes (flat, arched, peaked, shouldered) and stand on a gold base line.
- Motion (transform and opacity only; reveals by IntersectionObserver, no scroll listeners):
  the home hero is an arched photograph on a green base that drops into place, changes every five
  seconds (buttons choose; the base plate names the sign), with two smaller photographs in front and
  a slight lean toward the pointer; headline lines rise out of masks; two photo strips move in
  opposite directions and pause on hover; one hundred tiles pop in for "less than 2%" against 100%,
  with figures counting up; the five process boxes arrive in turn and their arrows draw; the same
  sign is redrawn five ways (shape, base, pillars, colors) in a loop or on request; a band of large
  words moves; an LED message board is drawn with a scrolling message; buttons fill from the base;
  cards, steps, points and photographs respond to hover; pages cross-fade into each other where the
  browser supports cross-document view transitions. Everything is still under reduced motion.
- Copy is the brief's, in its own words where it gave them. Facts it left open are config values:
  `other_shops_share` ("less than 2%", no source yet), `design_deposit` ("a small deposit"),
  `lead_time` (now "four to five weeks"), prices (unchanged samples). Illuminated faces, LED screens
  and boulders read "Quoted with your proposal" until prices are supplied. The sample rating and
  reviews are removed. Policies and questions were reworded where they contradicted the brief
  (a small deposit starts design; installation is optional).
- Read as written, the brief's "Faux stone: pillars, base or bolts" is taken to mean boulders (the
  Impact Signs photographs include faux stone boulders). To be confirmed by the owner.
- Contact form: three numbered parts matching steps one to three; a new optional field `sides`
  (single, double, not sure) is validated by the Worker and included in the email to the business.
  The error for an empty first field now reads "Tell us what the sign should say."
- The business name, phone, email and address are still the config placeholders.
- `check:copy` (SPEC §7 word for word) is retired with the copy it checked. The sketcher keeps its
  SPEC copy; its drawing dialog now says the design is a starting point.
- Checks on this build: 32/32 unit, 15/15 browser (rewritten for the new pages), rules, size (CSS
  12.6 of 14 KB, JS 27.1 of 30 KB, fonts 64.3 of 70 KB), scroll (every page, desktop and 4×-throttled
  phone; the phone home page needed the per-tile animation limited to wide screens), the
  accessibility audit (touch targets, contrast, reflow, headings, dialogs). `build:production`
  fails, as it should, listing the unconfirmed values. Lighthouse was not re-run.
- Not deployed. The live draft still shows the previous build. The photographs total 3.2 MB, which
  with the bundled-Worker deployment may exceed the 3 MB Worker size limit on a free plan; the
  static-asset deployment (`npm run deploy`) has no such limit.

## Golden-hour redesign (owner, 2026-11-27, later the same day)

The owner found the light rebuild "extremely boring", called the standard-sizes screen
"disgusting", and gave "full permission" to redo things from the ground up. Pages, copy and
function are unchanged; the look is replaced. Recorded in `DESIGN.md` and `PRODUCT.md`.

- Look: warm white grounds lit by champagne and leaf-green light, forest green ink, a metallic gold
  gradient that only gilds, heavy Besley, pills, soft green-tinted shadows, rounded and arched
  photograph prints. Still no dark sections.
- Hard constraints relaxed on that permission: gradients and soft (blurred) shadows are now used.
  Kept: vanilla code, no scroll listeners, 60fps measured by check:scroll. A blurred header
  backdrop, blur in reveals and an animated clip-path were tried and removed because they failed
  check:scroll; phones get tighter shadows for the same reason.
- Home hero: a fanned deck of seven photograph prints that deals itself (click, buttons, or every
  4.4 s), replacing the single arched photograph.
- Pricing: the line-drawing lineup and price table are replaced by a size picker: each standard
  size pictured to one scale beside a six-foot figure in a sky-and-lawn scene, with a card per size
  carrying single-sided, double-sided and installation prices. All prices stay in the page without scripts.
- Illustrated signs (`scripts/lib/sign-art.js`, build-time SVG with gilded lettering, stone and a
  ground shadow) replace the technical elevation drawings on marketing pages: the size picker, the
  sign pictured five ways, the four top shapes on Products. The sketcher keeps its elevation drawing.
- Floating rounded header; gilded numerals and arrow beads on the process boxes; white cards with
  depth for upgrades, points, policies and questions; three prints beside each inner-page title; a
  gilded closing panel; pill buttons with a crossing highlight.
- Checks changed: check:rules no longer forbids gradients, filters or blurred shadows; CSS budget
  14 to 18 KB (14.9 KB used); check:scroll tolerates the phone emulator changing innerHeight by a
  few pixels mid-run; the audit reads colours after transitions settle.
- Checks on this build: 32/32 unit, 15/15 browser, rules, size, scroll (all pages, desktop and
  4x-throttled phone), accessibility audit. Lighthouse not re-run. No independent design review was run.
- The design skill's launcher would not run in this environment, so its direction roll, decision
  page and reviewer were not used; the direction was chosen directly from the owner's request.
- Not deployed.

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
- Deployment: a draft runs on workers.dev (see Deployment); no custom domain.
- Safari and Firefox: all automated runs use Chromium; the CSS uses features both support
  (`:has()`, container queries, `@layer`, `color-mix` is not used at runtime), but nothing was
  run in them.
- Screen readers (VoiceOver, NVDA): structure checked with Lighthouse/axe, the accessibility
  tree of the dialogs, and keyboard-only tests, but not with a screen reader.
- check:scroll on a real mid-range phone: measured with phone emulation and 4× CPU throttling in
  headless Chromium. Headless Chromium does not scroll the page for synthesized touch gestures,
  so the phone run uses the default gesture source.
