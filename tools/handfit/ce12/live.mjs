// CE-12 (Claude 5, cloud only): a live third-person page for looking at the 3P holds and actions. Loads the game once
// (Training), puts him in third person with every gun, the four lights on the inspector hook, then runs job modules dropped
// in $JOBS (default /home/claude/ce12/jobs): each `export default async ({page, T, shot, ev, log}) => {...}`; done jobs move
// to $JOBS/done. RELOAD file in $JOBS reloads the page (after an index.html edit). Nothing here runs on Jerry's PC.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = process.env.ROOT || '/home/claude/tt';
const { serve } = await import(ROOT + '/tools/serve.mjs');
const JOBS = process.env.JOBS || '/home/claude/ce12/jobs', OUT = process.env.OUT || '/home/claude/ce12/out';
fs.mkdirSync(path.join(JOBS, 'done'), { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const W = +process.env.VW || 1280, H = +process.env.VH || 720;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const server = await serve(ROOT, 0);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--js-flags=--max-old-space-size=4096'] });
let page;
async function boot() {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => log('PAGEERROR', String(e).slice(0, 300)));
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer` + (process.env.DW_GAME_TEST_TOKEN ? '&__gameTestToken=' + encodeURIComponent(process.env.DW_GAME_TEST_TOKEN) : ''), { timeout: 600000 });
  await page.waitForFunction(() => window.TT && window.DWLoad && DWLoad.snapshot().state === 'ready', null, { timeout: 900000, polling: 2000 });
  log('ready');
  for (let i = 0; i < 80; i++) {
    const act = await page.evaluate((i) => { if (!window.DWOpening || !DWOpening.active) return false; DWOpening.dismissForTesting(); if (i > 6 && DWOpening.ready) DWOpening.ready(); return true; }, i);
    if (!act) break; await new Promise((r) => setTimeout(r, 5000));
  }
  await page.evaluate(() => { const n = document.getElementById('playerName'); if (n) n.value = 'CE-12'; document.getElementById('modeTraining').click(); });
  await page.waitForFunction(() => TT.trainingDbg.state().active && !document.getElementById('trainingBlackout')?.classList.contains('on'), null, { timeout: 600000, polling: 2000 });
  log('training');
  await page.evaluate(async () => {
    const css = document.createElement('style'); css.textContent = '#hud,#crosshair,#menu,#title{display:none!important;visibility:hidden!important} body > div:not(#view){visibility:hidden!important}'; document.head.append(css);
    const T = window.TT, Hh = T.inspectHost(); const { LIGHTS } = await import('/studio/inspector/stage.js'); window.__LIGHTS = LIGHTS; window.eyeLight = 'noon';
    T.grantAllWeapons(); T.modsOwnAllDbg && T.modsOwnAllDbg(); T.setViewFirstDbg(false); if (T.isUnarmed()) T.toggleHolster();
    window.__held = false; window.__dt = null; window.__onFrame = null;
    function illuminate() { const L = window.__LIGHTS[window.eyeLight] || window.__LIGHTS.noon; const p = T.player.position; const dir = new Hh.THREE.Vector3(...L.dir).normalize();
      Hh.sun.position.copy(p).addScaledVector(dir, 85); Hh.sun.target.position.copy(p); Hh.sun.target.updateMatrixWorld(); Hh.sun.color.setHex(L.sunColor); Hh.sun.intensity = L.sun;
      Hh.hemi.color.setHex(L.skyColor); Hh.hemi.groundColor.setHex(L.ground); Hh.hemi.intensity = L.sky; Hh.ambientFill.intensity = L.fill; Hh.moon.intensity = window.eyeLight === 'night' ? 0.45 : 0; }
    Hh.attach({ held: () => window.__held, scale: (dt) => (window.__dt != null ? window.__dt : dt), frame: (dt) => { illuminate(); if (window.__onFrame) try { window.__onFrame(dt); } catch (e) { window.__frameErr = String(e); } } });
    const y = T.trainingDbg.tg().floorY; window.__home = { x: 0, y, z: -645 };
    window.__sim = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < 120000) await new Promise((r) => setTimeout(r, 40)); };
    window.__pin = setInterval(() => { if (window.__held || window.__free) return; const h = window.__home; T.player.position.set(h.x, h.y, h.z); T.setVelDbg(0, 0); const yw = window.__yaw || 0; T.aimTarget.set(h.x + Math.sin(yw) * 10, h.y + (window.__aimY ?? 1.25), h.z + Math.cos(yw) * 10); }, 5);
  });
  log('live');
}
await boot();
const ev = (f, a) => page.evaluate(f, a);
const shot = async (name) => { const p = path.join(OUT, name.endsWith('.png') ? name : name + '.png'); await page.screenshot({ path: p, timeout: 300000 }); log('shot', name); return p; };
fs.writeFileSync(path.join(JOBS, '..', 'live.ready'), new Date().toISOString());
for (;;) {
  if (fs.existsSync(path.join(JOBS, 'STOP'))) break;
  if (fs.existsSync(path.join(JOBS, 'RELOAD'))) { fs.unlinkSync(path.join(JOBS, 'RELOAD')); log('reloading'); await boot(); fs.writeFileSync(path.join(JOBS, '..', 'live.ready'), new Date().toISOString()); }
  const jobs = fs.readdirSync(JOBS).filter((f) => f.endsWith('.mjs')).sort();
  for (const j of jobs) {
    const src = path.join(JOBS, j);
    log('job', j);
    try { const m = await import(src + '?t=' + Date.now()); const r = await m.default({ page, T: null, shot, ev, log, OUT }); log('result', j, JSON.stringify(r)?.slice(0, 4000)); }
    catch (e) { log('JOBFAIL', j, String(e).slice(0, 800)); }
    fs.renameSync(src, path.join(JOBS, 'done', j));
  }
  await new Promise((r) => setTimeout(r, 1000));
}
await browser.close(); server.close?.(); process.exit(0);
