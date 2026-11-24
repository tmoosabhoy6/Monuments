// Forms and dialogs: validation, Turnstile (loaded on first use), uploads and the API calls.
// Every failure says what happened and what to do next; nothing claims a success the
// server has not confirmed (SPEC §9.6).
import { invalidFields, CHECKS, REQUIRED, MAX_FILES, MAX_FILE_BYTES } from './rules.js';
import { money } from './builder/pricing.js';
import { fmt } from './builder/ui.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- API ----------
export async function api(path, body, { method = 'POST', headers = {} } = {}) {
  try {
    const isJson = !(body instanceof Blob);
    const res = await fetch(path, {
      method,
      headers: isJson ? { 'content-type': 'application/json', ...headers } : headers,
      body: method === 'GET' ? undefined : isJson ? JSON.stringify(body) : body,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, ok: res.ok, data };
  } catch {
    return { status: 0, ok: false, data: {} };
  }
}

// ---------- Turnstile: script loaded on the first focus of a form or opening of a dialog ----------
let turnstileLoading = null;
function loadTurnstile() {
  if (turnstileLoading) return turnstileLoading;
  turnstileLoading = new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve(window.turnstile || null);
    s.onerror = () => resolve(null);
    document.head.append(s);
  });
  return turnstileLoading;
}
const widgets = new WeakMap();   // form -> { id, token, waiters }
async function prepareTurnstile(form, sitekey) {
  if (widgets.has(form) || !sitekey) return;
  const slot = $('[data-turnstile]', form);
  if (!slot) return;
  const w = { id: null, token: '', waiters: [] };
  widgets.set(form, w);
  const ts = await loadTurnstile();
  if (!ts) return;
  try {
    w.id = ts.render(slot, {
      sitekey,
      appearance: 'interaction-only',
      callback: (token) => { w.token = token; w.waiters.splice(0).forEach((fn) => fn(token)); },
      'expired-callback': () => { w.token = ''; },
      'error-callback': () => { w.waiters.splice(0).forEach((fn) => fn('')); },
    });
  } catch { /* the request will be refused by the server and the form will say so */ }
}
async function turnstileToken(form, sitekey) {
  await prepareTurnstile(form, sitekey);
  const w = widgets.get(form);
  if (!w || w.id === null) return '';
  if (w.token) return w.token;
  return new Promise((resolve) => {
    w.waiters.push(resolve);
    setTimeout(() => resolve(w.token), 10000);
  });
}
function spendToken(form) {
  const w = widgets.get(form);
  if (w && w.id !== null && window.turnstile) { w.token = ''; try { window.turnstile.reset(w.id); } catch { /* ignore */ } }
}

// ---------- validation: on submit, then on blur ----------
function data(form) {
  const fd = new FormData(form);
  const out = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}
function setError(form, name, message) {
  const input = form.elements[name];
  if (!input || !input.id) return;
  const id = `${input.id}-error`;
  let el = form.querySelector(`#${id}`);
  const described = (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== id);
  if (message) {
    if (!el) {
      el = document.createElement('p');
      el.className = 'error';
      el.id = id;
      input.closest('.field').append(el);
    }
    el.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', [...described, id].join(' '));
  } else {
    if (el) el.remove();
    input.removeAttribute('aria-invalid');
    if (described.length) input.setAttribute('aria-describedby', described.join(' '));
    else input.removeAttribute('aria-describedby');
  }
}
function validate(form, kind, M, { summary = true } = {}) {
  const bad = invalidFields(kind, data(form));
  for (const name of new Set([...bad, ...$$('[aria-invalid="true"]', form).map((i) => i.name)])) {
    setError(form, name, bad.includes(name) ? M.errors[name] : '');
  }
  const files = $$('input[type="file"]', form).flatMap((i) => [...(i.files || [])]);
  const fileInput = $('input[type="file"]', form);
  const fileBad = files.length > MAX_FILES || files.some((f) => f.size > MAX_FILE_BYTES);
  if (fileInput) setError(form, fileInput.name, fileBad ? M.errors.files : '');
  const all = fileBad ? [...bad, fileInput.name] : bad;
  const box = $('[data-error-summary]', form);
  if (box && summary) {
    if (all.length) {
      const msg = all.length === 1 ? M.summaryOne : fmt(M.summary, { n: all.length });
      box.innerHTML = `<p class="error">${msg}</p><ul>${all.map((n) => {
        const input = form.elements[n];
        return `<li><a href="#${input.id}">${form.querySelector(`#${input.id}-error`).textContent}</a></li>`;
      }).join('')}</ul>`;
      box.hidden = false;
    } else {
      box.hidden = true;
      box.textContent = '';
    }
  }
  return all.length === 0;
}

// ---------- uploads ----------
async function upload(files, turnstile) {
  const start = await api('/api/uploads/start', { turnstile, count: files.length });
  if (!start.ok) return { status: start.status, token: null, keys: [], failed: files.map((f) => f.name) };
  const keys = [], failed = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const res = await api(`/api/uploads/${encodeURIComponent(start.data.token)}/${i}`, f, {
      method: 'PUT',
      headers: { 'content-type': f.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(f.name) },
    });
    if (res.ok && res.data.key) keys.push({ key: res.data.key, name: f.name });
    else failed.push(f.name);
  }
  return { status: 200, token: start.data.token, keys, failed };
}

