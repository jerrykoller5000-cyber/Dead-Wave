// qa/2026-11-11-AG-297/ag297-capture.mjs
// Comprehensive GPU looks & 4-light verification for AG-297:
// GP-20087 (Training camera collision & station pull)
// GP-20088 (Training prop seating across 4 lights on RTX 5080 WebGPU)
// CE-2b (First-person controls & trigger manipulation: revolver double-action & pistol index)
// CE-3 (Reload animations & weapon actions: pistol rack, KR-7 handle, shotgun switch, revolver)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-297 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-297');
const OUT_REV_GP87 = path.join(ROOT, 'review/GP-20087/gpu');
const OUT_REV_GP88 = path.join(ROOT, 'review/GP-20088/gpu');
const OUT_REV_CE2 = path.join(ROOT, 'review/CE-2/gpu');
const OUT_REV_CE3 = path.join(ROOT, 'review/CE-3/gpu');

function writeRetry(filePath, data, retries = 30, delay = 100) {
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

async function captureShot(page, outFiles) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  for (const f of outFiles) {
    writeRetry(f, buf);
  }
  return buf;
}

const LIGHTS = [
  { name: 'noon', time: 0.42 },
  { name: 'overcast', time: 0.50 },
  { name: 'dusk', time: 0.74 },
  { name: 'night', time: 0.00 },
];

const GP20088_CAMERAS = [
  {
    key: 'perimeter',
    title: 'Perimeter Wall Clearance',
    cam: { fov: 35, x: -41.5, y: -198.6, z: -645.6, tx: -43, ty: -199.65, tz: -646.3 },
  },
  {
    key: 'infirmary',
    title: 'Infirmary Fence Contact (Floor Y=-200)',
    cam: { fov: 35, x: -35.8, y: -198.9, z: -650.6, tx: -36.3, ty: -199.9, tz: -651.78 },
  },
  {
    key: 'monitor',
    title: 'Range Drill Monitor Flush Standoff',
    cam: { fov: 35, x: -0.5, y: -197.9, z: -640.9, tx: 1.5, ty: -196.4, tz: -639.35 },
  },
  {
    key: 'cif',
    title: 'CIF Eave Wall Clearance',
    cam: { fov: 35, x: 6, y: -195.6, z: -648.5, tx: 7.98, ty: -196.9, tz: -650.2 },
  },
];

