// One sendEmail() with two drivers: the Cloudflare send_email binding (Email Service) when it is
// bound, otherwise Resend over fetch when RESEND_API_KEY is set. Plain text with a minimal HTML
// alternative, no images, no marketing (SPEC §7.11). Records are always written to D1 first.
export const emailConfigured = (env) => !!env.FROM_EMAIL && !!(env.EMAIL || env.RESEND_API_KEY);

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function htmlAlternative(text) {
  const linked = (line) => escHtml(line).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<!doctype html><html><body style="font-family:sans-serif;line-height:1.5;color:#1B211E">` +
    text.split(/\n{2,}/).map((p) => `<p>${p.split('\n').map(linked).join('<br>')}</p>`).join('') + `</body></html>`;
}

export async function sendEmail(env, { to, subject, text, replyTo }) {
  if (!emailConfigured(env)) throw Object.assign(new Error('Email is not configured'), { code: 'not_configured' });
  const html = htmlAlternative(text);
  if (env.EMAIL) {
    return env.EMAIL.send({ from: env.FROM_EMAIL, to, subject, text, html, ...(replyTo ? { replyTo } : {}) });
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
  return res.json();
}

// Send and never throw: a failed email must not lose or fail a saved request.
export async function trySend(env, message) {
  try { await sendEmail(env, message); return true; } catch (e) { console.error('email failed', e && e.message); return false; }
}
