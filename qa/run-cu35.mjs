// qa/run-cu35.mjs — CU-35: day 1 twice on Jerry's GPU (visible window, WebGPU).
//
//   node qa/run-cu35.mjs
//
// Run 1: fresh profile, day 1 through the wave, the finisher and dawn. Run 2: die in the
// wave and press Play again. Prints timings and fps per phase, writes shots to
// qa/shots/2026-09-25-CU-35/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = path.join(ROOT, 'qa', 'shots', '2026-09-25-CU-35');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cu35]', ...a);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
let n = 0;
const shot = async (page, name) => {
  n++;
  const file = path.join(SHOTS, String(n).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot(file);
  log('shot', path.basename(file));
};
const fps = async (page, label, seconds = 5) => {
  const rows = [];
  for (let i = 0; i < seconds; i++) {
    await page.evaluate('TT.resetPerf()');
    await sleep(1000);
    rows.push(await page.evaluate('TT.perfSnapshot()'));
  }
  const good = rows.filter((r) => r.fps > 0);
  const mean = good.reduce((s, r) => s + r.fps, 0) / (good.length || 1);
  const low = Math.min(...good.map((r) => r.low));
  const worst = Math.max(...rows.map((r) => r.worst));
  log(`fps ${label}: mean ${mean.toFixed(1)}  lowest 1% low ${low.toFixed(1)}  worst ${worst.toFixed(1)} ms  (${seconds} s)`);
  return { label, mean, low, worst };
};
const alive = `TT.zombies.filter(z => z.alive)`;

try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  const tNav = Date.now();
  await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  await page.evaluate('localStorage.clear()');
  await page.waitFor('!!window.TT', { timeout: 240000 });
  log('backend', await page.evaluate('TT.getRendererBackend ? TT.getRendererBackend() : "?"'));
  const menuUp = await page.waitFor('DWOpening.active === false', { timeout: 120000 });
  log('splash played through by itself:', menuUp, 'at', ((Date.now() - tNav) / 1000).toFixed(1) + 's');
  await sleep(1500);
  await shot(page, 'menu');
  const perf = [];
  perf.push(await fps(page, 'menu'));

  // ---- Run 1: survive day 1 --------------------------------------------------------
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Jerry'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 30000 });
  await sleep(3000);
  await shot(page, 'insertion');
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await sleep(1500);
  await shot(page, 'prep-landed');
  perf.push(await fps(page, 'prep'));
  log('prep: day', await page.evaluate('TT.getDay()'), 'cash', await page.evaluate('TT.getBank()'), 'guards', await page.evaluate('TT.getPoiGuards ? TT.getPoiGuards().zombies.length : "?"'));
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await page.evaluate(`TT.runDevCommand('bigtex shooter')`);

  const tAlarm = Date.now();
  await page.evaluate('TT.hqStartWave()');
  await sleep(2500);
  await shot(page, 'alarm-night-falling');
  const preview = await page.evaluate('TT.getWavePreview(TT.getDay())');
  const caveIndex = preview && preview.caveIndices ? preview.caveIndices[0] : null;
  log('day-1 plan:', preview ? preview.total : '?', 'zombies, assault cave', caveIndex, preview && preview.byTypeAndCave ? preview.byTypeAndCave.map((b) => b.count + ' ' + b.typeKey + (b.caveName ? ' @' + b.caveName : '')).join(', ') : '');

  // First contact: a live zombie within 3 m of the marine.
  let tContact = null, tFirstSpawn = null;
  for (let i = 0; i < 1800 && tContact == null; i++) {
    const s = await page.evaluate(`(() => { const p = TT.player.position; let d = 1e9; for (const z of ${alive}) d = Math.min(d, Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z)); return { n: ${alive}.length, d }; })()`);
    if (s.n > 0 && tFirstSpawn == null) tFirstSpawn = Date.now();
    if (s.d < 3) tContact = Date.now();
    else await sleep(100);
  }
  log('alarm to first zombie on the map:', tFirstSpawn ? ((tFirstSpawn - tAlarm) / 1000).toFixed(1) + ' s' : 'none in 180 s');
  log('alarm to first contact (a zombie within 3 m):', tContact ? ((tContact - tAlarm) / 1000).toFixed(1) + ' s' : 'none in 180 s');
  await shot(page, 'first-contact');
  perf.push(await fps(page, 'wave (godmode, zombies on the marine)'));

  // The night cave, from the marine's own third-person camera, 30 m and 10 m out. The play
  // camera sits on the +z side of the marine looking toward -z, so the marine stands on the
  // +z side of the cave to have it in frame.
  if (caveIndex != null && caveIndex >= 0) {
    for (const dist of [30, 10]) {
      await page.evaluate(`(() => {
        const c = TT.POI.caves[${caveIndex}]; if (!c) return;
        const x = c.x, z = c.z + ${dist};
        TT.player.position.set(x, TT.sampleHeight(x, z), z);
      })()`);
      await sleep(1500);
      await shot(page, `night-cave-${dist}m-nvg-off`);
      await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', bubbles: true }))`);
      await sleep(900);
      await shot(page, `night-cave-${dist}m-nvg-on`);
      await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', bubbles: true }))`);
      await sleep(400);
    }
  } else log('no assault cave index in the plan; night-cave shots skipped');

  // The wave: kill one zombie every 1.2 s, as scripted "shots", until the plan is spent.
  const tFirstShot = Date.now();
  let kills = 0;
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(`({ phase: TT.getPhase(), fin: !!TT.getWaveFinisher(), n: ${alive}.length })`);
    if (st.fin || st.phase !== 'wave') break;
    if (st.n > 0) {
      await page.evaluate(`(() => { const z = ${alive}[0]; if (z) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } }); })()`);
      kills++;
    }
    await sleep(1200);
  }
  const tLastKill = Date.now();
  log('first scripted shot to last kill:', ((tLastKill - tFirstShot) / 1000).toFixed(1) + ' s,', kills, 'kills');
  await sleep(1200);
  await shot(page, 'finisher-orbit');
  perf.push(await fps(page, 'finisher', 4));
  await page.waitFor(`TT.getPhase() === 'prep' && TT.getDay() === 2 && !TT.getWaveFinisher()`, { timeout: 60000 });
  await sleep(2000);
  await shot(page, 'dawn-day-2');
  log('day 2 prep reached at', ((Date.now() - tLastKill) / 1000).toFixed(1) + ' s after the last kill');

  // ---- Run 2: die and Play again ------------------------------------------------------
  await page.evaluate(`TT.runDevCommand('godmode off')`);
  await page.evaluate('TT.hqStartWave()');
  await page.waitFor(`${alive}.length > 0`, { timeout: 120000 });
  await page.evaluate(`(() => { const z = ${alive}[0] || null; TT.setHp(5); TT.damagePlayer(50, (z && z.typeKey) || 'shambler', z); })()`);
  await page.waitFor(`document.getElementById('win').classList.contains('show')`, { timeout: 60000 });
  await sleep(800);
  await shot(page, 'death-screen');
  await page.evaluate(`document.getElementById('again').click()`);
  await sleep(1500);
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Jerry'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 30000 });
  log('Play again: day', await page.evaluate('TT.getDay()'), 'cash', await page.evaluate('TT.getBank()'), 'ways to die', await page.evaluate('JSON.stringify(TT.loadDeathLog())'));
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await sleep(1000);
  await shot(page, 'play-again-day-1');

  log('page errors:', page.errors.length);
  for (const e of page.errors.slice(0, 8)) console.log('   ERR', e.split('\n')[0]);
  fs.writeFileSync(path.join(SHOTS, 'fps.json'), JSON.stringify(perf, null, 2));
} catch (e) {
  log('FAILED', e.message);
} finally {
  await browser.close();
  await server.close();
}
