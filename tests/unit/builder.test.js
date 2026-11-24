import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, unconfirmed, fillTokens, tokensFrom } from '../../src/js/builder/config.js';
import { defaults, sanitize, isDefault, splitName } from '../../src/js/builder/state.js';
import { quote, optionPrice, money } from '../../src/js/builder/pricing.js';
import { encode, decode } from '../../src/js/builder/share.js';
import { hero, scene, lineup, anatomy, option, shade, lineWidthEm, describe } from '../../src/js/builder/draw.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const raw = JSON.parse(await readFile(root + 'content/site.config.json', 'utf8'));
const config = resolve(raw);
const clone = () => JSON.parse(JSON.stringify(config));
const base = () => ({ ...defaults(config) });

// ---------- pricing ----------
test('pricing: the default design is the largest size, stone-look base, installed', () => {
  const q = quote(base(), config);
  assert.deepEqual(q.lines.map((l) => [l.label, l.amount]), [['Sign', 4000], ['Stone-look base', 300], ['Installation', 800]]);
  assert.equal(q.total, 5100);
  assert.equal(q.deposit, 2550);
  assert.equal(q.priced, true);
});

test('pricing: every option adds its price, and zero-priced lines are not listed except the sign', () => {
  const s = { ...base(), size: '60x36', sides: 2, shape: 'peak', base: 'plain', pillars: 'peak', lettering: 'metal', install: false };
  const q = quote(s, config);
  assert.deepEqual(q.lines.map((l) => [l.id, l.amount]), [['sign', 3000], ['shape', 100], ['pillars', 600], ['lettering', 400]]);
  assert.equal(q.total, 4100);
  for (const [group, id, amount] of [['shape', 'shoulder', 100], ['shape', 'flat', 0], ['shape', 'arch', 0], ['base', 'stone', 300],
    ['base', 'posts', 0], ['pillars', 'flat', 500], ['lettering', 'acrylic', 300], ['lettering', 'routed', 0]]) {
    const t = quote({ ...base(), base: 'plain', shape: 'flat', [group]: id }, config).total;
    const zero = quote({ ...base(), base: 'plain', shape: 'flat' }, config).total;
    assert.equal(t - zero, amount, `${group}=${id}`);
  }
  const zeroSign = quote({ ...base(), base: 'plain', install: false }, config);
  assert.deepEqual(zeroSign.lines.map((l) => l.id), ['sign']);
});

test('pricing: posts ignore any pillar choice; installation adds the size install price', () => {
  const q = quote({ ...base(), base: 'posts', pillars: 'flat' }, config);
  assert.ok(!q.lines.some((l) => l.id === 'pillars'));
  assert.equal(quote({ ...base(), size: '48x30', base: 'plain' }, config).total, 1000 + 500);
});

test('pricing: an option can be priced per size', () => {
  const c = clone();
  c.pricing.base.stone = { '48x30': 150, '60x36': 200, '72x42': 250, '96x48': 350 };
  assert.equal(optionPrice(c, 'base', 'stone', '48x30'), 150);
  assert.equal(quote({ ...base(), size: '96x48' }, c).total, 4000 + 350 + 800);
  assert.equal(quote({ ...base(), size: '48x30' }, c).total, 1000 + 150 + 500);
});

test('pricing: an unpriced option makes the whole quote unpriced', () => {
  const c = clone();
  c.pricing.lettering.metal = null;
  const q = quote({ ...base(), lettering: 'metal' }, c);
  assert.equal(q.priced, false);
  assert.equal(q.total, null);
  assert.equal(q.deposit, null);
  const c2 = clone();
  c2.pricing.base.stone = { '48x30': 100 };     // missing for the chosen size
  assert.equal(quote(base(), c2).priced, false);
});

test('pricing: deposit rounds to whole dollars', () => {
  const c = clone();
  c.pricing.deposit_percent = 33;
  const q = quote({ ...base(), size: '48x30', base: 'plain', install: false }, c);   // 1000
  assert.equal(q.deposit, 330);
  c.pricing.sizes[0].single = 1001;
  assert.equal(quote({ ...base(), size: '48x30', base: 'plain', install: false }, c).deposit, Math.round(1001 * 0.33));
  c.pricing.deposit_percent = 50;
  c.pricing.sizes[0].single = 1001;
  assert.equal(quote({ ...base(), size: '48x30', base: 'plain', install: false }, c).deposit, 501);   // 500.5 rounds up
  assert.equal(money(1234567), '$1,234,567');
});

