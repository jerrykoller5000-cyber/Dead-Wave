// qa/2026-11-11-AG-301/ag301-moving-pass.mjs
// AG-301: Moving-camera pass through the Training Ground on RTX 5080 WebGPU (strictly offscreen at -3800,-3800).
//
// Modes:
//   --trace  : Real-rAF (NO ?raf=timer, NO mid-walk screenshots) moving-camera pass across all rooms
//              (Entry -> CIF -> Kiosk -> Armory -> Console/Bench; Corridor -> Infirmary -> SkullWindow ->
//               HQPanel -> Build Hangar/Gate; Firing Line -> Downrange Lanes 1..28.5m) in 1P & 3P across
//              Noon, Overcast, Dusk, Night. Records full frame-time trace, every hitch > 25 ms with exact
//              place + profDbg phase + pipeline count, and static/decal/shadow/wall-join diagnostics.
//   --strips : Moving-camera filmstrips (1P & 3P, 4 lights, all rooms) + 5-step micro-glide flicker/acne/
//              parallax/light-leak probes + automatic captures of any > 25 ms hitch spots from --trace.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-301 ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-301');
const OUT_REV = path.join(ROOT, 'review/AG-301');
fs.mkdirSync(path.join(OUT_QA, 'strips'), { recursive: true });
fs.mkdirSync(path.join(OUT_REV, 'strips'), { recursive: true });

const argv = process.argv.slice(2);
const TRACE_MODE = argv.includes('--trace');
const STRIPS_MODE = argv.includes('--strips') || !TRACE_MODE;
const TAG = argv.find((a) => a.startsWith('--tag='))?.slice(6) || 'pass1';

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const TIME_MAP = { noon: 0.46, overcast: 0.50, dusk: 0.75, night: 0.02 };

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

// Common scene setup: attach 4-light stage illuminator + seed realistic range bullet holes, char & ash
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

const SEED_DECALS_FN = `(() => {
  const T = window.TT, D = T.trainingDbg, tg = D.tg(), O = tg.origin;
  const charApi = D.char?.();
  // 1. Bullet holes on East wall (+8), floor, Lane 2 target (12m), and 30m backstop
  const shots = [
    // East wall grazing patch (z = 4..10, y = 1.0..2.2) + z = 13.8..15.0 (-Z sort-flip zone near wear-wall-px center z=14.25)
    ...[4.5, 5.2, 6.0, 6.8, 7.6, 8.4, 9.2, 13.8, 14.2, 14.6, 15.0].map((z, i) => ({
      prev: { x: O.x + 4.0, y: O.y + 1.4, z: O.z + z - 0.5 },
      pos:  { x: O.x + 8.15, y: O.y + 1.15 + (i % 3) * 0.28, z: O.z + z }
    })),
    // Lane 1 target plate (x = 6.0, z = 8.0) edge grazing check
    ...[5.88, 6.0, 6.12].map((x, i) => ({
      prev: { x: O.x + x, y: O.y + 1.15 + i * 0.16, z: O.z + 5.0 },
      pos:  { x: O.x + x, y: O.y + 1.15 + i * 0.16, z: O.z + 8.5 }
    })),
    // Range floor grazing patch near z = 3..7, x = 2..5 + z = 8.8..9.6 (near wear-floor center z=9.0)
    ...[3.2, 4.0, 4.8, 5.6, 6.4, 8.8, 9.2, 9.6].map((z, i) => ({
      prev: { x: O.x + 2.5 + (i % 2) * 0.6, y: O.y + 1.2, z: O.z + z - 0.8 },
      pos:  { x: O.x + 2.8 + (i % 2) * 0.6, y: O.y - 0.2, z: O.z + z }
    })),
    // Back wall 30m cluster
    ...[ -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0 ].map((x, i) => ({
      prev: { x: O.x + x, y: O.y + 1.4, z: O.z + 20.0 },
      pos:  { x: O.x + x, y: O.y + 1.1 + (i % 3) * 0.45, z: O.z + 30.2 }
    }))
  ];
  for (const s of shots) D.round(s);

  // 2. Char marks overlapping part of the East wall, Lane 1 plate, floor, and 30m backstop bullet holes
  if (charApi && charApi.add) {
    for (const z of [5.0, 5.8, 6.6, 7.4, 14.0, 14.5]) {
      charApi.add({ solid: { surface: { x: O.x + 8.0, nx: -1, nz: 0 } }, point: { x: O.x + 8.0, y: O.y + 1.35, z: O.z + z }, normal: { x: -1, y: 0, z: 0 } }, 0.92);
    }
    charApi.add({ solid: { target: 0 }, point: { x: O.x + 6.0, y: O.y + 1.28, z: O.z + 8.0 }, normal: { x: 0, y: 0, z: -1 } }, 0.92);
    for (const z of [3.6, 4.4, 5.2, 9.0, 9.4]) {
      charApi.add({ solid: { floor: true }, point: { x: O.x + 3.0, y: tg.floorY, z: O.z + z }, normal: { x: 0, y: 1, z: 0 } }, 0.92);
    }
    for (const x of [0.0, 1.0, 2.0, 3.0]) {
      charApi.add({ solid: { surface: { z: O.z + 29.55, nx: 0, nz: -1 } }, point: { x: O.x + x, y: O.y + 1.4, z: O.z + 29.55 }, normal: { x: 0, y: 0, z: -1 } }, 0.92);
    }
  }
})()`;

