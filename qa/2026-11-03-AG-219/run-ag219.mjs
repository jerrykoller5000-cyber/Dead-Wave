// AG-219 Runner: GP-20018 Nine Long-Gun Hip and Walk Review
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG219_DIR = path.join(ROOT, 'qa/2026-11-03-AG-219');
const STILLS_DIR = path.join(AG219_DIR, 'captures/stills');
const STRIPS_DIR = path.join(AG219_DIR, 'captures/strips');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(STRIPS_DIR, { recursive: true });

const WEAPONS_9 = [
  { key: 'm4', label: 'GW-4 (M4)', baseFolder: 'hip-sweep-m4' },
  { key: 'ak', label: 'AK', baseFolder: 'hip-sweep-ak' },
  { key: 'uzi', label: 'Wasp (Uzi)', baseFolder: 'hip-sweep-uzi' },
  { key: 'shotgun', label: 'Shotgun', baseFolder: 'hip-sweep-shotgun' },
  { key: 'aa12', label: 'Breacher (AA12)', baseFolder: 'hip-sweep-aa12' },
  { key: 'flamer', label: 'Flamer', baseFolder: 'hip-sweep-flamer' },
  { key: 'sniper', label: 'Sniper', baseFolder: 'hip-sweep-sniper-mid' },
  { key: 'launcher', label: 'Launcher', baseFolder: 'hip-sweep-launcher-mid' },
  { key: 'minigun', label: 'Minigun', baseFolder: 'hip-sweep-minigun-heavy' }
];

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'jpeg', quality: 88, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('========================================================================');
  console.log('=== [AG-219] GP-20018 Nine Long-Gun Hip and Walk Review ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-219] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(url, { timeout: 180000 });

  if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
    throw new Error('window.TT never appeared');
  }

  // Dismiss opening card
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

  // Inject lib.js
  const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
  await page.evaluate(libCode);

  // Start match as JERRY
  console.log('[AG-219] Starting match via startMatch(T, \'JERRY\')...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'JERRY');
    if (T.clearZombies) T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
  })()`);

  // Setup sample helper
  await page.evaluate(`(() => {
    const T = window.TT;
    const THREE = T.THREE;

    window.__ag219 = {
      sampleFrame(wKey) {
        const W = window.innerWidth, H = window.innerHeight;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const toPx = (ndc) => ndc ? [
          +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
          +((0.5 - ndc.y * 0.5) * H).toFixed(2),
          +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
        ] : [0, 0, 0];

        let muzzlePx = [0, 0, 0], muzzleNdc = { x: 0, y: 0 };
        let gripPx = [0, 0, 0];
        let wristRPx = [0, 0, 0], wristLPx = [0, 0, 0];
        let rootVisible = false, vmActive = false, vmRaise = 0, vmKey = null;
        let vmFrameP = null, vmFrameEul = null;

        if (vm) {
          rootVisible = !!(vm.root && vm.root.visible);
          if (vm.info && vm.info.active) {
            vmActive = true;
            vmRaise = vm.info.raise || 0;
            vmKey = vm.info.key;
            const src = T.weaponMeshes[wKey];
            const mzLocal = (src && src.userData && src.userData.muzzleLocal) ? src.userData.muzzleLocal.clone() : new THREE.Vector3(0, 0.04, 0.35);
            const mzView = vm.viewPoint(mzLocal);
            const ndc = vm.ndc(mzView);
            muzzleNdc = { x: +ndc.x.toFixed(4), y: +ndc.y.toFixed(4) };
            muzzlePx = toPx(ndc);
            const gripView = vm.viewPoint(new THREE.Vector3(0, 0, 0));
            gripPx = toPx(vm.ndc(gripView));
            if (vm.wrists && vm.wrists.r && vm.wrists.r.p) wristRPx = toPx(vm.ndc(vm.wrists.r.p));
            if (vm.wrists && vm.wrists.l && vm.wrists.l.p) wristLPx = toPx(vm.ndc(vm.wrists.l.p));
            if (vm.frame && vm.frame.p) vmFrameP = [+vm.frame.p.x.toFixed(4), +vm.frame.p.y.toFixed(4), +vm.frame.p.z.toFixed(4)];
            if (vm.frame && vm.frame.q) {
              const eul = new THREE.Euler().setFromQuaternion(vm.frame.q, 'YXZ');
              vmFrameEul = [+eul.x.toFixed(4), +eul.y.toFixed(4), +eul.z.toFixed(4)];
            }
          }
        }

        const vel = (T.smoothDbg && T.smoothDbg.vel) ? T.smoothDbg.vel() : { x: 0, z: 0 };
        const spd = +Math.hypot(vel.x, vel.z).toFixed(4);

        return {
          rootVisible,
          vmActive,
          vmRaise,
          vmKey,
          muzzleNdc,
          muzzlePx,
          gripPx,
          wristR: wristRPx,
          wristL: wristLPx,
          camFov: +T.camera.fov.toFixed(2),
          camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
          playerPos: [+T.player.position.x.toFixed(4), +T.player.position.y.toFixed(4), +T.player.position.z.toFixed(4)],
          speed: spd,
          vmPos: vmFrameP,
          vmRot: vmFrameEul
        };
      }
    };
  })()`);

  const telemetry = {
    generatedAt: new Date().toISOString(),
    stills: {},
    walkStrips: {}
  };

  // =========================================================================
  // STAGE 1: Nine Long-Gun Hip Stills at Rest (Jerry's Launcher Seat)
  // =========================================================================
  console.log('\n--- STAGE 1: Nine Long-Gun Hip Stills at Rest (Jerry\'s Launcher Seat) ---');

  for (const w of WEAPONS_9) {
    console.log(`\n[Stage 1] Equipping ${w.label} (${w.key})...`);
    await page.evaluate(`(async (k) => {
      const T = window.TT;
      T.grantAllWeapons();
      T.flightHold(false);
      const idx = T.WEAPON_ORDER.indexOf(k);
      T.setWeapon(idx);
      T.setAmmoDbg(k, 9999);
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();

      for (let i = 0; i < 100; i++) {
        const vm = T.viewmodelDbg();
        if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === k && !T.isUnarmed()) {
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      const vm = T.viewmodelDbg();
      throw new Error('Stage 1 equip timeout for ' + k + ': key=' + (vm && vm.info && vm.info.key) + ' raise=' + (vm && vm.info && vm.info.raise));
    })('${w.key}')`);

    // Settle 30 frames
    await page.evaluate(`(async () => {
      const T = window.TT;
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    })()`);

    const stillSample = await page.evaluate(`window.__ag219.sampleFrame('${w.key}')`);
    if (!stillSample.rootVisible || !stillSample.vmActive || stillSample.vmRaise < 0.99 || stillSample.vmKey !== w.key) {
      throw new Error(`STILL ASSERTION FAILED: ${w.key} rootVisible=${stillSample.rootVisible}, vmActive=${stillSample.vmActive}, raise=${stillSample.vmRaise}, vmKey=${stillSample.vmKey}`);
    }

    const stillPath = path.join(STILLS_DIR, `${w.key}-hip-rest.jpg`);
    await captureShot(page, stillPath);
    console.log(`  -> [PASS] Captured ${w.key}-hip-rest.jpg | Muzzle NDC: (${stillSample.muzzleNdc.x}, ${stillSample.muzzleNdc.y}) | Muzzle Px: [${stillSample.muzzlePx.slice(0, 2)}]`);

    telemetry.stills[w.key] = {
      label: w.label,
      key: w.key,
      file: `${w.key}-hip-rest.jpg`,
      sample: stillSample
    };
  }

  // =========================================================================
  // STAGE 2: Walk Strips Recapture (Outdoor Landing Trail Corridor)
  // =========================================================================
  console.log('\n--- STAGE 2: Nine Long-Gun Walk Strips Recapture (90 frames, Outdoor Trail Corridor) ---');

  // Set clear noon lighting and ensure outdoor match state
  await page.evaluate(`(async () => {
    const T = window.TT;
    if (T.trainingDbg && T.trainingDbg.state().active) {
      T.trainingDbg.leave();
    }
    if (T.clearZombies) T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    if (T.setWorldTime) T.setWorldTime(12);
    T.flightHold(false);
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    await new Promise((r) => setTimeout(r, 400));
  })()`);

  for (const w of WEAPONS_9) {
    const wStripDir = path.join(STRIPS_DIR, w.key);
    fs.mkdirSync(wStripDir, { recursive: true });

    console.log(`\n[Stage 2] Prepping Walk Strip for ${w.label} (${w.key})...`);
    await page.evaluate(`(async (k) => {
      const T = window.TT;
      T.grantAllWeapons();
      T.flightHold(false);
      const idx = T.WEAPON_ORDER.indexOf(k);
      T.setWeapon(idx);
      T.setAmmoDbg(k, 9999);
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();

      for (let i = 0; i < 100; i++) {
        const vm = T.viewmodelDbg();
        if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === k && !T.isUnarmed()) {
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      const vm = T.viewmodelDbg();
      throw new Error('Stage 2 equip timeout for ' + k + ': key=' + (vm && vm.info && vm.info.key) + ' raise=' + (vm && vm.info && vm.info.raise));
    })('${w.key}')`);

    const nominalSpeed = 7.4; // walk speed
    const minSteadySpeed = 0.8 * nominalSpeed; // 5.92 m/s
    const minNetTravel = 0.7 * nominalSpeed * 3.0; // 15.54 m

    // Reset player position to start of landing clearing trail toward HQ
    // sx = 40, sz = -20. Destination tx = 0, tz = -6.5.
    // tyaw = Math.atan2(0 - 40, -6.5 - (-20)) = Math.atan2(-40, 13.5) = -1.2452 rad (~ -71.3 deg)
    await page.evaluate(`(async () => {
      const T = window.TT;
      const sx = 40, sz = -20;
      const tx = 0, tz = -6.5;
      const tyaw = Math.atan2(tx - sx, tz - sz);
      const gy = T.sampleHeight(sx, sz);

      T.player.position.set(sx, gy, sz);
      if (T.localPlayer && T.localPlayer.position) {
        T.localPlayer.position.set(sx, gy, sz);
      }
      T.player.rotation.y = tyaw;
      T.setAimYawDbg(tyaw);
      T.setOtsAimDbg(tyaw, 0);
      T.setVelDbg(0, 0);
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setMouseFireDbg(false);
      T.flightHold(false);
      for (let i = 0; i < 15; i++) T.stepFrame(1 / 30);
      T.flightHold(true);
    })()`);

    const preWalkSample = await page.evaluate(`window.__ag219.sampleFrame('${w.key}')`);
    if (!preWalkSample.rootVisible || !preWalkSample.vmActive || preWalkSample.vmKey !== w.key) {
      throw new Error(`PRE-WALK ASSERTION FAILED: ${w.key} rootVisible=${preWalkSample.rootVisible}, vmActive=${preWalkSample.vmActive}, vmKey=${preWalkSample.vmKey}`);
    }

    const stripFrames = [];
    let startPos = null;

    for (let f = 0; f < 90; f++) {
      const t = f * (1 / 30);

      const frameData = await page.evaluate(`((f, t, wKey) => {
        const T = window.TT;
        T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
        T.stepFrame(1 / 30);
        return window.__ag219.sampleFrame(wKey);
      })(${f}, ${t}, '${w.key}')`);

      if (f === 0) startPos = [...frameData.playerPos];

      // Strict frame assertions
      if (!frameData.rootVisible) {
        throw new Error(`FRAME ASSERTION FAILED: ${w.key} walk frame ${f} has rootVisible=false`);
      }
      if (!frameData.vmActive) {
        throw new Error(`FRAME ASSERTION FAILED: ${w.key} walk frame ${f} has vmActive=false`);
      }
      if (frameData.vmKey !== w.key) {
        throw new Error(`FRAME ASSERTION FAILED: ${w.key} walk frame ${f} has vmKey=${frameData.vmKey}`);
      }

      // Speed assertion once accelerated (f >= 15)
      if (f >= 15 && frameData.speed < minSteadySpeed) {
        throw new Error(`SPEED ASSERTION FAILED: ${w.key} walk frame ${f} speed ${frameData.speed} m/s < ${minSteadySpeed.toFixed(2)} m/s`);
      }

      frameData.f = f;
      frameData.t = +t.toFixed(4);
      stripFrames.push(frameData);

      const fNum = String(f).padStart(3, '0');
      const fPath = path.join(wStripDir, `walk-${fNum}.jpg`);
      await captureShot(page, fPath);
    }

    // Release inputs
    await page.evaluate(`(() => {
      const T = window.TT;
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setVelDbg(0, 0);
      T.flightHold(false);
    })()`);

    const endPos = stripFrames[stripFrames.length - 1].playerPos;
    const netTravel = +Math.hypot(endPos[0] - startPos[0], endPos[2] - startPos[2]).toFixed(2);
    const avgSpeed = +(stripFrames.slice(18).reduce((acc, fr) => acc + fr.speed, 0) / (stripFrames.length - 18)).toFixed(2);

    console.log(`  -> [PASS] ${w.key} Walk Strip: 90/90 frames valid | Net Travel: ${netTravel} m (min: ${minNetTravel.toFixed(2)} m) | Avg Steady Speed: ${avgSpeed} m/s`);

    if (netTravel < minNetTravel) {
      throw new Error(`NET TRAVEL ASSERTION FAILED: ${w.key} netTravel=${netTravel} m < ${minNetTravel.toFixed(2)} m`);
    }

    telemetry.walkStrips[w.key] = {
      label: w.label,
      key: w.key,
      framesCount: stripFrames.length,
      netTravel: netTravel,
      avgSpeed: avgSpeed,
      frames: stripFrames
    };
  }

  // Save telemetry
  const telemPath = path.join(AG219_DIR, 'telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`\n[AG-219] Telemetry saved to: ${telemPath}`);

  await browser.close();
  server.close();
  console.log('[AG-219] Browser and server cleanly closed.');

  console.log('\n[AG-219] Running visible gun pixel verification...');
  execSync('python qa/2026-11-03-AG-219/verify-pixels.py', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('[AG-219] FATAL ERROR:', err);
  process.exit(1);
});
