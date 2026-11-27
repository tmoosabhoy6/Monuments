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
import { sizeWords, scene as sceneSvg, installSection } from '../src/js/builder/draw.js';
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
  { src: 'index.html', out: 'index.html', path: '/', nav: 'home', title: fill('Monument Signs Are All We Do | {{business_name}}'),
    description: fill('Monument signs are all we make. Routed HDU monuments with free design and free revisions, built in {{lead_time}} after proof approval, with optional installation nationwide.') },
  { src: 'about/index.html', out: 'about/index.html', path: '/about/', nav: 'about', title: fill('About Us | {{business_name}}'),
    description: 'We make monument signs and nothing else. Who we are, why we only do monuments, and how we serve customers nationwide.' },
  { src: 'products/index.html', out: 'products/index.html', path: '/products/', nav: 'products', title: fill('HDU Routed Monument Signs | {{business_name}}'),
    description: 'Routed HDU monument signs, single-sided or double-sided, with faux stone, dimensional letters, illuminated faces and LED message boards as upgrades.' },
  { src: 'design-services/index.html', out: 'design-services/index.html', path: '/design-services/', nav: 'design', title: fill('Design Services: Free Design and Revisions | {{business_name}}'),
    description: 'No charge for design and no charge for revisions. Work with a designer on the size and look of your monument sign until you are 100% happy.' },
  { src: 'process/index.html', out: 'process/index.html', path: '/process/', nav: 'process', title: fill('Our Process, Step by Step | {{business_name}}'),
    description: fill('Five steps from an idea to a monument sign: what it should say, an approximate size, your contact details, a small deposit and design, then {{lead_time}} for production and delivery.') },
  { src: 'installation/index.html', out: 'installation/index.html', path: '/installation/', nav: 'installation', title: fill('Monument Sign Installation, Nationwide | {{business_name}}'),
    description: 'Optional installation, available nationwide. Have your monument sign set for you, or have it delivered for your own contractor to install.' },
  { src: 'gallery/index.html', out: 'gallery/index.html', path: '/gallery/', nav: 'gallery', title: fill('Monument Sign Gallery | {{business_name}}'),
    description: 'Photographs of monument signs: routed HDU, faux stone, dimensional letters and signs lit at night.' },
  { src: 'pricing/index.html', out: 'pricing/index.html', path: '/pricing/', nav: 'pricing', title: fill('Monument Sign Pricing and Upgrades | {{business_name}}'),
    description: 'Prices for standard monument sign sizes and for each optional upgrade: faux stone, metal or acrylic letters, an illuminated face and an LED screen.' },
  { src: 'contact/index.html', out: 'contact/index.html', path: '/contact/', nav: 'contact', title: fill('Contact Us | {{business_name}}'),
    description: 'Tell us what you want on your monument sign and an approximate size. We reply with a proposal, and design is free.' },
  { src: 'design/index.html', out: 'design/index.html', path: '/design/', nav: 'pricing', title: fill('Sketch and Price a Monument Sign | {{business_name}}'),
    description: 'Try sizes, shapes, bases, letters and colors and watch the drawing and the price change. A starting point for your designer, not a final design.' },
  { src: 'questions/index.html', out: 'questions/index.html', path: '/questions/', title: fill('Questions and Answers | {{business_name}}'),
    description: 'Questions about ordering a monument sign, the sign itself, installation and payment.' },
  { src: '404.html', out: '404.html', path: '/404', title: fill('Page not found | {{business_name}}'), description: fill('{{business_name}}. Monument signs are all we do.'), noindex: true },
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

// The stylesheet first, then Besley, the headline face. Libre Franklin swaps in over a
// metric-matched fallback without moving anything. app.js is small and only marks the page as
// scripted and starts the reveals; it loads the rest after the page has loaded, so scripts
// never take bandwidth from the first photograph, which is the largest paint.
const assetsHead = [
  `<link rel="stylesheet" href="${assetMap['css/site.css']}">`,
  `<link rel="preload" href="${assetMap['fonts/besley-latin-wght-normal.woff2']}" as="font" type="font/woff2" crossorigin>`,
  `<script type="module" src="${appUrl}"></script>`,
].join('\n');

// ---------- render ----------
const partials = {};
for (const f of await readdir(join(SRC, 'partials'))) partials[basename(f, '.html')] = await readFile(join(SRC, 'partials', f), 'utf8');

