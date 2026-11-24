// HTML fragments rendered at build time from the config. Node built-ins only.
import { hero as heroSvg, lineup, sizeAlone, shapeIcon, swatch, sizeWords } from '../../src/js/builder/draw.js';
import { quote, optionPrice, money, priceLinesHtml } from '../../src/js/builder/pricing.js';
import { LINE_LIMIT, PAINT_CODE_LIMIT } from '../../src/js/builder/state.js';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const hero = (state, config) => heroSvg(state, config, { intro: true });

export function lineupSvg(config, defaults) {
  return lineup(config, defaults, { label: `The ${config.pricing.sizes.length} standard sizes drawn side by side at the same scale, beside a six-foot pole.` });
}

export function sizeList(config, defaults) {
  const items = config.pricing.sizes.map((s) => {
    const words = sizeWords(s);
    const installed = s.single != null && s.install != null ? money(s.single + s.install) : 'Priced with your drawing';
    const sign = s.single != null ? money(s.single) : 'Priced with your drawing';
    return `<li class="size-item"><article aria-labelledby="size-${s.id}">` +
      sizeAlone(config, defaults, s.id) +
      `<h3 id="size-${s.id}">${words}</h3>` +
      `<dl><dt>Sign</dt><dd>${sign}</dd><dt>Installed</dt><dd>${installed}</dd></dl>` +
      `<a class="link" href="/?size=${s.id}#design" data-start-size="${s.id}">Start with this size</a>` +
      `</article></li>`;
  }).join('');
  return `<ul class="size-list">${items}</ul>`;
}

const plus = (amount) => (amount === null ? '<span class="delta is-unpriced">Priced with your drawing</span>'
  : amount === 0 ? '<span class="delta"></span>' : `<span class="delta">+${money(amount)}</span>`);

function row({ name, value, checked, label, icon = '', price = '', attrs = '' }) {
  return `<label class="opt"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}${attrs}>` +
    (icon ? icon : '') + `<span class="opt-label">${label}</span>${price}</label>`;
}

