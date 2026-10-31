// clip.mjs: GB-256's before and after clips (J31, J32), from probe2.mjs's page. Every frame of a 1/60 s frame-stepped
// run photographed (JPEG), for clips/<phase>/<case>/f###.jpg. Was: probe2.mjs's measurement in a page of its own (the real renderer, a GPU window off
// screen, raf=timer as tools/realtest.mjs runs the suite), because under tools/camera.mjs the game's own camera never
// followed him into the Training Ground (it stayed at the match spawn, so the cursor's ray never reached his floor).
//
//   node qa/2026-10-31-GB-256/probe2.mjs <phase> [guns]        (inside the game-test slot lease)
//
// Third person in the Training Ground, frame-stepped (T.stepFrame, 1/60 s a frame, so nothing depends on this
// computer's speed). The shake number is the jerk the eye sees: the mean size of the second difference of a point
// from frame to frame (mm): ~0 for a still hold or a steady slide, large for a frame-to-frame back-and-forth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = process.argv[2] || 'before';
const GUNS = (process.argv[3] || 'm4,pistol').split(',');
const MATCH = process.argv.includes('--match');   // a hunt match on open ground instead of the Training Ground
const OUT = path.join(ROOT, 'qa/2026-10-31-GB-256/clips2/' + PHASE);
fs.mkdirSync(OUT, { recursive: true });
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
const entered = MATCH ? await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Probe'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.clearZombies && T.clearZombies(); T.setViewFirstDbg(false); await wait(800);
  return JSON.stringify({ phase: T.getPhase(), first: T.fpDbg().first, w: T.getCurrentWeapon() });`, 180000) : await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
  const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
  await wait(3500); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.setViewFirstDbg(false); await wait(800);
  return JSON.stringify({ active: D.state().active, wake: !!D.state().wake, first: T.fpDbg().first, w: T.getCurrentWeapon(), cam: [T.camera.position.x - T.player.position.x, T.camera.position.y - T.player.position.y, T.camera.position.z - T.player.position.z] });`, 120000);
console.log('entered: ' + entered);


const CLIPS = [
  ['m4', 'zoom-move', true, '(i) => [40 + 260 * Math.sin(i / 150 * Math.PI * 2), -200 + 80 * Math.sin(i / 150 * Math.PI * 4)]'],
  ['pistol', 'near-move', false, '(i) => [60 + 260 * Math.sin(i / 150 * Math.PI * 2), 140 + 80 * Math.sin(i / 150 * Math.PI * 4)]'],
];
for (const [W, name, zoom, pathFn] of CLIPS) {
  const dir = path.join(OUT, W + '-' + name); fs.mkdirSync(dir, { recursive: true });
  const ready = await step(`T.flightHold(false); T.setViewFirstDbg(false); T.setZoomHeldDbg(false);
    const k = Object.keys(T).find((k) => T[k] && typeof T[k] === 'object' && typeof T[k].gunShown === 'function'), shown = () => T[k].gunShown();
    if (!shown()) { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', key: '4', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit4', key: '4', bubbles: true })); await wait(400); }
    T.setWeapon(T.WEAPON_ORDER.indexOf('${W}')); await wait(1500); T.marineIdleDbg().reset();
    const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
    window.__gbPut = (px, py) => { const o = { clientX: r.left + r.width / 2 + px, clientY: r.top + r.height / 2 + py, bubbles: true, pointerType: 'mouse' }; cv.dispatchEvent(new PointerEvent('pointerenter', o)); cv.dispatchEvent(new PointerEvent('pointermove', o)); };
    window.__gbPath = ${pathFn};
    window.__gbPut(...window.__gbPath(0)); T.flightHold(true);
    for (let i = 0; i < 60; i++) { T.flightInput({ keys: [], zoom: ${zoom} }); window.__gbPut(...window.__gbPath(0)); T.stepFrame(1 / 60); }
    return JSON.stringify({ gun: T.getCurrentWeapon(), shown: shown() });`);
  console.log(W + ' ' + name + ' ' + ready);
  const kinds = [];
  for (let i = 0; i < 120; i++) {
    kinds.push(await step(`T.flightInput({ keys: [], zoom: ${zoom} }); window.__gbPut(...window.__gbPath(${i})); T.stepFrame(1 / 60); T.marineIdleDbg().reset();
      // A close camera of our own, fixed in his frame (front-right, chest height), so the clip shows the hold against his
      // body and not his turn; the game's camera is left alone (its follow keeps state in camera.position).
      const P = T.player.position, y = T.player.rotation.y, fx = Math.sin(y), fz = Math.cos(y), rx = -Math.cos(y), rz = Math.sin(y);
      const c2 = window.__gbCam || (window.__gbCam = new T.THREE.PerspectiveCamera(40, T.camera.aspect, 0.05, 200));
      c2.position.set(P.x + fx * 1.5 + rx * 1.0, P.y + 1.55, P.z + fz * 1.5 + rz * 1.0); c2.lookAt(P.x + fx * 0.25, P.y + 1.15, P.z + fz * 0.25); c2.updateMatrixWorld(true);
      T.renderer.render(T.scene, c2);
      return T.aimKindDbg();`));
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    fs.writeFileSync(path.join(dir, 'f' + String(i).padStart(3, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
  }
  fs.writeFileSync(path.join(dir, 'kinds.json'), JSON.stringify(kinds));
  console.log('  ' + kinds.join(' ').slice(0, 300));
}
await step(`T.flightHold(false); T.setZoomHeldDbg(false); return 'ok'`);
await browser.close?.(); srv.close?.(); process.exit(0);
