// tools/ag-review-runner-gp20073.mjs - Antigravity master review runner for GP-20073
// Independent RTX 5080 WebGPU visual review of GP-20073 (J96 Armory Workbench, Shelves & Kiosk):
// 1. 1280x720 Desktop: Armory locked gun icons, emplacements shelf (M240/Mortar), workbench buy+fit & ammo, kiosk builds
// 2. 390x844 Mobile: Narrow responsiveness, zero horizontal overflow, readable labels, no clipped text
// 3. Automated layout & state assertions
// 4. Contact sheet generation and metrics export to qa/GP-20073

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-276 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_QA = path.join(ROOT, 'qa/GP-20073');
fs.mkdirSync(OUT_DIR_QA, { recursive: true });

function writeFileSyncWithRetry(filePath, data, retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      try { fs.unlinkSync(filePath); } catch (_) {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const buf = Buffer.from(shot.data, 'base64');
  const outPath = path.join(OUT_DIR_QA, filename);
  writeFileSyncWithRetry(outPath, buf);
  console.log(`[GP-20073] Captured: ${filename} (${shot.data.length} bytes)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [GP-20073] J96 Armory & Kiosk Independent Review on RTX 5080     ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[GP-20073] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const metrics = {
    timestamp: new Date().toISOString(),
    gpu: 'NVIDIA GeForce RTX 5080 (WebGPU)',
    task: 'AG-276',
    target: 'GP-20073',
    checks: [],
    layout: {}
  };

  function recordCheck(name, pass, detail = '') {
    console.log(`  ${pass ? 'PASS' : 'FAIL'}: ${name}${detail ? ' (' + detail + ')' : ''}`);
    metrics.checks.push({ name, pass: !!pass, detail });
  }

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[GP-20073] Navigating to game...');
    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
      throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    }

    // Dismiss intro / opening
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
    })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    // Start prep match as J96 Reviewer
    console.log('[GP-20073] Starting prep match...');
    await page.evaluate(`(() => {
      document.querySelector('#playerName').value = 'AG-J96-Reviewer';
      document.querySelector('#modeHunt').click();
    })()`);

    if (!(await page.waitFor('window.TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 60000 }))) {
      throw new Error('Match failed to reach prep phase');
    }
    await wait(1000);
    console.log('[GP-20073] Prep match active.');

    // =========================================================================
    // SECTION 1: DESKTOP 1280x720 ARMORY INITIAL STATE & LOCKED GUNS
    // =========================================================================
    console.log('\n--- Section 1: Desktop 1280x720 Armory Initial State ---');
    await page.evaluate(`window.TT.openMenuDbg('armory')`);
    await page.waitFor('document.querySelector("#armoryPanel #shop.armory-inline")', { timeout: 15000 });
    await wait(400);

    // Initial assertions: locked guns with icons, emplacements shelf
    const initialData = await page.evaluate(`(() => {
      const p = document.querySelector('#armoryPanel');
      const minigunCard = p.querySelector('[data-offer-gun="minigun"]');
      const minigunBuy = p.querySelector('[data-buy-gun="minigun"]');
      const minigunIcon = p.querySelector('[data-offer-gun="minigun"] .armory-pic svg, [data-offer-gun="minigun"] .armory-pic img');
      const builds = [...p.querySelectorAll('[data-offer-build]')].map(e => e.dataset.offerBuild);
      const buildIcons = p.querySelectorAll('[data-offer-build] .armory-pic svg').length;
      const headings = [...p.querySelectorAll('#shopList .shop-section')].map(e => e.textContent.trim());
      const shelfGap = p.querySelector('.armory-locker .armory-offers')?.getBoundingClientRect().top -
                       p.querySelector('.armory-locker .armory-shelf:not(.armory-offers)')?.getBoundingClientRect().bottom;
      const overflow = p.scrollWidth > p.clientWidth + 1;

      return {
        hasMinigunCard: !!minigunCard,
        minigunBuyDisabled: minigunBuy ? minigunBuy.disabled : false,
        hasMinigunIcon: !!minigunIcon,
        builds,
        buildIcons,
        headings,
        shelfGap: Math.round(shelfGap || 0),
        overflow
      };
    })()`);

    recordCheck('Locked gun (minigun) displays icon', initialData.hasMinigunIcon);
    recordCheck('Locked gun (minigun) Buy button is disabled', initialData.minigunBuyDisabled);
    recordCheck('Emplacements shelf contains M240 and Mortar', initialData.builds.includes('m240') && initialData.builds.includes('mortar'));
    recordCheck('Emplacements have distinct vector icons', initialData.buildIcons >= 2);
    recordCheck('Armory catalogue sections Ammo & Upgrades', initialData.headings.includes('Ammo') && initialData.headings.includes('Upgrades'));
    recordCheck('Armory shelves stack cleanly without large gap', initialData.shelfGap < 80, `gap: ${initialData.shelfGap}px`);
    recordCheck('Armory has no horizontal overflow at 1280x720', !initialData.overflow);

    await captureShot(page, '1280-armory-initial.png');

    // =========================================================================
    // SECTION 2: PISTOL WORKBENCH (ONE-CLICK BUY+FIT, REMOVE, WORKBENCH AMMO)
    // =========================================================================
    console.log('\n--- Section 2: Pistol Workbench Purchase & Ammo Flow ---');
    await page.evaluate(`(() => {
      window.TT.addCash(500000);
      window.TT.armoryDbg.ui().bench('pistol');
    })()`);
    await wait(400);

    // Test buy+fit auto mod
    const modBefore = await page.evaluate(`({
      btn: document.querySelector('#armoryPanel [data-mod="auto"] button')?.textContent?.trim(),
      owned: window.TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.owned,
      fitted: window.TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.fitted
    })`);
    recordCheck('Pistol auto mod starts buyable', /Buy/i.test(modBefore.btn) && !modBefore.owned);

    // Click Buy+Fit
    await page.evaluate(`document.querySelector('#armoryPanel [data-mod="auto"] button')?.click()`);
    await wait(200);

    const modAfter = await page.evaluate(`({
      btn: document.querySelector('#armoryPanel [data-mod="auto"] button')?.textContent?.trim(),
      owned: window.TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.owned,
      fitted: window.TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.fitted
    })`);
    recordCheck('One click buys and immediately fits attachment', modAfter.owned && modAfter.fitted && /off|remove/i.test(modAfter.btn));

    // Test workbench ammo button
    await page.evaluate(`(() => {
      window.TT.setMagazinesDbg('pistol', 0, []);
      window.TT.armoryDbg.ui().render();
    })()`);
    await wait(200);

    const ammoBefore = await page.evaluate(`({
      spare: window.TT.magazinesDbg('pistol').spare.length,
      btnDisabled: document.querySelector('#armoryPanel [data-buy-ammo="pistol"]')?.disabled
    })`);
    recordCheck('Workbench ammo button enabled when empty', !ammoBefore.btnDisabled && ammoBefore.spare === 0);

    await page.evaluate(`document.querySelector('#armoryPanel [data-buy-ammo="pistol"]')?.click()`);
    await wait(200);

    const ammoAfter = await page.evaluate(`({
      spare: window.TT.magazinesDbg('pistol').spare.length,
      reloadPrompt: document.querySelector('#reloadPrompt')?.textContent
    })`);
    recordCheck('Workbench ammo purchase adds reserve magazines', ammoAfter.spare > 0);
    recordCheck('NO AMMO banner clears upon purchase', !/NO AMMO/i.test(ammoAfter.reloadPrompt || ''));

    await captureShot(page, '1280-armory-workbench.png');

    // =========================================================================
    // SECTION 3: EMPLACEMENTS SHELF (M240 & MORTAR PLANS + AMMO)
    // =========================================================================
    console.log('\n--- Section 3: Emplacement Shelf & Ammo ---');
    await page.evaluate(`(() => {
      window.TT.armoryDbg.ui().render();
      document.querySelector('[data-buy-build="m240"]')?.click();
      document.querySelector('[data-buy-build="mortar"]')?.click();
    })()`);
    await wait(200);

    const emplState = await page.evaluate(`({
      plans: window.TT.getBuildUnlocked(),
      hasM240Ammo: !!document.querySelector('[data-buy-build-ammo="m240"]'),
      hasMortarAmmo: !!document.querySelector('[data-buy-build-ammo="mortar"]')
    })`);
    recordCheck('Watchman MG plan unlocked', !!emplState.plans.m240);
    recordCheck('Mortar plan unlocked', !!emplState.plans.mortar);
    recordCheck('Watchman MG dedicated 7.62 belt ammo button present', emplState.hasM240Ammo);
    recordCheck('Mortar dedicated 60mm/81mm ammo button present', emplState.hasMortarAmmo);

    await captureShot(page, '1280-armory-emplacements.png');

    // =========================================================================
    // SECTION 4: KIOSK BUILDS TAB (TURRETS & MINES, NO M240 / MORTAR)
    // =========================================================================
    console.log('\n--- Section 4: Kiosk Builds Tab ---');
    await page.evaluate(`(() => {
      window.TT.closeMenuDbg('armory');
      window.TT.openMenuDbg('shop');
    })()`);
    await page.waitFor('document.querySelector("#shop.show")', { timeout: 15000 });
    await page.evaluate(`(() => {
      const tab = document.querySelector('#shopTabs [data-shop-page="builds"]');
      if (tab) tab.click();
    })()`);
    await wait(400);

    const kioskData = await page.evaluate(`(() => {
      const p = document.querySelector('#shopList');
      const names = [...p.querySelectorAll('.perk .name')].map(n => n.textContent.trim());
      const hasLight = names.some(n => /light turret/i.test(n));
      const hasFlame = names.some(n => /flame turret/i.test(n));
      const hasHeavy = names.some(n => /heavy turret/i.test(n));
      const hasMine = names.some(n => /land mine/i.test(n));
      const hasWatchman = names.some(n => /watchman/i.test(n));
      const hasMortar = names.some(n => /^mortar\b/i.test(n));
      return { hasLight, hasFlame, hasHeavy, hasMine, hasWatchman, hasMortar, names };
    })()`);

    recordCheck('Kiosk builds lists light turret', kioskData.hasLight);
    recordCheck('Kiosk builds lists flame turret', kioskData.hasFlame);
    recordCheck('Kiosk builds lists heavy turret', kioskData.hasHeavy);
    recordCheck('Kiosk builds lists land mines', kioskData.hasMine);
    recordCheck('Kiosk builds excludes Watchman MG (moved to Armory)', !kioskData.hasWatchman);
    recordCheck('Kiosk builds excludes Mortar (moved to Armory)', !kioskData.hasMortar);

    await captureShot(page, '1280-kiosk-builds.png');

    // =========================================================================
    // SECTION 5: MOBILE RESPONSIVENESS (390x844 VIEWPORT)
    // =========================================================================
    console.log('\n--- Section 5: Mobile 390x844 Layout Responsiveness ---');
    await page.setViewport(390, 844);
    await wait(300);

    // 5A: Mobile Armory Initial
    await page.evaluate(`(() => {
      window.TT.closeMenuDbg('shop');
      window.TT.openMenuDbg('armory');
      window.TT.armoryDbg.ui().render();
    })()`);
    await wait(400);
    const mobileArmory = await page.evaluate(`({
      panelOverflow: document.querySelector('#armoryPanel').scrollWidth > document.querySelector('#armoryPanel').clientWidth + 1,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    })`);
    recordCheck('Mobile Armory panel has zero horizontal overflow', !mobileArmory.panelOverflow);
    recordCheck('Mobile viewport document has zero horizontal overflow', !mobileArmory.docOverflow);
    await captureShot(page, '390-armory-mobile.png');

    // 5B: Mobile Pistol Workbench
    await page.evaluate(`window.TT.armoryDbg.ui().bench('pistol')`);
    await wait(400);
    const mobileBench = await page.evaluate(`({
      panelOverflow: document.querySelector('#armoryPanel').scrollWidth > document.querySelector('#armoryPanel').clientWidth + 1,
      buttonsVisible: [...document.querySelectorAll('#armoryPanel .armory-mod button')].every(b => b.offsetWidth > 30)
    })`);
    recordCheck('Mobile Pistol Workbench has zero horizontal overflow', !mobileBench.panelOverflow);
    recordCheck('Mobile Workbench mod buttons render with readable tap width', mobileBench.buttonsVisible);
    await captureShot(page, '390-workbench-mobile.png');

    // 5C: Mobile Emplacements
    await page.evaluate(`window.TT.armoryDbg.ui().render()`);
    await wait(300);
    await captureShot(page, '390-emplacements-mobile.png');

    // 5D: Mobile Kiosk Builds
    await page.evaluate(`(() => {
      window.TT.closeMenuDbg('armory');
      window.TT.openMenuDbg('shop');
      const tab = document.querySelector('#shopTabs [data-shop-page="builds"]');
      if (tab) tab.click();
    })()`);
    await wait(400);
    const mobileKiosk = await page.evaluate(`({
      panelOverflow: document.querySelector('#shop .card').scrollWidth > document.querySelector('#shop .card').clientWidth + 1
    })`);
    recordCheck('Mobile Kiosk panel has zero horizontal overflow', !mobileKiosk.panelOverflow);
    await captureShot(page, '390-kiosk-builds-mobile.png');

    // Reset viewport
    await page.setViewport(1280, 720);

    // Save metrics
    writeFileSyncWithRetry(path.join(OUT_DIR_QA, 'metrics.json'), JSON.stringify(metrics, null, 2));
    console.log('[GP-20073] Metrics exported to qa/GP-20073/metrics.json');

    // Build contact sheets via Python
    console.log('\n[GP-20073] Building visual contact sheet via Python...');
    execFileSync('python', ['tools/build-gp20073-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
    console.log('[GP-20073] Visual contact sheet complete.');

  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[GP-20073 ERROR]', err);
  process.exit(1);
});
