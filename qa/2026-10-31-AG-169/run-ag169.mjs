// qa/2026-10-31-AG-169/run-ag169.mjs
// Single batched GPU validation & screenshot script for GP-19987, GP-19988, and GP-19989
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
fs.mkdirSync(HERE, { recursive: true });

const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Run realtest t307 first while we hold the slot
console.log('\n=== [1/4] Running realtest t307 --all ===');
const r307 = spawnSync(process.execPath, ['tools/realtest.mjs', 't307', '--all'], {
  stdio: 'inherit',
  cwd: ROOT,
  env: { ...process.env, DW_SLOT_HELD: '1' }
});

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

const summary = {
  t307ExitCode: r307.status,
  consoleErrors: [],
  gp19987: {},
  gp19988: {},
  gp19989: {}
};

try {
  const page = await browser.newPage({ width: W, height: H });
  page.on?.('console', (m) => {
    if (m && m.type === 'error') summary.consoleErrors.push(m.text);
  });

  const url = `${server.origin}/index.html?debug=1&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  await page.evaluate(`(async () => {
    window.__agErrs = [];
    window.addEventListener('error', (e) => window.__agErrs.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', (e) => window.__agErrs.push(String(e.reason)));
    const T = TT;
    await startMatch(T, 'AG169');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.addCash && T.addCash(50000);
    return 1;
  })()`, 300000);

  // =========================================================================
  // PART A: GP-19987 — Day-1 Fuel Lead Gate & READY Briefing Tracked Objective
  // =========================================================================
  console.log('\n=== [2/4] GP-19987: Fuel Lead Gate & READY Briefing Shots ===');
  summary.gp19987.fuel = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
    const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
    T.setWorldTime(0.42);
    T.setViewFirstDbg(false);
    T.runDevCommand('story gate on');
    T.runDevCommand('site fuel');
    const F = T.fuelDbg, R = () => F.run();
    await until(() => !!F.props() && R().phase === 'at-pump', 8000);
    await wait(250);
    const closedPromptBefore = F.prompt();
    key('keydown');
    { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.25, 20000); }
    return {
      closedPhase: R().phase,
      closedFill: R().fill,
      closedPrompt: F.prompt(),
      closedPromptBefore
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19987-fuel-closed-hold-e.png'));
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }))`);

  summary.gp19987.fuelOpen = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
    const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
    T.runDevCommand('story open generator');
    await wait(350);
    const openPromptBefore = T.fuelDbg.prompt();
    key('keydown');
    { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 1.25, 20000); }
    const r = T.fuelDbg.run();
    return {
      openPromptBefore,
      openPhase: r.phase,
      openFill: r.fill,
      openPromptDuring: T.fuelDbg.prompt()
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19987-fuel-open-hold-e.png'));
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }))`);

  // Track an objective on the full map, then open READY briefing at 1280x720 and 390x844
  summary.gp19987.readyDesktop = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.openMenuDbg('map');
    await wait(300);
    const marker = document.querySelector('.objective-marker[data-site="objective:radio-repair"]') || document.querySelector('.objective-marker');
    if (marker) marker.click();
    await wait(250);
    T.closeMenuDbg('map');
    await wait(250);
    T.openMenuDbg('briefing');
    await wait(500);
    const tracker = document.querySelector('.objective-tracker');
    const rect = tracker ? tracker.getBoundingClientRect() : null;
    return {
      trackerFound: !!tracker,
      trackerInsideDialog: !!(tracker && tracker.closest('#wavePreview, .wave-preview, [data-briefing], #hqBriefing')),
      trackerParentClass: tracker && tracker.parentElement ? (tracker.parentElement.id || tracker.parentElement.className) : null,
      trackerHeading: tracker && tracker.querySelector('h2, h3, strong') ? tracker.querySelector('h2, h3, strong').textContent : (tracker ? tracker.textContent.slice(0, 80) : null),
      rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19987-ready-desktop.png'));

  await page.setViewport(390, 844);
  await wait(400);
  summary.gp19987.readyNarrow = await page.evaluate(`(() => {
    const tracker = document.querySelector('.objective-tracker');
    const rect = tracker ? tracker.getBoundingClientRect() : null;
    return {
      rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
      fitsViewport: rect ? (rect.x >= 0 && rect.x + rect.width <= 390) : false,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    };
  })()`);
  await page.screenshot(path.join(HERE, 'gp19987-ready-narrow-390.png'));
  await page.setViewport(W, H);
  await page.evaluate(`TT.closeMenuDbg('briefing')`);
  await wait(300);

  // =========================================================================
  // PART B: GP-19988 — Backwards Cap + Balaclava (4 Lights & 5 Angles) + Brute Get-Up Filmstrip
  // =========================================================================
  console.log('\n=== [3/4] GP-19988: Backwards Cap + Balaclava & Brute Get-Up Filmstrip ===');
  summary.gp19988.capGeometry = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.setViewFirstDbg(false);
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
    T.player.rotation.set(0, 0, 0);
    T.setWardrobeItem('cap', { style: 'ballcapBack', camo: 'm81' });
    T.getGearOwned().helmet = false;
    T.applyGearVisibility();
    const d = T.marine.userData.dress;
    if (d && d.hats) {
      for (const k of Object.keys(d.hats)) d.hats[k].visible = (k === 'ballcapBack');
    }
    if (T.marine.userData.balaclava) T.marine.userData.balaclava.visible = true;
    T.toggleHolster && !T.isUnarmed() && T.toggleHolster();
    await wait(400);

    // Measure cap vs balaclava hood vertices in headG local space
    const m = T.marine;
    m.updateMatrixWorld(true);
    const headG = m.userData.headG;
    const headInv = headG.matrixWorld.clone().invert();
    const v = new T.THREE.Vector3();
    let capVertices = 0, maskVertices = 0;
    const capFrontMinZ = {}, maskFrontMaxZ = {};

    const capRoot = d && d.hats && d.hats.ballcapBack;
    if (capRoot) {
      capRoot.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.visible) return;
        const pa = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
        if (!pa) return;
        const mat = headInv.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(mat);
          capVertices++;
          // Forehead band: y between 1.48 and 1.55, |x| < 0.08, z > 0.04
          if (v.y >= 1.48 && v.y <= 1.56 && Math.abs(v.x) <= 0.08 && v.z >= 0.04) {
            const yKey = Math.round(v.y * 100) / 100;
            if (capFrontMinZ[yKey] == null || v.z < capFrontMinZ[yKey]) {
              capFrontMinZ[yKey] = +v.z.toFixed(4);
            }
          }
        }
      });
    }

    const maskRoot = m.userData.balaclava;
    if (maskRoot) {
      maskRoot.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.visible) return;
        const pa = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
        if (!pa) return;
        const mat = headInv.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(mat);
          maskVertices++;
          if (v.y >= 1.48 && v.y <= 1.56 && Math.abs(v.x) <= 0.08 && v.z >= 0.04) {
            const yKey = Math.round(v.y * 100) / 100;
            if (maskFrontMaxZ[yKey] == null || v.z > maskFrontMaxZ[yKey]) {
              maskFrontMaxZ[yKey] = +v.z.toFixed(4);
            }
          }
        }
      });
    }

    const clearancesMm = {};
    for (const yKey of Object.keys(capFrontMinZ)) {
      if (maskFrontMaxZ[yKey] != null) {
        clearancesMm[yKey] = +((capFrontMinZ[yKey] - maskFrontMaxZ[yKey]) * 1000).toFixed(1);
      }
    }

    return {
      capVisible: capRoot ? capRoot.visible : false,
      ballcapBackRotY: capRoot ? +capRoot.rotation.y.toFixed(3) : null,
      capVertices,
      maskVertices,
      clearancesMm
    };
  })()`, 120000);

  // Capture 5 angles (front, left, right, back, top) at noon + 4 lights (noon, overcast, dusk, night)
  const capAngles = [
    ['front',    0,    1.56,  0.62, 0, 1.53, 0, 32],
    ['left',    -0.62, 1.56,  0.00, 0, 1.53, 0, 32],
    ['right',    0.62, 1.56,  0.00, 0, 1.53, 0, 32],
    ['back',     0,    1.56, -0.62, 0, 1.53, 0, 32],
    ['top',      0,    2.12,  0.22, 0, 1.53, 0, 32],
    ['gameplay', 0,    2.45, -2.60, 0, 1.35, 0, 50]
  ];
  await page.evaluate(`TT.setWorldTime(0.42)`);
  for (const [angName, ox, oy, oz, tx, ty, tz, fov] of capAngles) {
    await page.evaluate(`(() => {
      const T = TT;
      const p = T.marine.position;
      T.marine.rotation.y = 0;
      T.setShotView({ x: p.x + ${ox}, y: p.y + ${oy}, z: p.z + ${oz}, tx: p.x + ${tx}, ty: p.y + ${ty}, tz: p.z + ${tz}, fov: ${fov} });
    })()`);
    await wait(350);
    await page.screenshot(path.join(HERE, `gp19988-cap-noon-${angName}.png`));
  }

  const capLights = [
    ['overcast', 'T.setWorldTime(0.42); if (T.weather) { T.weather.rain = 0.85; }'],
    ['dusk',     'if (T.weather) { T.weather.rain = 0; } T.setWorldTime(0.74);'],
    ['night',    'if (T.weather) { T.weather.rain = 0; } T.setWorldTime(0.05);']
  ];
  for (const [lightName, setupJs] of capLights) {
    await page.evaluate(`(() => {
      const T = TT;
      ${setupJs}
      const p = T.marine.position;
      T.marine.rotation.y = 0;
      T.setShotView({ x: p.x + 0.28, y: p.y + 1.58, z: p.z + 0.56, tx: p.x, ty: p.y + 1.53, tz: p.z, fov: 32 });
    })()`);
    await wait(450);
    await page.screenshot(path.join(HERE, `gp19988-cap-${lightName}-3q.png`));
  }
  await page.evaluate(`if (TT.weather) TT.weather.rain = 0; TT.setWorldTime(0.42); TT.setShotView(null);`);

  // Brute get-up filmstrip:
  // Studio motion engine (studio/motion.js + studio/motion/zombie/brute.json v3)
  console.log('  Capturing brute.json v3 6-frame get-up filmstrip...');
  const bruteBeats = [
    ['1-down-palms',  0.02],
    ['2-knee-under',  0.35],
    ['3-two-arm-push', 0.55],
    ['4-hip-rise',    0.70],
    ['5-head-lag',    0.86],
    ['6-recovered',   1.00]
  ];
  summary.gp19988.bruteFilmstrip = [];
  await page.evaluate(`(async () => {
    const T = TT;
    T.clearZombies && T.clearZombies();
    const { rigs } = await import('/studio/rigs.js');
    const ModStudio = await import('/studio/index.js');
    const bruteJson = await (await fetch('/studio/motion/zombie/brute.json')).json();
    const preset = ModStudio.loadMotion(bruteJson);
    const px = 0, pz = 14, py = T.sampleHeight(px, pz);
    const z = T.spawnZombie(px, pz, 'brute', true, true);
    z.hp = 999999; z.riseT = 0;
    z.mesh.position.set(px, py, pz);
    z.mesh.rotation.set(0, 0, 0);
    const inst = rigs.get('zombie').create({ group: z.mesh });
    const body = ModStudio.createBody(inst, preset, { ground: (x, zz) => py });
    body.follow();
    body.hit({ point: 'pelvis', dir: [0, 0.3, -1], power: 30, kind: 'blast' });
    let elapsed = 0;
    while (body.state !== 'getup' && elapsed < 5.0) {
      body.follow();
      body.update(1 / 60);
      elapsed += 1 / 60;
    }
    window.__agBrute = { z, inst, body, preset, py, px, pz, getupStartElapsed: +elapsed.toFixed(3) };
    const idx = T.zombies.indexOf(z);
    if (idx >= 0) T.zombies.splice(idx, 1);
    T.setShotView({ x: px + 2.8, y: py + 1.55, z: pz + 2.4, tx: px, ty: py + 0.85, tz: pz, fov: 44 });
    return 1;
  })()`, 120000);

  let curU = 0;
  for (const [beatName, targetU] of bruteBeats) {
    const beatInfo = await page.evaluate(`(() => {
      const B = window.__agBrute;
      const getupDur = B.preset.getup.time || 1.4;
      const dtNeed = Math.max(0, (${targetU} - ${curU}) * getupDur);
      const steps = Math.max(1, Math.round(dtNeed * 60));
      const dt = dtNeed / steps;
      for (let i = 0; i < steps; i++) {
        B.body.follow();
        B.body.update(dt);
      }
      B.z.mesh.updateMatrixWorld(true);
      const pts = B.body.points;
      return {
        beat: '${beatName}',
        targetU: ${targetU},
        state: B.body.state,
        pelvisY: pts.pelvis ? +(pts.pelvis.y - B.py).toFixed(3) : null,
        chestY: pts.chest ? +(pts.chest.y - B.py).toFixed(3) : null,
        headY: pts.head ? +(pts.head.y - B.py).toFixed(3) : null,
        handLY: pts.handL ? +(pts.handL.y - B.py).toFixed(3) : null,
        handRY: pts.handR ? +(pts.handR.y - B.py).toFixed(3) : null,
        kneeLY: pts.kneeL ? +(pts.kneeL.y - B.py).toFixed(3) : null,
        kneeRY: pts.kneeR ? +(pts.kneeR.y - B.py).toFixed(3) : null
      };
    })()`);
    curU = targetU;
    summary.gp19988.bruteFilmstrip.push(beatInfo);
    await wait(200);
    await page.screenshot(path.join(HERE, `gp19988-brute-getup-${beatName}.png`));
  }
  await page.evaluate(`(() => {
    if (window.__agBrute && window.__agBrute.z && window.__agBrute.z.mesh) {
      TT.scene.remove(window.__agBrute.z.mesh);
    }
    TT.setShotView(null);
  })()`);

  // =========================================================================
  // PART C: GP-19989 — CIF & Armory Workbench 1-2.5x Zoom GPU Validation
  // =========================================================================
  console.log('\n=== [4/4] GP-19989: CIF & Armory Workbench Zoom Validation ===');

  // 1. CIF Desktop (3P entry)
  summary.gp19989.cifDesktop = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.setViewFirstDbg(false);
    T.openCIF();
    await wait(500);
    T.cifDressDbg().tick(200);
    const openZoom = T.cifDressDbg().view.zoom;
    const openCamZ = +T.cifDressDbg().cam.position.z.toFixed(3);
    return { openZoom: +openZoom.toFixed(3), openCamZ, hint: document.getElementById('cifHint')?.textContent };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-cif-open-1x.png'));

  // Wheel zoom in to 2.5x clamp on #cifMarine
  summary.gp19989.cifZoomMax = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cv = document.getElementById('cifMarine');
    for (let i = 0; i < 12; i++) {
      cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -180, bubbles: true, cancelable: true }));
    }
    for (let i = 0; i < 20; i++) { T.cifDressDbg().tick(50); await wait(20); }
    return {
      zoom: +T.cifDressDbg().view.zoom.toFixed(3),
      camZ: +T.cifDressDbg().cam.position.z.toFixed(3),
      frame: T.cifDressDbg().frame
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-cif-zoom-2.5x.png'));

  // Switch item while zoomed (cap -> boots) to verify framing keeps user zoom
  summary.gp19989.cifSwitchItem = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const capBtn = [...document.querySelectorAll('#cifItems button')].find((b) => /cap|head|hat/i.test(b.textContent));
    if (capBtn) capBtn.click();
    for (let i = 0; i < 20; i++) { T.cifDressDbg().tick(50); await wait(20); }
    const capState = { item: T.cifDressDbg().item, frame: T.cifDressDbg().frame, zoom: +T.cifDressDbg().view.zoom.toFixed(3), camY: +T.cifDressDbg().cam.position.y.toFixed(3), camZ: +T.cifDressDbg().cam.position.z.toFixed(3) };
    return capState;
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-cif-switch-cap-2.5x.png'));

  // Wheel zoom out past 1.0x clamp + two-pointer touch pinch zoom to ~1.8x
  summary.gp19989.cifClampAndPinch = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cv = document.getElementById('cifMarine');
    for (let i = 0; i < 15; i++) {
      cv.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }));
    }
    for (let i = 0; i < 20; i++) { T.cifDressDbg().tick(50); await wait(20); }
    const minClampZoom = +T.cifDressDbg().view.zoom.toFixed(3);

    // Emulate 2-pointer touch pinch on #cifMarine (100px -> 185px = 1.85x)
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 150, bubbles: true }));
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 150, bubbles: true }));
    cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 285, clientY: 150, bubbles: true }));
    cv.dispatchEvent(new PointerEvent('pointerup',   { pointerId: 2, pointerType: 'touch', clientX: 285, clientY: 150, bubbles: true }));
    cv.dispatchEvent(new PointerEvent('pointerup',   { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 150, bubbles: true }));
    for (let i = 0; i < 20; i++) { T.cifDressDbg().tick(50); await wait(20); }
    const pinchZoom = +T.cifDressDbg().view.zoom.toFixed(3);

    // Close and reopen CIF (from 1P mode) -> verify zoom resets to 1.0
    T.closeCIF();
    T.setViewFirstDbg(true);
    await wait(250);
    T.openCIF();
    await wait(300);
    T.cifDressDbg().tick(100);
    const reopenZoom = +T.cifDressDbg().view.zoom.toFixed(3);
    return { minClampZoom, pinchZoom, reopenZoomFrom1P: reopenZoom };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-cif-reopen-reset-1p.png'));

  // Narrow 390x844 CIF zoomed view
  await page.setViewport(390, 844);
  await wait(300);
  summary.gp19989.cifNarrow = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cv = document.getElementById('cifMarine');
    for (let i = 0; i < 8; i++) {
      cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -150, bubbles: true, cancelable: true }));
    }
    for (let i = 0; i < 16; i++) { T.cifDressDbg().tick(50); await wait(20); }
    const r = cv.getBoundingClientRect();
    return {
      zoom: +T.cifDressDbg().view.zoom.toFixed(3),
      canvasRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      scrollWidth: document.documentElement.scrollWidth
    };
  })()`);
  await page.screenshot(path.join(HERE, 'gp19989-cif-narrow-390-zoom.png'));
  await page.setViewport(W, H);
  await page.evaluate(`TT.closeCIF()`);
  await wait(250);

  // 2. Armory Workbench Desktop & 390x844
  summary.gp19989.workbench = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.openMenuDbg('armory');
    await wait(500);
    if (T.armoryDbg && T.armoryDbg.ui && T.armoryDbg.ui().bench) {
      T.armoryDbg.ui().bench('m4');
    } else {
      const shelfBtn = document.querySelector('.armory-shelf button:not(:disabled)') || document.querySelector('.armory-hip button');
      if (shelfBtn) shelfBtn.click();
    }
    await wait(700);
    const stage = document.querySelector('.armory-preview-stage');
    const img = stage ? stage.querySelector('img') : null;
    const src1x = img ? img.src : null;
    return {
      stageFound: !!stage,
      ready: stage ? stage.dataset.ready : null,
      hint: document.querySelector('.armory-preview-hint')?.textContent || null,
      src1xLen: src1x ? src1x.length : 0
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-wb-open-1x.png'));

  summary.gp19989.workbenchZoom = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const stage = document.querySelector('.armory-preview-stage');
    const img = stage ? stage.querySelector('img') : null;
    const srcBefore = img ? img.src : '';
    if (stage) {
      for (let i = 0; i < 12; i++) {
        stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -180, bubbles: true, cancelable: true }));
      }
    }
    await wait(750);
    const srcAfterMax = img ? img.src : '';
    return {
      changedOnZoomIn: srcAfterMax !== srcBefore && srcAfterMax.length > 100,
      srcBeforeLen: srcBefore.length,
      srcAfterMaxLen: srcAfterMax.length
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-wb-zoom-2.5x.png'));

  await page.setViewport(390, 844);
  await wait(400);
  await page.screenshot(path.join(HERE, 'gp19989-wb-narrow-390-zoom.png'));
  await page.setViewport(W, H);

  // Switch gun on shelf or close/reopen workbench -> verify reset to 1x
  summary.gp19989.workbenchReset = await page.evaluate(`(async () => {
    const T = TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const stage = document.querySelector('.armory-preview-stage');
    const img = stage ? stage.querySelector('img') : null;
    const srcZoomed = img ? img.src : '';
    if (T.armoryDbg && T.armoryDbg.ui && T.armoryDbg.ui().bench) {
      T.armoryDbg.ui().bench('pistol');
      await wait(600);
      T.armoryDbg.ui().bench('m4');
      await wait(700);
    } else {
      const btns = [...document.querySelectorAll('.armory-shelf button:not(:disabled)')];
      if (btns.length >= 2) {
        btns[1].click();
        await wait(500);
        btns[0].click();
        await wait(700);
      }
    }
    const srcReopen = img ? img.src : '';
    return {
      reopenResetChangedFromZoomed: srcReopen !== srcZoomed && srcReopen.length > 100,
      pageErrors: window.__agErrs || []
    };
  })()`, 120000);
  await page.screenshot(path.join(HERE, 'gp19989-wb-reopen-reset.png'));

  fs.writeFileSync(path.join(HERE, 'ag169-summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nSaved ag169-summary.json');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
process.exit(0);
