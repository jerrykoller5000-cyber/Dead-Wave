import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AG-410', TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

// Studio close-up catalog covering ALL 12 firearms/chainsaw + camo + melee + emplaced + thrown weapons
const STUDIO_SHOTS = [
  // Sidearms & SMGs
  { id: '01-pistol', cap: 'Tactical Pistol', target: 'weapon:pistol', view: 'side', yaw: 32, pitch: 12 },
  { id: '02-revolver', cap: 'Heavy Revolver (Blued & Walnut)', target: 'weapon:revolver', view: 'side', yaw: 34, pitch: 12 },
  { id: '03-uzi', cap: 'Wasp-9 SMG (Suppressed)', target: 'weapon:uzi:can', view: 'side', yaw: 30, pitch: 12 },
  // Longarms
  { id: '04-m4', cap: 'GW-4 Carbine (Factory)', target: 'weapon:m4', view: 'side', yaw: 28, pitch: 12 },
  { id: '05-m4-camo', cap: 'GW-4 Carbine (Multicam + PBR)', customCamo: { kind: 'm4', camo: 'multicam' } },
  { id: '06-ak-wood', cap: 'KR-7 Assault Rifle (Birch Wood)', target: 'weapon:ak', view: 'side', yaw: 28, pitch: 12 },
  { id: '07-shotgun', cap: '12ga Pump Shotgun', target: 'weapon:shotgun', view: 'side', yaw: 28, pitch: 12 },
  { id: '08-aa12', cap: 'Breacher Auto-Shotgun', target: 'weapon:aa12', view: 'side', yaw: 28, pitch: 12 },
  { id: '09-sniper', cap: 'Precision Sniper Rifle (Suppressed)', target: 'weapon:sniper:can', view: 'side', yaw: 28, pitch: 12 },
  // Heavy & Special
  { id: '10-minigun', cap: 'M134 Rotary Minigun', target: 'weapon:minigun', view: 'side', yaw: 32, pitch: 14 },
  { id: '11-launcher', cap: '40mm Rotary Grenade Launcher', target: 'weapon:launcher', view: 'side', yaw: 32, pitch: 14 },
  { id: '12-flamer', cap: 'Dual-Tank Flamethrower', target: 'weapon:flamer', view: 'side', yaw: 34, pitch: 14 },
  { id: '13-chainsaw', cap: 'Combat Chainsaw', target: 'weapon:chainsaw', view: 'side', yaw: 34, pitch: 16 },
  // Melee
  { id: '14-knife', cap: 'Combat Knife', target: 'weapon:knife', view: 'side', yaw: 28, pitch: 14 },
  { id: '15-machete', cap: 'Combat Machete', target: 'weapon:machete', view: 'side', yaw: 28, pitch: 14 },
  { id: '16-katana', cap: 'Crimson Katana', customModel: 'katana' },
  { id: '17-katana-sheathed', cap: 'Sheathed Katana', customModel: 'katana-sheathed' },
  // Emplaced & Thrown
  { id: '18-m240', cap: 'Watchman M240 HMG', target: 'weapon:m240', view: 'three', pitch: 18 },
  { id: '19-mortar', cap: '81mm Field Mortar', target: 'weapon:mortar', view: 'three', pitch: 18 },
  { id: '20-mortar-round', cap: 'M29A1 81mm Mortar Round', customModel: 'mortar-round' },
  { id: '21-frag-grenade', cap: 'M67 Frag Grenade', customModel: 'frag-grenade' },
  { id: '22-holy-grenade', cap: 'Holy Hand Grenade', customModel: 'holy-grenade' },
];

// First-person gameplay views across ALL 4 lighting conditions + grazing dusk
const FP_SHOTS = [
  { id: '23-fp-m4-noon', cap: '1P GW-4 Carbine · Noon', weapon: 'm4', time: 'noon', rain: false, flashlight: false, camo: '' },
  { id: '24-fp-ak-noon', cap: '1P KR-7 Birch Wood · Noon', weapon: 'ak', time: 'noon', rain: false, flashlight: false, camo: '' },
  { id: '25-fp-revolver-overcast', cap: '1P Revolver · Overcast', weapon: 'revolver', time: 'overcast', rain: true, flashlight: false, camo: '' },
  { id: '26-fp-flamer-dusk', cap: '1P Flamethrower · Dusk', weapon: 'flamer', time: 'dusk', rain: false, flashlight: false, camo: '' },
  { id: '27-fp-pistol-night', cap: '1P Tactical Pistol · Night + Light', weapon: 'pistol', time: 'night', rain: false, flashlight: true, camo: '' },
  { id: '28-fp-m4-camo-dusk', cap: '1P GW-4 Multicam · Dusk', weapon: 'm4', time: 'dusk', rain: false, flashlight: false, camo: 'multicam' },
];

