// AG-210 Runner: Walk and Run Strips Recapture & GP-20017 Launcher 4-Light Capture
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG210_DIR = path.join(ROOT, 'qa/2026-11-03-AG-210');
const R1_DIR = path.join(ROOT, 'qa/2026-11-02-AG-202/round1');
const FRAMES_DIR = path.join(R1_DIR, 'frames');
const LAUNCHER_DIR = path.join(AG210_DIR, 'launcher');

fs.mkdirSync(LAUNCHER_DIR, { recursive: true });

const WEAPONS_R1 = [
  { key: 'pistol', label: 'Pistol' },
  { key: 'revolver', label: 'Revolver' },
  { key: 'm4', label: 'GW-4 (M4)' }
];

const STRIP_NAMES = ['walk', 'run'];

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'jpeg', quality: 86, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-210] Walk/Run Recapture & Launcher 4-Light Execution ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-210] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-210] Navigating to game...');
  await page.goto(url, { timeout: 180000 });
  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
    throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
  }

  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
  await page.evaluate(lib);

  console.log('[AG-210] Starting match and prepping arsenal...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG210');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
  })()`);

  // Setup sample helpers
  await page.evaluate(`(() => {
    const T = window.TT;
    const THREE = T.THREE;

    window.__ag210 = {
      sampleFrame(wKey) {
        const W = window.innerWidth, H = window.innerHeight;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const toPx = (ndc) => ndc ? [
          +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
          +((0.5 - ndc.y * 0.5) * H).toFixed(2),
          +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
        ] : [0, 0, 0];

        let muzzlePx = [0, 0, 0], wristRPx = [0, 0, 0], wristLPx = [0, 0, 0];
        let rootVisible = false, vmActive = false;
        let vmFrameP = null, vmFrameEul = null;

        if (vm) {
          rootVisible = !!(vm.root && vm.root.visible);
          if (vm.info && vm.info.active) {
            vmActive = true;
            const src = T.weaponMeshes[wKey];
            const mzLocal = (src && src.userData && src.userData.muzzleLocal) ? src.userData.muzzleLocal.clone() : new THREE.Vector3(0, 0.04, 0.35);
            const mzView = vm.viewPoint(mzLocal);
            muzzlePx = toPx(vm.ndc(mzView));
            if (vm.wrists && vm.wrists.r && vm.wrists.r.p) wristRPx = toPx(vm.ndc(vm.wrists.r.p));
            if (vm.wrists && vm.wrists.l && vm.wrists.l.p) wristLPx = toPx(vm.ndc(vm.wrists.l.p));
            if (vm.frame && vm.frame.p) vmFrameP = [vm.frame.p.x, vm.frame.p.y, vm.frame.p.z];
            if (vm.frame && vm.frame.q) {
              const eul = new THREE.Euler().setFromQuaternion(vm.frame.q, 'YXZ');
              vmFrameEul = [eul.x, eul.y, eul.z];
            }
          }
        }

        const vel = (T.smoothDbg && T.smoothDbg.vel) ? T.smoothDbg.vel() : { x: 0, z: 0 };
        const spd = +Math.hypot(vel.x, vel.z).toFixed(4);

        return {
          rootVisible,
          vmActive,
          muzzle: muzzlePx,
          wristR: wristRPx,
          wristL: wristLPx,
          camFov: +T.camera.fov.toFixed(2),
          camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
          playerPos: [+T.player.position.x.toFixed(4), +T.player.position.y.toFixed(4), +T.player.position.z.toFixed(4)],
          vel: [+vel.x.toFixed(4), +vel.z.toFixed(4)],
          speed: spd,
          vmPos: vmFrameP,
          vmRot: vmFrameEul
        };
      }
    };
  })()`);

  // Load existing traces
  let allTraces = { generatedAt: new Date().toISOString(), stills: {}, strips: {} };
  const tracePath = path.join(R1_DIR, 'traces.json');
  if (fs.existsSync(tracePath)) {
    try { allTraces = JSON.parse(fs.readFileSync(tracePath, 'utf8')); } catch (_) {}
  }

  // =========================================================================
  // PART 1: Walk & Run Strips Recapture (Training Ground Build-Room Floor)
  // =========================================================================
  console.log('\n--- PART 1: Walk & Run Strips Recapture with Speed and Net-Travel Assertions ---');
  await page.evaluate(`(async () => {
    const T = window.TT;
    if (!T.trainingDbg.state().active) T.trainingDbg.enter();
    if (T.isUnarmed()) T.toggleHolster();
    T.setViewFirstDbg(true);
    T.flightHold(false);
    await new Promise((r) => setTimeout(r, 600));
  })()`);

  const frameClip = { x: 0, y: 0, width: 1920, height: 1080, scale: 0.25 }; // 480x270 thumbnail

  for (const wSpec of WEAPONS_R1) {
    const wFrameDir = path.join(FRAMES_DIR, `${wSpec.key}-1080p`);
    fs.mkdirSync(wFrameDir, { recursive: true });

    // Select weapon and settle raise under real-time loop (flightHold = false)
    console.log(`\n[Part 1] Equipping ${wSpec.label} (${wSpec.key})...`);
    await page.evaluate(`(async (k) => {
      const T = window.TT;
      T.flightHold(false);
      const idx = T.WEAPON_ORDER.indexOf(k);
      T.setWeapon(idx);
      T.setAmmoDbg(k, 9999);
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();

      for (let i = 0; i < 80; i++) {
        const vm = T.viewmodelDbg();
        if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === k && !T.isUnarmed()) {
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    })('${wSpec.key}')`);

    // Settle check
    const checkState = await page.evaluate(`window.__ag210.sampleFrame('${wSpec.key}')`);
    if (!checkState.rootVisible || !checkState.vmActive) {
      throw new Error(`PRE-STRIP ASSERTION FAILED: ${wSpec.key} rootVisible=${checkState.rootVisible}, vmActive=${checkState.vmActive}`);
    }

    for (const stripName of STRIP_NAMES) {
      console.log(`  -> Running strip: ${wSpec.key} - ${stripName} (90 frames)...`);
      const nominalSpeed = stripName === 'walk' ? 7.4 : 11.8;
      const minSteadySpeed = 0.8 * nominalSpeed; // 80% speed requirement
      const minNetTravel = 0.7 * nominalSpeed * 3.0; // 0.7 * speed * time requirement

      console.log(`     Criteria: nominalSpeed=${nominalSpeed} m/s, minSteadySpeed=${minSteadySpeed.toFixed(2)} m/s, minNetTravel=${minNetTravel.toFixed(2)} m`);

      // Position in build-room open floor at x = -20, z = -649.5 (world coords), yaw = 0
      // North wall is at -612.75 (36.75 metres ahead of flat open floor).
      // Freeze frame loop with flightHold(true) so each stepFrame(1/30) advances exactly one physics frame.
      await page.evaluate(`(async () => {
        const T = window.TT;
        const tg = T.trainingDbg.tg();
        const startX = -20;
        const startY = tg.floorY;
        const startZ = tg.origin.z - 9.5; // -649.5
        T.player.position.set(startX, startY, startZ);
        if (T.localPlayer && T.localPlayer.position) {
          T.localPlayer.position.set(startX, startY, startZ);
        }
        T.player.rotation.y = 0;
        T.setAimYawDbg(0);
        T.setOtsAimDbg(0, 0);
        T.setVelDbg(0, 0);
        T.flightInput({ keys: [], zoom: false, fire: false });
        T.setMouseFireDbg(false);
        T.flightHold(false);
        await new Promise((r) => setTimeout(r, 100));
        T.flightHold(true);
      })()`);

      const stripFrames = [];

      for (let f = 0; f < 90; f++) {
        const t = f * (1 / 30);

        // Step exactly 1 frame (1/30 s) with flight input applied
        const frameData = await page.evaluate(`((strip, f, t, wKey) => {
          const T = window.TT;
          if (strip === 'walk') {
            T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
          } else if (strip === 'run') {
            T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
          }

          T.stepFrame(1 / 30);
          return window.__ag210.sampleFrame(wKey);
        })('${stripName}', ${f}, ${t}, '${wSpec.key}')`);

        // Strict frame assertions
        if (!frameData.rootVisible) {
          throw new Error(`FRAME ASSERTION FAILED: ${wSpec.key} ${stripName} frame ${f} has rootVisible=false`);
        }
        if (!frameData.vmActive) {
          throw new Error(`FRAME ASSERTION FAILED: ${wSpec.key} ${stripName} frame ${f} has vmActive=false`);
        }

        // Speed assertion once accelerated (f >= 15)
        if (f >= 15 && frameData.speed < minSteadySpeed) {
          throw new Error(`SPEED ASSERTION FAILED: ${wSpec.key} ${stripName} frame ${f} speed ${frameData.speed} m/s < ${minSteadySpeed.toFixed(2)} m/s (player at pos [${frameData.playerPos}])`);
        }

        frameData.f = f;
        frameData.t = +t.toFixed(4);
        stripFrames.push(frameData);

        // Capture frame thumbnail (game is held by flightHold, so no unwanted movement occurs during capture)
        const fNum = String(f).padStart(3, '0');
        const fPath = path.join(wFrameDir, `${stripName}-${fNum}.jpg`);
        await captureShot(page, fPath, frameClip);
      }

      // Release inputs and unhold loop
      await page.evaluate(`(() => {
        const T = window.TT;
        T.flightInput({ keys: [], zoom: false, fire: false });
        T.setMouseFireDbg(false);
        T.flightHold(false);
      })()`);

      // Verify net travel
      const p0 = stripFrames[0].playerPos;
      const pEnd = stripFrames[89].playerPos;
      const netTravel = Math.hypot(pEnd[0] - p0[0], pEnd[2] - p0[2]);

      const c0 = stripFrames[0].camPos;
      const cEnd = stripFrames[89].camPos;
      const camNetTravel = Math.hypot(cEnd[0] - c0[0], cEnd[2] - c0[2]);

      console.log(`     Result: player netTravel=${netTravel.toFixed(2)} m, camNetTravel=${camNetTravel.toFixed(2)} m, finalSpeed=${stripFrames[89].speed.toFixed(2)} m/s`);

      if (netTravel < minNetTravel) {
        throw new Error(`TRAVEL ASSERTION FAILED: ${wSpec.key} ${stripName} netTravel ${netTravel.toFixed(2)} m < ${minNetTravel.toFixed(2)} m required!`);
      }

      // Store in allTraces
      allTraces.strips[`${wSpec.key}-${stripName}`] = stripFrames;
    }
  }

  // Save updated traces
  fs.writeFileSync(tracePath, JSON.stringify(allTraces, null, 2));
  console.log(`\n[Part 1] All 6 walk/run strips successfully recaptured and verified!`);

  // =========================================================================
  // PART 2: GP-20017 Launcher Hip Side-Read 4-Light Capture
  // =========================================================================
  console.log('\n--- PART 2: GP-20017 Launcher Hip Side-Read 4-Light Capture ---');
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.flightHold(false);
    if (T.trainingDbg.state().active) T.trainingDbg.leave();
    T.clearZombies && T.clearZombies();
    T.player.position.set(0.48, -3.17, 13.91);
    T.player.rotation.y = 1.05;
    T.setAimYawDbg(1.05);
    T.setOtsAimDbg(1.05, 0.0);
    T.setVelDbg(0, 0);

    const idx = T.WEAPON_ORDER.indexOf('launcher');
    T.setWeapon(idx);
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();

    for (let i = 0; i < 100; i++) {
      const vm = T.viewmodelDbg();
      if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === 'launcher') break;
      await new Promise(r => setTimeout(r, 50));
    }
  })()`);

  const lights = [
    { name: 'noon', time: 0.42 },
    { name: 'overcast', time: 0.55 },
    { name: 'dusk', time: 0.82 },
    { name: 'night', time: 0.02 }
  ];

  const launcherMeta = { baselineYaw: 0.025, candidateYaw: 0.25, shots: {} };

  // 1. Capture Baseline Yaw (0.025)
  console.log('  -> Capturing Launcher Baseline Yaw (+0.025) across 4 lights...');
  for (const lt of lights) {
    const meta = await page.evaluate(`(async () => {
      const T = window.TT;
      const poses = (await import('./game/viewmodel-poses.js')).VM_POSES;
      poses.launcher.hip.yaw = 0.025;
      T.setTimeOfDay && T.setTimeOfDay(${lt.time});
      await new Promise(r => setTimeout(r, 300));
      const vm = T.viewmodelDbg();
      return {
        key: 'launcher',
        active: vm.info.active,
        rootVisible: vm.root && vm.root.visible,
        raise: vm.info.raise,
        ads: vm.info.ads,
        muzzleNdc: vm.ndc(vm.viewPoint(T.weaponMeshes.launcher.userData.muzzleLocal || new T.THREE.Vector3(0, 0.04, 0.35)))
      };
    })()`);

    const outPath = path.join(LAUNCHER_DIR, `launcher-baseline-${lt.name}.jpg`);
    await captureShot(page, outPath);
    launcherMeta.shots[`baseline-${lt.name}`] = { ...meta, path: outPath };
    console.log(`     Saved ${outPath}`);
  }

  // 2. Capture Candidate Yaw (0.25)
  console.log('  -> Capturing Launcher Candidate Yaw (+0.25) across 4 lights...');
  for (const lt of lights) {
    const meta = await page.evaluate(`(async () => {
      const T = window.TT;
      const poses = (await import('./game/viewmodel-poses.js')).VM_POSES;
      poses.launcher.hip.yaw = 0.25;
      T.setTimeOfDay && T.setTimeOfDay(${lt.time});
      await new Promise(r => setTimeout(r, 300));
      const vm = T.viewmodelDbg();
      return {
        key: 'launcher',
        active: vm.info.active,
        rootVisible: vm.root && vm.root.visible,
        raise: vm.info.raise,
        ads: vm.info.ads,
        muzzleNdc: vm.ndc(vm.viewPoint(T.weaponMeshes.launcher.userData.muzzleLocal || new T.THREE.Vector3(0, 0.04, 0.35)))
      };
    })()`);

    const outPath = path.join(LAUNCHER_DIR, `launcher-candidate-${lt.name}.jpg`);
    await captureShot(page, outPath);
    launcherMeta.shots[`candidate-${lt.name}`] = { ...meta, path: outPath };
    console.log(`     Saved ${outPath}`);
  }

  fs.writeFileSync(path.join(LAUNCHER_DIR, 'launcher-metadata.json'), JSON.stringify(launcherMeta, null, 2));

  console.log('\n[AG-210] Execution finished cleanly. Closing browser...');
  await browser.close();
  server.close();
  console.log('[AG-210] Done.');
}

main().catch((err) => {
  console.error('\n[AG-210 ERROR]', err);
  process.exit(1);
});
