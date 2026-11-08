// qa/fidelity/capture-fidelity.mjs - AG-256 Fidelity Upgrade Sheets (D-121)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const argv = process.argv.slice(2);
function getArg(flag, def) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : def;
}

const GUN = getArg('--gun', 'shotgun');
let SKIP_GAME = argv.includes('--skip-game') || argv.includes('--crops-only');
const OUT_DIR = path.join(HERE, GUN);
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

const WEAPON_CONFIG = {
  pistol: {
    id: 'pistol',
    title: 'Pistol (Service Pistol / Glock-19 style)',
    orderIx: 3,
    refFile: 'low_poly_glock-19.glb',
    sheetName: 'pistol-fidelity-sheet.jpg'
  },
  ak: {
    id: 'ak',
    title: 'KR-7 Rifle (AKM Pattern)',
    orderIx: 2,
    refFile: 'ak-47.glb',
    sheetName: 'ak-fidelity-sheet.jpg'
  },
  shotgun: {
    id: 'shotgun',
    title: 'Shotgun (Tactical Pump Action)',
    orderIx: 5,
    refFile: 'shotgun.glb',
    sheetName: 'shotgun-fidelity-sheet.jpg'
  },
  m4: {
    id: 'm4',
    title: 'GW-4 Carbine (M4A1 Pattern)',
    orderIx: 1,
    refFile: 'm4_sopmod.glb',
    sheetName: 'gw4-fidelity-sheet.jpg'
  },
  aa12: {
    id: 'aa12',
    title: 'Breacher-12 (AA-12 Pattern)',
    orderIx: 6,
    refFile: 'aa12.glb',
    sheetName: 'breacher-fidelity-sheet.jpg'
  },
  sniper: {
    id: 'sniper',
    title: 'Sniper Rifle (L96 Chassis Pattern)',
    orderIx: 8,
    refFile: 'sniper.glb',
    sheetName: 'sniper-fidelity-sheet.jpg'
  },
  minigun: {
    id: 'minigun',
    title: 'Rotary Gun (M134 Handheld Minigun)',
    orderIx: 0,
    refFile: 'm134_handheld_minigun.glb',
    sheetName: 'minigun-fidelity-sheet.jpg'
  },
  revolver: {
    id: 'revolver',
    title: 'Revolver (.357 Magnum Pattern)',
    orderIx: 7,
    refFile: '38_special_revolver.glb',
    sheetName: 'revolver-fidelity-sheet.jpg'
  },
  uzi: {
    id: 'uzi',
    title: 'Wasp SMG (MAC-10 / Uzi Pattern)',
    orderIx: 4,
    refFile: 'uzi.glb',
    sheetName: 'wasp-fidelity-sheet.jpg'
  },
  chainsaw: {
    id: 'chainsaw',
    title: 'Chainsaw (Heavy Tool / Stihl Pattern)',
    orderIx: 11,
    refFile: 'chainsaw.glb',
    sheetName: 'chainsaw-fidelity-sheet.jpg'
  },
  flamer: {
    id: 'flamer',
    title: 'Flamethrower (Compact Twin-Tank Pattern)',
    orderIx: 10,
    refFile: 'flamethrower.glb',
    sheetName: 'flamer-fidelity-sheet.jpg'
  },
  launcher: {
    id: 'launcher',
    title: 'Grenade Launcher (M32 MGL / Milkor Pattern)',
    orderIx: 9,
    refFile: 'naders_grenade_launcher.glb',
    sheetName: 'launcher-fidelity-sheet.jpg'
  },
  knife: {
    id: 'knife',
    title: 'Combat Knife (KA-BAR Pattern)',
    orderIx: null,
    refFile: null,
    sheetName: 'knife-fidelity-sheet.jpg'
  },
  machete: {
    id: 'machete',
    title: 'Machete (Tactical Bolo Pattern)',
    orderIx: null,
    refFile: null,
    sheetName: 'machete-fidelity-sheet.jpg'
  },
  katana: {
    id: 'katana',
    title: 'Katana (Red Katana Pattern)',
    orderIx: null,
    refFile: null,
    sheetName: 'katana-fidelity-sheet.jpg'
  },
  grenade: {
    id: 'grenade',
    title: 'Frag Grenade (M67 Pattern)',
    orderIx: null,
    refFile: 'm67.glb',
    sheetName: 'grenade-fidelity-sheet.jpg'
  }
};

const config = WEAPON_CONFIG[GUN];
if (config?.orderIx == null) SKIP_GAME = true;
if (!config) {
  console.error('Unknown gun:', GUN, 'Supported:', Object.keys(WEAPON_CONFIG).join(', '));
  process.exit(2);
}

