// The drawing language (SPEC §5.5). Pure functions that return SVG markup as strings.
// No DOM, no clock, no randomness: the same input always yields the identical string, so the
// sign pre-rendered at build time is exactly what the browser draws.
//
// Units are inches. Grade (ground level) is y = 0 and up is negative y. Light comes from the
// upper left at 45 degrees, so anything raised casts a crisp, flat shadow down and to the right.
import { SERIF, SANS, SERIF_EXTRA, SANS_EXTRA } from './glyph-widths.js';

export const COLOR = {
  ink: '#1B211E', inkSoft: '#4C544F', rule: '#9DA29B', raised: '#F7F5EE',
  stone: '#C8C6BB', stoneShade: '#A9A79B', metal: '#8E918B', paper: '#ECEDE8',
};
export const HEADLINE = ['Monument signs.', 'Nothing else.'];
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const NSS = 'vector-effect="non-scaling-stroke"';

// Short, deterministic number formatting.
const n = (v) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- color ----------
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// color-mix(in oklab, <hex> 78%, black), computed once so shadows follow any paint color.
export function shade(hex, amount = 0.78) {
  const [r, g, b] = hexRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = (0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s) * amount;
  const A = (1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * amount;
  const B = (0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s) * amount;
  const l2 = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m2 = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s2 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2,
    -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2,
    -0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2,
  ];
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// WCAG contrast ratio between two hex colors.
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = hexRgb(hex).map(toLin);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ---------- words ----------
const NBSP = ' ';
export function ftIn(inches, { long = false } = {}) {
  const t = Math.round(inches);
  const f = Math.floor(t / 12), i = t % 12;
  if (long) {
    const fp = `${f}${NBSP}${f === 1 ? 'foot' : 'feet'}`;
    return i ? `${fp} ${i}${NBSP}${i === 1 ? 'inch' : 'inches'}` : fp;
  }
  return i ? (f ? `${f}${NBSP}ft ${i}${NBSP}in` : `${i}${NBSP}in`) : `${f}${NBSP}ft`;
}
export const sizeWords = (size) => `${ftIn(size.face_w)} × ${ftIn(size.face_h)}`;
const primes = (inches) => {
  const t = Math.round(inches);
  return `${Math.floor(t / 12)}′-${t % 12}″`;
};

// ---------- lettering ----------
function charWidth(ch, sans) {
  const c = ch.charCodeAt(0);
  const table = sans ? SANS : SERIF;
  if (c >= 32 && c <= 126) return table[c - 32];
  if (c >= 160 && c <= 255) return table[c - 160 + 95];
  const extra = (sans ? SANS_EXTRA : SERIF_EXTRA)[c];
  return extra ?? (sans ? 600 : 640);
}
// Width of a line in ems: the sum of its characters' advance widths plus tracking (-0.012em).
export function lineWidthEm(line, sans = false) {
  let w = 0;
  for (const ch of line) w += charWidth(ch, sans) / 1000 - 0.012;
  return w;
}

// ---------- geometry ----------
const RISE = { flat: 0, arch: 0.075, peak: 0.1, shoulder: 0.06 };

function topPath(x0, W, T, R, shape) {
  if (shape === 'arch') return `M${n(x0)} ${n(T)}Q${n(x0 + W / 2)} ${n(T - 2 * R)} ${n(x0 + W)} ${n(T)}`;
  if (shape === 'peak') return `M${n(x0)} ${n(T)}L${n(x0 + W / 2)} ${n(T - R)}L${n(x0 + W)} ${n(T)}`;
  if (shape === 'shoulder') {
    const s = W * 0.2;
    return `M${n(x0)} ${n(T)}H${n(x0 + s)}L${n(x0 + s + R)} ${n(T - R)}H${n(x0 + W - s - R)}L${n(x0 + W - s)} ${n(T)}H${n(x0 + W)}`;
  }
  return `M${n(x0)} ${n(T)}H${n(x0 + W)}`;
}
const shapePath = (x0, W, T, H, R, shape) => `${topPath(x0, W, T, R, shape)}V${n(T + H)}H${n(x0)}Z`;

// Everything about one sign's layout, at panel left edge x.
export function geometry(state, config, x = 0) {
  const size = config.pricing.sizes.find((s) => s.id === state.size) || config.pricing.sizes[0];
  const w = size.face_w, h = size.face_h, baseH = size.base_h;
  const b = Math.max(2.6, w * 0.058);
  const d = Math.max(0.5, w * 0.009);
  const rise = w * (RISE[state.shape] ?? 0);
  const onPosts = state.base === 'posts';
  const pillars = !onPosts && state.pillars !== 'none' ? state.pillars : null;
  const T = -(baseH + 2.6 + h);                 // y of the panel's top corners
  const pw = pillars ? Math.max(10, w * 0.13) : onPosts ? Math.max(4, w * 0.05) : 0;
  const pillarTop = T - rise - 6;
  const capH = pillars === 'peak' ? 1.5 + pw * 0.32 : 2.6;
  const postTop = T - 3;
  let top = T - rise;
  if (pillars) top = Math.min(top, pillarTop - capH);
  if (onPosts) top = Math.min(top, postTop - 1.2);
  let left = x, right = x + w;
  if (pillars || onPosts) { left = x - pw; right = x + w + pw; }
  // the cap slab overhangs the panel by 6 in; it is trim, not part of the overall width
  const visLeft = pillars ? (onPosts ? left : left - 2) : onPosts ? left - 1 : x - 6;
  const visRight = pillars ? right + 2 : onPosts ? right + 1 : x + w + 6;
  return { size, x, w, h, baseH, b, d, rise, T, pw, pillars, onPosts, pillarTop, capH, postTop, top, left, right, visLeft, visRight };
}

// ---------- parts ----------
const stroke = (c, wpx) => `stroke="${c}" stroke-width="${wpx}" ${NSS}`;
const OUTLINE = stroke(COLOR.ink, 1.25);

function stoneBlock(x, y, W, H, courses, simple, pattern) {
  const ch = H / courses;
  let joints = '';
  for (let i = 1; i < courses; i++) joints += `M${n(x)} ${n(y + ch * i)}h${n(W)}`;
  if (!simple) {
    for (let i = 0; i < courses; i++) {
      for (const p of pattern[i % pattern.length]) joints += `M${n(x + W * p)} ${n(y + ch * i)}v${n(ch)}`;
    }
  }
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(W)}" height="${n(H)}" fill="${COLOR.stone}" ${OUTLINE}/>` +
    `<path d="${joints}" fill="none" ${stroke(COLOR.stoneShade, 1)}/>`;
}
const BASE_JOINTS = [[0.11, 0.29, 0.44, 0.63, 0.8, 0.92], [0.06, 0.2, 0.38, 0.55, 0.71, 0.86], [0.14, 0.33, 0.49, 0.66, 0.83, 0.95]];
const PILLAR_JOINTS = [[0.5], [0.28, 0.74], [0.5], [0.3, 0.7]];

