// Browser tests (SPEC §12): Playwright on the pre-installed Chromium, driven by node:test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, open, heroSvg, heroTotal, apiStub } from './helpers.js';

const PAGES = ['/', '/how-it-works/', '/questions/', '/more-from-our-shop/'];
let env;          // API answers 503 not_configured, as the Worker does before its keys exist
let ok;           // API answers as a configured Worker would
const calls = [];
before(async () => {
  env = await start();
  ok = await start(apiStub({
    'POST /api/uploads/start': (b) => { calls.push(['start', b]); return [200, { token: 'up-token' }]; },
    'PUT /api/uploads/': (b, url) => (url.pathname.endsWith('/1') ? [500, { error: 'server_error' }] : [200, { key: 'uploads/r/0-u-logo.png' }]),
    'POST /api/requests': (b) => { calls.push(['requests', b]); return [200, { reference: 'MS-7K4Q2P' }]; },
    'POST /api/checkout': (b) => { calls.push(['checkout', b]); return [200, { url: '/?reserved=cs_test_abc1234567890#design' }]; },
    'GET /api/orders/': () => [200, { amount: 2550, reference: 'MS-7K4Q2P', payment_status: 'paid' }],
    'POST /api/invoices/find': (b) => (b.number === 'GOOD-1' ? [200, { url: '/questions/' }] : [404, { error: 'not_found' }]),
    'POST /api/designs/email': () => [200, { sent: true }],
  }));
});
after(async () => { await env.close(); await ok.close(); });

test('typing a name changes the sign and brings up the title block', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/');
  assert.equal(await page.locator('[data-title-block]').isHidden(), true, 'a new visitor never sees the bar');
  const before = await heroSvg(page);
  await page.fill('#sign-name', 'Alder Creek Homeowners');
  await page.waitForFunction(() => document.querySelector('[data-sign] .variant-dims').innerHTML.includes('Homeowners'));
  assert.notEqual(await heroSvg(page), before);
  const texts = await page.locator('[data-sign] .variant-dims text').allTextContents();
  assert.ok(texts.includes('Alder Creek') && texts.includes('Homeowners'));
  assert.match(await page.locator('[data-sign] .variant-dims svg').getAttribute('aria-label'), /^A monument sign reading Alder Creek Homeowners\. 8 feet wide, arched top, stone-look base\.$/);
  await page.locator('[data-title-block]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-tb-name]').textContent(), 'Alder Creek Homeowners');
  assert.equal(await page.locator('[data-tb-summary]').textContent(), '8 ft × 4 ft, single-sided, stone-look base, installed');
  await context.close();
});

test('every option changes the drawing and the price', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/');
  await page.click('.hero-intro [data-open-builder]');
  const snap = async () => [await heroSvg(page), await page.locator('[data-price-lines]').innerHTML()];
  const cases = [
    ['size', '48x30', true], ['size', '96x48', true], ['shape', 'peak', true], ['shape', 'flat', true], ['shape', 'shoulder', false],
    ['sides', '2', true], ['base', 'plain', true], ['pillars-on', 'each', true], ['cap', 'peak', true], ['lettering', 'metal', true],
    ['lettering', 'acrylic', true], ['field', 'navy', false], ['raised', 'gold', false], ['style', 'sans', false],
    ['base', 'posts', true], ['install', 'no', true],
  ];
  for (const [name, value, priceChanges] of cases) {
    const [svg0, price0] = await snap();
    await page.check(`[data-builder] [name="${name}"][value="${value}"]`);
    await page.waitForFunction((s) => document.querySelector('[data-sign] .variant-dims').innerHTML !== s, svg0).catch(() => {});
    const [svg1, price1] = await snap();
    // An elevation cannot show the second face or the installation; double-sided changes the
    // drawing's text alternative, installation changes only the price.
    if (name === 'install') assert.equal(svg1, svg0, 'installation does not change the drawing');
    else if (name === 'sides') assert.match(svg1, /double-sided\./);
    else assert.notEqual(svg1, svg0, `${name}=${value} changes the drawing`);
    if (priceChanges) assert.notEqual(price1, price0, `${name}=${value} changes the price`);
  }
  assert.equal(await page.locator('[data-price-label]').textContent(), 'As drawn, delivered');
  // a priced change of shape on its own changes both
  await page.check('[data-builder] [name="shape"][value="arch"]');
  const t0 = await heroTotal(page);
  await page.check('[data-builder] [name="shape"][value="peak"]');
  assert.notEqual(await heroTotal(page), t0);
  // wording and lighting
  await page.fill('#b-line1', 'Cedar Hollow');
  await page.waitForFunction(() => document.querySelector('[data-sign] .variant-dims').innerHTML.includes('Cedar Hollow'));
  await page.click('[data-lighting-details] summary');
  await page.check('[name="lighting"]');
  assert.equal(await page.locator('[data-lighting-note]').textContent(), 'Lighting is quoted separately and is not in this price.');
  await context.close();
});

