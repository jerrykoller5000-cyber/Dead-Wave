// AG-216: Night 3 again at the shut rings (CL-296, after AG-213's fix)
// Real WebGPU Visual & Gameplay Verification on Jerry's RTX 5080
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-03-AG-216');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filePath, clip = null) {
  const params = { format: 'png', captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const shot = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-216] Story Places Rings Night 3 Verification (CL-296 Recheck) ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-216] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-216] Navigating to game...');
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

  // Start match and equip launcher
  console.log('[AG-216] Starting match and equipping launcher...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG216');
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
  console.log('[AG-216] Rings online:', initCheck.rings.map(r => `${r.place} (r=${r.r}m)`).join(', '));

  const telemetry = {
    testDate: new Date().toISOString(),
    hardware: 'NVIDIA GeForce RTX 5080 WebGPU',
    depotShutWatch: null,
    hikersShutWatch: null,
    depotOpenWatch: null,
    summary: {}
  };

  // =========================================================================
  // PART 1: 60s Watch at Fuel Depot (Gate SHUT)
  // =========================================================================
  console.log('\n--- PART 1: 60s Night 3 Watch at Depot (Gate SHUT) ---');
  await page.evaluate(`window.TT.chainDbg.reset()`);

  const depotShutSetup = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'depot');

    T.setDay(3);
    T.setWorldTime(0.95); // Deep night
    if (T.weather) { T.weather.raining = false; T.weather.cloudCover = 0.2; }

    // Position player on approach trail outside gate
    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);
    const pX = g.x + Math.cos(a) * 6.0;
    const pZ = g.z + Math.sin(a) * 6.0;
    const pY = T.sampleHeight(pX, pZ) + 1.6;

    T.player.position.set(pX, pY, pZ);
    const yaw = Math.atan2(ring.cx - pX, ring.cz - pZ);
    T.setAimYawDbg(yaw);
    T.setOtsAimDbg(yaw, -0.05);
    T.setVelDbg(0, 0);

    // Clear and spawn 24 zombies outside ring (distance r+4m to r+12m)
    T.clearZombies && T.clearZombies();
    const spawned = [];
    const TAU = Math.PI * 2;
    for (let i = 0; i < 24; i++) {
      const ang = (i * TAU) / 24;
      const dist = ring.r + 4.0 + (i % 4) * 2.2;
      const zx = ring.cx + Math.cos(ang) * dist;
      const zz = ring.cz + Math.sin(ang) * dist;
      const zType = (i % 6 === 0) ? 'screamer' : (i % 3 === 0 ? 'spitter' : (i % 2 === 0 ? 'feral' : 'shambler'));
      const z = T.spawnZombie(zx, zz, zType, true, true);
      if (z) {
        z.alive = true;
        spawned.push({ id: i, type: zType, pos: [zx, zz] });
      }
    }

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const gate = D.gates().find(q => q.place === 'depot');
    return {
      place: 'depot',
      ringCenter: [ring.cx, ring.cz],
      ringRadius: ring.r,
      isShut: D.shut(ring.cx, ring.cz),
      gateState: gate,
      spawnedCount: spawned.length,
      screamerCount: spawned.filter(s => s.type === 'screamer').length
    };
  })()`);

  console.log(`[AG-216] Depot Shut Setup: isShut=${depotShutSetup.isShut}, spawned=${depotShutSetup.spawnedCount} (screamers=${depotShutSetup.screamerCount})`);

  await captureShot(page, path.join(OUT_DIR, 'night-depot-shut-00s.png'));

  const depotShutSamples = [];
  let depotShutBreaches = 0;
  let depotShutMaxInside = 0;

  for (let sec = 1; sec <= 60; sec++) {
    const sample = await page.evaluate(`(() => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === 'depot');

      // Make sure screamers howl / trigger call
      const living = (T.zombies || []).filter(z => z.alive);
      for (const z of living) {
        if (z.typeKey === 'screamer' && z.screamCd > 1) {
          z.screamCd = 0.1; // prompt scream
        }
      }

      // Step 30 frames (1 second)
      for (let i = 0; i < 30; i++) {
        T.stepFrame(1/30);
      }

      // Test riseOk inside shut ring
      let riseOkViolations = 0;
      if (D.riseOk) {
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          const rx = ring.cx + Math.cos(a) * (ring.r * 0.6);
          const rz = ring.cz + Math.sin(a) * (ring.r * 0.6);
          if (D.riseOk(rx, rz)) riseOkViolations++;
        }
      }

      let insideCount = 0;
      let stuckCount = 0;
      const insideList = [];

      for (const z of living) {
        const zx = z.mesh ? z.mesh.position.x : z.x;
        const zz = z.mesh ? z.mesh.position.z : z.z;
        const d = Math.hypot(zx - ring.cx, zz - ring.cz);
        if (d < (ring.r - 0.5)) {
          insideCount++;
          insideList.push({ pos: [+zx.toFixed(2), +zz.toFixed(2)], dist: +d.toFixed(2), type: z.typeKey });
        }
        const distToWall = Math.abs(d - ring.r);
        if (distToWall < 0.6 && z.speed < 0.05) {
          stuckCount++;
        }
      }

      return {
        sec: ${sec},
        totalLiving: living.length,
        insideCount,
        insideList,
        stuckCount,
        riseOkViolations
      };
    })()`);

    if (sample.insideCount > 0) {
      depotShutBreaches++;
      depotShutMaxInside = Math.max(depotShutMaxInside, sample.insideCount);
    }
    depotShutSamples.push(sample);

    if (sec === 30) {
      await captureShot(page, path.join(OUT_DIR, 'night-depot-shut-30s.png'));
    } else if (sec === 60) {
      await captureShot(page, path.join(OUT_DIR, 'night-depot-shut-60s.png'));
    }
  }

  console.log(`[AG-216] Depot Shut Watch Complete: maxInside=${depotShutMaxInside}, breaches=${depotShutBreaches}`);
  telemetry.depotShutWatch = {
    setup: depotShutSetup,
    secondsObserved: 60,
    breaches: depotShutBreaches,
    maxInside: depotShutMaxInside,
    pass: depotShutMaxInside === 0,
    samples: depotShutSamples
  };

  // =========================================================================
  // PART 2: 60s Watch at Hikers Camp (Gate SHUT)
  // =========================================================================
  console.log('\n--- PART 2: 60s Night 3 Watch at Hikers Camp (Gate SHUT) ---');
  await page.evaluate(`window.TT.chainDbg.reset()`);

  const hikersShutSetup = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'hikers');

    T.setDay(3);
    T.setWorldTime(0.95);
    if (T.weather) { T.weather.raining = false; T.weather.cloudCover = 0.2; }

    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);
    const pX = g.x + Math.cos(a) * 6.0;
    const pZ = g.z + Math.sin(a) * 6.0;
    const pY = T.sampleHeight(pX, pZ) + 1.6;

    T.player.position.set(pX, pY, pZ);
    const yaw = Math.atan2(ring.cx - pX, ring.cz - pZ);
    T.setAimYawDbg(yaw);
    T.setOtsAimDbg(yaw, -0.05);
    T.setVelDbg(0, 0);

    T.clearZombies && T.clearZombies();
    const spawned = [];
    const TAU = Math.PI * 2;
    for (let i = 0; i < 24; i++) {
      const ang = (i * TAU) / 24;
      const dist = ring.r + 4.0 + (i % 4) * 2.2;
      const zx = ring.cx + Math.cos(ang) * dist;
      const zz = ring.cz + Math.sin(ang) * dist;
      const zType = (i % 6 === 0) ? 'screamer' : (i % 3 === 0 ? 'spitter' : (i % 2 === 0 ? 'feral' : 'shambler'));
      const z = T.spawnZombie(zx, zz, zType, true, true);
      if (z) {
        z.alive = true;
        spawned.push({ id: i, type: zType, pos: [zx, zz] });
      }
    }

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const gate = D.gates().find(q => q.place === 'hikers');
    return {
      place: 'hikers',
      ringCenter: [ring.cx, ring.cz],
      ringRadius: ring.r,
      isShut: D.shut(ring.cx, ring.cz),
      gateState: gate,
      spawnedCount: spawned.length,
      screamerCount: spawned.filter(s => s.type === 'screamer').length
    };
  })()`);

  console.log(`[AG-216] Hikers Shut Setup: isShut=${hikersShutSetup.isShut}, spawned=${hikersShutSetup.spawnedCount} (screamers=${hikersShutSetup.screamerCount})`);

  await captureShot(page, path.join(OUT_DIR, 'night-hikers-shut-00s.png'));

  const hikersShutSamples = [];
  let hikersShutBreaches = 0;
  let hikersShutMaxInside = 0;

  for (let sec = 1; sec <= 60; sec++) {
    const sample = await page.evaluate(`(() => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === 'hikers');

      const living = (T.zombies || []).filter(z => z.alive);
      for (const z of living) {
        if (z.typeKey === 'screamer' && z.screamCd > 1) {
          z.screamCd = 0.1;
        }
      }

      for (let i = 0; i < 30; i++) {
        T.stepFrame(1/30);
      }

      let riseOkViolations = 0;
      if (D.riseOk) {
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          const rx = ring.cx + Math.cos(a) * (ring.r * 0.6);
          const rz = ring.cz + Math.sin(a) * (ring.r * 0.6);
          if (D.riseOk(rx, rz)) riseOkViolations++;
        }
      }

      let insideCount = 0;
      let stuckCount = 0;
      const insideList = [];

      for (const z of living) {
        const zx = z.mesh ? z.mesh.position.x : z.x;
        const zz = z.mesh ? z.mesh.position.z : z.z;
        const d = Math.hypot(zx - ring.cx, zz - ring.cz);
        if (d < (ring.r - 0.5)) {
          insideCount++;
          insideList.push({ pos: [+zx.toFixed(2), +zz.toFixed(2)], dist: +d.toFixed(2), type: z.typeKey });
        }
        const distToWall = Math.abs(d - ring.r);
        if (distToWall < 0.6 && z.speed < 0.05) {
          stuckCount++;
        }
      }

      return {
        sec: ${sec},
        totalLiving: living.length,
        insideCount,
        insideList,
        stuckCount,
        riseOkViolations
      };
    })()`);

    if (sample.insideCount > 0) {
      hikersShutBreaches++;
      hikersShutMaxInside = Math.max(hikersShutMaxInside, sample.insideCount);
    }
    hikersShutSamples.push(sample);

    if (sec === 30) {
      await captureShot(page, path.join(OUT_DIR, 'night-hikers-shut-30s.png'));
    } else if (sec === 60) {
      await captureShot(page, path.join(OUT_DIR, 'night-hikers-shut-60s.png'));
    }
  }

  console.log(`[AG-216] Hikers Shut Watch Complete: maxInside=${hikersShutMaxInside}, breaches=${hikersShutBreaches}`);
  telemetry.hikersShutWatch = {
    setup: hikersShutSetup,
    secondsObserved: 60,
    breaches: hikersShutBreaches,
    maxInside: hikersShutMaxInside,
    pass: hikersShutMaxInside === 0,
    samples: hikersShutSamples
  };

  // =========================================================================
  // PART 3: 60s Watch at Depot (Gate OPEN - the dead may go in)
  // =========================================================================
  console.log('\n--- PART 3: 60s Night 3 Watch at Depot (Gate OPEN) ---');

  const depotOpenSetup = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'depot');

    // Give price-key and unlock depot gate
    const st = T.chainDbg.read();
    st.keys['price-key'] = 'held';
    T.chainDbg.load(st);

    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

    // Stand near gate and open it
    const nearX = g.x + Math.cos(a) * 1.5;
    const nearZ = g.z + Math.sin(a) * 1.5;
    T.player.position.set(nearX, T.sampleHeight(nearX, nearZ), nearZ);
    T.chainDbg.use();

    // Step frames until leaves fully open
    for (let i = 0; i < 90; i++) T.stepFrame(1/30);

    // Verify gate opened
    const gateAfter = D.gates().find(q => q.place === 'depot');

    // Position player inside depot clearing (depth ~5.5m inside ring), facing open gate
    const inDist = 5.5;
    const pX = ring.cx - Math.cos(a) * (ring.r - inDist);
    const pZ = ring.cz - Math.sin(a) * (ring.r - inDist);
    const pY = T.sampleHeight(pX, pZ) + 1.6;

    T.player.position.set(pX, pY, pZ);
    const yaw = Math.atan2(g.x - pX, g.z - pZ);
    T.setAimYawDbg(yaw);
    T.setOtsAimDbg(yaw, -0.05);
    T.setVelDbg(0, 0);

    // Clear and spawn zombies outside along approach trail corridor leading into the open gate
    T.clearZombies && T.clearZombies();
    const spawned = [];
    for (let i = 0; i < 20; i++) {
      const trailDist = 7.0 + i * 1.0;
      const lateral = ((i % 3) - 1) * 0.9;
      const zx = g.x + Math.cos(a) * trailDist - Math.sin(a) * lateral;
      const zz = g.z + Math.sin(a) * trailDist + Math.cos(a) * lateral;
      const zType = (i % 5 === 0) ? 'screamer' : (i % 2 === 0 ? 'feral' : 'shambler');
      const z = T.spawnZombie(zx, zz, zType, true, true);
      if (z) {
        z.alive = true;
        spawned.push({ id: i, type: zType, pos: [zx, zz] });
      }
    }

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      place: 'depot',
      ringCenter: [ring.cx, ring.cz],
      ringRadius: ring.r,
      isShut: D.shut(ring.cx, ring.cz),
      gateState: gateAfter,
      playerPos: [pX, pY, pZ],
      playerDistFromCenter: Math.hypot(pX - ring.cx, pZ - ring.cz),
      spawnedCount: spawned.length
    };
  })()`);

  console.log(`[AG-216] Depot Open Setup: isShut=${depotOpenSetup.isShut}, gate.open=${depotOpenSetup.gateState?.open}, w=${depotOpenSetup.gateState?.w}, solids=${depotOpenSetup.gateState?.solids}, blocks=${depotOpenSetup.gateState?.blocks}`);
  console.log(`[AG-216] Player placed inside depot at dist=${depotOpenSetup.playerDistFromCenter.toFixed(2)}m from center (ring radius ${depotOpenSetup.ringRadius}m)`);

  await captureShot(page, path.join(OUT_DIR, 'night-depot-open-00s.png'));

  const depotOpenSamples = [];
  let depotOpenMaxInside = 0;
  let firstEntrySec = -1;

  for (let sec = 1; sec <= 60; sec++) {
    const sample = await page.evaluate(`(() => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === 'depot');

      // Advance 1 second
      for (let i = 0; i < 30; i++) {
        T.stepFrame(1/30);
      }

      const living = (T.zombies || []).filter(z => z.alive);
      let insideCount = 0;
      const insideList = [];

      for (const z of living) {
        const zx = z.mesh ? z.mesh.position.x : z.x;
        const zz = z.mesh ? z.mesh.position.z : z.z;
        const d = Math.hypot(zx - ring.cx, zz - ring.cz);
        if (d < (ring.r - 0.5)) {
          insideCount++;
          insideList.push({ pos: [+zx.toFixed(2), +zz.toFixed(2)], dist: +d.toFixed(2), type: z.typeKey });
        }
      }

      return {
        sec: ${sec},
        totalLiving: living.length,
        insideCount,
        insideList
      };
    })()`);

    if (sample.insideCount > 0) {
      if (firstEntrySec === -1) firstEntrySec = sec;
      depotOpenMaxInside = Math.max(depotOpenMaxInside, sample.insideCount);
    }
    depotOpenSamples.push(sample);

    if (sec === 30) {
      await captureShot(page, path.join(OUT_DIR, 'night-depot-open-30s.png'));
    } else if (sec === 60) {
      await captureShot(page, path.join(OUT_DIR, 'night-depot-open-60s.png'));
    }
  }

  console.log(`[AG-216] Depot Open Watch Complete: maxInside=${depotOpenMaxInside}, firstEntrySec=${firstEntrySec}`);
  telemetry.depotOpenWatch = {
    setup: depotOpenSetup,
    secondsObserved: 60,
    firstEntrySec,
    maxInside: depotOpenMaxInside,
    pass: depotOpenMaxInside > 0,
    samples: depotOpenSamples
  };

  telemetry.summary = {
    depotShutContained: telemetry.depotShutWatch.pass,
    hikersShutContained: telemetry.hikersShutWatch.pass,
    depotOpenPermitted: telemetry.depotOpenWatch.pass,
    allChecksPass: telemetry.depotShutWatch.pass && telemetry.hikersShutWatch.pass && telemetry.depotOpenWatch.pass
  };

  console.log('\n========================================================================');
  console.log('=== [AG-216] SUMMARY RESULTS ===');
  console.log(`- Depot Shut 60s Watch: ${telemetry.depotShutWatch.pass ? 'PASS (0 inside shut ring)' : 'FAIL'}`);
  console.log(`- Hikers Shut 60s Watch: ${telemetry.hikersShutWatch.pass ? 'PASS (0 inside shut ring)' : 'FAIL'}`);
  console.log(`- Depot Open 60s Watch: ${telemetry.depotOpenWatch.pass ? `PASS (${telemetry.depotOpenWatch.maxInside} entered at t=${telemetry.depotOpenWatch.firstEntrySec}s)` : 'FAIL'}`);
  console.log(`- Overall Result: ${telemetry.summary.allChecksPass ? 'ALL TESTS PASSED' : 'FAILURES DETECTED'}`);
  console.log('========================================================================\n');

  // Save telemetry
  fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'telemetry-summary.json'), JSON.stringify(telemetry.summary, null, 2), 'utf8');

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error('[AG-216] Fatal Error:', err);
  process.exit(1);
});
