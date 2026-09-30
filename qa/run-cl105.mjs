import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-CL-105');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[CL-105] Starting script...');
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

  console.log('[CL-105] Loaded. Setting non-MARPAT camo and dying...');
  
  await page.evaluate(`(() => {
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await wait(1000);

  await page.evaluate(`(() => {
    // Pick a solid color or non-marpat
    if (TT.setCamo) {
      TT.setCamo('solid-tan'); // pick tan
    }
    
    // Die!
    TT.player.hp = -1;
  })()`);
  
  // Wait for the burial cine to start
  console.log('[CL-105] Waiting for burial cine...');
  await wait(5000); // Wait 5 seconds to let death fade out and burial fade in
  
  await page.screenshot(path.join(SHOTS_DIR, '01-burial-marpat.png'));
  console.log('[CL-105] Done.');
} catch (e) {
  console.error('[CL-105] Error:', e);
} finally {
  await browser.close();
  server.close();
}
