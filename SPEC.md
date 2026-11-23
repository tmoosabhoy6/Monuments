# Monument sign website: build specification

This document is the complete plan for one website. The design decisions, the page structure, the words on the page and the technical approach have already been made and are written down here. Your job is to build exactly this, well.

Read the whole document before writing code. Sections 1 to 4 are context, 5 to 11 are the specification, 12 is the definition of done, 13 and 14 are how to work, and 15 lists what the owner still has to supply.

**Precedence when sources disagree:** the owner's hard constraints (section 2) win over everything. Then the confirmed business facts (section 3). Then this specification. Then any skill, plugin or guideline you load. A skill that suggests a different palette, typeface, layout, motion style or stack does not apply here, because those choices are already made.

**If something is not specified:** make the smallest decision consistent with the design direction in section 5, and record it in `PROGRESS.md` under "Decisions made". Do not add sections, features, claims or dependencies that are not in this document.

---

## 1. The job

Build a single-page marketing and ordering website for a US business that makes monument signs and nothing else. A visitor can see standard sizes with prices, design their own sign in an online builder that draws it live and prices it instantly, request a custom quote, pay a deposit online, and later pay an invoice online. The site is hosted on Cloudflare.

The site has to look like it was made by people who care about craft and can be trusted with several thousand dollars and a permanent fixture at the entrance to someone's property. Clean, calm, precise and specific to this trade. Never loud, never decorative, never templated.

## 2. Hard constraints

These came from the owner. Each has a reason, so you can apply it sensibly at the edges.

| Constraint | Reason and how to apply it |
|---|---|
| One accent color maximum | The accent is sign green (section 5.2). Everything else is neutral. Paint swatches inside the builder are product data, not interface color, so they are exempt; keep the interface around them neutral. Validation errors use ink and weight, not red. |
| No stock illustration style, no gradient blobs | Imagery is either a precise elevation drawing of a sign (section 5.5) or a real photograph supplied by the owner. No gradients anywhere on the site, no blurred shadows, no people illustrations, no icon sets, no AI-generated or stock images. |
| Type does the heavy lifting, imagery is secondary | The headline is set on the sign itself. Sections are carried by headings, measure and spacing. Drawings support the words. |
| Vanilla HTML, CSS and JavaScript; no frameworks; single page | One `index.html`. No React, Vue, Svelte, Tailwind, jQuery, GSAP, animation or smooth-scroll libraries, no CSS framework, no bundler. Native ES modules. A small Node build script with no dependencies is allowed (section 10.2) because its output is plain static files. The Cloudflare Worker for `/api/*` is plain JavaScript modules. |
| 60fps scroll performance is non-negotiable | See section 10.5. In short: no scroll event listeners, no parallax, no `backdrop-filter`, no SVG filters, no animated blur, no layout-triggering animation, no `background-attachment: fixed`. Scrolling must stay smooth on a mid-range phone. |

Content rules from the project brief, equally binding:

- The business makes monument signs only. Specialization is the core message.
- Service area is nationwide. Say so. Permanent installation anywhere in the US through a network of certified installers. No city, state or location content of any kind.
- Never mention financing.
- Never use or imply a competitor's price. Explaining what our own price covers is fine.
- No harsh terms. Policies are clear and fair.
- All copy is original and is supplied in section 7. Do not rewrite it, and do not add marketing copy of your own.
- Never use these names, which are other companies' trademarks: Poly-Armor, Foamcore, Peachtree Promise, Hammer Test, SAFEGUARD-COATING, Royal Treatment.
- Illuminated signs are offered but kept quiet: one short paragraph and one collapsed builder option, nowhere else.
- State no fact the owner has not confirmed: no founding year, no count of signs built, no wind rating, no lifespan in years, no reviews, no testimonials, no association memberships. Where a fact is needed and unknown, it is a config token (section 15).

## 3. Business facts

**Confirmed by the owner**

- Main product: HDU (high-density urethane) panels, routed (carved, dimensional), with the customer's logo in their colors. Single-sided or double-sided. This is the bulk of the site.
- Upgrades: faux stone on any monument (base, columns, accents) at a small extra charge; pillars or columns; non-lit dimensional lettering in cut metal or cut acrylic.
- Illuminated options exist (lit cabinet face with push-through or reverse-cut lettering, channel letters, face-lit letters) and are mentioned briefly only.
- Secondary products: HDU sign panels on their own, HDU mailboxes, custom foam structures (logos, freestanding signs, freestanding foam text, one-off pieces).
- Build to order. Three ways to buy: standard sizes with prices shown, the online Monument Builder, or a custom quote.
- Flow: standard size, builder design or custom quote, then approval drawing, then deposit paid online, then production, then permanent installation by a certified installer, then final invoice paid online.
- Nationwide, with installation nationwide.

**Working assumptions (the owner has not confirmed these; write generally)**

- Structure: a routed HDU sign face; base and mounting depend on the design, for example on posts or on a stone-look base. Make no claim about a core material.
- Not offered until confirmed, so never mentioned: a new face on an existing base, repair or refinishing, digital LED message boards, a trade program for other sign shops.

**Unknown (config tokens, see section 15)**

Business name, phone, email, hours, the standard sizes and prices, builder pricing rules, deposit percentage, lead time, warranty terms, who handles permits, damage-report window, drawing turnaround, response time.

## 4. Who visits and what they need

The buyers are homeowner associations and subdivisions, apartment communities, churches, schools, parks and municipalities, business parks and individual businesses. The person on the site is usually a board member, property manager, pastor, administrator or small-business owner, often 40 to 65, often on a desktop at work, and almost never the only decision maker. They have to take a sign and a price to a board or committee.

What they need from the page, in order:

1. To see within a few seconds that this company makes exactly the thing they want, and only that.
2. A price they can trust, with what it covers. Almost nobody in this trade publishes prices or includes installation, so doing both is the strongest trust signal available.
3. To see their own name on a sign, at a real size, before talking to anyone.
4. Something to forward: a link and a printable one-page sheet with the drawing, the options and the price.
5. To understand what happens after they click, including what happens to their deposit.
6. A phone number and a plain way to ask for something unusual.

---

## 5. Design direction: the approval drawing

### 5.1 The idea

In this trade, nothing gets built until the customer signs an approval drawing: a scaled elevation of the sign with its dimensions. That drawing is the most characteristic object in the subject's world, so the site is built around it.

**The signature element** is a live elevation drawing of a monument sign. On arrival, the page's headline is routed into the face of that sign: "Monument signs. Nothing else." Under the drawing is one text field, "Put your name on it". Type a name and the sign now says that instead. From that moment it is the visitor's sign: it follows them down the page in a slim bar with its price, and it prints as a one-page sheet for their board.

The drawing style is the architectural elevation with cast shadows. Light comes from the upper left at 45 degrees, and anything raised casts a crisp, flat, hard-edged shadow down and to the right. This is how architects have long shown depth on a flat drawing, and it is exactly what a routed sign is: letters and borders standing proud of a recessed field. It shows the product's defining quality, relief, with no photograph and no effect.

Spend all the boldness there. Everything else on the page is quiet: one serif, one sans, hairlines, generous space, plain words.

**A reference comp exists** at `design/reference-comp.html`, with screenshots in `design/`. It was built and checked in a browser to settle the palette, the type pairing and the drawing style. Treat its look as the target for the drawing language, colors and typography. It is a comp, not production code: rebuild it properly to this specification, and do not copy its page structure beyond the hero and the size lineup. Its wording and prices are placeholders; section 7 is the only source for the words on the page. If the folder is missing, sections 5.2 to 5.5 contain everything needed.

### 5.2 Color

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#ECEDE8` | Page background. A cool, slightly green grey, like drafting vellum. |
| `--paper-deep` | `#E2E4DD` | Quiet bands and the draft notice. |
| `--raised` | `#F7F5EE` | Input fills, the title block bar, and in drawings every painted raised surface (border, letters, caps). |
| `--ink` | `#1B211E` | Text, drawing outlines, primary buttons, structural rules. |
| `--ink-soft` | `#4C544F` | Secondary text, dimension lines, form-control borders. |
| `--rule` | `#9DA29B` | Hairline separators only. Never text, never a control border (it is 2.2:1 on paper). |
| `--sign-green` | `#1F4A3A` | The one accent. The default sign face, focus rings, primary-button hover, the stage numerals, selected controls (`accent-color`). |
| `--stone` | `#C8C6BB` | Drawings only: stone-look surfaces. |
| `--stone-shade` | `#A9A79B` | Drawings only: stone joints and shadow. |

Measured contrast: ink on paper 13.9:1; ink-soft on paper 6.6:1; ink-soft on raised 7.2:1; paper on ink 13.9:1; raised on sign-green 9.2:1; sign-green on paper 8.5:1.

Cast shadows on a painted field are that field's color darkened, computed once as `color-mix(in oklab, var(--field) 78%, black)`, so they stay correct when a visitor changes the sign color. On the default green this gives about `#143326`, the shadow tone used in the reference comp.

There is no dark theme. Set `color-scheme: light` and a `theme-color` of `#ECEDE8`. Style `::selection` as raised text on sign-green.

### 5.3 Type

Two families, both open-license (SIL OFL 1.1), self-hosted as variable WOFF2. The two files and their license texts are already in `design/fonts/`; copy them into the site. If that folder is missing, install `@fontsource-variable/besley` and `@fontsource-variable/libre-franklin` from npm and take only the `latin-wght-normal` file from each. Total font weight is about 66 KB. Do not load from Google Fonts or any other host.

| Role | Family | Why |
|---|---|---|
| Display: the sign face, headings, stage numerals, money | **Besley** (variable, 400 to 900) | A Clarendon, a style long used on American carved and routed signs. Its sturdy strokes and bracketed serifs are the kind of letter a router can actually cut. It reads as established and warm without being ornate. |
| Text and interface: body, labels, controls, dimension figures | **Libre Franklin** (variable, 100 to 900) | A Franklin Gothic: the plain American workhorse sans, and a natural partner for a Clarendon. Legible, unshowy, and it stays out of the way of the display face. |

