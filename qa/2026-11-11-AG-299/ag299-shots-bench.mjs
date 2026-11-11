// qa/2026-11-11-AG-299/ag299-shots-bench.mjs
// Reproducible RTX 5080 WebGPU 4-light capture (exact 08:33Z AG-296 Eye + Side + Splash + Char + Burn-to-Ash cameras,
// strictly offscreen at -3800,-3800 while Jerry sleeps) + Exclusive 5080 real-rAF Benchmark for AG-299.
//
// Usage:
//   node crew/crew.mjs slot run antigravity AG-299 --checks "AG-299 4-light eye+side+char+ash shots" -- node qa/2026-11-11-AG-299/ag299-shots-bench.mjs --shots
//   node crew/crew.mjs slot run antigravity AG-299 --exclusive --checks "AG-299 5080 exclusive bench" -- node qa/2026-11-11-AG-299/ag299-shots-bench.mjs --bench

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-299 ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const argv = process.argv.slice(2);
const BENCH_MODE = argv.includes('--bench');
const SHOTS_MODE = argv.includes('--shots') || !BENCH_MODE;

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

const OUT_REV = path.join(ROOT, 'review/AG-299');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-299');
fs.mkdirSync(path.join(OUT_REV, 'after'), { recursive: true });
fs.mkdirSync(path.join(OUT_QA, 'after'), { recursive: true });

