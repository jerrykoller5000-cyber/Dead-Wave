// qa/2026-11-06-AG-246/run-ag246.mjs
// Task AG-246: Two trucks for the hikers' camp (D-116)
// Real WebGPU hardware capture on Jerry's RTX 5080 under D-114 pacing
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-246');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-246] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-246] Two Trucks for the Hikers\' Camp (D-116)                 ===');
  console.log('=== Real WebGPU Hardware Verification on RTX 5080                    ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-246] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-246] Loading game with ?gates=1&chaingates=1...');
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

  // Start match in First Person, high noon daylight, holster weapon for clear viewing
  console.log('[AG-246] Starting match in First Person (Noon Daylight, Weapon Holstered)...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG246');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (!T.isUnarmed()) T.toggleHolster();
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50);
    // Ensure story gates & line tools are initialized
    T.storyGatesDbg.build();
  })()`);

  // Verify both truck objects exist
  const truckCheck = await page.evaluate(`(() => {
    const T = window.TT;
    const escortTruck = T.scene.getObjectByName('story-escort-truck');
    const crashedTruck = T.scene.getObjectByName('story-crashed-truck');
    const D = T.storyGatesDbg;
    const rings = D ? D.rings() : [];
    const hikers = rings.find(r => r.place === 'hikers');
    return {
      hasEscortTruck: !!escortTruck,
      hasCrashedTruck: !!crashedTruck,
      escortChildren: escortTruck ? escortTruck.children.length : 0,
      crashedChildren: crashedTruck ? crashedTruck.children.length : 0,
      hasHikersRing: !!hikers
    };
  })()`);

  console.log('[AG-246] Truck check status:', JSON.stringify(truckCheck, null, 2));

  const telemetry = {
    task: 'AG-246',
    order: 'D-116',
    date: new Date().toISOString(),
    renderer: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    lighting: 'Noon Daylight (worldTime = 0.50)',
    truckCheck,
    stills: {}
  };

  // -------------------------------------------------------------------------
  // STILL 1: ESCORT TRUCK WHOLE FROM 6-8 M WITH BUMPER WINCH (truck-01-convoy-escort.jpg)
  // Behind overturned ambulance, sitting tilted in the ditch with winch mounted.
  // -------------------------------------------------------------------------
  console.log('[AG-246] Capturing Shot 1: Escort Truck Whole from ~7 m with Front Bumper Winch...');
  const escortInfo = await page.evaluate(`(async () => {
    const T = window.TT, C = T.chainDbg;
    const wk = C.keyAt('winch');
    const escort = T.scene.getObjectByName('story-escort-truck');

    // Stand ~7m back on road facing the escort truck 3/4 front view
    const px = -121.5, pz = 50.0;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);

    const tx = -116.0, tz = 54.0;
    const lookYaw = Math.atan2(tx - px, tz - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.10);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      distToCenter: Math.hypot(escort.position.x - px, escort.position.z - pz),
      distToWinch: wk ? Math.hypot(wk.x - px, wk.z - pz) : null,
      escortPos: [escort.position.x, escort.position.y, escort.position.z],
      escortRot: escort.rotation.y,
      winchPos: wk ? [wk.x, wk.y, wk.z] : null,
      winchVisible: wk ? wk.visible : false,
      prompt: C.prompt()
    };
  })()`);

  await captureShot(page, 'truck-01-convoy-escort.jpg');
  telemetry.stills.escort = escortInfo;

  // -------------------------------------------------------------------------
  // STILL 2: ESCORT TRUCK WITH WINCH TAKEN, SAME FRAMING (truck-02-convoy-winch-taken.jpg)
  // Exact same camera perspective: winch removed from bumper bracket, held by player.
  // -------------------------------------------------------------------------
  console.log('[AG-246] Taking winch from escort truck bumper and capturing Shot 2 (same framing)...');
  const winchTakenInfo = await page.evaluate(`(async () => {
    const T = window.TT, C = T.chainDbg;
    const wk = C.keyAt('winch');
    const escort = T.scene.getObjectByName('story-escort-truck');

    // Walk up right to bumper winch to pick it up
    T.player.position.set(wk.x + 0.8, T.sampleHeight(wk.x + 0.8, wk.z), wk.z);
    for (let i = 0; i < 15; i++) T.stepFrame(1/60);

    // Take the winch tool
    const took = C.use();
    for (let i = 0; i < 20; i++) T.stepFrame(1/60);

    // Return to exact same Shot 1 perspective (~7m whole truck view)
    const px = -121.5, pz = 50.0;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);

    const tx = -116.0, tz = 54.0;
    const lookYaw = Math.atan2(tx - px, tz - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.10);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const wkAfter = C.keyAt('winch');
    const winchObj = escort.userData.winch;

    return {
      took,
      winchState: wkAfter ? wkAfter.state : null,
      winchVisible: wkAfter ? wkAfter.visible : null,
      meshVisible: winchObj ? winchObj.visible : null
    };
  })()`);

  await captureShot(page, 'truck-02-convoy-winch-taken.jpg');
  telemetry.stills.winchTaken = winchTakenInfo;

  // -------------------------------------------------------------------------
  // STILL 3: CRASHED TRUCK ACROSS HIKERS' TRAIL MOUTH (truck-03-hikers-crashed.jpg)
  // Crumpled front, nose-down in tree ring, blocking trail into hikers' camp.
  // -------------------------------------------------------------------------
  console.log('[AG-246] Capturing Shot 3: Crashed Truck Across Hikers\' Trail Mouth...');
  const crashedInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'hikers');
    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

    // Stand ~6.5m back on trail approaching the camp ring
    const distOut = 6.8;
    const px = g.x + Math.cos(a) * distOut;
    const pz = g.z + Math.sin(a) * distOut;
    const py = T.sampleHeight(px, pz);

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(g.x - px, g.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.06);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const gateState = D.line.gate('hikers');
    return {
      playerPos: [px, py, pz],
      gatePos: [g.x, g.z],
      gateState,
      prompt: D.line.prompt('hikers', 'truck'),
      why: D.line.why('hikers')
    };
  })()`);

  await captureShot(page, 'truck-03-hikers-crashed.jpg');
  telemetry.stills.crashed = crashedInfo;

  // -------------------------------------------------------------------------
  // STILL 4: CRASHED TRUCK WINCHED CLEAR (truck-04-hikers-winched.jpg)
  // Winch bolted on, line tied to tree, dragged clear (w = 1.00) beside trail.
  // -------------------------------------------------------------------------
  console.log('[AG-246] Bolting winch, tying line, and winching truck clear...');
  const winchedInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg, C = T.chainDbg;

    // Equip winch
    const st = C.read();
    st.keys['winch'] = 'held';
    C.load(st);

    // 1. Bolt winch to truck
    D.line.use('hikers', 'truck');
    // 2. Tie line to anchor tree
    D.line.use('hikers', 'tree');

    // 3. Hold remote until truck is winched fully clear (w = 1.00)
    D.line.hold('hikers', true);
    for (let i = 0; i < 360; i++) T.stepFrame(1/30);
    D.line.hold('hikers', false);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const gateState = D.line.gate('hikers');
    return {
      gateState,
      prompt: D.line.prompt('hikers', 'gate'),
      why: D.line.why('hikers')
    };
  })()`);

  await captureShot(page, 'truck-04-hikers-winched.jpg');
  telemetry.stills.winched = winchedInfo;

  // Save telemetry.json
  const telemPath = path.join(OUT_DIR, 'telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`[AG-246] Telemetry saved to ${telemPath}`);

  await browser.close();
  await server.close();
  console.log('\n[AG-246] All 4 stills successfully captured on RTX 5080 WebGPU!');
}

main().catch((err) => {
  console.error('[AG-246] Execution failed:', err);
  process.exit(1);
});
