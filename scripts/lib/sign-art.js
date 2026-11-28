// Illustrated monument signs for the marketing pages, drawn at build time as SVG.
// Unlike the sketcher's elevation drawing (src/js/builder/draw.js) this is a picture, not a
// document: painted faces with a sheen, gilded lettering, stone with tone, a soft ground shadow.
// Units are inches; y runs up as negative, the ground is y = 0. Pure: no clock, no randomness.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const n = (v) => Number(v.toFixed(2));

export const PAINT = { green: '#1F4A3A', navy: '#1F3558', burgundy: '#6A2430', charcoal: '#2B3033', teal: '#1E5A5F', ivory: '#F5EFDD' };
const STONE = ['#CFC8B8', '#BDB5A3', '#DAD4C6', '#C6BCA8', '#B3AB99'];

// The outline of a sign face between x0..x1, from its bottom yb up to its highest point yt.
function facePath(x0, x1, yb, yt, shape) {
  const w = x1 - x0, h = yb - yt, cx = (x0 + x1) / 2;
  if (shape === 'arch') { const r = h * 0.17; return `M${n(x0)} ${n(yb)}V${n(yt + r)}Q${n(cx)} ${n(yt - r)} ${n(x1)} ${n(yt + r)}V${n(yb)}Z`; }
  if (shape === 'peak') { const r = h * 0.2; return `M${n(x0)} ${n(yb)}V${n(yt + r)}L${n(cx)} ${n(yt)}L${n(x1)} ${n(yt + r)}V${n(yb)}Z`; }
  if (shape === 'shoulder') { const r = h * 0.16, s = w * 0.11; return `M${n(x0)} ${n(yb)}V${n(yt + r)}H${n(x0 + s)}V${n(yt)}H${n(x1 - s)}V${n(yt + r)}H${n(x1)}V${n(yb)}Z`; }
  return `M${n(x0)} ${n(yb)}V${n(yt)}H${n(x1)}V${n(yb)}Z`;
}

