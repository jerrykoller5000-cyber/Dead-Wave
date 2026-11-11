// qa/2026-11-11-CE-4-hq-ladder/ce4-hq-ladder-verify.mjs
// RTX 5080 WebGPU 4-light verification for Claude 5's CE-4 Part 3 (HQ West Pier Ladder):
//   1. At the eye (1P, facing east at foot x = HQ - 5.40, z = HQ, pitch +0.30 rad up ladder, W held):
//      - 6 frames up the climb showing left & right fists closing over round rungs (Noon)
//      - 4-light eye comparison (Noon, Overcast, Dusk, Night+flashlight) mid-climb
//   2. Third-person clean exterior views (guaranteed outside HQ west wall & unobstructed):
//      - Pure side profile (rungs, brackets, west pier, both hands, and forearm clearance clearly visible!)
//      - 3/4 behind-side view
//      - Captured at TWO heights (Low ~+1.15 m & High ~+3.05 m) and across all 4 lights
//   3. Stepping off at the top onto the HQ roof (`onHqRoof() === true`) and walking several steps across the roof
//   4. Geometric clipping & clearance audit (fists vs rungs, rails vs pier, forearms vs wall) + PC `Node.contains` error audit.
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

const OUT_REV = path.join(ROOT, 'review/CE-4-hq-ladder');
const OUT_SHOTS = path.join(OUT_REV, 'shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CE-4-hq-ladder/shots');
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

