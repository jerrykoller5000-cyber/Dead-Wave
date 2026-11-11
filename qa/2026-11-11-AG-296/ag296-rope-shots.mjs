// scratch/ag296-rope-shots.mjs
// Reproducible RTX 5080 WebGPU 4-light capture (1.0s & 2.0s held trigger, Eye + Side Lane-Wall Camera)
// + Exclusive 5080 real-rAF Benchmark for AG-296 (J120 return item 1).
//
// Usage:
//   node crew/crew.mjs slot run antigravity AG-296 --checks "AG-296 BEFORE 1s/2s eye+side" -- node <path>/ag296-rope-shots.mjs --phase before
//   node crew/crew.mjs slot run antigravity AG-296 --checks "AG-296 AFTER 1s/2s eye+side"  -- node <path>/ag296-rope-shots.mjs --phase after
//   node crew/crew.mjs slot run antigravity AG-296 --exclusive --checks "AG-296 AFTER 5080 bench" -- node <path>/ag296-rope-shots.mjs --bench

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-296 ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const argv = process.argv.slice(2);
const BENCH_MODE = argv.includes('--bench');
const phaseIdx = argv.indexOf('--phase');
const PHASE = phaseIdx >= 0 ? argv[phaseIdx + 1] : 'after';

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function writeRetry(fp, buf) {
  const tmp = `${fp}.tmp-${process.pid}`;
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

async function runBench() {
  const OUT_REV = path.join(ROOT, 'review/AG-296/after-rope');
  const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-296/after-rope');
  fs.mkdirSync(OUT_REV, { recursive: true });
  fs.mkdirSync(OUT_QA, { recursive: true });

  const SAMPLE_PERF = `(() => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
    return Object.assign({}, snap, { draws, triangles: info.triangles || 0 });
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
      return {
        frames: rep ? rep.frames : 0,
        tickMs: Math.round(tickMs * 100) / 100,
        top: phases.slice(0, 8).map((p) => ({ k: p.k, avg: Math.round(p.avg * 100) / 100, max: Math.round(p.max * 100) / 100 })),
        spikes: ((rep && rep.spikes) || []).length,
        newPipelines: pipeEnd - (window.__pipeStart || 0),
        activeFlames: parts.length,
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
      prof
    };
    console.log(`[AG-296:bench] ${label}:`, JSON.stringify(res));
    return res;
  }

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=80,60', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    const tLoad0 = Date.now();
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
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
        // Sweep across 8m target and 30m back wall so full 30m rope + wall fireball + target burn run live!
        T.setOtsAimDbg(Math.sin(t) * 0.08, 0.022 + Math.cos(t * 1.1) * 0.025);
      }, 40);
      T.setMouseFireDbg(true);
    })()`);
    const fireBench = await measureWindow(page, 6, 'active_flamer_rope_30m_fireball_char_burn');
    await page.evaluate(`(() => { clearInterval(window.__benchSweep); TT.setMouseFireDbg(false); })()`);

    const summary = {
      phase: 'after-rope',
      capturedAt: new Date().toISOString(),
      renderer: rendererInfo,
      loadReadyMs,
      bench: { idle: idleBench, activeFire: fireBench }
    };
    const json = Buffer.from(JSON.stringify(summary, null, 2));
    await writeRetry(path.join(OUT_REV, 'bench-summary.json'), json);
    await writeRetry(path.join(OUT_QA, 'bench-summary.json'), json);
    console.log('[AG-296:bench] Saved bench-summary.json');
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runShots() {
  if (!['before', 'after'].includes(PHASE)) throw new Error(`Invalid --phase: ${PHASE}`);
  const OUT_REV = path.join(ROOT, 'review/AG-296', `${PHASE}-rope`);
  const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-296', `${PHASE}-rope`);
  fs.mkdirSync(OUT_REV, { recursive: true });
  fs.mkdirSync(OUT_QA, { recursive: true });

  const writeRetry = async (fp, buf) => {
    const tmp = `${fp}.tmp-${process.pid}`;
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
  };
  const saveDual = async (name, buf) => {
    await writeRetry(path.join(OUT_REV, name), buf);
    await writeRetry(path.join(OUT_QA, name), buf);
  };
  const shot = async (page, name) => {
    const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const buf = Buffer.from(res.data, 'base64');
    await saveDual(name, buf);
    console.log(`[AG-296:${PHASE}-rope] saved ${name} (${(buf.length / 1024).toFixed(1)} kB)`);
  };

  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=-3600,-3600', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Trainee';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Equip flamer, attach 4-light stage illuminator, hide HUD
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

    // Stamp deterministic bullet holes across the back wall (z = 30, x = 3.2..7.4) so sorting is verified in every frame
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

    const metrics = {};

    // Unified Lane 1 setup (x = O.x + 5.62, z = O.z - 0.25, yaw = 0):
    // Right edge of Lane 1's 8 m silhouette is at x = 5.585..6.64 (z = 8.0), and the back wall is at z = 30.0.
    // Holding the trigger at 1.0 s and 2.0 s shows the rope reaching BOTH the 8 m target AND the 30 m back wall fireball
    // from the exact same Eye camera and Side Lane-Wall camera (looking straight across from x = -7.25) across all 4 lights!
    const SIDE_CAM = `{
      x: O.x - 7.25, y: tg.floorY + 1.95, z: O.z + 11.2,
      tx: O.x + 5.62, ty: tg.floorY + 1.35, tz: O.z + 12.5,
      fov: 78
    }`;

    const presentAndShot = async (name) => {
      // Let 3 fresh raf=timer ticks execute renderFrame() with held()===true (0 simulation dt!) so WebGPU presents the exact swapchain frame
      await new Promise((r) => setTimeout(r, 60));
      await shot(page, name);
    };

    for (const light of LIGHTS) {
      // Settle 1P Eye camera for 60 frames so OTS.w === 1.0 and viewmodel is 100% raised
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
      })()`);

      // Hold trigger for EXACTLY 1.000 s (60 frames @ 60 Hz)
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
      await presentAndShot(`eye-1s-${light}.png`);

      // Switch to Side Lane-Wall Camera while simulation is frozen (held()===true): exact same 1.000 s rope + 3P marine in booth!
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
      await presentAndShot(`side-1s-${light}.png`);

      // Restore 1P view and advance another 60 frames -> EXACTLY 2.000 s (120 frames @ 60 Hz)!
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
      await presentAndShot(`eye-2s-${light}.png`);

      // Switch to Side Lane-Wall Camera at frozen 2.000 s!
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
      await presentAndShot(`side-2s-${light}.png`);

      metrics[light] = { s1: stat1, s2: stat2, side1: stat1, side2: stat2 };
      console.log(`[AG-296:${PHASE}-rope] ${light} stats:`, JSON.stringify(metrics[light]));
    }

    // Also capture 0.57s direct center-of-mass splash on the standing 8m target before 0.75s collapse (Noon & Night, Eye + Side)
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

    await page.evaluate('TT.setMouseFireDbg(false)');
    const mJson = JSON.stringify({ phase: PHASE, capturedAt: new Date().toISOString(), metrics }, null, 2);
    await saveDual('rope-metrics.json', Buffer.from(mJson));
  } finally {
    await browser.close();
    await server.close();
  }
}

if (BENCH_MODE) {
  runBench().catch((e) => { console.error(e); process.exit(1); });
} else {
  runShots().catch((e) => { console.error(e); process.exit(1); });
}
