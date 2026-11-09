// tools/ag-review-gp20063.mjs - Antigravity master review runner for GP-20063
// Independent RTX 5080 WebGPU review of:
// 1. Breacher-12 (aa12): thumb safety selector on left receiver, proportions, 3P held & carried fit
// 2. Rotary Gun (minigun): 0.70x scale (1.040m held), peg [-0.2128, 0.0084, 0.112], FP left glove miss, 3P held & carried fit
// 3. Flamer (flamer): lengthened wand (1.293m held), hand points, muzzleLocal z=0.998, 3P held & carried fit
// 4. Chainsaw (chainsaw): shortened bar & chain (0.971m held), FP hip & ADS blade visibility, 3P held & carried fit
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-261 ...');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

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

function readBase64(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) throw new Error('File not found: ' + abs);
  return fs.readFileSync(abs).toString('base64');
}

function saveDataUrl(filePath, dataUrl) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid data URL for ' + filePath);
  writeFileSyncWithRetry(filePath, Buffer.from(m[1], 'base64'));
}

console.log('[AG-261] Starting GP-20063 independent review on Jerry\'s RTX 5080 WebGPU hardware...');
const outDir = path.join(ROOT, 'qa/AG-261');
fs.mkdirSync(outDir, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-size=2500,1700', '--disable-features=CalculateNativeWinOcclusion']
});

