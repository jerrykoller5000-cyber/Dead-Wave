// qa/AG-255/run-ag255.mjs
// AG-255: The main game's speed on the 5080, sampled where it is slow (D-120)
// Measures FPS, worst frame time, draws, tris, and PROF marks every 5 s for 60 s
// across three locations at night with a dense 40+ dead horde:
//   1. Woods Trail
//   2. Hikers' Camp
//   3. HQ Ring at the walls
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const OUT_DIR = HERE;

fs.mkdirSync(OUT_DIR, { recursive: true });

const serveMod = await import(pathToFileURL(path.join(REPO, 'tools', 'serve.mjs')).href);
const cdpMod = await import(pathToFileURL(path.join(REPO, 'tools', 'cdp.mjs')).href);
const { serve } = serveMod;
const { launch } = cdpMod;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LOCATIONS = [
  {
    id: 'woods_trail',
    name: 'Woods Trail',
    pos: { x: 18, z: -65 },
    yaw: Math.PI,
    screenshotName: 'woods-trail.png',
    description: 'Dense woods trail heading south toward hikers camp',
  },
  {
    id: 'hikers_camp',
    name: "Hikers' Camp",
    pos: { x: 22, z: -126 },
    yaw: 0.5 * Math.PI,
    screenshotName: 'hikers-camp.png',
    description: "Hikers' campsite clearing with tents, fire pit, trees",
  },
  {
    id: 'hq_ring',
    name: 'HQ Ring at Walls',
    pos: { x: 0, z: -55 },
    yaw: Math.PI,
    screenshotName: 'hq-ring.png',
    description: 'HQ perimeter ring wall facing south with horde pressing against walls',
  },
];

async function setupGame(page) {
  console.log('[AG-255] Setting up game state: High preset, First Person, Godmode, Night 7...');
  const res = await page.evaluate(`(async () => {
    const T = window.TT;
    if (!T) throw new Error('TT missing');

    // Enable Godmode
    if (T.runDevCommand) T.runDevCommand('godmode');
    if (T.setHp) T.setHp(1e6);

    // Apply High graphics preset
    if (T.applyGraphicsPreset) T.applyGraphicsPreset('high');

    // Switch to first person
    if (T.setViewFirstDbg) T.setViewFirstDbg(true);

    // Ensure HUD / Perf overlay is visible
    try { localStorage.setItem('tt_perf_hud', '1'); } catch (_) {}
    const perfEl = document.getElementById('perf');
    if (perfEl) perfEl.classList.add('on');

    // Turn on PROF profiler
    if (T.profDbg) {
      T.profDbg.on = true;
      T.profDbg.reset();
    }

    // Jump to Night 7 wave (night-6+ horde, 40+ dead)
    if (T.devJumpToNight) {
      T.devJumpToNight(7, true);
    } else if (T.runDevCommand) {
      T.runDevCommand('night 7 now');
    }

    // Setup helper to maintain 40+ active zombies
    window.__maintainHorde = function(targetCount = 45, ringWall = false) {
      const live = (T.zombies || []).filter(z => z.alive && !z.dying);
      const needed = targetCount - live.length;
      if (needed <= 0) return live.length;

      const px = T.player.position.x;
      const pz = T.player.position.z;
      const types = ['shambler', 'feral', 'military', 'leaper', 'spitter', 'brute', 'spider'];
      let made = 0;

      for (let i = 0; i < needed && i < 60; i++) {
        const tk = types[i % types.length];
        let zx, zz;
        if (ringWall) {
          // Place outside the southern wall (z between -66 and -85, x between -25 and 25)
          zx = (Math.random() - 0.5) * 45;
          zz = -66 - Math.random() * 20;
        } else {
          // Spread in 14-36m circle around player
          const ang = (i / needed) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const dist = 14 + Math.random() * 20;
          zx = px + Math.cos(ang) * dist;
          zz = pz + Math.sin(ang) * dist;
        }

        const z = T.spawnZombie(zx, zz, tk, true, true);
        if (z) {
          z.huntPlayer = true;
          made++;
        }
      }
      return (T.zombies || []).filter(z => z.alive && !z.dying).length;
    };

    window.__setPlayerSpot = function(x, z, yaw) {
      const gy = T.sampleHeight(x, z);
      T.player.position.set(x, gy, z);
      if (T.localPlayer) T.localPlayer.position.set(x, gy, z);
      T.player.rotation.y = yaw;
      if (T.setAimYawDbg) T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, 0);
      if (T.setVelDbg) T.setVelDbg(0, 0);
      if (T.rotateCamera) T.rotateCamera(0, 0);
    };

    return {
      phase: T.getPhase ? T.getPhase() : null,
      day: T.getDay ? T.getDay() : null,
      gfx: T.getGfx ? T.getGfx() : null,
      backend: T.getRendererBackend ? T.getRendererBackend() : null,
    };
  })()`);
  console.log('[AG-255] Setup completed:', JSON.stringify(res));
  return res;
}

