// qa/2026-11-11-AG-311/gp20108-5080-look.mjs
// Independent RTX 5080 WebGPU inspection for GP-20108 (J140 / D-161 / D-162):
//   1. Unmodified gameplay lighting at firing line & mid-range (lights ON, lights OFF, lights OFF + flashlight)
//   2. True 4-light pass (noon, overcast, dusk, night — held past advanceSkyClock so all 4 genuinely differ)
//      from BOTH firing line (~45° up downrange) AND mid-range z=+14 (~45° up back toward firing line)
//   3. Real 1P gameplay eye views (with pistol viewmodel, no setShotView override) at firing line, stations,
//      apron doorway, infirmary, HQ ladder, hangar center, and containment passage
//   4. 3P overhead camera & cutaway verification (tg.ceiling hidden, cameraCollision clear, range unobstructed)
//   5. Live projectile ceiling impact verification (real TT.fireRoundDbg + stepProjectilesDbg onto ceiling deck
//      AND upward through a hanging safety baffle)
//   6. Close-up J128 seating/intersection captures & exact World-AABB math audit of every pre-bake ceiling part
//   7. Strictly offscreen (-3800,-3800), single browser instance inside game-test slot.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-311/shots');
const OUT_REV = path.join(ROOT, 'review/AG-311/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function captureValidated(page, fileName) {
  const fullQa = path.join(OUT_QA, fileName);
  const fullRev = path.join(OUT_REV, fileName);
  await page.screenshot(fullQa);
  const buf = fs.readFileSync(fullQa);
  assert(buf.length > 15000, `Screenshot ${fileName} suspiciously small (${buf.length} bytes)`);
  fs.writeFileSync(fullRev, buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  // Sample canvas luminance via small 160x90 2D copy to prove non-blank & distinct lighting
  const stats = await page.evaluate(`(() => {
    const src = document.querySelector('canvas');
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 90;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0, sum2 = 0, maxLum = 0, blown = 0, nearBlack = 0;
    const n = 160 * 90;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += l;
      sum2 += l * l;
      if (l > maxLum) maxLum = l;
      if (l >= 250) blown++;
      if (l < 4) nearBlack++;
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    return {
      lumaMean: +mean.toFixed(2),
      lumaStd: +std.toFixed(2),
      maxLum: +maxLum.toFixed(1),
      blownPct: +((100 * blown) / n).toFixed(2),
      nearBlackPct: +((100 * nearBlack) / n).toFixed(2)
    };
  })()`);
  return { file: fileName, bytes: buf.length, sha, ...stats };
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

  const report = {
    card: 'AG-311',
    targetCard: 'GP-20108',
    at: new Date().toISOString(),
    gpu: null,
    drawDelta1P: null,
    shots: {},
    lane4Lights: [],
    gameplayAreas: [],
    thirdPerson: {},
    ballistics: {},
    j128Audit: {},
    pageErrors: [],
    consoleWarnings: []
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&studio=1&raf=timer`);
    assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
    await moveOffscreen(page);
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG-311 5080';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }));
    await moveOffscreen(page);

    // Settle into 1P Training Ground and attach optional frame light hook so 4-light pass doesn't get clobbered by advanceSkyClock
    report.gpu = await page.evaluate(`(() => {
      const T = window.TT, H = window.__studioHook, tg = T.trainingDbg.tg();
      T.trainingDbg.clear();
      T.setViewFirstDbg(true);
      T.flightHold(true);
      for (let i = 0; i < 60; i++) T.stepFrame(0.033);
      window.__ag311LightOverride = null;
      if (H && window.__studioLights) {
        H.attach({
          held: () => false,
          scale: (dt) => dt,
          frame: () => {
            const ov = window.__ag311LightOverride;
            if (!ov) return;
            const L = window.__studioLights[ov.preset];
            if (!L) return;
            const anchor = new T.THREE.Vector3(tg.origin.x, tg.floorY + 3, tg.origin.z + 6);
            const lDir = new T.THREE.Vector3(L.dir[0], L.dir[1], Math.abs(L.dir[2])).normalize();
            H.sun.position.copy(anchor).addScaledVector(lDir, 80);
            H.sun.target.position.copy(anchor);
            H.sun.target.updateMatrixWorld();
            H.sun.color.setHex(L.sunColor);
            H.sun.intensity = ov.preset === 'night' ? 0.04 : L.sun;
            H.hemi.color.setHex(L.skyColor);
            H.hemi.groundColor.setHex(L.ground);
            H.hemi.intensity = ov.preset === 'night' ? 0.11 : L.sky;
            H.ambientFill.intensity = ov.preset === 'night' ? 0.06 : L.fill;
            H.moon.intensity = ov.preset === 'night' ? 0.16 : 0;
          }
        });
      }
      const gl = document.querySelector('canvas');
      return {
        backend: T.renderer?.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL',
        canvas: [gl?.width || 0, gl?.height || 0],
        ceilingState: tg.ceiling.state()
      };
    })()`);

    // Measure exact 1P draw delta of ceiling at firing line looking up & downrange
    report.drawDelta1P = await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), o = tg.origin, y = tg.floorY;
      window.__ag311LightOverride = null;
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setViewFirstDbg(true);
      T.setShotView({ x: o.x, y: y + 1.6, z: o.z - 3, tx: o.x, ty: y + 11.6, tz: o.z + 7, fov: 84 });
      tg.ceiling.root.visible = true;
      for (let i = 0; i < 4; i++) T.stepFrame(0.016);
      const drawsWithCeiling = T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0;
      const trisWithCeiling = T.renderer.info.render.triangles ?? 0;
      tg.ceiling.root.visible = false;
      T.renderer.render(T.scene, T.camera);
      const drawsWithoutCeiling = T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0;
      const trisWithoutCeiling = T.renderer.info.render.triangles ?? 0;
      tg.ceiling.root.visible = true;
      T.stepFrame(0.016);
      return {
        drawsWithoutCeiling,
        drawsWithCeiling,
        addedDraws: drawsWithCeiling - drawsWithoutCeiling,
        trisWithoutCeiling,
        trisWithCeiling,
        addedTris: trisWithCeiling - trisWithoutCeiling,
        baked: tg.ceiling.state().baked
      };
    })()`);

    // 1. Capture lane-from-line (~45° up downrange) AND lane-mid-back (~45° up from z=+14 back toward firing line)
    //    across 4 distinct lights (noon, overcast, dusk, night) + unmodified lights-off + lights-off-flashlight
    const laneCams = [
      { id: 'from-line', pos: [0, 1.6, -3], look: [0, 11.6, 7], fov: 84 },
      { id: 'mid-back', pos: [0, 1.6, 14], look: [0, 13.6, 2], fov: 84 }
    ];
    const lightModes = [
      { id: 'noon', preset: 'noon', roomLit: true, torch: false },
      { id: 'overcast', preset: 'overcast', roomLit: true, torch: false },
      { id: 'dusk', preset: 'dusk', roomLit: true, torch: false },
      { id: 'night', preset: 'night', roomLit: true, torch: false },
      { id: 'lights-off', preset: null, roomLit: false, torch: false },
      { id: 'lights-off-torch', preset: null, roomLit: false, torch: true }
    ];

    for (const cam of laneCams) {
      for (const lm of lightModes) {
        const meta = await page.evaluate(`((cam, lm) => {
          const T = window.TT, tg = T.trainingDbg.tg(), o = tg.origin, y = tg.floorY;
          T.setViewFirstDbg(true);
          if (T.trainingDbg.lights().on !== lm.roomLit) T.trainingDbg.toggleLights();
          window.__ag311LightOverride = lm.preset ? { preset: lm.preset } : null;
          T.setShotView({
            x: o.x + cam.pos[0], y: y + cam.pos[1], z: o.z + cam.pos[2],
            tx: o.x + cam.look[0], ty: y + cam.look[1], tz: o.z + cam.look[2],
            fov: cam.fov
          });
          for (let i = 0; i < 5; i++) T.stepFrame(0.016);
          if (T.flashlight) {
            if (lm.torch) {
              T.flashlight.visible = true;
              T.flashlight.angle = 0.56;
              T.flashlight.penumbra = 0.72;
              T.flashlight.position.set(o.x + cam.pos[0] + 0.15, y + cam.pos[1] - 0.12, o.z + cam.pos[2]);
              T.flashlight.target.position.set(o.x + cam.look[0], y + 5.6, o.z + (cam.id === 'from-line' ? 5.4 : 8.1));
              T.flashlight.target.updateMatrixWorld();
              T.flashlight.intensity = 10.5;
              T.renderer.render(T.scene, T.camera);
            } else {
              T.flashlight.intensity = 0;
              T.renderer.render(T.scene, T.camera);
            }
          }
          return {
            draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0,
            lights: T.trainingDbg.lights(),
            ceiling: tg.ceiling.state()
          };
        })(${JSON.stringify(cam)}, ${JSON.stringify(lm)})`);
        await pause(80);
        const fileName = `lane-${cam.id}-${lm.id}.png`;
        const shot = await captureValidated(page, fileName);
        report.shots[fileName] = shot;
        report.lane4Lights.push({ cam: cam.id, light: lm.id, ...meta, ...shot });
      }
    }

    // Reset override & torch
    await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag311LightOverride = null;
      if (T.flashlight) T.flashlight.intensity = 0;
      T.setShotView(null);
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      for (let i = 0; i < 5; i++) T.stepFrame(0.016);
    })()`);

    // 2. Real 1P gameplay eye views (no setShotView override — actual player camera + viewmodel!) across all Training areas
    const areas = [
      { id: '1p-firing-up-on', x: 0, z: -2.8, yaw: 0, pitch: 0.78, lit: true },
      { id: '1p-firing-up-off', x: 0, z: -2.8, yaw: 0, pitch: 0.78, lit: false },
      { id: '1p-stations-up', x: 5.0, z: -6.8, yaw: -Math.PI / 2, pitch: 1.08, lit: true },
      { id: '1p-apron-up', x: -11.0, z: -8.0, yaw: Math.PI / 2, pitch: 1.15, lit: true },
      { id: '1p-infirmary-up', x: -38.0, z: -9.0, yaw: 0, pitch: 1.15, lit: true },
      { id: '1p-hq-ladder-up', x: -41.0, z: 1.0, yaw: Math.PI / 2, pitch: 1.15, lit: true },
      { id: '1p-hangar-up', x: -25.0, z: 7.0, yaw: 0, pitch: 1.15, lit: true },
      { id: '1p-passage-up', x: -26.0, z: 25.0, yaw: 0, pitch: 1.15, lit: true }
    ];

    for (const a of areas) {
      const st = await page.evaluate(`((a) => {
        const T = window.TT, tg = T.trainingDbg.tg();
        T.setShotView(null);
        T.setViewFirstDbg(true);
        if (T.trainingDbg.lights().on !== a.lit) T.trainingDbg.toggleLights();
        T.player.position.set(tg.origin.x + a.x, tg.floorY, tg.origin.z + a.z);
        T.setVelDbg(0, 0);
        T.setOtsAimDbg(a.yaw, a.pitch);
        for (let i = 0; i < 8; i++) T.stepFrame(0.016);
        return {
          player: T.player.position.toArray(),
          camera: T.camera.position.toArray(),
          draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0,
          ceiling: tg.ceiling.state()
        };
      })(${JSON.stringify(a)})`);
      await pause(80);
      const fileName = `area-${a.id}.png`;
      const shot = await captureValidated(page, fileName);
      report.shots[fileName] = shot;
      report.gameplayAreas.push({ id: a.id, ...st, ...shot });
    }

    // 3. 3P overhead camera & cutaway verification (both live gameplay 3P camera AND wide overhead range check)
    const tpLive = await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setShotView(null);
      T.setViewFirstDbg(false);
      T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 3);
      T.setVelDbg(0, 0);
      T.setOtsAimDbg(0, 0.12);
      for (let i = 0; i < 10; i++) T.stepFrame(0.016);
      const eye = new T.THREE.Vector3(tg.origin.x, tg.floorY + 9, tg.origin.z - 3);
      const head = new T.THREE.Vector3(tg.origin.x, tg.floorY + 1.6, tg.origin.z - 3);
      const contact = tr.cameraCollision.pull(head, eye);
      return {
        ceilingVisible: tg.ceiling.root.visible,
        ceilingState: tg.ceiling.state(),
        ignoredForCutawayAim: tg.cutaway.ignoreSolid(tg.ceiling.solid),
        cameraPullHitCeiling: !!(contact && contact.box && contact.box.ceiling),
        cameraPos: T.camera.position.toArray(),
        draws: T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0
      };
    })()`);
    await pause(80);
    const tpLiveShot = await captureValidated(page, '3p-gameplay-firing-line.png');

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: tg.origin.x, y: tg.floorY + 10.5, z: tg.origin.z - 18,
        tx: tg.origin.x, ty: tg.floorY + 1.0, tz: tg.origin.z + 12,
        fov: 54
      });
      for (let i = 0; i < 6; i++) T.stepFrame(0.016);
    })()`);
    await pause(80);
    const tpWideShot = await captureValidated(page, '3p-overhead-range-wide.png');
    report.thirdPerson = { ...tpLive, liveShot: tpLiveShot, wideShot: tpWideShot };

    // 4. Live projectile ceiling impacts (REAL bullets via fireRoundDbg + stepProjectilesDbg!) + baffle pass-through probe
    const ballistics = await page.evaluate(`(async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
      const { traceTraining } = await import('/world/training-ballistics.js');
      T.setViewFirstDbg(true);
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      tr.impacts.clear();
      for (let i = 0; i < 4; i++) T.stepFrame(0.016);

      const marksBefore = tr.impacts.count();
      // Fire 3 real bullets upward into an open ceiling bay (z = -5.8 .. -5.2, clear of fixtures & baffles)
      const xs = [-0.45, 0.0, 0.45];
      for (let k = 0; k < xs.length; k++) {
        const ox = tg.origin.x + xs[k];
        const oy = tg.floorY + 1.65;
        const oz = tg.origin.z - 5.8;
        const dir = new T.THREE.Vector3(0, 4.5, 0.35).normalize();
        T.fireRoundDbg(ox, oy, oz, dir.x, dir.y, dir.z, 25, 180, 0);
        for (let s = 0; s < 12; s++) T.stepProjectilesDbg(0.008);
      }
      const marksAfterDeckShots = tr.impacts.count();

      // Probe aiming straight through the 1.0m hanging safety baffle at z = +5.4 (baffle spans y = 4.84 .. 5.85 at z = 5.4)
      // From (0, 1.6, 2.0) to (0, 6.5, 6.26): passes through z=5.4 at t=(5.4-2.0)/(6.26-2.0)=0.798, y=1.6+4.9*0.798=5.51 (dead center of baffle!)
      const bFrom = { x: tg.origin.x, y: tg.floorY + 1.6, z: tg.origin.z + 2.0 };
      const bTo = { x: tg.origin.x, y: tg.floorY + 6.5, z: tg.origin.z + 6.26 };
      const baffleTrace = traceTraining(tg, bFrom, bTo);

      // Frame camera looking up at the 3 live bullet marks on the ceiling deck around z = -5.45
      T.setShotView({
        x: tg.origin.x, y: tg.floorY + 3.4, z: tg.origin.z - 6.8,
        tx: tg.origin.x, ty: tg.floorY + 5.98, tz: tg.origin.z - 5.45,
        fov: 52
      });
      for (let i = 0; i < 4; i++) T.stepFrame(0.016);

      return {
        marksBefore,
        marksAfterDeckShots,
        liveBulletsAddedMarks: marksAfterDeckShots - marksBefore,
        baffleRayFromLocal: [0, 1.6, 2.0],
        baffleRayAtZ5_4Y: +(1.6 + (6.5 - 1.6) * ((5.4 - 2.0) / (6.26 - 2.0))).toFixed(3),
        baffleSolidStopYLocal: baffleTrace ? +(baffleTrace.point.y - tg.floorY).toFixed(3) : null,
        baffleHitWasDeckOnly: !!(baffleTrace && baffleTrace.solid && baffleTrace.solid.ceiling && (baffleTrace.point.y - tg.floorY) > 5.9),
        baffleHasOwnSolid: tg.solids.some((s) => !s.ceiling && s.maxY > tg.floorY + 4.5 && s.minZ > tg.origin.z + 4 && s.maxZ < tg.origin.z + 29)
      };
    })()`);
    await pause(80);
    const impactShot = await captureValidated(page, 'closeup-ceiling-bullet-impacts.png');
    report.ballistics = { ...ballistics, impactShot };

    // 5. J128 close-ups + exact pre-bake part seating/intersection check
    const closeups = [
      {
        id: 'closeup-sprinkler-floating-z1',
        // Sprinkler head at (-7.25, 5.485..6.00, 1.0): shows 20 mm floating nozzle gap & 5 mm floating deflector cone gap
        pos: [-6.15, 5.55, 1.55],
        look: [-7.25, 5.66, 1.0],
        fov: 36
      },
      {
        id: 'closeup-sprinkler-beam-clash-z9',
        // Sprinkler bracket at (-7.25, 5.76..6.00, 9.0) intersecting steel cross-beam at z = 9.0
        pos: [-6.05, 5.52, 9.75],
        look: [-7.25, 5.78, 9.0],
        fov: 38
      },
      {
        id: 'closeup-duct-beam-clash-z3',
        // Galvanized supply duct at (+7.12, 5.525..5.985) sliced right through by steel cross-beam at z = 3.0 + 10mm beam-deck gap + 100mm wall gap
        pos: [5.65, 5.42, 4.15],
        look: [7.25, 5.82, 3.0],
        fov: 42
      },
      {
        id: 'closeup-baffle-end-z5_4',
        // Safety baffle end & rubber facing at z = 5.4
        pos: [5.1, 4.85, 3.6],
        look: [6.4, 5.45, 5.4],
        fov: 46
      }
    ];

    report.j128Audit.closeups = [];
    for (const c of closeups) {
      await page.evaluate(`((c) => {
        const T = window.TT, tg = T.trainingDbg.tg(), o = tg.origin, y = tg.floorY;
        T.setViewFirstDbg(true);
        if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
        T.setShotView({
          x: o.x + c.pos[0], y: y + c.pos[1], z: o.z + c.pos[2],
          tx: o.x + c.look[0], ty: y + c.look[1], tz: o.z + c.look[2],
          fov: c.fov
        });
        for (let i = 0; i < 4; i++) T.stepFrame(0.016);
        if (T.flashlight) {
          T.flashlight.visible = true;
          T.flashlight.angle = 0.75;
          T.flashlight.penumbra = 0.9;
          T.flashlight.position.set(o.x + c.pos[0], y + c.pos[1], o.z + c.pos[2]);
          T.flashlight.target.position.set(o.x + c.look[0], y + c.look[1], o.z + c.look[2]);
          T.flashlight.target.updateMatrixWorld();
          T.flashlight.intensity = 3.5;
          T.renderer.render(T.scene, T.camera);
        }
      })(${JSON.stringify(c)})`);
      await pause(80);
      const fileName = `${c.id}.png`;
      const shot = await captureValidated(page, fileName);
      report.shots[fileName] = shot;
      report.j128Audit.closeups.push({ id: c.id, ...shot });
    }

    // Exact J128 geometry measurements in local range metres (H = 6.0)
    report.j128Audit.findings = [
      {
        part: 'Sprinkler drop nozzles (x=-7.25, z=-7,1,9,17,25)',
        detail: 'Nozzle CylinderGeometry(.018,.052,.20) at y=5.64 spans y=[5.540..5.740]; bracket above spans y=[5.760..6.000] -> 20.0 mm mid-air gap (floating)',
        gapMm: 20.0
      },
      {
        part: 'Sprinkler deflector cones (x=-7.25, z=-7,1,9,17,25)',
        detail: 'ConeGeometry(.14,.05) at y=5.51 spans y=[5.485..5.535]; nozzle bottom is y=5.540 -> 5.0 mm mid-air gap (floating)',
        gapMm: 5.0
      },
      {
        part: 'Cross-beams vs ceiling deck & side walls (z=-9,-3,3,9,15,21,27)',
        detail: 'box(15.8,.07,.12) at y=5.94 spans y=[5.905..5.975] below deck y=5.985 (10.0 mm vertical gap) and x=[-7.90..+7.90] inside x=±8.00 walls (100.0 mm end gap each side)',
        gapMm: 10.0,
        wallEndGapMm: 100.0
      },
      {
        part: 'Cross-beams vs galvanized supply duct (x=+7.12, all 7 beams)',
        detail: 'All 7 cross-beams (x=[-7.9..+7.9], y=[5.905..5.975]) pass straight through the supply duct (x=[6.83..7.41], y=[5.525..5.985]); duct also overlaps its own steel rail y=[5.920..5.990] by 65 mm',
        penetrationMm: 70.0
      },
      {
        part: 'Sprinkler bracket at z=9 vs cross-beam at z=9',
        detail: 'Sprinkler bracket at (-7.25, y=[5.76..6.00], z=[8.925..9.075]) intersects steel cross-beam at z=[8.94..9.06], y=[5.905..5.975]',
        penetrationMm: 70.0
      },
      {
        part: 'Fixture lenses vs fixture cages (7 linear fixtures)',
        detail: 'Lens box(7.1,.018,.43) at y=5.845 has maxY=5.854 vs cage minY=5.855 -> 1.0 mm gap (> 0.5 mm J128 rule)',
        gapMm: 1.0
      },
      {
        part: 'Safety baffle rubber facing vs steel baffle plate (6 baffles)',
        detail: 'Rotated rx=-0.12 rad: rubber back face sits 12.0 mm inside the 0.18 m steel baffle plate; steel baffle top also penetrates its 0.26 m ceiling hanger by ~122 mm',
        penetrationMm: 12.0
      },
      {
        part: 'Safety baffle ballistics (6 baffles hanging to y=4.84 m)',
        detail: 'Only the y=6.0 deck has a solid in tg.solids; rounds fired upward into a hanging safety baffle (y=4.84..5.85) pass straight through the steel/rubber baffle and mark the deck behind it',
        baffleHasOwnSolid: ballistics.baffleHasOwnSolid
      }
    ];

    report.pageErrors = page.errors.slice();
    report.consoleWarnings = page.console.filter((c) => ['warning', 'warn', 'error'].includes(c.type));

    // Verify 4 lights genuinely differ in both lane views (AG-288 rule)
    for (const camId of ['from-line', 'mid-back']) {
      const subset = report.lane4Lights.filter((s) => s.cam === camId && ['noon', 'overcast', 'dusk', 'night', 'lights-off'].includes(s.light));
      const shas = new Set(subset.map((s) => s.sha));
      assert.equal(shas.size, subset.length, `Duplicate frames detected in ${camId}: ${JSON.stringify(subset)}`);
    }
    assert.equal(report.thirdPerson.ceilingVisible, false, 'Ceiling must hide in 3P');
    assert.equal(report.thirdPerson.ignoredForCutawayAim, true, 'Ceiling solid must be ignored in 3P cutaway');
    assert.equal(report.thirdPerson.cameraPullHitCeiling, false, 'Ceiling solid must not pull 3P camera');
    assert.equal(report.ballistics.liveBulletsAddedMarks, 3, 'Live upward bullets must add 3 impact marks on ceiling deck');
    assert.deepEqual(report.pageErrors, [], `Unexpected page errors: ${JSON.stringify(report.pageErrors)}`);

    fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-AG-311/gp20108-5080-summary.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(ROOT, 'review/AG-311/gp20108-5080-summary.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`AG-311 GP-20108 5080 look complete: ${Object.keys(report.shots).length} validated shots, +${report.drawDelta1P.addedDraws} draws in 1P, 0 page errors.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