// A block of coursed stone: rows of rounded stones in a few tones, laid deterministically.
function stones(x, y, w, h, seed) {
  let out = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="1" fill="#A79F8D"/>`;
  const rows = Math.max(2, Math.round(h / 5.2)), rh = h / rows;
  let k = seed;
  for (let r = 0; r < rows; r++) {
    let cx = x + (r % 2 ? -3.5 : 0);
    while (cx < x + w - 0.5) {
      k = (k * 73 + 41) % 97;
      const sw = 6.5 + (k % 5) * 1.5;
      const a = Math.max(cx, x + 0.5), b = Math.min(cx + sw, x + w - 0.5);
      if (b - a > 1.4) out += `<rect x="${n(a + 0.35)}" y="${n(y + r * rh + 0.45)}" width="${n(b - a - 0.7)}" height="${n(rh - 0.8)}" rx="1.1" fill="${STONE[k % STONE.length]}"/>`;
      cx += sw;
    }
  }
  return out;
}

// One sign. Options: w, h (face, inches), shape, base (stone | plain | posts), pillars (none | flat | peak),
// field (a PAINT key), letters (gold | ivory | green), lines (one or two), frame {x,y,w,h} to share a scale,
// person (draw a six-foot figure at this x), dims (label the face width and height), label (alt text).
export function signArt(o) {
  const { uid, w = 72, h = 42, shape = 'arch', base = 'stone', pillars = 'none', field = 'green', letters = 'gold', lines = ['Your Name', 'Here'], frame = null, person = null, dims = null, label = '' } = o;
  const bh = base === 'posts' ? 16 : Math.max(12, Math.round(h * 0.34));
  const x0 = -w / 2, x1 = w / 2, yb = -bh, yt = -(bh + h);
  const pw = pillars === 'none' ? 0 : Math.max(11, w * 0.17), ph = bh + h * 0.9;
  const half = w / 2 + (pw ? pw + 3 : 4);
  const fieldHex = PAINT[field] || field;
  const light = field === 'ivory';
  const m = Math.max(2.4, w * 0.045);
  const letterFill = letters === 'gold' ? `url(#${uid}-gold)` : letters === 'green' ? PAINT.green : '#FBF7EA';
  const shade = light ? 'rgb(255 255 255 / 0.7)' : 'rgb(0 0 0 / 0.38)';

  let s = `<defs>` +
    `<linearGradient id="${uid}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7E9AE"/><stop offset="0.45" stop-color="#D2A848"/><stop offset="0.6" stop-color="#F3DE95"/><stop offset="1" stop-color="#B8922E"/></linearGradient>` +
    `<linearGradient id="${uid}-trim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFDF6"/><stop offset="1" stop-color="#E9E1CB"/></linearGradient>` +
    `<linearGradient id="${uid}-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>` +
    `<radialGradient id="${uid}-sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#17231D" stop-opacity="0.34"/><stop offset="1" stop-color="#17231D" stop-opacity="0"/></radialGradient>` +
    `</defs>`;
  s += `<ellipse cx="0" cy="1.4" rx="${n(half * 1.12)}" ry="${n(3.2 + w * 0.02)}" fill="url(#${uid}-sh)"/>`;
  if (person !== null) {
    s += `<g fill="#A9BDB1"><circle cx="${n(person)}" cy="-66.5" r="5"/><path d="M${n(person - 8)} -44q0-15 8-15t8 15v19q0 3-3 3v22h-4v-21h-2v21h-4v-22q-3 0-3-3z"/></g>` +
      `<text class="art-dim" x="${n(person)}" y="-76" text-anchor="middle" font-size="4.6">6 ft</text>`;
  }
  // what it stands on
  if (base === 'posts') {
    for (const px of [x0 + w * 0.14, x1 - w * 0.14]) s += `<rect x="${n(px - 2.6)}" y="${n(yt + h * 0.22)}" width="5.2" height="${n(-(yt + h * 0.22))}" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.4"/>`;
  } else if (base === 'stone') {
    s += stones(x0 - 2.5, yb, w + 5, bh, 7 + w) + `<rect x="${n(x0 - 4)}" y="${n(yb - 2.2)}" width="${n(w + 8)}" height="2.6" rx="0.6" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.35"/>`;
  } else {
    s += `<rect x="${n(x0 - 2.5)}" y="${n(yb)}" width="${n(w + 5)}" height="${n(bh)}" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.4"/>` +
      `<rect x="${n(x0 - 4)}" y="${n(yb - 2.2)}" width="${n(w + 8)}" height="2.6" rx="0.6" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.35"/>`;
  }
  // pillars with their caps
  if (pw) {
    for (const [i, px] of [x0 - pw - 1.5, x1 + 1.5].entries()) {
      s += stones(px, -ph, pw, ph, 11 + i * 17);
      s += pillars === 'peak'
        ? `<path d="M${n(px - 2)} ${n(-ph)}H${n(px + pw + 2)}L${n(px + pw / 2)} ${n(-ph - pw * 0.42)}Z" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.35"/>`
        : `<rect x="${n(px - 2)}" y="${n(-ph - 3)}" width="${n(pw + 4)}" height="3.4" rx="0.7" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.35"/>`;
    }
  }
  // the face: a trim, the painted field, a sheen
  const faceBottom = base === 'posts' ? yb - 2 : yb - 2.2;
  s += `<path d="${facePath(x0, x1, faceBottom, yt, shape)}" fill="url(#${uid}-trim)" stroke="#CFC6AE" stroke-width="0.45"/>`;
  const inner = facePath(x0 + m, x1 - m, faceBottom - m, yt + m * 1.25, shape);
  s += `<path d="${inner}" fill="${fieldHex}"/><path d="${inner}" fill="url(#${uid}-sheen)"/>`;
  // lettering, sized to fit, with the shadow a routed letter casts
  const text = lines.filter(Boolean);
  const longest = Math.max(...text.map((l) => l.length), 4);
  const fs = Math.min(h * (text.length > 1 ? 0.25 : 0.3), (w - m * 2 - 7) / (longest * 0.7));
  const mid = (faceBottom + yt) / 2 + (shape === 'flat' ? 0 : h * 0.045);
  text.forEach((line, i) => {
    const y = mid + (i - (text.length - 1) / 2) * fs * 1.14 + fs * 0.34;
    s += `<text class="art-t" x="${n(fs * 0.035)}" y="${n(y + fs * 0.05)}" text-anchor="middle" font-size="${n(fs)}" fill="${shade}">${esc(line)}</text>` +
      `<text class="art-t" x="0" y="${n(y)}" text-anchor="middle" font-size="${n(fs)}" fill="${letterFill}">${esc(line)}</text>`;
  });
  if (dims) {
    const dy = yt - 7, dx = half + 5;
    s += `<g class="art-rule"><path d="M${n(x0)} ${n(dy)}H${n(x1)}M${n(x0)} ${n(dy - 2)}v4M${n(x1)} ${n(dy - 2)}v4M${n(dx)} ${n(yb - 2.2)}V${n(yt)}M${n(dx - 2)} ${n(yb - 2.2)}h4M${n(dx - 2)} ${n(yt)}h4"/></g>` +
      `<text class="art-dim" x="0" y="${n(dy - 3)}" text-anchor="middle" font-size="5">${esc(dims[0])}</text>` +
      `<text class="art-dim" x="${n(dx + 3)}" y="${n((yb + yt) / 2 + 1.6)}" font-size="5">${esc(dims[1])}</text>`;
  }
  const f = frame || { x: -half - 8, y: yt - 12, w: (half + 8) * 2, h: -yt + 12 + 8 };
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="sign-art" viewBox="${n(f.x)} ${n(f.y)} ${n(f.w)} ${n(f.h)}" ${a11y}>${s}</svg>`;
}
