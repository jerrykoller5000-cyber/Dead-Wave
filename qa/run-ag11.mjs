// qa/run-ag11.mjs — AG-11 Visual & Performance Verification
// Captures:
// 1. 01-megaswarm-500.png: 500 zombies in megaswarm formation with far-LOD applied
// 2. 02-day5-fight.png: Day 5 wave combat with active horde
// 3. Native rAF sampling for real frame time measurement

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-11');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-11] Starting visual verification for Megaswarm & Day 5...');

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
// Use native rAF without raf=timer for unthrottled frame measurements
const url = `${server.origin}/index.html?debug=1`;

const shotPaths = {};
const data = {
  megaswarm: null,
  day5: null
};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });

  await page.evaluate(`(() => {
    if (window.DWOpening && window.DWOpening.dismissForTesting) {
      window.DWOpening.dismissForTesting();
    }
  })()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await wait(1200);

  // 1. Megaswarm Visual & Diagnostics
  console.log('[AG-11] Step 1: Testing Megaswarm (500 zombies)...');
  const count = await page.evaluate(`TT.spawnMegaswarm(500)`);
  console.log('  [megaswarm spawned]:', count);
  await wait(1000);

  // Take screenshot of megaswarm
  const p1 = path.join(SHOTS_DIR, '01-megaswarm-500.png');
  await page.screenshot(p1);
  shotPaths.megaswarm = p1;
  console.log('  [shot 1] 01-megaswarm-500.png (' + kbOf(p1) + ' KB)');

  // Sample native rAF perf for megaswarm
  await page.evaluate('TT.resetPerf()');
  await wait(5000);
  data.megaswarm = await page.evaluate(`(() => {
    const snap = TT.perfSnapshot ? TT.perfSnapshot() : {};
    let farCount = 0, nearCount = 0;
    if (TT.zombies) {
      for (const z of TT.zombies) {
        if (!z.alive) continue;
        const d = Math.hypot(TT.camera.position.x - z.x, TT.camera.position.z - z.z);
        if (d > 40) farCount++; else nearCount++;
      }
    }
    return {
      fps: snap.fps,
      low: snap.low,
      worst: snap.worst,
      hitches: snap.hitches,
      farZombies: farCount,
      nearZombies: nearCount,
      totalZombies: TT.zombies ? TT.zombies.length : 500
    };
  })()`);
  console.log('  [megaswarm perf]:', JSON.stringify(data.megaswarm));

  // 2. Day 5 Fight
  console.log('[AG-11] Step 2: Testing Day 5 Fight...');
  await page.evaluate(`(() => {
    if (typeof TT.clearZombies === 'function') TT.clearZombies();
    const nameEl = document.getElementById('playerName');
    if (nameEl) {
      nameEl.value = 'Day5Tester';
      nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  // Wait for landing
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await wait(500);

  // Transition to Day 5
  await page.evaluate(`(() => {
    TT.setDay(4);
    TT.startPrep();
    TT.skipPrep();
  })()`);
  await wait(1500);

  // Take screenshot of Day 5 fight
  const p2 = path.join(SHOTS_DIR, '02-day5-fight.png');
  await page.screenshot(p2);
  shotPaths.day5 = p2;
  console.log('  [shot 2] 02-day5-fight.png (' + kbOf(p2) + ' KB)');

  // Sample native rAF perf for Day 5
  await page.evaluate('TT.resetPerf()');
  await wait(5000);
  data.day5 = await page.evaluate(`(() => {
    const snap = TT.perfSnapshot ? TT.perfSnapshot() : {};
    return {
      day: TT.getDay ? TT.getDay() : 5,
      phase: TT.getPhase ? TT.getPhase() : 'wave',
      fps: snap.fps,
      low: snap.low,
      worst: snap.worst,
      hitches: snap.hitches,
      aliveZombies: TT.zombies ? TT.zombies.filter(z => z.alive).length : 0
    };
  })()`);
  console.log('  [day5 perf]:', JSON.stringify(data.day5));

} finally {
  await browser.close();
  await server.close();
}

console.log('\n=======================================================');
console.log('[AG-11] Visual & Performance Verification Completed!');
console.log('Metrics:');
console.log(JSON.stringify(data, null, 2));
console.log('Screenshot Paths:');
console.log(JSON.stringify(shotPaths, null, 2));
console.log('=======================================================\n');
