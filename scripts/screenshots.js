// Screenshots of every page at 1440×900, 834×1112 and 390×844, with first views of the home
// page and the designer, saved to design/review/ (SPEC §12, visual review).
//
//   node scripts/screenshots.js            all pages, both hero states
//   node scripts/screenshots.js --quick    home page only, intro state
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = root + 'design/review/';
await mkdir(out, { recursive: true });
const quick = process.argv.includes('--quick');
const server = await serve(root + 'dist');
const browser = await chromium.launch();
const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'phone', width: 390, height: 844 },
];
const PAGES = quick ? [['home', '/']] : [['home', '/'], ['design', '/design/'], ['signs', '/monument-signs/'], ['sizes', '/sizes-and-prices/'],
  ['gallery', '/gallery/'], ['industries', '/industries/'], ['about', '/about/'], ['quote', '/request-a-quote/'],
  ['how', '/how-it-works/'], ['questions', '/questions/'], ['more', '/more-from-our-shop/']];

const shots = [];
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const [key, path] of PAGES) {
    await page.goto(server.url + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const f = `${out}${key}-${size.name}.png`;
    await page.screenshot({ path: f, fullPage: true });
    shots.push(f);
    if (key === 'home' || key === 'design') await page.screenshot({ path: `${out}${key}-${size.name}-first-view.png` });
    if (key === 'design' && !quick) {
      // a named sign, and the title block once the price summary is off screen
      await page.fill('#b-line1', 'Alder Creek Homeowners');
      await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${out}design-${size.name}-named-first-view.png` });
      await page.goto(server.url + '/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.querySelector('#sizes').scrollIntoView());
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}home-${size.name}-title-block.png` });
      await page.evaluate(() => localStorage.clear());
    }
  }
  await ctx.close();
}
await browser.close();
await server.close();
console.log(`Saved ${shots.length} full-page screenshots and first views to design/review/`);
