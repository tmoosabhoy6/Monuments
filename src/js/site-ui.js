// Page behaviours: the menu, the hero slideshow, reviews, the gallery and the home designer teaser.
// Everything here enhances complete static HTML; without it every page still reads and links work.
import { splitName } from './builder/state.js';
import { hero, HEADLINE } from './builder/draw.js';
import { money } from './builder/pricing.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- main menu: dropdowns on wide screens, a panel with accordions on narrow ones ----------
export function initNav() {
  const header = $('[data-site-header]');
  const toggle = $('[data-menu-toggle]');
  if (!header || !toggle) return;
  const subs = $$('[data-sub-toggle]', header);
  const closeSubs = (except) => subs.forEach((b) => { if (b !== except) b.setAttribute('aria-expanded', 'false'); });
  const setMenu = (open) => {
    // the panel hangs from the header's bottom edge, which moves while the top bar is on screen
    if (open) header.style.setProperty('--menu-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-locked', open);
    if (!open) closeSubs();
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  subs.forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    closeSubs(b);
    b.setAttribute('aria-expanded', String(open));
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openSub = subs.find((b) => b.getAttribute('aria-expanded') === 'true');
    if (openSub) { closeSubs(); openSub.focus(); return; }
    if (header.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.has-sub')) closeSubs(); });
  matchMedia('(min-width: 1280px)').addEventListener('change', () => setMenu(false));
}

// ---------- hero slideshow: a slow crossfade, paused on request, on hover and focus, and for reduced motion ----------
export function initSlideshow() {
  const root = $('[data-slideshow]');
  if (!root) return;
  const slides = $$('[data-slide]', root);
  const dots = $$('[data-dot]', root);
  const pauseBtn = $('[data-hero-pause]', root);
  let i = 0, timer = 0, held = false, userPaused = reduced.matches;
  const show = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
    dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.setAttribute('aria-pressed', String(k === i)); });
  };
  const sync = () => {
    clearInterval(timer);
    root.classList.toggle('is-paused', userPaused);
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    }
    if (!userPaused && !held && !document.hidden) timer = setInterval(() => show(i + 1), 6500);
  };
  dots.forEach((d) => d.addEventListener('click', () => { show(Number(d.dataset.dot)); sync(); }));
  if (pauseBtn) pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  root.addEventListener('pointerenter', () => { held = true; sync(); });
  root.addEventListener('pointerleave', () => { held = false; sync(); });
  root.addEventListener('focusin', () => { held = true; sync(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { held = false; sync(); } });
  document.addEventListener('visibilitychange', sync);
  const live = () => root.classList.add('is-live');
  if (document.readyState === 'complete') live(); else window.addEventListener('load', live, { once: true });
  show(0);
  sync();
}

// ---------- reviews: all three side by side when there is room, one at a time on phones ----------
export function initReviews() {
  const root = $('[data-reviews]');
  if (!root) return;
  const cards = $$('[data-review]', root);
  let i = 0;
  const show = (n) => { i = (n + cards.length) % cards.length; cards.forEach((c, k) => c.classList.toggle('is-active', k === i)); };
  const prev = $('[data-review-prev]'), next = $('[data-review-next]');
  if (prev) prev.addEventListener('click', () => show(i - 1));
  if (next) next.addEventListener('click', () => show(i + 1));
}

// ---------- gallery: filter chips and a lightbox with keyboard and swipe-free buttons ----------
export function initGallery() {
  const grid = $('[data-gallery]');
  if (!grid) return;
  const chips = $$('[data-filter]');
  const items = $$('li', grid);
  chips.forEach((c) => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    chips.forEach((o) => { o.classList.toggle('is-on', o === c); o.setAttribute('aria-pressed', String(o === c)); });
    items.forEach((li) => { li.hidden = f !== 'all' && !li.dataset.tags.split(' ').includes(f); });
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

// ---------- the home designer teaser: type a name, see it on the sign, carry it to the designer ----------
export function initTeaser(store) {
  const input = $('#teaser-name');
  const signEl = $('[data-teaser-sign]');
  if (!input || !signEl || !store) return;
  const priceEl = $('[data-teaser-price]');
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      signEl.innerHTML = hero(store.state, store.config);
      const q = store.quote();
      if (priceEl && q.priced) priceEl.textContent = money(q.total);
    });
  };
  const s = store.state;
  if (s.lines.join('\n') !== HEADLINE.join('\n')) { input.value = s.lines.filter(Boolean).join(' '); draw(); }
  input.addEventListener('input', () => {
    const lines = splitName(input.value);
    store.set({ lines: lines.length ? lines : [...HEADLINE] });
    draw();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.assign('/design/'); });
}
