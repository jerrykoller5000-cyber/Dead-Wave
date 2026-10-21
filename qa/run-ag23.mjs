import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-23');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[AG-23] Starting R3 visual verification script on GPU...');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && window.DWOpening.dismissForTesting) { window.DWOpening.dismissForTesting(); } })()`);
  await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-23'))`);
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');

  const take = async (name) => {
    await page.screenshot(path.join(SHOTS_DIR, name + '.png'));
    console.log(`[AG-23] Shot: ${name}`);
  };

  // 1. Kiosk by act
  await page.evaluate(`TT.setShopTabDbg('weapons')`);
  await wait(500);
  await take('01-day1-kiosk-weapons');

  await page.evaluate(`TT.setDay(4); TT.setWorldTime(4.4); TT.renderShop && TT.renderShop();`);
  await wait(500);
  await take('02-day4-kiosk-weapons');

  await page.evaluate(`TT.setDay(7); TT.setWorldTime(7.4); TT.renderShop && TT.renderShop();`);
  await wait(500);
  await take('03-day7-kiosk-weapons');

  await page.evaluate(`TT.setDay(10); TT.setWorldTime(10.4); TT.renderShop && TT.renderShop();`);
  await wait(500);
  await take('04-day10-kiosk-weapons');
  
  await page.evaluate(`TT.closeShop()`);
  await wait(500);

  // 2. The Relay and Calls
  await page.evaluate(`(() => {
    const cx = TT.hq.x, cz = TT.hq.z;
    TT.player.position.set(cx - 3, TT.sampleHeight(cx - 3, cz), cz);
    TT.setAimYawDbg(Math.PI / 2);
    TT.setRelayUpDbg(true);
  })()`);
  await wait(500);
  await take('05-relay-radio');

  // 3. Drums
  await page.evaluate(`(() => {
    const p = TT.player.position;
    TT.placeBuildAt('barrel', TT.gridIndex(p.x + 3), TT.gridIndex(p.z), 0);
  })()`);
  await wait(500);
  await take('06-drum-placed');

  // 4. The Vault
  await page.evaluate(`(() => {
    const p = TT.player.position;
    TT.placeBuildAt('sandbag', TT.gridIndex(p.x + 1.5), TT.gridIndex(p.z), 0);
  })()`);
  await wait(500);
  await take('07-vault-sandbag');
  
  // 5. Days 1-10 fresh run check
  console.log('[AG-23] Simulating Days 1-10 loop...');
  for(let d=1; d<=10; d++) {
    await page.evaluate(`(() => {
      TT.setDay(${d});
      TT.skipGrace();
      TT.hqStartWave();
      if (TT.drainWavePlanDbg) TT.drainWavePlanDbg();
    })()`);
    await wait(200); // let it tick
  }
  await take('08-day10-after-loop');

  const perf = await page.evaluate(`TT.perfSnapshot()`);
  console.log(`[AG-23] Final Perf:`, perf);

  console.log('[AG-23] Completed R3 verification.');
} catch (e) {
  console.error('[AG-23] Error:', e);
} finally {
  await browser.close();
  server.close();
}
