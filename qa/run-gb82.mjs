import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-GB-82');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[GB-82] Starting UI script...');
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

  console.log('[GB-82] Loaded. Starting game...');
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

  // Normal night shot
  await page.evaluate(`(() => {
    TT.setDay(5);
    TT.setShotView(TT.shotHQ());
    TT.setWorldTime(0.70); // prep
    TT.hqStartWave(); // force wave
  })()`);
  await wait(2000);
  console.log('[GB-82] Taking normal night shot...');
  await page.screenshot(path.join(SHOTS_DIR, '01-normal-night-hq.png'));

  // Blackout night shot
  await page.evaluate(`(() => {
    TT.setDay(6);
    TT.getWavePreview(6).night.order = 'blackout';
    TT.setShotView(TT.shotHQ());
    TT.setWorldTime(0.70); // prep
    TT.hqStartWave(); // force wave
  })()`);
  await wait(2000);
  console.log('[GB-82] Taking blackout night shot...');
  await page.screenshot(path.join(SHOTS_DIR, '02-blackout-night-hq.png'));

  console.log('[GB-82] Done.');
} catch (e) {
  console.error('[GB-82] Error:', e);
} finally {
  await browser.close();
  server.close();
}
