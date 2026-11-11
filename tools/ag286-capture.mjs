// tools/ag286-capture.mjs
// AG-286 (Jerry J126 rule 2): The hands on the guns in four lights on RTX 5080 (CD-1 verification).
// Captures 9 weapons (uzi, m4, ak, shotgun, sniper, aa12, minigun, pistol, revolver)
// at hip across 4 lights (noon, overcast, dusk, night) and down the sights (aimed noon + night).
// High-fidelity WebGPU renders on NVIDIA GeForce RTX 5080.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-286 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-CD-1');
const OUT_REV = path.join(ROOT, 'review/CD-1');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

function writeRetry(filePath, data, retries = 20, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

const GUNS = [
  { key: 'uzi', name: 'Uzi Submachine Gun' },
  { key: 'm4', name: 'GW-4 Carbine' },
  { key: 'ak', name: 'KR-7 Rifle' },
  { key: 'shotgun', name: 'Pump-Action Shotgun' },
  { key: 'sniper', name: 'Marksman Sniper Rifle' },
  { key: 'aa12', name: 'AA-12 Combat Shotgun' },
  { key: 'minigun', name: 'Microgun / Minigun' },
  { key: 'pistol', name: 'Issue Sidearm Pistol' },
  { key: 'revolver', name: '.44 Magnum Revolver' },
];

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function main() {
  console.log('[AG-286] Starting WebGPU First-Person Hands on 9 Guns capture on RTX 5080...');
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

    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    // Click Training Ground from menu
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Inject CSS to hide all menus, HUDs, overlays, titles: ONLY canvas and view remain
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag286-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    })()`);

    // Setup host and lights
    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.eyeLight = 'noon';

      T.setViewFirstDbg(true);
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

    const aimedNoonOnly = process.argv.includes('--aimed-noon-only');
    const manifest = [];
    let shotIdx = 0;
    const totalShots = GUNS.length * (aimedNoonOnly ? 1 : 6);

    for (const gun of GUNS) {
      console.log(`\n=== Weapon: ${gun.key} (${gun.name}) ===`);

      // Switch to gun and wait until viewmodel is actively showing this gun
      await page.evaluate(`(async () => {
        const T = window.TT;
        const gunKey = ${JSON.stringify(gun.key)};
        T.flightHold(false);
        T.setZoomHeldDbg(false);
        T.setOtsAimDbg(0, -0.08);
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);

        const idx = T.WEAPON_ORDER.indexOf(gunKey);
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== gunKey; i++) {
          T.setWeapon(idx);
          await new Promise((r) => setTimeout(r, 120));
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setOtsAimDbg(0, -0.08);
        T.flightHold(true);

        // Fit laserLight if supported
        const mods = T.armoryDbg?.mods(gunKey) || [];
        if (mods.some((m) => m.id === 'laserLight')) {
          T.armoryDbg.fit(gunKey, 'laserLight', true);
        }

        // Settle frames
        for (let i = 0; i < 90; i++) T.stepFrame(1 / 30);

        // Assert viewmodel is active and showing this gun
        const vm = T.viewmodelDbg();
        if (!vm) throw new Error('Viewmodel instance missing!');
        if (!vm.info || !vm.info.active) throw new Error('Viewmodel info.active is FALSE for ' + gunKey);
        if (vm.info.key !== gunKey) throw new Error('Viewmodel active key is ' + vm.info.key + ' expected ' + gunKey);
        if (!vm.root || !vm.root.visible) throw new Error('Viewmodel root is NOT visible at hip for ' + gunKey);
      })()`);

      if (!aimedNoonOnly) {
        // 1. Hip carry across 4 lights
        for (const light of LIGHTS) {
          shotIdx++;
          const filename = `${gun.key}-hip-${light}.png`;
          const title = `${gun.name} · Hip · ${light.toUpperCase()}`;
          console.log(`[AG-286] (${shotIdx}/${totalShots}) Capturing ${filename}: ${title}...`);

          await page.evaluate(`(async () => {
            const T = window.TT;
            const gunKey = ${JSON.stringify(gun.key)};
            window.eyeLight = ${JSON.stringify(light)};

            T.setZoomHeldDbg(false);
            T.setOtsAimDbg(0, -0.08);

            for (let k = 0; k < 35; k++) T.stepFrame(1 / 30);

            // Assert menu is NOT showing and viewmodel IS in the frame
            const menu = document.getElementById('menu');
            if (menu && menu.offsetParent !== null && window.getComputedStyle(menu).visibility !== 'hidden') {
              throw new Error('FAIL: Menu element is visible before capture!');
            }
            const vm = T.viewmodelDbg();
            if (!vm || !vm.info.active || vm.info.key !== gunKey || !vm.root.visible) {
              throw new Error('FAIL: Viewmodel is not active and visible for ' + gunKey);
            }
          })()`);

          await new Promise((r) => setTimeout(r, 60));
          const qaPath = path.join(OUT_QA, filename);
          const revPath = path.join(OUT_REV, filename);
          await page.screenshot(qaPath);
          const pngBuf = fs.readFileSync(qaPath);
          writeRetry(revPath, pngBuf);
          console.log(`  -> Saved ${filename}: ${pngBuf.length} bytes`);
          manifest.push({ file: filename, title, weapon: gun.key, pose: 'hip', light, bytes: pngBuf.length });
        }
      }

      // 2. Aimed down sights (ADS)
      const aimedLights = aimedNoonOnly ? ['noon'] : ['noon', 'night'];
      for (const light of aimedLights) {
        shotIdx++;
        const filename = `${gun.key}-aimed-${light}.png`;
        const title = `${gun.name} · Aimed (ADS) · ${light.toUpperCase()}`;
        console.log(`[AG-286] (${shotIdx}/${totalShots}) Capturing ${filename}: ${title}...`);

        await page.evaluate(`(async () => {
          const T = window.TT;
          const gunKey = ${JSON.stringify(gun.key)};
          window.eyeLight = ${JSON.stringify(light)};

          T.setZoomHeldDbg(true);
          T.setOtsAimDbg(0, 0);

          // Settle frames until ADS is completely 1.0 and viewmodel is resting at sights
          let settled = false;
          for (let k = 0; k < 180; k++) {
            T.stepFrame(1 / 30);
            const fp = T.fpDbg();
            const vm = T.viewmodelDbg();
            if (fp && fp.ads >= 0.999) {
              if (gunKey === 'sniper' || (vm && vm.info && vm.info.ads >= 0.999)) {
                settled = true;
                // Step 45 more frames for camera sway/inertia to fully rest
                for (let s = 0; s < 45; s++) T.stepFrame(1 / 30);
                break;
              }
            }
          }

          // Assert viewmodel and menu state
          const menu = document.getElementById('menu');
          if (menu && menu.offsetParent !== null && window.getComputedStyle(menu).visibility !== 'hidden') {
            throw new Error('FAIL: Menu element is visible before capture!');
          }
          const fp = T.fpDbg();
          if (!fp || fp.ads < 0.99) {
            throw new Error('FAIL: fp.ads did not reach sights for ' + gunKey + ': ' + (fp ? fp.ads : 'null'));
          }
          const vm = T.viewmodelDbg();
          if (!vm || !vm.info.active || vm.info.key !== gunKey) {
            throw new Error('FAIL: Viewmodel is not active for ' + gunKey);
          }
          if (gunKey !== 'sniper') {
            if (!vm.root.visible) throw new Error('FAIL: Viewmodel root is not visible for ' + gunKey);
            if (vm.info.ads < 0.99) throw new Error('FAIL: vm.info.ads did not reach sights for ' + gunKey + ': ' + vm.info.ads);
          } else {
            // For sniper at ADS >= 0.82, viewmodel root is hidden and full scope mask is active
            if (vm.root.visible) throw new Error('FAIL: Sniper viewmodel root should be hidden under scope');
          }
        })()`);

        await new Promise((r) => setTimeout(r, 60));
        const qaPath = path.join(OUT_QA, filename);
        const revPath = path.join(OUT_REV, filename);
        await page.screenshot(qaPath);
        const pngBuf = fs.readFileSync(qaPath);
        writeRetry(revPath, pngBuf);
        console.log(`  -> Saved ${filename}: ${pngBuf.length} bytes`);
        manifest.push({ file: filename, title, weapon: gun.key, pose: 'aimed', light, bytes: pngBuf.length });
      }

      // Reset ADS zoom before next gun
      await page.evaluate(`(() => {
        const T = window.TT;
        T.setZoomHeldDbg(false);
        T.setOtsAimDbg(0, -0.08);
        for (let k = 0; k < 30; k++) T.stepFrame(1 / 30);
      })()`);
    }

    if (aimedNoonOnly && fs.existsSync(path.join(OUT_REV, 'capture-manifest.json'))) {
      try {
        const oldManifest = JSON.parse(fs.readFileSync(path.join(OUT_REV, 'capture-manifest.json'), 'utf8'));
        const newFiles = new Set(manifest.map((m) => m.file));
        const merged = oldManifest.filter((m) => !newFiles.has(m.file)).concat(manifest);
        writeRetry(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(merged, null, 2));
        writeRetry(path.join(OUT_QA, 'capture-manifest.json'), JSON.stringify(merged, null, 2));
      } catch {
        const manifestJson = JSON.stringify(manifest, null, 2);
        writeRetry(path.join(OUT_REV, 'capture-manifest.json'), manifestJson);
        writeRetry(path.join(OUT_QA, 'capture-manifest.json'), manifestJson);
      }
    } else {
      const manifestJson = JSON.stringify(manifest, null, 2);
      writeRetry(path.join(OUT_REV, 'capture-manifest.json'), manifestJson);
      writeRetry(path.join(OUT_QA, 'capture-manifest.json'), manifestJson);
    }
    console.log(`[AG-286] Visual captures complete! Total ${manifest.length} images saved.`);
  } finally {
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-286] Capture failed:', err);
  process.exit(1);
});
