// qa/2026-11-11-CD-1-gw4-thumb/cd1-gw4-thumb-verify.mjs
// RTX 5080 WebGPU 4-light verification & close-up inspection for Claude 1's CD-1 GW-4 (`m4`) support hand:
//   - 1P GW-4 at hip across 4 lights (noon, overcast, dusk, night+flashlight)
//   - 1P GW-4 aimed (ADS) across 4 lights (noon, overcast, dusk, night+flashlight)
//   - Support-hand close-ups from the eye (hip & aimed), from the left, from below, and from front-quarter
//   - Exact eye-space clearance metrics for thumb & left forearm vs barrel & sight line
//   - Browser kept 100% offscreen (-3800,-3800) while Jerry sleeps.

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

const OUT_REV = path.join(ROOT, 'review/CD-1-gw4-thumb');
const OUT_SHOTS = path.join(OUT_REV, 'shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CD-1-gw4-thumb/shots');
fs.mkdirSync(OUT_SHOTS, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

const LIGHT_KEYS = ['noon', 'overcast', 'dusk', 'night'];

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

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

function saveJpg(name, shotObj) {
  const buf = Buffer.from(shotObj.b64, 'base64');
  assert(buf.length > 10000, `Shot ${name} too small (${buf.length})`);
  writeSafe(path.join(OUT_SHOTS, name), buf);
  try { writeSafe(path.join(OUT_QA, name), buf); } catch (_) {}
  return { name, bytes: buf.length, lumaMean: shotObj.lumaMean, lumaStd: shotObj.lumaStd };
}

function browserInitFn() {
  const T = window.TT, H = T.inspectHost(), G = T.THREE;
  for (let i = 0; i < 300 && H.training().wake; i++) T.stepFrame(0.05);
  for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);

  const css = document.createElement('style');
  css.id = 'cd1-clean-hud';
  css.textContent = '#menu,#title,#hud,#interact,#perf,#trainingHud,#trainingPanel,#trainingBlackout{display:none!important;visibility:hidden!important}';
  document.head.appendChild(css);

  const LIGHTS = {
    noon:     { time: 0.42, sunCol: 0xfff5e2, sunInt: 2.35, hemiSky: 0x9ec5ef, hemiGnd: 0x5c584e, hemiInt: 0.92, amb: 0.42, fill: 0.28, bg: 0x9abde3, exp: 1.04 },
    overcast: { time: 0.30, sunCol: 0xd8e0ea, sunInt: 0.92, hemiSky: 0xaab7c7, hemiGnd: 0x55595f, hemiInt: 1.08, amb: 0.56, fill: 0.34, bg: 0x9ea8b4, exp: 1.02 },
    dusk:     { time: 0.72, sunCol: 0xff8d44, sunInt: 1.38, hemiSky: 0x7b6389, hemiGnd: 0x3b2f2a, hemiInt: 0.56, amb: 0.26, fill: 0.18, bg: 0x4b3d57, exp: 1.00 },
    night:    { time: 0.92, sunCol: 0x5b76a8, sunInt: 0.08, hemiSky: 0x1e2b45, hemiGnd: 0x10131a, hemiInt: 0.24, amb: 0.10, fill: 0.08, bg: 0x0b101b, exp: 1.05 }
  };

  window.__cd1Light = 'noon';
  window.__cd1Hold = false;
  window.__cd1ExtCam = null;

  const applyRig = () => {
    const key = window.__cd1Light;
    const L = LIGHTS[key];
    if (L) {
      H.renderer.toneMappingExposure = L.exp;
      H.scene.background = new G.Color(L.bg);
      if (H.scene.fog) H.scene.fog.color.setHex(L.bg);
      H.sun.color.setHex(L.sunCol);
      H.sun.intensity = L.sunInt;
      H.hemi.color.setHex(L.hemiSky);
      H.hemi.groundColor.setHex(L.hemiGnd);
      H.hemi.intensity = L.hemiInt;
      if (H.ambient) H.ambient.intensity = L.amb;
      if (H.ambientFill) H.ambientFill.intensity = L.fill;
      H.moon.intensity = key === 'night' ? 0.20 : 0;
    }
    if (T.flashlight) {
      if (key === 'night') {
        T.flashlight.visible = true;
        T.flashlight.angle = 0.55;
        T.flashlight.penumbra = 0.80;
        T.flashlight.intensity = 7.5;
      } else if (window.__cd1ExtCam) {
        T.flashlight.visible = true;
        T.flashlight.angle = 0.95;
        T.flashlight.penumbra = 0.95;
        T.flashlight.position.set(H.camera.position.x + 0.06, H.camera.position.y + 0.06, H.camera.position.z);
        T.flashlight.target.position.set(window.__cd1ExtCam.look[0], window.__cd1ExtCam.look[1], window.__cd1ExtCam.look[2]);
        T.flashlight.target.updateMatrixWorld();
        T.flashlight.intensity = 1.75;
      } else {
        T.flashlight.intensity = 0;
      }
    }
  };

  H.attach({
    held: () => window.__cd1Hold,
    scale: (dt) => dt,
    frame: applyRig
  });

  window.__cd1PoseGw4 = (lightKey, ads) => {
    window.__cd1Light = lightKey;
    window.__cd1ExtCam = null;
    window.__cd1Hold = false;
    const tg = T.trainingDbg.tg();
    if (tg && typeof tg.lightsOn === 'function' && typeof tg.setLights === 'function') {
      const wantRoom = lightKey !== 'night';
      if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
    }
    const flOn = !!(T.flashlight && T.flashlight.visible && T.flashlight.intensity > 0.01);
    if (lightKey === 'night' && !flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();
    if (lightKey !== 'night' && flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();

    T.setShotView(null);
    T.setViewFirstDbg(true);
    T.setUnarmedDbg(false);
    T.grantAllWeapons();
    try { T.opticDbg?.clear?.('m4'); } catch (_) {}
    try { T.armoryDbg?.fit?.('m4', 'suppressor', false); } catch (_) {}

    const px = tg.origin.x + 0.0, pz = tg.origin.z + 1.2;
    H.placePlayer(px, pz, Math.PI);
    H.player.position.set(px, tg.floorY, pz);
    H.player.rotation.y = Math.PI;
    T.setAimYawDbg(Math.PI);
    T.setOtsAimDbg(Math.PI, 0.0);

    const m4Idx = T.WEAPON_ORDER.indexOf('m4');
    T.setWeapon(m4Idx);
    T.setMouseFireDbg(false);
    T.setZoomHeldDbg(!!ads);
    for (let i = 0; i < 85; i++) T.stepFrame(1 / 60);
    window.__cd1Hold = true;
  };

  const cap = document.createElement('canvas');
  window.__cd1Capture = async (extSpec = null) => {
    const vm = T.viewmodelDbg();
    const origPlace = vm.place;
    const origFov = H.camera.fov;
    const origNear = H.camera.near;
    const origPos = H.camera.position.clone();
    const origQuat = H.camera.quaternion.clone();

    try {
      if (extSpec) {
        vm.place();
        vm.root.updateMatrixWorld(true);
        vm.place = () => {};
        H.camera.near = 0.008;
        H.camera.fov = extSpec.fov || 38;
        H.camera.updateProjectionMatrix();
        H.camera.position.set(extSpec.pos[0], extSpec.pos[1], extSpec.pos[2]);
        if (extSpec.up) H.camera.up.set(extSpec.up[0], extSpec.up[1], extSpec.up[2]);
        H.camera.lookAt(extSpec.look[0], extSpec.look[1], extSpec.look[2]);
        H.camera.updateMatrixWorld(true);
        window.__cd1ExtCam = extSpec.fill ? extSpec : null;
      }
      await new Promise((r) => setTimeout(r, 0));
      applyRig();
      H.render();

      const src = H.renderer.domElement;
      cap.width = src.width;
      cap.height = src.height;
      const ctx = cap.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, cap.width, cap.height).data;
      let s1 = 0, s2 = 0, n = 0;
      for (let i = 0; i < img.length; i += 64) {
        const y = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        s1 += y; s2 += y * y; n++;
      }
      const mean = s1 / n;
      const std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
      return {
        b64: cap.toDataURL('image/jpeg', 0.94).split(',')[1],
        lumaMean: +mean.toFixed(2),
        lumaStd: +std.toFixed(2)
      };
    } finally {
      window.__cd1ExtCam = null;
      vm.place = origPlace;
      H.camera.up.set(0, 1, 0);
      H.camera.near = origNear;
      H.camera.fov = origFov;
      H.camera.position.copy(origPos);
      H.camera.quaternion.copy(origQuat);
      H.camera.updateProjectionMatrix();
      H.camera.updateMatrixWorld(true);
    }
  };

  window.__cd1MeasureSupportHand = () => {
    const vm = T.viewmodelDbg();
    vm.place();
    vm.root.updateMatrixWorld(true);
    H.scene.updateMatrixWorld(true);
    const invEye = H.camera.matrixWorld.clone().invert();

    const armL = vm.arms && vm.arms.l;
    const wristObj = armL && armL.wrist;
    const armRootObj = armL && armL.root;

    const wristW = new G.Vector3();
    if (wristObj) wristObj.getWorldPosition(wristW);
    const wristEye = wristW.clone().applyMatrix4(invEye);

    const leftBoxEye = new G.Box3();
    const handOnlyEye = new G.Box3();
    const gunBoxEye = new G.Box3();
    const v = new G.Vector3();

    if (wristObj) {
      wristObj.traverse((o) => {
        if (o.isMesh && o.visible && o.geometry?.attributes?.position) {
          const pos = o.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(invEye);
            handOnlyEye.expandByPoint(v);
            leftBoxEye.expandByPoint(v);
          }
        }
      });
    }
    if (armRootObj) {
      armRootObj.traverse((o) => {
        if (o.isMesh && o.visible && o.geometry?.attributes?.position) {
          const pos = o.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(invEye);
            leftBoxEye.expandByPoint(v);
          }
        }
      });
    }
    if (vm.gun && vm.gun.root) {
      vm.gun.root.traverse((o) => {
        if (o.isMesh && o.visible && o.geometry?.attributes?.position) {
          const pos = o.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(invEye);
            gunBoxEye.expandByPoint(v);
          }
        }
      });
    }

    const muzzleW = new G.Vector3();
    vm.muzzleWorld(muzzleW);
    const muzzleEye = muzzleW.clone().applyMatrix4(invEye);

    const handBoxW = new G.Box3();
    if (wristObj) {
      wristObj.traverse((o) => {
        if (o.isMesh && o.visible) handBoxW.expandByObject(o);
      });
    }
    const handCenterW = new G.Vector3();
    handBoxW.getCenter(handCenterW);

    const camRight = new G.Vector3(1, 0, 0).applyQuaternion(H.camera.quaternion).normalize();
    const camUp = new G.Vector3(0, 1, 0).applyQuaternion(H.camera.quaternion).normalize();
    const camFwd = new G.Vector3(0, 0, -1).applyQuaternion(H.camera.quaternion).normalize();

    return {
      eyePos: [+H.camera.position.x.toFixed(4), +H.camera.position.y.toFixed(4), +H.camera.position.z.toFixed(4)],
      handCenterW: [+handCenterW.x.toFixed(4), +handCenterW.y.toFixed(4), +handCenterW.z.toFixed(4)],
      camRight: [camRight.x, camRight.y, camRight.z],
      camUp: [camUp.x, camUp.y, camUp.z],
      camFwd: [camFwd.x, camFwd.y, camFwd.z],
      wristEye: [+wristEye.x.toFixed(4), +wristEye.y.toFixed(4), +wristEye.z.toFixed(4)],
      muzzleEye: [+muzzleEye.x.toFixed(4), +muzzleEye.y.toFixed(4), +muzzleEye.z.toFixed(4)],
      handMaxYInEye: +handOnlyEye.max.y.toFixed(4),
      leftArmMaxYInEye: +leftBoxEye.max.y.toFixed(4),
      leftArmMinYInEye: +leftBoxEye.min.y.toFixed(4),
      gunTopYInEye: +gunBoxEye.max.y.toFixed(4),
      gunBottomYInEye: +gunBoxEye.min.y.toFixed(4),
      leftArmXRangeInEye: [+leftBoxEye.min.x.toFixed(4), +leftBoxEye.max.x.toFixed(4)],
      belowSightLineByMeters: +(0 - leftBoxEye.max.y).toFixed(4),
      belowGunTopByMeters: +(gunBoxEye.max.y - leftBoxEye.max.y).toFixed(4)
    };
  };

  return T.renderer?.backend?.constructor?.name || 'unknown';
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
    card: 'CD-1-gw4-thumb',
    capturedAt: new Date().toISOString(),
    backend: null,
    clearances: {},
    shots: {},
    pageErrors: [],
    gpuWarnings: []
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    page.on?.('console', (msg) => {
      const txt = typeof msg?.text === 'function' ? msg.text() : String(msg || '');
      if (/validation|dawn.*error|pipeline.*error/i.test(txt)) summary.gpuWarnings.push(txt);
    });
    page.on?.('pageerror', (err) => {
      summary.pageErrors.push(String(err?.message || err));
    });

    try {
      await moveOffscreen(page);
      await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
      await moveOffscreen(page);
      assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
      await page.evaluate('DWOpening.dismissForTesting()');
      assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'CD1GW4';
        window.TT.inspectHost().enterTraining();
      })()`);
      assert(await page.waitFor('TT.trainingDbg && TT.trainingDbg.state().active && !TT.trainingDbg.blackout()', { timeout: 60000 }));
      await moveOffscreen(page);

      summary.backend = await page.evaluate(`(${browserInitFn.toString()})()`);

      // 1. Capture Hip across 4 lights + measure hip clearances
      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__cd1PoseGw4(${JSON.stringify(lk)}, false)`);
        if (lk === 'noon') {
          summary.clearances.hip = await page.evaluate('window.__cd1MeasureSupportHand()');
        }
        const raw = await page.evaluate('window.__cd1Capture(null)');
        summary.shots[`hip-${lk}`] = saveJpg(`gw4-hip-${lk}.jpg`, raw);
      }

      // 2. Capture Aimed (ADS) across 4 lights + measure aimed clearances
      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__cd1PoseGw4(${JSON.stringify(lk)}, true)`);
        if (lk === 'noon') {
          summary.clearances.aimed = await page.evaluate('window.__cd1MeasureSupportHand()');
        }
        const raw = await page.evaluate('window.__cd1Capture(null)');
        summary.shots[`aimed-${lk}`] = saveJpg(`gw4-aimed-${lk}.jpg`, raw);
      }

      // 3. Support-hand close-ups in Noon (at Hip: eye-close, left, below, front-quarter; and at Aim: eye-close-aimed)
      await page.evaluate(`window.__cd1PoseGw4("noon", false)`);
      const mHip = await page.evaluate('window.__cd1MeasureSupportHand()');
      const hc = mHip.handCenterW;
      const R = mHip.camRight, U = mHip.camUp, F = mHip.camFwd;
      const offsetPt = (dr, du, df, base = hc) => [
        base[0] + R[0] * dr + U[0] * du + F[0] * df,
        base[1] + R[1] * dr + U[1] * du + F[1] * df,
        base[2] + R[2] * dr + U[2] * du + F[2] * df
      ];

      // 3a. Close from the eye (hip): exact eye position, tight FOV looking at support hand & lower-left thumb + forearm
      const closeEyeHip = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 30,
        pos: mHip.eyePos,
        look: offsetPt(0.015, 0.010, -0.02),
        fill: false
      })})`);
      summary.shots['close-eye-hip'] = saveJpg('gw4-close-eye-hip.jpg', closeEyeHip);

      // 3b. Close from the left (side profile of handguard: thumb straight forward along lower-left rail, forearm below gun!)
      const closeLeft = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 34,
        pos: offsetPt(-0.24, 0.015, -0.02),
        look: offsetPt(0.01, 0.015, 0.01),
        fill: true
      })})`);
      summary.shots['close-left'] = saveJpg('gw4-close-left.jpg', closeLeft);

      // 3c. Close from below (palm under handguard, thumb straight forward along lower-left, fingers wrapping up right!)
      const closeBelow = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 38,
        pos: offsetPt(-0.03, -0.22, -0.04),
        look: offsetPt(0.01, 0.02, 0.02),
        up: F,
        fill: true
      })})`);
      summary.shots['close-below'] = saveJpg('gw4-close-below.jpg', closeBelow);

      // 3d. Close from front-left-below (showing both the forward thumb on left rail AND fingers curled up right side!)
      const closeFront = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 36,
        pos: offsetPt(-0.05, -0.04, 0.24),
        look: offsetPt(0.00, 0.01, -0.01),
        fill: true
      })})`);
      summary.shots['close-front'] = saveJpg('gw4-close-front.jpg', closeFront);

      // 3e. Close from the eye when AIMED (verifying sight-line clearance at ADS!)
      await page.evaluate(`window.__cd1PoseGw4("noon", true)`);
      const mAim = await page.evaluate('window.__cd1MeasureSupportHand()');
      const closeEyeAim = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 28,
        pos: mAim.eyePos,
        look: [
          mAim.eyePos[0] + mAim.camFwd[0] * 0.55 + mAim.camUp[0] * (-0.025),
          mAim.eyePos[1] + mAim.camFwd[1] * 0.55 + mAim.camUp[1] * (-0.025),
          mAim.eyePos[2] + mAim.camFwd[2] * 0.55 + mAim.camUp[2] * (-0.025)
        ],
        fill: false
      })})`);
      summary.shots['close-eye-aimed'] = saveJpg('gw4-close-eye-aimed.jpg', closeEyeAim);

      assert.equal(summary.pageErrors.length, 0, `Page errors: ${summary.pageErrors.join('; ')}`);
      assert.equal(summary.gpuWarnings.length, 0, `GPU warnings: ${summary.gpuWarnings.join('; ')}`);

      const sumPath = path.join(OUT_REV, 'cd1-gw4-summary.json');
      writeSafe(sumPath, Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));
      console.log(JSON.stringify({
        ok: true,
        backend: summary.backend,
        clearances: summary.clearances,
        shotCount: Object.keys(summary.shots).length
      }, null, 2));
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
