import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, 'qa', 'AG-408');
const OUT_DIR = path.join(BASE_DIR, TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class VistaCapture extends Engine {
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
      const n = document.getElementById('playerName'); if (n) n.value = 'AG-408';
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

async function surveyOuterTopo(page) {
  return await page.evaluate(`(() => {
    const T = window.TT;
    const gh = (x, z) => T.sampleHeight(x, z);
    let gateObj = null, ringObj = null;
    T.scene.traverse(o => {
      if (o.name === 'cordon-gate') gateObj = o;
      if (o.name === 'first-ring-stone') ringObj = o;
    });
    const gate = gateObj ? (() => {
      const wp = new T.THREE.Vector3(); gateObj.getWorldPosition(wp);
      return { x: +wp.x.toFixed(2), y: +wp.y.toFixed(2), z: +wp.z.toFixed(2), ang: +Math.atan2(wp.z, wp.x).toFixed(4), deg: +((Math.atan2(wp.z, wp.x) * 180 / Math.PI + 360) % 360).toFixed(1) };
    })() : null;
    const ring = ringObj ? (() => {
      const wp = new T.THREE.Vector3(); ringObj.getWorldPosition(wp);
      return { x: +wp.x.toFixed(2), y: +wp.y.toFixed(2), z: +wp.z.toFixed(2), ang: +Math.atan2(wp.z, wp.x).toFixed(4), deg: +((Math.atan2(wp.z, wp.x) * 180 / Math.PI + 360) % 360).toFixed(1) };
    })() : null;
    // River upstream entry point near wall (RIVER_CTRL[0] is around 232, 132)
    const riverEntryAng = Math.atan2(132, 232);
    const rx = Math.cos(riverEntryAng) * 220, rz = Math.sin(riverEntryAng) * 220;
    const riverGate = { x: +rx.toFixed(2), y: +gh(rx, rz).toFixed(2), z: +rz.toFixed(2), ang: +riverEntryAng.toFixed(4), deg: +((riverEntryAng * 180 / Math.PI + 360) % 360).toFixed(1) };

    const radii = [225, 250, 280, 320, 360, 400, 425];
    const profile = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const a = deg * Math.PI / 180;
      const row = { deg, h: {} };
      for (const r of radii) {
        row.h[r] = +gh(Math.cos(a) * r, Math.sin(a) * r).toFixed(1);
      }
      profile.push(row);
    }
    return {
      gate,
      ring,
      riverGate,
      hq: { x: 0, y: +gh(0, 0).toFixed(2), z: 0 },
      lake: { x: -138, z: -104, level: -3.4 },
      radii,
      profile,
    };
  })()`);
}

async function resolveVistaShots(page, topo) {
  return await page.evaluate(`((topo) => {
    const T = window.TT;
    const gh = (x, z) => T.sampleHeight(x, z);
    const trees = (T.trees || []).filter(t => t && t.alive);

    function clearTowerCam(angDeg, rCam, liftY, lookR, lookLift, fov = 64) {
      // Search +-4 deg around angDeg for a tree-clear tower/wall vantage
      let bestDeg = angDeg, bestScore = -1e9;
      for (let d = -5; d <= 5; d += 1) {
        const a = (angDeg + d) * Math.PI / 180;
        const cx = Math.cos(a) * rCam, cz = Math.sin(a) * rCam;
        if (T.waterDepthAt(cx, cz) > 0.25 && rCam > 120) continue;
        let sc = -Math.abs(d) * 0.25;
        const fx = Math.cos(a), fz = Math.sin(a);
        for (const tr of trees) {
          const dx = tr.x - cx, dz = tr.z - cz;
          const dist = Math.hypot(dx, dz);
          if (dist < 6) sc -= (6 - dist) * 5;
          const fwd = dx * fx + dz * fz;
          const lat = Math.abs(-dx * fz + dz * fx);
          if (fwd > 0 && fwd < 36 && lat < 5.5) sc -= (5.5 - lat) * 3;
        }
        if (sc > bestScore) { bestScore = sc; bestDeg = angDeg + d; }
      }
      const a = bestDeg * Math.PI / 180;
      const cx = Math.cos(a) * rCam, cz = Math.sin(a) * rCam;
      const tx = Math.cos(a) * lookR, tz = Math.sin(a) * lookR;
      const baseH = Math.max(gh(cx, cz), -3.2);
      const tH = gh(tx, tz);
      return {
        x: +cx.toFixed(2), y: +(baseH + liftY).toFixed(2), z: +cz.toFixed(2),
        tx: +tx.toFixed(2), ty: +(tH + lookLift).toFixed(2), tz: +tz.toFixed(2), fov,
      };
    }

    const gateDeg = topo.gate ? topo.gate.deg : 315;
    const riverDeg = topo.riverGate ? topo.riverGate.deg : 29.6;
    const ringDeg = topo.ring ? topo.ring.deg : 300;

    // 1. Cordon Gate looking straight out past the sealed barrier into the outside pass (elevated watchtower view over gate)
    const cordonOut = clearTowerCam(gateDeg, 206, 7.2, 370, 8, 62);
    // 2. River Gate looking out along the incoming eastern river valley
    const riverOut = clearTowerCam(riverDeg, 204, 7.0, 360, 6, 62);

    // 3..10: Full 360-deg perimeter vistas (8 compass bearings from watchtower height near the wall looking straight out!)
    // Three.js coords: -Z = North (270 deg), +X = East (0 deg), +Z = South (90 deg), -X = West (180 deg)
    const vistaN  = clearTowerCam(270, 204, 7.8, 390, 12, 64);
    const vistaNE = clearTowerCam(315, 204, 7.8, 390, 12, 64);
    const vistaE  = clearTowerCam(0,   204, 7.8, 390, 12, 64);
    const vistaSE = clearTowerCam(45,  204, 7.8, 390, 12, 64);
    const vistaS  = clearTowerCam(90,  204, 7.8, 390, 12, 64);
    const vistaSW = clearTowerCam(215, 165, 8.2, 385, 12, 64); // across Lake toward SW mountains
    const vistaW  = clearTowerCam(180, 204, 7.8, 390, 12, 64);
    const vistaNW = clearTowerCam(225, 204, 7.8, 390, 12, 64);

    // 11..12: High vantage from FOB Threshold roof/tower height looking across the valley + over the wall!
    const hqY = gh(0, 0) + 18.0;
    const hqNorth = { x: 0, y: +hqY.toFixed(2), z: 0, tx: 0, ty: +(gh(0, -380) + 18).toFixed(2), tz: -380, fov: 66 };
    const hqSouth = { x: 0, y: +hqY.toFixed(2), z: 0, tx: 220, ty: +(gh(220, 310) + 14).toFixed(2), tz: 310, fov: 66 };

    return [
      { id: '01-cordon-gate-out',     cap: 'Cordon Gate looking outward past checkpoint & exterior road (Noon)', time: 'noon', cam: cordonOut },
      { id: '02-river-gate-out',      cap: 'River Gate arch looking up outer mountain valley (Noon)', time: 'noon', cam: riverOut },
      { id: '03-north-wall-vista',    cap: 'North perimeter looking out toward Ridgeline & high peaks (Noon)', time: 'noon', cam: vistaN },
      { id: '04-northeast-wall-vista',cap: 'Northeast perimeter looking out over foothills & pass (Noon)', time: 'noon', cam: vistaNE },
      { id: '05-east-wall-vista',     cap: 'East perimeter looking out over ridges & timberline (Noon)', time: 'noon', cam: vistaE },
      { id: '06-southeast-wall-vista',cap: 'Southeast perimeter looking over gorge & far mountains (Noon)', time: 'noon', cam: vistaSE },
      { id: '07-south-wall-vista',    cap: 'South perimeter looking out toward southern valleys (Noon)', time: 'noon', cam: vistaS },
      { id: '08-southwest-lake-vista',cap: 'Southwest Lake looking across wall to distant alpine peaks (Noon)', time: 'noon', cam: vistaSW },
      { id: '09-west-wall-vista',     cap: 'West perimeter looking out across outer foothills (Noon)', time: 'noon', cam: vistaW },
      { id: '10-northwest-wall-vista',cap: 'Northwest perimeter looking out toward saddles & peaks (Noon)', time: 'noon', cam: vistaNW },
      { id: '11-hq-roof-north-pano',  cap: 'FOB Threshold high overlook looking North across valley & wall (Noon)', time: 'noon', cam: hqNorth },
      { id: '12-hq-roof-south-pano',  cap: 'FOB Threshold high overlook looking SE across valley & wall (Noon)', time: 'noon', cam: hqSouth },
      { id: '13-cordon-gate-dusk',    cap: 'Cordon Gate outward vista at golden Dusk (atmosphere & depth)', time: 'dusk', cam: cordonOut },
      { id: '14-north-ridgeline-dusk',cap: 'North high vista at golden Dusk (alpenglow & silhouettes)', time: 'dusk', cam: vistaN },
      { id: '15-north-ridgeline-night',cap: 'North high vista at Night (distant Ridgeline beacons & horizon)', time: 'night', cam: vistaN },
      { id: '16-cordon-gate-night',   cap: 'Cordon Gate outward vista at Night (exterior pass & distant lights)', time: 'night', cam: cordonOut },
    ];
  })(${JSON.stringify(topo)})`);
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

const cam = new VistaCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-408 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const topoPath = path.join(BASE_DIR, 'before', 'outer-topo.json');
  const topo = await surveyOuterTopo(page);
  if (TAG === 'before') {
    fs.writeFileSync(topoPath, JSON.stringify(topo, null, 2));
    console.log(`  saved outer-topo.json (gate=${topo.gate?.deg}deg, river=${topo.riverGate?.deg}deg, ring=${topo.ring?.deg}deg)`);
  }

  const planPath = path.join(BASE_DIR, 'before', 'shots-plan.json');
  let shots;
  if (TAG !== 'before' && fs.existsSync(planPath)) {
    shots = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    console.log(`  reusing locked BEFORE vista camera plan (${shots.length} views)`);
  } else {
    shots = await resolveVistaShots(page, topo);
    if (TAG === 'before') fs.writeFileSync(planPath, JSON.stringify(shots, null, 2));
  }

  const perfHq     = await benchView(page, 'vista_hq_high', shots[10].cam, 'noon');
  const perfCordon = await benchView(page, 'vista_cordon_out', shots[0].cam, 'noon');
  const perfLake   = await benchView(page, 'vista_lake_west', shots[7].cam, 'noon');

  const shotMeta = [];
  for (const s of shots) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    await page.evaluate(`(async () => {
      await CamRig.aim({
        cam: ${JSON.stringify(s.cam)},
        time: ${JSON.stringify(s.time || 'noon')},
        ui: false,
        settle: 180,
      });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-408/${TAG}/${s.id}.png`, bytes, cam: s.cam });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // On AFTER runs, also capture 2 bonus atmospheric night/dusk views of the NE pass distant town lights & SE fire lookout!
  const bonusMeta = [];
  if (TAG !== 'before') {
    const bonusShots = [
      { id: '17-ne-pass-town-night', cap: 'NE Pass Saddle at Night — distant viaduct, farmstead & living town lights beyond the mountains', time: 'night', cam: shots[3].cam },
      { id: '18-se-lookout-trestle-dusk', cap: 'SE Ridge at Dusk — Wilderness Ranger Fire-Lookout lantern & Coldwater timber trestle', time: 'dusk', cam: shots[5].cam },
    ];
    for (const s of bonusShots) {
      const outPath = path.join(OUT_DIR, `${s.id}.png`);
      await page.evaluate(`(async () => {
        await CamRig.aim({ cam: ${JSON.stringify(s.cam)}, time: ${JSON.stringify(s.time)}, ui: false, settle: 180 });
      })()`, 30000);
      await page.screenshot(outPath);
      const bytes = fs.statSync(outPath).size;
      bonusMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-408/${TAG}/${s.id}.png`, bytes, cam: s.cam });
      console.log(`  bonus ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
    }
  }

  const outerStats = await page.evaluate(`(() => {
    const T = window.TT;
    let outerMeshes = 0, outerTris = 0;
    const grp = T.scene.getObjectByName('outer-world-vistas');
    if (grp) {
      grp.traverse(o => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          outerMeshes++;
          const g = o.geometry;
          const inst = o.isInstancedMesh ? (o.count || 1) : 1;
          outerTris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * inst;
        }
      });
    }
    return {
      outerMeshes,
      outerTris: Math.round(outerTris),
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
    perf: { hq: perfHq, cordon: perfCordon, lake: perfLake },
    shots: shotMeta,
    bonusShots: bonusMeta,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length,
    outerStats, perf: metrics.perf,
  }, null, 2));

  execFileSync('python', ['qa/AG-408/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