Two facts about these font files that were checked and will bite if ignored:

- **Besley has tabular figures (`tnum`); Libre Franklin's subset does not, and its digits have different widths.** So every price, and any number that changes live, is set in Besley with `font-variant-numeric: tabular-nums lining-nums`. Otherwise the price jitters as it updates.
- **Besley has no prime marks (′ ″); Libre Franklin does.** So feet-and-inches figures written with primes (8′-0″), which appear only inside drawings as dimension labels, are set in Libre Franklin. In headings and body text write sizes in words: "8 ft × 4 ft", "4 ft × 2 ft 6 in", with a non-breaking space between number and unit.

Scale and settings:

| Element | Family, weight | Size | Line height | Tracking |
|---|---|---|---|---|
| Sign face lettering | Besley 640 | Fitted to the sign (5.5) | 1.24 | -0.012em |
| Section heading (h2) | Besley 600 | `clamp(1.875rem, 3.3vw, 2.875rem)` | 1.08 | -0.018em |
| Subheading (h3) | Besley 600 | 1.4375rem | 1.2 | -0.008em |
| Stage numeral | Besley 600, sign-green | matches h3, or h2 size at stage starts | | |
| Money | Besley 600, tabular | 1.5rem to 1.875rem | 1.15 | -0.01em |
| Lede | Libre Franklin 400 | 1.3125rem | 1.42 | -0.006em |
| Body | Libre Franklin 400 | 1.0625rem (17px) | 1.55 | 0 |
| Small, labels, captions | Libre Franklin 400 to 500 | 0.96875rem (15.5px) | 1.45 | 0 |
| Buttons, nav emphasis | Libre Franklin 560 | 1rem | 1 | 0 |
| Wordmark | Besley 650 | 1.3125rem | | -0.005em |

Rules: sentence case everywhere, including headings and buttons. No all-caps text anywhere. No italics for emphasis. Body measure 60 to 72 characters (`max-width: 36em` on paragraphs). `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs. Real typographic characters: curly quotes and apostrophes, ×, non-breaking spaces between a number and its unit. Preload both font files, use `font-display: swap`, and define metric-matched fallback faces with `size-adjust` so the swap does not shift layout.

### 5.4 Layout and spacing

- Left-aligned throughout. Nothing is centered except lettering on a sign face.
- Content width `max-width: 1320px`, side gutters `clamp(20px, 3.4vw, 48px)`.
- A 12-column grid with a 48px gap on desktop. Most sections split 7/5 or 5/7 rather than in half, so the page has a consistent asymmetry: the wider side holds the drawing or the main text, the narrower side holds the supporting text or the action.
- Spacing scale in px: 4, 8, 12, 16, 24, 32, 48, 72, 112. Sections are separated by 72 to 112 vertical space. Tight within a group, generous between groups, more space above a heading than below it.
- A section begins with a full-width 1px ink rule only where a new part of the page starts (sizes, how it works, questions, more from our shop, footer). Inside sections, use the lighter `--rule` hairline or just space. Do not box content in cards.
- Corner radius is 3px on buttons and inputs and 2px on color swatches. Nothing else is rounded.
- Breakpoints: one column below 820px; phone refinements below 560px. Design the phone layout deliberately; it is not a squeezed desktop.

### 5.5 The drawing language

All drawings on the site come from one small drawing module (section 8.4) so they share one style. The rules:

- **Units are inches.** The SVG `viewBox` is in inches with grade (ground level) at y = 0 and up as negative y. Every outline uses `vector-effect="non-scaling-stroke"`, so line weight is constant on screen whatever the drawing's size.
- **Line weights:** object outlines 1.25px ink; the recessed field's outline 1px ink; the grade line 1.5px ink; dimension lines 1px ink-soft with 1.75px slash ticks; stone joints 1px stone-shade.
- **Fills are flat.** No gradients, no textures, no filters, no blur, no opacity tricks.
- **The sign face:** a panel in `--raised` with a recessed field inset by a border about 5.8% of the panel width (minimum 2.6 in). The field takes the chosen background color.
- **Cast shadows:** relief depth is about 0.9% of the panel width (minimum 0.5 in). The border casts a shadow of that depth along the top and left inside edges of the field. Lettering casts a solid shadow down-right, made by stacking 8 copies of the text between zero offset and full depth (3 copies in small drawings) under the top copy. All shadows are clipped to the field.
- **Lettering** is centered in the field, Besley 640 (or Libre Franklin 600 for the sans option), sized as large as fits: no taller than field height ÷ (lines × 1.5) and no wider than 86% of the field width, using the glyph-width table described in 8.4.
- **Top shapes:** flat, arched (rise 7.5% of width), peaked and shouldered, as paths.
- **Base:** a cap slab 2.6 in high and 12 in wider than the panel in `--raised`, over a wall 8 in wider than the panel. A plain base is `--raised`; a stone-look base is `--stone` with three courses and staggered vertical joints at fixed proportions (never random, so the drawing is identical every time), and a thin shadow under the cap. Small drawings show the courses only.
- **Posts:** two posts with small caps, the panel hung between them above grade.
- **Pillars:** a stone-look pillar at each side, taller than the panel, with a flat or peaked cap.
- **Cut letters** (metal or acrylic) stand further off the face: draw them with twice the shadow depth, and metal in a flat mid grey.
- **Grade:** a 1.5px ink line running past the sign on both sides, with short 45-degree earth-hatch strokes in `--rule` beneath it. Space the hatches as a fraction of the drawing width (about 26 across) so they never clot at small sizes.
- **Dimension lines:** overall width above the sign and overall height at the left, each a thin line with slash ticks and the figure sitting in a gap in the line, in Libre Franklin 500. If the figure would render smaller than 12px on screen, draw the sign without dimension lines instead (this is what happens on phones).
- **Scale pole:** where several signs are compared, a 6 ft pole in alternating ink and raised 1 ft bands stands at the left, and the caption says so in words.

What the drawing language is not: there is no blueprint costume anywhere on the site. No grid-paper backgrounds, no blue, no dashed "technical" borders, no crop marks, no "FIG. 1" captions, no coordinates, no monospace. The drawings are drawings; the page around them is a plain, well-set page.

### 5.6 Components

- **Primary button:** ink background, paper text, 16px 22px padding, 3px radius. Hover and focus-visible: background becomes sign-green. Active: no transform.
- **Secondary button:** transparent, 1px ink border, ink text. Hover: raised fill.
- **Text link:** ink, underlined with a 1px `--rule` underline at 4px offset. Hover: the underline becomes ink. Never append an arrow.
- **Inputs:** raised fill, 1px ink-soft border, 3px radius, 12px 14px padding, 1.0625rem text (never below 16px, so iOS does not zoom). Labels sit above, in small ink-soft text. Help text below.
- **Focus:** `:focus-visible` gets a 2px sign-green outline at 2px offset, on everything focusable. Never removed.
- **Choices in the builder:** native radio buttons and checkboxes with `accent-color: var(--sign-green)`, in plain rows separated by hairlines, the label on the left and the price difference on the right in Besley tabular. No cards, no pills, no custom toggle switches.
- **Disclosure:** native `<details>`/`<summary>` with a plain plus/minus mark drawn in CSS. Used for the stage details, policies, questions and the builder's lighting option. The builder's other option groups are always open, because with this few decisions people choose faster when they can see every option and its price at once.
- **Dialogs:** native `<dialog>` opened with `showModal()`, paper background, 1px ink border, no shadow, a dimmed `::backdrop` in ink at 40% opacity. Used for reserving with a deposit, the approval-drawing request, save or send, and pay an invoice.
- **Errors:** the message in ink at weight 560 below the field, the field border thickened to 2px ink, `aria-invalid` and `aria-describedby` set. No red.
- **Draft notice:** while `config.draft` is true, a slim paper-deep strip at the very top reads "Draft site. Prices and terms shown are samples." It disappears when `draft` is false.
- **Title block:** see section 6.9.

### 5.7 Motion

There is exactly one authored animation, on first load of the hero. Over about 900ms: the sign starts as a flat drawing with no shadows, the cast shadows grow to full depth so the lettering and border rise into relief, and then the two dimension lines draw outward from their figures. Ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`). It runs once per page load and never on scroll. With `prefers-reduced-motion: reduce`, show the finished state immediately.

Everything else that moves does so only in answer to something the visitor did: a disclosure opening, the hero's right column swapping when the builder opens (a 200ms cross-fade), the price changing (no animation; the number just changes), the title block appearing (a 200ms slide up). Under 250ms, transform and opacity only.

Content is visible by default. Nothing waits at `opacity: 0` for JavaScript or for scroll position.

### 5.8 Patterns to avoid, by name

These are the habits a generated page falls into. None of them appears on this site.

- A cream or warm off-white background, a terracotta or clay accent, or a near-black background with an acid-green or vermilion accent.
- An italic, bold or colored accent word inside a headline.
- Tracked-out uppercase eyebrow labels above headings. Uppercase anything.
- Zero-padded "01 / 02 / 03" markers. (The six stages of an order are a true sequence and are numbered plainly, 1 to 6. Nothing else is numbered.)
- Monospace type for labels or data.
- Pill-shaped buttons, badges or chips.
- An arrow (→) at the end of a link or button.
- Strings joined by middle dots (A · B · C).
- A grid of identical rounded cards, each with an icon, a heading and two lines of text. Icons in tinted circles. Emoji.
- Soft grey drop shadows, glows, glass panels, background blur, gradient text, mesh gradients, radial "spotlights", noise textures.
- A hero made of a huge number with a small label, or a row of statistic counters.
- Fade-and-slide-up entrances as sections scroll into view. Hover lift on cards. Parallax. Marquees. Custom cursors. Scroll-linked effects.
- A logo wall, a testimonial carousel, star ratings, "trusted by" claims. The owner has supplied none, and invented ones would be false.
- Stock photos, AI-generated images, illustrated people, 3D renders.
- Buzzwords: solutions, seamless, elevate, unlock, empower, premium quality, state-of-the-art, one-stop shop, world-class. Exclamation marks. "Not X. Y." aphorisms beyond the one headline.
- Any typeface other than Besley and Libre Franklin.

