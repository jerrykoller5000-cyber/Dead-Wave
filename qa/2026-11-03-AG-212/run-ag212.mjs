// AG-212: GP-20017 Flamer Stream Nozzle Verification
// Independent WebGPU Verification on RTX 5080 under the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-03-AG-212');
const FRAMES_1P_DIR = path.join(OUT_DIR, 'frames-1p');
const FRAMES_3P_DIR = path.join(OUT_DIR, 'frames-3p');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_1P_DIR, { recursive: true });
fs.mkdirSync(FRAMES_3P_DIR, { recursive: true });

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'png', captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-212] GP-20017 Flamer Stream Nozzle Verification ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-212] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-212] Loading page...');
  await page.goto(url, { timeout: 180000 });

  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
    throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
  }

  // Dismiss intro/cutscene
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  // Load test harness helpers
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match & setup player
  console.log('[AG-212] Booting match and equipping flamer...');
  await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'AG212');
    T.clearZombies && T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();

    // Position player on Woods Trail seat
    T.player.position.set(0.48, -3.17, 13.91);
    T.player.rotation.y = 1.05;
    T.setAimYawDbg(1.05);
    T.setOtsAimDbg(1.05, 0.0);
    T.setVelDbg(0, 0);

    // Equip flamer
    const fIdx = T.WEAPON_ORDER.indexOf('flamer');
    T.setWeapon(fIdx);
    T.setAmmoDbg('flamer', 9999);

    // Initialise canvas recorder
    window.__ag212 = {
      canvas: null,
      ctx: null,
      initCanvas(w, h) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      },
      captureFrame(w = 640, h = 360) {
        if (!this.canvas || this.canvas.width !== w || this.canvas.height !== h) this.initCanvas(w, h);
        try {
          this.ctx.drawImage(T.renderer.domElement, 0, 0, w, h);
          return this.canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
        } catch(e) {
          return null;
        }
      },
      sampleState() {
        const T = window.TT;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const gun = T.weaponMeshes.flamer;
        gun.updateMatrixWorld(true);

        const bodyMuzzle = gun.localToWorld(gun.userData.muzzleLocal.clone());
        let viewMuzzle = null;
        let vmShowing = false;
        let vmActive = false;
        let vmRaise = 0;
        let vmKey = null;

        if (vm) {
          vmActive = !!vm.info.active;
          vmKey = vm.info.key;
          vmRaise = vm.info.raise;
          vmShowing = vm.showing('flamer');
          if (vmShowing) {
            viewMuzzle = vm.muzzleWorld(new T.THREE.Vector3());
          }
        }

        const W = window.innerWidth, H = window.innerHeight;
        const toPx = (worldPos) => {
          if (!worldPos) return null;
          const v = worldPos.clone().project(T.camera);
          if (v.z > 1.0 || v.z < -1.0) return null;
          return [
            +((v.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - v.y * 0.5) * H).toFixed(2),
            +v.z.toFixed(4)
          ];
        };

        const viewMuzzlePx = toPx(viewMuzzle);
        const bodyMuzzlePx = toPx(bodyMuzzle);

        // Find active flame particles
        const flameParticles = [];
        T.scene.traverse(obj => {
          if (obj.isMesh && obj.geometry && obj.geometry.type === 'IcosahedronGeometry') {
            if (obj.visible && obj.scale.x > 0.02) {
              const pPos = obj.position.clone();
              const pPx = toPx(pPos);
              flameParticles.push({
                pos: [pPos.x, pPos.y, pPos.z],
                scale: +obj.scale.x.toFixed(3),
                distViewMuzzle: viewMuzzle ? +viewMuzzle.distanceTo(pPos).toFixed(4) : null,
                distBodyMuzzle: +bodyMuzzle.distanceTo(pPos).toFixed(4),
                screenPx: pPx
              });
            }
          }
        });

        // Flare status
        const flare = gun.userData.flare;
        let flareWorld = null;
        if (flare) {
          flare.updateMatrixWorld(true);
          flareWorld = flare.getWorldPosition(new T.THREE.Vector3());
        }

        return {
          viewFirst: T.fpDbg().first,
          fpW: T.fpDbg().w,
          vmActive,
          vmKey,
          vmRaise,
          vmShowing,
          bodyMuzzle: [bodyMuzzle.x, bodyMuzzle.y, bodyMuzzle.z],
          viewMuzzle: viewMuzzle ? [viewMuzzle.x, viewMuzzle.y, viewMuzzle.z] : null,
          muzzleSeparationM: viewMuzzle ? +viewMuzzle.distanceTo(bodyMuzzle).toFixed(4) : null,
          bodyMuzzlePx,
          viewMuzzlePx,
          flare: flare ? {
            visible: flare.visible,
            scale: [flare.scale.x, flare.scale.y, flare.scale.z],
            worldPos: flareWorld ? [flareWorld.x, flareWorld.y, flareWorld.z] : null,
            screenPx: toPx(flareWorld)
          } : null,
          flameParticleCount: flameParticles.length,
          particles: flameParticles,
          camPos: [T.camera.position.x, T.camera.position.y, T.camera.position.z],
          camFov: T.camera.fov,
          rendererBackend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU'
        };
      }
    };
  })()`);

  const telemetry = {
    testDate: new Date().toISOString(),
    hardware: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    seat: 'Woods Trail (0.48, -3.17, 13.91, yaw 1.05)',
    firstPersonBurst: {},
    thirdPersonBurst: {},
    lightingBurst: {}
  };

  // =========================================================================
  // PART 1: First-Person Woods Burst (Noon Lighting)
  // =========================================================================
  console.log('\n--- PART 1: First-Person Flamer Burst on Woods Trail (Noon) ---');
  await page.evaluate(`(() => {
    const T = window.TT;
    T.setWorldTime(0.50); // Noon
    if (T.weather) { T.weather.raining = false; T.weather.cloudCover = 0.15; }
    T.setViewFirstDbg(true);
  })()`);

  // Wait for 1P viewmodel raise to reach steady 1.0
  console.log('[AG-212] Waiting for first-person viewmodel to fully settle...');
  for (let i = 0; i < 40; i++) {
    await page.evaluate(`window.TT.stepFrame(1/60)`);
  }

  // Pre-fire resting screenshot
  const prefire1pShot = path.join(OUT_DIR, 'flamer-1p-00-prefire.png');
  await captureShot(page, prefire1pShot);
  console.log('[AG-212] Saved prefire resting shot:', path.relative(ROOT, prefire1pShot));

  // Begin continuous firing burst (60 frames at 30fps = 2.0s burst)
  console.log('[AG-212] Firing 2.0s continuous stream (60 frames)...');
  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: true });
    T.setMouseFireDbg(true);
  })()`);

  const frames1P = [];
  for (let f = 0; f < 60; f++) {
    // Step 2x 1/60 frame = 1/30s
    const frameData = await page.evaluate(`(() => {
      const T = window.TT;
      T.stepFrame(1/60);
      T.stepFrame(1/60);
      const state = window.__ag212.sampleState();
      const b64 = window.__ag212.captureFrame(640, 360);
      return { state, b64 };
    })()`);

    frames1P.push(frameData.state);
    if (frameData.b64) {
      const fNum = String(f).padStart(3, '0');
      fs.writeFileSync(path.join(FRAMES_1P_DIR, `frame-${fNum}.jpg`), Buffer.from(frameData.b64, 'base64'));
    }

    // Capture full 1080p high-res screenshots at key milestones
    if (f === 5) {
      // Early ignition (first blobs leaving nozzle)
      await captureShot(page, path.join(OUT_DIR, 'flamer-1p-01-ignition.png'));
    } else if (f === 25) {
      // Full steady stream
      await captureShot(page, path.join(OUT_DIR, 'flamer-1p-02-steady-stream.png'));
    } else if (f === 50) {
      // Sustained full blast
      await captureShot(page, path.join(OUT_DIR, 'flamer-1p-03-full-blast.png'));
    }
  }

  // Release fire
  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: false });
    T.setMouseFireDbg(false);
  })()`);

  // Step 15 frames for dissipation and capture post-fire shot
  for (let i = 0; i < 15; i++) {
    await page.evaluate(`window.TT.stepFrame(1/60)`);
  }
  await captureShot(page, path.join(OUT_DIR, 'flamer-1p-04-dissipating.png'));

  telemetry.firstPersonBurst = {
    frameCount: frames1P.length,
    frames: frames1P
  };

  // Analyze Part 1 telemetry
  const seps = frames1P.filter(f => f.muzzleSeparationM != null).map(f => f.muzzleSeparationM);
  const avgSep = seps.reduce((a, b) => a + b, 0) / (seps.length || 1);
  console.log(`[AG-212] First-person Muzzle Separation: avg = ${avgSep.toFixed(4)} m (~${(avgSep * 100).toFixed(1)} cm)`);

  // Check particle proximity to viewmodel nozzle vs body nozzle
  let minViewDistOverall = Infinity;
  let minBodyDistOverall = Infinity;
  for (const f of frames1P) {
    if (f.particles && f.particles.length > 0) {
      const viewDists = f.particles.map(p => p.distViewMuzzle).filter(d => d != null);
      const bodyDists = f.particles.map(p => p.distBodyMuzzle);
      if (viewDists.length) minViewDistOverall = Math.min(minViewDistOverall, Math.min(...viewDists));
      if (bodyDists.length) minBodyDistOverall = Math.min(minBodyDistOverall, Math.min(...bodyDists));
    }
  }
  console.log(`[AG-212] Minimum Flame Particle Proximity: to view nozzle = ${minViewDistOverall.toFixed(4)} m, to body nozzle = ${minBodyDistOverall.toFixed(4)} m`);

  // =========================================================================
  // PART 2: First-Person Dusk Twilight Burst (Dynamic Light Check)
  // =========================================================================
  console.log('\n--- PART 2: First-Person Flamer Burst at Dusk (Dynamic Light Check) ---');
  await page.evaluate(`(() => {
    const T = window.TT;
    T.setWorldTime(0.77); // Dusk Twilight
    if (T.weather) { T.weather.raining = false; T.weather.cloudCover = 0.15; }
  })()`);

  for (let i = 0; i < 30; i++) await page.evaluate(`window.TT.stepFrame(1/60)`);
  await captureShot(page, path.join(OUT_DIR, 'flamer-dusk-00-prefire.png'));

  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: true });
    T.setMouseFireDbg(true);
  })()`);

  for (let i = 0; i < 30; i++) await page.evaluate(`window.TT.stepFrame(1/60)`);
  await captureShot(page, path.join(OUT_DIR, 'flamer-dusk-01-steady-burst.png'));

  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: false });
    T.setMouseFireDbg(false);
  })()`);
  for (let i = 0; i < 15; i++) await page.evaluate(`window.TT.stepFrame(1/60)`);

  // =========================================================================
  // PART 3: Third-Person Woods Burst (Fallback Verification)
  // =========================================================================
  console.log('\n--- PART 3: Third-Person Flamer Burst on Woods Trail (Fallback Verification) ---');
  await page.evaluate(`(() => {
    const T = window.TT;
    T.setWorldTime(0.50); // Noon
    T.setViewFirstDbg(false); // Third person
  })()`);

  // Settle 30 frames
  for (let i = 0; i < 30; i++) await page.evaluate(`window.TT.stepFrame(1/60)`);
  await captureShot(page, path.join(OUT_DIR, 'flamer-3p-00-prefire.png'));

  // Fire 30 frames at 30fps
  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: true });
    T.setMouseFireDbg(true);
  })()`);

  const frames3P = [];
  for (let f = 0; f < 30; f++) {
    const frameData = await page.evaluate(`(() => {
      const T = window.TT;
      T.stepFrame(1/60);
      T.stepFrame(1/60);
      const state = window.__ag212.sampleState();
      const b64 = window.__ag212.captureFrame(640, 360);
      return { state, b64 };
    })()`);

    frames3P.push(frameData.state);
    if (frameData.b64) {
      const fNum = String(f).padStart(3, '0');
      fs.writeFileSync(path.join(FRAMES_3P_DIR, `frame-${fNum}.jpg`), Buffer.from(frameData.b64, 'base64'));
    }

    if (f === 15) {
      await captureShot(page, path.join(OUT_DIR, 'flamer-3p-01-burst.png'));
    }
  }

  await page.evaluate(`(() => {
    const T = window.TT;
    T.flightInput({ keys: [], zoom: false, fire: false });
    T.setMouseFireDbg(false);
  })()`);

  telemetry.thirdPersonBurst = {
    frameCount: frames3P.length,
    frames: frames3P
  };

  // Write telemetry JSON
  console.log('\n[AG-212] Writing telemetry.json...');
  fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');

  console.log('[AG-212] Captured all shots and telemetry successfully.');
  if (page.errors && page.errors.length) {
    throw new Error('Page errors during test: ' + page.errors.join(' | '));
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error('[AG-212] Fatal Error:', err);
  process.exit(1);
});
