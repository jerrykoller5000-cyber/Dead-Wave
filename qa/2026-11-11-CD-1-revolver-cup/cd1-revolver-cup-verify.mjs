// qa/2026-11-11-CD-1-revolver-cup/cd1-revolver-cup-verify.mjs
// RTX 5080 WebGPU 4-light verification & close-up inspection for Claude 1's CD-1 revolver support cup:
//   - 1P revolver (single, non-akimbo) at hip across 4 lights (noon, overcast, dusk, night+flashlight)
//   - 1P revolver aimed (ADS) across 4 lights (noon, overcast, dusk, night+flashlight)
//   - Support-cup close-ups from the eye (hip & aimed), from the left, from the front, and from below
//   - Exact eye-space clearance + sleeve/glove/gun triangle-intersection audit
//   - Browser kept 100% offscreen (-3800,-3800) while Jerry sleeps.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const vmSrc = fs.readFileSync(path.join(ROOT, 'game/viewmodel.js'), 'utf8');
assert(
  vmSrc.includes('VM_SUPPORT_ELBOW') || vmSrc.includes('supportElbow'),
  'game/viewmodel.js is missing VM_SUPPORT_ELBOW — wait for Claude 1 patch before capturing!'
);

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_REV = path.join(ROOT, 'review/CD-1-revolver-cup');
const OUT_SHOTS = path.join(OUT_REV, 'shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CD-1-revolver-cup/shots');
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

