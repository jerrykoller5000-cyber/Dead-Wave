import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-51');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

async function run() {
  console.log('[AG-51] Starting visual verification script...');
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    const url = `${server.origin}/index.html?debug=1`;
    await page.goto(url, { waitUntil: 'none' });
    
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      if (window.DWOpening && window.DWOpening.dismissForTesting) {
        window.DWOpening.dismissForTesting();
      }
    })()`);
    await page.waitFor('!!window.TT', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1. Title Menu & Guide
    console.log('[AG-51] Capturing guide controls...');
    await page.screenshot(path.join(SHOTS_DIR, '01-title-menu.png'));
    await page.evaluate(`(() => { const b = document.getElementById('modeGuide'); if(b) b.click(); })()`);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot(path.join(SHOTS_DIR, '02-guide-controls.png'));
    await page.evaluate(`(() => { const c = document.querySelector('#guideWindow .close'); if(c) c.click(); })()`);
    await new Promise(r => setTimeout(r, 500));

    // 2. Start game to check Armory & Kiosk hints
    console.log('[AG-51] Entering main game...');
    await page.evaluate(`(() => { const b = document.getElementById('modeHunt'); if(b) b.click(); })()`);
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('[AG-51] Opening shop...');
    await page.evaluate(`(() => { if (TT && TT.openShop) TT.openShop(); })()`);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot(path.join(SHOTS_DIR, '03-supply-terminal.png'));
    await page.evaluate(`(() => { if (TT && TT.closeShop) TT.closeShop(); })()`);
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Training Ground
    // Need to reload to go back to title to enter training ground
    console.log('[AG-51] Reloading for Training Ground...');
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      if (window.DWOpening && window.DWOpening.dismissForTesting) {
        window.DWOpening.dismissForTesting();
      }
    })()`);
    await page.waitFor('!!window.TT', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await new Promise(r => setTimeout(r, 1500));
    
    console.log('[AG-51] Entering Training Ground...');
    await page.evaluate(`(() => { const b = document.getElementById('modeTraining'); if(b) b.click(); })()`);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot(path.join(SHOTS_DIR, '04-training-hud.png'));
    
    await page.evaluate(`(() => {
      const w = document.getElementById('trainingWindow');
      if (w) w.style.display = 'block';
    })()`);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot(path.join(SHOTS_DIR, '05-training-panel.png'));

    console.log('[AG-51] Visual verification completed.');
  } catch (e) {
    console.error('[AG-51] Error:', e);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(console.error);
