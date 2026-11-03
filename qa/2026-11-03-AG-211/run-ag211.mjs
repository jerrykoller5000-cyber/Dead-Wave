// AG-211 Runner: The Stone Walls in the Game vs Studio (HQ Ring & Quarter-NW at 3/10/30 m in Noon & Dusk)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG211_DIR = path.join(ROOT, 'qa/2026-11-03-AG-211');
const CAPTURES_DIR = path.join(AG211_DIR, 'captures');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(CAPTURES_DIR, { recursive: true });

async function captureShot(page, filePath) {
  const shot = await page.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 88,
    captureBeyondViewport: false
  });
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function runPass(mode, serverOrigin, browser) {
  const isStone = mode === 'stone';
  const url = isStone
    ? `${serverOrigin}/index.html?solid=1&debug=1&raf=timer`
    : `${serverOrigin}/index.html?solid=1&debug=1&raf=timer&walls=hedge`;

  console.log(`\n======================================================`);
  console.log(`=== STARTING PASS: ${mode.toUpperCase()} ===`);
  console.log(`======================================================`);
  console.log(`Navigating to: ${url}`);

  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(url, { timeout: 180000 });

  // Wait for game session initialization
  console.log('  -> Waiting for game session and TT debug object...');
  if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
    throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
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
  console.log('  -> Match deployed.');

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

  if (isStone) {
    if (!wallInit.hasStoneGroup || !wallInit.stoneGroupVisible) {
      throw new Error('ASSERTION FAILED: stone-wall-bands not present or not visible in default mode!');
    }
    console.log('  -> Stone Wall Mesh Stats:', JSON.stringify(wallInit.stoneUserData));
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
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
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

    // Compute geometry and station positions for this spot in page
    const spotGeo = await page.evaluate(`((spotSpec) => {
      const T = window.TT;
      const bands = T.wallBandsDbg.bands();
      const band = bands.find(b => b.kind === spotSpec.bandKind);
      if (!band || !band.pts || band.pts.length < 2) throw new Error('Valid band pts not found: ' + spotSpec.bandKind);

      // Compute stations along band pts with stepM = 2.1m (matching stone-wall-kit.js)
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

      // Find nearest station to targetRef
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

      // Yard-side normal (pointing inward toward player standing in yard)
      let yardNormX, yardNormZ;
      if (spotSpec.id === 'hq') {
        const len = Math.hypot(wallX, wallZ);
        yardNormX = -wallX / len;
        yardNormZ = -wallZ / len;
      } else {
        // Quarter-NW runs approx SW to NE; yard (0,0) is to the SW
        // Normal pointing towards yard:
        yardNormX = -0.8462;
        yardNormZ = 0.5328;
      }

      // Look direction is opposite to yard normal (pointing straight at wall)
      const lookDirX = -yardNormX;
      const lookDirZ = -yardNormZ;
      const aimYaw = Math.atan2(lookDirX, lookDirZ);

      return {
        targetStation: { x: wallX, z: wallZ },
        stationsCount: stations.length,
        distCenter: distCenter,
        isFarLODFormula: distCenter > 48.0,
        yardNorm: { x: yardNormX, z: yardNormZ },
        aimYaw: aimYaw
      };
    })(${JSON.stringify(spot)})`);

    console.log(`    Target Wall Station: (${spotGeo.targetStation.x.toFixed(2)}, ${spotGeo.targetStation.z.toFixed(2)}) | distCenter = ${spotGeo.distCenter.toFixed(2)} m (isFarLOD = ${spotGeo.isFarLODFormula})`);

    for (const dist of distances) {
      for (const light of lights) {
        const shotId = `${mode}_${spot.id}_${dist}m_${light.id}`;
        console.log(`    -> Capturing ${shotId}...`);

        const telemetry = await page.evaluate(`((spec) => {
          const T = window.TT;
          T.setWorldTime(spec.worldTime);
          if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }

          // Place player at distance 'dist' along yard normal
          const px = spec.targetStation.x + spec.dist * spec.yardNorm.x;
          const pz = spec.targetStation.z + spec.dist * spec.yardNorm.z;
          const py = T.sampleHeight(px, pz);

          T.player.position.set(px, py, pz);
          if (T.localPlayer && T.localPlayer.position) {
            T.localPlayer.position.set(px, py, pz);
          }
          T.setOtsAimDbg(spec.aimYaw, 0.0);

          // Step 20 frames so OTS camera lerps to eye position and settles
          for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);

          const cam = T.camera;
          const camPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z };

          // Measure distance from camera to target wall station
          const actualDist = Math.hypot(camPos.x - spec.targetStation.x, camPos.z - spec.targetStation.z);

          const vm = T.viewmodelDbg();
          const fp = T.fpDbg();
          const ots = T.otsDbg ? T.otsDbg() : null;

          return {
            camPos: camPos,
            targetStation: spec.targetStation,
            actualDist: actualDist,
            aimYaw: spec.aimYaw,
            viewFirst: fp ? fp.first : false,
            otsW: ots ? ots.w : 0,
            weaponKey: T.getCurrentWeapon(),
            vmRaise: vm ? vm.info.raise : 0,
            vmRootVisible: vm ? (vm.root && vm.root.visible) : false,
            launcherNdc: vm ? vm.ndc(vm.viewPoint(new T.THREE.Vector3(0, 0.04, 0.35))) : null
          };
        })(${JSON.stringify({
          worldTime: light.worldTime,
          dist: dist,
          targetStation: spotGeo.targetStation,
          yardNorm: spotGeo.yardNorm,
          aimYaw: spotGeo.aimYaw,
          bandKind: spot.bandKind
        })})`);

        // Assert distance
        const tol = dist === 3 ? 0.7 : (dist === 10 ? 1.2 : 2.5);
        if (Math.abs(telemetry.actualDist - dist) > tol) {
          throw new Error(`DISTANCE ASSERTION FAILED at ${shotId}: expected ${dist}m, got ${telemetry.actualDist.toFixed(2)}m (tol ${tol}, camPos: ${JSON.stringify(telemetry.camPos)})`);
        }

        // Assert first person & launcher
        if (!telemetry.viewFirst) {
          throw new Error(`VIEW ASSERTION FAILED at ${shotId}: viewFirst is false`);
        }
        if (telemetry.weaponKey !== 'launcher' || telemetry.vmRaise < 0.99) {
          throw new Error(`WEAPON ASSERTION FAILED at ${shotId}: weapon=${telemetry.weaponKey}, raise=${telemetry.vmRaise}`);
        }

        const outPath = path.join(CAPTURES_DIR, `${shotId}.jpg`);
        await captureShot(page, outPath);

        results.push({
          shotId: shotId,
          mode: mode,
          spotId: spot.id,
          spotLabel: spot.label,
          bandKind: spot.bandKind,
          nominalDist: dist,
          lightId: light.id,
          worldTime: light.worldTime,
          distCenter: spotGeo.distCenter,
          isFarLODFormula: spotGeo.isFarLODFormula,
          telemetry: telemetry,
          path: outPath
        });
      }
    }
  }

  return results;
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-211] The Stone Walls in the Game vs Studio Execution ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  console.log('[AG-211] Server origin:', server.origin);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const stoneResults = await runPass('stone', server.origin, browser);
  const hedgeResults = await runPass('hedge', server.origin, browser);

  await browser.close();
  server.close();

  const allResults = {
    date: '2026-11-03',
    task: 'AG-211',
    description: 'The stone walls in the game, not the studio (LOD by distance from origin vs camera)',
    totalShots: stoneResults.length + hedgeResults.length,
    stone: stoneResults,
    hedge: hedgeResults
  };

  const metaPath = path.join(AG211_DIR, 'ag211-metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(allResults, null, 2));
  console.log(`\n[AG-211] Complete! Captured ${allResults.totalShots} shots. Metadata saved to ${metaPath}`);
}

main().catch(err => {
  console.error('[AG-211] FATAL ERROR:', err);
  process.exit(1);
});
