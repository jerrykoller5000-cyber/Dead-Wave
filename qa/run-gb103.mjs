import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-GB-103');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[GB-103] Starting script...');
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

  console.log('[GB-103] Loaded. Spawning turret and zombies...');
  
  await page.evaluate(`(() => {
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await wait(1000);

  // Night 10 turret under attack
  await page.evaluate(`(() => {
    TT.setDay(10);
    const p = TT.player.position;
    
    // Spawn turret
    const turret = TT.spawnBuild('turret', p.x + 4, p.z);
    
    // Spawn brute
    const brute = TT.spawnZombie({ kind: 'brute', x: p.x + 5, z: p.z + 1 });
    
    // Position camera
    TT.setShotView({
      x: p.x + 2,
      y: p.y + 2,
      z: p.z - 3,
      tx: p.x + 4,
      ty: p.y + 1,
      tz: p.z,
      fov: 50
    });
  })()`);
  await wait(2000);
  await page.screenshot(path.join(SHOTS_DIR, '01-turret-attack.png'));

  // Night 13
  await page.evaluate(`(() => {
    TT.setDay(13);
    const p = TT.player.position;
    TT.setWorldTime(0.70); // prep
    TT.hqStartWave(); // start wave
    TT.setShotView({
      x: p.x,
      y: p.y + 5,
      z: p.z - 10,
      tx: p.x,
      ty: p.y,
      tz: p.z,
      fov: 60
    });
  })()`);
  await wait(2000);
  await page.screenshot(path.join(SHOTS_DIR, '02-night-13.png'));

  // Night 20
  await page.evaluate(`(() => {
    TT.setDay(20);
    TT.setWorldTime(0.70); // prep
    TT.hqStartWave(); // start wave
  })()`);
  await wait(3000);
  await page.screenshot(path.join(SHOTS_DIR, '03-night-20.png'));

  console.log('[GB-103] Done.');
} catch (e) {
  console.error('[GB-103] Error:', e);
} finally {
  await browser.close();
  server.close();
}