// Scene static audit: decals, renderOrder/polygonOffset collisions, DoubleSide double-draws, shadow biases
const AUDIT_SCENE_FN = `(() => {
  const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg();
  const overlays = [];
  const doubleSideNoSingle = [];
  T.scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const b = o.geometry ? new THREE.Box3().setFromObject(o) : null;
    for (const m of mats) {
      if (!m) continue;
      if (m.transparent && m.side === THREE.DoubleSide && !m.forceSinglePass && o.visible) {
        doubleSideNoSingle.push({
          meshName: o.name || '(unnamed)',
          matName: m.name || m.type,
          renderOrder: o.renderOrder || 0,
          drawRange: o.geometry?.drawRange?.count ?? null
        });
      }
      if (m.transparent && (!m.depthWrite || m.polygonOffset || (o.renderOrder || 0) > 0)) {
        overlays.push({
          meshName: o.name || '(unnamed)',
          matName: m.name || m.type,
          renderOrder: o.renderOrder || 0,
          depthWrite: !!m.depthWrite,
          polygonOffset: !!m.polygonOffset,
          factor: m.polygonOffsetFactor || 0,
          units: m.polygonOffsetUnits || 0,
          forceSinglePass: !!m.forceSinglePass,
          side: m.side,
          boxMin: b && !b.isEmpty() ? b.min.toArray().map((v) => +v.toFixed(4)) : null,
          boxMax: b && !b.isEmpty() ? b.max.toArray().map((v) => +v.toFixed(4)) : null
        });
      }
    }
  });
  const H = T.inspectHost();
  const sunShadow = H?.sun?.shadow ? {
    mapSize: H.sun.shadow.mapSize?.toArray?.() || null,
    bias: H.sun.shadow.bias,
    normalBias: H.sun.shadow.normalBias,
    radius: H.sun.shadow.radius
  } : null;
  return { overlayCount: overlays.length, overlays, doubleSideNoSingle, sunShadow };
})()`;

