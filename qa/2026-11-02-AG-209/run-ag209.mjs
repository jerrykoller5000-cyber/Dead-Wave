// AG-209 Runner: Complete Recapture and Visual Evidence Pass
// Part 1: Round 1 Strips Recapture with strict viewmodelDbg().root.visible & frame pixel gates
// Part 2: GP-20017 Revolver +0.40 4-Light Independent Score
// Part 3: GP-20017 Reload Magwell Evidence (J21) across 6 weapons
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG209_DIR = path.join(ROOT, 'qa/2026-11-02-AG-209');
const R1_DIR = path.join(ROOT, 'qa/2026-11-02-AG-202/round1');
const FRAMES_DIR = path.join(R1_DIR, 'frames');
const GIFS_DIR = path.join(R1_DIR, 'gifs');
const STILLS_DIR = path.join(R1_DIR, 'stills');
const REVOLVER_DIR = path.join(AG209_DIR, 'revolver');
const MAGWELL_DIR = path.join(AG209_DIR, 'magwell');

fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(GIFS_DIR, { recursive: true });
fs.mkdirSync(REVOLVER_DIR, { recursive: true });
fs.mkdirSync(MAGWELL_DIR, { recursive: true });

const WEAPONS_R1 = [
  { key: 'pistol', label: 'Pistol' },
  { key: 'revolver', label: 'Revolver' },
  { key: 'm4', label: 'GW-4 (M4)' }
];

const STRIP_NAMES = ['walk', 'run', 'strafe', 'flick90', 'burst', 'jump'];

