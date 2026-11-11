// qa/2026-11-11-GT-20076-aa12/aa12-gpu-look.mjs
// Independent 4-light RTX 5080 WebGPU look at Breacher (aa12) J128 surface return:
//   - At eye (1P hip & 1P ADS): rear curved-to-polymer crown seam
//   - In hand (3P held-right & 3P held-left): dark rectangular side inset, circular trim disc/beads, front casing-to-side outline
//   - On rack (armoryRack close-up): grip-side rubber graphics & fore-end contact
//   - Finishes: Factory across all 5 views x 4 lights + M81 camo masking across eye/held-right/rack x 4 lights + Factory restore check
//   - Plus standalone Inspector (DWInspect.show('weapon.aa12')) 4-light check

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-GT-20076-aa12/shots');
const OUT_REV = path.join(ROOT, 'review/GT-20076/gpu-aa12/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

function saveShot(name, b64) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT_QA, name), buf);
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  return buf.length;
}

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const summary = {
    capturedAt: new Date().toISOString(),
    backend: null,
    shots: {},
    m81PaintCheck: null,
    inspectorShots: {},
    pageErrors: []
  };

  try {
    // Pass A: Live Training Ground (Eye 1P hip/ADS, In-hand 3P held-right/held-left, Armory Rack, Factory + M81 + Restore)
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      await moveOffscreen(page);
      await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
      await moveOffscreen(page);
      assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
      await page.evaluate('DWOpening.dismissForTesting()');
      assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'AA12-LOOK';
        document.getElementById('modeTraining').click();
      })()`);
      assert(await page.waitFor(
        'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
        { timeout: 60000 }
      ));

      summary.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "unknown"');

      // Stage Breacher in Training Ground with clean HUD-free canvas and shadow-unoccluded studio-matched 4-light presets
      await page.evaluate(`(async () => {
        const T = window.TT, G = T.THREE, H = T.inspectHost();
        const { LIGHTS } = await import('/studio/inspector/stage.js');
        window.__LIGHTS = LIGHTS;
        window.__curLight = 'noon';
        window.__frozen = false;

        const css = document.createElement('style');
        css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
        document.head.append(css);

        T.grantAllWeapons();
        T.flightHold(true);
        if (T.isUnarmed()) T.toggleHolster();
        if (!T.armoryDbg.stored().includes('aa12')) {
          T.armoryDbg.ui().armory.buy({ id: 'vis-aa12', kind: 'aa12' }, { store: true });
        }
        const aaIdx = T.WEAPON_ORDER.indexOf('aa12');
        for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'aa12'; i++) {
          T.setWeapon(aaIdx);
          for (let j = 0; j < 10; j++) T.stepFrame(1 / 60);
        }
        for (let j = 0; j < 65; j++) T.stepFrame(1 / 60);
        T.armoryDbg.refreshRack(true);
        for (let j = 0; j < 6; j++) T.stepFrame(1 / 60);

        // Disable sun shadow map clipping from Training concrete ceiling so all 4 studio light presets illuminate held & rack surfaces directly
        window.__origSunCast = H.sun.castShadow;
        H.sun.castShadow = false;

        H.attach({
          held: () => window.__frozen,
          scale: (dt) => dt,
          frame: () => {
            const k = window.__curLight;
            const L = window.__LIGHTS[k] || window.__LIGHTS.noon;
            const cam = H.camera;
            const camRight = new G.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
            const camUp = new G.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
            const camBack = new G.Vector3(0, 0, 1).applyQuaternion(cam.quaternion);
            // Key light angled relative to camera view so both right/left held sides and rack face catch specular & seam relief cleanly
            const keyDir = camRight.multiplyScalar(0.45).addScaledVector(camUp, 0.62).addScaledVector(camBack, 0.64).normalize();
            H.sun.position.copy(cam.position).addScaledVector(keyDir, 60);
            H.sun.target.position.copy(cam.position);
            H.sun.target.updateMatrixWorld();
            H.sun.color.setHex(L.sunColor);
            H.sun.intensity = k === 'night' ? 0.55 : L.sun;
            H.hemi.color.setHex(L.skyColor);
            H.hemi.groundColor.setHex(L.ground);
            H.hemi.intensity = k === 'night' ? 0.52 : L.sky;
            H.ambientFill.intensity = k === 'night' ? 0.36 : Math.max(0.24, L.fill);
            H.moon.intensity = k === 'night' ? 0.55 : 0;
            const tg = T.trainingDbg.tg();
            if (tg && tg.setLights) tg.setLights(k !== 'night');
          }
        });

        window.__setAa12Pose = async (view, lightKey) => {
          window.__frozen = false;
          window.__curLight = lightKey;
          const tg = T.trainingDbg.tg();
          T.setShotView(null);
          const isEye = view === 'eye-hip' || view === 'eye-ads';
          T.setViewFirstDbg(isEye);
          T.setZoomHeldDbg(view === 'eye-ads');
          T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 0.55);
          T.setOtsAimDbg(0, -0.08);
          for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);

          if (!isEye) {
            const carry = T.carryGunCopyDbg('aa12');
            const inner = carry.children[0];
            inner.updateMatrix();
            if (view === 'rack') {
              const rack = T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
              const subject = rack.children.find((o) => o.userData.rackKind === 'aa12');
              subject.updateWorldMatrix(true, false);
              const pivot = subject.getWorldPosition(new G.Vector3());
              const qRack = rack.getWorldQuaternion(new G.Quaternion());
              const dir = new G.Vector3(0.14, 0.05, 1.0).normalize().applyQuaternion(qRack);
              const eye = pivot.clone().addScaledVector(dir, 0.68);
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: pivot.x, ty: pivot.y - 0.02, tz: pivot.z, fov: 32 });
            } else {
              const gun = T.weaponMeshes.aa12;
              gun.updateWorldMatrix(true, false);
              const centre = inner.position.clone().negate().divide(inner.scale);
              const pivot = gun.localToWorld(centre.clone());
              const side = view === 'held-right' ? 1 : -1;
              const qGun = gun.getWorldQuaternion(new G.Quaternion());
              const offset = new G.Vector3(2.1 * side, 0.36, 0.44).normalize().applyQuaternion(qGun);
              const eye = pivot.clone().addScaledVector(offset, 0.66);
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: pivot.x, ty: pivot.y, tz: pivot.z, fov: 30 });
            }
          }
          window.__frozen = true;
          for (let i = 0; i < 4; i++) {
            H.render();
            await new Promise((r) => setTimeout(r, 25));
          }
        };
      })()`);

      const factoryViews = ['eye-hip', 'eye-ads', 'held-right', 'held-left', 'rack'];
      for (const view of factoryViews) {
        for (const light of LIGHTS) {
          await page.evaluate(`window.__setAa12Pose(${JSON.stringify(view)}, ${JSON.stringify(light)})`);
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
          const fname = `factory-${view}-${light}.jpg`;
          summary.shots[fname] = saveShot(fname, shot.data);
        }
      }

      // Apply M81 paint and verify masking across eye-hip, held-right, and rack in all 4 lights
      summary.m81PaintCheck = await page.evaluate(`(() => {
        window.__frozen = false;
        const ok = TT.armoryFinishDbg.paint('aa12', 'm81');
        TT.armoryDbg.refreshRack(true);
        for (let i = 0; i < 15; i++) TT.stepFrame(1 / 60);
        return { paintedM81: ok, finishNow: TT.getWardrobe()?.guns?.aa12 || null };
      })()`);

      for (const view of ['eye-hip', 'held-right', 'rack']) {
        for (const light of LIGHTS) {
          await page.evaluate(`window.__setAa12Pose(${JSON.stringify(view)}, ${JSON.stringify(light)})`);
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
          const fname = `m81-${view}-${light}.jpg`;
          summary.shots[fname] = saveShot(fname, shot.data);
        }
      }

      // Restore Factory and capture noon confirmation across eye-hip, held-right, rack
      const factoryRestore = await page.evaluate(`(() => {
        window.__frozen = false;
        const ok = TT.armoryFinishDbg.paint('aa12', 'factory');
        TT.armoryDbg.refreshRack(true);
        for (let i = 0; i < 15; i++) TT.stepFrame(1 / 60);
        return { restoredFactory: ok, finishNow: TT.getWardrobe()?.guns?.aa12 || 'factory' };
      })()`);
      summary.m81PaintCheck.factoryRestore = factoryRestore;

      for (const view of ['eye-hip', 'held-right', 'rack']) {
        await page.evaluate(`window.__setAa12Pose(${JSON.stringify(view)}, 'noon')`);
        const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
        const fname = `restored-${view}-noon.jpg`;
        summary.shots[fname] = saveShot(fname, shot.data);
      }

      summary.pageErrors.push(...(page.errors || []));
    } finally {
      await page.close().catch(() => {});
    }

    // Pass B: Standalone Marine Inspector (`?inspect&debug=1`) 4-light close-ups of `weapon.aa12`
    const ipage = await browser.newPage({ width: 1280, height: 720 });
    try {
      await moveOffscreen(ipage);
      await ipage.goto(`${server.origin}/index.html?inspect&debug=1`, { timeout: 180000 });
      await moveOffscreen(ipage);
      assert(await ipage.waitFor(
        'window.DWInspect?.ready && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
        { timeout: 90000 }
      ));
      await ipage.evaluate(`DWInspect.show('weapon.aa12', { instant: true })`);
      for (const [view, light] of [['side', 'noon'], ['three', 'overcast'], ['rear3', 'dusk'], ['three', 'night']]) {
        const dataUrl = await ipage.evaluate(`(async () => {
          await DWInspect.light(${JSON.stringify(light)});
          DWInspect.view(${JSON.stringify(view)}, { instant: true });
          await DWInspect.stepAsync(3);
          return DWInspect.shot({ type: 'image/jpeg', quality: 0.92 });
        })()`);
        const fname = `inspector-aa12-${view}-${light}.jpg`;
        summary.inspectorShots[fname] = saveShot(fname, dataUrl.split(',')[1]);
      }
      summary.pageErrors.push(...(ipage.errors || []));
    } finally {
      await ipage.close().catch(() => {});
    }

    const jsonStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-GT-20076-aa12/aa12-summary.json'), jsonStr);
    fs.writeFileSync(path.join(ROOT, 'review/GT-20076/gpu-aa12/aa12-summary.json'), jsonStr);
    assert.deepEqual(summary.pageErrors, [], 'Expected 0 pageErrors during Breacher GPU look');
    console.log('[GT-20076 aa12] Captured', Object.keys(summary.shots).length, 'live shots +', Object.keys(summary.inspectorShots).length, 'inspector shots, 0 errors.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
