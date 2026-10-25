// GP-19967: real-renderer proof of the three supply terminal views.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = path.join(root, 'handoffs', 'GP-19967-shots');
const narrowOnly = process.argv.includes('--narrow-only');
const server = await serve(root, 0);
let browser, page;
try {
  browser = await launch({ headless: true });
  page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  if (!await page.waitFor('!!window.TT && DWLoad.snapshot().state === "ready"', { timeout: 120000 })) throw new Error('game never became ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!DWOpening.active', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Supply Tester'; document.getElementById('modeHunt').click(); const card = document.getElementById('firstRunCard'); if (card && !card.hidden) document.getElementById('firstRunPlay')?.click(); })()`);
  if (!await page.waitFor('TT.getPhase() === "prep"', { timeout: 45000 })) throw new Error('prep never started');
  if (!await page.waitFor('!document.body.classList.contains("deploying")', { timeout: 90000 })) throw new Error('insertion never finished');
  await page.evaluate('TT.openShop(true)');
  if (!await page.waitFor('document.getElementById("shop").classList.contains("show")', { timeout: 5000 })) throw new Error('shop did not open');
  for (const [name, key] of (narrowOnly ? [] : [['supplies', 'supplies'], ['loadout', 'loadout'], ['builds', 'builds']])) {
    await page.evaluate(`TT.setShopTabDbg(${JSON.stringify(key)})`);
    await page.evaluate('new Promise(resolve => setTimeout(resolve, 250))');
    const file = path.join(shots, `${name}.png`);
    await page.screenshot(file);
    console.log(`${name}: ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  }
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await page.evaluate('TT.setShopTabDbg("supplies")');
  await page.evaluate('new Promise(resolve => setTimeout(resolve, 250))');
  const narrow = path.join(shots, 'supplies-390.png');
  await page.screenshot(narrow);
  console.log(`supplies-390: ${narrow} (${(fs.statSync(narrow).size / 1024).toFixed(0)} KB)`);
  if (page.errors.length) throw new Error(page.errors.join('\n'));
  console.log('PASS GP-19967 real-renderer screenshots, no page errors');
} finally {
  if (page) try { await page.send('Page.close', {}); } catch { /* browser may have closed */ }
  if (browser) await browser.close();
  server.close();
}