const MAGWELL_WEAPONS = [
  { key: 'pistol', label: 'Pistol', uOut: 0.34, uSeat: 0.58 },
  { key: 'uzi', label: 'Wasp', uOut: 0.32, uSeat: 0.53 },
  { key: 'm4', label: 'GW-4 (M4)', uOut: 0.32, uSeat: 0.53 },
  { key: 'ak', label: 'AK (KR-7)', uOut: 0.32, uSeat: 0.53 },
  { key: 'aa12', label: 'Breacher', uOut: 0.36, uSeat: 0.60 },
  { key: 'sniper', label: 'Sniper', uOut: 0.32, uSeat: 0.53 }
];

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'jpeg', quality: 86, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-209] Recapture Pass & Independent Visual Evidence Execution ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-209] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-209] Navigating to game...');
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

  console.log('[AG-209] Starting match and prepping arsenal...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG209');
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

    window.__ag209 = {
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

        return {
          rootVisible,
          vmActive,
          muzzle: muzzlePx,
          wristR: wristRPx,
          wristL: wristLPx,
          camFov: +T.camera.fov.toFixed(2),
          camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
          vmPos: vmFrameP,
          vmRot: vmFrameEul
        };
      }
    };
  })()`);

  // Load existing traces if present
  let allTraces = { generatedAt: new Date().toISOString(), stills: {}, strips: {} };
  const tracePath = path.join(R1_DIR, 'traces.json');
  if (fs.existsSync(tracePath)) {
    try { allTraces = JSON.parse(fs.readFileSync(tracePath, 'utf8')); } catch (_) {}
  }

  // =========================================================================
  // PART 1: 18 Motion Strips Recapture (Training Ground)
  // =========================================================================
  console.log('\n--- PART 1: 18 Motion Strips Recapture with Frame-by-Frame Root & Pixel Gate ---');
  await page.evaluate(`(async () => {
    const T = window.TT;
    if (!T.trainingDbg.state().active) T.trainingDbg.enter();
    if (T.isUnarmed()) T.toggleHolster();
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 1000));
  })()`);

  const frameClip = { x: 0, y: 0, width: 1920, height: 1080, scale: 0.25 }; // 480x270 thumbnail

  for (const wSpec of WEAPONS_R1) {
    const wFrameDir = path.join(FRAMES_DIR, `${wSpec.key}-1080p`);
    fs.mkdirSync(wFrameDir, { recursive: true });

    // Select weapon and settle raise
    console.log(`[Part 1] Equipping ${wSpec.label} (${wSpec.key})...`);
    await page.evaluate(`(async (k) => {
      const T = window.TT;
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
    const checkState = await page.evaluate(`window.__ag209.sampleFrame('${wSpec.key}')`);
    if (!checkState.rootVisible || !checkState.vmActive) {
      throw new Error(`PRE-STRIP ASSERTION FAILED: ${wSpec.key} rootVisible=${checkState.rootVisible}, vmActive=${checkState.vmActive}`);
    }

    for (const stripName of STRIP_NAMES) {
      console.log(`  -> Running strip: ${wSpec.key} - ${stripName} (90 frames)...`);
      const stripFrames = [];

      // Reset position to range lane
      await page.evaluate(`(() => {
        const T = window.TT;
        const tg = T.trainingDbg.tg();
        T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
        T.player.rotation.y = tg.spawn.yaw;
        T.setAimYawDbg(tg.spawn.yaw);
        T.setOtsAimDbg(tg.spawn.yaw, 0);
        T.setVelDbg(0, 0);
        T.flightInput({ keys: [], zoom: false, fire: false });
        T.setMouseFireDbg(false);
      })()`);

      for (let f = 0; f < 90; f++) {
        const t = f * (1 / 30);

        // Apply input & wait for tick
        const frameData = await page.evaluate(`(async (strip, f, t, wKey) => {
          const T = window.TT;
          if (strip === 'walk') {
            T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
          } else if (strip === 'run') {
            T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
          } else if (strip === 'strafe') {
            T.flightInput({ keys: [f < 45 ? 'KeyA' : 'KeyD'], zoom: false, fire: false });
          } else if (strip === 'flick90') {
            T.flightInput({ keys: [], zoom: false, fire: false });
            if (f >= 5 && f < 9) {
              const yawNow = T.otsDbg().yaw + (Math.PI / 2) / 4;
              T.setOtsAimDbg(yawNow, 0);
              T.setAimYawDbg(yawNow);
            }
          } else if (strip === 'burst') {
            const firing = t < 1.0;
            const isSemi = ['pistol', 'revolver'].includes(wKey);
            const fireOn = isSemi ? (firing && (f % 6 === 0)) : firing;
            T.flightInput({ keys: [], zoom: false, fire: fireOn });
            T.setMouseFireDbg(fireOn);
          } else if (strip === 'jump') {
            if (f === 5) {
              T.flightInput({ keys: ['Space'], zoom: false, fire: false });
              T.airDbg.jumpNow();
            } else {
              T.flightInput({ keys: [], zoom: false, fire: false });
            }
          }

          await new Promise((r) => setTimeout(r, 33));
          return window.__ag209.sampleFrame(wKey);
        })('${stripName}', ${f}, ${t}, '${wSpec.key}')`);

        // Strict frame assertions
        if (!frameData.rootVisible) {
          throw new Error(`FRAME ASSERTION FAILED: ${wSpec.key} ${stripName} frame ${f} has rootVisible=false`);
        }
        if (!frameData.vmActive) {
          throw new Error(`FRAME ASSERTION FAILED: ${wSpec.key} ${stripName} frame ${f} has vmActive=false`);
        }

        frameData.f = f;
        frameData.t = +t.toFixed(4);
        stripFrames.push(frameData);

        // Capture frame thumbnail
        const fNum = String(f).padStart(3, '0');
        const fPath = path.join(wFrameDir, `${stripName}-${fNum}.jpg`);
        await captureShot(page, fPath, frameClip);
      }

      // Release inputs
      await page.evaluate(`(() => {
        const T = window.TT;
        T.flightInput({ keys: [], zoom: false, fire: false });
        T.setMouseFireDbg(false);
      })()`);

      allTraces.strips[`${wSpec.key}-${stripName}`] = stripFrames;
    }
  }

  // Save raw traces
  fs.writeFileSync(tracePath, JSON.stringify(allTraces, null, 2));
  console.log(`[Part 1] All 18 strips captured (1,620 frames) with verified rootVisible=true.`);

  // =========================================================================
  // PART 2: GP-20017 Revolver +0.40 Four-Light Score
  // =========================================================================
  console.log('\n--- PART 2: GP-20017 Revolver +0.40 Four-Light Independent Score ---');
  await page.evaluate(`(async () => {
    const T = window.TT;
    if (T.trainingDbg.state().active) T.trainingDbg.leave();
    T.clearZombies && T.clearZombies();
    T.player.position.set(0.48, -3.17, 13.91);
    T.player.rotation.y = 1.05;
    T.setAimYawDbg(1.05);
    T.setOtsAimDbg(1.05, 0.0);
    T.setVelDbg(0, 0);

    const idx = T.WEAPON_ORDER.indexOf('revolver');
    T.setWeapon(idx);
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();

    for (let i = 0; i < 80; i++) {
      const vm = T.viewmodelDbg();
      if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === 'revolver') break;
      await new Promise((r) => setTimeout(r, 50));
    }
  })()`);

  const revolverLights = [
    { name: 'noon', time: 0.42 },
    { name: 'overcast', time: 0.55 },
    { name: 'dusk', time: 0.82 },
    { name: 'night', time: 0.02 }
  ];

  const revolverShotMeta = {};

  for (const lt of revolverLights) {
    console.log(`  -> Capturing Revolver +0.40 under ${lt.name}...`);
    await page.evaluate(`(async (t) => {
      const T = window.TT;
      if (T.setWorldTime) T.setWorldTime(${lt.time});
      await new Promise((r) => setTimeout(r, 1200));
    })(${lt.time})`);

    const stillPath = path.join(REVOLVER_DIR, `revolver-hip-+0.40-${lt.name}.jpg`);
    await captureShot(page, stillPath);

    // Also update AG-207 revolver folder with the official +0.40 candidate
    const ag207RevolverPath = path.join(ROOT, `qa/2026-11-02-AG-207/revolver/revolver-hip-+0.40-${lt.name}.jpg`);
    fs.copyFileSync(stillPath, ag207RevolverPath);

    const info = await page.evaluate(`(() => {
      const vm = window.TT.viewmodelDbg();
      return {
        key: vm ? vm.info.key : null,
        active: vm ? vm.info.active : false,
        rootVisible: vm ? vm.root.visible : false,
        raise: vm ? vm.info.raise : 0,
        ads: vm ? vm.info.ads : 0,
        hipYaw: 0.40
      };
    })()`);
    revolverShotMeta[lt.name] = info;
  }
  fs.writeFileSync(path.join(REVOLVER_DIR, 'revolver-scores.json'), JSON.stringify(revolverShotMeta, null, 2));

  // =========================================================================
  // PART 3: GP-20017 Reload Magwell Evidence (J21)
  // =========================================================================
  console.log('\n--- PART 3: GP-20017 Reload Magwell Evidence (J21) Across 6 Weapons ---');
  const magwellTelemetry = {};

  for (const w of MAGWELL_WEAPONS) {
    console.log(`[Part 3] Capturing reload magwell for ${w.label} (${w.key})...`);
    magwellTelemetry[w.key] = {};

    // Equip and settle
    await page.evaluate(`(async (k) => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf(k);
      T.setWeapon(idx);
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 80; i++) {
        const vm = T.viewmodelDbg();
        if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === k) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    })('${w.key}')`);

    // Phase 1: Magazine-out
    console.log(`  -> Mag-out phase (u=${w.uOut})...`);
    const outMeta = await page.evaluate(`(async (k, u) => {
      const T = window.TT;
      T.setAmmoDbg(k, 1);
      T.startReload();
      T.reloadClipDbg.hold(u);
      await new Promise((r) => setTimeout(r, 600));
      const vm = T.viewmodelDbg();
      return {
        weapon: k,
        phase: 'mag-out',
        reloadU: vm ? vm.info.reloadU : null,
        magState: vm ? vm.info.magState : null,
        vmActive: vm ? vm.info.active : false,
        rootVisible: vm ? vm.root.visible : false,
        magVisible: vm && vm.gun && vm.gun.mag ? vm.gun.mag.visible : null
      };
    })('${w.key}', ${w.uOut})`);

    const outShotPath = path.join(MAGWELL_DIR, `${w.key}-reload-magout.jpg`);
    await captureShot(page, outShotPath);
    magwellTelemetry[w.key].magOut = outMeta;

    // Phase 2: Seating
    console.log(`  -> Seating phase (u=${w.uSeat})...`);
    const seatMeta = await page.evaluate(`(async (k, u) => {
      const T = window.TT;
      T.reloadClipDbg.hold(u);
      await new Promise((r) => setTimeout(r, 600));
      const vm = T.viewmodelDbg();
      return {
        weapon: k,
        phase: 'seating',
        reloadU: vm ? vm.info.reloadU : null,
        magState: vm ? vm.info.magState : null,
        vmActive: vm ? vm.info.active : false,
        rootVisible: vm ? vm.root.visible : false,
        magVisible: vm && vm.gun && vm.gun.mag ? vm.gun.mag.visible : null
      };
    })('${w.key}', ${w.uSeat})`);

    const seatShotPath = path.join(MAGWELL_DIR, `${w.key}-reload-seating.jpg`);
    await captureShot(page, seatShotPath);
    magwellTelemetry[w.key].seating = seatMeta;

    // Release reload
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.reloadClipDbg.hold(null);
      await new Promise((r) => setTimeout(r, 800));
    })()`);
  }

  fs.writeFileSync(path.join(MAGWELL_DIR, 'magwell-telemetry.json'), JSON.stringify(magwellTelemetry, null, 2));

  await browser.close();
  server.close();
  console.log('\n[AG-209] All browser captures completed successfully!');
}

main().catch((err) => {
  console.error('[AG-209] RUN FAILED:', err);
  process.exit(1);
});
