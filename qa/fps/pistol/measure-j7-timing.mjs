// qa/fps/pistol/measure-j7-timing.mjs
// Task AG-252: J7 ADS Entry Timing Evidence for ChatGPT sign-off.
// Measures ADS weight, sight offset, FOV, and screen alignment at 0, 50, 100, 150, and 200 ms.
// Run through the shared slot:
//   node crew/crew.mjs slot run antigravity AG-252 --checks "Pistol J7 timing measurement" -- node qa/fps/pistol/measure-j7-timing.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/fps/pistol');
const TIMING_DIR = path.join(OUT_DIR, 'timing');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TIMING_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(TIMING_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-252-Timing] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function evalCode(page, fn, ...args) {
  const expr = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(', ')})`;
  return page.evaluate(expr, 120000);
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-252] Pistol J7 ADS Entry Timing Evidence (0-200ms)          ===');
  console.log('=== Real WebGPU Hardware (RTX 5080)                                  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-252-Timing] Serving game from:', url);

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

    console.log('[AG-252-Timing] Loading game with ?solid=1&debug=1&raf=timer...');
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
    console.log('[AG-252-Timing] Starting match via startMatch(T, "AG252-Pistol-Timing")...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG252-Pistol-Timing');
    })()`);

    console.log('[AG-252-Timing] Configuring environment & equipping Pistol...');
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

      // Equip pistol
      const idx = T.WEAPON_ORDER.indexOf('pistol');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'pistol'; i++) {
        T.setWeapon(idx);
        await wait(100);
      }

      // Settle raise
      for (let i = 0; i < 60; i++) {
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        if (vm && vm.info.active && vm.info.key === 'pistol' && vm.info.raise > 0.98) break;
        await wait(100);
      }
      await wait(300);

      return {
        weapon: T.getCurrentWeapon(),
        firstPerson: T.fpDbg().first,
        firstPersonW: T.fpDbg().w,
        renderer: T.getRendererBackend ? T.getRendererBackend() : 'unknown'
      };
    });
    console.log('[AG-252-Timing] Environment initialized:', initEnv);

    // Setup target plate
    console.log('[AG-252-Timing] Placing target plate in FOB yard at 20.0m...');
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
    });

    // Helper to get detailed sight & viewmodel telemetry
    const getDetailedSightState = async () => {
      return await evalCode(page, () => {
        const T = window.TT, THREE = T.THREE || window.THREE;
        const camera = T.camera || window.camera;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const fp = T.fpDbg();

        const project = (v) => {
          const clone = v.clone().project(camera);
          return {
            screenX: ((clone.x + 1) / 2) * 1920,
            screenY: ((-clone.y + 1) / 2) * 1080,
            ndcX: clone.x,
            ndcY: clone.y
          };
        };

        let sightScreen = null, sightNdc = null, sightWorld = null;
        if (fp.sight && fp.sight.pos) {
          sightWorld = { x: fp.sight.pos.x, y: fp.sight.pos.y, z: fp.sight.pos.z };
          const proj = project(fp.sight.pos);
          sightScreen = { x: proj.screenX, y: proj.screenY };
          sightNdc = { x: proj.ndcX, y: proj.ndcY };
        }

        // Viewmodel gun position and wrist
        let vmGunPos = null;
        if (vm && vm.gun && vm.gun.position) {
          vmGunPos = { x: vm.gun.position.x, y: vm.gun.position.y, z: vm.gun.position.z };
        }

        const vmInfo = vm ? vm.info : {};

        return {
          adsWeight: fp.ads,
          vmAds: vmInfo.ads,
          cameraFov: camera.fov,
          sightWorld,
          sightScreen,
          sightNdc,
          vmGunPos,
          wristBendR: vmInfo.wrist ? vmInfo.wrist.r : null,
          wristBendL: vmInfo.wrist ? vmInfo.wrist.l : null,
          screenError: (document.getElementById('errorCard')?.hidden === false)
            ? document.getElementById('errorCard').textContent.trim()
            : null
        };
      });
    };

    // =========================================================================
    // PART A: LIVE DYNAMIC SAMPLING (wall-clock continuous during raf=timer)
    // =========================================================================
    console.log('[AG-252-Timing] Part A: Recording live continuous transition...');
    const dynamicSeries = await evalCode(page, async () => {
      const T = window.TT, camera = T.camera || window.camera;
      const wait = ms => new Promise(r => setTimeout(r, ms));

      // Settle at hip idle
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.001) break;
        await wait(50);
      }
      await wait(500);

      const records = [];
      const t0 = performance.now();
      T.setZoomHeldDbg(true);

      while (performance.now() - t0 < 320) {
        const now = performance.now();
        const elapsedMs = Math.round((now - t0) * 10) / 10;
        const fp = T.fpDbg();
        const vm = T.viewmodelDbg ? T.viewmodelDbg() : null;

        let sightScreen = null, sightNdc = null;
        if (fp.sight && fp.sight.pos) {
          const p = fp.sight.pos.clone().project(camera);
          sightNdc = { x: p.x, y: p.y };
          sightScreen = {
            x: ((p.x + 1) / 2) * 1920,
            y: ((-p.y + 1) / 2) * 1080
          };
        }

        let vmGunPos = null;
        if (vm && vm.gun && vm.gun.position) {
          vmGunPos = { x: vm.gun.position.x, y: vm.gun.position.y, z: vm.gun.position.z };
        }

        records.push({
          elapsedMs,
          adsWeight: Math.round(fp.ads * 10000) / 10000,
          vmAds: vm && vm.info ? Math.round(vm.info.ads * 10000) / 10000 : null,
          cameraFov: Math.round(camera.fov * 100) / 100,
          sightScreen,
          sightNdc,
          vmGunPos,
          offsetFromCenterPx: sightScreen
            ? Math.round(Math.hypot(sightScreen.x - 960, sightScreen.y - 540) * 10) / 10
            : null
        });

        await wait(12);
      }

      // Reset
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.001) break;
        await wait(50);
      }
      await wait(300);

      return records;
    });
    console.log(`[AG-252-Timing] Live dynamic sampling recorded ${dynamicSeries.length} points.`);

    // =========================================================================
    // PART B: DETERMINISTIC MILESTONE CAPTURE (0, 50, 100, 150, 200, 250 ms)
    // Step frames via flightHold(true) & stepFrame(dt) for exact timestamp shots
    // =========================================================================
    console.log('[AG-252-Timing] Part B: Deterministic milestone captures with screenshots...');

    // Settle hip idle and enable flightHold
    await evalCode(page, async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 60; i++) {
        if (T.fpDbg().ads < 0.001) break;
        await wait(50);
      }
      await wait(500);
      T.flightHold(true);
    });

    const milestones = [
      { targetMs: 0,   stepDelta: 0.000, label: '000ms-hip-baseline' },
      { targetMs: 50,  stepDelta: 0.050, label: '050ms-quarter-ads' },
      { targetMs: 100, stepDelta: 0.050, label: '100ms-halfway-ads' },
      { targetMs: 150, stepDelta: 0.050, label: '150ms-three-quarter-ads' },
      { targetMs: 200, stepDelta: 0.050, label: '200ms-full-ads-reached' },
      { targetMs: 250, stepDelta: 0.050, label: '250ms-settled-ads' }
    ];

    const milestoneResults = [];

    // Milestone 0: At instant zoomHeld is toggled true, before frame step
    await evalCode(page, () => {
      const T = window.TT;
      T.setZoomHeldDbg(true);
    });

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (m.stepDelta > 0) {
        // Step frame by stepDelta (e.g. 0.050s = 50ms)
        await evalCode(page, (dt) => {
          const T = window.TT;
          T.stepFrame(dt);
        }, m.stepDelta);
      }

      const state = await getDetailedSightState();
      const shotName = `pistol-j7-timing-${m.label}.jpg`;
      await captureShot(page, shotName);

      // Compute sight offset in pixels from 1920x1080 center (960, 540)
      let offsetPx = null;
      if (state.sightScreen) {
        offsetPx = Math.round(Math.hypot(state.sightScreen.x - 960, state.sightScreen.y - 540) * 10) / 10;
      }

      const row = {
        targetMs: m.targetMs,
        label: m.label,
        screenshot: shotName,
        adsWeight: Math.round(state.adsWeight * 10000) / 10000,
        vmAds: state.vmAds != null ? Math.round(state.vmAds * 10000) / 10000 : null,
        cameraFov: Math.round(state.cameraFov * 100) / 100,
        sightScreen: state.sightScreen,
        sightNdc: state.sightNdc,
        offsetFromCenterPx: offsetPx,
        vmGunPos: state.vmGunPos,
        wristBendR: state.wristBendR,
        wristBendL: state.wristBendL
      };

      console.log(`[AG-252-Timing] Milestone ${m.targetMs}ms: adsWeight=${row.adsWeight}, fov=${row.cameraFov}°, offsetPx=${row.offsetFromCenterPx}px`);
      milestoneResults.push(row);
    }

    // Release flightHold and reset zoom
    await evalCode(page, () => {
      const T = window.TT;
      T.setZoomHeldDbg(false);
      T.flightHold(false);
    });

    // =========================================================================
    // UPDATE TELEMETRY.JSON
    // =========================================================================
    const telemPath = path.join(OUT_DIR, 'telemetry.json');
    let existingTelem = {};
    if (fs.existsSync(telemPath)) {
      try {
        existingTelem = JSON.parse(fs.readFileSync(telemPath, 'utf8'));
      } catch (e) {
        console.warn('[AG-252-Timing] Could not parse existing telemetry:', e);
      }
    }

    existingTelem.j7AdsTiming = {
      evaluatedAt: new Date().toISOString(),
      weapon: 'pistol',
      specAdsTimeSec: 0.20,
      specAdsTimeMs: 200,
      rule: 'CL-305 (J7): FP_ADS_TIME.pistol = 0.20s linear ads progression into sights',
      milestones: milestoneResults,
      dynamicTrace: dynamicSeries
    };

    fs.writeFileSync(telemPath, JSON.stringify(existingTelem, null, 2), 'utf8');
    console.log(`[AG-252-Timing] Updated telemetry with j7AdsTiming: ${telemPath}`);

    // Also write dedicated timing JSON
    const timingJsonPath = path.join(OUT_DIR, 'j7-timing-evidence.json');
    fs.writeFileSync(timingJsonPath, JSON.stringify(existingTelem.j7AdsTiming, null, 2), 'utf8');
    console.log(`[AG-252-Timing] Saved standalone timing evidence: ${timingJsonPath}`);

    console.log('\n========================================================================');
    console.log('=== [AG-252-Timing] Measurement completed successfully!             ===');
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
  console.error('[AG-252-Timing] Fatal error:', err);
  process.exit(1);
});