---

## 6. Page architecture

One page, read top to bottom. The order is deliberate: the tool first, then the prices, then the whole journey of an order from first drawing to final invoice, with every policy and detail filed under the stage where the customer actually meets it. There are no separate "materials", "installation" or "policies" sections, because the customer does not experience the purchase that way.

Section ids are stable and descriptive so the page can be split into separate URLs later without rewriting links.

| Order | id | What it is |
|---|---|---|
| 0 | | Draft notice (only while `config.draft` is true) |
| 1 | | Header |
| 2 | `#design` | Hero, which is also the Monument Builder |
| 3 | `#sizes` | Standard sizes and prices |
| 4 | `#how` | How it works: the six stages of an order, with the custom quote form at `#quote` inside stage 1 |
| 5 | `#work` | Signs we have built (rendered only when the owner has supplied photographs) |
| 6 | `#questions` | Questions |
| 7 | `#more` | More from our shop |
| 8 | | Footer, with privacy at `#privacy` |
| | | Title block bar, dialogs |

### 6.1 Header

Not sticky on phones; sticky on desktop with a solid paper background and a 1px rule that appears only once the page has scrolled (toggle a class with an IntersectionObserver on a 1px sentinel, not a scroll listener). No blur, no transparency.

Left: the business name as a wordmark in Besley 650. Right: four plain links, then the phone number in ink at weight 560 as a `tel:` link. Below 820px show only the wordmark and the phone number; the four links are reachable from the footer, and the page is short enough in structure that no hamburger menu is needed. Include a visually hidden "Skip to content" link as the first focusable element.

### 6.2 Hero and builder (`#design`)

Two states of one component. The drawing never moves between them.

**Intro state** (what a new visitor sees; everything in the first viewport at 1440×900):

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Business Name        Design your sign  Sizes and prices  How it works     │
│                      Questions                          (555) 010-0199    │
│                                                                           │
│        ├──────────────── 8′-0″ ────────────────┤                          │
│     ┬  ╭───────────────────────────────────────╮                          │
│     │  │  ┌─────────────────────────────────┐  │    Routed HDU monument   │
│     │  │  │      Monument signs.            │  │    signs, built to order │
│  6′-0″ │  │      Nothing else.              │  │    and permanently       │
│     │  │  └─────────────────────────────────┘  │    installed anywhere in │
│     │  ├───────────────────────────────────────┤    the United States.    │
│     ┴  │▒▒▒▒▒▒▒▒▒▒▒▒ stone-look base ▒▒▒▒▒▒▒▒▒▒│                          │
│  ━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━   [ Design your sign ]│
│   ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄  ⁄    See standard sizes  │
│                                                         and prices        │
│  Put your name on it                                As drawn, installed   │
│  [ e.g. Alder Creek                 ]               $0,000                │
└───────────────────────────────────────────────────────────────────────────┘
```

Grid: `minmax(0, 1fr) 380px`, 48px gap, columns bottom-aligned so the lede block sits just above the grade line. The grade line extends left past the sign to the edge of the drawing column. The name field and the price sit on a second row using the same two columns.

The `<h1>` is real text in the HTML, visually hidden, reading "Monument signs. Nothing else." The SVG has `role="img"` and an `aria-label` that describes the drawing and what the sign says. The SVG is pre-rendered into the HTML by the build script, so the sign is there on first paint without JavaScript.

**Builder state** (after "Design your sign", after choosing a standard size, or when arriving on a shared design link):

```
┌───────────────────────────────────────────────────────────────────────────┐
│        ├──────────────── 8′-0″ ────────────────┤     Your sign       Close │
│     ┬  ╭───────────────────────────────────────╮     ───────────────────── │
│     │  │        Alder Creek                    │     Wording               │
│  6′-0″ │        Homeowners                     │     [ line 1 ] [ line 2 ] │
│     │  ├───────────────────────────────────────┤     Lettering  ◉ Serif ○ … │
│     ┴  │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│     ───────────────────── │
│  ━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━  Size                  │
│  (the drawing column is sticky while the options     ◉ 6 ft × 3 ft 6 in $… │
│   column scrolls past it)                            ○ 8 ft × 4 ft      $… │
│                                                      ───────────────────── │
│  Put your name on it          As drawn, installed    Top shape  Sides      │
│  [ Alder Creek Homeowners ]   $0,000                 How it stands Pillars │
│                                                      Lettering  Colors     │
│                                                      Need it lit? (closed) │
│                                                      Installation          │
│                                                      ───────────────────── │
│                                                      Your price            │
│                                                      Sign …………………… $0,000   │
│                                                      Stone-look base … $000 │
│                                                      Installation …… $0,000 │
│                                                      Total ……………… $0,000   │
│                                                      Deposit today … $0,000 │
│                                                      [ Reserve with deposit]│
│                                                      [ Request approval     │
│                                                        drawing ]            │
│                                                      Save or send this      │
│                                                      design                 │
└───────────────────────────────────────────────────────────────────────────┘
```

Only the right column changes: the lede and two actions are replaced by the option groups, with a 200ms cross-fade. The left column (drawing, name field, price) becomes `position: sticky` below the header for as long as the options column is taller than the viewport. "Close" returns to the intro state without losing the design.

**Phone:** one column. Intro state: drawing (no dimension lines, edge to edge within the gutters), lede, button, link, name field, price. Builder state: the drawing sticks to the top of the viewport at no more than 38% of its height with the price beside the name field collapsed away, the option groups scroll beneath it, and the title block bar at the bottom carries the live price and the reserve button.

### 6.3 Standard sizes (`#sizes`)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Four standard sizes, drawn                 Each price covers the routed sign
to the same scale.                         in your colors, the base shown …

 ┃   ╭────╮       ╭──────╮        ╭────────╮         ╭───────────╮
 ┃   │    │       │      │        │        │         │           │
 ┃  ▒▒▒▒▒▒▒▒     ▒▒▒▒▒▒▒▒▒▒     ▒▒▒▒▒▒▒▒▒▒▒▒▒      ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4 ft × 2 ft 6 in   5 ft × 3 ft     6 ft × 3 ft 6 in    8 ft × 4 ft
Sign       $0,000  Sign    $0,000  Sign       $0,000   Sign       $0,000
Installed  $0,000  Installed $0,000 Installed  $0,000   Installed  $0,000
Start with this size …
```

All sizes stand on one grade line at one scale, with the 6 ft scale pole at the left, so the visitor can judge real size at a glance. Each drawing sits in an equal column that lines up with its text below. The heading states the number of sizes from the config, in words. Below 820px there is no shared row: each size gets its own drawing, every one in an identical `viewBox` so they are still at one scale, in a two-column grid.

This is real tabular information, so mark the text block up as a `<table>` with a caption, restyled with CSS grid on small screens if needed, or as a list of `<article>`s with `<dl>`s. Either is fine if a screen reader hears size, sign price, installed price and action in order.

### 6.4 How it works (`#how`)

A heading and one paragraph, then the six stages as an ordered list. On desktop each stage is a row: a large sign-green Besley numeral and the stage name in the left 4 columns, its content in the right 8. On phones the numeral sits inline before the name. A hairline separates stages.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
One company, from the first drawing
to the sign in the ground.
Most sign shops make a monument sign now and then. …

1  Design it            There are three ways to start. …
                        Open the builder   See standard sizes
                        + What we need from you
                        + Matching your colors
                        Request a custom quote  (the form, #quote)
─────────────────────────────────────────────────────────────────────────────
2  Approve the          Before anything is built, we send you a scaled drawing …
   drawing              + Taking it to a board or committee
                        + Checking your site
                        + Permits and local rules
                        + Approval policy
─────────────────────────────────────────────────────────────────────────────
3  Reserve with a       …   + What the price covers  + Deposit policy
   deposit                  + If you need to cancel
4  We build it          …   [anatomy drawing]  Options (four small drawings)
                            + Why HDU
5  We install it        …   + Before installation day  + How the sign stands
                            + Installation policy  + Delivery policy
6  Final invoice,       …   [ Pay an invoice ]  See your orders and payments
   and after                + Warranty  + Looking after your sign
```

Stage 4 carries two pieces of drawing, both from the drawing module:

- **Anatomy of a routed face:** a close-up of one corner of a sign face in elevation beside a cross-section through it, with three plain labels on thin leader lines: "Raised letter", "Recessed background", "Raised border". Label text is HTML or SVG text in Libre Franklin, sentence case.
- **Options:** four small elevation drawings in a row (two by two on phones), each with a one-line caption: a stone-look base, pillars with caps, cut metal letters, cut acrylic letters.

### 6.5 Signs we have built (`#work`)

Render this section only if `config.gallery` contains photographs. With none, omit the section entirely; never show placeholders, stock or generated images. When present: a heading, then photographs at their natural aspect ratio in a two-column layout of unequal widths, each with a caption in small text giving the customer or place, the size and the options. Images are AVIF or WebP with `width` and `height` set, `loading="lazy"`, `decoding="async"`.

### 6.6 Questions (`#questions`)

A heading, then the questions as native `<details>` in four labelled groups (ordering, the sign, installation, payment), in a 5/7 split with the group name on the left. All answers are in the HTML, so search engines and screen readers get them.

### 6.7 More from our shop (`#more`)

Deliberately small, so the site still reads as monument-only: a heading, one sentence, three short entries with no pictures, and one text link to the quote form.

### 6.8 Footer

A full-width ink rule, then three columns on paper (not an inverted dark footer): the business name with the one-line description; contact details (phone, email, hours, mailing address if supplied); and links (the four nav links, the six policies, "Pay an invoice", "See your orders and payments", "Privacy"). Each policy link jumps to the stage that holds that policy and opens its disclosure. A final line holds the copyright year and legal name.

### 6.9 Title block bar

A slim bar fixed to the bottom of the viewport, raised background, 1px ink top border, no shadow. It is the visitor's sign following them down the page.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [tiny     Alder Creek Homeowners                Deposit today $0,000      │
│  drawing] 8 ft × 4 ft, double-sided,            $0,000   [Reserve with    │
│           stone-look base, installed                       deposit]       │
└───────────────────────────────────────────────────────────────────────────┘
```

- It appears only once the design differs from the default (a name typed, an option changed, a size chosen, or a shared link opened). A new visitor who has touched nothing never sees it.
- It hides while the builder's own price summary is on screen, so there are never two reserve buttons visible together (IntersectionObserver).
- On phones it shows the total and the button only.
- Clicking the drawing or the name scrolls to `#design` and opens the builder.
- Give the page bottom padding equal to the bar's height while it is shown, so it never covers the footer.

