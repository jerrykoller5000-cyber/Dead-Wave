import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-9', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class WorldCapture extends Engine {
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
    // Start a real Hunt match so weather/storm, dusk/night lamps, flashlight, and Hollows are all live.
    await page.evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const T = window.TT;
      const n = document.getElementById('playerName'); if (n) n.value = 'AH-9';
      document.getElementById('modeHunt')?.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      try { T.runDevCommand('nodead'); } catch {}
      try { T.runDevCommand('godmode'); } catch {}
      try { T.clearZombies(); } catch {}
      try { if (typeof T.setLandRadius === 'function') T.setLandRadius(250); } catch {}
      return T.getPhase?.();
    })()`, 180000);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.mode = 'world';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function resolveWorldShots(page) {
  return await page.evaluate(`(() => {
    const T = window.TT;
    const gh = (x, z) => T.sampleHeight(x, z);
    const camPt = (x, z, h, tx, tz, th, fov = 62) => ({
      x: +x.toFixed(2), y: +(gh(x, z) + h).toFixed(2), z: +z.toFixed(2),
      tx: +tx.toFixed(2), ty: +(gh(tx, tz) + th).toFixed(2), tz: +tz.toFixed(2), fov
    });

    // Pick a clean trunk trail point around 25-45m from HQ
    let trunkPt = { x: 24, z: -12, dx: 0.9, dz: -0.4 };
    for (const line of (T.PATHS || [])) {
      if (line.deck || (line.hw || 0.85) < 1.1) continue;
      for (let i = 1; i < line.length - 1; i++) {
        const p = line[i], r = Math.hypot(p.x, p.z);
        if (r > 22 && r < 48) {
          const a = line[i - 1], b = line[i + 1];
          const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          trunkPt = { x: p.x, z: p.z, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l };
          break;
        }
      }
      if (trunkPt.x !== 24) break;
    }

    // Pick a path junction hub
    const hub = (T.PATH_HUBS && T.PATH_HUBS[0]) || { x: trunkPt.x + 8, z: trunkPt.z + 8 };

    // Find a dense pine forest spot and a dense mixed/autumn woods spot
    let pineSpot = { x: 75, z: 35 }, woodSpot = { x: -55, z: 68 };
    const trees = (T.trees || []).filter(t => t && t.alive && Math.hypot(t.x, t.z) > 45 && Math.hypot(t.x, t.z) < 155);
    const scoreCluster = (kindFn) => {
      let best = null, bestScore = -1;
      for (let i = 0; i < trees.length; i += 7) {
        const t = trees[i];
        if (!kindFn(t)) continue;
        if (T.waterDepthAt(t.x, t.z) > 0.01) continue;
        let near = 0;
        for (const o of trees) {
          const d = Math.hypot(o.x - t.x, o.z - t.z);
          if (d > 1.5 && d < 10) near += kindFn(o) ? 1.5 : 0.4;
        }
        if (near > bestScore) { bestScore = near; best = t; }
      }
      return best;
    };
    const pBest = scoreCluster(t => t.kind === 'pine');
    if (pBest) pineSpot = { x: pBest.x + 2.8, z: pBest.z + 2.4 };
    const wBest = scoreCluster(t => t.kind === 'autumn' || t.kind === 'oak');
    if (wBest) woodSpot = { x: wBest.x + 2.6, z: wBest.z + 2.6 };

    const P = T.POI || {};
    const bridge = (P.bridges && P.bridges[0]) || { x: 20, z: 75, yaw: 0 };
    const bsx = Math.sin(bridge.yaw || 0), bsz = Math.cos(bridge.yaw || 0);

    // Riverbank point away from bridge
    const riverP = (T.riverProject ? null : null);
    const rbX = bridge.x - bsz * 18 + bsx * 7.5;
    const rbZ = bridge.z + bsx * 18 + bsz * 7.5;

    const dock = P.dock || { x: -92, z: -72, yaw: 0.7 };
    const dsx = Math.sin(dock.yaw || 0), dsz = Math.cos(dock.yaw || 0);

    const campRanger = (P.campsites && P.campsites[0]) || { x: 128, z: 0 };
    const campHiker = (P.campsites && P.campsites[1]) || { x: 22, z: -126 };
    const campTrapper = (P.campsites && P.campsites[2]) || { x: -12, z: 140 };
    const grave = P.graveyard || { x: -80, z: 60 };
    const fuel = (P.sheds && P.sheds[2]) || { x: -116, z: 10 };
    const mast = P.mast || { x: -100, z: 80 };

    // Coldwater church
    let churchPos = { x: grave.x + 18, z: grave.z + 12 };
    T.scene.traverse(o => {
      if (o.name === 'coldwater-church') {
        const wp = new T.THREE.Vector3();
        o.getWorldPosition(wp);
        churchPos = { x: wp.x, z: wp.z };
      }
    });

    // Cordon gate & convoy road
    const gate = T.historyProps?.parts?.['cordon-gate'];
    let cordonCam;
    if (gate) {
      const gx = gate.position.x, gz = gate.position.z, gyaw = gate.rotation.y || 0;
      const fx = Math.sin(gyaw), fz = Math.cos(gyaw);
      cordonCam = camPt(gx + fx * 16 + fz * 6, gz + fz * 16 - fx * 6, 4.5, gx + fx * 4, gz + fz * 4, 0.3, 62);
    } else {
      cordonCam = camPt(0, -180, 6, 0, -195, 0.5, 62);
    }

    // Caves: iron and wet (or root)
    const caves = P.caves || [];
    const caveIron = caves.find(c => c.theme === 'iron') || caves[0] || { x: 90, z: -80, yaw: 0 };
    const caveWet = caves.find(c => c.theme === 'wet') || caves.find(c => c.theme === 'root') || caves[1] || { x: -90, z: 90, yaw: 0 };
    const caveView = (c, dist = 13, lift = 3.2) => {
      const fx = Math.sin(c.yaw || 0), fz = Math.cos(c.yaw || 0);
      return camPt(c.x + fx * dist + fz * 3.5, c.z + fz * dist - fx * 3.5, lift, c.x + fx * 2.0, c.z + fz * 2.0, 0.6, 62);
    };

    // High alpine slope / hillside rock & heath spot (northeast peaks)
    let hillCam = camPt(150, 145, 22, 195, 190, 12, 60);
    {
      let bestSlope = null;
      for (let a = 0; a < Math.PI * 2; a += 0.2) {
        const r = 175, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = gh(x, z), sl = T.terrainSlope(x, z);
        if (h > 18 && sl > 0.32 && (!bestSlope || h > bestSlope.h)) bestSlope = { x, z, h, a };
      }
      if (bestSlope) {
        const ix = Math.cos(bestSlope.a) * (175 - 32), iz = Math.sin(bestSlope.a) * (175 - 32);
        hillCam = camPt(ix, iz, 14, bestSlope.x, bestSlope.z, 2.5, 60);
      }
    }

    return [
      // 1-9: HQ, Trails, Meadow, Forests, River
      { id: '01-hq-yard-overview', cap: 'HQ / FOB Threshold gravel yard & trail starts (Noon)', time: 'noon', cam: camPt(14.5, -16.5, 8.8, 1.0, -2.5, 0.4, 62) },
      { id: '02-hq-ruts-close', cap: '1P close-up: FOB south tyre ruts, gravel & grass edge', time: 'noon', cam: camPt(6.8, -14.8, 1.75, 4.4, -8.2, 0.05, 58) },
      { id: '03-hq-north-utility', cap: 'HQ north utility yard: generator, drums & ground blend', time: 'noon', cam: camPt(-8.2, 12.2, 2.6, -3.5, 6.8, 0.25, 60) },
      { id: '04-trunk-trail-close', cap: '1P close-up: trunk dirt trail, ruts, pebbles & trampled fringe', time: 'noon', cam: camPt(trunkPt.x - trunkPt.dx * 5.2 - trunkPt.dz * 2.1, trunkPt.z - trunkPt.dz * 5.2 + trunkPt.dx * 2.1, 1.7, trunkPt.x + trunkPt.dx * 3.0, trunkPt.z + trunkPt.dz * 3.0, 0.0, 58) },
      { id: '05-trail-junction', cap: 'Trail junction hub & branching tracks through meadow', time: 'noon', cam: camPt(hub.x + 8.5, hub.z - 8.5, 6.2, hub.x, hub.z, 0.0, 62) },
      { id: '06-meadow-open-1p', cap: '1P open valley meadow grass, tufts & distant ridge', time: 'noon', cam: camPt(28, 18, 1.75, 58, 34, 0.5, 64) },
      { id: '07-forest-floor-pine', cap: 'Dense pine forest floor: needles, moss & canopy contact', time: 'noon', cam: camPt(pineSpot.x + 4.5, pineSpot.z + 4.5, 2.1, pineSpot.x - 2.0, pineSpot.z - 2.0, 0.1, 64) },
      { id: '08-forest-floor-woods', cap: 'Mixed oak/autumn woodland floor: leaf litter & humus', time: 'noon', cam: camPt(woodSpot.x + 4.2, woodSpot.z + 4.2, 2.1, woodSpot.x - 2.2, woodSpot.z - 2.2, 0.1, 64) },
      { id: '09-river-bridge-approach', cap: 'River bridge graded dirt embankment & riverbank transition', time: 'noon', cam: camPt(bridge.x - bsx * 16 + bsz * 8, bridge.z - bsz * 16 - bsx * 8, 5.4, bridge.x - bsx * 3, bridge.z - bsz * 3, 0.2, 62) },

      // 10-18: Riverbank, Lake Shore, Hills, POIs
      { id: '10-riverbank-close', cap: '1P riverbank waterline: damp margin, silt, cobbles & grass', time: 'noon', cam: camPt(rbX, rbZ, 2.0, bridge.x - bsz * 15, bridge.z + bsx * 15, -0.3, 60) },
      { id: '11-lake-shore-dock', cap: 'Lake shingle shoreline, damp strip, dock & shallow bed', time: 'noon', cam: camPt(dock.x - dsx * 12 + dsz * 10, dock.z - dsz * 12 - dsx * 10, 4.8, dock.x + dsx * 2, dock.z + dsz * 2, -0.2, 62) },
      { id: '12-hillside-rock-heath', cap: 'Valley slope: grass to alpine heath, bare soil, strata rock & snow', time: 'noon', cam: hillCam },
      { id: '13-camp-rangers', cap: 'Rangers camp: pine needle floor, hearth & beaten clearing', time: 'noon', cam: camPt(campRanger.x + 11, campRanger.z + 10, 5.5, campRanger.x, campRanger.z, 0.3, 62) },
      { id: '14-camp-hikers', cap: 'Hikers camp: mossy lakeside turf & worn clearing', time: 'noon', cam: camPt(campHiker.x + 11, campHiker.z + 10, 5.2, campHiker.x, campHiker.z, 0.3, 62) },
      { id: '15-camp-trapper', cap: 'Trapper camp: autumn duff, leaf yard & cellar terrain cap', time: 'noon', cam: camPt(campTrapper.x + 13, campTrapper.z + 11, 6.2, campTrapper.x + 3, campTrapper.z - 1, 0.2, 62) },
      { id: '16-graveyard-ground', cap: 'Graveyard: cold mossy turf, turned earth & dirt aisle', time: 'noon', cam: camPt(grave.x + 11, grave.z + 11, 5.0, grave.x, grave.z, 0.2, 62) },
      { id: '17-coldwater-ruins', cap: 'Coldwater church ruin: mossy stone walls & floor transition', time: 'noon', cam: camPt(churchPos.x + 10, churchPos.z + 11, 4.8, churchPos.x, churchPos.z, 0.4, 62) },
      { id: '18-fuel-depot-ground', cap: 'Fuel depot: industrial gravel, oil/cinder yard & trail spur', time: 'noon', cam: camPt(fuel.x + 11, fuel.z + 11, 5.2, fuel.x, fuel.z, 0.3, 62) },

      // 19-25: Cordon, Caves, Four Lights (Dusk, Night, Overcast Rain), Hollows floor
      { id: '19-cordon-convoy-road', cap: 'Cordon checkpoint & convoy gravel/rutted road junction', time: 'noon', cam: cordonCam },
      { id: '20-cave-iron-mouth', cap: 'Iron cave mouth: cap blend, ore-tailings apron & rock face', time: 'noon', cam: caveView(caveIron, 13, 3.0) },
      { id: '21-cave-wet-mouth', cap: 'Wet/root cave mouth: muddy dooryard & mossy rock collar', time: 'noon', cam: caveView(caveWet, 13, 3.0) },
      { id: '22-valley-dusk', cap: 'Dusk raking light: HQ yard, trunk trail & meadow relief', time: 'dusk', cam: camPt(15.5, -15.5, 4.2, 1.5, -3.5, 0.2, 62) },
      { id: '23-hq-trail-night', cap: 'Night with FOB sodium lamps & marine flashlight on ground', time: 'night', cam: camPt(13.0, -14.5, 3.8, 1.0, -3.5, 0.2, 62) },
      { id: '24-hq-overcast-rain', cap: 'Overcast / Rainstorm (wetness = 1.0): damp ground & sheen', time: 'noon', storm: true, cam: camPt(11.5, -14.5, 3.4, 2.5, -6.0, 0.1, 62) },
    ];
  })()`);
}

async function benchView(page, name, cam, time = 'noon') {
  await page.evaluate(`(async () => {
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

const cam = new WorldCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AH-9 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const shots = await resolveWorldShots(page);
  // Steady-state noon perf benchmarks BEFORE triggering storm/hollows
  const perfHq = await benchView(page, 'hq_yard_overview', shots[0].cam, 'noon');
  const perfMeadow = await benchView(page, 'meadow_open_1p', shots[5].cam, 'noon');
  const perfForest = await benchView(page, 'forest_floor_pine', shots[6].cam, 'noon');

  const shotMeta = [];
  for (const s of shots) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    const pre = s.storm
      ? `try { T.runDevCommand('storm'); T.windDbg?.update?.(0.2); } catch {} await wait(350);`
      : s.time === 'night'
        ? `try { if (!T.flashlightOn) T.toggleFlashlightDbg?.(); } catch {} await wait(200);`
        : '';
    await page.evaluate(`(async () => {
      await CamRig.aim({
        cam: ${JSON.stringify(s.cam)},
        time: ${JSON.stringify(s.time || 'noon')},
        ui: false,
        pre: ${JSON.stringify(pre)},
        settle: 160,
      });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AH-9/${TAG}/${s.id}.png`, bytes, cam: s.cam });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // 25. Underground Hollows warren floor shot (iron warren)
  {
    const id = '25-hollow-iron-floor';
    const outPath = path.join(OUT_DIR, `${id}.png`);
    await page.evaluate(`(async () => {
      const T = window.TT;
      const b = T.enterHollow({ theme: 'iron', cave: 0 });
      if (!b) throw new Error('enterHollow returned null; phase=' + T.getPhase?.());
      for (const z of T.zombies.filter(q => q.below)) T.killZombie(z, false);
      const e = b.entry;
      T.player.position.set(e.x, e.y, e.z);
      const cam = { x: e.x + 1.4, y: e.y + 1.85, z: e.z - 1.2, tx: e.x, ty: e.y + 0.15, tz: e.z + 3.4, fov: 68 };
      await CamRig.aim({ cam, time: 'night', ui: false, settle: 250 });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id, cap: 'Hollows underground iron warren floor & walls', file: `qa/AH-9/${TAG}/${id}.png`, bytes });
    console.log(`  shot ${id} (${(bytes / 1024).toFixed(0)} KB)`);
    await page.evaluate(`(() => { try { window.TT.leaveHollow('mouth'); } catch {} })()`);
  }

  const groundInfo = await page.evaluate(`(() => {
    const T = window.TT;
    const g = T.ground;
    const mat = g?.material;
    const attrs = g?.geometry ? Object.keys(g.geometry.attributes) : [];
    const tex = T.getGroundDetailTex?.();
    const w = tex?.image?.width || 0, h = tex?.image?.height || 0;
    return {
      groundDetail: !!T.getGroundDetail?.(),
      matType: mat?.type || '',
      hasNormalNode: !!(mat?.normalNode),
      hasRoughnessNode: !!(mat?.roughnessNode),
      attrs,
      detailTex: { w, h, name: tex?.name || '' },
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
    groundInfo,
    perf: { hq: perfHq, meadow: perfMeadow, forest: perfForest },
    shots: shotMeta,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length,
    groundInfo, perf: metrics.perf,
  }, null, 2));

  execFileSync('python', ['qa/AH-9/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