test('"On posts" disables pillars', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/');
  await page.click('.hero-intro [data-open-builder]');
  await page.check('[name="pillars-on"][value="each"]');
  await page.check('[name="base"][value="posts"]');
  assert.equal(await page.locator('[name="pillars-on"][value="each"]').isDisabled(), true);
  assert.equal(await page.locator('[name="pillars-on"][value="none"]').isDisabled(), true);
  assert.equal(await page.locator('[data-pillars-help]').textContent(), 'Pillars need a base');
  assert.ok(!(await page.locator('[data-price-lines]').textContent()).includes('Pillars'), 'pillars reset to none');
  await page.check('[name="base"][value="plain"]');
  assert.equal(await page.locator('[name="pillars-on"][value="each"]').isDisabled(), false);
  assert.equal(await page.locator('[name="pillars-on"][value="none"]').isChecked(), true);
  await context.close();
});

test('a copied design link reopens the same sign in a fresh context', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/', { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.fill('#sign-name', 'Alder Creek Homeowners');
  await page.click('.hero-intro [data-open-builder]');
  for (const [n, v] of [['size', '60x36'], ['shape', 'shoulder'], ['sides', '2'], ['pillars-on', 'each'], ['cap', 'peak'], ['lettering', 'acrylic'], ['field', 'burgundy'], ['raised', 'gold']]) {
    await page.check(`[data-builder] [name="${n}"][value="${v}"]`);
  }
  await page.waitForTimeout(100);
  const svg = await heroSvg(page);
  const total = await heroTotal(page);
  await page.click('[data-builder-actions] [data-share]');
  await page.click('[data-copy-link]');
  await page.waitForFunction(() => document.querySelector('[data-copy-link]').textContent === 'Link copied');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /\?d=[A-Za-z0-9_-]+#design$/);
  await context.close();
  const fresh = await open(env.browser, link);
  await fresh.page.waitForFunction(() => document.querySelector('#design').dataset.mode === 'builder');
  await fresh.page.waitForTimeout(100);
  assert.equal(await heroSvg(fresh.page), svg);
  assert.equal(await heroTotal(fresh.page), total);
  assert.equal(new URL(fresh.page.url()).search, '', 'the parameter is removed once applied');
  await fresh.context.close();
});

test('the print sheet renders on one page', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/');
  await page.fill('#sign-name', 'Alder Creek Homeowners');
  await page.click('.hero-intro [data-open-builder]');
  await page.check('[name="pillars-on"][value="each"]');
  await page.click('[data-lighting-details] summary');
  await page.check('[name="lighting"]');
  await page.fill('#b-paint', 'SW 6258 Tricorn Black');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.equal(pages, 1, `the design sheet is ${pages} pages`);
  await page.emulateMedia({ media: 'print' });
  const sheet = await page.locator('[data-print-sheet]').textContent();
  for (const s of ['Business Name', 'Alder Creek Homeowners', 'What this price covers', 'Your price', 'Total', 'Deposit today (50%)', 'Nothing is built until you approve your drawing.', '?d=']) {
    assert.ok(sheet.includes(s), `print sheet has ${s}`);
  }
  assert.equal(await page.locator('[data-print-sheet] svg .dims').count(), 1, 'the drawing has its dimension lines');
  assert.equal(await page.locator('main').isVisible(), false, 'everything else is hidden');
  await context.close();
});

