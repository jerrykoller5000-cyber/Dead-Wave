// scratch/ag296-capture-bench.mjs
// Reproducible RTX 5080 WebGPU 4-light eye strip capture + exclusive frame-time benchmark for AG-296 (J120).
// Usage (must run inside crew.mjs slot run --exclusive):
//   node <path>/ag296-capture-bench.mjs --phase before
//   node <path>/ag296-capture-bench.mjs --phase after

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-296 --exclusive ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const argv = process.argv.slice(2);
const phaseIdx = argv.indexOf('--phase');
const PHASE = phaseIdx >= 0 ? argv[phaseIdx + 1] : 'before';
if (!['before', 'after'].includes(PHASE)) {
  throw new Error(`Invalid --phase: ${PHASE}`);
}

const OUT_REV = path.join(ROOT, 'review/AG-296', PHASE);
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-296', PHASE);
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

function saveDual(name, buf) {
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  fs.writeFileSync(path.join(OUT_QA, name), buf);
}

async function shot(page, name) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  saveDual(name, buf);
  console.log(`[AG-296:${PHASE}] saved ${name} (${(buf.length / 1024).toFixed(1)} kB)`);
}

const SAMPLE_PERF = `(() => {
  const read = () => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    return { draws, triangles: info.triangles || 0 };
  };
  let best = read();
  const again = read();
  if (again.draws > best.draws) best = again;
  const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
  return Object.assign({}, snap, best);
})()`;

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function measureWindow(page, seconds, label) {
  await page.evaluate(`(() => {
    const P = TT.profDbg;
    if (P) { P.reset(); P.spikeMs = 25; P.on = true; }
    const R = TT.renderer;
    window.__pipeStart = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
    TT.resetPerf();
  })()`);
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await page.evaluate(SAMPLE_PERF);
    if (s) samples.push(s);
  }
  const prof = await page.evaluate(`(() => {
    const P = TT.profDbg;
    const R = TT.renderer;
    const pipeEnd = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
    if (!P) return null;
    const rep = P.report ? P.report() : null;
    P.on = false;
    const phases = (rep && rep.phases) || [];
    const tickMs = phases.reduce((s, p) => s + p.avg, 0);
    return {
      frames: rep ? rep.frames : 0,
      tickMs: Math.round(tickMs * 100) / 100,
      top: phases.slice(0, 8).map((p) => ({ k: p.k, avg: Math.round(p.avg * 100) / 100, max: Math.round(p.max * 100) / 100 })),
      spikes: ((rep && rep.spikes) || []).length,
      newPipelines: pipeEnd - (window.__pipeStart || 0),
      activeFlames: (TT.flameDbg?.particles?.() || []).length,
      charMarks: TT.trainingDbg?.char?.()?.count?.() ?? 0
    };
  })()`);
  const valid = samples.filter((w) => w.fps > 0);
  const use = valid.length ? valid : samples;
  const avg = (k) => Math.round((use.reduce((s, w) => s + (w[k] || 0), 0) / Math.max(1, use.length)) * 10) / 10;
  const med = (arr) => {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const last = samples.at(-1) || {};
  const res = {
    label,
    seconds,
    fps: avg('fps'),
    frameMs: avg('fps') > 0 ? Math.round((1000 / avg('fps')) * 100) / 100 : null,
    low1pct: avg('low'),
    worstMs: Math.round((last.worst || 0) * 10) / 10,
    hitches: last.hitches || 0,
    draws: Math.round(med(use.map((w) => w.draws || 0))),
    triangles: Math.round(med(use.map((w) => w.triangles || 0))),
    prof
  };
  console.log(`[AG-296:${PHASE}] BENCH ${label}:`, JSON.stringify(res));
  return res;
}

