import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-405', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

const PRE_ON = 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); T.trainingDbg.tg().securityDoor.setState({ amount: 1, locked: false, blocked: false }); T.trainingDbg.tg().releaseGate.setState({ amount: 0, lit: false }); await wait(260);';
const PRE_SHUTTER = 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); T.trainingDbg.tg().securityDoor.setState({ amount: 0.45, locked: true, blocked: false }); await wait(260);';
const PRE_GATE = 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); if (!T.trainingDbg.tunnel()) { T.trainingDbg.deployNow("shambler", 1); T.trainingDbg.clear(); } T.trainingDbg.state().release?.tick?.(0.016, null, 1); T.trainingDbg.tg().releaseGate.setState({ amount: 1, lit: true }); await wait(120); T.trainingDbg.tg().releaseGate.setState({ amount: 1, lit: true });';
const PRE_OFF = 'T.setViewFirstDbg(true); if (T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); T.trainingDbg.tg().securityDoor.setState({ amount: 1, locked: false, blocked: false }); T.trainingDbg.tg().releaseGate.setState({ amount: 0, lit: false }); await wait(300);';

// Coordinates in world space (TRAINING.ORIGIN = 0, -200, -640)
const SHOTS = [
  // Wide / Overview (Noon)
  { id: '01-range-overview', cap: 'Range overview from spawn', cam: { x: 0, y: -198.2, z: -646.8, tx: 0, ty: -198.4, tz: -630.0, fov: 68 }, pre: PRE_ON },
  { id: '02-range-backwall', cap: 'Range back wall (PGB stencil, lockers, rack, board, switch)', cam: { x: 0.2, y: -198.2, z: -643.5, tx: 0.0, ty: -198.1, tz: -652.0, fov: 72 }, pre: PRE_ON },
  { id: '03-range-stations', cap: 'Range east terminal wall (CIF, Kiosk, Armory)', cam: { x: 1.5, y: -198.2, z: -646.5, tx: 8.0, ty: -198.3, tz: -646.5, fov: 70 }, pre: PRE_ON },
  { id: '04-build-overview', cap: 'Build room overview from doorway', cam: { x: -10.0, y: -198.1, z: -646.5, tx: -28.0, ty: -198.5, tz: -622.0, fov: 72 }, pre: PRE_ON },
  { id: '05-build-west-infirmary', cap: 'Build room west wall, infirmary, skull window & HQ panel', cam: { x: -24.5, y: -198.1, z: -636.0, tx: -43.5, ty: -198.4, tz: -644.0, fov: 72 }, pre: PRE_ON },
  // Closeups (Noon)
  { id: '06-floor-tiles-line', cap: 'Floor tiles, grout, boot scuffs, FIRING LINE & chips', cam: { x: 0.0, y: -198.4, z: -643.8, tx: 0.0, ty: -200.0, tz: -639.8, fov: 62 }, pre: PRE_ON },
  { id: '07-bench-props', cap: 'Firing bench west end, rubber mat, kick panel & kit props', cam: { x: -5.3, y: -198.3, z: -641.3, tx: -7.1, ty: -199.2, tz: -639.5, fov: 58 }, pre: PRE_ON },
  { id: '08-ceiling-baffles', cap: 'Range ceiling acoustic panels, baffles, duct, pipe & board', cam: { x: 0.0, y: -197.4, z: -643.5, tx: 0.0, ty: -194.2, tz: -635.5, fov: 72 }, pre: PRE_ON },
  { id: '09-targets-backstop', cap: 'Target plate, bevelled hazard base & rubber backstop', cam: { x: 3.6, y: -198.3, z: -634.5, tx: 5.5, ty: -198.7, tz: -631.5, fov: 58 }, pre: PRE_ON },
  { id: '10-backstop-close', cap: 'Rubber-crumb backstop blocks, steel posts & wear', cam: { x: 0.0, y: -198.3, z: -613.2, tx: 0.0, ty: -198.5, tz: -610.0, fov: 60 }, pre: PRE_ON },
  { id: '11-shutter-keypad', cap: 'Security shutter half-down, slats, hazard jamb & keypad', cam: { x: -10.8, y: -198.3, z: -648.0, tx: -8.0, ty: -198.4, tz: -648.0, fov: 62 }, pre: PRE_SHUTTER },
  { id: '12-lockers-switch', cap: 'Lockers (dented door + tapes), whiteboard & light switch', cam: { x: -4.4, y: -198.3, z: -649.0, tx: -4.4, ty: -198.6, tz: -652.0, fov: 66 }, pre: PRE_ON },
  { id: '13-rack-board-roster', cap: 'Weapon rack, Days Without Incident board & roster', cam: { x: 3.4, y: -198.3, z: -649.2, tx: 3.4, ty: -198.5, tz: -652.0, fov: 64 }, pre: PRE_ON },
  { id: '14-signs-console-dummy', cap: 'Cracked taped monitor, range console & melee dummy', cam: { x: -4.6, y: -198.3, z: -642.5, tx: -7.5, ty: -198.7, tz: -642.6, fov: 68 }, pre: PRE_ON },
  { id: '15-safety-sign-close', cap: 'Swinging safety sign & tiled wall wear', cam: { x: 6.2, y: -198.2, z: -638.8, tx: 7.7, ty: -198.2, tz: -637.6, fov: 48 }, pre: PRE_ON },
  { id: '16-cif-kiosk', cap: 'CIF terminal (garments/boots/signs) & Supply Kiosk', cam: { x: 5.0, y: -198.3, z: -648.4, tx: 8.0, ty: -198.5, tz: -648.4, fov: 68 }, pre: PRE_ON },
  { id: '17-armory-booth', cap: 'Armory booth steel surround, mesh screen & sign', cam: { x: 5.2, y: -198.3, z: -643.0, tx: 7.95, ty: -198.5, tz: -643.0, fov: 62 }, pre: PRE_ON },
  { id: '18-zombie-gate', cap: 'Zombie containment gate leaves, ribs, patch & threshold', cam: { x: -26.0, y: -198.3, z: -616.5, tx: -26.0, ty: -198.2, tz: -612.0, fov: 66 }, pre: PRE_ON },
  { id: '19-gate-props-drains', cap: 'Hose reel, HOSE DOWN stencil, wet drain & build floor wear', cam: { x: -30.2, y: -198.3, z: -615.8, tx: -31.5, ty: -199.1, tz: -612.5, fov: 62 }, pre: PRE_ON },
  { id: '20-tunnel-open', cap: 'Zombie holding tunnel interior (gate open)', cam: { x: -26.0, y: -198.3, z: -614.5, tx: -26.0, ty: -198.3, tz: -604.0, fov: 64 }, pre: PRE_GATE },
  { id: '21-infirmary-bed', cap: 'Infirmary vinyl floor, olive panels, stretcher, IV & O2', cam: { x: -38.0, y: -198.3, z: -648.3, tx: -41.2, ty: -199.1, tz: -650.3, fov: 66 }, pre: PRE_ON },
  { id: '22-infirmary-cabinet', cap: 'Infirmary cabinet, ECG monitor, sharps bin & sagging cot', cam: { x: -40.5, y: -198.3, z: -648.3, tx: -37.8, ty: -199.1, tz: -650.4, fov: 66 }, pre: PRE_ON },
  { id: '23-skull-hq-fence', cap: 'Skull intake window, HQ alarm panel & perimeter fence', cam: { x: -39.5, y: -198.2, z: -640.0, tx: -43.9, ty: -198.5, tz: -640.0, fov: 74 }, pre: PRE_ON },
  { id: '24-hangar-truss-mount', cap: 'Hangar siding, H-column, roof truss, deck & turret bracket', cam: { x: -16.5, y: -194.5, z: -634.0, tx: -8.5, ty: -186.0, tz: -632.0, fov: 72 }, pre: PRE_ON },
  // Lights-Off readability
  { id: '25-dark-range', cap: 'Range lights OFF (EXIT sign, emergency lamps, readability)', cam: { x: 0.0, y: -198.2, z: -646.8, tx: -2.0, ty: -198.4, tz: -635.0, fov: 70 }, pre: PRE_OFF },
  { id: '26-dark-build', cap: 'Build room lights OFF (emergency lamps, floor, gate)', cam: { x: -10.5, y: -198.1, z: -646.5, tx: -28.0, ty: -198.5, tz: -622.0, fov: 72 }, pre: PRE_OFF },
  { id: '27-dark-infirmary', cap: 'Infirmary & west wall lights OFF', cam: { x: -35.5, y: -198.2, z: -645.0, tx: -42.0, ty: -198.6, tz: -649.5, fov: 68 }, pre: PRE_OFF },
];

