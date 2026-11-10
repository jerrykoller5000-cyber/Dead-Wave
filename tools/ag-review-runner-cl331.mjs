// tools/ag-review-runner-cl331.mjs - Antigravity review runner for CL-331 & CL-332
// Real WebGPU verification on Jerry's NVIDIA GeForce RTX 5080 hardware.
// Scenarios:
// (1) Tactical Pistol in 1st Person (Hip, ADS, Grip Details, Steady Rear, Full Reload & Back)
// (2) Wasp SMG in 1st Person (Single Hip, Single ADS, Firing Thumb, Support Cradle, Akimbo Hip & ADS)
// (3) Optics on Risers (Shotgun RMR ADS with/without Suppressor, KR-7 RMR, GW-4 RMR Riser)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-277 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_REVIEW = path.join(ROOT, 'review/CL-331');
const OUT_DIR_QA = path.join(ROOT, 'qa/CL-331');
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

  console.log(`[CL-331] Captured: ${filename} (${shot.data.length} bytes)`);
  return outPathRev;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [CL-331/332] Pistol/Wasp Grip & Optics Risers on RTX 5080 WebGPU ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[CL-331] Serving game from:', url);

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

    console.log('[CL-331] Navigating to game...');
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
    console.log('[CL-331] Entering Training Ground as JERRY...');
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
    console.log('[CL-331] Training Ground active.');

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
      T.setViewFirstDbg(true);
    })()`);
    await wait(500);

    const metrics = {
      timestamp: new Date().toISOString(),
      gpu: 'NVIDIA GeForce RTX 5080',
      renderer: 'WebGPU',
      pistol: {},
      wasp: {},
      risers: {}
    };

    // =========================================================================
    // SECTION 1: TACTICAL PISTOL (GRIP, REAR SLIDE, AND RELOAD)
    // =========================================================================
    console.log('\n--- Section 1: Tactical Pistol Grip, Rear Slide, and Reload ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);

    // 1. Pistol Hip
    console.log('[CL-331] Pistol 1P Hip...');
    await captureShot(page, '01-pistol-1p-hip.png');

    // 2. Pistol ADS
    console.log('[CL-331] Pistol 1P ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(350);
    await captureShot(page, '02-pistol-1p-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // Inspect pistol sockets and pose data in JS
    const pistolPoseData = await page.evaluate(`(() => {
      const T = window.TT;
      const vm = T.viewmodelDbg();
      const gun = vm && vm.gun;
      return {
        hasGun: !!gun,
        gunKey: gun ? gun.key : null
      };
    })()`);
    metrics.pistol.poseInspection = pistolPoseData;

    // 3. Close-up: Firing Hand (Right) - Thumb wrapping under tang, index in guard
    console.log('[CL-331] Pistol Firing Hand Detail (FOV 35)...');
    await page.evaluate(`window.TT.setFirstPersonFov(35)`);
    await wait(300);
    await captureShot(page, '03-pistol-firing-hand-detail.png');

    // 4. Close-up: Support Hand (Left) - Palm over firing fingers, index under guard, thumb forward
    console.log('[CL-331] Pistol Support Hand Detail (FOV 35, slight look angle)...');
    await page.evaluate(`window.TT.setOtsAimDbg(-0.08, 0.04)`);
    await wait(300);
    await captureShot(page, '04-pistol-support-hand-detail.png');

    // 5. Pistol Slide Rear Flicker Verification (J95 / patch331a)
    console.log('[CL-331] Pistol Slide Rear Check (4 sub-frames for z-fighting)...');
    await page.evaluate(`(() => {
      window.TT.setOtsAimDbg(0, 0);
      window.TT.setFirstPersonFov(30);
    })()`);
    await wait(250);
    for (let f = 0; f < 3; f++) {
      await page.evaluate(`window.TT.stepFrame(0.016)`);
      await wait(50);
    }
    await captureShot(page, '05-pistol-rear-slide-steady.png');
    await page.evaluate(`window.TT.setFirstPersonFov(65)`);
    await wait(200);

    // 6-10. Pistol Reload Sequence
    console.log('[CL-331] Pistol Reload Sequence...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setMagazinesDbg('pistol', 15, [15, 15]);
      T.setAmmoDbg('pistol', 0);
      T.startReload();
    })()`);
    await wait(50);

    const pistolReloadSteps = [
      { u: 0.15, name: '06-pistol-reload-01-start.png', desc: 'Reload start / dip' },
      { u: 0.35, name: '07-pistol-reload-02-mag-drop.png', desc: 'Empty mag clearing well' },
      { u: 0.62, name: '08-pistol-reload-03-fresh-mag.png', desc: 'Fresh mag inserting' },
      { u: 0.86, name: '09-pistol-reload-04-slide-forward.png', desc: 'Slide releasing forward' }
    ];

    for (const step of pistolReloadSteps) {
      await page.evaluate(`((u) => {
        window.TT.reloadClipDbg.hold(u);
        window.TT.stepFrame(0.016);
      })(${step.u})`);
      await wait(80);
      await captureShot(page, step.name);
    }

    // Release reload hold and wait for complete battery return
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(600);
    await captureShot(page, '10-pistol-reload-05-back-to-ready.png');
    metrics.pistol.reloadCompleted = true;

    // =========================================================================
    // SECTION 2: WASP SMG (SINGLE AND AKIMBO)
    // =========================================================================
    console.log('\n--- Section 2: Wasp SMG Single and Akimbo ---');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);

    // 11. Single Wasp Hip
    console.log('[CL-331] Wasp Single 1P Hip...');
    await captureShot(page, '11-wasp-single-1p-hip.png');

    // 12. Single Wasp ADS
    console.log('[CL-331] Wasp Single 1P ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(350);
    await captureShot(page, '12-wasp-single-1p-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // 13. Single Wasp Firing Thumb
    console.log('[CL-331] Wasp Firing Thumb Detail (FOV 35)...');
    await page.evaluate(`window.TT.setFirstPersonFov(35)`);
    await wait(300);
    await captureShot(page, '13-wasp-single-firing-thumb.png');

    // 14. Single Wasp Support Cradle (16 mm lower, fingers up right side)
    console.log('[CL-331] Wasp Support Cradle Detail (FOV 35, angle)...');
    await page.evaluate(`window.TT.setOtsAimDbg(-0.06, 0.05)`);
    await wait(300);
    await captureShot(page, '14-wasp-single-support-cradle.png');
    await page.evaluate(`(() => {
      window.TT.setOtsAimDbg(0, 0);
      window.TT.setFirstPersonFov(65);
    })()`);
    await wait(200);

    // 15-18. Akimbo Wasp
    console.log('[CL-331] Akimbo Wasp Setup...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setDualOwnedDbg('uzi', true);
      T.toggleDualWieldDbg();
    })()`);
    await wait(400);

    console.log('[CL-331] Wasp Akimbo 1P Hip...');
    await captureShot(page, '15-wasp-akimbo-1p-hip.png');

    console.log('[CL-331] Wasp Akimbo 1P Aimed...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(350);
    await captureShot(page, '16-wasp-akimbo-1p-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    console.log('[CL-331] Wasp Akimbo Left Gun Detail...');
    await page.evaluate(`(() => {
      window.TT.setOtsAimDbg(-0.08, 0);
      window.TT.setFirstPersonFov(40);
    })()`);
    await wait(250);
    await captureShot(page, '17-wasp-akimbo-left-gun-grip.png');

    console.log('[CL-331] Wasp Akimbo Right Gun Detail...');
    await page.evaluate(`window.TT.setOtsAimDbg(0.08, 0)`);
    await wait(250);
    await captureShot(page, '18-wasp-akimbo-right-gun-grip.png');

    // Turn dual wield off and reset camera
    await page.evaluate(`(() => {
      window.TT.toggleDualWieldDbg();
      window.TT.setOtsAimDbg(0, 0);
      window.TT.setFirstPersonFov(65);
    })()`);
    await wait(300);

    // =========================================================================
    // SECTION 3: OPTICS ON RISERS (CL-332)
    // =========================================================================
    console.log('\n--- Section 3: Optics on Risers (Shotgun, KR-7, GW-4) ---');

    // Ensure all mods unlocked
    await page.evaluate(`window.TT.modsOwnAllDbg()`);
    await wait(100);

    // 19. Shotgun with RMR at Hip
    console.log('[CL-331] Shotgun with RMR Hip...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
      T.opticDbg.fit('shotgun', 'rmr');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, '19-shotgun-rmr-hip.png');

    // 20. Shotgun with RMR ADS (Clear Red Dot in Window)
    console.log('[CL-331] Shotgun with RMR ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(400);
    await captureShot(page, '20-shotgun-rmr-ads.png');

    // 21. Shotgun with RMR + Suppressor Hip
    console.log('[CL-331] Shotgun with RMR + Suppressor Hip...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setZoomHeldDbg(false);
      T.modsOwnAllDbg();
      T.armoryDbg.fit('shotgun', 'suppressor', true);
    })()`);
    await wait(400);
    await captureShot(page, '21-shotgun-rmr-suppressor-hip.png');

    // 22. Shotgun with RMR + Suppressor ADS (Dot Clears Suppressor Top)
    console.log('[CL-331] Shotgun with RMR + Suppressor ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(400);
    await captureShot(page, '22-shotgun-rmr-suppressor-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // 23. Shotgun Riser Hardware Detail
    console.log('[CL-331] Shotgun Riser Hardware Detail (FOV 32)...');
    await page.evaluate(`(() => {
      window.TT.setFirstPersonFov(32);
      window.TT.setOtsAimDbg(-0.05, 0.04);
    })()`);
    await wait(300);
    await captureShot(page, '23-shotgun-rmr-riser-detail.png');

    // Reset Shotgun
    await page.evaluate(`(() => {
      const T = window.TT;
      T.armoryDbg.fit('shotgun', 'suppressor', false);
      T.opticDbg.clear('shotgun');
      T.setOtsAimDbg(0, 0);
      T.setFirstPersonFov(65);
    })()`);
    await wait(200);

    // 24. KR-7 (ak) with RMR Hip
    console.log('[CL-331] KR-7 with RMR Hip...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));
      T.opticDbg.grant('ak', 'rmr');
      T.opticDbg.fit('ak', 'rmr');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, '24-kr7-rmr-hip.png');

    // 25. KR-7 with RMR ADS
    console.log('[CL-331] KR-7 with RMR ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(400);
    await captureShot(page, '25-kr7-rmr-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // Check KR-7 optic mount state
    const kr7MountData = await page.evaluate(`(() => {
      const T = window.TT;
      const mesh = T.weaponMeshes && T.weaponMeshes['ak'];
      const optic = mesh && mesh.userData && mesh.userData.fittedOptic;
      return {
        hasOptic: !!optic,
        opticPos: optic ? [optic.position.x, optic.position.y, optic.position.z] : null,
        sightLine: optic && optic.userData && optic.userData.line ? optic.userData.line : null
      };
    })()`);
    metrics.risers.kr7 = kr7MountData;
    await page.evaluate(`window.TT.opticDbg.clear('ak')`);

    // 26. GW-4 (m4) with RMR Hip
    console.log('[CL-331] GW-4 (m4) with RMR Hip (21mm Riser)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.opticDbg.grant('m4', 'rmr');
      T.opticDbg.fit('m4', 'rmr');
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
    })()`);
    await wait(400);
    await captureShot(page, '26-gw4-rmr-hip.png');

    // 27. GW-4 with RMR ADS
    console.log('[CL-331] GW-4 with RMR ADS...');
    await page.evaluate(`window.TT.setZoomHeldDbg(true)`);
    await wait(400);
    await captureShot(page, '27-gw4-rmr-ads.png');
    await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
    await wait(200);

    // 28. GW-4 RMR Riser Hardware Detail
    console.log('[CL-331] GW-4 RMR Riser Hardware Detail (FOV 32)...');
    await page.evaluate(`(() => {
      window.TT.setFirstPersonFov(32);
      window.TT.setOtsAimDbg(-0.04, 0.03);
    })()`);
    await wait(300);
    await captureShot(page, '28-gw4-rmr-riser-detail.png');

    const m4MountData = await page.evaluate(`(() => {
      const T = window.TT;
      const mesh = T.weaponMeshes && T.weaponMeshes['m4'];
      const optic = mesh && mesh.userData && mesh.userData.fittedOptic;
      return {
        hasOptic: !!optic,
        opticPos: optic ? [optic.position.x, optic.position.y, optic.position.z] : null,
        sightLine: optic && optic.userData && optic.userData.line ? optic.userData.line : null
      };
    })()`);
    metrics.risers.m4 = m4MountData;
    await page.evaluate(`window.TT.opticDbg.clear('m4')`);

    // Save metrics
    const metricsPathReview = path.join(OUT_DIR_REVIEW, 'cl331-metrics.json');
    const metricsPathQa = path.join(OUT_DIR_QA, 'cl331-metrics.json');
    writeFileSyncWithRetry(metricsPathReview, JSON.stringify(metrics, null, 2));
    writeFileSyncWithRetry(metricsPathQa, JSON.stringify(metrics, null, 2));

    console.log('\n[CL-331] All 28 captures complete. Running Python sheet builder...');
    execFileSync('python', ['tools/build-cl331-sheets.py'], { cwd: ROOT, stdio: 'inherit' });
    console.log('[CL-331] Contact strips and master sheet successfully generated.');

  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[CL-331 ERROR]', err);
  process.exit(1);
});
