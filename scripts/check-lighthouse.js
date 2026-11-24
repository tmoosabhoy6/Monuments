// Lighthouse, mobile (SPEC §12), against a running `npx wrangler dev` (default http://127.0.0.1:8787).
// Performance ≥ 95, accessibility 100, best practices 100 on every page as built; SEO 100 on a
// build made with draft off (the draft build is deliberately noindex). LCP < 1.8 s, CLS < 0.02,
// total blocking time < 100 ms.
//
//   npx wrangler dev &          then          node scripts/check-lighthouse.js [base-url]
//
// Lighthouse is run with npx (it is a checking tool, not a dependency of the site) and the
// pre-installed Chromium.
import { execFileSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const out = root + 'design/review/lighthouse/';
await mkdir(out, { recursive: true });
const chrome = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const PAGES = ['/', '/how-it-works/', '/questions/', '/more-from-our-shop/'];

function lighthouse(url, file) {
  execFileSync('npx', ['--yes', 'lighthouse@13.6.0', url, '--quiet', '--output=json', `--output-path=${file}`,
    '--chrome-flags=--headless=new --no-sandbox', '--only-categories=performance,accessibility,best-practices,seo'],
  { env: { ...process.env, CHROME_PATH: chrome, DO_NOT_TRACK: '1' }, stdio: ['ignore', 'ignore', 'inherit'], timeout: 240000 });
  return readFile(file, 'utf8').then(JSON.parse);
}
const build = (args) => execFileSync(process.execPath, ['scripts/build.js', ...args], { cwd: root, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
let failed = false;
async function run(label, path, { seo }) {
  const slug = (path.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home') + (seo ? '-no-draft' : '');
  const r = await lighthouse(base + path, `${out}${slug}.json`);
  const c = r.categories, a = r.audits;
  const score = (k) => Math.round((c[k]?.score ?? 0) * 100);
  const lcp = a['largest-contentful-paint'].numericValue, cls = a['cumulative-layout-shift'].numericValue, tbt = a['total-blocking-time'].numericValue;
  const checks = seo
    ? [score('seo') === 100]
    : [score('performance') >= 95, score('accessibility') === 100, score('best-practices') === 100, lcp < 1800, cls < 0.02, tbt < 100];
  const ok = checks.every(Boolean);
  if (!ok) failed = true;
  rows.push(`${ok ? 'ok  ' : 'FAIL'}  ${(label + ' ' + path).padEnd(34)} perf ${score('performance')}  a11y ${score('accessibility')}  best ${score('best-practices')}  seo ${score('seo')}  ` +
    `LCP ${(lcp / 1000).toFixed(2)} s  CLS ${cls.toFixed(3)}  TBT ${Math.round(tbt)} ms`);
  if (!ok) {
    for (const [id, au] of Object.entries(a)) {
      if (au.score !== null && au.score < 1 && au.scoreDisplayMode === 'binary') rows.push(`        ${id}: ${au.title}`);
    }
  }
}

for (const p of PAGES) await run('draft', p, { seo: false });
// SEO on a build with draft off, then restore the draft build
build(['--no-draft']);
await wait(2500);
try {
  for (const p of PAGES) await run('no-draft', p, { seo: true });
} finally {
  build([]);
}
console.log(rows.join('\n'));
if (failed) { console.error('\nLighthouse check failed'); process.exit(1); }
console.log('\nLighthouse check passed (reports in design/review/lighthouse/)');