function base(g, state, simple) {
  if (g.onPosts) return '';
  const stone = state.base === 'stone';
  const bx = g.pillars ? g.x : g.x - 4, bw = g.pillars ? g.w : g.w + 8, by = -g.baseH;
  const cx = g.pillars ? g.x : g.x - 6, cw = g.pillars ? g.w : g.w + 12;
  let s = stone
    ? stoneBlock(bx, by, bw, g.baseH, 3, simple, BASE_JOINTS) +
      `<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(Math.min(1, g.d))}" fill="${COLOR.stoneShade}"/>`
    : `<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(g.baseH)}" fill="${COLOR.raised}" ${OUTLINE}/>`;
  s += `<rect x="${n(cx)}" y="${n(by - 2.6)}" width="${n(cw)}" height="2.6" fill="${COLOR.raised}" ${OUTLINE}/>`;
  return s;
}

function posts(g) {
  if (!g.onPosts) return '';
  let s = '';
  for (const px of [g.x - g.pw, g.x + g.w]) {
    s += `<rect x="${n(px)}" y="${n(g.postTop)}" width="${n(g.pw)}" height="${n(-g.postTop)}" fill="${COLOR.raised}" ${OUTLINE}/>`;
    s += `<rect x="${n(px - 1)}" y="${n(g.postTop - 1.2)}" width="${n(g.pw + 2)}" height="1.2" fill="${COLOR.raised}" ${OUTLINE}/>`;
  }
  return s;
}

