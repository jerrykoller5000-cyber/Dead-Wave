// tools/ag295-capture.mjs
// AG-295 (verification for Claude 1's CD-1 pass 2):
// The hands on 8 guns in four lights on RTX 5080 WebGPU:
// pistol, revolver, launcher, pump shotgun, chainsaw, GW-4 (m4), KR-7 (ak), sniper.
// Captures each weapon at hip across 4 lights (noon, overcast, dusk, night)
// and aimed down the sights (ADS noon + night). Total 48 screenshots.
// High-fidelity WebGPU renders on NVIDIA GeForce RTX 5080.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-295 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CD-1-pass2');
const OUT_REV = path.join(ROOT, 'review/CD-1/pass2');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

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

const GUNS = [
  { key: 'pistol', name: 'Issue Sidearm Pistol' },
  { key: 'revolver', name: '.44 Magnum Revolver' },
  { key: 'launcher', name: 'M79 Grenade Launcher' },
  { key: 'shotgun', name: 'Pump-Action Shotgun' },
  { key: 'chainsaw', name: 'Chainsaw' },
  { key: 'm4', name: 'GW-4 Carbine' },
  { key: 'ak', name: 'KR-7 Rifle' },
  { key: 'sniper', name: 'Marksman Sniper Rifle' },
];

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function main() {
  console.log('[AG-295] Starting CD-1 Pass 2 WebGPU First-Person Hands on 8 Guns capture on RTX 5080...');
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
      css.id = 'ag295-clean-view';
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

    const manifest = [];
    let shotIdx = 0;
    const totalShots = GUNS.length * 6;

    for (const gun of GUNS) {
      console.log(`\n=== Weapon: ${gun.key} (${gun.name}) ===`);

      // Switch to gun and wait until viewmodel is actively showing this gun
      await page.evaluate(`(async () => {
        const T = window.TT;
        const gunKey = ${JSON.stringify(gun.key)};
        T.flightHold(false);
        T.setZoomHeldDbg(false);
        T.setOtsAimDbg(0, -0.08);

        const idx = T.WEAPON_ORDER.indexOf(gunKey);
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== gunKey; i++) {
          T.setWeapon(idx);
          await new Promise((r) => setTimeout(r, 120));
        }
        if (T.isUnarmed()) T.toggleHolster();
        T.setOtsAimDbg(0, -0.08);

        // Fit laserLight if supported
        const mods = T.armoryDbg?.mods(gunKey) || [];
        if (mods.some((m) => m.id === 'laserLight')) {
          T.armoryDbg.fit(gunKey, 'laserLight', true);
        }

        // Settle at hip in real time
        await new Promise((r) => setTimeout(r, 800));

        // Assert viewmodel is active and showing this gun
        const vm = T.viewmodelDbg();
        if (!vm) throw new Error('Viewmodel instance missing!');
        if (!vm.info || !vm.info.active) throw new Error('Viewmodel info.active is FALSE for ' + gunKey);
        if (vm.info.key !== gunKey) throw new Error('Viewmodel active key is ' + vm.info.key + ' expected ' + gunKey);
        if (!vm.root || !vm.root.visible) throw new Error('Viewmodel root is NOT visible at hip for ' + gunKey);
      })()`);

      // 1. Hip carry across 4 lights
      for (const light of LIGHTS) {
        shotIdx++;
        const filename = `${gun.key}-hip-${light}.png`;
        const title = `${gun.name} · Hip · ${light.toUpperCase()}`;
        console.log(`[AG-295] (${shotIdx}/${totalShots}) Capturing ${filename}: ${title}...`);

        await page.evaluate(`(async () => {
          const T = window.TT;
          const gunKey = ${JSON.stringify(gun.key)};
          window.eyeLight = ${JSON.stringify(light)};

          T.setZoomHeldDbg(false);
          T.setOtsAimDbg(0, -0.08);

          await new Promise((r) => setTimeout(r, 600));

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

        const qaPath = path.join(OUT_QA, filename);
        const revPath = path.join(OUT_REV, filename);
        const pngBuf = await captureScreenshot(page, qaPath);
        writeRetry(revPath, pngBuf);
        console.log(`  -> Saved ${filename}: ${pngBuf.length} bytes`);
        manifest.push({ file: filename, title, weapon: gun.key, pose: 'hip', light, bytes: pngBuf.length });
      }

      // 2. Aimed down sights (ADS)
      const aimedLights = ['noon', 'night'];
      for (const light of aimedLights) {
        shotIdx++;
        const filename = `${gun.key}-aimed-${light}.png`;
        const title = `${gun.name} · Aimed (ADS) · ${light.toUpperCase()}`;
        console.log(`[AG-295] (${shotIdx}/${totalShots}) Capturing ${filename}: ${title}...`);

        const checkResult = await page.evaluate(`(async () => {
          const T = window.TT;
          const gunKey = ${JSON.stringify(gun.key)};
          window.eyeLight = ${JSON.stringify(light)};

          T.setZoomHeldDbg(true);
          T.setOtsAimDbg(0, 0);

          // Settle in real time until ADS is completely 1.0 and viewmodel is resting at sights
          let settled = false;
          let lastCheck = null;
          for (let k = 0; k < 60; k++) {
            await new Promise((r) => setTimeout(r, 50));
            const fp = T.fpDbg();
            const vm = T.viewmodelDbg();
            if (fp && fp.ads >= 0.99) {
              if (gunKey === 'sniper') {
                if (!vm.root.visible) {
                  settled = true;
                  lastCheck = { gunKey, ads: fp.ads, scopeActive: true };
                  break;
                }
              } else if (vm && vm.info && vm.info.active && vm.root.visible && vm.gun && vm.gun.root) {
                const wp = new T.THREE.Vector3();
                vm.gun.root.getWorldPosition(wp);
                const ndc = wp.clone().project(T.camera);
                lastCheck = { gunKey, ads: fp.ads, ndcX: +ndc.x.toFixed(4), ndcY: +ndc.y.toFixed(4) };
                if (gunKey === 'chainsaw') {
                  // Chainsaw ADS raises and centers the bar up the middle, offset origin
                  if (k >= 15) {
                    settled = true;
                    break;
                  }
                } else if (gunKey === 'launcher') {
                  if (Math.abs(ndc.x) < 0.20 || (k >= 20 && Math.abs(ndc.x) < 0.35)) {
                    settled = true;
                    break;
                  }
                } else if (Math.abs(ndc.x) < 0.08 || (k >= 25 && Math.abs(ndc.x) < 0.20)) {
                  settled = true;
                  break;
                }
              }
            }
          }
          if (!settled) {
            throw new Error('FAIL: Sight did not settle for ' + gunKey + ': ' + JSON.stringify(lastCheck));
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
            if (vm.root.visible) throw new Error('FAIL: Sniper viewmodel root should be hidden under scope');
          }
          return lastCheck;
        })()`);

        console.log(`  [Sight verified settled] ${JSON.stringify(checkResult)}`);

        const qaPath = path.join(OUT_QA, filename);
        const revPath = path.join(OUT_REV, filename);
        const pngBuf = await captureScreenshot(page, qaPath);
        writeRetry(revPath, pngBuf);
        console.log(`  -> Saved ${filename}: ${pngBuf.length} bytes`);
        manifest.push({ file: filename, title, weapon: gun.key, pose: 'aimed', light, bytes: pngBuf.length, sightCheck: checkResult });
      }

      // Reset ADS zoom before next gun
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setZoomHeldDbg(false);
        T.setOtsAimDbg(0, -0.08);
        await new Promise((r) => setTimeout(r, 500));
      })()`);
    }

    const manifestJson = JSON.stringify(manifest, null, 2);
    writeRetry(path.join(OUT_REV, 'capture-manifest.json'), manifestJson);
    writeRetry(path.join(OUT_QA, 'capture-manifest.json'), manifestJson);
    console.log(`[AG-295] Visual captures complete! Total ${manifest.length} images saved.`);
  } finally {
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-295] Capture failed:', err);
  process.exit(1);
});