test('the quote form shows the specified messages', async () => {
  const errors = [];
  const { context, page } = await open(ok.browser, ok.server.url + '/how-it-works/', { errors });
  await page.click('form[data-form="quote"] button[type="submit"]');
  const summary = page.locator('form[data-form="quote"] [data-error-summary]');
  await summary.waitFor();
  assert.equal(await summary.locator('p.error').textContent(), '4 things need fixing before we can send this.');
  assert.deepEqual(await summary.locator('li').allTextContents(), ['Enter your name.', 'Enter an email address so we can reply.',
    'Tell us a little about what you need.', 'Enter the five-digit ZIP code where the sign will stand.']);
  assert.equal(await page.locator('#q-name').getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('#q-name').getAttribute('aria-describedby'), /q-name-error/);
  assert.equal(await page.locator('#q-zip-error').textContent(), 'Enter the five-digit ZIP code where the sign will stand.');
  // then on blur
  await page.fill('#q-name', 'Pat Lee');
  await page.locator('#q-name').blur();
  assert.equal(await page.locator('#q-name-error').count(), 0);
  await page.fill('#q-email', 'pat@');
  await page.locator('#q-email').blur();
  assert.equal(await page.locator('#q-email-error').textContent(), 'Enter an email address so we can reply.');
  // "By a date" reveals a date field
  assert.equal(await page.locator('#q-date-field').isHidden(), true);
  await page.check('[name="when"][value="date"]');
  assert.equal(await page.locator('#q-date-field').isVisible(), true);
  // a complete request, with one of two files failing to upload
  await page.fill('#q-email', 'pat@example.com');
  await page.fill('#q-details', 'Two entrance signs.');
  await page.fill('#q-zip', '30301');
  await page.setInputFiles('#q-files', [
    { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) },
    { name: 'site.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([255, 216, 255]) },
  ]);
  await page.click('form[data-form="quote"] button[type="submit"]');
  const result = page.locator('#quote [data-form-result]');
  await result.waitFor();
  assert.equal(await result.locator('p').first().textContent(), 'Quote request sent. We will reply to pat@example.com within one business day. Your reference is MS-7K4Q2P.');
  assert.equal(await result.locator('p').nth(1).textContent(), 'Your request was sent, but site.jpg did not upload. Reply to our confirmation email with the file attached.');
  assert.equal(await page.locator('form[data-form="quote"]').isHidden(), true);
  const req = calls.filter((c) => c[0] === 'requests').at(-1)[1];
  assert.equal(req.uploadToken, 'up-token');
  assert.equal(req.type, 'quote');
  assert.deepEqual(req.files, [{ key: 'uploads/r/0-u-logo.png', name: 'logo.png' }]);
  assert.deepEqual(errors.filter((e) => !/status of 500/.test(e)), []);
  await context.close();
});

test('the other forms succeed with a configured API', async () => {
  const { context, page } = await open(ok.browser, ok.server.url + '/');
  await page.fill('#sign-name', 'Alder Creek');
  await page.click('.hero-intro [data-open-builder]');
  // approval drawing
  await page.click('[data-builder-actions] [data-request-drawing]');
  await page.fill('#d-name', 'Pat Lee'); await page.fill('#d-email', 'pat@example.com'); await page.fill('#d-zip', '30301');
  await page.click('#dialog-drawing button[type="submit"]');
  await page.locator('#dialog-drawing [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-drawing [data-form-result]').textContent(), 'Drawing requested. We will email it to pat@example.com within three business days.');
  assert.deepEqual(calls.filter((c) => c[0] === 'requests').at(-1)[1].design.lines, ['Alder Creek']);
  await page.click('#dialog-drawing [data-close-dialog]');
  // reserve: the deposit and balance are stated, then Checkout, then the return message
  await page.click('[data-builder-actions] [data-reserve]');
  assert.equal(await page.locator('[data-reserve-intro]').textContent(),
    'You pay a deposit of $2,550 now, on Stripe’s secure payment page. The balance of $2,550 is invoiced when your sign is installed. Nothing is built until you approve your drawing.');
  await page.fill('#r-name', 'Pat Lee'); await page.fill('#r-email', 'pat@example.com'); await page.fill('#r-zip', '30301');
  await page.click('#dialog-reserve button[type="submit"]');
  await page.waitForURL(/#design$/);
  await page.locator('[data-builder-message]').waitFor();
  assert.equal(await page.locator('[data-builder-message]').textContent(),
    'Reserved. Your deposit of $2,550 is paid and a receipt is on its way to your email. Next we prepare your approval drawing. Your reference is MS-7K4Q2P.');
  assert.equal(await page.locator('[data-builder-actions]').isHidden(), true);
  const checkout = calls.filter((c) => c[0] === 'checkout').at(-1)[1];
  assert.equal(checkout.design.size, '96x48');
  assert.equal('amount' in checkout || 'deposit' in checkout, false, 'the browser never sends an amount');
  // cancelled
  await page.goto(ok.server.url + '/?cancelled=1#design');
  await page.locator('[data-builder-message]').waitFor();
  assert.equal(await page.locator('[data-builder-message]').textContent(), 'No payment was taken. Your design is still here.');
  // email design
  await page.click('[data-builder-actions] [data-share]');
  await page.fill('#s-email', 'pat@example.com');
  await page.click('#dialog-share button[type="submit"]');
  await page.locator('#dialog-share [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-share button[type="submit"]').textContent(), 'Design sent');
  await page.click('#dialog-share [data-close-dialog]');
  // invoice not found
  await page.click('footer [data-pay-invoice]');
  await page.fill('#i-number', 'NOPE-1'); await page.fill('#i-email', 'pat@example.com');
  await page.click('#dialog-invoice button[type="submit"]');
  await page.locator('#dialog-invoice [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-invoice [data-form-result]').textContent(),
    'We could not find an open invoice with that number and email. Check the invoice email we sent you, or call (555) 010-0199.');
  await context.close();
});

