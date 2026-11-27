// Server-side validation. Repeats every client rule, caps every string, and never trusts a
// price, a file type or an id from the browser (SPEC §9.2).
import rawConfig from '../../content/site.config.json' with { type: 'json' };
import { resolve, tokensFrom } from '../../src/js/builder/config.js';
import { sanitize, choices } from '../../src/js/builder/state.js';
import { CHECKS, LIMITS, REQUIRED, NEED, CONTACT, SIDES, INSTALL, WHEN, MAX_FILES } from '../../src/js/rules.js';

export const config = resolve(rawConfig);
export const tokens = tokensFrom(config);

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

// Contact fields shared by every form.
function contact(body, kind) {
  const d = {
    name: str(body.name, LIMITS.name),
    organization: str(body.organization, LIMITS.organization),
    email: str(body.email, LIMITS.email).toLowerCase(),
    phone: str(body.phone, LIMITS.phone),
    zip: str(body.zip, 5),
  };
  const errors = (REQUIRED[kind] || []).filter((f) => f in d && !CHECKS[f](d[f]));
  // anything longer than its cap is refused rather than silently cut
  for (const f of ['name', 'organization', 'email', 'phone']) if (typeof body[f] === 'string' && body[f].trim().length > LIMITS[f]) errors.push(f);
  return { d, errors };
}

// The design as sent by the browser: every value must be one the config contains.
export function strictDesign(design) {
  if (!design || typeof design !== 'object') return null;
  const c = choices(config);
  const checks = [
    c.size.includes(design.size), c.shape.includes(design.shape), c.base.includes(design.base),
    c.pillars.includes(design.pillars), c.lettering.includes(design.lettering), c.paint.includes(design.field),
    c.paint.includes(design.raised), design.sides === 1 || design.sides === 2, design.style === 'serif' || design.style === 'sans',
    typeof design.install === 'boolean', typeof design.lighting === 'boolean', Array.isArray(design.lines),
  ];
  if (!checks.every(Boolean)) return null;
  if (design.lines.length > 2 || design.lines.some((l) => typeof l !== 'string' || l.trim().length > 28)) return null;
  return sanitize(design, config);
}

export function validateRequest(body) {
  const type = body.type === 'drawing' ? 'drawing' : body.type === 'quote' ? 'quote' : null;
  if (!type) return { errors: ['type'] };
  const { d, errors } = contact(body, type);
  if (type === 'quote') {
    d.contact = oneOf(body.contact, CONTACT, 'email');
    d.need = oneOf(body.need, NEED, null);
    if (!d.need) errors.push('need');
    d.sides = oneOf(body.sides ?? '', SIDES, '');
    d.details = str(body.details, LIMITS.details);
    if (!CHECKS.details(d.details)) errors.push('details');
    d.width = str(body.width, LIMITS.width);
    d.height = str(body.height, LIMITS.height);
    d.install = oneOf(body.install ?? '', INSTALL, '');
    d.when = oneOf(body.when ?? '', WHEN, '');
    d.date = d.when === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : '';
    d.heard = str(body.heard, LIMITS.heard);
  } else {
    d.notes = str(body.notes, LIMITS.notes);
  }
  // a design, when present, is informational: unknown values fall back to defaults
  const design = body.design && typeof body.design === 'object' ? sanitize(body.design, config) : null;
  const files = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES + 1) : [];
  if (files.length > MAX_FILES) errors.push('files');
  const cleanFiles = files.filter((f) => f && typeof f.key === 'string' && f.key.length < 300).map((f) => ({ key: f.key, name: str(f.name, 200) }));
  return { type, data: d, design, files: cleanFiles, errors: [...new Set(errors)] };
}

export function validateCheckout(body) {
  const { d, errors } = contact(body, 'reserve');
  const design = strictDesign(body.design);
  if (!design) errors.push('design');
  return { data: d, design, errors };
}

export function validateEmailDesign(body) {
  const email = str(body.email, LIMITS.email).toLowerCase();
  const errors = CHECKS.email(email) ? [] : ['email'];
  const design = body.design && typeof body.design === 'object' ? sanitize(body.design, config) : null;
  if (!design) errors.push('design');
  return { email, design, errors };
}

export function validateInvoice(body) {
  const number = str(body.number, LIMITS.number);
  const email = str(body.email, LIMITS.email).toLowerCase();
  const errors = [];
  if (!CHECKS.number(number) || !/^[A-Za-z0-9-]+$/.test(number)) errors.push('number');
  if (!CHECKS.email(email)) errors.push('email');
  return { number, email, errors };
}
