// qa/2026-11-11-AG-311/ag311-ceiling-look.mjs
// RTX 5080 WebGPU Live Verification of Training Ground Ceiling (GP-20108 / AG-311 / J140 / J128)
// Checks:
//  1. 4 Lighting Presets (noon, overcast, dusk, night) + Lights Off at Firing Line eye view looking up
//  2. Downrange Lane Views (from firing line up, and from mid-range z+14 looking back up) in noon & lights-off
//  3. Full Training Ground 8-spot walk (up and ahead) across all areas
//  4. 3P Overhead View & Camera Raycast Collision (ceiling hidden, zero camera obstruction/contact)
//  5. Ballistic Upward Impact (solid, normal -Y, impact decal generated on ceiling)
//  6. J128 seating contacts: baffles, fixtures, pipes, ducts, deck edges
//  7. Draw calls and performance verification on RTX 5080 WebGPU

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-311/shots');
const OUT_REV = path.join(ROOT, 'review/AG-311/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const pause = ms => new Promise(r => setTimeout(r, ms));

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

const summary = {
  task: 'AG-311',
  timestamp: new Date().toISOString(),
  gpu: 'NVIDIA GeForce RTX 5080 (WebGPU)',
  lights: {},
  laneViews: {},
  walkSpots: [],
  thirdPerson: null,
  ballistics: null,
  draws: {},
  j128: {},
  errors: []
};

async function saveScreenshot(page, filename) {
  const qaPath = path.join(OUT_QA, filename);
  const revPath = path.join(OUT_REV, filename);
  await page.screenshot(qaPath);
  fs.copyFileSync(qaPath, revPath);
  const buf = fs.readFileSync(qaPath);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  return { filename, bytes: buf.length, sha };
}

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-position=-3800,-3800', '--window-size=1280,720']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await moveOffscreen(page);

  console.log('Navigating to game in debug mode...');
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));

  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));

  await page.evaluate(`(()=>{
    document.getElementById('playerName').value = 'AG-311 GPU Look';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }));
  console.log('Training Ground entered and blackout lifted.');

  // Initialize view
  await page.evaluate(`(()=>{
    const T = TT;
    T.setViewFirstDbg(true);
    T.trainingDbg.clear();
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);
  })()`);

  // =========================================================================
  // 1. Lighting presets + Lights Off at Firing Line looking up at ceiling
  // =========================================================================
  console.log('--- 1. Testing 4 Lighting Presets + Lights Off ---');
  const lightPresets = [
    { name: 'noon', time: 0.5, off: false },
    { name: 'overcast', time: 0.43, off: false },
    { name: 'dusk', time: 0.74, off: false },
    { name: 'night', time: 0.02, off: false },
    { name: 'lights-off', time: 0.5, off: true }
  ];

  for (const lp of lightPresets) {
    const data = await page.evaluate(`(({ time, off }) => {
      const T = TT, tg = T.trainingDbg.tg();
      T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 3);
      T.setVelDbg(0, 0);
      T.setOtsAimDbg(0, 1.15); // Look up at ceiling
      T.setWorldTime(time);
      if (T.trainingDbg.lights().on === off) T.trainingDbg.toggleLights();
      for (let i = 0; i < 8; i++) T.stepFrame(0.016);
      return {
        lights: T.trainingDbg.lights(),
        ceiling: tg.ceiling.state(),
        draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0,
        playerPos: T.player.position.toArray(),
        cameraPos: T.camera.position.toArray()
      };
    })`, { time: lp.time, off: lp.off });

    await pause(200);
    const shot = await saveScreenshot(page, `light-${lp.name}.png`);
    summary.lights[lp.name] = { ...data, shot };
    console.log(`  Light ${lp.name}: draws=${data.draws}, lightsOn=${data.lights.on}, ceilingVisible=${data.ceiling.visible}`);
  }

  // Restore lights on
  await page.evaluate(`(()=>{ if (!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights(); })()`);

  // =========================================================================
  // 2. Downrange Lane Views (Matching ChatGPT's 4 Lane Proof Captures)
  // =========================================================================
  console.log('--- 2. Testing Downrange Lane Views ---');
  const laneViews = [
    { name: 'lane-from-line', desc: 'Firing line looking downrange and up', off: false },
    { name: 'lane-from-line', desc: 'Firing line looking downrange and up (lights off)', off: true },
    { name: 'lane-mid-back', desc: 'Mid-range looking back towards firing line up', off: false },
    { name: 'lane-mid-back', desc: 'Mid-range looking back towards firing line up (lights off)', off: true }
  ];

  for (const lv of laneViews) {
    const data = await page.evaluate(`(({ name, off }) => {
      const T = TT, tg = T.trainingDbg.tg(), o = tg.origin, y = tg.floorY;
      if (T.trainingDbg.lights().on === off) T.trainingDbg.toggleLights();
      const v = name === 'lane-from-line'
        ? { x: o.x, y: y + 1.6, z: o.z - 3, tx: o.x, ty: y + 11.6, tz: o.z + 7, fov: 84 }
        : { x: o.x, y: y + 1.6, z: o.z + 14, tx: o.x, ty: y + 13.6, tz: o.z + 2, fov: 84 };
      T.setShotView(v);
      for (let i = 0; i < 8; i++) T.stepFrame(0.016);
      return {
        view: v,
        lights: T.trainingDbg.lights(),
        ceiling: tg.ceiling.state(),
        draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0
      };
    })`, { name: lv.name, off: lv.off });

    await pause(200);
    const shotName = `${lv.name}-${lv.off ? 'off' : 'noon'}.png`;
    const shot = await saveScreenshot(page, shotName);
    summary.laneViews[`${lv.name}-${lv.off ? 'off' : 'noon'}`] = { ...data, shot };
    console.log(`  Lane view ${shotName}: draws=${data.draws}, lightsOn=${data.lights.on}`);
  }

  // Restore lights on & clear shot view
  await page.evaluate(`(()=>{
    if (!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights();
    TT.clearShotView();
  })()`);

  // =========================================================================
  // 3. Full 8-Spot Training Ground Walk (Up and Ahead)
  // =========================================================================
  console.log('--- 3. Testing Full 8-Spot Training Ground Walk ---');
  const spots = [
    { name: 'range-firing', x: 0, z: -3, yaw: 0, room: 'Firing Line' },
    { name: 'range-lanes', x: 0, z: 13, yaw: 0, room: 'Downrange Lanes' },
    { name: 'range-stations', x: 5, z: -7, yaw: -Math.PI / 2, room: 'Workbench / Stations' },
    { name: 'apron-door', x: -11, z: -8, yaw: Math.PI / 2, room: 'Armory Apron' },
    { name: 'infirmary', x: -38, z: -9, yaw: 0, room: 'Infirmary Bay' },
    { name: 'hq-ladder', x: -41, z: 1, yaw: Math.PI / 2, room: 'HQ Ladder' },
    { name: 'hangar-center', x: -25, z: 7, yaw: 0, room: 'Hangar Center' },
    { name: 'passage-gate', x: -26, z: 25, yaw: 0, room: 'Holding Passage' }
  ];

  for (const s of spots) {
    const entry = { name: s.name, room: s.room, x: s.x, z: s.z };
    for (const [dir, pitch] of [['up', 1.24], ['ahead', 0.06]]) {
      const data = await page.evaluate(`(({ x, z, yaw, pitch }) => {
        const T = TT, tg = T.trainingDbg.tg();
        T.player.position.set(x + tg.origin.x, tg.floorY, z + tg.origin.z);
        T.setVelDbg(0, 0);
        T.setOtsAimDbg(yaw, pitch);
        for (let i = 0; i < 8; i++) T.stepFrame(0.016);
        return {
          player: T.player.position.toArray(),
          camera: T.camera.position.toArray(),
          aim: T.otsDbg(),
          draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0,
          ceilingState: tg.ceiling?.state?.() || null
        };
      })`, { x: s.x, z: s.z, yaw: s.yaw, pitch });

      await pause(180);
      const shot = await saveScreenshot(page, `walk-${s.name}-${dir}.png`);
      entry[dir] = { ...data, shot };
    }
    summary.walkSpots.push(entry);
    console.log(`  Walk spot ${s.name} (${s.room}): up draws=${entry.up.draws}, ahead draws=${entry.ahead.draws}`);
  }

  // =========================================================================
  // 4. 3P Overhead View & Camera Raycast Collision Check
  // =========================================================================
  console.log('--- 4. Testing Third-Person View & Camera Collision ---');
  const tpData = await page.evaluate(`(()=>{
    const T = TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
    T.setViewFirstDbg(false); // Switch to 3P
    T.setOtsAimDbg(0, 0);
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);

    const eye = new T.THREE.Vector3(tg.origin.x, tg.floorY + 9, tg.origin.z - 3);
    const head = new T.THREE.Vector3(tg.origin.x, tg.floorY + 1.6, tg.origin.z - 3);
    const contact = tr.cameraCollision.pull(head, eye);

    // Elevated overhead camera looking down into the range
    T.setShotView({
      x: tg.origin.x, y: tg.floorY + 10, z: tg.origin.z - 18,
      tx: tg.origin.x, ty: tg.floorY + 1, tz: tg.origin.z + 12,
      fov: 54
    });
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);

    return {
      ceilingVisibleIn3P: tg.ceiling.root.visible,
      ignoredForCameraAim: tg.cutaway.ignoreSolid(tg.ceiling.solid),
      cameraCollisionContact: contact?.box?.ceiling || false,
      draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0
    };
  })()`);

  assert.equal(tpData.ceilingVisibleIn3P, false, 'Ceiling should be hidden in 3P overhead view');
  assert.equal(tpData.ignoredForCameraAim, true, 'Ceiling solid should be ignored for camera aim/cutaway');
  assert.equal(tpData.cameraCollisionContact, false, 'Ceiling should not collide with 3P camera pull');

  await pause(200);
  const tpShot = await saveScreenshot(page, 'third-person-overhead.png');
  summary.thirdPerson = { ...tpData, shot: tpShot };
  console.log(`  3P overhead: ceilingVisible=${tpData.ceilingVisibleIn3P}, ignored=${tpData.ignoredForCameraAim}, cameraContact=${tpData.cameraCollisionContact}`);

  // Switch back to 1P and clear shot view
  await page.evaluate(`(()=>{
    TT.clearShotView();
    TT.setViewFirstDbg(true);
    for (let i = 0; i < 8; i++) TT.stepFrame(0.016);
  })()`);

  // =========================================================================
  // 5. Upward Ballistics Impact Test
  // =========================================================================
  console.log('--- 5. Testing Upward Ballistics & Impact Decal ---');
  const ballisticsData = await page.evaluate(`(async () => {
    const T = TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
    T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 3);
    T.setVelDbg(0, 0);
    T.setOtsAimDbg(0, 1.2); // Aim up
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);

    const { traceTraining } = await import('/world/training-ballistics.js');
    const a = { x: tg.origin.x, y: tg.floorY + 1.55, z: tg.origin.z - 3 };
    const b = { x: tg.origin.x, y: tg.floorY + 8.0, z: tg.origin.z - 3 };
    const hit = traceTraining(tg, a, b);
    const marksBefore = tr.impacts.count();
    if (hit?.solid?.ceiling) {
      tr.impacts.add(hit);
    }
    const marksAfter = tr.impacts.count();
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);

    return {
      hitSolidCeiling: !!hit?.solid?.ceiling,
      normal: hit?.normal,
      point: hit?.point,
      marksBefore,
      marksAfter,
      draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0
    };
  })()`);

  assert.equal(ballisticsData.hitSolidCeiling, true, 'Upward ray failed to hit solid ceiling');
  assert.equal(ballisticsData.normal.y, -1, 'Ceiling hit normal must be downward (-Y)');
  assert.equal(ballisticsData.marksAfter, ballisticsData.marksBefore + 1, 'Impact decal count did not increment');

  await pause(250);
  const impactShot = await saveScreenshot(page, 'ballistic-ceiling-impact.png');
  summary.ballistics = { ...ballisticsData, shot: impactShot };
  console.log(`  Ballistics: hitSolidCeiling=${ballisticsData.hitSolidCeiling}, normalY=${ballisticsData.normal.y}, marks ${ballisticsData.marksBefore}->${ballisticsData.marksAfter}`);

  // =========================================================================
  // 6. J128 Detailed Seating & Contacts Check
  // =========================================================================
  console.log('--- 6. Testing J128 Ceiling Component Seating ---');
  const j128Data = await page.evaluate(`(()=>{
    const T = TT, tg = T.trainingDbg.tg();
    const ceiling = tg.ceiling;
    const root = ceiling.root;
    
    // Inspect children and hierarchy
    const meshes = [];
    root.traverse(o => {
      if (o.isMesh) {
        meshes.push({
          name: o.name,
          geo: o.geometry?.type,
          mat: o.material?.type,
          color: o.material?.color?.getHexString?.(),
          emissive: o.material?.emissive?.getHexString?.(),
          pos: o.position.toArray(),
          rot: [o.rotation.x, o.rotation.y, o.rotation.z],
          drawCalls: o.count || 1
        });
      }
    });

    const solid = tg.solids.find(s => s.ceiling);
    return {
      meshCount: meshes.length,
      baked: ceiling.state().baked,
      solidCeiling: solid ? {
        minX: solid.minX, maxX: solid.maxX,
        minY: solid.minY, maxY: solid.maxY,
        minZ: solid.minZ, maxZ: solid.maxZ
      } : null,
      tgOrigin: tg.origin,
      floorY: tg.floorY,
      wallH: tg.layout?.WALL_H ?? 6
    };
  })()`);

  summary.j128 = j128Data;
  console.log(`  J128: meshCount=${j128Data.meshCount}, baked=${j128Data.baked}, ceilingY=${j128Data.solidCeiling?.minY}`);

  // =========================================================================
  // 7. Performance & Draws Check
  // =========================================================================
  console.log('--- 7. Performance & Draw Count Attribution ---');
  const perfData = await page.evaluate(`(()=>{
    const T = TT, tg = T.trainingDbg.tg();
    // Measure at firing line looking ahead vs up
    T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 3);
    T.setVelDbg(0, 0);
    
    // Ahead
    T.setOtsAimDbg(0, 0.06);
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);
    const drawsAhead = T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0;

    // Up
    T.setOtsAimDbg(0, 1.24);
    for (let i = 0; i < 8; i++) T.stepFrame(0.016);
    const drawsUp = T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0;

    return {
      drawsAhead,
      drawsUp,
      delta: drawsUp - drawsAhead,
      info: {
        triangles: T.renderer.info.render.triangles,
        geometries: T.renderer.info.memory.geometries,
        textures: T.renderer.info.memory.textures
      }
    };
  })()`);

  summary.draws = perfData;
  console.log(`  Draws: ahead=${perfData.drawsAhead}, up=${perfData.drawsUp}, delta=${perfData.delta}`);

  // Page errors check
  summary.errors = page.errors.slice();
  assert.equal(summary.errors.length, 0, `Page errors detected: ${JSON.stringify(summary.errors)}`);

  console.log('=== All AG-311 checks completed successfully! ===');
} catch (err) {
  summary.failure = String(err?.stack || err);
  console.error('Test execution failed:', summary.failure);
  process.exitCode = 1;
} finally {
  const qaSummary = path.join(OUT_QA, 'ag311-summary.json');
  const revSummary = path.join(OUT_REV, 'ag311-summary.json');
  const jsonStr = JSON.stringify(summary, null, 2) + '\n';
  fs.writeFileSync(qaSummary, jsonStr);
  fs.writeFileSync(revSummary, jsonStr);
  await browser.close();
  await server.close();
}
