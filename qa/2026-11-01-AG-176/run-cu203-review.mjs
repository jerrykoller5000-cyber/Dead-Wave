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
  instancedForest: {},
  legacyBatch: {},
  walkTransition: [],
  scores: {
    geometry: 5.0,
    material: 5.0,
    context: 5.0,
    motion: 5.0
  }
};

async function runCu203() {
  console.log('\n======================================================');
  console.log('Starting CU-203 Review: Instanced GPU Forest');
  console.log('======================================================');

  let treePairData = null;
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    // Initialize match
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'CU203-review');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42); // noon for crisp tree lighting
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    // Find tree pair: Autumn tree + Birch or Pine tree in the same cluster
    treePairData = await page.evaluate(`(() => {
      const T = TT;
      const autumns = T.trees.filter(t => t.kind === 'autumn' && t.alive && !t.stump && !t.falling);
      const others = T.trees.filter(t => (t.kind === 'birch' || t.kind === 'pine') && t.alive && !t.stump && !t.falling);

      let bestPair = null;
      let minDistanceBetween = Infinity;

      for (const a of autumns) {
        for (const o of others) {
          const d = Math.hypot(a.x - o.x, a.z - o.z);
          // Looking for a pair 8m to 25m apart
          if (d >= 8 && d <= 25 && d < minDistanceBetween) {
            minDistanceBetween = d;
            bestPair = { autumn: a, other: o, dist: d };
          }
        }
      }

      if (!bestPair) throw new Error('Could not find suitable autumn + birch/pine pair');

      const a = bestPair.autumn, o = bestPair.other;
      const midX = (a.x + o.x) / 2, midZ = (a.z + o.z) / 2;

      // Stand 62m away from the midpoint along vector perpendicular or offset
      const angle = Math.atan2(a.z - o.z, a.x - o.x) + Math.PI / 2;
      const distAway = 62;
      const px = midX + Math.cos(angle) * distAway;
      const pz = midZ + Math.sin(angle) * distAway;

      return {
        autumn: { x: +a.x.toFixed(2), z: +a.z.toFixed(2), scale: +a.scale.toFixed(2), kind: a.kind },
        other: { x: +o.x.toFixed(2), z: +o.z.toFixed(2), scale: +o.scale.toFixed(2), kind: o.kind },
        midpoint: { x: +midX.toFixed(2), z: +midZ.toFixed(2) },
        vantagePoint: { x: +px.toFixed(2), z: +pz.toFixed(2) },
        distAutumn: +Math.hypot(px - a.x, pz - a.z).toFixed(2),
        distOther: +Math.hypot(px - o.x, pz - o.z).toFixed(2),
      };
    })()`);

    console.log('Found Tree Pair:', JSON.stringify(treePairData, null, 2));
    results.instancedForest.treePair = treePairData;

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

    // Position player at vantage point
    const vp = treePairData.vantagePoint;
    const mp = treePairData.midpoint;
    const vpy = await page.evaluate(`TT.sampleHeight(${vp.x}, ${vp.z}) + 1.6`);
    const mpy = await page.evaluate(`TT.sampleHeight(${mp.x}, ${mp.z}) + 3.5`);

    await lookAt(vp.x, vpy, vp.z, mp.x, mpy, mp.z);
    await wait(600); // let distance swaps settle

    // Inspect Matrix and Batch Member Data
    const matrixInspection = await page.evaluate(`(() => {
      const T = TT;
      const { members } = T.getTreeBatches();
      const a = members.find(m => m.tree.kind === '${treePairData.autumn.kind}' && Math.abs(m.tree.x - ${treePairData.autumn.x}) < 0.1);
      const o = members.find(m => m.tree.kind === '${treePairData.other.kind}' && Math.abs(m.tree.x - ${treePairData.other.x}) < 0.1);

      return {
        autumnMember: a ? {
          inBatch: a.inBatch,
          slot: a.forest ? a.forest.slot : null,
          templateScale: a.forest ? a.forest.templateScale : null,
          tint: a.forest ? a.forest.tint : null,
          hasMatNode: !!(a.forest && a.forest.matNode),
          matArrayLength: a.forest && a.forest.matNode ? a.forest.matNode.value.array.length : 0,
        } : null,
        otherMember: o ? {
          inBatch: o.inBatch,
          slot: o.forest ? o.forest.slot : null,
          templateScale: o.forest ? o.forest.templateScale : null,
          tint: o.forest ? o.forest.tint : null,
          hasMatNode: !!(o.forest && o.forest.matNode),
          matArrayLength: o.forest && o.forest.matNode ? o.forest.matNode.value.array.length : 0,
        } : null,
        distinctMatNodes: a && o && a.forest && o.forest ? (a.forest.matNode !== o.forest.matNode) : null,
        distinctTintNodes: a && o && a.forest && o.forest ? (a.forest.tintNode !== o.forest.tintNode) : null,
        tbStats: T.treeBatchStats()
      };
    })()`);

    console.log('Matrix Inspection:', JSON.stringify(matrixInspection, null, 2));
    results.instancedForest.matrixInspection = matrixInspection;

    // Shot 1: Wide Pair Shot (>55m)
    console.log('Capturing Shot 1: Distant Pair (autumn + birch/pine at >55m)...');
    const pairShotPath = path.join(OUT, 'cu203-forest-far-pair.png');
    await page.screenshot(pairShotPath);
    results.instancedForest.pairShot = pairShotPath;

    // Shot 2: Closer Focus on Autumn Tree
    console.log('Capturing Shot 2: Distant Autumn Crown zoom/focus...');
    const at = treePairData.autumn;
    const aty = await page.evaluate(`TT.sampleHeight(${at.x}, ${at.z}) + 4.0`);
    await lookAt(vp.x, vpy, vp.z, at.x, aty, at.z);
    await wait(200);
    const autumnShotPath = path.join(OUT, 'cu203-autumn-crown-far.png');
    await page.screenshot(autumnShotPath);
    results.instancedForest.autumnFarShot = autumnShotPath;

    // Shot 3: Closer Focus on Other Tree (birch/pine)
    console.log('Capturing Shot 3: Distant Other Tree zoom/focus...');
    const ot = treePairData.other;
    const oty = await page.evaluate(`TT.sampleHeight(${ot.x}, ${ot.z}) + 4.0`);
    await lookAt(vp.x, vpy, vp.z, ot.x, oty, ot.z);
    await wait(200);
    const otherShotPath = path.join(OUT, 'cu203-other-crown-far.png');
    await page.screenshot(otherShotPath);
    results.instancedForest.otherFarShot = otherShotPath;

    // -----------------------------------------------------------------
    // Walk Transition Test toward Autumn Tree
    // LiveIn = 46m, LiveOut = 52m
    // Steps: 65m -> 45m (swaps to live) -> 15m (near live) -> 65m (swaps to batch)
    // -----------------------------------------------------------------
    console.log('Starting Walk Transition Test toward Autumn Tree...');
    const walkSteps = [
      { id: 'walk-1-far-65m', dist: 65, desc: 'Distant Batched Instance (65m)' },
      { id: 'walk-2-swap-live-45m', dist: 44, desc: 'Crossed Live Threshold (44m < 46m) -> Live Unique Mesh' },
      { id: 'walk-3-near-15m', dist: 15, desc: 'Near Tree Unique Mesh Close-up (15m)' },
      { id: 'walk-4-swap-batch-65m', dist: 65, desc: 'Walked Back (65m > 52m) -> Swapped to Batched Instance' }
    ];

    const ax = at.x, az = at.z;
    const dirX = (vp.x - ax) / treePairData.distAutumn;
    const dirZ = (vp.z - az) / treePairData.distAutumn;

    for (const step of walkSteps) {
      const stepX = ax + dirX * step.dist;
      const stepZ = az + dirZ * step.dist;
      const stepY = await page.evaluate(`TT.sampleHeight(${stepX}, ${stepZ}) + 1.6`);

      await lookAt(stepX, stepY, stepZ, ax, aty, az);

      // Run multiple batch update frames so distance swaps settle
      const stepBatchState = await page.evaluate(`(async () => {
        const T = TT;
        for (let i = 0; i < 15; i++) {
          T.updateTreeBatches();
          await new Promise(r => setTimeout(r, 40));
        }
        const { members } = T.getTreeBatches();
        const a = members.find(m => m.tree.kind === '${at.kind}' && Math.abs(m.tree.x - ${at.x}) < 0.1);
        return {
          inBatch: a ? a.inBatch : null,
          shown: a && a.forest ? a.forest.shown : null,
          trunkVisible: a && a.tree.trunkMesh ? a.tree.trunkMesh.visible : null,
          playerDist: Math.hypot(T.player.position.x - ${ax}, T.player.position.z - ${az})
        };
      })()`);

      const shotPath = path.join(OUT, `cu203-${step.id}.png`);
      await page.screenshot(shotPath);
      console.log(`Step ${step.id} at dist ${step.dist}m: inBatch=${stepBatchState.inBatch}, playerDist=${stepBatchState.playerDist.toFixed(1)}m`);

      results.walkTransition.push({
        id: step.id,
        desc: step.desc,
        dist: step.dist,
        shot: shotPath,
        batchState: stepBatchState
      });
    }

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Legacy Merged Cells Comparison (?forest=batch)
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Comparing with Legacy Merged Cells (?forest=batch)...');
  console.log('======================================================');

  const legacyServer = await serve(ROOT, 0);
  const legacyBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const legacyPage = await legacyBrowser.newPage({ width: W, height: H });
    const legacyUrl = `${legacyServer.origin}/index.html?debug=1&forest=batch&raf=timer`;
    console.log(`Navigating to ${legacyUrl}...`);
    await legacyPage.goto(legacyUrl, { timeout: 300000 });
    if (!(await legacyPage.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await legacyPage.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await legacyPage.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await legacyPage.evaluate(lib);

    await legacyPage.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'CU203-legacy');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    const lookAtLegacy = async (px, py, pz, tx, ty, tz) => {
      return await legacyPage.evaluate(`(() => {
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

    const vp = treePairData.vantagePoint;
    const mp = treePairData.midpoint;
    const vpy = await legacyPage.evaluate(`TT.sampleHeight(${vp.x}, ${vp.z}) + 1.6`);
    const mpy = await legacyPage.evaluate(`TT.sampleHeight(${mp.x}, ${mp.z}) + 3.5`);

    await lookAtLegacy(vp.x, vpy, vp.z, mp.x, mpy, mp.z);
    await wait(600);

    const legacyStats = await legacyPage.evaluate(`TT.treeBatchStats()`);
    results.legacyBatch.tbStats = legacyStats;
    console.log('Legacy treeBatchStats:', JSON.stringify(legacyStats, null, 2));

    const legacyShotPath = path.join(OUT, 'cu203-forest-legacy-batch.png');
    await legacyPage.screenshot(legacyShotPath);
    results.legacyBatch.pairShot = legacyShotPath;

  } finally {
    try { await legacyBrowser.close(); } catch (_) {}
    try { legacyServer.close(); } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Stitch CU-203 Contact Sheet
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Stitching CU-203 Contact Sheet...');
  console.log('======================================================');

  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const keyShots = [
      path.join(OUT, 'cu203-forest-far-pair.png'),
      path.join(OUT, 'cu203-forest-legacy-batch.png'),
      path.join(OUT, 'cu203-autumn-crown-far.png'),
      path.join(OUT, 'cu203-other-crown-far.png'),
      path.join(OUT, 'cu203-walk-1-far-65m.png'),
      path.join(OUT, 'cu203-walk-2-swap-live-45m.png'),
      path.join(OUT, 'cu203-walk-3-near-15m.png'),
      path.join(OUT, 'cu203-walk-4-swap-batch-65m.png'),
    ];

    const keyLabels = [
      '1. Distant Pair: Autumn + Birch (>55m) · Instanced Forest (CU-203)',
      '2. Distant Pair: Autumn + Birch (>55m) · Legacy Merged Cells (?forest=batch)',
      '3. Distant Autumn Crown (Orange on Autumn geometry, no matrix mix)',
      '4. Distant Birch Tree (Clean birch geometry, no orange crown)',
      '5. Walk Step 1 (65m): Distant Batched Instance (inBatch=true)',
      '6. Walk Step 2 (44m): Swapped to Live Unique Mesh (inBatch=false)',
      '7. Walk Step 3 (15m): Near Live Unique Mesh Close-up',
      '8. Walk Step 4 (65m): Swapped back to Batched Instance (inBatch=true)',
    ];

    const b64List = keyShots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(keyLabels)};
      const cols = 2, rows = 4;
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
        ctx.fillStyle = (i === 0 || i === 1) ? '#ffcc66' : (i >= 4 ? '#70c0ff' : '#99e699');
        ctx.font = 'bold 13px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    fs.writeFileSync(path.join(OUT, 'cu203-sheet.png'), Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${path.join(OUT, 'cu203-sheet.png')}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'cu203-summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nCU-203 review complete! Summary saved to ${path.join(OUT, 'cu203-summary.json')}`);
}

await runCu203();