### 6.10 Printing

`@media print` turns the page into a one-page design sheet for a board or committee: business name and contact, the date, the drawing with dimension lines, a table of the chosen options, the price lines and total, what the price covers, the deposit and the next step, and the design's link written out. Everything else on the page is hidden. Black on white, the sign in its chosen colors. "Save or send this design" offers "Print the design sheet", which calls `window.print()`.

---

## 7. Copy

This is the final text. Use it as written. `{{tokens}}` are filled from the site config at build time (section 10.2); the build fails if one is unresolved. Text marked **[proposed]** is a fair default the owner has not yet confirmed: build it, keep its wording in the config so it can be changed without touching HTML, and it stays covered by the draft notice until the owner signs off.

**Voice:** plain, specific, calm, confident. Short sentences. "We" and "you". Sentence case. A button says exactly what it does, and the same action keeps the same name everywhere: "Design your sign", "Reserve with deposit", "Request approval drawing", "Request a custom quote", "Pay an invoice".

### 7.1 Document head

- Title: `Monument Signs, Built to Order and Installed Nationwide | {{business_name}}`
- Meta description: `Routed HDU monument signs, built to order. Design yours online and see the price as you go, then have it permanently installed anywhere in the US by a certified installer.`

### 7.2 Header

Four links, in this order: "Design your sign", "Sizes and prices", "How it works", "Questions". Then `{{phone}}`.

### 7.3 Hero (`#design`)

- H1, on the sign: Monument signs. Nothing else.
- Lede: Routed HDU monument signs, built to order and permanently installed anywhere in the United States.
- Primary button: Design your sign
- Link: See standard sizes and prices
- Field label: Put your name on it
- Field placeholder: e.g. Alder Creek
- Price label: As drawn, installed (or "As drawn, delivered" when installation is not selected)

### 7.4 Builder

Panel heading: Your sign. Close control: Close.

| Group | Legend | Choices and help text |
|---|---|---|
| Wording | What it says | Fields: "First line", "Second line (optional)". Lettering style: "Serif", "Sans". Upload control: "Add your logo (optional)". Help: "PNG, JPG, SVG, PDF, AI or EPS. We place it properly on your approval drawing." |
| Size | Size of the sign face | One radio per standard size, written in words, with its price. Help: "Overall height includes the base." Link: "Need a different size? Request a custom quote." |
| Shape | Top shape | Flat, Arched, Peaked, Shouldered. Each with a tiny outline of the shape. |
| Sides | Sides | "Single-sided", "Double-sided". Help: "Double-sided reads from both directions." |
| Base | How it stands | "On posts", "On a base", "On a stone-look base". |
| Pillars | Pillars | "None", "A pillar at each side". When chosen, cap: "Flat cap", "Peaked cap". |
| Lettering | Lettering | "Routed into the face (included)", "Cut metal letters", "Cut acrylic letters". |
| Colors | Colors | "Background", "Letters and border": swatches with plain names. Field: "Have a paint code? (optional)". Help: "Give us a Pantone, Sherwin-Williams or other paint code and we match it. Screens show color differently; your approval drawing names the exact paints." |
| Lighting (collapsed) | Need it lit? | "We also build illuminated monument signs. Tick this and we will quote lighting with your drawing." Checkbox: "Quote lighting for this sign". When ticked, add under the total: "Lighting is quoted separately and is not in this price." |
| Installation | Installation | "Installed by a certified installer", "Delivered only". Field: "ZIP code where it will stand". |

Price summary: heading "Your price"; one line per priced item; "Total"; "Deposit today ({{deposit_percent}}%)"; then the sentence "Nothing is built until you approve your drawing."

Actions: "Reserve with deposit" (primary), "Request approval drawing" (secondary), "Save or send this design" (link).

A disclosure under the actions, "What this price covers":

- Included: The routed HDU sign in your wording and colors. The base, posts or pillars shown. Your approval drawing, and changes to it until it is right. **[proposed]** Delivery to your site or your installer. **[proposed]** Installation by a certified installer, when you choose it.
- Not included: Permit fees, and engineered drawings if your city or county requires them. **[proposed]** Electrical work for a lit sign. Landscaping around the sign.

If any chosen option has no price in the config, replace the total with "Priced with your drawing", hide the deposit line and the reserve button, and make "Request approval drawing" the primary action.

Save or send dialog: heading "Save or send this design". "Copy link" (after copying, the button reads "Link copied"). "Email it to me" with an email field and the button "Send design" (then "Design sent"). "Print the design sheet". Help: "The link opens this exact sign, with its options and price, for anyone you send it to."

Approval drawing dialog: heading "Request your approval drawing". Intro: "We will draw your sign to scale with its exact dimensions, lettering and colors, and email it to you within {{drawing_turnaround}}. It costs nothing to ask." **[proposed]** Fields: "Your name", "Organization (optional)", "Email", "Phone (optional)", "ZIP code where it will stand", "Anything we should know? (optional)", "Logo or artwork (optional)". Button: "Request approval drawing". Success: "Drawing requested. We will email it to {email} within {{drawing_turnaround}}."

Reserve dialog, opened by "Reserve with deposit": heading "Reserve with deposit". Intro: "You pay a deposit of {deposit} now, on Stripe's secure payment page. The balance of {balance} is invoiced when your sign is installed. Nothing is built until you approve your drawing." Fields: "Your name", "Email", "Phone (optional)", "ZIP code where it will stand". Button: "Continue to payment".

After paying a deposit, the page returns to `#design` with this in place of the action buttons: "Reserved. Your deposit of {amount} is paid and a receipt is on its way to your email. Next we prepare your approval drawing. Your reference is {reference}." If payment is cancelled: "No payment was taken. Your design is still here."

### 7.5 Standard sizes (`#sizes`)

- Heading: `{{size_count_word}} standard sizes, drawn to the same scale.` (for example "Four standard sizes, drawn to the same scale.")
- Intro: Each price covers the routed sign in your wording and colors, the base shown and delivery. Installation by a certified installer is priced beside it. The pole at the left is six feet tall.
- Per size: the size in words as a heading; "Sign" and its price; "Installed" and its price; link "Start with this size".
- Below: Prices shown are for a single-sided sign. Double-sided and every other option are priced in the builder.
- Below: Something else in mind? Any size or shape outside these is a custom quote. Link: Request a custom quote.

### 7.6 How it works (`#how`)

- Heading: One company, from the first drawing to the sign in the ground.
- Paragraph: Most sign shops make a monument sign now and then. We make them every day, and we make nothing else. That focus is why we can publish our sizes and prices, show you your sign before anything is built, and send a certified installer to set it permanently, wherever you are in the country.
- Paragraph: Our signs stand at the entrances of subdivisions and apartment communities, churches, schools, parks, business parks and individual businesses.

**1 Design it**

There are three ways to start. Pick a standard size, design your own in the builder, or describe something the builder cannot draw. All three lead to the same next step: a drawing of your sign.

Links: Open the builder. See standard sizes.

- *What we need from you:* Your name as it should read on the sign. Your logo, if it goes on the sign: a vector file (AI, EPS, PDF or SVG) is best, and a clear JPG or PNG is enough to start. Your colors, as paint codes if you have them. The ZIP code where the sign will stand.
- *Matching your colors:* Give us a Pantone, Sherwin-Williams or other paint code, or send a sample, and we match it. Sign paint is opaque and printing ink is not, so a match is very close rather than identical, and color always looks a little different on a screen. Your approval drawing names the exact paints we will use.

Custom quote form (`#quote`), heading: Request a custom quote. Intro: For a size, shape or structure the builder cannot draw, or for several signs at once. Tell us what you have in mind and we reply within {{response_time}}. Fields and messages are in section 9.1.

**2 Approve the drawing**

Before anything is built, we send you a scaled drawing of your sign: its exact dimensions, its lettering and colors, and how it stands. Ask for changes until it is right. Production starts only after you approve it in writing.

- *Taking it to a board or committee:* Most of our signs are approved by a group. Every design you make here has a link you can send and a sheet you can print, so everyone is looking at the same sign, the same options and the same price.
- *Checking your site:* Tell us where the sign will go and send a few photos of the spot with something in the picture for scale. We will ask about the ground, anything buried nearby, and how far the sign sits from the road.
- *Permits and local rules:* Cities, counties and homeowner associations set their own rules for the size, height and placement of a sign, and many require a permit. Check with yours before you order. The dimensions on your approval drawing are the ones a permit office or review board will ask for. {{permit_statement}}
- *Approval policy* (id `policy-approval`): We build exactly what your approved drawing shows. If you want a change after approving, we tell you what it does to the price and the schedule before we do anything. **[proposed]**

**3 Reserve with a deposit**

A deposit of {{deposit_percent}}% reserves your place in production. Pay it online when you approve your drawing. If you are ready sooner, reserve from the builder today and we start your drawing straight away. The balance is invoiced when your sign is installed.

- *What the price covers:* the same two lists as in the builder.
- *Deposit policy* (id `policy-deposit`): The deposit is {{deposit_percent}}% of your total and is paid online. It is the only payment we take before your sign is installed. If you chose delivery only, the balance is invoiced when your sign ships. **[proposed]**
- *If you need to cancel* (id `policy-cancellation`): Cancel before you approve your drawing and we refund your deposit in full. Once you approve, we order materials and cut your sign to your design, so from then we refund your deposit less the cost of the work already done, and we tell you that figure before you decide. **[proposed]**

