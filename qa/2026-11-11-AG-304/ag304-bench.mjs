// qa/2026-11-11-AG-304/ag304-bench.mjs
// AG-304: Matched before/after RTX 5080 WebGPU benchmark (--exclusive, offscreen at -3800,-3800, NO ?raf=timer):
//   1. Cold 1P pass: enterTrainingMs + postBlackout (60f) + R1 entry walk + first draw of all 12 weapons in 1P
//   2. Cold 3P pass: enterTrainingMs + postBlackout (60f) + R1 entry walk + first draw of all 12 weapons in 3P + R2 corridor/cutaway/fence/marine/containment fade walk across all 4 lights
//   3. Diagnostic breakdown pass (measures synchronous enterTraining build vs compileAsync vs warmFrame without touching Pass 1/2!)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot with --exclusive');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-304');
const OUT_REV = path.join(ROOT, 'review/AG-304');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const argv = process.argv.slice(2);
const TAG = argv.find((a) => a.startsWith('--tag='))?.slice(6) || 'before';
const TAKE_SHOTS = argv.includes('--shots');

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const TIME_MAP = { noon: 0.46, overcast: 0.50, dusk: 0.75, night: 0.02 };

async function saveDual(relPath, buf) {
  for (const base of [OUT_QA, OUT_REV]) {
    const fp = path.join(base, relPath);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, buf);
  }
}

