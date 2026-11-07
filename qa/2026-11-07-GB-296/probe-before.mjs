// qa/2026-11-07-GB-296/probe-before.mjs — ADS stock in frame: measure + 1280 shots (before).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'before');
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
// Every gun with a stock that GB-296 owns (launcher = ChatGPT GP-20037 — measure only).
const GUNS = ['m4', 'ak', 'shotgun', 'aa12', 'sniper', 'launcher', 'minigun', 'uzi', 'pistol', 'revolver', 'flamer', 'chainsaw'];

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const boot = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB296'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
    return { first: !!T.fpDbg?.()?.first, vm: !!(T.viewmodelDbg?.()?.info?.active) };
  })()`, 600000);
  console.log('boot', boot);
  if (!boot.first || !boot.vm) throw new Error('FP viewmodel not up');

  const rows = [];
  for (const gun of GUNS) {
    const row = await page.evaluate(`(async () => {
      const T = TT;
      const THREE = T.THREE;
      const gun = ${JSON.stringify(gun)};
      for (let i = 0; i < 25 && T.getCurrentWeapon() !== gun; i++) {
        const ix = T.WEAPON_ORDER.indexOf(gun);
        if (ix < 0) return { gun, ok: false, err: 'no weapon' };
        T.setWeapon(ix); await new Promise((r) => setTimeout(r, 120));
      }
      await new Promise((r) => setTimeout(r, 900));
      if (T.getCurrentWeapon() !== gun) return { gun, ok: false, err: 'equip failed', have: T.getCurrentWeapon() };
      const vm = T.viewmodelDbg?.();
      if (!vm || !vm.info?.active) return { gun, ok: false, err: 'vm inactive' };
      const src = T.weaponMeshes[gun];
      const hasFp = !!(src && src.userData && src.userData.fpStock);
      const fpParentOk = hasFp && src.userData.fpStock.parent === src;
      // Hip sample
      T.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 400));
      let hipStock = null;
      if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') hipStock = o; });
      const hipVis = hipStock ? !!hipStock.visible : null;
      const hipAds = vm.info.ads || 0;
      // ADS
      T.setZoomHeldDbg(true);
      const t0 = Date.now();
      while (Date.now() - t0 < 9000) { if ((T.fpDbg?.().ads || 0) > 0.99) break; await new Promise((r) => setTimeout(r, 40)); }
      await new Promise((r) => setTimeout(r, 500));
      let viewStock = null;
      if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') viewStock = o; });
      const ads = vm.info.ads || 0;
      const stockVis = viewStock ? !!viewStock.visible : null;
      const gunStockRef = !!(vm.gun && vm.gun.stock);
      // NDC bounds of every mesh under fp-stock (even if parent invisible — project anyway)
      const box = { minX: 2, maxX: -2, minY: 2, maxY: -2, n: 0, onScreen: 0 };
      const sampleMesh = (mesh) => {
        mesh.updateWorldMatrix(true, false);
        const g = mesh.geometry; if (!g) return;
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox; if (!bb) return;
        const corners = [
          [bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.min.y, bb.min.z],
          [bb.min.x, bb.max.y, bb.min.z], [bb.max.x, bb.max.y, bb.min.z],
          [bb.min.x, bb.min.y, bb.max.z], [bb.max.x, bb.min.y, bb.max.z],
          [bb.min.x, bb.max.y, bb.max.z], [bb.max.x, bb.max.y, bb.max.z],
        ];
        for (const c of corners) {
          const w = new THREE.Vector3(c[0], c[1], c[2]).applyMatrix4(mesh.matrixWorld);
          const n = vm.ndc(w);
          if (!n || n.d <= 0) continue;
          box.n++;
          if (Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1) {
            box.onScreen++;
            box.minX = Math.min(box.minX, n.x); box.maxX = Math.max(box.maxX, n.x);
            box.minY = Math.min(box.minY, n.y); box.maxY = Math.max(box.maxY, n.y);
          }
        }
      };
      if (viewStock) viewStock.traverse((o) => { if (o.isMesh) sampleMesh(o); });
      // Leftover rear meshes (local z < -0.18) NOT under fp-stock
      const leftover = [];
      if (vm.gun && vm.gun.root) {
        vm.gun.root.updateWorldMatrix(true, true);
        vm.gun.root.traverse((o) => {
          if (!o.isMesh) return;
          let under = false, p = o;
          while (p) { if (p.name === 'fp-stock') { under = true; break; } p = p.parent; }
          if (under) return;
          // gun-local z via inverse of root
          const inv = vm.gun.root.matrixWorld.clone().invert();
          const wp = new THREE.Vector3(); o.getWorldPosition(wp);
          const lp = wp.clone().applyMatrix4(inv);
          if (lp.z > -0.18) return;
          const n = vm.ndc(wp);
          if (n && n.d > 0 && Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1) {
            leftover.push({ name: o.name || '(mesh)', z: +lp.z.toFixed(3), nx: +n.x.toFixed(3), ny: +n.y.toFixed(3) });
          }
        });
      }
      return {
        gun, ok: true, hasFp, fpParentOk, gunStockRef, ads: +ads.toFixed(3),
        hipVis, hipAds: +hipAds.toFixed(3), stockVis,
        stockOnScreen: box.onScreen, stockCorners: box.n,
        stockBox: box.onScreen ? { minX: +box.minX.toFixed(3), maxX: +box.maxX.toFixed(3), minY: +box.minY.toFixed(3), maxY: +box.maxY.toFixed(3) } : null,
        leftoverN: leftover.length, leftover: leftover.slice(0, 12),
        showing: !!(vm.showing && vm.showing(gun)),
      };
    })()`, 120000);
    console.log(JSON.stringify(row));
    rows.push(row);
    if (row.ok) {
      const shot = path.join(OUT, 'ads-' + gun + '-1280.png');
      await page.screenshot(shot);
      console.log('shot', shot);
    }
    await page.evaluate(`(() => { TT.setZoomHeldDbg(false); })()`);
    await wait(300);
  }
  fs.writeFileSync(path.join(HERE, 'probe-before.json'), JSON.stringify({ boot, rows }, null, 2));
  console.log('WROTE probe-before.json');
} finally {
  await browser.close();
  server.close();
}