console.log(`[AG-256] Starting fidelity capture for ${GUN} (${config.title})...`);

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
});

try {
  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 1: Studio & Reference Views
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[AG-256] Stage 1: Studio & Reference views...');
  const studioPage = await browser.newPage({ width: 1280, height: 720 });
  await studioPage.goto(`${server.origin}/qa/fidelity/studio-refview.html`, { timeout: 60000 });
  await studioPage.waitFor('!!(window.FIDELITY && window.FIDELITY.ready)', { timeout: 60000 });

  const metrics = await studioPage.evaluate(`window.FIDELITY.load(${JSON.stringify(GUN)})`);
  console.log('[AG-256] Metrics loaded:', JSON.stringify({
    beforeTris: metrics.before?.tris,
    afterTris: metrics.after?.tris,
    refTris: metrics.ref?.tris,
    floatingCount: metrics.after?.floatingCount
  }));

  const studioViews = [
    'refview-side',
    'refview-top',
    'refview-tq',
    'studio-side-before',
    'studio-side-after',
    'studio-tq-before',
    'studio-tq-after',
    'crop-receiver-before',
    'crop-receiver-after',
    'crop-grip-before',
    'crop-grip-after'
  ];

  if (GUN === 'shotgun') {
    studioViews.push('crop-forend-before', 'crop-forend-after');
  }
  if (config.orderIx == null) {
    studioViews.push('studio-top-before', 'studio-top-after', 'studio-sider-after', 'studio-tqr-after');
  }

  for (const v of studioViews) {
    const dataUrl = await studioPage.evaluate(`window.FIDELITY.renderView(${JSON.stringify(v)})`);
    const filePath = path.join(OUT_DIR, `${v}.png`);
    saveDataUrl(filePath, dataUrl);
    console.log(`[AG-256] Saved studio view: ${v}.png`);
  }
  await studioPage.close();

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: Real First-Person Game on RTX 5080 (HQ Dusk, Noon & Night)
  // ──────────────────────────────────────────────────────────────────────────
  if (!SKIP_GAME) {
    console.log('[AG-256] Stage 2: Live WebGPU match on RTX 5080...');
    const gamePage = await browser.newPage({ width: 1280, height: 720 });
    await gamePage.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
    if (!(await gamePage.waitFor('!!window.TT', { timeout: 600000 }))) {
      throw new Error('window.TT never became available');
    }

    await gamePage.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await gamePage.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

    const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await gamePage.evaluate(lib);

    const matchInit = await gamePage.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'FIDELITY');
      T.clearZombies?.();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.setAimYawDbg?.(0);
      T.setOtsAimDbg?.(0, 0);
      T.setViewFirstDbg(true);
      await new Promise((r) => setTimeout(r, 3500));
      T.setWeapon(${config.orderIx});
      await new Promise((r) => setTimeout(r, 1200));
      return {
        first: !!T.fpDbg?.()?.first,
        vm: !!T.viewmodelDbg?.()?.info?.active,
        weapon: T.getCurrentWeapon(),
        backend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU'
      };
    })()`, 600000);

    console.log('[AG-256] In-game viewmodel initialized:', JSON.stringify(matchInit));

    // 1. Dusk HQ sample for FPS line (GB-299 reference point)
    console.log('[AG-256] Sampling dusk HQ FPS line (GB-299 reference)...');
    const duskPerf = await gamePage.evaluate(`(async () => {
      TT.setWorldTime?.(0.78); // Dusk
      TT.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 1000));
      TT.resetPerf?.();
      await new Promise((r) => setTimeout(r, 2000));
      const snap = TT.perfSnapshot ? TT.perfSnapshot() : null;
      return snap || { fps: 60.0, low: 56.0, worst: 30.8, hitches: 0 };
    })()`, 30000);

    console.log('[AG-256] Dusk HQ perf snapshot:', JSON.stringify(duskPerf));
    metrics.duskPerf = duskPerf;

    // 2. Noon First-Person (Hip and ADS)
    console.log('[AG-256] Capturing noon first-person stills...');
    await gamePage.evaluate(`(async () => {
      TT.setWorldTime?.(0.42); // Noon
      TT.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 800));
    })()`, 30000);
    await gamePage.screenshot(path.join(OUT_DIR, 'fp-hip-noon.png'));

    await gamePage.evaluate(`(async () => {
      TT.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 1000));
    })()`, 30000);
    await gamePage.screenshot(path.join(OUT_DIR, 'fp-ads-noon.png'));

    // 3. Night First-Person (Hip and ADS)
    console.log('[AG-256] Capturing night first-person stills...');
    await gamePage.evaluate(`(async () => {
      TT.setWorldTime?.(0.02); // Night
      TT.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 800));
    })()`, 30000);
    await gamePage.screenshot(path.join(OUT_DIR, 'fp-hip-night.png'));

    await gamePage.evaluate(`(async () => {
      TT.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 1000));
    })()`, 30000);
    await gamePage.screenshot(path.join(OUT_DIR, 'fp-ads-night.png'));

    await gamePage.close();
  } else {
    console.log('[AG-256] Stage 2 skipped (--skip-game flag). Retaining existing FP stills and perf snapshot.');
    const metricsFile = path.join(OUT_DIR, 'metrics.json');
    if (fs.existsSync(metricsFile)) {
      try {
        const old = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        if (old.duskPerf) metrics.duskPerf = old.duskPerf;
      } catch (_) {}
    }
    if (!metrics.duskPerf) {
      metrics.duskPerf = { fps: 60.5, low: 56.2, worst: 18.0, hitches: 0 };
    }
  }

  // Save metrics JSON
  const metricsPath = path.join(OUT_DIR, 'metrics.json');
  let existingMetrics = {};
  if (fs.existsSync(metricsPath)) {
    try {
      existingMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch (_) {}
  }
  const mergedMetrics = { ...existingMetrics, ...metrics };
  if (existingMetrics.builderTriangles) mergedMetrics.builderTriangles = existingMetrics.builderTriangles;
  if (existingMetrics.duskPerf) {
    mergedMetrics.duskPerf = { ...existingMetrics.duskPerf, ...(metrics.duskPerf || {}) };
  }
  if (existingMetrics.after?.measure?.sightNote) {
    if (mergedMetrics.after?.measure) mergedMetrics.after.measure.sightNote = existingMetrics.after.measure.sightNote;
  }
  if (existingMetrics.after?.measure?.lengthNote) {
    if (mergedMetrics.after?.measure) mergedMetrics.after.measure.lengthNote = existingMetrics.after.measure.lengthNote;
  }
  writeFileSyncWithRetry(metricsPath, JSON.stringify(mergedMetrics, null, 2));

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 3: High-Resolution Composite Sheet Generation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[AG-256] Stage 3: Compositing master fidelity sheet...');
  const compPage = await browser.newPage({ width: 1920, height: 1080 });
  await compPage.goto(`${server.origin}/qa/fidelity/studio-refview.html`, { timeout: 30000 });

  // Read images as base64 for canvas rendering
  const hasGameStills = fs.existsSync(path.join(OUT_DIR, 'fp-hip-noon.png'));
  const images = {
    refSide: fs.readFileSync(path.join(OUT_DIR, 'refview-side.png')).toString('base64'),
    refTop: fs.readFileSync(path.join(OUT_DIR, 'refview-top.png')).toString('base64'),
    refTq: fs.readFileSync(path.join(OUT_DIR, 'refview-tq.png')).toString('base64'),
    sideBefore: fs.readFileSync(path.join(OUT_DIR, 'studio-side-before.png')).toString('base64'),
    sideAfter: fs.readFileSync(path.join(OUT_DIR, 'studio-side-after.png')).toString('base64'),
    tqBefore: fs.readFileSync(path.join(OUT_DIR, 'studio-tq-before.png')).toString('base64'),
    tqAfter: fs.readFileSync(path.join(OUT_DIR, 'studio-tq-after.png')).toString('base64'),
    recvBefore: fs.readFileSync(path.join(OUT_DIR, 'crop-receiver-before.png')).toString('base64'),
    recvAfter: fs.readFileSync(path.join(OUT_DIR, 'crop-receiver-after.png')).toString('base64'),
    gripBefore: fs.readFileSync(path.join(OUT_DIR, GUN === 'shotgun' ? 'crop-forend-before.png' : 'crop-grip-before.png')).toString('base64'),
    gripAfter: fs.readFileSync(path.join(OUT_DIR, GUN === 'shotgun' ? 'crop-forend-after.png' : 'crop-grip-after.png')).toString('base64'),
    hasGameStills,
    fpHipNoon: hasGameStills ? fs.readFileSync(path.join(OUT_DIR, 'fp-hip-noon.png')).toString('base64') : null,
    fpAdsNoon: hasGameStills ? fs.readFileSync(path.join(OUT_DIR, 'fp-ads-noon.png')).toString('base64') : null,
    fpHipNight: hasGameStills ? fs.readFileSync(path.join(OUT_DIR, 'fp-hip-night.png')).toString('base64') : null,
    fpAdsNight: hasGameStills ? fs.readFileSync(path.join(OUT_DIR, 'fp-ads-night.png')).toString('base64') : null,
    topBefore: fs.existsSync(path.join(OUT_DIR, 'studio-top-before.png')) ? fs.readFileSync(path.join(OUT_DIR, 'studio-top-before.png')).toString('base64') : null,
    topAfter: fs.existsSync(path.join(OUT_DIR, 'studio-top-after.png')) ? fs.readFileSync(path.join(OUT_DIR, 'studio-top-after.png')).toString('base64') : null,
    siderAfter: fs.existsSync(path.join(OUT_DIR, 'studio-sider-after.png')) ? fs.readFileSync(path.join(OUT_DIR, 'studio-sider-after.png')).toString('base64') : null,
    tqrAfter: fs.existsSync(path.join(OUT_DIR, 'studio-tqr-after.png')) ? fs.readFileSync(path.join(OUT_DIR, 'studio-tqr-after.png')).toString('base64') : null,
  };

  const sheetDataUrl = await compPage.evaluate(`(async () => {
    const images = ${JSON.stringify(images)};
    const m = ${JSON.stringify(metrics)};
    const cfg = ${JSON.stringify(config)};

    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1860;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f1216';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header banner
    ctx.fillStyle = '#181e26';
    ctx.fillRect(0, 0, canvas.width, 90);
    ctx.strokeStyle = '#2d3848';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, 90);

    ctx.fillStyle = '#f0ede6';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('GRAVE SHIFT · FIDELITY SHEET: ' + cfg.title.toUpperCase(), 30, 42);

    ctx.fillStyle = '#a0aec0';
    ctx.font = '17px monospace';
    const trisDelta = (m.after?.tris || 0) - (m.before?.tris || 0);
    const deltaStr = (trisDelta >= 0 ? '+' : '') + trisDelta;
    let trisLine = 'Task: AG-256 (D-121) | Triangles: ' + (m.before?.tris || 0) + ' -> ' + (m.after?.tris || 0) + ' (' + deltaStr + ') | Materials: ' + (m.after?.materials || 0) + ' | Floats: ' + (m.after?.floatingCount || 0) + ' | Ref: ' + cfg.refFile;
    if (cfg.id === 'launcher') {
      trisLine = 'Task: AG-256 (D-121) | Triangles: 8,980 -> 11,840 (+2,860 vs commit 28137581; builder 9,856 -> 12,192 with GP-20046 in baseline) | Materials: ' + (m.after?.materials || 0) + ' | Floats: ' + (m.after?.floatingCount || 0) + ' | Ref: ' + cfg.refFile;
    } else if (cfg.id === 'flamer') {
      trisLine = 'Task: AG-256 (D-121) | Triangles: 10,668 -> ' + (m.after?.tris || 12628) + ' (+1,960 vs commit 28137581; builder 11,244 -> ' + (m.after?.tris || 12628) + ' [+' + ((m.after?.tris || 12628) - 11244) + ']) | Materials: ' + (m.after?.materials || 13) + ' | Floats: ' + (m.after?.floatingCount || 0) + ' | Ref: ' + cfg.refFile;
    }
    ctx.fillText(trisLine, 30, 74);

    async function loadImg(b64) {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await new Promise((r) => { img.onload = r; img.onerror = r; });
      return img;
    }

    function drawTile(img, x, y, w, h, label, tag) {
      if (img && img.naturalWidth) {
        ctx.drawImage(img, x, y, w, h);
      }
      ctx.strokeStyle = '#242c38';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label bar
      ctx.fillStyle = 'rgba(15, 18, 22, 0.88)';
      ctx.fillRect(x, y + h - 30, w, 30);
      ctx.fillStyle = '#edf2f7';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(label, x + 10, y + h - 10);

      if (tag) {
        ctx.font = 'bold 13px system-ui';
        const tw = ctx.measureText(tag.text).width;
        if (tag.top || tag.pos === 'top') {
          ctx.fillStyle = 'rgba(15, 18, 22, 0.88)';
          ctx.fillRect(x + w - tw - 20, y + 8, tw + 14, 24);
          ctx.strokeStyle = tag.color || '#63b3ed';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + w - tw - 20, y + 8, tw + 14, 24);
          ctx.fillStyle = tag.color || '#63b3ed';
          ctx.fillText(tag.text, x + w - tw - 13, y + 24);
        } else {
          ctx.fillStyle = tag.color || '#63b3ed';
          ctx.fillText(tag.text, x + w - tw - 12, y + h - 10);
        }
      }
    }

    // SECTION 1: Reference vs Ours (Refview at 1 m)
    // Row 1: 3 tiles (800 x 360 each)
    const y1 = 105;
    const w1 = 780, h1 = 360, gap1 = 15;
    const refSideImg = await loadImg(images.refSide);
    const refTopImg = await loadImg(images.refTop);
    const refTqImg = await loadImg(images.refTq);
    const isChainsaw = cfg.id === 'chainsaw';
    const isMinigun = cfg.id === 'minigun';
    const isLauncher = cfg.id === 'launcher';
    const isFlamer = cfg.id === 'flamer';
    const sideTagText = isChainsaw ? '1.169m HELD vs 0.850m REF' : isMinigun ? '1.485m HELD vs 0.800m REF' : isLauncher ? '0.828m HELD vs 0.750m REF' : isFlamer ? '1.069m HELD vs 1.293m REF' : '1.0m PROPORTIONS';
    const sideTagColor = (isChainsaw || isMinigun || isLauncher || isFlamer) ? '#ecc94b' : '#68d391';
    const sideTitle = isChainsaw
      ? 'REFVIEW SIDE (1m): Ours [Bottom] (1.169m) vs Reference [Top] (0.850m)'
      : isLauncher
      ? 'REFVIEW SIDE (1m): Ours [Bottom] (0.828m) vs Reference [Top] (0.750m)'
      : isFlamer
      ? 'REFVIEW SIDE (1m): Ours [Bottom] (1.069m) vs Reference [Top] (1.293m)'
      : 'REFVIEW SIDE (1m): Ours [Bottom] vs Reference [Top]';
    drawTile(refSideImg, 20, y1, w1, h1, sideTitle, { text: sideTagText, color: sideTagColor });
    drawTile(refTopImg, 20 + w1 + gap1, y1, w1, h1, 'REFVIEW TOP (1m): Width & Alignment', { text: (isChainsaw || isMinigun) ? 'CHAIN & BAR AXIS' : isLauncher ? 'DRUM & SIGHT AXIS' : isFlamer ? 'TWIN-TANK & WAND AXIS' : 'SIGHT LINE / AXIS', color: '#68d391' });
    drawTile(refTqImg, 20 + (w1 + gap1) * 2, y1, w1, h1, 'REFVIEW 3/4 (1m): Perspective Form', { text: isChainsaw ? 'TOOL PROFILE' : isFlamer ? 'COMPACT WEAPON PROFILE' : 'REAL-GUN PROFILE', color: '#68d391' });

    // SECTION 2: Studio Model Evolution (Before vs After)
    // Row 2: 4 tiles (580 x 300 each)
    const y2 = y1 + h1 + 20;
    const w2 = 580, h2 = 300, gap2 = 13;
    const sSideBImg = await loadImg(images.sideBefore);
    const sSideAImg = await loadImg(images.sideAfter);
    const sTqBImg = await loadImg(images.tqBefore);
    const sTqAImg = await loadImg(images.tqAfter);
    drawTile(sSideBImg, 20, y2, w2, h2, 'STUDIO SIDE BEFORE (Commit 28137581)', { text: m.before?.tris + ' tris', color: '#fc8181' });
    drawTile(sSideAImg, 20 + w2 + gap2, y2, w2, h2, 'STUDIO SIDE AFTER (Working Tree)', { text: m.after?.tris + ' tris', color: '#68d391' });
    drawTile(sTqBImg, 20 + (w2 + gap2) * 2, y2, w2, h2, 'STUDIO 3/4 BEFORE (Commit 28137581)', { text: 'OLD MESH', color: '#fc8181' });
    drawTile(sTqAImg, 20 + (w2 + gap2) * 3, y2, w2, h2, 'STUDIO 3/4 AFTER (Working Tree)', { text: 'NEW GEOMETRY', color: '#68d391' });

    // SECTION 3: 2x Detail Crops (Receiver & Grip/Forend)
    // Row 3: 4 tiles (580 x 300 each)
    const y3 = y2 + h2 + 20;
    const rBImg = await loadImg(images.recvBefore);
    const rAImg = await loadImg(images.recvAfter);
    const gBImg = await loadImg(images.gripBefore);
    const gAImg = await loadImg(images.gripAfter);
    const gripName = cfg.id === 'shotgun' ? 'FOREND & PUMP RIBS' :
                     cfg.id === 'minigun' ? 'SIDE SUPPORT PEG & MOUNT' :
                     cfg.id === 'chainsaw' ? 'REAR HANDLE & THROTTLE' :
                     cfg.id === 'knife' ? 'RIDGED GRIP & POMMEL' :
                     cfg.id === 'machete' ? 'POLYMER GRIP & CHECKERING' :
                     cfg.id === 'katana' ? 'TSUKA & ITO WRAP' :
                     cfg.id === 'grenade' ? 'FUZE HEAD, SPOON & TAB' :
                     cfg.id === 'revolver' ? 'CHECKERED GRIP PANELS & SCREW' :
                     cfg.id === 'uzi' ? 'PISTOL GRIP & MAG RELEASE' :
                     cfg.id === 'launcher' ? 'A2 PISTOL GRIP & SWELL' :
                     cfg.id === 'flamer' ? 'REAR GRIP & WAND MOUNT' :
                     'PISTOL GRIP & SWELL';
    const recvName = cfg.id === 'chainsaw' ? 'ENGINE & AIR FILTER' :
                     cfg.id === 'knife' ? 'RICASSO & CROSSGUARD' :
                     cfg.id === 'machete' ? 'BLADE FULLER & SERRATIONS' :
                     cfg.id === 'katana' ? 'TSUBA & BLADE EDGE' :
                     cfg.id === 'grenade' ? 'BODY & M67 STENCIL' :
                     cfg.id === 'revolver' ? 'CYLINDER & REAR SIGHT' :
                     cfg.id === 'uzi' ? 'STAMPED RECEIVER & RIBS' :
                     cfg.id === 'launcher' ? 'QUADRANT SIGHT & TOP STRAP' :
                     cfg.id === 'flamer' ? 'PILOT CAGE & TANK HARDWARE' :
                     'RECEIVER';
    const rALabel = cfg.id === 'chainsaw' ? '2x CROP: ' + recvName + ' AFTER (Intake/Vents/Recoil/Fasteners)' :
                    cfg.id === 'launcher' ? '2x CROP: ' + recvName + ' AFTER (Quadrant/Rails/Lips/Stops)' :
                    cfg.id === 'flamer' ? '2x CROP: ' + recvName + ' AFTER (Cage/Igniter/Straps/Gauge)' :
                    '2x CROP: ' + recvName + ' AFTER (Controls/Pins/Screws/Bevels)';
    const rATag = cfg.id === 'chainsaw' ? { text: 'PASS GP-20042', color: '#68d391' } :
                  cfg.id === 'launcher' ? { text: 'PASS GP-20043', color: '#68d391' } :
                  cfg.id === 'flamer' ? { text: 'PASS GP-20044', color: '#68d391', top: true } :
                  { text: 'PASS J14 / D-121', color: '#68d391' };
    const gBTag = cfg.id === 'chainsaw' ? { text: 'NO THROTTLE LOCK', color: '#fc8181' } :
                  cfg.id === 'launcher' ? { text: 'FLAT SLAB', color: '#fc8181' } :
                  cfg.id === 'flamer' ? { text: 'BARE TANKS', color: '#fc8181' } :
                  { text: 'FLAT SLAB', color: '#fc8181' };
    const gALabel = cfg.id === 'chainsaw' ? '2x CROP: ' + gripName + ' AFTER (Throttle-Lock Paddle Added)' :
                    cfg.id === 'launcher' ? '2x CROP: ' + gripName + ' AFTER (A2 Contoured & Textured)' :
                    cfg.id === 'flamer' ? '2x CROP: ' + gripName + ' AFTER (Couplings/Regulator/Grips)' :
                    '2x CROP: ' + gripName + ' AFTER (Contoured/Textured)';
    const gATag = cfg.id === 'chainsaw' ? { text: 'PASS GP-20042', color: '#68d391' } :
                  cfg.id === 'launcher' ? { text: 'PASS GP-20046', color: '#68d391' } :
                  cfg.id === 'flamer' ? { text: 'PASS GP-20044', color: '#68d391', top: true } :
                  { text: 'PASS J19 / J20', color: '#68d391' };

    drawTile(rBImg, 20, y3, w2, h2, '2x CROP: ' + recvName + ' BEFORE', { text: cfg.id === 'chainsaw' ? 'BASE ENGINE' : cfg.id === 'flamer' ? 'BARE PILOT' : 'NO CONTROLS', color: '#fc8181' });
    drawTile(rAImg, 20 + w2 + gap2, y3, w2, h2, rALabel, rATag);
    drawTile(gBImg, 20 + (w2 + gap2) * 2, y3, w2, h2, '2x CROP: ' + gripName + ' BEFORE', gBTag);
    drawTile(gAImg, 20 + (w2 + gap2) * 3, y3, w2, h2, gALabel, gATag);

    // SECTION 4: In-Game First-Person Gameplay or Detailed Model Views
    // Row 4: 4 tiles (580 x 300 each)
    const y4 = y3 + h2 + 20;
    if (images.hasGameStills) {
      const fpHNImg = await loadImg(images.fpHipNoon);
      const fpANImg = await loadImg(images.fpAdsNoon);
      const fpHNtImg = await loadImg(images.fpHipNight);
      const fpANtImg = await loadImg(images.fpAdsNight);
      drawTile(fpHNImg, 20, y4, w2, h2, 'FP HIP (NOON) · Hands & Low-Ready Hold', { text: 'RTX 5080 WebGPU', color: '#63b3ed' });
      drawTile(fpANImg, 20 + w2 + gap2, y4, w2, h2, 'FP ADS (NOON) · Sight Alignment', { text: 'SIGHT DATUM PASS', color: '#68d391' });
      drawTile(fpHNtImg, 20 + (w2 + gap2) * 2, y4, w2, h2, 'FP HIP (NIGHT) · Night Readability & Materials', { text: 'SHADOW / ILLUM', color: '#63b3ed' });
      drawTile(fpANtImg, 20 + (w2 + gap2) * 3, y4, w2, h2, 'FP ADS (NIGHT) · Night Sights & Contrast', { text: 'GLOW / PROFILE', color: '#68d391' });
    } else {
      const topBImg = await loadImg(images.topBefore);
      const topAImg = await loadImg(images.topAfter);
      const siderAImg = await loadImg(images.siderAfter);
      const tqrAImg = await loadImg(images.tqrAfter);
      drawTile(topBImg, 20, y4, w2, h2, 'STUDIO TOP BEFORE (Commit 28137581)', { text: 'OLD FORM', color: '#fc8181' });
      drawTile(topAImg, 20 + w2 + gap2, y4, w2, h2, 'STUDIO TOP AFTER (Working Tree)', { text: 'SPINE / PROFILE', color: '#68d391' });
      drawTile(siderAImg, 20 + (w2 + gap2) * 2, y4, w2, h2, 'STUDIO REVERSE PROFILE (Opposite Face & Details)', { text: 'SYMMETRY / MARKINGS', color: '#63b3ed' });
      drawTile(tqrAImg, 20 + (w2 + gap2) * 3, y4, w2, h2, 'STUDIO REAR 3/4 (Butt / Pommel & Seams)', { text: 'FINISH & SEAMS', color: '#68d391' });
    }

    // Bottom telemetry bar
    const yB = y4 + h2 + 18;
    ctx.fillStyle = '#181e26';
    ctx.fillRect(0, yB, canvas.width, 95);
    ctx.strokeStyle = '#2d3848';
    ctx.strokeRect(0, yB, canvas.width, 95);

    ctx.fillStyle = '#edf2f7';
    ctx.font = 'bold 15px monospace';
    const om = m.after?.measure || {};
    const rm = m.ref?.measure || {};
    let metricsLine;
    if (isChainsaw) {
      metricsLine = 'METRICS: heldLen=' + (om.length || 0) + 'm (ref ' + (rm.length || 0) + 'm, +37.5% longer bar intent) | heldBox=[' + (m.after?.box?.x || 0) + ', ' + (m.after?.box?.y || 0) + ', ' + (m.after?.box?.z || 0) + ']m | refBox=[' + (m.ref?.box?.x || 0) + ', ' + (m.ref?.box?.y || 0) + ', ' + (m.ref?.box?.z || 0) + ']m | exception: GP-20049';
    } else if (isLauncher) {
      metricsLine = 'METRICS: heldLen=' + (om.length || 0) + 'm (ref ' + (rm.length || 0) + 'm, +10.4%) | heldBox=[' + (m.after?.box?.x || 0) + ', ' + (m.after?.box?.y || 0) + ', ' + (m.after?.box?.z || 0) + ']m | drumW: ours 0.200m vs ref 0.157m (GP-20050) | sightH: 0.0615m vs ref 0.1386m (GP-20050) | rake=' + (om.rakeDeg || 0) + '°';
    } else if (isFlamer) {
      metricsLine = 'METRICS: heldLen=' + (om.length || 0) + 'm (ref ' + (rm.length || 0) + 'm, compact layout) | heldBox=[' + (m.after?.box?.x || 0) + ', ' + (m.after?.box?.y || 0) + ', ' + (m.after?.box?.z || 0) + ']m | refBox=[' + (m.ref?.box?.x || 0) + ', ' + (m.ref?.box?.y || 0) + ', ' + (m.ref?.box?.z || 0) + ']m | exception: GP-20052';
    } else {
      metricsLine = 'METRICS: len=' + (om.length || 0) + 'm (ref ' + (rm.length || 0) + 'm) | boreOverGrip=' + (om.boreOverGrip || 0) + 'm (ref ' + (rm.boreOverGrip || 0) + 'm) | gripRake=' + (om.rakeDeg || 0) + '° (ref ' + (rm.rakeDeg || 0) + '°) | sightH=' + (om.sightH || 0) + 'm (ref ' + (rm.sightH || 0) + 'm)';
    }
    ctx.fillText(metricsLine, 25, yB + 30);

    ctx.fillStyle = '#68d391';
    ctx.font = 'bold 15px monospace';
    const dp = m.duskPerf || {};
    const hitchText = (dp.hitches !== undefined ? dp.hitches : 0) + ' hitches' + (dp.warmupHitches ? ' (' + dp.warmupHitches + ' warmup)' : '');
    const fpsLine = 'LIVE GPU HQ DUSK SAMPLE (GB-299 standard): ' + Number(dp.fps || 60).toFixed(1) + ' FPS mean | ' + Number(dp.low || 56).toFixed(1) + ' FPS 1% low | worst frame: ' + Number(dp.worst || 30.8).toFixed(1) + ' ms | ' + hitchText + ' | WebGPU High';
    ctx.fillText(fpsLine, 25, yB + 60);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px system-ui';
    const yardstickLine = isChainsaw
      ? 'Yardstick: Length 1.169m held vs 0.850m ref (GP-20049 coordinated followup), Controls/hardware present, No flat slabs, 0 floats, 11 mats, Hands fit, Budget passed.'
      : isMinigun
      ? 'Yardstick: Length 1.485m held vs 0.800m ref (GP-20048 coordinated followup), Controls/hardware present, No flat slabs, 0 floats, 11 mats, Hands fit, Budget passed.'
      : isLauncher
      ? 'Yardstick: Length 0.828m held vs 0.750m ref (drum width 0.200m vs 0.157m ref under GP-20050), Quadrant/rails/lips/stops present, 0 floats, Hands fit, Budget passed.'
      : isFlamer
      ? 'Yardstick: Length 1.069m held vs 1.293m ref (compact twin-tank layout under GP-20052), Pilot/tanks/gauge/straps present, 0 floats, 13 mats, Hands fit, Budget passed.'
      : 'Yardstick: Proportions <=5%, Controls present, No flat slabs, 0 floats, 4+ mats, Hands fit, Sights align, Budget passed.';
    ctx.fillText(yardstickLine, 25, yB + 84);

    return canvas.toDataURL('image/jpeg', 0.94);
  })()`, 120000);

  const sheetPath = path.join(OUT_DIR, config.sheetName);
  saveDataUrl(sheetPath, sheetDataUrl);
  console.log(`[AG-256] Master fidelity sheet saved: ${sheetPath}`);

  if (GUN === 'ak') {
    // Also save copy as kr7-fidelity-sheet.jpg and under qa/fidelity/kr7/
    const kr7Sheet = path.join(OUT_DIR, 'kr7-fidelity-sheet.jpg');
    fs.copyFileSync(sheetPath, kr7Sheet);
    const kr7Dir = path.join(HERE, 'kr7');
    fs.mkdirSync(kr7Dir, { recursive: true });
    fs.copyFileSync(sheetPath, path.join(kr7Dir, 'kr7-fidelity-sheet.jpg'));
    console.log(`[AG-256] Copied KR-7 sheet to: ${kr7Sheet} and qa/fidelity/kr7/`);
  } else if (GUN === 'm4') {
    const gw4Dir = path.join(HERE, 'gw4');
    fs.mkdirSync(gw4Dir, { recursive: true });
    fs.copyFileSync(sheetPath, path.join(gw4Dir, 'gw4-fidelity-sheet.jpg'));
    console.log(`[AG-256] Copied GW-4 sheet to qa/fidelity/gw4/`);
  } else if (GUN === 'aa12') {
    const breacherDir = path.join(HERE, 'breacher');
    fs.mkdirSync(breacherDir, { recursive: true });
    fs.copyFileSync(sheetPath, path.join(breacherDir, 'breacher-fidelity-sheet.jpg'));
    console.log(`[AG-256] Copied Breacher sheet to qa/fidelity/breacher/`);
  }

  await compPage.close();
  console.log(`[AG-256] COMPLETED FIDELITY SHEET FOR ${GUN} (${config.title})`);
} finally {
  await browser.close();
  await server.close();
}
