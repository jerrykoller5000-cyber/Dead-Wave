// CG-4 (Claude 7): the pistol pair's left barrel, before and after, the same camera and the same frame.
//   node crew/crew.mjs slot run claude7 CG-4 --checks "CG-4 capture" -- node review/CG-4/capture.mjs <before|after> [--fill]
// Four lights (noon, overcast, dusk, night) outdoors in a match. In each:
//  - eye: first person with the pair, the left gun's own shot stepped at 60 fps to the frame its slide is furthest back;
//    the full frame and a 3x crop on the left gun;
//  - world: third person, the pair's reload stepped to the frame the left slide is furthest back; a close camera beside
//    the left pistol (2 views: its right side, and from above-front).
// Writes review/CG-4/<phase>/ with frames.json (the slide travel and the barrel's place at each picture).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = process.argv.slice(2), phase = argv.find((a) => !a.startsWith('--')) || 'before', fill = argv.includes('--fill');
const out = path.join(root, 'review', 'CG-4', phase);
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: [] })   // the cloud: SwiftShader through WebGL, headless (as CG-1's --soft);
const W = 1280, H = 720;
const shot = async (page, name, clip) => {
  await page.evaluate("for (const el of document.querySelectorAll('body *')) if (el.tagName !== 'CANVAS' && !el.querySelector('canvas')) el.style.visibility = 'hidden';");
  const s = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(s.data, 'base64'));
};
const ev = (page, body, t = 240000) => page.evaluate(`(async () => { const T = window.TT, wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${body} })()`, t);
const LIGHTS = [{ name: 'noon', time: 0.40, rain: false }, { name: 'overcast', time: 0.40, rain: true }, { name: 'dusk', time: 0.68, rain: false }, { name: 'night', time: 0.0, rain: false }];
const report = { phase, at: new Date().toISOString(), shots: {}, errors: [] };
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw Error('Game not ready');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(root, 'tools', 'tests', 'lib.js'), 'utf8'));
  report.setup = await ev(page, `await startMatch(T, 'CG4'); T.clearZombies && T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); await wait(150); }
    T.setDualOwnedDbg('pistol', true);
    const A = T.armoryDbg.ui().armory;
    if (!A.has('pistol:second')) A.buy({ id: 'pistol:second', kind: 'pistol', loaded: null }, { store: true });
    A.take('pistol:second', 'secondary', 0);
    T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false);
    const VM = () => T.viewmodelDbg();
    for (let i = 0; i < 3 && !(VM() && VM().info.akimbo); i++) { T.toggleDualWieldDbg(); const t0 = Date.now(); while (Date.now() - t0 < 3000 && !(VM() && VM().info.akimbo)) await wait(50); }
    { const t0 = Date.now(); while (Date.now() - t0 < 20000 && !(VM() && VM().info.active && VM().info.akimbo && VM().info.raise > 0.99)) await wait(100); }
    ${fill ? `window.__cgFill = new T.THREE.DirectionalLight(0xffffff, 3.2); T.scene.add(window.__cgFill); T.scene.add(window.__cgFill.target);
    window.__cgLight = (c) => { const d = new T.THREE.Vector3(); c.getWorldDirection(d); window.__cgFill.position.copy(c.position).addScaledVector(d, -2).add(new T.THREE.Vector3(0, 1.2, 0)); window.__cgFill.target.position.copy(c.position).addScaledVector(d, 2); window.__cgFill.target.updateMatrixWorld(); };` : 'window.__cgLight = () => {};'}
    window.__cgS2 = () => { const g = T.viewmodelDbg().gun2; return g && g.work ? Math.max(0, g.workBase.z - g.work.position.z) : 0; };
    window.__cgB2 = () => { const g = T.viewmodelDbg().gun2, b = g && g.barrel; return b ? [+b.position.y.toFixed(4), +b.position.z.toFixed(4), +b.rotation.x.toFixed(3)] : null; };
    const v = VM(); return { akimbo: !!(v && v.info.akimbo), gun2: !!(v && v.gun2), barrel2: !!(v && v.gun2 && v.gun2.barrel) };`, 600000);
  console.log('setup', JSON.stringify(report.setup));
  // the eye: the first frame the left slide is past the unlock (stepped at a fixed 60 fps it repeats)
  const fireLeft = (n) => ev(page, `T.flightHold(true); for (let k = 0; k < 40; k++) T.stepFrame(1 / 60);
    const g = T.viewmodelDbg().gun2; g.src.userData.shots = (g.src.userData.shots | 0) + 1;
    const s = []; for (let k = 0; k < ${n}; k++) { T.stepFrame(1 / 60); s.push(__cgS2()); if (s[k] >= 0.008) break; }
    __cgLight(T.camera); T.stepFrame(0);
    return { s, b: __cgB2(), ndc: (() => { const v = T.viewmodelDbg(), p = v.viewPoint(new T.THREE.Vector3(0, 0.03, 0.04), undefined, 2), q = v.ndc(p); return [q.x, q.y]; })() };`);
  const fMax = 30;   // fireLeft stops at the first frame past the unlock
  for (const L of LIGHTS) {
    await ev(page, `T.flightHold(false); T.weather.raining = ${L.rain}; T.weather.rainTimeLeft = ${L.rain ? 100 : 0}; T.weather.intensity = ${L.rain ? 1 : 0}; T.setWorldTime(${L.time}); T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false); T.setOtsAimDbg(0.0, -0.12);
      { const VM = () => T.viewmodelDbg(), t0 = Date.now(); while (Date.now() - t0 < 20000 && !(VM() && VM().info.active && VM().info.akimbo && VM().info.raise > 0.99)) await wait(100); }
      await wait(800); T.setOtsAimDbg(0.0, -0.12); await wait(300); return 1;`);
    const r = await fireLeft(fMax);
    const cx = Math.min((r.ndc[0] + 1) / 2 * W, (1 - r.ndc[0]) / 2 * W),   // the left gun (the view's mirror either way)
      cy = (1 - r.ndc[1]) / 2 * H, cw = 1280 / 3.2, ch = 720 / 3.2;
    const clip = { x: Math.max(0, Math.min(W - cw, cx - cw / 2)), y: Math.max(0, Math.min(H - ch, cy - ch / 2)), width: cw, height: ch, scale: 3.2 };
    await shot(page, `${L.name}-eye`);
    await shot(page, `${L.name}-eye-crop`, clip);
    report.shots[`${L.name}-eye`] = { travel: r.s[r.s.length - 1], barrel2: r.b, clip };
    // the world: the pair's reload to the frame the left slide is furthest back, a close camera beside the left gun
    const res = await ev(page, `T.flightHold(false); T.setViewFirstDbg(false); await wait(800); T.flightHold(true);
      const off = T.offhandMeshes.pistol, ud = off.userData, b = ud.barrelAssembly;
      const S = () => Math.max(0, ud.baseSlidePos.z - ud.slide.position.z);
      T.setAmmoDbg('pistol', 0); T.startReload();
      let f = 0; for (; f < 600 && (f < 5 || T.isReloading()); f++) { T.stepFrame(1 / 60); if (S() >= 0.008) break; }
      return { frame: f + 1, s: S(), b: [+b.position.y.toFixed(4), +b.position.z.toFixed(4), +b.rotation.x.toFixed(3)] };`);
    for (const [vn, side, up, fwd, dist] of [['left', -1, 0.3, 0.1, 0.45], ['right', 1, 0.3, 0.1, 0.45]]) {
      await ev(page, `const THREE = T.THREE, off = T.offhandMeshes.pistol; off.updateWorldMatrix(true, true);
        const c = new THREE.PerspectiveCamera(30, ${W} / ${H}, 0.01, 200), ctr = off.userData.barrelAssembly.getWorldPosition(new THREE.Vector3());
        const q = new THREE.Quaternion(); off.getWorldQuaternion(q);
        const x = new THREE.Vector3(1, 0, 0).applyQuaternion(q), y = new THREE.Vector3(0, 1, 0).applyQuaternion(q), z = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        c.position.copy(ctr).addScaledVector(x, ${side} * ${dist}).addScaledVector(y, ${up} * ${dist}).addScaledVector(z, ${fwd} * ${dist});
        c.up.copy(y); c.lookAt(ctr); c.updateMatrixWorld(); __cgLight(c);
        if (T.renderer.renderAsync) await T.renderer.renderAsync(T.scene, c); else T.renderer.render(T.scene, c);
        return 1;`);
      await shot(page, `${L.name}-world-${vn}`);
    }
    report.shots[`${L.name}-world`] = res;
    console.log(L.name, JSON.stringify(report.shots[`${L.name}-eye`].barrel2), JSON.stringify(res));
  }
  await ev(page, `T.flightHold(false); return 1;`);
  report.errors = page.errors.slice();
} catch (e) { report.failure = String(e?.stack || e); console.error(report.failure); process.exitCode = 1; }
finally {
  fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(report, null, 1) + '\n', 'utf8');
  await browser.close?.(); await server.close?.();
}
console.log('done', out);
process.exit(process.exitCode || 0);