const contactExtra = [
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
  '@context': 'https://schema.org', '@type': 'Service', name: 'Custom monument signs', serviceType: 'Routed HDU monument signs, designed and built to order, with optional installation',
  provider: { '@type': 'Organization', name: config.business_name, url: site + '/' },
  areaServed: { '@type': 'Country', name: 'United States' },
};
if (!DRAFT) {
  serviceLd.offers = config.pricing.sizes.filter((s) => s.single != null).map((s) => ({
    '@type': 'Offer', name: `${sizeWords(s).replace(/\u00a0/g, ' ')} monument sign, single-sided`,
    price: String(s.single), priceCurrency: 'USD', url: `${site}/design/?size=${s.id}#design`,
  }));
}
const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: config.questions.flatMap((g) => g.items.map((it) => ({
    '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: fill(it.a) },
  }))),
};

const photos = JSON.parse(await readFile(join(SRC, 'static/photos/manifest.json'), 'utf8'));
const photoFiles = (id) => {
  if (!photos[id]) fail(`unknown photo ${id}`);
  return [...photos[id].files].sort((a, b) => a.w - b.w);
};
const srcset = (id) => photoFiles(id).map((f) => `/photos/${f.file} ${f.w}w`).join(', ');
// {{@photo:id|sizes|mode}}: mode holds "first" (the page's largest photograph), "eager" (above the fold) and/or "deco" (decorative, empty alt).
function photo(arg = '') {
  const [id, sizes = '100vw', mode = ''] = arg.split('|');
  const files = photoFiles(id);
  const largest = files.at(-1), small = files[0];
  const load = mode.includes('first') ? ' fetchpriority="high"' : mode.includes('eager') ? '' : ' loading="lazy"';
  return `<img src="/photos/${small.file}" srcset="${srcset(id)}" sizes="${R.esc(sizes)}" width="${largest.w}" height="${largest.h}" alt="${mode.includes('deco') ? '' : R.esc(photos[id].alt)}"${load} decoding="async">`;
}
// {{@frame:id|shape|sizes|mode}}: a photograph in a frame shaped like a sign face, standing on its base line.
function frame(arg = '') {
  const [id, shape = 'arch', sizes = '(min-width: 960px) 44vw, 100vw', mode = ''] = arg.split('|');
  return `<figure class="frame frame-${shape}"${mode ? '' : ' data-reveal="frame"'}><div class="frame-clip">${photo(`${id}|${sizes}|${mode}`)}</div><figcaption>${R.esc(photos[id].cap)}</figcaption></figure>`;
}
const SHAPES = ['arch', 'flat', 'peak', 'shoulder'];
function marquee(arg = '') {
  const [dir, ...ids] = arg.split('|');
  const item = (id, i, hidden) => `<li${hidden ? ' aria-hidden="true"' : ''}><figure class="mq-item frame-${SHAPES[i % SHAPES.length]}"><div class="frame-clip">${photo(`${id}|320px|${hidden ? 'deco' : ''}`)}</div><figcaption>${R.esc(photos[id].cap)}</figcaption></figure></li>`;
  return `<div class="marquee marquee-${dir}" data-marquee><ul class="marquee-track">${ids.map((id, i) => item(id, i, false)).join('')}${ids.map((id, i) => item(id, i, true)).join('')}</ul></div>`;
}
const GALLERY_ORDER = ['indian-head-park', 'yorktown-welcome', 'burhani-park', 'high-prairie', 'willow-hill', 'palos-hills', 'saint-edmund', 'templeton-reserve',
  'tekserve-dark', 'yorktown-apartments', 'hyatt', 'fair-hill', 'tekserve-cream', 'baycrest', 'high-prairie-night', 'elm-creek', 'saint-edmund-side', 'smucker',
  'yorktown-letters', 'police-department', 'ophelia-inlet', 'address-monument', 'fabricated-letters', 'st-john', 'vulcan', 'tekserve-dark-side', 'shop-arch-pillars',
  'shop-boulder', 'high-prairie-detail', 'shop-stacked-stone'];
