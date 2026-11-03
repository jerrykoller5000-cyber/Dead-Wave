// AG-202 Round 1 Recapture: Woods Stills & 90-Frame Animated GIFs with Strict Assertions
// Runs under shared game-test slot on Jerry's RTX 5080 WebGPU hardware.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const R1_DIR = path.join(ROOT, 'qa/2026-11-02-AG-202/round1');
const STILLS_DIR = path.join(R1_DIR, 'stills');
const FRAMES_DIR = path.join(R1_DIR, 'frames');
const GIFS_DIR = path.join(R1_DIR, 'gifs');

fs.mkdirSync(STILLS_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(GIFS_DIR, { recursive: true });

const WEAPONS = [
  { key: 'pistol', label: 'Pistol', kind: 'vm' },
  { key: 'revolver', label: 'Revolver', kind: 'vm' },
  { key: 'm4', label: 'GW-4 (M4)', kind: 'vm' }
];

const STILL_NAMES = ['hip', 'ads', 'sprint', 'fire-peak', 'reload-out', 'reload-in', 'reload-home'];
const STRIP_NAMES = ['walk', 'run', 'strafe', 'flick90', 'burst', 'jump'];

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'jpeg', quality: 86, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function equipAndAssert(page, key, { ads = false, reloadU = null, sprint = false, firePeak = false } = {}) {
  const kStr = JSON.stringify(key);
  const adsStr = JSON.stringify(ads);
  const rUStr = JSON.stringify(reloadU);
  const sprintStr = JSON.stringify(sprint);
  const firePeakStr = JSON.stringify(firePeak);

  const res = await page.evaluate(`(async () => {
    const k = ${kStr};
    const isAds = ${adsStr};
    const rU = ${rUStr};
    const isSprint = ${sprintStr};
    const isFirePeak = ${firePeakStr};
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // Ensure first person
    T.setViewFirstDbg(true);

    // If unarmed (holstered), draw weapon
    if (T.isUnarmed()) {
      T.toggleHolster();
      await wait(150);
    }

    // Cancel any reload/zoom/flight state
    T.flightHold(true);
    T.reloadClipDbg.hold(null);
    T.flightInput({ keys: [], zoom: false, fire: false });
    T.setMouseFireDbg(false);
    T.setZoomHeldDbg(false);

    // Switch weapon
    const idx = T.WEAPON_ORDER.indexOf(k);
    if (idx < 0) throw new Error('Unknown weapon key: ' + k);
    for (let i = 0; i < 40 && T.getCurrentWeapon() !== k; i++) {
      T.setWeapon(idx);
      await wait(100);
    }
    T.setAmmoDbg(k, 9999);

    if (isAds) {
      T.setZoomHeldDbg(true);
    } else if (isSprint) {
      T.flightInput({ keys: ['KeyW', 'ShiftLeft'], zoom: false, fire: false });
    } else if (isFirePeak) {
      T.flightInput({ keys: [], zoom: false, fire: true });
      T.setMouseFireDbg(true);
      T.stepFrame(1 / 60);
      T.stepFrame(1 / 60);
      T.flightInput({ keys: [], zoom: false, fire: false });
      T.setMouseFireDbg(false);
    }

    if (rU !== null) {
      T.setAmmoDbg(k, 1);
      T.startReload();
      T.reloadClipDbg.hold(rU);
    }

    // Settle loop
    for (let i = 0; i < 100; i++) {
      const vm = T.viewmodelDbg();
      const fp = T.fpDbg();
      const ready = vm && vm.info && vm.info.active &&
                    vm.info.key === k &&
                    vm.info.raise >= 0.99 &&
                    fp.first &&
                    fp.w >= 0.98 &&
                    (!isAds || fp.ads >= 0.95);
      if (ready) break;
      T.stepFrame(1 / 60);
      await wait(40);
    }
    await wait(250);

    // STRICT PRE-SHOT ASSERTIONS
    const vm = T.viewmodelDbg();
    const fp = T.fpDbg();
    const curW = T.getCurrentWeapon();

    const errors = [];
    if (curW !== k) errors.push("weapon in hand is '" + curW + "', expected '" + k + "'");
    if (!fp.first) errors.push("fp.first is false");
    if (fp.w < 0.95) errors.push("fp.w is " + fp.w + ", expected >= 0.95");
    if (!vm) errors.push("viewmodelDbg() is null");
    else {
      if (!vm.info.active) errors.push("viewmodelDbg().info.active is false");
      if (vm.info.key !== k) errors.push("viewmodelDbg().info.key is '" + vm.info.key + "', expected '" + k + "'");
      if (vm.info.raise < 0.99) errors.push("viewmodelDbg().info.raise is " + vm.info.raise + ", expected >= 0.99");
    }

    // Geometry assertion
    let meshCount = 0;
    let inFrameVerts = 0;
    if (vm && vm.gun && vm.gun.root) {
      vm.gun.root.traverse((m) => {
        if (m.isMesh && m.visible) meshCount++;
      });
    }

    if (vm && vm.frame && vm.frame.p) {
      const frameNdc = vm.ndc(vm.frame.p);
      if (frameNdc && frameNdc.x >= -1.2 && frameNdc.x <= 1.2 && frameNdc.y >= -1.2 && frameNdc.y <= 1.2) {
        inFrameVerts++;
      }
    }

    const src = T.weaponMeshes[k];
    const mzLocal = (src && src.userData && src.userData.muzzleLocal) ? src.userData.muzzleLocal.clone() : new T.THREE.Vector3(0, 0.04, 0.25);
    if (vm && vm.viewPoint) {
      const mzView = vm.viewPoint(mzLocal);
      const mzNdc = vm.ndc(mzView);
      if (mzNdc && mzNdc.x >= -1.2 && mzNdc.x <= 1.2 && mzNdc.y >= -1.2 && mzNdc.y <= 1.2) {
        inFrameVerts++;
      }
    }

    if (meshCount === 0) errors.push("viewmodel gun has 0 visible meshes");
    if (inFrameVerts === 0) errors.push("viewmodel gun frame/muzzle projected outside screen NDC");

    if (errors.length > 0) {
      throw new Error("PRE-SHOT ASSERTION FAILED [" + k + ", ads=" + isAds + ", reloadU=" + rU + "]: " + errors.join("; "));
    }

    // Sample trace metrics
    const W = window.innerWidth, H = window.innerHeight;
    const toPx = (ndc) => ndc ? [
      +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
      +((0.5 - ndc.y * 0.5) * H).toFixed(2),
      +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
    ] : [0, 0, 0];

    const mzView = vm.viewPoint(mzLocal);
    const muzzlePx = toPx(vm.ndc(mzView));
    const wristRPx = (vm.wrists && vm.wrists.r && vm.wrists.r.p) ? toPx(vm.ndc(vm.wrists.r.p)) : [0, 0, 0];
    const wristLPx = (vm.wrists && vm.wrists.l && vm.wrists.l.p) ? toPx(vm.ndc(vm.wrists.l.p)) : [0, 0, 0];

    return {
      weapon: curW,
      active: vm.info.active,
      key: vm.info.key,
      raise: vm.info.raise,
      ads: fp.ads,
      meshCount,
      inFrameVerts,
      trace: {
        muzzle: muzzlePx,
        wristR: wristRPx,
        wristL: wristLPx,
        vmActive: true,
        camFov: +T.camera.fov.toFixed(2),
        camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)]
      }
    };
  })()`);

  return res;
}

export async function runRecaptureAG202R1() {
  console.log('\n========================================================================');
  console.log('=== [AG-202-R1 RECAPTURE] Woods Stills & 90-Frame Verified GIFs ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-202-R1] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const allTraces = {
    generatedAt: new Date().toISOString(),
    stills: {},
    strips: {}
  };

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    console.log('[AG-202-R1] Booting game...');
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

    console.log('[AG-202-R1] Starting match and setting up player...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG202R1');
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();
    })()`);

    // Helper functions inside browser context
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag202r1 = {
        setSeat(seat) {
          if (seat === 'tg') {
            if (!T.trainingDbg.state().active) T.trainingDbg.enter();
            const tg = T.trainingDbg.tg();
            T.player.position.set(tg.spawn.x, tg.floorY, tg.spawn.z);
            T.player.rotation.y = tg.spawn.yaw;
            T.setAimYawDbg(tg.spawn.yaw);
            T.setOtsAimDbg(tg.spawn.yaw, 0);
            T.setVelDbg(0, 0);
          } else {
            if (T.trainingDbg.state().active) T.trainingDbg.leave();
            T.clearZombies && T.clearZombies();
            T.player.position.set(0.48, -3.17, 13.91);
            T.player.rotation.y = 1.05;
            T.setAimYawDbg(1.05);
            T.setOtsAimDbg(1.05, 0.0);
            T.setVelDbg(0, 0);
          }
        },

        sampleStripFrame(wKey) {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2),
            +((ndc.d ?? ndc.z ?? 0)).toFixed(4)
          ] : [0, 0, 0];

          let muzzlePx = [0, 0, 0], wristRPx = [0, 0, 0], wristLPx = [0, 0, 0];
          let vmActive = false;
          let vmFrameP = null, vmFrameEul = null;

          if (vm && vm.info && vm.info.active) {
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

          return {
            muzzle: muzzlePx,
            wristR: wristRPx,
            wristL: wristLPx,
            vmActive,
            camFov: +T.camera.fov.toFixed(2),
            camPos: [+T.camera.position.x.toFixed(4), +T.camera.position.y.toFixed(4), +T.camera.position.z.toFixed(4)],
            vmPos: vmFrameP,
            vmRot: vmFrameEul
          };
        }
      };
    })()`);

    // =========================================================================
    // PART 1: Woods Stills Recapture at 1080p and 1440p
    // =========================================================================
    console.log('\n--- PART 1: Capturing Woods Stills with Strict Pre-Shot Assertions ---');
    await page.evaluate(`window.__ag202r1.setSeat('woods')`);

    for (const [resKey, vp] of [['1080p', { width: 1920, height: 1080 }], ['1440p', { width: 2560, height: 1440 }]]) {
      await page.setViewport(vp.width, vp.height, 1);
      await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); })()`);

      const seatDir = path.join(STILLS_DIR, `woods-${resKey}`);
      fs.mkdirSync(seatDir, { recursive: true });
      console.log(`[Part 1] Capturing Woods seat at ${resKey}...`);

      for (const wSpec of WEAPONS) {
        for (const stName of STILL_NAMES) {
          const isAds = stName === 'ads';
          const isSprint = stName === 'sprint';
          const isFirePeak = stName === 'fire-peak';
          let reloadU = null;
          if (stName.startsWith('reload-')) {
            const sub = stName.slice(7);
            const uMap = {
              revolver: { out: 0.20, in: 0.58, home: 0.86 },
              default:  { out: 0.22, in: 0.58, home: 0.84 }
            };
            reloadU = (uMap[wSpec.key] || uMap.default)[sub];
          }

          // Equip and assert
          const eqRes = await equipAndAssert(page, wSpec.key, { ads: isAds, reloadU, sprint: isSprint, firePeak: isFirePeak });
          const id = `woods-${resKey}-${wSpec.key}-${stName}`;
          allTraces.stills[id] = eqRes.trace;

          const stillPath = path.join(seatDir, `${wSpec.key}-${stName}.jpg`);
          await captureShot(page, stillPath);
          console.log(`  -> Saved ${wSpec.key} ${stName} @ ${resKey}`);
        }
      }
    }

    // Reset viewport to 1080p for motion strips
    await page.setViewport(1920, 1080, 1);
    await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); })()`);

    // =========================================================================
    // PART 2: 18 Motion Strips & 90-Frame Animated GIFs (Training Ground)
    // =========================================================================
    console.log('\n--- PART 2: Capturing 18 Motion Strips & 90-Frame Animated GIFs (TG) ---');
    await page.evaluate(`window.__ag202r1.setSeat('tg')`);

    const frameClip = { x: 0, y: 0, width: 1920, height: 1080, scale: 0.25 }; // 480x270 thumbnail

    for (const wSpec of WEAPONS) {
      const wFrameDir = path.join(FRAMES_DIR, `${wSpec.key}-1080p`);
      fs.mkdirSync(wFrameDir, { recursive: true });

      for (const stripName of STRIP_NAMES) {
        console.log(`[Part 2] Running strip: ${wSpec.key} - ${stripName} (90 frames)...`);

        // Equip and assert view gun is raised
        await equipAndAssert(page, wSpec.key);

        const stripFrames = [];
        const isBurst = stripName === 'burst';
        let burstAmmoStart = null;

        if (isBurst) {
          burstAmmoStart = await page.evaluate(`window.TT.getAmmo()['${wSpec.key}']`);
        }

        for (let f = 0; f < 90; f++) {
          const t = f * (1 / 30);

          // Apply inputs
          await page.evaluate(`((strip, f, t, wKey) => {
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
            T.stepFrame(1 / 60);
            T.stepFrame(1 / 60);
          })('${stripName}', ${f}, ${t}, '${wSpec.key}')`);

          // Read sample trace
          const sample = await page.evaluate(`window.__ag202r1.sampleStripFrame('${wSpec.key}')`);
          if (!sample.vmActive) {
            throw new Error(`ASSERTION FAILED: ${wSpec.key} vmActive became false at frame ${f} during strip ${stripName}`);
          }
          sample.f = f;
          sample.t = +t.toFixed(4);
          stripFrames.push(sample);

          // Capture real rendered frame via CDP
          const fNum = String(f).padStart(3, '0');
          const fPath = path.join(wFrameDir, `${stripName}-${fNum}.jpg`);
          await captureShot(page, fPath, frameClip);
        }

        // Release inputs
        await page.evaluate(`(() => {
          const T = window.TT;
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
        })()`);

        if (isBurst) {
          const burstAmmoEnd = await page.evaluate(`window.TT.getAmmo()['${wSpec.key}']`);
          if (burstAmmoEnd >= burstAmmoStart) {
            throw new Error(`ASSERTION FAILED: Burst firing did not consume ammo for ${wSpec.key} (start=${burstAmmoStart}, end=${burstAmmoEnd})`);
          }
          console.log(`  [ASSERT PASS] ${wSpec.key} burst consumed ammo: ${burstAmmoStart} -> ${burstAmmoEnd}`);
        }

        allTraces.strips[`${wSpec.key}-${stripName}`] = stripFrames;
        console.log(`  [ASSERT PASS] ${wSpec.key} ${stripName}: 90 real frames captured successfully`);
      }
    }

    // Save updated traces.json
    fs.writeFileSync(path.join(R1_DIR, 'traces.json'), JSON.stringify(allTraces, null, 2));
    console.log('[AG-202-R1] Saved updated traces.json');

  } finally {
    await browser.close();
    await server.close();
  }

  // Run Python sheet and GIF processor
  console.log('[AG-202-R1] Running Python sheet and GIF processor...');
  execFileSync('python', ['qa/2026-11-02-AG-208/build-ag202-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
  console.log('=== [AG-202-R1] Recapture Complete ===\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRecaptureAG202R1().catch((e) => {
    console.error('Fatal AG-202-R1 recapture error:', e);
    process.exit(1);
  });
}