**4 We build it**

Your sign is routed from HDU, high-density urethane: a dense board made for outdoor signs. A router carves your lettering, border and logo in relief, so they stand proud of the background and cast real shadows through the day. Then it is primed and painted in your colors. Every sign is made for its order; nothing comes off a shelf. Production takes {{lead_time}} from the day you approve your drawing.

Anatomy drawing labels: Raised letter. Recessed background. Raised border.

Options, one line each under its small drawing:

- Stone-look base. Any monument can have a stone-look base, pillars or accents, for a small extra charge.
- Pillars with caps. A pillar at each side frames the sign and gives an entrance more presence.
- Cut metal letters. Individual letters cut from metal and mounted on the face.
- Cut acrylic letters. Individual letters cut from acrylic and mounted on the face.

One short paragraph after the options, and nowhere else on the page: We also build illuminated monument signs: lit faces with push-through or reverse-cut lettering, channel letters and face-lit letters. Ask for lighting in the builder or the quote form and we price it with your drawing.

- *Why HDU:* Unlike wood, HDU has no grain and takes up almost no water, which is why it holds a crisp carved edge outdoors. It routes cleanly at any depth, so fine lettering and detailed logos come out sharp, and it takes paint evenly on every surface.

**5 We install it**

We install permanently, anywhere in the United States, through our network of certified installers. Your installer sets the sign, levels it and leaves it finished. You deal with one company from the first drawing to the sign in the ground.

- *Before installation day:* We agree the exact position with you in advance. Underground lines are marked before anyone digs, through the free 811 service. Clear access to the spot is all we need from you on the day.
- *How the sign stands:* Depending on the design, your sign stands on posts set in the ground or on a base. Your approval drawing shows which, and what goes below ground.
- *Installation policy* (id `policy-installation`): Installation is carried out by a certified installer from our network on a date agreed with you. The installer sets the sign permanently and leaves the site tidy. The spot needs to be clear and reachable, and utilities marked, before work starts. **[proposed]**
- *Delivery policy* (id `policy-delivery`): Your sign travels crated. Look it over when it arrives. If anything is damaged, send us photos within {{damage_report_days}} days and we repair or replace it. You do not need to send it back first. **[proposed]**

**6 Final invoice, and after**

When your sign is installed, we email the final invoice and you pay it online. Your sign's drawing, colors and specifications stay on file with us, so anything you need later starts from the exact record.

Button: Pay an invoice. Link: See your orders and payments.

- *Warranty* (id `policy-warranty`): Your sign is covered for {{warranty_years}} years against defects in materials and workmanship. If something we made fails in that time, we repair or replace it. {{warranty_exclusions}} **[proposed]**
- *Looking after your sign:* Wash it with mild soap and water once or twice a year. Keep sprinklers and string trimmers off the face.

Pay an invoice dialog: heading "Pay an invoice". Fields: "Invoice number", "Email the invoice was sent to". Button: "Find invoice". Not found: "We could not find an open invoice with that number and email. Check the invoice email we sent you, or call {{phone}}."

### 7.7 Signs we have built (`#work`, only with photographs)

Heading: Signs we have built. Each caption: `{place or customer}. {size}, {options}.`

### 7.8 Questions (`#questions`)

Heading: Questions.

*Ordering*

- **Do you only make monument signs?** Yes. It is the whole business. We do not make banners, vehicle wraps or storefront signs, which is how we keep getting better at this one thing.
- **How much does a monument sign cost?** Standard sizes are priced on this page, and the builder prices any combination of options as you choose them. Every price lists what it covers. Anything the builder cannot draw is quoted individually.
- **Can I see my sign before I pay?** Yes. The builder draws your sign as you design it, and you can request a full approval drawing before paying a deposit. Nothing is built until you approve that drawing.
- **How long does it take?** {{lead_time}} from the day you approve your drawing, plus delivery and a date for installation.
- **We need signs for several entrances. Can you do that?** Yes. Design one, then tell us how many and where in the quote form. We price a set together.
- **What if we want to change something after approving?** Tell us as soon as you can. We tell you what the change does to the price and the schedule before doing anything.

*The sign*

- **What is HDU?** High-density urethane: a dense board made for outdoor signs. It has no grain and takes up almost no water, so it carves cleanly and holds its shape outdoors.
- **Can you match our logo and colors?** Yes. Send your logo and your paint codes. Your approval drawing shows the logo in place and names the exact paints.
- **Single-sided or double-sided?** A single-sided sign suits a spot where everyone approaches from one direction or the sign sits against a backdrop. A double-sided sign stands at a right angle to the road so it reads from both directions.
- **Can you make a custom shape?** Yes. Send a sketch or a photo through the quote form.
- **What files do you need?** A vector file of your logo (AI, EPS, PDF or SVG) is best. A clear JPG or PNG is enough for a quote and a first drawing.

*Installation*

- **Do you install everywhere?** Yes, anywhere in the United States, through certified installers.
- **Do we need a permit?** Often, yes. Rules are set by your city, county or association, so check with them before you order. Your approval drawing has the dimensions they will ask for.
- **Can we install it ourselves?** Yes. Choose "Delivered only" in the builder. **[proposed]**

*Payment*

- **How do we pay?** Online. A deposit of {{deposit_percent}}% to start, and a final invoice when your sign is installed.
- **Is the deposit refundable?** In full, until you approve your drawing. After that, less the cost of work already done. **[proposed]**
- **Is there a warranty?** Yes: {{warranty_years}} years against defects in materials and workmanship. **[proposed]**

### 7.9 More from our shop (`#more`)

- Heading: More from our shop.
- Sentence: The same material and the same routers make a few other things.
- HDU sign panels. Routed panels on their own, without a monument structure.
- HDU mailboxes. Routed and painted to order.
- Custom foam pieces. Logos, freestanding lettering, freestanding signs and one-off pieces.
- Link: Ask about these (opens the quote form with "Something from More from our shop" selected).

### 7.10 Footer

- `{{business_name}}`. Monument signs, built to order and installed anywhere in the United States.
- Contact: `{{phone}}`, `{{email}}`, `{{hours}}`, `{{mailing_address}}` (omit any that are empty).
- Links: Design your sign. Sizes and prices. How it works. Questions. Policies: Deposit, Approval, Cancellation, Warranty, Installation, Delivery. Pay an invoice. See your orders and payments. Privacy.
- Legal line: © {year} `{{legal_name}}`.
- Privacy (`#privacy`, a disclosure): `{{privacy_text}}`. The owner supplies this text; until then use: "We use the details you give us only to quote, draw, build, deliver and install your sign, and to take payment. We do not sell them. Payments are handled by Stripe; we never see your card number." **[proposed]**

### 7.11 Emails

Plain text with a minimal HTML alternative, no images, no marketing.

- To the business, for every request: subject "New {quote request | drawing request | deposit}: {name}, {reference}". Body: every field submitted, the design summary and its link if there is one, and a download link for each uploaded file.
- To the customer, quote request: subject "We have your quote request". Body: "Thank you, {first name}. We have your request and will reply within {{response_time}}. Your reference is {reference}. If you need to add anything, reply to this email."
- To the customer, drawing request: subject "Your approval drawing is on its way". Body: "Thank you, {first name}. We are drawing your sign to scale and will email it within {{drawing_turnaround}}. Here is the design you sent us: {link}. Your reference is {reference}."
- To the customer, deposit: subject "Reserved: your monument sign". Body: "Thank you, {first name}. Your deposit of {amount} is paid and your place in production is reserved. Next we prepare your approval drawing. Nothing is built until you approve it. Your reference is {reference}."
- To the customer, emailed design: subject "Your monument sign design". Body: "Here is the sign you designed: {link}. The link opens this exact sign with its options and price."

---

## 8. The Monument Builder

The builder is three pure modules and a thin layer of interface code. Keeping the modules pure (no DOM, no clock, no randomness) is what lets the same code draw the sign at build time, price it in the browser and re-price it on the server.

### 8.1 State

One plain object, with every value an id from the config:

```js
{
  v: 1,
  lines: ["Alder Creek", "Homeowners"],   // up to 2 lines, 28 characters each
  style: "serif",                          // "serif" | "sans"
  size: "72x42",                           // a config size id
  shape: "arch",                           // "flat" | "arch" | "peak" | "shoulder"
  sides: 1,                                // 1 | 2
  base: "stone",                           // "posts" | "plain" | "stone"
  pillars: "none",                         // "none" | "flat" | "peak"  (cap style when present)
  lettering: "routed",                     // "routed" | "metal" | "acrylic"
  field: "green", raised: "ivory",         // config paint ids
  paintCode: "",                           // free text, up to 80 characters
  lighting: false,
  install: true,
  zip: ""
}
```

The default state is the hero as first drawn: the headline as the two lines, the largest standard size, arched, single-sided, stone-look base, no pillars, routed, green field, ivory lettering, installed. A design counts as "the visitor's" once it differs from the default.

The state is saved to `localStorage` on every change so a returning visitor finds their sign, and a shared link overrides whatever is saved. An attached logo file is held in memory only and is never put in a link.

### 8.2 Rules between options

Make invalid combinations impossible to choose rather than reporting them afterwards.

- Pillars need a base. With "On posts" chosen, the pillar choices are disabled with the help text "Pillars need a base", and pillars reset to none.
- "Stone-look" applies to the base and to any pillars together.
- An empty second line gives a one-line layout. Wording is trimmed and limited to 28 characters per line; the field stops accepting input at the limit and says "28 characters fit on a line."
- Double-sided shows the note "Both sides the same. For two different sides, request a custom quote."
- Ticking lighting changes nothing in the drawing or the price; it adds the note in 7.4 and flags the request.
- The ZIP field accepts five digits. It is required only when submitting, not while designing.

