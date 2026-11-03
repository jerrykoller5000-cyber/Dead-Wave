// AG-207: J59 Flamer 1P Firing, GP-20017 Revolver Hip Candidate, and 40cm Weapon Model Audit
// Evaluated on NVIDIA GeForce RTX 5080 WebGPU hardware through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('=== [AG-207] Running Comprehensive Real WebGPU Visual & Physics Gate ===');
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-207] Server running at:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const telemetry = {
    date: '2026-11-02',
    task: 'AG-207',
    gpu: null,
    backend: null,
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
        stripCanvas: null,
        stripCtx: null,

        initCanvas(w, h) {
          this.stripCanvas = document.createElement('canvas');
          this.stripCanvas.width = w;
          this.stripCanvas.height = h;
          this.stripCtx = this.stripCanvas.getContext('2d', { willReadFrequently: true });
        },

        captureCanvasFrame() {
          if (!this.stripCanvas) this.initCanvas(480, 270);
          try {
            this.stripCtx.drawImage(T.renderer.domElement, 0, 0, this.stripCanvas.width, this.stripCanvas.height);
            return this.stripCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          } catch (e) {
            return null;
          }
        },

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

        equip(key) {
          const idx = T.WEAPON_ORDER.indexOf(key);
          if (idx >= 0) T.setWeapon(idx);
          T.setAmmoDbg(key, 9999);
          T.flightHold(true);
          T.reloadClipDbg.hold(null);
          T.flightInput({ keys: [], zoom: false, fire: false });
          T.setMouseFireDbg(false);
          T.setZoomHeldDbg(false);
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
            vmFrameEul
          };
        }
      };
    })()`);

    // =========================================================================
    // PART 1: J59 Flamer Firing in First Person (Claude's Request)
    // =========================================================================
    console.log('\n--- PART 1: J59 Flamer 3s Firing in First Person ---');
    for (const seat of ['tg', 'woods']) {
      console.log(`[Part 1] Recording 3s flamer firing in seat: ${seat}...`);
      await page.evaluate(`window.__ag207.setSeat('${seat}')`);
      if (seat === 'woods') {
        await page.evaluate(`window.__ag207.setLighting({ time: 0.50, overcast: false, cloudCover: 0.15 })`);
      }
      await page.evaluate(`window.__ag207.equip('flamer')`);

      // Let settle for 30 frames
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      })()`);

      // Now fire continuously for 3.0s at 30fps (90 frames)
      const seatFramesDir = path.join(FLAMER_DIR, `frames-${seat}`);
      fs.mkdirSync(seatFramesDir, { recursive: true });

      const framesData = [];
      for (let f = 0; f < 90; f++) {
        // Step 2 frames of 1/60 per sample = 30 fps
        const frameInfo = await page.evaluate(`(() => {
          const T = window.TT;
          T.flightInput({ keys: [], zoom: false, fire: true });
          T.setMouseFireDbg(true);
          T.stepFrame(1 / 60);
          T.stepFrame(1 / 60);
          const data = window.__ag207.sampleFrame();
          const shotB64 = window.__ag207.captureCanvasFrame();
          return { data, shotB64 };
        })()`);

        framesData.push(frameInfo.data);
        if (frameInfo.shotB64) {
          const fNum = String(f).padStart(3, '0');
          fs.writeFileSync(path.join(seatFramesDir, `flamer-${fNum}.jpg`), Buffer.from(frameInfo.shotB64, 'base64'));
        }
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
        const cx = cpos[i][0] - 0.5 * (cpos[i - 1][0] + cpos[i + 1][0]);
        const cy = cpos[i][1] - 0.5 * (cpos[i - 1][1] + cpos[i + 1][1]);
        const cz = cpos[i][2] - 0.5 * (cpos[i - 1][2] + cpos[i + 1][2]);
        csq.append ? csq.append((cx*cx + cy*cy + cz*cz)*10000.0) : csq.push((cx*cx + cy*cy + cz*cz)*10000.0);
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

      console.log(`[Part 1] Seat ${seat}: camShakeRms = ${camShakeRmsCm.toFixed(4)} cm (Round 0 baseline: 5.191 cm, reduction: ${telemetry.flamerJ59[seat].reductionPct}%)`);
    }

    // =========================================================================
    // PART 2: GP-20017 Revolver Hip Silhouette Candidate (ChatGPT's Request)
    // =========================================================================
    console.log('\n--- PART 2: GP-20017 Revolver Hip Silhouette Candidate on Jerry\'s GPU ---');
    await page.evaluate(`window.__ag207.setSeat('woods')`);
    await page.evaluate(`window.__ag207.equip('revolver')`);

    // Settle loop
    await page.evaluate(`(async () => {
      const T = window.TT;
      for (let i = 0; i < 45; i++) {
        T.stepFrame(1 / 60);
      }
    })()`);

    // Capture in 4 outdoor lights
    for (const light of LIGHTS) {
      console.log(`[Part 2] Capturing revolver hip in ${light.label}...`);
      await page.evaluate(`window.__ag207.setLighting(${JSON.stringify(light)})`);
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      })()`);

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
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
    })()`);
    const revAdsPath = path.join(REVOLVER_DIR, 'revolver-ads-noon.jpg');
    await captureShot(page, revAdsPath);
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setZoomHeldDbg(false);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    })()`);

    // Reload beats (.22, .58, .82)
    const revReloadShots = {};
    for (const beat of [0.22, 0.58, 0.82]) {
      await page.evaluate(`((u) => {
        const T = window.TT;
        T.reloadClipDbg.hold(u);
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      })(${beat})`);
      const bPath = path.join(REVOLVER_DIR, `revolver-reload-${beat.toFixed(2)}.jpg`);
      await captureShot(page, bPath);
      revReloadShots[beat.toFixed(2)] = path.relative(ROOT, bPath);
    }
    await page.evaluate(`(() => { const T = window.TT; T.reloadClipDbg.hold(null); for (let i = 0; i < 30; i++) T.stepFrame(1/60); })()`);

    // Probe revolver geometry & pose details
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

    // =========================================================================
    // PART 3: GP-20017 Round-3 Model-at-40cm Audit for All Weapons
    // =========================================================================
    console.log('\n--- PART 3: GP-20017 Round-3 Model-at-40cm Audit for Current Weapons ---');
    await page.evaluate(`window.__ag207.setSeat('woods')`);
    await page.evaluate(`window.__ag207.setLighting(${JSON.stringify(LIGHTS[0])})`); // Noon

    for (const w of WEAPONS_40CM) {
      console.log(`[Part 3] Auditing 40cm close-up model for ${w.label} (${w.key})...`);
      await page.evaluate(`window.__ag207.equip('${w.key}')`);

      // Real-time GPU settle (45 frames)
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
      })()`);

      // 1. Hip Close-up Shot at 1080p
      const hip1080Path = path.join(MODEL40_DIR, `${w.key}-hip-1080p.jpg`);
      await captureShot(page, hip1080Path);

      // 2. ADS Close-up Shot at 1080p (if hasAds)
      let ads1080Path = null;
      if (w.hasAds) {
        await page.evaluate(`(() => {
          const T = window.TT;
          T.setZoomHeldDbg(true);
          for (let i = 0; i < 40; i++) T.stepFrame(1 / 60);
        })()`);
        ads1080Path = path.join(MODEL40_DIR, `${w.key}-ads-1080p.jpg`);
        await captureShot(page, ads1080Path);
        await page.evaluate(`(() => {
          const T = window.TT;
          T.setZoomHeldDbg(false);
          for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
        })()`);
      }

      // 3. Reload Detail Shot at 1080p (if hasReload)
      let reload1080Path = null;
      if (w.hasReload) {
        const beat = (w.key === 'revolver' ? 0.22 : (w.key === 'sniper' ? 0.50 : 0.52));
        await page.evaluate(`((u) => {
          const T = window.TT;
          T.reloadClipDbg.hold(u);
          for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
        })(${beat})`);
        reload1080Path = path.join(MODEL40_DIR, `${w.key}-reload-1080p.jpg`);
        await captureShot(page, reload1080Path);
        await page.evaluate(`(() => { const T = window.TT; T.reloadClipDbg.hold(null); for (let i = 0; i < 30; i++) T.stepFrame(1/60); })()`);
      }

      // Telemetry audit for 40cm features:
      // Sights, receiver/slide, mag/magwell (J21), z-fighting / coplanar
      const auditDetails = await page.evaluate(`((wKey) => {
        const T = window.TT;
        const vm = T.viewmodelDbg && T.viewmodelDbg();
        const gun = vm && vm.gun && vm.gun.root;
        const srcMesh = T.weaponMeshes[wKey];

        let meshCount = 0;
        let totalVerts = 0;
        let magMesh = null, magwellMesh = null;
        let sightMesh = null;
        const partNames = [];

        if (gun) {
          gun.traverse((o) => {
            if (o.isMesh) {
              meshCount++;
              if (o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
                totalVerts += o.geometry.attributes.position.count;
              }
              const nm = (o.name || '').toLowerCase();
              partNames.push(o.name || 'unnamed');
              if (nm.includes('mag') || nm.includes('clip')) magMesh = o.name;
              if (nm.includes('well') || nm.includes('receiver') || nm.includes('body')) magwellMesh = o.name;
              if (nm.includes('sight') || nm.includes('post') || nm.includes('dot') || nm.includes('notch') || nm.includes('leaf')) sightMesh = o.name;
            }
          });
        }

        return {
          meshCount,
          totalVerts,
          magMesh,
          magwellMesh,
          sightMesh,
          partNames: partNames.slice(0, 15)
        };
      })('${w.key}')`);

      telemetry.model40cm[w.key] = {
        label: w.label,
        hip1080: path.relative(ROOT, hip1080Path),
        ads1080: ads1080Path ? path.relative(ROOT, ads1080Path) : null,
        reload1080: reload1080Path ? path.relative(ROOT, reload1080Path) : null,
        audit: auditDetails
      };
    }

    // Now test 1440p (2560x1440) for key subset of weapons
    console.log('\n[Part 3] Testing 1440p (2560x1440) high-res viewport for representative weapons...');
    await page.setViewport(2560, 1440);
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.onResizeDbg) T.onResizeDbg();
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    })()`);

    for (const wKey of ['pistol', 'revolver', 'm4', 'ak', 'sniper', 'flamer']) {
      await page.evaluate(`window.__ag207.equip('${wKey}')`);
      await page.evaluate(`(() => { const T = window.TT; for (let i = 0; i < 30; i++) T.stepFrame(1/60); })()`);
      const hip1440Path = path.join(MODEL40_DIR, `${wKey}-hip-1440p.jpg`);
      await captureShot(page, hip1440Path);
      telemetry.model40cm[wKey].hip1440 = path.relative(ROOT, hip1440Path);
    }

    console.log('[AG-207] Browser captures complete. Saving telemetry JSON...');
    fs.writeFileSync(path.join(OUT_DIR, 'ag207-telemetry.json'), JSON.stringify(telemetry, null, 2));

  } finally {
    await browser.close();
    server.close();
  }
  console.log('=== [AG-207] Browser run finished successfully ===');
}

main().catch((err) => {
  console.error('[AG-207] ERROR:', err);
  process.exit(1);
});
