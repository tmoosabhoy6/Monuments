---
colors:
  sign-green: "#1F4A3A"
  leaf-green: "#2C6B53"
  night-green: "#0D2219"
  gold: "#B8922E"
  gold-light: "#E2C273"
  gold-ink: "#775B12"
  gold-deep: "#A6832A"
  gold-disc: "#F6EBCB"
  champagne: "#FBF2D8"
  warm-white: "#FFFCF4"
  mint: "#EEF6EF"
  leaf-tint: "#DCEBDD"
  sky: "#DCEEF6"
  ink: "#12241C"
  ink-soft: "#485A51"
  rule: "#DDE5DE"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Besley"
    fontWeight: 740
    fontSize: "clamp(2.75rem, 6vw, 5.25rem)"
    lineHeight: 0.98
    letterSpacing: "-0.038em"
  heading:
    fontFamily: "Besley"
    fontWeight: 700
    fontSize: "clamp(2.125rem, 4.2vw, 3.625rem)"
    lineHeight: 1.04
    letterSpacing: "-0.028em"
  body:
    fontFamily: "Libre Franklin"
    fontWeight: 400
    fontSize: "1.0625rem"
    lineHeight: 1.65
rounded:
  control: "12px"
  card: "22px"
  panel: "34px"
  pill: "999px"
spacing:
  section: "clamp(76px, 10vw, 152px)"
  gap: "clamp(32px, 5vw, 84px)"
  gutter: "clamp(18px, 4vw, 56px)"
---

# Design System: Monument sign website

## Overview

Golden hour at the entrance. Sunlit photographs of finished signs, soft depth, and gold lettering
on warm white. It replaces a flat white-and-sage look the owner found boring, and it refuses both
the sign-shop template (stock hero, blocks of blue) and the minimal serif page.

## Colors

### Primary
Sign green is ink, headings, the current-page pill and secondary actions. It is never a full-bleed ground.

### Secondary
Gold is always a flat colour, never a metallic gradient or a glow (owner, 2026-11-28). Solid `gold`
fills the primary action (hover `gold-deep`), rules, tiles and the step marks; `gold-ink` sets
numerals and icons; icons sit on a pale `gold-disc` circle.

### Neutral
Grounds are white lit by champagne and leaf-tint radial light (`.section-mist`, `.section-sage`, the
hero). Text is `ink` or `ink-soft`; secondary text is tinted green, never grey.

### Named Rules
- **Nothing dark.** No dark sections or footers; the owner asked for light colors.
- **Flat gold.** No gold gradients, shines or coloured glows; depth comes from the neutral shadows.

## Typography

Besley, a Clarendon, set heavy and tight like routed park-sign lettering, in sentence case.
Libre Franklin for text and controls. Numerals in prices and steps are Besley.

## Layout

Content width 1320px. Sections alternate lit grounds. Photographs lead: a deck of prints in the
home hero, strips, a mosaic, three prints beside each inner-page title.

## Elevation & Depth

Three shadows, tinted green, each an offset with a soft blur: `--shadow-s` (resting cards and
chips), `--shadow-m` (photographs, panels), `--shadow-l` (the deck, hover, dialogs). Shadows are never gold. Phones use tighter blurs.

## Shapes

Pills for every control. Cards 22px, panels 34px. Photographs are rounded prints or sit under an
arched top, the shape of a sign face, on a gilded base line.

## Components

- **Buttons:** pills; solid gold is primary, green is secondary, white with a green ring is tertiary. Hover lifts and deepens the colour.
- **Photo deck:** stacked prints with white borders; the top one is dealt to the back.
- **Scene:** sky over lawn with a sun; holds the illustrated signs (`scripts/lib/sign-art.js`).
- **Size picker:** a scene showing one size to scale beside a six-foot figure; cards carry every price.
- **Steps:** white cards with gold numerals, joined by arrows on pale gold discs.
- **Motion:** headline lines rise from masks; blocks arrive with a spring; hover lifts; no scroll listeners; all still under reduced motion.