### 8.3 Pricing

One module, `pricing.js`, exporting `quote(state, config)`. It returns `{ lines: [{ label, amount }], total, deposit, priced }`. All amounts are whole US dollars as integers.

- Sign: the chosen size's `single` or `double` price.
- Each other option adds its price, looked up as either a flat number or an object keyed by size id, so the owner can price an option per size or not.
- Installation adds the size's `install` price when chosen.
- `total` is the sum. `deposit` is `Math.round(total * deposit_percent / 100)`.
- If any chosen option's price is `null`, `priced` is false and the interface follows the unpriced rule in 7.4.
- Lines with a zero amount are not listed, except the sign itself.

The Worker imports this same module and the same config, and computes the deposit from the option ids alone. It never accepts an amount from the browser, and it rejects any id the config does not contain.

Config shape, with the sample values to ship while `draft` is true. These numbers are deliberately round and artificial so nobody mistakes them for real prices; the owner replaces them.

```json
{
  "draft": true,
  "pricing": {
    "currency": "usd",
    "deposit_percent": 50,
    "sizes": [
      { "id": "48x30", "face_w": 48, "face_h": 30, "base_h": 12, "single": 1000, "double": 1500, "install": 500 },
      { "id": "60x36", "face_w": 60, "face_h": 36, "base_h": 14, "single": 2000, "double": 3000, "install": 600 },
      { "id": "72x42", "face_w": 72, "face_h": 42, "base_h": 16, "single": 3000, "double": 4500, "install": 700 },
      { "id": "96x48", "face_w": 96, "face_h": 48, "base_h": 16, "single": 4000, "double": 6000, "install": 800 }
    ],
    "shape":     { "flat": 0, "arch": 0, "peak": 100, "shoulder": 100 },
    "base":      { "posts": 0, "plain": 0, "stone": 300 },
    "pillars":   { "none": 0, "flat": 500, "peak": 600 },
    "lettering": { "routed": 0, "metal": 400, "acrylic": 300 }
  },
  "paints": [
    { "id": "green", "name": "Sign green", "hex": "#1F4A3A" }, { "id": "black", "name": "Black", "hex": "#1E1E1E" },
    { "id": "navy", "name": "Navy", "hex": "#1E2F4D" },        { "id": "burgundy", "name": "Burgundy", "hex": "#5E1F27" },
    { "id": "slate", "name": "Slate", "hex": "#47525C" },      { "id": "brick", "name": "Brick", "hex": "#7A3B2E" },
    { "id": "bronze", "name": "Bronze", "hex": "#6B5236" },    { "id": "sand", "name": "Sand", "hex": "#D8CDB4" },
    { "id": "ivory", "name": "Ivory", "hex": "#F7F5EE" },      { "id": "white", "name": "White", "hex": "#FAFAF7" },
    { "id": "gold", "name": "Gold", "hex": "#B8922E" },        { "id": "grey", "name": "Stone grey", "hex": "#9A9C95" }
  ]
}
```

If the visitor picks a background and lettering color with less than 3:1 contrast between them, show "These two colors are close. Lettering reads best with strong contrast." and let them proceed.

### 8.4 Drawing

One module, `draw.js`, of pure functions that return SVG markup as strings, implementing section 5.5:

- `scene(state, config, { dims, pole })` returns a complete `<svg>` of one sign on its grade line. Used for the hero, the title block thumbnail and the print sheet.
- `lineup(config)` returns the standard sizes on one grade line with the scale pole.
- `anatomy()` and `option(kind)` return the stage 4 drawings.

**Fitting the lettering without measuring in the browser.** Measuring text with canvas depends on the web font having loaded, and gives wrong sizes when it has not. Instead, commit a small table of advance widths: a script (`scripts/glyph-widths.js`, run once and re-run only if a font changes) measures every printable ASCII and Latin-1 character in Besley 640 and Libre Franklin 600 and writes `glyph-widths.js`. The width of a line is the sum of its characters' widths plus tracking. This is the same in Node, in the Worker and in the browser, so the sign pre-rendered at build time is identical to the one the browser draws, and nothing shifts when the script starts.

On every state change the interface re-renders the drawing by replacing the container's markup inside a `requestAnimationFrame`, and updates the price text. It does nothing else. The preview has `role="img"` and an `aria-label` rebuilt from the state ("A monument sign reading Alder Creek Homeowners. 8 feet wide, arched top, stone-look base."). A visually hidden `aria-live="polite"` region announces the new total, debounced so it does not speak on every keystroke.

An attached logo that the browser can display (PNG, JPG, SVG) is drawn above the wording at up to 45% of the field height using an object URL. For other file types, show "Logo attached: {filename}. We will place it on your approval drawing." and draw the wording alone.

### 8.5 Sharing

A design link is the page URL with `?d=` followed by the state as compact JSON, base64url-encoded. On load, decode it, check every value against the config, replace anything unknown with the default, open the builder, and remove the parameter from the address bar with `history.replaceState` once applied. Links must keep working when the config's prices change, because they carry choices, not amounts.

---

## 9. Forms and payments

### 9.1 Custom quote form (`#quote`)

| Field | Type | Required |
|---|---|---|
| Your name | text | yes |
| Organization | text | no |
| Email | email | yes |
| Phone | tel | no |
| Best way to reach you | radio: Email, Phone | no, default Email |
| What do you need? | radio: A monument sign; Several signs; Something from More from our shop; Something else | yes |
| Tell us about it | textarea. Help: "Size, shape, where it will stand, anything you have seen and liked." | yes |
| Rough size | two short text fields, width and height | no |
| ZIP code where it will stand | text, five digits | yes |
| Do you need installation? | radio: Yes, No, Not sure | no |
| When do you need it? | radio: No fixed date; Within three months; By a date (reveals a date field) | no |
| Files | file input, multiple. Help: "Logos, sketches or photos of the site. Up to five files, 25 MB each." | no |
| How did you hear about us? | text | no |

Button: "Send quote request". Success, replacing the form: "Quote request sent. We will reply to {email} within {{response_time}}. Your reference is {reference}."

Validation runs on submit and then on blur. Messages say what to do: "Enter your name." "Enter an email address so we can reply." "Enter the five-digit ZIP code where the sign will stand." "Tell us a little about what you need." An error summary above the button links to each field: "{n} things need fixing before we can send this." If a file fails to upload but the request was saved: "Your request was sent, but {filename} did not upload. Reply to our confirmation email with the file attached."

Every form has a hidden honeypot field and Cloudflare Turnstile. Load the Turnstile script only when the visitor first focuses a form or opens a dialog, with explicit rendering, never on page load.

### 9.2 Endpoints

All under `/api/`, JSON in and out, implemented in the Worker.

| Endpoint | Does |
|---|---|
| `POST /api/uploads/start` | Verifies a Turnstile token and returns a short-lived signed upload token (15 minutes, at most five files). Turnstile tokens are single-use, so this token is what authorizes the following upload and submit requests. |
| `PUT /api/uploads/{token}/{n}` | Streams the raw request body to R2 (`request.body` straight into `put`, never buffered). Rejects a missing or over-25 MB `Content-Length` with 413 and a content type outside the allowlist with 415 (PNG, JPEG, SVG, PDF, WebP, AI and EPS as `application/postscript` or `application/illustrator`, and `application/octet-stream` only with an allowed file extension). Returns the stored key. |
| `POST /api/requests` | A quote or drawing request: validates every field on the server, writes the record to D1, then emails the business and the customer. Authorized by a fresh Turnstile token or a valid upload token. Returns `{ reference }`. |
| `POST /api/designs/email` | Emails a design link to the address given. Turnstile, rate-limited. |
| `POST /api/checkout` | Takes the design state and contact details, re-prices on the server, writes an order to D1, creates a Stripe Checkout Session and returns its URL. The browser then navigates to it. |
| `POST /api/stripe/webhook` | Verifies the Stripe signature against the unmodified raw body, ignores event ids it has already stored, marks the order paid and sends the two deposit emails in `ctx.waitUntil`. Returns 2xx quickly. |
| `GET /api/orders/{session_id}` | For the return from Checkout: asks Stripe for the session and returns the amount, reference and payment status, so the "Reserved" message reflects what Stripe says rather than a URL parameter. |
| `POST /api/invoices/find` | Finds a Stripe invoice by number, requires the email to match the invoice's customer email, and returns a freshly fetched `hosted_invoice_url` only if the invoice is open. Turnstile, rate-limited. Any failure returns the same not-found response, so the endpoint cannot be used to test which invoice numbers exist. |
| `GET /api/files/{key}` | Serves an uploaded file to the business from a link in the notification email. The link carries an expiry (30 days) and an HMAC signature; without a valid one it returns 404. |

Server-side validation repeats every client rule, caps every string length, and never trusts a price, a file type or an id from the browser.

### 9.3 Deposit payment

Stripe-hosted Checkout by redirect. The site never loads Stripe.js and never sees card details, which keeps the page fast and the security surface small.

Call the Stripe REST API with `fetch` (no SDK). Create the session with: `mode=payment`; one line item using `price_data` with the server-computed deposit in cents and the product name "Deposit for monument sign {reference}"; `customer_creation=always` and `customer_email`; `invoice_creation[enabled]=true`, so the deposit appears in the customer's Stripe history; `client_reference_id` and `metadata[order_id]`, with the same id in `payment_intent_data[metadata]` because session metadata is not copied to the payment; an `Idempotency-Key` of the order id; `success_url` back to `/?reserved={CHECKOUT_SESSION_ID}#design`; `cancel_url` back to the page with the design intact. Send a pinned `Stripe-Version` header, using the current version shown in Stripe's API documentation on the day you build, and record it in the README.