function pillars(g, state, simple) {
  if (!g.pillars) return '';
  const stone = state.base === 'stone';
  let s = '';
  for (const px of [g.x - g.pw, g.x + g.w]) {
    const H = -g.pillarTop;
    s += stone
      ? stoneBlock(px, g.pillarTop, g.pw, H, Math.max(4, Math.round(H / 9)), simple, PILLAR_JOINTS)
      : `<rect x="${n(px)}" y="${n(g.pillarTop)}" width="${n(g.pw)}" height="${n(H)}" fill="${COLOR.raised}" ${OUTLINE}/>`;
    if (g.pillars === 'peak') {
      const sy = g.pillarTop - 1.5;
      s += `<rect x="${n(px - 1)}" y="${n(sy)}" width="${n(g.pw + 2)}" height="1.5" fill="${COLOR.raised}" ${OUTLINE}/>`;
      s += `<path d="M${n(px - 1)} ${n(sy)}L${n(px + g.pw / 2)} ${n(sy - g.pw * 0.32)}L${n(px + g.pw + 1)} ${n(sy)}Z" fill="${COLOR.raised}" ${OUTLINE}/>`;
    } else {
      s += `<rect x="${n(px - 2)}" y="${n(g.pillarTop - 2.6)}" width="${n(g.pw + 4)}" height="2.6" fill="${COLOR.raised}" ${OUTLINE}/>`;
    }
  }
  return s;
}

function paint(config, id, fallback) {
  const p = (config.paints || []).find((x) => x.id === id);
  return p ? p.hex : fallback;
}

// The panel, its recessed field, cast shadows and lettering.
function face(g, state, config, { simple, uid, logo, intro }) {
  const fieldHex = paint(config, state.field, '#1F4A3A');
  const raisedHex = paint(config, state.raised, COLOR.raised);
  const shadowHex = shade(fieldHex);
  const { x, w, h, b, d, rise, T } = g;
  const shapeName = state.shape;
  const fx = x + b, fw = w - 2 * b, fT = T + b, fh = h - 2 * b, fr = rise * (1 - (2 * b) / w);
  const panel = shapePath(x, w, T, h, rise, shapeName);
  const field = shapePath(fx, fw, fT, fh, fr, shapeName);
  const cut = state.lettering === 'metal' || state.lettering === 'acrylic';
  const depth = cut ? 2 * d : d;
  const letterFill = state.lettering === 'metal' ? COLOR.metal : raisedHex;
  const lift = intro ? ' class="lift"' : '';
  const clipId = `f${uid}`;

  // Lettering: centered, as large as fits.
  const lines = (state.lines || []).map((l) => String(l).trim()).filter(Boolean);
  const sans = state.style === 'sans';
  let regionTop = fT, regionH = fh, logoSvg = '';
  if (logo && logo.href) {
    const lh = fh * 0.4;
    const lw = fw * 0.62;
    logoSvg = `<image href="${esc(logo.href)}" x="${n(x + w / 2 - lw / 2)}" y="${n(fT + fh * 0.06 - fr * 0.3)}" width="${n(lw)}" height="${n(lh)}" preserveAspectRatio="xMidYMid meet"/>`;
    regionTop = fT + fh * 0.5;
    regionH = fh * 0.5;
  }
  let text = '';
  if (lines.length) {
    const widest = Math.max(...lines.map((l) => lineWidthEm(l, sans)));
    const size = Math.min(regionH / (lines.length * 1.5), (fw * 0.86) / Math.max(widest, 0.01));
    const lead = size * 1.24;
    const cy = regionTop + regionH / 2 - (logo ? 0 : fr * 0.25);
    const y0 = cy - (lead * (lines.length - 1)) / 2 + size * 0.36;
    const cls = sans ? 'lt lt-sans' : 'lt';
    const row = (fill, extra = '') => lines.map((l, i) =>
      `<text x="${n(x + w / 2)}" y="${n(y0 + i * lead)}"${extra} fill="${fill}">${esc(l)}</text>`).join('');
    const steps = simple ? 3 : 8;
    let shadow = '';
    for (let s = 1; s <= steps; s++) {
      const o = n((depth * s) / steps);
      shadow += `<g transform="translate(${o} ${o})"${lift}>${row(shadowHex)}</g>`;
    }
    text = `<g class="${cls}" text-anchor="middle" font-size="${n(size)}">${shadow}${row(letterFill)}</g>`;
  }

  return `<defs><clipPath id="${clipId}"><path d="${field}"/></clipPath></defs>` +
    `<path d="${panel}" fill="${raisedHex}" ${OUTLINE}/>` +
    `<g clip-path="url(#${clipId})">` +
      // The field in shadow, then the lit field shifted by the relief depth: what is left
      // uncovered is the shadow the raised border casts along the top and left edges.
      `<path d="${field}" fill="${shadowHex}"/>` +
      `<path d="${field}" fill="${fieldHex}" transform="translate(${n(d)} ${n(d)})"${lift}/>` +
      logoSvg + text +
    `</g>` +
    `<path d="${field}" fill="none" ${stroke(COLOR.ink, 1)}/>`;
}

