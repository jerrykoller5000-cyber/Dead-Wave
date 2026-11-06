// qa/2026-11-06-GP-20034/run-gp20034.mjs
// Task AG-248 / GP-20034 request verification:
// Capture kiosk Upgrades page at day 4 in ungated play and under ?gates=1&chaingates=1.
// Verify machete row appears only ungated; verify chainsaw remains on Weapons in gated play.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-GP-20034');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename, clip = null) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  if (clip) {
    params.clip = {
      x: Math.round(clip.x),
      y: Math.round(clip.y),
      width: Math.round(clip.width),
      height: Math.round(clip.height),
      scale: 1,
    };
  }
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[GP-20034] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCardClip(page) {
  return await page.evaluate(`(() => {
    const el = document.querySelector('#shop .card');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - 10), y: Math.max(0, r.top - 10), width: r.width + 20, height: r.height + 20 };
  })()`);
}

async function inspectShopList(page) {
  return await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll('#shopList .perk')];
    return rows.map((r) => {
      const nameEl = r.querySelector('.name');
      const descEl = r.querySelector('.desc');
      const btn = r.querySelector('button');
      const statusEl = r.querySelector('.shop-status');
      return {
        name: nameEl ? nameEl.childNodes[0]?.textContent?.trim() || nameEl.textContent.trim() : '',
        tag: nameEl?.querySelector('b')?.textContent?.trim() || '',
        desc: descEl ? descEl.textContent.trim() : '',
        btn: btn ? btn.textContent.trim() : '',
        disabled: btn ? btn.disabled : false,
        status: statusEl ? statusEl.textContent.trim() : '',
        category: r.dataset.category || '',
        weapon: r.dataset.weapon || '',
      };
    });
  })()`);
}

async function main() {
  console.log('\n========================================================================');
  console.log('=== [GP-20034] Kiosk Comparison: Ungated vs Gated Play (Day 4)       ===');
  console.log('=== Real WebGPU Verification on Jerry\'s RTX 5080                     ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const telemetry = {
    timestamp: new Date().toISOString(),
    gpu: 'RTX 5080 (Jerry PC)',
    ungated: {},
    gated: {},
  };

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    // -------------------------------------------------------------------------
    // PART 1: UNGATED RUN
    // -------------------------------------------------------------------------
    console.log('\n--- PART 1: UNGATED RUN ---');
    const page1 = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const ungatedUrl = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
      console.log('[GP-20034] Loading ungated match:', ungatedUrl);
      await page1.goto(ungatedUrl, { waitUntil: 'none', timeout: 180000 });

      if (!await page1.waitFor('!!window.TT', { timeout: 300000 })) {
        throw new Error('Ungated: Game did not boot TT within timeout: ' + (page1.errors[0] || ''));
      }

      // Dismiss intro
      await page1.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
      })()`);

      await page1.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

      // Start match
      await page1.evaluate(`(async () => {
        await startMatch(window.TT, 'Ungated-Kiosk');
        if (window.TT.clearZombies) window.TT.clearZombies();
      })()`);

      await wait(500);

      // Setup Day 4 and cash, open shop, tab 'upgrades'
      await page1.evaluate(`(() => {
        const T = window.TT;
        T.setDay(4);
        T.addCash(1000);
        T.openShop(true);
        T.setShopTabDbg('upgrades');
      })()`);

      await wait(600);

      // Verify Upgrades tab in Ungated
      const ungatedUpgradesRows = await inspectShopList(page1);
      const macheteRowUngated = ungatedUpgradesRows.find((r) => /^Machete\b/i.test(r.name));
      console.log('[GP-20034] Ungated Upgrades rows count:', ungatedUpgradesRows.length);
      console.log('[GP-20034] Machete row found in ungated upgrades:', !!macheteRowUngated, macheteRowUngated);

      const ungatedCardClip = await getCardClip(page1);
      await captureShot(page1, 'ungated-day4-upgrades-full.png');
      if (ungatedCardClip) await captureShot(page1, 'ungated-day4-upgrades-card.png', ungatedCardClip);

      // Switch to Weapons tab in Ungated
      await page1.evaluate(`(() => {
        window.TT.setShopTabDbg('weapons');
      })()`);
      await wait(600);

      const ungatedWeaponsRows = await inspectShopList(page1);
      const chainsawRowUngated = ungatedWeaponsRows.find((r) => r.weapon === 'chainsaw' || /chainsaw/i.test(r.name));
      console.log('[GP-20034] Ungated Weapons rows count:', ungatedWeaponsRows.length);
      console.log('[GP-20034] Chainsaw row found in ungated weapons:', !!chainsawRowUngated, chainsawRowUngated);

      await captureShot(page1, 'ungated-day4-weapons-full.png');
      const ungatedWeaponsCardClip = await getCardClip(page1);
      if (ungatedWeaponsCardClip) await captureShot(page1, 'ungated-day4-weapons-card.png', ungatedWeaponsCardClip);

      // Close shop
      await page1.evaluate(`(() => { window.TT.closeShop(); })()`);
      await wait(300);

      telemetry.ungated = {
        url: ungatedUrl,
        upgradesCount: ungatedUpgradesRows.length,
        machetePresent: !!macheteRowUngated,
        macheteDetails: macheteRowUngated || null,
        upgradesRows: ungatedUpgradesRows,
        weaponsCount: ungatedWeaponsRows.length,
        chainsawPresent: !!chainsawRowUngated,
        chainsawDetails: chainsawRowUngated || null,
      };
    } finally {
      await page1.close().catch(() => {});
    }

    // -------------------------------------------------------------------------
    // PART 2: GATED RUN (?gates=1&chaingates=1)
    // -------------------------------------------------------------------------
    console.log('\n--- PART 2: GATED RUN (?gates=1&chaingates=1) ---');
    const page2 = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const gatedUrl = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
      console.log('[GP-20034] Loading gated match:', gatedUrl);
      await page2.goto(gatedUrl, { waitUntil: 'none', timeout: 180000 });

      if (!await page2.waitFor('!!window.TT', { timeout: 300000 })) {
        throw new Error('Gated: Game did not boot TT within timeout: ' + (page2.errors[0] || ''));
      }

      // Dismiss intro
      await page2.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
      })()`);

      await page2.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

      // Start match
      await page2.evaluate(`(async () => {
        await startMatch(window.TT, 'Gated-Kiosk');
        if (window.TT.clearZombies) window.TT.clearZombies();
      })()`);

      await wait(500);

      // Setup Day 4 and cash, open shop, tab 'upgrades'
      await page2.evaluate(`(() => {
        const T = window.TT;
        T.setDay(4);
        T.addCash(1000);
        T.openShop(true);
        T.setShopTabDbg('upgrades');
      })()`);

      await wait(600);

      // Verify Upgrades tab in Gated
      const gatedUpgradesRows = await inspectShopList(page2);
      const macheteRowGated = gatedUpgradesRows.find((r) => /^Machete\b/i.test(r.name));
      console.log('[GP-20034] Gated Upgrades rows count:', gatedUpgradesRows.length);
      console.log('[GP-20034] Machete row found in gated upgrades:', !!macheteRowGated);

      // Verify buyMachete runtime guard
      const buyMacheteGuardCheck = await page2.evaluate(`(() => {
        const T = window.TT;
        const initialCash = T.getBank();
        const initialMachete = T.isMacheteOwned();
        T.buyMachete();
        const finalCash = T.getBank();
        const finalMachete = T.isMacheteOwned();
        return {
          initialCash,
          finalCash,
          cashUnchanged: initialCash === finalCash,
          macheteNotGranted: !finalMachete,
        };
      })()`);
      console.log('[GP-20034] buyMachete() runtime guard check:', buyMacheteGuardCheck);

      const gatedCardClip = await getCardClip(page2);
      await captureShot(page2, 'gated-day4-upgrades-full.png');
      if (gatedCardClip) await captureShot(page2, 'gated-day4-upgrades-card.png', gatedCardClip);

      // Switch to Weapons tab in Gated
      await page2.evaluate(`(() => {
        window.TT.setShopTabDbg('weapons');
      })()`);
      await wait(600);

      const gatedWeaponsRows = await inspectShopList(page2);
      const chainsawRowGated = gatedWeaponsRows.find((r) => r.weapon === 'chainsaw' || /chainsaw/i.test(r.name));
      console.log('[GP-20034] Gated Weapons rows count:', gatedWeaponsRows.length);
      console.log('[GP-20034] Chainsaw row found in gated weapons:', !!chainsawRowGated, chainsawRowGated);

      await captureShot(page2, 'gated-day4-weapons-full.png');
      const gatedWeaponsCardClip = await getCardClip(page2);
      if (gatedWeaponsCardClip) await captureShot(page2, 'gated-day4-weapons-card.png', gatedWeaponsCardClip);

      // Close shop
      await page2.evaluate(`(() => { window.TT.closeShop(); })()`);
      await wait(300);

      telemetry.gated = {
        url: gatedUrl,
        upgradesCount: gatedUpgradesRows.length,
        machetePresent: !!macheteRowGated,
        buyMacheteGuard: buyMacheteGuardCheck,
        upgradesRows: gatedUpgradesRows,
        weaponsCount: gatedWeaponsRows.length,
        chainsawPresent: !!chainsawRowGated,
        chainsawDetails: chainsawRowGated || null,
      };
    } finally {
      await page2.close().catch(() => {});
    }

    // Save telemetry
    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2), 'utf8');
    console.log('[GP-20034] Telemetry written to telemetry.json');

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n[GP-20034] Assembling composite contact sheet via Python Pillow...');
  try {
    execSync('python qa/2026-11-06-GP-20034/build-sheets.py', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch (pyErr) {
    console.error('[GP-20034] Error running build-sheets.py:', pyErr.message);
  }

  console.log('\n[GP-20034] Browser capture and sheet generation complete!\n');
}

main().catch((err) => {
  console.error('[GP-20034] Fatal error:', err);
  process.exit(1);
});