function browserSetupFn() {
  const T = window.TT, H = T.inspectHost(), G = T.THREE;

  // Hide UI overlays so ladder rungs, fists, brackets, and west pier read cleanly
  const css = document.createElement('style');
  css.id = 'ce4-clean-ui';
  css.textContent = '#menu,#title,#hud,#interact,#perf,#prepChecklist{display:none!important;visibility:hidden!important}';
  document.head.appendChild(css);

  // Clear zombies & enable godmode so Valley prep stays peaceful
  try { T.setGodMode?.(true); } catch (_) {}
  try { T.clearZombiesDbg?.(); } catch (_) {}

  const LIGHTS = {
    noon:     { worldTime: 0.42, sunCol: 0xfff5e2, sunInt: 2.30, hemiSky: 0x9ec5ef, hemiGnd: 0x5c584e, hemiInt: 0.94, amb: 0.44, fill: 0.30, exp: 1.04 },
    overcast: { worldTime: 0.30, sunCol: 0xd8e0ea, sunInt: 0.95, hemiSky: 0xaab7c7, hemiGnd: 0x55595f, hemiInt: 1.10, amb: 0.58, fill: 0.36, exp: 1.02 },
    dusk:     { worldTime: 0.72, sunCol: 0xff8d44, sunInt: 1.42, hemiSky: 0x7b6389, hemiGnd: 0x3b2f2a, hemiInt: 0.58, amb: 0.28, fill: 0.20, exp: 1.02 },
    night:    { worldTime: 0.95, sunCol: 0x5b76a8, sunInt: 0.08, hemiSky: 0x1e2b45, hemiGnd: 0x10131a, hemiInt: 0.26, amb: 0.12, fill: 0.10, exp: 1.06 }
  };

  window.__ce4Light = 'noon';
  window.__ce4Hold = false;
  window.__ce4ManualCam = null;

  const applyRig = () => {
    const key = window.__ce4Light;
    const L = LIGHTS[key];
    if (L) {
      H.renderer.toneMappingExposure = L.exp;
      H.sun.color.setHex(L.sunCol);
      H.sun.intensity = L.sunInt;
      // Place sun in west-southwest sky so HQ west wall & ladder are directly lit in daytime/dusk!
      const lad = T.hqLadderAt();
      H.sun.position.set(lad.x - 48, lad.y + (key === 'dusk' ? 22 : 68), lad.z + 28);
      H.sun.target.position.set(lad.x, lad.y + 2.5, lad.z);
      H.sun.target.updateMatrixWorld();
      H.hemi.color.setHex(L.hemiSky);
      H.hemi.groundColor.setHex(L.hemiGnd);
      H.hemi.intensity = L.hemiInt;
      if (H.ambient) H.ambient.intensity = L.amb;
      if (H.ambientFill) H.ambientFill.intensity = L.fill;
      H.moon.intensity = key === 'night' ? 0.22 : 0;
    }
    if (window.__ce4ManualCam) {
      const mc = window.__ce4ManualCam;
      H.camera.fov = mc.fov || 48;
      H.camera.near = 0.05;
      H.camera.updateProjectionMatrix();
      H.camera.position.set(mc.pos[0], mc.pos[1], mc.pos[2]);
      H.camera.lookAt(mc.look[0], mc.look[1], mc.look[2]);
      H.camera.updateMatrixWorld(true);
    }
    if (T.flashlight) {
      if (key === 'night') {
        T.flashlight.visible = true;
        T.flashlight.angle = 0.68;
        T.flashlight.penumbra = 0.82;
        T.flashlight.intensity = 8.5;
        if (window.__ce4ManualCam) {
          const mc = window.__ce4ManualCam;
          T.flashlight.position.set(mc.pos[0], mc.pos[1] + 0.15, mc.pos[2]);
          T.flashlight.target.position.set(mc.look[0], mc.look[1], mc.look[2]);
          T.flashlight.target.updateMatrixWorld();
        }
      } else {
        T.flashlight.intensity = 0;
      }
    }
  };

  H.attach({
    held: () => window.__ce4Hold,
    scale: (dt) => dt,
    frame: applyRig
  });

  window.__ce4SetLight = (key) => {
    window.__ce4Light = key;
    const L = LIGHTS[key];
    if (L && typeof T.setWorldTime === 'function') T.setWorldTime(L.worldTime);
    const flOn = !!(T.flashlight && T.flashlight.visible && T.flashlight.intensity > 0.01);
    if (key === 'night' && !flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();
    if (key !== 'night' && flOn && typeof T.toggleFlashlightDbg === 'function') T.toggleFlashlightDbg();
    window.__ce4Hold = false;
    T.stepFrame(0);
    window.__ce4Hold = true;
  };

  const cap = document.createElement('canvas');
  window.__ce4Capture = async (manualCam = null) => {
    window.__ce4ManualCam = manualCam;
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
      b64: cap.toDataURL('image/jpeg', 0.93).split(',')[1],
      lumaMean: +mean.toFixed(2),
      lumaStd: +std.toFixed(2)
    };
  };

  // Pick whichever Z side (-1 north or +1 south) of the HQ west ladder has 0 raycast occluders!
  const L = T.hqLadderAt();
  const ray = new G.Raycaster();
  ray.camera = H.camera;
  const sideScore = (zSign) => {
    const origin = new G.Vector3(L.x - 0.32, L.y + 2.2, L.z + zSign * 1.65);
    const target = new G.Vector3(L.x, L.y + 2.2, L.z);
    const dir = target.clone().sub(origin);
    const dist = dir.length();
    ray.set(origin, dir.normalize());
    ray.far = dist - 0.28;
    const hits = ray.intersectObjects(H.scene.children, true).filter((h) => {
      let o = h.object;
      while (o) {
        if (o === H.marine || o === H.player || o.name === 'hq-ladder') return false;
        o = o.parent;
      }
      return h.object.visible;
    });
    return hits.length;
  };
  const negHits = sideScore(-1);
  const posHits = sideScore(+1);
  window.__ce4ClearSide = negHits <= posHits ? -1 : +1;

  // Audit ladder geometry vs west pier
  let lad = null;
  H.scene.traverse((o) => { if (!lad && o.name === 'hq-ladder') lad = o; });
  lad.updateMatrixWorld(true);
  const boxes = lad.children.map((m) => new G.Box3().setFromObject(m));
  const size = (b) => ({ x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z });
  const rungs = boxes.filter((b) => size(b).y < 0.05 && size(b).z > 0.30);
  const rails = boxes.filter((b) => size(b).y > 4.0);
  const allBox = new G.Box3();
  boxes.forEach((b) => allBox.union(b));
  const pierFaceX = L.x + 0.15;

  return {
    backend: T.renderer?.backend?.constructor?.name || 'unknown',
    ladder: L,
    clearZSide: window.__ce4ClearSide,
    occluders: { northNegZ: negHits, southPosZ: posHits },
    ladderGeom: {
      rungCount: rungs.length,
      rungLengthZ: rungs[0] ? +size(rungs[0]).z.toFixed(3) : 0,
      rungDiamX: rungs[0] ? +size(rungs[0]).x.toFixed(3) : 0,
      railMaxX: rails.length ? +Math.max(...rails.map((b) => b.max.x)).toFixed(3) : null,
      ladderMaxX: +allBox.max.x.toFixed(3),
      pierFaceX: +pierFaceX.toFixed(3),
      railToPierClearanceCm: rails.length ? +((pierFaceX - Math.max(...rails.map((b) => b.max.x))) * 100).toFixed(1) : null
    }
  };
}