// ---------- the forms ----------
export function initForms(store, site) {
  const M = site.messages;
  const sitekey = site.turnstile_site_key;
  const show = (form, html, { replace = false } = {}) => {
    const out = form.parentElement.querySelector('[data-form-result]');
    out.innerHTML = html;
    out.hidden = false;
    out.className = 'form-message';
    out.setAttribute('role', 'status');
    if (replace) form.hidden = true;
    out.tabIndex = -1;
    out.focus({ preventScroll: false });
  };
  const clear = (form) => {
    const out = form.parentElement.querySelector('[data-form-result]');
    out.hidden = true;
    out.textContent = '';
  };
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const failure = (status) => (status === 503 ? M.formOff : M.failed);

  // dialogs: native <dialog>, focus returns to the control that opened them
  const openers = new Map();
  const openDialog = (id) => {
    const d = document.getElementById(id);
    if (!d) return null;
    openers.set(d, document.activeElement);
    d.showModal();
    const form = $('form', d);
    if (form) prepareTurnstile(form, sitekey);
    return d;
  };
  $$('dialog.dialog').forEach((d) => {
    d.addEventListener('close', () => {
      const o = openers.get(d);
      // if the opener has since been hidden (deposits switched off), go to the action that replaced it
      const usable = (el) => el && el.isConnected && !el.closest('[hidden]') && el.getClientRects().length > 0;
      const next = usable(o) ? o : [...document.querySelectorAll('[data-request-drawing]')].find(usable);
      if (next) next.focus();
    });
    $$('[data-close-dialog]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });

  // Turnstile on first focus of any form
  document.addEventListener('focusin', (e) => {
    const form = e.target.closest && e.target.closest('form[data-form]');
    if (form) prepareTurnstile(form, sitekey);
  });

  // After the first submit: a field is checked when it loses focus, and its error clears as soon
  // as it is put right while typing. Only that field changes, so nothing above the submit button
  // moves at the moment it is pressed.
  const fieldCheck = (e, { clearOnly }) => {
    const input = e.target;
    const form = input.closest && input.closest('form[data-form]');
    if (!form || !form.dataset.tried || !input.name || !(REQUIRED[form.dataset.form] || []).includes(input.name)) return;
    const good = CHECKS[input.name](input.value);
    if (good) setError(form, input.name, '');
    else if (!clearOnly) setError(form, input.name, M.errors[input.name]);
  };
  document.addEventListener('focusout', (e) => fieldCheck(e, { clearOnly: false }));
  document.addEventListener('input', (e) => fieldCheck(e, { clearOnly: true }));

  // reveal fields tied to a choice ("By a date")
  document.addEventListener('change', (e) => {
    const form = e.target.closest && e.target.closest('form');
    if (!form || e.target.type !== 'radio') return;
    $$(`[name="${e.target.name}"]`, form).forEach((r) => {
      if (r.dataset.reveals) document.getElementById(r.dataset.reveals).hidden = !r.checked;
    });
  });

  // links in an error summary move focus to the field
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-error-summary] a');
    if (!a) return;
    e.preventDefault();
    const input = document.querySelector(a.getAttribute('href'));
    if (input) input.focus();
  });

  const submitting = new WeakSet();
  const handle = (kind, fn) => {
    const form = $(`form[data-form="${kind}"]`);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting.has(form)) return;
      form.dataset.tried = '1';
      clear(form);
      if (!validate(form, kind, M)) { $('[data-error-summary]', form).focus(); return; }
      if (form.elements.website && form.elements.website.value) return;   // honeypot
      submitting.add(form);
      const button = $('button[type="submit"]', form);
      button.disabled = true;
      try { await fn(form, data(form)); } finally { submitting.delete(form); button.disabled = false; }
    });
  };

  const sendRequest = async (form, type, fields, extraFiles = []) => {
    const files = [...extraFiles, ...$$('input[type="file"]', form).flatMap((i) => [...(i.files || [])])];
    const turnstile = await turnstileToken(form, sitekey);
    let up = null;
    let unsent = [];
    if (files.length) {
      up = await upload(files, turnstile);
      // uploads switched off (or refused): send the request without its files and say which
      // did not upload, rather than losing what the visitor wrote
      if (!up.token) { unsent = files.map((f) => f.name); up = null; }
    }
    const body = { type, ...fields, files: up ? up.keys : [] };
    if (up) body.uploadToken = up.token; else body.turnstile = turnstile;
    const res = await api('/api/requests', body);
    spendToken(form);
    return { ...res, failed: up ? up.failed : unsent };
  };
  const fileNotes = (failed) => failed.map((f) => `<p>${esc(fmt(M.fileFailed, { filename: f }))}</p>`).join('');

  // custom quote
  handle('quote', async (form, d) => {
    const fields = { name: d.name, organization: d.organization, email: d.email, phone: d.phone, contact: d.contact, need: d.need,
      details: d.details, width: d.width, height: d.height, zip: d.zip, install: d.install || '', when: d.when || '', date: d.date || '', heard: d.heard };
    const res = await sendRequest(form, 'quote', fields);
    if (res.ok) show(form, `<p>${esc(fmt(M.quoteSent, { email: d.email, reference: res.data.reference }))}</p>${fileNotes(res.failed)}`, { replace: true });
    else show(form, `<p>${esc(failure(res.status))}</p>`);
  });

  // approval drawing (from the builder or the title block)
  handle('drawing', async (form, d) => {
    const logo = store.logo ? [store.logo.file] : [];
    const fields = { name: d.name, organization: d.organization, email: d.email, phone: d.phone, zip: d.zip, notes: d.notes, design: store.state };
    const res = await sendRequest(form, 'drawing', fields, logo);
    if (res.ok) show(form, `<p>${esc(fmt(M.drawingSent, { email: d.email }))}</p>${fileNotes(res.failed)}`, { replace: true });
    else show(form, `<p>${esc(failure(res.status))}</p>`);
  });

  // reserve with deposit -> Stripe Checkout
  handle('reserve', async (form, d) => {
    const turnstile = await turnstileToken(form, sitekey);
    const res = await api('/api/checkout', { design: store.state, name: d.name, email: d.email, phone: d.phone, zip: d.zip, turnstile });
    spendToken(form);
    if (res.ok && res.data.url) { location.assign(res.data.url); return; }
    if (res.status === 503) {
      site.depositsOff = true;
      try { sessionStorage.setItem('deposits-off', '1'); } catch { /* ignore */ }
      site.refresh();
      show(form, `<p>${esc(M.depositsOff)}</p><p class="actions"><button type="button" class="btn" data-switch-to-drawing>Request approval drawing</button></p>`, { replace: true });
      const btn = $('[data-switch-to-drawing]', form.parentElement);
      btn.addEventListener('click', () => { form.closest('dialog').close(); site.openDrawing(); });
      btn.focus();
    } else {
      show(form, `<p>${esc(M.failed)}</p>`);
    }
  });

  // email a design link
  handle('email-design', async (form, d) => {
    const turnstile = await turnstileToken(form, sitekey);
    const res = await api('/api/designs/email', { email: d.email, design: store.state, turnstile });
    spendToken(form);
    const btn = $('button[type="submit"]', form);
    if (res.ok) { btn.textContent = M.sent; show(form, `<p>${esc(M.sent)}</p>`); }
    else show(form, `<p>${esc(failure(res.status))}</p>`);
  });

  // pay an invoice
  handle('invoice', async (form, d) => {
    const turnstile = await turnstileToken(form, sitekey);
    const res = await api('/api/invoices/find', { number: d.number, email: d.email, turnstile });
    spendToken(form);
    if (res.ok && res.data.url) { location.assign(res.data.url); return; }
    show(form, `<p>${esc(res.status === 503 ? M.formOff : res.status === 404 ? M.invoiceNotFound : M.failed)}</p>`);
  });

  // openers
  const openReserve = () => {
    const q = store.quote();
    const intro = $('[data-reserve-intro]');
    if (intro) intro.textContent = fmt(M.reserveIntro, { deposit: money(q.deposit), balance: money(q.total - q.deposit) });
    const zip = document.getElementById('r-zip');
    if (zip && !zip.value && store.state.zip) zip.value = store.state.zip;
    openDialog('dialog-reserve');
  };
  const openDrawing = () => {
    const zip = document.getElementById('d-zip');
    if (zip && !zip.value && store.state.zip) zip.value = store.state.zip;
    openDialog('dialog-drawing');
  };
  const openShare = () => {
    const b = $('[data-copy-link]');
    if (b) b.textContent = M.copyLink;
    openDialog('dialog-share');
  };
  $$('[data-pay-invoice]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openDialog('dialog-invoice'); }));
  $$('[data-copy-link]').forEach((b) => b.addEventListener('click', async () => {
    const link = store.link();
    try { await navigator.clipboard.writeText(link); } catch {
      const t = document.createElement('textarea'); t.value = link; document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      t.remove();
    }
    b.textContent = M.copied;
  }));
  $$('[data-print]').forEach((b) => b.addEventListener('click', () => { site.fillPrint(); window.print(); }));

  return { openReserve, openDrawing, openShare, openDialog };
}

// After returning from Stripe Checkout: ask the server what Stripe says before saying "Reserved".
export async function showReturn(arrival, site, el) {
  if (!el) return;
  const M = site.messages;
  if (arrival.cancelled) {
    el.textContent = M.cancelled;
    el.hidden = false;
    return;
  }
  if (!arrival.reserved) return;
  const res = await api(`/api/orders/${encodeURIComponent(arrival.reserved)}`, null, { method: 'GET' });
  if (res.ok && res.data.payment_status === 'paid') {
    el.textContent = fmt(M.reserved, { amount: money(res.data.amount), reference: res.data.reference });
    el.hidden = false;
    const actions = el.parentElement.querySelector('[data-builder-actions]');
    if (actions) actions.hidden = true;
  } else {
    el.textContent = M.cancelled;
    el.hidden = false;
  }
}
