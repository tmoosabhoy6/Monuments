// Everything that enhances the page, loaded by app.js once the page has loaded.
import { createStore, initBuilder, initTitleBlock, fillPrintSheet, readArrival } from './builder/ui.js';
import { initForms, showReturn } from './forms.js';
import { initNav, initDeck, initSizer, initWays, initStrips, initCounts, initGallery } from './site-ui.js';

initNav();
initDeck();
initSizer();
initWays();
initStrips();
initCounts();
initGallery();

const dataEl = document.getElementById('site-data');
const site = dataEl ? JSON.parse(dataEl.textContent) : null;

if (site) {
  const store = createStore(site.config);
  try { site.depositsOff = sessionStorage.getItem('deposits-off') === '1'; } catch { site.depositsOff = false; }
  const features = site.config.features || {};
  if (features.deposits === false) site.depositsOff = true;

  const forms = initForms(store, site);
  site.openDrawing = forms.openDrawing;
  site.fillPrint = () => fillPrintSheet(store, site);

  const onDesign = document.body.dataset.page === 'design';
  const arrival = onDesign ? readArrival(store) : { open: false };

  const titleBlock = initTitleBlock(store, site, { onReserve: forms.openReserve, onDrawing: forms.openDrawing });
  const builder = initBuilder(store, site, {
    onReserve: forms.openReserve,
    onDrawing: forms.openDrawing,
    onShare: forms.openShare,
    onMode: (open) => titleBlock.setBuilderOpen(open),
  });
  site.refresh = () => { if (builder) builder.render(); titleBlock.update(); };
  if (builder) {
    site.openBuilder = (opts) => builder.open(opts);
    // The design page is the builder: it is always open there.
    builder.open({ focus: false, scroll: false });
    showReturn(arrival, site, document.querySelector('[data-builder-message]'));
    window.addEventListener('beforeprint', site.fillPrint);
  }

  // Open the disclosure a link points at (footer policy links, privacy).
  const openTarget = () => {
    if (!location.hash) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const details = el && (el.tagName === 'DETAILS' ? el : el.closest('details'));
    if (details) details.open = true;
  };
  openTarget();
  window.addEventListener('hashchange', openTarget);
  document.querySelectorAll('[data-open-privacy]').forEach((a) => a.addEventListener('click', () => {
    document.getElementById('privacy').open = true;
  }));

  // "Ask about these" opens the quote form with the right choice selected.
  const need = new URLSearchParams(location.search).get('need');
  if (need) {
    const radio = document.querySelector(`form[data-form="quote"] [name="need"][value="${CSS.escape(need)}"]`);
    if (radio) radio.checked = true;
  }
}