async function runLocationTest(page, loc, totalSec = 60, sampleIntervalSec = 5) {
  console.log(`\n========================================================================`);
  console.log(`=== SAMPLING LOCATION: ${loc.name.toUpperCase()} (60 s @ 5 s interval) ===`);
  console.log(`========================================================================`);

  // Move player to location
  const isRingWall = loc.id === 'hq_ring';
  await page.evaluate(`(() => {
    window.__setPlayerSpot(${loc.pos.x}, ${loc.pos.z}, ${loc.yaw});
    window.__maintainHorde(45, ${isRingWall});
  })()`);

  // Settle time (3s)
  await wait(3000);

  // Reset counters for clean location window
  await page.evaluate(`(() => {
    const T = window.TT;
    if (T.resetPerf) T.resetPerf();
    if (T.profDbg) T.profDbg.reset();
  })()`);

  const samples = [];
  const startTime = Date.now();
  let shotTaken = false;
  let nextSampleAt = sampleIntervalSec * 1000;

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= totalSec * 1000) break;

    // Maintain horde
    await page.evaluate(`(() => {
      window.__maintainHorde(45, ${isRingWall});
    })()`);

    // Mid-point screenshot at ~30s
    if (!shotTaken && elapsed >= 30000) {
      console.log(`[AG-255] Capturing 1280x720 in-game screenshot at t=30s for ${loc.name}...`);
      const shotPath = path.join(OUT_DIR, loc.screenshotName);
      await page.screenshot(shotPath);
      console.log(`[AG-255] Saved screenshot to ${shotPath}`);
      shotTaken = true;
    }

    if (elapsed >= nextSampleAt) {
      const currentSec = Math.round(nextSampleAt / 1000);
      const sample = await page.evaluate(`(() => {
        const T = window.TT;
        const snap = (T.perfSnapshot && T.perfSnapshot()) || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
        const info = (T.renderer && T.renderer.info && T.renderer.info.render) || {};
        const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
        const tris = info.triangles != null ? info.triangles : 0;
        const perfEl = document.getElementById('perf');
        const perfText = perfEl ? perfEl.textContent : '';
        const alive = (T.zombies || []).filter(z => z.alive && !z.dying);
        const p = T.player.position;

        const profRep = (T.profDbg && T.profDbg.report()) || { frames: 0, phases: [], spikes: [] };

        // Key subsystem phase times
        const findPhase = (key) => {
          const ph = profRep.phases.find(x => x.k === key);
          return ph ? { avg: ph.avg, max: ph.max } : { avg: 0, max: 0 };
        };

        const keyCategories = {
          dead: findPhase('zombies'),
          viewGun: findPhase('viewmodel'),
          grassFoliage: {
            cull: findPhase('w:foliageCull'),
            sway: findPhase('w:treeFade+sway'),
            batches: findPhase('w:treeFall+leaves+batches'),
          },
          shadowsRender: {
            shadowLOD: findPhase('w:doors+traps+shadowLOD'),
            lightPool: findPhase('r:lightPool'),
            rigSkin: findPhase('r:rigSkin'),
            cull: findPhase('r:cull'),
            render: findPhase('r:render'),
          },
        };

        // Reset profiler for next 5s slice
        if (T.profDbg) T.profDbg.reset();

        return {
          wallSec: ${currentSec},
          fps: +snap.fps.toFixed(1),
          low: +snap.low.toFixed(1),
          worst: +snap.worst.toFixed(1),
          hitches: snap.hitches,
          frames: snap.frames,
          draws,
          tris,
          zombies: alive.length,
          perfText,
          keyCategories,
          topPhases: profRep.phases.slice(0, 8),
          spikes: profRep.spikes,
          pos: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) },
        };
      })()`);

      samples.push(sample);
      console.log(`  [${loc.name} t=${sample.wallSec}s] fps: ${sample.fps} | 1% low: ${sample.low} | worst: ${sample.worst} ms | hitches: ${sample.hitches} | draws: ${sample.draws} | tris: ${(sample.tris / 1000).toFixed(0)}k | zombs: ${sample.zombies}`);
      console.log(`    PROF top: ${sample.topPhases.slice(0, 4).map(p => `${p.k}:${p.avg.toFixed(2)}ms`).join(', ')}`);

      nextSampleAt += sampleIntervalSec * 1000;
    }

    await wait(250);
  }

  // Fallback screenshot if not taken
  if (!shotTaken) {
    const shotPath = path.join(OUT_DIR, loc.screenshotName);
    await page.screenshot(shotPath);
    console.log(`[AG-255] Saved fallback screenshot to ${shotPath}`);
  }

  // Compute summary for this location
  const validSamples = samples.filter(s => s.fps > 0);
  const fpsMean = +(validSamples.reduce((a, b) => a + b.fps, 0) / validSamples.length).toFixed(1);
  const fpsMin = Math.min(...validSamples.map(s => s.fps));
  const lowMean = +(validSamples.reduce((a, b) => a + b.low, 0) / validSamples.length).toFixed(1);
  const worstMaxMs = Math.max(...validSamples.map(s => s.worst));
  const drawsMean = Math.round(validSamples.reduce((a, b) => a + b.draws, 0) / validSamples.length);
  const trisMean = Math.round(validSamples.reduce((a, b) => a + b.tris, 0) / validSamples.length);
  const hitchesTotal = validSamples[validSamples.length - 1]?.hitches || 0;
  const zombiesMean = Math.round(validSamples.reduce((a, b) => a + b.zombies, 0) / validSamples.length);

  // Average time in key categories across all 5s samples
  const avgKeyCategory = (pathFn) => {
    const vals = validSamples.map(pathFn).filter(v => v != null);
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  const categoryAverages = {
    dead_zombies_avg_ms: avgKeyCategory(s => s.keyCategories?.dead?.avg),
    dead_zombies_max_ms: Math.max(...validSamples.map(s => s.keyCategories?.dead?.max || 0)),
    viewGun_viewmodel_avg_ms: avgKeyCategory(s => s.keyCategories?.viewGun?.avg),
    grass_foliageCull_avg_ms: avgKeyCategory(s => s.keyCategories?.grassFoliage?.cull?.avg),
    grass_treeSway_avg_ms: avgKeyCategory(s => s.keyCategories?.grassFoliage?.sway?.avg),
    grass_treeBatches_avg_ms: avgKeyCategory(s => s.keyCategories?.grassFoliage?.batches?.avg),
    shadows_shadowLOD_avg_ms: avgKeyCategory(s => s.keyCategories?.shadowsRender?.shadowLOD?.avg),
    shadows_lightPool_avg_ms: avgKeyCategory(s => s.keyCategories?.shadowsRender?.lightPool?.avg),
    render_rigSkin_avg_ms: avgKeyCategory(s => s.keyCategories?.shadowsRender?.rigSkin?.avg),
    render_cull_avg_ms: avgKeyCategory(s => s.keyCategories?.shadowsRender?.cull?.avg),
    render_mainPass_avg_ms: avgKeyCategory(s => s.keyCategories?.shadowsRender?.render?.avg),
  };

  const summary = {
    fpsMean,
    fpsMin,
    lowMean,
    worstMaxMs,
    hitchesTotal,
    drawsMean,
    trisMean,
    zombiesMean,
    categoryAverages,
  };

  console.log(`\n>>> [${loc.name} Summary] fps mean/min: ${fpsMean}/${fpsMin} | 1% low: ${lowMean} | worst max: ${worstMaxMs} ms | draws avg: ${drawsMean} | tris avg: ${(trisMean/1000).toFixed(0)}k | zombs: ${zombiesMean}`);

  return {
    loc,
    samples,
    summary,
  };
}

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-255] The main game speed on the 5080, sampled where it is slow (D-120)    ===');
  console.log('======================================================================================\n');

  const server = await serve(REPO, 0);
  const url = `${server.origin}/index.html?debug=1&hqwall=1&night=1`;
  console.log('[AG-255] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const speedData = {
    timestamp: new Date().toISOString(),
    task: 'AG-255',
    agent: 'antigravity',
    target: 'RTX 5080 desktop',
    setup: {
      resolution: '1280x720',
      gfxPreset: 'high',
      view: 'first_person',
      night: 'Night 7 wave (40+ dead horde)',
      hqwall: 1,
    },
    locations: {},
    comparison: {},
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    console.log('[AG-255] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
      throw new Error('TT never appeared');
    }

    // Dismiss intro opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });

    // Inject startMatch helper
    const libPath = path.join(REPO, 'tools', 'tests', 'lib.js');
    await page.evaluate(fs.readFileSync(libPath, 'utf8'));

    console.log('[AG-255] Starting match as JERRY...');
    await page.evaluate(`(async () => { await startMatch(window.TT, 'JERRY'); })()`, 180000);

    // Initial setup
    const hwSetup = await setupGame(page);
    speedData.hardware = hwSetup;

    // Wait for FP transition to settle
    for (let i = 0; i < 40; i++) {
      const w = await page.evaluate(`(() => (window.TT.fpDbg ? window.TT.fpDbg().w : 0))()`);
      if (w >= 0.99) break;
      await wait(100);
    }

    // Run tests across all 3 locations
    for (const loc of LOCATIONS) {
      speedData.locations[loc.id] = await runLocationTest(page, loc, 60, 5);
      await wait(1000);
    }

    // Determine slowest place
    const locSummaries = Object.entries(speedData.locations).map(([id, data]) => ({
      id,
      name: data.loc.name,
      fpsMean: data.summary.fpsMean,
      fpsMin: data.summary.fpsMin,
      lowMean: data.summary.lowMean,
      worstMaxMs: data.summary.worstMaxMs,
      drawsMean: data.summary.drawsMean,
      trisMean: data.summary.trisMean,
      zombiesMean: data.summary.zombiesMean,
      categories: data.summary.categoryAverages,
    }));

    // Ranked by slowest (lowest 1% low, lowest fpsMean, highest worstMaxMs)
    locSummaries.sort((a, b) => (a.fpsMean - b.fpsMean) || (a.lowMean - b.lowMean) || (b.worstMaxMs - a.worstMaxMs));
    const slowest = locSummaries[0];

    speedData.slowestPlace = {
      locationId: slowest.id,
      locationName: slowest.name,
      ranking: locSummaries,
    };

    // Save speed.json
    const speedJsonPath = path.join(OUT_DIR, 'speed.json');
    fs.writeFileSync(speedJsonPath, JSON.stringify(speedData, null, 2), 'utf8');
    console.log(`\n[AG-255] speed.json written to ${speedJsonPath}`);

    // Print comparative summary table
    console.log('\n======================================================================================');
    console.log('=== COMPARATIVE SPEED BENCHMARK SUMMARY (RTX 5080 · Real WebGPU · High Preset)     ===');
    console.log('======================================================================================');
    console.log('| Location | FPS Mean | FPS Min | 1% Low Mean | Worst Max (ms) | Draws Avg | Tris Avg | Dead Avg (ms) | ViewGun (ms) | Grass/Trees (ms) | Render Pass (ms) |');
    console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
    for (const loc of locSummaries) {
      const cat = loc.categories;
      const grassTotal = +(cat.grass_foliageCull_avg_ms + cat.grass_treeSway_avg_ms + cat.grass_treeBatches_avg_ms).toFixed(2);
      console.log(`| ${loc.name} | ${loc.fpsMean} | ${loc.fpsMin} | ${loc.lowMean} | ${loc.worstMaxMs} | ${loc.drawsMean} | ${(loc.trisMean/1000).toFixed(0)}k | ${cat.dead_zombies_avg_ms} | ${cat.viewGun_viewmodel_avg_ms} | ${grassTotal} | ${cat.render_mainPass_avg_ms} |`);
    }
    console.log(`\nSlowest location: ${slowest.name} (FPS Mean: ${slowest.fpsMean}, 1% Low: ${slowest.lowMean}, Worst Max: ${slowest.worstMaxMs} ms)`);

    await page.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch(err => {
  console.error('[AG-255] Fatal error:', err);
  process.exit(1);
});
