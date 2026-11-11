// qa/2026-11-11-AG-302/gp20098-and-cd1-gpu.mjs
// Runs in the same exclusive game-test slot right after ag302-warmup-trace.mjs:
//   1) GP-20098: Exact AG-301 R2_corridor_build_hangar 3P 4-light real-rAF trace (verifying cutaway.prepareWarmup() + compileForLiveTarget()).
//   2) CD-1 (Claude 1): 4-light 1P hip GPU captures for flamer (both hands), aa12 (firing hand), minigun (firing hand),
//      shotgun (firing hand + close knuckle-crease pinhole check), m4 (support hand & forearm), and revolver.
// Strictly offscreen at (-3800, -3800).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-302');
const OUT_REV = path.join(ROOT, 'review/AG-302');
const OUT_CD1 = path.join(ROOT, 'review/CD-1-fixes2-gpu');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_CD1, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const TIME_MAP = { noon: 0.46, overcast: 0.50, dusk: 0.75, night: 0.02 };

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
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

    const tEnter0 = Date.now();
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'GP20098-CD1';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    const enterTrainingMs = Date.now() - tEnter0;
    await page.evaluate(SETUP_STAGE_FN);
    await new Promise((r) => setTimeout(r, 600));

    // 1) GP-20098: Exact AG-301 R2_corridor_build_hangar 3P trace across ALL 4 lights!
    const cutawayRuns = [];
    for (const light of LIGHTS) {
      const res = await page.evaluate(`(async (route, light, wTime) => {
        const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
        window.agLight = light;
        T.setWorldTime(wTime);
        T.setShotView(null);
        T.setViewFirstDbg(false);
        T.setZoomHeldDbg(false);
        const p0 = route.pts[0];
        T.player.position.set(O.x + p0.x, tg.floorY, O.z + p0.z);
        await new Promise((r) => setTimeout(r, 260));

        let prevPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        const startPipes = prevPipes;
        const frames = [], hitches = [];
        let segIdx = 0, segT = 0, lastNow = performance.now(), skipFirst = 2;

        await new Promise((resolve) => {
          window.__extraFrame = () => {
            const now = performance.now();
            const dtMs = now - lastNow;
            lastNow = now;
            const dt = Math.min(0.05, dtMs / 1000);
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

            if (skipFirst > 0) { skipFirst--; return; }
            const pipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
            const newPipes = pipes - prevPipes;
            prevPipes = pipes;
            frames.push({ dtMs: +dtMs.toFixed(2), newPipes, room });
            if (dtMs > 25.0) {
              hitches.push({
                light, room, dtMs: +dtMs.toFixed(1), newPipes,
                pos: [+wx.toFixed(2), +tg.floorY.toFixed(2), +wz.toFixed(2)],
                cutaway: tg.cutaway?.state?.() || null
              });
            }
          };
        });

        const dts = frames.map((f) => f.dtMs).sort((x, y) => x - y);
        const endPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        return {
          light,
          mode: '3P',
          route: route.id,
          frameCount: frames.length,
          medianDtMs: dts.length ? dts[Math.floor(dts.length * 0.5)] : 0,
          p99DtMs: dts.length ? dts[Math.floor(dts.length * 0.99)] : 0,
          maxDtMs: dts.length ? dts[dts.length - 1] : 0,
          newPipelines: endPipes - startPipes,
          hitchCountOver25ms: hitches.length,
          hitches
        };
      })(${JSON.stringify(R2_CORRIDOR_ROUTE)}, ${JSON.stringify(light)}, ${TIME_MAP[light]})`);
      cutawayRuns.push(res);
      console.log(`[GP-20098:3P:${light}] frames=${res.frameCount}, med=${res.medianDtMs}ms, p99=${res.p99DtMs}ms, max=${res.maxDtMs}ms, newPipes=${res.newPipelines}, hitches>25ms=${res.hitchCountOver25ms}`);
    }

    const gpOut = {
      card: 'GP-20098',
      capturedAt: new Date().toISOString(),
      enterTrainingMs,
      runs: cutawayRuns
    };
    fs.writeFileSync(path.join(OUT_QA, 'gp20098-cutaway-trace-after.json'), JSON.stringify(gpOut, null, 2));
    fs.writeFileSync(path.join(OUT_REV, 'gp20098-cutaway-trace-after.json'), JSON.stringify(gpOut, null, 2));

    // 2) CD-1 (Claude 1): 4-light 1P hip captures against bright/neutral range wall so any white pinhole at knuckle creases would stand out starkly!
    // Hide HUD overlays cleanly for pure viewmodel inspection
    await page.evaluate(`(() => {
      for (const sel of ['#hud', '#trainingHud', '#perfOverlay', '#minimapWrap', '#crosshair']) {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      }
    })()`);

    const cd1Weapons = ['flamer', 'aa12', 'minigun', 'shotgun', 'm4', 'revolver'];
    const matSideInfo = await page.evaluate(`(() => {
      const T = window.TT, vmRoot = T.scene.getObjectByName('viewmodel');
      const out = [];
      if (vmRoot) {
        vmRoot.traverse((o) => {
          if (o.isMesh && o.name && o.name.startsWith('vm-hand-') && o.material) {
            out.push({ name: o.name, mat: o.material.name, side: o.material.side });
          }
        });
      }
      return out;
    })()`);
    fs.writeFileSync(path.join(OUT_CD1, 'glove-material-sides.json'), JSON.stringify(matSideInfo, null, 2));

    for (const wKey of cd1Weapons) {
      for (const light of LIGHTS) {
        await page.evaluate(`(async (wKey, light, wTime) => {
          const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
          window.agLight = light;
          T.setWorldTime(wTime);
          T.setShotView(null);
          // Stand facing brightly lit white/light concrete East wall so any pinhole in dark glove creases would show bright background!
          T.player.position.set(O.x + 5.8, tg.floorY, O.z - 5.0);
          T.setAimYawDbg(Math.PI / 2);
          T.setOtsAimDbg(0, -0.02);
          T.setViewFirstDbg(true);
          T.setZoomHeldDbg(false);
          if (T.isUnarmed()) T.toggleHolster();
          T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
          await new Promise((r) => setTimeout(r, 420));
        })(${JSON.stringify(wKey)}, ${JSON.stringify(light)}, ${TIME_MAP[light]})`);
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUT_CD1, `${wKey}-hip-${light}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
    console.log('[CD-1] Saved 24 4-light 1P hip PNGs in review/CD-1-fixes2-gpu/');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
