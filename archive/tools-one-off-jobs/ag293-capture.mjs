// tools/ag293-capture.mjs
// AG-293 (Jerry, 10 Nov; J133, J134, D-149): Shotgun ammo types by eye on NVIDIA GeForce RTX 5080.
// Shows:
// 1. Pump shotgun firing birdshot, buckshot, and slug in first person across 4 lights:
//    - Spent hull thrown on pump in its own colour:
//      * Birdshot: red hull (0xa43e37), short brass head, 0 bands
//      * Buckshot: blue hull (0x497ba0), tall brass head, 1 band
//      * Slug: ivory hull (0xc9c3a2), tall brass head, 2 bands
//    - Target spread at 10m:
//      * Birdshot: wide 7-pellet spread across outer rings / torso
//      * Buckshot: tighter 8-pellet group in center mass
//      * Slug: single heavy hole in center bullseye (100 dmg)
// 2. The X change sequence:
//    - Shells coming out (unloading at 0.36 s/shell back into reserve)
//    - New shells going in (loading at 0.42 s/shell from carried stock)
//    - HUD status line: '8/8 BIRDSHOT' -> 'UNLOADING... 5/8' -> 'LOADING... 4/8' -> '8/8 BUCKSHOT'

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-293 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_REV = path.join(ROOT, 'review/AG-293');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-293');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

