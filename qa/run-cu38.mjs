// qa/run-cu38.mjs — CU-38: nights 1 to 10 on Jerry's GPU (visible window, WebGPU).
//
//   node qa/run-cu38.mjs [--nights 10] [--fight 25]
//
// Each night: sound the alarm, let the horde come for --fight seconds with the marine in
// godmode while fps is sampled, then end the wave with one last kill beside him (as t61
// does), shoot the finisher and the Night Complete card, and press Next Night.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS = path.join(ROOT, 'qa', 'shots', '2026-09-25-CU-38');
fs.mkdirSync(SHOTS, { recursive: true });
const argv = process.argv.slice(2);
const num = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) || d : d; };
const NIGHTS = num('--nights', 10), FIGHT = num('--fight', 25);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cu38]', ...a);
const shot = async (page, name) => { await page.screenshot(path.join(SHOTS, name + '.png')); };
const alive = `TT.zombies.filter(z => z.alive)`;

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const rows = [];
try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.TT && window.DWOpening', { timeout: 240000 });
  await page.evaluate('localStorage.clear(); DWOpening.dismissForTesting && DWOpening.dismissForTesting()');
  await page.waitFor('DWOpening.active === false', { timeout: 120000 });
  log('backend', await page.evaluate('TT.getRendererBackend()'));
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Jerry'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await page.evaluate('TT.hqStartWave()');

  for (let night = 1; night <= NIGHTS; night++) {
    const row = { night };
    await sleep(2500);
    await shot(page, `n${String(night).padStart(2, '0')}-alarm`);
    row.wave = await page.waitFor(`TT.getPhase() === 'wave'`, { timeout: 60000 });
    const plan = await page.evaluate('TT.getWavePreview(TT.getDay())');
    row.day = await page.evaluate('TT.getDay()');
    row.plan = plan ? plan.total : null;
    row.special = plan ? [plan.bloodMoon && 'ember', plan.hasColossus && 'colossus', plan.guardianNight && 'guardian', plan.surround && 'surround'].filter(Boolean).join('+') : '';
    // The fight: sample fps once a second while the horde comes in.
    let sum = 0, n = 0, low = 1e9, worst = 0, peak = 0;
    await page.evaluate('TT.resetPerf()');
    for (let s = 0; s < FIGHT; s++) {
      await sleep(1000);
      const p = await page.evaluate(`({ p: TT.perfSnapshot(), z: ${alive}.length })`);
      if (p.p.fps > 0) { sum += p.p.fps; n++; low = Math.min(low, p.p.low); }
      worst = Math.max(worst, p.p.worst);
      peak = Math.max(peak, p.z);
      if (s === Math.floor(FIGHT / 2)) await shot(page, `n${String(night).padStart(2, '0')}-fight`);
    }
    row.fps = +(sum / (n || 1)).toFixed(1);
    row.low = +low.toFixed(1);
    row.worst = +worst.toFixed(1);
    row.peakZombies = peak;
    row.hitches = (await page.evaluate('TT.perfSnapshot()')).hitches;
    // End the wave with one last kill beside the marine.
    await page.evaluate(`(() => { TT.drainWavePlanDbg(); TT.clearZombies(); const p = TT.player.position; TT.spawnZombie(p.x + 5, p.z + 5, 'shambler', true, true); })()`);
    await sleep(1200);
    await page.evaluate('TT.resetPerf()');
    await page.evaluate(`(() => { const z = ${alive}[0]; if (z) TT.killZombie(z, true, { kind: 'generic', dir: { x: 1, z: 0 } }); })()`);
    row.finisher = await page.evaluate('!!TT.getWaveFinisher()');
    await sleep(1500);
    await shot(page, `n${String(night).padStart(2, '0')}-finisher`);
    const fp = await page.evaluate('TT.perfSnapshot()');
    row.finisherWorst = +fp.worst.toFixed(1);
    row.card = await page.waitFor(`!!(document.getElementById('dawnCard') || {}).open`, { timeout: 15000 });
    await sleep(600);
    if (row.card) await shot(page, `n${String(night).padStart(2, '0')}-card`);
    rows.push(row);
    log(JSON.stringify(row));
    if (night < NIGHTS) {
      const pressed = await page.evaluate(`(() => { const d = document.getElementById('dawnCard'); const b = d && d.open ? [...d.querySelectorAll('button')].find(x => !x.classList.contains('primary')) : null; if (b) { b.click(); return true; } return false; })()`);
      if (!pressed) await page.evaluate('TT.hqStartWave()');
    }
  }
  log('page errors:', page.errors.length);
  for (const e of page.errors.slice(0, 6)) console.log('   ERR', e.split('\n')[0]);
} catch (e) {
  log('FAILED', e.message);
} finally {
  fs.writeFileSync(path.join(SHOTS, 'nights.json'), JSON.stringify(rows, null, 2));
  await browser.close();
  await server.close();
}
