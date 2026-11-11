// qa/2026-11-11-AG-299/crew-looks-cd1-cb292.mjs
// Batched RTX 5080 WebGPU 4-light verification (strictly offscreen at -3800,-3800 while Jerry sleeps) for:
//   1. CD-1 fixes2 (Claude 1): Pump Shotgun firing hand (r) + GW-4 (m4) support hand (l)
//      - 1P hip & aimed in noon/overcast/dusk/night
//      - Close on shotgun right hand (eye, left, under) in noon/overcast/dusk/night
//      - Close on GW-4 left hand (eye, left, under) in noon/overcast/dusk/night
//   2. CB-292 (ChatGPT): Training Ground station wall contacts from review/CB-292/before-cameras.json + hqPanel
//      - cif, kiosk, armory, skullWindow, rangeConsole, hqPanel in noon/overcast/dusk/night + wall-gap metrics.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot: node crew/crew.mjs slot run antigravity AG-299 ...');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const PAINT_ONLY = process.argv.includes('--cb292-paint-only');

const OUT_CD1 = path.join(ROOT, 'review/CD-1/fixes2');
const OUT_CB292 = path.join(ROOT, 'review/CB-292/gpu');
fs.mkdirSync(OUT_CD1, { recursive: true });
fs.mkdirSync(OUT_CB292, { recursive: true });

