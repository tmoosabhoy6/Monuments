// Dev helper: screenshot one element of a built page.  node scripts/shot.js <path> <selector> <out.png> [width] [height]
import { chromium } from 'playwright';
import { serve } from './lib/serve.js';
const [,, path, sel, out, w='1440', h='900'] = process.argv;
const s = await serve('/home/user/Monuments/dist');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto(s.url + path, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.locator(sel).first().screenshot({ path: out });
await b.close(); await s.close();
