// Accessibility measurements that automated scanners miss: touch targets on phones, the contrast
// of every rendered text colour pair, reflow at 200% zoom, heading order and dialog semantics.
//   node scripts/a11y-audit.js
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.js';
const root = fileURLToPath(new URL('..', import.meta.url));
const s = await serve(root + 'dist');
const b = await chromium.launch();
const PAGES = ['/', '/how-it-works/', '/questions/', '/more-from-our-shop/'];
const report = { targets: [], contrast: new Map(), reflow: [], headings: [], dialogs: [] };

for (const path of PAGES) {
  // touch targets on a phone (WCAG 2.5.8 minimum 24px; the spec asks 44px)
  const phone = await b.newContext({ ...devices['Pixel 7'] });
  const p = await phone.newPage();
  await p.goto(s.url + path);
  if (path === '/') { await p.fill('#sign-name', 'Alder Creek'); await p.click('.hero-intro [data-open-builder]'); }
  const small = await p.evaluate(() => [...document.querySelectorAll('a[href], button, input, summary, select, textarea, label.opt, label.choice')]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('dialog:not([open]), .hp, [hidden]'))
    .map((el) => {
      const target = el.matches('input[type=radio], input[type=checkbox]') && el.closest('label') ? el.closest('label') : el;
      const r = target.getBoundingClientRect();
      const inline = getComputedStyle(el).display === 'inline' && el.closest('p, li, dd');
      return { what: (el.textContent || el.name || el.id || el.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), inline: !!inline };
    }).filter((t) => (t.h < 44 || t.w < 24) && !t.inline));
  for (const t of small) report.targets.push(`${path}: "${t.what}" ${t.w}×${t.h}`);
  await phone.close();

  // contrast of every text node's colour against its effective background
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await desk.newPage();
  await d.goto(s.url + path);
  if (path === '/') { await d.fill('#sign-name', 'Alder Creek'); await d.click('.hero-intro [data-open-builder]'); }
  const pairs = await d.evaluate(() => {
    const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const v = rgb(c); if (v.length === 3 || (v[3] ?? 1) > 0.5) return c; } return 'rgb(255,255,255)'; };
    const out = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, el = n.parentElement;
      if (!n.textContent.trim() || !el || !el.getClientRects().length || el.closest('svg, .visually-hidden, [hidden], dialog:not([open]), .hp, noscript, .print-sheet')) continue;
      const cs = getComputedStyle(el);
      const fg = cs.color, back = bg(el);
      const L1 = lum(rgb(fg)), L2 = lum(rgb(back));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
      const key = `${fg} on ${back}`;
      if (!out[key] || ratio < out[key].ratio) out[key] = { ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5, sample: n.textContent.trim().slice(0, 30) };
    }
    return out;
  });
  for (const [k, v] of Object.entries(pairs)) report.contrast.set(k, v);
  // heading order
  const hs = await d.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4')].map((h) => Number(h.tagName[1])));
  const skips = hs.filter((lv, i) => i && lv > hs[i - 1] + 1);
  report.headings.push(`${path}: ${hs.filter((x) => x === 1).length} h1, levels ${[...new Set(hs)].join('/')}${skips.length ? ', SKIPS' : ', no skips'}`);
  await desk.close();

  // reflow at 200% zoom: 1280×800 at 200% is a 640px-wide viewport
  const zoom = await b.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const z = await zoom.newPage();
  await z.goto(s.url + path);
  const over = await z.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  report.reflow.push(`${path}: ${over === 0 ? 'no horizontal scroll' : `scrolls sideways ${over}px`}`);
  await zoom.close();
}
// dialogs: role, name, modal, focus trap via showModal
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(s.url + '/');
for (const id of ['dialog-reserve', 'dialog-drawing', 'dialog-share', 'dialog-invoice']) {
  await page.evaluate((i) => document.getElementById(i).showModal(), id);
  const snap = await page.locator('#' + id).ariaSnapshot();
  const inert = await page.evaluate(() => { const r = document.querySelector('main').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 5, r.top + 5); return !!e && !e.closest('dialog'); });
  report.dialogs.push(`${id}: ${snap.split('\n')[0]}`);
  await page.keyboard.press('Escape');
}
await b.close(); await s.close();

const bad = [...report.contrast.entries()].filter(([, v]) => v.ratio < v.need);
console.log('Touch targets under 44px tall on a phone (inline text links excluded):', report.targets.length ? '\n  ' + report.targets.join('\n  ') : 'none');
console.log('\nText contrast pairs (worst case each):');
for (const [k, v] of [...report.contrast.entries()].sort((a, c) => a[1].ratio - c[1].ratio)) console.log(`  ${v.ratio < v.need ? 'FAIL' : 'ok  '} ${String(v.ratio).padStart(5)}:1 (needs ${v.need})  ${k}  e.g. "${v.sample}"`);
console.log('\nReflow at 200% zoom:\n  ' + report.reflow.join('\n  '));
console.log('\nHeadings:\n  ' + report.headings.join('\n  '));
console.log('\nDialogs:\n  ' + report.dialogs.join('\n  '));
process.exit(bad.length || report.targets.length ? 1 : 0);
