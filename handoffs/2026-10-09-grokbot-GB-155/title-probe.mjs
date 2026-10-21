// GB-155 (Grokbot): the game's name where the player sees it, on the real renderer (headless Chrome): the opening's
// wordmark (held on its 'loading' look), the title menu, the HUD header in a match and the tab title.
//   node handoffs/2026-10-09-grokbot-GB-155/title-probe.mjs <outDir>
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const outDir = path.resolve(process.argv[2] || path.join(HERE, 'shots'));
fs.mkdirSync(outDir, { recursive: true });
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 120000 });
  // the opening's wordmark, held on the loading look (no animation) while the game loads behind it
  await page.evaluate(`(() => { const o = document.getElementById('opening'); o.dataset.phase = 'loading'; const v = document.getElementById('openingVideo'); if (v) v.pause(); })()`);
  await wait(page, 1200);
  await page.screenshot(path.join(outDir, 'opening-wordmark.png'));
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('window.TT never appeared');
  for (let i = 0; i < 2; i++) { await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`); await wait(page, 300); }
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await wait(page, 1500);
  const menu = await page.evaluate(`(() => { const w = document.querySelector('[data-dw-wordmark]'), r = w.getBoundingClientRect(), p = w.parentElement.getBoundingClientRect();
    return { title: document.title, wordmark: w.innerText.replace(/\\n/g, ' / '), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), parentRight: Math.round(p.right), vw: innerWidth }; })()`);
  await page.screenshot(path.join(outDir, 'title-menu.png'));
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Rename'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 120000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await wait(page, 2500);
  const hud = await page.evaluate(`(() => { const t = document.getElementById('title'), r = t.getBoundingClientRect(), p = t.parentElement.getBoundingClientRect();
    return { text: t.innerText, w: Math.round(r.width), h: Math.round(r.height), parentW: Math.round(p.width), overflow: t.scrollWidth > t.clientWidth + 1 || t.parentElement.scrollWidth > t.parentElement.clientWidth + 1 }; })()`);
  await page.screenshot(path.join(outDir, 'hud.png'));
  // the HUD header, close: the title's panel, cropped
  const box = await page.evaluate(`(() => { const r = document.getElementById('title').parentElement.getBoundingClientRect(); return [r.left, r.top, r.width, Math.min(r.height, 160)]; })()`);
  fs.writeFileSync(path.join(outDir, 'measure.json'), JSON.stringify({ menu, hud, hudPanel: box }, null, 1));
  console.log(JSON.stringify({ menu, hud, hudPanel: box }));
  const errs = page.errors.slice(0, 5); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
