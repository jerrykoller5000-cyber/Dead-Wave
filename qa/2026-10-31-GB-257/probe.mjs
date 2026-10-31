// probe.mjs: GB-257 (J8, J9). Does the laser ride the gun? Real renderer, a hunt match, frame-stepped at 1/60 s.
//   node qa/2026-10-31-GB-257/probe.mjs <phase>      (inside the game-test slot lease)
// Per gun and view (third person, first person): at rest, the angle between the beam and the bore and between the
// beam and the muzzle-to-aim-point line, the dot's miss from the aim point; firing 20 frames, how far the bore swings
// and how far the beam strays from the bore; a reload, how many of its frames show the beam.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'before';
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
const errs = [];
try { page.on && page.on('Runtime.exceptionThrown', (e) => errs.push(JSON.stringify(e).slice(0, 300))); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
console.log('entered: ' + await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Probe'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons();
  T.setGearDbg('laser'); T.setLasersDbg(true); T.setViewFirstDbg(false); await wait(800);
  return JSON.stringify({ phase: T.getPhase(), w: T.getCurrentWeapon() });`, 180000));
const RUN = (gun, first) => `
const W = '${gun}', THREE = T.THREE;
T.flightHold(false); T.setMouseFireDbg(false); T.setViewFirstDbg(${first});
T.setWeapon(T.WEAPON_ORDER.indexOf(W)); await wait(1200); T.setLasersDbg(true);
const g = T.weaponMeshes[W]; if (!g || !g.userData.laser) return JSON.stringify({ gun: W, skip: 'no laser' });
const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
const put = (px, py) => { const o = { clientX: r.left + r.width / 2 + px, clientY: r.top + r.height / 2 + py, bubbles: true, pointerType: 'mouse' }; cv.dispatchEvent(new PointerEvent('pointermove', o)); };
T.flightHold(true); const dt = 1 / 60;
const mz = g.userData.muzzleLocal, sgn = mz.z >= 0 ? 1 : -1;
const q = new THREE.Quaternion(), a = new THREE.Vector3(), b = new THREE.Vector3(), o = new THREE.Vector3(), am = new THREE.Vector3();
const deg = (u, v) => Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) * 180 / Math.PI;
const sample = () => { g.updateMatrixWorld(true); const L = g.userData.laser;
  L.getWorldQuaternion(q); a.set(0, 0, 1).applyQuaternion(q).normalize();
  g.getWorldQuaternion(q); b.set(0, 0, sgn).applyQuaternion(q).normalize();
  o.copy(mz); g.localToWorld(o); T.weaponAimPointDbg ? T.weaponAimPointDbg(am) : am.copy(T.aimTarget); const toAim = am.clone().sub(o).normalize();
  const rep = T.laserAimDbg();
  return { vis: L.visible && !!L.parent, beamBore: deg(a, b), beamAim: deg(a, toAim), boreAim: deg(b, toAim), bore: b.clone(),
    miss: rep ? Math.hypot(rep.x - am.x, rep.y - am.y, rep.z - am.z) : null, len: rep ? rep.len : null }; };
for (let i = 0; i < 60; i++) { T.flightInput({ keys: [], zoom: false }); put(60, -120); T.stepFrame(dt); }
const rest = sample();
// fire 20 frames
T.setMouseFireDbg(true); let swing = 0, stray = 0, visF = 0; const b0 = rest.bore.clone();
for (let i = 0; i < 20; i++) { T.flightInput({ keys: [], zoom: false }); put(60, -120); T.stepFrame(dt); const s = sample(); swing = Math.max(swing, deg(s.bore, b0)); stray = Math.max(stray, s.beamBore); if (s.vis) visF++; }
T.setMouseFireDbg(false);
for (let i = 0; i < 40; i++) { T.flightInput({ keys: [], zoom: false }); put(60, -120); T.stepFrame(dt); }
// reload
T.startReload(); let rel = 0, relVis = 0, relStray = 0;
for (let i = 0; i < 400; i++) { T.flightInput({ keys: [], zoom: false }); put(60, -120); T.stepFrame(dt); if (!T.isReloading()) { if (rel > 0) break; else continue; } rel++; const s = sample(); if (s.vis) { relVis++; relStray = Math.max(relStray, s.beamBore); } }
T.flightHold(false);
const f = (x) => x == null ? null : +x.toFixed(2);
return JSON.stringify({ gun: W, view: ${first} ? 'first' : 'third', rest: { vis: rest.vis, beamBore: f(rest.beamBore), beamAim: f(rest.beamAim), boreAim: f(rest.boreAim), miss: f(rest.miss), len: f(rest.len) },
  fire: { boreSwingDeg: f(swing), beamOffBoreDeg: f(stray), visFrames: visF + '/20' }, reload: { frames: rel, beamShown: relVis, beamOffBoreDeg: f(relStray) } });`;
const guns = JSON.parse(await step(`return JSON.stringify(T.WEAPON_ORDER.filter((w) => T.weaponMeshes[w] && T.weaponMeshes[w].userData.laser))`));
const rows = [];
for (const first of [false, true]) for (const gun of guns) {
  try { const r = await step(RUN(gun, first), 120000); console.log(r); rows.push(JSON.parse(r)); } catch (e) { console.log('ERR ' + gun + ' ' + e.message); }
}
fs.writeFileSync(path.join(ROOT, 'qa/2026-10-31-GB-257/' + PHASE + '.json'), JSON.stringify(rows, null, 1));
console.log('page errors: ' + errs.length); errs.forEach((e) => console.log(e));
await browser.close(); srv.close && srv.close(); process.exit(0);