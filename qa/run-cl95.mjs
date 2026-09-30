import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-CL-95');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[CL-95] Starting script...');
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

  console.log('[CL-95] Loaded. Spawning shotgun with suppressor...');
  
  await page.evaluate(`(() => {
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await wait(1000);

  await page.evaluate(`(() => {
    // Buy and equip shotgun
    TT.setDay(1);
    TT.player.skulls = 9999;
    TT.buyWeapon('shotgun');
    
    // Attach suppressor
    if (TT.player.gun) {
      TT.setGunSuppressor(TT.player.gun, true);
    }

    // Position camera to see the gun from the side
    const p = TT.player.position;
    TT.setShotView({
      x: p.x - 2,
      y: p.y + 1,
      z: p.z + 2,
      tx: p.x,
      ty: p.y + 1,
      tz: p.z,
      fov: 40
    });
    
    // Make player aim
    TT.player.aiming = true;
  })()`);
  await wait(1000);
  
  await page.screenshot(path.join(SHOTS_DIR, '01-shotgun-suppressor.png'));
  console.log('[CL-95] Done.');
} catch (e) {
  console.error('[CL-95] Error:', e);
} finally {
  await browser.close();
  server.close();
}
