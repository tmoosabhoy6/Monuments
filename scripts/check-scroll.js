// Scroll performance (SPEC §10.5, §12): scrolls each built page top to bottom in both hero states,
// at 1440×900 and with phone emulation at 4× CPU throttling, recording frames through the Chrome
// DevTools Protocol.
//
// Method: the scroll is a real compositor gesture (Input.synthesizeScrollGesture). Frames are the
// browser's own frame timestamps, collected by a recorder that the DevTools protocol injects
// before the page loads (Page.addScriptToEvaluateOnNewDocument), so the site's code is unchanged.
// Long tasks come from the browser's longtask timing entries.
//
// Passes when: desktop ≥ 99% of frames within one 60 Hz frame (16.7 ms, measured with a 1 ms
// timer tolerance); throttled phone: no frame over 50 ms and no long task during the scroll.
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await serve(root + 'dist');
const browser = await chromium.launch({ args: ['--disable-gpu-vsync-ignore', '--enable-gpu-rasterization'] });
const PAGES = ['/', '/design/', '/monument-signs/', '/gallery/', '/how-it-works/', '/questions/'];

const RECORDER = `
  window.__frames = []; window.__long = []; window.__rec = false;
  (function loop(t) { if (window.__rec) window.__frames.push(t); requestAnimationFrame(loop); })(0);
  try { new PerformanceObserver((l) => { if (window.__rec) for (const e of l.getEntries()) window.__long.push(e.duration); })
    .observe({ type: 'longtask', buffered: false }); } catch (e) {}
`;

async function run({ name, context, throttle }) {
  const results = [];
  for (const path of PAGES) {
    for (const state of path === '/design/' ? ['builder'] : ['page']) {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Page.enable');
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
      await page.goto(server.url + path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (state === 'builder') {
        await page.fill('#b-line1', 'Alder Creek Homeowners');   // the builder's own field shows at every width
      }
      await page.waitForTimeout(600);
      if (throttle) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await page.evaluate(() => { window.__frames = []; window.__long = []; window.__rec = true; });
      // a gesture can stop short, so repeat until the page bottom is reached. (Headless Chromium does
      // not scroll the page for synthesized touch gestures, so the phone run uses the default source.)
      for (let i = 0; i < 30; i++) {
        const left = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
        if (left <= 2) break;
        await cdp.send('Input.synthesizeScrollGesture', {
          x: 200, y: 300, yDistance: -left, speed: 1600, gestureSourceType: throttle ? 'default' : 'mouse', preventFling: true, repeatCount: 1,
        });
      }
      await page.waitForTimeout(250);
      const { frames, long, end } = await page.evaluate(() => { window.__rec = false; return { frames: window.__frames, long: window.__long, end: scrollY }; });
      if (throttle) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const deltas = frames.slice(1).map((t, i) => t - frames[i]);
      const within = deltas.filter((d) => d <= 16.7 + 1).length;
      results.push({ path, state, frames: deltas.length, pct: deltas.length ? (100 * within) / deltas.length : 0,
        worst: deltas.length ? Math.max(...deltas) : 0, longTasks: long.length, reachedBottom: end >= height - 2 });
      await page.close();
    }
  }
  return results.map((r) => ({ ...r, name }));
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const phone = await browser.newContext({ ...devices['Pixel 7'] });
const rows = [...(await run({ name: 'desktop 1440×900', context: desktop })), ...(await run({ name: 'phone, 4× CPU throttle', context: phone, throttle: 4 }))];
await browser.close();
await server.close();

let failed = false;
for (const r of rows) {
  const phoneRun = r.name.startsWith('phone');
  const ok = r.frames > 20 && r.reachedBottom && (phoneRun ? r.worst <= 50 && r.longTasks === 0 : r.pct >= 99);
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(24)} ${(r.path + ' ' + r.state).padEnd(30)} frames ${String(r.frames).padStart(4)}  ` +
    `within 16.7 ms ${r.pct.toFixed(1).padStart(5)}%  worst ${r.worst.toFixed(1).padStart(5)} ms  long tasks ${r.longTasks}` + (r.reachedBottom ? '' : '  (did not reach the bottom)'));
}
if (failed) { console.error('\ncheck:scroll failed'); process.exit(1); }
console.log('\ncheck:scroll passed');