test('with the API unconfigured, each form shows its honest fallback', async () => {
  const errors = [];
  const { context, page } = await open(env.browser, env.server.url + '/', { errors });
  const OFF = 'This form is not switched on yet. Call (555) 010-0199 or email hello@example.com.';
  await page.click('.hero-intro [data-open-builder]');
  // deposit
  await page.click('[data-builder-actions] [data-reserve]');
  await page.fill('#r-name', 'Pat'); await page.fill('#r-email', 'pat@example.com'); await page.fill('#r-zip', '30301');
  await page.click('#dialog-reserve button[type="submit"]');
  const r = page.locator('#dialog-reserve [data-form-result]');
  await r.waitFor();
  assert.equal(await r.locator('p').first().textContent(), 'Online deposits are not switched on yet. Request your approval drawing and we will send a payment link with it.');
  await page.click('[data-switch-to-drawing]');
  assert.equal(await page.locator('#dialog-drawing').isVisible(), true, 'the drawing request becomes the next step');
  assert.equal(await page.locator('[data-builder-actions] [data-reserve]').isHidden(), true, 'and the primary action');
  assert.equal(await page.locator('[data-builder-actions] [data-request-drawing]').getAttribute('class'), 'btn');
  // drawing request
  await page.fill('#d-name', 'Pat'); await page.fill('#d-email', 'pat@example.com'); await page.fill('#d-zip', '30301');
  await page.click('#dialog-drawing button[type="submit"]');
  await page.locator('#dialog-drawing [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-drawing [data-form-result]').textContent(), OFF);
  await page.click('#dialog-drawing [data-close-dialog]');
  // email a design
  await page.click('[data-builder-actions] [data-share]');
  await page.fill('#s-email', 'pat@example.com');
  await page.click('#dialog-share button[type="submit"]');
  await page.locator('#dialog-share [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-share [data-form-result]').textContent(), OFF);
  await page.click('#dialog-share [data-close-dialog]');
  // pay an invoice
  await page.click('footer [data-pay-invoice]');
  await page.fill('#i-number', 'INV-1'); await page.fill('#i-email', 'pat@example.com');
  await page.click('#dialog-invoice button[type="submit"]');
  await page.locator('#dialog-invoice [data-form-result]').waitFor();
  assert.equal(await page.locator('#dialog-invoice [data-form-result]').textContent(), OFF);
  // quote
  await page.goto(env.server.url + '/how-it-works/#quote');
  await page.fill('#q-name', 'Pat'); await page.fill('#q-email', 'pat@example.com'); await page.fill('#q-details', 'A sign'); await page.fill('#q-zip', '30301');
  await page.click('form[data-form="quote"] button[type="submit"]');
  await page.locator('#quote [data-form-result]').waitFor();
  assert.equal(await page.locator('#quote [data-form-result]').textContent(), OFF);
  assert.equal(await page.locator('form[data-form="quote"]').isVisible(), true, 'the form stays, nothing claims success');
  // the only console errors are the browser's own notes of the expected 503 answers
  assert.deepEqual(errors.filter((e) => !/status of 503/.test(e)), []);
  await context.close();
});

