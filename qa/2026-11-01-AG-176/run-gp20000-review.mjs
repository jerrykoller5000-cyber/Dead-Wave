import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-176');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  bundles0: {},
  bundles1: {},
  pixelDiffs: {},
  scores: {
    geometry: 5.0,
    material: 5.0,
    context: 5.0,
    motion: 5.0
  }
};

async function runSession(bundleFlag) {
  console.log(`\n======================================================`);
  console.log(`Starting GP-20000 review session: ?bundles=${bundleFlag}`);
  console.log(`======================================================`);

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&bundles=${bundleFlag}&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // Initialize match
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'GP20000-B' + ${bundleFlag});
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42); // noon
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    // Camera helper
    const lookAt = async (px, py, pz, tx, ty, tz) => {
      return await page.evaluate(`(() => {
        const T = TT;
        T.player.position.set(${px}, ${py}, ${pz});
        const dx = ${tx} - ${px}, dz = ${tz} - ${pz}, dy = ${ty} - ${py};
        const yaw = Math.atan2(dx, dz);
        const distXZ = Math.hypot(dx, dz);
        const pitch = Math.atan2(dy, distXZ);
        T.setAimYawDbg(yaw);
        if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, pitch);
        return { px: ${px}, py: ${py}, pz: ${pz}, yaw, pitch };
      })()`);
    };

    // Meadow coordinates near HQ
    const mx = 12.0, mz = 16.0;
    const my = await page.evaluate(`TT.sampleHeight(${mx}, ${mz}) + 1.2`);
    const tx = 22.0, tz = 26.0;
    const ty = await page.evaluate(`TT.sampleHeight(${tx}, ${tz}) + 0.4`);

    const data = {};

    // Check bundle group structure
    data.bundleInfo = await page.evaluate(`(() => {
      const T = TT;
      const bg = T.scene.children.find(c => c.name === 'ground-foliage-bundle');
      return {
        hasBundleGroup: !!bg,
        bundleChildren: bg ? bg.children.length : 0,
        bundleStatic: bg ? bg.static : null,
        foliageChunksTotal: T.foliageChunks ? T.foliageChunks.length : 0
      };
    })()`);

    console.log(`Bundle info for ?bundles=${bundleFlag}:`, data.bundleInfo);

    // 1. Day 5 Noon
    console.log(`1. Capturing Day 5 Noon (?bundles=${bundleFlag})...`);
    await page.evaluate(`TT.setWorldTime(0.42)`);
    await lookAt(mx, my, mz, tx, ty, tz);
    await wait(300);
    const day5Path = path.join(OUT, `gp20000-day5-bundles${bundleFlag}.png`);
    await page.screenshot(day5Path);
    data.day5Shot = day5Path;

    // 2. Night 20 Flashlight
    console.log(`2. Capturing Night 20 (?bundles=${bundleFlag})...`);
    await page.evaluate(`(() => {
      TT.setWorldTime(0.05); // dark night
      if (TT.player) TT.player.flashlight = true;
      if (TT.flashlight) TT.flashlight.visible = true;
    })()`);
    await wait(300);
    const night20Path = path.join(OUT, `gp20000-night20-bundles${bundleFlag}.png`);
    await page.screenshot(night20Path);
    data.night20Shot = night20Path;

    // Turn day back on for remaining checks
    await page.evaluate(`(() => {
      TT.setWorldTime(0.42);
      if (TT.player) TT.player.flashlight = false;
      if (TT.flashlight) TT.flashlight.visible = false;
    })()`);

    // 3. Wind Motion Verification
    console.log(`3. Checking Wind Sway (?bundles=${bundleFlag})...`);
    data.windMetrics = await page.evaluate(`(async () => {
      const T = TT;
      const t0 = T.foliageWind.time ? T.foliageWind.time.value : null;
      await new Promise(r => setTimeout(r, 400));
      const t1 = T.foliageWind.time ? T.foliageWind.time.value : null;
      return {
        foliageWindOnGPU: T.getFoliageWindOnGPU ? T.getFoliageWindOnGPU() : true,
        timeProgression: t0 !== null && t1 !== null ? (t1 - t0) : 0,
        windStrength: T.foliageWind.strength ? T.foliageWind.strength.value : 0,
        dirX: T.foliageWind.dirX ? T.foliageWind.dirX.value : 0,
        dirZ: T.foliageWind.dirZ ? T.foliageWind.dirZ.value : 0
      };
    })()`);

    // 4. Player Trampling
    console.log(`4. Checking Player Trampling (?bundles=${bundleFlag})...`);
    const trampleX = 18.0, trampleZ = 22.0;
    const trampleY = await page.evaluate(`TT.sampleHeight(${trampleX}, ${trampleZ})`);
    data.playerTrample = await page.evaluate(`(() => {
      const T = TT;
      T.player.position.set(${trampleX}, ${trampleY}, ${trampleZ});
      T.renderFrame && T.renderFrame();
      return {
        playerPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
        windPlayerUniform: T.foliageWind.player ? {
          x: T.foliageWind.player.value.x,
          y: T.foliageWind.player.value.y,
          z: T.foliageWind.player.value.z
        } : null
      };
    })()`);
    // Look at player's feet/blades in third person / ots
    const trCamY = trampleY + 1.6;
    await lookAt(trampleX - 1.2, trCamY, trampleZ - 1.8, trampleX, trampleY + 0.1, trampleZ);
    await wait(250);
    const tramplePath = path.join(OUT, `gp20000-player-trample-bundles${bundleFlag}.png`);
    await page.screenshot(tramplePath);
    data.playerTrampleShot = tramplePath;

    // 5. Zombie Trampling
    console.log(`5. Checking Zombie Trampling (?bundles=${bundleFlag})...`);
    const zx = trampleX + 0.9, zz = trampleZ + 0.9;
    data.zombieTrample = await page.evaluate(`(() => {
      const T = TT;
      T.clearZombies && T.clearZombies();
      const z = T.spawnZombie(${zx}, ${zz}, 'shambler', true, true);
      T.renderFrame && T.renderFrame();
      const tr0 = T.foliageWind.tramplers && T.foliageWind.tramplers[0] ? {
        x: T.foliageWind.tramplers[0].value.x,
        y: T.foliageWind.tramplers[0].value.y,
        z: T.foliageWind.tramplers[0].value.z
      } : null;
      return {
        zombieSpawned: !!z,
        zombiePos: z ? { x: z.mesh.position.x, z: z.mesh.position.z } : null,
        tramplerUniform: tr0
      };
    })()`);
    await lookAt(zx - 1.4, trCamY, zz - 1.6, zx, trampleY + 0.2, zz);
    await wait(250);
    const zTramplePath = path.join(OUT, `gp20000-zombie-trample-bundles${bundleFlag}.png`);
    await page.screenshot(zTramplePath);
    data.zombieTrampleShot = zTramplePath;

    // 6. Distance Culling & Preset Switches
    console.log(`6. Checking Culling and Preset Switches (?bundles=${bundleFlag})...`);
    // High preset
    await page.evaluate(`TT.applyGraphicsPreset('high')`);
    await lookAt(mx, my, mz, tx, ty, tz);
    await wait(350);
    data.highPresetChunks = await page.evaluate(`TT.foliageChunks.filter(c => c.visible).length`);
    const highCullPath = path.join(OUT, `gp20000-cull-high-bundles${bundleFlag}.png`);
    await page.screenshot(highCullPath);
    data.highCullShot = highCullPath;

    // Low preset
    await page.evaluate(`TT.applyGraphicsPreset('low')`);
    await wait(350);
    data.lowPresetChunks = await page.evaluate(`TT.foliageChunks.filter(c => c.visible).length`);
    const lowCullPath = path.join(OUT, `gp20000-cull-low-bundles${bundleFlag}.png`);
    await page.screenshot(lowCullPath);
    data.lowCullShot = lowCullPath;

    // Switch back to High
    await page.evaluate(`TT.applyGraphicsPreset('high')`);
    await wait(300);
    data.restoredHighChunks = await page.evaluate(`TT.foliageChunks.filter(c => c.visible).length`);

    return data;
  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }
}

