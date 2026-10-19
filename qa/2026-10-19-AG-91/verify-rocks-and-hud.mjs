import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-91');
const SHOTS_DIR = path.resolve(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });

async function bootAndStart(page, url) {
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`TT.applyGraphicsPreset('high')`);
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

try {
  const page = await browser.newPage({ width: 1280, height: 720 });

  // 1. Boot default batched mode (?debug=1)
  await bootAndStart(page, `${server.origin}/index.html?debug=1`);
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  // Find a good rock with nearby neighbours for visual comparison & shooting test
  const rockSetup = await page.evaluate(`new Promise((resolve) => {
    const rocks = TT.rocks.filter(r => r && r.alive && r.mesh && r.s >= 0.85);
    rocks.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    const r0 = rocks[0] || TT.rocks[0];
    const rx = r0.x, ry = r0.mesh.position.y, rz = r0.z;
    // Place player out of camera line-of-sight
    TT.player.position.set(rx - 4.0, TT.sampleHeight(rx - 4.0, rz), rz);
    const shotView = { x: rx + 3.2, y: ry + 1.8, z: rz + 3.2, tx: rx, ty: ry + 0.35, tz: rz, fov: 45 };
    TT.setShotView(shotView);
    const batchMeshes = TT.scene.children.filter(c => c.name === 'rock-batch');
    const batchedRocks = TT.rocks.filter(r => r && r._rb != null);
    const walkSkippedRocks = TT.rocks.filter(r => r && r.mesh && r.mesh.userData.walkSkip === true);
    const layerZeroRocks = TT.rocks.filter(r => r && r.mesh && r.mesh.layers.mask === 0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({
        totalRocks: TT.rocks.length,
        aliveRocks: TT.rocks.filter(r => r && r.alive).length,
        batchMeshCount: batchMeshes.length,
        batchedRocksCount: batchedRocks.length,
        walkSkippedCount: walkSkippedRocks.length,
        layerZeroCount: layerZeroRocks.length,
        targetRockIdx: TT.rocks.indexOf(r0),
        targetRockPos: [ +rx.toFixed(2), +ry.toFixed(2), +rz.toFixed(2) ],
        targetRockHp: r0.hp,
        shotView
      });
    }));
  })`);
  console.log('Rock batch initial state:', JSON.stringify(rockSetup));
  await page.screenshot(path.join(SHOTS_DIR, 'rocks-batched.png'));

  // 2. Shoot the target rock once to verify pulse (scale = 1.05, goes live out of batch, no double draw)
  const pulseCheck = await page.evaluate(`new Promise((resolve) => {
    const r0 = TT.rocks[${rockSetup.targetRockIdx}];
    const rx = r0.x, ry = r0.mesh.position.y, rz = r0.z;
    // Keep player off to the side (-X) so the camera at (+X, +Z) has an unobstructed view
    TT.player.position.set(rx - 4.0, TT.sampleHeight(rx - 4.0, rz), rz);
    const ox = rx - 1.5, oy = ry + r0.height * 0.5, oz = rz;
    const dx = 1, dy = 0, dz = 0;
    const hpBefore = r0.hp;
    TT.fireRoundDbg(ox, oy, oz, dx, dy, dz, 20, 60, 0);
    TT.stepProjectilesDbg(1 / 60);
    TT.setShotView(${JSON.stringify(rockSetup.shotView)});
    requestAnimationFrame(() => {
      resolve({
        hpBefore,
        hpAfterOneHit: r0.hp,
        wentLive: r0._rb === null,
        layerMaskRestored: r0.mesh.layers.mask !== 0,
        walkSkipCleared: r0.mesh.userData.walkSkip === false,
        pulseScale: Number(r0.mesh.scale.x.toFixed(4)),
        alive: r0.alive
      });
    });
  })`);
  console.log('Rock shot pulse check:', JSON.stringify(pulseCheck));
  await page.screenshot(path.join(SHOTS_DIR, 'rock-shot-pulse.png'));

  // Wait 60ms so the 40ms scale pulse settles back to 1.0, then shoot to break the rock
  await page.evaluate('new Promise(r => setTimeout(r, 70))');
  const breakCheck = await page.evaluate(`new Promise((resolve) => {
    const r0 = TT.rocks[${rockSetup.targetRockIdx}];
    const scaleAfterPulse = Number(r0.mesh.scale.x.toFixed(4));
    const rx = r0.x, ry = r0.mesh.position.y, rz = r0.z;
    const ox = rx - 1.5, oy = ry + r0.height * 0.5, oz = rz;
    const debrisBefore = TT.debris.length;
    r0.hp = 5;
    TT.fireRoundDbg(ox, oy, oz, 1, 0, 0, 40, 60, 0);
    TT.stepProjectilesDbg(1 / 60);
    TT.setShotView(${JSON.stringify(rockSetup.shotView)});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({
        scaleAfter40msPulse: scaleAfterPulse,
        aliveAfterBreak: r0.alive,
        hpAfterBreak: r0.hp,
        removedFromScene: r0.mesh.parent === null,
        debrisBefore,
        debrisAfter: TT.debris.length,
        chunksSpawned: TT.debris.length - debrisBefore
      });
    }));
  })`);
  console.log('Rock break check:', JSON.stringify(breakCheck));
  await page.screenshot(path.join(SHOTS_DIR, 'rock-shot-broken.png'));

  // 3. GP-19936 HUD pacing check on Night 20 High (while match is active)
  const hudCheck = await page.evaluate(`new Promise(async (resolve) => {
    TT.setShotView(null);
    TT.runDevCommand('godmode');

    const kx = TT.KIOSK.x, kz = TT.KIOSK.z + 1.6;
    const promptEl = document.getElementById('kioskPrompt');

    // Move far first
    TT.player.position.set(kx + 25, TT.sampleHeight(kx + 25, kz + 25), kz + 25);
    await new Promise(r => setTimeout(r, 160));
    const hiddenWhenFar = !promptEl.classList.contains('on');

    // Step into Kiosk range during prep and measure ms until #kioskPrompt has class 'on'
    const enterT0 = performance.now();
    let enterFrames = 0;
    TT.player.position.set(kx, TT.sampleHeight(kx, kz), kz);
    while (!promptEl.classList.contains('on') && performance.now() - enterT0 < 500) {
      enterFrames++;
      await new Promise(r => requestAnimationFrame(r));
    }
    const kioskEnterMs = Number((performance.now() - enterT0).toFixed(1));
    const kioskPromptTextPrep = promptEl.textContent.trim();

    // While shown, verify 60Hz screen-space tracking when player moves slightly
    const left0 = promptEl.style.left;
    TT.player.position.x += 0.35;
    await new Promise(r => requestAnimationFrame(r));
    const left1 = promptEl.style.left;
    const tracksEveryFrameWhileShown = left0 !== left1;

    // Step out of Kiosk range and measure ms until #kioskPrompt removes class 'on'
    const leaveT0 = performance.now();
    let leaveFrames = 0;
    TT.player.position.set(kx + 25, TT.sampleHeight(kx + 25, kz + 25), kz + 25);
    while (promptEl.classList.contains('on') && performance.now() - leaveT0 < 500) {
      leaveFrames++;
      await new Promise(r => requestAnimationFrame(r));
    }
    const kioskLeaveMs = Number((performance.now() - leaveT0).toFixed(1));

    // Jump to Night 20 wave and measure minimap draw rate over 1.0s + radio prompt latency
    TT.devJumpToNight(20, true);
    await new Promise(r => setTimeout(r, 600));

    const miniCanvas = document.getElementById('minimap');
    const ctx = miniCanvas ? miniCanvas.getContext('2d') : null;
    let miniDraws = 0;
    const origClear = ctx.clearRect;
    ctx.clearRect = function(...args) {
      miniDraws++;
      return origClear.apply(this, args);
    };
    const t0 = performance.now();
    await new Promise(r => setTimeout(r, 1000));
    const dtSec = (performance.now() - t0) / 1000;
    ctx.clearRect = origClear;
    const minimapHz = Number((miniDraws / dtSec).toFixed(2));

    // Test Radio cabinet prompt enter latency on Night 20
    const cab = TT.getObjectiveProps().props['objective:radio-repair'];
    const ax = cab.approach.x, ay = cab.approach.y, az = cab.approach.z;
    const radioEnterT0 = performance.now();
    let radioEnterFrames = 0;
    TT.player.position.set(ax, ay, az);
    while (!promptEl.classList.contains('on') && performance.now() - radioEnterT0 < 500) {
      radioEnterFrames++;
      await new Promise(r => requestAnimationFrame(r));
    }
    const radioEnterMs = Number((performance.now() - radioEnterT0).toFixed(1));
    const radioPromptText = promptEl.textContent.trim();

    resolve({
      minimapDrawsIn1s: miniDraws,
      minimapHz,
      hiddenWhenFar,
      kioskEnterMs,
      kioskEnterFrames: enterFrames,
      kioskPromptTextPrep,
      tracksEveryFrameWhileShown,
      kioskLeaveMs,
      kioskLeaveFrames: leaveFrames,
      radioEnterMs,
      radioEnterFrames,
      radioPromptText,
      ammoHud: document.getElementById('ammoCount') ? document.getElementById('ammoCount').textContent : null
    });
  })`);
  console.log('GP-19936 HUD check:', JSON.stringify(hudCheck));
  await page.screenshot(path.join(SHOTS_DIR, 'gp19936-hud-night20.png'));

  // 4. Restart via TT.resetGame() and verify all rocks come back and re-batch
  const restartCheck = await page.evaluate(`new Promise((resolve) => {
    TT.resetGame();
    const r0 = TT.rocks[${rockSetup.targetRockIdx}];
    TT.player.position.set(r0.x - 4.0, TT.sampleHeight(r0.x - 4.0, r0.z), r0.z);
    const batchMeshes = TT.scene.children.filter(c => c.name === 'rock-batch');
    const batchedRocks = TT.rocks.filter(r => r && r._rb != null);
    TT.setShotView(${JSON.stringify(rockSetup.shotView)});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({
        totalRocks: TT.rocks.length,
        aliveRocks: TT.rocks.filter(r => r && r.alive).length,
        batchMeshCount: batchMeshes.length,
        batchedRocksCount: batchedRocks.length,
        r0Alive: r0.alive,
        r0InScene: r0.mesh.parent === TT.scene,
        r0Rebatched: r0._rb !== null,
        r0LayerZero: r0.mesh.layers.mask === 0,
        r0WalkSkip: r0.mesh.userData.walkSkip === true
      });
    }));
  })`);
  console.log('Rock restart check:', JSON.stringify(restartCheck));
  await page.screenshot(path.join(SHOTS_DIR, 'rocks-after-restart.png'));

  // 5. Load ?debug=1&rockbatch=0 and take identical shotView for before/after comparison
  await bootAndStart(page, `${server.origin}/index.html?debug=1&rockbatch=0`);
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');
  const unbatchedState = await page.evaluate(`new Promise((resolve) => {
    const r0 = TT.rocks[${rockSetup.targetRockIdx}];
    TT.player.position.set(r0.x - 4.0, TT.sampleHeight(r0.x - 4.0, r0.z), r0.z);
    TT.setShotView(${JSON.stringify(rockSetup.shotView)});
    const batchMeshes = TT.scene.children.filter(c => c.name === 'rock-batch');
    const batchedRocks = TT.rocks.filter(r => r && r._rb != null);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({
        totalRocks: TT.rocks.length,
        batchMeshCount: batchMeshes.length,
        batchedRocksCount: batchedRocks.length
      });
    }));
  })`);
  console.log('Unbatched (?rockbatch=0) state:', JSON.stringify(unbatchedState));
  await page.screenshot(path.join(SHOTS_DIR, 'rocks-unbatched.png'));

  const resPath = path.join(OUT_DIR, 'results.json');
  const prev = JSON.parse(fs.readFileSync(resPath, 'utf8'));
  prev.rocksCheck = { rockSetup, pulseCheck, breakCheck, restartCheck, unbatchedState };
  prev.gp19936HudCheck = hudCheck;
  fs.writeFileSync(resPath, JSON.stringify(prev, null, 2));
} finally {
  await browser.close();
  await server.close();
}
