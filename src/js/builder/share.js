// Design links (SPEC §8.5). A link carries choices, never amounts, so it keeps working
// when prices change. Pure.
import { sanitize } from './state.js';

const toB64url = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s) => {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export function encode(state) {
  const { v, lines, style, size, shape, sides, base, pillars, lettering, field, raised, paintCode, lighting, install, zip } = state;
  const json = JSON.stringify({ v, lines, style, size, shape, sides, base, pillars, lettering, field, raised, paintCode, lighting, install, zip });
  return toB64url(new TextEncoder().encode(json));
}

// Decode and check every value; anything unknown or malformed falls back to the default.
export function decode(param, config) {
  try {
    const raw = JSON.parse(new TextDecoder().decode(fromB64url(param)));
    return sanitize(raw, config);
  } catch {
    return sanitize({}, config);
  }
}

export function designUrl(base, state) {
  const u = new URL(base);
  u.search = '';
  u.hash = 'design';
  u.searchParams.set('d', encode(state));
  return u.toString();
}
