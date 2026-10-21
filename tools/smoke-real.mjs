// tools/smoke-real.mjs — CU-85's integration look on the real renderer: a visible Chrome (WebGPU, the default
// renderer). Page one: the Training Ground from the title, its room warm-compiled and shot at. Page two: a match,
// past the insertion, a night called. Prints the page errors and a few readings; exits 1 on any page error. Opens a
// window on this PC for about two minutes.
//   node tools/smoke-real.mjs [--seconds 20]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const si = argv.indexOf('--seconds');
const HOLD = (si >= 0 ? Number(argv[si + 1]) : 20) * 1000;
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
let failed = false;
async function boot(label) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const t0 = Date.now();
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await wait(page, 300);
  }
  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log(`${label}: title up in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${await page.evaluate('TT.scene && TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : "?"')}`);
  return page;
}
const report = (page, label) => {
  const errs = page.errors.slice(0, 20);
  console.log(errs.length ? `${label} page errors:\n  ` + errs.map((e) => e.split('\n')[0]).join('\n  ') : `${label}: page errors none`);
  if (errs.length) failed = true;
};
try {
  const a = await boot('training');
  await a.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Smoke'; document.getElementById('modeTraining').click(); })()`);
  await a.waitFor(`document.body.classList.contains('training')`, { timeout: 60000 });
  await wait(a, 9000);   // the room's warm compile and the blackout run in here
  const hits = await a.evaluate(`(() => { const T = TT.trainingDbg; T.spawn('shambler', 2); return T.alive(); })()`);
  await wait(a, 4000);
  console.log(`training: in the room (${await a.evaluate('TT.trainingDbg.tg() ? "room built" : "no room"')}), ${hits} called in, frames still running: ${await a.evaluate('(async () => { const t = performance.now(); await new Promise((r) => requestAnimationFrame(r)); return (performance.now() - t) < 500; })()')}`);
  report(a, 'training');
  await a.close?.();

  const b = await boot('match');
  await b.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Smoke'; document.getElementById('modeHunt').click(); })()`);
  await b.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 });
  await b.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 90000 });
  console.log('match: in prep, past the insertion');
  await wait(b, HOLD / 2);
  await b.evaluate('TT.beginWave()');
  await wait(b, HOLD / 2);
  console.log(`night: phase ${await b.evaluate('TT.getPhase()')}, lockdown ${await b.evaluate('TT.nightLockdown()')}, zombies ${await b.evaluate('TT.zombies.length')}`);
  report(b, 'match');
} catch (e) {
  console.log('smoke failed: ' + (e && e.message || e));
  failed = true;
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