async function main() {
  console.log(`[AG-296:${PHASE}] Starting WebGPU RTX 5080 capture + bench...`);
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1280, height: 720 } });
    } catch {}

    const navT0 = Date.now();
    // Real animation frames (no raf=timer) for accurate RTX 5080 FPS / frame-time measurement
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));
    const loadReadyMs = Date.now() - navT0;

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    // Enter Training Ground on High preset
    await page.evaluate(`(() => {
      if (TT.setGfx) TT.setGfx('high');
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Trainee';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await new Promise((r) => setTimeout(r, 1500));

    // Equip flamer in first person for benchmark
    const rendererInfo = await page.evaluate(`(async () => {
      const T = window.TT;
      T.setViewFirstDbg(true);
      T.grantAllWeapons();
      T.modsOwnAllDbg();
      if (T.isUnarmed()) T.toggleHolster();
      T.flightHold(false);
      const idx = T.WEAPON_ORDER.indexOf('flamer');
      for (let i = 0; i < 25 && T.getCurrentWeapon() !== 'flamer'; i++) {
        T.setWeapon(idx);
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 900));
      const O = T.trainingDbg.tg().origin;
      T.player.position.set(O.x + 5.4, O.y, O.z - 0.25);
      T.setHp && T.setHp(1e6);
      T.setOtsAimDbg(0.08, -0.02);
      return {
        backend: T.renderer?.backend?.constructor?.name || 'unknown',
        gfx: T.getGfx ? T.getGfx() : null
      };
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Exclusive GPU Benchmark: Idle vs Active Flamethrower Stream + Char + Burn
    const idleBench = await measureWindow(page, 5, 'idle_range_1p_flamer');

    // Refill infinite ammo during fire bench and sweep across wall/floor/target 0
    await page.evaluate(`(() => {
      const T = window.TT, O = T.trainingDbg.tg().origin;
      window.__benchSweep = setInterval(() => {
        if (T.refillWeaponDbg) T.refillWeaponDbg('flamer');
        if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
        if (T.setSpareMags) T.setSpareMags('flamer', 10);
        const t = performance.now() * 0.0018;
        T.player.position.set(O.x + 5.2, O.y, O.z - 0.25);
        T.setOtsAimDbg(0.10 + Math.sin(t) * 0.22, -0.04 + Math.cos(t * 1.3) * 0.06);
      }, 40);
      T.setMouseFireDbg(true);
    })()`);
    const fireBench = await measureWindow(page, 6, 'active_flamer_stream_char_burn');
    await page.evaluate(`(() => {
      clearInterval(window.__benchSweep);
      TT.setMouseFireDbg(false);
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    // Reset Training Ground cleanly before capturing visual strips
    await page.evaluate(`(async () => {
      const D = TT.trainingDbg;
      D.leave();
      await new Promise((r) => setTimeout(r, 350));
      D.enter();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await new Promise((r) => setTimeout(r, 1200));

    // Hide HUD overlays for clean visual review strips, attach 4-light stage illuminator
    await page.evaluate(`(async () => {
      const css = document.createElement('style');
      css.id = 'ag296-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}';
      document.head.append(css);

      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.eyeLight = 'noon';

      T.setViewFirstDbg(true);
      T.grantAllWeapons();
      T.modsOwnAllDbg();
      if (T.isUnarmed()) T.toggleHolster();
      T.flightHold(false);

      function illuminate() {
        const L = window.__LIGHTS[window.eyeLight] || window.__LIGHTS['noon'];
        const p = T.player.position;
        const dir = new H.THREE.Vector3(...L.dir).normalize();
        H.sun.position.copy(p).addScaledVector(dir, 85);
        H.sun.target.position.copy(p);
        H.sun.target.updateMatrixWorld();
        H.sun.color.setHex(L.sunColor);
        H.sun.intensity = L.sun;
        H.hemi.color.setHex(L.skyColor);
        H.hemi.groundColor.setHex(L.ground);
        H.hemi.intensity = L.sky;
        H.ambientFill.intensity = L.fill;
        H.moon.intensity = window.eyeLight === 'night' ? 0.45 : 0;
        // Sync Training Ground room lights with day/night so night shows fire & flashlight glow authentically
        const tg = T.trainingDbg.tg();
        if (tg && tg.setLights) {
          const wantRoom = window.eyeLight !== 'night';
          if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
        }
      }
      H.attach({ held: () => false, scale: (dt) => dt, frame: illuminate });
    })()`);

    // Helper to wait in sim-time
    const simWait = async (sec) => {
      await page.evaluate(`(async () => {
        const s0 = TT.getSimTime(), w0 = Date.now();
        while (TT.getSimTime() - s0 < ${sec} && Date.now() - w0 < 20000) {
          if (TT.setMagAmmo) TT.setMagAmmo('flamer', 60);
          await new Promise((r) => setTimeout(r, 20));
        }
      })()`);
    };

    // =========================================================================
    // STRIP 1: Flame Stream Fidelity + Decal Sorting Against Bullet-Peppered Back Wall
    // =========================================================================
    await page.evaluate(`(async () => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      // Stamp a dense cluster of live bullet impact marks on the back wall (z=30) & floor & right wall
      // right along the sightline so any sorting defect immediately shows over the flames.
      const imp = tg.group.getObjectByName('training-impact-marks');
      for (let ix = -2.5; ix <= 4.5; ix += 0.45) {
        for (let iy = 0.7; iy <= 2.6; iy += 0.38) {
          D.round({
            prev: { x: O.x + 1.0, y: O.y + 1.5, z: O.z + 1.2 },
            pos: { x: O.x + ix, y: O.y + iy, z: O.z + 30.2 }
          });
        }
      }
      // Also stamp bullet holes on the close right wall (x = 8) at z = 2..6
      for (let iz = 1.6; iz <= 5.6; iz += 0.55) {
        for (let iy = 0.8; iy <= 2.2; iy += 0.35) {
          D.round({
            prev: { x: O.x + 4.5, y: O.y + 1.5, z: O.z + 1.2 },
            pos: { x: O.x + 8.3, y: O.y + iy, z: O.z + iz }
          });
        }
      }
      const idx = T.WEAPON_ORDER.indexOf('flamer');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'flamer'; i++) {
        T.setWeapon(idx);
        await new Promise((r) => setTimeout(r, 80));
      }
      await new Promise((r) => setTimeout(r, 900));
      T.player.position.set(O.x + 1.0, O.y, O.z - 0.25);
      T.setOtsAimDbg(0.02, -0.02);
      T.setMouseFireDbg(true);
    })()`);
    await simWait(0.95);

    for (const light of LIGHTS) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.player.position.set(O.x + 1.0, O.y, O.z - 0.25);
        T.setOtsAimDbg(0.02, -0.02);
        if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
      })()`);
      await simWait(0.18);
      await shot(page, `stream-backwall-${light}.png`);
    }
    await page.evaluate('TT.setMouseFireDbg(false)');
    await simWait(1.2);

    // =========================================================================
    // STRIP 2: Black Char Marks on Wall & Floor + Active Flame Sorting Over Bullet Holes & Char
    // =========================================================================
    await page.evaluate(`(() => {
      const T = window.TT, O = T.trainingDbg.tg().origin;
      // Stand near the right wall inside the booth / firing line and scorch the bullet-marked right wall & floor
      T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
      T.setOtsAimDbg(0.58, -0.08);
      T.setMouseFireDbg(true);
    })()`);
    // Sweep across wall and down to floor to leave rich black char trail
    for (const [yaw, pitch] of [[0.62, -0.02], [0.54, -0.10], [0.46, -0.18], [0.56, -0.05]]) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
        T.setOtsAimDbg(${yaw}, ${pitch});
        if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
      })()`);
      await simWait(0.32);
    }
    // Aim slightly beside the scorched wall patch so BOTH char marks on wall/floor AND live flames over bullet holes are visible
    for (const light of LIGHTS) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
        T.setOtsAimDbg(0.44, -0.07);
        if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
      })()`);
      await simWait(0.18);
      await shot(page, `char-marks-${light}.png`);
    }
    await page.evaluate('TT.setMouseFireDbg(false)');
    await simWait(1.2);

    // =========================================================================
    // STRIP 3: Target Burn to Pile of Ash from REAL Firing Line (z = -0.25) + Unburned Targets Still Work
    // =========================================================================
    const burnReport = await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      // Ensure targets start up
      tg.resetTargets();
      // Stand at REAL playable firing line (z = -0.25) in front of Lane 1 (x=6, z=8), angled slightly so Lane 1 & Lane 2 (x=3, z=12) are both in frame!
      T.player.position.set(O.x + 5.2, O.y, O.z - 0.25);
      // Aim straight at Lane 1 chest (x=6.0, y=1.35, z=8.0) from (5.2, 1.55, -0.25): yaw = atan2(0.8, 8.25) ≈ 0.0967, pitch ≈ -0.024
      T.setOtsAimDbg(0.097, -0.025);
      if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
      T.setMouseFireDbg(true);
      return { lane0Before: tg.targets[0].state, lane1Before: tg.targets[1].state };
    })()`);

    // Hold fire for 1.60s sim time from the real firing line (0.55s flight + 0.75s sustained contact + 0.30s into active plate burn)
    await simWait(1.60);

    // Capture active flame hitting/burning Lane 1 in noon & night
    for (const light of ['noon', 'night']) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.player.position.set(O.x + 5.2, O.y, O.z - 0.25);
        T.setOtsAimDbg(0.097, -0.025);
        if (T.setMagAmmo) T.setMagAmmo('flamer', 60);
      })()`);
      await simWait(0.15);
      await shot(page, `target-burning-${light}.png`);
    }

    // Stop firing and wait 3.4s sim time for any ignited target to burn down into settled ash pile
    await page.evaluate('TT.setMouseFireDbg(false)');
    await simWait(3.4);

    // Check whether firing from the REAL firing line actually burned Lane 1!
    // And test shooting unburned Lane 2 (targets[1]) so we verify unburned targets still free-shoot!
    const postBurnState = await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      const w0 = D.wreck()?.debug?.()?.find((x) => x.index === 0) || null;
      const lane0State = tg.targets[0].state;
      // Fire a live ballistic round into Lane 2 (targets[1], x=3, z=12) to prove unburned targets still fold!
      const t1 = tg.targets[1];
      const hitLane2 = D.round({
        prev: { x: O.x + 4.5, y: O.y + 1.55, z: O.z + 1.2 },
        pos: { x: O.x + t1.x, y: O.y + 1.35, z: O.z + t1.z + 0.5 }
      });
      return {
        burnedFromFiringLine: lane0State === 'wrecked',
        lane0State,
        wreck0: w0,
        charCount: D.char()?.count?.() ?? 0,
        lane2StateAfterShot: t1.state,
        hitLane2: !!hitLane2
      };
    })()`);
    console.log(`[AG-296:${PHASE}] Post-burn from real firing line:`, JSON.stringify(postBurnState));

    // Frame both Lane 1 (right, z=8, ash pile on stand) and Lane 2 (left-center, z=12, folding/up) from firing line in all 4 lights!
    await simWait(0.18);
    for (const light of LIGHTS) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.player.position.set(O.x + 4.8, O.y, O.z - 0.25);
        // Frame both Lane 1 (x=6, z=8) and Lane 2 (x=3, z=12) clearly at eye level
        T.setOtsAimDbg(-0.02, -0.08);
      })()`);
      await simWait(0.12);
      await shot(page, `target-ash-${light}.png`);
    }

    // Also capture close-up inspection of Lane 1's ash pile on stand (noon + night)
    // If BEFORE failed to reach Lane 1 from z=-0.25, also record a triggered burn ash close-up so we can compare ash geometry 1:1 too!
    if (!postBurnState.burnedFromFiringLine) {
      await page.evaluate(`(() => {
        const D = TT.trainingDbg, tg = D.tg(), O = tg.origin;
        D.hitDbg(0, { x: O.x + 6, y: O.y + 1.25, z: O.z + 8 }, { kind: 'burn' });
      })()`);
      await simWait(3.4);
    }
    for (const light of ['noon', 'night']) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.setShotView({ x: O.x + 5.58, y: O.y + 0.68, z: O.z + 6.85, tx: O.x + 6.0, ty: O.y + 0.28, tz: O.z + 8.0, fov: 42 });
      })()`);
      await simWait(0.12);
      await shot(page, `ash-closeup-${light}.png`);
    }
    await page.evaluate('TT.setShotView(null)');

    const summary = {
      phase: PHASE,
      capturedAt: new Date().toISOString(),
      renderer: rendererInfo,
      loadReadyMs,
      bench: {
        idle: idleBench,
        activeFire: fireBench
      },
      burnReport,
      postBurnState
    };
    const jsonStr = JSON.stringify(summary, null, 2) + '\n';
    saveDual('bench-summary.json', Buffer.from(jsonStr, 'utf8'));
    console.log(`[AG-296:${PHASE}] Complete! Summary written to review/AG-296/${PHASE}/bench-summary.json`);
  } finally {
    try { await browser.close(); } catch {}
    try { await server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
