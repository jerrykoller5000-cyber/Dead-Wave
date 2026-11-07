// qa/2026-11-07-GB-292/after.mjs — after FP shots + contact probe
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const AFTER = path.join(OUT, 'after');
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
  const T = TT; await startMatch(T, 'GB292a'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

const probe = await page.evaluate(`(() => {
  const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
  if (!v) return JSON.stringify({ err: 'no vm' });
  const authored = { grip: [0, -0.014, -0.43], support: [-0.01, 0.250, -0.035] };
  const dist = (a, b) => (a && b) ? +Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]).toFixed(4) : null;
  const socks = v.sockets, arms = v.arms;
  const contactOf = (side) => {
    const S = socks[side], arm = arms[side], L = arm.layout;
    const c = new THREE.Vector3(L.grip[0]-L.wrist[0], L.grip[1]-L.wrist[1], L.grip[2]-L.wrist[2])
      .multiplyScalar(S.s).applyQuaternion(S.q).add(S.p);
    return { p:[+S.p.x.toFixed(4),+S.p.y.toFixed(4),+S.p.z.toFixed(4)], contact:[+c.x.toFixed(4),+c.y.toFixed(4),+c.z.toFixed(4)] };
  };
  const r = contactOf('r'), l = contactOf('l');
  return JSON.stringify({
    r, l,
    rToGrip: dist(r.contact, authored.grip), rToSupport: dist(r.contact, authored.support),
    lToGrip: dist(l.contact, authored.grip), lToSupport: dist(l.contact, authored.support),
    authored
  }, null, 2);
})()`);
fs.writeFileSync(path.join(OUT, 'probe-after.json'), probe);
console.log(probe);

await page.screenshot(path.join(AFTER, 'fp-hip.png'));
console.log('fp-hip');
await page.evaluate(`(() => { TT.setOtsAimDbg?.(null, -0.2); return 1; })()`);
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot(path.join(AFTER, 'fp-hip-tilt.png'));
console.log('fp-hip-tilt');
// third person quick look
await page.evaluate(`(() => { TT.setViewFirstDbg(false); return 1; })()`);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot(path.join(AFTER, 'tp-hold.png'));
console.log('tp-hold');
await browser.close?.(); server.close?.();
process.exit(0);
