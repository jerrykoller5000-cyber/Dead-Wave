// AG-213: Drive the story rings his way (CL-296, ?gates=1)
// Comprehensive Real WebGPU Visual & Geometric QA on Jerry's RTX 5080
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-03-AG-213');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'png', captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-213] Story Places Rings (?gates=1) Real WebGPU Verification ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-213] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-213] Loading game with ?gates=1&chaingates=1...');
  await page.goto(url, { timeout: 180000 });

  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
    throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
  }

  // Dismiss intro
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match
  console.log('[AG-213] Booting match and equipping Launcher...');
  await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'AG213');
    T.clearZombies && T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
  })()`);

  // Verify storyGatesDbg
  const initCheck = await page.evaluate(`(() => {
    const T = window.TT, D = T.storyGatesDbg;
    if (!D || !D.on) return { ok: false, reason: 'storyGatesDbg off' };
    const rings = D.rings();
    const gates = D.gates();
    return {
      ok: true,
      on: D.on,
      ringCount: rings.length,
      rings: rings.map(r => ({ place: r.place, gate: r.gate, lead: r.lead, cx: r.cx, cz: r.cz, r: r.r, gates: r.gates })),
      gateCount: gates.length,
      skipped: D.skipped()
    };
  })()`);

  if (!initCheck.ok || initCheck.ringCount !== 4) {
    throw new Error('Failed storyGatesDbg init: ' + JSON.stringify(initCheck));
  }
  console.log('[AG-213] Rings online:', initCheck.rings.map(r => `${r.place} (r=${r.r}m, gates=${r.gates.length})`).join(', '));
  console.log('[AG-213] Skipped places:', JSON.stringify(initCheck.skipped));

  const telemetry = {
    testDate: new Date().toISOString(),
    hardware: 'NVIDIA GeForce RTX 5080 WebGPU',
    rings: {},
    circumventionProbes: {},
    nightDeadWatch: {}
  };

  const RINGS_INFO = [
    { place: 'depot', key: 'price-key', label: 'Fuel Depot Shed Ring' },
    { place: 'mast', key: 'sato-key', label: 'Radio Mast Yard Ring' },
    { place: 'hikers', key: 'chain-key', label: 'Hikers Camp Trail Ring' },
    { place: 'rangers', key: 'ranger-gate-key', label: 'Rangers Cache Ring' }
  ];

  // =========================================================================
  // PART 1: Day 1 First-Person Approach, Prompt Check, Lock State & Gate Opening
  // =========================================================================
  console.log('\n--- PART 1: First-Person Approach, Locked Prompt, and Gate Swing Stills ---');

  for (const info of RINGS_INFO) {
    console.log(`\n[AG-213] Testing Ring: ${info.label} (${info.place})...`);

    // Reset chain to shut state
    await page.evaluate(`window.TT.chainDbg.reset()`);

    // 1. Position player on approach trail outside gate
    const approachData = await page.evaluate(`(async (place) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

      // Settle 2.2m outside gate facing in toward ring center
      const ox = g.x + Math.cos(a) * 2.2;
      const oz = g.z + Math.sin(a) * 2.2;
      const oy = T.sampleHeight(ox, oz);

      T.player.position.set(ox, oy, oz);
      const lookYaw = Math.atan2(g.x - ox, g.z - oz);
      T.setAimYawDbg(lookYaw);
      T.setOtsAimDbg(lookYaw, -0.05);
      T.setVelDbg(0, 0);

      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const nearPlace = D.near();
      const promptBefore = T.chainDbg.prompt();
      const shutBefore = D.shut(ring.cx, ring.cz);
      const gatesState = D.gates().filter(q => q.place === place);

      return {
        nearPlace,
        promptBefore,
        shutBefore,
        gateStateBefore: gatesState,
        playerPos: [T.player.position.x, T.player.position.y, T.player.position.z],
        gatePos: [g.x, g.z],
        ringCenter: [ring.cx, ring.cz],
        ringRadius: ring.r
      };
    })('${info.place}')`);

    // Capture shut gate screenshot
    const shotShut = path.join(OUT_DIR, `gate-${info.place}-01-shut.png`);
    await captureShot(page, shotShut);
    console.log(`[AG-213] Saved shut gate shot: ${path.relative(ROOT, shotShut)}`);
    console.log(`[AG-213] Approach near: ${approachData.nearPlace}, Prompt before key: "${approachData.promptBefore}"`);

    // 2. Press E while locked - verify locked rejection
    const pressELocked = await page.evaluate(`(async (place) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const acted = T.chainDbg.use();
      for (let i = 0; i < 15; i++) T.stepFrame(1/60);
      const gatesState = D.gates().filter(q => q.place === place);
      const promptAfter = T.chainDbg.prompt();
      return { acted, gatesState, promptAfter };
    })('${info.place}')`);

    console.log(`[AG-213] Locked E interaction: acted=${pressELocked.acted}, gate open=${pressELocked.gatesState[0]?.open}`);

    // 3. Woods circumvention probe (attempting to get around through the woods)
    console.log(`[AG-213] Running 48-bearing circumvention probe around ${info.place} perimeter...`);
    const circumventionResult = await page.evaluate(`((place) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const gateAz = Math.atan2(g.z - ring.cz, g.x - ring.cx);
      const TAU = Math.PI * 2;

      const walkIn = (cx, cz, r, a, from = 6.0, to = 6.0) => {
        let x = cx + Math.cos(a) * (r + from);
        let z = cz + Math.sin(a) * (r + from);
        const tx = cx + Math.cos(a) * (r - to);
        const tz = cz + Math.sin(a) * (r - to);
        for (let k = 0; k < 150; k++) {
          const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
          if (d < 0.05) break;
          const step = Math.min(0.12, d);
          const p = T.wallBandsDbg.resolve(x + dx / d * step, z + dz / d * step, 0.35);
          x = p.x; z = p.z;
        }
        return Math.hypot(x - cx, z - cz);
      };

      const bearings = [];
      let breachCount = 0;
      const breaches = [];

      for (let i = 0; i < 48; i++) {
        const a = (i * TAU) / 48;
        const gx = ring.cx + Math.cos(a) * ring.r;
        const gz = ring.cz + Math.sin(a) * ring.r;
        const distToGate = Math.hypot(g.x - gx, g.z - gz);
        const isGateBearing = distToGate < (g.span + 2.5);

        const endDist = walkIn(ring.cx, ring.cz, ring.r, a);
        const penetrationDepth = ring.r - endDist;
        const breached = !isGateBearing && endDist < (ring.r - 1.0);

        if (breached) {
          breachCount++;
          breaches.push({ bearingIdx: i, angleRad: +a.toFixed(3), penetrationDepth: +penetrationDepth.toFixed(2), endDist: +endDist.toFixed(2) });
        }

        bearings.push({
          idx: i,
          angleRad: +a.toFixed(3),
          isGateBearing,
          endDist: +endDist.toFixed(2),
          wallRadius: ring.r,
          stoppedOutside: endDist >= (ring.r - 0.5)
        });
      }

      return {
        place,
        ringRadius: ring.r,
        testedBearings: 48,
        breachCount,
        breaches,
        bearings
      };
    })('${info.place}')`);

    console.log(`[AG-213] Woods circumvention result for ${info.place}: ${circumventionResult.breachCount} breaches out of 48 bearings.`);

    // 4. Give key & Open Gate
    console.log(`[AG-213] Supplying ${info.key} to open gate...`);
    const openData = await page.evaluate(`(async (place, key) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

      // Acquire key into held state
      const st = T.chainDbg.read();
      st.keys[key] = 'held';
      T.chainDbg.load(st);

      // Stand in interaction reach
      const ox = g.x + Math.cos(a) * 1.8;
      const oz = g.z + Math.sin(a) * 1.8;
      T.player.position.set(ox, T.sampleHeight(ox, oz), oz);

      const promptWithKey = T.chainDbg.prompt();
      T.chainDbg.use(); // Trigger gate opening

      // Settle and wait for gate leaves to swing open (w > 0.99)
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        T.stepFrame(1/30);
        const gates = D.gates().filter(q => q.place === place);
        if (gates.every(q => q.w > 0.98)) break;
      }

      // Step additional frames to complete settling
      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const gatesAfter = D.gates().filter(q => q.place === place);
      const shutAfter = D.shut(ring.cx, ring.cz);

      // Walk through open gate toward site interior
      const inX = g.x - Math.cos(a) * 4.0;
      const inZ = g.z - Math.sin(a) * 4.0;
      T.player.position.set(inX, T.sampleHeight(inX, inZ), inZ);
      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const interiorDist = Math.hypot(T.player.position.x - ring.cx, T.player.position.z - ring.cz);

      // Return player back outside gate to take open-gate screenshot
      T.player.position.set(ox, T.sampleHeight(ox, oz), oz);
      const lookYaw = Math.atan2(g.x - ox, g.z - oz);
      T.setAimYawDbg(lookYaw);
      T.setOtsAimDbg(lookYaw, -0.05);
      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      return {
        promptWithKey,
        gatesAfter,
        shutAfter,
        interiorDist,
        walkThroughSuccess: interiorDist < (ring.r - 2.5)
      };
    })('${info.place}', '${info.key}')`);

    // Capture open gate screenshot
    const shotOpen = path.join(OUT_DIR, `gate-${info.place}-02-open.png`);
    await captureShot(page, shotOpen);
    console.log(`[AG-213] Saved open gate shot: ${path.relative(ROOT, shotOpen)}`);
    console.log(`[AG-213] Gate swing open: w=${openData.gatesAfter[0]?.w.toFixed(2)}, solids=${openData.gatesAfter[0]?.solids}, walkThrough=${openData.walkThroughSuccess}`);

    telemetry.rings[info.place] = {
      label: info.label,
      approach: approachData,
      lockedInteraction: pressELocked,
      openInteraction: openData
    };
    telemetry.circumventionProbes[info.place] = circumventionResult;
  }

  // =========================================================================
  // PART 2: Night 3 Dead Containment Watch (60 Seconds)
  // =========================================================================
  console.log('\n--- PART 2: Night 3 Zombie Perimeter Containment Watch (60s) ---');

  for (const place of ['depot', 'hikers']) {
    console.log(`\n[AG-213] Running 60s Night Dead Watch at ${place}...`);

    // Reset chain gates so gates are locked shut
    await page.evaluate(`window.TT.chainDbg.reset()`);

    // Setup Night 3 at place
    const nightSetup = await page.evaluate(`(async (place) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);

      // Set Night 3
      T.setDay(3);
      T.setWorldTime(0.95); // Deep night
      if (T.weather) { T.weather.raining = false; T.weather.cloudCover = 0.2; }

      // Position player perched with high perspective looking at the ring
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);
      const camX = g.x + Math.cos(a) * 16.0;
      const camZ = g.z + Math.sin(a) * 16.0;
      const camY = T.sampleHeight(camX, camZ) + 4.5;

      T.player.position.set(camX, camY, camZ);
      const yaw = Math.atan2(ring.cx - camX, ring.cz - camZ);
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, -0.22);
      T.setVelDbg(0, 0);

      // Clear zombies and spawn wave of 20 zombies around the ring exterior (distance r + 4m to r + 12m)
      T.clearZombies && T.clearZombies();
      const spawned = [];
      const TAU = Math.PI * 2;
      for (let i = 0; i < 20; i++) {
        const ang = (i * TAU) / 20;
        const dist = ring.r + 4.0 + (i % 4) * 2.5;
        const zx = ring.cx + Math.cos(ang) * dist;
        const zz = ring.cz + Math.sin(ang) * dist;
        const zType = i % 5 === 0 ? 'screamer' : (i % 3 === 0 ? 'spitter' : 'shambler');
        const z = T.spawnZombie(zx, zz, zType, true, true);
        if (z) {
          z.alive = true;
          spawned.push({ id: i, type: zType, pos: [zx, zz] });
        }
      }

      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      return {
        place,
        ringCenter: [ring.cx, ring.cz],
        ringRadius: ring.r,
        spawnedCount: spawned.length,
        gateState: D.gates().filter(q => q.place === place)
      };
    })('${place}')`);

    console.log(`[AG-213] Night setup for ${place}: ${nightSetup.spawnedCount} zombies spawned outside ring radius ${nightSetup.ringRadius}m.`);

    // Run 60-second observation (60 samples @ 1 Hz, 30 steps of 1/30s each = 60s)
    const samples = [];
    let breachIncidents = 0;
    let maxZombiesInside = 0;

    for (let sec = 0; sec < 60; sec++) {
      const sample = await page.evaluate(`((place) => {
        const T = window.TT, D = T.storyGatesDbg;
        const ring = D.rings().find(r => r.place === place);

        // Advance 1 second (30 frames at 1/30s)
        for (let i = 0; i < 30; i++) {
          T.stepFrame(1/30);
        }

        const zombies = T.zombies || [];
        const living = zombies.filter(z => z.alive);
        let insideCount = 0;
        let stuckCount = 0;
        const insideList = [];

        for (const z of living) {
          const zx = z.mesh ? z.mesh.position.x : z.x;
          const zz = z.mesh ? z.mesh.position.z : z.z;
          const d = Math.hypot(zx - ring.cx, zz - ring.cz);
          if (d < (ring.r - 0.5)) {
            insideCount++;
            insideList.push({ pos: [zx, zz], dist: +d.toFixed(2), type: z.typeKey });
          }

          // Stuck test: zombie near wall with low speed
          const distToWall = Math.abs(d - ring.r);
          if (distToWall < 0.6 && z.speed < 0.05) {
            stuckCount++;
          }
        }

        return {
          totalLiving: living.length,
          insideCount,
          insideList,
          stuckCount
        };
      })('${place}')`);

      if (sample.insideCount > 0) {
        breachIncidents++;
        maxZombiesInside = Math.max(maxZombiesInside, sample.insideCount);
      }
      samples.push(sample);

      if (sec === 30) {
        // Capture mid-observation still
        const shotNight = path.join(OUT_DIR, `night-${place}-containment.png`);
        await captureShot(page, shotNight);
        console.log(`[AG-213] Saved night containment shot: ${path.relative(ROOT, shotNight)}`);
      }
    }

    console.log(`[AG-213] Night dead watch for ${place} complete: 0 inside shut ring = ${maxZombiesInside === 0} (max inside: ${maxZombiesInside}, breach events: ${breachIncidents})`);

    telemetry.nightDeadWatch[place] = {
      place,
      ringRadius: nightSetup.ringRadius,
      secondsObserved: 60,
      breachIncidents,
      maxZombiesInside,
      containmentPass: maxZombiesInside === 0,
      samplesCount: samples.length
    };
  }

  // Save telemetry
  console.log('\n[AG-213] Saving telemetry.json...');
  fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');

  console.log('[AG-213] Test execution completed successfully.');
  if (page.errors && page.errors.length) {
    console.warn('[AG-213] Page errors during test:', page.errors);
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error('[AG-213] Fatal Error:', err);
  process.exit(1);
});