class TrainingCapture extends Engine {
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
    const tEnter = Date.now();
    await page.evaluate("document.getElementById('playerName').value='AG-405'; document.getElementById('modeTraining').click()");
    if (!await page.waitFor('TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 })) {
      throw new Error('Training ready timeout: ' + JSON.stringify(page.errors));
    }
    this.enterMs = Date.now() - tEnter;
    // Install late-compile tracker right after blackout lifts
    await page.evaluate(`(() => {
      window.__ag405Late = [];
      const b = TT.renderer && TT.renderer.backend;
      if (!b) return;
      if (typeof b.createRenderPipeline === 'function') {
        const cp = b.createRenderPipeline.bind(b);
        b.createRenderPipeline = (ro, ...a) => {
          window.__ag405Late.push({ kind: 'pipeline', mat: ro?.material?.name || ro?.material?.type || '', obj: ro?.object?.name || ro?.object?.type || '' });
          return cp(ro, ...a);
        };
      }
      if (typeof b.createProgram === 'function') {
        const pr = b.createProgram.bind(b);
        b.createProgram = (prog, ...a) => {
          window.__ag405Late.push({ kind: 'program', name: prog?.name || '', stage: prog?.stage || '' });
          return pr(prog, ...a);
        };
      }
    })()`);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.mode = 'training';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function benchView(page, name, cam, lightsOn = true) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    await CamRig.aim({
      cam: ${JSON.stringify(cam)},
      time: ${lightsOn ? "'noon'" : "'midnight'"},
      ui: false,
      pre: 'T.setViewFirstDbg(true); if (T.trainingDbg.lights().on !== ${lightsOn}) T.trainingDbg.toggleLights(); T.trainingDbg.tg().securityDoor.setState({ amount: 1, locked: false, blocked: false }); T.trainingDbg.tg().releaseGate.setState({ amount: 0, lit: false }); await wait(250);',
      settle: 250,
    });
  })()`, 30000);
  return await page.evaluate(`(async () => {
    const T = window.TT;
    const frames = [];
    const N = 150;
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
    const callsPerFrame = +((info.render.calls - callsStart) / frames.length).toFixed(1);
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
      callsPerFrame,
      draws: info.render.calls,
      tris: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  })()`, 60000);
}

async function auditTextures(page) {
  return await page.evaluate(`(() => {
    const tg = TT.trainingDbg.tg();
    const seenTex = new Set();
    const seenMat = new Set();
    let meshes = 0, normalMapped = 0, roughMapped = 0, metalMapped = 0, aoMapped = 0, mapCount = 0;
    const texList = [];
    const walk = (root) => {
      if (!root) return;
      root.traverse((o) => {
        if (!o.isMesh) return;
        meshes++;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if (!seenMat.has(m)) {
            seenMat.add(m);
            if (m.map) mapCount++;
            if (m.normalMap) normalMapped++;
            if (m.roughnessMap) roughMapped++;
            if (m.metalnessMap) metalMapped++;
            if (m.aoMap) aoMapped++;
            for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
              const t = m[k];
              if (t && !seenTex.has(t)) {
                seenTex.add(t);
                const img = t.image || {};
                const w = img.width || 0, h = img.height || 0;
                const mip = t.generateMipmaps === false ? 1.0 : 1.3333;
                const bytes = Math.round(w * h * 4 * mip);
                texList.push({ name: t.name || k, w, h, bytes, aniso: t.anisotropy || 1 });
              }
            }
          }
        }
      });
    };
    walk(tg.group);
    if (TT.trainingDbg.tunnel()?.group) walk(TT.trainingDbg.tunnel().group);
    const totalBytes = texList.reduce((a, t) => a + t.bytes, 0);
    return {
      meshes,
      uniqueMaterials: seenMat.size,
      materialsWithMap: mapCount,
      materialsWithNormal: normalMapped,
      materialsWithRoughness: roughMapped,
      materialsWithMetalness: metalMapped,
      materialsWithAO: aoMapped,
      uniqueTextures: texList.length,
      estimatedVramMB: +(totalBytes / (1024 * 1024)).toFixed(2),
      largestTextures: texList.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 15),
    };
  })()`);
}

const cam = new TrainingCapture({ onscreen: true, training: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-405 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)} enterMs=${cam.enterMs}`);

  // 1. Capture all 27 views
  const shotMeta = [];
  for (const s of SHOTS) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    const isDark = s.id.startsWith('25-') || s.id.startsWith('26-') || s.id.startsWith('27-');
    await page.evaluate(`(async () => {
      await CamRig.aim({
        cam: ${JSON.stringify(s.cam)},
        time: ${isDark ? "'midnight'" : "'noon'"},
        ui: false,
        pre: ${JSON.stringify(s.pre)},
        settle: ${s.id === '20-tunnel-open' ? 40 : 140},
      });
      if (${JSON.stringify(s.id)} === '20-tunnel-open') {
        window.TT.trainingDbg.tg().releaseGate.setState({ amount: 1, lit: true });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-405/${TAG}/${s.id}.png`, bytes });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // 2. Texture audit
  const texAudit = await auditTextures(page);

  // 3. Performance benchmarks (after shots, steady state)
  const perfRange = await benchView(page, 'range_overview', SHOTS[0].cam, true);
  const perfBuild = await benchView(page, 'build_overview', SHOTS[3].cam, true);
  const perfRangeOff = await benchView(page, 'range_lightsoff', SHOTS[24].cam, false);

  const late = await page.evaluate('window.__ag405Late || []');
  const metrics = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    enterMs: cam.enterMs,
    lateCompiles: late.length,
    lateDetails: late.slice(0, 20),
    pageErrors: page.errors,
    texAudit,
    perf: { range: perfRange, build: perfBuild, rangeOff: perfRangeOff },
    shots: shotMeta,
  };
  const metricsPath = path.join(OUT_DIR, 'metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, enterMs: cam.enterMs, lateCompiles: late.length, pageErrors: page.errors.length,
    texAudit: { ...texAudit, largestTextures: undefined },
    perf: metrics.perf,
  }, null, 2));

  // Build contact sheets
  execFileSync('python', ['qa/AG-405/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
