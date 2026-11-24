// Builds dist/ from src/ and content/site.config.json. Node built-ins only (SPEC §10.2).
//
//   node scripts/build.js                     normal build (honours config.draft)
//   node scripts/build.js --production        same, used after the launch gate passes
//   node scripts/build.js --no-draft --out dist-seo   a test build with draft switched off
import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, posix, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as resolveConfig, tokensFrom, fillTokens } from '../src/js/builder/config.js';
import { defaults as defaultState } from '../src/js/builder/state.js';
import { anatomy, option, sizeWords } from '../src/js/builder/draw.js';
import { quote, money } from '../src/js/builder/pricing.js';
import * as R from './lib/render.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const OUT = join(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');
const SRC = join(ROOT, 'src');

const fail = (msg) => { console.error(`\nBuild failed: ${msg}\n`); process.exit(1); };
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const exists = async (p) => !!(await stat(p).catch(() => null));

// ---------- config ----------
const CONFIG = args.includes('--config') ? args[args.indexOf('--config') + 1] : 'content/site.config.json';
const raw = JSON.parse(await readFile(join(ROOT, CONFIG), 'utf8'));
const config = resolveConfig(raw);
if (args.includes('--no-draft')) config.draft = false;
// Prototype switches: a feature set to false is built hidden (its markup stays, so turning it
// back on is one edit). --all-features builds everything, for the browser tests.
config.features = { deposits: true, invoice_payment: true, email_design: true, file_uploads: true, ...(config.features || {}) };
if (args.includes('--all-features')) for (const k of Object.keys(config.features)) config.features[k] = true;
const DRAFT = config.draft === true;
const year = String(new Date().getFullYear());
const baseTokens = tokensFrom(config, { year });
const fill = (s) => fillTokens(s, baseTokens);
const state0 = defaultState(config);

// Strings in the config may themselves hold tokens (policies, answers).
const policies = Object.fromEntries(Object.entries(config.policies).map(([k, v]) => [`policy_${k}`, fill(v)]));
const tokens = {
  ...baseTokens,
  ...policies,
  drawing_dialog_intro: fill(config.drawing_dialog_intro),
  permits_paragraph: fill('Cities, counties and homeowner associations set their own rules for the size, height and placement of a sign, and many require a permit. Check with yours before you order. The dimensions on your approval drawing are the ones a permit office or review board will ask for. {{permit_statement}}'),
};
const messages = JSON.parse(fill(await readFile(join(SRC, 'messages.json'), 'utf8')));

// ---------- pages ----------
const site = tokens.site_url;
const PAGES = [
  { src: 'index.html', out: 'index.html', path: '/', title: fill('Monument Signs, Built to Order and Installed Nationwide | {{business_name}}'),
    description: 'Routed HDU monument signs, built to order. Design yours online and see the price as you go, then have it permanently installed anywhere in the US by a certified installer.' },
  { src: 'how-it-works/index.html', out: 'how-it-works/index.html', path: '/how-it-works/', title: fill('How it works | {{business_name}}'),
    description: 'One company, from the first drawing to the sign in the ground: your approval drawing, a deposit paid online, production, permanent installation anywhere in the United States, and the final invoice.' },
  { src: 'questions/index.html', out: 'questions/index.html', path: '/questions/', title: fill('Questions | {{business_name}}'),
    description: 'Questions about ordering a monument sign, the sign itself, installation anywhere in the United States, and payment.' },
  { src: 'more-from-our-shop/index.html', out: 'more-from-our-shop/index.html', path: '/more-from-our-shop/', title: fill('More from our shop | {{business_name}}'),
    description: 'The same material and the same routers make a few other things: HDU sign panels, HDU mailboxes and custom foam pieces.' },
  { src: '404.html', out: '404.html', path: '/404', title: fill('Page not found | {{business_name}}'), description: fill('{{business_name}}. Monument signs, built to order and installed anywhere in the United States.'), noindex: true },
];

// ---------- assets: fonts, CSS, the JS module graph, all content-hashed ----------
// Empty dist/ in place rather than deleting it, so a running `wrangler dev` keeps watching it.
await mkdir(OUT, { recursive: true });
for (const e of await readdir(OUT)) await rm(join(OUT, e), { recursive: true, force: true });
await mkdir(join(OUT, 'assets/fonts'), { recursive: true });
await mkdir(join(OUT, 'assets/js'), { recursive: true });

const assetMap = {};   // src-relative path → /assets/... URL
for (const f of await readdir(join(SRC, 'fonts'))) {
  const buf = await readFile(join(SRC, 'fonts', f));
  if (f.endsWith('.woff2')) {
    const name = `${basename(f, '.woff2')}.${hash(buf)}.woff2`;
    await writeFile(join(OUT, 'assets/fonts', name), buf);
    assetMap[`fonts/${f}`] = `/assets/fonts/${name}`;
  } else {
    await copyFile(join(SRC, 'fonts', f), join(OUT, 'assets/fonts', f));   // license texts travel with the fonts
  }
}

