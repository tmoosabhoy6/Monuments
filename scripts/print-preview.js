// Dev helper: writes the design sheet PDF for a sample design.  node scripts/print-preview.js <out.pdf>
import { chromium } from 'playwright';
import { serve } from './lib/serve.js';
const s = await serve(new URL('../dist', import.meta.url).pathname);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(s.url + '/');
await p.fill('#sign-name', 'Alder Creek Homeowners');
await p.click('.hero-intro [data-open-builder]');
await p.check('[name="pillars-on"][value="each"]');
await p.click('[data-lighting-details] summary');
await p.check('[name="lighting"]');
await p.fill('#b-paint', 'SW 6258 Tricorn Black');
await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
await p.pdf({ path: process.argv[2], format: 'Letter', printBackground: true });
await b.close(); await s.close();
