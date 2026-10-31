// probe2.mjs: GB-256 (J31, J32). probe.mjs's measurement in a page of its own (the real renderer, a GPU window off
// screen, raf=timer as tools/realtest.mjs runs the suite), because under tools/camera.mjs the game's own camera never
// followed him into the Training Ground (it stayed at the match spawn, so the cursor's ray never reached his floor).
//
//   node qa/2026-10-31-GB-256/probe2.mjs <phase> [guns]        (inside the game-test slot lease)
//
// Third person in the Training Ground, frame-stepped (T.stepFrame, 1/60 s a frame, so nothing depends on this
// computer's speed). The shake number is the jerk the eye sees: the mean size of the second difference of a point
// from frame to frame (mm): ~0 for a still hold or a steady slide, large for a frame-to-frame back-and-forth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'before';
const GUNS = (process.argv[3] || 'm4,pistol').split(',');
const MATCH = process.argv.includes('--match');   // a hunt match on open ground instead of the Training Ground
const OUT = path.join(ROOT, 'qa/2026-10-31-GB-256/' + PHASE + (process.argv.includes('--match') ? '-match' : ''));
fs.mkdirSync(OUT, { recursive: true });
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
const entered = MATCH ? await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Probe'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.clearZombies && T.clearZombies(); T.setViewFirstDbg(false); await wait(800);
  return JSON.stringify({ phase: T.getPhase(), first: T.fpDbg().first, w: T.getCurrentWeapon() });`, 180000) : await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
  const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
  await wait(3500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.setViewFirstDbg(false); await wait(800);
  return JSON.stringify({ active: D.state().active, wake: !!D.state().wake, first: T.fpDbg().first, w: T.getCurrentWeapon(), cam: [T.camera.position.x - T.player.position.x, T.camera.position.y - T.player.position.y, T.camera.position.z - T.player.position.z] });`, 120000);
console.log('entered: ' + entered);

// One run: <frames> frames of 1/60 s with zoom on/off and the cursor on a path (pixels from the canvas centre).
const RUN = (gun, name, zoom, path) => `
const W = '${gun}';
T.flightHold(false); T.setViewFirstDbg(false); T.setZoomHeldDbg(false);
const shownK = Object.keys(T).find((k) => T[k] && typeof T[k] === 'object' && typeof T[k].gunShown === 'function');
const shown = () => T[shownK].gunShown();
// The Training Ground starts him holstered (unarmed): draw with the 4 key, as Jerry would, then take the gun.
if (!shown()) { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', key: '4', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit4', key: '4', bubbles: true })); await wait(400); }
T.setWeapon(T.WEAPON_ORDER.indexOf(W));
await wait(1500); T.marineIdleDbg().reset();
if (!shown()) return JSON.stringify({ gun: W, now: T.getCurrentWeapon(), err: 'gun not shown (holstered)' });
const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
const put = (px, py) => { const o = { clientX: r.left + r.width / 2 + px, clientY: r.top + r.height / 2 + py, bubbles: true, pointerType: 'mouse' };
  cv.dispatchEvent(new PointerEvent('pointerenter', o)); cv.dispatchEvent(new PointerEvent('pointermove', o)); };
const path = ${path};
put(path(0)[0], path(0)[1]);
T.flightHold(true);
const dt = 1 / 60, v = new T.THREE.Vector3(), d = new T.THREE.Vector3(), H = T.handsDbg;
// settle: 1 s with the zoom and the start of the path
for (let i = 0; i < 60; i++) { T.flightInput({ keys: [], zoom: ${zoom} }); put(path(0)[0], path(0)[1]); T.stepFrame(dt); }
const fr = [];
for (let i = 0; i < 150; i++) {
  T.flightInput({ keys: [], zoom: ${zoom} });
  const p = path(i); if (p) put(p[0], p[1]);
  T.stepFrame(dt);
  if (T.marineIdleDbg().state.phase !== 'off' && T.marineIdleDbg().state.phase !== 'idle' && T.marineIdleDbg().state.phase) T.marineIdleDbg().reset();
  const P = T.player.position;
  const R = H.gripPoint('R', v).clone().sub(P), L = H.gripPoint('L', v).clone().sub(P);
  const gm = T.weaponMeshes[T.getCurrentWeapon()]; gm.updateMatrixWorld(true); gm.getWorldPosition(d); const M = d.clone().sub(P);
  gm.getWorldDirection(d);
  const sd = T.getShoulderDbg ? T.getShoulderDbg() : null, gl = T.smoothDbg.gunLag(), az = T.aimZoomDbg(), at = T.aimTarget;
  fr.push({ R: [R.x, R.y, R.z], L: [L.x, L.y, L.z], M: [M.x, M.y, M.z], dir: [d.x, d.y, d.z], yaw: T.aimSafetyDbg().yaw, self: T.aimSafetyDbg().self,
    aim: [at.x - P.x, at.y - P.y, at.z - P.z], kind: T.aimKindDbg(),
    lag: [gl.x, gl.y, gl.z], ads: sd ? sd.w : null, adsW: sd ? sd.ads : null, cheek: sd ? sd.cheek : null, zw: az.w, cam: [T.camera.position.x - P.x, T.camera.position.y - P.y, T.camera.position.z - P.z],
    py: P.y, rot: T.player.rotation.y });
}
T.flightHold(false); T.setZoomHeldDbg(false);
return JSON.stringify({ gun: W, now: T.getCurrentWeapon(), name: '${name}', fr });`;

