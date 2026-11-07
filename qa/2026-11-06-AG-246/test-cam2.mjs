// test-cam2.mjs - Test camera framing for AG-246 escort truck and AG-247 teleprinter
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

async function captureShot(page, filename) {
  const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot: ${filename}`);
  return outPath;
}

async function main() {
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('Serving from:', url);

  const browser = await launch({
    headless: false,
    args: ['--window-position=-2400,-2400', '--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(url, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });

  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match, holster weapon for unobstructed screenshots
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG246');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (!T.isUnarmed()) T.toggleHolster(); // Holster weapon
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50);
    T.storyGatesDbg.build();
  })()`);

  // ---------------------------------------------------------------------------
  // AG-246: Escort truck whole from 6-8 m with bumper winch visible
  // ---------------------------------------------------------------------------
  console.log('Testing AG-246 Escort Truck at px = -114.5, pz = 52.0...');
  const escortTelemetry = await page.evaluate(`(() => {
    const T = window.TT, C = T.chainDbg;
    const px = -114.5, pz = 52.0;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);

    const escort = T.scene.getObjectByName('story-escort-truck');
    const targetX = -114.1, targetZ = 45.97;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.12);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const wk = C.keyAt('winch');
    return {
      playerPos: [px, py, pz],
      distToTruck: Math.hypot(targetX - px, targetZ - pz),
      distToWinch: wk ? Math.hypot(wk.x - px, wk.z - pz) : null,
      winchVisible: wk ? wk.visible : false
    };
  })()`);
  console.log('Escort Telemetry:', escortTelemetry);
  await captureShot(page, 'test-escort-panel-1.jpg');

  // Now take the winch tool and capture panel 2 from the exact same camera position
  console.log('Taking winch and capturing panel 2...');
  const takenTelemetry = await page.evaluate(`(async () => {
    const T = window.TT, C = T.chainDbg;
    const escort = T.scene.getObjectByName('story-escort-truck');
    const wk = C.keyAt('winch');

    // Walk up to winch to take it
    T.player.position.set(wk.x + 0.8, T.sampleHeight(wk.x + 0.8, wk.z), wk.z);
    for (let i = 0; i < 15; i++) T.stepFrame(1/60);
    const took = C.use();
    for (let i = 0; i < 20; i++) T.stepFrame(1/60);

    // Reposition back to exact same shot 1 perspective
    const px = -114.5, pz = 52.0;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);
    const targetX = -114.1, targetZ = 45.97;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.12);
    T.setVelDbg(0, 0);

    for (let i = 0; i < 30; i++) T.stepFrame(1/60);

    const wkAfter = C.keyAt('winch');
    return {
      took,
      winchVisible: wkAfter ? wkAfter.visible : false,
      meshVisible: escort.userData.winch ? escort.userData.winch.visible : false
    };
  })()`);
  console.log('Taken Telemetry:', takenTelemetry);
  await captureShot(page, 'test-escort-panel-2.jpg');

  // ---------------------------------------------------------------------------
  // AG-247: Teleprinter close-up from 1.5 - 2 m (4 panels)
  // ---------------------------------------------------------------------------
  console.log('Testing AG-247 Teleprinter close-ups...');
  const OUT_DIR_247 = path.join(ROOT, 'qa/2026-11-06-AG-247');
  fs.mkdirSync(OUT_DIR_247, { recursive: true });

  const capture247 = async (name) => {
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
    const outPath = path.join(OUT_DIR_247, name);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved 247 screenshot: ${name}`);
    return outPath;
  };

  // Position at desk from 1.7m (px = -1.25, pz = -6.95)
  await page.evaluate(`(() => {
    const T = window.TT;
    const px = -1.25, pz = -6.95;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);
    const targetX = -1.285, targetZ = -5.215;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.18);
    T.setVelDbg(0, 0);
    for (let i = 0; i < 30; i++) T.stepFrame(1/60);
  })()`);

  // Shot 1: Idle
  await capture247('test-teleprinter-01-idle.jpg');

  // Shot 2: Chatter print
  await page.evaluate(`(() => {
    const T = window.TT;
    const tp = T.scene.getObjectByName('hq-teleprinter');
    const ctrl = tp.userData.controller;
    ctrl.print('RELAY');
    for (let i = 0; i < 48; i++) T.stepFrame(1/60);
  })()`);
  await capture247('test-teleprinter-02-chatter.jpg');

  // Shot 3: Sheet ready
  await page.evaluate(`(() => {
    const T = window.TT;
    for (let i = 0; i < 60; i++) T.stepFrame(1/60);
  })()`);
  await capture247('test-teleprinter-03-ready.jpg');

  // Shot 4: Stamping
  await page.evaluate(`(() => {
    const T = window.TT;
    const tp = T.scene.getObjectByName('hq-teleprinter');
    const ctrl = tp.userData.controller;
    ctrl.stamp();
    for (let i = 0; i < 26; i++) T.stepFrame(1/60);
  })()`);
  await capture247('test-teleprinter-04-stamp.jpg');

  await browser.close();
  await server.close();
  console.log('Done test-cam2!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
