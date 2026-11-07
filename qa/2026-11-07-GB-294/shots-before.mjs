// qa/2026-11-07-GB-294/shots-before.mjs - BEFORE Marine Inspector / FP shots for Wasp J3+J11 (no edits).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BEFORE = path.join(HERE, 'before');
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
  const T = TT; await startMatch(T, 'GB294b'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'uzi'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

const probe = await page.evaluate(`(() => {
  const T = TT, THREE = T.THREE, v = T.viewmodelDbg();
  if (!v) return JSON.stringify({ err: 'no vm' });
  const authored = { grip: [0, -0.088, -0.027], supportOld: [-0.055, -0.035, 0.055], supportFore: [0, -0.03, 0.18] };
  const dist = (a, b) => (a && b) ? +Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]).toFixed(4) : null;
  const socks = v.sockets, arms = v.arms;
  const contactOf = (side) => {
    if (!socks || !arms || !socks[side] || !arms[side] || !arms[side].layout) return null;
    const S = socks[side], L = arms[side].layout;
    const c = new THREE.Vector3(L.grip[0]-L.wrist[0], L.grip[1]-L.wrist[1], L.grip[2]-L.wrist[2])
      .multiplyScalar(S.s).applyQuaternion(S.q).add(S.p);
    return { p:[+S.p.x.toFixed(4),+S.p.y.toFixed(4),+S.p.z.toFixed(4)], contact:[+c.x.toFixed(4),+c.y.toFixed(4),+c.z.toFixed(4)] };
  };
  const r = contactOf('r'), l = contactOf('l');
  const aki = v.info && v.info.akimbo;
  return JSON.stringify({
    weapon: T.getCurrentWeapon(), aki: !!T.akimboOn?.(), vmAki: !!aki,
    handPlace: v.info && v.info.handPlace,
    r, l,
    lToOld: dist(l && l.contact, authored.supportOld),
    lToFore: dist(l && l.contact, authored.supportFore),
    rToGrip: dist(r && r.contact, authored.grip),
    authored,
    akiPose: aki || null
  }, null, 2);
})()`);
fs.writeFileSync(path.join(HERE, 'probe-before.json'), probe);
console.log(probe);

await page.screenshot(path.join(BEFORE, 'fp-hip.png'));
console.log('before fp-hip');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(true); return 1; })()`);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot(path.join(BEFORE, 'fp-ads.png'));
console.log('before fp-ads');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(false); return 1; })()`);
await new Promise((r) => setTimeout(r, 800));

// akimbo
const akiOn = await page.evaluate(`(async () => {
  const T = TT;
  if (!T.akimboOn?.()) { T.toggleDualWieldDbg?.(); await new Promise((r) => setTimeout(r, 1500)); }
  return { aki: !!T.akimboOn?.(), w: T.getCurrentWeapon() };
})()`, 60000);
console.log('akimbo', JSON.stringify(akiOn));
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot(path.join(BEFORE, 'fp-akimbo.png'));
console.log('before fp-akimbo');

await browser.close?.(); server.close?.();
process.exit(0);
