// HMAC signing for upload tokens and file links, and the reference generator. Web Crypto only.
const enc = new TextEncoder();

export const b64url = (bytes) => {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
export const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function hmac(secret, message) {
  return crypto.subtle.sign('HMAC', await key(secret), enc.encode(message));
}

// Constant-time comparison of two strings.
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// token = base64url(payload JSON) "." base64url(HMAC)
export async function signToken(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}
export async function verifyToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (!safeEqual(sig, b64url(await hmac(secret, body)))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// A link the business can follow from an email: /api/files/{key}?exp=…&sig=…
export async function signFileLink(base, objectKey, secret, now = Date.now(), days = 30) {
  const exp = now + days * 86400000;
  const sig = b64url(await hmac(secret, `${objectKey}.${exp}`));
  return `${base}/api/files/${objectKey.split('/').map(encodeURIComponent).join('/')}?exp=${exp}&sig=${sig}`;
}
export async function verifyFileLink(objectKey, exp, sig, secret, now = Date.now()) {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < now || !sig) return false;
  return safeEqual(sig, b64url(await hmac(secret, `${objectKey}.${e}`)));
}

// References look like MS-7K4Q2P: six characters without 0, O, 1, I or L.
export const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function reference() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'MS-' + [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
}
