// GET /api/files/{key}: serves an uploaded file to the business from a link in the notification
// email. The link carries a 30-day expiry and an HMAC signature; without a valid one, 404.
import { notFound, has, raw } from '../lib/http.js';
import { verifyFileLink } from '../lib/sign.js';

export async function get(request, env, ctx, [encodedKey]) {
  if (!has(env, 'UPLOADS', 'SIGNING_SECRET')) return notFound();
  const url = new URL(request.url);
  const key = encodedKey.split('/').map(decodeURIComponent).join('/');
  if (!key.startsWith('uploads/')) return notFound();
  if (!(await verifyFileLink(key, url.searchParams.get('exp'), url.searchParams.get('sig'), env.SIGNING_SECRET))) return notFound();
  const obj = await env.UPLOADS.get(key);
  if (!obj) return notFound();
  const name = (obj.customMetadata && obj.customMetadata.name) || 'file';
  return raw(obj.body, 200, {
    'content-type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream',
    'content-disposition': `attachment; filename="${name.replace(/"/g, '')}"`,
    'content-security-policy': "default-src 'none'; sandbox",
  });
}
