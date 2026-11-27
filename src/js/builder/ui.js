// The builder interface: a thin layer over the pure modules. It keeps one state object,
// redraws the sign and the prices when it changes, and does nothing else.
import { defaults, sanitize, isDefault, splitName, LINE_LIMIT } from './state.js';
import { quote, money, optionPrice, priceLinesHtml } from './pricing.js';
import { hero, scene, site as siteScene, describe, sizeWords, contrast, HEADLINE } from './draw.js';
import { encode, decode, designUrl } from './share.js';

const STORE_KEY = 'monument-design';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// ---------- the store ----------
export function createStore(config) {
  const read = () => {
    try { const raw = localStorage.getItem(STORE_KEY); return raw ? sanitize(JSON.parse(raw), config) : null; } catch { return null; }
  };
  let state = read() || defaults(config);
  const listeners = new Set();
  const store = {
    config,
    logo: null,                 // { file, url, displayable } held in memory only, never put in a link
    get state() { return state; },
    set(patch, { save = true } = {}) {
      state = sanitize({ ...state, ...patch }, config);
      if (save) { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ } }
      listeners.forEach((fn) => fn(state));
    },
    replace(next) { this.set(next); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    isMine() { return !isDefault(state, config); },
    quote() { return quote(state, config); },
    link() { return designUrl(location.origin + '/design/', state); },
  };
  return store;
}

const optLabel = (config, group, id) => ((config.options[group] || []).find((o) => o.id === id) || {}).label || '';
const paintName = (config, id) => (config.paints.find((p) => p.id === id) || {}).name || id;
const paintHex = (config, id) => (config.paints.find((p) => p.id === id) || {}).hex || '#000000';

// "8 ft × 4 ft, double-sided, stone-look base, installed"
export function summary(state, config) {
  const size = config.pricing.sizes.find((s) => s.id === state.size);
  const words = (group, id) => ((config.options[group] || []).find((o) => o.id === id) || {}).words;
  const parts = [sizeWords(size).replace(/ /g, ' '), state.sides === 2 ? 'double-sided' : 'single-sided'];
  parts.push(words('base', state.base));
  if (state.base !== 'posts' && state.pillars !== 'none') parts.push(words('pillars', state.pillars));
  if (state.lettering !== 'routed') parts.push(words('lettering', state.lettering));
  parts.push(state.install ? 'installed' : 'delivered only');
  return parts.filter(Boolean).join(', ');
}

// ---------- the title block: the visitor's sign following them down the page ----------
export function initTitleBlock(store, site, { onReserve, onDrawing }) {
  const bar = $('[data-title-block]');
  if (!bar) return { update() {} };
  const M = site.messages;
  let summaryOnScreen = false;
  let builderOpen = false;
  const phone = matchMedia('(max-width: 819.98px)');

  const update = () => {
    const s = store.state, q = store.quote();
    const show = (store.isMine() || (builderOpen && phone.matches)) && !summaryOnScreen;
    $('[data-tb-thumb]', bar).innerHTML = scene(s, store.config, { simple: true, aspect: 1.42, uid: 'tb' });
    const name = s.lines.filter(Boolean).join(' ');
    $('[data-tb-name]', bar).textContent = name || summary(s, store.config);
    $('[data-tb-summary]', bar).textContent = summary(s, store.config);
    $('[data-tb-total]', bar).textContent = q.priced ? money(q.total) : M.unpriced;
    $('[data-tb-deposit]', bar).textContent = q.priced && store.config.features?.deposits !== false ? `${M.depositShort} ${money(q.deposit)}` : '';
    const reserveOk = q.priced && !site.depositsOff;
    $('[data-reserve]', bar).hidden = !reserveOk;
    $('[data-tb-drawing]', bar).hidden = reserveOk;
    bar.hidden = !show;
  };
  $('[data-open-builder]', bar).addEventListener('click', () => {
    if (site.openBuilder) site.openBuilder({ scroll: true });
    else location.assign('/design/');
  });
  $('[data-reserve]', bar).addEventListener('click', onReserve);
  $('[data-tb-drawing]', bar).addEventListener('click', onDrawing);

  const summaryEl = $('[data-price-summary]');
  if (summaryEl) {
    new IntersectionObserver((entries) => {
      summaryOnScreen = entries.some((e) => e.isIntersecting);
      update();
    }).observe(summaryEl);
  }
  phone.addEventListener('change', update);
  store.subscribe(update);
  update();
  return { update, setBuilderOpen(v) { builderOpen = v; update(); } };
}

