// Generates src/static/og.png: a 1200×630 picture of the hero sign on paper (SPEC §11).
// Renders the default hero straight from draw.js with the real fonts, so it needs no build.
//
//   node scripts/og-image.js
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from '../src/js/builder/config.js';
import { defaults } from '../src/js/builder/state.js';
import { scene } from '../src/js/builder/draw.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const config = resolve(JSON.parse(await readFile(root + 'content/site.config.json', 'utf8')));
const b64 = async (f) => (await readFile(root + 'src/fonts/' + f)).toString('base64');
const svg = scene(defaults(config), config, { dims: true, aspect: 1.9, label: 'Monument signs. Nothing else.' });

const html = `<!doctype html><html><head><style>
@font-face{font-family:Besley;src:url(data:font/woff2;base64,${await b64('besley-latin-wght-normal.woff2')}) format("woff2");font-weight:400 900}
@font-face{font-family:"Libre Franklin";src:url(data:font/woff2;base64,${await b64('libre-franklin-latin-wght-normal.woff2')}) format("woff2");font-weight:100 900}
html,body{margin:0;background:#ECEDE8}
.frame{width:1200px;height:630px;box-sizing:border-box;padding:40px 64px 44px;display:flex;align-items:flex-end}
svg{width:100%;height:auto;overflow:visible}
.lt{font-family:Besley;font-weight:640;letter-spacing:-.012em}
.dim{font-family:"Libre Franklin";font-weight:500;fill:#4C544F;font-variant-numeric:tabular-nums lining-nums}
</style></head><body><div class="frame">${svg}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: root + 'src/static/og.png' });
await browser.close();
console.log('Wrote src/static/og.png');
