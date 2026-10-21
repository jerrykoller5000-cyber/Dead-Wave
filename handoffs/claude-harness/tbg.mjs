// Background-tab load check. Loads the game the way a hidden tab sees it:
// visibilityState 'hidden', requestAnimationFrame callbacks held, and timers throttled
// to one wake-up a second (Chrome's hidden-page throttling). Passes when the loader
// reaches 100% ("ready") within BUDGET seconds and the load channel is consistent.
// PAGE, PORT, CHROME, BUDGET, WEBGL=1, VISIBLE=1, HIDE_AT=<s>, SHOW_AT=<s>.
import { chromium } from 'playwright';
const BUDGET = +(process.env.BUDGET || 120);
const PAGE = process.env.PAGE || 'test.html';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
const infos = [];
page.on('console', m => { const t = m.text(); if (/Dead-Wave (load|pre-roll)|dw-load/.test(t)) infos.push(t.slice(0, 300)); });
// Modes: default hidden throughout; VISIBLE=1 visible throughout; HIDE_AT=<s> starts
// visible and hides the tab <s> seconds in; SHOW_AT=<s> starts hidden and shows it.
const HIDE_AT = +(process.env.HIDE_AT || 0), SHOW_AT = +(process.env.SHOW_AT || 0);
const startHidden = !process.env.VISIBLE && !HIDE_AT;
await page.addInitScript(([WEBGL, startHidden]) => {
  window.__stages = []; addEventListener('dw-load', (e) => { const d = e.detail || {}; window.__stages.push(d.stageId + (d.substageId ? '/' + d.substageId : '') + ':' + d.state); });
  // Mirror three's WebGL2 backend, which polls parallel shader compiles with rAF.
  if (WEBGL) window.__fakeParallelCompile = true;
  // A tab the test can hide and show. While hidden: rAF callbacks are held (including
  // ones queued before it hid) until it shows again, and timers wake at most once a
  // second — what Chrome does to a background tab.
  const nativeRAF = window.requestAnimationFrame.bind(window), nativeCAF = window.cancelAnimationFrame.bind(window), st = window.setTimeout.bind(window);
  let hidden = startHidden, rafCalls = 0; const held = [];
  Object.defineProperty(Document.prototype, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible' });
  Object.defineProperty(Document.prototype, 'hidden', { get: () => hidden });
  window.requestAnimationFrame = (f) => { rafCalls++; return nativeRAF((t) => { if (hidden) held.push(f); else f(t); }); };
  window.cancelAnimationFrame = (id) => nativeCAF(id);
  window.setTimeout = (f, ms, ...a) => st(f, hidden ? Math.max(+ms || 0, 1000) : ms, ...a);
  window.__rafCalls = () => rafCalls;
  window.__setHidden = (h) => { hidden = h; if (!h) for (const f of held.splice(0)) nativeRAF(f); document.dispatchEvent(new Event('visibilitychange')); };
}, [!!process.env.WEBGL, startHidden]);
const t0 = Date.now();
await page.goto('http://localhost:' + (process.env.PORT || 8793) + '/' + PAGE + '?debug=1', { waitUntil: 'commit' });
let ready = false, last = '', flipped = false;
while ((Date.now() - t0) / 1000 < BUDGET) {
  try {
    const el = (Date.now() - t0) / 1000;
    if (!flipped && HIDE_AT && el >= HIDE_AT) { flipped = true; await page.evaluate(() => window.__setHidden(true)); console.log(el.toFixed(1) + 's  (tab hidden)'); }
    if (!flipped && SHOW_AT && el >= SHOW_AT) { flipped = true; await page.evaluate(() => window.__setHidden(false)); console.log(el.toFixed(1) + 's  (tab shown)'); }
    const s = await page.evaluate(() => [document.getElementById('openingPercent')?.textContent, document.getElementById('openingStatus')?.textContent].join(' '));
    if (s !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1) + 's  ' + s); last = s; }
    if (/^100%/.test(s)) { ready = true; break; }
  } catch (_) {}
  await new Promise(r => setTimeout(r, 250));
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const extra = await page.evaluate(() => ({ raf: window.__rafCalls(), stages: window.__stages, load: window.DWLoad ? { state: window.DWLoad.snapshot().state, stages: window.DWLoad.snapshot().stages } : null })).catch(e => ({ err: e.message }));
console.log('events:', (extra.stages || []).join(' '));
console.log('snapshot:', JSON.stringify(extra.load));
if (ready) {
  const ev = extra.stages || [];
  const bad = [];
  if (!extra.load) bad.push('no load channel (window.DWLoad is missing)');
  else {
  if (ev[ev.length - 1] !== 'ready:end') bad.push('ready is not the last event');
  const seen = new Set();
  for (const e of ev) { const [k, st] = e.split(':'); if (st === 'end' && k !== 'ready' && !seen.has(k + ':begin')) bad.push(k + ' ended before it began'); if (seen.has(e)) bad.push('duplicate ' + e); seen.add(e); }
  if (extra.load.state !== 'ready') bad.push('snapshot state is not ready');
  }
  if (bad.length) { console.log('FAIL load channel: ' + bad.join('; ')); ready = false; }
}
console.log(infos.join('\n'));
if (errs.length) console.log('PAGE ERRORS:\n' + errs.slice(0, 5).join('\n'));
console.log(ready ? `PASS loader reached 100% in a ${(process.env.VISIBLE ? 'visible' : HIDE_AT ? 'visible-then-hidden' : SHOW_AT ? 'hidden-then-shown' : 'hidden')} tab after ${secs}s` : `FAIL loader stuck at "${last}" after ${secs}s in a ${(process.env.VISIBLE ? 'visible' : HIDE_AT ? 'visible-then-hidden' : SHOW_AT ? 'hidden-then-shown' : 'hidden')} tab`);
await browser.close();
process.exit(ready ? 0 : 1);