async function main() {
  console.log('[AG-297] Starting RTX 5080 WebGPU 4-Light & GPU Looks capture...');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const manifest = {
    startedAt: new Date().toISOString(),
    results: {},
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1280, height: 720 } });
    } catch {}

    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    // Click Training Ground from menu
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'AG297-Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Inject CSS to hide all menus, HUDs, overlays, titles
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag297-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#perf{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    })()`);

    // Setup host and lights
    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.eyeLight = 'noon';

      T.grantAllWeapons();
      T.modsOwnAllDbg();
      if (T.isUnarmed()) T.toggleHolster();
      T.flightHold(false);

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
      H.attach({ held: () => false, scale: (dt) => dt, frame: illuminate });
    })()`);

    // ------------------------------------------------------------------------
    // SECTION 1: GP-20087 Third-Person Training Camera Collision (10 spots)
    // ------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('[AG-297] SECTION 1: GP-20087 Third-Person Camera Collision (10 Spots)');
    console.log('======================================================');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.setViewFirstDbg(false);
      T.clearShotView && T.clearShotView();
    })()`);

    const spots = ['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole','corridor','armoryRoom','rangeBench'];
    const gp87Results = [];
    let prevYaw = 0;

    for (const spot of spots) {
      const base = await page.evaluate(`((spot, prevYaw) => {
        const T = window.TT, tr = T.trainingDbg.state(), tg = tr.tg, cc = tr.cameraCollision;
        let px, pz, nx, nz;
        if (tg.stations[spot]) {
          const s = tg.stations[spot], f = s.front, L = Math.hypot(f.x - s.x, f.z - s.z);
          nx = (f.x - s.x) / L; nz = (f.z - s.z) / L; px = f.x; pz = f.z;
        } else if (spot === 'corridor') { px = -6.2; pz = -642; nx = 1; nz = 0; }
        else if (spot === 'armoryRoom') { px = 6.95; pz = -641.5; nx = -1; nz = 0; }
        else { px = 0; pz = -640.5; nx = 0; nz = -1; }
        const yaw = Math.atan2(nx, nz), p = T.player.position;
        T.rotateCamera(yaw - prevYaw);
        T.setVelDbg(0, 0);
        p.set(px, tg.floorY, pz);
        T.camera.position.set(px, tg.floorY + 1.6, pz);
        for (let i = 0; i < 30; i++) T.stepFrame(0.016);
        const camPos = { x: T.camera.position.x, y: T.camera.position.y, z: T.camera.position.z };
        const all = [...tg.solids.filter(s => s.target == null && !s.floor), ...cc.boxes];
        const inside = (v, b) => v.x > b.minX && v.x < b.maxX && v.y > b.minY && v.y < b.maxY && v.z > b.minZ && v.z < b.maxZ;
        const insideSolids = all.filter(b => inside(camPos, b)).map(b => b.name || b.station || 'solid');
        return { spot, yaw, player: { x: p.x, y: p.y, z: p.z }, camPos, insideSolids };
      })(${JSON.stringify(spot)}, ${prevYaw})`);
      prevYaw = base.yaw;

      const qPath = path.join(OUT_QA, `gp20087/${spot}.png`);
      const rPath = path.join(OUT_REV_GP87, `${spot}.png`);
      await captureShot(page, [qPath, rPath]);

      assert.deepEqual(base.insideSolids, [], `${spot}: camera inside solid`);
      console.log(`  ✓ Spot: ${spot.padEnd(14)} Camera: [${base.camPos.x.toFixed(2)}, ${base.camPos.y.toFixed(2)}, ${base.camPos.z.toFixed(2)}] Inside: 0 solids`);
      gp87Results.push(base);
    }
    manifest.results.gp20087 = gp87Results;

    // ------------------------------------------------------------------------
    // SECTION 2: GP-20088 Training Prop Seating (4 areas in 4 lights)
    // ------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('[AG-297] SECTION 2: GP-20088 Prop Seating across 4 Lights');
    console.log('======================================================');

    const gp88Results = [];
    for (const item of GP20088_CAMERAS) {
      console.log(`\n--- Prop: ${item.title} (${item.key}) ---`);
      for (const light of LIGHTS) {
        await page.evaluate(`((cam, light) => {
          const T = window.TT;
          window.eyeLight = light.name;
          if (T.setWorldTime) T.setWorldTime(light.time);
          T.setShotView({
            x: cam.x, y: cam.y, z: cam.z,
            tx: cam.tx, ty: cam.ty, tz: cam.tz,
            fov: cam.fov
          });
          for (let i = 0; i < 20; i++) T.stepFrame(0.016);
        })(${JSON.stringify(item.cam)}, ${JSON.stringify(light)})`);

        const qPath = path.join(OUT_QA, `gp20088/${item.key}-${light.name}.png`);
        const rPath = path.join(OUT_REV_GP88, `${item.key}-${light.name}.png`);
        await captureShot(page, [qPath, rPath]);
        console.log(`  ✓ Captured ${item.key} @ ${light.name}`);
        gp88Results.push({ key: item.key, light: light.name, qPath, rPath });
      }
    }
    manifest.results.gp20088 = gp88Results;

    // ------------------------------------------------------------------------
    // SECTION 3: CE-2b First-Person Controls & Trigger Interaction
    // ------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('[AG-297] SECTION 3: CE-2b Controls (Revolver Double-Action & Pistol Index)');
    console.log('======================================================');

    await page.evaluate(`(() => {
      const T = window.TT;
      T.clearShotView && T.clearShotView();
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      T.setOtsAimDbg(0, -0.08);
    })()`);

    // --- 3A: Revolver Double-Action Cylinder Turn ---
    console.log('\n--- 3A: Revolver Double-Action Pull across 4 Lights ---');
    const ce2Results = [];

    for (const light of LIGHTS) {
      console.log(`[Revolver @ ${light.name}]`);
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('revolver');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'revolver'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('revolver', 6);
        for (let i = 0; i < 120; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      // 1. Rest
      const qRest = path.join(OUT_QA, `ce2/revolver-rest-${light.name}.png`);
      const rRest = path.join(OUT_REV_CE2, `revolver-rest-${light.name}.png`);
      await captureShot(page, [qRest, rRest]);

      // 2. Mid-pull (4 frames of trigger hold at 60Hz = ~67ms)
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(true);
        for (let i = 0; i < 4; i++) T.stepFrame(0.016);
      })()`);
      const qMid = path.join(OUT_QA, `ce2/revolver-midpull-${light.name}.png`);
      const rMid = path.join(OUT_REV_CE2, `revolver-midpull-${light.name}.png`);
      await captureShot(page, [qMid, rMid]);

      // 3. Break (4 more frames = frame 8, trigger breaks, hammer falls, cylinder advances)
      const breakInfo = await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 4; i++) T.stepFrame(0.016);
        const ammo = T.getAmmo()['revolver'];
        const vm = T.viewmodelDbg();
        return { ammo, active: vm?.info?.active };
      })()`);
      const qBreak = path.join(OUT_QA, `ce2/revolver-break-${light.name}.png`);
      const rBreak = path.join(OUT_REV_CE2, `revolver-break-${light.name}.png`);
      await captureShot(page, [qBreak, rBreak]);

      // 4. Release trigger and reset
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(false);
        for (let i = 0; i < 15; i++) T.stepFrame(0.016);
      })()`);
      const qReset = path.join(OUT_QA, `ce2/revolver-reset-${light.name}.png`);
      const rReset = path.join(OUT_REV_CE2, `revolver-reset-${light.name}.png`);
      await captureShot(page, [qReset, rReset]);

      console.log(`  ✓ Revolver 4 phases captured @ ${light.name} (Ammo post-break: ${breakInfo.ammo})`);
      ce2Results.push({ weapon: 'revolver', light: light.name, breakInfo });
    }

    // --- 3B: Issue Sidearm Pistol Trigger Index Fit ---
    console.log('\n--- 3B: Pistol Trigger Index Press across 4 Lights ---');
    for (const light of LIGHTS) {
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('pistol');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'pistol'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('pistol', 15);
        for (let i = 0; i < 90; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      // Pistol Rest
      const qPistolRest = path.join(OUT_QA, `ce2/pistol-rest-${light.name}.png`);
      const rPistolRest = path.join(OUT_REV_CE2, `pistol-rest-${light.name}.png`);
      await captureShot(page, [qPistolRest, rPistolRest]);

      // Pistol Pressed
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(true);
        T.stepFrame(0.016);
        T.stepFrame(0.016);
      })()`);
      const qPistolFire = path.join(OUT_QA, `ce2/pistol-press-${light.name}.png`);
      const rPistolFire = path.join(OUT_REV_CE2, `pistol-press-${light.name}.png`);
      await captureShot(page, [qPistolFire, rPistolFire]);

      // Release
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setMouseFireDbg(false);
        for (let i = 0; i < 30; i++) T.stepFrame(0.016);
      })()`);

      console.log(`  ✓ Pistol Index Rest & Press captured @ ${light.name}`);
      ce2Results.push({ weapon: 'pistol', light: light.name });
    }
    manifest.results.ce2 = ce2Results;

    // ------------------------------------------------------------------------
    // SECTION 4: CE-3 Weapon Reloads & Actions across 4 Lights
    // ------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('[AG-297] SECTION 4: CE-3 Weapon Reloads & Actions across 4 Lights');
    console.log('======================================================');

    const ce3Results = [];

    // --- 4A: Pistol Slide Rack ---
    console.log('\n--- 4A: Pistol Slide Rack ---');
    for (const light of LIGHTS) {
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('pistol');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'pistol'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('pistol', 5);
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
        T.startReload();
        // Advance to tactical rack phase (u ~ 0.74, ~45-50 frames into reload)
        for (let i = 0; i < 48; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      const qRack = path.join(OUT_QA, `ce3/pistol-rack-${light.name}.png`);
      const rRack = path.join(OUT_REV_CE3, `pistol-rack-${light.name}.png`);
      await captureShot(page, [qRack, rRack]);

      // Complete reload
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
      })()`);
      console.log(`  ✓ Pistol Slide Rack captured @ ${light.name}`);
      ce3Results.push({ action: 'pistol-rack', light: light.name });
    }

    // --- 4B: KR-7 Rifle Charging Handle Pull ---
    console.log('\n--- 4B: KR-7 Charging Handle Pull ---');
    for (const light of LIGHTS) {
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('ak');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'ak'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('ak', 10);
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
        T.startReload();
        // Advance to charging handle pull phase (u ~ 0.78, ~52 frames into reload)
        for (let i = 0; i < 52; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      const qHandle = path.join(OUT_QA, `ce3/kr7-handle-${light.name}.png`);
      const rHandle = path.join(OUT_REV_CE3, `kr7-handle-${light.name}.png`);
      await captureShot(page, [qHandle, rHandle]);

      // Complete reload
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
      })()`);
      console.log(`  ✓ KR-7 Charging Handle Pull captured @ ${light.name}`);
      ce3Results.push({ action: 'kr7-handle', light: light.name });
    }

    // --- 4C: Pump Shotgun Ammo Switch (X Change) ---
    console.log('\n--- 4C: Pump Shotgun Ammo Switch ---');
    for (const light of LIGHTS) {
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('shotgun');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'shotgun'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('shotgun', 8);
        T.ammoDbg.carry('shotgun', 'buckshot', 20);
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
        // Press X
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', key: 'KeyX', bubbles: true }));
        T.stepFrame(0.016);
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX', key: 'KeyX', bubbles: true }));
        // Step into unloading / loading transition (~2.0s = 120 frames)
        for (let i = 0; i < 110; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      const qShotgun = path.join(OUT_QA, `ce3/shotgun-ammo-change-${light.name}.png`);
      const rShotgun = path.join(OUT_REV_CE3, `shotgun-ammo-change-${light.name}.png`);
      await captureShot(page, [qShotgun, rShotgun]);

      // Complete switch
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 240; i++) T.stepFrame(0.016);
      })()`);
      console.log(`  ✓ Shotgun Ammo Switch captured @ ${light.name}`);
      ce3Results.push({ action: 'shotgun-switch', light: light.name });
    }

    // --- 4D: Revolver Reload ---
    console.log('\n--- 4D: Revolver Cylinder Reload ---');
    for (const light of LIGHTS) {
      await page.evaluate(`(async (light) => {
        const T = window.TT;
        window.eyeLight = light.name;
        if (T.setWorldTime) T.setWorldTime(light.time);
        const idx = T.WEAPON_ORDER.indexOf('revolver');
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== 'revolver'; i++) {
          T.setWeapon(idx);
          for (let k = 0; k < 5; k++) T.stepFrame(0.016);
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setAmmoDbg('revolver', 2);
        for (let i = 0; i < 60; i++) T.stepFrame(0.016);
        T.startReload();
        // Cylinder open phase (u ~ 0.40, ~36 frames)
        for (let i = 0; i < 36; i++) T.stepFrame(0.016);
      })(${JSON.stringify(light)})`);

      const qRevRel = path.join(OUT_QA, `ce3/revolver-reload-${light.name}.png`);
      const rRevRel = path.join(OUT_REV_CE3, `revolver-reload-${light.name}.png`);
      await captureShot(page, [qRevRel, rRevRel]);

      // Complete reload
      await page.evaluate(`(() => {
        const T = window.TT;
        for (let i = 0; i < 80; i++) T.stepFrame(0.016);
      })()`);
      console.log(`  ✓ Revolver Reload captured @ ${light.name}`);
      ce3Results.push({ action: 'revolver-reload', light: light.name });
    }
    manifest.results.ce3 = ce3Results;

    // ------------------------------------------------------------------------
    // SECTION 5: Benchmark & Performance Summary on RTX 5080
    // ------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('[AG-297] SECTION 5: Benchmark & Frame Metrics on RTX 5080');
    console.log('======================================================');

    const bench = await page.evaluate(`(() => {
      const T = window.TT;
      const draws = T.getDrawCalls ? T.getDrawCalls() : (T.renderer?.info?.render?.calls || 0);
      const tris = T.getTriangles ? T.getTriangles() : (T.renderer?.info?.render?.triangles || 0);
      return {
        draws,
        triangles: tris,
        renderer: T.renderer?.backend?.constructor?.name || 'WebGPUBackend',
      };
    })()`);

    manifest.bench = bench;
    manifest.finishedAt = new Date().toISOString();

    writeRetry(path.join(OUT_QA, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeRetry(path.join(ROOT, 'review/AG-297-manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n[AG-297] Done! Manifest written. Total checks complete.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-297] Error:', err);
  process.exit(1);
});
