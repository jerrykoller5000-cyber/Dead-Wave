// qa/run-ag9c.mjs -- AG-9c Build bench verification after CU-19 fix
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-9c');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-9c] Starting AG-9c Build Benchmark Verification...');

// 1. Captured raw output from node tools/bench.mjs --scenario build --headless
const benchOutput = `bench: scenario build for 30s
bench: placed 1 walls
fps    0.0   (mean of last 10 s)
low    0.0   (1% low, same windows)
worst  0.0 ms
hitch  16   (frames over 50 ms, whole run)`;
console.log('[AG-9c] Captured tools/bench.mjs raw output:\n' + benchOutput);

// 2. Instrumented visual run to inspect placed walls, capture screenshots, and measure frame times
console.log('\n[AG-9c] Launching visual verification session (headless via CDP)...');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1`;

const shotPaths = {};
const results = {
  benchOutput,
  wallsPlaced: 0,
  buildsTotal: 0,
  perf: null,
  diagnostics: []
};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });

  // Dismiss opening splash for testing
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof window.DWOpening.dismissForTesting === 'function') {
      window.DWOpening.dismissForTesting();
    }
  })()`);
  await page.waitFor('!!window.TT && !!window.TT.player', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  // Start match
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'BenchQAC';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  console.log('  [match] Waiting for prep phase...');
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  console.log('  [match] Waiting for marine to land...');
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  console.log('  [match] Marine has landed.');
  await wait(500);

  // Execute build scenario placement and inspect dragPlan
  console.log('  [build] Inspecting build placement and drag plan...');
  const buildInfo = await page.evaluate(`(() => {
    TT.unlockAllBuilds();
    TT.addCash(100000);
    const p = TT.player.position;
    const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
    TT.setPlaceMode('wall');
    const c = TT.camera.position;
    const tz = TT.gridCentre(gz + 3);

    const aim = (gxCell) => {
      const tx = TT.gridCentre(gxCell);
      const ty = TT.sampleHeight(tx, tz);
      TT.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
    };

    aim(gx - 4);
    TT.beginPlaceClick();
    aim(gx + 5);
    TT.updateGhostPreview();

    const plan = TT.dragPlanNow ? TT.dragPlanNow() : null;
    const drag = TT.getBuildDrag ? TT.getBuildDrag() : null;
    const before = TT.builds.length;
    TT.commitBuildDrag();
    const placed = TT.builds.length - before;

    return {
      gx, gz,
      drag: drag ? { gx: drag.gx, gz: drag.gz, edge: drag.edge } : null,
      plan,
      placed,
      totalBuilds: TT.builds.length
    };
  })()`);

  console.log('  [build info]:', JSON.stringify(buildInfo));
  results.wallsPlaced = buildInfo.placed;
  results.buildsTotal = buildInfo.totalBuilds;

  // Frame 1: Build scene overview
  const p1 = path.join(SHOTS_DIR, '01-build-scenario-overview.png');
  await page.screenshot(p1);
  shotPaths.overview = p1;
  console.log('  [shot 1] 01-build-scenario-overview.png (' + kbOf(p1) + ' KB)');

  // Position camera closer to inspect the placed wall structure
  await page.evaluate(`(() => {
    const p = TT.player.position;
    TT.camera.position.set(p.x, p.y + 4.0, p.z + 7.0);
    TT.camera.lookAt(p.x, p.y + 1.2, p.z);
  })()`);
  await wait(300);

  // Frame 2: Close-up of placed build piece(s)
  const p2 = path.join(SHOTS_DIR, '02-placed-walls-close.png');
  await page.screenshot(p2);
  shotPaths.close = p2;
  console.log('  [shot 2] 02-placed-walls-close.png (' + kbOf(p2) + ' KB)');

  // Frame 3: Overhead inspection of grid placement
  await page.evaluate(`(() => {
    const p = TT.player.position;
    TT.camera.position.set(p.x, p.y + 14.0, p.z);
    TT.camera.lookAt(p.x, p.y, p.z + 3.0);
  })()`);
  await wait(300);

  const p3 = path.join(SHOTS_DIR, '03-placed-walls-overhead.png');
  await page.screenshot(p3);
  shotPaths.overhead = p3;
  console.log('  [shot 3] 03-placed-walls-overhead.png (' + kbOf(p3) + ' KB)');

  // Collect live performance metrics over 10 seconds
  console.log('  [perf] Sampling frame metrics for 10 seconds...');
  await page.evaluate('TT.resetPerf()');
  const snaps = [];
  for (let s = 0; s < 10; s++) {
    await wait(1000);
    const snap = await page.evaluate('TT.perfSnapshot()');
    if (snap) snaps.push(snap);
  }
  const lastSnap = snaps.at(-1) || { fps: 0, low: 0, worst: 0, hitches: 0 };
  results.perf = lastSnap;
  console.log('  [perf summary]:', JSON.stringify(lastSnap));

} finally {
  await browser.close();
  await server.close();
}

console.log('\n=======================================================');
console.log('[AG-9c] Build Bench Verification Completed!');
console.log('Results:');
console.log(JSON.stringify(results, null, 2));
console.log('Screenshot Paths:');
console.log(JSON.stringify(shotPaths, null, 2));
console.log('=======================================================\n');
