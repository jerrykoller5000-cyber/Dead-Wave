import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-AG-30');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-30] Starting visual verification script...');
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

  console.log('[AG-30] Loaded. Starting game...');
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

  // 1. Kiosk Upgrades (CU-60)
  console.log('[AG-30] Testing Kiosk upgrades...');
  await page.evaluate(`(() => { TT.openShop(); TT.setShopTabDbg('fortify'); })()`);
  await wait(1000);
  await page.screenshot(path.join(SHOTS_DIR, '01-kiosk-fortify-tier1.png'));
  
  // Buy wall, check reinforced
  await page.evaluate(`(() => { TT.getUpgradeOwned()['wall'] = 0; TT.setShopTabDbg('fortify'); })()`);
  await wait(500);
  await page.screenshot(path.join(SHOTS_DIR, '02-kiosk-fortify-wall-bought.png'));

  // Buy reinforced, check stone
  await page.evaluate(`(() => { TT.getUpgradeOwned()['reinforced'] = 0; TT.setShopTabDbg('fortify'); })()`);
  await wait(500);
  await page.screenshot(path.join(SHOTS_DIR, '03-kiosk-fortify-reinforced-bought.png'));

  // Gear tab
  await page.evaluate(`(() => { TT.setShopTabDbg('gear'); })()`);
  await wait(500);
  await page.screenshot(path.join(SHOTS_DIR, '04-kiosk-gear-initial.png'));

  // Buy helmet, check night vision
  await page.evaluate(`(() => { TT.getGearOwned()['helmet'] = true; TT.setShopTabDbg('gear'); })()`);
  await wait(500);
  await page.screenshot(path.join(SHOTS_DIR, '05-kiosk-gear-helmet-bought.png'));
  await page.evaluate(`(() => { TT.closeShop(); })()`);
  await wait(500);

  // 2. CIF Window (CU-61)
  console.log('[AG-30] Testing CIF camo window...');
  await page.evaluate(`(() => { TT.openCIF(); })()`);
  await wait(1000);
  await page.screenshot(path.join(SHOTS_DIR, '06-cif-window.png'));
  await page.evaluate(`(() => { TT.closeCIF(); })()`);
  await wait(500);

  // 3. Roll (GP-75)
  console.log('[AG-30] Testing roll...');
  await page.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
  })()`);
  await wait(300);
  await page.screenshot(path.join(SHOTS_DIR, '07-marine-roll-forward.png'));
  await page.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  })()`);
  await wait(1000); // Wait for cooldown
  
  // 4. Idle (GP-74)
  console.log('[AG-30] Testing marine idle... waiting 26 seconds...');
  // Instead of waiting real time, we can advance clock if possible. Let's just wait real time, it's reliable.
  await wait(26000);
  await page.screenshot(path.join(SHOTS_DIR, '08-marine-idle-smoke.png'));

  // 5. Swarm
  console.log('[AG-30] Testing swarm...');
  await page.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const devConsoleInput = document.getElementById('devConsoleInput');
    if (devConsoleInput) {
      devConsoleInput.value = 'swarm';
      devConsoleInput.dispatchEvent(new Event('input'));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    }
  })()`);
  await wait(5000);
  await page.screenshot(path.join(SHOTS_DIR, '09-swarm-after-5s.png'));

  console.log('[AG-30] Completed visual verification.');
} catch (e) {
  console.error('[AG-30] Error:', e);
} finally {
  await browser.close();
  server.close();
}
