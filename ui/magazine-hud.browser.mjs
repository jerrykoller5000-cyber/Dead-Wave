// GP-79: visible HUD integration, with an optional real WebGPU screenshot.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const real = process.argv.includes('--real');
let source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!real) source = source.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
source = source.replace('window.TT = stampDebugHooks({', `window.hudProbe = {
  set(w, loaded, spare) {
    weaponOwned[w] = true; currentWeapon = w; dualActive = false; reloading = false;
    if (isMagazineWeapon(w)) {
      issueMagazines(magazineStore,w,{size:singleMagSize(w),loaded,maxSpare:magazineMaxSpare(w)});
      magazineStore[w].spare = spare.map(rounds=>({rounds,size:singleMagSize(w)}));
      syncMagazine(w);
    } else { ammoByWeapon[w] = loaded; reserveAmmo[caliberOf(w)] = spare[0] || 0; }
    updateAmmoHud();
  }
}; window.TT = stampDebugHooks({`);
const server = await serve(root, 0); let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } }), errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body:source, contentType:'text/html' }));
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  await page.waitForFunction(() => window.hudProbe && window.TT && DWLoad.snapshot().state === 'ready', null, { timeout:120000 });
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName','HUD Tester'); await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout:45000 });

  await page.evaluate(() => hudProbe.set('pistol', 5, [12,6,1]));
  assert.match(await page.locator('#ammoDetail').textContent(), /19 Bullets/);
  assert.match(await page.locator('#ammoMags .mag-count').textContent(), /3 mags/);
  assert.deepEqual(await page.locator('#ammoMags .mag-glyph').evaluateAll(els => els.map(e => [e.dataset.rounds,e.style.getPropertyValue('--fill')])),
    [['12','100%'],['6','50%'],['1','8%']]);
  assert.match(await page.locator('#ammoMags').getAttribute('aria-label'), /12 of 12 rounds, 6 of 12 rounds, 1 of 12 rounds/);
  if (real) {
    const shots=path.join(root,'Claude outputs/shots/gp79'); fs.mkdirSync(shots,{recursive:true});
    await page.screenshot({path:path.join(shots,'after-pistol-mag-hud.png')});
    console.log('GPU HUD screenshot: Claude outputs/shots/gp79/after-pistol-mag-hud.png');
  }
  await page.evaluate(() => hudProbe.set('revolver', 2, [6,3]));
  assert.match(await page.locator('#ammoDetail').textContent(), /9 Bullets/);
  assert.match(await page.locator('#ammoMags .mag-count').textContent(), /2 loaders/);
  assert.equal(await page.locator('#ammoMags .loader').count(),2);
  await page.evaluate(() => hudProbe.set('shotgun', 2, [11]));
  assert.match(await page.locator('#ammoDetail').textContent(), /11 Bullets/);
  assert.equal(await page.locator('#ammoMags .mag-glyph').count(),0);
  await page.evaluate(() => hudProbe.set('launcher', 1, [5]));
  assert.match(await page.locator('#ammoDetail').textContent(), /5 Bullets/);
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(() => hudProbe.set('pistol', 12, Array(14).fill(12)));
  assert.equal(await page.locator('#ammoMags .mag-glyph').count(),14);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);
  if (real) await page.screenshot({ path:path.join(root,'Claude outputs/shots/gp79/after-mobile-full-mags.png') });
  assert.deepEqual(errors,[]);
  console.log('PASS GP-79 live HUD: fullness icons, readable counts, loaders/shells/rounds and no loose-ammo glyphs.');
} finally { if(browser) await browser.close(); server.close(); }
