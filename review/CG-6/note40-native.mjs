// review/CG-6/note40-native.mjs - Claude 7, CG-6 (J153 note 40, Jerry's pick C2, D-183). A LOOK-ONLY run for Jerry's
// own GPU: it changes nothing in the game. Run it through the slot, headful (the window must stay visible for rAF):
//   node crew/crew.mjs slot run <you> <task> --checks "CG-6 note 40 native look" -- node review/CG-6/note40-native.mjs
// BEFORE = _DELETE ME/claude7-index-before-cg6-note40.html (index 478b5cbe: 0417dc0b3's lighting + Claude 2's Training
// sun-target keep), served for this run only as zz-cg6-n40-before.html at the root (copied in, removed at the end).
// AFTER  = index.html as it is now (C2: hemisphere f3f1ea/8c877c, Training lit hemi >= 1.15, picture grade 1.05/1.15).
// Saved picture settings are cleared on each page so both run on their own defaults.
// Per variant: Training lit (eye + 3P, two headings), its frame time (eye, 6 s, rAF), Training lights off (eye + 3P);
// then outdoors at noon / overcast / dusk / night (eye + 3P). PNGs + stops.json -> review/CG-6/n40native/.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'review/CG-6/n40native'); fs.mkdirSync(out, { recursive: true });
const BEFORE_SRC = path.join(ROOT, '_DELETE ME/claude7-index-before-cg6-note40.html'), BEFORE = path.join(ROOT, 'zz-cg6-n40-before.html');
fs.copyFileSync(BEFORE_SRC, BEFORE);
const srv = await serve(ROOT);
const browser = await launch({ headless: false, args: ['--window-size=1600,900'] });
const stops = []; let code = 0;
const save = () => fs.writeFileSync(path.join(out, 'stops.json'), JSON.stringify(stops, null, 1));
async function boot(file) {
  const page = await browser.newPage({ width: 1600, height: 900 });
  await page.goto(`${srv.origin}/${file}?debug=1`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (c, ms = 300000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`try { localStorage.removeItem('tt_brightness'); localStorage.removeItem('tt_vibrancy'); } catch (e) {} T.applyPictureSettings(); await wait(800);
    window.__n40 = () => { const h = T.hemi, p = T.pictureDbg ? T.pictureDbg() : null, R = T.renderer;
      return { backend: R.backend && R.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2', pr: R.getPixelRatio(), canvas: R.domElement.width + 'x' + R.domElement.height,
        hemi: h ? { sky: h.color.getHexString(), ground: h.groundColor.getHexString(), i: +h.intensity.toFixed(3) } : null, sun: +T.sun.intensity.toFixed(3),
        time: T.getWorldTime(), picture: p, training: D.state().active, lights: D.lights ? D.lights() : null, view1P: !!(T.viewmodelDbg && T.viewmodelDbg() && T.viewmodelDbg().info) }; };
    return 1;`);
  return { page, step };
}
async function shot(v, pg, tag) {
  const d = await pg.step(`await wait(700); document.querySelectorAll('body > *:not(canvas)').forEach((e) => { if (e.tagName !== 'SCRIPT') { e.dataset.n40vis = e.style.visibility; e.style.visibility = 'hidden'; } }); await wait(150); return __n40();`);
  const f = `${v}-${tag}.png`; await pg.page.screenshot(path.join(out, f));
  await pg.step(`document.querySelectorAll('[data-n40vis]').forEach((e) => { e.style.visibility = e.dataset.n40vis || ''; delete e.dataset.n40vis; }); return 1;`);
  Object.assign(d, { variant: v, tag, file: f }); stops.push(d); save(); console.log(v, tag, JSON.stringify(d.hemi), d.picture && d.picture.exposure);
}
const frameTime = (pg) => pg.step(`await wait(1500); const ts = []; await new Promise((r) => { const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 6000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); const q = (k) => +d[Math.min(d.length - 1, Math.floor(k * d.length))].toFixed(2);
  return { frames: d.length, meanMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), maxMs: +d[d.length - 1].toFixed(2) };`);
const views = async (v, pg, base, yaws) => {
  for (const [yn, yaw] of yaws) {
    await pg.step(`T.setAimYawDbg(${yaw}); T.setViewFirstDbg(true); await wait(1500); return 1;`); await shot(v, pg, base + '-eye-' + yn);
    await pg.step(`T.setViewFirstDbg(false); await wait(1800); return 1;`); await shot(v, pg, base + '-3p-' + yn);
  }
};
try {
  for (const [v, file] of [['before', 'zz-cg6-n40-before.html'], ['after', 'index.html']]) {
    // Training
    let pg = await boot(file);
    await pg.step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
      const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 120000) await wait(200);
      await wait(3000); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false); for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(200); } await wait(1200);
      const s = D.tg().spawn; T.player.position.set(s.x, D.tg().floorY, s.z); window.__y0 = s.yaw || 0; return 1;`);
    const y0 = await pg.step(`return window.__y0;`);
    await views(v, pg, 'training-lit', [['a', y0], ['b', y0 + Math.PI / 2]]);
    await pg.step(`T.setAimYawDbg(${y0}); T.setViewFirstDbg(true); await wait(1500); return 1;`);
    const ft = await frameTime(pg); stops.push({ variant: v, tag: 'training-lit-eye-frametime', frameTime: ft, state: await pg.step(`return __n40();`) }); save(); console.log(v, 'frame time', JSON.stringify(ft));
    await pg.step(`D.toggleLights(); await wait(1500); return 1;`);
    await views(v, pg, 'training-off', [['a', y0]]);
    await pg.page.close?.();
    // Outdoors
    pg = await boot(file);
    await pg.step(`document.getElementById('playerName').value = 'N40'; document.getElementById('modeHunt').click();
      const fr = document.getElementById('firstRunCard'), pa = document.getElementById('firstRunPlay'); if (fr && !fr.hidden && pa) pa.click();
      for (let i = 0; i < 80 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(1500); T.clearZombies && T.clearZombies(); T.grantAllWeapons && T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false); for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(200); } await wait(1200); return 1;`);
    const oy = await pg.step(`return 0.6;`);
    for (const [ln, t, rain] of [['noon', 0.5, false], ['overcast', 0.5, true], ['dusk', 0.71, false], ['night', 0.0, false]]) {
      await pg.step(`const W = T.weather; if (W) { W.raining = ${rain}; W.intensity = ${rain ? 1 : 0}; W.rainTimeLeft = ${rain ? 900 : 0}; W.timer = Math.max(W.timer || 0, 900); }
        T.clearZombies && T.clearZombies(); T.setWorldTime(${t}); await wait(300); T.setWorldTime(${t}); return 1;`);
      await views(v, pg, 'out-' + ln, [['a', oy]]);
    }
    await pg.page.close?.();
  }
} catch (e) { console.log('ERR', e && e.stack || e); code = 1; }
finally { await browser.close(); await srv.close(); try { fs.unlinkSync(BEFORE); } catch (e) { console.log('could not remove', BEFORE); } }
console.log('stops:', stops.length, '->', out);
process.exit(code);