Verify webhooks by hand as Stripe documents: HMAC-SHA256 of `"{timestamp}.{rawBody}"` with the signing secret, constant-time comparison against each `v1` signature, five-minute tolerance. Handle `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and treat the order as paid only when `payment_status` is `paid`.

### 9.4 Invoices and customer history

The business sends invoices from its Stripe dashboard; Stripe emails the customer a link to a hosted invoice page. The site adds two conveniences and no account system of its own:

- "Pay an invoice" opens the dialog in 7.6 and uses `/api/invoices/find`.
- "See your orders and payments" links to the Stripe customer portal login address held in `config.stripe_portal_url`. If that is empty, omit the link.

### 9.5 Storage and email

- **D1** holds three tables: `requests` (id, reference, type, created_at, name, email, phone, organization, zip, fields as JSON, design as JSON, file keys as JSON, lighting flag), `orders` (id, reference, created_at, name, email, zip, design as JSON, total, deposit, stripe_session_id, payment_status, paid_at) and `stripe_events` (id, received_at). Ship the schema as a migration file.
- **R2** holds uploads under `uploads/{request or order id}/{uuid}-{sanitized name}`. The bucket is private.
- **References** look like `MS-7K4Q2P`: six characters from an alphabet without 0, O, 1, I or L.
- **Email** goes through one `sendEmail()` function with two drivers: the Cloudflare `send_email` binding when it is configured, otherwise Resend over `fetch` when `RESEND_API_KEY` is set. Always write the record to D1 before sending, so a failed email never loses a request. Link to uploaded files; do not attach them.

### 9.6 When something is not configured yet

The front end must be complete and honest before any keys exist. Each endpoint checks for the bindings and secrets it needs and returns `503 { "error": "not_configured" }` if one is missing. The interface then says so plainly and offers the next best step, and never shows a success it cannot stand behind:

- Deposit: "Online deposits are not switched on yet. Request your approval drawing and we will send a payment link with it." and the drawing request becomes the primary action.
- Forms with no database: "This form is not switched on yet. Call {{phone}} or email {{email}}."
- Email not configured but the database is: the request succeeds, because it is saved.

---

## 10. Technical architecture

### 10.1 Repository layout

```
SPEC.md  PROGRESS.md  CLAUDE.md  README.md
design/                     reference comp and screenshots (not deployed)
content/site.config.json    every business fact, price, token and policy text
src/
  index.html                the page, with {{tokens}} and render slots
  css/site.css              one stylesheet, organized with @layer
  js/app.js                 entry point (type="module")
  js/builder/               state.js  pricing.js  draw.js  glyph-widths.js  ui.js  share.js
  js/forms.js
  fonts/                    the two WOFF2 files and their OFL license texts
  static/                   favicon.svg  robots.txt  _headers  404.html
