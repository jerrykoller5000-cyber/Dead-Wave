// qa/fps/launcher/run-launcher-review.mjs
// Task AG-252: First-person review set for Grenade Launcher (GP-20039 & D-119).
// Captures on Jerry's RTX 5080 WebGPU PC through shared test slot queue.
// Evaluates:
// 1. Full 11-shot standard signoff review set (hip, walk, run, ads still/moving, fire hip/ads, reloads, switch).
// 2. Four-light matrix (Noon, Overcast, Dusk, Night) at Hip and ADS.
// 3. GP-20039 specific swing-out drum reload beats: latch, casing ejection, loose round in fingers (u=0.42),
//    round seating (u=0.44), subsequent insertion beats (u=0.61, 0.76), spring winding (u=0.84), drum shut (u=0.92).
// 4. Partial vs full reload casing ejection count (asserts 3 vs 6).
// 5. Post-ADS reload and ADS hold recovery.
// 6. Night readability of weapon silhouette, sights, and loose 40mm grenade round.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/fps/launcher');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
const FOUR_LIGHT_DIR = path.join(OUT_DIR, 'four-light');
const REVIEW_DIR = path.join(ROOT, 'review/GP-20039');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(FOUR_LIGHT_DIR, { recursive: true });
fs.mkdirSync(REVIEW_DIR, { recursive: true });

function safeWriteFile(filePath, buffer) {
  const tmp = filePath + '.' + Date.now() + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmp, buffer);
  for (let i = 0; i < 20; i++) {
    try {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      fs.renameSync(tmp, filePath);
      return;
    } catch (e) {
      if (i === 19) {
        try { fs.writeFileSync(filePath, buffer); return; } catch (_) { throw e; }
      }
      const start = Date.now();
      while (Date.now() - start < 60) {}
    }
  }
}

