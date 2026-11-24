# Progress

The record of state for the build. Pick up from this file and the git history.

## Steps (SPEC §14)

- [x] 1. Set up: repository layout, CLAUDE.md, PROGRESS.md, fonts, package.json, wrangler.jsonc
- [x] 2. Static pages: tokens, base styles, every section with final copy, build script
- [x] 3. Drawing: glyph-width table, draw.js, pre-rendered hero, size lineup, stage 4 drawings
- [x] 4. Builder: state, pricing, interface, title block, sharing, print sheet, tests
- [x] 5. Forms and Worker: endpoints, D1, R2, email, Turnstile, Stripe Checkout, webhook, invoices
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

## Declined suggestions

(none yet)

## Not verified

(none yet)
