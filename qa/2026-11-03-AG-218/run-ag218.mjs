// AG-218 Runner: CL-300 Near Stone Wall Reshoot at 3/10/30 m across Noon & Dusk
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG218_DIR = path.join(ROOT, 'qa/2026-11-03-AG-218');
const CAPTURES_DIR = path.join(AG218_DIR, 'captures');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(CAPTURES_DIR, { recursive: true });

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 90,
    captureBeyondViewport: false
  });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function runPass(mode, serverOrigin, browser) {
  let url = `${serverOrigin}/index.html?solid=1&debug=1&raf=timer`;
  if (mode === 'slabs') url += '&walls=slabs';
  if (mode === 'hedge') url += '&walls=hedge';

  console.log(`\n======================================================`);
  console.log(`=== STARTING PASS: ${mode.toUpperCase()} ===`);
  console.log(`======================================================`);
  console.log(`Navigating to: ${url}`);

  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(url, { timeout: 180000 });

  if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
    throw new Error('window.TT never appeared');
  }

  // Dismiss opening card if present
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

  // Inject lib.js
  const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
  await page.evaluate(libCode);

  // Start match as JERRY
  console.log('  -> Starting match via startMatch(T, \'JERRY\')...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'JERRY');
    if (T.clearZombies) T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.flightHold(true);
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
    return 1;
  })()`, 180000);

  // Settle and verify wall bands
  const wallInit = await page.evaluate(`(() => {
    const T = window.TT;
    const scene = T.scene;
    const stoneGroup = scene.getObjectByName('stone-wall-bands');
    const bands = T.wallBandsDbg.bands();
    return {
      hasStoneGroup: !!stoneGroup,
      stoneGroupVisible: stoneGroup ? stoneGroup.visible : false,
      stoneUserData: stoneGroup ? stoneGroup.userData : null,
      bandKinds: bands.map(b => b.kind),
      totalBands: bands.length
    };
  })()`);

  console.log(`  -> Wall bands count: ${wallInit.totalBands}. Stone group present: ${wallInit.hasStoneGroup}`);
  if (mode !== 'hedge') {
    if (!wallInit.hasStoneGroup || !wallInit.stoneGroupVisible) {
      throw new Error(`ASSERTION FAILED: stone-wall-bands not present or not visible in mode ${mode}!`);
    }
    console.log(`  -> Mode ${mode} Mesh Stats:`, JSON.stringify(wallInit.stoneUserData));
  } else {
    if (wallInit.hasStoneGroup) {
      throw new Error('ASSERTION FAILED: stone-wall-bands present in ?walls=hedge mode!');
    }
    console.log('  -> Confirmed ?walls=hedge: stone-wall-bands absent, hedge active.');
  }

  // Switch to first person and equip launcher
  console.log('  -> Switching to First Person & Jerry\'s Launcher...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setShotView(null);
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    const idx = T.WEAPON_ORDER.indexOf('launcher');
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'launcher'; i++) {
      T.setWeapon(idx);
      await new Promise(r => setTimeout(r, 150));
    }
    for (let i = 0; i < 45; i++) T.stepFrame(1 / 30);
  })()`);

  // Wait for launcher viewmodel ready and OTS settled
  await page.evaluate(`(async () => {
    const T = window.TT;
    for (let i = 0; i < 90; i++) {
      const vm = T.viewmodelDbg();
      const ots = T.otsDbg ? T.otsDbg() : null;
      if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === 'launcher' && ots && ots.w >= 0.95) break;
      T.stepFrame(1 / 30);
    }
  })()`);

  const spots = [
    { id: 'hq', label: 'HQ Ring (Yard Side)', bandKind: 'hq-thicket', targetRef: { x: 58.6, z: -16.2 } },
    { id: 'qnw', label: 'Quarter-NW (Near 83, 50)', bandKind: 'quarter-nw', targetRef: { x: 83.0, z: 50.0 } }
  ];

  const distances = [3, 10, 30];
  const lights = [
    { id: 'noon', worldTime: 0.50 },
    { id: 'dusk', worldTime: 0.77 }
  ];

  const results = [];

  for (const spot of spots) {
    console.log(`\n  Evaluating Spot: ${spot.label}`);

    const spotGeo = await page.evaluate(`((spotSpec) => {
      const T = window.TT;
      const bands = T.wallBandsDbg.bands();
      const band = bands.find(b => b.kind === spotSpec.bandKind);
      if (!band || !band.pts || band.pts.length < 2) throw new Error('Valid band pts not found: ' + spotSpec.bandKind);

      const pts = band.pts;
      const stepM = 2.1;
      const lens = [0];
      for (let i = 1; i < pts.length; i++) {
        lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
      }
      const totalLen = lens[lens.length - 1];

      const stations = [];
      for (let at = 0; at <= totalLen; at += stepM) {
        let i = 1;
        while (i < lens.length - 1 && lens[i] < at) i++;
        const seg = lens[i] - lens[i - 1];
        const t = seg > 0 ? (at - lens[i - 1]) / seg : 0;
        const a = pts[i - 1], b = pts[i];
        const alongX = seg > 0 ? (b.x - a.x) / seg : 1;
        const alongZ = seg > 0 ? (b.z - a.z) / seg : 0;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        stations.push({
          x: x, z: z,
          alongX: alongX, alongZ: alongZ,
          yaw: Math.atan2(alongX, alongZ)
        });
      }

      let nearestSt = stations[0];
      let minRefDist = Infinity;
      for (const st of stations) {
        const d = Math.hypot(st.x - spotSpec.targetRef.x, st.z - spotSpec.targetRef.z);
        if (d < minRefDist) {
          minRefDist = d;
          nearestSt = st;
        }
      }

      const wallX = nearestSt.x;
      const wallZ = nearestSt.z;
      const distCenter = Math.hypot(wallX, wallZ);

      let yardNormX, yardNormZ;
      if (spotSpec.id === 'hq') {
        const len = Math.hypot(wallX, wallZ);
        yardNormX = -wallX / len;
        yardNormZ = -wallZ / len;
      } else {
        yardNormX = -0.8462;
        yardNormZ = 0.5328;
      }

      const lookDirX = -yardNormX;
      const lookDirZ = -yardNormZ;
      const aimYaw = Math.atan2(lookDirX, lookDirZ);

      return {
        targetStation: { x: wallX, z: wallZ },
        stationsCount: stations.length,
        distCenter: distCenter,
        yardNorm: { x: yardNormX, z: yardNormZ },
        aimYaw: aimYaw
      };
    })(${JSON.stringify(spot)})`);

    console.log(`    Target Wall Station: (${spotGeo.targetStation.x.toFixed(2)}, ${spotGeo.targetStation.z.toFixed(2)}) | distCenter = ${spotGeo.distCenter.toFixed(2)} m`);

    for (const dist of distances) {
      for (const light of lights) {
        const shotId = `${mode}_${spot.id}_${dist}m_${light.id}`;
        console.log(`    -> Capturing ${shotId}...`);

        const telemetry = await page.evaluate(`(async (spec) => {
          const T = window.TT;
          T.setWorldTime(spec.worldTime);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }

          const px = spec.targetStation.x + spec.dist * spec.yardNorm.x;
          const pz = spec.targetStation.z + spec.dist * spec.yardNorm.z;
          const py = T.sampleHeight(px, pz);

          T.player.position.set(px, py, pz);
          if (T.localPlayer && T.localPlayer.position) {
            T.localPlayer.position.set(px, py, pz);
          }
          T.setOtsAimDbg(spec.aimYaw, 0.0);

          if (T.isUnarmed()) T.toggleHolster();
          if (T.getCurrentWeapon() !== 'launcher') {
            const idx = T.WEAPON_ORDER.indexOf('launcher');
            T.setWeapon(idx);
          }
          T.setViewFirstDbg(true);

          // Step frames so camera LOD tick executes onBeforeRender and updates cell LOD, and ensure viewmodel raised
          for (let i = 0; i < 45; i++) {
            T.stepFrame(1 / 30);
            const vm = T.viewmodelDbg();
            if (i >= 30 && vm && vm.info.active && vm.info.raise >= 0.95) break;
          }

          const cam = T.camera;
          const camPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
          const actualDist = Math.hypot(camPos.x - spec.targetStation.x, camPos.z - spec.targetStation.z);

          const vm = T.viewmodelDbg();
          const fp = T.fpDbg();
          const ots = T.otsDbg ? T.otsDbg() : null;

          const stoneGroup = T.scene.getObjectByName('stone-wall-bands');
          const stoneData = stoneGroup ? JSON.parse(JSON.stringify(stoneGroup.userData)) : null;

          return {
            camPos: camPos,
            targetStation: spec.targetStation,
            actualDist: actualDist,
            aimYaw: spec.aimYaw,
            viewFirst: fp ? fp.first : false,
            otsW: ots ? ots.w : 0,
            weaponKey: T.getCurrentWeapon(),
            vmActive: vm ? vm.info.active : false,
            vmRaise: vm ? vm.info.raise : 0,
            hasStoneGroup: !!stoneGroup,
            stoneGroupVisible: stoneGroup ? stoneGroup.visible : false,
            stoneUserData: stoneData
          };
        })(${JSON.stringify({ ...spotGeo, dist, worldTime: light.worldTime })})`);

        // Assert distance and viewmodel
        if (Math.abs(telemetry.actualDist - dist) > 1.2) {
          throw new Error(`ASSERTION FAILED on ${shotId}: actualDist is ${telemetry.actualDist.toFixed(2)} m, expected ${dist} m`);
        }
        if (!telemetry.viewFirst || telemetry.otsW < 0.95 || telemetry.weaponKey !== 'launcher' || !telemetry.vmActive) {
          throw new Error(`ASSERTION FAILED on ${shotId}: viewFirst=${telemetry.viewFirst}, otsW=${telemetry.otsW}, weapon=${telemetry.weaponKey}, vmActive=${telemetry.vmActive}`);
        }

        // Assert stone group presence in camera/slabs mode
        if (mode !== 'hedge') {
          if (!telemetry.hasStoneGroup || !telemetry.stoneGroupVisible) {
            throw new Error(`ASSERTION FAILED on ${shotId}: stone group missing or not visible!`);
          }
          if (mode === 'camera' && dist <= 10) {
            const nearShowing = telemetry.stoneUserData ? (telemetry.stoneUserData.nearShowing || 0) : 0;
            if (nearShowing < 1) {
              throw new Error(`ASSERTION FAILED on ${shotId}: nearShowing is ${nearShowing}, expected >= 1 at ${dist} m!`);
            }
          }
        }

        const outPath = path.join(CAPTURES_DIR, `${shotId}.jpg`);
        await captureShot(page, outPath);

        const rec = {
          shotId: shotId,
          mode: mode,
          spot: spot.id,
          spotLabel: spot.label,
          targetDist: dist,
          actualDist: +telemetry.actualDist.toFixed(2),
          light: light.id,
          worldTime: light.worldTime,
          camPos: { x: +telemetry.camPos.x.toFixed(2), y: +telemetry.camPos.y.toFixed(2), z: +telemetry.camPos.z.toFixed(2) },
          targetStation: { x: +telemetry.targetStation.x.toFixed(2), z: +telemetry.targetStation.z.toFixed(2) },
          stoneUserData: telemetry.stoneUserData,
          file: `${shotId}.jpg`,
          path: path.relative(ROOT, outPath)
        };

        results.push(rec);
        const nearTris = telemetry.stoneUserData ? (telemetry.stoneUserData.nearTris || 0) : 0;
        const nearShowing = telemetry.stoneUserData ? (telemetry.stoneUserData.nearShowing || 0) : 0;
        console.log(`       [PASS] Captured ${shotId}.jpg | actualDist: ${telemetry.actualDist.toFixed(2)} m | nearShowing: ${nearShowing} cells (${nearTris} tris)`);
      }
    }
  }

  return results;
}

async function main() {
  console.log('========================================================================');
  console.log('=== [AG-218] CL-300 Near Stone Wall Reshoot at 3m / 10m / 30m ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  console.log('[AG-218] Server running at:', server.origin);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const allResults = {};

  try {
    // 1. CL-300 Rewritten Near Stone (Camera LOD Default)
    allResults['camera'] = await runPass('camera', server.origin, browser);

    // 2. Updated Color Slab Boxes (?walls=slabs)
    allResults['slabs'] = await runPass('slabs', server.origin, browser);

    // 3. Hedge Baseline (?walls=hedge)
    allResults['hedge'] = await runPass('hedge', server.origin, browser);

    const outJsonPath = path.join(AG218_DIR, 'telemetry.json');
    fs.writeFileSync(outJsonPath, JSON.stringify(allResults, null, 2), 'utf8');
    console.log(`\n[AG-218] Telemetry saved to: ${outJsonPath}`);
  } finally {
    await browser.close();
    server.close();
    console.log('[AG-218] Browser and server cleanly closed.');
  }
}

main().catch((err) => {
  console.error('[AG-218] FATAL ERROR:', err);
  process.exit(1);
});
