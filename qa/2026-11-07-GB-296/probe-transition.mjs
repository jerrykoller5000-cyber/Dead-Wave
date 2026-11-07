// qa/2026-11-07-GB-296/probe-transition.mjs — stock visibility across ADS blend.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'transition');
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const GUNS = ['m4', 'ak', 'shotgun', 'aa12', 'sniper'];
const LEVELS = [0, 0.1, 0.2, 0.3, 0.34, 0.35, 0.5, 1.0];

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB296t'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42); T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
  })()`, 600000);

  const rows = [];
  for (const gun of GUNS) {
    await page.evaluate(`(async () => {
      const T = TT; const gun = ${JSON.stringify(gun)};
      for (let i = 0; i < 25 && T.getCurrentWeapon() !== gun; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(gun)); await new Promise((r) => setTimeout(r, 120));
      }
      await new Promise((r) => setTimeout(r, 800));
      T.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 400));
    })()`, 60000);
    const levels = [];
    for (const want of LEVELS) {
      const row = await page.evaluate(`(async () => {
        const T = TT; const THREE = T.THREE; const want = ${want};
        // Force ads level via holding zoom and waiting, or by poking if possible.
        // Prefer natural: hold zoom and sample while rising; for exact levels, set via dbg if present.
        if (want <= 0) { T.setZoomHeldDbg(false); await new Promise((r) => setTimeout(r, 500)); }
        else {
          T.setZoomHeldDbg(true);
          const t0 = Date.now();
          while (Date.now() - t0 < 8000) {
            const a = T.fpDbg?.().ads || 0;
            if (want >= 0.99) { if (a > 0.99) break; }
            else if (Math.abs(a - want) < 0.02 || (want < 0.5 && a >= want && a < want + 0.05)) break;
            // If overshot past want on the way up, release briefly won't help; just sample current once near.
            if (a > want + 0.08 && want < 0.9) break;
            await new Promise((r) => setTimeout(r, 20));
          }
        }
        await new Promise((r) => setTimeout(r, 80));
        const vm = T.viewmodelDbg();
        let stock = null;
        if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') stock = o; });
        const ads = vm.info.ads || 0;
        // Project stock mesh corners if present
        let onScreen = 0, corners = 0;
        const sample = (mesh) => {
          mesh.updateWorldMatrix(true, false);
          const g = mesh.geometry; if (!g) return;
          if (!g.boundingBox) g.computeBoundingBox();
          const bb = g.boundingBox; if (!bb) return;
          for (const c of [
            [bb.min.x,bb.min.y,bb.min.z],[bb.max.x,bb.min.y,bb.min.z],[bb.min.x,bb.max.y,bb.min.z],[bb.max.x,bb.max.y,bb.min.z],
            [bb.min.x,bb.min.y,bb.max.z],[bb.max.x,bb.min.y,bb.max.z],[bb.min.x,bb.max.y,bb.max.z],[bb.max.x,bb.max.y,bb.max.z],
          ]) {
            const w = new THREE.Vector3(c[0],c[1],c[2]).applyMatrix4(mesh.matrixWorld);
            const n = vm.ndc(w); if (!n || n.d <= 0) continue; corners++;
            if (Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1) onScreen++;
          }
        };
        // Only count if visible (what the eye sees)
        if (stock && stock.visible) stock.traverse((o) => { if (o.isMesh) sample(o); });
        return { want, ads: +ads.toFixed(3), stockVis: stock ? !!stock.visible : null, onScreen, corners };
      })()`, 60000);
      levels.push(row);
      if (row.stockVis && row.onScreen > 0) {
        const shot = path.join(OUT, gun + '-ads' + String(want).replace('.', 'p') + '.png');
        await page.screenshot(shot);
        console.log('SHOT', shot, row);
      }
    }
    await page.evaluate(`(() => TT.setZoomHeldDbg(false))()`);
    rows.push({ gun, levels });
    console.log(gun, JSON.stringify(levels));
  }
  fs.writeFileSync(path.join(HERE, 'probe-transition.json'), JSON.stringify(rows, null, 2));
  console.log('WROTE probe-transition.json');
} finally {
  await browser.close();
  server.close();
}
