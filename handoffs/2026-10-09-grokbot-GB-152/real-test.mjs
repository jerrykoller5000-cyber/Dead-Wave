// GB-148 (Grokbot): a tools/tests check on the real renderer (headless Chrome + SwiftShader, real three), where the
// test page's three stub would print the body-gap checks as SKIP. Based on GB-146's sniper-real.mjs.
//   node handoffs/2026-10-09-grokbot-GB-148/real-test.mjs t224 [out.txt]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const [test = 't224', outArg = ''] = process.argv.slice(2);
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await wait(page, 300);
  }
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Holster'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 120000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  // The match is up: the test's own startMatch() has nothing left to do here.
  await page.evaluate(`window.startMatch = async () => {}`);
  // RT_OLD=1: the revolver's pack holster put back where it was before GB-148 (live, nothing saved), for a baseline.
  if (process.env.RT_OLD === '1') await page.evaluate(`(() => { const rig = TT.getMarine().userData.carry, orig = rig.placeSecondary;
    rig.placeSecondary = (spot, side, lower) => { orig(spot, side, lower); if (!(lower && spot.kind === 'revolver')) return;
      spot.g.position.x = side * 0.19; spot.g.position.z = -0.39; if (spot.gun) spot.gun.rotation.z = side * Math.PI / 2;
      spot.shell.position.x = -side * 0.055; if (spot.loop) spot.loop.position.x = -side * 0.055; }; TT.updateCarriedGear(0, true); })()`);
  const res = await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', test + '.js'), 'utf8'), 1200000);
  console.log(res);
  if (outArg) fs.writeFileSync(outArg, String(res));
  if (/^FAIL/m.test(String(res))) code = 1;
  const errs = page.errors.slice(0, 10);
  if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
