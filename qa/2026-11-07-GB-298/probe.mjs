// probe.mjs: GB-298 (J15). FP laser origin + direction vs view bore / aim point / body muzzle.
//   node qa/2026-11-07-GB-298/probe.mjs <phase>   (inside game-test slot)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'after';
const OUT = path.join(ROOT, 'qa/2026-11-07-GB-298');
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
  T.setGearDbg('laser'); T.setLasersDbg(true); T.setViewFirstDbg(true); await wait(800);
  return JSON.stringify({ phase: T.getPhase(), w: T.getCurrentWeapon() });`, 180000));

const RUN = (gun) => `
const W = '${gun}', THREE = T.THREE;
T.flightHold(false); T.setMouseFireDbg(false); T.setViewFirstDbg(true);
T.setWeapon(T.WEAPON_ORDER.indexOf(W)); await wait(1400); T.setLasersDbg(true);
const g = T.weaponMeshes[W]; if (!g || !g.userData.laser) return JSON.stringify({ gun: W, skip: 'no laser' });
const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
const put = (px, py) => { const o = { clientX: r.left + r.width / 2 + px, clientY: r.top + r.height / 2 + py, bubbles: true, pointerType: 'mouse' }; cv.dispatchEvent(new PointerEvent('pointermove', o)); };
T.flightHold(true); const dt = 1 / 60;
const deg = (u, v) => Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) * 180 / Math.PI;
const q = new THREE.Quaternion(), a = new THREE.Vector3(), o = new THREE.Vector3(), am = new THREE.Vector3();
const bodyMz = new THREE.Vector3(), viewMz = new THREE.Vector3(), viewAhead = new THREE.Vector3(), viewBore = new THREE.Vector3();
const sample = () => {
  g.updateMatrixWorld(true);
  const L = g.userData.laser;
  L.getWorldQuaternion(q); a.set(0, 0, 1).applyQuaternion(q).normalize();
  const mz = g.userData.muzzleLocal, sgn = mz.z >= 0 ? 1 : -1;
  bodyMz.copy(mz); g.localToWorld(bodyMz);
  const vm = T.viewmodel;
  const hasVm = !!(vm && vm.showing(W) && vm.muzzleWorld(viewMz, 1));
  let viewBoreOk = false;
  if (hasVm) {
    const gVm = vm.gun; const mzV = gVm.src.userData.muzzleLocal; const s = mzV.z >= 0 ? 1 : -1;
    vm.viewPoint(viewAhead.set(mzV.x, mzV.y, mzV.z + s), viewAhead, 1);
    const k = Math.tan((T.camera.fov || 60) * Math.PI / 360) / Math.tan(vm.proj.fov * Math.PI / 360);
    const mx = vm.space.scale.x;
    viewAhead.x *= k * mx; viewAhead.y *= k;
    T.camera.updateMatrixWorld(true);
    viewAhead.applyMatrix4(T.camera.matrixWorld);
    viewBore.subVectors(viewAhead, viewMz).normalize();
    viewBoreOk = viewBore.lengthSq() > 0.5;
  }
  T.weaponAimPointDbg ? T.weaponAimPointDbg(am) : am.copy(T.aimTarget);
  const toAim = am.clone().sub(hasVm ? viewMz : bodyMz).normalize();
  const rep = T.laserAimDbg();
  const origin = hasVm ? viewMz : bodyMz;
  const originMissBody = origin.distanceTo(bodyMz);
  const originMissView = hasVm ? origin.distanceTo(viewMz) : null;
  // Beam origin from report
  const beamO = rep ? new THREE.Vector3(rep.ox, rep.oy, rep.oz) : null;
  return {
    vis: L.visible && !!L.parent,
    hasVm,
    beamViewBore: viewBoreOk ? deg(a, viewBore) : null,
    beamAim: deg(a, toAim),
    originMissBodyCm: +(originMissBody * 100).toFixed(2),
    originMissViewCm: originMissView == null ? null : +(originMissView * 100).toFixed(2),
    reportOriginMissViewCm: (beamO && hasVm) ? +(beamO.distanceTo(viewMz) * 100).toFixed(2) : null,
    len: rep ? +rep.len.toFixed(2) : null,
    surface: !!(rep && rep.surface)
  };
};
for (let i = 0; i < 60; i++) { T.flightInput({ keys: [], zoom: false }); put(40, -80); T.stepFrame(dt); }
const restHip = sample();
// ADS still
for (let i = 0; i < 40; i++) { T.flightInput({ keys: [], zoom: true }); put(40, -80); T.stepFrame(dt); }
const restAds = sample();
// fire hip 20 frames
T.flightInput({ keys: [], zoom: false });
for (let i = 0; i < 20; i++) { T.stepFrame(dt); }
T.setMouseFireDbg(true);
let swing = 0, strayBore = 0, strayAim = 0, visF = 0;
const b0 = viewBore.clone();
for (let i = 0; i < 20; i++) {
  T.flightInput({ keys: [], zoom: false }); put(40, -80); T.stepFrame(dt);
  const s = sample();
  if (s.hasVm) swing = Math.max(swing, deg(viewBore, b0));
  if (s.beamViewBore != null) strayBore = Math.max(strayBore, s.beamViewBore);
  strayAim = Math.max(strayAim, s.beamAim);
  if (s.vis) visF++;
}
T.setMouseFireDbg(false);
for (let i = 0; i < 30; i++) { T.flightInput({ keys: [], zoom: false }); put(40, -80); T.stepFrame(dt); }
T.flightHold(false);
const f = (x) => x == null ? null : +(+x).toFixed(2);
return JSON.stringify({
  gun: W, view: 'first',
  hip: { vis: restHip.vis, beamViewBore: f(restHip.beamViewBore), beamAim: f(restHip.beamAim),
    originMissBodyCm: restHip.originMissBodyCm, originMissViewCm: restHip.originMissViewCm,
    reportOriginMissViewCm: restHip.reportOriginMissViewCm, len: restHip.len, surface: restHip.surface },
  ads: { vis: restAds.vis, beamViewBore: f(restAds.beamViewBore), beamAim: f(restAds.beamAim),
    reportOriginMissViewCm: restAds.reportOriginMissViewCm, len: restAds.len, surface: restAds.surface },
  fire: { boreSwingDeg: f(swing), beamOffViewBoreDeg: f(strayBore), beamOffAimDeg: f(strayAim), visFrames: visF + '/20' }
});`;

const guns = JSON.parse(await step(`return JSON.stringify(T.WEAPON_ORDER.filter((w) => T.weaponMeshes[w] && T.weaponMeshes[w].userData.laser))`));
const rows = [];
for (const gun of guns) {
  try { const r = await step(RUN(gun), 120000); console.log(r); rows.push(JSON.parse(r)); }
  catch (e) { console.log('ERR ' + gun + ' ' + e.message); rows.push({ gun, err: e.message }); }
}
fs.writeFileSync(path.join(OUT, PHASE + '.json'), JSON.stringify(rows, null, 1));
console.log('page errors: ' + errs.length); errs.forEach((e) => console.log(e));
await browser.close(); srv.close && srv.close();
process.exit(errs.length ? 1 : 0);