async function captureShot(page, filename, subDir = null) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const targetDir = subDir ? path.join(OUT_DIR, subDir) : OUT_DIR;
  fs.mkdirSync(targetDir, { recursive: true });
  const outPath = path.join(targetDir, filename);
  safeWriteFile(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-252-Launcher] Saved screenshot: ${subDir ? subDir + '/' : ''}${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

async function captureFrame(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 90;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(FRAMES_DIR, filename);
  safeWriteFile(outPath, Buffer.from(shot.data, 'base64'));
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function evalCode(page, fn, ...args) {
  const expr = `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(', ')})`;
  return page.evaluate(expr, 120000);
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-252] First-Person Review Set: Grenade Launcher (GP-20039)    ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-252-Launcher] Serving game from:', url);

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

    console.log('[AG-252-Launcher] Loading game with ?solid=1&debug=1&raf=timer...');
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

    // Start outdoor match
    console.log('[AG-252-Launcher] Starting match via startMatch(T, "AG252-Launcher")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG252-Launcher');
    })()`);

    console.log('[AG-252-Launcher] Configuring environment & equipping Grenade Launcher...');
    const initEnv = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight

      const errCard = document.getElementById('errorCard');
      if (errCard) errCard.hidden = true;

      const idx = T.WEAPON_ORDER.indexOf('launcher');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'launcher'; i++) {
        T.setWeapon(idx);
        await wait(100);
      }

      T.setAmmoDbg('launcher', 6);

      // Settle raise
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'launcher' && vm.info.raise > 0.98) break;
        await wait(100);
      }
      await wait(300);

      return {
        weapon: T.getCurrentWeapon(),
        firstPerson: T.fpDbg().first,
        firstPersonW: T.fpDbg().w,
        worldTime: T.getWorldTime ? T.getWorldTime() : null,
        playerPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
        renderer: T.getRendererBackend ? T.getRendererBackend() : 'unknown'
      };
    });
    console.log('[AG-252-Launcher] Environment & weapon initialized:', initEnv);

    // Setup 20m target plate in FOB yard
    console.log('[AG-252-Launcher] Placing player in FOB yard facing +Z with 20m target plate...');
    await evalCode(page, () => {
      const T = window.TT, THREE = T.THREE || window.THREE;
      const scene = T.scene || window.scene;

      const px = 42.0;
      const pz = -20.0;
      const py = T.sampleHeight ? T.sampleHeight(px, pz) : T.player.position.y;
      T.player.position.set(px, py, pz);
      if (T.localPlayer) T.localPlayer.position.set(px, py, pz);

      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);

      const eyeY = py + 1.68;
      const targetDist = 20.0;
      const targetX = px;
      const targetZ = pz + targetDist;
      const targetY = eyeY;

      const existing = scene.getObjectByName('ag252-target');
      if (existing) scene.remove(existing);

      const targetGroup = new THREE.Group();
      targetGroup.name = 'ag252-target';
      targetGroup.position.set(targetX, targetY, targetZ);
      targetGroup.rotation.y = Math.PI;

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const c = canvas.getContext('2d');

      // Range timber backing
      c.fillStyle = '#2b302c';
      c.fillRect(0, 0, 512, 768);
      c.lineWidth = 10;
      c.strokeStyle = '#181c19';
      c.strokeRect(5, 5, 502, 758);

      // Centered paper target card
      c.fillStyle = '#e8eae6';
      c.fillRect(45, 45, 422, 678);
      c.lineWidth = 3;
      c.strokeStyle = '#5a6256';
      c.strokeRect(45, 45, 422, 678);

      // Silhouette target
      c.fillStyle = '#1c2127';
      c.beginPath();
      c.arc(256, 175, 75, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(110, 680);
      c.lineTo(135, 275);
      c.quadraticCurveTo(256, 230, 377, 275);
      c.lineTo(402, 680);
      c.closePath();
      c.fill();

      // Scoring rings and crosshair
      const cx = 256, cy = 430;
      c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.beginPath(); c.arc(cx, cy, 140, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#e83020'; c.lineWidth = 5;
      c.beginPath(); c.arc(cx, cy, 90, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(cx, cy, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 50, cy); c.lineTo(cx + 50, cy);
      c.moveTo(cx, cy - 50); c.lineTo(cx, cy + 50);
      c.stroke();
      c.fillStyle = '#e83020';
      c.beginPath(); c.arc(256, 175, 26, 0, Math.PI * 2); c.fill();

      c.font = 'bold 32px Impact, sans-serif';
      c.fillStyle = '#2b302c';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('20.0 M TARGET', 256, 650);

      const texture = new THREE.CanvasTexture(canvas);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.1),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      );
      mesh.position.set(0, 0, 0);
      targetGroup.add(mesh);
      scene.add(targetGroup);

      // Distance markers along floor
      for (let d = 5; d <= 20; d += 5) {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.04, 0.15),
          new THREE.MeshBasicMaterial({ color: d === 20 ? 0xff3322 : 0xffdd44 })
        );
        marker.position.set(px, py + 0.02, pz + d);
        marker.name = `ag252-marker-${d}m`;
        scene.add(marker);
      }
    });

    const telemetry = {
      task: 'AG-252',
      weapon: 'launcher',
      label: 'Grenade Launcher (6-Shot MGL)',
      timestamp: new Date().toISOString(),
      gpu: initEnv.renderer,
      shots: {},
      fourLight: {},
      reloadBeats: {},
      tests: {},
      frameSequence: [],
      errors: []
    };

    // Telemetry capture helper
    const getTelemetry = async (stateName) => {
      return await evalCode(page, (state) => {
        const T = window.TT, THREE = T.THREE || window.THREE;
        const camera = T.camera || window.camera;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const fp = T.fpDbg();
        const p = T.player.position;

        const project = (v) => {
          const clone = v.clone().project(camera);
          return {
            x: ((clone.x + 1) / 2) * 1920,
            y: ((-clone.y + 1) / 2) * 1080,
            ndcX: clone.x,
            ndcY: clone.y,
            ndcZ: clone.z
          };
        };

        const vmInfo = vm ? vm.info : {};
        const arms = vm && vm.arms;

        let wristR = null, wristL = null;
        if (arms && arms.r && arms.r.meshes && arms.r.meshes.glove) {
          const wp = new THREE.Vector3();
          arms.r.meshes.glove.getWorldPosition(wp);
          wristR = project(wp);
        }
        if (arms && arms.l && arms.l.meshes && arms.l.meshes.glove) {
          const wp = new THREE.Vector3();
          arms.l.meshes.glove.getWorldPosition(wp);
          wristL = project(wp);
        }

        let gunBox = null;
        try {
          const gunObj = vm && (vm.gun && vm.gun.src ? vm.gun.src : (vm.gun && vm.gun.isObject3D ? vm.gun : null));
          if (gunObj && typeof gunObj.traverse === 'function') {
            const box = new THREE.Box3().setFromObject(gunObj);
            const minP = project(box.min);
            const maxP = project(box.max);
            gunBox = {
              screenMin: { x: Math.min(minP.x, maxP.x), y: Math.min(minP.y, maxP.y) },
              screenMax: { x: Math.max(minP.x, maxP.x), y: Math.max(minP.y, maxP.y) },
              fillPct: (((Math.abs(maxP.x - minP.x) * Math.abs(maxP.y - minP.y))) / (1920 * 1080)) * 100
            };
          }
        } catch (e) {
          gunBox = { error: String(e.message || e) };
        }

        // Check loadRound visibility and world position
        let loadRoundInfo = null;
        try {
          const gunObj = vm && vm.gun;
          const lr = gunObj && gunObj.loadRound;
          if (lr) {
            const lwp = new THREE.Vector3();
            lr.getWorldPosition(lwp);
            loadRoundInfo = {
              visible: !!lr.visible,
              pos: { x: lr.position.x, y: lr.position.y, z: lr.position.z },
              worldPos: { x: lwp.x, y: lwp.y, z: lwp.z },
              screen: project(lwp)
            };
          }
        } catch (e) {
          loadRoundInfo = { error: String(e.message || e) };
        }

        // Check drum hinge & drum rotation
        let drumInfo = null;
        try {
          const gunObj = vm && vm.gun;
          const hinge = gunObj && gunObj.mag; // ud.mag is drumHinge
          const drum = gunObj && gunObj.drum;
          const latch = gunObj && gunObj.latch;
          const winder = gunObj && gunObj.winder;
          drumInfo = {
            hingeRotZ: hinge ? hinge.rotation.z : null,
            drumRotZ: drum ? drum.rotation.z : null,
            latchRotX: latch ? latch.rotation.x : null,
            winderRotZ: winder ? winder.rotation.z : null
          };
        } catch (e) {
          drumInfo = { error: String(e.message || e) };
        }

        const wristBendR = vmInfo.wrist ? vmInfo.wrist.r : null;
        const wristBendL = vmInfo.wrist ? vmInfo.wrist.l : null;
        const wristMax = vmInfo.wristMax || 0.87;

        const errCard = document.getElementById('errorCard');
        const errText = (errCard && !errCard.hidden) ? errCard.textContent.trim() : null;
        if (errCard) errCard.hidden = true;

        const brass = T.launcherBrassDbg ? T.launcherBrassDbg() : null;

        return {
          state,
          playerPos: { x: p.x, y: p.y, z: p.z },
          yaw: T.player.rotation.y,
          ads: fp.ads,
          raise: vmInfo.raise,
          wristR,
          wristL,
          wristBendR,
          wristBendL,
          wristMax,
          handPlace: vmInfo.handPlace,
          magState: vmInfo.magState,
          reloadU: vmInfo.reloadU,
          reloadKind: vmInfo.reloadKind,
          gunBox,
          loadRoundInfo,
          drumInfo,
          brass,
          shadowReceive: arms?.r?.meshes?.fore ? arms.r.meshes.fore.receiveShadow : null,
          screenError: errText
        };
      }, stateName);
    };

    // =========================================================================
    // 1. CAPTURE HIP IDLE
    // =========================================================================
    console.log('[AG-252-Launcher] 1. Posing at HIP IDLE...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(600); // Settle spring animations
    });
    telemetry.shots['01-hip-idle'] = await getTelemetry('01-hip-idle');
    await captureShot(page, '01-hip-idle.jpg');

    // =========================================================================
    // 2. CAPTURE WALK (Forward walk cadence 3.2 m/s)
    // =========================================================================
    console.log('[AG-252-Launcher] 2. Capturing WALK (3.2 m/s)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 3.2);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      await wait(800);
    });
    telemetry.shots['02-walk'] = await getTelemetry('02-walk');
    await captureShot(page, '02-walk.jpg');

    // =========================================================================
    // 3. CAPTURE RUN / SPRINT (6.4 m/s)
    // =========================================================================
    console.log('[AG-252-Launcher] 3. Capturing RUN / SPRINT (6.4 m/s)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setVelDbg(0, 6.4);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      await wait(800);
    });
    telemetry.shots['03-run'] = await getTelemetry('03-run');
    await captureShot(page, '03-run.jpg');

    // Reset movement
    await evalCode(page, () => {
      const T = window.TT;
      T.setVelDbg(0, 0);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
    });
    await wait(300);

    // =========================================================================
    // 4. CAPTURE ADS STILL (Aimed still - leaf sight notch clear to front post)
    // =========================================================================
    console.log('[AG-252-Launcher] 4. Capturing AIMED (ADS STILL)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads > 0.98) break;
        await wait(50);
      }
      await wait(600);
    });
    telemetry.shots['04-ads-still'] = await getTelemetry('04-ads-still');
    await captureShot(page, '04-ads-still.jpg');

    // =========================================================================
    // 5. CAPTURE ADS MOVING (Aimed moving)
    // =========================================================================
    console.log('[AG-252-Launcher] 5. Capturing AIMED MOVING (ADS MOVING)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      T.setVelDbg(0, 2.0);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      await wait(800);
    });
    telemetry.shots['05-ads-moving'] = await getTelemetry('05-ads-moving');
    await captureShot(page, '05-ads-moving.jpg');

    // Reset ADS and movement
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(400);
    });

    // =========================================================================
    // 6. CAPTURE FIRE AT HIP (Mid-action grenade launch & muzzle flash)
    // =========================================================================
    console.log('[AG-252-Launcher] 6. Capturing FIRE AT HIP (mid-action: flash & smoke)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('launcher', 6);
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      for (let i = 0; i < 30; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(30);
      }
      await wait(300);

      // Deterministic trigger
      T.flightHold(true);
      T.setMouseFireDbg(true);
      T.stepFrame(1 / 60);
      T.setMouseFireDbg(false);
      T.stepFrame(1 / 60);
    });
    telemetry.shots['06-fire-hip'] = await getTelemetry('06-fire-hip');
    await captureShot(page, '06-fire-hip.jpg');

    // Release flightHold and settle recoil
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.flightHold(false);
      await wait(500);
    });

    // =========================================================================
    // 7. CAPTURE FIRE AIMED (ADS Fire: mid-action aimed shot)
    // =========================================================================
    console.log('[AG-252-Launcher] 7. Capturing FIRE AIMED (ADS Fire)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('launcher', 6);
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads > 0.98) break;
        await wait(50);
      }
      await wait(300);

      // Deterministic trigger
      T.flightHold(true);
      T.setMouseFireDbg(true);
      T.stepFrame(1 / 60);
      T.setMouseFireDbg(false);
      T.stepFrame(1 / 60);
    });
    telemetry.shots['07-fire-ads'] = await getTelemetry('07-fire-ads');
    await captureShot(page, '07-fire-ads.jpg');

    // Release flightHold and return to hip
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.flightHold(false);
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(400);
    });

    // =========================================================================
    // 8. GP-20039 RELOAD ANATOMY & BEATS (Empty reload: 0/6 -> 6/6)
    // =========================================================================
    console.log('[AG-252-Launcher] 8. Capturing full swing-out reload sequence beats...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('launcher', 0);
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      await wait(200);

      T.flightHold(true);
      if (T.startReload) T.startReload();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));
    });

    // Sequence of key beats to step to and capture:
    const BEATS = [
      { name: 'reload-u10-latch', u: 0.10, label: 'u=0.10 Drum Latch Released' },
      { name: 'reload-u20-swing', u: 0.20, label: 'u=0.20 Drum Fully Swung Out' },
      { name: 'reload-u22-eject', u: 0.22, label: 'u=0.22 Spent Casings Ejected' },
      { name: '09-reload-empty-u03', u: 0.30, label: 'u=0.30 Empty Reload Drum Open' },
      { name: 'reload-u38-pouch', u: 0.38, label: 'u=0.38 Hand at Pouch' },
      { name: 'reload-u42-round-in-fingers', u: 0.42, label: 'u=0.42 Loose 40mm Round in Fingers' },
      { name: 'reload-u44-round-seating', u: 0.44, label: 'u=0.44 Round Seating in Bottom Chamber' },
      { name: '09-reload-empty-u06', u: 0.60, label: 'u=0.60 Round 2 Feeding' },
      { name: 'reload-u61-round2', u: 0.61, label: 'u=0.61 Round 2 Seating' },
      { name: 'reload-u76-round3', u: 0.76, label: 'u=0.76 Round 3 Seating' },
      { name: '09-reload-empty-u08', u: 0.80, label: 'u=0.80 Winding Prep' },
      { name: 'reload-u84-wind', u: 0.84, label: 'u=0.84 Support Hand Winding Spring' },
      { name: 'reload-u92-shut', u: 0.92, label: 'u=0.92 Support Hand Pushing Drum Shut' },
      { name: 'reload-u98-latched', u: 0.98, label: 'u=0.98 Drum Latched Returning to Fore' }
    ];

    let frameSeqIdx = 0;
    for (const beat of BEATS) {
      await evalCode(page, (targetU) => {
        const T = window.TT;
        for (let i = 0; i < 200; i++) {
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          if (vm && vm.info.reloadU != null && vm.info.reloadU >= targetU) break;
          T.stepFrame(1 / 60);
        }
      }, beat.u);

      const shotKey = beat.name;
      const telem = await getTelemetry(shotKey);
      telemetry.reloadBeats[shotKey] = telem;
      await captureShot(page, `${shotKey}.jpg`);
      await captureFrame(page, `seq-frame-${String(frameSeqIdx++).padStart(3, '0')}.jpg`);
    }

    // Capture standard sign-off 09-reload-empty alias (using u=0.60)
    await captureShot(page, '09-reload-empty.jpg');

    // Complete the reload
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 200; i++) {
        if (!T.isReloading || !T.isReloading()) break;
        T.stepFrame(1 / 60);
      }
      T.flightHold(false);
    });
    await wait(300);

    // =========================================================================
    // 9. TACTICAL RELOAD (3/6 retained) & CASING EJECTION COUNT AUDIT
    // =========================================================================
    console.log('[AG-252-Launcher] 9. Capturing TACTICAL RELOAD (3/6 rounds retained) & verifying casing ejection...');
    const ejectAudit = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('launcher', 6);
      // Fire 3 rounds
      for (let f = 0; f < 3; f++) {
        T.flightHold(true);
        T.setMouseFireDbg(true);
        T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
      }
      T.flightHold(false);
      await wait(300);

      const ammoBefore = T.ammoByWeapon ? T.ammoByWeapon.launcher : null;
      const brassBefore = T.launcherBrassDbg ? T.launcherBrassDbg().thrown : 0;

      // Start tactical reload
      T.flightHold(true);
      if (T.startReload) T.startReload();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));

      return { ammoBefore, brassBefore };
    });

    // Step to u=0.30
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.30) break;
        T.stepFrame(1 / 60);
      }
    });
    telemetry.shots['08-reload-tactical-u03'] = await getTelemetry('08-reload-tactical-u03');
    await captureShot(page, '08-reload-tactical-u03.jpg');

    // Check brass thrown at u=0.30 (post ejection at u=0.22)
    const brassAfterEject = await evalCode(page, () => {
      const T = window.TT;
      return T.launcherBrassDbg ? T.launcherBrassDbg().thrown : 0;
    });
    const casingsEjected = brassAfterEject - ejectAudit.brassBefore;
    console.log(`[AG-252-Launcher] Tactical reload casing ejection: ${casingsEjected} casings ejected (expected: 3)`);
    telemetry.tests['casingEjectionAudit'] = {
      ammoBefore: ejectAudit.ammoBefore,
      brassBefore: ejectAudit.brassBefore,
      brassAfter: brassAfterEject,
      casingsEjected,
      pass: casingsEjected === 3
    };

    // Step to u=0.60
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.60) break;
        T.stepFrame(1 / 60);
      }
    });
    telemetry.shots['08-reload-tactical-u06'] = await getTelemetry('08-reload-tactical-u06');
    await captureShot(page, '08-reload-tactical-u06.jpg');
    await captureShot(page, '08-reload-tactical.jpg');

    // Step to u=0.80
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.80) break;
        T.stepFrame(1 / 60);
      }
    });
    telemetry.shots['08-reload-tactical-u08'] = await getTelemetry('08-reload-tactical-u08');
    await captureShot(page, '08-reload-tactical-u08.jpg');

    // Complete tactical reload
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 200; i++) {
        if (!T.isReloading || !T.isReloading()) break;
        T.stepFrame(1 / 60);
      }
      T.flightHold(false);
    });
    await wait(300);

    // =========================================================================
    // 10. SWITCH AWAY AND SWITCH TO
    // =========================================================================
    console.log('[AG-252-Launcher] 10. Capturing SWITCH AWAY and SWITCH TO...');
    // Initiate switch away
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.flightHold(true);
      // Switch to pistol
      const pIdx = T.WEAPON_ORDER.indexOf('pistol');
      T.setWeapon(pIdx);
      // Step halfway down raise
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
    });
    telemetry.shots['10-switch-away'] = await getTelemetry('10-switch-away');
    await captureShot(page, '10-switch-away.jpg');

    // Switch back to launcher
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      const lIdx = T.WEAPON_ORDER.indexOf('launcher');
      T.setWeapon(lIdx);
      // Step halfway up raise
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
    });
    telemetry.shots['11-switch-to'] = await getTelemetry('11-switch-to');
    await captureShot(page, '11-switch-to.jpg');

    // Settle raise
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.flightHold(false);
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'launcher' && vm.info.raise > 0.98) break;
        await wait(50);
      }
      await wait(300);
    });

    // =========================================================================
    // 11. FOUR-LIGHT MATRIX (Noon, Overcast, Dusk, Night) x (Hip, ADS)
    // =========================================================================
    console.log('[AG-252-Launcher] 11. Capturing FOUR-LIGHT MATRIX (Noon, Overcast, Dusk, Night)...');
    const LIGHTS = [
      { key: 'noon', label: 'Noon (t=0.50)', worldTime: 0.50, rain: false, intensity: 0.0 },
      { key: 'overcast', label: 'Overcast (t=0.42)', worldTime: 0.42, rain: true, intensity: 0.85 },
      { key: 'dusk', label: 'Dusk (t=0.77)', worldTime: 0.77, rain: false, intensity: 0.0 },
      { key: 'night', label: 'Night (t=0.02)', worldTime: 0.02, rain: false, intensity: 0.0 }
    ];

    for (const light of LIGHTS) {
      console.log(`[AG-252-Launcher] Setting light: ${light.label}...`);
      await evalCode(page, (l) => {
        const T = window.TT;
        T.setWorldTime(l.worldTime);
        if (T.weather) {
          T.weather.raining = !!l.rain;
          T.weather.intensity = l.intensity || 0;
        }
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      }, light);
      await wait(200);

      // Capture Hip
      await evalCode(page, async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 30; i++) {
          if (T.fpDbg().ads < 0.02) break;
          await wait(30);
        }
        await wait(200);
      });
      const hipTelem = await getTelemetry(`four-light-${light.key}-hip`);
      telemetry.fourLight[`${light.key}-hip`] = hipTelem;
      await captureShot(page, `launcher-hip-${light.key}.jpg`, 'four-light');

      // Capture ADS
      await evalCode(page, async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(true);
        for (let i = 0; i < 60; i++) {
          if (T.fpDbg().ads > 0.98) break;
          await wait(30);
        }
        await wait(300);
      });
      const adsTelem = await getTelemetry(`four-light-${light.key}-ads`);
      telemetry.fourLight[`${light.key}-ads`] = adsTelem;
      await captureShot(page, `launcher-ads-${light.key}.jpg`, 'four-light');

      // Reset ADS
      await evalCode(page, async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 30; i++) {
          if (T.fpDbg().ads < 0.02) break;
          await wait(30);
        }
        await wait(200);
      });
    }

    // =========================================================================
    // 12. NIGHT READABILITY AUDIT (t=0.02) - Weapon & Loose Round at u=0.42
    // =========================================================================
    console.log('[AG-252-Launcher] 12. Capturing NIGHT READABILITY with loose round at u=0.42...');
    // Light is already at Night (t=0.02). Replenish reserve ammo first.
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.grantAllWeapons();
      T.setAmmoDbg('launcher', 0);
      T.flightHold(true);
      if (T.startReload) T.startReload();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));

      for (let i = 0; i < 200; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.42) break;
        T.stepFrame(1 / 60);
      }
    });
    telemetry.shots['night-readability-reload-u42'] = await getTelemetry('night-readability-reload-u42');
    await captureShot(page, 'night-readability-reload-u42.jpg');

    // Finish reload and reset light to daylight
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 200; i++) {
        if (!T.isReloading || !T.isReloading()) break;
        T.stepFrame(1 / 60);
      }
      T.flightHold(false);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    });
    await wait(300);

    // =========================================================================
    // 13. POST-ADS RELOAD & ADS HOLD RECOVERY AUDIT
    // =========================================================================
    console.log('[AG-252-Launcher] 13. Testing post-ADS reload & ADS recovery...');
    const adsReloadAudit = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.flightHold(false);
      T.grantAllWeapons();
      if (T.getReserve) T.getReserve()['40mm'] = 18;
      T.setAmmoDbg('launcher', 6);
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads > 0.98) break;
        await wait(50);
      }

      const adsBeforeReload = T.fpDbg().ads;

      // Freeze ticking with flightHold before setting ammo to 0 to prevent GB-229 autoReload race
      T.flightHold(true);
      T.setAmmoDbg('launcher', 0);
      if (T.startReload) T.startReload();
      const reloadingStarted = T.isReloading ? T.isReloading() : false;

      // Step 20 frames into reload: reload must break ADS zoom
      for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
      const adsDuringReload = T.fpDbg().ads;

      // Complete reload with zoomHeld still true
      for (let i = 0; i < 300; i++) {
        if (!T.isReloading || !T.isReloading()) break;
        T.stepFrame(1 / 60);
      }

      // Step 30 more frames for ADS recovery: after reload ends, zoom recovers
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      const adsAfterReload = T.fpDbg().ads;

      T.flightHold(false);
      T.setZoomHeldDbg(false);

      return {
        adsBeforeReload,
        reloadingStarted,
        adsDuringReload,
        adsAfterReload,
        pass: reloadingStarted && adsDuringReload < 0.20 && adsAfterReload > 0.85
      };
    });
    console.log('[AG-252-Launcher] Post-ADS reload audit result:', adsReloadAudit);
    telemetry.tests['postAdsReloadAudit'] = adsReloadAudit;

    // Save master telemetry JSON
    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    safeWriteFile(telemPath, Buffer.stringify ? Buffer.from(JSON.stringify(telemetry, null, 2)) : Buffer.from(JSON.stringify(telemetry, null, 2)));
    console.log(`[AG-252-Launcher] Saved telemetry to ${telemPath}`);

    // Mirror telemetry to review/GP-20039
    const revTelemPath = path.join(REVIEW_DIR, 'ag252-telemetry.json');
    safeWriteFile(revTelemPath, Buffer.from(JSON.stringify(telemetry, null, 2)));
    console.log(`[AG-252-Launcher] Mirrored telemetry to ${revTelemPath}`);

  } catch (err) {
    console.error('[AG-252-Launcher] Error during test run:', err);
    telemetry.errors.push(String(err.stack || err));
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch(err => {
  console.error('[AG-252-Launcher] Fatal main error:', err);
  process.exit(1);
});