for (const id of Object.keys(photos)) if (!GALLERY_ORDER.includes(id)) fail(`photo ${id} is not in the gallery order`);
const GROUPS = [['hdu', 'HDU routed'], ['stone', 'Faux stone'], ['letters', 'Dimensional letters'], ['lit', 'Lit signs'], ['shop', 'In the shop']];
// Photographs the owner adds to config.gallery come first.
const ownPhotos = (config.gallery || []).map((p) => `<li data-tags="${R.esc(p.tags || '')}"><button type="button" class="gallery-item" data-full="${R.esc(p.src)}" aria-label="Open ${R.esc(p.place)}">` +
  `<img src="${R.esc(p.src)}" width="${Number(p.width)}" height="${Number(p.height)}" alt="${R.esc(p.alt || '')}" loading="lazy" decoding="async">` +
  `<span class="gallery-cap">${R.esc(p.place)}. ${R.esc(p.size)}, ${R.esc(p.options)}.</span></button></li>`).join('');
function galleryGrid() {
  return `<ul class="gallery-grid" data-gallery>${ownPhotos}${GALLERY_ORDER.map((id, i) => {
    const m = photos[id];
    return `<li data-tags="${m.tags}"><button type="button" class="gallery-item" data-full="/photos/${photoFiles(id).at(-1).file}" aria-label="Open ${R.esc(m.cap)}">${photo(`${id}|(min-width: 1100px) 30vw, (min-width: 640px) 46vw, 100vw|${i < 3 ? 'eager' : ''}`)}<span class="gallery-cap">${R.esc(m.cap)}</span></button></li>`;
  }).join('')}</ul>`;
}
const galleryFilters = () => `<div class="filters" role="group" aria-label="Filter photographs"><button type="button" class="chip is-on" data-filter="all" aria-pressed="true">All <span class="chip-n">${GALLERY_ORDER.length}</span></button>` +
  GROUPS.map(([tag, label]) => `<button type="button" class="chip" data-filter="${tag}" aria-pressed="false">${label} <span class="chip-n">${GALLERY_ORDER.filter((id) => photos[id].tags.split(' ').includes(tag)).length}</span></button>`).join('') + `</div>`;

// One hundred small tiles: the share of an ordinary sign shop's work that is monuments, and ours.
const shareTiles = (config.other_shops_share.match(/\d+/) || [])[0];
function tiles(kind) {
  const gold = kind === 'us' ? 100 : Number(shareTiles || 0);
  let out = '';
  for (let i = 0; i < 100; i++) out += `<i class="d${(i % 10) + Math.floor(i / 10)}${i < gold ? ' on' : ''}"></i>`;
  return `<div class="tiles tiles-${kind}" aria-hidden="true">${out}</div>`;
}

// The same sign drawn five ways: nothing is set in stone until the proof is approved.
const WAYS = [
  ['Flat top, on a base', { shape: 'flat', base: 'plain', pillars: 'none', field: 'green', raised: 'ivory' }],
  ['Arched, on a stone-look base', { shape: 'arch', base: 'stone', pillars: 'none', field: 'navy', raised: 'ivory' }],
  ['Peaked, with pillars', { shape: 'peak', base: 'stone', pillars: 'flat', field: 'burgundy', raised: 'ivory' }],
  ['Shouldered, on posts', { shape: 'shoulder', base: 'posts', pillars: 'none', field: 'black', raised: 'gold' }],
  ['Arched, with peaked pillars', { shape: 'arch', base: 'stone', pillars: 'peak', field: 'green', raised: 'gold' }],
];
function ways() {
  const st = (o) => ({ ...state0, size: config.pricing.sizes[Math.min(2, config.pricing.sizes.length - 1)].id, lines: ['Your Name', 'Here'], ...o });
  const svgs = WAYS.map(([label, o], i) => `<div class="way${i === 0 ? ' is-on' : ''}" data-way="${i}">${sceneSvg(st(o), config, { aspect: 1.62, uid: `w${i}`, label: `A monument sign drawn as: ${label.toLowerCase()}` })}</div>`).join('');
  const chips = WAYS.map(([label], i) => `<button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-way-pick="${i}" aria-pressed="${i === 0}">${label}</button>`).join('');
  return `<div class="ways" data-ways><div class="ways-stage">${svgs}</div><div class="ways-picks" role="group" aria-label="Draw the same sign another way">${chips}</div></div>`;
}

