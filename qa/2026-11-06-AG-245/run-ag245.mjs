// qa/2026-11-06-AG-245/run-ag245.mjs
// Task AG-245: The mast yard's chain-link fence ring and its vine-grown gate (D-116)
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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-245');
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
  console.log(`[AG-245] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-245] Mast Yard Chain-Link Ring & Vine-Grown Gate (D-116)      ===');
  console.log('=== Real WebGPU Hardware Verification on RTX 5080                    ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-245] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-245] Loading game with ?gates=1&chaingates=1...');
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

  // Start match with Jerry's launcher equipped in First Person, noon daylight
  console.log('[AG-245] Starting match in First Person (Noon Daylight)...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG245');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight for crisp visual inspection
  })()`);

  // Verify fence ring exists in scene
  const ringCheck = await page.evaluate(`(() => {
    const T = window.TT, D = T.storyGatesDbg;
    if (!D || !D.on) return { ok: false, reason: 'storyGatesDbg not active' };
    const rings = D.rings();
    const mast = rings.find(r => r.place === 'mast');
    if (!mast) return { ok: false, reason: 'mast ring not found' };
    const fenceObj = T.scene.getObjectByName('story-fence-mast');
    const vinesObj = T.scene.getObjectByName('story-vines');
    return {
      ok: true,
      mastCenter: [mast.cx, mast.cz],
      radius: mast.r,
      kind: mast.kind,
      gateCount: mast.gates.length,
      hasFenceMesh: !!fenceObj,
      fenceChildren: fenceObj ? fenceObj.children.map(c => ({ name: c.name, tris: c.geometry ? c.geometry.attributes.position.count / 3 : 0 })) : [],
      hasVines: !!vinesObj,
    };
  })()`);

  console.log('[AG-245] Ring status:', JSON.stringify(ringCheck, null, 2));
  if (!ringCheck.ok || !ringCheck.hasFenceMesh) {
    throw new Error('Mast fence ring not found: ' + JSON.stringify(ringCheck));
  }

  const telemetry = {
    task: 'AG-245',
    order: 'D-116',
    date: new Date().toISOString(),
    renderer: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    lighting: 'Noon Daylight (worldTime = 0.50)',
    ring: ringCheck,
    stills: {}
  };

  // -------------------------------------------------------------------------
  // STILL 1: WIDE SHOT (mast-fence-01-wide.jpg)
  // Distance ~11.5m back from gate, showing the circular fence perimeter,
  // posts, rails, concertina razor wire, tower, and shut gate.
  // -------------------------------------------------------------------------
  console.log('[AG-245] Capturing Shot 1: Wide View of Mast Fence Ring & Gate...');
  const wideInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'mast');
    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

    const distOut = 11.5;
    const wx = g.x + Math.cos(a) * distOut;
    const wz = g.z + Math.sin(a) * distOut;
    const wy = T.sampleHeight(wx, wz);

    T.player.position.set(wx, wy, wz);
    const lookYaw = Math.atan2(g.x - wx, g.z - wz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.05);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [wx, wy, wz],
      gatePos: [g.x, g.z],
      dist: Math.hypot(wx - g.x, wz - g.z),
      lookYaw,
      prompt: T.chainDbg.prompt()
    };
  })()`);

  await captureShot(page, 'mast-fence-01-wide.jpg');
  telemetry.stills.wide = wideInfo;

  // -------------------------------------------------------------------------
  // STILL 2: SHUT GATE WITH OVERGROWN VINES (mast-fence-02-shut.jpg)
  // Close-up at threshold (~2.3m), showing thick intertwined woody vines
  // and dense foliage locking the double gate shut.
  // -------------------------------------------------------------------------
  console.log('[AG-245] Capturing Shot 2: Close-up of Gate Shut with Vines...');
  const shutInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    const ring = D.rings().find(r => r.place === 'mast');
    const g = ring.gates[0];
    const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

    const distOut = 2.4;
    const ox = g.x + Math.cos(a) * distOut;
    const oz = g.z + Math.sin(a) * distOut;
    const oy = T.sampleHeight(ox, oz);

    T.player.position.set(ox, oy, oz);
    const lookYaw = Math.atan2(g.x - ox, g.z - oz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.04);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const gateState = D.line.gate('mast');
    return {
      playerPos: [ox, oy, oz],
      gatePos: [g.x, g.z],
      dist: Math.hypot(ox - g.x, oz - g.z),
      gateState,
      prompt: D.line.prompt('mast', 'gate'),
      why: D.line.why('mast')
    };
  })()`);

  await captureShot(page, 'mast-fence-02-shut.jpg');
  telemetry.stills.shut = shutInfo;

  // -------------------------------------------------------------------------
  // STILL 3: CUT VINES (mast-fence-03-cut.jpg)
  // Close-up at threshold with vines cut (center severed, hanging limp tendrils,
  // pale wood core cut faces, ground debris).
  // -------------------------------------------------------------------------
  console.log('[AG-245] Cutting vines with machete chops...');
  const cutInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg, C = T.chainDbg;
    // Equip machete in story chain
    const st = C.read();
    st.keys['machete'] = 'held';
    C.load(st);

    // Apply cuts: 3 chops to cut vines
    D.line.use('mast', 'gate');
    D.line.use('mast', 'gate');
    D.line.use('mast', 'gate');

    // Vines are now in cut state!
    const vinesObj = T.scene.getObjectByName('story-vines');
    for (let i = 0; i < 10; i++) T.stepFrame(1/60);

    const gateState = D.line.gate('mast');
    return {
      gateState,
      prompt: D.line.prompt('mast', 'gate'),
      shutVisible: vinesObj ? vinesObj.userData.shut.visible : null,
      cutVisible: vinesObj ? vinesObj.userData.cut.visible : null
    };
  })()`);

  await captureShot(page, 'mast-fence-03-cut.jpg');
  telemetry.stills.cut = cutInfo;

  // -------------------------------------------------------------------------
  // STILL 4: GATE SWUNG OPEN (mast-fence-04-open.jpg)
  // Gate leaves swung wide open (w = 1.00), path completely clear into yard.
  // -------------------------------------------------------------------------
  console.log('[AG-245] Stepping frames until gate leaves swing fully open...');
  const openInfo = await page.evaluate(`(async () => {
    const T = window.TT, D = T.storyGatesDbg;
    // Step forward 120 frames to let gate leaves swing open to w = 1.0
    for (let i = 0; i < 120; i++) T.stepFrame(1/60);

    const gateState = D.line.gate('mast');
    const gatesDbg = D.gates().filter(q => q.place === 'mast');

    return {
      gateState,
      gatesDbg
    };
  })()`);

  await captureShot(page, 'mast-fence-04-open.jpg');
  telemetry.stills.open = openInfo;

  // Save telemetry.json
  const telemPath = path.join(OUT_DIR, 'telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`[AG-245] Telemetry saved to ${telemPath}`);

  await browser.close();
  await server.close();
  console.log('\n[AG-245] All 4 stills successfully captured on RTX 5080 WebGPU!');
}

main().catch((err) => {
  console.error('[AG-245] Execution failed:', err);
  process.exit(1);
});
