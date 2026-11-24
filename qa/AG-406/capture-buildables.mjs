import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-406', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

// Studio close-up catalog covering ALL 16 buildable types + key upgrade tiers + doors/gates/window bars.
const STUDIO_SHOTS = [
  // Group 1: Walls, Doors, Gates, Window Bars & Floors
  { id: '01-wall-t0', cap: 'Wall T0 · Wood', target: 'build:wall:0', view: 'three' },
  { id: '02-wall-t1', cap: 'Wall T1 · Reinforced Wood', target: 'build:wall:1', view: 'three' },
  { id: '03-wall-t2', cap: 'Wall T2 · Stone', target: 'build:wall:2', view: 'three' },
  { id: '04-wall-t3', cap: 'Wall T3 · Reinforced Stone', target: 'build:wall:3', view: 'three' },
  { id: '05-wall-t4', cap: 'Wall T4 · Steel Plate', target: 'build:wall:4', view: 'three' },
  { id: '06-door-t0', cap: 'Door T0 · Wood Door', custom: { kind: 'wall', tier: 0, opening: 'door', openTier: 0 } },
  { id: '07-door-t2', cap: 'Door T2 · Iron Door', custom: { kind: 'wall', tier: 2, opening: 'door', openTier: 2 } },
  { id: '08-door-t4', cap: 'Door T4 · Steel Vault Door', custom: { kind: 'wall', tier: 4, opening: 'door', openTier: 4 } },
  { id: '09-window-bars', cap: 'Window + Steel Mesh Bars', custom: { kind: 'wall', tier: 2, opening: 'window', barred: true } },
  { id: '10-gate-t0', cap: 'Gate T0 · Wooden Gate', custom: { kind: 'barricade', tier: 0, opening: 'gate', openTier: 0 } },
  { id: '11-gate-t2', cap: 'Gate T2 · Steel Gate', custom: { kind: 'barricade', tier: 0, opening: 'gate', openTier: 2 } },
  { id: '12-floor-t0', cap: 'Floor T0 · Wood Planks', target: 'build:floor:0', view: 'three', pitch: 38 },
  { id: '13-floor-t1', cap: 'Floor T1 · Stone Flags', target: 'build:floor:1', view: 'three', pitch: 38 },
  { id: '14-floor-t2', cap: 'Floor T2 · Steel Tread Plate', target: 'build:floor:2', view: 'three', pitch: 38 },
  // Group 2: Defenses & Structure
  { id: '15-barricade-t0', cap: 'Barricade T0 · Timber & Steel', target: 'build:barricade:0', view: 'three' },
  { id: '16-barricade-t1', cap: 'Barricade T1 · Braced Shield', target: 'build:barricade:1', view: 'three' },
  { id: '17-barricade-t2', cap: 'Barricade T2 · Czech Hedgehog', target: 'build:barricade:2', view: 'three' },
  { id: '18-sandbag-t0', cap: 'Sandbag T0 · Burlap Wall', target: 'build:sandbag:0', view: 'three' },
  { id: '19-sandbag-t1', cap: 'Sandbag T1 · Double-Stacked', target: 'build:sandbag:1', view: 'three' },
  { id: '20-sandbag-t2', cap: 'Sandbag T2 · Gabion Wall', target: 'build:sandbag:2', view: 'three' },
  { id: '21-wire-t0', cap: 'Wire T0 · Barbed Wire', target: 'build:wire:0', view: 'three' },
  { id: '22-wire-t2', cap: 'Wire T2 · Razor Wire', target: 'build:wire:2', view: 'three' },
  { id: '23-railing-t0', cap: 'Railing T0 · Steel Rail', target: 'build:railing:0', view: 'three' },
  { id: '24-railing-t2', cap: 'Railing T2 · Armoured Parapet', target: 'build:railing:2', view: 'three' },
  { id: '25-platform-t0', cap: 'Platform T0 · Grated Deck', target: 'build:platform:0', view: 'three', pitch: 34 },
  { id: '26-platform-t2', cap: 'Platform T2 · Gun Emplacement', target: 'build:platform:2', view: 'three', pitch: 32 },
  // Group 3: Pillars, Stairs, Traps & Drums
  { id: '27-pillar-t0', cap: 'Pillar T0 · Flanged Steel', target: 'build:pillar:0', view: 'three' },
  { id: '28-pillar-t1', cap: 'Pillar T1 · Concrete Pillar', target: 'build:pillar:1', view: 'three' },
  { id: '29-pillar-t2', cap: 'Pillar T2 · Steel H-Column', target: 'build:pillar:2', view: 'three' },
  { id: '30-stairs-t0', cap: 'Stairs T0 · Timber Flight', target: 'build:stairs:0', view: 'three' },
  { id: '31-stairs-t2', cap: 'Stairs T2 · Retractable Steel', target: 'build:stairs:2', view: 'three' },
  { id: '32-spikes-t0', cap: 'Spikes T0 · Timber Trap', target: 'build:spikes:0', view: 'three', pitch: 38 },
  { id: '33-spikes-t2', cap: 'Spikes T2 · Steel Blade Bed', target: 'build:spikes:2', view: 'three', pitch: 38 },
  { id: '34-mine-t0', cap: 'Mine T0 · Pressure Mine', target: 'build:mine:0', view: 'three', pitch: 36 },
  { id: '35-mine-t2', cap: 'Mine T2 · Bounding Mine', target: 'build:mine:2', view: 'three', pitch: 32 },
  { id: '36-lure-t0', cap: 'Lure T0 · Decoy Beacon', target: 'build:lure:0', view: 'three' },
  { id: '37-lure-t2', cap: 'Lure T2 · Shock Tesla Beacon', target: 'build:lure:2', view: 'three' },
  { id: '38-barrel-t0', cap: 'Barrel T0 · Fuel Drum', target: 'build:barrel:0', view: 'three', pitch: 24 },
  { id: '39-barrel-t1', cap: 'Barrel T1 · Napalm Drum', target: 'build:barrel:1', view: 'three', pitch: 24 },
  // Group 4: Automated Turrets (Mk I & Mk III)
  { id: '40-light-t0', cap: 'Light Turret Mk I', target: 'build:light:0', view: 'three' },
  { id: '41-light-t2', cap: 'Light Turret Mk III', target: 'build:light:2', view: 'three' },
  { id: '42-heavy-t0', cap: 'Heavy Turret Mk I', target: 'build:heavy:0', view: 'three' },
  { id: '43-heavy-t2', cap: 'Heavy Turret Mk III', target: 'build:heavy:2', view: 'three' },
  { id: '44-flame-t0', cap: 'Flame Turret Mk I', target: 'build:flame:0', view: 'three' },
  { id: '45-flame-t2', cap: 'Flame Turret Mk III', target: 'build:flame:2', view: 'three' },
];