class WeaponCapture extends Engine {
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

async function clearCustomShelf(page) {
  await page.evaluate(`(() => {
    const T = window.TT;
    if (window.__ag410Shelf) {
      T.scene.remove(window.__ag410Shelf);
      window.__ag410Shelf = null;
    }
  })()`, 15000);
}

async function shootCustomModel(page, kind) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const THREE = T.THREE;
    const modelKind = ${JSON.stringify(kind)};
    if (window.__ag410Shelf) { T.scene.remove(window.__ag410Shelf); window.__ag410Shelf = null; }
    const skyY = T.sampleHeight(-40, -70) + 34;
    await CamRig.aim({ target: 'xyz:-40,' + skyY.toFixed(2) + ',-70', time: 'noon', ui: false, settle: 30 });
    let mesh = null;
    if (modelKind === 'katana') {
      const M = await import('/studio/katana.js');
      mesh = M.makeKatanaModel({ THREE });
    } else if (modelKind === 'katana-sheathed') {
      const M = await import('/studio/katana.js');
      mesh = M.makeSheathedKatana({ THREE });
    } else if (modelKind === 'frag-grenade') {
      const M = await import('/studio/frag-grenade.js');
      mesh = M.makeFragGrenade({ THREE, r: 0.14 });
    } else if (modelKind === 'holy-grenade') {
      const M = await import('/world/rabbit.js');
      mesh = M.buildHolyGrenade(THREE);
    } else if (modelKind === 'mortar-round') {
      const B = T.inspectHost().builders;
      mesh = B.mortarRound();
    }
    if (!mesh) throw new Error('Could not build custom weapon: ' + modelKind);
    mesh.position.set(-40, skyY, -70);
    mesh.rotation.set(0, 0, 0);
    if (modelKind === 'katana' || modelKind === 'katana-sheathed' || modelKind === 'mortar-round') {
      mesh.rotation.y = Math.PI * 0.5;
    }
    mesh.visible = true;
    T.scene.add(mesh);
    mesh.updateMatrixWorld(true);
    window.__ag410Shelf = mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(0.16, size.length());
    const dist = span * 1.42;
    const az = modelKind.includes('grenade') ? 0.55 : 0.34;
    const el = modelKind.includes('grenade') ? 0.24 : 0.18;
    await CamRig.aim({
      cam: {
        x: center.x + Math.sin(az) * Math.cos(el) * dist,
        y: center.y + Math.sin(el) * dist,
        z: center.z + Math.cos(az) * Math.cos(el) * dist,
        tx: center.x, ty: center.y, tz: center.z, fov: 32,
      },
      time: 'noon',
      ui: false,
      settle: 110,
    });
  })()`, 30000);
}

async function shootCustomCamo(page, spec) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const THREE = T.THREE;
    if (window.__ag410Shelf) { T.scene.remove(window.__ag410Shelf); window.__ag410Shelf = null; }
    const skyY = T.sampleHeight(-40, -70) + 34;
    await CamRig.aim({ target: 'xyz:-40,' + skyY.toFixed(2) + ',-70', time: 'noon', ui: false, settle: 30 });
    T.dressGuns({ guns: { ${JSON.stringify(spec.kind)}: ${JSON.stringify(spec.camo)} } });
    const src = T.weaponMeshes[${JSON.stringify(spec.kind)}];
    const clone = T.cloneLean(src);
    clone.visible = true;
    clone.position.set(-40, skyY, -70);
    clone.rotation.set(0, 0, 0);
    T.scene.add(clone);
    clone.updateMatrixWorld(true);
    window.__ag410Shelf = clone;
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const span = Math.max(0.3, box.getSize(new THREE.Vector3()).length());
    const dist = span * 1.38;
    const az = 1.18, el = 0.20;
    await CamRig.aim({
      cam: {
        x: center.x + Math.sin(az) * Math.cos(el) * dist,
        y: center.y + Math.sin(el) * dist,
        z: center.z + Math.cos(az) * Math.cos(el) * dist,
        tx: center.x, ty: center.y, tz: center.z, fov: 32,
      },
      time: 'noon',
      ui: false,
      settle: 110,
    });
  })()`, 30000);
}