// Grade line with 45-degree earth hatching beneath it, about 26 strokes across the drawing.
function grade(x0, x1, count = 26) {
  const step = (x1 - x0) / count, len = step * 0.34;
  let hatch = '';
  for (let x = x0 + step / 2; x < x1 - len; x += step) hatch += `M${n(x)} ${n(len * 1.5)}l${n(len)} ${n(-len)}`;
  return `<path d="${hatch}" fill="none" ${stroke(COLOR.rule, 1)}/>` +
    `<path d="M${n(x0)} 0H${n(x1)}" fill="none" ${stroke(COLOR.ink, 1.5)}/>`;
}

// Overall width above the sign, overall height at the left, figures in a gap in each line.
function dimensions(g, fs, intro) {
  const W = g.right - g.left, H = -g.top, cx = g.left + W / 2;
  const dy = g.top - fs * 2.7, dx = g.left - fs * 4.4, mid = -H / 2;
  const gap = fs * 2.3, vgap = fs * 1.2, t = fs * 0.42;
  const ink = `fill="none" ${stroke(COLOR.inkSoft, 1)}`;
  const tick = `fill="none" ${stroke(COLOR.inkSoft, 1.75)}`;
  const a = (cls) => (intro ? ` class="${cls}"` : '');
  return `<g class="dims">` +
    // extension marks and slash ticks
    `<path d="M${n(g.left)} ${n(dy - fs * 0.9)}V${n(dy + fs * 1.5)}M${n(g.right)} ${n(dy - fs * 0.9)}V${n(dy + fs * 1.5)}` +
      `M${n(dx - fs * 0.9)} ${n(-H)}H${n(dx + fs * 1.5)}M${n(dx - fs * 0.9)} 0H${n(dx + fs * 1.5)}" ${ink}${a('dim-end')}/>` +
    `<path d="M${n(g.left - t)} ${n(dy + t)}l${n(2 * t)} ${n(-2 * t)}M${n(g.right - t)} ${n(dy + t)}l${n(2 * t)} ${n(-2 * t)}` +
      `M${n(dx - t)} ${n(-H + t)}l${n(2 * t)} ${n(-2 * t)}M${n(dx - t)} ${n(t)}l${n(2 * t)} ${n(-2 * t)}" ${tick}${a('dim-end')}/>` +
    // the four half-lines, each drawn outward from its figure
    `<path d="M${n(cx - gap)} ${n(dy)}H${n(g.left)}" ${ink}${a('dim-l')}/>` +
    `<path d="M${n(cx + gap)} ${n(dy)}H${n(g.right)}" ${ink}${a('dim-r')}/>` +
    `<path d="M${n(dx)} ${n(mid - vgap)}V${n(-H)}" ${ink}${a('dim-t')}/>` +
    `<path d="M${n(dx)} ${n(mid + vgap)}V0" ${ink}${a('dim-b')}/>` +
    `<text class="dim" x="${n(cx)}" y="${n(dy + fs * 0.36)}" font-size="${n(fs)}" text-anchor="middle">${primes(W)}</text>` +
    `<text class="dim" x="${n(dx)}" y="${n(mid + fs * 0.36)}" font-size="${n(fs)}" text-anchor="middle">${primes(H)}</text>` +
    `</g>`;
}

