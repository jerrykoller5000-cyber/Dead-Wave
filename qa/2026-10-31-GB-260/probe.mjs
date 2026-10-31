// probe.mjs - GB-260 (J7, J21). The magazines and the six cans measured against docs/weapons-sizes.md.
//   node qa/2026-10-31-GB-260/probe.mjs <phase>        (inside the game-test slot)
// Every number is in builder millimetres (the model's own units) and in visual millimetres: builder x the game's
// weapon-size factor, which is the measure docs/weapons-sizes.md quotes (the gun's size on a 1.8 m marine).
//  - magazine: its body's three dimensions in ITS OWN space (so the grip's rake is not mixed in), regular and extended.
//  - well: a horizontal slice of the gun's body at the well's mouth, round the magazine's footprint: the opening the
//    magazine has to fill.
//  - mouth: the lowest point of the gun's body in a vertical line up through the middle of the magazine.
//  - protrusion: how far the magazine's foot hangs below that mouth (the part you can see).
//  - cans: length, diameter and how far each stands proud of the barrel's end.
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
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
console.log('entered: ' + await step(`
  const n = document.getElementById('playerName'); if (n) n.value = 'Probe';
  document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.clearZombies && T.clearZombies();
  T.grantAllWeapons && T.grantAllWeapons(); T.addCash(999999);
  for (const w of ['pistol','uzi','m4','ak','sniper','aa12']) { try { T.buyExtMag(w); } catch (e) {} }
  return JSON.stringify({ phase: T.getPhase() });`, 240000));
const MEASURE = (w, extOn) => `
const W = '${w}', THREE = T.THREE, f = T.getWeaponSizeDbg().factors[W] || 1;
const gun = T.weaponMeshes[W], ud = gun.userData;
if (!ud.mag) return JSON.stringify({ gun: W, ext: ${extOn}, skip: 'no magazine' });
T.setGunSuppressor(gun, false);
T.armoryDbg.fit(W, 'ext', ${extOn});
await wait(120);
ud.mag.position.copy(ud.baseMagPos); if (ud.baseMagRot) ud.mag.rotation.copy(ud.baseMagRot);
gun.updateMatrixWorld(true);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// --- the magazine in its own space -----------------------------------------------------------------------------
const magInv = new THREE.Matrix4().copy(ud.mag.matrixWorld).invert();
const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
const magVerts = [];
ud.mag.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
  const m = new THREE.Matrix4().multiplyMatrices(magInv, o.matrixWorld), pa = o.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) { const q = V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m); magVerts.push(q);
    lo[0] = Math.min(lo[0], q.x); lo[1] = Math.min(lo[1], q.y); lo[2] = Math.min(lo[2], q.z);
    hi[0] = Math.max(hi[0], q.x); hi[1] = Math.max(hi[1], q.y); hi[2] = Math.max(hi[2], q.z); } });
// --- the gun's body, in the gun's space (the magazine left out) -------------------------------------------------
const gunInv = new THREE.Matrix4().copy(gun.matrixWorld).invert();
const skip = new Set([ud.mag, ud.suppressor, ud.flash, ud.flashLight, ud.laser, ud.heavyLook].filter(Boolean));
const tris = [];
const walk = (o) => { if (skip.has(o) || o.visible === false) return;
  if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
    const m = new THREE.Matrix4().multiplyMatrices(gunInv, o.matrixWorld), pa = o.geometry.attributes.position, idx = o.geometry.index, P = [];
    for (let i = 0; i < pa.count; i++) P.push(V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m));
    const n = idx ? idx.count : pa.count, gi = (i) => (idx ? (idx.getX ? idx.getX(i) : idx.array[i]) : i);
    for (let i = 0; i + 2 < n; i += 3) tris.push([P[gi(i)], P[gi(i + 1)], P[gi(i + 2)]]); }
  for (const c of o.children) walk(c); };
gon: { for (const c of gun.children) walk(c); }
// the magazine's footprint in the gun's space
const magW = ud.mag.matrixWorld;
const footX = [], footZ = [];
{ const wv = new THREE.Vector3(); for (const q of magVerts) { wv.copy(q).applyMatrix4(magW); wv.applyMatrix4(gunInv); footX.push(wv.x); footZ.push(wv.z); } }
const fxLo = Math.min(...footX), fxHi = Math.max(...footX), fzLo = Math.min(...footZ), fzHi = Math.max(...footZ);
const magLowGun = (() => { const wv = new THREE.Vector3(); let m = 1e9; for (const q of magVerts) { wv.copy(q).applyMatrix4(magW).applyMatrix4(gunInv); m = Math.min(m, wv.y); } return m; })();
// --- the mouth: a vertical line up the magazine's middle -------------------------------------------------------
const cx = (fxLo + fxHi) / 2, cz = (fzLo + fzHi) / 2;
const hits = [];
for (const t of tris) for (let e = 0; e < 3; e++) {
  const a = t[e], b = t[(e + 1) % 3];
  const dx = b.x - a.x, dz = b.z - a.z, det = dx * dz - dz * dx;
  // 2D barycentric on (x,z) of the triangle, then the y on its plane at (cx,cz)
  const p = t; const den = (p[1].z - p[2].z) * (p[0].x - p[2].x) + (p[2].x - p[1].x) * (p[0].z - p[2].z);
  if (Math.abs(den) < 1e-12) continue;
  const l0 = ((p[1].z - p[2].z) * (cx - p[2].x) + (p[2].x - p[1].x) * (cz - p[2].z)) / den;
  const l1 = ((p[2].z - p[0].z) * (cx - p[2].x) + (p[0].x - p[2].x) * (cz - p[2].z)) / den;
  const l2 = 1 - l0 - l1;
  if (l0 < -0.02 || l1 < -0.02 || l2 < -0.02) continue;
  hits.push(l0 * p[0].y + l1 * p[1].y + l2 * p[2].y); }
const mouth = hits.length ? Math.min(...hits.filter((y) => y >= magLowGun - 0.001)) : null;
// --- the well's opening: a horizontal slice of the body 3 mm above the mouth ------------------------------------
const B = (x) => +(x * 1000).toFixed(1), MM = (x) => +(x * 1000 * f).toFixed(1);
let wellW = null, wellD = null;
if (mouth != null) { const y = mouth + 0.003, pts = [];
  for (const t of tris) for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3];
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
    const u = (y - a.y) / (b.y - a.y), x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
    if (Math.abs(x - cx) < 0.06 && Math.abs(z - cz) < 0.06) pts.push([x, z]); }
  if (pts.length) { wellW = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    wellD = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])); } }
const magAcross = hi[0] - lo[0], magLong = hi[1] - lo[1], magDeep = hi[2] - lo[2];
return JSON.stringify({ gun: W, ext: ${extOn}, f: +f.toFixed(4),
  mag: { acrossB: B(magAcross), longB: B(magLong), deepB: B(magDeep),
         acrossMM: MM(magAcross), longMM: MM(magLong), deepMM: MM(magDeep) },
  well: wellW == null ? null : { acrossB: B(wellW), deepB: B(wellD), acrossMM: MM(wellW), deepMM: MM(wellD) },
  fill: wellW ? { across: +(magAcross / wellW).toFixed(3), deep: +(magDeep / wellD).toFixed(3) } : null,
  mouthB: mouth == null ? null : B(mouth),
  protrudeB: mouth == null ? null : B(mouth - magLowGun),
  protrudeMM: mouth == null ? null : MM(mouth - magLowGun) });`;
