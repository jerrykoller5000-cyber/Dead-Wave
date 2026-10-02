// tools/trainingsheet.mjs — CL-115: review shots of the Training Ground on the real renderer.
//
//   node tools/trainingsheet.mjs [out]      out: review/training/v1
//
// Loads the game (index.html), presses Training Ground on the title menu (no insertion: it is straight in) and shoots:
// the range from his place behind the line, the terminal wall, the targets with one shot down, the build room with
// zombies called in, the infirmary bed, and the HQ panel's window.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.resolve(ROOT, process.argv[2] || 'review/training/v1');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = async (code, ms = 180000) => { console.log('step', code.slice(0, 60).replace(/\s+/g, ' ')); return page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms); };
  const shot = async (name) => { await new Promise((r) => setTimeout(r, 500)); await page.screenshot(path.join(out, name + '.png')); console.log('shot', name); };
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while (!D.state().active && Date.now() - t0 < 60000) await wait(200);
    await wait(4000); const p = document.getElementById('perf'); if (p) p.style.display = 'none'; return D.state().active;`, 120000);
  await shot('range');
  const O = await step(`const tg = D.tg(); return { x: tg.origin.x, y: tg.origin.y, z: tg.origin.z };`);
  const view = (x, y, z, tx, ty, tz, fov = 55) => `T.setShotView({ x: ${O.x} + ${x}, y: ${O.y} + ${y}, z: ${O.z} + ${z}, tx: ${O.x} + ${tx}, ty: ${O.y} + ${ty}, tz: ${O.z} + ${tz}, fov: ${fov} });`;
  await step(`${view(-1.5, 3.4, -3.5, 8, 1.7, -6.8, 60)} await wait(800); return true;`);
  await shot('terminal-wall');
  await step(`const tg = D.tg(); const t = tg.targets[2]; D.round({ prev: { x: t.box.minX + 0.3, y: (t.box.minY + t.box.maxY) / 2, z: t.box.minZ - 1 }, pos: { x: t.box.minX + 0.3, y: (t.box.minY + t.box.maxY) / 2, z: t.box.minZ + 1 }, hit: false });
    ${view(0, 2.2, -2, 0, 0.8, 18, 50)} await wait(900); return true;`);
  await shot('targets');
  await step(`T.setShotView(null); D.spawn('shambler', 5); D.spawn('brute', 1); D.spawn('feral', 3);
    const tg = D.tg(); const p = T.player.position; p.set(tg.origin.x - 12, tg.floorY, tg.origin.z - 8); await wait(2500);
    ${view(-17, 13, -15, -17, 0, 0, 55)} await wait(800); return D.alive();`);
  await shot('build-room');
  await step(`D.clear(); T.setShotView(null); D.blackout(); const t0 = Date.now(); while (D.state().wake && !D.state().wake.lit && Date.now() - t0 < 30000) await wait(100); await wait(1200);
    ${view(-19.5, 3.2, -7.5, -23.5, 0.6, -11.2, 55)} await wait(300); return true;`);
  await shot('infirmary-wake');
  await step(`const t1 = Date.now(); while (D.state().wake && Date.now() - t1 < 30000) await wait(100); T.setShotView(null); const tg = D.tg(); const f = tg.stations.hqPanel.front; T.player.position.set(f.x, tg.floorY, f.z); await wait(500); D.openPanel(); D.panel().pick('brute', 5); await wait(400); return true;`);
  await shot('hq-panel');
} finally {
  await browser.close();
  await srv.close();
}