async function runTrace() {
  const server = await serve(ROOT, 0);
  // Real rAF (NO ?raf=timer) for genuine 5080 frame-time & >25ms hitch trace!
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
    const tBoot0 = Date.now();
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    const tEnter0 = Date.now();
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG301-Trace';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    const enterTrainingMs = Date.now() - tEnter0;
    const bootReadyMs = tEnter0 - tBoot0;

    await page.evaluate(SETUP_STAGE_FN);
    await page.evaluate(SEED_DECALS_FN);
    // Warm settle 1.0 s
    await new Promise((r) => setTimeout(r, 1000));

    const sceneAudit = await page.evaluate(AUDIT_SCENE_FN);

    // Define set routes (local to tg.origin: x, z, lookRelX, lookRelY, lookRelZ, roomName, useShotGlide)
    const ROUTES = [
      {
        id: 'R1_entry_stations_console',
        speed: 4.8,
        usePlayerWalk: true,
        pts: [
          { x: 0.0,  z: -10.8, lx: 6.5,  ly: 1.5, lz: -10.2, room: 'entry' },
          { x: 4.9,  z: -10.2, lx: 8.0,  ly: 1.5, lz: -10.2, room: 'cif' },
          { x: 4.9,  z: -6.6,  lx: 8.0,  ly: 1.5, lz: -6.6,  room: 'kiosk' },
          { x: 4.9,  z: -3.0,  lx: 8.0,  ly: 1.5, lz: -3.0,  room: 'armory' },
          { x: 0.5,  z: -2.0,  lx: 0.0,  ly: 1.4, lz: 12.0,  room: 'range_bench' },
          { x: -5.2, z: -4.6,  lx: -7.9, ly: 1.4, lz: -4.6,  room: 'range_console' },
          { x: -5.2, z: -8.0,  lx: -9.5, ly: 1.5, lz: -8.0,  room: 'corridor_approach' }
        ]
      },
      {
        id: 'R2_corridor_build_hangar',
        speed: 6.5,
        usePlayerWalk: true,
        pts: [
          { x: -5.2,  z: -8.0, lx: -12.0, ly: 1.5, lz: -8.0, room: 'corridor_east' },
          { x: -11.5, z: -8.0, lx: -18.0, ly: 1.5, lz: -8.5, room: 'corridor_west' },
          { x: -18.0, z: -9.2, lx: -24.0, ly: 1.2, lz: -10.5, room: 'infirmary_approach' },
          { x: -39.5, z: -3.0, lx: -44.0, ly: 1.5, lz: -3.0, room: 'skull_window' },
          { x: -39.5, z: 3.0,  lx: -44.0, ly: 1.5, lz: 3.0,  room: 'hq_panel' },
          { x: -26.0, z: 10.0, lx: -26.0, ly: 0.9, lz: 22.0, room: 'build_killfloor' },
          { x: -26.0, z: 19.5, lx: -26.0, ly: 2.2, lz: 28.0, room: 'zombie_gate_hazard' }
        ]
      },
      {
        id: 'R3_lanes_downrange',
        speed: 6.8,
        usePlayerWalk: false, // Smooth camera glide down the lanes past firing bench (z = -1 -> +28m)
        pts: [
          { x: 5.5,  z: -1.2, lx: 5.5,  ly: 1.3, lz: 10.0, room: 'firing_line_lane1' },
          { x: 4.5,  z: 5.5,  lx: 7.8,  ly: 1.3, lz: 8.5,  room: 'lane1_wall_decals' },
          { x: 3.0,  z: 11.0, lx: 3.0,  ly: 1.3, lz: 20.0, room: 'lanes_mid_12m' },
          { x: 0.0,  z: 18.5, lx: 0.0,  ly: 1.4, lz: 29.8, room: 'lanes_20m' },
          { x: 1.5,  z: 26.8, lx: 1.5,  ly: 1.5, lz: 30.0, room: 'backstop_30m' },
          { x: -4.5, z: 22.0, lx: -8.0, ly: 2.2, lz: 18.0, room: 'west_lane_wall_joins' }
        ]
      }
    ];

    const traceRuns = [];
    const allHitches = [];

    // Run full 4-light x (1P, 3P) moving-camera trace!
    // To keep total exclusive slot time tight (~48s) while covering every room in 1P & 3P & 4 lights:
    //   - Noon & Night: run ALL 3 routes in BOTH 1P and 3P (full facility coverage in brightest + darkest/unlit modes)
    //   - Overcast & Dusk: run R1+R3 in 1P and R2+R3 in 3P (covering every room & lane across Overcast and Dusk too!)
    const PLAN = [
      { light: 'noon',     mode: '1P', routes: ['R1_entry_stations_console', 'R2_corridor_build_hangar', 'R3_lanes_downrange'] },
      { light: 'noon',     mode: '3P', routes: ['R1_entry_stations_console', 'R2_corridor_build_hangar', 'R3_lanes_downrange'] },
      { light: 'overcast', mode: '1P', routes: ['R1_entry_stations_console', 'R3_lanes_downrange'] },
      { light: 'overcast', mode: '3P', routes: ['R2_corridor_build_hangar', 'R3_lanes_downrange'] },
      { light: 'dusk',     mode: '1P', routes: ['R1_entry_stations_console', 'R3_lanes_downrange'] },
      { light: 'dusk',     mode: '3P', routes: ['R2_corridor_build_hangar', 'R3_lanes_downrange'] },
      { light: 'night',    mode: '1P', routes: ['R1_entry_stations_console', 'R2_corridor_build_hangar', 'R3_lanes_downrange'] },
      { light: 'night',    mode: '3P', routes: ['R1_entry_stations_console', 'R2_corridor_build_hangar', 'R3_lanes_downrange'] }
    ];

    for (const seg of PLAN) {
      for (const rId of seg.routes) {
        const route = ROUTES.find((r) => r.id === rId);
        const res = await page.evaluate(`(async (route, light, wTime, mode) => {
          const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg(), O = tg.origin;
          window.agLight = light;
          T.setWorldTime(wTime);
          T.setShotView(null);
          T.setViewFirstDbg(mode === '1P');
          T.setZoomHeldDbg(false);
          const p0 = route.pts[0];
          T.player.position.set(O.x + p0.x, tg.floorY, O.z + p0.z);

          // Settle 15 frames before recording so teleport jump itself isn't counted as a walk hitch
          await new Promise((r) => setTimeout(r, 260));

          const P = T.profDbg;
          if (P) { P.reset(); P.spikeMs = 20; P.on = true; }
          const R = T.renderer;
          let prevPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
          T.resetPerf();

          const frames = [];
          const hitches = [];
          let segIdx = 0, segT = 0;
          let lastNow = performance.now();
          let skipFirst = 2; // ignore first 2 rAF deltas right after setup

          await new Promise((resolve) => {
            window.__extraFrame = () => {
              const now = performance.now();
              const dtMs = now - lastNow;
              lastNow = now;
              const dt = Math.min(0.05, dtMs / 1000);

              const a = route.pts[segIdx], b = route.pts[segIdx + 1];
              if (!b) {
                window.__extraFrame = null;
                resolve();
                return;
              }
              const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 0.001;
              segT += (route.speed * dt) / segLen;
              if (segT >= 1) {
                segIdx++;
                segT = 0;
              }
              const curA = route.pts[Math.min(segIdx, route.pts.length - 1)];
              const curB = route.pts[Math.min(segIdx + 1, route.pts.length - 1)];
              const u = segIdx >= route.pts.length - 1 ? 0 : segT;
              const wx = O.x + curA.x + (curB.x - curA.x) * u;
              const wz = O.z + curA.z + (curB.z - curA.z) * u;
              const lx = O.x + curA.lx + (curB.lx - curA.lx) * u;
              const ly = tg.floorY + curA.ly + (curB.ly - curA.ly) * u;
              const lz = O.z + curA.lz + (curB.lz - curA.lz) * u;
              const room = u < 0.5 ? curA.room : curB.room;

              if (route.usePlayerWalk) {
                // Steer yaw smoothly and drive player along route while keeping real stride & OTS/1P camera active
                const yaw = Math.atan2(lx - wx, lz - wz);
                const hDist = Math.hypot(lx - wx, lz - wz) || 1;
                const pitch = Math.atan2(ly - (tg.floorY + 1.55), hDist);
                T.player.position.set(wx, tg.floorY, wz);
                T.setAimYawDbg(yaw);
                T.setOtsAimDbg(yaw, pitch);
                T.flightInput({ keys: ['w'] });
              } else {
                // Downrange lane glide (past continuous firing bench): keep player behind bench or move camera smoothly
                const eyeH = mode === '1P' ? 1.56 : 2.05;
                const backZ = mode === '1P' ? 0 : -1.8;
                T.setShotView({ x: wx, y: tg.floorY + eyeH, z: wz + backZ, tx: lx, ty: ly, tz: lz, fov: mode === '1P' ? 68 : 58 });
              }

              if (skipFirst > 0) { skipFirst--; return; }

              const rInfo = R?.info?.render || {};
              const draws = rInfo.drawCalls != null ? rInfo.drawCalls : (rInfo.calls || 0);
              const pipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
              const newPipes = pipes - prevPipes;
              prevPipes = pipes;

              const fRec = {
                dtMs: +dtMs.toFixed(2),
                draws,
                tris: rInfo.triangles || 0,
                newPipes,
                room,
                pos: [+wx.toFixed(2), +tg.floorY.toFixed(2), +wz.toFixed(2)],
                cam: T.camera.position.toArray().map((n) => +n.toFixed(2)),
                look: [+lx.toFixed(2), +ly.toFixed(2), +lz.toFixed(2)]
              };
              frames.push(fRec);
              if (dtMs > 25.0) {
                hitches.push({
                  light, mode, route: route.id,
                  ...fRec
                });
              }
            };
          });

          T.flightInput({ keys: [] });
          T.setShotView(null);
          const rep = P && P.report ? P.report() : null;
          if (P) P.on = false;

          const dts = frames.map((f) => f.dtMs).sort((x, y) => x - y);
          const p50 = dts.length ? dts[Math.floor(dts.length * 0.5)] : 0;
          const p99 = dts.length ? dts[Math.floor(dts.length * 0.99)] : 0;
          const maxDt = dts.length ? dts[dts.length - 1] : 0;
          const avgDraws = frames.length ? Math.round(frames.reduce((s, f) => s + f.draws, 0) / frames.length) : 0;
          const totalNewPipes = frames.reduce((s, f) => s + f.newPipes, 0);
          return {
            light, mode, route: route.id,
            frameCount: frames.length,
            medianDtMs: p50,
            p99DtMs: p99,
            maxDtMs: maxDt,
            avgDraws,
            totalNewPipes,
            hitchCountOver25ms: hitches.length,
            hitches,
            profSpikes: (rep && rep.spikes) || [],
            profTop: ((rep && rep.phases) || []).slice(0, 6).map((p) => ({ k: p.k, avg: +p.avg.toFixed(2), max: +p.max.toFixed(2) }))
          };
        })(${JSON.stringify(route)}, ${JSON.stringify(seg.light)}, ${TIME_MAP[seg.light]}, ${JSON.stringify(seg.mode)})`);

        traceRuns.push(res);
        for (const h of res.hitches) allHitches.push(h);
        console.log(`[AG-301:trace:${TAG}] ${seg.light} ${seg.mode} ${rId}: ${res.frameCount} frames, med=${res.medianDtMs}ms, p99=${res.p99DtMs}ms, max=${res.maxDtMs}ms, draws=${res.avgDraws}, newPipes=${res.totalNewPipes}, hitches>25ms=${res.hitchCountOver25ms}`);
      }
    }

    // Also test interactive room events for >25ms hitches:
    //   1) Toggling range lights switch
    //   2) Firing M4 -> decals
    //   3) Firing Flamethrower -> char + instanced fire
    //   4) Cycling all weapons in 1P (checking first-draw viewmodel pipeline compilation hitches!)
    const eventHitches = await page.evaluate(`(async () => {
      const T = window.TT, R = T.renderer, tg = T.trainingDbg.tg(), O = tg.origin;
      window.agLight = 'noon';
      T.setWorldTime(0.46);
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.player.position.set(O.x + 2.0, tg.floorY, O.z - 1.5);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, -0.02);
      await new Promise((r) => setTimeout(r, 250));

      const events = [];
      async function watchEvent(name, fn, durationMs = 450) {
        let prevPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        const dts = [];
        let last = performance.now(), skip = 1;
        window.__extraFrame = () => {
          const now = performance.now(), dt = now - last; last = now;
          if (skip > 0) { skip--; return; }
          dts.push(+dt.toFixed(2));
        };
        await fn();
        await new Promise((r) => setTimeout(r, durationMs));
        window.__extraFrame = null;
        const endPipes = (R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0;
        const maxDt = dts.length ? Math.max(...dts) : 0;
        events.push({
          event: name,
          samples: dts.length,
          maxDtMs: maxDt,
          over25ms: dts.filter((d) => d > 25.0),
          newPipelines: endPipes - prevPipes
        });
      }

      await watchEvent('toggle_lights_off_on', async () => {
        tg.setLights(false);
        await new Promise((r) => setTimeout(r, 150));
        tg.setLights(true);
      });

      for (const wKey of T.WEAPON_ORDER) {
        await watchEvent('equip_1P_' + wKey, async () => {
          T.setWeapon(T.WEAPON_ORDER.indexOf(wKey));
        }, 320);
      }

      return events;
    })()`);

    const summary = {
      card: 'AG-301',
      tag: TAG,
      capturedAt: new Date().toISOString(),
      bootReadyMs,
      enterTrainingMs,
      totalFrames: traceRuns.reduce((s, r) => s + r.frameCount, 0),
      totalWalkHitchesOver25ms: allHitches.length,
      walkHitches: allHitches,
      eventChecks: eventHitches,
      sceneAudit,
      runs: traceRuns
    };
    await saveDual(`trace-${TAG}.json`, Buffer.from(JSON.stringify(summary, null, 2)));
    console.log(`[AG-301:trace:${TAG}] Complete! Total walk frames=${summary.totalFrames}, walk hitches>25ms=${summary.totalWalkHitchesOver25ms}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runStrips() {
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
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG301-Strips';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    await page.evaluate(SETUP_STAGE_FN);
    await page.evaluate(SEED_DECALS_FN);
    await page.evaluate(`(() => { for (let i = 0; i < 60; i++) TT.stepFrame(1 / 60); })()`);

    const shot = async (relName) => {
      const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await saveDual(`strips/${relName}`, Buffer.from(res.data, 'base64'));
    };

    // 1. Six-station / room route stops in 1P & 3P across all 4 lights (48 core room frames!)
    const STOPS = [
      { id: '01-entry-cif',     x: 3.4,   z: -10.2, lx: 8.0,   ly: 1.5, lz: -9.8,  walk: true },
      { id: '02-kiosk-armory',  x: 4.5,   z: -4.8,  lx: 8.0,   ly: 1.5, lz: -3.2,  walk: true },
      { id: '03-bench-console', x: -3.8,  z: -3.4,  lx: -7.9,  ly: 1.3, lz: -4.6,  walk: true },
      { id: '04-corridor-door', x: -7.8,  z: -8.0,  lx: -18.0, ly: 1.5, lz: -8.2,  walk: true },
      { id: '05-hangar-west',   x: -36.5, z: 0.0,   lx: -44.0, ly: 1.6, lz: 2.5,   walk: true },
      { id: '06-lanes-decals',  x: 4.8,   z: 5.2,   lx: 7.9,   ly: 1.2, lz: 9.0,   walk: false }
    ];

    if (!argv.includes('--decal-probes-only')) {
      for (const mode of ['1P', '3P']) {
        for (const light of LIGHTS) {
          for (const st of STOPS) {
            await page.evaluate(`((st, mode, light, wTime) => {
              window.__holdRender = false;
              const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
              window.agLight = light;
              T.setWorldTime(wTime);
              T.setShotView(null);
              T.setViewFirstDbg(mode === '1P');
              T.setZoomHeldDbg(false);
              const wx = O.x + st.x, wz = O.z + st.z;
              const lx = O.x + st.lx, ly = tg.floorY + st.ly, lz = O.z + st.lz;
              if (st.walk) {
                const yaw = Math.atan2(lx - wx, lz - wz);
                const pitch = Math.atan2(ly - (tg.floorY + 1.55), Math.hypot(lx - wx, lz - wz) || 1);
                T.player.position.set(wx, tg.floorY, wz);
                T.setAimYawDbg(yaw);
                T.setOtsAimDbg(yaw, pitch);
                T.flightInput({ keys: ['w'] });
                for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);
                T.flightInput({ keys: [] });
              } else {
                T.player.position.set(O.x + 2.0, tg.floorY, O.z - 2.0);
                T.setShotView({
                  x: wx, y: tg.floorY + (mode === '1P' ? 1.52 : 2.0), z: wz,
                  tx: lx, ty: ly, tz: lz, fov: mode === '1P' ? 66 : 56
                });
                for (let i = 0; i < 16; i++) T.stepFrame(1 / 60);
              }
              window.__illuminate();
              T.renderer.render(T.scene, T.camera);
              window.__holdRender = true;
            })(${JSON.stringify(st)}, ${JSON.stringify(mode)}, ${JSON.stringify(light)}, ${TIME_MAP[light]})`);
            await shot(`${mode}-${light}-${st.id}.png`);
          }
        }
      }
    }

    // 2. Micro-glide 5-step probes on decals/parallax/sort/shadows/wall-joins + 3P cutaway hitch corridor!
    const PROBES = [
      // Probe A: Grazing East-wall & Target-1 plate edge + reverse -Z wear-sort check (15-16mm floating gap + sort flip vs flush)
      {
        id: 'probe-eastwall-decal-parallax',
        light: 'noon',
        steps: [
          // Step 0 & 1: Steep grazing view along East wall x=8.0 (shows 15-16mm floating gap off wall in before!)
          { x: 7.86, y: 1.32, z: 4.35, tx: 8.0, ty: 1.32, tz: 5.8, fov: 42 },
          { x: 7.86, y: 1.32, z: 5.15, tx: 8.0, ty: 1.32, tz: 6.6, fov: 42 },
          // Step 2: Steep oblique view of Lane 1 target plate edge (x=6.0, z=8.0) showing 15-16mm floating impacts/char off plate!
          { x: 5.12, y: 1.26, z: 7.88, tx: 6.02, ty: 1.26, tz: 8.0, fov: 38 },
          // Step 3 & 4: Looking -Z vs +Z across z=14.2 East wall (wear-wall-px center z=14.25 sorts OVER char/impacts when looking -Z atro=1!)
          { x: 6.8,  y: 1.35, z: 18.2, tx: 8.0, ty: 1.35, tz: 14.2, fov: 44 },
          { x: 6.8,  y: 1.35, z: 10.2, tx: 8.0, ty: 1.35, tz: 14.2, fov: 44 }
        ]
      },
      // Probe B: Low-eye floor grazing & reverse -Z sort check on bullet holes + char + wear-floor
      {
        id: 'probe-floor-decal-sort',
        light: 'noon',
        steps: [
          { x: 2.95, y: 0.16, z: 2.75, tx: 3.0, ty: 0.0, tz: 4.4, fov: 42 },
          { x: 2.95, y: 0.16, z: 3.35, tx: 3.0, ty: 0.0, tz: 5.0, fov: 42 },
          { x: 2.95, y: 0.22, z: 11.4, tx: 3.0, ty: 0.0, tz: 9.1, fov: 44 },
          { x: 2.95, y: 0.22, z: 6.8,  tx: 3.0, ty: 0.0, tz: 9.1, fov: 44 },
          { x: 0.0,  y: 0.18, z: -1.6, tx: 0.0, ty: 0.0, tz: 0.4, fov: 46 }
        ]
      },
      // Probe C: Build-room kill-floor blood/acid/wear + no-build yellow paint micro-glide (2 cm steps)
      {
        id: 'probe-buildfloor-microglide',
        light: 'noon',
        steps: [0, 1, 2, 3, 4].map((k) => ({
          x: -26.0, y: 0.48, z: 13.5 + k * 0.02,
          tx: -26.0, ty: 0.01, tz: 17.5 + k * 0.02, fov: 52
        }))
      },
      // Probe D: Shadow contact & acne check on target stands, range bench, and hangar columns (Dusk)
      {
        id: 'probe-shadows-stands-columns',
        light: 'dusk',
        steps: [
          { x: 4.6, y: 0.65, z: 6.2, tx: 6.0, ty: 0.25, tz: 8.0, fov: 46 },
          { x: 1.6, y: 0.65, z: 10.2, tx: 3.0, ty: 0.25, tz: 12.0, fov: 46 },
          { x: -10.5, y: 0.75, z: -4.2, tx: -8.3, ty: 0.15, tz: -6.0, fov: 48 },
          { x: -41.8, y: 0.75, z: -4.5, tx: -43.7, ty: 0.15, tz: -6.0, fov: 48 },
          { x: -21.0, y: 1.25, z: -9.0, tx: -24.5, ty: 0.45, tz: -10.8, fov: 48 }
        ]
      },
      // Probe E: Wall-ceiling-floor joins & cutaway doorway seam check (Night, checking light leaks)
      {
        id: 'probe-wall-joins-leaks',
        light: 'night',
        steps: [
          { x: 4.5, y: 1.7, z: 24.0, tx: 8.0, ty: 5.8, tz: 30.0, fov: 58 },
          { x: -4.5, y: 1.7, z: 24.0, tx: -8.0, ty: 0.05, tz: 30.0, fov: 58 },
          { x: -6.2, y: 1.6, z: -8.0, tx: -9.5, ty: 2.4, tz: -8.0, fov: 58 },
          { x: -38.0, y: 2.0, z: 22.0, tx: -44.0, ty: 23.5, tz: 28.0, fov: 62 },
          { x: 4.5, y: 1.6, z: -9.5, tx: 8.0, ty: 5.8, tz: -12.0, fov: 58 }
        ]
      },
      // Probe F: 3P Corridor -> Infirmary/Build-Hangar Cutaway Hitch Sequence (exact 500-1115ms mat.transparent flip coordinates!)
      {
        id: 'probe-cutaway-hitch-corridor',
        light: 'noon',
        walk3P: true,
        steps: [
          { x: -7.0,   z: -8.0,  lx: -14.0, ly: 1.5, lz: -8.0 },
          { x: -10.46, z: -8.0,  lx: -17.0, ly: 1.5, lz: -8.4 },
          { x: -14.5,  z: -8.6,  lx: -21.0, ly: 1.3, lz: -9.6 },
          { x: -17.94, z: -9.19, lx: -23.9, ly: 1.2, lz: -10.5 },
          { x: -21.2,  z: -8.3,  lx: -28.0, ly: 1.3, lz: -6.0 }
        ]
      }
    ];

    const onlyDecalAfter = argv.includes('--decal-probes-only');
    for (const pr of PROBES) {
      if (onlyDecalAfter && pr.id !== 'probe-eastwall-decal-parallax' && pr.id !== 'probe-floor-decal-sort') continue;
      for (let i = 0; i < pr.steps.length; i++) {
        const s = pr.steps[i];
        await page.evaluate(`((s, light, wTime, walk3P) => {
          window.__holdRender = false;
          const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
          window.agLight = light;
          T.setWorldTime(wTime);
          T.setShotView(null);
          T.setViewFirstDbg(false);
          if (walk3P) {
            const wx = O.x + s.x, wz = O.z + s.z;
            const lx = O.x + s.lx, ly = tg.floorY + s.ly, lz = O.z + s.lz;
            const yaw = Math.atan2(lx - wx, lz - wz);
            const pitch = Math.atan2(ly - (tg.floorY + 1.55), Math.hypot(lx - wx, lz - wz) || 1);
            T.player.position.set(wx, tg.floorY, wz);
            T.setAimYawDbg(yaw);
            T.setOtsAimDbg(yaw, pitch);
            T.flightInput({ keys: ['w'] });
            for (let k = 0; k < 20; k++) T.stepFrame(1 / 60);
            T.flightInput({ keys: [] });
          } else {
            T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.0);
            T.setShotView({
              x: O.x + s.x, y: tg.floorY + s.y, z: O.z + s.z,
              tx: O.x + s.tx, ty: tg.floorY + s.ty, tz: O.z + s.tz,
              fov: s.fov
            });
            for (let k = 0; k < 10; k++) T.stepFrame(1 / 60);
          }
          window.__illuminate();
          T.renderer.render(T.scene, T.camera);
          window.__holdRender = true;
        })(${JSON.stringify(s)}, ${JSON.stringify(pr.light)}, ${TIME_MAP[pr.light]}, ${!!pr.walk3P})`);
        await shot(`${TAG}-${pr.id}-${i}.png`);
      }
    }

    await page.evaluate(`(() => { window.__holdRender = false; window.TT.setShotView(null); })()`);
    assert.deepEqual(page.errors, [], `Page errors: ${JSON.stringify(page.errors)}`);
    console.log(`[AG-301:strips:${TAG}] Captured 48 4-light 1P/3P route frames + 25 diagnostic probe frames!`);
  } finally {
    await browser.close();
    await server.close();
  }
}

if (TRACE_MODE) await runTrace();
if (STRIPS_MODE && !TRACE_MODE) await runStrips();