const rows = [];
for (const w of ['pistol', 'uzi', 'm4', 'ak', 'sniper', 'aa12']) for (const ext of [false, true]) {
  try { const r = JSON.parse(await step(MEASURE(w, ext), 120000)); console.log(JSON.stringify(r)); rows.push(r); }
  catch (e) { console.log('ERR ' + w + ' ext=' + ext + ' ' + String(e.message).slice(0, 240)); }
}
const cans = JSON.parse(await step(`
const f = T.getWeaponSizeDbg().factors, o = {};
for (const w of ['pistol','uzi','m4','ak','sniper','shotgun']) { const S = T.SUPPRESSOR[w], g = T.weaponMeshes[w];
  o[w] = { f: +f[w].toFixed(4), lenB: +(S.len*1000).toFixed(1), diaB: +(S.r*2*1000).toFixed(1), backB: +(S.back*1000).toFixed(1),
    lenMM: +(S.len*f[w]*1000).toFixed(1), diaMM: +(S.r*2*f[w]*1000).toFixed(1),
    proudMM: +((S.len - S.back)*f[w]*1000).toFixed(1), boreB: +(S.r*0.64*1000).toFixed(1),
    built: !!(g && g.userData.suppressor) }; }
return JSON.stringify(o);`));
console.log('CANS ' + JSON.stringify(cans));
fs.writeFileSync(path.join(ROOT, 'qa/2026-10-31-GB-260', PHASE + '.json'), JSON.stringify({ phase: PHASE, mags: rows, cans }, null, 1));
await browser.close(); srv.close && srv.close(); process.exit(0);