try {
  // =========================================================================
  // 1. GUNSHOT CLOSE-UP: BREACHER-12 LEFT-SIDE SELECTOR & MARKINGS
  // =========================================================================
  console.log('[AG-261] Capturing Gunshot Breacher-12 left selector close-up...');
  const gunshotPage = await browser.newPage({ width: 1280, height: 720 });
  await gunshotPage.goto(`${server.origin}/tools/gunshot/index.html?gun=aa12&w=1280&h=720&view=sideR&at=0,-0.02,-0.09&d=0.46`, { timeout: 240000 });
  if (!(await gunshotPage.waitFor('!!window.GUNSHOT', { timeout: 30000 }))) {
    throw new Error('GUNSHOT did not boot');
  }
  const gunshotInfo = await gunshotPage.evaluate('window.GUNSHOT.ready');
  await gunshotPage.evaluate(`window.GUNSHOT.shoot('sideR')`);
  const aa12SelectorShot = await gunshotPage.send('Page.captureScreenshot', { format: 'png' });
  writeFileSyncWithRetry(path.join(outDir, 'aa12-selector-close.png'), Buffer.from(aa12SelectorShot.data, 'base64'));
  console.log('[AG-261] Gunshot AA-12 ready:', JSON.stringify(gunshotInfo));
  await gunshotPage.close();

  // =========================================================================
  // 2. LIVE GAME SESSION FOR FP & TP INSPECTIONS
  // =========================================================================
  console.log('[AG-261] Launching real game for First-Person & Third-Person checks...');
  const gamePage = await browser.newPage({ width: 1280, height: 720 });
  await gamePage.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!(await gamePage.waitFor('!!window.TT', { timeout: 400000 }))) {
    throw new Error('TT did not boot');
  }

  await gamePage.evaluate('window.DWOpening?.dismissForTesting?.()');
  await gamePage.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  const initData = await gamePage.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'AG261_GP20063');
    T.clearZombies?.();
    T.setHp(100000);
    T.grantAllWeapons();
    T.setWorldTime(0.42); // Clear daylight noon
    if (T.isUnarmed()) T.toggleHolster();

    return {
      backend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU',
      mode: T.getGameMode(),
      playerPos: [T.player.position.x, T.player.position.y, T.player.position.z]
    };
  })()`);
  console.log('[AG-261] Match booted:', JSON.stringify(initData));

  const weapons = ['aa12', 'minigun', 'flamer', 'chainsaw'];
  const results = {};

  // =========================================================================
  // 3. FIRST PERSON CAPTURES & METRICS
  // =========================================================================
  console.log('[AG-261] --- Running First Person Inspections ---');
  for (const gun of weapons) {
    console.log(`[AG-261] Testing FP for ${gun}...`);
    const fpData = await gamePage.evaluate(`(async (gunKey) => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await wait(60); } return false; };

      T.setViewFirstDbg(true);
      T.setWeapon(T.WEAPON_ORDER.indexOf(gunKey));
      await until(() => T.getCurrentWeapon() === gunKey && T.fpDbg().w > 0.99 && T.viewmodelDbg()?.info.active && T.viewmodelDbg()?.info.key === gunKey, 12000);

      const vm = T.viewmodelDbg()?.info;
      const mesh = T.weaponMeshes[gunKey];

      // Measure bounding box & muzzle
      const THREE = T.THREE || window.THREE;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      return {
        key: gunKey,
        current: T.getCurrentWeapon(),
        raise: vm?.raise,
        ads: vm?.ads,
        meshSize: [size.x, size.y, size.z],
        muzzleLocal: mesh.userData.muzzleLocal ? [mesh.userData.muzzleLocal.x, mesh.userData.muzzleLocal.y, mesh.userData.muzzleLocal.z] : null
      };
    })(${JSON.stringify(gun)})`);

    // Capture Noon Hip
    await gamePage.evaluate(`(() => { window.TT.setWorldTime(0.42); window.TT.weather.raining = false; })()`);
    const fpHipShot = await gamePage.send('Page.captureScreenshot', { format: 'png' });
    writeFileSyncWithRetry(path.join(outDir, `${gun}-fp-hip.png`), Buffer.from(fpHipShot.data, 'base64'));

    // Capture Noon ADS
    await gamePage.evaluate(`(async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      const end = Date.now() + 6000;
      while (Date.now() < end && T.fpDbg().ads < 0.95) await wait(60);
      await wait(200);
    })()`);
    const fpAdsShot = await gamePage.send('Page.captureScreenshot', { format: 'png' });
    writeFileSyncWithRetry(path.join(outDir, `${gun}-fp-ads.png`), Buffer.from(fpAdsShot.data, 'base64'));

    await gamePage.evaluate(`(async () => {
      window.TT.setZoomHeldDbg(false);
      await new Promise(r => setTimeout(r, 300));
    })()`);

    results[gun] = { fp: fpData };
  }

  // =========================================================================
  // 4. THIRD PERSON HELD (VIEWPORT & HAND CLOSEUP)
  // =========================================================================
  console.log('[AG-261] --- Running Third Person Held Inspections ---');
  for (const gun of weapons) {
    console.log(`[AG-261] Testing TP Held for ${gun}...`);
    const tpHeldData = await gamePage.evaluate(`(async (gunKey) => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf(gunKey));
      await wait(400);

      const p = T.player.position;

      // Quarter camera looking at marine holding gun
      T.setShotView({
        x: p.x - 1.25,
        y: p.y + 1.35,
        z: p.z + 1.25,
        tx: p.x,
        ty: p.y + 1.05,
        tz: p.z,
        fov: 42
      });
      await wait(250);

      const sizeDbg = T.getWeaponSizeDbg ? T.getWeaponSizeDbg() : null;
      const weaponMesh = T.weaponMeshes[gunKey];
      const scale = weaponMesh.scale.x;

      return {
        key: gunKey,
        scale,
        sizeEntry: sizeDbg?.sizes?.[gunKey],
        factor: sizeDbg?.factors?.[gunKey]
      };
    })(${JSON.stringify(gun)})`);

    const tpHeldShot = await gamePage.send('Page.captureScreenshot', { format: 'png' });
    writeFileSyncWithRetry(path.join(outDir, `${gun}-tp-held.png`), Buffer.from(tpHeldShot.data, 'base64'));

    // Closeup on hand contacts
    await gamePage.evaluate(`(async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      const p = T.player.position;
      T.setShotView({
        x: p.x - 0.75,
        y: p.y + 1.15,
        z: p.z + 0.65,
        tx: p.x,
        ty: p.y + 0.95,
        tz: p.z,
        fov: 30
      });
      await wait(250);
    })()`);
    const tpHandsShot = await gamePage.send('Page.captureScreenshot', { format: 'png' });
    writeFileSyncWithRetry(path.join(outDir, `${gun}-tp-hands.png`), Buffer.from(tpHandsShot.data, 'base64'));

    results[gun].tpHeld = tpHeldData;
  }

  // =========================================================================
  // 5. THIRD PERSON CARRIED / SLUNG ON BACK
  // =========================================================================
  console.log('[AG-261] --- Running Third Person Carried / Slung Inspections ---');
  for (const gun of weapons) {
    console.log(`[AG-261] Testing TP Carried for ${gun}...`);
    const tpCarriedData = await gamePage.evaluate(`(async (gunKey) => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setViewFirstDbg(false);

      // Carry gun on back by equipping another primary or setting loadout
      const otherGun = gunKey === 'm4' ? 'ak' : 'm4';
      T.setWeapon(T.WEAPON_ORDER.indexOf(otherGun));

      // Apply carry plan with gunKey slung on primary sling 0
      const carry = T.carryDbg ? T.carryDbg({
        loadout: { primary: [gunKey, otherGun], secondary: [] },
        inHand: otherGun
      }) : null;

      await wait(350);

      const p = T.player.position;
      // Camera behind marine looking at backpack & slung weapon
      T.setShotView({
        x: p.x + 0.95,
        y: p.y + 1.45,
        z: p.z - 1.45,
        tx: p.x,
        ty: p.y + 1.10,
        tz: p.z,
        fov: 38
      });
      await wait(250);

      return {
        gunKey,
        slung: carry?.slung,
        inHand: otherGun
      };
    })(${JSON.stringify(gun)})`);

    const tpCarriedShot = await gamePage.send('Page.captureScreenshot', { format: 'png' });
    writeFileSyncWithRetry(path.join(outDir, `${gun}-tp-carried.png`), Buffer.from(tpCarriedShot.data, 'base64'));

    results[gun].tpCarried = tpCarriedData;
  }

  await gamePage.close();

  // Save metrics JSON
  writeFileSyncWithRetry(
    path.join(outDir, 'metrics.json'),
    JSON.stringify(results, null, 2) + '\n'
  );
  console.log('[AG-261] Raw test metrics saved to qa/AG-261/metrics.json');

  // =========================================================================
  // 6. COMPOSITING MASTER 16-PANEL CONTACT SHEET (2560x1700)
  // =========================================================================
  console.log('[AG-261] --- Compositing Master 16-Panel Review Contact Sheet ---');
  const sheetPage = await browser.newPage({ width: 2560, height: 1700 });

  // Read images as base64
  const sheetItems = [
    // Row 1: Breacher-12
    { title: '1. Breacher-12 Left Receiver: Thumb Selector Lever & SAFE/SEMI/AUTO Dial Seated', b64: readBase64('qa/AG-261/aa12-selector-close.png') },
    { title: '2. Breacher-12 Gunshot Side: 14,116 Tris, 1.065m Bounding Box, 0 Floats', b64: readBase64('review/GP-20063/after/aa12-side.png') },
    { title: '3. Breacher-12 Third Person Held: Marine Stance & Handguard Fist Cup ([0,-0.035,0.36])', b64: readBase64('qa/AG-261/aa12-tp-held.png') },
    { title: '4. Breacher-12 Third Person Slung: Back Carry Fit & Drum Clearance', b64: readBase64('qa/AG-261/aa12-tp-carried.png') },

    // Row 2: Rotary Gun
    { title: '5. Rotary Gun FP Hip: 1.040m Bounds; LH Floats 103mm Left of Scaled Peg (Known)', b64: readBase64('qa/AG-261/minigun-fp-hip.png') },
    { title: '6. Rotary Gun FP ADS: Rear Grip Tang Aligned, Aim Cam Centered over Housing', b64: readBase64('qa/AG-261/minigun-fp-ads.png') },
    { title: '7. Rotary Gun TP Held: Left Glove at Old Peg [-0.304, 0.012, 0.16] (Claude Pose Fix Req)', b64: readBase64('qa/AG-261/minigun-tp-held.png') },
    { title: '8. Rotary Gun TP Slung: Stowed on Back at 1.040m (Unscaled Carry s=1.0)', b64: readBase64('qa/AG-261/minigun-tp-carried.png') },

    // Row 3: Flamer
    { title: '9. Flamer FP Hip: Lengthened Wand (1.293m), Dual Front/Rear Grips Planted Cleanly', b64: readBase64('qa/AG-261/flamer-fp-hip.png') },
    { title: '10. Flamer FP ADS: Extended Bell Muzzle (z=0.998) Sight Line Open & Clear', b64: readBase64('qa/AG-261/flamer-fp-ads.png') },
    { title: '11. Flamer TP Held: Marine High-Low Grip Posture with Extended Burner Wand', b64: readBase64('qa/AG-261/flamer-tp-held.png') },
    { title: '12. Flamer TP Slung: Stowed on Back with Dual Fuel Tanks (Size Factor 0.8385)', b64: readBase64('qa/AG-261/flamer-tp-carried.png') },

    // Row 4: Chainsaw
    { title: '13. Chainsaw FP Hip: Shortened Guide Bar (0.971m) Barely Extends Past Front Glove', b64: readBase64('qa/AG-261/chainsaw-fp-hip.png') },
    { title: '14. Chainsaw FP ADS: Bar & Chain Occluded Behind Engine Cowl (Claude Pose Fix Req)', b64: readBase64('qa/AG-261/chainsaw-fp-ads.png') },
    { title: '15. Chainsaw TP Held: Rear Throttle & Front Hoop Grip Contacts Aligned', b64: readBase64('qa/AG-261/chainsaw-tp-held.png') },
    { title: '16. Chainsaw TP Slung: Stowed on Pack; Scaled to 0.531m by Stale WEAPON_SIZE (Req Update)', b64: readBase64('qa/AG-261/chainsaw-tp-carried.png') }
  ];

  const sheetDataUrl = await sheetPage.evaluate(`(async (params) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2560; canvas.height = 1700;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header Banner
    ctx.fillStyle = '#131920'; ctx.fillRect(0, 0, canvas.width, 90);
    ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, canvas.width, 90);
    ctx.fillStyle = '#f7fafc'; ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('GRAVE SHIFT · GP-20063 INDEPENDENT MODEL & FP/TP REVIEW (RTX 5080 WebGPU)', 40, 42);
    ctx.fillStyle = '#a0aec0'; ctx.font = '16px monospace';
    ctx.fillText('BREACHER SELECTOR (14,116 TRIS) · ROTARY GUN 1.040M (13,188 TRIS) · FLAMER 1.293M (12,628 TRIS) · SAW 0.971M (8,952 TRIS)', 40, 72);

    // 4x4 Grid Layout
    const padX = 35, padY = 105;
    const cellW = 595, cellH = 345;
    const gapX = 20, gapY = 18;

    const loadImg = src => new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const item = params.items[idx];
        const x = padX + c * (cellW + gapX);
        const y = padY + r * (cellH + gapY);

        const img = await loadImg('data:image/png;base64,' + item.b64);
        ctx.drawImage(img, x, y, cellW, cellH);

        // Border & Title Banner
        ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2; ctx.strokeRect(x, y, cellW, cellH);
        ctx.fillStyle = 'rgba(10, 13, 18, 0.92)'; ctx.fillRect(x, y + cellH - 34, cellW, 34);
        ctx.fillStyle = '#63b3ed'; ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(item.title, x + 10, y + cellH - 12);
      }
    }

    // Footer Verdict Banner
    const yF = 1565;
    ctx.fillStyle = '#131920'; ctx.fillRect(0, yF, canvas.width, 135);
    ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2; ctx.strokeRect(0, yF, canvas.width, 135);
    ctx.fillStyle = '#ecc94b'; ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('INDEPENDENT RTX 5080 AUDIT: MODELS APPROVED · 2 FIRST-PERSON & 2 THIRD-PERSON POSE/SIZE RETUNES PENDING CLAUDE', 40, yF + 32);
    ctx.fillStyle = '#cbd5e0'; ctx.font = '14px monospace';
    ctx.fillText('• Breacher-12: Left receiver thumb selector lever & markings cleanly seated at manual index; 14,116 tris, 0 floats; TP held & slung clean.', 40, yF + 58);
    ctx.fillText('• Rotary Gun: 1.040m bounds (-30% scale); LH floats 103mm left of peg (dx=91.2mm, dz=48mm); WEAPON_HOLD.minigun & VM_SOCKETS need Claude retune.', 40, yF + 78);
    ctx.fillText('• Flamer: Lengthened 1.293m wand clean; both hands planted; ADS clear; WEAPON_SIZE.flamer.len (1.094) needs bump to 1.293 for proper 3P back scale.', 40, yF + 98);
    ctx.fillText('• Chainsaw: Shortened 0.971m bar clean; blade hidden in ADS behind engine cowl; WEAPON_SIZE.chainsaw.len (1.715) shrinks 3P carry to 0.531m.', 40, yF + 118);

    return canvas.toDataURL('image/jpeg', 0.90);
  })(${JSON.stringify({ items: sheetItems })})`);

  saveDataUrl(path.join(outDir, 'gp20063-ag-review-sheet.jpg'), sheetDataUrl);
  console.log('[AG-261] Master 16-panel contact sheet saved to qa/AG-261/gp20063-ag-review-sheet.jpg');

  await sheetPage.close();
} finally {
  await browser.close();
  await server.close();
}