worker/
  index.js                  routes /api/*
  api/                      one file per endpoint
  lib/                      stripe.js  email.js  turnstile.js  validate.js  sign.js
  migrations/0001_init.sql
scripts/                    build.js  glyph-widths.js  check-launch.js  check-scroll.js  og-image.js
tests/                      unit (node:test) and browser (Playwright) tests
dist/                       build output, git-ignored, the only directory Cloudflare serves
wrangler.jsonc  package.json
```

`package.json` has dev dependencies only (`wrangler`, and `playwright` for tests). Nothing is shipped to the browser from npm. Keep `.claude/`, skill folders, `design/`, `content/` and `tests/` out of `dist/`.

### 10.2 The build script

`scripts/build.js`, Node built-ins only, run by `npm run build`:

1. Reads `content/site.config.json`.
2. Renders into `src/index.html`: every `{{token}}`; the hero SVG, the size lineup and the stage 4 drawings from `draw.js`; the sizes table; the questions; the policy texts; the JSON-LD; and an inlined copy of the config values the browser needs. All content is therefore in the HTML as served, readable without JavaScript.
3. Copies CSS, JavaScript and fonts into `dist/assets/` with a content hash in each filename and rewrites the references, so those files can be cached forever.
4. Copies `static/` to the root of `dist/`.
5. Fails loudly if any token is unresolved or any referenced file is missing.

Every fact the owner has not confirmed is stored in the config as `{ "value": …, "confirmed": false }`; the build reads `.value`. `npm run build:production` additionally runs `scripts/check-launch.js`, which fails while `draft` is true or while any value is still marked unconfirmed. This is what stops a site with sample prices or unapproved policies from going live.

### 10.3 Cloudflare

One Worker with static assets (Cloudflare's current recommendation for new projects, in place of Pages). Static files are served directly and cost no Worker invocation; Worker code runs only for `/api/*`.

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "monument-signs",
  "main": "worker/index.js",
  "compatibility_date": "<today's date when you scaffold>",
  "observability": { "enabled": true },
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [{ "binding": "DB", "database_name": "monument-signs" }],
  "r2_buckets": [{ "binding": "UPLOADS", "bucket_name": "monument-signs-uploads" }],
  "vars": { "SITE_URL": "", "TURNSTILE_SITE_KEY": "", "NOTIFY_EMAIL": "", "FROM_EMAIL": "" }
}
```

`run_worker_first` on `/api/*` matters: without it, a browser navigation to an API path that matches no file is answered with the 404 page and never reaches the Worker. Secrets, set with `wrangler secret put` and held locally in a git-ignored `.dev.vars`: `STRIPE_SECRET_KEY` (a restricted key limited to Checkout Sessions write and Invoices read), `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `SIGNING_SECRET` (for upload tokens and file links), and `RESEND_API_KEY` only if Resend is used. Use Turnstile's published test keys in local development. Verify each of these settings against Cloudflare's current documentation when you scaffold, since option names change; if the documentation and this section disagree, the documentation wins and you note the difference in `PROGRESS.md`.

`dist/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'

/assets/*
  Cache-Control: public, max-age=31556952, immutable
```

That policy allows no inline scripts and no inline `style` attributes, so write neither. SVG presentation attributes and styles set from JavaScript through the CSSOM are fine. `_headers` does not apply to Worker responses, so set `Content-Type`, `Cache-Control: no-store` and `X-Content-Type-Options` in code on every API response.

Do not deploy to production. Run and test locally with `npx wrangler dev`. If Cloudflare credentials are available in the session and the person you are working with asks for it, publish a preview with `npx wrangler preview`; otherwise leave deployment as documented steps in the README.

### 10.4 CSS

One file, organized with cascade layers so specificity never becomes a fight: `@layer reset, tokens, base, layout, components, drawing, utilities, print;`. Custom properties for every token in section 5. Modern CSS is welcome where it removes JavaScript: grid and subgrid, container queries, `:has()`, `clamp()`, logical properties, `color-mix()`, `text-wrap`, `accent-color`, `:focus-visible`, native `<details>` and `<dialog>`. Class names describe the thing (`.sign-stage`, `.price-line`), not its appearance.

### 10.5 Performance

Scrolling at 60fps is a hard requirement, and on a page like this it is won by leaving things out.

- No `scroll`, `wheel` or `touchmove` listeners. Use IntersectionObserver for the header rule and the title block. Use `position: sticky` for everything that sticks.
- No parallax, no scroll-linked animation, no smooth-scroll library. `scroll-behavior: smooth` only inside `@media (prefers-reduced-motion: no-preference)`. Give every anchor target a `scroll-margin-top` equal to the header height.
- No `backdrop-filter`, no CSS or SVG `filter`, no blurred `box-shadow`, no `background-attachment: fixed`, no gradients, no fixed full-viewport overlays other than an open dialog's backdrop.
- Animate only `transform` and `opacity`. Never `transition: all`. No `will-change` left on at rest.
- The page is static HTML. JavaScript enhances it: with scripts disabled, every word, price, drawing and policy is still there, and the forms explain how to reach the business.
- The script is one module graph loaded with `type="module"` (deferred by default). Nothing third-party loads with the page: Turnstile loads on first interaction with a form, and Stripe is a redirect.
- Fonts are preloaded, self-hosted and metric-matched to their fallbacks. Every image has explicit dimensions. Layout must not shift.
- Budgets, compressed: HTML at most 50 KB, CSS 14 KB, JavaScript 30 KB in total, fonts 70 KB. Core Web Vitals on a simulated mid-range phone: LCP under 1.8 s, CLS under 0.02, total blocking time under 100 ms.

### 10.6 Accessibility

WCAG 2.2 AA. Semantic landmarks and one `h1`; heading levels never skip. Every control reachable and operable by keyboard, with a visible focus ring. Labels on every field; errors tied to fields. Touch targets at least 44px on phones. All text at least 4.5:1. The page works at 200% zoom and at 320px wide without horizontal scrolling. Motion respects `prefers-reduced-motion`. Drawings have text alternatives; decorative drawings are hidden from assistive technology. Dialogs return focus to the control that opened them.

### 10.7 Browser support

The current and previous major versions of Chrome, Edge, Safari and Firefox, on desktop and phone. Where a newer CSS feature is missing, the page must still read and work, even if less refined.

---

## 11. Search and sharing

- One `h1`. A canonical link to the site root. `lang="en"`.
- Open Graph and Twitter card tags, with an image generated by `scripts/og-image.js`: a 1200×630 screenshot of the hero sign on paper, saved as a static PNG.
- JSON-LD, generated at build: an `Organization` with name, phone, email and `areaServed` United States; a `Service` for custom monument signs; `Offer`s for the standard sizes, emitted only when `draft` is false; and a `FAQPage` built from the questions in 7.8.
- `robots.txt` allowing everything, and a one-URL `sitemap.xml`. While `draft` is true, add `<meta name="robots" content="noindex">` so a preview is never indexed with sample prices.
- An SVG favicon: the sign's arched outline in sign-green.

A single page limits how many search phrases the site can rank for. That is accepted for now. The section ids and the config-driven build are arranged so that sizes, materials, installation and questions can later become their own pages without rewriting content.

---

## 12. Definition of done

The work is finished when every check below passes and you can show the evidence for each: the command and its output, or the screenshot. Wire each one to an npm script so it can be re-run.

| Check | Passes when |
|---|---|
| `npm run build` | Exits 0 and writes `dist/` with no unresolved tokens. |
| `npm test` (unit, `node:test`) | Pricing: every option, per-size prices, an unpriced option, deposit rounding. Sharing: a state survives encode and decode; unknown values fall back to defaults. Drawing: the same state always yields the identical string, and the hero pre-rendered in `dist/index.html` equals what `draw.js` returns for the default state. Server validation rejects bad input. Webhook signature verification accepts a valid signature and rejects a tampered body and a stale timestamp. |
| `npm run test:browser` (Playwright) | Typing a name changes the sign and brings up the title block. Every option changes the drawing and the price. "On posts" disables pillars. A copied design link reopens the same sign in a fresh context. The print sheet renders on one page. The quote form shows the specified messages. With the API unconfigured, each form shows its honest fallback. The whole builder can be completed with the keyboard alone. No console errors. No horizontal scroll at 320px wide. With JavaScript disabled, all content, prices and drawings are present. |
| `npm run check:rules` | A script scans `dist/` and fails on any of: a `scroll`, `wheel` or `touchmove` listener; `backdrop-filter`; a `filter` property or SVG `<filter>`; any `gradient(`; `text-transform: uppercase`; `transition: all`; `background-attachment: fixed`; a `box-shadow` with a blur radius; an inline `style` attribute or inline script; a font family other than the two specified; a request to any host other than the site itself, `challenges.cloudflare.com` and `static.cloudflareinsights.com`; the character "→"; an exclamation mark in page copy; the words financing, Poly-Armor, Foamcore, Peachtree Promise, Hammer Test, SAFEGUARD-COATING or Royal Treatment. |
| `npm run check:size` | The compressed budgets in 10.5 hold. |
| `npm run check:scroll` | A Playwright script scrolls the built page from top to bottom, in both hero states, at 1440×900 and with phone emulation at 4× CPU throttling, recording frames through the DevTools protocol. Desktop: at least 99% of frames within 16.7 ms. Throttled phone: no frame over 50 ms and no long task during the scroll. |
| Lighthouse (mobile, against `wrangler dev`) | Performance at least 95, accessibility 100, best practices 100; SEO 100 on a build made with `draft` off using test values. LCP, CLS and blocking time within 10.5. |
| Visual review | Screenshots of every section at 1440×900, 834×1112 and 390×844, in both hero states, saved to `design/review/`. Put the hero and the size lineup beside the reference comp and correct any difference in palette, type, line weight or shadow style. Read each screenshot against section 5.8 and remove anything on that list. |
| Copy review | Every heading, paragraph, label, button and message on the page matches section 7 word for word. |
| `npm run build:production` | Fails, naming `draft` and each unconfirmed value. At this stage that failure is the correct result: it proves the launch gate works. |

A check that cannot be run in your environment (for example, a live Stripe payment without keys) is reported as not verified, with the reason and what would be needed. It is not reported as passing.

---

## 13. Skills and tools

Use these to check and refine the work. None of them gets to change the design: where a skill's advice conflicts with this document, this document wins. Before installing anything, look at what is already available in the session, and read a skill's `SKILL.md` before you rely on it. Prefer skills that are plain markdown. Set `DO_NOT_TRACK=1` for any `npx` installer. If a skill cannot be installed, carry on without it; sections 5 and 10 already contain the rules that matter.

| Skill | Use it for | Install if missing |
|---|---|---|
| **frontend-design** (Anthropic, official) | The build itself. Treat sections 5 and 6 as the plan its process asks for, already made and approved, so skip its planning step. Do run its critique step: screenshots, self-review, remove one thing. | `claude plugin install frontend-design@claude-plugins-official` |
| **Impeccable** (pbakaus/impeccable) | Critique and polish after the build. Run `critique` on each section, then `typeset`, then `quieter` or `distill` if anything reads as loud, then `polish`, then `audit`. Also run its rule detector on the built page: `npx impeccable detect dist/index.html`, and again against the local server URL. | Without its hooks: clone the repository, then `mkdir -p .claude/skills && cp -r <clone>/.claude/skills/impeccable .claude/skills/`. Record the commit you used. |
| **web-design-guidelines** (Vercel) | An accessibility and interface audit of the HTML, CSS and JavaScript files. | `npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines -a claude-code` |
| **review-animations**, **animation-performance** (emilkowalski/skills) | A check of the one hero animation and the few interface transitions. Give each a concrete question; invoked with none, they only greet. | `npx skills@latest add emilkowalski/skills --skill review-animations`, and the same for `animation-performance` |
| **better-typography** (jakubkrehel/skills) | Optional second opinion on type settings. | `npx skills add jakubkrehel/skills --skill better-typography` |
| **Cloudflare skills** (`wrangler`, `workers-best-practices`, `web-perf`, `turnstile-spin`, `cloudflare-email-service`) | Scaffolding and checking the Worker, Turnstile, email and Core Web Vitals. | `claude plugin install cloudflare@claude-plugins-official` |
| **design:accessibility-review**, **design:design-critique** | A final accessibility pass and a hierarchy check, if these are present in the session. | Use only if already available. |
| A browser | Playwright for screenshots, the browser tests and the scroll trace. Use the session's pre-installed Chromium if it has one, and do not install another. | |

How to handle what these tools say:

- Impeccable treats a marketing page as something that should be bolder. Do not act on any advice to add color, boldness, delight or motion, and do not run its `shape`, `init`, `live`, `bolder`, `colorize`, `delight`, `overdrive` or `animate` commands. Its detector will flag choices that are deliberate here (a serif display face, hairline rules); waive those rather than changing them.
- The Vercel guidelines assume React in places and prefer Title Case headings. Ignore the framework-specific parts, and keep sentence case.
- Accept a finding when it fixes a real defect (contrast, focus, spacing rhythm, an orphaned word, a missing label, a slow frame) without changing the direction. Decline it when it would add an element, a color, an effect or a section. Note what you declined and why in `PROGRESS.md`.

Do not install or use `taste-skill` or `ui-ux-pro-max`. Both replace the design decisions in this document with their own: the first deals out a palette, typefaces and hero layout by script and requires a motion layer and photography; the second generates a design system from a catalogue and assumes Tailwind.

---

## 14. How to work

**Order.** Each step ends with a commit and a line in `PROGRESS.md`.

1. Set up: scaffold the repository as in 10.1; write a short `CLAUDE.md` (under 60 lines) holding the five hard constraints, the precedence rule, the npm commands and a pointer to this file; create `PROGRESS.md` with this list and the checks from section 12 as a checklist; add the fonts.
2. The static page: tokens, base styles, every section with its final copy, the build script. No JavaScript yet. Take screenshots and review them.
3. Drawing: the glyph-width table, `draw.js`, and the pre-rendered hero, size lineup and stage 4 drawings. Compare with the reference comp.
4. The builder: state, pricing, the interface, the title block, sharing, the print sheet, with their tests.
5. Forms and the Worker: endpoints, D1 schema, R2 uploads, email, Turnstile, Stripe Checkout, the webhook and invoice lookup, with their tests and the not-configured paths.
6. Critique and polish with the skills in section 13; accessibility; performance; search and sharing assets.
7. Run every check in section 12, write the README (setup, configuration, how the owner changes prices and text, deployment, the launch checklist), and report.

**Keeping track.** `PROGRESS.md` is the record of state: the checklist, a "Decisions made" list, a "Declined suggestions" list and a "Not verified" list. Update it as you go, so the work can be picked up after an interruption from the file and the git history alone.

**Scope.** Deliver what this document asks for, at the scope it describes. Make routine judgment calls yourself. If you conclude that something here is mistaken or that a better approach exists, say so in a sentence and continue with the task as specified. Finish the whole task, not just the visible part of it.

**What is not a finish.** A plan, a progress summary, a working front end without the Worker, a passing build with failing checks, or a list of questions about the owner's missing facts. Those facts are config values with sample data, by design.

**When to stop and ask.** Only when you need a credential you have not been given, or when two of the hard constraints in section 2 cannot both be satisfied.

**Delegation.** Do the work in the main thread. Use a subagent only for a large, genuinely independent track, and never to re-check your own work.

**Reporting.** Give a short update at each of the seven steps. In the final report, lead with what was built and whether every check passed; then what could not be verified and why; then the owner's outstanding items from section 15. Plain sentences, no jargon you invented along the way.

---

## 15. What the owner still has to supply

Every item below is a value in `content/site.config.json`, shipped with the sample shown and marked unconfirmed. The site builds and works with the samples; it cannot be launched until each is confirmed.

| Item | Sample used meanwhile |
|---|---|
| Business name, legal name | "Business Name" |
| Phone, email, hours, mailing address | "(555) 010-0199", "hello@example.com", empty, empty |
| The standard sizes | The four in section 8.3 |
| Prices for each size, single and double-sided, and for installation | The round sample numbers in 8.3 |
| Price of each option, flat or per size | The round sample numbers in 8.3 |
| The full list of top shapes and paint colors offered | Four shapes, twelve paints |
| Whether installation is one price nationwide or depends on location | One price per size |
| Whether delivery is included in the listed price | Included |
| Deposit percentage | 50 |
| Lead time from approval | "four to six weeks" |
| How quickly quotes are answered and drawings sent | "one business day", "three business days" |
| Whether the approval drawing is free before a deposit, and how many revisions | Free; changes until it is right |
| Cancellation and refund terms | As drafted in 7.6 |
| Warranty length, coverage and exclusions | "five" years; "It does not cover damage from vehicles, vandalism or storms." |
| Days allowed to report delivery damage | "14" |
| Whether the business or its installers handle permits and engineered drawings | Empty permit statement; fees listed as not included |
| Whether delivery-only orders are accepted | Accepted |
| What "certified installer" means: certified by whom | Not stated on the site |
| Whether nationwide includes Alaska and Hawaii | Not stated on the site |
| The structure and core material of the monument | Written generally |
| Whether these are offered: a new face on an existing base, repair and refinishing, LED message boards, a trade program | Not mentioned on the site |
| Photographs of real signs, with captions | None; the section is omitted |
| Privacy text | The short default in 7.10 |
| Stripe account, customer portal link, email-sending choice (Cloudflare or Resend), domain | Not configured |

