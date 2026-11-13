// CG-5 (Claude 7): the revolver's index at rest and at full pull, first person, four lights, before and after.
//   node crew/crew.mjs slot run claude7 CG-5 --checks "CG-5 capture" -- node review/CG-5/capture.mjs <before|after> [--fill]
// Writes review/CG-5/<phase>/: per light the full frame and a 3x crop on the trigger guard, at rest and at the pull's full
// travel (fire held, stepped at 60 fps to the first frame the trigger is fully back), with frames.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = process.argv.slice(2), phase = argv.find((a) => !a.startsWith('--')) || 'before', fill = argv.includes('--fill');
const out = path.join(root, 'review', 'CG-5', phase);
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: [] });   // the cloud: SwiftShader through WebGL
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
  report.setup = await ev(page, `await startMatch(T, 'CG5'); T.clearZombies && T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
    ${fill ? `window.__cgFill = new T.THREE.DirectionalLight(0xffffff, 3.2); T.scene.add(window.__cgFill); T.scene.add(window.__cgFill.target);
    window.__cgLight = (c) => { const d = new T.THREE.Vector3(); c.getWorldDirection(d); window.__cgFill.position.copy(c.position).addScaledVector(d, -2).add(new T.THREE.Vector3(0, 1.2, 0)); window.__cgFill.target.position.copy(c.position).addScaledVector(d, 2); window.__cgFill.target.updateMatrixWorld(); };` : 'window.__cgLight = () => {};'}
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'revolver'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('revolver')); await wait(150); } T.setViewFirstDbg(true); await wait(3000);
    return 1;`, 600000);

    const sideShot = async (name) => { await ev(page, `const THREE = T.THREE, v = T.viewmodelDbg(), g = v.gun.root, tg = v.gun.ctrls.trigger || g; v.root.updateMatrixWorld(true);
      const c = new THREE.PerspectiveCamera(30, ${W} / ${H}, 0.005, 50), ctr = tg.getWorldPosition(new THREE.Vector3()), q = g.getWorldQuaternion(new THREE.Quaternion());
      const x = new THREE.Vector3(1, 0, 0).applyQuaternion(q), y = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      c.position.copy(ctr).addScaledVector(x, 0.22).addScaledVector(y, -0.04); c.up.copy(y); c.lookAt(ctr); c.updateMatrixWorld(); __cgLight(c);
      if (T.renderer.renderAsync) await T.renderer.renderAsync(T.scene, c); else T.renderer.render(T.scene, c); return 1;`); await shot(page, name); };
  for (const L of LIGHTS) {
    const r = await ev(page, `T.flightHold(false); T.weather.raining = ${L.rain}; T.weather.rainTimeLeft = ${L.rain ? 100 : 0}; T.weather.intensity = ${L.rain ? 1 : 0}; T.setWorldTime(${L.time});
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'revolver'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('revolver')); await wait(150); }
      T.setViewFirstDbg(true); T.setUnarmedDbg && T.setUnarmedDbg(false); T.setOtsAimDbg(0.0, -0.25); T.flightHold(true);
      const V = () => T.viewmodelDbg();
      for (let i = 0; i < 200 && !(V() && V().info.active && V().info.key === 'revolver' && V().info.raise > 0.999); i++) T.stepFrame(1 / 30);
      for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('revolver', 6); __cgLight(T.camera); T.stepFrame(1 / 60);
      const v = V(), tg = v.gun.ctrls.trigger, lp = tg ? tg.position.clone() : new T.THREE.Vector3(0, -0.03, 0.03);
      const q = v.ndc(v.viewPoint(lp, undefined, 1)); return { ndc: [q.x, q.y], k: v.info.trigger };`);
    const cx = (r.ndc[0] + 1) / 2 * W, cy = (1 - r.ndc[1]) / 2 * H, cw = W / 3, ch = H / 3;
    const clip = { x: Math.max(0, Math.min(W - cw, cx - cw / 2)), y: Math.max(0, Math.min(H - ch, cy - ch / 2)), width: cw, height: ch, scale: 3 };
    await shot(page, `${L.name}-rest`); await shot(page, `${L.name}-rest-crop`, clip); await sideShot(`${L.name}-rest-side`);
    const p = await ev(page, `T.setMouseFireDbg(true); let k = 0, f = 0; for (; f < 120; f++) { T.stepFrame(1 / 60); k = T.viewmodelDbg().info.trigger || 0; if (k > 0.97) break; }
      T.setMouseFireDbg(false); __cgLight(T.camera); return { f, k };`);
    await shot(page, `${L.name}-pull`); await shot(page, `${L.name}-pull-crop`, clip); await sideShot(`${L.name}-pull-side`);
    await ev(page, `for (let i = 0; i < 40; i++) T.stepFrame(1 / 60); return 1;`);
    report.shots[L.name] = { rest: r, pull: p, clip };
    console.log(L.name, JSON.stringify(report.shots[L.name]));
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
