// Entry point. The page is complete static HTML; scripts only enhance it. This file is small:
// it marks the page as scripted (so reveals may start hidden), starts the reveals, and loads the
// rest after the page (and its first photograph) has loaded.

// Links made before the designer had its own page (/?d=… , /?size=…, Stripe returns) still open it.
const legacy = new URLSearchParams(location.search);
if (location.pathname === '/' && ['d', 'size', 'open', 'reserved', 'cancelled'].some((k) => legacy.has(k))) {
  location.replace('/design/' + location.search + '#design');
} else {
  const root = document.documentElement;
  root.classList.add('js');
  // Reveal each marked block once, when it comes into view. No scroll listener.
  const targets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('is-in'));
  }
  const start = () => import('./main.js');
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
