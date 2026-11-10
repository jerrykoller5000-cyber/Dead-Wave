// tools/ag-review-runner-ag278.mjs - Antigravity visual runner for AG-278 / J104
// Independent RTX 5080 WebGPU review of J104:
// "Move Security door keypads flush against the security door trim. The yellow and blacked striped trim."

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-278 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_QA = path.join(ROOT, 'qa/AG-278');
fs.mkdirSync(OUT_DIR_QA, { recursive: true });

const mode = process.argv.includes('--after') ? 'after' : 'before';

function writeFileSyncWithRetry(filePath, data, retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      try { fs.unlinkSync(filePath); } catch (_) {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const buf = Buffer.from(shot.data, 'base64');
  const p = path.join(OUT_DIR_QA, `${mode}-${filename}`);
  writeFileSyncWithRetry(p, buf);
  console.log(`[AG-278] Captured: ${mode}-${filename} (${shot.data.length} bytes)`);
  return p;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log(`=== [AG-278] J104 Security Door Keypad Review on RTX 5080 (${mode.toUpperCase()}) ===`);
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-278] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-278] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Enter Training Ground as JERRY
    console.log('[AG-278] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      else if (window.TT && window.TT.enterTraining) window.TT.enterTraining();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-278] Training Ground active.');

    // Configure marine & camera
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setWorldTime(0.42);
    })()`);
    await wait(500);

    // Inspect scene graph objects around security door
    const sceneReport = await page.evaluate(`(() => {
      const T = window.TT;
      const tg = T.trainingDbg.state().tg;
      if (!tg) return { error: 'No tg found' };
      const door = tg.securityDoor;
      return {
        doorPos: { x: door.x, z: door.z, minZ: door.minZ, maxZ: door.maxZ },
        keypads: door.keypads.map(k => ({
          side: k.side,
          x: k.x,
          y: k.y,
          z: k.z,
          front: k.front
        }))
      };
    })()`);
    console.log('[AG-278] Scene Door Info:', JSON.stringify(sceneReport, null, 2));

    // Shot 1: Range side overview of security door & keypad
    console.log('[AG-278] Positioning at Range side (overview)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      // Door is at x = -8, z = -648, D.minZ = -649.5, floorY = -200
      // Stand at Range side: x = -5.0, z = -649.5, looking towards door (-X)
      const yaw = -Math.PI / 2;
      T.player.position.set(-5.0, -200, -649.5);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, 0);
      T.stepFrame(0.016);
    })()`);
    await wait(800);
    await captureShot(page, '01-range-door-overview.png');

    // Shot 2: Range side close-up of keypad & trim
    console.log('[AG-278] Positioning at Range side (close-up)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      const yaw = -Math.PI / 2;
      T.player.position.set(-7.0, -200, -649.5);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, 0);
      T.stepFrame(0.016);
    })()`);
    await wait(800);
    await captureShot(page, '02-range-keypad-closeup.png');

    // Shot 3: Build room side overview
    console.log('[AG-278] Positioning at Build room side (overview)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      const yaw = Math.PI / 2;
      T.player.position.set(-11.0, -200, -649.5);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, 0);
      T.stepFrame(0.016);
    })()`);
    await wait(800);
    await captureShot(page, '03-build-door-overview.png');

    // Shot 4: Build room side close-up
    console.log('[AG-278] Positioning at Build room side (close-up)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      const yaw = Math.PI / 2;
      T.player.position.set(-9.0, -200, -649.5);
      T.player.rotation.y = yaw;
      T.setAimYawDbg(yaw);
      T.setOtsAimDbg(yaw, 0);
      T.stepFrame(0.016);
    })()`);
    await wait(800);
    await captureShot(page, '04-build-keypad-closeup.png');

    // Test interaction: toggle security door via keypad
    console.log('[AG-278] Testing door interaction...');
    const interactRes = await page.evaluate(`(() => {
      const T = window.TT;
      const tg = T.trainingDbg.state().tg;
      const sec = T.trainingDbg.state().security;
      const initialAmount = tg.securityDoor.shutter.position.y;
      const toggled = sec.toggle();
      return { initialAmount, toggled, newAmount: tg.securityDoor.shutter.position.y };
    })()`);
    console.log('[AG-278] Door interaction toggle:', interactRes);
    await wait(1000);
    await captureShot(page, '05-door-shutter-toggled.png');

    fs.writeFileSync(
      path.join(OUT_DIR_QA, `${mode}-metrics.json`),
      JSON.stringify({ mode, sceneReport, interactRes }, null, 2)
    );

    console.log(`\n[AG-278] Completed ${mode} run successfully.`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('[AG-278] Fatal error:', err);
  process.exit(1);
});