// The sign itself (no grade, no dimensions), at panel left edge g.x.
function monument(g, state, config, opts) {
  return base(g, state, opts.simple) + posts(g) + pillars(g, state, opts.simple) + face(g, state, config, opts);
}

// Text alternative for a drawing of the state.
export function describe(state, config) {
  const g = geometry(state, config);
  const opt = (group, id) => (config.options?.[group] || []).find((o) => o.id === id) || {};
  const lines = (state.lines || []).map((l) => String(l).trim()).filter(Boolean);
  const words = lines.join(' ');
  const reading = lines.length ? `A monument sign reading ${words}${/[.?]$/.test(words) ? '' : '.'}` : 'A monument sign with a blank face.';
  const parts = [`${ftIn(g.right - g.left, { long: true })} wide`, opt('shape', state.shape).words];
  const mount = state.base === 'posts' ? 'on posts' : opt('base', state.base).words;
  if (mount) parts.push(mount);
  if (g.pillars) parts.push(opt('pillars', state.pillars).words);
  if (state.lettering !== 'routed') parts.push(opt('lettering', state.lettering).words);
  if (state.sides === 2) parts.push('double-sided');
  return `${reading} ${parts.filter(Boolean).join(', ')}.`.replace(/ /g, ' ');
}

// One sign on its grade line. Options:
//   dims    draw the overall dimension lines
//   aspect  pad the viewBox to this width/height ratio, so the frame never changes shape
//   simple  small-drawing detail (3 shadow copies, courses only)
//   intro   mark parts for the first-load animation
//   label   aria-label; when omitted the drawing is decorative (aria-hidden)
//   logo    { href } of an image to draw above the wording
//   uid     id prefix for the clip path
export function scene(state, config, opts = {}) {
  const { dims = false, aspect = null, simple = false, intro = false, label = null, logo = null, uid = 'h', cls = '' } = opts;
  const g = geometry(state, config, 0);
  const W0 = g.visRight - g.visLeft, H0 = -g.top;
  // dimension figure size is a fixed fraction of the frame width, so its screen size is
  // predictable from the container width alone (see DIM_FRACTION)
  let x0, x1, y0, y1;
  const margin = W0 * 0.05;
  if (dims) {
    // solve for the frame width so that fs = DIM_FRACTION * frame width
    let vbW = (W0 + margin * 2) * 1.6;
    for (let i = 0; i < 4; i++) {
      const fs = DIM_FRACTION * vbW;
      x0 = g.left - fs * 6.2; x1 = g.visRight + margin;
      vbW = x1 - x0;
    }
    const fs = DIM_FRACTION * vbW;
    y0 = g.top - fs * 4.2;
  } else {
    x0 = g.visLeft - margin; x1 = g.visRight + margin;
    y0 = g.top - margin * 0.6;
  }
  const step = (x1 - x0) / 26;                 // hatch spacing, fixed before any padding
  y1 = step * 0.34 * 1.5 + 0.6;
  let vw = x1 - x0, vh = y1 - y0;
  if (aspect) {
    if (vw / vh > aspect) { const nh = vw / aspect; y0 -= nh - vh; vh = nh; }
    else { const nw = vh * aspect; x0 -= (nw - vw) / 2; x1 += (nw - vw) / 2; vw = nw; }
  }
  const fs = DIM_FRACTION * vw;
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg ${NS} class="sign-svg${cls ? ' ' + cls : ''}${intro ? ' intro' : ''}" viewBox="${n(x0)} ${n(y0)} ${n(vw)} ${n(vh)}" ${a11y}>` +
    (dims ? dimensions(g, fs, intro) : '') +
    monument(g, state, config, { simple, uid, logo, intro }) +
    grade(x0, x0 + vw, Math.round(vw / step)) +
    `</svg>`;
}
// Dimension figures are this fraction of the drawing's frame width. They render at
// 12px or more once the drawing is at least 12 / DIM_FRACTION ≈ 522px wide.
export const DIM_FRACTION = 0.023;
export const DIMS_MIN_PX = Math.ceil(12 / DIM_FRACTION);

// The hero sign: one drawing with dimension lines and one without. A container query shows
// the first only where its figures render at 12px or more (SPEC §5.5). Used by the build
// (pre-rendered, with the intro animation) and by the browser on every change.
export const HERO_ASPECT = { dims: 1.55, plain: 1.44 };
export function hero(state, config, { intro = false, logo = null } = {}) {
  const label = describe(state, config);
  return `<div class="variant-dims">${scene(state, config, { dims: true, aspect: HERO_ASPECT.dims, intro, label, logo, uid: 'hd' })}</div>` +
    `<div class="variant-plain">${scene(state, config, { aspect: HERO_ASPECT.plain, intro, label, logo, uid: 'hp' })}</div>`;
}

// A six-foot scale pole in alternating one-foot bands.
function pole(x) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += `<rect x="${n(x)}" y="${n(-(i + 1) * 12)}" width="1.6" height="12" fill="${i % 2 ? COLOR.raised : COLOR.ink}" ${stroke(COLOR.ink, 1)}/>`;
  }
  return s;
}

// Lineup state: the default design's shape and base, with sample wording.
const LINEUP_WORDS = ['Alder', 'Creek'];
function lineupState(defaults, sizeId) {
  return { ...defaults, size: sizeId, lines: LINEUP_WORDS, lettering: 'routed', pillars: 'none' };
}

// The standard sizes side by side on one grade line at one scale, with the scale pole.
export function lineup(config, defaults, { label = '' } = {}) {
  const sizes = config.pricing.sizes;
  const geos = sizes.map((s) => geometry(lineupState(defaults, s.id), config));
  const maxW = Math.max(...geos.map((g) => g.visRight - g.visLeft));
  const maxH = Math.max(...geos.map((g) => -g.top));
  const col = maxW + 22;
  let body = '';
  sizes.forEach((s, i) => {
    const st = lineupState(defaults, s.id);
    const g = geometry(st, config, i * col + 14 - (geometry(st, config).visLeft - 0));
    body += monument(g, st, config, { simple: true, uid: `l${i}` });
  });
  const W = col * sizes.length + 2;
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg ${NS} class="lineup-svg" viewBox="-2 ${n(-(maxH + 6))} ${n(W)} ${n(maxH + 10)}" ${a11y}>` +
    body + pole(3) + grade(-2, W - 2, 34) + `</svg>`;
}

