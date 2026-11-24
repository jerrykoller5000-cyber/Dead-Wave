// tools/ce1-capture.mjs
// AG-291: CE-1 actions on each shot in first person across four lights on RTX 5080 WebGPU.
// Captures 6 weapons (pistol, m4, ak, uzi, revolver, aa12) at hip stepped through action cycle:
// rest (0 ms), 8, 17, 25, 33, 42, 50, 67, 83, 100, 130, 170 ms across noon, overcast, dusk, night.
// Plus m4 and ak at 25 ms down the sights (ADS).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-291 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_GPU = path.join(ROOT, 'review/CE-1/gpu');
const OUT_QA = path.join(ROOT, 'qa/2026-11-10-CE-1');
fs.mkdirSync(OUT_GPU, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

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
  { key: 'pistol', name: 'Issue Sidearm Pistol' },
  { key: 'm4', name: 'GW-4 Carbine' },
  { key: 'ak', name: 'KR-7 Rifle' },
  { key: 'uzi', name: 'Wasp / Uzi SMG' },
  { key: 'revolver', name: '.44 Magnum Revolver' },
  { key: 'aa12', name: 'AA-12 Breacher Combat Shotgun' },
];

const LIGHTS = [
  { name: 'noon', time: 0.42 },
  { name: 'overcast', time: 0.50 },
  { name: 'dusk', time: 0.74 },
  { name: 'night', time: 0.00 },
];

const ACTION_STEPS = [
  { id: 'f000', dt: 0, ms: 0, label: 'Rest (0 ms)' },
  { id: 'f008', dt: 0.008, ms: 8, fire: true, label: '8 ms (Break/Fired)' },
  { id: 'f017', dt: 0.009, ms: 17, label: '17 ms' },
  { id: 'f025', dt: 0.008, ms: 25, label: '25 ms (Peak Stroke)' },
  { id: 'f033', dt: 0.008, ms: 33, label: '33 ms' },
  { id: 'f042', dt: 0.009, ms: 42, label: '42 ms' },
  { id: 'f050', dt: 0.008, ms: 50, label: '50 ms' },
  { id: 'f067', dt: 0.017, ms: 67, label: '67 ms' },
  { id: 'f083', dt: 0.016, ms: 83, label: '83 ms' },
  { id: 'f100', dt: 0.017, ms: 100, label: '100 ms' },
  { id: 'f130', dt: 0.030, ms: 130, label: '130 ms' },
  { id: 'f170', dt: 0.040, ms: 170, label: '170 ms (Reset)' },
];

