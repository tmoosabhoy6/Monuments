// Copy review (SPEC §12): every heading, paragraph, label, button and message in SPEC §7 (and the
// quote-form messages in §9.1) must appear word for word in what the site ships: the built pages,
// the browser's message strings, or the Worker's email templates.
//
// Method: take every quoted string and every prose sentence from those sections, resolve
// {{tokens}} from the config, treat {placeholders} as wildcards, and look for each in the corpus.
// Differences that were decided on purpose are listed in KNOWN and reported, not failed.
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve, tokensFrom, fillTokens } from '../src/js/builder/config.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const spec = await readFile(root + 'SPEC.md', 'utf8');
const config = resolve(JSON.parse(await readFile(root + 'content/site.config.json', 'utf8')));
const tokens = tokensFrom(config, { year: String(new Date().getFullYear()) });

// Deliberate differences, each recorded in PROGRESS.md.
const CONDITIONAL = {
  'See your orders and payments': 'rendered only when config.stripe_portal_url is set (SPEC §9.4); it is empty in the sample config',
  'Signs we have built': 'the #work section renders only with owner photographs (SPEC §6.5); there are none yet',
  'Each caption: {place or customer}. {size}, {options}': 'gallery captions; no photographs yet',
  'Policies: Deposit, Approval, Cancellation, Warranty, Installation, Delivery': 'shown as the label "Policies" followed by the six links',
};
// fragments of the spec's own instructions, not copy
const INSTRUCTIONS = [/^\. Sentence case/, /^Close control: Close/, /^Link: See your orders/];
const KNOWN = {
  'Standard sizes are priced on this page, and the builder prices any combination of options as you choose them.':
    '"on this page" became "on this site": sizes and questions are on different pages now',
};

const section = (start, end) => spec.slice(spec.indexOf(start), spec.indexOf(end));
const text = section('## 7. Copy', '## 8. The Monument Builder') + section('Button: "Send quote request"', 'Every form has a hidden honeypot');

// ---------- corpus ----------
async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
let corpus = '';
for (const f of await walk(root + 'dist')) {
  if (extname(f) !== '.html') continue;
  const html = await readFile(f, 'utf8');
  const data = html.match(/<script type="application\/json" id="site-data">([\s\S]*?)<\/script>/);
  if (data) corpus += ' ' + JSON.stringify(JSON.parse(data[1]).messages);
  corpus += ' ' + decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '));
  for (const m of html.matchAll(/(?:aria-label|placeholder|content)="([^"]*)"/g)) corpus += ' ' + decode(m[1]);
}
// the emails, rendered as they are sent
const M = await import('../worker/lib/messages.js');
for (const kind of ['quote', 'drawing', 'deposit']) corpus += ' ' + M.toBusiness({ kind, name: 'Pat Lee', reference: 'MS-7K4Q2P', fields: {}, design: null, fileLinks: [], base: 'https://example.com' }).subject;
for (const e of [M.quoteReceived({ name: 'Pat Lee', reference: 'MS-7K4Q2P' }), M.drawingReceived({ name: 'Pat Lee', reference: 'MS-7K4Q2P', link: 'https://example.com/?d=x#design' }),
  M.depositPaid({ name: 'Pat Lee', reference: 'MS-7K4Q2P', amount: 2550 }), M.designEmail({ link: 'https://example.com/?d=x#design' })]) corpus += ` ${e.subject} ${e.text}`;
corpus += ' ' + (await readFile(root + 'src/js/builder/ui.js', 'utf8'));
corpus = corpus.replace(/ /g, ' ').replace(/\\u2019/g, '’').replace(/\s+/g, ' ');

