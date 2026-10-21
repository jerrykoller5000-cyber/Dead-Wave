import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-GP-57');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[GP-57] Starting script...');
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

  console.log('[GP-57] Loaded. Dispatching normal dawn...');
  
  await page.evaluate(`(() => {
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'night-cleared', day: 4, runId: 1, kind: 'plain' } }));
  })()`);
  await wait(1000);
  await page.screenshot(path.join(SHOTS_DIR, '01-normal-dawn.png'));
  
  await page.evaluate(`(() => {
    const el = document.getElementById('dawnScreen');
    if (el) el.classList.remove('show');
  })()`);
  await wait(500);

  console.log('[GP-57] Dispatching blackout dare dawn...');
  await page.evaluate(`(() => {
    const state = TT.getWaveDirectorState();
    if (!state.dare) state.dare = {};
    state.dare.last = { day: 4, earned: true, order: 'blackout', extra: 25 };
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'night-cleared', day: 4, runId: 1, kind: 'plain' } }));
  })()`);
  await wait(1000);
  
  const hasDareText = await page.evaluate(`(() => {
    const dareEl = document.getElementById('dawnDareInfo');
    return dareEl ? dareEl.innerText : null;
  })()`);
  console.log('[GP-57] Dare text found:', hasDareText);

  await page.screenshot(path.join(SHOTS_DIR, '02-blackout-dawn.png'));

  console.log('[GP-57] Done.');
} catch (e) {
  console.error('[GP-57] Error:', e);
} finally {
  await browser.close();
  server.close();
}
