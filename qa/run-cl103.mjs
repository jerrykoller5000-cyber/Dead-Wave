import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-CL-103');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[CL-103] Starting script...');
const server = await serve(ROOT, 0);

async function runTest() {
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

    console.log('[CL-103] Loaded. Checking prep...');
    
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'TestMarine';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    
    await page.waitFor(`window.TT && window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 120000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await wait(1000);

    // We are in prep.
    // Position camera to see both windows from a few meters out on the east wall
    await page.evaluate(`(() => {
      const zMid = (TT.HQ_CIF_FRONT.z + TT.HQ_ARMORY_FRONT.z) / 2;
      TT.player.position.set(TT.HQ_CIF_FRONT.x + 4, TT.player.position.y, zMid);
      TT.setAimYawDbg(Math.PI / 2); // Look west towards the wall
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, '01-windows-side-by-side.png'));

    // Walk to Armory and get prompt
    console.log('[CL-103] Armory prompt...');
    await page.evaluate(`(() => {
      TT.player.position.set(TT.HQ_ARMORY_FRONT.x, TT.player.position.y, TT.HQ_ARMORY_FRONT.z);
      TT.setAimYawDbg(Math.PI / 2);
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, '02-armory-prompt.png'));

    // Press E to open Armory
    console.log('[CL-103] Opening Armory...');
    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, '03-armory-panel.png'));

    // Close Armory
    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    })()`);
    await wait(500);

    // Walk to CIF and get prompt
    console.log('[CL-103] CIF prompt...');
    await page.evaluate(`(() => {
      TT.player.position.set(TT.HQ_CIF_FRONT.x, TT.player.position.y, TT.HQ_CIF_FRONT.z);
      TT.setAimYawDbg(Math.PI / 2);
    })()`);
    await wait(1000);
    await page.screenshot(path.join(SHOTS_DIR, '04-cif-prompt.png'));

    // 48-zombie frame check near the HQ
    console.log('[CL-103] 48-zombie frame check...');
    await page.evaluate(`(() => {
      // Move a bit away
      TT.player.position.set(TT.HQ_CIF_FRONT.x + 10, TT.player.position.y, TT.HQ_CIF_FRONT.z + 10);
      TT.setAimYawDbg(-Math.PI * 0.75); // Look towards HQ
      
      for(let i=0; i<48; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 5 + Math.random() * 10;
        TT.spawnZombie('walker', TT.player.position.x + Math.cos(a)*d, TT.player.position.z + Math.sin(a)*d);
      }
    })()`);
    await wait(2000);
    await page.screenshot(path.join(SHOTS_DIR, '05-48-zombie-frame-check.png'));
    
  } catch (e) {
    console.error('[CL-103] Error:', e);
  } finally {
    await browser.close();
  }
}

await runTest();
server.close();
console.log('[CL-103] Done.');
