// qa/2026-11-07-GB-292/probe.mjs — live FP chainsaw hand/socket probe + before hip shot
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
if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT: ' + (page.errors[0] || ''));
await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
await page.evaluate(lib);
await page.evaluate(`(async () => {
  const T = TT; await startMatch(T, 'GB292'); T.clearZombies && T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
  if (T.setWorldTime) T.setWorldTime(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500)); return 1;
})()`, 600000);

const probe = await page.evaluate(`(() => {
  const T = TT;
  const THREE = T.THREE;
  const v = T.viewmodelDbg && T.viewmodelDbg();
  if (!v) return JSON.stringify({ err: 'no viewmodel' });
  const info = v.info || {};
  const authored = { grip: [0, -0.014, -0.46], support: [-0.01, 0.246, -0.035] };
  const dist = (a, b) => (a && b) ? +Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]).toFixed(4) : null;
  const out = {
    weapon: T.getCurrentWeapon(), active: !!info.active, key: info.key,
    raise: info.raise, ads: info.ads, handPlace: info.handPlace, flip: info.flip, wrist: info.wrist,
    authored
  };
  const socks = v.sockets, arms = v.arms;
  out.hasSocks = !!socks; out.hasArms = !!arms; out.sockKey = socks && socks.key;
  if (socks && arms) {
    const contactOf = (side) => {
      const S = socks[side], arm = arms[side];
      if (!S || !arm || !arm.layout) return null;
      const L = arm.layout;
      const c = new THREE.Vector3(L.grip[0] - L.wrist[0], L.grip[1] - L.wrist[1], L.grip[2] - L.wrist[2])
        .multiplyScalar(S.s).applyQuaternion(S.q).add(S.p);
      return {
        p: [+S.p.x.toFixed(4), +S.p.y.toFixed(4), +S.p.z.toFixed(4)],
        s: +S.s.toFixed(4),
        contact: [+c.x.toFixed(4), +c.y.toFixed(4), +c.z.toFixed(4)]
      };
    };
    out.sockR = contactOf('r');
    out.sockL = contactOf('l');
    if (out.sockR) {
      out.rContactToGrip = dist(out.sockR.contact, authored.grip);
      out.rContactToSupport = dist(out.sockR.contact, authored.support);
    }
    if (out.sockL) {
      out.lContactToGrip = dist(out.sockL.contact, authored.grip);
      out.lContactToSupport = dist(out.sockL.contact, authored.support);
    }
  }
  const ud = T.marine && T.marine.userData;
  const bodyGun = T.weaponMeshes && T.weaponMeshes.chainsaw;
  if (ud && bodyGun) {
    bodyGun.updateWorldMatrix(true, false);
    const inv = bodyGun.matrixWorld.clone().invert();
    const body = (elbow, name) => {
      const wr = elbow && elbow.userData && elbow.userData.wrist;
      if (!wr) return null;
      wr.updateWorldMatrix(true, false);
      const p = wr.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      return { name, gunLocal: [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)] };
    };
    out.bodyWR = body(ud.elbowRG, 'elbowRG');
    out.bodyWL = body(ud.elbowLG, 'elbowLG');
    if (out.bodyWR) {
      out.bodyRToGrip = dist(out.bodyWR.gunLocal, authored.grip);
      out.bodyRToSupport = dist(out.bodyWR.gunLocal, authored.support);
    }
    if (out.bodyWL) {
      out.bodyLToGrip = dist(out.bodyWL.gunLocal, authored.grip);
      out.bodyLToSupport = dist(out.bodyWL.gunLocal, authored.support);
    }
  }
  return JSON.stringify(out, null, 2);
})()`);

fs.writeFileSync(path.join(OUT, 'probe-before.json'), probe);
console.log(probe);
await page.screenshot(path.join(BEFORE, 'fp-hip.png'));
console.log('shot', path.join(BEFORE, 'fp-hip.png'));
await page.evaluate(`(() => { const T = TT; if (T.setOtsAimDbg) T.setOtsAimDbg(null, -0.15); return 1; })()`);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot(path.join(BEFORE, 'fp-hip-tilt.png'));
console.log('shot', path.join(BEFORE, 'fp-hip-tilt.png'));
await browser.close?.(); server.close?.();
process.exit(0);
