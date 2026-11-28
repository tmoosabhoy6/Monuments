# Monument sign website

Everything is specified in `SPEC.md`. Read it before changing anything. Progress, decisions and
declined suggestions are in `PROGRESS.md`.

## Precedence

The owner's hard constraints (below, SPEC §2) win over everything, then the confirmed business
facts (SPEC §3), then `SPEC.md`, then any skill or guideline. The owner's later instruction to
split the site into several pages overrides "single page" (see PROGRESS.md, Decisions). Their
2026-11-27 brief ("Website Plan & Developer Email", see PROGRESS.md, "Light rebuild") is the latest
word on pages, copy and look: it overrides SPEC §5 (visual rules), §6 (page list) and §7 (copy) for
every page except the sign sketcher at `/design/`, which still follows SPEC §6 to §9.

## Hard constraints

1. Brand colors: sign green `#1F4A3A` with gold `#B8922E` (the owner chose green and gold on 2026-11-27;
   it replaces "one accent"). Everything else neutral. Errors use ink and weight, never red.
2. No stock illustration style. Imagery is the photographs, the illustrated signs made by
   `scripts/lib/sign-art.js`, and the elevation drawing in the sketcher. Photographs are those in `src/static/photos/` (taken from impactsigns.com on the owner's instruction; the right
   to publish them is an unconfirmed config value, `photo_source`, which blocks the production build).
   Monument signs only: no plaques, lobby signs or letters on buildings.
3. Type does the heavy lifting; drawings support the words.
4. Vanilla HTML, CSS and JavaScript. No frameworks, no CSS framework, no bundler, no npm code in
   the browser. Native ES modules. The build script uses Node built-ins only.
5. 60fps scrolling, measured by `npm run check:scroll`: no scroll/wheel/touchmove listeners, no
   parallax, no `background-attachment: fixed`, no `transition: all`. Gradients and soft shadows are
   part of the look since the owner's 2026-11-27 "full permission" redesign (see DESIGN.md); blur and
   backdrop-filter are kept off anything that is on screen while the page scrolls.

Also: no financing, no competitor prices, no competitor trademarks, no unconfirmed facts. Copy on the
marketing pages comes from the owner's 2026-11-27 brief; do not add claims it does not make (no years
in business, team, location or counts). Unknown facts are config values in `content/site.config.json`.
Light colors only: no dark sections. Besley for headings, Libre Franklin for text, sentence case.
The visual system is recorded in `DESIGN.md`; product facts in `PRODUCT.md`.

## Commands

- `npm run build`: build `dist/` from `src/` and `content/site.config.json`
- `npm run build:production`: launch gate; fails while `draft` is true or any value is unconfirmed
- `npm test`: unit tests (node:test)
- `npm run test:browser`: Playwright browser tests (pre-installed Chromium)
- `npm run check:rules`, `npm run check:size`, `npm run check:scroll`, `npm run check:a11y`, `npm run check:lighthouse`
- `npm run screenshots`: review screenshots into `design/review/`
- `npm run glyphs`: re-measure the glyph-width table (only if a font file changes)
- `npm run og`: regenerate the Open Graph image
- `npx wrangler dev`: run the site and the Worker locally.
- `npm run deploy` (static assets, intended) or `npm run deploy:bundled` (Worker serves pages; see README).
  Deploy only on the owner's instruction. A draft is live at https://monument-signs.tmoosabhoy6.workers.dev.

## Layout

`src/` pages, CSS, browser modules, fonts, static files. `worker/` the `/api/*` Worker.
`scripts/` build and checks. `tests/` unit and browser tests. `dist/` is generated.
The pure modules in `src/js/builder/` (state, pricing, draw, share) are shared by the browser,
the build script and the Worker. Keep them free of DOM, clock and randomness.
