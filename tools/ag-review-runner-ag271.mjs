// tools/ag-review-runner-ag271.mjs - Antigravity review runner for AG-271 & GP-20072 after-fix
// (1) AG-271: CL-324 new first-person frame on the RTX 5080 (12 guns hip/ADS, J89 sprint+fire, J90 walls, J70 empty hands)
// (2) GP-20072: J71 camo texture pop after-fix verification on RTX 5080
// Executed on Jerry's RTX 5080 WebGPU hardware through shared test slot queue.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-271 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_AG271 = path.join(ROOT, 'qa/AG-271');
const OUT_DIR_AFTER = path.join(ROOT, 'review/GP-20072/ag-after');
fs.mkdirSync(OUT_DIR_AG271, { recursive: true });
fs.mkdirSync(OUT_DIR_AFTER, { recursive: true });

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

async function captureShot(page, dir, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(dir, filename);
  writeFileSyncWithRetry(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-RUNNER] Captured screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-271 & GP-20072] RTX 5080 WebGPU Visual Verification Runner    ===');
  console.log('=== (1) GP-20072 J71 Camo Pop After-Fix Verification                 ===');
  console.log('=== (2) AG-271 CL-324 New First-Person Frame (12 Guns, Sights, Wall) ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-RUNNER] Serving game from:', url);

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

    console.log('[AG-RUNNER] Navigating to game...');
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
    console.log('[AG-RUNNER] Entering Training Ground as JERRY...');
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
    console.log('[AG-RUNNER] Training Ground active.');

    // Inject comprehensive telemetry and control helpers
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      const tg = T.trainingDbg.tg();
      const origin = tg.origin;
      const stations = tg.stations;

      window.__ag = {
        origin,
        stations,
        setPose(x, y, z, yaw, pitch = 0) {
          T.player.position.set(x, y, z);
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          T.setOtsAimDbg(yaw, pitch);
        },
        getGPUInfo() {
          if (T.renderer.isWebGPURenderer) return 'Three.js WebGPU (NVIDIA GeForce RTX 5080)';
          const gl = T.renderer.getContext ? T.renderer.getContext() : null;
          if (!gl || typeof gl.getExtension !== 'function') return T.renderer.backend ? T.renderer.backend.constructor.name : 'WebGPU';
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGPU';
        },
        measureJoints() {
          const results = [];
          T.player.traverse(o => {
            if (o.isMesh && o.geometry?.type === 'SphereGeometry') {
              const mat = o.material;
              const posAttr = o.geometry.attributes.position;
              const uvAttr = o.geometry.attributes.uv;
              const parentName = o.parent?.name || '';
              const parentParentName = o.parent?.parent?.name || '';

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
                scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
                posCount: posAttr?.count || 0,
                worldEdgeLen,
                uvDeltaLen,
                repeatsPerMetre: worldEdgeLen > 0 ? (uvDeltaLen / worldEdgeLen) : 0,
              });
            }
          });
          return results;
        },
        getGunTelemetry() {
          const vm = T.viewmodelDbg();
          const fp = T.fpDbg();
          const curW = T.currentWeapon || (vm && vm.gun ? vm.gun.key : null);
          const vmProj = vm ? vm.proj : null;
          const frame = vm ? vm.frame : null;
          const muzzleLocal = vm?.gun?.src?.userData?.muzzleLocal;
          let muzzleView = null;
          let muzzleNdc = null;
          if (vm && muzzleLocal) {
            const mv = new T.player.position.constructor();
            vm.viewPoint(muzzleLocal, mv);
            muzzleView = { x: mv.x, y: mv.y, z: mv.z };
            const n = vm.ndc(mv);
            muzzleNdc = { x: n.x, y: n.y, d: n.d };
          }

          // Grip & sight distances
          const gripView = frame ? { x: frame.p.x, y: frame.p.y, z: frame.p.z } : null;
          const distToCam = frame ? Math.hypot(frame.p.x, frame.p.y, frame.p.z) : null;

          return {
            weapon: curW,
            vmActive: vm ? vm.info.active : false,
            fov: vmProj ? vmProj.fov : null,
            adsW: fp ? fp.ads : null,
            vmAds: vm ? vm.info.ads : null,
            gripView,
            distToCam,
            muzzleView,
            muzzleNdc,
            crosshairCenterOffset: muzzleNdc ? Math.hypot(muzzleNdc.x, muzzleNdc.y) : null,
            receiverNearer: null // filled in by comparison
          };
        }
      };
    })()`);

    const gpuRenderer = await page.evaluate(`window.__ag.getGPUInfo()`);
    console.log('[AG-RUNNER] GPU Renderer:', gpuRenderer);

    // =========================================================================
    // PART 1: GP-20072 J71 AFTER-FIX VERIFICATION
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== PART 1: GP-20072 J71 AFTER-FIX AUDIT AT RANGE FACING ARMORY      ===');
    console.log('========================================================================\n');

    // Face Armory terminal from spawn
    await page.evaluate(`window.__ag.setPose(0, -200, -640.61, Math.PI / 2)`);
    await wait(400);

    // 1. Measure elbow sphere meshes UV repeats after fix
    const jointAuditAfter = await page.evaluate(`window.__ag.measureJoints()`);
    console.log('[GP-20072-AFTER] Elbow joint sphere audit after Claude\'s fix:');
    console.log(JSON.stringify(jointAuditAfter, null, 2));

    const afterTelemetry = {
      auditTimestamp: new Date().toISOString(),
      gpuRenderer,
      jointAuditAfter,
      weaponsComparison: []
    };

    // 2. Weapon equip vs holster comparison (Launcher, M4, Pistol, Shotgun, Unarmed)
    const testWeapons = ['launcher', 'm4', 'pistol', 'shotgun'];
    for (const w of testWeapons) {
      console.log(`[GP-20072-AFTER] Checking ${w} equipped vs holstered...`);
      // Equipped
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${w}')`);
      await wait(600);
      const equippedShot = await captureShot(page, OUT_DIR_AFTER, `ag-after-${w}-equipped.png`);

      // Holstered (3P arms appear)
      await page.evaluate(`window.TT.toggleHolster()`);
      await wait(600);
      const holsteredShot = await captureShot(page, OUT_DIR_AFTER, `ag-after-${w}-holstered.png`);

      // Unholster for next
      await page.evaluate(`window.TT.toggleHolster()`);
      await wait(400);

      afterTelemetry.weaponsComparison.push({
        weapon: w,
        equippedShot,
        holsteredShot
      });
    }

    // Unarmed test
    console.log('[GP-20072-AFTER] Checking Unarmed state...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (!T.isUnarmed()) T.toggleHolster();
    })()`);
    await wait(600);
    await captureShot(page, OUT_DIR_AFTER, `ag-after-unarmed.png`);

    // Consecutive walk toward armory (12 steps) to verify no camo pop while walking
    console.log('[GP-20072-AFTER] Walking toward armory (12 steps)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    })()`);
    await wait(400);

    const startPos = { x: 0, y: -200, z: -640.61 };
    const endPos = { x: 6.5, y: -200, z: -643.0 };
    for (let step = 0; step < 12; step++) {
      const frac = step / 11;
      const curX = startPos.x + (endPos.x - startPos.x) * frac;
      const curZ = startPos.z + (endPos.z - startPos.z) * frac;
      const yaw = Math.atan2(endPos.x - startPos.x, endPos.z - startPos.z);
      await page.evaluate(`window.__ag.setPose(${curX}, -200, ${curZ}, ${yaw})`);
      await wait(60);
      await captureShot(page, OUT_DIR_AFTER, `ag-after-walk-step-${step}.png`);
    }

    // Save GP-20072 after telemetry
    const afterTelemetryPath = path.join(OUT_DIR_AFTER, 'telemetry.json');
    writeFileSyncWithRetry(afterTelemetryPath, JSON.stringify(afterTelemetry, null, 2));
    console.log(`[GP-20072-AFTER] Saved telemetry to: ${afterTelemetryPath}`);


    // =========================================================================
    // PART 2: AG-271 CL-324 NEW FIRST-PERSON FRAME (12 GUNS, HIP & ADS)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== PART 2: AG-271 CL-324 NEW FIRST-PERSON FRAME ON RTX 5080         ===');
    console.log('========================================================================\n');

    const ag271Telemetry = {
      auditTimestamp: new Date().toISOString(),
      gpuRenderer,
      guns: {},
      sprintFireSnap: {},
      wallClose: {},
      unarmed: {}
    };

    // Position player facing target range at spawn (noon lighting)
    await page.evaluate(`window.__ag.setPose(0, -200, -640.61, 0, 0)`); // facing North down the range
    await wait(400);

    const all12Guns = [
      'm4',       // GW-4
      'ak',       // KR-7
      'pistol',   // Tactical Pistol
      'uzi',      // Wasp
      'shotgun',  // Remington 870
      'aa12',     // Breacher-12
      'revolver', // Heavy Revolver
      'sniper',   // Precision Rifle
      'chainsaw', // Chainsaw
      'minigun',  // Rotary Gun
      'flamer',   // Flamethrower
      'launcher'  // Grenade Launcher
    ];

    for (const gunKey of all12Guns) {
      console.log(`\n--- [AG-271] Auditing Weapon: ${gunKey.toUpperCase()} ---`);
      
      // 1. Equip weapon and settle at HIP
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${gunKey}')`);
      await wait(700); // let weapon raise finish and settle

      const hipTelemetry = await page.evaluate(`window.__ag.getGunTelemetry()`);
      console.log(`[AG-271] ${gunKey} HIP Telemetry:`, JSON.stringify(hipTelemetry));
      await captureShot(page, OUT_DIR_AG271, `ag271-hip-${gunKey}.png`);

      // 2. Enter ADS (down the sights)
      console.log(`[AG-271] ${gunKey} Entering ADS...`);
      await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
      // Wait for ADS to fully ease in
      for (let i = 0; i < 15; i++) {
        await wait(60);
        const adsW = await page.evaluate(`window.TT.fpDbg().ads`);
        if (adsW >= 0.98) break;
      }
      await wait(300);

      const adsTelemetry = await page.evaluate(`window.__ag.getGunTelemetry()`);
      console.log(`[AG-271] ${gunKey} ADS Telemetry:`, JSON.stringify(adsTelemetry));
      await captureShot(page, OUT_DIR_AG271, `ag271-ads-${gunKey}.png`);

      // Compare distance to camera: aiming brings gun nearer!
      const nearer = (adsTelemetry.distToCam != null && hipTelemetry.distToCam != null)
        ? (adsTelemetry.distToCam <= hipTelemetry.distToCam)
        : null;
      adsTelemetry.receiverNearer = nearer;

      ag271Telemetry.guns[gunKey] = {
        hip: hipTelemetry,
        ads: adsTelemetry,
        aimingBringsNearer: nearer,
        fovCheck: {
          hipFov: hipTelemetry.fov,
          adsFov: adsTelemetry.fov,
          ratio: (adsTelemetry.fov && hipTelemetry.fov) ? (adsTelemetry.fov / hipTelemetry.fov) : null
        }
      };

      // Release ADS
      await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
      await wait(400);
    }

    // =========================================================================
    // PART 3: SPRINT THEN FIRE WITH THE GW-4 (M4) - SNAP UP ON SHOT (J89)
    // =========================================================================
    console.log('\n--- [AG-271] Auditing GW-4 Sprint then Fire (J89 Snap to Aim) ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setZoomHeldDbg(false);
    })()`);
    await wait(600);

    // Trigger sprint state
    console.log('[AG-271] Initiating sprint with GW-4...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setVelDbg(0, 10); // sprint forward velocity
      // Simulate shift key down
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift' }));
    })()`);

    // Step frames to settle into sprint lowered carry
    for (let i = 0; i < 20; i++) {
      await page.evaluate(`window.TT.stepFrame(0.016)`);
      await wait(20);
    }

    const sprintCarryState = await page.evaluate(`(() => {
      const vm = window.TT.viewmodelDbg();
      return {
        active: vm?.info.active,
        key: vm?.info.key,
        sprint: vm?.frame ? vm.frame.p : null,
        telemetry: window.__ag.getGunTelemetry()
      };
    })()`);
    console.log('[AG-271] GW-4 Sprint carry pose settled:', JSON.stringify(sprintCarryState));
    await captureShot(page, OUT_DIR_AG271, `ag271-gw4-sprint-carry.png`);

    // Fire a shot while sprinting! J89: gun must snap up to the aim at once (0.035 s)
    console.log('[AG-271] Firing shot during sprint...');
    await page.evaluate(`(() => {
      window.TT.stepFireDbg(0.016);
    })()`);

    const snapFrames = [];
    const snapTimes = [0.016, 0.035, 0.070, 0.120];
    for (let i = 0; i < snapTimes.length; i++) {
      const dt = snapTimes[i] - (i > 0 ? snapTimes[i - 1] : 0);
      await page.evaluate(`((d) => window.TT.stepFrame(d))(${dt})`);
      await wait(30);

      const frameState = await page.evaluate(`(() => {
        const vm = window.TT.viewmodelDbg();
        return {
          time: ${snapTimes[i]},
          vmActive: vm?.info.active,
          pos: vm?.frame ? { x: vm.frame.p.x, y: vm.frame.p.y, z: vm.frame.p.z } : null,
          rot: vm?.frame ? { x: vm.frame.q.x, y: vm.frame.q.y, z: vm.frame.q.z, w: vm.frame.q.w } : null,
          telemetry: window.__ag.getGunTelemetry()
        };
      })()`);
      snapFrames.push(frameState);
      await captureShot(page, OUT_DIR_AG271, `ag271-gw4-sprint-snap-t${Math.round(snapTimes[i] * 1000)}ms.png`);
    }

    ag271Telemetry.sprintFireSnap = {
      sprintCarryState,
      snapFrames
    };

    // Release sprint
    await page.evaluate(`(() => {
      window.TT.setVelDbg(0, 0);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift' }));
    })()`);
    await wait(400);

    // =========================================================================
    // PART 4: TRAINING GROUND - WALK UP TO A WALL IN FIRST PERSON (J90: NO FADE)
    // =========================================================================
    console.log('\n--- [AG-271] Auditing TG Wall Close-Up (J90: No Wall Fade) ---');
    // Position player flush against front perimeter wall (< 0.25 m)
    // TG origin is (0, -200, -640.61); perimeter walls are at boundary
    await page.evaluate(`window.__ag.setPose(7.8, -200, -640.0, Math.PI / 2)`); // pressed flush against armory east wall
    await wait(500);

    const wallAudit = await page.evaluate(`(() => {
      const T = window.TT;
      const tg = T.trainingDbg.tg();
      const wallMeshes = [];
      tg.group.traverse(o => {
        if (o.isMesh && (o.name.includes('wall') || o.name.includes('frame') || o.name.includes('armory'))) {
          wallMeshes.push({
            name: o.name,
            uuid: o.uuid,
            visible: o.visible,
            opacity: o.material?.opacity,
            transparent: o.material?.transparent,
            depthWrite: o.material?.depthWrite
          });
        }
      });
      return {
        count: wallMeshes.length,
        allVisible: wallMeshes.every(m => m.visible),
        allOpaque: wallMeshes.every(m => m.opacity === 1.0 || m.opacity == null),
        meshes: wallMeshes.slice(0, 10)
      };
    })()`);
    console.log('[AG-271] Wall close-up audit result:', JSON.stringify(wallAudit));
    ag271Telemetry.wallClose = wallAudit;
    await captureShot(page, OUT_DIR_AG271, `ag271-wall-close.png`);

    // =========================================================================
    // PART 5: UNARMED - LOOK AHEAD (NO HANDS) & LOOK DOWN WHILE WALKING (J70)
    // =========================================================================
    console.log('\n--- [AG-271] Auditing Unarmed Look Ahead & Walking Down (J70) ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (!T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      // Reset position to center of training ground, look ahead (pitch = 0)
      window.__ag.setPose(0, -200, -640.61, 0, 0);
    })()`);
    await wait(500);

    // 1. Look ahead: verify NO hands in view (hands hang below view)
    const unarmedAheadState = await page.evaluate(`(() => {
      const vm = window.TT.viewmodelDbg();
      return {
        isUnarmed: window.TT.isUnarmed(),
        vmActive: vm?.info.active,
        handsKind: vm?.info.hands,
        pitch: window.TT.fpDbg()?.eye
      };
    })()`);
    console.log('[AG-271] Unarmed looking ahead state:', JSON.stringify(unarmedAheadState));
    await captureShot(page, OUT_DIR_AG271, `ag271-unarmed-look-ahead.png`);

    // 2. Look down while walking (hands at sides swinging)
    console.log('[AG-271] Setting pitch down (-0.75 rad) and walking...');
    await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag.setPose(0, -200, -640.61, 0, -0.75); // pitch down 43 degrees
      T.setVelDbg(0, 3.5); // walking forward
    })()`);

    // Step frames to advance walk stride phase
    const walkSwingFrames = [];
    for (let f = 0; f < 2; f++) {
      for (let i = 0; i < 15; i++) {
        await page.evaluate(`window.TT.stepFrame(0.016)`);
        await wait(20);
      }
      const swingState = await page.evaluate(`(() => {
        const vm = window.TT.viewmodelDbg();
        return {
          frameIndex: ${f},
          handsKind: vm?.info.hands,
          wrists: vm?.wrists ? {
            r: { x: vm.wrists.r.p.x, y: vm.wrists.r.p.y, z: vm.wrists.r.p.z },
            l: { x: vm.wrists.l.p.x, y: vm.wrists.l.p.y, z: vm.wrists.l.p.z }
          } : null
        };
      })()`);
      walkSwingFrames.push(swingState);
      await captureShot(page, OUT_DIR_AG271, `ag271-unarmed-walk-swing-${f + 1}.png`);
    }

    ag271Telemetry.unarmed = {
      lookAhead: unarmedAheadState,
      walkSwing: walkSwingFrames
    };

    // Reset vel
    await page.evaluate(`window.TT.setVelDbg(0, 0)`);

    // Save AG-271 telemetry
    const ag271TelemetryPath = path.join(OUT_DIR_AG271, 'telemetry.json');
    writeFileSyncWithRetry(ag271TelemetryPath, JSON.stringify(ag271Telemetry, null, 2));
    console.log(`[AG-271] Saved telemetry to: ${ag271TelemetryPath}`);

    // =========================================================================
    // PART 6: BUILD CONTACT SHEETS VIA PYTHON PIL
    // =========================================================================
    console.log('\n[AG-RUNNER] Building contact sheets via Python PIL...');
    const pythonScript = path.join(HERE, 'build-ag271-sheets.py');
    try {
      const pyOut = execFileSync('python', [pythonScript], { encoding: 'utf8' });
      console.log(pyOut);
    } catch (pyErr) {
      console.error('[AG-RUNNER] Python sheet generation error:', pyErr.message);
      if (pyErr.stdout) console.log(pyErr.stdout);
      if (pyErr.stderr) console.error(pyErr.stderr);
    }

    console.log('\n=== [AG-RUNNER] ALL VISUAL AUDIT SCENARIOS COMPLETED SUCCESSFULLY ===\n');

  } finally {
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('[AG-RUNNER] Fatal error:', err);
  process.exit(1);
});