export function builder(config, state) {
  const P = config.pricing;
  const size = P.sizes.find((s) => s.id === state.size);
  const sizeRows = P.sizes.map((s) => row({
    name: 'size', value: s.id, checked: s.id === state.size, label: sizeWords(s),
    price: `<span class="delta" data-price-size="${s.id}">${s.single == null ? 'Priced with your drawing' : money(state.sides === 2 ? s.double : s.single)}</span>`,
  })).join('');
  const group = (g) => config.options[g];
  const optRows = (g, name = g, withIcon = false) => group(g).map((o) => row({
    name, value: o.id, checked: state[g] === o.id, label: o.label,
    icon: withIcon ? shapeIcon(o.id) : '',
    price: plus(optionPrice(config, g, o.id, size.id)).replace('<span class="delta', `<span data-price-${g}="${o.id}" class="delta`),
  })).join('');
  const paints = (name) => config.paints.map((p) => row({
    name, value: p.id, checked: state[name] === p.id, label: p.name, icon: swatch(p.hex),
  })).join('');
  const pillarOn = state.pillars !== 'none';
  const capRows = group('pillars').filter((o) => o.id !== 'none').map((o) => row({
    name: 'cap', value: o.id, checked: state.pillars === o.id || (!pillarOn && o.id === 'flat'), label: o.label,
    price: plus(optionPrice(config, 'pillars', o.id, size.id)).replace('<span class="delta', `<span data-price-pillars="${o.id}" class="delta`),
  })).join('');
  const sidesDelta = size.double != null && size.single != null ? size.double - size.single : null;
  const installPrice = size.install ?? null;
  const q = quote(state, config);

  return `<div class="options" data-options>
<fieldset class="group">
  <legend>What it says</legend>
  <div class="field"><label for="b-line1">First line</label><input class="input" id="b-line1" name="line1" maxlength="${LINE_LIMIT}" autocomplete="off" spellcheck="false" aria-describedby="b-line1-limit"><p class="help" id="b-line1-limit" data-limit-for="line1" hidden>28 characters fit on a line.</p></div>
  <div class="field"><label for="b-line2">Second line (optional)</label><input class="input" id="b-line2" name="line2" maxlength="${LINE_LIMIT}" autocomplete="off" spellcheck="false" aria-describedby="b-line2-limit"><p class="help" id="b-line2-limit" data-limit-for="line2" hidden>28 characters fit on a line.</p></div>
  <fieldset class="sub"><legend>Lettering style</legend><div class="inline-choices">
    <label class="choice"><input type="radio" name="style" value="serif"${state.style !== 'sans' ? ' checked' : ''}> Serif</label>
    <label class="choice"><input type="radio" name="style" value="sans"${state.style === 'sans' ? ' checked' : ''}> Sans</label>
  </div></fieldset>
  <div class="field sub"><label for="b-logo">Add your logo (optional)</label><input class="input" id="b-logo" name="logo" type="file" accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.eps" aria-describedby="b-logo-help"><p class="help" id="b-logo-help">PNG, JPG, SVG, PDF, AI or EPS. We place it properly on your approval drawing.</p><p class="note" data-logo-note hidden></p></div>
</fieldset>
<fieldset class="group">
  <legend>Size of the sign face</legend>
  <div class="choices">${sizeRows}</div>
  <p class="help">Overall height includes the base.</p>
  <p class="help"><a href="/how-it-works/#quote">Need a different size? Request a custom quote.</a></p>
</fieldset>
<fieldset class="group">
  <legend>Top shape</legend>
  <div class="choices">${optRows('shape', 'shape', true)}</div>
</fieldset>
<fieldset class="group">
  <legend>Sides</legend>
  <div class="choices">
    ${row({ name: 'sides', value: '1', checked: state.sides !== 2, label: 'Single-sided', price: '<span class="delta"></span>' })}
    ${row({ name: 'sides', value: '2', checked: state.sides === 2, label: 'Double-sided', price: plus(sidesDelta).replace('<span class="delta', '<span data-price-sides class="delta') })}
  </div>
  <p class="help">Double-sided reads from both directions.</p>
  <p class="note" data-double-note${state.sides === 2 ? '' : ' hidden'}>Both sides the same. For two different sides, request a custom quote.</p>
</fieldset>
<fieldset class="group">
  <legend>How it stands</legend>
  <div class="choices">${optRows('base')}</div>
</fieldset>
<fieldset class="group" data-pillars-group>
  <legend>Pillars</legend>
  <div class="choices">
    ${row({ name: 'pillars-on', value: 'none', checked: !pillarOn, label: 'None', price: '<span class="delta"></span>', attrs: state.base === 'posts' ? ' disabled' : '' })}
    ${row({ name: 'pillars-on', value: 'each', checked: pillarOn, label: 'A pillar at each side', price: '<span class="delta"></span>', attrs: state.base === 'posts' ? ' disabled' : '' })}
  </div>
  <p class="help" data-pillars-help${state.base === 'posts' ? '' : ' hidden'}>Pillars need a base</p>
  <fieldset class="sub" data-caps${pillarOn ? '' : ' hidden'}><legend class="visually-hidden">Cap</legend><div class="choices">${capRows}</div></fieldset>
</fieldset>
<fieldset class="group">
  <legend>Lettering</legend>
  <div class="choices">${optRows('lettering')}</div>
</fieldset>
<fieldset class="group">
  <legend>Colors</legend>
  <fieldset class="sub"><legend>Background</legend><div class="swatches">${paints('field')}</div></fieldset>
  <fieldset class="sub"><legend>Letters and border</legend><div class="swatches">${paints('raised')}</div></fieldset>
  <p class="note" data-contrast-note hidden>These two colors are close. Lettering reads best with strong contrast.</p>
  <div class="field sub"><label for="b-paint">Have a paint code? (optional)</label><input class="input" id="b-paint" name="paintCode" maxlength="${PAINT_CODE_LIMIT}" autocomplete="off" aria-describedby="b-paint-help"><p class="help" id="b-paint-help">Give us a Pantone, Sherwin-Williams or other paint code and we match it. Screens show color differently; your approval drawing names the exact paints.</p></div>
</fieldset>
<div class="group group-lighting">
  <details class="disclosure" data-lighting-details>
    <summary>Need it lit?</summary>
    <div class="body">
      <p>We also build illuminated monument signs. Tick this and we will quote lighting with your drawing.</p>
      <label class="choice"><input type="checkbox" name="lighting"${state.lighting ? ' checked' : ''}> Quote lighting for this sign</label>
    </div>
  </details>
</div>
<fieldset class="group">
  <legend>Installation</legend>
  <div class="choices">
    ${row({ name: 'install', value: 'yes', checked: state.install, label: 'Installed by a certified installer', price: plus(installPrice).replace('<span class="delta', '<span data-price-install class="delta') })}
    ${row({ name: 'install', value: 'no', checked: !state.install, label: 'Delivered only', price: '<span class="delta"></span>' })}
  </div>
  <div class="field sub"><label for="b-zip">ZIP code where it will stand</label><input class="input" id="b-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" spellcheck="false"></div>
</fieldset>
</div>
<section class="price-summary" data-price-summary aria-labelledby="price-title">
  <h3 id="price-title">Your price</h3>
  <dl class="price-lines" data-price-lines>${priceLines(q, config)}</dl>
  <p class="note" data-lighting-note${state.lighting ? '' : ' hidden'}>Lighting is quoted separately and is not in this price.</p>
  <p class="assure">Nothing is built until you approve your drawing.</p>
</section>
<div class="builder-actions" data-builder-actions>
  <button type="button" class="btn" data-reserve>Reserve with deposit</button>
  <button type="button" class="btn btn-secondary" data-request-drawing>Request approval drawing</button>
  <button type="button" class="link-button" data-share>Save or send this design</button>
</div>
<div class="form-message" data-builder-message role="status" hidden></div>
<details class="disclosure builder-covers">
  <summary>What this price covers</summary>
  <div class="body">${covers(config)}</div>
</details>`;
}

