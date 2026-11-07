// qa/fps/chainsaw/run-chainsaw-review.mjs
// Task AG-252: The review sets (D-119). Chainsaw review set after GB-292 landed (J1).
// Captures on Jerry's RTX 5080 WebGPU PC through shared test slot queue.
// Evaluates: hip idle, walk, run, ADS still, ADS moving, fire at hip, fire aimed,
// reload tactical/empty, switch away/to, and motion frame sequence for clip.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/fps/chainsaw');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

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
  console.log(`[AG-252-Chainsaw] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
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
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function evalCode(page, fn, ...args) {
  const expr = `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(', ')})`;
  return page.evaluate(expr, 120000);
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-252] First-Person Review Set: Chainsaw (D-119, GB-292 J1)    ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-252-Chainsaw] Serving game from:', url);

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

    console.log('[AG-252-Chainsaw] Loading game with ?solid=1&debug=1&raf=timer...');
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
    console.log('[AG-252-Chainsaw] Starting match via startMatch(T, "AG252-Chainsaw")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG252-Chainsaw');
    })()`);

    console.log('[AG-252-Chainsaw] Configuring environment & equipping Chainsaw...');
    const initEnv = await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight

      // Equip chainsaw
      const idx = T.WEAPON_ORDER.indexOf('chainsaw');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'chainsaw'; i++) {
        T.setWeapon(idx);
        await wait(100);
      }

      // Settle raise
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'chainsaw' && vm.info.raise > 0.98) break;
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
    console.log('[AG-252-Chainsaw] Environment & weapon initialized:', initEnv);

    // Setup 20m target plate in FOB yard
    console.log('[AG-252-Chainsaw] Placing player in FOB yard facing +Z with 20m target plate...');
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

      c.fillStyle = '#f5f7fa';
      c.fillRect(0, 0, 512, 768);
      c.lineWidth = 10;
      c.strokeStyle = '#2b3035';
      c.strokeRect(5, 5, 502, 758);

      c.fillStyle = '#1c2127';
      c.beginPath();
      c.arc(256, 175, 75, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(110, 740);
      c.lineTo(135, 275);
      c.quadraticCurveTo(256, 230, 377, 275);
      c.lineTo(402, 740);
      c.closePath();
      c.fill();

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

      c.font = 'bold 36px Impact, sans-serif';
      c.fillStyle = '#f5f7fa';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('20.0 M TARGET', 256, 680);

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
      weapon: 'chainsaw',
      label: 'Chainsaw',
      timestamp: new Date().toISOString(),
      gpu: initEnv.renderer,
      shots: {},
      frameSequence: []
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

        let wristR = null, wristL = null, guideTip = null, rearHandle = null;
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

        // Check gun parts
        let sawBox = null;
        try {
          const gunObj = vm && (vm.gun && vm.gun.src ? vm.gun.src : (vm.gun && vm.gun.isObject3D ? vm.gun : null));
          if (gunObj && typeof gunObj.traverse === 'function') {
            const box = new THREE.Box3().setFromObject(gunObj);
            const minP = project(box.min);
            const maxP = project(box.max);
            sawBox = {
              screenMin: { x: Math.min(minP.x, maxP.x), y: Math.min(minP.y, maxP.y) },
              screenMax: { x: Math.max(minP.x, maxP.x), y: Math.max(minP.y, maxP.y) },
              fillPct: (((Math.abs(maxP.x - minP.x) * Math.abs(maxP.y - minP.y))) / (1920 * 1080)) * 100
            };
          }
        } catch (e) {
          sawBox = { error: String(e.message || e) };
        }

        // Live contact distances
        const rToGrip = vmInfo.handPlace ? vmInfo.handPlace.rToGrip : null;
        const lToSupport = vmInfo.handPlace ? vmInfo.handPlace.lToSupport : null;

        // J1 check: right hand on rear grip, left on front hoop
        const j1Hands = {
          rightOnRearGrip: rToGrip != null && rToGrip < 0.05,
          leftOnFrontHoop: lToSupport != null && lToSupport < 0.05,
          rToGrip_m: rToGrip,
          lToSupport_m: lToSupport,
          gripBasis: vmInfo.handPlace ? vmInfo.handPlace.gripBasis : null
        };

        // Saw fuel & cut status
        const sawCut = T.sawCutDbg ? T.sawCutDbg() : null;

        return {
          state,
          playerPos: { x: p.x, y: p.y, z: p.z },
          yaw: T.player.rotation.y,
          ads: fp.ads,
          fpFov: fp.fpFov,
          raise: vmInfo.raise,
          wristR,
          wristL,
          sawBox,
          j1Hands,
          sawCut,
          fuel: T.getSawFuel ? T.getSawFuel() : null,
          shadowReceive: arms?.r?.meshes?.fore ? arms.r.meshes.fore.receiveShadow : null
        };
      }, stateName);
    };

    // =========================================================================
    // 1. CAPTURE HIP IDLE
    // =========================================================================
    console.log('[AG-252-Chainsaw] 1. Posing at HIP IDLE...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(600); // Settle spring animations
    });
    telemetry.shots['01-hip-idle'] = await getTelemetry('01-hip-idle');
    await captureShot(page, '01-hip-idle.jpg');

    // =========================================================================
    // 2. CAPTURE WALK (Simulate moving forward)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 2. Capturing WALK...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 3.2); // Walk forward speed 3.2 m/s
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      await wait(800); // Walk bob in progress
    });
    telemetry.shots['02-walk'] = await getTelemetry('02-walk');
    await captureShot(page, '02-walk.jpg');

    // =========================================================================
    // 3. CAPTURE RUN (Sprint forward)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 3. Capturing RUN (Sprint)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setVelDbg(0, 6.4); // Sprint speed 6.4 m/s
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      await wait(800); // Sprint bob in progress
    });
    telemetry.shots['03-run'] = await getTelemetry('03-run');
    await captureShot(page, '03-run.jpg');

    // Reset movement
    await evalCode(page, () => {
      const T = window.TT;
      T.setVelDbg(0, 0);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
    });
    await wait(300);

    // =========================================================================
    // 4. CAPTURE ADS STILL (Aimed still)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 4. Capturing AIMED (ADS STILL)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads > 0.98) break;
        await wait(50);
      }
      await wait(600); // Settle ADS springs
    });
    telemetry.shots['04-ads-still'] = await getTelemetry('04-ads-still');
    await captureShot(page, '04-ads-still.jpg');

    // =========================================================================
    // 5. CAPTURE ADS MOVING (Aimed moving)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 5. Capturing AIMED MOVING (ADS MOVING)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      T.setVelDbg(0, 2.0); // ADS walk speed
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      await wait(800);
    });
    telemetry.shots['05-ads-moving'] = await getTelemetry('05-ads-moving');
    await captureShot(page, '05-ads-moving.jpg');

    // Reset ADS and movement
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      T.setVelDbg(0, 0);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(400);
    });

    // =========================================================================
    // 6. CAPTURE FIRE AT HIP (Trigger held, revving/cutting)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 6. Capturing FIRE AT HIP (Trigger held)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      if (T.sawCutTick) T.sawCutTick(0.016);
      if (T.stepFireDbg) T.stepFireDbg(0.016);
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      await wait(300);
    });
    telemetry.shots['06-fire-hip'] = await getTelemetry('06-fire-hip');
    await captureShot(page, '06-fire-hip.jpg');

    await evalCode(page, () => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    });
    await wait(300);

    // =========================================================================
    // 7. CAPTURE FIRE AIMED (ADS Fire / Cut)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 7. Capturing FIRE AIMED (ADS Cut)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads > 0.98) break;
        await wait(50);
      }
      if (T.sawCutTick) T.sawCutTick(0.016);
      if (T.stepFireDbg) T.stepFireDbg(0.016);
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      await wait(300);
    });
    telemetry.shots['07-fire-ads'] = await getTelemetry('07-fire-ads');
    await captureShot(page, '07-fire-ads.jpg');

    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.02) break;
        await wait(50);
      }
      await wait(300);
    });

    // =========================================================================
    // 8. CAPTURE RELOAD (Tactical & Empty: gas tank check)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 8. Capturing RELOAD response (tactical & empty)...');
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
      await wait(100);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR' }));
      await wait(200);
    });
    telemetry.shots['08-reload-tactical'] = await getTelemetry('08-reload-tactical');
    await captureShot(page, '08-reload-tactical.jpg');

    // Empty reload check
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      // Empty saw fuel
      if (T.sawCutDbg) {
        const dbg = T.sawCutDbg();
        if (dbg) dbg.fuel = 0;
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
      await wait(200);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR' }));
      await wait(200);
    });
    telemetry.shots['09-reload-empty'] = await getTelemetry('09-reload-empty');
    await captureShot(page, '09-reload-empty.jpg');

    // Refill fuel
    await evalCode(page, () => {
      const T = window.TT;
      if (T.sawCutDbg) {
        const dbg = T.sawCutDbg();
        if (dbg) dbg.fuel = 100;
      }
    });

    // =========================================================================
    // 9. CAPTURE SWITCH AWAY (Lowering) & SWITCH TO (Raising)
    // =========================================================================
    console.log('[AG-252-Chainsaw] 9. Capturing SWITCH AWAY & SWITCH TO...');
    // Initiate switch to pistol, capture mid-lower
    await evalCode(page, async () => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf('pistol');
      T.setWeapon(idx);
    });
    await wait(120); // Mid-lower animation
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

    // Switch back to chainsaw, capture mid-raise
    await evalCode(page, async () => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf('chainsaw');
      T.setWeapon(idx);
    });
    await wait(150); // Mid-raise animation
    telemetry.shots['11-switch-to'] = await getTelemetry('11-switch-to');
    await captureShot(page, '11-switch-to.jpg');

    // Settle chainsaw fully raised
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.key === 'chainsaw' && vm.info.raise > 0.98) break;
        await wait(50);
      }
      await wait(300);
    });

    // =========================================================================
    // 10. CAPTURE CONSECUTIVE MOTION SEQUENCE FOR ANIMATED CLIP
    // =========================================================================
    console.log('[AG-252-Chainsaw] 10. Capturing 24-frame motion sequence for clip...');
    // Sequence: 6 frames walk, 6 frames run, 6 frames ads, 6 frames rev/fire
    const seqConfigs = [
      { name: 'walk', action: async () => { const T = window.TT; T.setVelDbg(0, 3.2); T.setZoomHeldDbg(false); }, frames: 6 },
      { name: 'run', action: async () => { const T = window.TT; T.setVelDbg(0, 6.4); T.setZoomHeldDbg(false); }, frames: 6 },
      { name: 'ads', action: async () => { const T = window.TT; T.setVelDbg(0, 0); T.setZoomHeldDbg(true); }, frames: 6 },
      { name: 'fire', action: async () => { const T = window.TT; T.setVelDbg(0, 0); T.setZoomHeldDbg(true); if (T.stepFireDbg) T.stepFireDbg(0.033); }, frames: 6 },
    ];

    let frameIdx = 0;
    for (const seq of seqConfigs) {
      await evalCode(page, seq.action);
      for (let f = 0; f < seq.frames; f++) {
        await wait(50);
        const fName = `seq-frame-${String(frameIdx).padStart(2, '0')}-${seq.name}-${f}.jpg`;
        await captureFrame(page, fName);
        const telem = await getTelemetry(`seq-${frameIdx}`);
        telemetry.frameSequence.push({ frameIdx, file: fName, ...telem });
        frameIdx++;
      }
    }

    // Reset everything
    await evalCode(page, () => {
      const T = window.TT;
      T.setVelDbg(0, 0);
      T.setZoomHeldDbg(false);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
    });

    // Save telemetry
    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`[AG-252-Chainsaw] Telemetry saved to: ${telemPath}`);

    console.log('\n========================================================================');
    console.log('=== [AG-252-Chainsaw] WebGPU captures complete!                      ===');
    console.log('========================================================================\n');

  } finally {
    try { await browser.close(); } catch { /* ignore */ }
    try { server.close(); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error('[AG-252-Chainsaw] FATAL ERROR:', err);
  process.exit(1);
});
