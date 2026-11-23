// Site config helpers. Pure: no DOM, no clock, no randomness.
// Shared by the build script and the Worker. The browser receives an already-resolved copy.
//
// Every fact the owner has not confirmed is stored as { "value": …, "confirmed": false }.
// resolve() unwraps those to plain values; unconfirmed() lists where they are, for the launch gate.

const isWrapped = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.prototype.hasOwnProperty.call(v, 'value') &&
  Object.prototype.hasOwnProperty.call(v, 'confirmed');

export function resolve(raw) {
  if (isWrapped(raw)) return resolve(raw.value);
  if (Array.isArray(raw)) return raw.map(resolve);
  if (raw !== null && typeof raw === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[k] = resolve(v);
    return out;
  }
  return raw;
}

export function unconfirmed(raw, path = '') {
  const found = [];
  if (isWrapped(raw)) {
    if (raw.confirmed !== true) found.push(path);
    return found.concat(unconfirmed(raw.value, path));
  }
  if (Array.isArray(raw)) {
    raw.forEach((v, i) => found.push(...unconfirmed(v, `${path}[${i}]`)));
  } else if (raw !== null && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) found.push(...unconfirmed(v, path ? `${path}.${k}` : k));
  }
  return found;
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve'];

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// The flat token map used by {{tokens}} in pages, messages and emails.
export function tokensFrom(config, extra = {}) {
  const count = config.pricing.sizes.length;
  return {
    business_name: config.business_name,
    legal_name: config.legal_name,
    phone: config.phone,
    phone_href: 'tel:+1' + String(config.phone).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''),
    email: config.email,
    hours: config.hours,
    mailing_address: config.mailing_address,
    lead_time: config.lead_time,
    response_time: config.response_time,
    drawing_turnaround: config.drawing_turnaround,
    warranty_years: config.warranty_years,
    warranty_exclusions: config.warranty_exclusions,
    damage_report_days: config.damage_report_days,
    permit_statement: config.permit_statement,
    privacy_text: config.privacy_text,
    deposit_percent: String(config.pricing.deposit_percent),
    size_count_word: cap(NUMBER_WORDS[count] || String(count)),
    site_url: String(config.site_url).replace(/\/$/, ''),
    stripe_portal_url: config.stripe_portal_url,
    ...extra,
  };
}

// Replace {{name}} and {{name|cap}}. Unknown names throw, so a build can never ship one.
export function fillTokens(text, tokens, { tidy = true } = {}) {
  let out = String(text);
  for (let pass = 0; pass < 3 && out.includes('{{'); pass++) {
    out = out.replace(/\{\{\s*([a-z_]+)(\|cap)?\s*\}\}/g, (m, name, filter) => {
      if (!Object.prototype.hasOwnProperty.call(tokens, name)) throw new Error(`Unresolved token {{${name}}}`);
      const v = String(tokens[name] ?? '');
      return filter ? cap(v) : v;
    });
  }
  if (!tidy) return out;
  // An empty token (for example an empty permit statement) must not leave a stray space.
  return out.replace(/ +\n/g, '\n').replace(/([.:;,]) +$/gm, '$1').replace(/ {2,}/g, ' ');
}