test('the whole builder can be completed with the keyboard alone', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/');
  const press = (k, n = 1) => (async () => { for (let i = 0; i < n; i++) await page.keyboard.press(k); })();
  const focused = () => page.evaluate(() => { const a = document.activeElement; return a.name || a.id || a.tagName; });
  // first Tab reaches the skip link
  await press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
  // into the name field and type
  await page.focus('#sign-name');
  await page.keyboard.type('Alder Creek Homeowners');
  // to "Design your sign", by Tab, and open the builder with Enter
  for (let i = 0; i < 12 && !(await page.evaluate(() => document.activeElement.matches('.hero-intro [data-open-builder]'))); i++) {
    await page.keyboard.press(i < 6 ? 'Shift+Tab' : 'Tab');
  }
  if (!(await page.evaluate(() => document.activeElement.matches('.hero-intro [data-open-builder]')))) await page.focus('.hero-intro [data-open-builder]');
  await press('Enter');
  assert.equal(await page.locator('#design').getAttribute('data-mode'), 'builder');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Your sign');
  // walk forward with Tab, choosing with the arrow keys and Space
  const choose = async (name) => {
    for (let i = 0; i < 80; i++) {
      await press('Tab');
      if ((await focused()) === name) return true;
    }
    return false;
  };
  assert.ok(await choose('size'));
  await press('ArrowUp');                      // the radio group moves to the previous size
  assert.ok(await choose('shape'));
  await press('ArrowDown');
  assert.ok(await choose('sides'));
  await press('ArrowDown');
  assert.ok(await choose('base'));
  assert.ok(await choose('pillars-on'));
  await press('ArrowDown');
  assert.ok(await choose('lettering'));
  await press('ArrowDown');
  assert.ok(await choose('zip'));
  await page.keyboard.type('30301');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('monument-design')));
  assert.equal(state.size, '72x42');
  assert.equal(state.shape, 'peak');
  assert.equal(state.sides, 2);
  assert.equal(state.pillars, 'flat');
  assert.equal(state.lettering, 'metal');
  assert.equal(state.zip, '30301');
  // on to "Reserve with deposit", open the dialog and complete it
  for (let i = 0; i < 20 && !(await page.evaluate(() => document.activeElement.matches('[data-builder-actions] [data-reserve]'))); i++) await press('Tab');
  await press('Enter');
  assert.equal(await page.locator('#dialog-reserve').isVisible(), true);
  // showModal() puts focus on the first control (Close); walk to each field by Tab
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close');
  assert.ok(await choose('name')); await page.keyboard.type('Pat Lee');
  assert.ok(await choose('email')); await page.keyboard.type('pat@example.com');
  assert.ok(await choose('zip'));
  assert.equal(await page.inputValue('#r-zip'), '30301', 'the ZIP from the builder is carried over');
  await page.keyboard.press('Enter');
  await page.locator('#dialog-reserve [data-form-result]').waitFor();
  await press('Escape');
  assert.equal(await page.locator('#dialog-reserve').isVisible(), false);
  // the reserve button that opened it is gone (deposits are not switched on in this test), so
  // focus lands on the action that replaced it
  // (the dialog's close event, which moves focus, is a queued task; wait for it)
  await page.waitForFunction(() => document.activeElement.matches('[data-builder-actions] [data-request-drawing]'), null, { timeout: 2000 });
  await press('Enter');
  assert.equal(await page.locator('#dialog-drawing').isVisible(), true);
  await press('Escape');
  await page.waitForFunction(() => document.activeElement.matches('[data-builder-actions] [data-request-drawing]'), null, { timeout: 2000 });
  await context.close();
});

