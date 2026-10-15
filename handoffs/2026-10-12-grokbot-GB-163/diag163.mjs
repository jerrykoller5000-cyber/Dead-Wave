// GB-163: the range back wall flicker. Walks the camera along Jerry's angle and logs the back-wall fade each frame.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'diag', out = path.join(ROOT, 'handoffs/2026-10-12-grokbot-GB-163', tag); fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1024, height: 640 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(2500); return true;`, 120000);
  // 1) the live game camera, player walking along the back wall: log the fade each frame
  const live = await step(`const tg = D.tg(), O = tg.origin, p = T.localPlayer ? T.localPlayer.position : T.player.position; const log = [];
    for (let i = 0; i < 40; i++) { p.set(O.x - 6 + i * 0.3, O.y, O.z - 9.5 + Math.sin(i / 3) * 1.5); await wait(60);
      const s = tg.cutaway.state().find((e) => e.side === 'rangeSouth'); const c = T.camera ? T.camera.position : null;
      log.push([+(p.z - O.z).toFixed(2), c ? +(c.z - O.z).toFixed(2) : null, c ? +(c.y - O.y).toFixed(2) : null, s ? +s.opacity.toFixed(2) : null, s ? s.hidden : null]); }
    return log;`);
  fs.writeFileSync(path.join(out, 'live-fade.json'), JSON.stringify(live));
  const flips = live.filter((r, i) => i && r[4] !== live[i - 1][4]).length;
  console.log('live frames', live.length, 'hidden flips', flips, 'sample', JSON.stringify(live.slice(0, 6)));
  // 2) Jerry's angle, the camera nudged a little each frame: shots to compare
  for (let i = 0; i < 4; i++) {
    await step(`const O = D.tg().origin; const p = T.localPlayer ? T.localPlayer.position : T.player.position; p.set(O.x - 7, O.y, O.z - 3);
      T.setShotView({ x: O.x - 9 + i * 0.07, y: O.y + 9.5, z: O.z + 2 + i * 0.05, tx: O.x - 1, ty: O.y + 2, tz: O.z - 12, fov: 55 }); await wait(500);
      return true;`.replace(/\bi\b/g, String(i)));
    await page.screenshot(path.join(out, `wall-${i}.png`));
  }
  const st = await step(`const tg = D.tg(); return JSON.stringify(tg.cutaway.state());`);
  console.log('cutaway', st, 'errors', (page.errors || []).length);
} finally { await browser.close(); await srv.close(); }
