// Compressed size budgets (SPEC §10.5): HTML ≤ 50 KB per page, CSS ≤ 14 KB, JavaScript ≤ 30 KB
// in total, fonts ≤ 70 KB. Text is measured with Brotli (what Cloudflare serves) and with gzip;
// the budget must hold for both. Fonts are WOFF2 (already compressed) and are measured as files.
import { readFile, readdir } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const sizes = (buf) => ({
  br: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  gz: gzipSync(buf, { level: 9 }).length,
});

const files = await walk(dist);
const rows = [];
let failed = false;
const check = (label, bytes, budget) => {
  const ok = bytes <= budget * 1024;
  if (!ok) failed = true;
  rows.push(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(44)} ${kb(bytes).padStart(9)}  (budget ${budget} KB)`);
};

for (const f of files.filter((x) => extname(x) === '.html')) {
  const s = sizes(await readFile(f));
  check(`HTML ${relative(dist, f)} (gzip; brotli ${kb(s.br)})`, Math.max(s.gz, s.br), 50);
}
let css = { br: 0, gz: 0 }, js = { br: 0, gz: 0 }, fonts = 0;
for (const f of files) {
  const ext = extname(f);
  if (ext === '.css') { const s = sizes(await readFile(f)); css.br += s.br; css.gz += s.gz; }
  if (ext === '.js') { const s = sizes(await readFile(f)); js.br += s.br; js.gz += s.gz; }
  if (ext === '.woff2') fonts += (await readFile(f)).length;
}
check(`CSS total (gzip; brotli ${kb(css.br)})`, Math.max(css.gz, css.br), 14);
check(`JavaScript total (gzip; brotli ${kb(js.br)})`, Math.max(js.gz, js.br), 30);
check('Fonts total (WOFF2)', fonts, 70);

console.log(rows.join('\n'));
if (failed) { console.error('\ncheck:size failed'); process.exit(1); }
console.log('\ncheck:size passed');
