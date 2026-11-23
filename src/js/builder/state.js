// The builder state (SPEC §8.1) and the rules between options (§8.2). Pure.
import { HEADLINE } from './draw.js';

export const LINE_LIMIT = 28;
export const PAINT_CODE_LIMIT = 80;

const ids = (list) => (list || []).map((o) => o.id);
const pick = (list, preferred) => (list.includes(preferred) ? preferred : list[0]);

export function choices(config) {
  return {
    size: config.pricing.sizes.map((s) => s.id),
    shape: ids(config.options.shape),
    base: ids(config.options.base),
    pillars: ids(config.options.pillars),
    lettering: ids(config.options.lettering),
    paint: ids(config.paints),
  };
}

// The hero as first drawn: the headline, the largest standard size, arched, single-sided,
// stone-look base, no pillars, routed, green field, ivory lettering, installed.
export function defaults(config) {
  const c = choices(config);
  const largest = [...config.pricing.sizes].sort((a, b) => b.face_w * b.face_h - a.face_w * a.face_h)[0];
  return {
    v: 1,
    lines: [...HEADLINE],
    style: 'serif',
    size: largest.id,
    shape: pick(c.shape, 'arch'),
    sides: 1,
    base: pick(c.base, 'stone'),
    pillars: pick(c.pillars, 'none'),
    lettering: pick(c.lettering, 'routed'),
    field: pick(c.paint, 'green'),
    raised: pick(c.paint, 'ivory'),
    paintCode: '',
    lighting: false,
    install: true,
    zip: '',
  };
}

const clean = (s, limit) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, limit);

// Check every value against the config; anything unknown falls back to the default.
export function sanitize(raw, config) {
  const d = defaults(config);
  const c = choices(config);
  const r = raw && typeof raw === 'object' ? raw : {};
  const one = (key, list) => (list.includes(r[key]) ? r[key] : d[key]);
  const s = {
    v: 1,
    lines: Array.isArray(r.lines) ? r.lines.slice(0, 2).map((l) => clean(l, LINE_LIMIT)) : d.lines,
    style: r.style === 'sans' ? 'sans' : 'serif',
    size: one('size', c.size),
    shape: one('shape', c.shape),
    sides: r.sides === 2 ? 2 : 1,
    base: one('base', c.base),
    pillars: one('pillars', c.pillars),
    lettering: one('lettering', c.lettering),
    field: one('field', c.paint),
    raised: one('raised', c.paint),
    paintCode: clean(r.paintCode, PAINT_CODE_LIMIT),
    lighting: r.lighting === true,
    install: r.install === false ? false : true,
    zip: /^\d{5}$/.test(String(r.zip ?? '')) ? String(r.zip) : '',
  };
  if (!s.lines.length) s.lines = [''];
  // An empty first line with a second line becomes a one-line layout.
  if (s.lines.length === 2 && !s.lines[0] && s.lines[1]) s.lines = [s.lines[1]];
  if (s.lines.length === 2 && !s.lines[1]) s.lines = [s.lines[0]];
  // Pillars need a base.
  if (s.base === 'posts') s.pillars = pick(c.pillars, 'none');
  return s;
}

const canon = (s) => JSON.stringify([s.lines.filter(Boolean), s.style, s.size, s.shape, s.sides, s.base,
  s.pillars, s.lettering, s.field, s.raised, s.paintCode, s.lighting, s.install, s.zip]);

export const same = (a, b) => canon(a) === canon(b);
export const isDefault = (state, config) => same(state, defaults(config));

// Split a typed name across two lines, balancing by words, each within the line limit.
export function splitName(text) {
  const v = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!v) return [];
  const words = v.split(' ');
  if (v.length <= 12 || words.length < 2) {
    if (v.length <= LINE_LIMIT) return [v];
  }
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (a.length > LINE_LIMIT || b.length > LINE_LIMIT) continue;
    const score = Math.abs(a.length - b.length);
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  if (best) return best.lines;
  return [v.slice(0, LINE_LIMIT), v.slice(LINE_LIMIT, LINE_LIMIT * 2).trim()].filter(Boolean);
}