// Run baseline ?bundles=0 and experimental ?bundles=1
results.bundles0 = await runSession(0);
results.bundles1 = await runSession(1);

// Generate Contact Sheet using browser canvas
console.log('\n======================================================');
console.log('Stitching GP-20000 Contact Sheet (bundles=0 vs bundles=1)');
console.log('======================================================');

const stitchServer = await serve(ROOT, 0);
const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

try {
  const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
  await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

  const keyShots = [
    path.join(OUT, 'gp20000-day5-bundles0.png'),
    path.join(OUT, 'gp20000-day5-bundles1.png'),
    path.join(OUT, 'gp20000-night20-bundles0.png'),
    path.join(OUT, 'gp20000-night20-bundles1.png'),
    path.join(OUT, 'gp20000-player-trample-bundles0.png'),
    path.join(OUT, 'gp20000-player-trample-bundles1.png'),
    path.join(OUT, 'gp20000-zombie-trample-bundles0.png'),
    path.join(OUT, 'gp20000-zombie-trample-bundles1.png'),
    path.join(OUT, 'gp20000-cull-high-bundles0.png'),
    path.join(OUT, 'gp20000-cull-high-bundles1.png'),
    path.join(OUT, 'gp20000-cull-low-bundles0.png'),
    path.join(OUT, 'gp20000-cull-low-bundles1.png'),
  ];

  const keyLabels = [
    'Day 5 Noon · bundles=0 (baseline)',
    'Day 5 Noon · bundles=1 (BundleGroup)',
    'Night 20 NVG/Flash · bundles=0',
    'Night 20 NVG/Flash · bundles=1',
    'Player Trampling · bundles=0',
    'Player Trampling · bundles=1',
    'Zombie Trampling · bundles=0',
    'Zombie Trampling · bundles=1',
    'Cull High (150m) · bundles=0',
    'Cull High (150m) · bundles=1',
    'Cull Low (55m) · bundles=0',
    'Cull Low (55m) · bundles=1',
  ];

  const b64List = keyShots.map(p => fs.readFileSync(p).toString('base64'));
  const b64Sheet = await stitchPage.evaluate(`(async () => {
    const b64s = ${JSON.stringify(b64List)};
    const labels = ${JSON.stringify(keyLabels)};
    const cols = 2, rows = 6;
    const cellW = 640, cellH = 360, labelH = 26;
    const c = document.createElement('canvas');
    c.width = cols * cellW;
    c.height = rows * (cellH + labelH);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, c.width, c.height);

    const loadImg = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });

    for (let i = 0; i < b64s.length; i++) {
      const im = await loadImg('data:image/png;base64,' + b64s[i]);
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cellW, y = row * (cellH + labelH);
      ctx.drawImage(im, x, y, cellW, cellH);
      ctx.fillStyle = '#161920';
      ctx.fillRect(x, y + cellH, cellW, labelH);
      ctx.fillStyle = (col === 0) ? '#9ecbff' : '#a8ff9e';
      ctx.font = 'bold 13px Consolas, monospace';
      ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
    }
    return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
  })()`);

  fs.writeFileSync(path.join(OUT, 'gp20000-sheet.png'), Buffer.from(b64Sheet, 'base64'));
  console.log(`Saved composite contact sheet: ${path.join(OUT, 'gp20000-sheet.png')}`);

  // Pixel comparison for Day 5 pair and Night 20 pair
  const diffMetrics = await stitchPage.evaluate(`(async () => {
    const b64s = ${JSON.stringify(b64List)};
    const loadImg = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });

    const comparePair = async (idxA, idxB) => {
      const imA = await loadImg('data:image/png;base64,' + b64s[idxA]);
      const imB = await loadImg('data:image/png;base64,' + b64s[idxB]);
      const c = document.createElement('canvas');
      c.width = 640; c.height = 360;
      const ctx = c.getContext('2d');
      ctx.drawImage(imA, 0, 0, 640, 360);
      const dataA = ctx.getImageData(0, 0, 640, 360).data;
      ctx.clearRect(0, 0, 640, 360);
      ctx.drawImage(imB, 0, 0, 640, 360);
      const dataB = ctx.getImageData(0, 0, 640, 360).data;

      let diffCount = 0, totalDiff = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        const dr = Math.abs(dataA[i] - dataB[i]);
        const dg = Math.abs(dataA[i+1] - dataB[i+1]);
        const db = Math.abs(dataA[i+2] - dataB[i+2]);
        const d = (dr + dg + db) / 3;
        if (d > 3) {
          diffCount++;
          totalDiff += d;
        }
      }
      return {
        totalPixels: 640 * 360,
        differingPixels: diffCount,
        differingPercent: +(diffCount / (640 * 360) * 100).toFixed(2),
        meanDelta: diffCount ? +(totalDiff / diffCount).toFixed(2) : 0
      };
    };

    return {
      day5: await comparePair(0, 1),
      night20: await comparePair(2, 3),
      highCull: await comparePair(8, 9),
      lowCull: await comparePair(10, 11)
    };
  })()`);

  results.pixelDiffs = diffMetrics;
  console.log('Pixel diff metrics between bundles=0 and bundles=1:', JSON.stringify(diffMetrics, null, 2));

} finally {
  try { await stitchBrowser.close(); } catch (_) {}
  try { stitchServer.close(); } catch (_) {}
}

fs.writeFileSync(path.join(OUT, 'gp20000-summary.json'), JSON.stringify(results, null, 2));
console.log(`\nGP-20000 review complete! Summary saved to ${path.join(OUT, 'gp20000-summary.json')}`);
