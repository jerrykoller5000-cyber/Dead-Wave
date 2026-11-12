// lights4.mjs <outDir> <gun>[,<gun>...] (CD-1 fixes 5, Claude 1; cloud only, inside the cloud's slot): the first person at the
// eye in the real game (index.html, the Training Ground, the viewmodel and arms as drawn), each gun at the hip in the four
// lights (noon, overcast, dusk, night: the inspector's LIGHTS on the scene's sun, sky and fill, AG-295's recipe) and aimed at
// noon. Writes <gun>-hip-<light>.png and <gun>-aimed-noon.png (VW x VH, default 960x540). The cloud renders in software: slow.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { serve } from '/home/claude/gs306/tools/serve.mjs';
const ROOT = '/home/claude/gs306';
const out = process.argv[2], guns = process.argv[3].split(',');
const LIGHTS = (process.env.LIGHTS || 'noon,overcast,dusk,night').split(',');
fs.mkdirSync(out, { recursive: true });
const W = +process.env.VW || 960, H = +process.env.VH || 540;
const server = await serve(ROOT, 0);
const browser = await chromium.launch({ args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean).concat(['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']) });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer` + (process.env.DW_GAME_TEST_TOKEN ? '&__gameTestToken=' + encodeURIComponent(process.env.DW_GAME_TEST_TOKEN) : ''), { timeout: 300000 });
  await page.waitForFunction(() => window.TT && window.DWLoad && DWLoad.snapshot().state === 'ready', null, { timeout: 600000, polling: 1000 });
  log('ready');
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => !DWOpening.active, null, { timeout: 400000, polling: 1000 });
  await page.evaluate(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Inspector'; const b = document.getElementById('modeTraining'); if (b) b.click(); });
  await page.waitForFunction(() => TT.trainingDbg.state().active && !document.getElementById('trainingBlackout')?.classList.contains('on'), null, { timeout: 300000, polling: 1000 });
  log('training');
  await page.evaluate(async () => {
    const css = document.createElement('style'); css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}'; document.head.append(css);
    const T = window.TT, Hh = T.inspectHost(); const { LIGHTS } = await import('/studio/inspector/stage.js'); window.__LIGHTS = LIGHTS; window.eyeLight = 'noon';
    T.setViewFirstDbg(true); T.grantAllWeapons(); T.modsOwnAllDbg && T.modsOwnAllDbg(); if (T.isUnarmed()) T.toggleHolster(); T.flightHold && T.flightHold(false);
    function illuminate() { const L = window.__LIGHTS[window.eyeLight] || window.__LIGHTS.noon; const p = T.player.position; const dir = new Hh.THREE.Vector3(...L.dir).normalize();
      Hh.sun.position.copy(p).addScaledVector(dir, 85); Hh.sun.target.position.copy(p); Hh.sun.target.updateMatrixWorld(); Hh.sun.color.setHex(L.sunColor); Hh.sun.intensity = L.sun;
      Hh.hemi.color.setHex(L.skyColor); Hh.hemi.groundColor.setHex(L.ground); Hh.hemi.intensity = L.sky; Hh.ambientFill.intensity = L.fill; Hh.moon.intensity = window.eyeLight === 'night' ? 0.45 : 0; }
    Hh.attach({ held: () => false, scale: (dt) => dt, frame: illuminate });
  });
  for (const key of guns) {
    await page.evaluate(async (key) => { const T = window.TT; T.setZoomHeldDbg(false); T.setOtsAimDbg(0, -0.08); const i = T.WEAPON_ORDER.indexOf(key);
      for (let k = 0; k < 60 && T.getCurrentWeapon() !== key; k++) { T.setWeapon(i); await new Promise((r) => setTimeout(r, 250)); }
      if (T.isUnarmed()) T.toggleHolster(); const mods = T.armoryDbg?.mods(key) || []; if (mods.some((m) => m.id === 'laserLight')) T.armoryDbg.fit(key, 'laserLight', true); }, key);
    await page.waitForFunction((key) => { const v = TT.viewmodelDbg(); return v && v.info && v.info.active && v.info.key === key && v.info.raise > 0.999; }, key, { timeout: 300000, polling: 1000 });
    await page.waitForTimeout(3000);
    for (const light of LIGHTS) {
      await page.evaluate((l) => { window.eyeLight = l; }, light); await page.waitForTimeout(+process.env.SETTLE || 4000);
      await page.screenshot({ path: path.join(out, `${key}-hip-${light}.png`) }); log(key, light);
    }
    if (!process.env.NOAIM) {
      await page.evaluate(() => { window.eyeLight = 'noon'; TT.setZoomHeldDbg(true); TT.setOtsAimDbg(0, 0); });
      await page.waitForFunction(() => { const f = TT.fpDbg(); return f && f.ads >= 0.99; }, null, { timeout: 120000, polling: 500 });
      await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, `${key}-aimed-noon.png`) }); log(key, 'aimed');
      await page.evaluate(() => { TT.setZoomHeldDbg(false); TT.setOtsAimDbg(0, -0.08); });
    }
  }
} catch (e) { console.log('FAIL', String(e)); }
console.log('errors', errs.slice(0, 5));
await browser.close(); server.close?.(); process.exit(0);
