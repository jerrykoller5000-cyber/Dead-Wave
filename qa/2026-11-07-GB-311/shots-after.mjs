// qa/2026-11-07-GB-311/shots-after.mjs - AFTER FP hip+ADS for shotgun (CL-312 / GB-311)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const AFTER = path.join(HERE, 'after');
fs.mkdirSync(AFTER, { recursive: true });
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
  const T = TT; await startMatch(T, 'GB311a'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'shotgun'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

const probe = await page.evaluate(`(() => {
  const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
  if (!v) return JSON.stringify({ err: 'no vm' });
  const gun = T.weaponMeshes && T.weaponMeshes.shotgun;
  const pump = gun && gun.userData && gun.userData.pump;
  let pumpLocal = null, forend = null;
  if (pump) {
    gun.updateMatrixWorld(true);
    pumpLocal = [+pump.position.x.toFixed(4), +pump.position.y.toFixed(4), +pump.position.z.toFixed(4)];
    const box = new THREE.Box3().setFromObject(pump);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min.clone(), max = box.max.clone();
    gun.worldToLocal(min); gun.worldToLocal(max);
    forend = {
      size: [+size.x.toFixed(4), +size.y.toFixed(4), +size.z.toFixed(4)],
      minY: +min.y.toFixed(4), maxY: +max.y.toFixed(4),
      bottomY: +Math.min(min.y, max.y).toFixed(4)
    };
  }
  const socks = v.sockets, arms = v.arms;
  const contactOf = (side) => {
    if (!socks || !arms || !socks[side] || !arms[side] || !arms[side].layout) return null;
    const S = socks[side], L = arms[side].layout;
    const c = new THREE.Vector3(L.grip[0]-L.wrist[0], L.grip[1]-L.wrist[1], L.grip[2]-L.wrist[2])
      .multiplyScalar(S.s).applyQuaternion(S.q).add(S.p);
    return { p:[+S.p.x.toFixed(4),+S.p.y.toFixed(4),+S.p.z.toFixed(4)], contact:[+c.x.toFixed(4),+c.y.toFixed(4),+c.z.toFixed(4)] };
  };
  return JSON.stringify({
    weapon: T.getCurrentWeapon(),
    handPlace: v.info && v.info.handPlace,
    r: contactOf('r'), l: contactOf('l'),
    pumpLocal, forend
  }, null, 2);
})()`);
fs.writeFileSync(path.join(HERE, 'probe-after.json'), probe);
console.log(probe);

await page.screenshot(path.join(AFTER, 'fp-hip.png'));
console.log('after fp-hip');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(true); return 1; })()`);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot(path.join(AFTER, 'fp-ads.png'));
console.log('after fp-ads');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(false); return 1; })()`);

await browser.close?.(); server.close?.();
process.exit(0);
