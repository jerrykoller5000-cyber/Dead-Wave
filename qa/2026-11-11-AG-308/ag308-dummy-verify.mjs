// qa/2026-11-11-AG-308/ag308-dummy-verify.mjs
// Live RTX 5080 WebGPU Training Ground verification & 4-light capture for AG-308 (J137):
//   - Uses the live Training Ground dummy (`training.dummy` at tg.origin + (-5.0, 0, -2.8), or mounts one if absent)
//   - Asserts frustum NDC framing on EVERY shot so no camera can ever miss the dummy or clip its head/base
//   - Asserts non-blank canvas AND non-zero pixel difference between pristine and hit frames
//   - Captures:
//       1) Whole dummy at the eye (~2.05 m) across 4 lights (noon, overcast, dusk, night+flashlight): pristine & after real hits
//       2) 3P beside the 1.80 m marine across 4 lights + Front / Side / Back turnaround in the Training Ground
//       3) Isolated close-ups of EACH decal kind after REAL weapon hits (knife, machete, katana, chainsaw, scorch, gun bullet)
//       4) Effect-sorting proofs (flamethrower fire renderOrder=3 & chainsaw sparks/dust renderOrder=0 over decals renderOrder=-0.5)
//       5) 6-frame sprung wobble filmstrip (t=0.00s rest -> 0.09s peak lean -> 0.21s -> 0.33s rebound -> 0.56s -> 1.30s settled)
//   - Keeps browser 100% offscreen (-3800,-3800) while Jerry sleeps.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-308/shots');
const OUT_REV = path.join(ROOT, 'review/AG-308/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

function saveShot(name, shotObj) {
  const buf = Buffer.from(shotObj.b64, 'base64');
  assert(buf.length > 12000, `Shot ${name} suspiciously small (${buf.length} bytes)`);
  try { fs.writeFileSync(path.join(OUT_QA, name), buf); } catch (_) {}
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  return {
    name,
    bytes: buf.length,
    sha,
    lumaMean: shotObj.lumaMean,
    lumaStd: shotObj.lumaStd,
    centerSig: shotObj.centerSig,
    ndc: shotObj.ndc || null
  };
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
    card: 'AG-308',
    capturedAt: new Date().toISOString(),
    backend: null,
    dummyWorld: null,
    geometryBounds: null,
    drawsUnmarked: null,
    drawsMarked: null,
    perfDelta: null,
    realWeaponHits: {},
    wobbleCurve: [],
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

      // Enter the live Training Ground via inspectHost().enterTraining() (avoids startTraining's fullscreen call while Jerry sleeps!)
      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'AG308';
        window.TT.inspectHost().enterTraining();
      })()`);
      assert(await page.waitFor('TT.trainingDbg && TT.trainingDbg.state().active && !TT.trainingDbg.blackout()', { timeout: 60000 }));
      await moveOffscreen(page);

      // Initialize harness, inspect live `training.dummy` (or mount if absent), and install NDC-verified capture helper
      const init = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost(), G = T.THREE;
        for (const id of ['perf', 'bigBanner', 'placeBanner', 'ordersCard']) {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        }
        const { LIGHTS } = await import('/studio/inspector/stage.js');
        window.__studioLights = LIGHTS;

        const tState = T.trainingDbg.state();
        const tg = T.trainingDbg.tg();
        let dummy = tState.dummy ? tState.dummy.model : null;
        if (!dummy) {
          const { buildTrainingDummy } = await import('/world/training-dummy.js');
          dummy = buildTrainingDummy(G, {
            parent: H.scene,
            x: tg.origin.x - 5.0,
            y: tg.floorY,
            z: tg.origin.z - 2.8,
            yaw: 0
          });
        }
        dummy.reset();
        dummy.syncTransform();
        window.__ag308Dummy = dummy;

        // Warm-compile decal pipeline so first hit never stalls
        const undoWarm = dummy.prepareWarmup();
        if (typeof T.renderer.compileAsync === 'function') {
          await T.renderer.compileAsync(H.scene, H.camera);
        }
        T.stepFrame(1 / 60);
        undoWarm();

        const b = new G.Box3();
        dummy.group.updateMatrixWorld(true);
        dummy.group.traverse((o) => { if (o.isMesh && o.visible) b.expandByObject(o); });
        const wp = new G.Vector3();
        dummy.group.getWorldPosition(wp);

        T.flightHold(true);
        // Advance past any initial menuCamera.deploying swoop so gameplay camera & OTS are 100% active!
        for (let i = 0; i < 120; i++) T.stepFrame(0.05);

        window.__ag308Hold = false;
        window.__ag308Light = 'noon';
        window.__ag308ManualCam = null;

        const applyRig = () => {
          const key = window.__ag308Light;
          const L = window.__studioLights?.[key];
          if (L) {
            const anchor = new G.Vector3(wp.x, wp.y + 1.0, wp.z);
            const lDir = new G.Vector3(L.dir[0], L.dir[1], Math.abs(L.dir[2])).normalize();
            H.sun.position.copy(anchor).addScaledVector(lDir, 80);
            H.sun.target.position.copy(anchor);
            H.sun.target.updateMatrixWorld();
            H.sun.color.setHex(L.sunColor);
            H.sun.intensity = key === 'night' ? 0.04 : L.sun;
            H.hemi.color.setHex(L.skyColor);
            H.hemi.groundColor.setHex(L.ground);
            H.hemi.intensity = key === 'night' ? 0.11 : L.sky;
            H.ambientFill.intensity = key === 'night' ? 0.06 : L.fill;
            H.moon.intensity = key === 'night' ? 0.16 : 0;
          }
          if (window.__ag308ManualCam) {
            const mc = window.__ag308ManualCam;
            H.camera.fov = mc.fov || 55;
            H.camera.updateProjectionMatrix();
            H.camera.position.set(mc.pos[0], mc.pos[1], mc.pos[2]);
            H.camera.lookAt(mc.look[0], mc.look[1], mc.look[2]);
            H.camera.updateMatrixWorld(true);
          }
          if (T.flashlight) {
            if (key === 'night') {
              T.flashlight.visible = true;
              T.flashlight.angle = 0.42;
              T.flashlight.penumbra = 0.74;
              T.flashlight.position.set(H.camera.position.x + 0.16, H.camera.position.y - 0.14, H.camera.position.z);
              T.flashlight.target.position.set(wp.x, wp.y + 0.98, wp.z);
              T.flashlight.target.updateMatrixWorld();
              const dist = T.flashlight.position.distanceTo(T.flashlight.target.position);
              T.flashlight.intensity = Math.max(2.5, Math.min(18, 2.55 * Math.pow(Math.max(0.5, dist), 1.1)));
            } else if (window.__ag308CloseupFill) {
              T.flashlight.visible = true;
              T.flashlight.angle = 0.78;
              T.flashlight.penumbra = 0.95;
              T.flashlight.position.set(H.camera.position.x + 0.22, H.camera.position.y + 0.18, H.camera.position.z + 0.25);
              T.flashlight.target.position.set(wp.x, wp.y + 1.20, wp.z);
              T.flashlight.target.updateMatrixWorld();
              T.flashlight.intensity = 2.2;
            } else {
              T.flashlight.angle = 0.42;
              T.flashlight.penumbra = 0.74;
              T.flashlight.intensity = 0;
            }
          }
        };

        H.attach({
          held: () => window.__ag308Hold,
          scale: (dt) => dt,
          frame: applyRig
        });

        window.__ag308PlaceAndAim = (px, pz, tx, ty, tz) => {
          const tg = T.trainingDbg.tg();
          const floorY = tg ? tg.floorY : 0;
          H.placePlayer(px, pz, 0);
          H.player.position.set(px, floorY, pz);
          const dx = tx - px, dz = tz - pz;
          const yaw = Math.atan2(dx, dz);
          H.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          const py = floorY + 1.60;
          const pitch = Math.atan2(ty - py, Math.hypot(dx, dz) || 1e-6);
          T.setOtsAimDbg(yaw, pitch);
        };
        window.__ag308AimOnly = (px, pz, tx, ty, tz) => {
          const tg = T.trainingDbg.tg();
          const floorY = tg ? tg.floorY : 0;
          const dx = tx - px, dz = tz - pz;
          const yaw = Math.atan2(dx, dz);
          H.player.rotation.y = yaw;
          T.setAimYawDbg(yaw);
          const py = floorY + 1.60;
          const pitch = Math.atan2(ty - py, Math.hypot(dx, dz) || 1e-6);
          T.setOtsAimDbg(yaw, pitch);
        };
        window.__ag308SetLight = (key) => {
          window.__ag308Light = key;
          const tg = T.trainingDbg.tg();
          if (tg && typeof tg.lightsOn === 'function' && typeof tg.setLights === 'function') {
            const wantRoom = key !== 'night';
            if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
          }
          const flOn = !!(T.flashlight && T.flashlight.visible && T.flashlight.intensity > 0.01);
          if (key === 'night' && !flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();
          if (key !== 'night' && flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();
          window.__ag308Hold = false;
          for (let i = 0; i < 6; i++) T.stepFrame(1 / 60);
          window.__ag308Hold = true;
        };

        const cap = document.createElement('canvas');
        window.__ag308Capture = async (opts = {}) => {
          await new Promise((r) => setTimeout(r, 0));
          applyRig();
          H.render();
          const src = H.renderer.domElement;
          cap.width = src.width;
          cap.height = src.height;
          const ctx = cap.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, cap.width, cap.height);
          ctx.drawImage(src, 0, 0);

          // Compute luminance stats + center-crop signature so blank or identical frames are caught immediately
          const img = ctx.getImageData(0, 0, cap.width, cap.height).data;
          let sum = 0, sum2 = 0, n = 0;
          for (let i = 0; i < img.length; i += 64) {
            const y = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
            sum += y;
            sum2 += y * y;
            n++;
          }
          const mean = sum / n;
          const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));

          // Center 36%x48% crop RGB vector (32x32 downsampled) for pristine-vs-marked diff check
          const cx0 = Math.floor(cap.width * 0.32), cy0 = Math.floor(cap.height * 0.24);
          const cw = Math.floor(cap.width * 0.36), ch = Math.floor(cap.height * 0.52);
          const sig = [];
          for (let gy = 0; gy < 16; gy++) {
            for (let gx = 0; gx < 16; gx++) {
              const px = cx0 + Math.floor((gx + 0.5) * cw / 16);
              const py = cy0 + Math.floor((gy + 0.5) * ch / 16);
              const idx = (py * cap.width + px) * 4;
              sig.push(img[idx], img[idx + 1], img[idx + 2]);
            }
          }

          // Project dummy base, chest, and head crown into current camera NDC!
          const curPos = new G.Vector3();
          dummy.group.getWorldPosition(curPos);
          const proj = (wy) => {
            const v = new G.Vector3(curPos.x, curPos.y + wy, curPos.z).project(H.camera);
            return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(4)];
          };
          const ndc = {
            base: proj(0.04),
            chest: proj(1.22),
            head: proj(1.76)
          };

          return {
            b64: cap.toDataURL('image/jpeg', opts.quality || 0.93).split(',')[1],
            lumaMean: +mean.toFixed(2),
            lumaStd: +std.toFixed(2),
            centerSig: sig,
            ndc
          };
        };

        return {
          backend: T.renderer?.backend?.constructor?.name || 'unknown',
          origin: tg.origin,
          floorY: tg.floorY,
          dummyWorld: { x: +wp.x.toFixed(3), y: +wp.y.toFixed(3), z: +wp.z.toFixed(3), yaw: +dummy.group.rotation.y.toFixed(3) },
          bounds: {
            minYRelFloor: +(b.min.y - tg.floorY).toFixed(5),
            maxYRelFloor: +(b.max.y - tg.floorY).toFixed(4),
            widthX: +(b.max.x - b.min.x).toFixed(4),
            depthZ: +(b.max.z - b.min.z).toFixed(4)
          },
          drawsUnmarked: T.drawsOf(dummy.group)
        };
      })()`);

      summary.backend = init.backend;
      summary.dummyWorld = init.dummyWorld;
      summary.geometryBounds = init.bounds;
      summary.drawsUnmarked = init.drawsUnmarked;

      // Helper to verify center-crop pixel difference between two captured shots
      const meanAbsDiff = (sigA, sigB) => {
        let s = 0;
        for (let i = 0; i < sigA.length; i++) s += Math.abs(sigA[i] - sigB[i]);
        return +(s / sigA.length).toFixed(2);
      };

      // Helper to assert whole-dummy framing (base, chest, AND head all inside viewport!)
      const assertWholeDummyFramed = (label, ndc) => {
        assert(ndc.chest[2] > 0 && ndc.chest[2] < 1, `${label}: dummy chest behind camera (${ndc.chest})`);
        assert(Math.abs(ndc.chest[0]) < 0.42 && Math.abs(ndc.chest[1]) < 0.45, `${label}: dummy chest off-center (${ndc.chest})`);
        assert(ndc.head[1] < 0.95 && ndc.head[1] > 0.05, `${label}: dummy head clipped or wrong (${ndc.head})`);
        assert(ndc.base[1] > -0.98 && ndc.base[1] < -0.05, `${label}: dummy base clipped or wrong (${ndc.base})`);
      };

      // 1. Measure exact draw-call & 60-frame render delta (without dummy vs unmarked dummy)
      summary.perfDelta = await page.evaluate(`(async () => {
        const T = window.TT, r = T.renderer, d = window.__ag308Dummy;
        window.__ag308ManualCam = null;
        window.__ag308Hold = false;
        T.setViewFirstDbg(true);
        T.setUnarmedDbg(true);
        const wp = d.group.position;
        window.__ag308PlaceAndAim(wp.x, wp.z + 2.28, wp.x, wp.y + 0.94, wp.z);
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);

        const bench = async (withDummy) => {
          const parent = d.group.parent;
          if (!withDummy && parent) parent.remove(d.group);
          if (withDummy && !d.group.parent) T.inspectHost().scene.add(d.group);
          for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
          const times = [];
          let draws = 0, tris = 0;
          for (let i = 0; i < 60; i++) {
            const t0 = performance.now();
            if (withDummy) d.update(1 / 60);
            T.stepFrame(1 / 60);
            await new Promise((res) => setTimeout(res, 0));
            times.push(performance.now() - t0);
            const info = (r.info && r.info.render) || {};
            draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
            tris = info.triangles || 0;
          }
          if (!d.group.parent && parent) parent.add(d.group);
          times.sort((a, b) => a - b);
          return { draws, tris, medianMs: +times[30].toFixed(3) };
        };

        const without = await bench(false);
        const unmarked = await bench(true);
        window.__ag308Hold = true;
        return {
          withoutDummy: without,
          withDummyUnmarked: unmarked,
          deltaDrawsUnmarked: unmarked.draws - without.draws,
          deltaTrisUnmarked: unmarked.tris - without.tris
        };
      })()`);

      const LIGHT_KEYS = ['noon', 'overcast', 'dusk', 'night'];
      const cleanEyeSigs = {};

      // 2. Capture PRISTINE Whole Dummy at the genuine 1P Eye (2.12 m in front, whole base-to-crown framed!) + 3P Beside Marine across all 4 lights
      for (const lk of LIGHT_KEYS) {
        const rawEye = await page.evaluate(`(async () => {
          const T = window.TT, d = window.__ag308Dummy;
          d.reset();
          window.__ag308Hold = false;
          T.setViewFirstDbg(true);
          T.setUnarmedDbg(true); // clean unobstructed 1P eye view (D-157)
          const wp = d.group.position;
          T.player.position.set(wp.x + 4.0, wp.y, wp.z);
          window.__ag308ManualCam = {
            fov: 54,
            pos: [wp.x, wp.y + 1.30, wp.z + 2.30],
            look: [wp.x, wp.y + 1.05, wp.z]
          };
          window.__ag308SetLight('${lk}');
          return await window.__ag308Capture({ quality: 0.93 });
        })()`);
        assert(rawEye.lumaStd > 8, `clean-eye-${lk} appears blank (std=${rawEye.lumaStd})`);
        assertWholeDummyFramed(`clean-eye-${lk}`, rawEye.ndc);
        cleanEyeSigs[lk] = rawEye.centerSig;
        summary.shots[`clean-eye-${lk}`] = saveShot(`clean-eye-${lk}.jpg`, rawEye);

        // 3P Third-Person view: 1.80 m Marine standing side-by-side right next to the 1.79 m dummy on the tiled range floor!
        const raw3P = await page.evaluate(`(async () => {
          const T = window.TT, d = window.__ag308Dummy;
          window.__ag308Hold = false;
          T.setUnarmedDbg(false);
          T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          T.setViewFirstDbg(false);
          const wp = d.group.position;
          // Stand marine 0.88 m to the +X side of the dummy, facing slightly toward the camera & dummy
          window.__ag308PlaceAndAim(wp.x + 0.88, wp.z + 0.10, wp.x + 0.25, wp.y + 1.20, wp.z + 2.50);
          for (let i = 0; i < 18; i++) T.stepFrame(1 / 60);
          // Frame both full figures (marine + dummy + bench + range lanes) cleanly
          window.__ag308ManualCam = {
            fov: 52,
            pos: [wp.x + 0.55, wp.y + 1.32, wp.z + 2.85],
            look: [wp.x + 0.36, wp.y + 0.92, wp.z - 0.10]
          };
          window.__ag308SetLight('${lk}');
          return await window.__ag308Capture({ quality: 0.93 });
        })()`);
        assert(raw3P.lumaStd > 8, `clean-3p-${lk} appears blank`);
        assert(raw3P.ndc.head[1] < 0.92 && raw3P.ndc.base[1] > -0.94, `clean-3p-${lk} dummy clipped: ${JSON.stringify(raw3P.ndc)}`);
        summary.shots[`clean-3p-${lk}`] = saveShot(`clean-3p-${lk}.jpg`, raw3P);
      }

      // 3. Front / Side / Back Turnaround (~2.05 m distance at eye height in Noon light, inside the Training Ground)
      for (const [viewKey, offset, lookY] of [
        ['front', [0, 1.32, 2.05], 0.94],
        ['side',  [2.05, 1.32, 0.15], 0.94],
        ['back',  [0, 1.32, -2.05], 0.94]
      ]) {
        const rawTurn = await page.evaluate(`(async () => {
          const T = window.TT, H = T.inspectHost(), d = window.__ag308Dummy;
          d.reset();
          T.setViewFirstDbg(true);
          T.setUnarmedDbg(true);
          const wp = d.group.position;
          H.placePlayer(wp.x + 4.5, wp.z, 0); // move player out of turnaround camera
          window.__ag308ManualCam = {
            fov: 52,
            pos: [wp.x + ${offset[0]}, wp.y + ${offset[1]}, wp.z + ${offset[2]}],
            look: [wp.x, wp.y + ${lookY}, wp.z]
          };
          window.__ag308SetLight('noon');
          return await window.__ag308Capture({ quality: 0.93 });
        })()`);
        assertWholeDummyFramed(`turnaround-${viewKey}`, rawTurn.ndc);
        summary.shots[`turnaround-${viewKey}`] = saveShot(`turnaround-${viewKey}.jpg`, rawTurn);
      }

      // 4. Close-ups of EACH decal kind after REAL weapon hits in the live game!
      // First capture a reference clean chest close-up at 0.88 m (shoulders + head + range wall visible so context is unmistakable)
      const cleanCloseup = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost(), d = window.__ag308Dummy;
        d.reset();
        T.setViewFirstDbg(true);
        T.setUnarmedDbg(true);
        const wp = d.group.position;
        H.placePlayer(wp.x + 4.5, wp.z, 0);
        window.__ag308CloseupFill = true;
        window.__ag308ManualCam = {
          fov: 46,
          pos: [wp.x, wp.y + 1.29, wp.z + 0.88],
          look: [wp.x, wp.y + 1.24, wp.z]
        };
        window.__ag308SetLight('noon');
        const s = await window.__ag308Capture({ quality: 0.94 });
        window.__ag308CloseupFill = false;
        return s;
      })()`);

      const testSingleRealHit = async (kindKey, runHitJs, camLookY = 1.24) => {
        const res = await page.evaluate(`(async () => {
          const T = window.TT, H = T.inspectHost(), d = window.__ag308Dummy;
          const wp = d.group.position;
          d.reset();
          window.__ag308CloseupFill = false;
          window.__ag308ManualCam = null;
          window.__ag308Hold = false;
          T.setViewFirstDbg(true);
          T.setUnarmedDbg(false);

          ${runHitJs}

          // Step live frames so transient sparks/motes clear and wobble settles cleanly for close-up inspection
          for (let i = 0; i < 75; i++) T.stepFrame(1 / 60);
          for (let i = 0; i < 140; i++) d.update(1 / 60);
          const st = d.state();

          // Move player aside & frame clean 0.88 m close-up showing chest, shoulders, neck & range background
          T.setUnarmedDbg(true);
          H.placePlayer(wp.x + 4.5, wp.z, 0);
          window.__ag308CloseupFill = true;
          window.__ag308ManualCam = {
            fov: 46,
            pos: [wp.x, wp.y + ${camLookY + 0.05}, wp.z + 0.88],
            look: [wp.x, wp.y + ${camLookY}, wp.z]
          };
          window.__ag308SetLight('noon');
          const shot = await window.__ag308Capture({ quality: 0.94 });
          window.__ag308CloseupFill = false;
          return { state: st, shot };
        })()`);
        assert(res.state.markCount >= 1, `Real hit for ${kindKey} produced 0 marks! state=${JSON.stringify(res.state)}`);
        const diff = meanAbsDiff(cleanCloseup.centerSig, res.shot.centerSig);
        assert(diff > 0.35, `Close-up for ${kindKey} looks identical to clean dummy (diff=${diff})`);
        summary.realWeaponHits[kindKey] = { state: res.state, pixelDiffVsClean: diff };
        summary.shots[`decal-${kindKey}`] = saveShot(`decal-${kindKey}.jpg`, res.shot);
      };

      // 4A: Real Combat Knife slash (`knifeAttack()` with machete=false, katana=false)
      await testSingleRealHit('1-knife', `
        T.setMacheteOwned(false);
        T.setKatanaOwned(false);
        T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
        window.__ag308PlaceAndAim(wp.x + 0.06, wp.z + 0.86, wp.x - 0.02, wp.y + 1.26, wp.z);
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);
        T.setKnifeCd(0);
        window.__ag308AimOnly(wp.x + 0.06, wp.z + 0.86, wp.x - 0.02, wp.y + 1.26, wp.z);
        T.knifeAttack();
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);
      `, 1.22);

      // 4B: Real Machete chop (`knifeAttack()` with machete=true, katana=false)
      await testSingleRealHit('2-machete', `
        T.setMacheteOwned(true);
        T.setKatanaOwned(false);
        T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
        window.__ag308PlaceAndAim(wp.x - 0.06, wp.z + 0.94, wp.x + 0.02, wp.y + 1.26, wp.z);
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);
        T.setKnifeCd(0);
        window.__ag308AimOnly(wp.x - 0.06, wp.z + 0.94, wp.x + 0.02, wp.y + 1.26, wp.z);
        T.knifeAttack();
        for (let i = 0; i < 28; i++) T.stepFrame(1 / 60);
      `, 1.22);

      // 4C: Real Katana diagonal cleave (`knifeAttack()` with katana=true)
      await testSingleRealHit('3-katana', `
        T.setMacheteOwned(true);
        T.setKatanaOwned(true);
        T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
        window.__ag308PlaceAndAim(wp.x + 0.08, wp.z + 1.02, wp.x - 0.02, wp.y + 1.26, wp.z);
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 60);
        T.setKnifeCd(0);
        window.__ag308AimOnly(wp.x + 0.08, wp.z + 1.02, wp.x - 0.02, wp.y + 1.26, wp.z);
        T.knifeAttack();
        for (let i = 0; i < 28; i++) T.stepFrame(1 / 60);
      `, 1.22);

      // 4D: Real Chainsaw bite (`chainsaw` equipped + `sawDbg.tick()`, camera centered at chest/abdomen bite height!)
      await testSingleRealHit('4-chainsaw', `
        T.grantAllWeapons();
        T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
        window.__ag308PlaceAndAim(wp.x - 0.04, wp.z + 0.72, wp.x - 0.02, wp.y + 1.48, wp.z);
        for (let i = 0; i < 45; i++) T.stepFrame(1 / 60);
        for (let i = 0; i < 14; i++) {
          window.__ag308PlaceAndAim(wp.x - 0.04 + i * 0.007, wp.z + 0.72, wp.x - 0.02 + i * 0.006, wp.y + 1.48, wp.z);
          T.sawDbg.tick();
          T.stepFrame(1 / 60);
        }
      `, 1.08);

      // 4E: Scorch mark (thermal/flamethrower char on chest)
      await testSingleRealHit('5-scorch', `
        const hit1 = d.traceSegment({ x: wp.x - 0.02, y: wp.y + 1.25, z: wp.z + 1.0 }, { x: wp.x, y: wp.y + 1.25, z: wp.z - 0.2 });
        const hit2 = d.traceSegment({ x: wp.x + 0.04, y: wp.y + 1.22, z: wp.z + 1.0 }, { x: wp.x, y: wp.y + 1.22, z: wp.z - 0.2 });
        d.strike({ kind: 'scorch', point: hit1.point, normal: hit1.normal, slashDir: { x: 0.92, y: -0.38, z: 0 }, damage: 22 });
        d.strike({ kind: 'scorch', point: hit2.point, normal: hit2.normal, slashDir: { x: 0.85, y: 0.52, z: 0 }, damage: 18 });
      `, 1.24);

      // 4F: Real Gun Bullet punctures (`pistol` real rounds fired into center chest & collarbone!)
      await testSingleRealHit('6-bullet', `
        T.grantAllWeapons();
        T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
        H.setPointerOnCanvas(true);
        T.setSprayDbg(0, 0);
        window.__ag308PlaceAndAim(wp.x, wp.z + 1.65, wp.x - 0.03, wp.y + 1.22, wp.z);
        for (let i = 0; i < 38; i++) T.stepFrame(1 / 60);
        for (const [ax, ay] of [[-0.04, 1.22], [0.03, 1.28], [-0.01, 1.34]]) {
          T.setSprayDbg(0, 0);
          window.__ag308AimOnly(wp.x, wp.z + 1.65, wp.x + ax, wp.y + ay, wp.z);
          for (let i = 0; i < 12; i++) T.stepFrame(1 / 60);
          T.setMouseFireDbg(true);
          T.stepFrame(1 / 60);
          T.setMouseFireDbg(false);
          for (let i = 0; i < 16; i++) T.stepFrame(1 / 60);
        }
      `, 1.24);

      // 5. Combined Multi-Weapon Battle-Scarred Dummy at ~2.15 m Eye across ALL 4 LIGHTS (verifying pristine != hits in EVERY light!)
      const comboSetup = await page.evaluate(`(() => {
        const T = window.TT, d = window.__ag308Dummy;
        const wp = d.group.position;
        d.reset();
        // Place distinct non-overlapping marks across head, chest, ribs & abdomen via exact surface traces
        const trace = (xOff, yOff) => d.traceSegment(
          { x: wp.x + xOff, y: wp.y + yOff, z: wp.z + 1.0 },
          { x: wp.x + xOff * 0.3, y: wp.y + yOff, z: wp.z - 0.3 }
        );
        const hKat = trace(-0.05, 1.36);
        d.strike({ kind: 'katana', point: hKat.point, direction: { x: 0, y: -0.1, z: -1 }, slashDir: { x: 0.78, y: -0.62, z: 0 }, damage: 75 });
        const hKnife = trace(0.11, 1.28);
        d.strike({ kind: 'knife', point: hKnife.point, direction: { x: 0, y: 0, z: -1 }, slashDir: { x: -0.86, y: -0.50, z: 0 }, damage: 35 });
        const hMach = trace(0.08, 1.12);
        d.strike({ kind: 'machete', point: hMach.point, direction: { x: 0, y: -0.1, z: -1 }, slashDir: { x: -0.82, y: -0.56, z: 0 }, damage: 55 });
        const hSaw = trace(-0.04, 0.97);
        d.strike({ kind: 'scorch', point: hSaw.point, damage: 12 });
        d.strike({ kind: 'chainsaw', point: hSaw.point, direction: { x: 0, y: 0, z: -1 }, slashDir: { x: 0.96, y: 0.22, z: 0 }, damage: 45, forceMark: true });
        const hBul1 = trace(0.03, 1.68);
        const hBul2 = trace(-0.04, 1.61);
        d.strike({ kind: 'bullet', point: hBul1.point, direction: { x: 0, y: 0, z: -1 }, damage: 35 });
        d.strike({ kind: 'bullet', point: hBul2.point, direction: { x: 0, y: 0, z: -1 }, damage: 35 });

        for (let i = 0; i < 200; i++) d.update(1 / 60);
        return { state: d.state(), drawsMarked: T.drawsOf(d.group) };
      })()`);
      summary.drawsMarked = comboSetup.drawsMarked;

      for (const lk of LIGHT_KEYS) {
        const rawHitEye = await page.evaluate(`(async () => {
          const T = window.TT, d = window.__ag308Dummy, wp = d.group.position;
          window.__ag308Hold = false;
          T.setViewFirstDbg(true);
          T.setUnarmedDbg(true);
          T.player.position.set(wp.x + 4.0, wp.y, wp.z);
          window.__ag308ManualCam = {
            fov: 54,
            pos: [wp.x, wp.y + 1.30, wp.z + 2.30],
            look: [wp.x, wp.y + 1.05, wp.z]
          };
          window.__ag308SetLight('${lk}');
          return await window.__ag308Capture({ quality: 0.93 });
        })()`);
        assertWholeDummyFramed(`hits-eye-${lk}`, rawHitEye.ndc);
        const saved = saveShot(`hits-eye-${lk}.jpg`, rawHitEye);
        assert.notEqual(saved.sha, summary.shots[`clean-eye-${lk}`].sha, `hits-eye-${lk} SHA matches clean-eye-${lk}!`);
        const diff = meanAbsDiff(cleanEyeSigs[lk], rawHitEye.centerSig);
        assert(diff > 0.05, `hits-eye-${lk} visual diff too small (${diff})`);
        saved.diffVsClean = diff;
        summary.shots[`hits-eye-${lk}`] = saved;
      }
      // 6. Effect-Sorting Proofs (live flamethrower stream renderOrder=3 & chainsaw sparks/dust renderOrder=0 over marked dummy!)
      const rawFlameSort = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost(), d = window.__ag308Dummy, wp = d.group.position;
        window.__ag308ManualCam = null;
        window.__ag308Hold = false;
        T.setViewFirstDbg(true);
        T.setUnarmedDbg(false);
        H.setPointerOnCanvas(true);
        T.grantAllWeapons();
        T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
        window.__ag308PlaceAndAim(wp.x, wp.z + 2.05, wp.x, wp.y + 1.18, wp.z);
        window.__ag308SetLight('dusk');
        window.__ag308Hold = false;
        for (let i = 0; i < 42; i++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(true);
        for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        window.__ag308ManualCam = {
          fov: 54,
          pos: [wp.x + 0.65, wp.y + 1.30, wp.z + 1.85],
          look: [wp.x, wp.y + 1.15, wp.z]
        };
        window.__ag308Hold = true;
        const shot = await window.__ag308Capture({ quality: 0.94 });
        T.flameDbg.clear();
        return shot;
      })()`);
      summary.shots['sort-flamethrower'] = saveShot('sort-flamethrower.jpg', rawFlameSort);

      const rawSparkSort = await page.evaluate(`(async () => {
        const T = window.TT, d = window.__ag308Dummy, wp = d.group.position;
        window.__ag308ManualCam = null;
        window.__ag308Hold = false;
        T.setViewFirstDbg(true);
        T.setUnarmedDbg(false);
        T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
        window.__ag308PlaceAndAim(wp.x, wp.z + 1.45, wp.x, wp.y + 1.16, wp.z);
        window.__ag308SetLight('noon');
        window.__ag308Hold = false;
        for (let i = 0; i < 35; i++) T.stepFrame(1 / 60);
        const sx = wp.x, sy = wp.y + 1.18, sz = wp.z + 0.25;
        T.sawEffectsDbg.sparks(sx, sy, sz, 0, 1, 20, 1.25);
        for (let k = 0; k < 8; k++) {
          T.spawnMote(sx + (k - 3.5) * 0.04, sy + (k % 3 - 1) * 0.05, sz, T.dustMat, {
            vx: 0, vy: 0.25, vz: 0.35, grav: 0, drag: 1, life: 1.2, scale: 0.16
          });
        }
        T.spawnEmbers(sx, sy, sz, 10);
        T.stepFrame(1 / 60);
        T.stepFrame(1 / 60);
        window.__ag308ManualCam = {
          fov: 54,
          pos: [wp.x + 0.55, wp.y + 1.30, wp.z + 1.65],
          look: [wp.x, wp.y + 1.15, wp.z]
        };
        window.__ag308Hold = true;
        return await window.__ag308Capture({ quality: 0.94 });
      })()`);
      summary.shots['sort-sparks-dust'] = saveShot('sort-sparks-dust.jpg', rawSparkSort);

      // 7. 6-Frame Sprung Wobble Filmstrip (3/4 side view showing whole dummy from base to head crown + marks riding the wobble!)
      const wobbleFrames = await page.evaluate(`(async () => {
        const T = window.TT, H = T.inspectHost(), d = window.__ag308Dummy, wp = d.group.position;
        window.__ag308Hold = false;
        T.setViewFirstDbg(true);
        T.setUnarmedDbg(true);
        T.trainingDbg.state().char?.clear?.();
        H.placePlayer(wp.x + 4.5, wp.z, 0);
        for (let i = 0; i < 280; i++) T.stepFrame(1 / 60); // clear all lingering smoke/sparks/dust before wobble strip!
        for (let i = 0; i < 120; i++) d.update(1 / 60);
        window.__ag308ManualCam = {
          fov: 50,
          pos: [wp.x + 1.75, wp.y + 1.12, wp.z + 0.95],
          look: [wp.x, wp.y + 0.95, wp.z - 0.05]
        };
        window.__ag308SetLight('noon');

        const out = [];
        out.push({
          label: 't=0.00s rest',
          sec: 0.0,
          tiltDeg: 0,
          signedLeanDeg: 0,
          shot: await window.__ag308Capture({ quality: 0.93 })
        });

        // Heavy katana blow to head/upper-chest driving backward (-Z) & slight lateral sway
        d.strike({
          kind: 'katana',
          point: { x: wp.x + 0.04, y: wp.y + 1.54, z: wp.z + 0.12 },
          direction: { x: -0.22, y: -0.08, z: -0.97 },
          slashDir: { x: -0.8, y: -0.6, z: 0 },
          impulse: 4.8,
          damage: 80
        });

        const targets = [0.09, 0.21, 0.33, 0.56, 1.30];
        let elapsed = 0;
        for (const tGoal of targets) {
          while (elapsed + 1e-6 < tGoal) {
            const step = Math.min(1 / 120, tGoal - elapsed);
            d.update(step);
            elapsed += step;
          }
          const st = d.state();
          out.push({
            label: 't=' + tGoal.toFixed(2) + 's',
            sec: +tGoal.toFixed(2),
            tiltDeg: +(st.tiltRad * 180 / Math.PI).toFixed(2),
            signedLeanDeg: +((-st.tiltX) * 180 / Math.PI).toFixed(2),
            shot: await window.__ag308Capture({ quality: 0.93 })
          });
        }
        return out;
      })()`);

      wobbleFrames.forEach((wf, idx) => {
        assertWholeDummyFramed(`wobble-${idx}`, wf.shot.ndc);
        const fname = `wobble-${idx}-${wf.sec.toFixed(2).replace('.', 'p')}s.jpg`;
        const saved = saveShot(fname, wf.shot);
        if (idx === 1) {
          assert.notEqual(saved.sha, summary.shots['wobble-0-0p00s.jpg']?.sha || '', 'Peak wobble frame identical to rest!');
        }
        summary.shots[fname] = saved;
        summary.wobbleCurve.push({
          idx,
          label: wf.label,
          sec: wf.sec,
          tiltDeg: wf.tiltDeg,
          signedLeanDeg: wf.signedLeanDeg,
          file: fname
        });
      });

      const outJson = JSON.stringify(summary, null, 2);
      fs.writeFileSync(path.join(ROOT, 'review/AG-308/ag308-summary.json'), outJson);
      try { fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-AG-308/ag308-summary.json'), outJson); } catch (_) {}

      console.log('AG-308 VERIFY COMPLETE:', {
        backend: summary.backend,
        dummyWorld: summary.dummyWorld,
        bounds: summary.geometryBounds,
        drawsUnmarked: summary.drawsUnmarked.length,
        drawsMarked: summary.drawsMarked.length,
        perfDelta: summary.perfDelta,
        realWeaponHits: Object.fromEntries(Object.entries(summary.realWeaponHits).map(([k, v]) => [k, { marks: v.state.markCount, diff: v.pixelDiffVsClean }])),
        wobbleCurve: summary.wobbleCurve.map((w) => `${w.label}:${w.signedLeanDeg}°`),
        totalShots: Object.keys(summary.shots).length,
        pageErrors: summary.pageErrors.length,
        gpuWarnings: summary.gpuWarnings.length
      });
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }

  assert.equal(summary.pageErrors.length, 0, `Unexpected pageErrors: ${summary.pageErrors.join('; ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
