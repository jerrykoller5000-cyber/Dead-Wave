// tools/training-lights.mjs — CU-94: shots of the Training Ground's light switch on the real renderer.
//
//   node tools/training-lights.mjs [out]      out: review/training-lights/after
//
// Loads the game, presses Training Ground and shoots, lit: the range from his place behind the line, the doorway to
// the build room (the switch is beside it), and a close look at the switch with him standing at it (the E prompt).
// Once the switch exists (TT.trainingDbg.lights) it flips it with E and shoots the same views dark, then the range
// dark with the flashlight on and with the goggles down. Run it before a change with another out, then compare:
//   node tools/shoot.mjs --compare review/training-lights/before review/training-lights/after
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.resolve(ROOT, process.argv[2] || 'review/training-lights/after');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
let failed = false;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const shot = async (name) => { await new Promise((r) => setTimeout(r, 600)); await page.screenshot(path.join(out, name + '.png')); console.log('shot', name); };
  const entered = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(4000); const p = document.getElementById('perf'); if (p) p.style.display = 'none'; return D.state().active;`, 120000);
  if (!entered) throw new Error('the Training Ground never opened');
  const O = await step(`const tg = D.tg(); return { x: tg.origin.x, y: tg.origin.y, z: tg.origin.z };`);
  const view = (x, y, z, tx, ty, tz, fov = 55) => `T.setShotView({ x: ${O.x} + ${x}, y: ${O.y} + ${y}, z: ${O.z} + ${z}, tx: ${O.x} + ${tx}, ty: ${O.y} + ${ty}, tz: ${O.z} + ${tz}, fov: ${fov} });`;
  const atSpawn = `T.setShotView(null); { const tg = D.tg(), s = tg.spawn; T.player.position.set(s.x, tg.floorY, s.z); T.setAimYawDbg(s.yaw); } await wait(900);`;
  // Where he stands to use the switch: a step downrange of its front (so he doesn't hide it from the close look),
  // facing it. Its station when there is one, the same spot by the doorway when there isn't.
  const atSwitch = `{ const tg = D.tg(), s = tg.stations.lightSwitch || { x: ${O.x} - 7.98, z: ${O.z} - 5.95, front: { x: ${O.x} - 7.2, z: ${O.z} - 5.95 } };
    const px = s.front.x + 0.15, pz = s.front.z + 1.0;
    T.player.position.set(px, tg.floorY, pz); T.setAimYawDbg(Math.atan2(s.x - px, s.z - pz)); }`;
  const views = async (suffix) => {
    await step(atSpawn + ' return true;');
    await shot('range' + suffix);
    await step(`${view(-2.6, 2.3, -1.6, -8, 1.3, -6.6, 55)} await wait(800); return true;`);
    await shot('doorway' + suffix);
    await step(`${atSwitch} ${view(-4.3, 2.3, -7.0, -8, 1.4, -5.9, 46)} await wait(900); return true;`);
    await shot('switch' + suffix);
  };
  await views('');
  const has = await step(`return !!(D.lights && D.tg().stations.lightSwitch);`);
  if (!has) console.log('no light switch in this build: lit views only');
  else {
    const flip = await step(`${atSwitch} await wait(300); const a = D.action(); T.doAction(); await wait(300); return { action: a, lights: D.lights() };`);
    console.log('E at the switch:', JSON.stringify(flip));
    if (flip.action !== 'trainingLights' || flip.lights.on !== false) { failed = true; console.log('FAIL: E at the switch did not put the lights out'); }
    await views('-dark');
    await step(`${atSpawn} T.renderer.domElement.dispatchEvent(new PointerEvent('pointermove', { clientX: 640, clientY: 170, bubbles: true }));
      T.setGearDbg('flashlight'); document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })); await wait(900); return true;`);
    await shot('range-dark-flashlight');
    await step(`document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })); T.setGearDbg('nvg'); document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', bubbles: true })); await wait(1200); return true;`);
    await shot('range-dark-nvg');
    const back = await step(`document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', bubbles: true })); ${atSwitch} await wait(300); T.doAction(); await wait(300); return D.lights();`);
    console.log('E again:', JSON.stringify(back));
    if (back.on !== true) { failed = true; console.log('FAIL: E again did not put the lights back on'); }
    await views('-relit');
  }
  const errs = page.errors || [];
  fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ switch: has, pageErrors: errs }, null, 2));
  console.log('page errors:', errs.length);
  if (errs.length) failed = true;
} finally {
  await browser.close();
  await srv.close();
}
process.exit(failed ? 1 : 0);