async function moveOffscreen(page) {
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

const SETUP_STAGE_FN = `(async () => {
  const T = window.TT, H = T.inspectHost();
  const { LIGHTS } = await import('/studio/inspector/stage.js');
  window.__LIGHTS = LIGHTS;
  window.agLight = 'noon';
  window.__holdRender = false;
  window.__extraFrame = null;
  window.__illuminate = function illuminate() {
    const L = window.__LIGHTS[window.agLight] || window.__LIGHTS['noon'];
    const p = T.camera.position;
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
    H.moon.intensity = window.agLight === 'night' ? 0.45 : 0;
    const tg = T.trainingDbg.tg();
    if (tg && tg.setLights) {
      const wantRoom = window.agLight !== 'night';
      if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
    }
    if (typeof window.__extraFrame === 'function') window.__extraFrame();
  };
  H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: window.__illuminate });
  T.grantAllWeapons();
  if (T.isUnarmed()) T.toggleHolster();
  const m4Idx = T.WEAPON_ORDER.indexOf('m4');
  if (m4Idx >= 0) T.setWeapon(m4Idx);
})()`;

const R1_ENTRY_ROUTE = {
  id: 'R1_entry_stations_console',
  speed: 4.8,
  pts: [
    { x: 0.0,  z: -10.8, lx: 6.5,  ly: 1.5, lz: -10.2, room: 'entry' },
    { x: 4.9,  z: -10.2, lx: 8.0,  ly: 1.5, lz: -10.2, room: 'cif' },
    { x: 4.9,  z: -6.6,  lx: 8.0,  ly: 1.5, lz: -6.6,  room: 'kiosk' },
    { x: 4.9,  z: -3.0,  lx: 8.0,  ly: 1.5, lz: -3.0,  room: 'armory' },
    { x: 0.5,  z: -2.0,  lx: 0.0,  ly: 1.4, lz: 12.0,  room: 'range_bench' },
    { x: -5.2, z: -4.6,  lx: -7.9, ly: 1.4, lz: -4.6,  room: 'range_console' },
    { x: -5.2, z: -8.0,  lx: -9.5, ly: 1.5, lz: -8.0,  room: 'corridor_approach' }
  ]
};

const R2_CORRIDOR_ROUTE = {
  id: 'R2_corridor_build_hangar',
  speed: 6.5,
  pts: [
    { x: -5.2,  z: -8.0, lx: -12.0, ly: 1.5, lz: -8.0, room: 'corridor_east' },
    { x: -11.5, z: -8.0, lx: -18.0, ly: 1.5, lz: -8.5, room: 'corridor_west' },
    { x: -18.0, z: -9.2, lx: -24.0, ly: 1.2, lz: -10.5, room: 'infirmary_approach' },
    { x: -39.5, z: -3.0, lx: -44.0, ly: 1.5, lz: -3.0, room: 'skull_window' },
    { x: -39.5, z: 3.0,  lx: -44.0, ly: 1.5, lz: 3.0,  room: 'hq_panel' },
    { x: -26.0, z: 10.0, lx: -26.0, ly: 0.9, lz: 22.0, room: 'build_killfloor' },
    { x: -26.0, z: 19.5, lx: -26.0, ly: 2.2, lz: 28.0, room: 'zombie_gate_hazard' }
  ]
};

const WALK_EVAL_FN = `(async (route, mode, light, wTime) => {
  const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
  window.agLight = light;
  T.setWorldTime(wTime);
  T.setShotView(null);
  T.setViewFirstDbg(mode === '1P');
  T.setZoomHeldDbg(false);
  const p0 = route.pts[0];
  T.player.position.set(O.x + p0.x, tg.floorY, O.z + p0.z);

  const prevAuto = R.info.autoReset;
  R.info.autoReset = false;
  R.info.reset();
  let prevPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
  const startPipes = prevPipes;
  const frames = [], hitches = [];

  await new Promise((resolve) => {
    let segIdx = 0, segT = 0, lastNow = performance.now(), skipFrames = 2;
    window.__extraFrame = () => {
      const now = performance.now();
      const dtMs = now - lastNow;
      lastNow = now;
      const dt = Math.min(0.05, dtMs / 1000);
      const rInfo = (R && R.info && R.info.render) || {};
      const dc = rInfo.drawCalls != null ? rInfo.drawCalls : (rInfo.calls || 0);
      R.info.reset();

      const a = route.pts[segIdx], b = route.pts[segIdx + 1];
      if (!b) {
        T.flightInput({ keys: [] });
        window.__extraFrame = null;
        resolve();
        return;
      }
      const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 0.001;
      segT += (route.speed * dt) / segLen;
      if (segT >= 1) { segIdx++; segT = 0; }
      const curA = route.pts[Math.min(segIdx, route.pts.length - 1)];
      const curB = route.pts[Math.min(segIdx + 1, route.pts.length - 1)];
      const u = segIdx >= route.pts.length - 1 ? 0 : segT;
      const wx = O.x + curA.x + (curB.x - curA.x) * u;
      const wz = O.z + curA.z + (curB.z - curA.z) * u;
      const lx = O.x + curA.lx + (curB.lx - curA.lx) * u;
      const ly = tg.floorY + curA.ly + (curB.ly - curA.ly) * u;
      const lz = O.z + curA.lz + (curB.lz - curA.lz) * u;
      const room = u < 0.5 ? curA.room : curB.room;

      const yaw = Math.atan2(lx - wx, lz - wz);
      const hDist = Math.hypot(lx - wx, lz - wz) || 1;
      const pitch = Math.atan2(ly - (tg.floorY + 1.55), hDist);
      T.player.position.set(wx, tg.floorY, wz);
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, pitch);
      T.flightInput({ keys: ['w'] });

      if (skipFrames > 0) { skipFrames--; return; }

      const curPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
      const newPipes = Math.max(0, curPipes - prevPipes);
      prevPipes = curPipes;

      frames.push({ dtMs: +dtMs.toFixed(2), draws: dc, newPipes, room });
      if (dtMs > 25.0) {
        hitches.push({
          dtMs: +dtMs.toFixed(1),
          newPipes,
          draws: dc,
          room,
          pos: [+wx.toFixed(2), +tg.floorY.toFixed(2), +wz.toFixed(2)]
        });
      }
    };
  });
  R.info.autoReset = prevAuto;

  const dts = frames.map((f) => f.dtMs).sort((x, y) => x - y);
  const avgDraws = frames.length ? Math.round(frames.reduce((s, f) => s + f.draws, 0) / frames.length) : 0;
  const endPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
  return {
    mode,
    light,
    route: route.id,
    frameCount: frames.length,
    medianDtMs: dts.length ? dts[Math.floor(dts.length * 0.5)] : 0,
    p99DtMs: dts.length ? dts[Math.floor(dts.length * 0.99)] : 0,
    maxDtMs: dts.length ? dts[dts.length - 1] : 0,
    avgDraws,
    newPipelines: endPipes - startPipes,
    hitchCountOver25ms: hitches.length,
    hitchCountOver35ms: hitches.filter((h) => h.dtMs > 35.0).length,
    hitches
  };
})`;

async function runColdMode(browser, origin, mode, captureVisuals = false) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    await moveOffscreen(page);
    const tBoot0 = Date.now();
    await page.goto(`${origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    await page.evaluate(`(() => {
      window.__ag304Errs = [];
      window.addEventListener('error', (e) => window.__ag304Errs.push(String(e.message || e.error)));
      window.addEventListener('unhandledrejection', (e) => window.__ag304Errs.push(String(e.reason)));
    })()`);

    const pipesBeforeEnter = await page.evaluate('((TT.renderer && TT.renderer._pipelines && TT.renderer._pipelines.caches && TT.renderer._pipelines.caches.size) || 0)');
    const tEnter0 = Date.now();
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG304-' + ${JSON.stringify(mode)};
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    const enterTrainingMs = Date.now() - tEnter0;
    const bootReadyMs = tEnter0 - tBoot0;

    // 1) Immediate post-blackout frames (60 live frames right as blackout lifts; if background compile is running, this catches any stall!)
    const postBlackout = await page.evaluate(`(async () => {
      const T = window.TT, R = T.renderer;
      const startPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
      const vmRoot = T.scene.getObjectByName('viewmodel');
      const initialVmVisible = !!(vmRoot && vmRoot.visible);

      const prevAuto = R.info.autoReset;
      R.info.autoReset = false;
      R.info.reset();
      const dts = [], draws = [], tris = [];
      await new Promise((resolve) => {
        let last = performance.now(), n = 0;
        function step() {
          const now = performance.now();
          const rInfo = (R && R.info && R.info.render) || {};
          const dc = rInfo.drawCalls != null ? rInfo.drawCalls : (rInfo.calls || 0);
          const tr = rInfo.triangles || 0;
          R.info.reset();
          if (n > 0) {
            dts.push(+(now - last).toFixed(2));
            draws.push(dc);
            tris.push(tr);
          }
          last = now;
          if (++n > 60) { resolve(); return; }
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
      R.info.autoReset = prevAuto;
      const endPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
      const sorted = [...dts].sort((a, b) => a - b);
      return {
        pipelinesAtLift: startPipes,
        pipelinesEnd: endPipes,
        newPipelines: endPipes - startPipes,
        samples: dts.length,
        medianDtMs: sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0,
        p99DtMs: sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0,
        maxDtMs: dts.length ? Math.max(...dts) : 0,
        over25ms: dts.filter((d) => d > 25.0),
        over35ms: dts.filter((d) => d > 35.0),
        avgDraws: draws.length ? Math.round(draws.reduce((a, b) => a + b, 0) / draws.length) : 0,
        avgTris: tris.length ? Math.round(tris.reduce((a, b) => a + b, 0) / tris.length) : 0,
        initialVmVisible
      };
    })()`);

    // 2) R1 Entry walk
    await page.evaluate(SETUP_STAGE_FN);
    await new Promise((r) => setTimeout(r, 600));
    const entryWalk = await page.evaluate(`${WALK_EVAL_FN}(${JSON.stringify(R1_ENTRY_ROUTE)}, ${JSON.stringify(mode)}, 'noon', 0.46)`);

    // 3) First draw of all 12 weapons
    const weaponDraws = await page.evaluate(`(async (mode) => {
      const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
      window.agLight = 'noon';
      T.setWorldTime(0.46);
      T.setShotView(null);
      T.setViewFirstDbg(mode === '1P');
      T.player.position.set(O.x + 2.0, tg.floorY, O.z - 1.5);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, -0.02);
      if (!T.isUnarmed()) T.toggleHolster();
      await new Promise((r) => setTimeout(r, 280));
      if (T.isUnarmed()) T.toggleHolster();

      const prevAuto = R.info.autoReset;
      R.info.autoReset = false;
      R.info.reset();
      const results = [];
      for (const wKey of T.WEAPON_ORDER) {
        const startPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        const dts = [], draws = [];
        let last = performance.now(), skip = 1;
        window.__extraFrame = () => {
          const now = performance.now(), dt = now - last;
          last = now;
          const rInfo = (R && R.info && R.info.render) || {};
          const dc = rInfo.drawCalls != null ? rInfo.drawCalls : (rInfo.calls || 0);
          R.info.reset();
          if (skip > 0) { skip--; return; }
          dts.push(+dt.toFixed(2));
          draws.push(dc);
        };
        T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
        await new Promise((r) => setTimeout(r, 380));
        window.__extraFrame = null;
        const endPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        results.push({
          weapon: wKey,
          mode,
          samples: dts.length,
          maxDtMs: dts.length ? Math.max(...dts) : 0,
          over25ms: dts.filter((d) => d > 25.0),
          over35ms: dts.filter((d) => d > 35.0),
          newPipelines: endPipes - startPipes,
          avgDraws: draws.length ? Math.round(draws.reduce((a, b) => a + b, 0) / draws.length) : 0
        });
      }
      R.info.autoReset = prevAuto;
      return results;
    })(${JSON.stringify(mode)})`);

    // 4) In 3P pass, also run R2 corridor/cutaway/fence/marine/containment fade walk across all 4 lights!
    let cutawayWalks = null;
    if (mode === '3P') {
      cutawayWalks = [];
      for (const lt of LIGHTS) {
        await page.evaluate(`(() => {
          const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
          window.agLight = ${JSON.stringify(lt)};
          T.setWorldTime(${TIME_MAP[lt]});
          T.player.position.set(O.x - 5.2, tg.floorY, O.z - 8.0);
        })()`);
        await new Promise((r) => setTimeout(r, 250));
        const cw = await page.evaluate(`${WALK_EVAL_FN}(${JSON.stringify(R2_CORRIDOR_ROUTE)}, '3P', ${JSON.stringify(lt)}, ${TIME_MAP[lt]})`);
        cutawayWalks.push(cw);
      }
    }

    // 5) Optional visual sanity captures AFTER all timing traces finish
    const shots = [];
    if (captureVisuals && mode === '1P') {
      for (const wKey of ['pistol', 'revolver', 'm4', 'ak', 'launcher', 'chainsaw']) {
        await page.evaluate(`(async (wKey) => {
          const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
          window.agLight = 'noon';
          T.setWorldTime(0.46);
          T.player.position.set(O.x + 2.0, tg.floorY, O.z - 1.5);
          T.setAimYawDbg(0);
          T.setOtsAimDbg(0, -0.02);
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
          await new Promise((r) => setTimeout(r, 380));
        })(${JSON.stringify(wKey)})`);
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
        const rel = `shots/${TAG}-1P-${wKey}.jpg`;
        await saveDual(rel, Buffer.from(shot.data, 'base64'));
        shots.push(rel);
      }
    }

    const pageErrors = await page.evaluate('window.__ag304Errs || []');
    return {
      mode,
      bootReadyMs,
      enterTrainingMs,
      pipesBeforeEnter,
      postBlackout,
      entryWalk,
      weaponDraws,
      cutawayWalks,
      shots,
      pageErrors
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function runDiagnosticBreakdown(browser, origin) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    await moveOffscreen(page);
    await page.goto(`${origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    // Wrap renderer.compileAsync and renderer.render to see exact time spent in sync enterTraining vs compileAsync vs warmFrame
    await page.evaluate(`(() => {
      const R = window.TT.renderer;
      window.__diagEvents = [];
      const tOrigin = performance.now();
      const origCompile = R.compileAsync.bind(R);
      R.compileAsync = function(sc, cam, targetScene) {
        const t0 = performance.now();
        let visMeshes = 0;
        sc.traverseVisible((o) => { if (o.isMesh) visMeshes++; });
        const p = origCompile(sc, cam, targetScene);
        const tSync = performance.now() - t0;
        return Promise.resolve(p).then((v) => {
          window.__diagEvents.push({
            kind: 'compileAsync',
            startAtMs: +(t0 - tOrigin).toFixed(1),
            syncCpuMs: +tSync.toFixed(1),
            totalMs: +(performance.now() - t0).toFixed(1),
            visMeshes
          });
          return v;
        });
      };
      const origRender = R.render.bind(R);
      R.render = function(sc, cam) {
        const b = document.getElementById('trainingBlackout');
        if (!b || !b.classList.contains('on')) return origRender(sc, cam);
        const t0 = performance.now();
        const r = origRender(sc, cam);
        window.__diagEvents.push({
          kind: 'renderWhileBlackout',
          startAtMs: +(t0 - tOrigin).toFixed(1),
          ms: +(performance.now() - t0).toFixed(1)
        });
        return r;
      };
      window.__diagStart = () => {
        const tClick = performance.now();
        window.__diagTClick = tClick;
        document.getElementById('playerName').value = 'AG304-DIAG';
        document.getElementById('modeTraining').click();
        window.__diagClickSyncMs = +(performance.now() - tClick).toFixed(1);
      };
    })()`);

    const t0 = Date.now();
    await page.evaluate('window.__diagStart()');
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    const wallMs = Date.now() - t0;
    const diag = await page.evaluate('({ wallMs: ' + wallMs + ', clickSyncMs: window.__diagClickSyncMs, events: window.__diagEvents })');
    return diag;
  } finally {
    await page.close().catch(() => {});
  }
}

async function runSyncEnterVisibilityCheck(browser, origin) {
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    await moveOffscreen(page);
    await page.goto(`${origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    return await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const countVis = (root) => {
        if (!root) return 0;
        let n = 0;
        const walk = (o) => {
          if (!o.visible) return;
          if (o.isMesh) n++;
          for (const c of o.children) walk(c);
        };
        for (const c of root.children) walk(c);
        return n;
      };
      H.enterTraining();
      // Immediately mutate weapons right while compileAsync is still in flight (exact GT-20076 scenario!)
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      const immediate = {};
      for (const k of ['m4', 'ak', 'aa12', 'revolver', 'launcher']) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(k));
        T.stepFrame(1 / 60);
        immediate[k] = countVis(T.weaponMeshes[k]);
      }
      const st = T.trainingDbg.state();
      const hadWarmPromise = !!(st && st.warmPromise);
      const hadBgWarmPromise = !!(st && st.bgWarmPromise);
      if (st && st.warmPromise) await st.warmPromise;
      const afterWarm = {};
      for (const k of ['m4', 'ak', 'aa12', 'revolver', 'launcher']) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(k));
        T.stepFrame(1 / 60);
        afterWarm[k] = countVis(T.weaponMeshes[k]);
      }
      if (st && st.bgWarmPromise) await st.bgWarmPromise;
      const afterBgWarm = {};
      for (const k of ['m4', 'ak', 'aa12', 'revolver', 'launcher']) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(k));
        T.stepFrame(1 / 60);
        afterBgWarm[k] = countVis(T.weaponMeshes[k]);
      }
      return {
        hadWarmPromise,
        hadBgWarmPromise,
        warmingAfter: !!(st && st.warming),
        bgWarmingAfter: !!(st && st.bgWarming),
        immediate,
        afterWarm,
        afterBgWarm
      };
    })()`);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
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
    console.log(`[AG-304 ${TAG}] Running Cold 1P pass...`);
    const pass1P = await runColdMode(browser, server.origin, '1P', TAKE_SHOTS);
    console.log(`[AG-304 ${TAG}] 1P enterTrainingMs=${pass1P.enterTrainingMs}ms, postBlackout maxDt=${pass1P.postBlackout.maxDtMs}ms (+${pass1P.postBlackout.newPipelines}p), maxFirstDraw=${Math.max(...pass1P.weaponDraws.map((w) => w.maxDtMs))}ms`);

    console.log(`[AG-304 ${TAG}] Running Cold 3P + R2 4-light pass...`);
    const pass3P = await runColdMode(browser, server.origin, '3P', false);
    console.log(`[AG-304 ${TAG}] 3P enterTrainingMs=${pass3P.enterTrainingMs}ms, postBlackout maxDt=${pass3P.postBlackout.maxDtMs}ms (+${pass3P.postBlackout.newPipelines}p), maxFirstDraw=${Math.max(...pass3P.weaponDraws.map((w) => w.maxDtMs))}ms`);
    for (const cw of pass3P.cutawayWalks || []) {
      console.log(`  R2 [${cw.light}]: maxDt=${cw.maxDtMs}ms (+${cw.newPipelines}p)`);
    }

    console.log(`[AG-304 ${TAG}] Running Diagnostic sub-phase breakdown...`);
    const breakdown = await runDiagnosticBreakdown(browser, server.origin);
    console.log(`[AG-304 ${TAG}] Breakdown:`, JSON.stringify(breakdown));

    console.log(`[AG-304 ${TAG}] Running inspectHost().enterTraining() race check...`);
    const syncEnterCheck = await runSyncEnterVisibilityCheck(browser, server.origin);
    console.log(`[AG-304 ${TAG}] syncEnterCheck:`, JSON.stringify(syncEnterCheck));

    const out = {
      card: 'AG-304',
      tag: TAG,
      capturedAt: new Date().toISOString(),
      pass1P,
      pass3P,
      breakdown,
      syncEnterCheck
    };
    await saveDual(`trace-${TAG}.json`, Buffer.from(JSON.stringify(out, null, 2)));
    console.log(`[AG-304 ${TAG}] Saved trace-${TAG}.json`);
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
