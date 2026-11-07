// qa/2026-11-07-GB-292-redo/tune.mjs - GB-292 redo: live-tune the chainsaw's FP hip/hand bases (info.tune), map to screen, shots.
// node qa/2026-11-07-GB-292-redo/tune.mjs <configs.json>   (through the game-test slot)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const cfgFile = process.argv[2];
const CFG = JSON.parse(fs.readFileSync(path.resolve(cfgFile), 'utf8'));
const OUT = path.join(HERE, CFG.out || 'shots');
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const results = [];
try {
  const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB292r'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
    }
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
  })()`, 600000);
  for (const c of CFG.configs) {
    const wait = c.wait || 900;
    const m = await page.evaluate(`(async () => {
      const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
      if (!v) return JSON.stringify({ err: 'no vm' });
      const tune = ${JSON.stringify(c.tune || null)};
      if (tune) v.info.tune.chainsaw = tune; else delete v.info.tune.chainsaw;
      { const m = await import('/game/viewmodel-poses.js'); const P = m.VM_POSES.chainsaw;
        if (P.ads._orig == null) Object.defineProperty(P.ads, '_orig', { value: P.ads.rear, enumerable: false });
        P.ads.rear = ${c.adsRear != null ? c.adsRear : 'P.ads._orig'}; }
      v.retune();
      T.setZoomHeldDbg?.(${c.ads ? 'true' : 'false'});
      await new Promise((r) => setTimeout(r, ${wait}));
      const G = v.frame, W = ${W}, H = ${H};
      const scr = (p) => { const n = v.ndc(p, { x: 0, y: 0, d: 0 }); return [Math.round((n.x * 0.5 + 0.5) * W), Math.round((1 - (n.y * 0.5 + 0.5)) * H), +n.d.toFixed(3)]; };
      const toView = (a) => new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);
      const out = { gunS: G.s };
      const pts = { grip: [0, -0.014, -0.46], trigger: [0, -0.03, -0.36], hoop: [-0.01, 0.246, -0.035], bodyFront: [0, 0.05, 0.11] };
      for (const [k, p] of Object.entries(pts)) out[k] = scr(toView(p));
      const wr = v.wrists, fy = new THREE.Vector3();
      const fol = (tune && tune.elbowFollow) || [0.28, 0.04];
      const sq = new THREE.Quaternion(); v.space.updateWorldMatrix(true, true); v.space.getWorldQuaternion(sq); sq.invert();
      for (const s of ['r', 'l']) {
        const Wp = wr[s].p; out['wrist' + s.toUpperCase()] = scr(Wp);
        { const a = v.arms[s], aq = new THREE.Quaternion(); a.root.getWorldQuaternion(aq); aq.premultiply(sq);
          const d = new THREE.Vector3(0, 1, 0).applyQuaternion(aq); out['armDir' + s.toUpperCase()] = [+d.x.toFixed(2), +d.y.toFixed(2), +d.z.toFixed(2)];
          out['forearm' + s.toUpperCase()] = scr(d.multiplyScalar(0.28).add(Wp)); }
        fy.set(0, 1, 0).applyQuaternion(wr[s].q);
        const e = new THREE.Vector3(Wp.x + fy.x * fol[0], Wp.y + fy.y * fol[0] - fol[1], Wp.z + fy.z * fol[0]);
        out['elbow' + s.toUpperCase()] = scr(e);
        out['elbowView' + s.toUpperCase()] = [+e.x.toFixed(3), +e.y.toFixed(3), +e.z.toFixed(3)];
      }
      // the gun's screen box: every mesh's bounding-box corners
      const space = v.space; space.updateWorldMatrix(true, true);
      const inv = space.matrixWorld.clone().invert();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const g = v.gun; const rootObj = g && (g.root || g.src);
      if (rootObj) rootObj.traverse((o) => {
        if (!o.isMesh || !o.visible || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox; if (!b || !isFinite(b.min.x)) return;
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          if (p.z > -0.02) continue;
          const s = scr(p); x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]);
        }
      });
      const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(W, x1), cy1 = Math.min(H, y1);
      out.gunBox = [x0, y0, x1, y1]; out.gunScreenFrac = +(((cx1 - cx0) * (cy1 - cy0)) / (W * H)).toFixed(3);
      out.ads = +(T.fpDbg?.().ads || 0).toFixed(2);
      return JSON.stringify(out);
    })()`, 120000);
    const r = { name: c.name, tune: c.tune || null, ads: !!c.ads, map: JSON.parse(m) };
    results.push(r); console.log(JSON.stringify({ name: r.name, ...r.map }));
    if (c.shot !== false) await page.screenshot(path.join(OUT, c.name + '.png'));
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'map.json'), JSON.stringify(results, null, 2));
  await browser.close?.(); server.close?.();
}
process.exit(0);