// One standard size in a frame shared by every size, so each phone drawing is at the same scale.
export function sizeAlone(config, defaults, sizeId) {
  const sizes = config.pricing.sizes;
  const geos = sizes.map((s) => geometry(lineupState(defaults, s.id), config));
  const maxW = Math.max(...geos.map((g) => g.visRight - g.visLeft));
  const maxH = Math.max(...geos.map((g) => -g.top));
  const st = lineupState(defaults, sizeId);
  const g0 = geometry(st, config);
  const g = geometry(st, config, (maxW - (g0.visRight - g0.visLeft)) / 2 - g0.visLeft + (g0.x - 0));
  return `<svg ${NS} class="size-svg" viewBox="-8 ${n(-(maxH + 6))} ${n(maxW + 16)} ${n(maxH + 10)}" aria-hidden="true" focusable="false">` +
    monument(g, st, config, { simple: true, uid: `s${sizeId}` }) + grade(-8, maxW + 8) + `</svg>`;
}

// Stage 4: anatomy of a routed face. A close-up of one corner in elevation, beside a
// cross-section through it, with three labels on thin leader lines.
export function anatomy(config, defaults) {
  const fieldHex = paint(config, defaults.field, '#1F4A3A');
  const raisedHex = paint(config, defaults.raised, COLOR.raised);
  const sh = shade(fieldHex);
  const d = 0.9, b = 4;
  // elevation: panel corner at (0,-30), view 34 wide x 30 tall, cropped right and bottom
  const fx = b, fy = -30 + b;
  const letter = 'A';
  const size = 21, lx = 17.5, ly = -6;
  let shadow = '';
  for (let s = 1; s <= 8; s++) {
    const o = n((d * s) / 8);
    shadow += `<text x="${lx}" y="${ly}" transform="translate(${o} ${o})" fill="${sh}">${letter}</text>`;
  }
  const elev =
    `<defs><clipPath id="anaView"><rect x="0" y="-30" width="34" height="30"/></clipPath>` +
    `<clipPath id="anaField"><rect x="${fx}" y="${fy}" width="40" height="40"/></clipPath></defs>` +
    `<g clip-path="url(#anaView)">` +
      `<rect x="0" y="-30" width="40" height="40" fill="${raisedHex}"/>` +
      `<g clip-path="url(#anaField)">` +
        `<rect x="${fx}" y="${fy}" width="40" height="40" fill="${sh}"/>` +
        `<rect x="${fx + d}" y="${fy + d}" width="40" height="40" fill="${fieldHex}"/>` +
        `<g class="lt" text-anchor="middle" font-size="${size}">${shadow}<text x="${lx}" y="${ly}" fill="${raisedHex}">${letter}</text></g>` +
      `</g>` +
      `<path d="M${fx} 0V${fy}H34" fill="none" ${stroke(COLOR.ink, 1)}/>` +
    `</g>` +
    `<path d="M0 0V-30H34" fill="none" ${OUTLINE}/>`;
  // section: a vertical cut through the face, drawn with the face toward the labels
  const sx = 40, t = 5, r = 1.4;            // back at sx; raised faces at sx + t, recessed faces at sx + t - r
  const lTop = ly - size * 0.7, lBot = ly;  // the letter's vertical extent along the cut
  const fr = sx + t, rc = sx + t - r;
  const section =
    `<path d="M${sx} -30H${fr}V${fy}H${n(rc)}V${n(lTop)}H${fr}V${lBot}H${n(rc)}V0H${sx}Z" fill="${raisedHex}" ${OUTLINE}/>` +
    `<path d="M${n(rc)} ${fy}V${n(lTop)}M${n(rc)} ${lBot}V0" fill="none" ${stroke(fieldHex, 3)}/>`;
  // labels to the right of the section, each on a short leader that ends at its surface
  const tx = fr + 6;
  const label = (y, x, words) =>
    `<path d="M${n(tx - 1)} ${n(y)}H${n(x + 0.6)}" fill="none" ${stroke(COLOR.inkSoft, 1)}/>` +
    `<circle cx="${n(x + 0.6)}" cy="${n(y)}" r="0.35" fill="${COLOR.inkSoft}"/>` +
    `<text class="ana-label" x="${n(tx)}" y="${n(y + 0.8)}">${words}</text>`;
  const labels =
    label(-28, fr, 'Raised border') +
    label((lTop + lBot) / 2, fr, 'Raised letter') +
    label(-3, rc, 'Recessed background');
  return `<svg ${NS} class="anatomy-svg" viewBox="-1 -32 ${n(tx + 31)} 34" role="img" aria-label="Close-up of a routed sign face with a cross-section through it: raised letter, recessed background and raised border.">` +
    elev + section + labels + `</svg>`;
}