async function auditWeapons(page) {
  return await page.evaluate(`(async () => {
    const T = window.TT;
    const THREE = T.THREE;
    T.dressGuns({ guns: {} });
    const seenMat = new Set(), seenTex = new Set();
    let totalMeshes = 0, withMap = 0, withNrm = 0, withRgh = 0, withMet = 0, withAO = 0, nodePbr = 0;
    const texList = [];
    const coldMeshesByGun = {};
    const collect = (root) => {
      if (!root) return 0;
      let n = 0;
      root.traverse((o) => {
        if (!o.isMesh) return;
        n++;
        totalMeshes++;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          if (!mat || seenMat.has(mat)) continue;
          seenMat.add(mat);
          if (mat.map) withMap++;
          if (mat.normalMap || mat.normalNode) withNrm++;
          if (mat.roughnessMap || mat.userData?.weaponFoldPBR) withRgh++;
          if (mat.metalnessMap || mat.userData?.weaponFoldPBR) withMet++;
          if (mat.aoMap || mat.userData?.weaponFoldPBR) withAO++;
          if (mat.userData?.weaponFoldPBR) nodePbr++;
          const extras = mat.userData?.weaponFoldTextures || [];
          const list = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap, mat.emissiveMap, ...extras];
          for (const t of list) {
            if (t && !seenTex.has(t)) {
              seenTex.add(t);
              const img = t.image || {};
              const w = img.width || 0, h = img.height || 0;
              const bytes = Math.round(w * h * 4 * (t.generateMipmaps === false ? 1 : 1.3333));
              texList.push({ name: t.name || 'tex', w, h, bytes, aniso: t.anisotropy || 1 });
            }
          }
        }
      });
      return n;
    };
    let twelveCold = 0;
    for (const [k, g] of Object.entries(T.weaponMeshes || {})) {
      const c = collect(g);
      coldMeshesByGun[k] = c;
      twelveCold += c;
    }
    const kn = T.knifeMesh ? T.knifeMesh() : null;
    if (kn) collect(kn);
    const Mkat = await import('/studio/katana.js');
    collect(Mkat.makeKatanaModel({ THREE }));
    collect(Mkat.makeSheathedKatana({ THREE }));
    const Mfrag = await import('/studio/frag-grenade.js');
    collect(Mfrag.makeFragGrenade({ THREE, r: 0.11 }));
    const Mrab = await import('/world/rabbit.js');
    collect(Mrab.buildHolyGrenade(THREE));
    const B = T.inspectHost().builders;
    if (B?.mortarRound) collect(B.mortarRound());
    if (B?.m240) collect(B.m240(false));
    if (B?.mortar) collect(B.mortar());
    const totalBytes = texList.reduce((a, t) => a + t.bytes, 0);
    return {
      twelveColdMeshes: twelveCold,
      coldMeshesByGun,
      totalAuditedMeshes: totalMeshes,
      uniqueMaterials: seenMat.size,
      materialsWithMap: withMap,
      materialsWithNormal: withNrm,
      materialsWithRoughness: withRgh,
      materialsWithMetalness: withMet,
      materialsWithAO: withAO,
      weaponFoldPBRMats: nodePbr,
      uniqueTextures: texList.length,
      estimatedVramMB: +(totalBytes / (1024 * 1024)).toFixed(2),
      textures: texList.sort((a, b) => b.bytes - a.bytes).slice(0, 40),
    };
  })()`, 60000);
}

async function startFPMode(page) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    if (window.__ag410Shelf) { T.scene.remove(window.__ag410Shelf); window.__ag410Shelf = null; }
    if (window.CamRig && CamRig.release) CamRig.release();
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'AG410';
    const play = document.getElementById('modeHunt');
    if (play && (!T.getPhase || T.getPhase() !== 'prep')) play.click();
    const firstRun = document.getElementById('firstRunCard');
    const playAnyway = document.getElementById('firstRunPlay');
    if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
    for (let i = 0; i < 80; i++) {
      await wait(150);
      if (T.getPhase && T.getPhase() === 'prep') break;
    }
    for (let i = 0; i < 400; i++) {
      if (!document.body.classList.contains('deploying') && !T.marine?.getObjectByName('insertion-harness')) break;
      await wait(100);
    }
    await wait(250);
    T.runDevCommand?.('godmode');
    T.runDevCommand?.('nodead');
    T.clearZombies?.();
    T.grantAllWeapons?.();
    if (T.getGearOwned) T.getGearOwned().laserLight = true;
    if (T.player) {
      const px = 14, pz = 18;
      T.player.position.set(px, T.sampleHeight(px, pz), pz);
      T.player.rotation.y = 0.35;
    }
    if (T.isUnarmed?.()) T.toggleHolster?.();
    T.setViewFirstDbg?.(true);
    await wait(500);
  })()`, 90000);
}

async function setupFPShot(page, spec) {
  await page.evaluate(`(async () => {
    const T = window.TT;
    const spec = ${JSON.stringify(spec)};
    T.clearZombies?.();
    T.dressGuns?.({ guns: spec.camo ? { [spec.weapon]: spec.camo } : {} });
    const idx = T.WEAPON_ORDER.indexOf(spec.weapon);
    if (idx >= 0) T.setWeapon(idx);
    // Step frames until viewmodel settles
    for (let i = 0; i < 140; i++) {
      T.stepFrame?.(0.03);
      const vm = T.viewmodelDbg?.();
      if (vm?.gun?.key === spec.weapon && vm.info.raise > 0.99 && !T.drawDbg?.().active) break;
    }
    // Reset weather then apply lighting mood
    if (T.weather) {
      T.weather.raining = !!spec.rain;
      T.weather.rainTimeLeft = spec.rain ? 120 : 0;
      T.weather.intensity = spec.rain ? 0.75 : 0;
    }
    const tMap = { noon: 0.5, overcast: 0.5, dusk: 0.74, night: 0.02 };
    if (T.setWorldTime) T.setWorldTime(tMap[spec.time] ?? 0.5);
    // Toggle flashlight to match spec
    if (T.toggleFlashlight) {
      const curOn = !!(T.getFlashlightOn ? T.getFlashlightOn() : window.__ag410FlOn);
      if (curOn !== !!spec.flashlight) {
        T.toggleFlashlight(true);
        window.__ag410FlOn = !!spec.flashlight;
      }
    }
    await CamRig.aim({ live: true, time: tMap[spec.time] ?? 0.5, ui: false, settle: 220 });
    for (let i = 0; i < 12; i++) T.stepFrame?.(0.016);
    await new Promise(r => setTimeout(r, 140));
  })()`, 45000);
}

async function benchFP(page) {
  await page.evaluate(`(() => {
    window.__ag410Late = [];
    const b = TT.renderer && TT.renderer.backend;
    if (b && typeof b.createRenderPipeline === 'function' && !b.__ag410Hooked) {
      b.__ag410Hooked = true;
      const cp = b.createRenderPipeline.bind(b);
      b.createRenderPipeline = (ro, ...a) => {
        window.__ag410Late.push({ mat: ro?.material?.name || ro?.material?.type || '' });
        return cp(ro, ...a);
      };
    }
  })()`, 15000);
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
      lateCompiles: (window.__ag410Late || []).length,
    };
  })()`, 60000);
}

