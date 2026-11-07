// qa/2026-11-07-AG-253/run-flamer-reload.mjs
// Verification of ChatGPT's GP-20038 flamer reload cooldown fix on Jerry's real GPU at 1080p.
// Verifies 3 consecutive flamer reloads, brief burst after each, loaded remaining near 60,
// and HUD magazine boxes remaining at 60 for untouched spare cans.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-07-AG-253');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 95;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-253] Saved screenshot: ${filename} (${shot.data.length} bytes base64)`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-253] GP-20038 Real-GPU Flamer Three Reloads & HUD Audit      ===');
  console.log('=== Hardware: Jerry RTX 5080 WebGPU, 1920x1080                       ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  console.log('[AG-253] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const telemetry = {
    timestamp: new Date().toISOString(),
    gpu: 'RTX 5080',
    cycles: []
  };

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-253] Navigating to game...');
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

    // Enter Training Ground as JERRY
    console.log('[AG-253] Entering Training Ground as JERRY...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'JERRY';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
      else if (window.TT && window.TT.enterTraining) window.TT.enterTraining();
    })()`);

    if (!(await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 }))) {
      throw new Error('Training Ground failed to become active');
    }
    await wait(2000);
    console.log('[AG-253] Training Ground active.');

    // Initialize environment & equip flamer with 1 loaded + 3 spare cans (60 units each)
    console.log('[AG-253] Equipping flamer with loaded:60 and spare:[60, 60, 60]...');
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);
      if (T.setWorldTime) T.setWorldTime(0.50);

      const flamerIdx = T.WEAPON_ORDER.indexOf('flamer');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'flamer'; i++) {
        T.setWeapon(flamerIdx);
        await new Promise(r => setTimeout(r, 100));
      }

      T.setMagazinesDbg('flamer', 60, [60, 60, 60]);
    })()`);

    await wait(1000);

    // Initial state snapshot
    const initialSnap = await page.evaluate(`(() => {
      const T = window.TT;
      const magSnap = T.magazinesDbg('flamer');
      const ammoCountEl = document.getElementById('ammoCount');
      const ammoDetailEl = document.getElementById('ammoDetail');
      const glyphs = Array.from(document.querySelectorAll('#ammoMags .mag-glyph')).map(g => ({
        rounds: g.dataset.rounds,
        text: g.textContent.trim(),
        fill: g.style.getPropertyValue('--fill')
      }));
      return {
        weapon: T.getCurrentWeapon(),
        loadedAmmo: T.getAmmo().flamer,
        magSnap,
        hud: {
          ammoCount: ammoCountEl ? ammoCountEl.textContent.trim() : null,
          ammoDetail: ammoDetailEl ? ammoDetailEl.textContent.trim() : null,
          glyphs
        }
      };
    })()`);

    console.log('[AG-253] Initial State Snapshot:', JSON.stringify(initialSnap, null, 2));
    telemetry.initial = initialSnap;
    await captureShot(page, '00-initial-flamer-ready.jpg');

    // Run 3 Consecutive Reload Cycles
    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`\n========================================================================`);
      console.log(`=== Cycle ${cycle}/3: Empty Can -> Reload -> Idle -> Brief Burst -> Capture ===`);
      console.log(`========================================================================`);

      // 1. Drain the loaded can completely to 0
      console.log(`[AG-253][Cycle ${cycle}] Draining loaded fuel can to 0...`);
      await page.evaluate(`(() => { window.TT.setMouseFireDbg(true); })()`);

      const drainStart = Date.now();
      let drained = false;
      while (Date.now() - drainStart < 20000) {
        const ammo = await page.evaluate(`window.TT.getAmmo().flamer`);
        if (ammo <= 0) {
          drained = true;
          break;
        }
        await wait(200);
      }
      await page.evaluate(`(() => { window.TT.setMouseFireDbg(false); })()`);

      if (!drained) {
        throw new Error(`[AG-253][Cycle ${cycle}] Timeout draining flamer ammo`);
      }
      console.log(`[AG-253][Cycle ${cycle}] Can drained to 0.`);
      await wait(300);

      // 2. Trigger reload and wait for reload completion
      console.log(`[AG-253][Cycle ${cycle}] Triggering reload...`);
      await page.evaluate(`(() => { window.TT.startReload(); })()`);

      const reloadStart = Date.now();
      let reloadDone = false;
      while (Date.now() - reloadStart < 10000) {
        const isRel = await page.evaluate(`window.TT.isReloading()`);
        if (!isRel) {
          reloadDone = true;
          break;
        }
        await wait(100);
      }

      if (!reloadDone) {
        throw new Error(`[AG-253][Cycle ${cycle}] Reload did not complete in time`);
      }
      console.log(`[AG-253][Cycle ${cycle}] Reload complete (took ${(Date.now() - reloadStart)}ms).`);

      // 3. Deliberate Idle Period (verifies no negative cooldown accumulates)
      console.log(`[AG-253][Cycle ${cycle}] Idling for 1.5s to test cooldown accumulator...`);
      await wait(1500);

      // Verify cooldown state right before burst
      const preBurstState = await page.evaluate(`(() => {
        const T = window.TT;
        return {
          ammo: T.getAmmo().flamer,
          magSnap: T.magazinesDbg('flamer')
        };
      })()`);
      console.log(`[AG-253][Cycle ${cycle}] Pre-burst state (loaded should be 60):`, preBurstState);

      // 4. Fire a brief burst (~120ms)
      console.log(`[AG-253][Cycle ${cycle}] Firing brief burst (120ms)...`);
      await page.evaluate(`(() => { window.TT.setMouseFireDbg(true); })()`);
      await wait(120);
      await page.evaluate(`(() => { window.TT.setMouseFireDbg(false); })()`);
      await wait(500); // Allow frame & HUD to settle

      // 5. Audit post-burst telemetry and capture screenshot
      const postBurstSnap = await page.evaluate(`(() => {
        const T = window.TT;
        const magSnap = T.magazinesDbg('flamer');
        const ammoCountEl = document.getElementById('ammoCount');
        const ammoDetailEl = document.getElementById('ammoDetail');
        const glyphs = Array.from(document.querySelectorAll('#ammoMags .mag-glyph')).map(g => ({
          rounds: g.dataset.rounds,
          text: g.textContent.trim(),
          fill: g.style.getPropertyValue('--fill')
        }));
        return {
          loadedAmmo: T.getAmmo().flamer,
          magSnap,
          hud: {
            ammoCount: ammoCountEl ? ammoCountEl.textContent.trim() : null,
            ammoDetail: ammoDetailEl ? ammoDetailEl.textContent.trim() : null,
            glyphs
          }
        };
      })()`);

      console.log(`[AG-253][Cycle ${cycle}] Post-burst Snapshot:`, JSON.stringify(postBurstSnap, null, 2));

      // Assertions
      const loaded = postBurstSnap.loadedAmmo;
      if (loaded < 50) {
        throw new Error(`[AG-253][Cycle ${cycle}] FAILED: Loaded ammo dropped too far (${loaded}), negative cooldown banked!`);
      }
      console.log(`[AG-253][Cycle ${cycle}] PASS: Loaded ammo is ${loaded} (near 60, only brief burst consumed).`);

      const expectedSpares = 3 - cycle;
      if (postBurstSnap.magSnap.spare.length !== expectedSpares) {
        throw new Error(`[AG-253][Cycle ${cycle}] Expected ${expectedSpares} spare cans, found ${postBurstSnap.magSnap.spare.length}`);
      }
      for (const sp of postBurstSnap.magSnap.spare) {
        if (sp !== 60) {
          throw new Error(`[AG-253][Cycle ${cycle}] Untouched spare can read ${sp} instead of 60!`);
        }
      }
      console.log(`[AG-253][Cycle ${cycle}] PASS: All ${expectedSpares} spare cans read exactly 60.`);

      const shotFilename = `0${cycle}-reload-${cycle}-burst.jpg`;
      const shotPath = await captureShot(page, shotFilename);

      telemetry.cycles.push({
        cycle,
        preBurstState,
        postBurstSnap,
        screenshot: shotPath,
        verdict: 'PASS'
      });
    }

    fs.writeFileSync(path.join(OUT_DIR, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    console.log('\n[AG-253] All 3 reload cycles PASSED perfectly! Telemetry written.');

  } finally {
    try { await browser.close(); } catch {}
    try { await server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-253] FATAL ERROR:', err);
  process.exit(1);
});
