// test-cam.mjs - Test camera framing for AG-246 escort truck
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

  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'AG246');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50);
    T.storyGatesDbg.build();
  })()`);

  const info = await page.evaluate(`(() => {
    const T = window.TT, C = T.chainDbg;
    const escort = T.scene.getObjectByName('story-escort-truck');
    const wreck = T.POI.wrecks[0];
    const wk = C.keyAt('winch');

    return {
      escortPos: [escort.position.x, escort.position.y, escort.position.z],
      escortRot: escort.rotation.y,
      wreckPos: [wreck.x, wreck.y, wreck.z],
      winchPos: wk ? [wk.x, wk.y, wk.z] : null,
      heightAt52: T.sampleHeight(-118, 52.5),
      heightAt39: T.sampleHeight(-118, 39.5),
      heightAtCenter: T.sampleHeight(-114.1, 45.97)
    };
  })()`);

  console.log('Scene Info:', JSON.stringify(info, null, 2));

  // Test View A: from z = 52.5 (px = -118, pz = 52.5)
  await page.evaluate(`(() => {
    const T = window.TT;
    const px = -118.0, pz = 52.5;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);
    const targetX = -114.1, targetZ = 45.97;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.14);
    T.setVelDbg(0, 0);
    for (let i = 0; i < 30; i++) T.stepFrame(1/60);
  })()`);
  await captureShot(page, 'test-escort-view-A.jpg');

  // Test View B: from z = 39.5 (px = -118, pz = 39.5)
  await page.evaluate(`(() => {
    const T = window.TT;
    const px = -118.0, pz = 39.5;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);
    const targetX = -114.1, targetZ = 45.97;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.14);
    T.setVelDbg(0, 0);
    for (let i = 0; i < 30; i++) T.stepFrame(1/60);
  })()`);
  await captureShot(page, 'test-escort-view-B.jpg');

  // Also test HQ Teleprinter station from z = -6.9, px = -1.25
  await page.evaluate(`(() => {
    const T = window.TT;
    const px = -1.25, pz = -6.9;
    const py = T.sampleHeight(px, pz);
    T.player.position.set(px, py, pz);
    const targetX = -1.285, targetZ = -5.215;
    const lookYaw = Math.atan2(targetX - px, targetZ - pz);
    T.setAimYawDbg(lookYaw);
    T.setOtsAimDbg(lookYaw, -0.18);
    T.setVelDbg(0, 0);
    for (let i = 0; i < 30; i++) T.stepFrame(1/60);
  })()`);
  await captureShot(page, 'test-teleprinter-close.jpg');

  await browser.close();
  await server.close();
  console.log('Done test-cam!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