// ---------- state and sharing ----------
test('sharing: a state survives encode and decode', () => {
  const s = sanitize({ ...base(), lines: ['Alder Creek', 'Homeowners'], style: 'sans', size: '60x36', shape: 'shoulder', sides: 2,
    base: 'plain', pillars: 'peak', lettering: 'acrylic', field: 'navy', raised: 'gold', paintCode: 'SW 6258 Tricorn Black',
    lighting: true, install: false, zip: '30301' }, config);
  const back = decode(encode(s), config);
  assert.deepEqual(back, s);
  const unicode = sanitize({ ...base(), lines: ['Café Ñandú', 'Señora’s'] }, config);
  assert.deepEqual(decode(encode(unicode), config), unicode);
});

test('sharing: unknown values fall back to defaults, and garbage decodes to the default', () => {
  const d = defaults(config);
  const tampered = Buffer.from(JSON.stringify({ size: '999x1', shape: 'star', base: 'gold', field: 'chartreuse', sides: 7, lettering: 'neon', lines: 'x', zip: '123' }))
    .toString('base64url');
  const s = decode(tampered, config);
  for (const k of ['size', 'shape', 'base', 'field', 'sides', 'lettering', 'lines', 'zip']) assert.deepEqual(s[k], d[k], k);
  assert.deepEqual(decode('%%%not-base64', config), d);
  assert.deepEqual(decode('', config), d);
});

test('state: rules between options', () => {
  assert.equal(sanitize({ ...base(), base: 'posts', pillars: 'flat' }, config).pillars, 'none');
  assert.equal(sanitize({ ...base(), lines: ['x'.repeat(40)] }, config).lines[0].length, 28);
  assert.deepEqual(sanitize({ ...base(), lines: ['', 'Only'] }, config).lines, ['Only']);
  assert.equal(sanitize({ ...base(), paintCode: 'y'.repeat(200) }, config).paintCode.length, 80);
  assert.equal(isDefault(base(), config), true);
  assert.equal(isDefault({ ...base(), lines: ['Alder Creek'] }, config), false);
  assert.deepEqual(splitName('Alder Creek Homeowners'), ['Alder Creek', 'Homeowners']);
  assert.deepEqual(splitName('Alder Creek'), ['Alder Creek']);
  assert.ok(splitName('A'.repeat(50)).every((l) => l.length <= 28));
});

// ---------- drawing ----------
test('drawing: the same state always yields the identical string', () => {
  const s = sanitize({ ...base(), lines: ['Alder Creek', 'Homeowners'], pillars: 'peak', lettering: 'metal' }, config);
  assert.equal(scene(s, config, { dims: true, aspect: 1.55 }), scene(s, config, { dims: true, aspect: 1.55 }));
  assert.equal(hero(s, config), hero(sanitize(JSON.parse(JSON.stringify(s)), config), config));
  assert.equal(lineup(config, base()), lineup(config, base()));
  assert.equal(anatomy(config, base()), anatomy(config, base()));
  for (const k of ['stone', 'pillars', 'metal', 'acrylic']) assert.equal(option(k, config, base()), option(k, config, base()));
});

test('drawing: shadows follow the paint; the default green shades to about #143326', () => {
  const g = shade('#1F4A3A');
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(g.slice(i, i + 2), 16));
  const [er, eg, eb] = [0x14, 0x33, 0x26];
  assert.ok(Math.abs(r - er) <= 3 && Math.abs(gg - eg) <= 3 && Math.abs(b - eb) <= 3, g);
  const navy = scene({ ...base(), field: 'navy' }, config);
  assert.ok(navy.includes(shade('#1E2F4D')));
});

test('drawing: every option changes the drawing', () => {
  const ref = scene(base(), config, { dims: true });
  const changes = [{ size: '48x30' }, { shape: 'flat' }, { shape: 'peak' }, { shape: 'shoulder' }, { base: 'posts' }, { base: 'plain' },
    { pillars: 'flat' }, { pillars: 'peak' }, { lettering: 'metal' }, { lettering: 'acrylic' }, { field: 'navy' }, { raised: 'gold' },
    { style: 'sans' }, { lines: ['Alder Creek'] }];
  for (const c of changes) assert.notEqual(scene(sanitize({ ...base(), ...c }, config), config, { dims: true }), ref, JSON.stringify(c));
  assert.match(describe({ ...base(), lines: ['Alder Creek', 'Homeowners'] }, config), /^A monument sign reading Alder Creek Homeowners\. 8 feet wide, arched top, stone-look base\.$/);
});

test('drawing: lettering width comes from the committed glyph table', () => {
  assert.ok(lineWidthEm('Monument signs.') > lineWidthEm('Monument'));
  assert.ok(lineWidthEm('WWW') > lineWidthEm('iii'));
  assert.ok(lineWidthEm('Ü') > 0 && lineWidthEm('’') > 0);
});

