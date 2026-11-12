// qa/2026-11-11-AG-311/gp20108-5080-v3.mjs
// Deterministic RTX 5080 WebGPU inspection for GP-20108 (J140 / D-161 / D-164):
//   - Uses window.TT.inspectHost().attach(...) so rAF keeps presenting to Chrome's compositor while
//     locking world light (noon, overcast, dusk, night) & torch right before renderFrame() on every tick.

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
  return { file: fileName, bytes: buf.length, sha };
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
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
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

    // Attach inspectHost hook so rAF continues presenting frames while holding light presets & torch right before renderFrame()
    report.gpu = await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), host = T.inspectHost();
      T.trainingDbg.clear();
      T.setViewFirstDbg(true);
      T.flightHold(true);
      for (let i = 0; i < 150; i++) T.stepFrame(0.04);

      const PRESETS = {
        noon:     { sunHex: 0xfff7e8, sun: 1.73, skyHex: 0x87b7ff, gndHex: 0x3f433d, hemi: 0.68, fill: 0.04, moon: 0.05 },
        overcast: { sunHex: 0xc9d5e2, sun: 0.42, skyHex: 0x9aa9ba, gndHex: 0x3b4044, hemi: 0.86, fill: 0.14, moon: 0.02 },
        dusk:     { sunHex: 0xff9152, sun: 0.58, skyHex: 0xc47a4a, gndHex: 0x2d2420, hemi: 0.34, fill: 0.06, moon: 0.12 },
        night:    { sunHex: 0x4b6288, sun: 0.03, skyHex: 0x0a1322, gndHex: 0x090c10, hemi: 0.15, fill: 0.05, moon: 0.38 }
      };
      window.__ag311State = { preset: null, torch: null };

      host.attach({
        held: () => false,
        scale: (dt) => dt,
        frame: () => {
          const st = window.__ag311State;
          if (st.preset && PRESETS[st.preset]) {
            const P = PRESETS[st.preset];
            host.sun.color.setHex(P.sunHex);
            host.sun.intensity = P.sun;
            host.hemi.color.setHex(P.skyHex);
            host.hemi.groundColor.setHex(P.gndHex);
            host.hemi.intensity = P.hemi;
            host.ambientFill.intensity = P.fill;
            host.moon.intensity = P.moon;
          }
          if (T.flashlight) {
            if (st.torch) {
              T.flashlight.visible = true;
              T.flashlight.angle = st.torch.angle;
              T.flashlight.penumbra = st.torch.penumbra;
              T.flashlight.position.set(st.torch.px, st.torch.py, st.torch.pz);
              T.flashlight.target.position.set(st.torch.tx, st.torch.ty, st.torch.tz);
              T.flashlight.target.updateMatrixWorld();
              T.flashlight.intensity = st.torch.intensity;
            } else {
              T.flashlight.intensity = 0;
            }
          }
        }
      });

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
      window.__ag311State = { preset: null, torch: null };
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setViewFirstDbg(true);
      T.setShotView({ x: o.x, y: y + 1.6, z: o.z - 3, tx: o.x, ty: y + 11.6, tz: o.z + 7, fov: 84 });
      tg.ceiling.root.visible = true;
      T.stepFrame(0.016);
      T.renderer.info.reset();
      T.renderer.render(T.scene, T.camera);
      const drawsWithCeiling = T.renderer.info.render.drawCalls ?? T.renderer.info.render.calls ?? 0;
      const trisWithCeiling = T.renderer.info.render.triangles ?? 0;
      tg.ceiling.root.visible = false;
      T.renderer.info.reset();
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

    // 1. Firing line (~45° up downrange) & mid-range z=+14 (~45° up back toward firing line) across 4 genuine world lights + lights-off + torch
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
          window.__ag311State = {
            preset: lm.preset,
            torch: lm.torch ? {
              px: o.x + cam.pos[0] + 0.15, py: y + cam.pos[1] - 0.12, pz: o.z + cam.pos[2],
              tx: o.x + cam.look[0], ty: y + 5.5, tz: o.z + (cam.id === 'from-line' ? 5.4 : 8.1),
              angle: 0.58, penumbra: 0.72, intensity: 14.0
            } : null
          };
          T.setShotView({
            x: o.x + cam.pos[0], y: y + cam.pos[1], z: o.z + cam.pos[2],
            tx: o.x + cam.look[0], ty: y + cam.look[1], tz: o.z + cam.look[2],
            fov: cam.fov
          });
          for (let i = 0; i < 3; i++) T.stepFrame(0.016);
          return {
            lights: T.trainingDbg.lights(),
            ceiling: tg.ceiling.state()
          };
        })(${JSON.stringify(cam)}, ${JSON.stringify(lm)})`);
        await pause(120);
        const fileName = `lane-${cam.id}-${lm.id}.png`;
        const shot = await captureValidated(page, fileName);
        report.shots[fileName] = shot;
        report.lane4Lights.push({ cam: cam.id, light: lm.id, ...meta, ...shot });
      }
    }

    // Reset state
    await page.evaluate(`(() => {
      const T = window.TT;
      window.__ag311State = { preset: null, torch: null };
      T.setShotView(null);
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      for (let i = 0; i < 4; i++) T.stepFrame(0.016);
    })()`);

    // 2. Real 1P gameplay eye views across all Training Ground zones
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
        window.__ag311State = { preset: null, torch: null };
        T.setShotView(null);
        T.setViewFirstDbg(true);
        if (T.trainingDbg.lights().on !== a.lit) T.trainingDbg.toggleLights();
        T.player.position.set(tg.origin.x + a.x, tg.floorY, tg.origin.z + a.z);
        T.setVelDbg(0, 0);
        T.setOtsAimDbg(a.yaw, a.pitch);
        for (let i = 0; i < 6; i++) T.stepFrame(0.016);
        return {
          player: T.player.position.toArray(),
          camera: T.camera.position.toArray(),
          ceiling: tg.ceiling.state()
        };
      })(${JSON.stringify(a)})`);
      await pause(120);
      const fileName = `area-${a.id}.png`;
      const shot = await captureValidated(page, fileName);
      report.shots[fileName] = shot;
      report.gameplayAreas.push({ id: a.id, ...st, ...shot });
    }

    // 3. 3P overhead camera & cutaway verification
    const tpLive = await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
      window.__ag311State = { preset: null, torch: null };
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      T.setShotView(null);
      T.setViewFirstDbg(false);
      T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 3);
      T.setVelDbg(0, 0);
      T.setOtsAimDbg(0, 0.12);
      for (let i = 0; i < 8; i++) T.stepFrame(0.016);
      const eye = new T.THREE.Vector3(tg.origin.x, tg.floorY + 9, tg.origin.z - 3);
      const head = new T.THREE.Vector3(tg.origin.x, tg.floorY + 1.6, tg.origin.z - 3);
      const contact = tr.cameraCollision.pull(head, eye);
      return {
        ceilingVisible: tg.ceiling.root.visible,
        ceilingState: tg.ceiling.state(),
        ignoredForCutawayAim: tg.cutaway.ignoreSolid(tg.ceiling.solid),
        cameraPullHitCeiling: !!(contact && contact.box && contact.box.ceiling),
        cameraPos: T.camera.position.toArray()
      };
    })()`);
    await pause(120);
    const tpLiveShot = await captureValidated(page, '3p-gameplay-firing-line.png');

    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg();
      T.setShotView({
        x: tg.origin.x, y: tg.floorY + 10.5, z: tg.origin.z - 18,
        tx: tg.origin.x, ty: tg.floorY + 1.0, tz: tg.origin.z + 12,
        fov: 54
      });
      for (let i = 0; i < 4; i++) T.stepFrame(0.016);
    })()`);
    await pause(120);
    const tpWideShot = await captureValidated(page, '3p-overhead-range-wide.png');
    report.thirdPerson = { ...tpLive, liveShot: tpLiveShot, wideShot: tpWideShot };

    // 4. Live projectile ceiling impacts (5 real bullets fired upward into ceiling deck + upward baffle pass-through probe)
    const ballistics = await page.evaluate(`(async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), tr = T.trainingDbg.state();
      const { traceTraining } = await import('/world/training-ballistics.js');
      T.setViewFirstDbg(true);
      if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
      tr.impacts.clear();
      for (let i = 0; i < 3; i++) T.stepFrame(0.016);

      const marksBefore = tr.impacts.count();
      const offsets = [[-0.28, -5.55], [-0.14, -5.42], [0.0, -5.50], [0.15, -5.38], [0.29, -5.52]];
      for (const [dx, z0] of offsets) {
        const ox = tg.origin.x + dx;
        const oy = tg.floorY + 1.65;
        const oz = tg.origin.z + z0;
        const dir = new T.THREE.Vector3(0, 1.0, 0.04).normalize();
        T.fireRoundDbg(ox, oy, oz, dir.x, dir.y, dir.z, 25, 180, 0);
        for (let s = 0; s < 12; s++) T.stepProjectilesDbg(0.008);
      }
      const marksAfterDeckShots = tr.impacts.count();

      const bFrom = { x: tg.origin.x, y: tg.floorY + 1.6, z: tg.origin.z + 2.0 };
      const bTo = { x: tg.origin.x, y: tg.floorY + 6.5, z: tg.origin.z + 6.26 };
      const baffleTrace = traceTraining(tg, bFrom, bTo);

      window.__ag311State = {
        preset: null,
        torch: {
          px: tg.origin.x, py: tg.floorY + 4.82, pz: tg.origin.z - 6.05,
          tx: tg.origin.x, ty: tg.floorY + 5.98, tz: tg.origin.z - 5.30,
          angle: 0.72, penumbra: 0.85, intensity: 4.5
        }
      };
      T.setShotView({
        x: tg.origin.x, y: tg.floorY + 4.82, z: tg.origin.z - 6.05,
        tx: tg.origin.x, ty: tg.floorY + 5.98, tz: tg.origin.z - 5.30,
        fov: 46
      });
      for (let i = 0; i < 3; i++) T.stepFrame(0.016);

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
    await pause(120);
    const impactShot = await captureValidated(page, 'closeup-ceiling-bullet-impacts.png');
    report.shots['closeup-ceiling-bullet-impacts.png'] = impactShot;
    report.ballistics = { ...ballistics, impactShot };

    // 5. J128 close-ups + exact millimetre measurements
    const closeups = [
      { id: 'closeup-sprinkler-floating-z1', pos: [-6.15, 5.55, 1.55], look: [-7.25, 5.66, 1.0], fov: 36 },
      { id: 'closeup-sprinkler-beam-clash-z9', pos: [-6.05, 5.52, 9.75], look: [-7.25, 5.78, 9.0], fov: 38 },
      { id: 'closeup-duct-beam-clash-z3', pos: [5.65, 5.42, 4.15], look: [7.25, 5.82, 3.0], fov: 42 },
      { id: 'closeup-baffle-end-z5_4', pos: [5.1, 4.85, 3.6], look: [6.4, 5.45, 5.4], fov: 46 }
    ];

    report.j128Audit.closeups = [];
    for (const c of closeups) {
      await page.evaluate(`((c) => {
        const T = window.TT, tg = T.trainingDbg.tg(), o = tg.origin, y = tg.floorY;
        T.setViewFirstDbg(true);
        if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights();
        window.__ag311State = {
          preset: null,
          torch: {
            px: o.x + c.pos[0], py: y + c.pos[1], pz: o.z + c.pos[2],
            tx: o.x + c.look[0], ty: y + c.look[1], tz: o.z + c.look[2],
            angle: 0.75, penumbra: 0.9, intensity: 3.5
          }
        };
        T.setShotView({
          x: o.x + c.pos[0], y: y + c.pos[1], z: o.z + c.pos[2],
          tx: o.x + c.look[0], ty: y + c.look[1], tz: o.z + c.look[2],
          fov: c.fov
        });
        for (let i = 0; i < 3; i++) T.stepFrame(0.016);
      })(${JSON.stringify(c)})`);
      await pause(120);
      const fileName = `${c.id}.png`;
      const shot = await captureValidated(page, fileName);
      report.shots[fileName] = shot;
      report.j128Audit.closeups.push({ id: c.id, ...shot });
    }

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
        detail: 'box(15.8,.07,.12) at y=5.94 spans y=[5.905..5.975] below deck y=5.985 (10.0 mm vertical gap) and x=[-7.90..+7.90] inside x=+-8.00 walls (100.0 mm end gap each side)',
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

    report.shots['3p-gameplay-firing-line.png'] = tpLiveShot;
    report.shots['3p-overhead-range-wide.png'] = tpWideShot;
    report.pageErrors = page.errors.slice();
    report.consoleWarnings = page.console.filter((c) => ['warning', 'warn', 'error'].includes(c.type));

    for (const camId of ['from-line', 'mid-back']) {
      const subset = report.lane4Lights.filter((s) => s.cam === camId);
      const shas = new Set(subset.map((s) => s.sha));
      assert.equal(shas.size, subset.length, `Duplicate frames detected in ${camId}: ${JSON.stringify(subset)}`);
    }
    assert.equal(report.thirdPerson.ceilingVisible, false, 'Ceiling must hide in 3P');
    assert.equal(report.thirdPerson.ignoredForCutawayAim, true, 'Ceiling solid must be ignored in 3P cutaway');
    assert.equal(report.thirdPerson.cameraPullHitCeiling, false, 'Ceiling solid must not pull 3P camera');
    assert.equal(report.ballistics.liveBulletsAddedMarks, 5, 'Live upward bullets must add 5 impact marks on ceiling deck');
    assert.deepEqual(report.pageErrors, [], `Unexpected page errors: ${JSON.stringify(report.pageErrors)}`);

    fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-AG-311/gp20108-5080-summary.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(ROOT, 'review/AG-311/gp20108-5080-summary.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`AG-311 GP-20108 5080 v3 complete: ${Object.keys(report.shots).length} validated shots, +${report.drawDelta1P.addedDraws} draws in 1P, 0 page errors.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