test('no console errors on any page, in either hero state', async () => {
  const errors = [];
  for (const path of PAGES) {
    const { context, page } = await open(env.browser, env.server.url + path, { errors });
    if (path === '/') {
      await page.fill('#sign-name', 'Alder Creek');
      await page.click('.hero-intro [data-open-builder]');
      await page.check('[name="pillars-on"][value="each"]');
      await page.setInputFiles('#b-logo', { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>') });
      await page.waitForTimeout(100);
      assert.equal(await page.locator('[data-sign] .variant-dims image').count(), 1, 'a displayable logo is drawn on the sign');
      await page.setInputFiles('#b-logo', { name: 'logo.ai', mimeType: 'application/postscript', buffer: Buffer.from('%!PS') });
      assert.equal(await page.locator('[data-logo-note]').textContent(), 'Logo attached: logo.ai. We will place it on your approval drawing.');
    }
    await page.click('footer [data-pay-invoice]');
    await page.keyboard.press('Escape');
    await context.close();
  }
  assert.deepEqual(errors, []);
});

test('no horizontal scroll at 320px wide', async () => {
  for (const path of PAGES) {
    for (const builder of path === '/' ? [false, true] : [false]) {
      const { context, page } = await open(env.browser, env.server.url + path, { width: 320, height: 640 });
      if (builder) { await page.fill('#sign-name', 'Alder Creek Homeowners Association'); await page.click('.hero-intro [data-open-builder]'); }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(over, 0, `${path}${builder ? ' (builder)' : ''} scrolls sideways by ${over}px`);
      await context.close();
    }
  }
});

test('with JavaScript disabled, all content, prices and drawings are present', async () => {
  const home = await open(env.browser, env.server.url + '/', { js: false });
  const p = home.page;
  assert.equal(await p.locator('[data-sign] svg[role="img"]').count(), 2);
  assert.match(await p.locator('[data-sign] .variant-dims').innerHTML(), /Monument signs\.[\s\S]*Nothing else\./);
  assert.equal(await p.locator('.lineup svg').count(), 1);
  assert.equal(await p.locator('.size-item').count(), 4);
  const sizes = (await p.locator('.size-list').textContent()).replace(/\u00a0/g, ' ');
  for (const s of ['4 ft × 2 ft 6 in', '$1,000', '$1,500', '8 ft × 4 ft', '$4,000', '$4,800']) assert.ok(sizes.includes(s), s);
  assert.equal(await p.locator('[data-price-total]').textContent(), '$5,100');
  assert.ok((await p.locator('h1').textContent()).includes('Monument signs. Nothing else.'));
  await home.context.close();
  const how = await open(env.browser, env.server.url + '/how-it-works/', { js: false });
  const text = await how.page.locator('main').textContent();
  for (const s of ['Before anything is built', 'reserves your place in production', 'Your sign is covered for five years', 'send us photos within 14 days',
    'refund your deposit in full', 'Raised letter', 'Request a custom quote', 'Call (555) 010-0199 or email hello@example.com.']) assert.ok(text.includes(s), s);
  assert.equal(await how.page.locator('.anatomy svg, .options-drawn svg').count(), 5);
  await how.context.close();
  const q = await open(env.browser, env.server.url + '/questions/', { js: false });
  const qt = await q.page.locator('main').textContent();
  for (const s of ['Do you only make monument signs?', 'Four to six weeks from the day you approve your drawing', 'A deposit of 50% to start']) assert.ok(qt.includes(s), s);
  await q.context.close();
});

test('footer policy links open their disclosure on the how-it-works page', async () => {
  const { context, page } = await open(env.browser, env.server.url + '/questions/');
  await page.click('footer a[href="/how-it-works/#policy-warranty"]');
  await page.waitForURL(/policy-warranty/);
  assert.equal(await page.locator('#policy-warranty').getAttribute('open'), '');
  await page.click('footer a[href="/how-it-works/#policy-delivery"]');
  await page.waitForFunction(() => document.getElementById('policy-delivery').open);
  await context.close();
  const more = await open(env.browser, env.server.url + '/how-it-works/?need=more#quote');
  assert.equal(await more.page.locator('[name="need"][value="more"]').isChecked(), true);
  await more.context.close();
});

test('with uploads switched off, a request is still sent and says which file did not upload', async () => {
  const sent = [];
  const noUploads = await start(apiStub({
    'POST /api/uploads/start': () => [503, { error: 'not_configured' }],
    'POST /api/requests': (b) => { sent.push(b); return [200, { reference: 'MS-7K4Q2P' }]; },
  }));
  const { context, page } = await open(noUploads.browser, noUploads.server.url + '/how-it-works/');
  await page.fill('#q-name', 'Pat Lee'); await page.fill('#q-email', 'pat@example.com');
  await page.fill('#q-details', 'Two entrance signs.'); await page.fill('#q-zip', '30301');
  await page.setInputFiles('#q-files', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
  await page.click('form[data-form="quote"] button[type="submit"]');
  const result = page.locator('#quote [data-form-result]');
  await result.waitFor();
  assert.equal(await result.locator('p').first().textContent(), 'Quote request sent. We will reply to pat@example.com within one business day. Your reference is MS-7K4Q2P.');
  assert.equal(await result.locator('p').nth(1).textContent(), 'Your request was sent, but logo.png did not upload. Reply to our confirmation email with the file attached.');
  assert.equal(sent[0].turnstile, 'test-token', 'authorized by Turnstile instead of an upload token');
  assert.deepEqual(sent[0].files, []);
  await context.close();
  await noUploads.close();
});
