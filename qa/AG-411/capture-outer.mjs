import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, 'qa', 'AG-411');
const OUT_DIR = path.join(BASE_DIR, TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class OuterCapture extends Engine {
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
      const n = document.getElementById('playerName'); if (n) n.value = 'AG-411';
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
    this.mode = 'world';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function resolveOuterShots(page) {
  return await page.evaluate(`(() => {
    const T = window.TT;
    const gh = (x, z) => T.sampleHeight(x, z);
    const trees = (T.trees || []).filter(t => t && t.alive);

    function findPeak(degCenter, degSpan, rMin, rMax) {
      let best = { x: 0, z: 0, h: -1e9, r: rMin, ang: degCenter * Math.PI / 180 };
      for (let d = -degSpan; d <= degSpan; d += 2) {
        const a = (degCenter + d) * Math.PI / 180;
        for (let r = rMin; r <= rMax; r += 8) {
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          const h = gh(x, z);
          if (h > best.h) best = { x, z, h, r, ang: a };
        }
      }
      return best;
    }

    // Find tree-clear vantage strictly INSIDE the circle (rCam <= 206 m)
    function clearCam(angDeg, rCam, liftY, tx, ty, tz, fov = 62, spanDeg = 5) {
      let bestDeg = angDeg, bestScore = -1e9;
      for (let d = -spanDeg; d <= spanDeg; d += 1) {
        const a = (angDeg + d) * Math.PI / 180;
        const cx = Math.cos(a) * rCam, cz = Math.sin(a) * rCam;
        if (T.waterDepthAt(cx, cz) > 0.25 && rCam > 140) continue;
        let sc = -Math.abs(d) * 0.25;
        const dxT = tx - cx, dzT = tz - cz, dLen = Math.hypot(dxT, dzT) || 1;
        const fx = dxT / dLen, fz = dzT / dLen;
        for (const tr of trees) {
          const dx = tr.x - cx, dz = tr.z - cz;
          const dist = Math.hypot(dx, dz);
          if (dist < 7) sc -= (7 - dist) * 6;
          const fwd = dx * fx + dz * fz;
          const lat = Math.abs(-dx * fz + dz * fx);
          if (fwd > 0 && fwd < 42 && lat < 5.5) sc -= (5.5 - lat) * 3.5;
        }
        if (sc > bestScore) { bestScore = sc; bestDeg = angDeg + d; }
      }
      const a = bestDeg * Math.PI / 180;
      const cx = Math.cos(a) * rCam, cz = Math.sin(a) * rCam;
      const baseH = Math.max(gh(cx, cz), -3.2);
      return {
        x: +cx.toFixed(2), y: +(baseH + liftY).toFixed(2), z: +cz.toFixed(2),
        tx: +tx.toFixed(2), ty: +ty.toFixed(2), tz: +tz.toFixed(2), fov,
      };
    }

    const radialCam = (deg, rCam, liftY, lookR, lookLift, fov = 64) => {
      const a = deg * Math.PI / 180;
      const tx = Math.cos(a) * lookR, tz = Math.sin(a) * lookR;
      return clearCam(deg, rCam, liftY, tx, gh(tx, tz) + lookLift, tz, fov);
    };

    let gateDeg = 181.6;
    T.scene.traverse(o => {
      if (o.name === 'cordon-gate') {
        const wp = new T.THREE.Vector3(); o.getWorldPosition(wp);
        gateDeg = ((Math.atan2(wp.z, wp.x) * 180 / Math.PI) + 360) % 360;
      }
    });
    const riverDeg = ((Math.atan2(132, 232) * 180 / Math.PI) + 360) % 360;

    // Locate landmark targets so every single one of the 7 landmarks gets framed directly from within the circle
    const ridgeline = findPeak(282, 10, 332, 368);
    const lookout = findPeak(64, 6, 304, 336);
    const ovA = (gateDeg * Math.PI / 180) - 0.145;
    const ovT = { x: Math.cos(ovA) * 265, z: Math.sin(ovA) * 265 };
    const trestleA = riverDeg * Math.PI / 180;
    const trestleT = { x: Math.cos(trestleA) * 272, z: Math.sin(trestleA) * 272 };
    const neFarmA = 334 * Math.PI / 180;
    const neFarmT = { x: Math.cos(neFarmA) * 335, z: Math.sin(neFarmA) * 335 };
    const millA = 106 * Math.PI / 180;
    const millT = { x: Math.cos(millA) * 296, z: Math.sin(millA) * 296 };
    const stonesA = 234 * Math.PI / 180;
    const stonesT = { x: Math.cos(stonesA) * 304, z: Math.sin(stonesA) * 304 };

    const camCordon = radialCam(gateDeg - 2, 204, 7.2, 350, 14, 64);
    const camRiver  = clearCam(riverDeg, 204, 7.0, trestleT.x, gh(trestleT.x, trestleT.z) + 18, trestleT.z, 62);
    const camNorth  = clearCam(276, 202, 7.8, ridgeline.x, ridgeline.h + 10, ridgeline.z, 62);
    const camNE     = clearCam(334, 202, 9.5, neFarmT.x, gh(neFarmT.x, neFarmT.z) + 12, neFarmT.z, 62);
    const camSE     = clearCam(60,  202, 8.2, lookout.x, lookout.h + 8, lookout.z, 62);
    const camSouth  = clearCam(105, 202, 8.5, millT.x, gh(millT.x, millT.z) + 12, millT.z, 60);
    const camSW     = radialCam(214, 165, 8.2, 375, 16, 64);
    const camNW     = clearCam(232, 202, 7.5, stonesT.x, gh(stonesT.x, stonesT.z) + 6, stonesT.z, 62);
    const camEast   = radialCam(0,   204, 7.2, 385, 12, 64);

    // Player ground eye-height (+1.75 m) inside circle looking out over the stone wall
    const camEyeWest  = clearCam(gateDeg - 4, 194, 1.75, ovT.x, gh(ovT.x, ovT.z) + 22, ovT.z, 68, 7);
    const camEyeNorth = clearCam(278, 178, 1.75, ridgeline.x, ridgeline.h + 14, ridgeline.z, 68, 8);

    // High FOB Threshold panoramas
    const hqY = gh(0, 0) + 18.0;
    const camHqN = { x: 0, y: +hqY.toFixed(2), z: 0, tx: 0, ty: +(gh(0, -380) + 18).toFixed(2), tz: -380, fov: 66 };
    const camHqS = { x: 0, y: +hqY.toFixed(2), z: 0, tx: 220, ty: +(gh(220, 310) + 14).toFixed(2), tz: 310, fov: 66 };

    // Telephoto close-inspection zooms from inside the circle (stress-tests every silhouette & material!)
    const camTeleRidgeline = clearCam(278, 204, 8.5, ridgeline.x, ridgeline.h + 14, ridgeline.z, 30);
    const camTeleTrestle   = clearCam(riverDeg, 204, 7.5, trestleT.x, gh(trestleT.x, trestleT.z) + 14, trestleT.z, 34);
    const camTeleOverwatch = clearCam(gateDeg - 6, 204, 8.0, ovT.x, gh(ovT.x, ovT.z) + 12, ovT.z, 34);

    return [
      { id: '01-cordon-overwatch-pylons', cap: 'West Cordon Gate: Overwatch, pass road & powerlines (Noon)', time: 'noon', cam: camCordon },
      { id: '02-river-trestle-cascade',   cap: 'ESE River Gate: Broken logging trestle & alpine cascade (Noon)', time: 'noon', cam: camRiver },
      { id: '03-north-ridgeline',         cap: 'North wall: Ridgeline PGB radar command & crags (Noon)', time: 'noon', cam: camNorth },
      { id: '04-ne-pass-farm-viaduct',    cap: 'NE wall: Pass viaduct, farmstead barn/silo & far range (Noon)', time: 'noon', cam: camNE },
      { id: '05-se-lookout-gorge',        cap: 'SE wall: Wilderness Ranger Fire-Lookout & gorge peaks (Noon)', time: 'noon', cam: camSE },
      { id: '06-south-mill-headframe',    cap: 'South wall: Coldwater ore mill, smokestack & headframe (Noon)', time: 'noon', cam: camSouth },
      { id: '07-sw-lake-waterfall-stones',cap: 'SW Lake: Glacial waterfall, alpine ridges & pass (Noon)', time: 'noon', cam: camSW },
      { id: '08-nw-standing-stones-crags',cap: 'NW wall: First People standing stones, crags & forest (Noon)', time: 'noon', cam: camNW },
      { id: '09-east-forest-timberline',  cap: 'East wall: Outer conifer/larch forest & far alpine range (Noon)', time: 'noon', cam: camEast },
      { id: '10-player-eye-west',         cap: 'Player eye-height inside West circle looking over wall (Noon)', time: 'noon', cam: camEyeWest },
      { id: '11-player-eye-north',        cap: 'Player eye-height inside North circle toward Ridgeline (Noon)', time: 'noon', cam: camEyeNorth },
      { id: '12-hq-north-pano',           cap: 'HQ overlook: Full North valley panorama & alpine horizons (Noon)', time: 'noon', cam: camHqN },
      { id: '13-hq-south-pano',           cap: 'HQ overlook: Full SE valley panorama, trestle & lookout (Noon)', time: 'noon', cam: camHqS },
      { id: '14-tele-ridgeline',          cap: 'Telephoto zoom from inside circle: Ridgeline & crags (Noon)', time: 'noon', cam: camTeleRidgeline },
      { id: '15-tele-trestle-cascade',    cap: 'Telephoto zoom from inside circle: Trestle, cascade & pines (Noon)', time: 'noon', cam: camTeleTrestle },
      { id: '16-tele-overwatch-pylon',    cap: 'Telephoto zoom from inside circle: Cordon Overwatch & pylon (Noon)', time: 'noon', cam: camTeleOverwatch },
      { id: '17-overcast-rain-cordon',    cap: 'Overcast / Rain lighting: West pass, Overwatch & outer woods', time: 'afternoon', rain: 0.85, cam: camCordon },
      { id: '18-dusk-ridgeline',          cap: 'Golden Dusk: North Ridgeline alpenglow, haze & beacons', time: 'dusk', cam: camNorth },
      { id: '19-dusk-se-lookout',         cap: 'Golden Dusk: SE Fire Lookout lantern & misty gorge', time: 'dusk', cam: camSE },
      { id: '20-night-ridgeline-ne',      cap: 'Clear Night: Ridgeline beacons, mountain silhouettes & NE lights', time: 'night', cam: camNE },
    ];
  })()`);
}

async function benchView(page, name, cam, time = 'noon') {
  await page.evaluate(`(async () => {
    if (window.TT?.weather) { window.TT.weather.raining = false; window.TT.weather.intensity = 0; }
    await CamRig.aim({ cam: ${JSON.stringify(cam)}, time: ${JSON.stringify(time)}, ui: false, settle: 260 });
  })()`, 30000);
  return await page.evaluate(`(async () => {
    const T = window.TT;
    const frames = [];
    const N = 120;
    const callsStart = T.renderer.info.render.calls;
    await new Promise((resolve) => {
      let prev = performance.now(), n = 0;
      function step(now) {
        if (n > 0) frames.push(now - prev);
        prev = now;
        n++;
        if (n <= N) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
    const sorted = frames.slice().sort((a, b) => a - b);
    const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
    const median = sorted[sorted.length >> 1];
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    const worst = sorted[sorted.length - 1];
    const hitches = frames.filter(dt => dt > 50).length;
    const info = T.renderer.info;
    return {
      name: ${JSON.stringify(name)},
      frames: frames.length,
      meanMs: +mean.toFixed(2),
      meanFps: +(1000 / mean).toFixed(1),
      medianMs: +median.toFixed(2),
      p99Ms: +p99.toFixed(2),
      p99Fps: +(1000 / p99).toFixed(1),
      worstMs: +worst.toFixed(2),
      hitches,
      callsPerFrame: +((info.render.calls - callsStart) / frames.length).toFixed(1),
      tris: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  })()`, 60000);
}

const cam = new OuterCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-411 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const planPath = path.join(BASE_DIR, 'before', 'shots-plan.json');
  let shots;
  if (TAG !== 'before' && fs.existsSync(planPath)) {
    shots = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    console.log(`  reusing locked BEFORE camera plan (${shots.length} views)`);
  } else {
    shots = await resolveOuterShots(page);
    if (TAG === 'before') fs.writeFileSync(planPath, JSON.stringify(shots, null, 2));
  }

  const perfHq     = await benchView(page, 'vista_hq_north', shots[11].cam, 'noon');
  const perfCordon = await benchView(page, 'vista_cordon_west', shots[0].cam, 'noon');
  const perfRiver  = await benchView(page, 'vista_river_ese', shots[1].cam, 'noon');

  const shotMeta = [];
  for (const s of shots) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    const rainVal = s.rain || 0;
    await page.evaluate(`(async () => {
      const T = window.TT;
      if (T?.weather) {
        T.weather.raining = ${rainVal > 0};
        T.weather.intensity = ${rainVal};
        T.weather.rainTimeLeft = ${rainVal > 0 ? 120 : 0};
      }
      await CamRig.aim({
        cam: ${JSON.stringify(s.cam)},
        time: ${JSON.stringify(s.time || 'noon')},
        ui: false,
        settle: ${rainVal > 0 ? 350 : 200},
      });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-411/${TAG}/${s.id}.png`, bytes, cam: s.cam });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  const outerStats = await page.evaluate(`(() => {
    const T = window.TT;
    let outerMeshes = 0, outerTris = 0;
    const outerMats = [];
    const grp = T.scene.getObjectByName('outer-world-vistas');
    if (grp) {
      grp.traverse(o => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          outerMeshes++;
          const g = o.geometry;
          const inst = o.isInstancedMesh ? (o.count || 1) : 1;
          outerTris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * inst;
          outerMats.push(o.name + ':' + (o.material?.type || '?') + ':' + (o.material?.name || ''));
        }
      });
    }
    return {
      outerMeshes,
      outerTris: Math.round(outerTris),
      outerMats,
      memTextures: T.renderer?.info?.memory?.textures || 0,
      memGeos: T.renderer?.info?.memory?.geometries || 0,
    };
  })()`);

  const metrics = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors,
    outerStats,
    perf: { hq: perfHq, cordon: perfCordon, river: perfRiver },
    shots: shotMeta,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length,
    outerStats, perf: metrics.perf,
  }, null, 2));

  execFileSync('python', ['qa/AG-411/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
