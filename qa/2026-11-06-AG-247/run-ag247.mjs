// qa/2026-11-06-AG-247/run-ag247.mjs
// Task AG-247: The HQ teleprinter and the duty board's stamp (D-116)
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
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-247');
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
  console.log(`[AG-247] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-247] HQ Teleprinter & Duty Board Stamp (D-116)               ===');
  console.log('=== Real WebGPU Hardware Verification on RTX 5080                    ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-247] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-247] Loading game...');
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

  // Start match in First Person inside HQ
  console.log('[AG-247] Starting match in First Person inside HQ...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG247');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50); // Noon daylight
  })()`);

  // Check teleprinter object exists in scene
  const objCheck = await page.evaluate(`(() => {
    const T = window.TT;
    const tpObj = T.scene.getObjectByName('hq-teleprinter');
    const dbObj = T.scene.getObjectByName('hq-duty-board');
    return {
      hasTeleprinter: !!tpObj,
      hasDutyBoard: !!dbObj,
      tpChildren: tpObj ? tpObj.children.length : 0,
      tpPos: tpObj ? [tpObj.position.x, tpObj.position.y, tpObj.position.z] : null,
      dbPos: dbObj ? [dbObj.position.x, dbObj.position.y, dbObj.position.z] : null
    };
  })()`);

  console.log('[AG-247] Station status:', JSON.stringify(objCheck, null, 2));

  const telemetry = {
    task: 'AG-247',
    order: 'D-116',
    date: new Date().toISOString(),
    renderer: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    lighting: 'Noon Daylight (worldTime = 0.50)',
    objCheck,
    stills: {}
  };

  // -------------------------------------------------------------------------
  // STILL 1: TELEPRINTER IDLE BESIDE DUTY BOARD (teleprinter-01-idle.jpg)
  // Player standing in front of duty board and teleprinter desk.
  // -------------------------------------------------------------------------
  console.log('[AG-247] Capturing Shot 1: Teleprinter Idle on Desk beside Duty Board...');
  const idleInfo = await page.evaluate(`(async () => {
    const T = window.TT;
    const db = T.scene.getObjectByName('hq-duty-board');
    const tp = T.scene.getObjectByName('hq-teleprinter');

    // Teleprinter world position
    const tpWorld = new T.THREE.Vector3();
    tp.getWorldPosition(tpWorld);

    // Stand ~2.1m back in Center Bay looking south at the duty board & teleprinter desk
    const px = tpWorld.x - 0.4;
    const pz = tpWorld.z + 1.85;
    const py = tpWorld.y + 1.25;

    T.player.position.set(px, py, pz);
    const lookYaw = Math.atan2(tpWorld.x - px, tpWorld.z - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.22);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    return {
      playerPos: [px, py, pz],
      tpWorld: [tpWorld.x, tpWorld.y, tpWorld.z],
      lookYaw
    };
  })()`);

  await captureShot(page, 'teleprinter-01-idle.jpg');
  telemetry.stills.idle = idleInfo;

  // -------------------------------------------------------------------------
  // STILL 2: CHATTERING & FEEDING OUT ORDER SHEET (teleprinter-02-chatter-print.jpg)
  // Closer view as teleprinter chatters and feeds paper strip out of platen.
  // -------------------------------------------------------------------------
  console.log('[AG-247] Triggering print() and capturing mid-feed chatter...');
  const chatterInfo = await page.evaluate(`(async () => {
    const T = window.TT;
    const tp = T.scene.getObjectByName('hq-teleprinter');
    const ctrl = tp.userData.controller;

    // Trigger print
    ctrl.print('RELAY');

    // Step 0.8s into the 1.6s print animation (mid-feed chatter)
    for (let i = 0; i < 48; i++) T.stepFrame(1/60);

    return {
      isPrinting: ctrl.isPrinting,
      hasSheet: ctrl.hasSheet
    };
  })()`);

  await captureShot(page, 'teleprinter-02-chatter-print.jpg');
  telemetry.stills.chatter = chatterInfo;

  // -------------------------------------------------------------------------
  // STILL 3: ORDER SHEET FULLY PRINTED (teleprinter-03-sheet-ready.jpg)
  // Complete printed order sheet resting on the front feed ramp.
  // -------------------------------------------------------------------------
  console.log('[AG-247] Stepping to completion of order feed-out...');
  const readyInfo = await page.evaluate(`(async () => {
    const T = window.TT;
    const tp = T.scene.getObjectByName('hq-teleprinter');
    const ctrl = tp.userData.controller;

    // Step remaining 1.0s to finish feed-out
    for (let i = 0; i < 60; i++) T.stepFrame(1/60);

    return {
      isPrinting: ctrl.isPrinting,
      hasSheet: ctrl.hasSheet
    };
  })()`);

  await captureShot(page, 'teleprinter-03-sheet-ready.jpg');
  telemetry.stills.ready = readyInfo;

  // -------------------------------------------------------------------------
  // STILL 4: RUBBER STAMP FILING ACTION (teleprinter-04-stamping.jpg)
  // Rubber stamp animated downward to stamp order sheet on the desk/pad.
  // -------------------------------------------------------------------------
  console.log('[AG-247] Triggering stamp() animation...');
  const stampInfo = await page.evaluate(`(async () => {
    const T = window.TT;
    const tp = T.scene.getObjectByName('hq-teleprinter');
    const ctrl = tp.userData.controller;

    // Trigger stamp
    ctrl.stamp();

    // Step into impact phase (0.45s into 0.55s cycle)
    for (let i = 0; i < 26; i++) T.stepFrame(1/60);

    const stampMesh = tp.getObjectByName('duty-board-rubber-stamp');

    return {
      isStamping: ctrl.isStamping,
      stampY: stampMesh ? stampMesh.position.y : null
    };
  })()`);

  await captureShot(page, 'teleprinter-04-stamping.jpg');
  telemetry.stills.stamp = stampInfo;

  // Save telemetry.json
  const telemPath = path.join(OUT_DIR, 'telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`[AG-247] Telemetry saved to ${telemPath}`);

  await browser.close();
  await server.close();
  console.log('\n[AG-247] All 4 stills successfully captured on RTX 5080 WebGPU!');
}

main().catch((err) => {
  console.error('[AG-247] Execution failed:', err);
  process.exit(1);
});