function writeRetry(filePath, data, retries = 30, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.' + process.pid + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmp, data);
  for (let i = 0; i < retries; i++) {
    try {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      fs.renameSync(tmp, filePath);
      return;
    } catch (e) {
      if (i === retries - 1) {
        try { fs.copyFileSync(tmp, filePath); fs.unlinkSync(tmp); return; } catch {}
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureScreenshot(page, filePath) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  writeRetry(filePath, buf);
  return buf;
}

const LIGHTS_LIST = ['noon', 'overcast', 'dusk', 'night'];

async function main() {
  console.log('[AG-293] Starting WebGPU Shotgun Ammo Types capture in Training Ground range on RTX 5080...');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1280, height: 720 } });
    } catch {}

    console.log('[AG-293] Loading game and dismissing opening...');
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    console.log('[AG-293] Entering Training Ground range via #modeTraining...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Clean HUD styling: preserve #hud, #ammo, #ammoWeapon, #ammoDetail, hide menus/crosshair/vignettes
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag293-clean-view';
      css.textContent = [
        'body > :not(canvas):not(script):not(style):not(#view):not(#hud){visibility:hidden!important}',
        '#menu,#title,#crosshair,#modeSelect,#pause{display:none!important;visibility:hidden!important}',
        '#hud{visibility:visible!important;opacity:1!important;pointer-events:none}',
        '#ammo{display:flex!important;visibility:visible!important;opacity:1!important;background:rgba(14,18,24,0.85);border:1px solid rgba(116,201,174,0.4);border-radius:6px;padding:8px 14px;box-shadow:0 4px 18px rgba(0,0,0,0.6)}',
        '#ammoWeapon{color:#ffcf56!important;font-size:14px!important;font-weight:700!important;letter-spacing:0.08em!important}',
        '#ammoCount{color:#ffffff!important;font-size:24px!important;font-weight:700!important}',
        '#ammoDetail{color:#a4c8e0!important;font-size:13px!important;font-weight:600!important;letter-spacing:0.03em!important}'
      ].join(' ');
      document.head.append(css);
    })()`);

    // Attach stage lighting controller
    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.eyeLight = 'noon';

      function illuminate() {
        const L = window.__LIGHTS[window.eyeLight] || window.__LIGHTS['noon'];
        const p = T.player.position;
        const dir = new H.THREE.Vector3(...L.dir).normalize();
        H.sun.position.copy(p).addScaledVector(dir, 85);
        H.sun.target.position.copy(p);
        H.sun.target.updateMatrixWorld();
        H.sun.color.setHex(L.sunColor);
        H.sun.intensity = L.sun;
        H.hemi.color.setHex(L.skyColor);
        H.hemi.groundColor.setHex(L.ground);
        H.hemi.intensity = L.sky;
        H.ambientFill.intensity = L.fill;
        H.moon.intensity = window.eyeLight === 'night' ? 0.45 : 0;
      }

      H.attach({
        held: () => false,
        scale: (dt) => dt,
        frame: illuminate
      });
    })()`);

    const manifest = [];

    // Setup player and shotgun:
    // Stand in Lane 3 (center lane x=0) at z = tg.origin.z + 6, facing target 3 at z = tg.origin.z + 16 (exactly 10m away)
    console.log('[AG-293] Setting up shotgun and positioning marine 10m from target in Lane 3...');
    const initDiag = await page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(true);
      T.grantWeaponDbg('shotgun');
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
      T.setUnarmedDbg(false);
      T.flightHold(false);

      const tg = T.trainingDbg.tg();
      // Lane 3 center target is index 2 (x=0, z=16 past line)
      const targetZ = tg.origin.z + 16;
      const targetX = tg.origin.x;
      // Position marine at 10m: z = targetZ - 10 = tg.origin.z + 6
      T.player.position.set(targetX, tg.floorY, targetZ - 10);
      T.player.rotation.set(0, 0, 0);

      // Aim camera straight down the lane toward chest of target 3
      T.setShotView({
        x: targetX,
        y: tg.floorY + 1.62,
        z: targetZ - 10,
        tx: targetX,
        ty: tg.floorY + 1.45,
        tz: targetZ,
        fov: 62
      });

      // Grant ample reserves for all 3 types
      T.ammoDbg.carry('shotgun', 'buckshot', 40);
      T.ammoDbg.carry('shotgun', 'slug', 40);
      T.setAmmoDbg('shotgun', 8);

      return {
        weapon: T.getCurrentWeapon(),
        state: T.ammoTypeState('shotgun'),
        playerPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
        targetDist: 10
      };
    })()`);

    console.log('[AG-293] Initial state:', JSON.stringify(initDiag));
    assert(initDiag.weapon === 'shotgun', 'Must have shotgun equipped');
    assert(initDiag.state?.order?.join(',') === 'birdshot,buckshot,slug', 'Shotgun must have birdshot, buckshot, slug');

    // === PART 1: Firing Birdshot, Buckshot, Slug across 4 Lights (Strips 1, 2, 3) ===
    const TYPES = [
      { id: 'birdshot', name: 'Birdshot', pellets: 7, dmg: 9, spread: 0.14, hullColor: 'red', hullHex: 0xa43e37, bands: 0 },
      { id: 'buckshot', name: 'Buckshot', pellets: 8, dmg: 10, spread: 0.12, hullColor: 'blue', hullHex: 0x497ba0, bands: 1 },
      { id: 'slug', name: 'Slug', pellets: 1, dmg: 100, spread: 0.02, hullColor: 'ivory', hullHex: 0xc9c3a2, bands: 2 }
    ];

    for (const tInfo of TYPES) {
      console.log(`\n========================================================================`);
      console.log(`[AG-293] Capturing Type: ${tInfo.name.toUpperCase()} (Strip: ${tInfo.id})`);
      console.log(`========================================================================`);

      for (const light of LIGHTS_LIST) {
        const shotName = `shotgun-${tInfo.id}-${light}.png`;
        const targetName = `target-${tInfo.id}-${light}.png`;
        console.log(`[AG-293] -> Firing ${tInfo.name} in ${light} (hull: ${tInfo.hullColor}, target 10m)...`);

        const diag = await page.evaluate(`(async () => {
          const typeId = ${JSON.stringify(tInfo.id)};
          const lightName = ${JSON.stringify(light)};
          const T = window.TT;
          window.eyeLight = lightName;

          // 1. Load desired ammo type
          T.ammoDbg.load(typeId);
          T.setAmmoDbg('shotgun', 8);

          // 2. Reset target and clear past casings/marks
          const tg = T.trainingDbg.tg();
          tg.resetTargets();
          if (T.casings) T.casings.length = 0;

          // Position player at 10m mark
          const targetZ = tg.origin.z + 16;
          const targetX = tg.origin.x;
          T.player.position.set(targetX, tg.floorY, targetZ - 10);
          T.setShotView({
            x: targetX,
            y: tg.floorY + 1.62,
            z: targetZ - 10,
            tx: targetX,
            ty: tg.floorY + 1.45,
            tz: targetZ,
            fov: 62
          });

          // 3. Fire shotgun round!
          T.setMouseFireDbg(true);
          T.stepFrame(0.016);
          T.setMouseFireDbg(false);

          // 4. Step until pump ejection spawns the hull and pellets reach the target
          for (let step = 0; step < 32; step++) {
            T.stepFrame(0.016);
            if (T.ammoDbg.hulls().length > 0) {
              // let the shell arc through the air
              T.stepFrame(0.016);
              T.stepFrame(0.016);
              T.stepFrame(0.016);
              break;
            }
          }

          // 5. Inspect newest casing
          const C = T.casings;
          const newest = C && C.length > 0 ? C[C.length - 1] : null;
          const casingMesh = newest ? newest.mesh : null;
          const hullType = casingMesh ? (casingMesh.userData?.hullType || casingMesh.userData?.caseOf) : null;

          // Read HUD
          const hudWeapon = document.getElementById('ammoWeapon')?.textContent || '';
          const hudDetail = document.getElementById('ammoDetail')?.textContent || '';
          const hudCount = document.getElementById('ammoCount')?.textContent || '';

          return {
            type: typeId,
            light: lightName,
            chamber: T.ammoDbg.chamber(),
            casingsCount: C ? C.length : 0,
            hullType,
            casingPos: newest && newest.pos ? { x: +newest.pos.x.toFixed(3), y: +newest.pos.y.toFixed(3), z: +newest.pos.z.toFixed(3) } : null,
            hud: { weapon: hudWeapon, count: hudCount, detail: hudDetail },
            targetHits: tg.targets[2] ? tg.targets[2].hits : 0
          };
        })()`);

        console.log(`  Diag: chamber=${diag.chamber} hull=${diag.hullType} casings=${diag.casingsCount} HUD="${diag.hud.count} ${diag.hud.detail}"`);

        // Capture main 1P view (Shotgun + thrown hull + 10m target + HUD)
        const fpBuf = await captureScreenshot(page, path.join(OUT_REV, shotName));
        fs.writeFileSync(path.join(OUT_QA, shotName), fpBuf);

        // Frame close-up of the 10m target plate showing pellet spread pattern
        await page.evaluate(`(() => {
          const T = window.TT, tg = T.trainingDbg.tg();
          const targetZ = tg.origin.z + 16, targetX = tg.origin.x;
          // Stand 2.5m in front of target plate for detailed spread look
          T.setShotView({
            x: targetX,
            y: tg.floorY + 1.35,
            z: targetZ - 2.5,
            tx: targetX,
            ty: tg.floorY + 1.35,
            tz: targetZ,
            fov: 38
          });
          T.stepFrame(0.016);
        })()`);

        const tgtBuf = await captureScreenshot(page, path.join(OUT_REV, targetName));
        fs.writeFileSync(path.join(OUT_QA, targetName), tgtBuf);

        // Restore normal 10m aiming view
        await page.evaluate(`(() => {
          const T = window.TT, tg = T.trainingDbg.tg();
          const targetZ = tg.origin.z + 16, targetX = tg.origin.x;
          T.setShotView({
            x: targetX,
            y: tg.floorY + 1.62,
            z: targetZ - 10,
            tx: targetX,
            ty: tg.floorY + 1.45,
            tz: targetZ,
            fov: 62
          });
          T.stepFrame(0.016);
        })()`);

        manifest.push({
          shot: shotName,
          targetShot: targetName,
          type: tInfo.id,
          light,
          pellets: tInfo.pellets,
          damage: tInfo.dmg,
          spread: tInfo.spread,
          hullColor: tInfo.hullColor,
          hullBands: tInfo.bands,
          hud: diag.hud
        });
      }
    }

    // === PART 2: The X Change Sequence (Strip 4) ===
    console.log(`\n========================================================================`);
    console.log(`[AG-293] Capturing The X Change Sequence (Strip 4)...`);
    console.log(`========================================================================`);

    // Reset to Noon lighting for pristine change frames
    await page.evaluate(`(() => { window.eyeLight = 'noon'; })()`);

    // Frame 1: Ready before change (Birdshot in tube, 8/8)
    const f1Diag = await page.evaluate(`(() => {
      const T = window.TT;
      T.ammoDbg.load('birdshot');
      T.setAmmoDbg('shotgun', 8);
      T.ammoDbg.carry('shotgun', 'buckshot', 40);
      T.stepFrame(0.016);
      return {
        hudWeapon: document.getElementById('ammoWeapon')?.textContent,
        hudDetail: document.getElementById('ammoDetail')?.textContent,
        hudCount: document.getElementById('ammoCount')?.textContent,
        state: T.ammoTypeState('shotgun')
      };
    })()`);
    console.log('[AG-293] Frame 1 Ready:', JSON.stringify(f1Diag));
    const f1Buf = await captureScreenshot(page, path.join(OUT_REV, 'change-1-ready.png'));
    fs.writeFileSync(path.join(OUT_QA, 'change-1-ready.png'), f1Buf);

    // Trigger X key event
    console.log('[AG-293] Pressing X to initiate ammo switch from Birdshot to Buckshot...');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'x', code: 'KeyX', windowsVirtualKeyCode: 88, nativeVirtualKeyCode: 88 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'x', code: 'KeyX', windowsVirtualKeyCode: 88, nativeVirtualKeyCode: 88 });

    // Step 0.5s into Unloading phase
    const f2Diag = await page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 28; i++) T.stepFrame(0.018); // ~0.50s into unload
      return {
        hudWeapon: document.getElementById('ammoWeapon')?.textContent,
        hudDetail: document.getElementById('ammoDetail')?.textContent,
        hudCount: document.getElementById('ammoCount')?.textContent,
        state: T.ammoTypeState('shotgun')
      };
    })()`);
    console.log('[AG-293] Frame 2 Unloading:', JSON.stringify(f2Diag));
    const f2Buf = await captureScreenshot(page, path.join(OUT_REV, 'change-2-unloading.png'));
    fs.writeFileSync(path.join(OUT_QA, 'change-2-unloading.png'), f2Buf);

    // Step to the Empty / Transition point (all 8 birdshot shells out, ~2.9s)
    const f3Diag = await page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 125; i++) T.stepFrame(0.018); // advance to empty / first in
      return {
        hudWeapon: document.getElementById('ammoWeapon')?.textContent,
        hudDetail: document.getElementById('ammoDetail')?.textContent,
        hudCount: document.getElementById('ammoCount')?.textContent,
        state: T.ammoTypeState('shotgun')
      };
    })()`);
    console.log('[AG-293] Frame 3 Transition/Empty:', JSON.stringify(f3Diag));
    const f3Buf = await captureScreenshot(page, path.join(OUT_REV, 'change-3-transition.png'));
    fs.writeFileSync(path.join(OUT_QA, 'change-3-transition.png'), f3Buf);

    // Step midway into Loading phase (~4.5s: buckshot shells going into the tube)
    const f4Diag = await page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 80; i++) T.stepFrame(0.018); // advance through loading
      return {
        hudWeapon: document.getElementById('ammoWeapon')?.textContent,
        hudDetail: document.getElementById('ammoDetail')?.textContent,
        hudCount: document.getElementById('ammoCount')?.textContent,
        state: T.ammoTypeState('shotgun')
      };
    })()`);
    console.log('[AG-293] Frame 4 Loading:', JSON.stringify(f4Diag));
    const f4Buf = await captureScreenshot(page, path.join(OUT_REV, 'change-4-loading.png'));
    fs.writeFileSync(path.join(OUT_QA, 'change-4-loading.png'), f4Buf);

    // Step until change completes and settles (~6.8s)
    const f5Diag = await page.evaluate(`(() => {
      const T = window.TT;
      for (let i = 0; i < 130; i++) T.stepFrame(0.018); // advance to settled
      return {
        hudWeapon: document.getElementById('ammoWeapon')?.textContent,
        hudDetail: document.getElementById('ammoDetail')?.textContent,
        hudCount: document.getElementById('ammoCount')?.textContent,
        state: T.ammoTypeState('shotgun')
      };
    })()`);
    console.log('[AG-293] Frame 5 Settled:', JSON.stringify(f5Diag));
    const f5Buf = await captureScreenshot(page, path.join(OUT_REV, 'change-5-settled.png'));
    fs.writeFileSync(path.join(OUT_QA, 'change-5-settled.png'), f5Buf);

    // === PART 3: High-Resolution 3-Hull Close-Up Studio Plate ===
    console.log(`\n========================================================================`);
    console.log(`[AG-293] Capturing 3 Spent Hulls Studio Inspection Plate...`);
    console.log(`========================================================================`);

    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { spentCaseGeometry } = await import('/studio/weapon-casings.js');
      const mat = new H.THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.32,
        metalness: 0.55
      });

      const tg = T.trainingDbg.tg();
      const originX = tg.origin.x;
      const originY = tg.floorY + 1.45;
      const originZ = tg.origin.z + 6;

      // Group for the 3 hulls
      const g = new H.THREE.Group();
      g.name = 'ag293-hull-studio';
      g.position.set(originX, originY, originZ);

      // Add a dedicated soft inspection key light so metallic brass & plastic hulls gleam
      const keyLight = new H.THREE.DirectionalLight(0xfff8ee, 2.5);
      keyLight.position.set(0.4, 0.8, -0.6);
      g.add(keyLight);

      const fillLight = new H.THREE.DirectionalLight(0xdde8ff, 1.2);
      fillLight.position.set(-0.5, 0.2, -0.4);
      g.add(fillLight);

      // 1. Birdshot (Red, short brass head, 0 bands)
      const geoBird = spentCaseGeometry(H.THREE, 'shotgun', 'birdshot');
      const mBird = new H.THREE.Mesh(geoBird, mat);
      mBird.position.set(-0.065, 0, 0);
      mBird.rotation.set(0.22, 0.28, -0.08);
      g.add(mBird);

      // 2. Buckshot (Blue, tall brass head, 1 band)
      const geoBuck = spentCaseGeometry(H.THREE, 'shotgun', 'buckshot');
      const mBuck = new H.THREE.Mesh(geoBuck, mat);
      mBuck.position.set(0.00, 0, 0);
      mBuck.rotation.set(0.22, 0.28, -0.08);
      g.add(mBuck);

      // 3. Slug (Ivory, tall brass head, 2 bands)
      const geoSlug = spentCaseGeometry(H.THREE, 'shotgun', 'slug');
      const mSlug = new H.THREE.Mesh(geoSlug, mat);
      mSlug.position.set(0.065, 0, 0);
      mSlug.rotation.set(0.22, 0.28, -0.08);
      g.add(mSlug);

      H.scene.add(g);

      // Aim camera straight at the 3 shells at ~0.36m distance
      T.setShotView({
        x: originX,
        y: originY + 0.02,
        z: originZ - 0.36,
        tx: originX,
        ty: originY,
        tz: originZ,
        fov: 28
      });
      T.stepFrame(0.016);
    })()`);

    const hullsBuf = await captureScreenshot(page, path.join(OUT_REV, 'hulls-comparison.png'));
    fs.writeFileSync(path.join(OUT_QA, 'hulls-comparison.png'), hullsBuf);

    // Individual macro shots of each hull
    console.log('[AG-293] Capturing individual macro shots for Birdshot, Buckshot, Slug hulls...');
    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      const originX = tg.origin.x;
      const originY = tg.floorY + 1.45;
      const originZ = tg.origin.z + 6;
      T.setShotView({ x: originX - 0.065, y: originY + 0.015, z: originZ - 0.24, tx: originX - 0.065, ty: originY, tz: originZ, fov: 18 });
      T.stepFrame(0.016);
    })()`);
    const birdHullBuf = await captureScreenshot(page, path.join(OUT_REV, 'hull-birdshot.png'));
    fs.writeFileSync(path.join(OUT_QA, 'hull-birdshot.png'), birdHullBuf);

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      const originX = tg.origin.x;
      const originY = tg.floorY + 1.45;
      const originZ = tg.origin.z + 6;
      T.setShotView({ x: originX, y: originY + 0.015, z: originZ - 0.24, tx: originX, ty: originY, tz: originZ, fov: 18 });
      T.stepFrame(0.016);
    })()`);
    const buckHullBuf = await captureScreenshot(page, path.join(OUT_REV, 'hull-buckshot.png'));
    fs.writeFileSync(path.join(OUT_QA, 'hull-buckshot.png'), buckHullBuf);

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      const originX = tg.origin.x;
      const originY = tg.floorY + 1.45;
      const originZ = tg.origin.z + 6;
      T.setShotView({ x: originX + 0.065, y: originY + 0.015, z: originZ - 0.24, tx: originX + 0.065, ty: originY, tz: originZ, fov: 18 });
      T.stepFrame(0.016);
    })()`);
    const slugHullBuf = await captureScreenshot(page, path.join(OUT_REV, 'hull-slug.png'));
    fs.writeFileSync(path.join(OUT_QA, 'hull-slug.png'), slugHullBuf);

    // Clean up studio hull meshes and restore view
    await page.evaluate(`(() => {
      const T = window.TT, H = T.inspectHost();
      const g = H.scene.getObjectByName('ag293-hull-studio');
      if (g) H.scene.remove(g);
      T.setShotView(null);
      T.stepFrame(0.016);
    })()`);

    // Save capture manifest
    const report = {
      task: 'AG-293',
      timestamp: new Date().toISOString(),
      shotsCount: manifest.length + 6,
      manifest,
      changeDiag: { f1: f1Diag, f2: f2Diag, f3: f3Diag, f4: f4Diag, f5: f5Diag }
    };
    writeRetry(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(report, null, 2));
    writeRetry(path.join(OUT_QA, 'capture-manifest.json'), JSON.stringify(report, null, 2));

    console.log(`[AG-293] Successfully captured all ${report.shotsCount} shots and manifest!`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-293] Unhandled error during capture:', err);
  process.exit(1);
});
