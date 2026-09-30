// GP-62: the kiosk must show both mutually exclusive mods and switch owned ones for free.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots/gp62');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body: src, contentType: 'text/html' }));
  await page.goto(server.origin + '/index.html?debug=1&raf=timer', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, { timeout: 120000 });
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName', 'Mods Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
  await page.evaluate(() => {
    TT.grantAllWeapons(); TT.addCash(200 - TT.getBank()); TT.openShop(true); TT.setShopTabDbg('upgrades');
    window.modReceipts = [];
    window.addEventListener('dw-game', ({ detail }) => { if (detail.type === 'purchase-delivered') modReceipts.push(detail); });
  });
  const akName = await page.evaluate(() => TT.WEAPON_STATS.ak.name);
  const ext = page.locator('#shopList .perk').filter({ has: page.locator('.name', { hasText: akName + ' extended mag' }) });
  const heavy = page.locator('#shopList .perk').filter({ has: page.locator('.name', { hasText: akName + ' heavy barrel' }) });
  assert.equal(await ext.count(), 1);
  assert.equal(await heavy.count(), 1);
  assert.equal(await ext.locator('button').textContent(), '$100');
  assert.equal(await heavy.locator('button').textContent(), '$100');
  await page.screenshot({ path: path.join(shots, `before-1280${gpu ? '-gpu' : ''}.png`) });

  await ext.locator('button').click();
  assert.deepEqual(await page.evaluate(() => TT.weaponMods('ak')), { fitted: 'ext', ext: true, heavy: false, canExt: true, canHeavy: true });
  assert.equal(await ext.locator('button').textContent(), 'FITTED');
  assert(await ext.locator('button').isDisabled());
  assert.equal(await page.evaluate(() => TT.getBank()), 100);
  await heavy.locator('button').click();
  assert.deepEqual(await page.evaluate(() => TT.weaponMods('ak')), { fitted: 'heavy', ext: true, heavy: true, canExt: true, canHeavy: true });
  assert.equal(await heavy.locator('button').textContent(), 'FITTED');
  assert.equal(await ext.locator('button').textContent(), 'Fit free');
  assert(await ext.locator('button').isEnabled());
  assert.equal(await page.evaluate(() => TT.getBank()), 0);
  assert.deepEqual(await page.evaluate(() => modReceipts.map(x => [x.itemId, x.cashSpent])), [['magazine:ak', 100], ['mod:heavy:ak', 100]]);
  await page.screenshot({ path: path.join(shots, `heavy-1280${gpu ? '-gpu' : ''}.png`) });

  await ext.locator('button').click();
  assert.equal(await page.evaluate(() => TT.weaponMods('ak').fitted), 'ext');
  assert.equal(await heavy.locator('button').textContent(), 'Fit free');
  assert(await heavy.locator('button').isEnabled(), 'owned heavy barrel stays selectable at zero Cash');
  await heavy.locator('button').click();
  assert.equal(await page.evaluate(() => TT.weaponMods('ak').fitted), 'heavy');
  assert.equal(await page.evaluate(() => TT.getBank()), 0);
  assert.equal(await page.evaluate(() => modReceipts.length), 2, 'switches issue no new purchase');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(shots, `heavy-390${gpu ? '-gpu' : ''}.png`) });
  assert.deepEqual(errors, []);
  console.log(`PASS GP-62 (${gpu ? 'WebGPU' : 'stand-in renderer'}): two visible AK mod rows, fitted state, paid first purchases, free switches at zero Cash, receipts, 1280/390, no page errors.`);
} finally {
  if (browser) await browser.close();
  server.close();
}
