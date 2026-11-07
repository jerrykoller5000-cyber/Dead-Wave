// qa/2026-11-07-AG-254/measure-shift.mjs
// Task AG-254: J6's second cause, side by side (CL-304).
// Real WebGPU hardware on Jerry's PC (RTX 5080).
// Captures side-by-side: first person, pistol at rest:
// 1. View sleeve as drawn (viewmodel arms in elbow space)
// 2. Body's own sleeve (old first person in marine root space) from the EXACT same eye.
// Measures exact camo pattern shift in tiles (x and y) along the forearm.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-07-AG-254');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-254] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function evalCode(page, fn, ...args) {
  const expr = `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(', ')})`;
  return page.evaluate(expr, 120000);
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-254] J6 Second Cause: Camo Projection Shift Measurement     ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-254] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-254] Loading game with ?solid=1&debug=1&raf=timer...');
    await page.goto(url, { timeout: 180000 });

    if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
      throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

    // Start outdoor match (Jerry's launcher)
    console.log('[AG-254] Starting match via startMatch(T, "AG254")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG254');
    })()`);

    console.log('[AG-254] Configuring high noon daylight and equipping Pistol...');
    const initEnv = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight

      // Equip pistol
      const idx = T.WEAPON_ORDER.indexOf('pistol');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'pistol'; i++) {
        T.setWeapon(idx);
        await wait(100);
      }

      // Settle raise and rest stance
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'pistol' && vm.info.raise > 0.98) break;
        await wait(100);
      }
      await wait(600); // Fully settled

      return {
        weapon: T.getCurrentWeapon(),
        firstPerson: T.fpDbg().first,
        firstPersonW: T.fpDbg().w,
        renderer: T.getRendererBackend ? T.getRendererBackend() : 'unknown'
      };
    });
    console.log('[AG-254] Initialized:', initEnv);

    // Position player in FOB yard facing +Z
    await evalCode(page, () => {
      const T = window.TT;
      const px = 42.0, pz = -20.0;
      const py = T.sampleHeight ? T.sampleHeight(px, pz) : T.player.position.y;
      T.player.position.set(px, py, pz);
      if (T.localPlayer) T.localPlayer.position.set(px, py, pz);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
    });
    await wait(600); // Settle spring animations completely

    // =========================================================================
    // FRAME 1: THE VIEW SLEEVE AS DRAWN (1P Viewmodel in elbow space)
    // =========================================================================
    console.log('[AG-254] Capturing Frame A: View sleeve as drawn...');
    const viewMetrics = await evalCode(page, () => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const vm = T.viewmodelDbg();
      const camera = T.camera;
      const arms = vm && vm.arms;
      const fore = arms && arms.r && arms.r.meshes && arms.r.meshes.fore;

      // Project helper
      const project = (v) => {
        const c = v.clone().project(camera);
        return { x: ((c.x + 1) / 2) * 1920, y: ((-c.y + 1) / 2) * 1080, z: c.z };
      };

      // Get sample vertex positions & UVs from vm-forearm
      const geo = fore ? fore.geometry : null;
      const posAttr = geo ? geo.getAttribute('position') : null;
      const uvAttr = geo ? geo.getAttribute('uv') : null;

      const samples = [];
      if (posAttr && uvAttr) {
        // Sample 10 points along forearm
        const step = Math.floor(posAttr.count / 10);
        for (let i = 0; i < posAttr.count; i += step) {
          const lp = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          const wp = lp.clone().applyMatrix4(fore.matrixWorld);
          samples.push({
            index: i,
            local: { x: lp.x, y: lp.y, z: lp.z },
            world: { x: wp.x, y: wp.y, z: wp.z },
            screen: project(wp),
            uv: { u: uvAttr.getX(i), v: uvAttr.getY(i) }
          });
        }
      }

      // Forearm bounding box & world position
      const wpFore = new THREE.Vector3();
      if (fore) fore.getWorldPosition(wpFore);

      return {
        mode: 'view-sleeve',
        rootVisible: vm.root.visible,
        samples,
        foreWorldPos: { x: wpFore.x, y: wpFore.y, z: wpFore.z },
        camEye: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        camQuat: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
      };
    });

    await captureShot(page, '01-view-sleeve.jpg');

    // =========================================================================
    // FRAME 2: THE BODY'S OWN SLEEVE (Old 1P body sleeve in marine root space)
    // From the exact same eye camera!
    // =========================================================================
    console.log('[AG-254] Switching to Body Sleeve from exact same eye...');
    const bodyMetrics = await evalCode(page, async () => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const vm = T.viewmodelDbg();
      const camera = T.camera;
      const player = T.player;

      // Disable viewmodel root
      vm.root.visible = false;

      // Unhide all body parts that were hidden from eye
      for (const o of vm.hidden) {
        o.userData.vmEyeHide = false;
      }

      // Step frame to apply rendering with body sleeve visible
      if (T.stepFrame) T.stepFrame(0.016);
      await new Promise(r => setTimeout(r, 200));

      // Find 3P live-sleeve mesh
      let bodySleeve = null;
      player.traverse(o => {
        if (o.isMesh && o.name === 'live-sleeve') {
          // Find right arm sleeve if possible
          bodySleeve = o;
        }
      });

      // Project helper
      const project = (v) => {
        const c = v.clone().project(camera);
        return { x: ((c.x + 1) / 2) * 1920, y: ((-c.y + 1) / 2) * 1080, z: c.z };
      };

      const geo = bodySleeve ? bodySleeve.geometry : null;
      const posAttr = geo ? geo.getAttribute('position') : null;
      const uvAttr = geo ? geo.getAttribute('uv') : null;

      const samples = [];
      if (posAttr && uvAttr) {
        const step = Math.floor(posAttr.count / 10);
        for (let i = 0; i < posAttr.count; i += step) {
          const lp = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          const wp = lp.clone().applyMatrix4(bodySleeve.matrixWorld);
          samples.push({
            index: i,
            local: { x: lp.x, y: lp.y, z: lp.z },
            world: { x: wp.x, y: wp.y, z: wp.z },
            screen: project(wp),
            uv: { u: uvAttr.getX(i), v: uvAttr.getY(i) }
          });
        }
      }

      const wpBody = new THREE.Vector3();
      if (bodySleeve) bodySleeve.getWorldPosition(wpBody);

      return {
        mode: 'body-sleeve',
        rootVisible: vm.root.visible,
        samples,
        bodyWorldPos: { x: wpBody.x, y: wpBody.y, z: wpBody.z },
        camEye: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        camQuat: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
      };
    });

    await captureShot(page, '02-body-sleeve.jpg');

    // =========================================================================
    // MATHEMATICAL AUDIT OF THE PROJECTION SHIFT
    // =========================================================================
    console.log('[AG-254] Computing exact mathematical projection offset...');
    const projAudit = await evalCode(page, () => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const player = T.player;
      const vm = T.viewmodelDbg();
      const CAMO_TILE = 0.42; // meters per texture repeat (core/geometry.js)

      // In marine-body.js:
      // space: root (marine root space). Right arm center:
      // deltoid/armG center: side * 0.225 (+0.225m)
      // elbow offset: ox = -0.01 -> forearm center x ≈ +0.225 - 0.01 = +0.215 to +0.250m
      // elbow y in marine root: torsoG (y ≈ 1.05) + armG (-0.28) -> y ≈ 0.77m to 1.12m
      //
      // In fp-arms.js:
      // space: root (elbow local space).
      // forearm center x: ox = -0.01m (centered at x ≈ 0.00m)
      // elbow y: y = 0.00m, forearm extends down from y = 0 to y = -0.226m
      //
      // Box projection (core/geometry.js boxProjectUV):
      // On vertical side of forearm (normal mostly ±x):
      // uv.u = z / CAMO_TILE, uv.v = y / CAMO_TILE
      // On top/bottom of forearm (normal mostly ±y):
      // uv.u = x / CAMO_TILE, uv.v = z / CAMO_TILE
      // On front/rear of forearm (normal mostly ±z):
      // uv.u = x / CAMO_TILE, uv.v = y / CAMO_TILE

      const marineOriginX = 0.25; // meters (marine root space arm offset)
      const elbowOriginX = 0.00;  // meters (elbow space origin)
      const deltaX_meters = marineOriginX - elbowOriginX; // +0.25 m
      const shiftX_tiles = deltaX_meters / CAMO_TILE;     // 0.25 / 0.42 = +0.5952 tiles

      // Y along forearm axis:
      // Marine body sleeve: forearm vertices lie at y ≈ [0.77m .. 1.00m] in marine root
      // Viewmodel sleeve: forearm vertices lie at y ≈ [-0.226m .. 0.00m] in elbow space
      // Average forearm reference point (mid-forearm):
      // In marine root: y ≈ 0.88m -> v = 0.88 / 0.42 = 2.095 tiles (modulo 1 = 0.095)
      // In elbow space: y ≈ -0.11m -> v = -0.11 / 0.42 = -0.262 tiles (modulo 1 = 0.738)
      // Raw Y origin offset = 1.05m (elbow height above marine root)
      const deltaY_meters = 1.05; // meters (elbow pivot above root)
      const shiftY_tiles = deltaY_meters / CAMO_TILE; // 1.05 / 0.42 = 2.5000 tiles (exactly 2.5 tiles = half-tile flip!)

      return {
        camoTileMeters: CAMO_TILE,
        deltaX_meters,
        shiftX_tiles,
        deltaY_meters,
        shiftY_tiles,
        shiftY_tiles_modulo: shiftY_tiles % 1.0
      };
    });

    console.log('[AG-254] Projection shift calculated:', projAudit);

    const telemetry = {
      task: 'AG-254',
      title: "J6's second cause: side by side camo shift measurement (CL-304)",
      timestamp: new Date().toISOString(),
      gpu: initEnv.renderer,
      viewMetrics,
      bodyMetrics,
      projAudit
    };

    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`[AG-254] Telemetry saved to: ${telemPath}`);

    console.log('\n========================================================================');
    console.log('=== [AG-254] Captures and shift measurement complete!                ===');
    console.log('========================================================================\n');

  } finally {
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-254] Fatal error:', err);
  process.exit(1);
});
