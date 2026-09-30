import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-GP');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[GP Shots] Starting script...');
const server = await serve(ROOT, 0);

async function runShots(width, isMobile) {
  const browser = await launch({ headless: true });
  const url = `${server.origin}/index.html?debug=1`;
  const name = width === 1280 ? '1280' : '390';
  
  try {
    const page = await browser.newPage({ width: width, height: isMobile ? 844 : 720 });
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

    console.log(`[GP Shots] Loaded at ${width}. Spawning in-game...`);
    
    await page.evaluate(`(() => {
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await wait(1000);

    // GP-87: Kiosk
    await page.evaluate(`(() => {
      TT.openShop();
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, `gp87-kiosk-${name}.png`));

    await page.evaluate(`(() => {
      TT.closeShop();
    })()`);
    await wait(500);

    // GP-56: Supply notice
    await page.evaluate(`(() => {
      TT.spawnSupplyDrop({x: TT.player.position.x + 10, z: TT.player.position.z, contents: 'ammo', source: 'hq'});
    })()`);
    await wait(1500);
    await page.screenshot(path.join(SHOTS_DIR, `gp56-inbound-${name}.png`));
    
    // Simulate claim
    await page.evaluate(`(() => {
      // Find the supply drop and claim it
      for (const b of TT.builds) {
        if (b.type === 'supply') {
          b.hp = -1; // "kill" it to trigger claim?
          if (TT.player) TT.player.skulls += 10;
        }
      }
    })()`);
    await wait(1500);
    await page.screenshot(path.join(SHOTS_DIR, `gp56-claimed-${name}.png`));

    // GP-76: Pause skills panel
    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, `gp76-pause-${name}.png`));
    
    // Unpause
    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    })()`);
    await wait(1000);

    // GP-76: Death skills panel
    await page.evaluate(`(() => {
      TT.player.hp = -1;
    })()`);
    await wait(5000); // wait for death screen and skills
    await page.screenshot(path.join(SHOTS_DIR, `gp76-death-${name}.png`));

  } catch (e) {
    console.error(`[GP Shots] Error at ${width}:`, e);
  } finally {
    await browser.close();
  }
}

await runShots(1280, false);
await runShots(390, true);

server.close();
console.log('[GP Shots] Done.');
