// AG-207 Recapture with strict pre-shot viewmodel and firing assertions.
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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-02-AG-207');
const FLAMER_DIR = path.join(OUT_DIR, 'flamer');
const REVOLVER_DIR = path.join(OUT_DIR, 'revolver');
const MODEL40_DIR = path.join(OUT_DIR, 'model40cm');
const SHEETS_DIR = path.join(OUT_DIR, 'sheets');

fs.mkdirSync(FLAMER_DIR, { recursive: true });
fs.mkdirSync(REVOLVER_DIR, { recursive: true });
fs.mkdirSync(MODEL40_DIR, { recursive: true });
fs.mkdirSync(SHEETS_DIR, { recursive: true });

const WEAPONS_40CM = [
  { key: 'pistol', label: 'Pistol', hasAds: true, hasReload: true },
  { key: 'revolver', label: 'Revolver', hasAds: true, hasReload: true },
  { key: 'uzi', label: 'Wasp', hasAds: true, hasReload: true },
  { key: 'm4', label: 'GW-4', hasAds: true, hasReload: true },
  { key: 'ak', label: 'AK', hasAds: true, hasReload: true },
  { key: 'shotgun', label: 'Shotgun', hasAds: true, hasReload: true },
  { key: 'aa12', label: 'Breacher-12', hasAds: true, hasReload: true },
  { key: 'sniper', label: 'Sniper', hasAds: true, hasReload: true },
  { key: 'chainsaw', label: 'Chainsaw', hasAds: true, hasReload: false },
  { key: 'flamer', label: 'Flamer', hasAds: true, hasReload: false },
  { key: 'launcher', label: 'Launcher', hasAds: true, hasReload: false },
  { key: 'minigun', label: 'Minigun', hasAds: false, hasReload: false }, // hold ADS pending J18 dot
];

const LIGHTS = [
  { id: 'noon', label: 'Noon Daylight', time: 0.50, overcast: false, cloudCover: 0.15 },
  { id: 'overcast', label: 'Overcast Storm', time: 0.52, overcast: true, cloudCover: 0.95 },
  { id: 'dusk', label: 'Dusk Twilight', time: 0.77, overcast: false, cloudCover: 0.15 },
  { id: 'night', label: 'Night Ops', time: 0.95, overcast: false, cloudCover: 0.15 },
];

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'jpeg', quality: 90, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function equipAndAssert(page, key, { ads = false, reloadU = null } = {}) {
  const kStr = JSON.stringify(key);
  const adsStr = JSON.stringify(ads);
  const rUStr = JSON.stringify(reloadU);

  const res = await page.evaluate(`(async () => {
    const k = ${kStr};
    const isAds = ${adsStr};
    const rU = ${rUStr};
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // Ensure viewFirst is on
    T.setViewFirstDbg(true);

    // If unarmed (holstered), draw weapon
    if (T.isUnarmed()) {
      T.toggleHolster();
      await wait(150);
    }

    // Reset controls & reload holds
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
    }

    if (rU !== null) {
      T.setAmmoDbg(k, 1);
      T.startReload();
      T.reloadClipDbg.hold(rU);
    }

    // Settle loop: wait until viewmodel active, key matches, raise >= 0.99, fp.w >= 0.98
    for (let i = 0; i < 120; i++) {
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
    await wait(300);

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

    // Geometry assertion: verify gun mesh vertices exist and project inside screen
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

    return {
      weapon: curW,
      active: vm.info.active,
      key: vm.info.key,
      raise: vm.info.raise,
      ads: fp.ads,
      meshCount,
      inFrameVerts
    };
  })()`);

  console.log(`  [ASSERT PASS] ${key} (ads=${ads}, reloadU=${reloadU}) -> active=${res.active}, raise=${res.raise}, meshes=${res.meshCount}, inFrameVerts=${res.inFrameVerts}`);
  return res;
}

