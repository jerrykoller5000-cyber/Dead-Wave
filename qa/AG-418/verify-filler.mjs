// qa/AG-418/verify-filler.mjs — RTX 5080 WebGPU visual, 4-light, BEFORE/AFTER, perf & live interaction verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Run through the crew game-test slot: node crew/crew.mjs slot run ...');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-418', 'shots');
fs.mkdirSync(OUT_DIR, { recursive: true });

class FillerVerify extends Engine {
  async load() {
    const t0 = Date.now();
    const page = this.page;
    await page.goto(this.server.origin + '/index.html?debug=1', { waitUntil: 'none' });
    if (!await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 60000 })) {
      throw new Error('Opening unavailable: ' + JSON.stringify(page.errors));
    }
    await page.evaluate('window.DWOpening?.dismissForTesting?.()');
    if (!await page.waitFor('!!window.TT && !window.DWOpening?.active', { timeout: 100000 })) {
      throw new Error('Game ready timeout: ' + JSON.stringify(page.errors));
    }
    this.backend = await page.evaluate('TT.getRendererBackend()');
    await page.evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const T = window.TT;
      const n = document.getElementById('playerName'); if (n) n.value = 'AG-418';
      document.getElementById('modeHunt')?.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      try { T.runDevCommand('nodead'); } catch {}
      try { T.runDevCommand('godmode'); } catch {}
      try { T.clearZombies(); } catch {}
      try { if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; T.weather.rainTimeLeft = 0; } } catch {}
      return T.getPhase?.();
    })()`, 180000);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function benchFps(page, cam, frames = 40) {
  return await page.evaluate(`(async () => {
    await CamRig.aim({ cam: ${JSON.stringify(cam)}, time: 'noon', ui: false, settle: 180 });
    const t0 = performance.now();
    for (let i = 0; i < ${frames}; i++) await new Promise(r => requestAnimationFrame(r));
    const dt = (performance.now() - t0) / 1000;
    return { fps: +( ${frames} / Math.max(0.001, dt) ).toFixed(1), ms: +(dt * 1000 / ${frames}).toFixed(2) };
  })()`, 30000);
}

const cam = new FillerVerify({ onscreen: true, size: '1280x720' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-418] Backend=${cam.backend} Renderer=${cam.renderer} loadSec=${cam.loadSec.toFixed(2)}`);

  const state = await page.evaluate('TT.worldFillerDbg()');
  assert.ok(state, 'TT.worldFillerDbg() missing!');
  console.log(`[AG-418] Placed ${state.vignetteCount}/14 vignettes, totalMeshes=${state.totalMeshes}, micro=${JSON.stringify(state.microCounts)}`);

  // Helper: pick a clear camera angle looking at a vignette from 3/4 front-right, clear of tree trunks
  async function camForVignette(v, dist = 5.2, lift = 2.1, yawOff = 0.45) {
    return await page.evaluate(`(() => {
      const T = window.TT;
      const v = ${JSON.stringify(v)};
      const trees = (T.trees || []).filter(t => t && t.alive);
      let best = null, bestSc = -1e9;
      for (let k = 0; k < 12; k++) {
        const a = v.yaw + ${yawOff} + k * (Math.PI * 2 / 12);
        const cx = v.x + Math.sin(a) * ${dist};
        const cz = v.z + Math.cos(a) * ${dist};
        const cy = Math.max(T.sampleHeight(cx, cz), v.y) + ${lift};
        let sc = (k === 0 ? 5 : 0);
        for (const tr of trees) {
          const d = Math.hypot(tr.x - cx, tr.z - cz);
          if (d < 2.8) sc -= (2.8 - d) * 12;
          // Check sightline midpoint
          const mx = (cx + v.x) * 0.5, mz = (cz + v.z) * 0.5;
          const dm = Math.hypot(tr.x - mx, tr.z - mz);
          if (dm < 2.2) sc -= (2.2 - dm) * 10;
        }
        if (sc > bestSc) { bestSc = sc; best = { x: cx, y: cy, z: cz, tx: v.x, ty: v.y + 0.72, tz: v.z, fov: 46 }; }
      }
      return best;
    })()`);
  }

  async function snap(name, camSpec, { time = 'noon', rain = 0, ui = false, visible = true, settle = 220 } = {}) {
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.worldFillerDbg().setVisible(${visible});
      if (T.weather) {
        T.weather.raining = ${rain > 0};
        T.weather.intensity = ${rain};
        T.weather.rainTimeLeft = ${rain > 0 ? 120 : 0};
      }
      await CamRig.aim({ cam: ${JSON.stringify(camSpec)}, time: ${JSON.stringify(time)}, ui: ${ui}, settle: ${settle} });
    })()`, 30000);
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot(outPath);
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  shot ${name}.png (${kb} KB)`);
    return outPath;
  }

  const byId = Object.fromEntries(state.vignettes.map(v => [v.id, v]));

  // 1. Pixel-identical BEFORE vs AFTER pairs at 4 showcase sites
  const pairIds = ['drop-rig', 'trail-shelter', 'stone-well-spring', 'ore-cart-spur'];
  const pairCams = {};
  for (const id of pairIds) {
    if (!byId[id]) continue;
    pairCams[id] = await camForVignette(byId[id], 5.6, 2.2, 0.35);
    await snap(`before-${id}`, pairCams[id], { time: 'noon', visible: false });
    await snap(`after-${id}`, pairCams[id], { time: 'noon', visible: true });
  }

  // 2. Remaining vignettes & FOUR LIGHTING CONDITIONS (noon, overcast/rain, dusk, night)
  const tour = [
    ['02-listening-post-noon', 'listening-post', 'noon', 0, 5.2, 2.0],
    ['03-signal-spool-noon', 'signal-spool', 'noon', 0, 5.0, 2.0],
    ['04-river-sluice-noon', 'river-sluice', 'noon', 0, 5.2, 2.1],
    ['05-trapper-line-noon', 'trapper-line', 'noon', 0, 5.4, 2.1],
    ['06-shore-skiff-noon', 'shore-skiff', 'noon', 0, 5.8, 2.2],
    ['07-hiker-overlook-noon', 'hiker-overlook', 'noon', 0, 5.2, 2.1],
    ['08-logging-bench-noon', 'logging-bench', 'noon', 0, 5.4, 2.1],
    ['09-cairn-benchmark-noon', 'cairn-benchmark', 'noon', 0, 4.8, 1.9],
    ['10-snagged-airdrop-dusk', 'snagged-airdrop', 'dusk', 0, 5.2, 2.0],
    ['12-trail-shelter-night', 'trail-shelter', 'night', 0, 5.4, 2.1],
    ['13-roadblock-overcast', 'roadblock-post', 'afternoon', 0.65, 5.6, 2.1],
    ['14-stone-well-dusk', 'stone-well-spring', 'dusk', 0, 5.4, 2.1],
  ];
  for (const [label, id, time, rain, dist, lift] of tour) {
    if (!byId[id]) continue;
    const c = await camForVignette(byId[id], dist, lift, 0.4);
    await snap(label, c, { time, rain, visible: true });
  }

  // 3. Live gameplay interaction check (stand at drop-rig, loot it, verify cash/ammo/lid/banner/note, capture with UI!)
  const interactionReport = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const T = window.TT;
    const v = T.worldFillerDbg().vignettes.find(x => x.id === 'drop-rig');
    const bankBefore = T.getBank();
    // Place player right beside drop-rig anchor
    T.player.position.set(v.anchor.x + 1.1, T.sampleHeight(v.anchor.x + 1.1, v.anchor.z + 0.8), v.anchor.z + 0.8);
    await wait(250);
    const used = T.worldFillerDbg().useHere();
    await wait(600); // let hinged lid swing open
    const bankAfter = T.getBank();
    const banner = T.bigBannerText ? T.bigBannerText() : '';
    const noteEl = document.getElementById('propNoteCard');
    const noteText = noteEl && !noteEl.hidden ? noteEl.textContent : '';
    const lootedCount = T.worldFillerDbg().lootedCount;
    return { used, bankBefore, bankAfter, cashDelta: bankAfter - bankBefore, banner, noteText, lootedCount };
  })()`, 20000);
  console.log('[AG-418] Live interaction:', JSON.stringify(interactionReport));
  if (byId['drop-rig']) {
    const openCam = await camForVignette(byId['drop-rig'], 4.2, 1.8, 0.35);
    await snap('16-drop-rig-looted-ui', openCam, { time: 'noon', ui: true, visible: true, settle: 120 });
  }

  // 4. FPS impact check (filler OFF vs ON at trail-shelter)
  const shelterCam = pairCams['trail-shelter'] || (await camForVignette(state.vignettes[0], 5.6, 2.2, 0.35));
  await page.evaluate('TT.worldFillerDbg().setVisible(false)');
  const fpsOff = await benchFps(page, shelterCam, 36);
  await page.evaluate('TT.worldFillerDbg().setVisible(true)');
  const fpsOn = await benchFps(page, shelterCam, 36);
  console.log(`[AG-418] Perf at shelter: OFF=${fpsOff.fps} FPS (${fpsOff.ms} ms) | ON=${fpsOn.fps} FPS (${fpsOn.ms} ms)`);

  // 5. Verify Training auto-hide & resetGame() restore
  const lifecycle = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const T = window.TT;
    T.trainingDbg.enter();
    await wait(350);
    const visInTraining = T.worldFillerDbg().visible;
    T.trainingDbg.leave();
    await wait(350);
    const visBackInValley = T.worldFillerDbg().visible;
    T.resetGame();
    await wait(250);
    const afterResetLooted = T.worldFillerDbg().lootedCount;
    return { visInTraining, visBackInValley, afterResetLooted };
  })()`, 30000);
  console.log('[AG-418] Lifecycle:', JSON.stringify(lifecycle));

  const report = {
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors,
    state,
    interactionReport,
    perf: { fpsOff, fpsOn },
    lifecycle,
  };
  fs.writeFileSync(path.join(ROOT, 'qa', 'AG-418', 'verify-report.json'), JSON.stringify(report, null, 2));
  assert.equal(page.errors.length, 0, 'Unexpected page errors: ' + JSON.stringify(page.errors));
  assert.equal(state.vignetteCount, 14, `Expected 14/14 vignettes placed, got ${state.vignetteCount}`);
  assert.equal(interactionReport.used, true, 'drop-rig interaction failed');
  assert.ok(interactionReport.cashDelta >= 30, `Expected cash payout >= $30, got ${interactionReport.cashDelta}`);
  assert.equal(lifecycle.visInTraining, false, 'world-filler leaked into Training Ground!');
  assert.equal(lifecycle.visBackInValley, true, 'world-filler did not restore after Training');
  assert.equal(lifecycle.afterResetLooted, 0, 'resetGame() did not reset world-filler');
  console.log('[AG-418] ALL LIVE CHECKS PASSED!');
} finally {
  await cam.close();
}
