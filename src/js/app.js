// Entry point. The page is complete static HTML; scripts only enhance it, so they load after the
// page (and its first photograph) has, and never compete with it on a slow connection.

// Links made before the designer had its own page (/?d=… , /?size=…, Stripe returns) still open it.
const legacy = new URLSearchParams(location.search);
if (location.pathname === '/' && ['d', 'size', 'open', 'reserved', 'cancelled'].some((k) => legacy.has(k))) {
  location.replace('/design/' + location.search + '#design');
} else {
  const start = () => import('./main.js');
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