// ---------- phrases from the spec ----------
const clean = (s) => fillTokens(
  s.replace(/\*\*\[proposed\]\*\*/g, '').replace(/\[proposed\]/g, '').replace(/\*\*|`/g, '').replace(/\*([^*]+)\*/g, '$1'),
  tokens, { tidy: false },
).replace(/\s+/g, ' ').trim();
const phrases = new Set();
for (const m of text.matchAll(/"([^"\n]{3,})"/g)) phrases.add(clean(m[1]));
for (let raw of text.split('\n')) {
  raw = raw.trim().replace(/^[-*] /, '');
  let line = raw;
  if (!line || /^(#|\||```|>)/.test(line) || /^[-*] \*\*?[A-Z][^*:]*:?\*\*? *$/.test(line)) continue;
  line = line.replace(/^[-*] /, '').replace(/^\*[^*]+:\*\s*/, '').replace(/^\*\*[^*]+\*\*\s*/, '').replace(/\(id `[^`]+`\)\s*:?\s*/, '');
  line = line.replace(/^(Heading|Intro|Paragraph|Sentence|Link|Links|Button|Lede|Title|Meta description|Below|Per size|Field label|Field placeholder|Primary button|Price label|H1, on the sign|Contact|Legal line|Privacy \(`#privacy`, a disclosure\)|Panel heading|Price summary|Actions|Options, one line each under its small drawing|Anatomy drawing labels|Voice|Included|Not included)\s*:\s*/i, '');
  if (/^(Text marked|This is the final text|Each caption|Plain text with|To the business|To the customer|Four links|Save or send dialog|Approval drawing dialog|Reserve dialog|After paying|Pay an invoice dialog|A disclosure under|If any chosen option|One short paragraph|Validation runs|Fields and messages)/.test(line)) {
    for (const m of line.matchAll(/"([^"]+)"/g)) phrases.add(clean(m[1]));
    continue;
  }
  if (/\{\{[a-z_]+\}\}`?\s*\(/.test(line) || line.includes('|')) continue;
  if (/^(Voice|Close control|Price summary|Actions|Custom quote form|Each caption|Per size|Below: Something else)/i.test(raw) || /\(for example|Fields and messages|the same two lists|The owner supplies/.test(line)) {
    for (const m of line.matchAll(/"([^"]+)"/g)) phrases.add(clean(m[1]));
    continue;
  }
  if (line.includes('"') && !/^Yes\. Choose/.test(line)) { for (const m of line.matchAll(/"([^"]+)"/g)) phrases.add(clean(m[1])); continue; }
  for (const sentence of clean(line).split(/(?<=[.?])\s+(?=[A-Z“])/)) if (sentence.length > 3) phrases.add(sentence);
}

phrases.delete('New {quote request | drawing request | deposit}: {name}, {reference}');
for (const t of ['quote request', 'drawing request', 'deposit']) phrases.add(`New ${t}: {name}, {reference}`);
const toPattern = (p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[a-z_ ]+\\\}/g, '[^]{0,120}?').replace(/['’]/g, "['’]").replace(/["“”]/g, '["“”]'));
const missing = [], known = [];
let checked = 0;
for (const p of phrases) {
  if (!p || /^\{[^}]+\}$/.test(p) || p.length < 4) continue;
  checked++;
  const variants = [p, p.replace(/\.+$/, ''), p.charAt(0).toUpperCase() + p.slice(1), p.replace(/\.\.$/, '.')];
  if (variants.some((v) => v.length > 2 && toPattern(v).test(corpus))) continue;
  if (INSTRUCTIONS.some((r) => r.test(p))) { checked--; continue; }
  const cond = Object.keys(CONDITIONAL).find((k) => p.replace(/\.$/, '') === k);
  if (cond) { known.push(`${p}\n      (${CONDITIONAL[cond]})`); continue; }
  if (KNOWN[p]) known.push(`${p}\n      (${KNOWN[p]})`); else missing.push(p);
}
console.log(`Copy review: ${checked} headings, sentences, labels, buttons and messages from SPEC §7 and §9.1 checked.`);
if (known.length) console.log(`\nDeliberate or conditional differences (${known.length}):\n` + known.map((k) => `  - ${k}`).join('\n'));
if (missing.length) {
  console.error(`\nNot found word for word (${missing.length}):\n` + missing.map((m) => `  - ${m}`).join('\n'));
  process.exit(1);
}
console.log('\nEvery other phrase appears word for word.');