async function main() {
  console.log('[CE-1] Starting WebGPU First-Person Action Cycle capture on RTX 5080...');
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

    // Strip HUDs, menus, overlays
    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ce1-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#perf{display:none!important;visibility:hidden!important}';
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
      T.setOtsAimDbg(0, -0.08);

      // Step frames for camera and view to settle facing the shooting range
      for (let k = 0; k < 60; k++) T.stepFrame(1 / 30);
      window.__home = T.player.position.clone();

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

    const restOnly = process.argv.includes('--rest-only');
    const manifest = [];
    let shotCount = 0;

    for (const light of LIGHTS) {
      console.log(`\n======================================================`);
      console.log(`[CE-1] Lighting Condition: ${light.name.toUpperCase()} (time: ${light.time})`);
      console.log(`======================================================`);

      for (const gun of GUNS) {
        console.log(`\n--- Weapon: ${gun.key} (${gun.name}) @ ${light.name} ---`);

        // Setup weapon at rest
        await page.evaluate(`(async () => {
          const T = window.TT;
          const gunKey = ${JSON.stringify(gun.key)};
          window.eyeLight = ${JSON.stringify(light.name)};
          if (T.setWorldTime) T.setWorldTime(${light.time});

          T.flightHold(false);
          T.setZoomHeldDbg(false);
          T.setOtsAimDbg(0, -0.08);
          T.player.position.copy(window.__home);

          const idx = T.WEAPON_ORDER.indexOf(gunKey);
          for (let i = 0; i < 30 && T.getCurrentWeapon() !== gunKey; i++) {
            T.setWeapon(idx);
            for (let k = 0; k < 5; k++) T.stepFrame(1 / 30);
          }
          if (T.isUnarmed()) T.toggleHolster();

          // Wait until viewmodel has this gun active and raised
          for (let i = 0; i < 300; i++) {
            T.stepFrame(1 / 30);
            const curVm = T.viewmodelDbg();
            if (curVm && curVm.info && curVm.info.active && curVm.info.key === gunKey && curVm.info.raise > 0.999) {
              break;
            }
          }

          // Step 60 more frames for camera sway/inertia to fully rest
          for (let i = 0; i < 60; i++) T.stepFrame(1 / 30);
          T.flightHold(true);
        })()`);

        // Verify weapon ready
        const readyState = await page.evaluate(`(() => {
          const T = window.TT;
          const vm = T.viewmodelDbg();
          const gunKey = ${JSON.stringify(gun.key)};
          const s = T.weaponMeshes[gunKey];
          return {
            active: vm?.info?.active,
            key: vm?.info?.key,
            raise: vm?.info?.raise,
            gunVisible: s?.visible,
            recoilBolt: !!vm?.gun?.recoilBolt,
            work: !!vm?.gun?.work,
            slide: !!vm?.gun?.slide,
            trigger: !!vm?.gun?.trigger,
            hammer: !!vm?.gun?.hammer
          };
        })()`);
        console.log(`  Ready check:`, readyState);
        assert(readyState.active && readyState.key === gun.key && readyState.raise > 0.99, 'Weapon must be raised and active');

        const stepsToRun = restOnly ? ACTION_STEPS.filter((s) => s.id === 'f000') : ACTION_STEPS;

        // Step through action cycle
        for (const step of stepsToRun) {
          shotCount++;
          const filename = `${gun.key}-hip-${light.name}-${step.id}.png`;
          const title = `${gun.name} · Hip · ${light.name} · ${step.label}`;

          const stepInfo = await page.evaluate(`((isFire, dt) => {
            const T = window.TT;
            const gunKey = ${JSON.stringify(gun.key)};
            const s = T.weaponMeshes[gunKey];
            if (isFire) {
              s.userData.shots = (s.userData.shots | 0) + 1;
            }
            // Always step a frame so WebGPU renders the scene!
            // For f000 (0 ms Rest), dt is 0, so step 1/60s to render the settled gun.
            // For shot frames, step the authored action cycle dt.
            T.stepFrame(dt > 0 ? dt : 1 / 60);
            const vm = T.viewmodelDbg();
            const g = vm?.gun;
            const r = {
              shots: s?.userData?.shots,
              ads: vm?.info?.ads,
              raise: vm?.info?.raise
            };
            if (g?.recoilBolt) {
              r.bolt = g.recoilBolt.children.map((c) => [+c.position.z.toFixed(4), +c.scale.z.toFixed(3), c.visible]);
            }
            if (g?.work) {
              r.work = +(g.work.position.z - (g.workBase ? g.workBase.z : 0)).toFixed(4);
            }
            if (g?.slide) {
              r.slide = +g.slide.position.z.toFixed(4);
            }
            if (g?.trigger) {
              r.trig = +g.trigger.rotation.x.toFixed(3);
            }
            if (g?.hammer) {
              r.ham = +g.hammer.rotation.x.toFixed(3);
            }
            return r;
          })(${step.fire ? 'true' : 'false'}, ${step.dt})`);

          await new Promise((r) => setTimeout(r, 40));
          const gpuPath = path.join(OUT_GPU, filename);
          const qaPath = path.join(OUT_QA, filename);
          await page.screenshot(gpuPath);
          const pngBuf = fs.readFileSync(gpuPath);
          writeRetry(qaPath, pngBuf);

          console.log(`  [${step.id}] ${step.label} (${pngBuf.length}b): slide=${stepInfo.slide ?? '-'} bolt=${stepInfo.bolt ? JSON.stringify(stepInfo.bolt[0]) : '-'} trig=${stepInfo.trig ?? '-'} ham=${stepInfo.ham ?? '-'}`);
          manifest.push({ file: filename, title, weapon: gun.key, pose: 'hip', light: light.name, step: step.id, ms: step.ms, bytes: pngBuf.length, info: stepInfo });
        }

        // Additional test: GW-4 (m4) and KR-7 (ak) ADS at 25 ms down the sights
        if (!restOnly && (gun.key === 'm4' || gun.key === 'ak')) {
          console.log(`  >> Capturing ADS 25 ms down the sights for ${gun.name} @ ${light.name}...`);
          await page.evaluate(`(async () => {
            const T = window.TT;
            T.setZoomHeldDbg(true);
            T.setOtsAimDbg(0, 0);

            for (let k = 0; k < 180; k++) {
              T.stepFrame(1 / 30);
              const fp = T.fpDbg();
              const vm = T.viewmodelDbg();
              if (fp && fp.ads >= 0.999 && vm && vm.info && vm.info.ads >= 0.999) {
                for (let s = 0; s < 45; s++) T.stepFrame(1 / 30);
                break;
              }
            }
          })()`);

          // ADS rest (0 ms)
          const adsRestFile = `${gun.key}-ads-${light.name}-f000.png`;
          await page.screenshot(path.join(OUT_GPU, adsRestFile));
          writeRetry(path.join(OUT_QA, adsRestFile), fs.readFileSync(path.join(OUT_GPU, adsRestFile)));
          manifest.push({ file: adsRestFile, title: `${gun.name} · ADS Rest · ${light.name}`, weapon: gun.key, pose: 'ads', light: light.name, step: 'f000', ms: 0 });

          // Fire shot and step 25 ms down sights
          await page.evaluate(`(() => {
            const T = window.TT;
            const gunKey = ${JSON.stringify(gun.key)};
            const s = T.weaponMeshes[gunKey];
            s.userData.shots = (s.userData.shots | 0) + 1;
            T.stepFrame(0.025);
          })()`);

          const ads25File = `${gun.key}-ads-${light.name}-f025.png`;
          await page.screenshot(path.join(OUT_GPU, ads25File));
          writeRetry(path.join(OUT_QA, ads25File), fs.readFileSync(path.join(OUT_GPU, ads25File)));
          manifest.push({ file: ads25File, title: `${gun.name} · ADS 25ms · ${light.name}`, weapon: gun.key, pose: 'ads', light: light.name, step: 'f025', ms: 25 });
          console.log(`  -> Saved ADS pair: ${adsRestFile} and ${ads25File}`);

          // Reset ADS
          await page.evaluate(`(() => {
            const T = window.TT;
            T.setZoomHeldDbg(false);
            T.setOtsAimDbg(0, -0.1);
            for (let k = 0; k < 30; k++) T.stepFrame(1 / 30);
          })()`);
        }
      }
    }

    if (restOnly && fs.existsSync(path.join(OUT_GPU, 'ce1-manifest.json'))) {
      try {
        const oldManifest = JSON.parse(fs.readFileSync(path.join(OUT_GPU, 'ce1-manifest.json'), 'utf8'));
        const newFiles = new Set(manifest.map((m) => m.file));
        const merged = oldManifest.filter((m) => !newFiles.has(m.file)).concat(manifest);
        const manifestJson = JSON.stringify(merged, null, 2);
        writeRetry(path.join(OUT_GPU, 'ce1-manifest.json'), manifestJson);
        writeRetry(path.join(OUT_QA, 'ce1-manifest.json'), manifestJson);
      } catch {
        const manifestJson = JSON.stringify(manifest, null, 2);
        writeRetry(path.join(OUT_GPU, 'ce1-manifest.json'), manifestJson);
        writeRetry(path.join(OUT_QA, 'ce1-manifest.json'), manifestJson);
      }
    } else {
      const manifestJson = JSON.stringify(manifest, null, 2);
      writeRetry(path.join(OUT_GPU, 'ce1-manifest.json'), manifestJson);
      writeRetry(path.join(OUT_QA, 'ce1-manifest.json'), manifestJson);
    }
    console.log(`\n[CE-1] All captures complete! Total ${manifest.length} images saved to review/CE-1/gpu/ and qa/2026-11-10-CE-1/`);
  } finally {
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((err) => {
  console.error('[CE-1] Capture failed:', err);
  process.exit(1);
});
