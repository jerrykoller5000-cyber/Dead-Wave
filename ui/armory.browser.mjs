// GP-78: actual CIF entry and the adjacent prep Armory panel. CU-65 later
// applies its chosen loadout to the weapon wheel; this tests the UI and model.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots/gp78');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(
  /<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>'
);
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
  await page.fill('#playerName', 'Armory Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout: 45000 });
  await page.evaluate(() => TT.openCIF());
  const open = page.locator('#armoryOpen'), panel = page.locator('#armoryPanel');
  assert(await open.isEnabled());
  await open.click();
  assert(await panel.isVisible());
  assert.match(await panel.innerText(), /Hip holster · Pistol/);
  assert.equal(await panel.locator('.armory-slots button').count(), 4);
  assert.equal(await panel.locator('.armory-slots button:has-text("Empty slot")').count(), 4);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await page.screenshot({ path: path.join(shots, `fresh-${width}${gpu ? '-gpu' : ''}.png`) });
    const box = await panel.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width, 'panel fits viewport');
  }
  await panel.locator('.armory-actions button').last().click();
  assert.equal(await panel.isVisible(), false);
  await page.evaluate(() => { TT.closeCIF(); TT.grantAllWeapons(); TT.openCIF(); });
  await open.click();
  assert.equal(await panel.locator('.armory-slots button:has-text("Empty slot")').count(), 0);
  assert((await panel.locator('.armory-shelf button').count()) >= 5);
  await panel.locator('[data-slot="primary:0"]').click();
  await panel.locator('[data-gun="shotgun"]').click();
  assert.match(await panel.locator('[data-slot="primary:0"]').innerText(), /Shotgun/);
  assert(await panel.locator('[data-gun="minigun"]').count(), 'replaced gun is on the shelf');
  await panel.locator('.armory-actions button').last().click();
  await open.click();
  assert.match(await panel.locator('[data-slot="primary:0"]').innerText(), /Shotgun/, 'selection survives closing');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await page.screenshot({ path: path.join(shots, `stocked-${width}${gpu ? '-gpu' : ''}.png`) });
  }
  await page.evaluate(() => TT.closeCIF());
  await page.waitForFunction(() => document.getElementById('armoryPanel').hidden);
  await page.evaluate(() => { TT.openCIF(); TT.setPhase('wave'); });
  await page.waitForFunction(() => document.getElementById('armoryOpen').disabled);
  assert.equal(await panel.isVisible(), false, 'the Armory stays shut outside prep');
  assert.deepEqual(errors, []);
  console.log(`PASS GP-78 Armory (${gpu ? 'WebGPU' : 'stand-in renderer'}): fresh four slots and fixed pistol, stored arsenal, type-safe swap, reopen persistence, prep-only entry, 1280/390 layout, no page errors.`);
} finally {
  if (browser) await browser.close();
  server.close();
}
