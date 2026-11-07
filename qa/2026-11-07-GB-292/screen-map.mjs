// qa/2026-11-07-GB-292/screen-map.mjs — map grip/support/hands to screen NDC
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const page = await browser.newPage({ width: W, height: H });
await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
await page.evaluate(lib);
await page.evaluate(`(async () => {
  const T = TT; await startMatch(T, 'GB292s'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

const map = await page.evaluate(`(() => {
  const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
  if (!v) return JSON.stringify({err:'no vm'});
  const G = v.frame; // gun frame in view/his space
  const toView = (gx, gy, gz) => {
    const p = new THREE.Vector3(gx, gy, gz).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);
    return p;
  };
  const toScreen = (vx) => {
    const n = v.ndc(vx, { x:0, y:0, d:0 });
    // ndc is approx clip; convert to pixel assuming n.x,n.y in roughly -1..1 as eye sees
    return { ndc:[+n.x.toFixed(3), +n.y.toFixed(3), +n.d.toFixed(3)],
      px: [Math.round((n.x * 0.5 + 0.5) * ${W}), Math.round((1 - (n.y * 0.5 + 0.5)) * ${H})] };
  };
  const pts = {
    grip: [0, -0.014, -0.46],
    support: [-0.01, 0.246, -0.035],
    rearTop: [0, 0.05, -0.46],
    hoopLeft: [-0.08, 0.246, -0.035],
    bodyTop: [0, 0.16, -0.05],
    pullCord: [0.19, 0.12, -0.22]
  };
  const out = {};
  for (const [k, p] of Object.entries(pts)) {
    const vv = toView(p[0], p[1], p[2]);
    out[k] = { gun: p, view: [+vv.x.toFixed(3), +vv.y.toFixed(3), +vv.z.toFixed(3)], ...toScreen(vv) };
  }
  // hand wrists in view space
  const wr = v.wrists;
  if (wr) {
    out.wristR = { view: [+wr.r.p.x.toFixed(3), +wr.r.p.y.toFixed(3), +wr.r.p.z.toFixed(3)], ...toScreen(wr.r.p) };
    out.wristL = { view: [+wr.l.p.x.toFixed(3), +wr.l.p.y.toFixed(3), +wr.l.p.z.toFixed(3)], ...toScreen(wr.l.p) };
  }
  // also sample arm root positions
  if (v.arms) {
    for (const side of ['r','l']) {
      const a = v.arms[side];
      a.root.updateWorldMatrix(true, false);
      // get wrist world → need view space. Use space inverse.
      const space = v.space;
      space.updateWorldMatrix(true, false);
      const inv = space.matrixWorld.clone().invert();
      const wp = a.wrist.getWorldPosition(new THREE.Vector3());
      const lv = wp.applyMatrix4(inv);
      // undo mirror for ndc helper? ndc expects his-space (pre-mirror?). Comment: v in his space (viewPoint's): mirrored as the eye sees it
      out['armWrist_'+side] = { view:[+lv.x.toFixed(3),+lv.y.toFixed(3),+lv.z.toFixed(3)], ...toScreen(lv) };
    }
  }
  out.gunFrame = { p:[+G.p.x.toFixed(3),+G.p.y.toFixed(3),+G.p.z.toFixed(3)], s:G.s };
  return JSON.stringify(out, null, 2);
})()`);
fs.writeFileSync(path.join(OUT, 'screen-map.json'), map);
console.log(map);
await page.screenshot(path.join(OUT, 'before', 'fp-hip-mapref.png'));
await browser.close?.(); server.close?.();
process.exit(0);
