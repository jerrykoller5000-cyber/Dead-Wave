// probe.mjs: GB-265 (GP-20007's request). Real renderer, a hunt match. The saw heard to 40 m by a held cut (sawCutTick).
//   node qa/2026-11-01-GB-265/probe.mjs <phase>      (inside the game-test slot lease)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'after';
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message || e.error))); if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  ${code} })()`, ms);
console.log('entered: ' + await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Probe'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.clearZombies && T.clearZombies(); T.setHp(100000);
  return JSON.stringify({ phase: T.getPhase(), day: T.getDay && T.getDay() });`, 180000));
const r = await step(`const out = {}; T.addCash(50000); T.grantAllWeapons(); const W = T.WEAPON_ORDER; const P = T.player.position;
  out.radius = T.shotHearingRadius('chainsaw'); out.table = T.SHOT_HEARING.chainsaw;
  T.setWeapon(W.indexOf('chainsaw')); await wait(800); out.inHand = T.getCurrentWeapon();
  // the saw starts on equip (GP-188's pull); wait until a cut tick bites
  out.ready = await until(() => { const b = T.sawCutTick(0.016); return b; }, 8000);
  await wait(600);   // let the first hold lapse
  const guardAt = (d) => { T.clearZombies(); const g = T.spawnZombie(P.x + d, P.z, 'shambler', true, true); g.riseT = 0; g.poiGuard = { x: P.x + d, z: P.z, n: 1, kind: 'test' }; g.poiAwake = false; return g; };
  const hold = (g) => { g.mesh.position.x = g.poiGuard.x; g.mesh.position.z = g.poiGuard.z; };
  const cut = async (secs) => { const noises = new Set(); let bit = 0, n = 0; const t0 = performance.now(); let last = t0;
    while (performance.now() - t0 < secs * 1000) { const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000) || 0.016; last = now; if (T.sawCutTick(dt)) bit++; n++; const s = T.heardShotDbg().lastShotNoise; if (s) noises.add(s); await wait(16); }
    return { ticks: n, bit, noises: noises.size, last: T.heardShotDbg().lastShotNoise }; };
  T.setSawHeatDbg(0);
  let g = guardAt(38); await wait(300); out.sleeps38Before = !g.poiAwake;
  const s0 = T.sawCutDbg(); const c1 = await cut(2.0); hold(g); const s1 = T.sawCutDbg();
  out.cut38 = { ticks: c1.ticks, bit: c1.bit, noisesIn2s: c1.noises, w: c1.last && c1.last.w, r: c1.last && c1.last.r, suppressed: c1.last && c1.last.suppressed, woke: g.poiAwake, why: g.poiWake,
    fuel: [+s0.fuel.toFixed(3), +s1.fuel.toFixed(3)], heat: [+s0.heat.toFixed(3), +s1.heat.toFixed(3)], biteT: +s1.biteT.toFixed(2) };
  await wait(600); out.afterHold = T.sawCutDbg().holdT;
  T.setSawHeatDbg(0);
  g = guardAt(42); await wait(300); const c2 = await cut(1.2); hold(g); out.cut42 = { noises: c2.noises, woke: g.poiAwake };
  await wait(600);
  T.setSawHeatDbg(0.999); const ov = T.sawCutTick(0.1); out.overheat = { returned: ov, overheat: T.sawCutDbg().overheat, next: T.sawCutTick(0.016) };
  T.setSawHeatDbg(0);
  T.setWeapon(W.indexOf('m4')); await wait(600); out.otherGun = T.sawCutTick(0.016);
  T.clearZombies();
  return JSON.stringify(out);`);
console.log(r);
const errs = await page.evaluate(`JSON.stringify(window.__errs || [])`);
console.log('page errors: ' + errs);
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-01-GB-265/' + PHASE + '.json'), JSON.stringify({ probe: JSON.parse(r), pageErrors: JSON.parse(errs) }, null, 1));
await browser.close(); srv.close && srv.close(); process.exit(0);