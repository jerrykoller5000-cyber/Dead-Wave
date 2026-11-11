// tools/ag290-capture.mjs
// AG-290 (Jerry, 10 Nov; J131, J132): barrel heat, smoke wisp & barrel/suppressor red glow.
// Retaken in the Training Ground firing range on NVIDIA GeForce RTX 5080 using the AG-286 range harness:
// - GW-4 (m4) fired until hot (heat ~0.90) then naturally cooling (0.58 -> 0.32 -> 0.0), 1P & 3P, across 4 lights
// - Daylight attenuation: subtle dark cherry warmth at Noon vs full incandescent glow at Night
// - Visible thin curling smoke wisp rising off muzzle, stronger when hotter
// - Suppressed GW-4 (can glows & smokes with axial gradient, bore & barrel stay cold), 1P & 3P, across 4 lights
// - Minigun spun hot (heat ~0.92, 6 rotary barrels glow inside dark clamp collars), 1P & 3P, across 4 lights

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-290 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-AG-290');
const OUT_REV = path.join(ROOT, 'review/AG-290');
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

const SHOTS = [
  // === 1. First-Person GW-4 (m4): Cold -> Fired Hot (0.90) -> Natural Cooling across 4 Lights ===
  { name: 'fp-m4-cold-noon.png', title: '1P GW-4 Cold (0.00) · Noon', weapon: 'm4', suppressed: false, heat: 0.0, light: 'noon', firstPerson: true },
  { name: 'fp-m4-hot-noon.png', title: '1P GW-4 Fired Hot (0.90) · Noon', weapon: 'm4', suppressed: false, heat: 0.90, light: 'noon', firstPerson: true },
  { name: 'fp-m4-cool58-noon.png', title: '1P GW-4 Cooling (0.58) · Noon', weapon: 'm4', suppressed: false, heat: 0.58, coolingFrom: 0.90, light: 'noon', firstPerson: true },
  { name: 'fp-m4-cool32-noon.png', title: '1P GW-4 Cooling (0.32) · Noon', weapon: 'm4', suppressed: false, heat: 0.32, coolingFrom: 0.58, light: 'noon', firstPerson: true },

  { name: 'fp-m4-cold-overcast.png', title: '1P GW-4 Cold (0.00) · Overcast', weapon: 'm4', suppressed: false, heat: 0.0, light: 'overcast', firstPerson: true },
  { name: 'fp-m4-hot-overcast.png', title: '1P GW-4 Fired Hot (0.90) · Overcast', weapon: 'm4', suppressed: false, heat: 0.90, light: 'overcast', firstPerson: true },

  { name: 'fp-m4-cold-dusk.png', title: '1P GW-4 Cold (0.00) · Dusk', weapon: 'm4', suppressed: false, heat: 0.0, light: 'dusk', firstPerson: true },
  { name: 'fp-m4-hot-dusk.png', title: '1P GW-4 Fired Hot (0.90) · Dusk', weapon: 'm4', suppressed: false, heat: 0.90, light: 'dusk', firstPerson: true },

  { name: 'fp-m4-cold-night.png', title: '1P GW-4 Cold (0.00) · Night', weapon: 'm4', suppressed: false, heat: 0.0, light: 'night', firstPerson: true },
  { name: 'fp-m4-hot-night.png', title: '1P GW-4 Fired Hot (0.90) · Night', weapon: 'm4', suppressed: false, heat: 0.90, light: 'night', firstPerson: true },
  { name: 'fp-m4-cool58-night.png', title: '1P GW-4 Cooling (0.58) · Night', weapon: 'm4', suppressed: false, heat: 0.58, coolingFrom: 0.90, light: 'night', firstPerson: true },
  { name: 'fp-m4-cool32-night.png', title: '1P GW-4 Cooling (0.32) · Night', weapon: 'm4', suppressed: false, heat: 0.32, coolingFrom: 0.58, light: 'night', firstPerson: true },

  // === 2. First-Person Suppressed GW-4 (Can Glows & Smokes, Barrel Stays Cold) in 4 Lights ===
  { name: 'fp-m4-sup-cold-noon.png', title: '1P Suppressed GW-4 Cold (0.00) · Noon', weapon: 'm4', suppressed: true, heat: 0.0, light: 'noon', firstPerson: true },
  { name: 'fp-m4-sup-hot-noon.png', title: '1P Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Noon', weapon: 'm4', suppressed: true, heat: 0.90, light: 'noon', firstPerson: true },
  { name: 'fp-m4-sup-hot-overcast.png', title: '1P Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Overcast', weapon: 'm4', suppressed: true, heat: 0.90, light: 'overcast', firstPerson: true },
  { name: 'fp-m4-sup-hot-dusk.png', title: '1P Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Dusk', weapon: 'm4', suppressed: true, heat: 0.90, light: 'dusk', firstPerson: true },
  { name: 'fp-m4-sup-cold-night.png', title: '1P Suppressed GW-4 Cold (0.00) · Night', weapon: 'm4', suppressed: true, heat: 0.0, light: 'night', firstPerson: true },
  { name: 'fp-m4-sup-hot-night.png', title: '1P Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Night', weapon: 'm4', suppressed: true, heat: 0.90, light: 'night', firstPerson: true },

  // === 3. First-Person Minigun Spun Hot (6-Barrel Cluster Glows & Smokes) in 4 Lights ===
  { name: 'fp-minigun-cold-noon.png', title: '1P Minigun Cold (0.00) · Noon', weapon: 'minigun', suppressed: false, heat: 0.0, light: 'noon', firstPerson: true },
  { name: 'fp-minigun-hot-noon.png', title: '1P Minigun Spun Hot (0.92) · Noon', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'noon', firstPerson: true },
  { name: 'fp-minigun-hot-overcast.png', title: '1P Minigun Spun Hot (0.92) · Overcast', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'overcast', firstPerson: true },
  { name: 'fp-minigun-hot-dusk.png', title: '1P Minigun Spun Hot (0.92) · Dusk', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'dusk', firstPerson: true },
  { name: 'fp-minigun-cold-night.png', title: '1P Minigun Cold (0.00) · Night', weapon: 'minigun', suppressed: false, heat: 0.0, light: 'night', firstPerson: true },
  { name: 'fp-minigun-hot-night.png', title: '1P Minigun Spun Hot (0.92) · Night', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'night', firstPerson: true },

  // === 4. Third-Person Marine in Range: GW-4 Hot & Cooling, Suppressed GW-4, and Minigun in 4 Lights ===
  { name: 'tp-m4-cold-noon.png', title: '3P Marine GW-4 Cold (0.00) · Noon', weapon: 'm4', suppressed: false, heat: 0.0, light: 'noon', firstPerson: false },
  { name: 'tp-m4-hot-noon.png', title: '3P Marine GW-4 Hot (0.90) · Noon', weapon: 'm4', suppressed: false, heat: 0.90, light: 'noon', firstPerson: false },
  { name: 'tp-m4-hot-overcast.png', title: '3P Marine GW-4 Hot (0.90) · Overcast', weapon: 'm4', suppressed: false, heat: 0.90, light: 'overcast', firstPerson: false },
  { name: 'tp-m4-hot-dusk.png', title: '3P Marine GW-4 Hot (0.90) · Dusk', weapon: 'm4', suppressed: false, heat: 0.90, light: 'dusk', firstPerson: false },
  { name: 'tp-m4-cold-night.png', title: '3P Marine GW-4 Cold (0.00) · Night', weapon: 'm4', suppressed: false, heat: 0.0, light: 'night', firstPerson: false },
  { name: 'tp-m4-hot-night.png', title: '3P Marine GW-4 Hot (0.90) · Night', weapon: 'm4', suppressed: false, heat: 0.90, light: 'night', firstPerson: false },
  { name: 'tp-m4-cool38-night.png', title: '3P Marine GW-4 Cooling (0.38) · Night', weapon: 'm4', suppressed: false, heat: 0.38, coolingFrom: 0.90, light: 'night', firstPerson: false },

  { name: 'tp-m4-sup-cold-night.png', title: '3P Marine Suppressed GW-4 Cold (0.00) · Night', weapon: 'm4', suppressed: true, heat: 0.0, light: 'night', firstPerson: false },
  { name: 'tp-m4-sup-hot-noon.png', title: '3P Marine Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Noon', weapon: 'm4', suppressed: true, heat: 0.90, light: 'noon', firstPerson: false },
  { name: 'tp-m4-sup-hot-night.png', title: '3P Marine Suppressed GW-4 Hot (0.90, Can Glows / Barrel Cold) · Night', weapon: 'm4', suppressed: true, heat: 0.90, light: 'night', firstPerson: false },

  { name: 'tp-minigun-cold-noon.png', title: '3P Marine Minigun Cold (0.00) · Noon', weapon: 'minigun', suppressed: false, heat: 0.0, light: 'noon', firstPerson: false },
  { name: 'tp-minigun-hot-noon.png', title: '3P Marine Minigun Spun Hot (0.92) · Noon', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'noon', firstPerson: false },
  { name: 'tp-minigun-hot-night.png', title: '3P Marine Minigun Spun Hot (0.92) · Night', weapon: 'minigun', suppressed: false, heat: 0.92, light: 'night', firstPerson: false },
];

