// GP-89: exercise the actual page adapters with the renderer substituted.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const real = process.argv.includes('--real');
const probe = `window.magProbe = {
  setup(w, loaded, spares, size) {
    gameStarted = true; paused = gameOver = won = placeMode = buildMode = false;
    weaponOwned[w] = true; currentWeapon = w; dualActive = false; reloading = false;
    if (isMagazineWeapon(w)) {
      issueMagazines(magazineStore, w, { size: size || singleMagSize(w), loaded, maxSpare: magazineMaxSpare(w) });
      magazineStore[w].spare = spares.map(n => ({ rounds:n, size:magazineStore[w].size }));
      syncMagazine(w);
    } else { ammoByWeapon[w] = loaded; reserveAmmo[caliberOf(w)] = spares[0] || 0; }
    updateAmmoHud();
  },
  state(w) { return isMagazineWeapon(w) ? magazineSnapshot(magazineStore,w) : { loaded:ammoByWeapon[w], reserve:reserveOf(w) }; },
  reload: () => startReload(), finish: () => { reloadTimer = 0; completeReloadStep(); },
  timing: () => ({ reloading, timer:reloadTimer, duration:reloadAnimDuration, drop:reloadDrop }),
  loot: () => droppedMags.filter(m => m.loot).map(m => ({ ...m.loot })),
  clearPhase: () => { isNight = !isNight; updateDroppedMags(0.01); },
  shop: () => { bank = 10000; shopTab = 'ammo'; renderShop(); },
  buy: w => buyAmmo(w), cash: () => bank
};`;
let source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!real) source = source.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
source = source.replace('window.TT = stampDebugHooks({', probe + '\nwindow.TT = stampDebugHooks({');

const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body:source, contentType:'text/html' }));
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  await page.waitForFunction(() => window.magProbe && window.TT && DWLoad.snapshot().state === 'ready', null, { timeout:120000 });

  await page.evaluate(() => magProbe.setup('pistol', 5, [3, 12]));
  await page.evaluate(() => magProbe.reload());
  assert.equal((await page.evaluate(() => magProbe.timing())).reloading, true);
  await page.evaluate(() => magProbe.finish());
  assert.deepEqual(await page.evaluate(() => magProbe.state('pistol').spare), [3, 5]);
  assert.deepEqual(await page.evaluate(() => magProbe.state('pistol').loaded), [12]);

  await page.evaluate(() => { magProbe.setup('pistol', 4, [12]); magProbe.reload(); magProbe.reload(); });
  assert.equal((await page.evaluate(() => magProbe.timing())).drop, true);
  await page.evaluate(() => magProbe.finish());
  assert.deepEqual(await page.evaluate(() => magProbe.loot().map(m => m.rounds)), [4]);
  await page.evaluate(() => magProbe.clearPhase());
  assert.equal((await page.evaluate(() => magProbe.loot().length)), 0);

  await page.evaluate(() => magProbe.setup('shotgun', 2, [3]));
  await page.evaluate(() => magProbe.reload());
  await page.evaluate(() => magProbe.finish());
  assert.deepEqual(await page.evaluate(() => magProbe.state('shotgun')), { loaded:3, reserve:2 });
  assert.equal((await page.evaluate(() => magProbe.timing())).reloading, true);
  await page.evaluate(() => magProbe.finish());
  assert.deepEqual(await page.evaluate(() => magProbe.state('shotgun')), { loaded:4, reserve:1 });

  await page.evaluate(() => { magProbe.setup('aa12', 10, []); magProbe.shop(); });
  assert.equal(await page.locator('[data-ammo="aa12"]').count(), 1);
  assert.equal(await page.locator('[data-ammo="12ga"]').count(), 1);
  const before = await page.evaluate(() => magProbe.cash());
  await page.evaluate(() => magProbe.buy('aa12'));
  assert.deepEqual(await page.evaluate(() => magProbe.state('aa12').spare), [20]);
  assert.equal(before - await page.evaluate(() => magProbe.cash()), 20);
  if (real) {
    await page.evaluate(() => DWOpening.dismissForTesting());
    await page.waitForFunction(() => document.getElementById('opening').hidden);
    await page.fill('#playerName', 'Magazine Tester'); await page.click('#modeHunt');
    await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, { timeout:45000 });
    await page.evaluate(() => { TT.openShop(true); magProbe.shop(); });
    const shots = path.join(root, 'Claude outputs/shots/gp89'); fs.mkdirSync(shots, { recursive:true });
    await page.screenshot({ path:path.join(shots, 'after-ammo-kiosk.png') });
    console.log('GPU kiosk screenshot: Claude outputs/shots/gp89/after-ammo-kiosk.png');
  }
  assert.deepEqual(errors, []);
  console.log('PASS GP-89 page adapters: stow, fast drop, phase cleanup, shell-by-shell, separate AA-12 drums and shotgun shells, price.');
} finally { if (browser) await browser.close(); server.close(); }