let css = await readFile(join(SRC, 'css/site.css'), 'utf8');
css = css.replace(/url\("\.\.\/(fonts\/[^"]+)"\)/g, (m, p) => {
  if (!assetMap[p]) fail(`site.css references missing file src/${p}`);
  return `url("${assetMap[p]}")`;
});
css = minifyCss(css);
const cssName = `site.${hash(css)}.css`;
await writeFile(join(OUT, 'assets', cssName), css);
assetMap['css/site.css'] = `/assets/${cssName}`;

// Walk the module graph from app.js, hash leaves first, rewrite import specifiers.
const IMPORT_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g;
const jsDone = new Map();   // abs path → hashed URL
async function emitModule(abs, stack = []) {
  if (jsDone.has(abs)) return jsDone.get(abs);
  if (stack.includes(abs)) fail(`circular import through ${relative(SRC, abs)}`);
  if (!(await exists(abs))) fail(`missing module ${relative(ROOT, abs)}${stack.length ? ` imported by ${relative(ROOT, stack.at(-1))}` : ''}`);
  let code = await readFile(abs, 'utf8');
  const deps = [...code.matchAll(IMPORT_RE)].map((m) => m[3]);
  const urls = {};
  for (const spec of deps) urls[spec] = await emitModule(join(dirname(abs), spec), [...stack, abs]);
  const rel = relative(join(SRC, 'js'), abs);
  const outDir = posix.join('/assets/js', posix.dirname(rel.split('\\').join('/')));
  code = code.replace(IMPORT_RE, (m, pre, q, spec) => {
    let r = posix.relative(outDir, urls[spec]);
    if (!r.startsWith('.')) r = './' + r;
    return `${pre}${q}${r}${q}`;
  });
  code = minifyJs(code);
  const url = posix.join(outDir, `${basename(rel, '.js')}.${hash(code)}.js`);
  await mkdir(join(OUT, dirname(url)), { recursive: true });
  await writeFile(join(OUT, url), code);
  jsDone.set(abs, url);
  return url;
}
const appUrl = await emitModule(join(SRC, 'js/app.js'));
const moduleUrls = [...jsDone.values()];

const assetsHead = [
  `<link rel="preload" href="${assetMap['fonts/besley-latin-wght-normal.woff2']}" as="font" type="font/woff2" crossorigin>`,
  `<link rel="preload" href="${assetMap['fonts/libre-franklin-latin-wght-normal.woff2']}" as="font" type="font/woff2" crossorigin>`,
  `<link rel="stylesheet" href="${assetMap['css/site.css']}">`,
  ...moduleUrls.filter((u) => u !== appUrl).map((u) => `<link rel="modulepreload" href="${u}">`),
  `<script type="module" src="${appUrl}"></script>`,
].join('\n');

// ---------- render ----------
const partials = {};
for (const f of await readdir(join(SRC, 'partials'))) partials[basename(f, '.html')] = await readFile(join(SRC, 'partials', f), 'utf8');

const contactExtra = [
  tokens.email && `<li><a href="mailto:${R.esc(tokens.email)}">${R.esc(tokens.email)}</a></li>`,
  tokens.hours && `<li>${R.esc(tokens.hours)}</li>`,
  tokens.mailing_address && `<li>${R.esc(tokens.mailing_address)}</li>`,
].filter(Boolean).join('\n        ');
const portalUrl = config.stripe_portal_url;

const browserConfig = {
  draft: DRAFT,
  features: config.features,
  pricing: config.pricing,
  paints: config.paints,
  options: config.options,
};
const q0 = quote(state0, config);

const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization', name: config.business_name, url: site + '/',
  telephone: config.phone, email: config.email, areaServed: { '@type': 'Country', name: 'United States' },
};
const serviceLd = {
  '@context': 'https://schema.org', '@type': 'Service', name: 'Custom monument signs', serviceType: 'Routed HDU monument signs, built to order and permanently installed',
  provider: { '@type': 'Organization', name: config.business_name, url: site + '/' },
  areaServed: { '@type': 'Country', name: 'United States' },
};
if (!DRAFT) {
  serviceLd.offers = config.pricing.sizes.filter((s) => s.single != null).map((s) => ({
    '@type': 'Offer', name: `${sizeWords(s).replace(/\u00a0/g, ' ')} monument sign, single-sided`,
    price: String(s.single), priceCurrency: 'USD', url: `${site}/?size=${s.id}#design`,
  }));
}
const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: config.questions.flatMap((g) => g.items.map((it) => ({
    '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: fill(it.a) },
  }))),
};