function sizeTable() {
  const P = config.pricing;
  const cell = (v) => (v == null ? 'With your proposal' : money(v));
  return `<div class="table-wrap"><table class="price-table"><caption class="visually-hidden">Standard sizes and their prices</caption>
  <thead><tr><th scope="col">Sign face</th><th scope="col">Single-sided</th><th scope="col">Double-sided</th><th scope="col">Installation</th></tr></thead>
  <tbody>${P.sizes.map((x) => `<tr><th scope="row">${sizeWords(x)}</th><td class="money">${cell(x.single)}</td><td class="money">${cell(x.double)}</td><td class="money">${x.install == null ? 'With your proposal' : '+' + money(x.install)}</td></tr>`).join('')}</tbody></table></div>`;
}
function price(arg = '') {
  const v = arg.split('.').reduce((o, k) => (o == null ? o : o[k]), config.pricing);
  return v == null ? 'Quoted with your proposal' : v === 0 ? 'Included' : `+${money(v)}`;
}

const SLOTS = {
  photo: (page, arg) => photo(arg),
  frame: (page, arg) => frame(arg),
  marquee: (page, arg) => marquee(arg),
  preload: (page, arg) => `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(arg.split('|')[0])}" imagesizes="${R.esc(arg.split('|')[1] || '100vw')}" fetchpriority="high">`,
  cap: (page, arg) => R.esc(photos[arg].cap),
  tiles: (page, arg) => tiles(arg),
  share_num: () => (shareTiles ? `<span data-count="${shareTiles}">${shareTiles}</span>%` : 'A sliver'),
  ways: () => ways(),
  size_table: () => sizeTable(),
  price: (page, arg) => price(arg),
  price_from: () => money(Math.min(...config.pricing.sizes.map((s2) => s2.single).filter((v) => v != null))),
  photo_count: () => String(GALLERY_ORDER.length),
  gallery_grid: () => galleryGrid(),
  gallery_filters: () => galleryFilters(),
  assets: () => assetsHead,
  robots: (page) => (DRAFT || page.noindex ? '<meta name="robots" content="noindex">\n' : ''),
  draft_notice: () => (DRAFT ? '<div class="draft-notice"><p class="wrap">Draft site. Prices and terms shown are samples.</p></div>\n' : ''),
  contact_extra: () => contactExtra,
  portal_link: () => (portalUrl ? `<li><a href="${R.esc(portalUrl)}">See your orders and payments</a></li>` : ''),
  form_extras: () => R.formExtras(tokens),
  hero: () => R.hero(state0, config),
  install: () => installSection(config, state0),
  hero_total: () => (q0.priced ? money(q0.total) : messages.unpriced),
  builder: () => R.builder(config, state0),
  lineup: () => R.lineupSvg(config, state0),
  covers: () => R.covers(config),
  questions: () => R.questions(config, fill),
  jsonld: (page) => (page.path === '/' || page.path === '/pricing/' ? R.jsonLd([orgLd, serviceLd]) : page.path === '/questions/' ? R.jsonLd([faqLd]) : ''),
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
  html = html.replace(/\{\{@([a-z_]+)(?::([^}]*))?\}\}/g, (m, name, arg) => {
    if (!SLOTS[name]) fail(`${page.src}: unknown render slot ${name}`);
    return SLOTS[name](page, arg);
  });
  if (/\{\{[^}]*\}\}/.test(html.replace(/<script type="application\/(?:ld\+)?json"[\s\S]*?<\/script>/g, ''))) {
    fail(`${page.src}: unresolved token after rendering`);
  }
  html = html.replace(/data-feature="([a-z_]+)"/g, (m, f) => {
    if (!(f in config.features)) fail(`${page.src}: unknown feature ${f}`);
    return config.features[f] ? m : `${m} hidden`;
  });
  // mark the current page in the main navigation
  if (page.nav) html = html.replaceAll(`data-nav="${page.nav}"`, `data-nav="${page.nav}" aria-current="page"`);
  return html;
}

for (const page of PAGES) {
  const template = await readFile(join(SRC, page.src), 'utf8');
  const html = render(template, page);
  await mkdir(join(OUT, dirname(page.out)), { recursive: true });
  await writeFile(join(OUT, page.out), html);
}

// ---------- static files, robots, sitemap ----------
async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const e of await readdir(from, { withFileTypes: true })) {
    if (e.name === 'manifest.json') continue;
    if (e.isDirectory()) await copyTree(join(from, e.name), join(to, e.name));
    else await copyFile(join(from, e.name), join(to, e.name));
  }
}
await copyTree(join(SRC, 'static'), OUT);
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