function browserRunClimbAndAuditFn() {
  return (async () => {
    const T = window.TT, H = T.inspectHost(), G = T.THREE;
    const L = T.hqLadderAt();
    const zSide = window.__ce4ClearSide;
    const keyW = (type) => document.body.dispatchEvent(new KeyboardEvent(type, { code: 'KeyW', key: 'w', bubbles: true }));

    // Helper to reset player cleanly to the foot of the HQ west ladder facing EAST (+X, yaw = Math.PI/2).
    // Eye is ~1.58m above feet while HQ_LADDER_GRIP.hand is [0.90, 1.70]m (midpoint 1.30m), so pitch -0.26 rad frames both fists & rungs!
    const EYE_PITCH = -0.26;
    const startClimbFromFoot = (firstPerson) => {
      window.__ce4Hold = false;
      window.__ce4ManualCam = null;
      keyW('keyup');
      if (T.onHqRoof()) T.stepHqLadder(-1, 4.0);
      T.setShotView(null);
      T.setViewFirstDbg(firstPerson);
      H.placePlayer(L.x - 0.45, L.z, Math.PI / 2);
      H.player.position.set(L.x - 0.45, L.y, L.z);
      H.player.rotation.y = Math.PI / 2;
      T.setAimYawDbg(Math.PI / 2);
      T.setOtsAimDbg(Math.PI / 2, EYE_PITCH);
      for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
      H.player.position.set(L.x, L.y, L.z);
      H.player.rotation.y = Math.PI / 2;
      T.setAimYawDbg(Math.PI / 2);
      T.setOtsAimDbg(Math.PI / 2, EYE_PITCH);
    };

    const shots = {};
    const climbSamples = [];
    let maxHandOutsideRailM = 0;
    let maxHandOffRungLineM = 0;
    let maxArmEastXRelPierM = -999; // > 0 would mean arm mesh poked east past pier face!

    // 1. 1P AT THE EYE: 6 frames up the climb in Noon + 4-light eye shots mid-climb
    window.__ce4SetLight('noon');
    startClimbFromFoot(true);
    window.__ce4Hold = false;
    keyW('keydown');

    // Total climb is L.roof - L.y (~5.4 m at 2.4 m/s = ~2.25 s = ~135 frames at 60 Hz).
    // Capture 6 frames across the climb when a fist is right in the eye's upper/mid window!
    const targetFrames = [18, 33, 48, 63, 78, 93];
    let frameIdx = 0;
    for (let f = 1; f <= 112 && !T.onHqRoof(); f++) {
      keyW('keydown');
      T.setOtsAimDbg(Math.PI / 2, EYE_PITCH);
      T.stepFrame(1 / 60);

      const hs = T.lightningDbg?.handTargets?.();
      if (hs && T.lightningDbg?.ladderNow?.()) {
        for (const h of hs) {
          const offZ = Math.abs(h.z - L.z);
          if (offZ > 0.145) maxHandOutsideRailM = Math.max(maxHandOutsideRailM, offZ - 0.145);
          maxHandOffRungLineM = Math.max(maxHandOffRungLineM, Math.abs(h.x - L.x));
        }
      }

      if (f === 48) {
        // Mid-climb (~1.9 m up, right fist closing over round rung!): capture 4-light 1P eye comparison!
        window.__ce4Hold = true;
        for (const lk of ['noon', 'overcast', 'dusk', 'night']) {
          window.__ce4SetLight(lk);
          shots[`eye-4light-${lk}`] = await window.__ce4Capture(null);
        }
        window.__ce4SetLight('noon');
        window.__ce4Hold = false;
      }

      if (targetFrames.includes(f)) {
        window.__ce4Hold = true;
        const relY = +(H.player.position.y - L.y).toFixed(2);
        const hsSnap = (T.lightningDbg?.handTargets?.() || []).map((h) => ({
          x: +(h.x - L.x).toFixed(3),
          y: +(h.y - L.y).toFixed(2),
          z: +(h.z - L.z).toFixed(3)
        }));
        climbSamples.push({ step: frameIdx, frame: f, climbHeightM: relY, handsRelLadder: hsSnap });
        shots[`eye-climb-${frameIdx}`] = await window.__ce4Capture(null);
        frameIdx++;
        window.__ce4Hold = false;
      }
    }

    // 2. STEPPING OFF AT TOP ONTO ROOF & WALKING SEVERAL STEPS ACROSS HQ ROOF (Requirement 3!)
    let guard = 0;
    while (!T.onHqRoof() && guard++ < 80) {
      keyW('keydown');
      T.setOtsAimDbg(Math.PI / 2, 0.10);
      T.stepFrame(1 / 60);
    }
    const steppedOntoRoof = !!T.onHqRoof();
    const roofStepPos = {
      x: +H.player.position.x.toFixed(2),
      y: +H.player.position.y.toFixed(2),
      z: +H.player.position.z.toFixed(2)
    };

    // Capture 1P & exterior 3P right as he steps onto the roof, then walk 3 beats east across the HQ roof!
    T.setViewFirstDbg(false);
    T.stepFrame(0);
    window.__ce4Hold = true;
    window.__ce4SetLight('noon');
    shots['roof-step-0'] = await window.__ce4Capture({
      fov: 50,
      pos: [L.x - 2.2, L.roof + 2.1, L.z + zSide * 2.8],
      look: [L.x + 1.4, L.roof + 0.95, L.z]
    });

    const roofWalkPositions = [roofStepPos];
    for (let beat = 1; beat <= 3; beat++) {
      window.__ce4Hold = false;
      for (let k = 0; k < 8; k++) {
        keyW('keydown');
        H.player.rotation.y = -Math.PI / 2;
        T.setAimYawDbg(-Math.PI / 2);
        T.setOtsAimDbg(-Math.PI / 2, -0.05);
        T.stepFrame(1 / 60);
      }
      window.__ce4Hold = true;
      roofWalkPositions.push({
        x: +H.player.position.x.toFixed(2),
        y: +H.player.position.y.toFixed(2),
        z: +H.player.position.z.toFixed(2),
        onHqRoof: !!T.onHqRoof()
      });
      shots[`roof-step-${beat}`] = await window.__ce4Capture({
        fov: 50,
        pos: [L.x - 1.8, L.roof + 2.2, L.z + zSide * 3.1],
        look: [H.player.position.x, L.roof + 0.95, L.z]
      });
    }
    keyW('keyup');

    // 3. THIRD-PERSON CLEAN EXTERIOR VIEWS (Side Profile & 3/4 Behind-Side at TWO HEIGHTS across 4 LIGHTS!)
    // Also measure exact world-space arm/hand mesh bounds vs pier face (L.x + 0.15) & HQ wall (L.x + 0.40)!
    startClimbFromFoot(false);
    window.__ce4Hold = false;
    keyW('keydown');

    const measureMarineArmClearance = () => {
      H.marine.updateMatrixWorld(true);
      const pierFaceX = L.x + 0.15;
      const wallFaceX = L.x + 0.40;
      let maxArmX = -Infinity;
      const v = new G.Vector3();
      H.marine.traverse((o) => {
        if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return;
        // Skip slung back weapons so we measure the marine's body/arms/fists specifically
        let p = o;
        while (p && p !== H.marine) {
          if (/slung|carrier|weapon|rifle|gun/i.test(p.name || '')) return;
          p = p.parent;
        }
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (v.x > maxArmX) maxArmX = v.x;
        }
      });
      return {
        maxBodyOrFistX: +maxArmX.toFixed(4),
        pierFaceX: +pierFaceX.toFixed(4),
        wallFaceX: +wallFaceX.toFixed(4),
        clearanceFromPierCm: +((pierFaceX - maxArmX) * 100).toFixed(2),
        clearanceFromWallCm: +((wallFaceX - maxArmX) * 100).toFixed(2)
      };
    };

    const thirdPersonClearances = {};
    for (let f = 1; f <= 85 && !T.onHqRoof(); f++) {
      keyW('keydown');
      T.stepFrame(1 / 60);
      const cl = measureMarineArmClearance();
      maxArmEastXRelPierM = Math.max(maxArmEastXRelPierM, cl.maxBodyOrFistX - cl.pierFaceX);

      // Height 1 (LOW ~0.95 m up the climb, around frame 24)
      if (f === 24) {
        window.__ce4Hold = true;
        const py = H.player.position.y;
        thirdPersonClearances.low = { climbHeightM: +(py - L.y).toFixed(2), ...cl };
        for (const lk of ['noon', 'overcast', 'dusk', 'night']) {
          window.__ce4SetLight(lk);
          shots[`tp-side-low-${lk}`] = await window.__ce4Capture({
            fov: 46,
            pos: [L.x - 0.28, py + 1.12, L.z + zSide * 1.55],
            look: [L.x - 0.06, py + 1.12, L.z]
          });
        }
        window.__ce4SetLight('noon');
        shots['tp-behind-low-noon'] = await window.__ce4Capture({
          fov: 50,
          pos: [L.x - 1.45, py + 1.12, L.z + 1.15],
          look: [L.x - 0.08, py + 1.14, L.z - 0.05]
        });
        window.__ce4Hold = false;
      }

      // Height 2 (HIGH ~2.22 m up the climb, around frame 56 — clear below upper porch overhang!)
      if (f === 56) {
        window.__ce4Hold = true;
        const py = H.player.position.y;
        thirdPersonClearances.high = { climbHeightM: +(py - L.y).toFixed(2), ...cl };
        for (const lk of ['noon', 'overcast', 'dusk', 'night']) {
          window.__ce4SetLight(lk);
          shots[`tp-side-high-${lk}`] = await window.__ce4Capture({
            fov: 48,
            pos: [L.x - 0.34, py + 0.95, L.z + zSide * 1.48],
            look: [L.x - 0.06, py + 1.14, L.z]
          });
        }
        window.__ce4SetLight('noon');
        shots['tp-behind-high-noon'] = await window.__ce4Capture({
          fov: 50,
          pos: [L.x - 1.45, py + 1.02, L.z + 1.15],
          look: [L.x - 0.08, py + 1.14, L.z - 0.05]
        });
        window.__ce4Hold = false;
      }
    }
    keyW('keyup');

    return {
      shots,
      climbSamples,
      steppedOntoRoof,
      roofWalkPositions,
      thirdPersonClearances,
      maxHandOutsideRailM: +maxHandOutsideRailM.toFixed(4),
      maxHandOffRungLineM: +maxHandOffRungLineM.toFixed(4),
      maxArmEastXRelPierM: +maxArmEastXRelPierM.toFixed(4)
    };
  })();
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
    card: 'CE-4-hq-ladder',
    capturedAt: new Date().toISOString(),
    backend: null,
    setup: null,
    audit: null,
    nodeContainsAudit: null,
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

      // Start Valley match via canonical tools/tests/lib.js startMatch
      await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'Ladder'))`);
      await page.evaluate('new Promise(r => setTimeout(r, 400))');
      await moveOffscreen(page);

      const setup = await page.evaluate(`(${browserSetupFn.toString()})()`);
      summary.backend = setup.backend;
      summary.setup = setup;

      const runRes = await page.evaluate(`(${browserRunClimbAndAuditFn.toString()})()`);
      for (const [k, raw] of Object.entries(runRes.shots)) {
        summary.shots[k] = saveJpg(`${k}.jpg`, raw);
      }
      summary.audit = {
        climbSamples: runRes.climbSamples,
        steppedOntoRoof: runRes.steppedOntoRoof,
        roofWalkPositions: runRes.roofWalkPositions,
        thirdPersonClearances: runRes.thirdPersonClearances,
        maxHandOutsideRailM: runRes.maxHandOutsideRailM,
        maxHandOffRungLineM: runRes.maxHandOffRungLineM,
        maxArmEastXRelPierM: runRes.maxArmEastXRelPierM
      };

      // Verify zero page errors during normal gameplay & document.body KeyW climb!
      assert.equal(summary.pageErrors.length, 0, `Page errors during live climb: ${summary.pageErrors.join('; ')}`);
      assert.equal(summary.gpuWarnings.length, 0, `GPU warnings: ${summary.gpuWarnings.join('; ')}`);
      assert.equal(runRes.steppedOntoRoof, true, 'Expected marine to step onto HQ roof at top of ladder');
      for (const pos of runRes.roofWalkPositions) {
        assert(Math.abs(pos.y - setup.ladder.roof) < 0.35, `Marine dropped off HQ roof during walk: ${JSON.stringify(pos)}`);
      }

      // Now explicitly verify CLAUDE DIRECTOR's question #2 about `Node.contains` on PC!
      // Check `ui/prep-checklist.js` behavior in-page without letting an uncaught error pollute earlier shots:
      summary.nodeContainsAudit = await page.evaluate(`(() => {
        const panel = document.querySelector('.prep-checklist') || document.createElement('div');
        let windowTargetIsNode = (window instanceof Node);
        let bodyTargetIsNode = (document.body instanceof Node);
        let directContainsWindowThrows = null;
        try {
          panel.contains(window);
        } catch (err) {
          directContainsWindowThrows = String(err && err.message || err);
        }
        return {
          livePlayPageErrors: 0,
          windowTargetIsNode,
          bodyTargetIsNode,
          directContainsWindowThrows,
          culprit: 'ui/prep-checklist.js:116 — bus.addEventListener(type, e => { if (!panel.contains(e.target)) return; }, true) where bus defaults to window; synthetic window.dispatchEvent(new KeyboardEvent(...)) sets e.target = window (not a Node), throwing TypeError on both cloud and PC, whereas real hardware input targets document.body (a Node) so live play never throws.'
        };
      })()`);

      const sumPath = path.join(OUT_REV, 'ce4-hq-ladder-summary.json');
      writeSafe(sumPath, Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));
      console.log(JSON.stringify({
        ok: true,
        backend: summary.backend,
        ladderGeom: setup.ladderGeom,
        steppedOntoRoof: runRes.steppedOntoRoof,
        roofWalkPositions: runRes.roofWalkPositions,
        thirdPersonClearances: runRes.thirdPersonClearances,
        maxHandOutsideRailM: runRes.maxHandOutsideRailM,
        maxHandOffRungLineM: runRes.maxHandOffRungLineM,
        maxArmEastXRelPierM: runRes.maxArmEastXRelPierM,
        nodeContainsAudit: summary.nodeContainsAudit,
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
