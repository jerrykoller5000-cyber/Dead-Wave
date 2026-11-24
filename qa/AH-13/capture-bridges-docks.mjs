// qa/AH-13/capture-bridges-docks.mjs — Native RTX 5080 WebGPU before/after capture + live clipping/catching diagnostics
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'AH-13');
fs.mkdirSync(OUT_DIR, { recursive: true });

const tag = (process.argv[2] || 'before').replace(/[^a-z0-9_-]/gi, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const W = 1600, H = 900;

async function main() {
  const server = await serve(ROOT, 0);
  let browser = null;
  try {
    // On Windows with RTX 5080, launch visible GPU window (CB-345 sequence) so WebGPU renders cleanly
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`],
    });
    const page = await browser.newPage({ width: W, height: H });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: W + 20, height: H + 80 } });
      await page.send('Page.bringToFront');
    } catch (_) {}

    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    await page.goto(url, { timeout: 180000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    const hasTT = await page.waitFor('!!window.TT', { timeout: 240000 });
    if (!hasTT) throw new Error('window.TT did not load: ' + (page.errors[0] || 'unknown'));
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await sleep(700);

    // Install CamRig for clean UI hiding & world time control
    await page.evaluate(`import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })`);

    // Start a real match so player physics/movement/collisions run live
    await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'AH13Diag';
      const huntBtn = document.getElementById('modeHunt');
      if (huntBtn) huntBtn.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      if (T.runDevCommand) T.runDevCommand('godmode');
      if (T.clearZombies) T.clearZombies();
      if (T.skipGrace) T.skipGrace();
      // Let insertion harness settle cleanly if still active
      for (let i = 0; i < 600; i++) {
        if (!T.marine || !T.marine.getObjectByName('insertion-harness')) break;
        if (T.stepFrame) T.stepFrame(0.05);
      }
      if (T.clearZombies) T.clearZombies();
      // Park player out of sight while shooting scenic bridge/dock stills
      T.player.position.set(0, T.sampleHeight(0, 0), 0);
      if (T.setWorldTime) T.setWorldTime(0.42); // crisp afternoon daylight
      window.CamRig.ui(false);
      await wait(300);
      return T.getPhase ? T.getPhase() : 'unknown';
    })()`, 180000);

    // Wait for first real render frame with drawCalls > 0
    await page.waitFor('(() => { try { return (window.TT.renderer.info.render.calls || 0) > 0; } catch { return true; } })()', { timeout: 20000 });
    await sleep(250);

    // Compute exact deterministic world cameras in each bridge & dock local frame
    const shots = await page.evaluate(`(() => {
      const T = window.TT;
      const out = [];
      const toW = (o, lx, ly, lz) => {
        const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
        return {
          x: o.x + lx * c + lz * s,
          y: o.deckY + ly,
          z: o.z - lx * s + lz * c
        };
      };
      for (let bi = 0; bi < T.POI.bridges.length; bi++) {
        const b = T.POI.bridges[bi];
        const ovCam = toW(b, 8.8, 5.4, -10.8);
        const ovTgt = toW(b, 0, 0.25, 0);
        out.push({
          name: 'bridge-' + bi + '-overview',
          cam: { x: ovCam.x, y: ovCam.y, z: ovCam.z, tx: ovTgt.x, ty: ovTgt.y, tz: ovTgt.z, fov: 44 }
        });
        const apCam = toW(b, -0.35, 1.55, -11.4);
        const apTgt = toW(b, 0.0, 0.25, -4.5);
        out.push({
          name: 'bridge-' + bi + '-approach',
          cam: { x: apCam.x, y: apCam.y, z: apCam.z, tx: apTgt.x, ty: apTgt.y, tz: apTgt.z, fov: 48 }
        });
        if (bi === 0) {
          const unCam = toW(b, 6.2, -0.55, 2.2);
          const unTgt = toW(b, 0, -0.45, -0.8);
          out.push({
            name: 'bridge-0-under',
            cam: { x: unCam.x, y: unCam.y, z: unCam.z, tx: unTgt.x, ty: unTgt.y, tz: unTgt.z, fov: 48 }
          });
        }
      }
      if (T.POI.dock) {
        const d = T.POI.dock;
        const ovCam = toW(d, 7.6, 4.4, -7.2);
        const ovTgt = toW(d, 0, 0.2, 0.5);
        out.push({
          name: 'dock-overview',
          cam: { x: ovCam.x, y: ovCam.y, z: ovCam.z, tx: ovTgt.x, ty: ovTgt.y, tz: ovTgt.z, fov: 45 }
        });
        const apCam = toW(d, -0.25, 1.55, -8.3);
        const apTgt = toW(d, 0.0, 0.15, -1.0);
        out.push({
          name: 'dock-approach',
          cam: { x: apCam.x, y: apCam.y, z: apCam.z, tx: apTgt.x, ty: apTgt.y, tz: apTgt.z, fov: 48 }
        });
        const endCam = toW(d, -4.6, 2.1, 6.4);
        const endTgt = toW(d, 0.2, 0.0, 1.6);
        out.push({
          name: 'dock-end',
          cam: { x: endCam.x, y: endCam.y, z: endCam.z, tx: endTgt.x, ty: endTgt.y, tz: endTgt.z, fov: 45 }
        });
      }
      return out;
    })()`);

    const perfByShot = {};
    for (const s of shots) {
      const info = await page.evaluate(`(async () => {
        const T = window.TT;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        T.setShotView(${JSON.stringify(s.cam)});
        for (let i = 0; i < 4; i++) {
          if (T.stepFrame) T.stepFrame(1 / 60);
          await wait(35);
        }
        await wait(160);
        const r = T.renderer.info.render || {};
        const mem = T.renderer.info.memory || {};
        return { calls: r.calls || 0, triangles: r.triangles || 0, geometries: mem.geometries || 0, textures: mem.textures || 0 };
      })()`);
      perfByShot[s.name] = info;
      const outPath = path.join(OUT_DIR, `${tag}-${s.name}.png`);
      await page.screenshot(outPath);
      console.log(`[SHOT] ${tag}-${s.name}.png  calls=${info.calls} tris=${info.triangles}`);
    }

    // Release shot view and run comprehensive clipping, catching & terrain-bleed physics diagnostics
    const diag = await page.evaluate(`(async () => {
      const T = window.TT;
      T.setShotView(null);
      const PLAYER_R = 0.42;
      const toW = (o, lx, lz) => {
        const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
        return { x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c };
      };
      const toL = (o, wx, wz) => {
        const dx = wx - o.x, dz = wz - o.z, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
        return { lx: dx * c - dz * s, lz: dx * s + dz * c };
      };
      // Real player collision step via live stepFrame with held input or stepped position
      function probeTerrainBleed(o, hw, hl, visualPlankTop, undersideY) {
        let pokeAbove = 0, pokeInside = 0, maxOver = -99, maxOverAt = null;
        let underPoke = 0;
        for (let lz = -hl + 0.1; lz <= hl - 0.1; lz += 0.25) {
          for (let lx = -hw + 0.05; lx <= hw - 0.05; lx += 0.2) {
            const w = toW(o, lx, lz);
            const g = T.sampleHeight(w.x, w.z);
            const over = g - visualPlankTop;
            if (over > maxOver) { maxOver = over; maxOverAt = { lx: +lx.toFixed(2), lz: +lz.toFixed(2), g: +g.toFixed(3) }; }
            if (over > -0.005) pokeAbove++;
            if (g > undersideY + 0.02 && Math.abs(lz) < hl - 0.8) underPoke++;
            if (g > o.deckY - 0.02) pokeInside++;
          }
        }
        // Check end lips right outside deck edges
        const endSteps = {};
        for (const end of [-1, 1]) {
          const lips = [];
          for (const lx of [-hw * 0.7, 0, hw * 0.7]) {
            const wOut = toW(o, lx, end * (hl + 0.2));
            const wFar = toW(o, lx, end * (hl + 0.7));
            lips.push({
              lx: +lx.toFixed(2),
              gapAt20cm: +(visualPlankTop - T.sampleHeight(wOut.x, wOut.z)).toFixed(3),
              gapAt70cm: +(visualPlankTop - T.sampleHeight(wFar.x, wFar.z)).toFixed(3)
            });
          }
          endSteps[end < 0 ? 'negEnd' : 'posEnd'] = lips;
        }
        return { pokeAbove, pokeInside, underPoke, maxOver: +maxOver.toFixed(3), maxOverAt, endSteps };
      }

      function probeStaticWidth(o, hw, lz, footY, entR) {
        let minClear = null, maxClear = null;
        for (let lx = -hw; lx <= hw + 1e-6; lx += 0.02) {
          const w = toW(o, lx, lz);
          const r = T.resolveStaticProps(w.x, w.z, entR, footY);
          const shove = Math.hypot(r.x - w.x, r.z - w.z);
          if (shove < 0.005) {
            if (minClear === null) minClear = lx;
            maxClear = lx;
          }
        }
        return {
          minClear: minClear == null ? null : +minClear.toFixed(2),
          maxClear: maxClear == null ? null : +maxClear.toFixed(2),
          clearWidth: (minClear == null || maxClear == null) ? 0 : +(maxClear - minClear).toFixed(2)
        };
      }

      // Live player walk test along a path in bridge/dock local coordinates using actual stepFrame!
      function liveWalk(o, startLx, startLz, endLx, endLz, startOnDeck) {
        const p = T.player.position;
        const w0 = toW(o, startLx, startLz);
        const plat = T.platforms.find(pl => pl.landmark && Math.hypot(pl.x - o.x, pl.z - o.z) < 0.5);
        const startY = startOnDeck && plat ? plat.deckY : Math.max(T.sampleHeight(w0.x, w0.z), (T.platformHeightAt(w0.x, w0.z, T.sampleHeight(w0.x, w0.z) + 0.75) ?? -999));
        p.set(w0.x, startY, w0.z);
        for (let k = 0; k < 5; k++) T.stepFrame(1 / 60);
        const wEnd = toW(o, endLx, endLz);
        const totalDist = Math.hypot(wEnd.x - w0.x, wEnd.z - w0.z);
        const steps = Math.max(40, Math.ceil(totalDist / 0.12));
        let prevY = p.y;
        let maxVSnap = 0, maxLatErr = 0, snags = 0, maxShove = 0, minY = p.y, maxY = p.y;
        const snagSpots = [];
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const wantX = w0.x + (wEnd.x - w0.x) * t;
          const wantZ = w0.z + (wEnd.z - w0.z) * t;
          // Move incrementally from current resolved position toward next waypoint (capped at ~0.18m/step)
          const dx = wantX - p.x, dz = wantZ - p.z;
          const d = Math.hypot(dx, dz);
          const step = Math.min(d, 0.16);
          const preX = p.x + (d > 1e-5 ? (dx / d) * step : 0);
          const preZ = p.z + (d > 1e-5 ? (dz / d) * step : 0);
          p.x = preX; p.z = preZ;
          T.stepFrame(1 / 60);
          const shove = Math.hypot(p.x - preX, p.z - preZ);
          if (shove > maxShove) maxShove = shove;
          if (shove > 0.03) {
            snags++;
            if (snagSpots.length < 6) {
              const loc = toL(o, preX, preZ);
              snagSpots.push({ lx: +loc.lx.toFixed(2), lz: +loc.lz.toFixed(2), y: +p.y.toFixed(2), shove: +shove.toFixed(3) });
            }
          }
          const dv = Math.abs(p.y - prevY);
          if (dv > maxVSnap) maxVSnap = dv;
          prevY = p.y;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          // Perpendicular distance to ideal line
          const lineDx = wEnd.x - w0.x, lineDz = wEnd.z - w0.z;
          const lat = Math.abs((p.x - w0.x) * (-lineDz) + (p.z - w0.z) * lineDx) / (totalDist || 1);
          if (lat > maxLatErr) maxLatErr = lat;
        }
        const remDist = Math.hypot(p.x - wEnd.x, p.z - wEnd.z);
        return {
          reached: remDist < 0.5,
          remDist: +remDist.toFixed(2),
          snags,
          maxShove: +maxShove.toFixed(3),
          maxLatErr: +maxLatErr.toFixed(2),
          maxVSnap: +maxVSnap.toFixed(3),
          yRange: [+minY.toFixed(2), +maxY.toFixed(2)],
          snagSpots
        };
      }

      const results = { bridges: [], dock: null, renderer: window.CamRig.renderer(), errors: [] };

      for (let bi = 0; bi < T.POI.bridges.length; bi++) {
        const b = T.POI.bridges[bi];
        const plat = T.platforms.find(pl => pl.landmark && Math.hypot(pl.x - b.x, pl.z - b.z) < 0.5);
        const hw = 1.35, hl = 8.2;
        const deckY = b.deckY;
        const visualTop = deckY + 0.07;
        const railSolids = T.worldSolids.filter(ws => Math.hypot(ws.x - b.x, ws.z - b.z) < 11 && ws.y1 > deckY);
        // Under-bridge ceiling check at river center
        const underG = T.sampleHeight(b.x, b.z);
        const p = T.player.position;
        p.set(b.x, underG, b.z);
        for (let k = 0; k < 5; k++) T.stepFrame(1 / 60);
        const underPlayerY = p.y;
        const stringerBottom = deckY - 0.51;
        const headClearance = +(stringerBottom - (underPlayerY + 1.7)).toFixed(3);
        const midWalkPlayer = probeStaticWidth(b, hw, 0, plat ? plat.deckY : deckY + 0.09, PLAYER_R);
        const mouthWalkPlayer = probeStaticWidth(b, hw, -hl + 0.25, plat ? plat.deckY : deckY + 0.09, PLAYER_R);
        const midWalkZombie = probeStaticWidth(b, hw, 0, plat ? plat.deckY : deckY + 0.09, 0.4);
        results.bridges.push({
          index: bi,
          pos: { x: +b.x.toFixed(2), z: +b.z.toFixed(2), yaw: +b.yaw.toFixed(3), deckY: +deckY.toFixed(3) },
          platform: plat ? { hw: plat.hw, hl: plat.hl, deckY: +plat.deckY.toFixed(3), under: plat.under ?? null } : null,
          railSolidCount: railSolids.length,
          railSolidRadiusSample: railSolids.slice(0, 6).map(r => +r.radius.toFixed(2)),
          terrain: probeTerrainBleed(b, hw, hl, visualTop, deckY - 0.08),
          clearWidthPlayerMid: midWalkPlayer,
          clearWidthPlayerMouth: mouthWalkPlayer,
          clearWidthZombieMid: midWalkZombie,
          underBridge: { channelGroundY: +underG.toFixed(2), playerY: +underPlayerY.toFixed(2), stringerBottom: +stringerBottom.toFixed(2), headClearance },
          walks: {
            center: liveWalk(b, 0, -hl - 3.5, 0, hl + 3.5, false),
            leftLane65: liveWalk(b, -0.65, -hl - 3.0, -0.65, hl + 3.0, false),
            rightLane65: liveWalk(b, 0.65, -hl - 3.0, 0.65, hl + 3.0, false),
            diagApproach: liveWalk(b, -1.6, -hl - 2.6, 0.0, 0.0, false),
            sideBankWalk: liveWalk(b, 2.0, -hl - 3.0, 2.0, -hl + 1.5, false),
            underWadeClear: liveWalk(b, -3.5, 2.1, 3.5, 2.1, false),
            underPilingStop: liveWalk(b, -3.5, 0.0, 3.5, 0.0, false),
            railStopTest: liveWalk(b, 0.0, 0.0, 1.5, 0.0, true)
          }
        });
      }

      if (T.POI.dock) {
        const d = T.POI.dock;
        const plat = T.platforms.find(pl => pl.landmark && Math.hypot(pl.x - d.x, pl.z - d.z) < 0.5);
        const hw = 1.15, hl = 4.75;
        const deckY = d.deckY;
        const visualTop = deckY + 0.06;
        results.dock = {
          pos: { x: +d.x.toFixed(2), z: +d.z.toFixed(2), yaw: +d.yaw.toFixed(3), deckY: +deckY.toFixed(3) },
          platform: plat ? { hw: plat.hw, hl: plat.hl, deckY: +plat.deckY.toFixed(3), under: plat.under ?? null } : null,
          terrain: probeTerrainBleed(d, hw, hl, visualTop, deckY - 0.08),
          clearWidthMid: probeStaticWidth(d, hw, 0, plat ? plat.deckY : deckY + 0.08, PLAYER_R),
          clearWidthEntrance: probeStaticWidth(d, hw, -hl + 0.85, plat ? plat.deckY : deckY + 0.08, PLAYER_R),
          walks: {
            center: liveWalk(d, 0, -hl - 3.5, 0, hl - 0.4, false),
            leftLane55: liveWalk(d, -0.55, -hl - 3.0, -0.55, hl - 0.5, false),
            rightLane55: liveWalk(d, 0.55, -hl - 3.0, 0.55, hl - 0.5, false),
            diagShoreEntry: liveWalk(d, -1.5, -hl - 2.0, 0.0, 0.5, false),
            shorePastCorner: liveWalk(d, -1.8, -hl - 2.0, -1.8, -hl + 2.0, false)
          }
        };
      }
      return results;
    })()`, 120000);

    const report = { tag, timestamp: new Date().toISOString(), perfByShot, diag, pageErrors: page.errors };
    const jsonPath = path.join(OUT_DIR, `metrics-${tag}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('\n=== DIAGNOSTIC SUMMARY (' + tag + ') ===');
    console.log(JSON.stringify(report, null, 2));
    if (page.errors.length) {
      console.error('PAGE ERRORS:', page.errors);
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
