// Page behaviours: the menu, the hero's rotating photographs, the sign drawn five ways, moving
// strips that rest while off screen, the pointer tilt, counters and the gallery.
// Everything here enhances complete static HTML; without it every page still reads and links work.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');

// ---------- main menu: a row on wide screens, a full panel on narrow ones ----------
export function initNav() {
  const header = $('[data-site-header]');
  const toggle = $('[data-menu-toggle]');
  if (!header || !toggle) return;
  const setMenu = (open) => {
    // the panel hangs from the header's bottom edge, which moves while the top bar is on screen
    if (open) header.style.setProperty('--menu-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-locked', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1180px)').addEventListener('change', () => setMenu(false));
  const sentinel = $('[data-header-sentinel]');
  if (sentinel) new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
}

// A set of stacked panels shown one at a time, with buttons; turns by itself until someone chooses.
function rotator(root, { panels, picks, interval, onShow }) {
  let i = 0, timer = 0, held = false, chosen = reduced.matches, seen = true;
  const show = (n) => {
    i = (n + panels.length) % panels.length;
    panels.forEach((p, k) => p.classList.toggle('is-on', k === i));
    picks.forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    if (onShow) onShow(i);
  };
  const sync = () => {
    clearInterval(timer);
    if (!chosen && !held && seen && !document.hidden) timer = setInterval(() => show(i + 1), interval);
  };
  picks.forEach((b, k) => b.addEventListener('click', () => { chosen = true; show(k); sync(); }));
  root.addEventListener('pointerenter', () => { held = true; sync(); });
  root.addEventListener('pointerleave', () => { held = false; sync(); });
  root.addEventListener('focusin', () => { held = true; sync(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { held = false; sync(); } });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }).observe(root);
  sync();
}

// ---------- home hero: the photograph on the sign face changes ----------
export function initHero() {
  const root = $('[data-faces]');
  if (!root) return;
  const panels = $$('.face', root);
  const plate = $('[data-face-cap]');
  // the later photographs are fetched only once the page has loaded
  panels.forEach((p) => { const img = $('img', p); if (img && img.loading === 'lazy') img.loading = 'eager'; });
  rotator(root.closest('.monument'), {
    panels, picks: $$('[data-face-pick]'), interval: 5200,
    onShow: (i) => { if (plate) plate.textContent = panels[i].dataset.cap; },
  });
}

// ---------- the same sign drawn five ways ----------
export function initWays() {
  $$('[data-ways]').forEach((root) => rotator(root, { panels: $$('.way', root), picks: $$('[data-way-pick]', root), interval: 2600 }));
}

// ---------- moving strips rest while they are off screen ----------
export function initStrips() {
  const strips = $$('[data-marquee], [data-strip]');
  if (!strips.length) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)));
  strips.forEach((s) => io.observe(s));
}

// ---------- the hero monument leans a little toward the pointer ----------
export function initTilt() {
  if (reduced.matches || !fine.matches) return;
  $$('[data-tilt]').forEach((el) => {
    const area = el.parentElement;
    let frame = 0;
    area.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = area.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      });
    });
    area.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  });
}

// ---------- figures count up when they come into view ----------
export function initCounts() {
  const els = $$('[data-count]');
  if (!els.length || reduced.matches) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = Number(el.dataset.count), t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), eased = 1 - (1 - k) ** 3;
      el.textContent = String(Math.round(to * eased));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

// ---------- gallery: filter chips and a lightbox with keyboard and buttons ----------
export function initGallery() {
  const grid = $('[data-gallery]');
  if (!grid) return;
  const chips = $$('[data-filter]');
  const items = $$('li', grid);
  chips.forEach((c) => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    chips.forEach((o) => { o.classList.toggle('is-on', o === c); o.setAttribute('aria-pressed', String(o === c)); });
    items.forEach((li) => {
      li.hidden = f !== 'all' && !li.dataset.tags.split(' ').includes(f);
      li.classList.remove('is-back');
    });
    // the photographs that remain step back in
    requestAnimationFrame(() => items.forEach((li) => { if (!li.hidden) li.classList.add('is-back'); }));
  }));

  const box = $('[data-lightbox]');
  if (!box || typeof box.showModal !== 'function') return;
  const img = $('[data-lb-img]', box), cap = $('[data-lb-cap]', box);
  let current = 0, opener = null;
  const visible = () => items.filter((li) => !li.hidden).map((li) => $('.gallery-item', li));
  const load = (btn) => {
    const thumb = $('img', btn);
    img.src = btn.dataset.full;
    img.alt = thumb ? thumb.alt : '';
    cap.textContent = $('.gallery-cap', btn).textContent;
  };
  const step = (d) => { const v = visible(); current = (current + d + v.length) % v.length; load(v[current]); };
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery-item');
    if (!btn) return;
    opener = btn;
    current = visible().indexOf(btn);
    load(btn);
    box.showModal();
  });
  $('[data-lb-close]', box).addEventListener('click', () => box.close());
  $('[data-lb-prev]', box).addEventListener('click', () => step(-1));
  $('[data-lb-next]', box).addEventListener('click', () => step(1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('close', () => { if (opener) opener.focus(); });
}
