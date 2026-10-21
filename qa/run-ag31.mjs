import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-AG-31');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-31] Starting visual verification script...');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  await page.evaluate(`(() => {
    if (window.DWOpening && window.DWOpening.dismissForTesting) {
      window.DWOpening.dismissForTesting();
    }
  })()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await wait(1500);

  console.log('[AG-31] Loaded. Starting game...');
  await page.evaluate(`(() => {
    const nameEl = document.getElementById('playerName');
    if (nameEl) {
      nameEl.value = 'TestPlayer';
      nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await wait(1000);

  console.log('[AG-31] GP-85 Testing Skull Recall Chime...');
  // Test skull recall chime and UI
  // Fake some skull pickups first to have a recall? No, we can just spawn a guardian or invoke TT.killZombie
  await page.evaluate(`(() => {
    // Force a guardian kill and pickup
    const z = TT.spawnZombie(0, 0, 'shambler');
    if (z) {
      z.skulls = 15;
      z.hp = 0;
      TT.killZombie(z, 'bullet');
    }
  })()`);
  // wait for skull to zip to player
  await wait(3000);
  await page.screenshot(path.join(SHOTS_DIR, '01-gp85-skull-recall.png'));

  console.log('[AG-31] GP-53 and CL-62 Testing Guardian coming out of dark...');
  // Teleport to root cave
  await page.evaluate(`(() => {
    const cave = TT.POI.caves[0];
    const dx = Math.sin(cave.yaw);
    const dz = Math.cos(cave.yaw);
    // position marine right in front of cave mouth looking in
    const mb = TT.player;
    mb.position.set(cave.x + dx * 8, cave.gy + 1.2, cave.z + dz * 8);
    TT.setAimYawDbg(cave.yaw + Math.PI); // face into cave
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  })()`);
  
  await wait(1000); // walk into cave mouth
  await page.evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); })()`);
  await page.screenshot(path.join(SHOTS_DIR, '02-cl62-guardian-dark.png'));

  console.log('[AG-31] Shooting mouth twice...');
  // Left click once
  await page.evaluate(`(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    setTimeout(() => document.body.dispatchEvent(new MouseEvent('mouseup', { button: 0 })), 100);
  })()`);
  await wait(1000);
  // Left click twice
  await page.evaluate(`(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    setTimeout(() => document.body.dispatchEvent(new MouseEvent('mouseup', { button: 0 })), 100);
  })()`);
  
  await wait(2000);
  await page.screenshot(path.join(SHOTS_DIR, '03-cl62-guardian-chase.png'));

  console.log('[AG-31] Waiting for guardian to catch...');
  await wait(4000); // Wait for guardian to reach and catch us
  await page.screenshot(path.join(SHOTS_DIR, '04-gp53-guardian-caught-0.png'));

  console.log('[AG-31] Pressing E...');
  await page.evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); })()`);
  await wait(100);
  await page.evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); })()`);
  await wait(200);
  await page.screenshot(path.join(SHOTS_DIR, '05-gp53-guardian-caught-1.png'));

  console.log('[AG-31] Completed visual verification.');
} catch (e) {
  console.error('[AG-31] Error:', e);
} finally {
  await browser.close();
  server.close();
}