const cam = new WeaponCapture({ onscreen: true, size: '1600x900' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-410 ${TAG}] backend=${cam.backend} load=${cam.loadSec.toFixed(2)}s`);

  const audit = await auditWeapons(page);
  console.log(`[AG-410 ${TAG}] audit: twelveCold=${audit.twelveColdMeshes} mats=${audit.uniqueMaterials} map=${audit.materialsWithMap} nrm=${audit.materialsWithNormal} rgh=${audit.materialsWithRoughness} ao=${audit.materialsWithAO} foldPBR=${audit.weaponFoldPBRMats} tex=${audit.uniqueTextures} vram=${audit.estimatedVramMB}MB`);

  // Studio close-ups of every single weapon
  for (const shot of STUDIO_SHOTS) {
    if (shot.customModel) {
      await shootCustomModel(page, shot.customModel);
    } else if (shot.customCamo) {
      await shootCustomCamo(page, shot.customCamo);
    } else {
      await clearCustomShelf(page);
      const aimOpts = { target: shot.target, view: shot.view || 'side', time: 'noon', ui: false, settle: 110 };
      if (shot.yaw != null) aimOpts.yaw = shot.yaw;
      if (shot.pitch != null) aimOpts.pitch = shot.pitch;
      await page.evaluate(`CamRig.aim(${JSON.stringify(aimOpts)})`, 30000);
    }
    const outPath = path.join(OUT_DIR, shot.id + '.png');
    await page.screenshot(outPath);
    console.log(`  shot ${shot.id} (${shot.cap})`);
  }
  await clearCustomShelf(page);

  // First-person 4-light gameplay views
  await startFPMode(page);
  for (const shot of FP_SHOTS) {
    await setupFPShot(page, shot);
    const outPath = path.join(OUT_DIR, shot.id + '.png');
    await page.screenshot(outPath);
    console.log(`  shot ${shot.id} (${shot.cap})`);
  }

  // Steady-state 150-frame first-person benchmark on M4 Noon
  await setupFPShot(page, FP_SHOTS[0]);
  const perf = await benchFP(page);
  console.log(`[AG-410 ${TAG}] FP perf: mean=${perf.meanMs}ms (${perf.meanFps}fps) med=${perf.medianMs}ms p99=${perf.p99Ms}ms hitches=${perf.hitches} calls=${perf.callsPerFrame} late=${perf.lateCompiles}`);

  const metrics = {
    tag: TAG,
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors.length,
    errors: page.errors.slice(0, 10),
    audit,
    perf,
  };
  const reviewDir = path.join(ROOT, 'review', 'AG-410');
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(reviewDir, `metrics-${TAG}.json`), JSON.stringify(metrics, null, 2));
  if (page.errors.length) {
    console.error(`[AG-410 ${TAG}] PAGE ERRORS:`, page.errors);
    process.exitCode = 1;
  }
} finally {
  await cam.close();
}
