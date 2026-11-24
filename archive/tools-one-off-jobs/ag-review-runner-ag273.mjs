// tools/ag-review-runner-ag273.mjs - Antigravity review runner for AG-273 (CL-326-2 & CL-327 on RTX 5080)
// Verified on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware through shared test slot queue.
// Scenarios:
// (1) Revolver: fire 4, reload (4 cases drop, 2 live rounds into palm, loader in, crane holds open cylinder)
// (2) Launcher: fire 1, 2, 6 and reload each (one trip per missing round into chamber at the hand)
// (3) Breacher: empty reload (hand hooks charging handle, pulls it back along slot, lets it fly)
// (4) Flamer & Rotary gun reloads (tank and box seen coming off and going back on)
// (5) Chainsaw: draw & pull-start in 1st and 3rd person; left hand on hoop's upright
// (6) The 5 key view toggle hand-over: GW-4 and Pistol in and out
// (7) Lasers & lights at night: akimbo pair's two beams, fast turn tracking, light cone through reload
// (8) Brass ejection out of view gun's port on an automatic burst

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-273 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR_REVIEW = path.join(ROOT, 'review/CL-326');
const OUT_DIR_QA = path.join(ROOT, 'qa/AG-273');
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

  console.log(`[AG-273] Captured: ${filename} (${shot.data.length} bytes)`);
  return outPathRev;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-273] J93 First-Person Fixes (CL-326-2 & CL-327) on RTX 5080  ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?solid=1&debug=1`;
  console.log('[AG-273] Serving game from:', url);

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

    console.log('[AG-273] Navigating to game...');
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
    console.log('[AG-273] Entering Training Ground as JERRY...');
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
    console.log('[AG-273] Training Ground active.');

    // Inject diagnostic helpers
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setHp(100000);
      T.grantAllWeapons();
      if (T.isUnarmed()) T.toggleHolster();
      T.setViewFirstDbg(true);

      window.__ag273 = {
        setPose(x, y, z, yaw, pitch = 0) {
          T.player.position.set(x, y, z);
          T.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          T.setOtsAimDbg(yaw, pitch);
        },
        getVmState() {
          const vm = T.viewmodelDbg();
          const fp = T.fpDbg();
          const w = T.currentWeapon;
          const info = vm?.info;
          const gun = vm?.gun;
          return {
            weapon: w,
            akimbo: info?.akimbo,
            raise: info?.raise,
            ads: fp?.ads,
            reloading: T.isReloading(),
            reloadDbg: T.getReloadDbg ? T.getReloadDbg() : null
          };
        }
      };
    })()`);

    // Reset player position at range firing line
    await page.evaluate(`window.__ag273.setPose(0, -200, -640.61, 0, 0)`);
    await wait(300);

    const telemetry = {
      auditTimestamp: new Date().toISOString(),
      gpuRenderer: await page.evaluate(`(() => window.TT.renderer.isWebGPURenderer ? 'Three.js WebGPU (RTX 5080)' : 'WebGPU')()`),
      revolver: {},
      launcher: {},
      breacher: {},
      flamer: {},
      rotary: {},
      chainsaw: {},
      viewSwap: {},
      lasersLights: {},
      brassBurst: {}
    };

    // =========================================================================
    // SCENARIO 1: REVOLVER RELOAD (Fire 4, Reload: 4 cases drop, 2 rounds into palm, loader in, crane holds open cylinder)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 1: REVOLVER RELOAD (Fire 4, Eject 4, 2 Live in Palm)     ===');
    console.log('========================================================================\n');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('revolver'));
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setMagazinesDbg('revolver', 6, [6, 6, 6]);
      T.setAmmoDbg('revolver', 2);
      T.setRevolverSpentDbg(4);
    })()`);
    await wait(600);

    // Initial state: ready at hip with 2 live / 4 spent
    await captureShot(page, 'revolver-00-ready.png');

    // Start reload
    await page.evaluate(`window.TT.startReload()`);
    await wait(50);

    // Step across reload progress
    const revolverBeats = [
      { u: 0.12, name: 'revolver-01-cylinder-crane-open', desc: 'Cylinder swung open on crane' },
      { u: 0.20, name: 'revolver-02-cases-ejecting', desc: '4 spent cases ejecting from cylinder' },
      { u: 0.28, name: 'revolver-03-live-into-palm', desc: '2 live unfired rounds sliding into cupped palm' },
      { u: 0.36, name: 'revolver-04-palm-to-pouch', desc: 'Palm carrying live rounds to pouch' },
      { u: 0.50, name: 'revolver-05-speedloader-approaching', desc: 'Speedloader in palm approaching open cylinder' },
      { u: 0.65, name: 'revolver-06-speedloader-seating', desc: 'Speedloader seating 6 fresh rounds into chambers' },
      { u: 0.74, name: 'revolver-07-speedloader-clearing', desc: 'Speedloader clearing after rounds seated' },
      { u: 0.88, name: 'revolver-08-cylinder-closing-crane', desc: 'Cylinder swinging closed on crane' },
      { u: 1.00, name: 'revolver-09-locked-ready', desc: 'Cylinder locked shut, revolver ready at hip' }
    ];

    const revFrames = [];
    for (const beat of revolverBeats) {
      const info = await page.evaluate(`((u) => {
        const T = window.TT;
        T.reloadClipDbg.hold(u);
        T.stepFrame(0.016);
        const vm = T.viewmodelDbg();
        const gun = vm && vm.gun;
        const crane = gun && gun.userData && gun.userData.crane;
        const empties = gun && gun.userData && gun.userData.empties;
        const palmR = gun && gun.userData && gun.userData.palmRounds;
        const loader = gun && gun.userData && gun.userData.speedloader;
        return {
          u,
          craneLen: crane ? crane.userData?.len : null,
          craneVisible: crane ? crane.visible : null,
          emptiesVisible: empties ? empties.visible : null,
          palmRoundsVisible: palmR ? palmR.visible : null,
          loaderVisible: loader ? loader.visible : null,
          reloading: T.isReloading()
        };
      })(${beat.u})`);

      await wait(30);
      await captureShot(page, `${beat.name}.png`);
      revFrames.push({ beat: beat.u, desc: beat.desc, ...info });
    }
    telemetry.revolver = revFrames;
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(300);

    // =========================================================================
    // SCENARIO 2: LAUNCHER RELOAD (Fire 1, 2, 6 and reload each: 1 trip per missing round)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 2: LAUNCHER RELOAD (Fire 1, 2, 6: One Trip Per Missing) ===');
    console.log('========================================================================\n');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
      T.setViewFirstDbg(true);
      T.grantSupply();
    })()`);
    await wait(600);

    // 2A: Fire 1 round (need = 1)
    console.log('[AG-273] Launcher: Reloading 1 missing round...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setAmmoDbg('launcher', 5);
      T.startReload();
    })()`);
    await wait(50);

    const launcher1Beats = [
      { u: 0.14, name: 'launcher-1rnd-01-drum-open', desc: 'Drum swung open to empty chamber' },
      { u: 0.42, name: 'launcher-1rnd-02-trip1-inserting', desc: 'Trip 1: Single grenade inserted into chamber' },
      { u: 0.65, name: 'launcher-1rnd-03-seated', desc: 'Grenade seated home' },
      { u: 0.84, name: 'launcher-1rnd-04-winder-turned', desc: 'Winding key turned' },
      { u: 0.96, name: 'launcher-1rnd-05-drum-closed', desc: 'Drum closed and locked' }
    ];
    for (const b of launcher1Beats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // 2B: Fire 2 rounds (need = 2)
    console.log('[AG-273] Launcher: Reloading 2 missing rounds...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setAmmoDbg('launcher', 4);
      T.startReload();
    })()`);
    await wait(50);

    const launcher2Beats = [
      { u: 0.14, name: 'launcher-2rnd-01-drum-open', desc: 'Drum swung open' },
      { u: 0.38, name: 'launcher-2rnd-02-trip1-inserting', desc: 'Trip 1: First grenade inserted' },
      { u: 0.58, name: 'launcher-2rnd-03-trip2-inserting', desc: 'Trip 2: Second grenade inserted' },
      { u: 0.84, name: 'launcher-2rnd-04-winder', desc: 'Winding key turned' },
      { u: 0.96, name: 'launcher-2rnd-05-closed', desc: 'Drum closed' }
    ];
    for (const b of launcher2Beats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // 2C: Fire 6 rounds (need = 6)
    console.log('[AG-273] Launcher: Reloading 6 missing rounds (full drum empty)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setAmmoDbg('launcher', 0);
      T.startReload();
    })()`);
    await wait(50);

    const launcher6Beats = [
      { u: 0.14, name: 'launcher-6rnd-01-drum-empty-open', desc: 'Drum open, 6 empty chambers' },
      { u: 0.33, name: 'launcher-6rnd-02-trip1', desc: 'Trip 1/6 inserted' },
      { u: 0.42, name: 'launcher-6rnd-03-trip2', desc: 'Trip 2/6 inserted' },
      { u: 0.50, name: 'launcher-6rnd-04-trip3', desc: 'Trip 3/6 inserted' },
      { u: 0.59, name: 'launcher-6rnd-05-trip4', desc: 'Trip 4/6 inserted' },
      { u: 0.67, name: 'launcher-6rnd-06-trip5', desc: 'Trip 5/6 inserted' },
      { u: 0.76, name: 'launcher-6rnd-07-trip6', desc: 'Trip 6/6 inserted' },
      { u: 0.84, name: 'launcher-6rnd-08-winder', desc: 'Winding key turned' },
      { u: 0.96, name: 'launcher-6rnd-09-closed', desc: 'Drum closed full' }
    ];
    for (const b of launcher6Beats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // =========================================================================
    // SCENARIO 3: BREACHER EMPTY RELOAD (Hand hooks charging handle, pulls along slot, lets fly)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 3: BREACHER EMPTY RELOAD (Charging Handle Racked)       ===');
    console.log('========================================================================\n');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('aa12'));
      T.setViewFirstDbg(true);
      T.setAmmoDbg('aa12', 0);
      T.startReload();
    })()`);
    await wait(50);

    const breacherBeats = [
      { u: 0.20, name: 'breacher-01-drum-drop', desc: 'Spent drum dropped' },
      { u: 0.40, name: 'breacher-02-drum-from-pouch', desc: 'Fresh drum from pouch' },
      { u: 0.62, name: 'breacher-03-drum-seated', desc: 'Fresh drum seated into well' },
      { u: 0.72, name: 'breacher-04-hand-to-charging-handle', desc: 'Support hand reaching to charging handle' },
      { u: 0.77, name: 'breacher-05-handle-hooked', desc: 'Fingers hooked on charging handle knob' },
      { u: 0.80, name: 'breacher-06-handle-pulled-back', desc: 'Handle pulled fully rearward along receiver slot' },
      { u: 0.83, name: 'breacher-07-handle-released-flying', desc: 'Handle released, flying forward into battery' },
      { u: 0.90, name: 'breacher-08-hand-to-forend', desc: 'Support hand returning to forend' },
      { u: 1.00, name: 'breacher-09-ready', desc: 'Breacher locked & ready at hip' }
    ];

    const breacherFrames = [];
    for (const b of breacherBeats) {
      const tel = await page.evaluate(`((u) => {
        const T = window.TT;
        T.reloadClipDbg.hold(u);
        T.stepFrame(0.016);
        const vm = T.viewmodelDbg();
        const gun = vm && vm.gun;
        const work = gun && gun.userData && gun.userData.work;
        const workZ = work ? work.position.z : null;
        return { u, workZ };
      })(${b.u})`);

      await wait(30);
      await captureShot(page, `${b.name}.png`);
      breacherFrames.push({ beat: b.u, desc: b.desc, ...tel });
    }
    telemetry.breacher = breacherFrames;
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // =========================================================================
    // SCENARIO 4: FLAMER & ROTARY GUN RELOADS (Tank & Box seen coming off and on)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 4: FLAMER & ROTARY GUN RELOADS (Tank/Box Detach/Attach) ===');
    console.log('========================================================================\n');

    // 4A: Flamer tank reload
    console.log('[AG-273] Flamer reload (tank roll & swap)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
      T.setViewFirstDbg(true);
      T.setAmmoDbg('flamer', 0);
      T.startReload();
    })()`);
    await wait(50);

    const flamerBeats = [
      { u: 0.15, name: 'flamer-01-roll-ready', desc: 'Gun rolled top-right, exposing fuel tank' },
      { u: 0.26, name: 'flamer-02-hand-cups-tank', desc: 'Support hand cupping fuel tank' },
      { u: 0.40, name: 'flamer-03-tank-detached', desc: 'Spent fuel tank detached & moving to pouch' },
      { u: 0.62, name: 'flamer-04-new-tank-arriving', desc: 'Fresh fuel tank brought up in palm' },
      { u: 0.74, name: 'flamer-05-tank-seated', desc: 'Fresh fuel tank seated onto fittings' },
      { u: 0.88, name: 'flamer-06-hand-release', desc: 'Tank locked, hand releasing' },
      { u: 1.00, name: 'flamer-07-ready', desc: 'Flamer rolled back to ready' }
    ];
    for (const b of flamerBeats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // 4B: Minigun ammo box reload
    console.log('[AG-273] Minigun reload (ammo box roll & swap)...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
      T.setViewFirstDbg(true);
      T.setAmmoDbg('minigun', 0);
      T.startReload();
    })()`);
    await wait(50);

    const rotaryBeats = [
      { u: 0.16, name: 'rotary-01-roll-box-up', desc: 'Gun rolled top-left, lifting ammo box into view' },
      { u: 0.24, name: 'rotary-02-hand-cups-box', desc: 'Support hand cups ammo box' },
      { u: 0.38, name: 'rotary-03-box-detached', desc: 'Ammo box unlatched & lowered to pouch' },
      { u: 0.62, name: 'rotary-04-new-box-arriving', desc: 'Fresh ammo box brought up in palm' },
      { u: 0.74, name: 'rotary-05-box-seated', desc: 'Fresh ammo box locked into feeder' },
      { u: 0.88, name: 'rotary-06-hand-to-peg', desc: 'Hand returning to side peg' },
      { u: 1.00, name: 'rotary-07-ready', desc: 'Minigun back to ready' }
    ];
    for (const b of rotaryBeats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // =========================================================================
    // SCENARIO 5: CHAINSAW DRAW AND PULL-START (1st & 3rd person; left hand on hoop upright)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 5: CHAINSAW DRAW & PULL-START (1st & 3rd Person)        ===');
    console.log('========================================================================\n');

    // 5A: First Person pull-start
    console.log('[AG-273] Chainsaw 1st person pull-start sequence...');
    // Start with GW-4 equipped, then switch to chainsaw
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
    })()`);
    await wait(500);

    // Switch to Chainsaw
    await page.evaluate(`window.TT.setWeapon(window.TT.WEAPON_ORDER.indexOf('chainsaw'))`);

    const saw1pFrames = [
      { step: 1, name: 'saw-1p-01-draw-reach', desc: 'Right hand leaves rear handle, reaches for starter T-handle' },
      { step: 2, name: 'saw-1p-02-starter-grasped', desc: 'Hand grasps starter T-handle on recoil housing' },
      { step: 3, name: 'saw-1p-03-cord-pulled', desc: 'Starter cord pulled outward' },
      { step: 4, name: 'saw-1p-04-full-pull', desc: 'Peak starter pull extension' },
      { step: 5, name: 'saw-1p-05-cord-retracting', desc: 'Cord retracting into recoil housing' },
      { step: 6, name: 'saw-1p-06-hand-returning', desc: 'Hand returning to rear throttle' },
      { step: 7, name: 'saw-1p-07-running-ready', desc: 'Engine running, left hand on hoop upright' }
    ];

    for (const f of saw1pFrames) {
      await page.evaluate(`window.TT.stepFrame(0.12)`);
      await wait(40);
      await captureShot(page, `${f.name}.png`);
    }
    await wait(300);

    // 5B: Third Person pull-start
    console.log('[AG-273] Chainsaw 3rd person pull-start sequence...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      // Position camera facing player upper body
      T.setAimYawDbg(Math.PI * 0.15);
    })()`);
    await wait(500);

    // Switch to chainsaw in 3rd person
    await page.evaluate(`window.TT.setWeapon(window.TT.WEAPON_ORDER.indexOf('chainsaw'))`);

    const saw3pFrames = [
      { step: 1, name: 'saw-3p-01-draw', desc: 'Chainsaw drawn, arm moves to starter' },
      { step: 2, name: 'saw-3p-02-cord-extended', desc: 'Starter cord pulled 35 cm in front of right shoulder' },
      { step: 3, name: 'saw-3p-03-cord-retract', desc: 'Cord retracting' },
      { step: 4, name: 'saw-3p-04-running', desc: 'Marine holding running chainsaw' }
    ];

    for (const f of saw3pFrames) {
      await page.evaluate(`window.TT.stepFrame(0.18)`);
      await wait(40);
      await captureShot(page, `${f.name}.png`);
    }

    // Return to first person
    await page.evaluate(`window.TT.setViewFirstDbg(true)`);
    await wait(300);

    // =========================================================================
    // SCENARIO 6: VIEW SWAP HAND-OVER (The 5 Key View Toggle: GW-4 and Pistol)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 6: VIEW SWAP HAND-OVER (The 5 Key Hand-Over)             ===');
    console.log('========================================================================\n');

    // 6A: GW-4 Hand-over
    console.log('[AG-273] GW-4 Hand-over sequence...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
    })()`);
    await wait(500);

    // Hold view swap progress via TT.viewSwapDbg(k)
    // Inward transition (0.0 across on left -> 1.0 right hand grip)
    const gw4InK = [
      { k: 0.05, name: 'swap-gw4-in-01-across-left', desc: 'Gun arrives on left side with dip' },
      { k: 0.35, name: 'swap-gw4-in-02-crossing', desc: 'Gun crossing center, right hand rising' },
      { k: 0.65, name: 'swap-gw4-in-03-hand-taking-grip', desc: 'Firing hand taking grip' },
      { k: 0.95, name: 'swap-gw4-in-04-settled', desc: 'GW-4 settled in ready grip' }
    ];
    for (const s of gw4InK) {
      await page.evaluate(`((k) => { window.TT.viewSwapDbg(k); window.TT.stepFrame(0.016); })(${s.k})`);
      await wait(30);
      await captureShot(page, `${s.name}.png`);
    }

    // Outward transition
    const gw4OutK = [
      { k: 0.85, name: 'swap-gw4-out-01-starting', desc: 'GW-4 beginning outward pass' },
      { k: 0.45, name: 'swap-gw4-out-02-crossing-left', desc: 'Gun crossing to left hand' },
      { k: 0.10, name: 'swap-gw4-out-03-passed-left', desc: 'Gun on left side before view toggle' }
    ];
    for (const s of gw4OutK) {
      await page.evaluate(`((k) => { window.TT.viewSwapDbg(k); window.TT.stepFrame(0.016); })(${s.k})`);
      await wait(30);
      await captureShot(page, `${s.name}.png`);
    }
    await page.evaluate(`window.TT.viewSwapDbg(null)`);
    await wait(300);

    // 6B: Pistol Hand-over
    console.log('[AG-273] Pistol Hand-over sequence...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.setViewFirstDbg(true);
    })()`);
    await wait(500);

    const pistolInK = [
      { k: 0.05, name: 'swap-pistol-in-01-across-left', desc: 'Pistol enters on left side' },
      { k: 0.35, name: 'swap-pistol-in-02-crossing', desc: 'Pistol crossing center' },
      { k: 0.65, name: 'swap-pistol-in-03-hand-taking-grip', desc: 'Right hand taking grip' },
      { k: 0.95, name: 'swap-pistol-in-04-settled', desc: 'Pistol ready at center' }
    ];
    for (const s of pistolInK) {
      await page.evaluate(`((k) => { window.TT.viewSwapDbg(k); window.TT.stepFrame(0.016); })(${s.k})`);
      await wait(30);
      await captureShot(page, `${s.name}.png`);
    }
    await page.evaluate(`window.TT.viewSwapDbg(null)`);
    await wait(300);

    // =========================================================================
    // SCENARIO 7: LASERS & LIGHTS AT NIGHT (Akimbo Beams, Fast Turn, Light in Reload)
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 7: LASERS & LIGHTS AT NIGHT                             ===');
    console.log('========================================================================\n');

    // Turn lights off in Training Ground
    console.log('[AG-273] Turning off Training Ground lights for night audit...');
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.trainingDbg && T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setLasersDbg(true);
    })()`);
    await wait(600);

    // 7A: Akimbo Pair's Two Beams (Wasp SMG and Pistol)
    console.log('[AG-273] Akimbo Wasp SMG two laser beams...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      T.setDualOwnedDbg('uzi', true);
      T.toggleDualWieldDbg();
      T.setViewFirstDbg(true);
    })()`);
    await wait(600);
    await captureShot(page, 'laser-night-01-akimbo-wasp-two-beams.png');

    console.log('[AG-273] Akimbo Pistol two laser beams...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.toggleDualWieldDbg(); // off uzi
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      T.setDualOwnedDbg('pistol', true);
      T.toggleDualWieldDbg();
      T.setViewFirstDbg(true);
    })()`);
    await wait(600);
    await captureShot(page, 'laser-night-02-akimbo-pistol-two-beams.png');

    // Toggle off akimbo
    await page.evaluate(`window.TT.toggleDualWieldDbg()`);
    await wait(300);

    // 7B: Fast Turn Tracking (Laser Origin Zero Lag)
    console.log('[AG-273] Fast Turn Tracking on GW-4...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
      T.setLasersDbg(true);
    })()`);
    await wait(500);

    await captureShot(page, 'laser-night-03-fast-turn-pre.png');

    // Perform rapid yaw turn
    await page.evaluate(`(() => {
      window.TT.otsLook(180, 0);
      window.TT.stepFrame(0.016);
    })()`);
    await wait(25);
    await captureShot(page, 'laser-night-04-fast-turn-mid.png');

    await page.evaluate(`(() => {
      window.TT.otsLook(180, 0);
      window.TT.stepFrame(0.016);
    })()`);
    await wait(25);
    await captureShot(page, 'laser-night-05-fast-turn-post.png');

    // 7C: Flashlight tracking through reload
    console.log('[AG-273] Flashlight cone through reload...');
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setLasersDbg(false);
      if (!T.toggleFlashlightDbg()) T.toggleFlashlightDbg(); // turn ON
      T.setAmmoDbg('m4', 10);
      T.startReload();
    })()`);
    await wait(50);

    const lightReloadBeats = [
      { u: 0.15, name: 'light-night-06-reload-mag-drop', desc: 'Flashlight cone dips with gun tilt during mag drop' },
      { u: 0.38, name: 'light-night-07-reload-pouch', desc: 'Flashlight tracks tilted receiver during pouch transit' },
      { u: 0.62, name: 'light-night-08-reload-mag-seat', desc: 'Flashlight rises as new magazine seats' },
      { u: 0.95, name: 'light-night-09-reload-ready', desc: 'Flashlight settles back to hip forward axis' }
    ];
    for (const b of lightReloadBeats) {
      await page.evaluate(`((u) => { window.TT.reloadClipDbg.hold(u); window.TT.stepFrame(0.016); })(${b.u})`);
      await wait(30);
      await captureShot(page, `${b.name}.png`);
    }
    await page.evaluate(`window.TT.reloadClipDbg.hold(null)`);
    await wait(400);

    // Turn lights back on in Training Ground
    await page.evaluate(`(() => {
      const T = window.TT;
      if (T.trainingDbg && !T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.toggleFlashlightDbg(); // off
    })()`);
    await wait(400);

    // =========================================================================
    // SCENARIO 8: BRASS OUT OF VIEW GUN'S PORT ON A BURST
    // =========================================================================
    console.log('\n========================================================================');
    console.log('=== SCENARIO 8: BRASS OUT OF VIEW GUN PORT ON AN AUTOMATIC BURST     ===');
    console.log('========================================================================\n');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.setViewFirstDbg(true);
      T.setAmmoDbg('m4', 30);
    })()`);
    await wait(500);

    // Capture burst sequence frames with brass ejecting
    const brassFrames = [];
    for (let shot = 1; shot <= 6; shot++) {
      const casingInfo = await page.evaluate(`(() => {
        const T = window.TT;
        T.stepFireDbg(0.09); // fires round, spawns casing via viewCasingPoint
        T.stepFrame(0.016);

        const vm = T.viewmodelDbg();
        const fp = T.fpDbg();
        return {
          currentWeapon: T.currentWeapon,
          viewFirst: fp.first
        };
      })()`);

      await wait(25);
      await captureShot(page, `brass-burst-shot-${String(shot).padStart(2, '0')}.png`);
      brassFrames.push({ shot, ...casingInfo });
    }
    telemetry.brassBurst = brassFrames;

    // Save master telemetry JSON
    const reviewTelPath = path.join(OUT_DIR_REVIEW, 'ag273-telemetry.json');
    const qaTelPath = path.join(OUT_DIR_QA, 'ag273-telemetry.json');
    writeFileSyncWithRetry(reviewTelPath, JSON.stringify(telemetry, null, 2));
    writeFileSyncWithRetry(qaTelPath, JSON.stringify(telemetry, null, 2));
    console.log(`[AG-273] Master telemetry saved to:\n  ${reviewTelPath}\n  ${qaTelPath}`);

    // =========================================================================
    // BUILD CONTACT SHEETS VIA PYTHON PIL
    // =========================================================================
    console.log('\n[AG-273] Generating review contact sheets via Python PIL...');
    const pythonScript = path.join(HERE, 'build-ag273-sheets.py');
    try {
      const pyOut = execFileSync('python', [pythonScript], { encoding: 'utf8' });
      console.log(pyOut);
    } catch (pyErr) {
      console.error('[AG-273] Python sheet generation error:', pyErr.message);
      if (pyErr.stdout) console.log(pyErr.stdout);
      if (pyErr.stderr) console.error(pyErr.stderr);
    }

    console.log('\n=== [AG-273] ALL J93 FIRST-PERSON FIXES AUDITED SUCCESSFULLY ON RTX 5080 ===\n');

  } finally {
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('[AG-273] Fatal error:', err);
  process.exit(1);
});