const still = '(i) => [40, -200]';
const nearStill = '(i) => [60, 140]';
const sweep = '(i) => [40 + 260 * Math.sin(i / 150 * Math.PI * 2), -200 + 80 * Math.sin(i / 150 * Math.PI * 4)]';   // a smooth figure-8, a few px a frame
const stepsy = '(i) => (i % 2 ? null : [40 + 260 * Math.sin(i / 150 * Math.PI * 2), -200 + 80 * Math.sin(i / 150 * Math.PI * 4)])';
const nearMove = '(i) => [60 + 260 * Math.sin(i / 150 * Math.PI * 2), 140 + 80 * Math.sin(i / 150 * Math.PI * 4)]';   // the same, an event every other frame
const CASES = [['still', false, still], ['zoom-still', true, still], ['move', false, sweep], ['move-uneven', false, stepsy], ['zoom-move', true, sweep], ['zoom-move-uneven', true, stepsy], ['near-still', false, nearStill], ['near-zoom-still', true, nearStill], ['near-move', false, nearMove]];

const jerk = (fr, key) => { let s = 0, n = 0, mx = 0; for (let i = 2; i < fr.length; i++) { let q = 0; for (let k = 0; k < 3; k++) { const a = fr[i][key][k] - 2 * fr[i - 1][key][k] + fr[i - 2][key][k]; q += a * a; } q = Math.sqrt(q) * 1000; s += q; n++; mx = Math.max(mx, q); } return [+(s / n).toFixed(2), +mx.toFixed(1)]; };
const jerkY = (fr, key) => { let s = 0, n = 0; for (let i = 2; i < fr.length; i++) { s += Math.abs(fr[i][key][1] - 2 * fr[i - 1][key][1] + fr[i - 2][key][1]) * 1000; n++; } return +(s / n).toFixed(2); };
const angJ = (fr) => { let s = 0, n = 0, mx = 0; for (let i = 2; i < fr.length; i++) { let q = 0; for (let k = 0; k < 3; k++) { const a = fr[i].dir[k] - 2 * fr[i - 1].dir[k] + fr[i - 2].dir[k]; q += a * a; } q = Math.sqrt(q) * 180 / Math.PI; s += q; n++; mx = Math.max(mx, q); } return [+(s / n).toFixed(3), +mx.toFixed(2)]; };
const flips = (fr, key, k) => { let f = 0; for (let i = 3; i < fr.length; i++) { const a = fr[i][key][k] - fr[i - 1][key][k], b = fr[i - 1][key][k] - fr[i - 2][key][k]; if (a * b < 0 && Math.abs(a) > 0.0015 && Math.abs(b) > 0.0015) f++; } return f; };

const all = [];
for (const g of GUNS) for (const [name, zoom, path] of CASES) {
  const raw = await step(RUN(g, name, zoom, path));
  let r; try { r = JSON.parse(raw); } catch { console.log(g + ' ' + name + ' ' + raw.slice(0, 400)); continue; }
  if (r.err) { console.log(JSON.stringify(r)); continue; }
  const f = r.fr;
  const s = { gun: g, case: name, gripMm: jerk(f, 'R'), gripYMm: jerkY(f, 'R'), supportMm: jerk(f, 'L'), mountMm: jerk(f, 'M'), mountYMm: jerkY(f, 'M'), dirDeg: angJ(f),
    aimMm: jerk(f, 'aim'), aimYMm: jerkY(f, 'aim'), lagMm: jerk(f, 'lag'), camMm: jerk(f, 'cam'), flipsY: flips(f, 'M', 1), self: f.filter((x) => x.self).length, kinds: [...new Set(f.map((x) => x.kind))].join('/'),
    ads: f[f.length - 1].adsW, zoomW: f[f.length - 1].zw, now: r.now, yawSpan: +(Math.max(...f.map((x) => x.yaw)) - Math.min(...f.map((x) => x.yaw))).toFixed(2) };
  console.log(JSON.stringify(s));
  all.push({ ...s, fr: f });
  fs.writeFileSync(OUT + '/probe.json', JSON.stringify(all));
}
console.log('wrote ' + OUT + '/probe.json');
await browser.close?.(); srv.close?.(); process.exit(0);