// ---------- the builder on the home page ----------
export function initBuilder(store, site, hooks) {
  const root = $('#design');
  if (!root) return null;
  const config = store.config;
  const M = site.messages;
  const signEl = $('[data-sign]', root);
  const siteEl = $('[data-site]', root);
  const nameInput = $('#sign-name', root);
  const builder = $('[data-builder]', root);
  const intro = $('[data-intro]', root);
  const live = $('[data-live]', root);
  const field = (name) => $(`[name="${name}"]`, builder);
  let frame = 0, liveTimer = 0, lastAnnounced = '';

  // --- drawing and price: redraw in an animation frame, nothing else ---
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const logo = store.logo && store.logo.displayable ? { href: store.logo.url } : null;
      signEl.innerHTML = hero(store.state, config, { logo });
      if (siteEl && root.dataset.mode === 'intro') siteEl.innerHTML = siteScene(store.state, config, { label: describe(store.state, config) });
    });
  };

  const render = () => {
    const s = store.state, q = store.quote();
    draw();
    // the hero price
    $('[data-price-label]', root).textContent = s.install ? M.asDrawnInstalled : M.asDrawnDelivered;
    const total = $('[data-price-total]', root);
    total.textContent = q.priced ? money(q.total) : M.unpriced;
    total.classList.toggle('is-unpriced', !q.priced);
    // the summary
    $('[data-price-lines]', root).innerHTML = priceLinesHtml(q, config, M.unpriced);
    $('[data-lighting-note]', root).hidden = !s.lighting;
    // option rows: keep controls in step with the state (a shared link or a size chosen elsewhere)
    syncControls(s);
    updatePrices(s);
    // rules between options
    const posts = s.base === 'posts';
    $$('[name="pillars-on"]', builder).forEach((r) => { r.disabled = posts; });
    $('[data-pillars-help]', root).hidden = !posts;
    $('[data-caps]', root).hidden = posts || s.pillars === 'none';
    $('[data-double-note]', root).hidden = s.sides !== 2;
    $('[data-contrast-note]', root).hidden = contrast(paintHex(config, s.field), paintHex(config, s.raised)) >= 3;
    // actions: unpriced or deposits switched off makes the drawing request the primary action
    const reserveOk = q.priced && !site.depositsOff;
    const reserveBtn = $('[data-builder-actions] [data-reserve]', root);
    const drawingBtn = $('[data-builder-actions] [data-request-drawing]', root);
    reserveBtn.hidden = !reserveOk;
    drawingBtn.classList.toggle('btn-secondary', reserveOk);
    // live announcement of the total, debounced so it does not speak on every keystroke
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      const text = `Total ${q.priced ? money(q.total) : M.unpriced}`;
      if (text !== lastAnnounced) { live.textContent = text; lastAnnounced = text; }
    }, 900);
  };

  const updatePrices = (s) => {
    const size = config.pricing.sizes.find((x) => x.id === s.size);
    const plus = (a) => (a === null ? M.unpriced : a === 0 ? '' : `+${money(a)}`);
    for (const sz of config.pricing.sizes) {
      const el = $(`[data-price-size="${sz.id}"]`, builder);
      const v = s.sides === 2 ? sz.double : sz.single;
      if (el) el.textContent = v == null ? M.unpriced : money(v);
    }
    for (const group of ['shape', 'base', 'pillars', 'lettering']) {
      $$(`[data-price-${group}]`, builder).forEach((el) => {
        const a = optionPrice(config, group, el.getAttribute(`data-price-${group}`), size.id);
        el.textContent = plus(a);
        el.classList.toggle('is-unpriced', a === null);
      });
    }
    const sides = $('[data-price-sides]', builder);
    if (sides) sides.textContent = plus(size.double != null && size.single != null ? size.double - size.single : null);
    const inst = $('[data-price-install]', builder);
    if (inst) inst.textContent = plus(size.install ?? null);
  };

  const syncControls = (s) => {
    const setRadio = (name, value) => {
      const r = $(`[name="${name}"][value="${value}"]`, builder);
      if (r && !r.checked) r.checked = true;
    };
    setRadio('size', s.size); setRadio('shape', s.shape); setRadio('sides', String(s.sides));
    setRadio('base', s.base); setRadio('lettering', s.lettering); setRadio('field', s.field); setRadio('raised', s.raised);
    setRadio('style', s.style); setRadio('install', s.install ? 'yes' : 'no');
    setRadio('pillars-on', s.pillars === 'none' ? 'none' : 'each');
    if (s.pillars !== 'none') setRadio('cap', s.pillars);
    const light = field('lighting');
    if (light.checked !== s.lighting) light.checked = s.lighting;
    if (s.lighting) $('[data-lighting-details]', builder).open = true;
    const setText = (el, v) => { if (el && document.activeElement !== el && el.value !== v) el.value = v; };
    setText(field('line1'), s.lines[0] || '');
    setText(field('line2'), s.lines[1] || '');
    setText(field('paintCode'), s.paintCode);
    setText(field('zip'), s.zip);
    const isHeadline = s.lines.join('\n') === HEADLINE.join('\n');
    setText(nameInput, isHeadline ? '' : s.lines.filter(Boolean).join(' '));
  };

  // --- input -> state ---
  const limitNote = (input, note) => { if (note) note.hidden = input.value.length < LINE_LIMIT; };
  nameInput.addEventListener('input', () => {
    const lines = splitName(nameInput.value);
    $('[data-limit-note]', root).hidden = !lines.some((l) => l.length >= LINE_LIMIT);
    store.set({ lines: lines.length ? lines : [...HEADLINE] });
  });
  for (const n of ['line1', 'line2']) {
    field(n).addEventListener('input', () => {
      limitNote(field(n), $(`[data-limit-for="${n}"]`, builder));
      store.set({ lines: [field('line1').value, field('line2').value] });
    });
  }
  builder.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name) return;
    const s = store.state;
    switch (t.name) {
      case 'size': case 'shape': case 'base': case 'lettering': case 'field': case 'raised': case 'style':
        store.set({ [t.name]: t.value }); break;
      case 'sides': store.set({ sides: Number(t.value) }); break;
      case 'install': store.set({ install: t.value === 'yes' }); break;
      case 'pillars-on': {
        const cap = $('[name="cap"]:checked', builder);
        store.set({ pillars: t.value === 'none' ? 'none' : (cap ? cap.value : 'flat') }); break;
      }
      case 'cap': if (s.pillars !== 'none') store.set({ pillars: t.value }); break;
      case 'lighting': store.set({ lighting: t.checked }); break;
      case 'logo': attachLogo(t.files && t.files[0]); break;
      default: break;
    }
  });
  field('paintCode').addEventListener('input', (e) => store.set({ paintCode: e.target.value }));
  field('zip').addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
    if (digits !== e.target.value) e.target.value = digits;
    store.set({ zip: digits.length === 5 ? digits : '' });
  });

  function attachLogo(file) {
    if (store.logo && store.logo.url) URL.revokeObjectURL(store.logo.url);
    const note = $('[data-logo-note]', builder);
    if (!file) { store.logo = null; note.hidden = true; render(); return; }
    const displayable = /^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type);
    store.logo = { file, url: displayable ? URL.createObjectURL(file) : '', displayable };
    note.textContent = displayable ? '' : fmt(M.logoAttached, { filename: file.name });
    note.hidden = displayable;
    render();
  }

  // --- the two states of the hero ---
  const mode = (m) => {
    root.dataset.switched = '';
    root.dataset.mode = m;
    builder.hidden = m !== 'builder';
    intro.hidden = m === 'builder';
    hooks.onMode && hooks.onMode(m === 'builder');
    if (m === 'intro') draw();
  };
  const open = ({ scroll = false, focus = true } = {}) => {
    mode('builder');
    if (scroll) root.scrollIntoView({ block: 'start' });
    if (focus) { const h = $('h2', builder); h.tabIndex = -1; h.focus({ preventScroll: scroll }); }
  };
  const close = () => {
    mode('intro');
    $('[data-open-builder]', intro).focus();
  };
  $$('[data-open-builder]', root).forEach((b) => b.addEventListener('click', () => open()));
  $('[data-close-builder]', root).addEventListener('click', close);

  // "Start with this size" from the sizes section
  $$('[data-start-size]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    store.set({ size: a.dataset.startSize });
    open({ scroll: true });
  }));
  $('[data-builder-actions] [data-reserve]', root).addEventListener('click', hooks.onReserve);
  $('[data-builder-actions] [data-request-drawing]', root).addEventListener('click', hooks.onDrawing);
  $('[data-builder-actions] [data-share]', root).addEventListener('click', hooks.onShare);

  store.subscribe(render);
  render();
  return { open, close, render, root };
}