const SLOTS = {
  assets: () => assetsHead,
  robots: (page) => (DRAFT || page.noindex ? '<meta name="robots" content="noindex">\n' : ''),
  draft_notice: () => (DRAFT ? '<div class="draft-notice"><p class="wrap">Draft site. Prices and terms shown are samples.</p></div>\n' : ''),
  contact_extra: () => contactExtra,
  portal_link: () => (portalUrl ? `<li><a href="${R.esc(portalUrl)}">See your orders and payments</a></li>` : ''),
  portal_link_inline: () => (portalUrl ? `<a href="${R.esc(portalUrl)}">See your orders and payments</a>` : ''),
  form_extras: () => R.formExtras(tokens),
  hero: () => R.hero(state0, config),
  hero_total: () => (q0.priced ? money(q0.total) : messages.unpriced),
  builder: () => R.builder(config, state0),
  lineup: () => R.lineupSvg(config, state0),
  size_list: () => R.sizeList(config, state0),
  gallery: () => R.gallery(config),
  covers: () => R.covers(config),
  anatomy: () => anatomy(config, state0),
  option_stone: () => option('stone', config, state0),
  option_pillars: () => option('pillars', config, state0),
  option_metal: () => option('metal', config, state0),
  option_acrylic: () => option('acrylic', config, state0),
  questions: () => R.questions(config, fill),
  jsonld: (page) => (page.path === '/' ? R.jsonLd([orgLd, serviceLd]) : page.path === '/questions/' ? R.jsonLd([faqLd]) : ''),
  site_data: (page) => R.siteData({
    page: page.path, config: browserConfig, messages,
    contact: { business_name: config.business_name, phone: config.phone, phone_href: tokens.phone_href, email: config.email, hours: config.hours, mailing_address: config.mailing_address },
    covers: config.covers, site_url: site, turnstile_site_key: config.turnstile_site_key,
  }),
};

function render(template, page) {
  let html = template;
  for (let i = 0; i < 4 && html.includes('{{>'); i++) {
    html = html.replace(/\{\{>\s*([a-z_-]+)\s*\}\}/g, (m, name) => {
      if (partials[name] === undefined) fail(`${page.src}: missing partial ${name}`);
      return partials[name];
    });
  }
  // Tokens first (slot output is final HTML and may legitimately contain braces in JSON).
  const pageTokens = { ...tokens, page_title: page.title, page_description: page.description, canonical_url: site + (page.path === '/404' ? '/' : page.path) };
  html = html.replace(/\{\{\s*([a-z_]+)(\|cap)?\s*\}\}/g, (m, name, filter) => {
    if (!Object.prototype.hasOwnProperty.call(pageTokens, name)) fail(`${page.src}: unresolved token {{${name}}}`);
    const v = R.esc(pageTokens[name]);
    return filter ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  });
  const leftover = html.match(/\{\{(?!@)[^}]*\}\}/);
  if (leftover) fail(`${page.src}: unresolved ${leftover[0]}`);
  html = html.replace(/\{\{@([a-z_]+)\}\}/g, (m, name) => {
    if (!SLOTS[name]) fail(`${page.src}: unknown render slot ${name}`);
    return SLOTS[name](page);
  });
  if (/\{\{[^}]*\}\}/.test(html.replace(/<script type="application\/(?:ld\+)?json"[\s\S]*?<\/script>/g, ''))) {
    fail(`${page.src}: unresolved token after rendering`);
  }
  html = html.replace(/data-feature="([a-z_]+)"/g, (m, f) => {
    if (!(f in config.features)) fail(`${page.src}: unknown feature ${f}`);
    return config.features[f] ? m : `${m} hidden`;
  });
  // mark the current page in the main navigation
  const navKey = { '/how-it-works/': 'how', '/questions/': 'questions' }[page.path];
  if (navKey) html = html.replace(`data-nav="${navKey}"`, `data-nav="${navKey}" aria-current="page"`);
  return html;
}

for (const page of PAGES) {
  const template = await readFile(join(SRC, page.src), 'utf8');
  const html = render(template, page);
  await mkdir(join(OUT, dirname(page.out)), { recursive: true });
  await writeFile(join(OUT, page.out), html);
}

// ---------- static files, robots, sitemap ----------
for (const f of await readdir(join(SRC, 'static'))) await copyFile(join(SRC, 'static', f), join(OUT, f));
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
const urls = PAGES.filter((p) => !p.noindex).map((p) => `  <url><loc>${site}${p.path}</loc></url>`).join('\n');
await writeFile(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

// ---------- verify every referenced local file exists ----------
for (const page of PAGES) {
  const html = await readFile(join(OUT, page.out), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    let p = m[1];
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    if (!(await exists(join(OUT, p)))) fail(`${page.out} references ${m[1]}, which is not in the build`);
  }
}
for (const u of [...moduleUrls, assetMap['css/site.css'], '/og.png', '/favicon.svg']) {
  if (!(await exists(join(OUT, u)))) fail(`missing ${u} in the build${u === '/og.png' ? ' (run npm run og)' : ''}`);
}

console.log(`Built ${relative(ROOT, OUT)}/ (${DRAFT ? 'draft' : 'not draft'}): ${PAGES.length} pages, ${moduleUrls.length} modules, ${cssName}`);

// ---------- tiny, safe minifiers ----------
function minifyCss(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}
function minifyJs(s) {
  // Only strips full-line comments and leading indentation; never touches strings or regexes.
  return s.split('\n').map((l) => l.replace(/^\s+/, '')).filter((l) => l && !l.startsWith('//')).join('\n') + '\n';
}
