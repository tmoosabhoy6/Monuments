// Renders the photo-style images (scripts/render/) into src/static/photos/ as WebP, and writes
// src/static/photos/manifest.json with each image's sizes. Run when shots or the scene change:
//   node scripts/render-photos.js [id ...]
import { chromium } from 'playwright';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.js';
import { SHOTS } from './render/shots.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = root + 'src/static/photos/';
await mkdir(out, { recursive: true });
const only = process.argv.slice(2);
const server = await serve(root);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('page:', m.text()); });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(server.url + '/scripts/render/index.html');
await page.evaluate(() => window.ready);
let manifest = {};
try { manifest = JSON.parse(await readFile(out + 'manifest.json', 'utf8')); } catch { /* first run */ }
for (const shot of SHOTS.filter((s) => !only.length || only.includes(s.id))) {
  const t = Date.now();
  const imgs = await page.evaluate((s) => window.renderShot(s), shot);
  const files = [];
  for (const [w, url] of Object.entries(imgs)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const name = `${shot.id}-${w}.webp`;
    await writeFile(out + name, buf);
    files.push({ w: Number(w), h: Math.round((Number(w) * shot.height) / shot.width), file: name, kb: Math.round(buf.length / 1024) });
  }
  manifest[shot.id] = { width: shot.width, height: shot.height, files };
  console.log(`${shot.id}: ${files.map((f) => `${f.w}w ${f.kb} KB`).join(', ')} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
await writeFile(out + 'manifest.json', JSON.stringify(manifest, null, 1));
await browser.close();
await server.close();