async function main() {
  console.log('[AG-290] Starting WebGPU Barrel Heat & Muzzle Smoke capture in Training Ground range on RTX 5080...');
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

    console.log('[AG-290] Loading game and dismissing opening...');
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));

    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    console.log('[AG-290] Entering Training Ground range via #modeTraining...');
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    // Hide all menus, HUDs, overlays, titles: ONLY WebGPU canvas remains visible
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag290-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    })()`);

    // Attach inspector host for 4-light illumination and optional heat pinning
    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.__LIGHTS = LIGHTS;
      window.eyeLight = 'noon';
      window.__pinHeat = 0.0;

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

      H.attach({
        held: () => false,
        scale: (dt) => {
          if (window.__pinHeat != null && T.barrelHeat) {
            T.barrelHeat.setHeat(T.getCurrentWeapon(), window.__pinHeat);
          }
          return dt;
        },
        frame: illuminate
      });
    })()`);

    const manifest = [];
    let prevWeapon = null;
    let prevSuppressed = null;
    let prevFP = null;

    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      const switchedRig = (s.weapon !== prevWeapon || s.suppressed !== prevSuppressed || s.firstPerson !== prevFP);
      prevWeapon = s.weapon;
      prevSuppressed = s.suppressed;
      prevFP = s.firstPerson;

      console.log(`[AG-290] (${i + 1}/${SHOTS.length}) Capturing ${s.name}: ${s.title}...`);

      const diag = await page.evaluate(`(async () => {
        const T = window.TT;
        const s = ${JSON.stringify(s)};
        const switchedRig = ${JSON.stringify(switchedRig)};
        window.eyeLight = s.light;

        if (!T.trainingDbg.state().active) {
          throw new Error('FAIL: Not inside Training Ground!');
        }

        T.flightHold(false);
        T.setZoomHeldDbg(false);

        // 1. Equip weapon & suppressor if needed (cool & clear previous gun before slinging onto back)
        if (T.getCurrentWeapon() !== s.weapon) {
          window.__pinHeat = 0.0;
          if (T.barrelHeat) T.barrelHeat.reset();
          if (T.armoryDbg?.fit) T.armoryDbg.fit('m4', 'suppressor', false);
          await new Promise((r) => setTimeout(r, 90));
        }
        const idx = T.WEAPON_ORDER.indexOf(s.weapon);
        for (let k = 0; k < 30 && T.getCurrentWeapon() !== s.weapon; k++) {
          T.setWeapon(idx);
          await new Promise((r) => setTimeout(r, 80));
        }
        if (T.isUnarmed()) T.toggleHolster();

        const mods = T.armoryDbg?.mods(s.weapon) || [];
        if (mods.some((m) => m.id === 'suppressor')) {
          T.armoryDbg.fit(s.weapon, 'suppressor', !!s.suppressed);
        }

        // 2. Viewmode & camera framing
        if (s.firstPerson) {
          T.setShotView(null);
          T.setViewFirstDbg(true);
          T.setOtsAimDbg(0, -0.06);

          let ready = false;
          for (let k = 0; k < 50; k++) {
            await new Promise((r) => setTimeout(r, 50));
            const vm = T.viewmodelDbg();
            if (vm && vm.info && vm.info.active && vm.info.key === s.weapon && vm.root && vm.root.visible) {
              ready = true;
              break;
            }
          }
          if (!ready) {
            const vm = T.viewmodelDbg();
            throw new Error('FAIL: Viewmodel did not settle for ' + s.weapon + ': ' + JSON.stringify(vm && vm.info));
          }
          if (switchedRig) {
            await new Promise((r) => setTimeout(r, 450));
          }
        } else {
          T.setViewFirstDbg(false);
          T.setAimYawDbg(0);
          T.setOtsAimDbg(0, -0.02);
          if (switchedRig) {
            await new Promise((r) => setTimeout(r, 400));
          }
          const p = T.player.position;
          T.setShotView({
            x: p.x - 1.02,
            y: p.y + 1.38,
            z: p.z - 0.16,
            tx: p.x - 0.08,
            ty: p.y + 1.25,
            tz: p.z + 0.56,
            fov: 38
          });
          await new Promise((r) => setTimeout(r, 260));
        }

        // 3. Heat & rising smoke wisp simulation in live real-time frames
        const wasCold = T.barrelHeat.getHeat(s.weapon) < 0.35;
        if (s.coolingFrom != null) {
          if (T.barrelHeat.getHeat(s.weapon) < s.heat + 0.05) {
            window.__pinHeat = s.coolingFrom;
            T.barrelHeat.setHeat(s.weapon, s.coolingFrom);
            await new Promise((r) => setTimeout(r, 1100));
          }
          window.__pinHeat = null;
          for (let k = 0; k < 280; k++) {
            if (T.barrelHeat.getHeat(s.weapon) <= s.heat) break;
            await new Promise((r) => setTimeout(r, 50));
          }
          window.__pinHeat = T.barrelHeat.getHeat(s.weapon);
          await new Promise((r) => setTimeout(r, 200));
        } else if (s.heat <= 0) {
          window.__pinHeat = 0.0;
          T.barrelHeat.reset();
          await new Promise((r) => setTimeout(r, 350));
        } else {
          if (switchedRig || wasCold) {
            T.barrelHeat.reset();
            const burst = Math.ceil(s.heat / 0.009) + 8;
            for (let b = 0; b < burst; b++) {
              T.barrelHeat.addShot(s.weapon, !!s.suppressed);
            }
          }
          window.__pinHeat = s.heat;
          T.barrelHeat.setHeat(s.weapon, s.heat);
          // Let curling smoke wisp rise ~30-40 cm off the muzzle over ~1.65s of live 60fps frames
          await new Promise((r) => setTimeout(r, (switchedRig || wasCold) ? 1650 : 680));
        }

        // 4. Verify menu hidden + measure emissiveIntensity + daylight attenuation + active visible wisps
        const menu = document.getElementById('menu');
        if (menu && menu.offsetParent !== null && window.getComputedStyle(menu).visibility !== 'hidden') {
          throw new Error('FAIL: Menu element is visible before capture!');
        }

        const worldGun = (T.inspectHost && T.inspectHost().dev && T.inspectHost().dev.weaponMeshes)
          ? T.inspectHost().dev.weaponMeshes[s.weapon]
          : (T.weaponMeshes ? T.weaponMeshes[s.weapon] : null);
        let checkRoot = worldGun;
        if (s.firstPerson) {
          const vm = T.viewmodelDbg();
          const space = vm.space || vm.root.getObjectByName('vm-space') || vm.root;
          const holder = space.getObjectByName('vm-gun');
          checkRoot = holder && holder.children[0];
        }
        const parts = T.barrelHeat.findGunHeatParts(checkRoot, s.weapon, worldGun);
        const maxEmissive = (node) => {
          let mx = 0;
          if (!node) return 0;
          node.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of ms) {
              if (m && typeof m.emissiveIntensity === 'number' && m.emissive && (m.emissive.r > 0 || m.emissive.g > 0)) {
                mx = Math.max(mx, m.emissiveIntensity);
              }
            }
          });
          return +mx.toFixed(3);
        };

        const barrelEmissive = maxEmissive(parts.barrel);
        const suppressorEmissive = maxEmissive(parts.suppressor);
        const wispGroupVis = !!(T.barrelHeat._wispGroup && T.barrelHeat._wispGroup.visible);
        const activeWisps = T.barrelHeat._wisps.filter((w) => w.active && w.mesh && w.mesh.visible && w.mat.opacity > 0.03).length;
        const liveHeat = +T.barrelHeat.getHeat(s.weapon).toFixed(3);

        if (s.heat === 0) {
          if (barrelEmissive !== 0 || suppressorEmissive !== 0) {
            throw new Error('FAIL: Cold weapon has residual glow: barrel=' + barrelEmissive + ' sup=' + suppressorEmissive);
          }
        } else if (s.heat >= 0.85) {
          const minEm = s.light === 'noon' ? 0.30 : (s.light === 'overcast' ? 0.50 : (s.light === 'dusk' ? 0.65 : 1.25));
          const targetEm = s.suppressed ? suppressorEmissive : barrelEmissive;
          if (targetEm < minEm) {
            throw new Error('FAIL: Hot glow below expected range (' + minEm + ') in ' + s.light + ': ' + targetEm);
          }
          if (s.light === 'noon' && targetEm > 0.65) {
            throw new Error('FAIL: Noon glow too bright (not attenuated for daylight): ' + targetEm);
          }
          if (s.suppressed && barrelEmissive !== 0) {
            throw new Error('FAIL: Barrel glowed while suppressed! barrel=' + barrelEmissive);
          }
          if (!wispGroupVis || activeWisps < 6) {
            throw new Error('FAIL: Expected visible rising smoke wisp (got groupVis=' + wispGroupVis + ', activeWisps=' + activeWisps + ')');
          }
        }

        return { liveHeat, barrelEmissive, suppressorEmissive, activeWisps, wispGroupVis };
      })()`);

      const qaPath = path.join(OUT_QA, s.name);
      const revPath = path.join(OUT_REV, s.name);
      const pngBuf = await captureScreenshot(page, qaPath);
      writeRetry(revPath, pngBuf);

      console.log(`  -> Saved ${s.name} (${pngBuf.length}B) | heat=${diag.liveHeat} barrelEm=${diag.barrelEmissive} supEm=${diag.suppressorEmissive} wisps=${diag.activeWisps}`);
      manifest.push({
        file: s.name,
        title: s.title,
        weapon: s.weapon,
        suppressed: s.suppressed,
        targetHeat: s.heat,
        liveHeat: diag.liveHeat,
        barrelEmissive: diag.barrelEmissive,
        suppressorEmissive: diag.suppressorEmissive,
        activeWisps: diag.activeWisps,
        light: s.light,
        firstPerson: s.firstPerson,
        bytes: pngBuf.length
      });
    }

    const report = {
      task: 'AG-290',
      timestamp: new Date().toISOString(),
      gpu: 'NVIDIA GeForce RTX 5080 WebGPU',
      location: 'Training Ground Firing Range',
      shotsCount: manifest.length,
      shots: manifest
    };

    const jsonStr = JSON.stringify(report, null, 2);
    writeRetry(path.join(OUT_QA, 'manifest.json'), jsonStr);
    writeRetry(path.join(OUT_REV, 'manifest.json'), jsonStr);
    console.log('[AG-290] All 37 range screenshots captured and verified successfully!');
  } finally {
    try { await browser.close(); } catch {}
    try { await server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[AG-290] Error during capture:', err);
  process.exit(1);
});
