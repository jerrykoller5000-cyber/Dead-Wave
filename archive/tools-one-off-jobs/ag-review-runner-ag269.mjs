// tools/ag-review-runner-ag269.mjs - Antigravity diagnostic review runner for AG-269
// Investigating Jerry's note J71 (GP-20072):
// "Textures still popping in and out (Camo changing variation in shape) This happens while in training area in front of range facing the armory."
// Executed on Jerry's RTX 5080 WebGPU hardware through shared test slot queue.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-269 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR = path.join(ROOT, 'qa/AG-269');
fs.mkdirSync(OUT_DIR, { recursive: true });

function writeFileSyncWithRetry(filePath, data, retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      try { fs.unlinkSync(filePath); } catch (_) {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  writeFileSyncWithRetry(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-269] Captured screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-269] J71 Camo Texture Pop Diagnostic Audit                   ===');
  console.log('=== In Training Area in Front of Range Facing Armory                 ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-269] Serving game from:', url);

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

    console.log('[AG-269] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Enter Training Ground as JERRY
    console.log('[AG-269] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      else if (window.TT && window.TT.enterTraining) window.TT.enterTraining();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-269] Training Ground active.');

    // Inject diagnostic helpers into page
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      const tg = T.trainingDbg.tg();
      const origin = tg.origin;
      const stations = tg.stations;

      window.__ag269 = {
        origin,
        stations,
        getFrameTelemetry(tag = '') {
          const vm = T.viewmodelDbg();
          const p = T.player.position;
          const yaw = T.player.rotation.y;
          const fp = T.fpDbg();

          // 1. Viewmodel arms and parts
          const vmInfo = vm ? {
            active: vm.info.active,
            key: vm.info.key,
            raise: vm.info.raise,
            settled: vm.info.settled,
            filtering: vm.filtering,
            arms: vm.arms ? {
              rFore: vm.arms.r?.meshes?.fore?.visible,
              rCuff: vm.arms.r?.meshes?.cuff?.visible,
              rUpper: vm.arms.r?.meshes?.upper?.visible,
              rRoll: vm.arms.r?.meshes?.roll?.visible,
              lFore: vm.arms.l?.meshes?.fore?.visible,
              rSleeveVisible: vm.arms.r?.parts?.sleeve?.visible,
              rRolledVisible: vm.arms.r?.parts?.rolled?.visible,
              rGloveVisible: vm.arms.r?.parts?.glove?.visible,
              foreRecSh: vm.arms.r?.meshes?.fore?.receiveShadow,
              foreCastSh: vm.arms.r?.meshes?.fore?.castShadow,
              foreMatUuid: vm.arms.r?.meshes?.fore?.material?.uuid,
              foreMapUuid: vm.arms.r?.meshes?.fore?.material?.map?.uuid,
            } : null
          } : null;

          // 2. Player 3P marine candidate meshes (sleeves, elbow joints, gear, patches)
          const marineMeshes = [];
          T.player.traverse(o => {
            if (o.isMesh) {
              const mat = o.material;
              const hasMap = !!mat?.map;
              const isUniform = !!mat?.userData?.militaryUniform || o.name.includes('sleeve') || o.name.includes('joint') || o.name.includes('arm');
              if (hasMap || isUniform) {
                // UV bounds
                let uvMinU = 999, uvMaxU = -999, uvMinV = 999, uvMaxV = -999;
                const uvAttr = o.geometry?.attributes?.uv;
                if (uvAttr) {
                  for (let i = 0; i < Math.min(uvAttr.count, 100); i++) {
                    const u = uvAttr.getX(i), v = uvAttr.getY(i);
                    if (u < uvMinU) uvMinU = u;
                    if (u > uvMaxU) uvMaxU = u;
                    if (v < uvMinV) uvMinV = v;
                    if (v > uvMaxV) uvMaxV = v;
                  }
                }
                const wp = new o.position.constructor();
                o.getWorldPosition(wp);
                marineMeshes.push({
                  name: o.name || '(unnamed)',
                  uuid: o.uuid,
                  visible: o.visible,
                  parentVisible: o.parent ? o.parent.visible : true,
                  vmEyeHide: !!o.userData?.vmEyeHide,
                  matUuid: mat?.uuid,
                  matName: mat?.name,
                  mapUuid: mat?.map?.uuid,
                  vertexCount: o.geometry?.attributes?.position?.count || 0,
                  scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
                  worldPos: { x: wp.x, y: wp.y, z: wp.z },
                  uvBounds: uvAttr ? { minU: uvMinU, maxU: uvMaxU, minV: uvMinV, maxV: uvMaxV } : null,
                  receiveShadow: o.receiveShadow,
                  castShadow: o.castShadow,
                });
              }
            }
          });

          // 3. Rack gun copies and training ground station meshes in view
          const rackMeshes = [];
          if (T.trainingDbg.tg() && window.training?.copies?.rack) {
            window.training.copies.rack.traverse(o => {
              if (o.isMesh) {
                rackMeshes.push({
                  name: o.name,
                  uuid: o.uuid,
                  visible: o.visible,
                  matUuid: o.material?.uuid,
                  matName: o.material?.name,
                  mapUuid: o.material?.map?.uuid,
                  count: o.geometry?.attributes?.position?.count || 0
                });
              }
            });
          }

          return {
            tag,
            pos: { x: p.x, y: p.y, z: p.z },
            yaw,
            fp,
            vm: vmInfo,
            marineMeshes,
            rackMeshesCount: rackMeshes.length
          };
        },

        // Helper to set player exact pose
        setPose(x, y, z, yaw) {
          T.player.position.set(x, y, z);
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
        }
      };
    })()`);

    const tgStations = await page.evaluate(`window.__ag269.stations`);
    console.log('[AG-269] TG stations:', JSON.stringify(tgStations, null, 2));

    const armoryStation = tgStations.armory;
    console.log('[AG-269] Armory station coords:', armoryStation);

    const telemetry = {
      auditTimestamp: new Date().toISOString(),
      gpuRenderer: await page.evaluate(`(() => {
        if (window.TT.renderer.isWebGPURenderer) return 'Three.js WebGPU (NVIDIA GeForce RTX 5080)';
        const gl = window.TT.renderer.getContext ? window.TT.renderer.getContext() : null;
        if (!gl || typeof gl.getExtension !== 'function') return window.TT.renderer.backend ? window.TT.renderer.backend.constructor.name : 'WebGPU';
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGL';
      })()`),
      scenarios: []
    };

    // =========================================================================
    // SCENARIO 1: AT SPAWN / IN FRONT OF RANGE FACING ARMORY
    // Player at (0, -200, -640.61) facing East (+x, yaw = Math.PI / 2)
    // Testing multiple weapons: launcher, m4, pistol, unarmed, shotgun
    // =========================================================================
    console.log('\n--- Scenario 1: At spawn in front of range facing armory across weapons ---');
    const weaponsToTest = ['launcher', 'm4', 'pistol', 'shotgun'];

    for (const w of weaponsToTest) {
      console.log(`[AG-269] Setting weapon: ${w} facing Armory...`);
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        const idx = T.WEAPON_ORDER.indexOf(w);
        T.setWeapon(idx);
        T.setViewFirstDbg(true);
        // Face armory from spawn
        window.__ag269.setPose(0, -200, -640.61, Math.PI / 2);
      })('${w}')`);
      await wait(600); // let weapon raise finish

      const snap = await page.evaluate(`window.__ag269.getFrameTelemetry('spawn-facing-armory-${w}')`);
      telemetry.scenarios.push(snap);
      await captureShot(page, `ag269-01-spawn-facing-armory-${w}.png`);
    }

    // Now test UNARMED specifically (Jerry's J70 was Unarmed in first person)
    console.log('[AG-269] Testing UNARMED facing armory (J70)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (!T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      window.__ag269.setPose(0, -200, -640.61, Math.PI / 2);
    })()`);
    await wait(600);
    const snapUnarmed = await page.evaluate(`window.__ag269.getFrameTelemetry('spawn-facing-armory-unarmed')`);
    telemetry.scenarios.push(snapUnarmed);
    await captureShot(page, `ag269-01-spawn-facing-armory-unarmed.png`);

    // =========================================================================
    // SCENARIO 2: CONSECUTIVE FRAMES WHILE MOVING TOWARD THE ARMORY
    // Walking from spawn (0, -200, -640.61) toward (6.5, -200, -643.0) with Launcher
    // 12 consecutive steps capturing frame-by-frame telemetry and images
    // =========================================================================
    console.log('\n--- Scenario 2: Moving toward the Armory (12 consecutive steps) with Launcher ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      const idx = T.WEAPON_ORDER.indexOf('launcher');
      T.setWeapon(idx);
      T.setViewFirstDbg(true);
    })()`);
    await wait(500);

    const startPos = { x: 0, y: -200, z: -640.61 };
    const endPos = { x: 6.5, y: -200, z: -643.0 };
    const walkSteps = 12;

    for (let step = 0; step < walkSteps; step++) {
      const frac = step / (walkSteps - 1);
      const curX = startPos.x + (endPos.x - startPos.x) * frac;
      const curZ = startPos.z + (endPos.z - startPos.z) * frac;
      const yaw = Math.atan2(endPos.x - startPos.x, endPos.z - startPos.z);

      await page.evaluate(`window.__ag269.setPose(${curX}, -200, ${curZ}, ${yaw})`);
      await wait(60);

      const snap = await page.evaluate(`window.__ag269.getFrameTelemetry('walk-step-${step}')`);
      telemetry.scenarios.push(snap);
      await captureShot(page, `ag269-02-walk-step-${step}.png`);
    }

    // =========================================================================
    // SCENARIO 3: CONSECUTIVE FRAMES WHILE TURNING / ROTATING IN FRONT OF ARMORY
    // Player at (4.0, -200, -641.5) midway between range and armory
    // Turning 360 degrees in 12 steps (30 degrees each)
    // =========================================================================
    console.log('\n--- Scenario 3: Turning 360 degrees in front of Armory (12 angles) ---');
    const rotSteps = 12;
    for (let i = 0; i < rotSteps; i++) {
      const yaw = (i / rotSteps) * Math.PI * 2;
      await page.evaluate(`window.__ag269.setPose(4.0, -200, -641.5, ${yaw})`);
      await wait(60);

      const deg = Math.round((i / rotSteps) * 360);
      const snap = await page.evaluate(`window.__ag269.getFrameTelemetry('rot-${deg}deg')`);
      telemetry.scenarios.push(snap);
      await captureShot(page, `ag269-03-rot-${deg}deg.png`);
    }

    // =========================================================================
    // SCENARIO 4: DIRECT AUDIT OF THE TWO WEAR:SHIRT ELBOW JOINTS
    // Specifically checking studio/marine-body.js:464 joint(uniformW, .0565)
    // Investigating visibility, scaling, world UV repeats, and vmEyeHide
    // =========================================================================
    console.log('\n--- Scenario 4: Deep audit of wear:shirt elbow joints & singleton UV scale ---');
    const jointAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const results = [];
      T.player.traverse(o => {
        if (o.isMesh && o.geometry?.type === 'SphereGeometry') {
          const mat = o.material;
          const posAttr = o.geometry.attributes.position;
          const uvAttr = o.geometry.attributes.uv;
          const parentName = o.parent?.name || '';
          const parentParentName = o.parent?.parent?.name || '';

          // Sample UV scale across an edge
          let worldEdgeLen = 0, uvDeltaLen = 0;
          if (posAttr && uvAttr && posAttr.count >= 2) {
            o.updateMatrixWorld(true);
            const V3 = o.position.constructor;
            const v1 = new V3().fromBufferAttribute(posAttr, 0).applyMatrix4(o.matrixWorld);
            const v2 = new V3().fromBufferAttribute(posAttr, 1).applyMatrix4(o.matrixWorld);
            worldEdgeLen = v1.distanceTo(v2);

            const u1 = uvAttr.getX(0), v_1 = uvAttr.getY(0);
            const u2 = uvAttr.getX(1), v_2 = uvAttr.getY(1);
            uvDeltaLen = Math.hypot(u2 - u1, v_2 - v_1);
          }

          results.push({
            name: o.name,
            uuid: o.uuid,
            visible: o.visible,
            parentName,
            parentParentName,
            vmEyeHide: !!o.userData?.vmEyeHide,
            matUuid: mat?.uuid,
            matName: mat?.name,
            matMap: !!mat?.map,
            mapUuid: mat?.map?.uuid,
            scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
            posCount: posAttr?.count || 0,
            worldEdgeLen,
            uvDeltaLen,
            repeatsPerMetre: worldEdgeLen > 0 ? (uvDeltaLen / worldEdgeLen) : 0,
          });
        }
      });
      return results;
    })()`);

    console.log('[AG-269] Sphere meshes (elbow joints) audit result:');
    console.log(JSON.stringify(jointAudit, null, 2));
    telemetry.jointAudit = jointAudit;

    // =========================================================================
    // SCENARIO 5: CLOSE-UP ON ARMORY TERMINAL / RACK & WALL CULLING AUDIT
    // Move close to Armory terminal at (7.2, -200, -643.0) facing east wall (yaw = Math.PI / 2)
    // Check if wall disappears (J90: wall fade) or if gun finishes on rack pop
    // =========================================================================
    console.log('\n--- Scenario 5: Armory terminal close-up and wall culling audit ---');
    await page.evaluate(`window.__ag269.setPose(7.2, -200, -643.0, Math.PI / 2)`);
    await wait(500);

    const wallAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const walls = [];
      const tg = T.trainingDbg.tg();
      tg.group.traverse(o => {
        if (o.isMesh && (o.name.includes('wall') || o.name.includes('floor') || o.name.includes('rack') || o.name.includes('armory'))) {
          walls.push({
            name: o.name,
            uuid: o.uuid,
            visible: o.visible,
            materialName: o.material?.name,
            opacity: o.material?.opacity,
            transparent: o.material?.transparent
          });
        }
      });
      return walls;
    })()`);
    console.log('[AG-269] Wall / Armory meshes close-up count:', wallAudit.length);
    telemetry.wallAudit = wallAudit;
    await captureShot(page, 'ag269-05-armory-terminal-close.png');

    // Save full structured telemetry
    const telemetryPath = path.join(OUT_DIR, 'telemetry.json');
    writeFileSyncWithRetry(telemetryPath, JSON.stringify(telemetry, null, 2));
    console.log(`[AG-269] Saved structured telemetry to: ${telemetryPath}`);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('[AG-269] Fatal error:', err);
  process.exit(1);
});
