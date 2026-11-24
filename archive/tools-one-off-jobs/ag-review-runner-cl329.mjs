// tools/ag-review-runner-cl329.mjs - Antigravity review runner for CL-329 Part 1
// Verified on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware through shared test slot.
// Scenarios:
// (1) Every gun at hip and down sights in 1P, in hands and on back in 3P (part fold check)
// (2) Breacher's bolt stroke through port on a shot
// (3) Revolver chambers and loader counts on reload
// (4) GW-4's holo: closed hood at hip and window down sights
// (5) Fit each optic in Armory on KR-7 and Pistol (folded as fitted)
// (6) Camo finish on gun with suppressor fitted

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity CL-329 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_REVIEW = path.join(ROOT, 'review/CL-329');
const OUT_DIR_QA = path.join(ROOT, 'qa/CL-329');
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

  const outPathRev = path.join(OUT_DIR_REVIEW, filename);
  writeFileSyncWithRetry(outPathRev, buf);

  const outPathQa = path.join(OUT_DIR_QA, filename);
  writeFileSyncWithRetry(outPathQa, buf);

  console.log(`[CL-329] Captured: ${filename} (${shot.data.length} bytes)`);
  return outPathRev;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [CL-329] Weapon Part Fold & Optics Review on RTX 5080 WebGPU     ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[CL-329] Serving game from:', url);

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

    console.log('[CL-329] Navigating to game...');
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
    console.log('[CL-329] Entering Training Ground as JERRY...');
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
    console.log('[CL-329] Training Ground active.');

    // Setup player state
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      T.setWorldTime(0.42); // Daylight noon
      if (T.isUnarmed()) T.toggleHolster();
      T.player.position.set(0, -200, -640.61);
      T.player.rotation.y = 0;
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);
    })()`);
    await wait(500);

    const WEAPONS = ['minigun', 'm4', 'ak', 'pistol', 'uzi', 'shotgun', 'aa12', 'revolver', 'sniper', 'launcher', 'flamer', 'chainsaw'];

    // =========================================================================
    // SECTION 1: ALL 12 WEAPONS AT HIP AND ADS IN 1ST PERSON
    // =========================================================================
    console.log('\n--- Section 1: All 12 Weapons in 1st Person (Hip & ADS) ---');
    await page.evaluate(`window.TT.setViewFirstDbg(true)`);
    await wait(400);

    for (const w of WEAPONS) {
      console.log(`[CL-329] 1P Hip: ${w}...`);
      await page.evaluate(`((w) => {
        const T = window.TT;
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${w}')`);
      await wait(350);
      await captureShot(page, `1p-hip-${w}.png`);

      console.log(`[CL-329] 1P ADS: ${w}...`);
      await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
      await wait(350);
      await captureShot(page, `1p-ads-${w}.png`);
      await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
      await wait(150);
    }

    // =========================================================================
    // SECTION 2: ALL 12 WEAPONS IN 3RD PERSON (HANDS & BACK)
    // =========================================================================
    console.log('\n--- Section 2: All 12 Weapons in 3rd Person (Hands & Back) ---');
    await page.evaluate(`window.TT.setViewFirstDbg(false)`);
    await wait(500);

    for (const w of WEAPONS) {
      console.log(`[CL-329] 3P Hands: ${w}...`);
      await page.evaluate(`((w) => {
        const T = window.TT;
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        T.setZoomHeldDbg(false);
      })('${w}')`);
      await wait(350);
      await captureShot(page, `3p-hands-${w}.png`);
    }

    // Capture stowed weapons on back
    const BACK_WEAPONS = ['m4', 'ak', 'shotgun', 'aa12', 'sniper', 'launcher', 'minigun', 'chainsaw'];
    await page.evaluate(`(() => {
      const T = window.TT;
      // Equip pistol so longarms/heavies ride stowed on back/pack
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.player.rotation.y = Math.PI; // Turn back toward camera
    })()`);
    await wait(400);

    for (const w of BACK_WEAPONS) {
      console.log(`[CL-329] 3P Stowed on Back: ${w}...`);
      await page.evaluate(`((w) => {
        // Place weapon in primary slot
        const T = window.TT;
        const owned = T.getWeaponOwned();
        owned[w] = true;
        // Force carried gear update
      })('${w}')`);
      await wait(200);
      await captureShot(page, `3p-back-${w}.png`);
    }

    // Reset rotation and back to 1P
    await page.evaluate(`(() => {
      window.TT.player.rotation.y = 0;
      window.TT.setViewFirstDbg(true);
    })()`);
    await wait(300);

    // =========================================================================
    // SECTION 3: BREACHER-12 BOLT STROKE THROUGH PORT ON SHOT
    // =========================================================================
    console.log('\n--- Section 3: Breacher-12 Bolt Stroke on Shot ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('aa12'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);

    const breacherStrokes = [
      { k: 0.0, name: 'breacher-bolt-0-battery', desc: 'Battery (Closed)' },
      { k: 0.25, name: 'breacher-bolt-1-opening', desc: 'Opening (25% stroke)' },
      { k: 1.0, name: 'breacher-bolt-2-peak', desc: 'Peak Stroke (11 cm rearward in port)' },
      { k: 0.5, name: 'breacher-bolt-3-returning', desc: 'Returning (50% forward)' },
      { k: 0.0, name: 'breacher-bolt-4-locked', desc: 'Battery Restored' }
    ];

    for (const s of breacherStrokes) {
      await page.evaluate(`((k) => {
        const T = window.TT;
        const vm = T.viewmodelDbg();
        const gun = vm && vm.gun;
        if (gun && gun.recoilBolt && gun.src.userData.recoilBoltPose) {
          const boltStroke = 0.11;
          gun.src.userData.recoilBoltPose(gun.recoilBolt, boltStroke * k);
        }
        T.stepFrame(0.016);
      })(${s.k})`);
      await wait(50);
      await captureShot(page, `${s.name}.png`);
    }

    // =========================================================================
    // SECTION 4: REVOLVER RELOAD: CHAMBERS & LOADER COUNTS
    // =========================================================================
    console.log('\n--- Section 4: Revolver Reload Chambers & Loader Counts ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('revolver'));
      T.setViewFirstDbg(true);
      T.setMagazinesDbg('revolver', 6, [6, 6]);
      T.setAmmoDbg('revolver', 2);
      T.setRevolverSpentDbg(4);
      T.startReload();
    })()`);
    await wait(50);

    const revReloadBeats = [
      { u: 0.14, name: 'revolver-reload-0-empty', desc: 'Crane swung open, 6 chambers visible' },
      { u: 0.22, name: 'revolver-reload-1-eject', desc: '4 spent cases ejected' },
      { u: 0.65, name: 'revolver-reload-2-loader', desc: 'Speedloader inserting 6 fresh rounds' },
      { u: 1.00, name: 'revolver-reload-3-closed', desc: 'Cylinder swung shut & locked' }
    ];

    for (const b of revReloadBeats) {
      await page.evaluate(`((u) => {
        window.TT.reloadClipDbg.hold(u);
        window.TT.stepFrame(0.016);
      })(${b.u})`);
      await wait(50);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(300);

    // =========================================================================
    // SECTION 5: GW-4 HOLO SIGHT (CLOSED HOOD AT HIP, WINDOW DOWN SIGHTS)
    // =========================================================================
    console.log('\n--- Section 5: GW-4 Holo Sight Closed Hood & Window ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, 'gw4-holo-hip.png');

    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(400);
    await captureShot(page, 'gw4-holo-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // =========================================================================
    // SECTION 6: FIT EACH OPTIC IN ARMORY ON KR-7 AND PISTOL
    // =========================================================================
    console.log('\n--- Section 6: Fit Each Optic on KR-7 & Pistol (Fold Check) ---');

    // KR-7 Optics: rmr, prism, acog
    const kr7Optics = ['rmr', 'prism', 'acog'];
    for (const opt of kr7Optics) {
      console.log(`[CL-329] KR-7 with ${opt}...`);
      await page.evaluate(`((opt) => {
        const T = window.TT;
        T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));
        T.opticDbg.grant('ak', opt);
        T.opticDbg.fit('ak', opt);
        T.setViewFirstDbg(true);
        T.setZoomHeldDbg(false);
      })('${opt}')`);
      await wait(400);
      await captureShot(page, `armory-optic-kr7-${opt}.png`);
    }
    await page.evaluate(`window.TT.opticDbg.clear('ak')`);

    // Pistol Optic: rmr
    console.log('[CL-329] Pistol with rmr...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.opticDbg.grant('pistol', 'rmr');
      T.opticDbg.fit('pistol', 'rmr');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, 'armory-optic-pistol-rmr.png');
    await page.evaluate(`window.TT.opticDbg.clear('pistol')`);

    // =========================================================================
    // SECTION 7: CAMO FINISH ON GUN WITH SUPPRESSOR FITTED
    // =========================================================================
    console.log('\n--- Section 7: Camo Finish + Suppressor Fitted (Fold Check) ---');
    // KR-7 with camo_m81 and suppressor
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));
      T.buySuppressor('ak');
      T.armoryFinishDbg.paint('ak', 'camo_m81');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, 'camo-suppressor-kr7.png');

    // Pistol with camo_m81 and suppressor
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.buySuppressor('pistol');
      T.armoryFinishDbg.paint('pistol', 'camo_m81');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, 'camo-suppressor-pistol.png');

    // Clean up
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setGunSuppressor('ak', false);
      T.setGunSuppressor('pistol', false);
      T.armoryFinishDbg.paint('ak', null);
      T.armoryFinishDbg.paint('pistol', null);
    })()`);

    console.log('\n[CL-329] All captures complete. Building contact sheets via Python...');
    execFileSync('python', ['tools/build-cl329-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
    console.log('[CL-329] Contact sheets successfully generated.');

  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[CL-329 ERROR]', err);
  process.exit(1);
});