async function writeRetry(fp, buf) {
  const tmp = `${fp}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  for (let a = 0; a < 25; a++) {
    try {
      await fs.promises.writeFile(tmp, buf);
      try { await fs.promises.unlink(fp); } catch (_) {}
      await fs.promises.rename(tmp, fp);
      return;
    } catch (e) {
      try { await fs.promises.unlink(tmp); } catch (_) {}
      if (a === 24) throw e;
      await new Promise((r) => setTimeout(r, 150 + a * 120));
    }
  }
}

async function saveDual(relPath, buf) {
  await writeRetry(path.join(OUT_REV, relPath), buf);
  await writeRetry(path.join(OUT_QA, relPath), buf);
}

async function moveWindowOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

async function runBench() {
  const SAMPLE_PERF = `(() => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
    let flameBatches = 0;
    TT.scene.traverse((o) => { if (o.isInstancedMesh && o.name === 'flames-instanced' && o.visible) flameBatches++; });
    return Object.assign({}, snap, { draws, triangles: info.triangles || 0, flameBatches });
  })()`;

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
      const parts = TT.flameDbg?.particles?.() || [];
      const O = TT.trainingDbg?.tg?.()?.origin || { z: -640 };
      const maxRelZ = parts.reduce((m, p) => Math.max(m, p.z - O.z), 0);
      let visFlameStageBatches = 0, visEmberBatch = 0, visBurnBatch = 0;
      TT.scene.traverse((o) => {
        if (!o.isInstancedMesh || !o.visible) return;
        if (o.name === 'flames-instanced') visFlameStageBatches++;
        else if (o.name === 'motes-instanced' && o.renderOrder === 4) visEmberBatch++;
        else if (o.name === 'training-burn-flames') visBurnBatch++;
      });
      return {
        frames: rep ? rep.frames : 0,
        tickMs: Math.round(tickMs * 100) / 100,
        top: phases.slice(0, 8).map((p) => ({ k: p.k, avg: Math.round(p.avg * 100) / 100, max: Math.round(p.max * 100) / 100 })),
        spikes: ((rep && rep.spikes) || []).length,
        newPipelines: pipeEnd - (window.__pipeStart || 0),
        activeFlames: parts.length,
        visFlameStageBatches,
        visEmberBatch,
        visBurnBatch,
        maxStreamReachM: Math.round(maxRelZ * 100) / 100,
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
      label, seconds,
      fps: avg('fps'),
      frameMs: avg('fps') > 0 ? Math.round((1000 / avg('fps')) * 100) / 100 : null,
      low1pct: avg('low'),
      worstMs: Math.round((last.worst || 0) * 10) / 10,
      hitches: last.hitches || 0,
      draws: Math.round(med(use.map((w) => w.draws || 0))),
      triangles: Math.round(med(use.map((w) => w.triangles || 0))),
      flameBatches: Math.round(med(use.map((w) => w.flameBatches || 0))),
      prof
    };
    console.log(`[AG-299:bench] ${label}:`, JSON.stringify(res));
    return res;
  }

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveWindowOffscreen(page);
    const tLoad0 = Date.now();
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    await moveWindowOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    const loadReadyMs = Date.now() - tLoad0;

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Trainee';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await new Promise((r) => setTimeout(r, 1500));

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
      T.player.position.set(O.x + 5.62, O.y, O.z - 0.25);
      T.setHp && T.setHp(1e6);
      T.setOtsAimDbg(0.0, 0.024);
      return { backend: T.renderer?.backend?.constructor?.name || 'unknown', gfx: T.getGfx ? T.getGfx() : null };
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    const idleBench = await measureWindow(page, 5, 'idle_range_1p_flamer');

    await page.evaluate(`(() => {
      const T = window.TT, O = T.trainingDbg.tg().origin;
      window.__benchSweep = setInterval(() => {
        T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
        if (T.getAmmo) T.getAmmo().flamer = 80;
        const t = performance.now() * 0.0014;
        T.player.position.set(O.x + 5.62, O.y, O.z - 0.25);
        T.setOtsAimDbg(Math.sin(t) * 0.08, 0.022 + Math.cos(t * 1.1) * 0.025);
      }, 40);
      T.setMouseFireDbg(true);
    })()`);
    const fireBench = await measureWindow(page, 6, 'active_flamer_rope_30m_fireball_char_burn');
    await page.evaluate(`(() => { clearInterval(window.__benchSweep); TT.setMouseFireDbg(false); })()`);

    let beforeRef = null;
    try {
      beforeRef = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/AG-296/after-rope/bench-summary.json'), 'utf8'));
    } catch (_) {}

    const summary = {
      card: 'AG-299',
      capturedAt: new Date().toISOString(),
      renderer: rendererInfo,
      loadReadyMs,
      before_0833Z_accepted: beforeRef ? {
        idleDraws: beforeRef.bench.idle.draws,
        firingDraws: beforeRef.bench.activeFire.draws,
        addedDraws: beforeRef.bench.activeFire.draws - beforeRef.bench.idle.draws,
        idleTickMs: beforeRef.bench.idle.prof.tickMs,
        firingTickMs: beforeRef.bench.activeFire.prof.tickMs,
        addedTickMs: +(beforeRef.bench.activeFire.prof.tickMs - beforeRef.bench.idle.prof.tickMs).toFixed(2),
        firing1pctLow: beforeRef.bench.activeFire.low1pct,
        firingFps: beforeRef.bench.activeFire.fps,
        newPipelines: beforeRef.bench.activeFire.prof.newPipelines
      } : null,
      after_AG299_instanced: {
        idleDraws: idleBench.draws,
        firingDraws: fireBench.draws,
        addedDraws: fireBench.draws - idleBench.draws,
        idleTickMs: idleBench.prof.tickMs,
        firingTickMs: fireBench.prof.tickMs,
        addedTickMs: +(fireBench.prof.tickMs - idleBench.prof.tickMs).toFixed(2),
        firing1pctLow: fireBench.low1pct,
        firingFps: fireBench.fps,
        newPipelines: fireBench.prof.newPipelines
      },
      bench: { idle: idleBench, activeFire: fireBench }
    };
    const json = Buffer.from(JSON.stringify(summary, null, 2));
    await saveDual('bench-5080.json', json);
    console.log('[AG-299:bench] Saved bench-5080.json:', JSON.stringify(summary.after_AG299_instanced));
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runShots() {
  const shot = async (page, name) => {
    const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const buf = Buffer.from(res.data, 'base64');
    await saveDual(`after/${name}`, buf);
    console.log(`[AG-299:shots] saved after/${name} (${(buf.length / 1024).toFixed(1)} kB)`);
  };

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveWindowOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await moveWindowOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Trainee';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Equip flamer, attach 4-light stage illuminator, hide HUD (exact 08:33Z AG-296 setup)
    await page.evaluate(`(async () => {
      const css = document.createElement('style');
      css.id = 'ag299-clean-view';
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
      T.flightHold(true);
      const idx = T.WEAPON_ORDER.indexOf('flamer');
      T.setWeapon(idx);
      for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);

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
        const tg = T.trainingDbg.tg();
        if (tg && tg.setLights) {
          const wantRoom = window.eyeLight !== 'night';
          if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
        }
      }
      window.__holdRender = false;
      H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: illuminate });
    })()`);

    // Stamp deterministic bullet holes across the back wall (z = 30, x = 3.2..7.4)
    await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      for (let ix = 3.2; ix <= 7.4; ix += 0.42) {
        for (let iy = 0.55; iy <= 2.95; iy += 0.36) {
          D.round({
            prev: { x: O.x + 5.62, y: O.y + 1.4, z: O.z + 2.0 },
            pos: { x: O.x + ix, y: O.y + iy, z: O.z + 30.2 }
          });
        }
      }
    })()`);

    const SIDE_CAM = `{
      x: O.x - 7.25, y: tg.floorY + 1.95, z: O.z + 11.2,
      tx: O.x + 5.62, ty: tg.floorY + 1.35, tz: O.z + 12.5,
      fov: 78
    }`;

    const readRenderDraws = async () => page.evaluate(`(() => {
      const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
      const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
      let flameBatches = 0, emberBatches = 0, burnBatches = 0;
      TT.scene.traverse((o) => {
        if (!o.isInstancedMesh || !o.visible) return;
        if (o.name === 'flames-instanced') flameBatches++;
        else if (o.name === 'motes-instanced' && o.renderOrder === 4) emberBatches++;
        else if (o.name === 'training-burn-flames') burnBatches++;
      });
      return { draws, triangles: info.triangles || 0, flameBatches, emberBatches, burnBatches };
    })()`);

    const presentAndShot = async (name) => {
      await new Promise((r) => setTimeout(r, 65));
      const d = await readRenderDraws();
      await shot(page, name);
      return d;
    };

    const metrics = {};

    // PART 1: Exact 08:33Z Eye & Side 1.0s and 2.0s across 4 lights
    for (const light of LIGHTS) {
      await page.evaluate(`(() => {
        const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
        window.eyeLight = ${JSON.stringify(light)};
        window.__holdRender = false;
        T.flightHold(true);
        T.setMouseFireDbg(false);
        T.setShotView(null);
        T.flameDbg?.clear?.();
        T.flameDbg?.resetHeat?.();
        D.char?.()?.clear?.();
        tg.resetTargets();
        D.wreck?.()?.reset?.();
        T.setViewFirstDbg(true);
        const vm = T.viewmodelDbg?.();
        if (vm) { vm.root.visible = true; for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = true; }
        T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
        if (T.getAmmo) T.getAmmo().flamer = 80;
        T.player.position.set(O.x + 5.62, O.y, O.z - 0.25);
        T.setAimYawDbg(0);
        T.setAimTargetDbg?.(O.x + 5.62, O.z + 30.0);
        T.setOtsAimDbg(0.0, 0.024);
        for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
        window.__holdRender = true;
      })()`);
      await new Promise((r) => setTimeout(r, 50));
      const idleDrawInfo = await readRenderDraws();

      const stat1 = await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.__holdRender = false;
        T.flightHold(true);
        T.setShotView(null);
        T.setViewFirstDbg(true);
        T.setMouseFireDbg(true);
        for (let i = 0; i < 60; i++) {
          T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
          if (T.getAmmo) T.getAmmo().flamer = 80;
          T.player.position.set(O.x + 5.62, O.y, O.z - 0.25);
          T.setOtsAimDbg(0.0, 0.024);
          T.stepFrame(1 / 60);
        }
        window.__holdRender = true;
        T.flightHold(false);
        const parts = T.flameDbg.particles();
        const maxZ = parts.reduce((m, p) => Math.max(m, p.z - O.z), 0);
        const minZ = parts.reduce((m, p) => Math.min(m, p.z - O.z), 999);
        const splashed = parts.filter((p) => p.grounded || p.splashed).length;
        return { count: parts.length, minRelZ: Math.round(minZ * 100) / 100, maxRelZ: Math.round(maxZ * 100) / 100, splashed, target0Burned: !!T.trainingDbg.tg().targets[0]?.burned };
      })()`);
      const eye1Draws = await presentAndShot(`eye-1s-${light}.png`);

      await page.evaluate(`(() => {
        const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin, vm = T.viewmodelDbg?.();
        if (vm) {
          vm.root.visible = false;
          for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = false;
        }
        const flare = T.weaponMeshes?.flamer?.userData?.flare;
        if (flare) flare.visible = true;
        T.setShotView(${SIDE_CAM});
      })()`);
      const side1Draws = await presentAndShot(`side-1s-${light}.png`);

      const stat2 = await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin, vm = T.viewmodelDbg?.();
        T.setShotView(null);
        if (vm) {
          vm.root.visible = true;
          for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = true;
        }
        const flare = T.weaponMeshes?.flamer?.userData?.flare;
        if (flare) flare.visible = false;
        window.__holdRender = false;
        T.flightHold(true);
        T.setMouseFireDbg(true);
        for (let i = 0; i < 60; i++) {
          T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
          if (T.getAmmo) T.getAmmo().flamer = 80;
          T.player.position.set(O.x + 5.62, O.y, O.z - 0.25);
          T.setOtsAimDbg(0.0, 0.024);
          T.stepFrame(1 / 60);
        }
        window.__holdRender = true;
        T.flightHold(false);
        const parts = T.flameDbg.particles();
        const maxZ = parts.reduce((m, p) => Math.max(m, p.z - O.z), 0);
        const minZ = parts.reduce((m, p) => Math.min(m, p.z - O.z), 999);
        const splashed = parts.filter((p) => p.grounded || p.splashed).length;
        return { count: parts.length, minRelZ: Math.round(minZ * 100) / 100, maxRelZ: Math.round(maxZ * 100) / 100, splashed, target0Burned: !!T.trainingDbg.tg().targets[0]?.burned };
      })()`);
      const eye2Draws = await presentAndShot(`eye-2s-${light}.png`);

      await page.evaluate(`(() => {
        const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin, vm = T.viewmodelDbg?.();
        if (vm) {
          vm.root.visible = false;
          for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = false;
        }
        const flare = T.weaponMeshes?.flamer?.userData?.flare;
        if (flare) flare.visible = true;
        T.setShotView(${SIDE_CAM});
      })()`);
      const side2Draws = await presentAndShot(`side-2s-${light}.png`);

      metrics[light] = {
        idleDraws: idleDrawInfo.draws,
        s1: Object.assign({}, stat1, eye1Draws, { addedDraws: eye1Draws.draws - idleDrawInfo.draws }),
        s2: Object.assign({}, stat2, eye2Draws, { addedDraws: eye2Draws.draws - idleDrawInfo.draws }),
        side1: Object.assign({}, stat1, side1Draws),
        side2: Object.assign({}, stat2, side2Draws)
      };
      console.log(`[AG-299:shots] ${light} stats:`, JSON.stringify(metrics[light]));
    }

    // PART 2: Exact 0.57s direct center-of-mass splash on standing 8m target (Noon & Night, Eye + Side)
    for (const light of ['noon', 'night']) {
      await page.evaluate(`(() => {
        const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin, vm = T.viewmodelDbg?.();
        window.eyeLight = ${JSON.stringify(light)};
        window.__holdRender = false;
        T.flightHold(true);
        T.setMouseFireDbg(false);
        T.setShotView(null);
        if (vm) {
          vm.root.visible = true;
          for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = true;
        }
        T.flameDbg?.clear?.();
        T.flameDbg?.resetHeat?.();
        D.char?.()?.clear?.();
        tg.resetTargets();
        D.wreck?.()?.reset?.();
        T.setViewFirstDbg(true);
        T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
        if (T.getAmmo) T.getAmmo().flamer = 80;
        T.player.position.set(O.x + 6.0, O.y, O.z - 0.25);
        T.setAimYawDbg(0);
        T.setAimTargetDbg?.(O.x + 6.0, O.z + 8.0);
        T.setOtsAimDbg(0.0, 0.015);
        for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(true);
        for (let i = 0; i < 34; i++) {
          T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
          if (T.getAmmo) T.getAmmo().flamer = 80;
          T.player.position.set(O.x + 6.0, O.y, O.z - 0.25);
          T.setOtsAimDbg(0.0, 0.015);
          T.stepFrame(1 / 60);
        }
        window.__holdRender = true;
        T.flightHold(false);
      })()`);
      await presentAndShot(`target8m-eye-${light}.png`);

      await page.evaluate(`(() => {
        const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin, vm = T.viewmodelDbg?.();
        if (vm) {
          vm.root.visible = false;
          for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = false;
        }
        const flare = T.weaponMeshes?.flamer?.userData?.flare;
        if (flare) flare.visible = true;
        T.setShotView(${SIDE_CAM});
      })()`);
      await presentAndShot(`target8m-side-${light}.png`);
    }

    // PART 3: Exact Char Marks + Decal Sort (4 lights) & Target Burn -> Ash Pile (4 lights + closeup)
    await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin, vm = T.viewmodelDbg?.();
      window.__holdRender = false;
      T.setShotView(null);
      if (vm) {
        vm.root.visible = true;
        for (const o of vm.hidden) if (o.userData) o.userData.vmEyeHide = true;
      }
      const flare = T.weaponMeshes?.flamer?.userData?.flare;
      if (flare) flare.visible = false;
      T.flameDbg?.clear?.();
      T.flameDbg?.resetHeat?.();
      D.char?.()?.clear?.();
      tg.resetTargets();
      D.wreck?.()?.reset?.();
      // Bullet holes on close right wall (x = 8, z = 1.6..5.6) to prove renderOrder 1 < 3
      for (let iz = 1.6; iz <= 5.6; iz += 0.55) {
        for (let iy = 0.8; iy <= 2.2; iy += 0.35) {
          D.round({
            prev: { x: O.x + 4.5, y: O.y + 1.5, z: O.z + 1.2 },
            pos: { x: O.x + 8.3, y: O.y + iy, z: O.z + iz }
          });
        }
      }
      T.flightHold(true);
      T.setViewFirstDbg(true);
      T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
      T.setOtsAimDbg(0.58, -0.08);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      T.setMouseFireDbg(true);
      for (const [yaw, pitch] of [[0.62, -0.02], [0.54, -0.10], [0.46, -0.18], [0.56, -0.05]]) {
        for (let i = 0; i < 20; i++) {
          T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
          if (T.getAmmo) T.getAmmo().flamer = 80;
          T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
          T.setOtsAimDbg(yaw, pitch);
          T.stepFrame(1 / 60);
        }
      }
      for (let i = 0; i < 12; i++) {
        T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
        if (T.getAmmo) T.getAmmo().flamer = 80;
        T.player.position.set(O.x + 4.8, O.y, O.z - 0.35);
        T.setOtsAimDbg(0.44, -0.07);
        T.stepFrame(1 / 60);
      }
      window.__holdRender = true;
      T.flightHold(false);
    })()`);
    for (const light of LIGHTS) {
      await page.evaluate(`window.eyeLight = ${JSON.stringify(light)}`);
      await presentAndShot(`char-marks-${light}.png`);
    }

    // Target burning -> ash pile across 4 lights + closeup
    await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      window.__holdRender = false;
      T.setMouseFireDbg(false);
      T.flameDbg?.clear?.();
      T.flameDbg?.resetHeat?.();
      tg.resetTargets();
      D.wreck?.()?.reset?.();
      T.flightHold(true);
      T.player.position.set(O.x + 5.2, O.y, O.z - 0.25);
      T.setOtsAimDbg(0.097, -0.025);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      T.setMouseFireDbg(true);
      for (let i = 0; i < 96; i++) {
        T.setMagazinesDbg?.('flamer', 80, [80, 80, 80, 80]);
        if (T.getAmmo) T.getAmmo().flamer = 80;
        T.player.position.set(O.x + 5.2, O.y, O.z - 0.25);
        T.setOtsAimDbg(0.097, -0.025);
        T.stepFrame(1 / 60);
      }
      window.__holdRender = true;
      T.flightHold(false);
    })()`);
    for (const light of ['noon', 'night']) {
      await page.evaluate(`window.eyeLight = ${JSON.stringify(light)}`);
      await presentAndShot(`target-burning-${light}.png`);
    }

    await page.evaluate(`(() => {
      const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
      window.__holdRender = false;
      T.setMouseFireDbg(false);
      T.flightHold(true);
      for (let i = 0; i < 210; i++) T.stepFrame(1 / 60);
      const t1 = tg.targets[1];
      D.round({
        prev: { x: O.x + 4.5, y: O.y + 1.55, z: O.z + 1.2 },
        pos: { x: O.x + t1.x, y: O.y + 1.35, z: O.z + t1.z + 0.5 }
      });
      for (let i = 0; i < 12; i++) {
        T.player.position.set(O.x + 4.8, O.y, O.z - 0.25);
        T.setOtsAimDbg(-0.02, -0.08);
        T.stepFrame(1 / 60);
      }
      window.__holdRender = true;
      T.flightHold(false);
    })()`);
    for (const light of LIGHTS) {
      await page.evaluate(`window.eyeLight = ${JSON.stringify(light)}`);
      await presentAndShot(`target-ash-${light}.png`);
    }
    for (const light of ['noon', 'night']) {
      await page.evaluate(`(() => {
        const T = window.TT, O = T.trainingDbg.tg().origin;
        window.eyeLight = ${JSON.stringify(light)};
        T.setShotView({ x: O.x + 5.58, y: O.y + 0.68, z: O.z + 6.85, tx: O.x + 6.0, ty: O.y + 0.28, tz: O.z + 8.0, fov: 42 });
      })()`);
      await presentAndShot(`ash-closeup-${light}.png`);
    }

    await page.evaluate('TT.setShotView(null); TT.setMouseFireDbg(false);');
    const mJson = JSON.stringify({ card: 'AG-299', capturedAt: new Date().toISOString(), metrics }, null, 2);
    await saveDual('after/shot-metrics.json', Buffer.from(mJson));
  } finally {
    await browser.close();
    await server.close();
  }
}

if (BENCH_MODE) {
  runBench().catch((e) => { console.error(e); process.exit(1); });
} else if (SHOTS_MODE) {
  runShots().catch((e) => { console.error(e); process.exit(1); });
}