async function writeRetry(fp, buf) {
  const tmp = `${fp}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  for (let a = 0; a < 25; a++) {
    try {
      await fs.promises.writeFile(tmp, buf);
      try { await fs.promises.unlink(fp); } catch (_) {}
      await fs.promises.rename(tmp, fp);
      return;
    } catch (e) {
      try { await fs.promises.unlink(tmp); } catch (_) {}
      if (a === 24) throw e;
      await new Promise((r) => setTimeout(r, 120 + a * 100));
    }
  }
}

async function moveWindowOffscreen(page) {
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

async function shotTo(page, fullPath) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  await writeRetry(fullPath, buf);
}

const beforeCameras = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/CB-292/before-cameras.json'), 'utf8'));

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

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await moveWindowOffscreen(page);
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await moveWindowOffscreen(page);
  assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));

  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
  await page.evaluate(`(() => {
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'CD1-CB292';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

  // Attach 4-light stage illuminator
  await page.evaluate(`(async () => {
    const T = window.TT, H = T.inspectHost();
    const { LIGHTS } = await import('/studio/inspector/stage.js');
    window.__LIGHTS = LIGHTS;
    window.eyeLight = 'noon';
    window.__holdRender = false;
    window.__illuminate = function illuminate() {
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
      const tg = T.trainingDbg.tg();
      if (tg && tg.setLights) {
        const wantRoom = window.eyeLight !== 'night';
        if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
      }
    };
    H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: window.__illuminate });
  })()`);

  // =========================================================================
  // PART 1: CD-1 fixes2 — Pump Shotgun firing hand (r) + GW-4 (m4) support hand (l)
  // =========================================================================
  if (!PAINT_ONLY) {
  await page.evaluate(`(() => {
    let css = document.getElementById('cd1-clean-hud');
    if (!css) {
      css = document.createElement('style');
      css.id = 'cd1-clean-hud';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    }
    const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
    T.setShotView(null);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.flightHold(true);
    T.setViewFirstDbg(true);
    // Firing line facing downrange (+Z -> yaw = Math.PI in OTS)
    T.player.position.set(O.x + 5.6, tg.floorY, O.z + 2.0);
    T.setOtsAimDbg(Math.PI, -0.02);
    T.setAimYawDbg(Math.PI);
    T.setAimTargetDbg(O.x + 5.6, O.z + 18.0);
    for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
  })()`);

  const cd1Metrics = { weapons: {} };

  const CD1_SPECS = [
    {
      key: 'shotgun',
      hand: 'r',
      // VM_FIT.shotgun.r.p = [0.00574, -0.11619, -0.07107], shifted slightly toward grip/trigger center
      focusLocal: [0.005, -0.095, -0.055],
      distEye: 0.25,
      distLeft: 0.24,
      distUnder: 0.24
    },
    {
      key: 'm4',
      hand: 'l',
      // VM_FIT.m4.l.p = [-0.02894, -0.02079, 0.42353]
      focusLocal: [-0.020, -0.015, 0.415],
      distEye: 0.26,
      distLeft: 0.24,
      distUnder: 0.24
    }
  ];

  for (const spec of CD1_SPECS) {
    cd1Metrics.weapons[spec.key] = {};
    // Equip weapon cleanly at hip first
    await page.evaluate(`(() => {
      window.__holdRender = false;
      const T = window.TT;
      T.marine.visible = true;
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      const idx = T.WEAPON_ORDER.indexOf(${JSON.stringify(spec.key)});
      T.setWeapon(idx);
      for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);
    })()`);

    // 1. 1P Hip in 4 lights
    for (const light of LIGHTS) {
      const m = await page.evaluate(`(() => {
        window.__holdRender = false;
        window.eyeLight = ${JSON.stringify(light)};
        const T = window.TT;
        T.marine.visible = true;
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 12; i++) T.stepFrame(1 / 60);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
        window.__holdRender = true;
        const vm = T.viewmodelDbg();
        return {
          showing: vm ? vm.showing(${JSON.stringify(spec.key)}) : false,
          ads: T.fpDbg().ads
        };
      })()`);
      cd1Metrics.weapons[spec.key][`hip-${light}`] = m;
      await shotTo(page, path.join(OUT_CD1, `${spec.key}-hip-${light}.png`));
    }

    // 2. Close hand cameras (eye, left, under) on the live settled 1P hip viewmodel in 4 lights
    const closeViews = ['eye', 'left', 'under'];
    for (const view of closeViews) {
      for (const light of LIGHTS) {
        const cm = await page.evaluate(`(() => {
          const T = window.TT, THREE = T.THREE;
          window.__holdRender = false;
          window.eyeLight = ${JSON.stringify(light)};
          T.marine.visible = true;
          T.setZoomHeldDbg(false);
          for (let i = 0; i < 8; i++) T.stepFrame(1 / 60);
          window.__illuminate();
          // Render 1 normal frame so viewmodel.place() locks vm.root at eye camera
          T.renderer.render(T.scene, T.camera);
          window.__holdRender = true;

          const vm = T.viewmodelDbg();
          const eyePos = T.camera.position.clone();
          const eyeQuat = T.camera.quaternion.clone();
          const eyeRight = new THREE.Vector3(1, 0, 0).applyQuaternion(eyeQuat).normalize();
          const eyeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(eyeQuat).normalize();
          const eyeFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(eyeQuat).normalize();

          vm.root.updateMatrixWorld(true);
          const focus = vm.gun.root.localToWorld(new THREE.Vector3(${spec.focusLocal[0]}, ${spec.focusLocal[1]}, ${spec.focusLocal[2]}));

          // Hide 3P marine body during close orbital look so 3P chest/head behind camera never occludes viewmodel
          T.marine.visible = false;

          const camPos = new THREE.Vector3();
          const upVec = new THREE.Vector3();
          const vName = ${JSON.stringify(view)};
          if (vName === 'eye') {
            const toEye = eyePos.clone().sub(focus).normalize();
            camPos.copy(focus).addScaledVector(toEye, ${spec.distEye});
            upVec.copy(eyeUp);
          } else if (vName === 'left') {
            camPos.copy(focus).addScaledVector(eyeRight, -${spec.distLeft}).addScaledVector(eyeUp, 0.015);
            upVec.copy(eyeUp);
          } else if (vName === 'under') {
            camPos.copy(focus).addScaledVector(eyeUp, -${spec.distUnder});
            upVec.copy(eyeFwd);
          }
          T.camera.position.copy(camPos);
          T.camera.up.copy(upVec);
          T.camera.lookAt(focus);
          T.camera.updateMatrixWorld(true);
          window.__illuminate();
          T.renderer.render(T.scene, T.camera);

          // Restore camera up & marine visibility after render (while held)
          const out = {
            focus: focus.toArray().map((n) => +n.toFixed(4)),
            camPos: camPos.toArray().map((n) => +n.toFixed(4))
          };
          T.camera.position.copy(eyePos);
          T.camera.quaternion.copy(eyeQuat);
          T.camera.up.set(0, 1, 0);
          T.camera.updateMatrixWorld(true);
          T.marine.visible = true;
          return out;
        })()`);
        cd1Metrics.weapons[spec.key][`close-${view}-${light}`] = cm;
        await shotTo(page, path.join(OUT_CD1, `${spec.key}-close-${view}-${light}.png`));
      }
    }

    // 3. 1P Aimed (ADS) in 4 lights
    await page.evaluate(`(() => {
      window.__holdRender = false;
      const T = window.TT;
      T.marine.visible = true;
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
    })()`);
    for (const light of LIGHTS) {
      const m = await page.evaluate(`(() => {
        window.__holdRender = false;
        window.eyeLight = ${JSON.stringify(light)};
        const T = window.TT;
        T.marine.visible = true;
        T.setZoomHeldDbg(true);
        for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
        window.__holdRender = true;
        return { ads: +T.fpDbg().ads.toFixed(3) };
      })()`);
      cd1Metrics.weapons[spec.key][`aimed-${light}`] = m;
      await shotTo(page, path.join(OUT_CD1, `${spec.key}-aimed-${light}.png`));
    }
    await page.evaluate(`(() => { window.__holdRender = false; window.TT.setZoomHeldDbg(false); })()`);
  }

  await writeRetry(path.join(OUT_CD1, 'gpu-metrics.json'), Buffer.from(JSON.stringify(cd1Metrics, null, 2)));
  console.log('[CD-1:fixes2] Captured 40 4-light PNGs in review/CD-1/fixes2/');
  }

  // =========================================================================
  // PART 2: CB-292 — Six Training Ground Station Wall Views in 4 Lights
  // =========================================================================
  await page.evaluate(`(() => {
    window.__holdRender = false;
    const css = document.getElementById('cd1-clean-hud');
    if (css) css.remove();
    const T = window.TT;
    T.marine.visible = true;
    T.setZoomHeldDbg(false);
    T.setViewFirstDbg(false);
    const pIdx = T.WEAPON_ORDER.indexOf('pistol');
    if (pIdx >= 0) T.setWeapon(pIdx);
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
  })()`);

  // Build station list: 5 from before-cameras.json + hqPanel (from hq-panel-pair.mjs)
  const hqSpec = await page.evaluate(`(() => {
    const tg = TT.trainingDbg.tg(), s = tg.stations.hqPanel;
    return {
      site: 'hqPanel',
      camera: [s.x + 2.3, tg.floorY + 1.6, s.z],
      target: [s.x, tg.floorY + 1.6, s.z]
    };
  })()`);

  const allStations = [...beforeCameras, hqSpec];
  const cb292Metrics = { stations: [] };

  for (const st of (PAINT_ONLY ? [] : allStations)) {
    const stEntry = { site: st.site, camera: st.camera, target: st.target, lights: {} };
    for (const light of LIGHTS) {
      const info = await page.evaluate(`(() => {
        window.__holdRender = false;
        window.eyeLight = ${JSON.stringify(light)};
        const T = window.TT, tg = T.trainingDbg.tg();
        const cam = ${JSON.stringify(st.camera)}, tgt = ${JSON.stringify(st.target)};
        T.player.position.set(cam[0], tg.floorY, cam[2]);
        T.setShotView({ x: cam[0], y: cam[1], z: cam[2], tx: tgt[0], ty: tgt[1], tz: tgt[2], fov: 50 });
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
        window.__holdRender = true;

        const objName = 'training-' + ${JSON.stringify(st.site)};
        const obj = tg.group.getObjectByName(objName);
        let box = null;
        if (obj) {
          const b = new T.THREE.Box3().setFromObject(obj);
          box = { min: b.min.toArray().map((n) => +n.toFixed(4)), max: b.max.toArray().map((n) => +n.toFixed(4)) };
        }
        return {
          actualCam: T.camera.position.toArray().map((n) => +n.toFixed(4)),
          box
        };
      })()`);
      stEntry.lights[light] = info;
      await shotTo(page, path.join(OUT_CB292, `after-${st.site}-${light}.png`));
    }
    cb292Metrics.stations.push(stEntry);
  }

  // Low-eye floor paint views (firing-line & no-build) in 4 lights + sub-mm camera nudge z-fight check
  const paintSites = [
    { site: 'firing-line', x: 0, z: -643, tx: 0, tz: -640 },
    { site: 'no-build', x: -26, z: -626, tx: -26, tz: -623 }
  ];
  cb292Metrics.floorPaint = [];
  for (const ps of paintSites) {
    const pEntry = { site: ps.site, lights: {} };
    for (const light of LIGHTS) {
      const pInfo = await page.evaluate(`(() => {
        window.__holdRender = false;
        window.eyeLight = ${JSON.stringify(light)};
        const T = window.TT, tg = T.trainingDbg.tg(), eye = tg.floorY + 0.42;
        T.player.position.set(${ps.x}, tg.floorY, ${ps.z - 2.2});
        T.setShotView({ x: ${ps.x}, y: eye, z: ${ps.z}, tx: ${ps.tx}, ty: tg.floorY + 0.003, tz: ${ps.tz}, fov: 52 });
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
        window.__holdRender = true;
        // Count polygonOffset floor paint meshes <= 2.2 mm above floorY
        const B = T.THREE.Box3;
        let count = 0, maxGapMm = 0, polyOffsetCount = 0;
        tg.group.traverse((m) => {
          if (!m.isMesh || !m.geometry) return;
          const b = new B().setFromObject(m);
          const gap = b.min.y - tg.floorY;
          if (gap > 0.0003 && gap < 0.025 && (b.max.y - b.min.y) < 0.0006) {
            count++;
            if (gap * 1000 > maxGapMm) maxGapMm = +(gap * 1000).toFixed(3);
            if (m.material && m.material.polygonOffset) polyOffsetCount++;
          }
        });
        return { overlayCount: count, polyOffsetCount, maxGapMm };
      })()`);
      pEntry.lights[light] = pInfo;
      await shotTo(page, path.join(OUT_CB292, `after-paint-${light}-${ps.site}.png`));
      // Nudge camera by +0.8mm Z, +0.3mm Y to verify zero z-fighting flicker
      await page.evaluate(`(() => {
        const T = window.TT, tg = T.trainingDbg.tg(), eye = tg.floorY + 0.4203;
        T.setShotView({ x: ${ps.x}, y: eye, z: ${ps.z + 0.0008}, tx: ${ps.tx}, ty: tg.floorY + 0.003, tz: ${ps.tz + 0.0008}, fov: 52 });
        T.stepFrame(1 / 60);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
      })()`);
      await shotTo(page, path.join(OUT_CB292, `nudge-paint-${light}-${ps.site}.png`));
    }
    cb292Metrics.floorPaint.push(pEntry);
  }

  await page.evaluate(`(() => { window.__holdRender = false; window.TT.setShotView(null); })()`);
  assert.deepEqual(page.errors, [], `Page errors: ${JSON.stringify(page.errors)}`);
  await writeRetry(path.join(OUT_CB292, 'gpu-wall-stations-4lights.json'), Buffer.from(JSON.stringify(cb292Metrics, null, 2)));
  console.log('[CB-292:gpu] Captured 24 station + 16 floor-paint/nudge PNGs in review/CB-292/gpu/');
} finally {
  await browser.close();
  await server.close();
}
