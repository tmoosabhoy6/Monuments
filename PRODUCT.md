# Product

Written from the owner's "Website Plan & Developer Email" (2026-11-27), CLAUDE.md and PROGRESS.md.
Nothing here was confirmed in an interview; facts the owner has not supplied are marked open.

## Platform

web

## Stack

Vanilla HTML, CSS and JavaScript, built by `scripts/build.js` (Node built-ins only) and served by
Cloudflare Workers. No frameworks and no npm code in the browser.

## Users

People choosing an entrance sign for a place they are responsible for: homeowner-association
boards, church and school administrators, property managers, business owners. They compare a few
sign companies at a desk or on a phone, often on behalf of a committee, and are not sign experts.

## Product Purpose

Show that this shop makes monument signs and nothing else, show finished signs, explain a
five-step process in which nothing is final until the proof is approved, show prices, and get the
visitor to send a few words about their sign.

## Positioning

Monument signs only. Most sign shops make every kind of sign and monuments are a small part of
their work ("less than 2%", unsourced, a config value). Design and revisions are free.

## Operating Context

Routed HDU monument signs, single- or double-sided; upgrades are faux stone, metal or acrylic
letters, an illuminated face and an LED screen. Four to five weeks for production and delivery
after proof approval. Optional installation nationwide. Open: business name and contact details,
deposit amount, most prices, the right to publish the photographs (taken from impactsigns.com).

## Capabilities and Constraints

- 60fps scrolling is measured (`npm run check:scroll`); no scroll, wheel or touchmove listeners.
- No unconfirmed facts in copy; unknowns live in `content/site.config.json` and block the launch build.
- Monument signs only in imagery: no plaques, lobby signs or letters on buildings.

## Brand Commitments

- Sign green `#1F4A3A` with gold `#B8922E` (owner's choice).
- Light colors; nothing dark or heavy on the eyes (owner's brief).
- Lots of photographs, starting on the home page.
