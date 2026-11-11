// qa/2026-11-11-AG-302/ag302-warmup-trace.mjs
// AG-302: Matched before/after real-rAF trace (NO ?raf=timer, NO mid-trace screenshots)
// for Training Ground entry blackout warm-up and first draw of all 12 weapons in 1P & 3P.
// Strictly offscreen at (-3800, -3800). Must run inside shared game-test slot (--exclusive).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-302 --exclusive ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-302');
const OUT_REV = path.join(ROOT, 'review/AG-302');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const argv = process.argv.slice(2);
const TAG = argv.find((a) => a.startsWith('--tag='))?.slice(6) || 'before';
const TAKE_SHOTS = argv.includes('--shots');

async function writeRetry(fp, buf) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
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
      await new Promise((r) => setTimeout(r, 120 + a * 100));
    }
  }
}

async function saveDual(relPath, buf) {
  await writeRetry(path.join(OUT_QA, relPath), buf);
  await writeRetry(path.join(OUT_REV, relPath), buf);
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

    const pipesBeforeEnter = await page.evaluate('((TT.renderer && TT.renderer._pipelines && TT.renderer._pipelines.caches && TT.renderer._pipelines.caches.size) || 0)');
    const tEnter0 = Date.now();
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG302-' + ${JSON.stringify(mode)};
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    const enterTrainingMs = Date.now() - tEnter0;
    const bootReadyMs = tEnter0 - tBoot0;

    // 1) Immediate post-blackout frames (untouched spawn, unarmed 3P, checking Draws + visibility + hitches right as blackout lifts!)
    const postBlackout = await page.evaluate(`(async () => {
      const T = window.TT, R = T.renderer;
      const startPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
      const vm = T.viewmodel ? (typeof T.viewmodel === 'function' ? T.viewmodel() : T.viewmodel) : null;
      const vmRoot = T.scene.getObjectByName('viewmodel');
      const vmSpace = vmRoot ? vmRoot.getObjectByName('vm-space') : null;
      const initialVmVisible = !!(vmRoot && vmRoot.visible);
      const initialVmSpaceChildren = vmSpace ? vmSpace.children.map((c) => ({ name: c.name, children: c.children.length, visible: c.visible })) : null;

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
      return {
        pipelinesAtLift: startPipes,
        pipelinesEnd: endPipes,
        newPipelines: endPipes - startPipes,
        samples: dts.length,
        maxDtMs: dts.length ? Math.max(...dts) : 0,
        over25ms: dts.filter((d) => d > 25.0),
        avgDraws: draws.length ? Math.round(draws.reduce((a, b) => a + b, 0) / draws.length) : 0,
        avgTris: tris.length ? Math.round(tris.reduce((a, b) => a + b, 0) / tris.length) : 0,
        initialVmVisible,
        initialVmSpaceChildren
      };
    })()`);

    // 2) Exact AG-301 stage & R1 entry walk in `mode` ('1P' or '3P')
    await page.evaluate(SETUP_STAGE_FN);
    await new Promise((r) => setTimeout(r, 600));

    const entryWalk = await page.evaluate(`(async (route, mode) => {
      const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
      window.agLight = 'noon';
      T.setWorldTime(0.46);
      T.setShotView(null);
      T.setViewFirstDbg(mode === '1P');
      T.setZoomHeldDbg(false);
      const p0 = route.pts[0];
      T.player.position.set(O.x + p0.x, tg.floorY, O.z + p0.z);

      // Note: In AG-301, settle was 260ms, and OTS.w crossed 0.6 at ~400ms into walk!
      // Record right from setViewFirstDbg so zero compile spikes can hide inside a pre-settle!
      const prevAuto = R.info.autoReset;
      R.info.autoReset = false;
      R.info.reset();
      let prevPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
      const startPipes = prevPipes;
      const frames = [];
      const hitches = [];

      await new Promise((resolve) => {
        let segIdx = 0, segT = 0;
        let lastNow = performance.now();
        let skipFrames = 2;
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
        route: route.id,
        frameCount: frames.length,
        medianDtMs: dts.length ? dts[Math.floor(dts.length * 0.5)] : 0,
        p99DtMs: dts.length ? dts[Math.floor(dts.length * 0.99)] : 0,
        maxDtMs: dts.length ? dts[dts.length - 1] : 0,
        avgDraws,
        newPipelines: endPipes - startPipes,
        hitchCountOver25ms: hitches.length,
        hitches
      };
    })(${JSON.stringify(R1_ENTRY_ROUTE)}, ${JSON.stringify(mode)})`);

    // 3) First draw of all 12 weapons in `mode` ('1P' or '3P')
    const weaponDraws = await page.evaluate(`(async (mode) => {
      const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
      window.agLight = 'noon';
      T.setWorldTime(0.46);
      T.setShotView(null);
      T.setViewFirstDbg(mode === '1P');
      T.player.position.set(O.x + 2.0, tg.floorY, O.z - 1.5);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, -0.02);
      // Switch to unarmed briefly first so even m4 gets a fresh draw in this loop!
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
        const vmRoot = T.scene.getObjectByName('viewmodel');
        results.push({
          weapon: wKey,
          mode,
          samples: dts.length,
          maxDtMs: dts.length ? Math.max(...dts) : 0,
          over25ms: dts.filter((d) => d > 25.0),
          newPipelines: endPipes - startPipes,
          avgDraws: draws.length ? Math.round(draws.reduce((a, b) => a + b, 0) / draws.length) : 0,
          vmVisible: !!(vmRoot && vmRoot.visible)
        });
      }
      R.info.autoReset = prevAuto;
      return results;
    })(${JSON.stringify(mode)})`);

    // 4) Optional visual sanity captures AFTER all timing measurements are completely finished
    const shots = [];
    if (captureVisuals && mode === '1P') {
      const sampleKeys = ['pistol', 'revolver', 'm4', 'ak', 'sniper', 'chainsaw'];
      for (const wKey of sampleKeys) {
        await page.evaluate(`(async (wKey) => {
          const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
          T.player.position.set(O.x + 2.0, tg.floorY, O.z - 1.5);
          T.setAimYawDbg(0);
          T.setOtsAimDbg(0, -0.02);
          T.setViewFirstDbg(true);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
          await new Promise((r) => setTimeout(r, 420));
        })(${JSON.stringify(wKey)})`);
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
        const rel = `shots/${TAG}-1P-${wKey}.jpg`;
        await saveDual(rel, Buffer.from(shot.data, 'base64'));
        shots.push(rel);
      }
      // Also capture 3P unarmed at Entry spawn to prove no viewmodel artifacts appear in 3P
      await page.evaluate(`(async () => {
        const T = window.TT, tg = T.trainingDbg.tg(), s = tg.spawn;
        T.setViewFirstDbg(false);
        if (!T.isUnarmed()) T.toggleHolster();
        T.player.position.set(s.x, tg.floorY, s.z);
        T.setAimYawDbg(s.yaw);
        T.setOtsAimDbg(0, 0);
        await new Promise((r) => setTimeout(r, 350));
      })()`);
      const shot3p = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      const rel3p = `shots/${TAG}-3P-spawn-unarmed.jpg`;
      await saveDual(rel3p, Buffer.from(shot3p.data, 'base64'));
      shots.push(rel3p);
    }

    return {
      mode,
      bootReadyMs,
      enterTrainingMs,
      pipesBeforeEnter,
      postBlackout,
      entryWalk,
      weaponDraws,
      shots
    };
  } finally {
    try { await page.close(); } catch (_) {}
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
    console.log(`[AG-302:${TAG}] Running cold 1P pass (entry + all 12 first draws)...`);
    const pass1P = await runColdMode(browser, server.origin, '1P', TAKE_SHOTS);
    console.log(`[AG-302:${TAG}] 1P entryWalk: max=${pass1P.entryWalk.maxDtMs}ms, newPipes=${pass1P.entryWalk.newPipelines}, hitches>25ms=${pass1P.entryWalk.hitchCountOver25ms}`);
    for (const w of pass1P.weaponDraws) {
      console.log(`  [1P:${w.weapon}] max=${w.maxDtMs}ms, newPipes=${w.newPipelines}, draws=${w.avgDraws}, over25=${JSON.stringify(w.over25ms)}`);
    }

    console.log(`[AG-302:${TAG}] Running cold 3P pass (entry + all 12 first draws)...`);
    const pass3P = await runColdMode(browser, server.origin, '3P', false);
    console.log(`[AG-302:${TAG}] 3P entryWalk: max=${pass3P.entryWalk.maxDtMs}ms, newPipes=${pass3P.entryWalk.newPipelines}, hitches>25ms=${pass3P.entryWalk.hitchCountOver25ms}`);
    for (const w of pass3P.weaponDraws) {
      console.log(`  [3P:${w.weapon}] max=${w.maxDtMs}ms, newPipes=${w.newPipelines}, draws=${w.avgDraws}, over25=${JSON.stringify(w.over25ms)}`);
    }

    const out = {
      card: 'AG-302',
      tag: TAG,
      capturedAt: new Date().toISOString(),
      pass1P,
      pass3P
    };
    await saveDual(`trace-${TAG}.json`, Buffer.from(JSON.stringify(out, null, 2)));
    console.log(`[AG-302:${TAG}] Saved trace-${TAG}.json`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
