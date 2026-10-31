// probe.mjs: GB-256 (J31, J32). Third person in the Training Ground, frame-stepped (T.stepFrame, so every frame is
// the same 1/60 s and nothing depends on this computer's speed): how much the gun and both hands shake, frame to
// frame, standing still with and without right-click (the 2x aim zoom), and while the cursor moves.
//
//   node qa/2026-10-31-GB-256/probe.mjs <phase> [guns]        (inside the game-test slot lease)
//
// The shake number is the jerk the eye sees: the mean size of the second difference of a point from frame to frame
// (mm), which is ~0 for a still hold or a steady slide and large for a frame-to-frame back-and-forth. Writes
// <phase>/probe.json with the per-frame trace (grip, support hand, muzzle direction, the aim and the layers).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const PHASE = process.argv[2] || 'before';
const GUNS = (process.argv[3] || 'm4,pistol,shotgun,ak,uzi').split(',');
const OUT = 'qa/2026-10-31-GB-256/' + PHASE;
const A = ['--agent', 'grokbot', '--task', 'GB-256'];
fs.mkdirSync(OUT, { recursive: true });
const call = (args) => {
  try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 }).trim(); }
  catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 800); }
};
const ev = (code) => call(['eval', code]);

console.log('camera: ' + call(['start', '--training']));
console.log('setup: ' + ev(`
T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.setViewFirstDbg(false);
await wait(1200); T.marineIdleDbg().reset();
return JSON.stringify({ training: T.trainingDbg.state().active, first: T.fpDbg().first, w: T.getCurrentWeapon() });`));

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
  const raw = ev(RUN(g, name, zoom, path));
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
console.log('camera stop: ' + call(['stop']));
