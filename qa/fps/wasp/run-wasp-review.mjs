// qa/fps/wasp/run-wasp-review.mjs
// Task AG-252: The review sets (D-119). Wasp SMG review set.
// Captures on Jerry's RTX 5080 WebGPU PC through shared test slot queue.
// Evaluates: hip idle, walk, run, ADS still, ADS moving, fire at hip (mid-action with tracer & flash),
// fire aimed (mid-action with tracer & flash), reload tactical (u=0.3, 0.6, 0.8), reload empty (u=0.3, 0.6, 0.8),
// switch away/to, and motion frame sequence for clip.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/fps/wasp');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

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

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  safeWriteFile(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-252-Wasp] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
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
  console.log('=== [AG-252] First-Person Review Set: Wasp SMG (D-119)              ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-252-Wasp] Serving game from:', url);

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

    console.log('[AG-252-Wasp] Loading game with ?solid=1&debug=1&raf=timer...');
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
    console.log('[AG-252-Wasp] Starting match via startMatch(T, "AG252-Wasp")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG252-Wasp');
    })()`);

    console.log('[AG-252-Wasp] Configuring environment & equipping Wasp SMG...');
    const initEnv = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight

      // Dismiss any lingering error card
      const errCard = document.getElementById('errorCard');
      if (errCard) errCard.hidden = true;

      // Equip Wasp (keyed as 'uzi')
      const idx = T.WEAPON_ORDER.indexOf('uzi');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'uzi'; i++) {
        T.setWeapon(idx);
        await wait(100);
      }

      // Ensure spare magazines exist
      if (T.setSpareMags) T.setSpareMags('uzi', 5);
      T.setAmmoDbg('uzi', 32);

      // Settle raise
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'uzi' && vm.info.raise > 0.98) break;
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
    console.log('[AG-252-Wasp] Environment & weapon initialized:', initEnv);

    // Setup 20m target plate in FOB yard
    console.log('[AG-252-Wasp] Placing player in FOB yard facing +Z with 20m target plate...');
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

      // Range timber backing (dark olive / charcoal)
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
      weapon: 'uzi',
      label: 'Wasp SMG',
      timestamp: new Date().toISOString(),
      gpu: initEnv.renderer,
      shots: {},
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

        const wristBendR = vmInfo.wrist ? vmInfo.wrist.r : null;
        const wristBendL = vmInfo.wrist ? vmInfo.wrist.l : null;
        const wristMax = vmInfo.wristMax || 0.87;

        const errCard = document.getElementById('errorCard');
        const errText = (errCard && !errCard.hidden) ? errCard.textContent.trim() : null;
        if (errCard) errCard.hidden = true;

        return {
          state,
          playerPos: { x: p.x, y: p.y, z: p.z },
          yaw: T.player.rotation.y,
          ads: fp.ads,
          fpFov: fp.fpFov,
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
          shadowReceive: arms?.r?.meshes?.fore ? arms.r.meshes.fore.receiveShadow : null,
          screenError: errText
        };
      }, stateName);
    };

    // =========================================================================
    // 1. CAPTURE HIP IDLE
    // =========================================================================
    console.log('[AG-252-Wasp] 1. Posing at HIP IDLE...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(600);
    });
    telemetry.shots['01-hip-idle'] = await getTelemetry('01-hip-idle');
    await captureShot(page, '01-hip-idle.jpg');

    // =========================================================================
    // 2. CAPTURE WALK (Forward walk cadence)
    // =========================================================================
    console.log('[AG-252-Wasp] 2. Capturing WALK (3.2 m/s)...');
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
    // 3. CAPTURE RUN / SPRINT (Forward sprint cadence)
    // =========================================================================
    console.log('[AG-252-Wasp] 3. Capturing RUN / SPRINT (6.4 m/s)...');
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
    // 4. CAPTURE ADS STILL (Aimed still - sight tower centered)
    // =========================================================================
    console.log('[AG-252-Wasp] 4. Capturing AIMED (ADS STILL)...');
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
    console.log('[AG-252-Wasp] 5. Capturing AIMED MOVING (ADS MOVING)...');
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
    // 6. CAPTURE FIRE AT HIP (Mid-action with muzzle flash & gold tracer)
    // =========================================================================
    console.log('[AG-252-Wasp] 6. Capturing FIRE AT HIP (mid-action: tracer & flash)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('uzi', 32);
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
      await wait(400);
    });

    // =========================================================================
    // 7. CAPTURE FIRE AIMED (ADS Fire: mid-action with tracer & flash down sight line)
    // =========================================================================
    console.log('[AG-252-Wasp] 7. Capturing FIRE AIMED (ADS Fire: mid-action tracer & flash)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setAmmoDbg('uzi', 32);
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
    // 8. CAPTURE RELOAD TACTICAL (Rounds left in mag; Claude: u=0.3, 0.6, 0.8)
    // =========================================================================
    console.log('[AG-252-Wasp] 8. Capturing RELOAD TACTICAL (rounds retained in mag)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.setSpareMags) T.setSpareMags('uzi', 4);
      T.setAmmoDbg('uzi', 10); // 10 rounds retained of 32
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      await wait(200);

      T.flightHold(true);
      if (T.startReload) T.startReload();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));
    });

    // Step until u >= 0.30
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.30) break;
      }
    });
    await captureShot(page, '08-reload-tactical-u03.jpg');

    // Step until u >= 0.60 (mid-action)
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.60) break;
      }
    });
    telemetry.shots['08-reload-tactical'] = await getTelemetry('08-reload-tactical');
    await captureShot(page, '08-reload-tactical-u06.jpg');
    await captureShot(page, '08-reload-tactical.jpg');

    // Step until u >= 0.80
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.80) break;
      }
    });
    await captureShot(page, '08-reload-tactical-u08.jpg');

    // Complete reload
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
    // 9. CAPTURE RELOAD EMPTY (0 rounds, charging pull follows)
    // =========================================================================
    console.log('[AG-252-Wasp] 9. Capturing RELOAD EMPTY (0 rounds retained)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.setSpareMags) T.setSpareMags('uzi', 4);
      T.setAmmoDbg('uzi', 0); // Empty magazine
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      await wait(200);

      T.flightHold(true);
      if (T.startReload) T.startReload();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));
    });

    // Step until u >= 0.30
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.30) break;
      }
    });
    await captureShot(page, '09-reload-empty-u03.jpg');

    // Step until u >= 0.60
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.60) break;
      }
    });
    telemetry.shots['09-reload-empty'] = await getTelemetry('09-reload-empty');
    await captureShot(page, '09-reload-empty-u06.jpg');
    await captureShot(page, '09-reload-empty.jpg');

    // Step until u >= 0.80 (charging pull / rack knob)
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 150; i++) {
        T.stepFrame(1 / 60);
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.reloadU != null && vm.info.reloadU >= 0.80) break;
      }
    });
    await captureShot(page, '09-reload-empty-u08.jpg');

    // Complete reload
    await evalCode(page, () => {
      const T = window.TT;
      for (let i = 0; i < 200; i++) {
        if (!T.isReloading || !T.isReloading()) break;
        T.stepFrame(1 / 60);
      }
      T.flightHold(false);
      T.setAmmoDbg('uzi', 32);
    });
    await wait(300);

    // =========================================================================
    // 10. CAPTURE SWITCH AWAY (Lowering) & SWITCH TO (Raising)
    // =========================================================================
    console.log('[AG-252-Wasp] 10. Capturing SWITCH AWAY & SWITCH TO...');
    await evalCode(page, async () => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf('pistol');
      T.setWeapon(idx);
    });
    await wait(120);
    telemetry.shots['10-switch-away'] = await getTelemetry('10-switch-away');
    await captureShot(page, '10-switch-away.jpg');

    // Settle pistol
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 40; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.key === 'pistol' && vm.info.raise > 0.95) break;
        await wait(50);
      }
    });

    // Switch back to Wasp, capture mid-raise
    await evalCode(page, async () => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf('uzi');
      T.setWeapon(idx);
    });
    await wait(140);
    telemetry.shots['11-switch-to'] = await getTelemetry('11-switch-to');
    await captureShot(page, '11-switch-to.jpg');

    // Settle Wasp fully raised
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.key === 'uzi' && vm.info.raise > 0.98) break;
        await wait(50);
      }
      await wait(300);
    });

    // =========================================================================
    // 11. CAPTURE CONSECUTIVE MOTION SEQUENCE (24 frames)
    // =========================================================================
    console.log('[AG-252-Wasp] 11. Capturing 24-frame motion sequence...');
    const seqConfigs = [
      {
        name: 'sprint',
        action: async () => {
          const T = window.TT;
          T.setZoomHeldDbg(false);
          T.setVelDbg(0, 6.4);
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
        },
        frames: 8
      },
      {
        name: 'walk',
        action: async () => {
          const T = window.TT;
          document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
          T.setVelDbg(0, 3.2);
        },
        frames: 6
      },
      {
        name: 'ads',
        action: async () => {
          const T = window.TT;
          T.setVelDbg(0, 0);
          document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
          T.setZoomHeldDbg(true);
        },
        frames: 5
      },
      {
        name: 'fire',
        action: async () => {
          const T = window.TT;
          T.flightHold(true);
          T.setMouseFireDbg(true);
          T.stepFrame(1 / 60);
          T.setMouseFireDbg(false);
          T.stepFrame(1 / 60);
          T.flightHold(false);
        },
        frames: 5
      }
    ];

    let frameIdx = 0;
    for (const seq of seqConfigs) {
      await evalCode(page, seq.action);
      for (let f = 0; f < seq.frames; f++) {
        await wait(50);
        const fName = `seq-frame-${String(frameIdx).padStart(2, '0')}-${seq.name}-${f}.jpg`;
        await captureFrame(page, fName);
        const telem = await getTelemetry(`seq-${frameIdx}-${seq.name}`);
        telemetry.frameSequence.push({ frameIdx, file: fName, ...telem });
        frameIdx++;
      }
    }

    // Reset everything
    await evalCode(page, () => {
      const T = window.TT;
      T.setVelDbg(0, 0);
      T.setZoomHeldDbg(false);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', bubbles: true }));
    });

    telemetry.errors = page.errors || [];

    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    safeWriteFile(telemPath, Buffer.from(JSON.stringify(telemetry, null, 2), 'utf8'));
    console.log(`[AG-252-Wasp] Telemetry saved to: ${telemPath}`);

    console.log('\n========================================================================');
    console.log('=== [AG-252-Wasp] WebGPU captures complete!                          ===');
    console.log('========================================================================\n');

  } finally {
    try {
      await browser.close();
    } catch {}
    try {
      server.close();
    } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-252-Wasp] Fatal error:', err);
  process.exit(1);
});
