// GB-154 (Grokbot): the pistol model alone, close on the real renderer (headless Chrome): plain, with the extended
// magazine and with the suppressor; side, 3/4 front and an x-ray side (magazine orange, the rest see-through).
//   node handoffs/2026-10-09-grokbot-GB-154/pistol-probe.mjs <outDir> [plain,ext,can]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const outDir = path.resolve(process.argv[2] || path.join(HERE, 'shots'));
const only = (process.argv[3] || '').split(',').filter((x) => x && x !== 'all');
// Views round the grip in the gun's own frame (x right, y up, z muzzle), ~1.5 m out with a narrow lens.
const VIEWS = { side: [-1.5, 0.05, 0.05], 'three-front': [-1.0, 0.35, 1.05], top: [-0.05, 1.5, 0.02], front: [-0.15, 0.1, 1.5], right: [1.5, 0.05, 0.05] };
const STATES = [
  { name: 'pistol', weapon: 'pistol' },
  { name: 'revolver', weapon: 'revolver' },
  { name: 'pistol-up', weapon: 'pistol', pitch: 0.45, views: ['side', 'three-front'] },
  { name: 'pistol-down', weapon: 'pistol', pitch: -0.45, views: ['side', 'three-front'] },
  { name: 'pistol-akimbo', weapon: 'pistol', akimbo: true, views: ['three-front', 'top'] },
  { name: 'revolver-akimbo', weapon: 'revolver', akimbo: true, views: ['three-front', 'top'] },
  { name: 'pistol-fire', weapon: 'pistol', fire: true, views: ['side', 'three-front'] },
  { name: 'pistol-reload', weapon: 'pistol', reload: [0.1, 0.5, 0.92], views: ['three-front'] },
  { name: 'revolver-reload', weapon: 'revolver', reload: [0.1, 0.5, 0.92], views: ['three-front'] },
  { name: 'pistol-sprint', weapon: 'pistol', keys: ['KeyW', 'ShiftLeft'], views: ['three-front'] },
  // GB-152: hands close up
  { name: 'm4', weapon: 'm4', views: ['three-front', 'side'], hands: true },
  { name: 'unarmed', weapon: 'pistol', holster: true, views: [], hands: true }
];
const HAND_VIEWS = { 'hand-front': [0.05, 0.08, 0.55], 'hand-out': [0.55, 0.1, 0.1], 'hand-top': [0.05, 0.55, 0.12], 'hand-in': [-0.5, 0.1, 0.2] };
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0; const results = [];
try {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ width: 900, height: 900 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (c, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500); return true;`, 120000);
  await step(`const tg = D.tg(); for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const O = tg.origin, y0 = tg.floorY;
    window.__S = { x: O.x, y: y0, z: O.z + 4 };
    return true;`);
  await page.evaluate(fs.readFileSync(path.join(HERE, 'grip-page.js'), 'utf8'));
  const key = (code, down) => `document.dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { code: '${code}', key: '${code}', bubbles: true }));`;

  // The pistol on its own, on a stand in front of him: a clone of the in-game model (plain, the extended magazine, the
  // suppressor), side, 3/4 front and an x-ray side (everything but the magazine see-through) to show the magazine in the grip.
  const res = await page.evaluate(`(async () => {
    const T = TT, THREE = T.THREE || window.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z);
    const m = T.getMarine(), root = m.parent; m.updateMatrixWorld(true);
    const base = m.getWorldPosition(V(0, 0, 0)).add(V(0, 2.8, 0));
    window.__pp = { T, THREE, V, root, base };
    return base.toArray();
  })()`);
  const variants = { plain: '', ext: "T.addCash(99999); if (!T.weaponMods('pistol').ext) T.buyExtMag('pistol'); T.armoryDbg.fit('pistol', 'ext', true);", can: "T.setGunSuppressor(T.weaponMeshes.pistol, true);" };
  const undo = { plain: '', ext: "T.armoryDbg.fit('pistol', 'ext', false);", can: "T.setGunSuppressor(T.weaponMeshes.pistol, false);" };
  const meas = {};
  for (const [v, code] of Object.entries(variants)) {
    if (only.length && !only.includes(v)) continue;
    const info = await page.evaluate(`(() => { const { T, THREE, V, root, base } = __pp; ${code} __step(2);
      const src = T.weaponMeshes.pistol; if (window.__clone) { root.remove(__clone); }
      const c = src.clone(true); c.position.copy(base); c.quaternion.identity(); c.rotation.set(0, Math.PI / 2, 0); c.scale.copy(src.getWorldScale(V(0, 0, 0)));
      c.traverse((o) => { if (o.name === 'suppressor') o.visible = !!src.userData.suppressed; });
      const A = [], B = []; src.traverse((o) => A.push(o)); c.traverse((o) => B.push(o)); const M = new Map(A.map((o, i) => [o, B[i]]));
      c.userData = { laser: M.get(src.userData.laser), flash: M.get(src.userData.flash), flashLight: M.get(src.userData.flashLight), mag: M.get(src.userData.mag) };
      c.visible = true; root.add(c); window.__clone = c; c.updateMatrixWorld(true);
      const b = new THREE.Box3(), skip = new Set([c.userData.laser, c.userData.flash, c.userData.flashLight].filter(Boolean));
      c.traverseVisible((o) => { if (o.isMesh && !skip.has(o)) { let s = false; for (let x = o; x; x = x.parent) if (skip.has(x)) s = true; if (!s) b.expandByObject(o); } }); window.__cb = b;
      return { size: b.getSize(V(0, 0, 0)).toArray(), scale: c.scale.x }; })()`);
    meas[v] = info;
    const views = { side: [0, 0.02, -1], 'three-front': [0.75, 0.3, -0.65], 'three-muzzle': [-0.75, 0.3, -0.65], xray: [0, 0.02, -1] };
    for (const [vn, dir] of Object.entries(views)) {
      await page.evaluate(`(() => { const { T, THREE, V } = __pp, b = __cb, c = b.getCenter(V(0, 0, 0)), s = b.getSize(V(0, 0, 0)).length();
        const d = V(...${JSON.stringify(dir)}).normalize().multiplyScalar(s * 2.1);
        const xr = ${vn === 'xray'};
        for (const fx of [__clone.userData.flash, __clone.userData.laser]) if (fx) fx.visible = false;
        __clone.traverse((o) => { if (!o.isMesh) return; let inMag = false; for (let x = o; x; x = x.parent) if (x === __clone.userData.mag) inMag = true;
          if (!o.userData.gbMat) o.userData.gbMat = o.material;
          if (xr && !inMag) { const mt = o.userData.gbMat.clone(); mt.transparent = true; mt.opacity = 0.28; mt.depthWrite = false; o.material = mt; }
          else if (xr && inMag) { const mt = o.userData.gbMat.clone(); mt.color = new THREE.Color(0xd08030); o.material = mt; }
          else o.material = o.userData.gbMat; });
        T.setShotView({ x: c.x + d.x, y: c.y + d.y, z: c.z + d.z, tx: c.x, ty: c.y, tz: c.z, fov: 24 }); __step(1); })()`);
      await new Promise((r) => setTimeout(r, 300));
      const file = path.join(outDir, `pistol-${v}-${vn}.png`);
      await page.screenshot(file); console.log('shot', path.relative(ROOT, file));
    }
    await page.evaluate(`(() => { const { T } = __pp; ${undo[v]} __step(2); })()`);
  }
  console.log(JSON.stringify(meas));
  const errs = (page.errors || []).filter((e) => !/contains' on 'Node'/.test(e)).slice(0, 5); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