export async function runRecaptureAG207() {
  console.log('\n========================================================================');
  console.log('=== [AG-207 RECAPTURE] Live WebGPU RTX 5080 with Strict Assertions ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-207] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const telemetry = {
    date: '2026-11-02',
    task: 'AG-207-recapture',
    gpu: null,
    backend: null,
    assertionsVerified: true,
    flamerJ59: {
      tg: null,
      woods: null
    },
    revolverHipCandidate: {
      lights: {},
      metrics: null
    },
    model40cm: {},
    defects: []
  };

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    console.log('[AG-207] Booting game...');
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

    console.log('[AG-207] Initializing match and player state...');
    const initData = await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG207');
      if (T.clearZombies) T.clearZombies();
      T.setHp(100000);
      T.grantAllWeapons();
      T.setViewFirstDbg(true);
      if (T.isUnarmed()) T.toggleHolster();
      return {
        backend: T.renderer && T.renderer.isWebGPURenderer ? 'WebGPU' : 'WebGL',
        gpu: T.rendererDbg && T.rendererDbg.deviceInfo ? T.rendererDbg.deviceInfo() : (navigator.gpu ? 'WebGPU Device' : 'Unknown GPU')
      };
    })()`);

    telemetry.backend = initData.backend;
    telemetry.gpu = initData.gpu;
    console.log(`[AG-207] Backend: ${telemetry.backend}, GPU: ${JSON.stringify(telemetry.gpu)}`);

    // Helper functions inside browser context
    await page.evaluate(`(() => {
      const T = window.TT;
      const THREE = T.THREE;

      window.__ag207 = {
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

        setLighting(l) {
          T.setWorldTime(l.time);
          if (T.weather) {
            T.weather.raining = l.overcast;
            T.weather.intensity = l.overcast ? 0.6 : 0.0;
            T.weather.cloudCover = l.cloudCover;
          }
        },

        sampleFrame() {
          const W = window.innerWidth, H = window.innerHeight;
          const vm = T.viewmodelDbg && T.viewmodelDbg();
          const toPx = (ndc) => ndc ? [
            +((ndc.x * 0.5 + 0.5) * W).toFixed(2),
            +((0.5 - ndc.y * 0.5) * H).toFixed(2)
          ] : [0, 0];

          let muzzlePx = [0, 0], wristRPx = [0, 0], wristLPx = [0, 0];
          let vmActive = false;
          let vmFrameP = null, vmFrameEul = null;

          if (vm && vm.info && vm.info.active) {
            vmActive = true;
            if (vm.wrists) {
              if (vm.wrists.r && vm.wrists.r.p) wristRPx = toPx(vm.ndc(vm.wrists.r.p));
              if (vm.wrists.l && vm.wrists.l.p) wristLPx = toPx(vm.ndc(vm.wrists.l.p));
            }
            if (vm.frame) {
              if (vm.frame.p) vmFrameP = [vm.frame.p.x, vm.frame.p.y, vm.frame.p.z];
              if (vm.frame.q) {
                const eul = new THREE.Euler().setFromQuaternion(vm.frame.q, 'YXZ');
                vmFrameEul = [eul.x, eul.y, eul.z];
              }
            }
          }

          return {
            camPos: [T.camera.position.x, T.camera.position.y, T.camera.position.z],
            camRot: [T.camera.rotation.x, T.camera.rotation.y, T.camera.rotation.z],
            camFov: T.camera.fov,
            muzzlePx,
            wristRPx,
            wristLPx,
            vmActive,
            vmFrameP,
            vmFrameEul,
            ammo: T.getAmmo().flamer
          };
        }
      };
    })()`);

    // =========================================================================
    // PART 1: J59 Flamer Firing in First Person (Claude's Request)
    // =========================================================================
    console.log('\n--- PART 1: J59 Flamer 3s Firing in First Person (TG & Woods) ---');
    for (const seat of ['tg', 'woods']) {
      console.log(`[Part 1] Recording 3s flamer firing in seat: ${seat}...`);
      await page.evaluate(`window.__ag207.setSeat('${seat}')`);
      if (seat === 'woods') {
        await page.evaluate(`window.__ag207.setLighting({ time: 0.50, overcast: false, cloudCover: 0.15 })`);
      }

      // Equip and assert view gun is raised and active
      await equipAndAssert(page, 'flamer');

      // Start firing and verify stream state
      await page.evaluate(`(() => {
        const T = window.TT;
        T.flightInput({ keys: [], zoom: false, fire: true });
        T.setMouseFireDbg(true);
        for (let i = 0; i < 15; i++) T.stepFrame(1 / 60);
      })()`);

      // Assert flamer is actually firing
      const fireAssert = await page.evaluate(`(() => {
        const T = window.TT;
        const st = T.vmStateDbg ? T.vmStateDbg() : {};
        const ammoStart = T.getAmmo().flamer;
        for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
        const ammoNow = T.getAmmo().flamer;
        return {
          streamActive: !!st.stream,
          ammoStart,
          ammoNow,
          ammoDecreased: ammoNow < ammoStart
        };
      })()`);

      if (!fireAssert.streamActive && !fireAssert.ammoDecreased) {
        throw new Error(`ASSERTION FAILED: Flamer is NOT actively firing in ${seat} (streamActive=${fireAssert.streamActive}, ammo=${fireAssert.ammoNow}/${fireAssert.ammoStart})`);
      }
      console.log(`  [ASSERT PASS] Flamer firing verified in ${seat}: streamActive=${fireAssert.streamActive}, ammo=${fireAssert.ammoNow}`);

      // Now capture 90 frames (3.0s at 30fps)
      const seatFramesDir = path.join(FLAMER_DIR, `frames-${seat}`);
      fs.mkdirSync(seatFramesDir, { recursive: true });

      const framesData = [];
      const frameClip = { x: 0, y: 0, width: 1920, height: 1080, scale: 0.25 }; // 480x270 thumbnail

      for (let f = 0; f < 90; f++) {
        // Step 2 frames of 1/60 per sample = 30 fps
        const frameData = await page.evaluate(`(() => {
          const T = window.TT;
          T.flightInput({ keys: [], zoom: false, fire: true });
          T.setMouseFireDbg(true);
          T.stepFrame(1 / 60);
          T.stepFrame(1 / 60);
          return window.__ag207.sampleFrame();
        })()`);

        if (!frameData.vmActive) {
          throw new Error(`ASSERTION FAILED: vmActive became false at frame ${f} during flamer firing in ${seat}`);
        }
        framesData.push(frameData);

        // Capture frame via CDP
        const fNum = String(f).padStart(3, '0');
        const framePath = path.join(seatFramesDir, `flamer-${fNum}.jpg`);
        await captureShot(page, framePath, frameClip);
      }

      // Release fire
      await page.evaluate(`(() => {
        const T = window.TT;
        T.flightInput({ keys: [], zoom: false, fire: false });
        T.setMouseFireDbg(false);
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      })()`);

      // Calculate camera shake RMS (in cm)
      const cpos = framesData.map(f => f.camPos);
      const csq = [];
      for (let i = 2; i < cpos.length - 1; i++) {
        const cx = (cpos[i][0] - 0.5 * (cpos[i - 1][0] + cpos[i + 1][0])) * 100.0;
        const cy = (cpos[i][1] - 0.5 * (cpos[i - 1][1] + cpos[i + 1][1])) * 100.0;
        const cz = (cpos[i][2] - 0.5 * (cpos[i - 1][2] + cpos[i + 1][2])) * 100.0;
        csq.push(cx * cx + cy * cy + cz * cz);
      }
      const camShakeRmsCm = Math.sqrt(csq.reduce((a, b) => a + b, 0) / Math.max(1, csq.length));

      // Viewmodel stream pushback: vmFrameP[2] offset change
      const vmZ = framesData.filter(f => f.vmFrameP).map(f => f.vmFrameP[2]);
      const pushbackZ = vmZ.length ? (Math.max(...vmZ) - Math.min(...vmZ)) : 0;

      telemetry.flamerJ59[seat] = {
        framesCount: framesData.length,
        camShakeRmsCm: +camShakeRmsCm.toFixed(4),
        pushbackZ_m: +pushbackZ.toFixed(4),
        round0BaselineCm: 5.191,
        reductionPct: +((1 - camShakeRmsCm / 5.191) * 100).toFixed(1),
        frames: framesData
      };

      console.log(`[Part 1] Seat ${seat}: camShakeRms = ${camShakeRmsCm.toFixed(4)} cm (Round 0 baseline: 5.191 cm, reduction: ${telemetry.flamerJ59[seat].reductionPct}%, pushback: ${(pushbackZ * 100).toFixed(1)} cm)`);
    }

    // =========================================================================
    // PART 2: GP-20017 Revolver Hip Silhouette Candidate (ChatGPT's Request)
    // =========================================================================
    console.log('\n--- PART 2: GP-20017 Revolver Hip Silhouette Candidate on Jerry\'s GPU ---');
    await page.evaluate(`window.__ag207.setSeat('woods')`);
    await equipAndAssert(page, 'revolver');

    // Capture in 4 outdoor lights
    for (const light of LIGHTS) {
      console.log(`[Part 2] Capturing revolver hip in ${light.label}...`);
      await page.evaluate(`window.__ag207.setLighting(${JSON.stringify(light)})`);
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      })()`);

      await equipAndAssert(page, 'revolver');
      const shotPath = path.join(REVOLVER_DIR, `revolver-hip-${light.id}.jpg`);
      await captureShot(page, shotPath);
      telemetry.revolverHipCandidate.lights[light.id] = {
        shot: path.relative(ROOT, shotPath),
        label: light.label
      };
    }

    // Capture ADS and reload beats in Noon light
    await page.evaluate(`window.__ag207.setLighting(${JSON.stringify(LIGHTS[0])})`);
    
    // ADS capture
    await equipAndAssert(page, 'revolver', { ads: true });
    const revAdsPath = path.join(REVOLVER_DIR, 'revolver-ads-noon.jpg');
    await captureShot(page, revAdsPath);

    // Reload beats (.22, .58, .82)
    const revReloadShots = {};
    for (const beat of [0.22, 0.58, 0.82]) {
      await equipAndAssert(page, 'revolver', { reloadU: beat });
      const bPath = path.join(REVOLVER_DIR, `revolver-reload-${beat.toFixed(2)}.jpg`);
      await captureShot(page, bPath);
      revReloadShots[beat.toFixed(2)] = path.relative(ROOT, bPath);
    }
    await page.evaluate(`(() => { const T = window.TT; T.reloadClipDbg.hold(null); for (let i = 0; i < 30; i++) T.stepFrame(1/60); })()`);

    // Probe revolver geometry & pose details
    await equipAndAssert(page, 'revolver');
    const revProbe = await page.evaluate(`(() => {
      const T = window.TT;
      const vm = T.viewmodelDbg && T.viewmodelDbg();
      const gun = vm && vm.gun && vm.gun.root;
      const W = window.innerWidth, H = window.innerHeight;

      let cylinderFound = false, cylinderX = 0, cylinderVis = false;
      let craneFound = false, craneX = 0;
      let barrelFound = false;

      if (gun) {
        gun.traverse((o) => {
          if (o.name && o.name.toLowerCase().includes('cylinder')) {
            cylinderFound = true;
            cylinderX = o.position.x;
            cylinderVis = o.visible;
          }
          if (o.name && o.name.toLowerCase().includes('crane')) {
            craneFound = true;
            craneX = o.position.x;
          }
          if (o.name && o.name.toLowerCase().includes('barrel')) {
            barrelFound = true;
          }
        });
      }

      const muzzleLocal = (T.weaponMeshes.revolver && T.weaponMeshes.revolver.userData && T.weaponMeshes.revolver.userData.muzzleLocal)
        ? T.weaponMeshes.revolver.userData.muzzleLocal.clone() : new T.THREE.Vector3(0, 0.04, 0.22);
      const mzView = vm ? vm.viewPoint(muzzleLocal) : null;
      const mzNdc = mzView ? vm.ndc(mzView) : null;

      return {
        cylinderFound,
        cylinderX,
        cylinderVis,
        craneFound,
        craneX,
        barrelFound,
        muzzleNdcX: mzNdc ? mzNdc.x : 0,
        muzzleNdcY: mzNdc ? mzNdc.y : 0,
        wristR_ndc: vm && vm.wrists && vm.wrists.r ? vm.ndc(vm.wrists.r.p) : null,
        wristL_ndc: vm && vm.wrists && vm.wrists.l ? vm.ndc(vm.wrists.l.p) : null
      };
    })()`);

    telemetry.revolverHipCandidate.metrics = revProbe;
    telemetry.revolverHipCandidate.adsShot = path.relative(ROOT, revAdsPath);
    telemetry.revolverHipCandidate.reloadShots = revReloadShots;

    console.log(`[Part 2] Revolver metrics: cylinderFound=${revProbe.cylinderFound}, barrelFound=${revProbe.barrelFound}, muzzleNdcX=${revProbe.muzzleNdcX.toFixed(2)}`);

    // =========================================================================
    // PART 3: GP-20017 Round-3 Model-at-40cm Audit for All Weapons
    // =========================================================================
    console.log('\n--- PART 3: GP-20017 Round-3 Model-at-40cm Audit for Current Weapons ---');
    await page.evaluate(`window.__ag207.setSeat('woods')`);
    await page.evaluate(`window.__ag207.setLighting(${JSON.stringify(LIGHTS[0])})`); // Noon

    for (const w of WEAPONS_40CM) {
      console.log(`[Part 3] Auditing 40cm close-up model for ${w.label} (${w.key})...`);
      
      // 1. Hip Close-up Shot at 1080p
      const hipRes = await equipAndAssert(page, w.key);
      const hip1080Path = path.join(MODEL40_DIR, `${w.key}-hip-1080p.jpg`);
      await captureShot(page, hip1080Path);

      // 2. ADS Close-up Shot at 1080p (if hasAds)
      let adsShot = null;
      if (w.hasAds) {
        await equipAndAssert(page, w.key, { ads: true });
        const ads1080Path = path.join(MODEL40_DIR, `${w.key}-ads-1080p.jpg`);
        await captureShot(page, ads1080Path);
        adsShot = path.relative(ROOT, ads1080Path);
      }

      // 3. Reload Detail Shot at 1080p (if hasReload)
      let reloadShot = null;
      if (w.hasReload) {
        await equipAndAssert(page, w.key, { reloadU: 0.58 });
        const rel1080Path = path.join(MODEL40_DIR, `${w.key}-reload-1080p.jpg`);
        await captureShot(page, rel1080Path);
        reloadShot = path.relative(ROOT, rel1080Path);
      }

      telemetry.model40cm[w.key] = {
        label: w.label,
        hip1080: path.relative(ROOT, hip1080Path),
        ads1080: adsShot,
        reload1080: reloadShot,
        verifiedMeshes: hipRes.meshCount,
        verifiedInFrameVerts: hipRes.inFrameVerts
      };
    }

    // High-DPI 1440p comparison
    console.log('[Part 3] Capturing 1440p high-DPI comparisons...');
    await page.setViewport(2560, 1440, 1);
    await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); })()`);

    for (const wKey of ['pistol', 'revolver', 'm4', 'ak', 'sniper', 'flamer']) {
      await equipAndAssert(page, wKey);
      const h1440Path = path.join(MODEL40_DIR, `${wKey}-hip-1440p.jpg`);
      await captureShot(page, h1440Path);
      telemetry.model40cm[wKey].hip1440 = path.relative(ROOT, h1440Path);
    }

    // Reset viewport to 1080p
    await page.setViewport(1920, 1080, 1);
    await page.evaluate(`(() => { window.dispatchEvent(new Event('resize')); window.TT.stepFrame(1 / 60); })()`);

    // Save telemetry JSON
    fs.writeFileSync(path.join(OUT_DIR, 'ag207-telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('[AG-207] Telemetry successfully saved to ag207-telemetry.json');

  } finally {
    await browser.close();
    await server.close();
  }

  // Run python sheet & GIF processor
  console.log('[AG-207] Running Python sheet and GIF processor...');
  execFileSync('python', ['qa/2026-11-02-AG-208/build-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
  console.log('=== [AG-207] Recapture Complete ===\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRecaptureAG207().catch((e) => {
    console.error('Fatal AG-207 recapture error:', e);
    process.exit(1);
  });
}
