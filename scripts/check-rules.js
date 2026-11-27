// Scans dist/ for anything the hard constraints forbid (SPEC §12, check:rules).
//   node scripts/check-rules.js [dir]
import { readFile, readdir } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, process.argv[2] || 'dist');
const ALLOWED_HOSTS = ['challenges.cloudflare.com', 'static.cloudflareinsights.com'];
const FONT_OK = new Set(['besley', 'besley fallback', 'libre franklin', 'libre franklin fallback', 'serif', 'sans-serif', 'inherit']);
const WORDS = ['financing', 'poly-armor', 'foamcore', 'peachtree promise', 'hammer test', 'safeguard-coating', 'royal treatment'];

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const problems = [];
const flag = (file, rule, detail) => problems.push(`${relative(root, file)}: ${rule}${detail ? ` (${String(detail).slice(0, 90)})` : ''}`);
const files = (await walk(dir)).filter((f) => ['.html', '.css', '.js', '.svg', '.txt', '.xml'].includes(extname(f)) || f.endsWith('_headers'));

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const ext = extname(file);
  const lower = text.toLowerCase();

  // listeners that cost scroll performance
  for (const m of text.matchAll(/addEventListener\(\s*['"`](scroll|wheel|touchmove|mousewheel)['"`]/g)) flag(file, `a ${m[1]} listener`, m[0]);
  for (const m of text.matchAll(/\bon(scroll|wheel|touchmove)\s*=/gi)) flag(file, `an on${m[1]} handler`, m[0]);

  // effects and properties that are not allowed anywhere
  if (/backdrop-filter/i.test(text)) flag(file, 'backdrop-filter');
  for (const m of text.matchAll(/(^|[;{\s"'])filter\s*:\s*([^;}"']+)/gim)) if (!/^\s*none\s*$/i.test(m[2])) flag(file, 'a filter property', m[0]);
  if (/<filter[\s>]/i.test(text) || /\sfilter="url/i.test(text)) flag(file, 'an SVG <filter>');
  if (/gradient\(/i.test(text)) flag(file, 'a gradient');
  if (/transition\s*:\s*all\b/i.test(text) || /transition-property\s*:\s*all\b/i.test(text)) flag(file, 'transition: all');
  if (/background-attachment\s*:\s*fixed/i.test(text)) flag(file, 'background-attachment: fixed');
  for (const m of text.matchAll(/box-shadow\s*:\s*([^;}]+)/gi)) {
    const v = m[1].trim();
    if (v === 'none') continue;
    for (const shadow of v.split(/,(?![^(]*\))/)) {
      const lengths = shadow.replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}|\binset\b|[a-z-]+\([^)]*\)/gi, '').trim().split(/\s+/).filter(Boolean);
      if (lengths.length >= 3 && parseFloat(lengths[2]) !== 0) flag(file, 'a box-shadow with a blur radius', v);
    }
  }

  // fonts: only the two families (and their metric-matched fallbacks)
  for (const m of text.matchAll(/font-family\s*[:=]\s*("?)([^;}"\n>]+)\1/gi)) {
    for (const fam of m[2].split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase()).filter(Boolean)) {
      if (fam.startsWith('var(')) continue;
      if (!FONT_OK.has(fam)) flag(file, 'a font family other than Besley and Libre Franklin', fam);
    }
  }

  // the arrow, and strings joined by middle dots
  // decorative arrows drawn by the stylesheet are fine; not in copy
  if (ext !== '.css' && text.includes('→')) flag(file, 'the character →');
  if (/\S ·\s?\S/.test(text)) flag(file, 'a middle-dot separator');

  // other companies' trademarks, and financing
  for (const w of WORDS) if (lower.includes(w)) flag(file, `the word "${w}"`);

  if (ext === '.html') {
    // inline style attributes and inline scripts (data blocks of JSON are not scripts)
    for (const m of text.matchAll(/<[a-z][^>]*\sstyle\s*=/gi)) flag(file, 'an inline style attribute', m[0]);
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = m[1];
      if (/\bsrc=/.test(attrs)) continue;
      if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
      if (m[2].trim()) flag(file, 'an inline script', attrs);
    }
    for (const m of text.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) flag(file, 'an inline event handler', m[0]);
    // requests to other hosts: anything the page itself loads
    for (const m of text.matchAll(/<(script|img|link|iframe|source|video|audio|embed)\b[^>]*?\s(src|href)="([^"]+)"/gi)) {
      const [tag, , url] = [m[1].toLowerCase(), m[2], m[3]];
      if (tag === 'link' && /rel="canonical"/.test(m[0])) continue;
      if (/^https?:\/\//i.test(url)) {
        const host = new URL(url).host;
        if (!ALLOWED_HOSTS.includes(host)) flag(file, 'a request to another host', url);
      }
    }
    // exclamation marks in page copy: visible text and the messages the scripts show
    const data = (text.match(/<script type="application\/json" id="site-data">([\s\S]*?)<\/script>/) || [])[1];
    const visible = text
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/i, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    if (visible.includes('!')) flag(file, 'an exclamation mark in page copy', visible.slice(visible.indexOf('!') - 40, visible.indexOf('!') + 5));
    if (data) {
      const strings = [];
      const walkData = (v) => (typeof v === 'string' ? strings.push(v) : v && typeof v === 'object' && Object.values(v).forEach(walkData));
      walkData(JSON.parse(data).messages);
      for (const s of strings) if (s.includes('!')) flag(file, 'an exclamation mark in a message', s);
    }
  }
  if (ext === '.css') {
    for (const m of text.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi)) flag(file, 'a request to another host', m[1]);
  }
  if (ext === '.js') {
    if (/style="|\.setAttribute\(\s*['"]style['"]/.test(text)) flag(file, 'an inline style attribute written by script');
    for (const m of text.matchAll(/['"`](https?:\/\/[^'"`\s/]+)[^'"`]*['"`]/g)) {
      const host = new URL(m[1]).host;
      if (host === 'www.w3.org') continue;                    // the SVG namespace, not a request
      if (!ALLOWED_HOSTS.includes(host)) flag(file, 'a request to another host', m[1]);
    }
  }
}

if (problems.length) {
  console.error(`check:rules failed, ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check:rules passed: ${files.length} files in ${relative(root, dir)}/ scanned, no forbidden listeners, effects, fonts, hosts, characters or words.`);