test('drawing: the hero pre-rendered in dist/index.html equals draw.js for the default state', async () => {
  const out = 'dist-unit-test';
  execFileSync(process.execPath, ['scripts/build.js', '--out', out], { cwd: root, stdio: 'pipe' });
  const html = await readFile(root + out + '/index.html', 'utf8');
  await rm(root + out, { recursive: true, force: true });
  const expected = hero(defaults(config), config, { intro: true });
  const m = html.match(/<div class="sign-drawing" data-sign>([\s\S]*?)<\/div>\s*<div class="name-row">/);
  assert.ok(m, 'hero slot found');
  assert.equal(m[1], expected);
});

// ---------- config ----------
test('config: unconfirmed values are listed and tokens resolve', () => {
  const list = unconfirmed(raw);
  for (const p of ['business_name', 'pricing.sizes', 'pricing.deposit_percent', 'policies.warranty', 'questions[2].items[2].a']) assert.ok(list.includes(p), p);
  const t = tokensFrom(config);
  assert.equal(fillTokens('{{lead_time|cap}} from approval.', t), 'Four to six weeks from approval.');
  assert.equal(fillTokens('Ask for. {{permit_statement}}', t), 'Ask for.');
  assert.throws(() => fillTokens('{{nope}}', t), /Unresolved token/);
  assert.equal(t.size_count_word, 'Four');
  assert.equal(t.phone_href, 'tel:+15550100199');
});

test('build: owner photographs and the customer portal link render once supplied', async () => {
  const cfg = JSON.parse(JSON.stringify(raw));
  cfg.stripe_portal_url = { value: 'https://billing.stripe.com/p/login/test_123', confirmed: true };
  cfg.gallery = [{ src: '/og.png', width: 1200, height: 630, alt: 'Entrance sign at Cedar Hollow', place: 'Cedar Hollow', size: '8 ft × 4 ft', options: 'stone-look base, pillars' }];
  await writeFile(root + 'content/test-config.tmp.json', JSON.stringify(cfg));
  const out = 'dist-unit-test-2';
  try {
    execFileSync(process.execPath, ['scripts/build.js', '--config', 'content/test-config.tmp.json', '--out', out], { cwd: root, stdio: 'pipe' });
    const home = await readFile(root + out + '/index.html', 'utf8');
    assert.match(home, /<section class="part" id="work"[\s\S]*Signs we have built\./);
    assert.match(home, /<img src="\/og\.png" width="1200" height="630" alt="Entrance sign at Cedar Hollow" loading="lazy" decoding="async">/);
    assert.match(home, /Cedar Hollow\. 8 ft × 4 ft, stone-look base, pillars\./);
    assert.match(home, /<a href="https:\/\/billing\.stripe\.com\/p\/login\/test_123">See your orders and payments<\/a>/);
    const how = await readFile(root + out + '/how-it-works/index.html', 'utf8');
    assert.match(how, /See your orders and payments/);
  } finally {
    await rm(root + out, { recursive: true, force: true });
    await rm(root + 'content/test-config.tmp.json', { force: true });
  }
  const plain = await readFile(root + 'dist/index.html', 'utf8').catch(() => '');
  if (plain) { assert.ok(!plain.includes('id="work"')); assert.ok(!plain.includes('See your orders and payments')); }
});

test('build: features switched off in the config are built hidden; --all-features shows them', async () => {
  const cfg = JSON.parse(JSON.stringify(raw));
  cfg.features = { deposits: false, invoice_payment: false, email_design: false, file_uploads: false };
  await writeFile(root + 'content/test-config2.tmp.json', JSON.stringify(cfg));
  try {
    execFileSync(process.execPath, ['scripts/build.js', '--config', 'content/test-config2.tmp.json', '--out', 'dist-unit-test-3'], { cwd: root, stdio: 'pipe' });
    execFileSync(process.execPath, ['scripts/build.js', '--config', 'content/test-config2.tmp.json', '--out', 'dist-unit-test-4', '--all-features'], { cwd: root, stdio: 'pipe' });
    const off = await readFile(root + 'dist-unit-test-3/index.html', 'utf8');
    const on = await readFile(root + 'dist-unit-test-4/index.html', 'utf8');
    for (const f of ['file_uploads', 'email_design', 'invoice_payment']) {
      assert.match(off, new RegExp(`data-feature="${f}" hidden`), `${f} hidden`);
      assert.doesNotMatch(on, new RegExp(`data-feature="${f}" hidden`), `${f} shown`);
    }
    assert.doesNotMatch(off, /Deposit today \(50%\)<\/dt>/, 'no deposit line with deposits off');
    assert.match(on, /Deposit today \(50%\)<\/dt>/);
    assert.match(off, /"features":\{"deposits":false/);
  } finally {
    for (const d of ['dist-unit-test-3', 'dist-unit-test-4']) await rm(root + d, { recursive: true, force: true });
    await rm(root + 'content/test-config2.tmp.json', { force: true });
  }
});
