import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-AG-22');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-22] Starting R2 visual verification script on GPU...');
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

  console.log('[AG-22] Loaded. Starting game...');
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

  // Setup dw-game listener
  await page.evaluate(`(() => {
    window._lastWavePush = null;
    window.addEventListener('dw-game', (e) => {
      if (e.detail && e.detail.type === 'wave-push') {
        window._lastWavePush = e.detail;
      }
    });
  })()`);

  const testNight = async (nightStr, dayNum) => {
    console.log(`[AG-22] Skipping to Night ${dayNum}...`);
    await page.evaluate(`(() => {
      TT.setDay(${dayNum});
      window._lastWavePush = null;
      TT.skipGrace();
      TT.setWorldTime(0.70); // Prep time
      TT.hqStartWave(); // Force start wave
    })()`);
    
    // Wait for the wave to start and the surge
    console.log(`[AG-22] Waiting for surge on Night ${dayNum}...`);
    // Wave should start around 0.75 and push should happen soon.
    // Let's just wait until we see a wave-push event.
    let surge = null;
    for (let i = 0; i < 40; i++) { // max 40 seconds
      await wait(1000);
      surge = await page.evaluate(`window._lastWavePush`);
      if (surge) break;
    }
    if (surge) {
      console.log(`[AG-22] Surge detected:`, surge);
    } else {
      console.log(`[AG-22] No surge detected within 40 seconds on Night ${dayNum}.`);
    }

    await page.screenshot(path.join(SHOTS_DIR, `0${nightStr}-night${dayNum}-surge.png`));
    
    const perf = await page.evaluate(`(() => {
      return TT.perfSnapshot();
    })()`);
    console.log(`[AG-22] Night ${dayNum} Perf:`, perf);
  };

  await testNight('1', 5);
  await testNight('2', 10);
  await testNight('3', 13);

  console.log('[AG-22] Completed R2 verification.');
} catch (e) {
  console.error('[AG-22] Error:', e);
} finally {
  await browser.close();
  server.close();
}