class BuildCapture extends Engine {
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
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function shootCustomOpening(page, spec) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const THREE = T.THREE;
    if (window.__ag406Custom) {
      T.scene.remove(window.__ag406Custom);
      window.__ag406Custom = null;
    }
    // Clear any prior CamRig sky shelf item first
    const skyY = T.sampleHeight(-40, -70) + 34;
    await CamRig.aim({ target: 'xyz:-40,' + skyY.toFixed(2) + ',-70', time: 'noon', ui: false, settle: 30 });
    const bd = T.spawnBuild(${JSON.stringify(spec.kind)}, -40, -70);
    if (${spec.tier || 0} > 0) T.applyUpgrade(bd, ${JSON.stringify(spec.kind)}, ${spec.tier || 0});
    T.applyOpening(bd, ${JSON.stringify(spec.opening)});
    if (${JSON.stringify(spec.opening)} === 'door' && ${spec.openTier || 0} > 0) T.applyUpgrade(bd, 'door', ${spec.openTier || 0});
    if (${JSON.stringify(spec.opening)} === 'gate' && ${spec.openTier || 0} > 0) T.applyUpgrade(bd, 'gate', ${spec.openTier || 0});
    if (${!!spec.barred}) T.applyUpgrade(bd, 'bars', 1);
    const bi = T.builds.indexOf(bd);
    if (bi >= 0) T.builds.splice(bi, 1);
    const mesh = bd.mesh;
    mesh.position.set(-40, skyY, -70);
    mesh.rotation.set(0, 0, 0);
    mesh.visible = true;
    T.scene.add(mesh);
    mesh.updateMatrixWorld(true);
    window.__ag406Custom = mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    // Clamp buried skirt out of vertical framing so the visible above-ground face fills the frame
    const minY = Math.max(box.min.y, skyY - 0.05);
    const cy = (minY + box.max.y) * 0.5;
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    const w = Math.max(1.2, box.max.x - box.min.x);
    const h = Math.max(1.2, box.max.y - minY);
    const dist = Math.max(w, h) * 1.95;
    const az = 0.52, el = 0.24;
    await CamRig.aim({
      cam: {
        x: cx + Math.sin(az) * Math.cos(el) * dist,
        y: cy + Math.sin(el) * dist,
        z: cz + Math.cos(az) * Math.cos(el) * dist,
        tx: cx, ty: cy, tz: cz, fov: 35,
      },
      time: 'noon',
      ui: false,
      settle: 110,
    });
  })()`, 30000);
}

async function buildShowcaseBase(page) {
  return await page.evaluate(`(() => {
    const T = window.TT;
    if (window.__ag406Custom) { T.scene.remove(window.__ag406Custom); window.__ag406Custom = null; }
    // Clear trees/rocks around a clean 20x16m showcase pad at x = 22..40, z = -12..4
    const baseX = 30, baseZ = -4;
    for (const tr of T.trees || []) if (Math.hypot(tr.x - baseX, tr.z - baseZ) < 22) { tr.alive = false; if (tr.mesh) tr.mesh.visible = false; }
    for (const rk of T.rocks || []) if (Math.hypot(rk.x - baseX, rk.z - baseZ) < 22) { rk.alive = false; if (rk.mesh) rk.mesh.visible = false; }
    const grp = new T.THREE.Group();
    grp.name = 'ag406-showcase-base';
    const pieces = [
      // Back wall row (5 tiers + doors + window bars)
      ['wall', 0, -4, -4, 0],
      ['wall', 1, -2, -4, 0, { opening: 'door', openTier: 0 }],
      ['wall', 2,  0, -4, 0, { opening: 'window', barred: true }],
      ['wall', 3,  2, -4, 0, { opening: 'door', openTier: 2 }],
      ['wall', 4,  4, -4, 0, { opening: 'door', openTier: 4 }],
      // Floors + Stairs + Pillars
      ['floor', 0, -4, -2, 0],
      ['floor', 1, -2, -2, 0],
      ['floor', 2,  0, -2, 0],
      ['stairs', 0, 2, -2, 0],
      ['stairs', 2, 4, -2, 0],
      ['pillar', 0, -6, -4, 0],
      ['pillar', 1, -6, -2, 0],
      ['pillar', 2, -6,  0, 0],
      // Platforms + Turrets (Mk I & Mk III)
      ['platform', 0, -4, 0, 0],
      ['light', 0, -4, 0, 0, { dy: 0.65 }],
      ['platform', 2, -2, 0, 0],
      ['heavy', 2, -2, 0, 0, { dy: 0.65 }],
      ['platform', 1,  0, 0, 0],
      ['flame', 2,  0, 0, 0, { dy: 0.65 }],
      ['light', 2,  2, 0, 0],
      ['heavy', 0,  4, 0, 0],
      // Front defensive line (barricades, sandbags, gabions, wire, railings, gate)
      ['barricade', 0, -4, 2, 0],
      ['barricade', 1, -2, 2, 0],
      ['barricade', 2,  0, 2, 0],
      ['sandbag', 0, 2, 2, 0],
      ['sandbag', 1, 4, 2, 0],
      ['sandbag', 2, 6, 2, 0],
      ['wire', 0, -4, 4, 0],
      ['wire', 2, -2, 4, 0],
      ['railing', 0, 0, 4, 0],
      ['railing', 2, 2, 4, 0],
      ['barricade', 0, 4, 4, 0, { opening: 'gate', openTier: 2 }],
      // Traps, drums, beacons in front
      ['spikes', 0, -4, 6, 0],
      ['spikes', 2, -2, 6, 0],
      ['mine', 0, 0, 6, 0],
      ['mine', 2, 1.2, 6, 0],
      ['lure', 0, 2.6, 6, 0],
      ['lure', 2, 4.0, 6, 0],
      ['barrel', 0, 5.4, 5.4, 0],
      ['barrel', 1, 5.4, 6.6, 0],
    ];
    for (const [kind, tier, dx, dz, yaw, extra] of pieces) {
      const wx = baseX + dx, wz = baseZ + dz;
      const gy = T.sampleHeight(wx, wz);
      const bd = T.spawnBuild(kind, wx, wz);
      if (!bd) continue;
      if (tier > 0) T.applyUpgrade(bd, kind, tier);
      if (extra?.opening) {
        T.applyOpening(bd, extra.opening);
        if (extra.opening === 'door' && extra.openTier > 0) T.applyUpgrade(bd, 'door', extra.openTier);
        if (extra.opening === 'gate' && extra.openTier > 0) T.applyUpgrade(bd, 'gate', extra.openTier);
        if (extra.barred) T.applyUpgrade(bd, 'bars', 1);
      }
      const m = bd.mesh;
      m.position.set(wx, gy + (extra?.dy || 0), wz);
      m.rotation.y = yaw;
      m.visible = true;
      grp.add(m);
    }
    T.scene.add(grp);
    window.__ag406Base = grp;
    // Audit all materials/textures inside the 40-piece buildable showcase
    const seenMat = new Set(), seenTex = new Set();
    let meshes = 0, withMap = 0, withNrm = 0, withRgh = 0, withMet = 0, withAO = 0;
    const texList = [];
    grp.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat || seenMat.has(mat)) continue;
        seenMat.add(mat);
        if (mat.map) withMap++;
        if (mat.normalMap) withNrm++;
        if (mat.roughnessMap) withRgh++;
        if (mat.metalnessMap) withMet++;
        if (mat.aoMap) withAO++;
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
          const t = mat[k];
          if (t && !seenTex.has(t)) {
            seenTex.add(t);
            const img = t.image || {};
            const w = img.width || 0, h = img.height || 0;
            const bytes = Math.round(w * h * 4 * (t.generateMipmaps === false ? 1 : 1.3333));
            texList.push({ name: t.name || k, w, h, bytes, aniso: t.anisotropy || 1 });
          }
        }
      }
    });
    const totalBytes = texList.reduce((a, t) => a + t.bytes, 0);
    return {
      placedCount: grp.children.length,
      meshes,
      uniqueMaterials: seenMat.size,
      materialsWithMap: withMap,
      materialsWithNormal: withNrm,
      materialsWithRoughness: withRgh,
      materialsWithMetalness: withMet,
      materialsWithAO: withAO,
      uniqueTextures: texList.length,
      estimatedVramMB: +(totalBytes / (1024 * 1024)).toFixed(2),
      textures: texList.sort((a, b) => b.bytes - a.bytes),
      centerY: T.sampleHeight(baseX, baseZ),
    };
  })()`, 60000);
}

async function benchCourtyard(page, cam) {
  await page.evaluate(`(async () => {
    await CamRig.aim({ cam: ${JSON.stringify(cam)}, time: 'noon', ui: false, settle: 250 });
    window.__ag406Late = [];
    const b = TT.renderer && TT.renderer.backend;
    if (b && typeof b.createRenderPipeline === 'function' && !b.__ag406Hooked) {
      b.__ag406Hooked = true;
      const cp = b.createRenderPipeline.bind(b);
      b.createRenderPipeline = (ro, ...a) => {
        window.__ag406Late.push({ mat: ro?.material?.name || ro?.material?.type || '', obj: ro?.object?.name || ro?.object?.type || '' });
        return cp(ro, ...a);
      };
    }
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
        prev = now; n++;
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
      frames: frames.length,
      meanMs: +mean.toFixed(2),
      meanFps: +(1000 / mean).toFixed(1),
      medianMs: +median.toFixed(2),
      p99Ms: +p99.toFixed(2),
      worstMs: +worst.toFixed(2),
      hitches,
      callsPerFrame: +((info.render.calls - callsStart) / frames.length).toFixed(1),
      tris: info.render.triangles,
      lateCompiles: (window.__ag406Late || []).length,
    };
  })()`, 60000);
}

const cam = new BuildCapture({ onscreen: true, size: '1600x900' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-406 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const shotMeta = [];
  for (const s of STUDIO_SHOTS) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    if (s.custom) {
      await shootCustomOpening(page, s.custom);
    } else {
      await page.evaluate(`(async () => {
        if (window.__ag406Custom) { window.TT.scene.remove(window.__ag406Custom); window.__ag406Custom = null; }
        await CamRig.aim({
          target: ${JSON.stringify(s.target)},
          view: ${JSON.stringify(s.view || 'three')},
          ${s.pitch != null ? `pitch: ${s.pitch},` : ''}
          margin: 1.08,
          time: 'noon',
          ui: false,
          settle: 90,
        });
      })()`, 30000);
    }
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-406/${TAG}/${s.id}.png`, bytes });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  // Live 40-piece outdoor fortified base in 4 lights (Noon, Morning/Cool, Dusk, Night — Rule 19)
  const audit = await buildShowcaseBase(page);
  const cy = audit.centerY;
  const baseCam = { x: 24.5, y: cy + 5.2, z: 9.8, tx: 30.2, ty: cy + 1.0, tz: -3.2, fov: 48 };
  const closeCam = { x: 31.8, y: cy + 2.1, z: 4.5, tx: 30.5, ty: cy + 1.0, tz: -2.0, fov: 50 };
  const lightingShots = [
    { id: '46-base-noon', cap: '40-Piece Base · Noon', time: 'noon', cam: baseCam },
    { id: '47-base-morning', cap: '40-Piece Base · Morning Grazing Light', time: 'morning', cam: closeCam },
    { id: '48-base-dusk', cap: '40-Piece Base · Dusk Warm Sun', time: 'dusk', cam: baseCam },
    { id: '49-base-night', cap: '40-Piece Base · Night Glows', time: 'night', cam: baseCam },
  ];
  for (const s of lightingShots) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    await page.evaluate(`(async () => {
      await CamRig.aim({ cam: ${JSON.stringify(s.cam)}, time: ${JSON.stringify(s.time)}, ui: false, settle: 180 });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-406/${TAG}/${s.id}.png`, bytes });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  const perf = await benchCourtyard(page, baseCam);
  const metrics = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors,
    audit,
    perf,
    shots: shotMeta,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length,
    audit: { ...audit, textures: undefined },
    perf,
  }, null, 2));

  execFileSync('python', ['qa/AG-406/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
