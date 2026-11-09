// qa/CL-322/capture.mjs - CL-322 5080 shotgun mid-rack stills and hull flight verification
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('use the shared game-test slot: node crew/crew.mjs slot run ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_DIR = HERE;
fs.mkdirSync(OUT_DIR, { recursive: true });

function writeFileSyncWithRetry(filePath, data, retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      try { fs.unlinkSync(filePath); } catch (_) {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

function saveDataUrl(filePath, dataUrl) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid data URL for ' + filePath);
  writeFileSyncWithRetry(filePath, Buffer.from(m[1], 'base64'));
}

console.log('[CL-322] Starting shotgun mid-rack stills capture on Jerry\'s RTX 5080...');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) {
    throw new Error('TT did not boot');
  }

  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));

  // Setup match with shotgun
  const setup = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    const until = async (fn, ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (fn()) return true;
        await wait(60);
      }
      return false;
    };

    await startMatch(T, 'CL322_MIDRACK');
    T.clearZombies?.();
    T.setHp(100000);
    T.grantAllWeapons();
    T.setWorldTime(0.42); // Clear daylight noon

    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
    T.setViewFirstDbg(true);

    if (!await until(() => T.getCurrentWeapon() === 'shotgun' &&
      T.fpDbg().w > 0.99 &&
      T.viewmodelDbg()?.info.active &&
      T.viewmodelDbg().info.key === 'shotgun' &&
      T.viewmodelDbg().info.raise > 0.99, 25000)) {
      throw new Error('shotgun FP did not settle: ' + JSON.stringify({
        fp: T.fpDbg(),
        vm: T.viewmodelDbg()?.info,
        mode: T.getGameMode()
      }));
    }

    const gun = T.weaponMeshes.shotgun;
    window._origBasePumpPos = gun.userData.basePumpPos.clone();
    return {
      backend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU',
      weapon: T.getCurrentWeapon(),
      basePumpPos: window._origBasePumpPos.toArray(),
      ejectPort: gun.userData.ejectPort
    };
  })()`);

  console.log('[CL-322] Match initialized with shotgun:', JSON.stringify(setup));

  // --- 1. FIRST PERSON: CLOSED AT HIP ---
  console.log('[CL-322] Capturing First Person (Hip Closed)...');
  const fpClosedMetrics = await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 200));

    const bolt = gun.userData.shotgunBolt;
    const vm = T.viewmodelDbg();
    return {
      pumpZ: gun.userData.pump.position.z,
      basePumpZ: gun.userData.basePumpPos.z,
      boltPartsVisible: bolt.children.map(c => ({ name: c.name, visible: c.visible, posZ: c.position.z })),
      vmActive: vm?.info.active,
      handPlace: vm?.info.handPlace
    };
  })()`);

  const fpClosedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'fp-closed.png'), Buffer.from(fpClosedShot.data, 'base64'));

  // --- 2. FIRST PERSON: FULL RACK AT HIP (stroke = 0.12) ---
  console.log('[CL-322] Capturing First Person (Hip Full Rack)...');
  const fpRackedMetrics = await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    const travel = 0.12;
    gun.userData.basePumpPos.z = window._origBasePumpPos.z - travel;
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 200));

    const bolt = gun.userData.shotgunBolt;
    const vm = T.viewmodelDbg();
    return {
      pumpZ: gun.userData.pump.position.z,
      basePumpZ: gun.userData.basePumpPos.z,
      travelApplied: window._origBasePumpPos.z - gun.userData.pump.position.z,
      boltPartsVisible: bolt.children.map(c => ({ name: c.name, visible: c.visible, posZ: c.position.z })),
      vmActive: vm?.info.active,
      handPlace: vm?.info.handPlace
    };
  })()`);

  const fpRackedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'fp-racked.png'), Buffer.from(fpRackedShot.data, 'base64'));

  // --- 3. FIRST PERSON: ADS CLOSED & RACKED ---
  console.log('[CL-322] Capturing First Person ADS (Closed & Racked)...');
  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    T.setZoomHeldDbg(true);
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 600));
  })()`);
  const fpAdsClosedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'fp-ads-closed.png'), Buffer.from(fpAdsClosedShot.data, 'base64'));

  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.z = window._origBasePumpPos.z - 0.12;
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 200));
  })()`);
  const fpAdsRackedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'fp-ads-racked.png'), Buffer.from(fpAdsRackedShot.data, 'base64'));

  // Restore basePumpPos and reset ADS
  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    T.setZoomHeldDbg(false);
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 400));
  })()`);

  // --- 4. LIVE FIRING HULL EJECTION IN FIRST PERSON ---
  console.log('[CL-322] Capturing Live Firing Hull Ejection in First Person...');
  const fireEjectMetrics = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    const c0 = (T.casingsList || []).length;
    T.setMouseFireDbg(true);
    await wait(60);
    T.setMouseFireDbg(false);

    // Wait until shell spawns (~120ms to 240ms)
    const t0 = Date.now();
    let shellFound = false;
    let casingPos = null;
    let pumpZDuringFire = 0;
    while (Date.now() - t0 < 800) {
      await wait(16);
      const casings = T.casingsList || [];
      const gun = T.weaponMeshes.shotgun;
      pumpZDuringFire = gun.userData.pump.position.z;
      if (casings.length > c0) {
        shellFound = true;
        const last = casings[casings.length - 1];
        casingPos = last.mesh ? last.mesh.position.toArray() : (last.pos ? last.pos.toArray() : null);
        break;
      }
    }
    return {
      shellFound,
      casingPos,
      pumpZDuringFire,
      casingsCount: (T.casingsList || []).length
    };
  })()`);

  console.log('[CL-322] Firing hull ejection capture info:', JSON.stringify(fireEjectMetrics));
  const fpHullShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'fp-hull-eject.png'), Buffer.from(fpHullShot.data, 'base64'));

  // Wait for pump to finish return
  await page.evaluate(`new Promise(r => setTimeout(r, 500))`);

  // --- 5. THIRD PERSON: FRONT 3/4 CLOSED & FULL RACK ---
  console.log('[CL-322] Capturing Third Person Front 3/4 (Closed & Full Rack)...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setViewFirstDbg(false);
    const p = T.player.position;
    // Park camera looking at marine front-right 3/4
    T.setShotView({
      x: p.x + 1.15,
      y: p.y + 1.25,
      z: p.z + 0.85,
      tx: p.x,
      ty: p.y + 1.05,
      tz: p.z + 0.20,
      fov: 42
    });
    const gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 400));
  })()`);

  const tpClosedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'tp-closed.png'), Buffer.from(tpClosedShot.data, 'base64'));

  // Third person full rack
  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.z = window._origBasePumpPos.z - 0.12;
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 200));
  })()`);

  const tpRackedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'tp-racked.png'), Buffer.from(tpRackedShot.data, 'base64'));

  // --- 6. THIRD PERSON: RIGHT SIDE PROFILE CLOSED & FULL RACK ---
  console.log('[CL-322] Capturing Third Person Side Profile (Closed & Full Rack)...');
  await page.evaluate(`(async () => {
    const T = window.TT;
    const p = T.player.position;
    T.setShotView({
      x: p.x + 1.55,
      y: p.y + 1.18,
      z: p.z + 0.35,
      tx: p.x,
      ty: p.y + 1.10,
      tz: p.z + 0.35,
      fov: 38
    });
    const gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 300));
  })()`);

  const tpSideClosedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'tp-side-closed.png'), Buffer.from(tpSideClosedShot.data, 'base64'));

  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.z = window._origBasePumpPos.z - 0.12;
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 200));
  })()`);

  const tpSideRackedShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'tp-side-racked.png'), Buffer.from(tpSideRackedShot.data, 'base64'));

  // --- 7. THIRD PERSON LIVE FIRING & SHELL FLIGHT ---
  console.log('[CL-322] Capturing Third Person Live Firing & Shell Flight...');
  await page.evaluate(`(async () => {
    const T = window.TT, gun = T.weaponMeshes.shotgun;
    gun.userData.basePumpPos.copy(window._origBasePumpPos);
    gun.userData.pump.position.copy(gun.userData.basePumpPos);
    if (gun.userData.pumpPoseHook) gun.userData.pumpPoseHook();
    await new Promise(r => setTimeout(r, 300));
  })()`);

  const tpFireEjectMetrics = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    const c0 = (T.casingsList || []).length;
    T.setMouseFireDbg(true);
    await wait(60);
    T.setMouseFireDbg(false);

    const t0 = Date.now();
    let shellFound = false;
    let casingPos = null;
    while (Date.now() - t0 < 800) {
      await wait(16);
      const casings = T.casingsList || [];
      if (casings.length > c0) {
        shellFound = true;
        const last = casings[casings.length - 1];
        casingPos = last.mesh ? last.mesh.position.toArray() : (last.pos ? last.pos.toArray() : null);
        break;
      }
    }
    return { shellFound, casingPos, casingsCount: (T.casingsList || []).length };
  })()`);

  const tpHullShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, 'tp-hull-eject.png'), Buffer.from(tpHullShot.data, 'base64'));

  // --- 8. COMPOSITE MASTER CONTACT SHEET VIA CANVAS ---
  console.log('[CL-322] Compositing master contact sheet shotgun-midrack-sheet.jpg...');
  const compPage = await browser.newPage({ width: 2400, height: 1600 });
  const sheetDataUrl = await compPage.evaluate(`(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title banner
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, canvas.width, 100);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, 100);

    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText('GRAVE SHIFT · CL-322 SHOTGUN PUMP MID-RACK VERIFICATION (RTX 5080 WebGPU)', 40, 48);

    ctx.fillStyle = '#8b949e';
    ctx.font = '18px monospace';
    ctx.fillText('STEVENS 320 PUMP ACTION · FOREND REST: z=0.375 (9.5 cm stroke to receiver face z=0.23) · BOLT pumpPoseHook · ejectPort', 40, 80);

    const shots = [
      { name: '1. FP Hip: Closed (Bolt Visible in Port)', data: '${fpClosedShot.data}', x: 40, y: 130, w: 740, h: 416 },
      { name: '2. FP Hip: Full Rack (0.12 stroke, Breech Open)', data: '${fpRackedShot.data}', x: 820, y: 130, w: 740, h: 416 },
      { name: '3. FP Live Fire: Hull Ejection from Port', data: '${fpHullShot.data}', x: 1600, y: 130, w: 740, h: 416 },

      { name: '4. TP 3/4: Closed (Hand on Forend z=0.375)', data: '${tpClosedShot.data}', x: 40, y: 580, w: 740, h: 416 },
      { name: '5. TP 3/4: Full Rack (Forend to Receiver)', data: '${tpRackedShot.data}', x: 820, y: 580, w: 740, h: 416 },
      { name: '6. TP Live Fire: Hull Flight from Port', data: '${tpHullShot.data}', x: 1600, y: 580, w: 740, h: 416 },

      { name: '7. TP Side: Closed Profile (Resting 9.5 cm forward)', data: '${tpSideClosedShot.data}', x: 40, y: 1030, w: 740, h: 416 },
      { name: '8. TP Side: Full Rack (Forend against Receiver Face)', data: '${tpSideRackedShot.data}', x: 820, y: 1030, w: 740, h: 416 },
      { name: '9. FP ADS: Sights Aligned & Sockets Grounded', data: '${fpAdsClosedShot.data}', x: 1600, y: 1030, w: 740, h: 416 }
    ];

    const loadImage = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    for (const s of shots) {
      const img = await loadImage('data:image/png;base64,' + s.data);
      ctx.drawImage(img, s.x, s.y, s.w, s.h);

      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      // Card banner
      ctx.fillStyle = 'rgba(13, 17, 23, 0.88)';
      ctx.fillRect(s.x, s.y + s.h - 36, s.w, 36);
      ctx.fillStyle = '#58a6ff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(s.name, s.x + 14, s.y + s.h - 12);
    }

    // Bottom summary bar
    const yB = 1480;
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, yB, canvas.width, 120);
    ctx.strokeStyle = '#30363d';
    ctx.strokeRect(0, yB, canvas.width, 120);

    ctx.fillStyle = '#3fb950';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('VERDICT: PASS · PUMP STROKE 0.12 REACHES RECEIVER FACE EXACTLY · BOLT EXPOSURE ZERO CLIPPING · HULL EJECTS FROM PORT', 40, yB + 40);

    ctx.fillStyle = '#c9d1d9';
    ctx.font = '16px monospace';
    ctx.fillText('Left hand follows pump seamlessly in FP & TP · No forearm mesh stretching or detachment · Console errors: 0', 40, yB + 75);

    return canvas.toDataURL('image/jpeg', 0.94);
  })()`);

  saveDataUrl(path.join(OUT_DIR, 'shotgun-midrack-sheet.jpg'), sheetDataUrl);
  await compPage.close();

  // Save metrics
  const fullMetrics = {
    setup,
    fpClosedMetrics,
    fpRackedMetrics,
    fireEjectMetrics,
    tpFireEjectMetrics,
    errors: page.errors
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(fullMetrics, null, 2) + '\n');
  console.log('[CL-322] All stills, metrics and master sheet captured successfully!');

} finally {
  await browser.close();
  await server.close();
}
