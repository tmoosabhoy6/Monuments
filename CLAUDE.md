# Monument sign website

Everything is specified in `SPEC.md`. Read it before changing anything. Progress, decisions and
declined suggestions are in `PROGRESS.md`.

## Precedence

The owner's hard constraints (below, SPEC §2) win over everything, then the confirmed business
facts (SPEC §3), then `SPEC.md`, then any skill or guideline. The owner's later instruction to
split the site into several pages overrides "single page" (see PROGRESS.md, Decisions), and their
2026-11-27 instruction to match the look of two reference monument-sign sites overrides SPEC §5's
visual rules (see PROGRESS.md, "Reference-site rebuild").

## Hard constraints

1. Brand colors: sign green `#1F4A3A` with gold `#B8922E` (the owner chose green and gold on 2026-11-27;
   it replaces "one accent"). Everything else neutral. Errors use ink and weight, never red.
2. No stock illustration style and no gradients anywhere. Imagery is the elevation drawing, owner-supplied
   photographs, or the clearly labelled 3D renders of our own signs made by `npm run photos` (stand-ins
   until the owner's photographs arrive).
3. Type does the heavy lifting; drawings support the words.
4. Vanilla HTML, CSS and JavaScript. No frameworks, no CSS framework, no bundler, no npm code in
   the browser. Native ES modules. The build script uses Node built-ins only.
5. 60fps scrolling: no scroll/wheel/touchmove listeners, no parallax, no backdrop-filter, no
   filters, no blurred shadows, no `background-attachment: fixed`, animate transform and opacity only.

Also: no financing, no competitor prices, no competitor trademarks, no unconfirmed facts,
no copy that is not in SPEC §7. Unknown facts are config values in `content/site.config.json`.

## Commands

- `npm run build`: build `dist/` from `src/` and `content/site.config.json`
- `npm run build:production`: launch gate; fails while `draft` is true or any value is unconfirmed
- `npm test`: unit tests (node:test)
- `npm run test:browser`: Playwright browser tests (pre-installed Chromium)
- `npm run check:rules`, `npm run check:size`, `npm run check:scroll`, `npm run check:lighthouse`
- `npm run screenshots`: review screenshots into `design/review/`
- `npm run glyphs`: re-measure the glyph-width table (only if a font file changes)
- `npm run og`: regenerate the Open Graph image
- `npm run photos [id…]`: re-render the sample sign photographs (three.js in headless Chromium, build-time
  only; nothing from npm reaches the browser)
- `npx wrangler dev`: run the site and the Worker locally.
- `npm run deploy` (static assets, intended) or `npm run deploy:bundled` (Worker serves pages; see README).
  Deploy only on the owner's instruction. A draft is live at https://monument-signs.tmoosabhoy6.workers.dev.

## Layout

`src/` pages, CSS, browser modules, fonts, static files. `worker/` the `/api/*` Worker.
`scripts/` build and checks. `tests/` unit and browser tests. `dist/` is generated.
The pure modules in `src/js/builder/` (state, pricing, draw, share) are shared by the browser,
the build script and the Worker. Keep them free of DOM, clock and randomness.