// Stage 4: the four option drawings, every one in the same frame.
export function option(kind, config, defaults) {
  const big = config.pricing.sizes[config.pricing.sizes.length - 1].id;
  const st = { ...defaults, size: big, lines: LINEUP_WORDS, pillars: 'none', lettering: 'routed', base: 'stone', shape: 'arch' };
  if (kind === 'pillars') Object.assign(st, { pillars: 'peak', shape: 'flat' });
  if (kind === 'metal') Object.assign(st, { lettering: 'metal', base: 'plain', shape: 'flat' });
  if (kind === 'acrylic') Object.assign(st, { lettering: 'acrylic', base: 'plain', shape: 'flat' });
  return scene(st, config, { simple: true, aspect: 1.25, uid: `o${kind}`, cls: 'option-svg' });
}

// A tiny outline of a top shape, for the builder's shape choices.
export function shapeIcon(shape) {
  const W = 30, H = 16, R = W * (RISE[shape] ?? 0) * 1.6;
  return `<svg ${NS} class="shape-icon" viewBox="-2 ${n(-R - 2)} 34 ${n(H + R + 4)}" aria-hidden="true" focusable="false">` +
    `<path d="${shapePath(0, W, 0, H, R, shape)}" fill="none" ${stroke(COLOR.ink, 1.25)}/></svg>`;
}

// A paint swatch (an SVG rect, so no inline style is needed).
export function swatch(hex) {
  return `<svg ${NS} class="swatch" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<rect x="0.5" y="0.5" width="23" height="23" rx="2" fill="${hex}" stroke="${COLOR.inkSoft}" stroke-width="1"/></svg>`;
}
