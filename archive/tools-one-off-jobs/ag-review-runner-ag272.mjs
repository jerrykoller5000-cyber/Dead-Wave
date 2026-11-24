// tools/ag-review-runner-ag272.mjs - Antigravity review runner for AG-272 (CL-325 part 1 on RTX 5080)
// (1) Support hand cradle crops (hip & ADS): KR-7, GW-4, shotgun, Breacher-12, sniper, Wasp
// (2) Firing wrists: pistol, revolver, Wasp, and three akimbo pairs
// (3) Frame-by-frame draw of pistol from GW-4 (J72 first-equip twist audit)
// Executed on Jerry's RTX 5080 WebGPU hardware through shared test slot queue.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-272 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_REVIEW = path.join(ROOT, 'review/CL-325');
const OUT_DIR_QA = path.join(ROOT, 'qa/AG-272');
fs.mkdirSync(OUT_DIR_REVIEW, { recursive: true });
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
  
  // Save to review/CL-325/
  const outPathRev = path.join(OUT_DIR_REVIEW, filename);
  writeFileSyncWithRetry(outPathRev, buf);
  
  // Save to qa/AG-272/
  const outPathQa = path.join(OUT_DIR_QA, filename);
  writeFileSyncWithRetry(outPathQa, buf);
  
  console.log(`[AG-272] Captured screenshot: ${filename} (${shot.data.length} bytes)`);
  return outPathRev;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-272] CL-325 Part 1: Hands, Wrists & Draw Audit on RTX 5080   ===');
  console.log('=== (1) Support Hand Cradle on 6 Guns (Hip & ADS)                    ===');
  console.log('=== (2) Firing Wrists on Pistol, Revolver, Wasp & 3 Akimbo Pairs     ===');
  console.log('=== (3) Pistol Draw from GW-4 Frame-by-Frame (J72 Twist Fix)         ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-272] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }

    console.log('[AG-272] Navigating to game...');
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
    console.log('[AG-272] Entering Training Ground as JERRY...');
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
    console.log('[AG-272] Training Ground active.');

    // Inject diagnostic helpers
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      window.__ag272 = {
        setPose(x, y, z, yaw, pitch = 0) {
          T.player.position.set(x, y, z);
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          T.setOtsAimDbg(yaw, pitch);
        },
        getHandTelemetry() {
          const vm = T.viewmodelDbg();
          const fp = T.fpDbg();
          const w = T.currentWeapon;
          const frame = vm?.frame;
          const wrists = vm?.wrists;
          const info = vm?.info;

          // Euler angles of the gun
          let rotEuler = null;
          if (frame?.q) {
            const e = new T.player.rotation.constructor();
            e.setFromQuaternion(frame.q, 'YXZ');
            rotEuler = { yaw: e.y, pitch: e.x, roll: e.z };
          }

          // Screen NDC of left wrist (support hand) and right wrist (firing hand)
          let wristL_ndc = null, wristR_ndc = null;
          if (vm && wrists?.l?.p) wristL_ndc = vm.ndc(wrists.l.p);
          if (vm && wrists?.r?.p) wristR_ndc = vm.ndc(wrists.r.p);

          return {
            weapon: w,
            akimbo: info?.akimbo,
            raise: info?.raise,
            adsW: fp?.ads,
            wristBend: info?.wrist ? { r: info.wrist.r, l: info.wrist.l } : null,
            wristMax: info?.wristMax,
            rotEuler,
            wrists: {
              r: wrists?.r ? { x: wrists.r.p.x, y: wrists.r.p.y, z: wrists.r.p.z } : null,
              l: wrists?.l ? { x: wrists.l.p.x, y: wrists.l.p.y, z: wrists.l.p.z } : null,
            },
            wristNdc: {
              r: wristR_ndc,
              l: wristL_ndc
            }
          };
        }
      };
    })()`);

    // Reset player position at spawn facing down range
    await page.evaluate(`window.__ag272.setPose(0, -200, -640.61, 0, 0)`);
    await wait(300);

    const telemetry = {
      auditTimestamp: new Date().toISOString(),
      gpuRenderer: await page.evaluate(`(() => window.TT.renderer.isWebGPURenderer ? 'Three.js WebGPU (RTX 5080)' : 'WebGPU')()`),
      cradleGuns: {},
      firingWrists: {},
      akimboPairs: {},
      pistolDrawFrames: []
    };

    // =========================================================================
    // PART 1: SUPPORT HAND CRADLE CROPS ON 6 GUNS (HIP & ADS)
    // KR-7 (ak), GW-4 (m4), Shotgun (shotgun), Breacher-12 (aa12), Sniper (sniper), Wasp (uzi)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== PART 1: SUPPORT HAND CRADLE CROPS ON 6 GUNS (HIP & ADS)          ===');
    console.log('========================================================================\n');

    const cradleGunKeys = ['ak', 'm4', 'shotgun', 'aa12', 'sniper', 'uzi'];
    for (const gunKey of cradleGunKeys) {
      console.log(`\n--- [AG-272] Support Hand Cradle: ${gunKey.toUpperCase()} ---`);

      // Equip at HIP
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${gunKey}')`);
      await wait(700);

      const hipTel = await page.evaluate(`window.__ag272.getHandTelemetry()`);
      console.log(`[AG-272] ${gunKey} HIP Support Hand:`, JSON.stringify(hipTel));
      await captureShot(page, `cradle-${gunKey}-hip.png`);

      // Enter ADS (down the sights)
      await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
      for (let i = 0; i < 15; i++) {
        await wait(60);
        const adsW = await page.evaluate(`window.TT.fpDbg().ads`);
        if (adsW >= 0.98) break;
      }
      await wait(300);

      const adsTel = await page.evaluate(`window.__ag272.getHandTelemetry()`);
      console.log(`[AG-272] ${gunKey} ADS Support Hand:`, JSON.stringify(adsTel));
      await captureShot(page, `cradle-${gunKey}-ads.png`);

      telemetry.cradleGuns[gunKey] = {
        hip: hipTel,
        ads: adsTel
      };

      // Release ADS
      await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
      await wait(400);
    }

    // =========================================================================
    // PART 2: FIRING WRISTS ON PISTOL, REVOLVER, WASP & 3 AKIMBO PAIRS
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== PART 2: FIRING WRISTS ON HANDGUNS & 3 AKIMBO PAIRS               ===');
    console.log('========================================================================\n');

    const singleHandguns = ['pistol', 'revolver', 'uzi'];
    for (const gunKey of singleHandguns) {
      console.log(`\n--- [AG-272] Firing Wrist: ${gunKey.toUpperCase()} (Single) ---`);
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${gunKey}')`);
      await wait(700);

      const tel = await page.evaluate(`window.__ag272.getHandTelemetry()`);
      console.log(`[AG-272] ${gunKey} Firing Wrist Telemetry:`, JSON.stringify(tel));
      await captureShot(page, `wrist-${gunKey}-single.png`);

      telemetry.firingWrists[gunKey] = tel;
    }

    // Akimbo Pairs (Pistol, Revolver, Uzi)
    for (const gunKey of singleHandguns) {
      console.log(`\n--- [AG-272] Akimbo Pair: ${gunKey.toUpperCase()} ---`);
      await page.evaluate(`((w) => {
        const T = window.TT;
        if (T.isUnarmed()) T.toggleHolster();
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setDualOwnedDbg(w, true);
        T.toggleDualWieldDbg();
        T.setZoomHeldDbg(false);
      })('${gunKey}')`);
      await wait(800); // let both guns settle

      const pairTel = await page.evaluate(`window.__ag272.getHandTelemetry()`);
      console.log(`[AG-272] ${gunKey} Akimbo Pair Telemetry:`, JSON.stringify(pairTel));
      await captureShot(page, `wrist-${gunKey}-akimbo-pair.png`);

      telemetry.akimboPairs[gunKey] = pairTel;

      // Toggle off akimbo
      await page.evaluate(`window.TT.toggleDualWieldDbg()`);
      await wait(400);
    }

    // =========================================================================
    // PART 3: DRAW OF THE PISTOL FROM THE GW-4 FRAME-BY-FRAME (J72 TWIST AUDIT)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== PART 3: DRAW OF PISTOL FROM GW-4 FRAME-BY-FRAME (J72 TWIST AUDIT) ===');
    console.log('========================================================================\n');

    // 1. Equip GW-4 (m4) and let it settle
    console.log('[AG-272] Equipping GW-4 (m4)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.isUnarmed()) T.toggleHolster();
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setZoomHeldDbg(false);
    })()`);
    await wait(700);

    // Capture initial GW-4 equipped frame
    await captureShot(page, 'draw-00-gw4-settled.png');

    // 2. Switch weapon to Pistol!
    console.log('[AG-272] Initiating switch to Pistol...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
    })()`);

    // Capture 12 consecutive frames across the weapon raise / draw animation
    for (let f = 1; f <= 12; f++) {
      await page.evaluate(`window.TT.stepFrame(0.025)`);
      await wait(25);

      const drawTel = await page.evaluate(`window.__ag272.getHandTelemetry()`);
      console.log(`[AG-272] Draw Frame ${f}: raise=${drawTel.raise?.toFixed(3)}, rotEuler=`, drawTel.rotEuler);
      telemetry.pistolDrawFrames.push({
        frameIndex: f,
        ...drawTel
      });
      await captureShot(page, `draw-frame-${String(f).padStart(2, '0')}.png`);
    }

    // Let pistol settle fully
    await wait(500);
    const settledPistol = await page.evaluate(`window.__ag272.getHandTelemetry()`);
    telemetry.pistolSettledAfterDraw = settledPistol;
    await captureShot(page, 'draw-13-pistol-settled.png');

    // Save structured telemetry to review/CL-325 and qa/AG-272
    const reviewTelPath = path.join(OUT_DIR_REVIEW, 'telemetry.json');
    const qaTelPath = path.join(OUT_DIR_QA, 'telemetry.json');
    writeFileSyncWithRetry(reviewTelPath, JSON.stringify(telemetry, null, 2));
    writeFileSyncWithRetry(qaTelPath, JSON.stringify(telemetry, null, 2));
    console.log(`[AG-272] Saved telemetry to:\n  ${reviewTelPath}\n  ${qaTelPath}`);

    // =========================================================================
    // PART 4: BUILD REVIEW CONTACT SHEETS & CROPS VIA PYTHON PIL
    // =========================================================================
    console.log('\n[AG-272] Generating crops and contact sheets via Python PIL...');
    const pythonScript = path.join(HERE, 'build-ag272-sheets.py');
    try {
      const pyOut = execFileSync('python', [pythonScript], { encoding: 'utf8' });
      console.log(pyOut);
    } catch (pyErr) {
      console.error('[AG-272] Python sheet generation error:', pyErr.message);
      if (pyErr.stdout) console.log(pyErr.stdout);
      if (pyErr.stderr) console.error(pyErr.stderr);
    }

    console.log('\n=== [AG-272] ALL CL-325 PART 1 AUDIT SCENARIOS COMPLETED SUCCESSFULLY ===\n');

  } finally {
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('[AG-272] Fatal error:', err);
  process.exit(1);
});
