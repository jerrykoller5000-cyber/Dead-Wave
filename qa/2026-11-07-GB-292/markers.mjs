// qa/2026-11-07-GB-292/markers.mjs — debug spheres on grip/support + hand contacts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const BEFORE = path.join(OUT, 'before');
fs.mkdirSync(BEFORE, { recursive: true });
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
  const T = TT; await startMatch(T, 'GB292m'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

await page.evaluate(`(() => {
  const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
  if (!v || !v.gun) return 'no gun';
  const root = v.gun.root;
  const mk = (color, name) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 10),
      new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false })
    );
    m.name = name; m.renderOrder = 999; root.add(m); return m;
  };
  const g = mk(0x00ff00, 'dbg-grip'); g.position.set(0, -0.014, -0.46);          // green = rear grip authored
  const s = mk(0x0088ff, 'dbg-support'); s.position.set(-0.01, 0.246, -0.035);   // blue = front hoop authored
  // red = R contact, yellow = L contact
  const socks = v.sockets, arms = v.arms;
  const place = (side, color, name) => {
    const S = socks[side], arm = arms[side], L = arm.layout;
    const c = new THREE.Vector3(L.grip[0]-L.wrist[0], L.grip[1]-L.wrist[1], L.grip[2]-L.wrist[2])
      .multiplyScalar(S.s).applyQuaternion(S.q).add(S.p);
    const m = mk(color, name); m.position.copy(c); return [c.x, c.y, c.z];
  };
  const r = place('r', 0xff2200, 'dbg-R');
  const l = place('l', 0xffff00, 'dbg-L');
  return JSON.stringify({ r, l });
})()`);

await new Promise((r) => setTimeout(r, 800));
await page.screenshot(path.join(BEFORE, 'fp-hip-markers.png'));
console.log('markers shot');

// Also try SWAPPED tune live and shoot
const swap = await page.evaluate(`(() => {
  const T = TT, v = T.viewmodelDbg();
  v.info.tune.chainsaw = {
    r: { p: [-0.01, 0.246, -0.035], basis: { x: [-1, 0, 0], y: [0, -0.85, -0.5] } },
    l: { p: [0, -0.014, -0.46] },
    poseL: null
  };
  // move supportPose off by clearing — actually supportPose is only from VM_SOCKETS; leave it
  v.retune();
  return 'swapped';
})()`);
console.log(swap);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot(path.join(BEFORE, 'fp-hip-SWAPPED.png'));
console.log('swapped shot');

// Restore and try better right gripBasis (vertical throttle) + keep left motorcycle
await page.evaluate(`(() => {
  const T = TT, v = T.viewmodelDbg();
  v.info.tune.chainsaw = {
    r: { p: [0, -0.014, -0.46], basis: { x: [0, -1, 0], y: [0.3, 0, -0.95] } },  // channel down the throttle, elbow back
    l: { p: [-0.01, 0.246, -0.035], basis: { x: [-1, 0, 0], y: [0, -0.85, -0.5] } }
  };
  v.retune();
  return 'basis-fix';
})()`);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot(path.join(BEFORE, 'fp-hip-basisA.png'));
console.log('basisA shot');

await browser.close?.(); server.close?.();
process.exit(0);
