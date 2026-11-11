// Visual check for GP-20083 while CB-294 supplies the live ammo state.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('../..', import.meta.url));
const output = path.join(root, 'review/GP-20083');
fs.mkdirSync(output, { recursive: true });
const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/gp20083-fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/ui/armory.css">
    <style>body{margin:0;background:#222;--font-hud:Arial,sans-serif;--ink:#e8e2c8;--accent:#e3b62b;--accent-2:#e3b62b;--accent-2-ink:#16180e}
    #cif{position:fixed;inset:0;display:flex;justify-content:center;align-items:center;box-sizing:border-box}
    .card{display:none}</style>
    <div id="cif" class="show armory-only"><div class="card"><div class="modes"></div></div></div>
    <script type="module">
      import {mountArmory} from '/ui/armory.js';
      let typed = true;
      let bought = '';
      const stock = {loadedType:'birdshot', loaded:5, rows:[
        {id:'birdshot', reserve:42, packSize:12, price:30, affordable:true, full:false},
        {id:'buckshot', reserve:15, packSize:12, price:50, affordable:true, full:false},
        {id:'slug', reserve:2, packSize:8, price:80, affordable:false, shortfall:20, full:false}
      ]};
      const ui = mountArmory({getTypedAmmo:kind=>typed && kind==='shotgun'?stock:null,
        onBuyTypedAmmo:(kind,type)=>{bought=kind+':'+type; return true;},
        getMods:()=>[], getOwned:()=>[], picture:async()=>null});
      ui.open(); ui.bench('shotgun');
      window.fixture = {ui, stock, get bought(){return bought}, showOld(){typed=false;ui.render()}, showTyped(){typed=true;ui.render()}};
    </script>` }));
  await page.goto(server.origin + '/gp20083-fixture', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.armory-typed-list li');
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => fixture.showOld());
    await page.screenshot({ path: path.join(output, `armory-before-${width}.png`) });
    await page.evaluate(() => fixture.showTyped());
    await page.screenshot({ path: path.join(output, `armory-typed-${width}.png`) });
    const bounds = await page.locator('.armory-typed-list').boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= width, 'typed rows fit the viewport');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow, 'no horizontal overflow');
  }
  assert.equal(await page.locator('.armory-typed-list li').count(), 3);
  assert.equal(await page.locator('[data-buy-ammo-type="slug"]').isDisabled(), true);
  await page.locator('[data-buy-ammo-type="buckshot"]').click();
  assert.equal(await page.evaluate(() => fixture.bought), 'shotgun:buckshot');
  assert.deepEqual(errors, []);
  console.log('PASS GP-20083 typed Armory: three priced rows, unaffordable state, buy callback, 1280/390 fit, no page errors');
} finally {
  await browser?.close();
  server.close();
}