// ---------- the print sheet: one page for a board or committee ----------
export function fillPrintSheet(store, site) {
  const sheet = $('[data-print-sheet]');
  if (!sheet) return;
  const s = store.state, config = store.config, q = store.quote(), M = site.messages, c = site.contact;
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const size = config.pricing.sizes.find((x) => x.id === s.size);
  const rows = [
    ['Size of the sign face', sizeWords(size)],
    ['Top shape', optLabel(config, 'shape', s.shape)],
    ['Sides', s.sides === 2 ? 'Double-sided' : 'Single-sided'],
    ['How it stands', optLabel(config, 'base', s.base)],
    ['Pillars', s.base !== 'posts' && s.pillars !== 'none' ? `A pillar at each side, ${optLabel(config, 'pillars', s.pillars).toLowerCase()}` : 'None'],
    ['Lettering', optLabel(config, 'lettering', s.lettering)],
    ['Lettering style', s.style === 'sans' ? 'Sans' : 'Serif'],
    ['Background', paintName(config, s.field)],
    ['Letters and border', paintName(config, s.raised)],
    s.paintCode ? ['Paint code', s.paintCode] : null,
    s.lighting ? ['Need it lit?', 'Quote lighting for this sign'] : null,
    ['Installation', s.install ? 'Installed by a certified installer' : 'Delivered only'],
    s.zip ? ['ZIP code where it will stand', s.zip] : null,
  ].filter(Boolean);
  const priceRows = q.lines.map((l) => `<tr><th>${esc(l.label)}</th><td class="amt">${l.amount === null ? M.unpriced : money(l.amount)}</td></tr>`).join('') +
    `<tr class="total"><th>Total</th><td class="amt">${q.priced ? money(q.total) : M.unpriced}</td></tr>` +
    (q.priced && config.features?.deposits !== false ? `<tr><th>${esc(M.depositLine)}</th><td class="amt">${money(q.deposit)}</td></tr>` : '');
  const list = (items) => items.map((i) => `<li>${esc(i)}</li>`).join('');
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  sheet.innerHTML =
    `<div class="ps-head"><span class="ps-name">${esc(c.business_name)}</span>` +
    `<span class="ps-contact">${esc(c.phone)}<br>${esc(c.email)}<br>${esc(today)}</span></div>` +
    `<h1>${esc(s.lines.filter(Boolean).join(' ') || 'Your sign')}</h1>` +
    `<div class="ps-drawing">${scene(s, config, { dims: true, aspect: 2.1, uid: 'ps', label: describe(s, config) })}</div>` +
    `<div class="ps-cols"><div><h2>Your sign</h2><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>` +
    `<div><h2>Your price</h2><table>${priceRows}</table>` +
    (s.lighting ? `<p>${esc(M.lightingNote)}</p>` : '') +
    `<p>Nothing is built until you approve your drawing.</p>` +
    `<div class="covers"><h2>What this price covers</h2><p class="label">Included</p><ul>${list(site.covers.included)}</ul>` +
    `<p class="label">Not included</p><ul>${list(site.covers.not_included)}</ul></div></div></div>` +
    `<p class="ps-link">${esc(store.link())}</p>`;
}

// ---------- links: apply a shared design or a chosen size on arrival ----------
export function readArrival(store) {
  const params = new URLSearchParams(location.search);
  const out = { open: false, reserved: params.get('reserved'), cancelled: params.has('cancelled') };
  if (params.has('d')) {
    store.replace(decode(params.get('d'), store.config));
    out.open = true;
  }
  if (params.has('size')) {
    const id = params.get('size');
    if (store.config.pricing.sizes.some((s) => s.id === id)) store.set({ size: id });
    out.open = true;
  }
  if (params.get('open') === 'builder' || out.reserved || out.cancelled) out.open = true;
  if ([...params.keys()].length) history.replaceState(null, '', location.pathname + location.hash);
  return out;
}

export { encode, fmt };