export const priceLines = (q, config) => priceLinesHtml(q, config);

export function covers(config) {
  const list = (items) => items.map((i) => `<li>${esc(i)}</li>`).join('');
  return `<div class="covers"><div><p class="label">Included</p><ul>${list(config.covers.included)}</ul></div>` +
    `<div><p class="label">Not included</p><ul>${list(config.covers.not_included)}</ul></div></div>`;
}

export function questions(config, fill) {
  return config.questions.map((g, i) => `<div class="split qa-group">` +
    `<h2 class="narrow qa-name" id="qa-${i}">${esc(g.group)}</h2>` +
    `<div class="wide qa-list" role="group" aria-labelledby="qa-${i}">` +
    g.items.map((it) => `<details class="disclosure"><summary>${esc(it.q)}</summary><div class="body"><p>${esc(fill(it.a))}</p></div></details>`).join('') +
    `</div></div>`).join('');
}

export function gallery(config) {
  const photos = config.gallery || [];
  if (!photos.length) return '';
  const figs = photos.map((p) => `<figure><img src="${esc(p.src)}" width="${Number(p.width)}" height="${Number(p.height)}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async">` +
    `<figcaption class="caption">${esc(p.place)}. ${esc(p.size)}, ${esc(p.options)}.</figcaption></figure>`).join('');
  return `<section class="part" id="work" aria-labelledby="work-title"><div class="wrap"><h2 id="work-title">Signs we have built.</h2><div class="gallery">${figs}</div></div></section>`;
}

let extrasCount = 0;
export function formExtras(tokens) {
  const n = ++extrasCount;
  return `<div class="hp" aria-hidden="true"><label for="hp-${n}">Leave this field empty</label><input id="hp-${n}" name="website" tabindex="-1" autocomplete="off"></div>
    <div class="turnstile" data-turnstile></div>
    <div class="error-summary" data-error-summary tabindex="-1" hidden></div>
    <noscript><p>Call ${esc(tokens.phone)} or email ${esc(tokens.email)}.</p></noscript>`;
}

export function jsonLd(objects) {
  return objects.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
}

export function siteData(data) {
  return `<script type="application/json" id="site-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