async function browserInitFn() {
  const T = window.TT, H = T.inspectHost(), G = T.THREE;
  if (H.training().warmPromise) await H.training().warmPromise;
  T.flightHold(true);
  for (let i = 0; i < 300 && H.training().wake; i++) T.stepFrame(0.05);
  for (let i = 0; i < 120; i++) T.stepFrame(0.05);

  const css = document.createElement('style');
  css.id = 'cd1-revolver-clean-hud';
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
        T.flashlight.position.set(H.camera.position.x + 0.05, H.camera.position.y + 0.05, H.camera.position.z);
        T.flashlight.target.position.set(window.__cd1ExtCam.look[0], window.__cd1ExtCam.look[1], window.__cd1ExtCam.look[2]);
        T.flashlight.target.updateMatrixWorld();
        T.flashlight.intensity = 1.65;
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

  window.__cd1PoseRevolver = (lightKey, ads) => {
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
    try { T.opticDbg?.clear?.('revolver'); } catch (_) {}
    try { T.armoryDbg?.fit?.('revolver', 'akimbo', false); } catch (_) {}

    const px = tg.origin.x + 0.0, pz = tg.origin.z - 2.2;
    H.placePlayer(px, pz, 0);
    H.player.position.set(px, tg.floorY, pz);
    H.player.rotation.y = 0;
    T.setAimYawDbg(0);
    T.setOtsAimDbg(0, 0.0);

    const revIdx = T.WEAPON_ORDER.indexOf('revolver');
    T.setWeapon(revIdx);
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
        H.camera.near = 0.006;
        H.camera.fov = extSpec.fov || 34;
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

  window.__cd1MeasureRevolverCup = () => {
    const vm = T.viewmodelDbg();
    vm.place();
    vm.root.updateMatrixWorld(true);
    H.scene.updateMatrixWorld(true);
    const invEye = H.camera.matrixWorld.clone().invert();

    const armL = vm.arms && vm.arms.l;
    const armR = vm.arms && vm.arms.r;
    const wristL = armL && armL.wrist;
    const wristR = armR && armR.wrist;

    const isDescendant = (node, anc) => {
      for (let p = node; p; p = p.parent) if (p === anc) return true;
      return false;
    };

    const collectGroup = (rootObj, filterFn) => {
      const tris = [];
      const boxEye = new G.Box3();
      const boxW = new G.Box3();
      const v0 = new G.Vector3(), v1 = new G.Vector3(), v2 = new G.Vector3(), ve = new G.Vector3();
      if (!rootObj) return { tris, boxEye, boxW };
      rootObj.traverse((o) => {
        if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return;
        if (filterFn && !filterFn(o)) return;
        const pos = o.geometry.attributes.position;
        const idx = o.geometry.index;
        const mw = o.matrixWorld;
        for (let i = 0; i < pos.count; i++) {
          v0.fromBufferAttribute(pos, i).applyMatrix4(mw);
          boxW.expandByPoint(v0);
          ve.copy(v0).applyMatrix4(invEye);
          boxEye.expandByPoint(ve);
        }
        const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
        for (let t = 0; t < triCount; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3;
          const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
          const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          v0.fromBufferAttribute(pos, i0).applyMatrix4(mw);
          v1.fromBufferAttribute(pos, i1).applyMatrix4(mw);
          v2.fromBufferAttribute(pos, i2).applyMatrix4(mw);
          tris.push({
            ax: v0.x, ay: v0.y, az: v0.z,
            bx: v1.x, by: v1.y, bz: v1.z,
            cx: v2.x, cy: v2.y, cz: v2.z,
            minX: Math.min(v0.x, v1.x, v2.x), maxX: Math.max(v0.x, v1.x, v2.x),
            minY: Math.min(v0.y, v1.y, v2.y), maxY: Math.max(v0.y, v1.y, v2.y),
            minZ: Math.min(v0.z, v1.z, v2.z), maxZ: Math.max(v0.z, v1.z, v2.z),
            part: o.name || 'mesh'
          });
        }
      });
      return { tris, boxEye, boxW };
    };

    const leftGlove = collectGroup(wristL, null);
    const rightGlove = collectGroup(wristR, null);
    const leftSleeve = collectGroup(armL?.root, (o) => !isDescendant(o, wristL));
    const rightSleeve = collectGroup(armR?.root, (o) => !isDescendant(o, wristR));
    const gunData = collectGroup(vm.gun?.root, null);

    // Count exact segment-triangle crossings between group A's triangle edges and group B's triangles
    const segCrossesGroup = (grpA, grpB) => {
      if (!grpA.tris.length || !grpB.tris.length || !grpA.boxW.intersectsBox(grpB.boxW)) {
        return { edgeCrossings: 0, sampleParts: [] };
      }
      let hits = 0;
      const parts = new Set();
      const testSegTri = (p0x, p0y, p0z, p1x, p1y, p1z, tr) => {
        const sMinX = Math.min(p0x, p1x), sMaxX = Math.max(p0x, p1x);
        if (sMaxX < tr.minX || sMinX > tr.maxX) return false;
        const sMinY = Math.min(p0y, p1y), sMaxY = Math.max(p0y, p1y);
        if (sMaxY < tr.minY || sMinY > tr.maxY) return false;
        const sMinZ = Math.min(p0z, p1z), sMaxZ = Math.max(p0z, p1z);
        if (sMaxZ < tr.minZ || sMinZ > tr.maxZ) return false;

        const dx = p1x - p0x, dy = p1y - p0y, dz = p1z - p0z;
        const e1x = tr.bx - tr.ax, e1y = tr.by - tr.ay, e1z = tr.bz - tr.az;
        const e2x = tr.cx - tr.ax, e2y = tr.cy - tr.ay, e2z = tr.cz - tr.az;
        const hx = dy * e2z - dz * e2y;
        const hy = dz * e2x - dx * e2z;
        const hz = dx * e2y - dy * e2x;
        const det = e1x * hx + e1y * hy + e1z * hz;
        if (det > -1e-9 && det < 1e-9) return false;
        const invDet = 1 / det;
        const sx = p0x - tr.ax, sy = p0y - tr.ay, sz = p0z - tr.az;
        const u = invDet * (sx * hx + sy * hy + sz * hz);
        if (u < 0.02 || u > 0.98) return false;
        const qx = sy * e1z - sz * e1y;
        const qy = sz * e1x - sx * e1z;
        const qz = sx * e1y - sy * e1x;
        const v = invDet * (dx * qx + dy * qy + dz * qz);
        if (v < 0.02 || u + v > 0.98) return false;
        const t = invDet * (e2x * qx + e2y * qy + e2z * qz);
        return t > 0.02 && t < 0.98;
      };

      const bTris = grpB.tris;
      for (let i = 0; i < grpA.tris.length; i++) {
        const a = grpA.tris[i];
        for (let j = 0; j < bTris.length; j++) {
          const b = bTris[j];
          if (
            testSegTri(a.ax, a.ay, a.az, a.bx, a.by, a.bz, b) ||
            testSegTri(a.bx, a.by, a.bz, a.cx, a.cy, a.cz, b) ||
            testSegTri(a.cx, a.cy, a.cz, a.ax, a.ay, a.az, b)
          ) {
            hits++;
            if (parts.size < 6) parts.add(`${a.part}<->${b.part}`);
          }
        }
      }
      return { edgeCrossings: hits, sampleParts: [...parts] };
    };

    const gripBoxW = new G.Box3();
    gripBoxW.union(leftGlove.boxW);
    gripBoxW.union(rightGlove.boxW);
    const gripCenterW = new G.Vector3();
    gripBoxW.getCenter(gripCenterW);

    const wristLW = new G.Vector3(), elbowLW = new G.Vector3();
    if (wristL) wristL.getWorldPosition(wristLW);
    if (armL?.root) armL.root.getWorldPosition(elbowLW);
    const wristLEye = wristLW.clone().applyMatrix4(invEye);
    const elbowLEye = elbowLW.clone().applyMatrix4(invEye);

    const camRight = new G.Vector3(1, 0, 0).applyQuaternion(H.camera.quaternion).normalize();
    const camUp = new G.Vector3(0, 1, 0).applyQuaternion(H.camera.quaternion).normalize();
    const camFwd = new G.Vector3(0, 0, -1).applyQuaternion(H.camera.quaternion).normalize();

    const leftAllEyeMaxY = Math.max(leftGlove.boxEye.max.y, leftSleeve.boxEye.max.y);

    return {
      akimbo: !!vm.info?.akimbo,
      eyePos: [+H.camera.position.x.toFixed(4), +H.camera.position.y.toFixed(4), +H.camera.position.z.toFixed(4)],
      gripCenterW: [+gripCenterW.x.toFixed(4), +gripCenterW.y.toFixed(4), +gripCenterW.z.toFixed(4)],
      camRight: [camRight.x, camRight.y, camRight.z],
      camUp: [camUp.x, camUp.y, camUp.z],
      camFwd: [camFwd.x, camFwd.y, camFwd.z],
      wristLEye: [+wristLEye.x.toFixed(4), +wristLEye.y.toFixed(4), +wristLEye.z.toFixed(4)],
      elbowLEye: [+elbowLEye.x.toFixed(4), +elbowLEye.y.toFixed(4), +elbowLEye.z.toFixed(4)],
      elbowOffsetFromWristEye: [
        +(elbowLEye.x - wristLEye.x).toFixed(4),
        +(elbowLEye.y - wristLEye.y).toFixed(4),
        +(elbowLEye.z - wristLEye.z).toFixed(4)
      ],
      leftGloveEyeY: [+leftGlove.boxEye.min.y.toFixed(4), +leftGlove.boxEye.max.y.toFixed(4)],
      rightGloveEyeY: [+rightGlove.boxEye.min.y.toFixed(4), +rightGlove.boxEye.max.y.toFixed(4)],
      gunEyeY: [+gunData.boxEye.min.y.toFixed(4), +gunData.boxEye.max.y.toFixed(4)],
      belowSightLineByMeters: +(0 - leftAllEyeMaxY).toFixed(4),
      crossings: {
        leftGlove_vs_rightGlove: segCrossesGroup(leftGlove, rightGlove),
        leftGlove_vs_gun: segCrossesGroup(leftGlove, gunData),
        leftSleeve_vs_rightSleeve: segCrossesGroup(leftSleeve, rightSleeve),
        leftSleeve_vs_rightGlove: segCrossesGroup(leftSleeve, rightGlove),
        leftSleeve_vs_gun: segCrossesGroup(leftSleeve, gunData),
        rightSleeve_vs_leftGlove: segCrossesGroup(rightSleeve, leftGlove),
        rightSleeve_vs_gun: segCrossesGroup(rightSleeve, gunData)
      }
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
    card: 'CD-1-revolver-cup',
    capturedAt: new Date().toISOString(),
    backend: null,
    metrics: {},
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
        document.getElementById('playerName').value = 'CD1REV';
        window.TT.inspectHost().enterTraining();
      })()`);
      assert(await page.waitFor('TT.trainingDbg && TT.trainingDbg.state().active && !TT.trainingDbg.blackout()', { timeout: 60000 }));
      await moveOffscreen(page);

      summary.backend = await page.evaluate(`(${browserInitFn.toString()})()`);

      // 1. Capture Hip across 4 lights + measure hip cup & intersections
      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__cd1PoseRevolver(${JSON.stringify(lk)}, false)`);
        if (lk === 'noon') {
          summary.metrics.hip = await page.evaluate('window.__cd1MeasureRevolverCup()');
          assert.equal(summary.metrics.hip.akimbo, false, 'Expected single revolver, not akimbo');
        }
        const raw = await page.evaluate('window.__cd1Capture(null)');
        summary.shots[`hip-${lk}`] = saveJpg(`revolver-hip-${lk}.jpg`, raw);
      }

      // 2. Capture Aimed (ADS) across 4 lights + measure aimed cup & intersections
      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__cd1PoseRevolver(${JSON.stringify(lk)}, true)`);
        if (lk === 'noon') {
          summary.metrics.aimed = await page.evaluate('window.__cd1MeasureRevolverCup()');
        }
        const raw = await page.evaluate('window.__cd1Capture(null)');
        summary.shots[`aimed-${lk}`] = saveJpg(`revolver-aimed-${lk}.jpg`, raw);
      }

      // 3. Close-ups in Noon (eye-hip, eye-aimed, left, front, below)
      await page.evaluate(`window.__cd1PoseRevolver("noon", false)`);
      const mHip = await page.evaluate('window.__cd1MeasureRevolverCup()');
      const gc = mHip.gripCenterW;
      const R = mHip.camRight, U = mHip.camUp, F = mHip.camFwd;
      const offsetPt = (dr, du, df, base = gc) => [
        base[0] + R[0] * dr + U[0] * du + F[0] * df,
        base[1] + R[1] * dr + U[1] * du + F[1] * df,
        base[2] + R[2] * dr + U[2] * du + F[2] * df
      ];

      // 3a. Close from the eye (hip): exact eye position, tight FOV onto cupped grip + forearm below
      const closeEyeHip = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 28,
        pos: mHip.eyePos,
        look: offsetPt(0.005, 0.015, 0.00),
        fill: false
      })})`);
      summary.shots['close-eye-hip'] = saveJpg('revolver-close-eye-hip.jpg', closeEyeHip);

      // 3b. Close from the left: left support hand cupping under/round firing fingers + sleeve from below
      const closeLeft = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 30,
        pos: offsetPt(-0.22, 0.00, 0.02),
        look: offsetPt(0.00, 0.01, 0.00),
        fill: true
      })})`);
      summary.shots['close-left'] = saveJpg('revolver-close-left.jpg', closeLeft);

      // 3c. Close from the front: support fingers wrapped round firing fingers, sleeves cleanly separated
      const closeFront = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 30,
        pos: offsetPt(-0.02, -0.02, 0.22),
        look: offsetPt(0.00, 0.00, -0.01),
        fill: true
      })})`);
      summary.shots['close-front'] = saveJpg('revolver-close-front.jpg', closeFront);

      // 3d. Close from below: support palm/fingers cupping under firing fingers & grip butt
      const closeBelow = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 32,
        pos: offsetPt(-0.01, -0.22, 0.01),
        look: offsetPt(0.00, 0.02, 0.00),
        up: F,
        fill: true
      })})`);
      summary.shots['close-below'] = saveJpg('revolver-close-below.jpg', closeBelow);

      // 3e. Close from the eye when AIMED: unobstructed revolver sights + cupped hands below cylinder
      await page.evaluate(`window.__cd1PoseRevolver("noon", true)`);
      const mAim = await page.evaluate('window.__cd1MeasureRevolverCup()');
      const closeEyeAim = await page.evaluate(`window.__cd1Capture(${JSON.stringify({
        fov: 28,
        pos: mAim.eyePos,
        look: [
          mAim.eyePos[0] + mAim.camFwd[0] * 0.50 + mAim.camUp[0] * (-0.03),
          mAim.eyePos[1] + mAim.camFwd[1] * 0.50 + mAim.camUp[1] * (-0.03),
          mAim.eyePos[2] + mAim.camFwd[2] * 0.50 + mAim.camUp[2] * (-0.03)
        ],
        fill: false
      })})`);
      summary.shots['close-eye-aimed'] = saveJpg('revolver-close-eye-aimed.jpg', closeEyeAim);

      assert.equal(summary.pageErrors.length, 0, `Page errors: ${summary.pageErrors.join('; ')}`);
      assert.equal(summary.gpuWarnings.length, 0, `GPU warnings: ${summary.gpuWarnings.join('; ')}`);

      const sumPath = path.join(OUT_REV, 'cd1-revolver-summary.json');
      writeSafe(sumPath, Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));
      console.log(JSON.stringify({
        ok: true,
        backend: summary.backend,
        metrics: summary.metrics,
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
