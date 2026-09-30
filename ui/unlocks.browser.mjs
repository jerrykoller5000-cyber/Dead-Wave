// GP-82: actual run-end and console paths into persistent camo unlocks.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots', gpu ? 'gp82-gpu' : 'gp82');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const start = async name => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/index.html?*', route => route.fulfill({ body: src, contentType: 'text/html' }));
    await page.goto(server.origin + '/index.html?debug=1&raf=timer', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
    await page.evaluate(() => DWOpening.dismissForTesting());
    await page.waitForFunction(() => document.getElementById('opening').hidden);
    await page.fill('#playerName', name);
    await page.click('#modeHunt');
    await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
    return { context, page, errors };
  };

  const earned = await start('Camo Earned');
  assert.equal(await earned.page.evaluate(() => localStorage.getItem('tt_unlocks')), null);
  await earned.page.evaluate(() => { TT.setDay(12); TT.endGame(false); });
  const earnedStore = await earned.page.evaluate(() => JSON.parse(localStorage.getItem('tt_unlocks')));
  assert(earnedStore.unlocked.includes('battleshipGrey'));
  assert(earnedStore.unlocked.includes('ucp'), 'night-five badge carries its camo');
  assert.equal(await earned.page.evaluate(() => JSON.parse(localStorage.getItem('tt_best_run')).day), 12);
  await earned.page.evaluate(() => TT.skipDeathCine());
  await earned.page.waitForFunction(() => document.getElementById('win').classList.contains('show'));
  assert.match(await earned.page.locator('#winMsg .camo-toast').textContent(), /New camos:/);
  assert.equal(await earned.page.locator('#winMsg .camo-toast').isVisible(), true);
  await earned.page.screenshot({ path: path.join(shots, 'earned-run-1280.png') });
  await earned.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await earned.page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
  assert.deepEqual(await earned.page.evaluate(() => JSON.parse(localStorage.getItem('tt_unlocks'))), earnedStore);
  assert.deepEqual(earned.errors, []);
  await earned.context.close();

  const cheat = await start('Camo Cheat');
  await cheat.page.evaluate(() => TT.runDevCommand('dapper dan'));
  const cheatStore = await cheat.page.evaluate(() => JSON.parse(localStorage.getItem('tt_unlocks')));
  assert.equal(cheatStore.unlocked.length, 49);
  assert.equal(await cheat.page.evaluate(() => TT.getDebugTouched()), true);
  assert.equal(await cheat.page.locator('#bigBanner .t').textContent(), 'Dapper Dan');
  await cheat.page.setViewportSize({ width: 390, height: 844 });
  await cheat.page.screenshot({ path: path.join(shots, 'dapper-dan-390.png') });
  await cheat.page.evaluate(() => { TT.setDay(20); TT.endGame(false); });
  assert.equal(await cheat.page.evaluate(() => localStorage.getItem('tt_best_run')), null, 'debug run cannot seed later earned camos');
  assert.equal(await cheat.page.evaluate(() => localStorage.getItem('tt_badges')), null, 'cheat gives no badge');
  assert.deepEqual(await cheat.page.evaluate(() => JSON.parse(localStorage.getItem('tt_unlocks'))), cheatStore);
  assert.deepEqual(cheat.errors, []);
  await cheat.context.close();
  console.log(`PASS GP-82 (${gpu ? 'WebGPU' : 'stand-in renderer'}): earned run-end unlocks and toast, reload persistence, dapper dan all 49, debug run cannot seed records or badges, 1280/390, no page errors.`);
} finally {
  if (browser) await browser.close();
  server.close();
}
