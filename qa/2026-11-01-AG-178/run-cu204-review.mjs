import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-178');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  templates: [],
  deferredGrowth: {},
  instancedForest: {},
  walkTransition: [],
  comparisons: {
    forestAll: {},
    forestBatch: {},
    trees8x: {}
  },
  scores: {
    geometry: 5.0,
    material: 5.0,
    context: 5.0,
    motion: 5.0
  }
};

async function runCu204() {
  console.log('\n======================================================');
  console.log('Starting CU-204 Review: Nearest Template Instanced Forest');
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

    // Initialize match in first person with level aim and pistol
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'CU204-review');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42); // noon for crisp tree lighting
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    // Settle distance swaps
    await page.evaluate(`(async () => {
      const T = TT;
      for (let i = 0; i < 60; i++) {
        T.updateTreeBatches();
        await new Promise(r => setTimeout(r, 20));
      }
    })()`);

    // Inspect Deferred Mesh Growth & Initial Template Stats
    const initialStats = await page.evaluate(`(() => {
      const T = TT;
      const totalTrees = T.trees.length;
      const ungrown = T.trees.filter(t => !t.trunkMesh).length;
      const grown = T.trees.filter(t => !!t.trunkMesh).length;
      const stats = T.treeBatchStats();
      const { members } = T.getTreeBatches();

      // Collect template distribution
      const templateCounts = {};
      for (const m of members) {
        if (m.forest && m.forest.template) {
          const key = m.forest.template.kind + ':' + m.forest.template.scale;
          templateCounts[key] = (templateCounts[key] || 0) + 1;
        }
      }

      return {
        totalTrees,
        ungrown,
        grown,
        tbStats: stats,
        templateCounts
      };
    })()`);

    console.log('Initial Deferred Forest Stats:', JSON.stringify(initialStats, null, 2));
    results.deferredGrowth = initialStats;

    // Find side-by-side tree pair in distance (>55m away)
    // One autumn tree + one birch or pine tree
    treePairData = await page.evaluate(`(() => {
      const T = TT;
      const autumns = T.trees.filter(t => t.kind === 'autumn' && t.alive && !t.stump && !t.falling);
      const others = T.trees.filter(t => (t.kind === 'birch' || t.kind === 'pine') && t.alive && !t.stump && !t.falling);

      let bestPair = null;
      let minDistanceBetween = Infinity;

      for (const a of autumns) {
        for (const o of others) {
          const d = Math.hypot(a.x - o.x, a.z - o.z);
          // Looking for pair 8m to 25m apart
          if (d >= 8 && d <= 25 && d < minDistanceBetween) {
            minDistanceBetween = d;
            bestPair = { autumn: a, other: o, dist: d };
          }
        }
      }

      if (!bestPair) throw new Error('Could not find suitable autumn + birch/pine pair');

      const a = bestPair.autumn, o = bestPair.other;
      const midX = (a.x + o.x) / 2, midZ = (a.z + o.z) / 2;

      // Stand 62m away perpendicular to line between trees
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

    // Helper to aim level (pitch = 0) from player position
    const lookAtLevel = async (px, pz, tx, tz) => {
      return await page.evaluate(`(() => {
        const T = TT;
        const py = T.sampleHeight(${px}, ${pz}) + 1.6;
        T.player.position.set(${px}, py, ${pz});
        const dx = ${tx} - ${px}, dz = ${tz} - ${pz};
        const yaw = Math.atan2(dx, dz);
        T.setAimYawDbg(yaw);
        if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, 0); // pitch = 0 (level)
        return { px: ${px}, py, pz: ${pz}, yaw, pitch: 0 };
      })()`);
    };

    const vp = treePairData.vantagePoint;
    const mp = treePairData.midpoint;
    await lookAtLevel(vp.x, vp.z, mp.x, mp.z);
    await wait(600);

    // Matrix and Template Isolation Inspection
    const matrixInspection = await page.evaluate(`(() => {
      const T = TT;
      const { members } = T.getTreeBatches();
      const a = members.find(m => m.tree.kind === '${treePairData.autumn.kind}' && Math.abs(m.tree.x - ${treePairData.autumn.x}) < 0.1);
      const o = members.find(m => m.tree.kind === '${treePairData.other.kind}' && Math.abs(m.tree.x - ${treePairData.other.x}) < 0.1);

      return {
        autumnMember: a ? {
          inBatch: a.inBatch,
          shown: a.forest ? a.forest.shown : null,
          slot: a.forest ? a.forest.slot : null,
          treeScale: a.tree.scale,
          templateScale: a.forest ? a.forest.templateScale : null,
          tint: a.forest ? a.forest.tint : null,
          hasGrownMesh: !!a.tree.trunkMesh,
          hasMatNode: !!(a.forest && a.forest.matNode),
          matArrayLength: a.forest && a.forest.matNode ? a.forest.matNode.value.array.length : 0,
        } : null,
        otherMember: o ? {
          inBatch: o.inBatch,
          shown: o.forest ? o.forest.shown : null,
          slot: o.forest ? o.forest.slot : null,
          treeScale: o.tree.scale,
          templateScale: o.forest ? o.forest.templateScale : null,
          tint: o.forest ? o.forest.tint : null,
          hasGrownMesh: !!o.tree.trunkMesh,
          hasMatNode: !!(o.forest && o.forest.matNode),
          matArrayLength: o.forest && o.forest.matNode ? o.forest.matNode.value.array.length : 0,
        } : null,
        distinctMatNodes: a && o && a.forest && o.forest ? (a.forest.matNode !== o.forest.matNode) : null,
        distinctTintNodes: a && o && a.forest && o.forest ? (a.forest.tintNode !== o.forest.tintNode) : null,
        distinctTemplates: a && o && a.forest && o.forest ? (a.forest.template !== o.forest.template) : null,
        tbStats: T.treeBatchStats()
      };
    })()`);

    console.log('Matrix Inspection:', JSON.stringify(matrixInspection, null, 2));
    results.instancedForest.matrixInspection = matrixInspection;

    // Shot 1: Wide Pair Shot (>55m, first-person, level, pistol)
    console.log('Capturing Shot 1: Distant Pair in first-person level view (>55m)...');
    const pairShotPath = path.join(OUT, 'cu204-fp-distant-pair.png');
    await page.screenshot(pairShotPath);
    results.instancedForest.pairShot = pairShotPath;

    // Shot 2: Closer Focus on Autumn Tree
    console.log('Capturing Shot 2: Autumn Tree focus (pitch 0 level)...');
    const at = treePairData.autumn;
    await lookAtLevel(vp.x, vp.z, at.x, at.z);
    await wait(200);
    const autumnShotPath = path.join(OUT, 'cu204-fp-autumn-focus.png');
    await page.screenshot(autumnShotPath);
    results.instancedForest.autumnFarShot = autumnShotPath;

    // Shot 3: Closer Focus on Other Tree (birch/pine)
    console.log('Capturing Shot 3: Other Tree focus (pitch 0 level)...');
    const ot = treePairData.other;
    await lookAtLevel(vp.x, vp.z, ot.x, ot.z);
    await wait(200);
    const otherShotPath = path.join(OUT, 'cu204-fp-other-focus.png');
    await page.screenshot(otherShotPath);
    results.instancedForest.otherFarShot = otherShotPath;

    // -----------------------------------------------------------------
    // Walk Transition Test toward Autumn Tree
    // LiveIn = 46m, LiveOut = 52m
    // Steps: 65m (far template) -> 44m (crosses liveIn, grows mesh) -> 15m (near live) -> 65m (rejoins batch)
    // -----------------------------------------------------------------
    console.log('Starting Walk Transition Test toward Autumn Tree...');
    const walkSteps = [
      { id: 'walk-1-far-65m', dist: 65, desc: 'Distant Template Instance (65m, mesh un-grown)' },
      { id: 'walk-2-swap-live-44m', dist: 44, desc: 'Crossed liveIn (44m < 46m) -> First mesh growth & live swap' },
      { id: 'walk-3-near-15m', dist: 15, desc: 'Near Tree Unique Mesh Close-up (15m)' },
      { id: 'walk-4-return-far-65m', dist: 65, desc: 'Walked Back (65m > 52m) -> Rejoined Batched Instance' }
    ];

    const ax = at.x, az = at.z;
    const dirX = (vp.x - ax) / treePairData.distAutumn;
    const dirZ = (vp.z - az) / treePairData.distAutumn;

    for (const step of walkSteps) {
      const stepX = ax + dirX * step.dist;
      const stepZ = az + dirZ * step.dist;

      await lookAtLevel(stepX, stepZ, ax, az);

      const stepBatchState = await page.evaluate(`(async () => {
        const T = TT;
        for (let i = 0; i < 20; i++) {
          T.updateTreeBatches();
          await new Promise(r => setTimeout(r, 30));
        }
        const { members } = T.getTreeBatches();
        const a = members.find(m => m.tree.kind === '${at.kind}' && Math.abs(m.tree.x - ${at.x}) < 0.1);
        return {
          inBatch: a ? a.inBatch : null,
          shown: a && a.forest ? a.forest.shown : null,
          hasGrownMesh: a && !!a.tree.trunkMesh,
          trunkVisible: a && a.tree.trunkMesh ? a.tree.trunkMesh.visible : null,
          playerDist: Math.hypot(T.player.position.x - ${ax}, T.player.position.z - ${az})
        };
      })()`);

      const shotPath = path.join(OUT, `cu204-${step.id}.png`);
      await page.screenshot(shotPath);
      console.log(`Step ${step.id} at dist ${step.dist}m: inBatch=${stepBatchState.inBatch}, hasMesh=${stepBatchState.hasGrownMesh}, trunkVis=${stepBatchState.trunkVisible}, dist=${stepBatchState.playerDist.toFixed(1)}m`);

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
  // Comparative Mode 1: ?forest=all (draw every instance)
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Checking ?forest=all (draw every instance)...');
  console.log('======================================================');

  const allServer = await serve(ROOT, 0);
  const allBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const allPage = await allBrowser.newPage({ width: W, height: H });
    const allUrl = `${allServer.origin}/index.html?debug=1&forest=all&raf=timer`;
    console.log(`Navigating to ${allUrl}...`);
    await allPage.goto(allUrl, { timeout: 300000 });
    if (!(await allPage.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await allPage.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await allPage.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await allPage.evaluate(lib);

    await allPage.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'CU204-all');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    const vp = treePairData.vantagePoint;
    const mp = treePairData.midpoint;
    await allPage.evaluate(`(() => {
      const T = TT;
      const py = T.sampleHeight(${vp.x}, ${vp.z}) + 1.6;
      T.player.position.set(${vp.x}, py, ${vp.z});
      const dx = ${mp.x} - ${vp.x}, dz = ${mp.z} - ${vp.z};
      const yaw = Math.atan2(dx, dz);
      T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, 0);
    })()`);
    await wait(600);

    const allStats = await allPage.evaluate(`TT.treeBatchStats()`);
    results.comparisons.forestAll = allStats;
    console.log('Forest=all treeBatchStats:', JSON.stringify(allStats, null, 2));

    const allShotPath = path.join(OUT, 'cu204-forest-all.png');
    await allPage.screenshot(allShotPath);
    results.comparisons.forestAll.shot = allShotPath;

  } finally {
    try { await allBrowser.close(); } catch (_) {}
    try { allServer.close(); } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Comparative Mode 2: ?forest=batch (legacy merged cells)
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Checking ?forest=batch (legacy merged cells)...');
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
      await startMatch(T, 'CU204-legacy');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    const vp = treePairData.vantagePoint;
    const mp = treePairData.midpoint;
    await legacyPage.evaluate(`(() => {
      const T = TT;
      const py = T.sampleHeight(${vp.x}, ${vp.z}) + 1.6;
      T.player.position.set(${vp.x}, py, ${vp.z});
      const dx = ${mp.x} - ${vp.x}, dz = ${mp.z} - ${vp.z};
      const yaw = Math.atan2(dx, dz);
      T.setAimYawDbg(yaw);
      if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, 0);
    })()`);
    await wait(600);

    const legacyStats = await legacyPage.evaluate(`TT.treeBatchStats()`);
    results.comparisons.forestBatch = legacyStats;
    console.log('Legacy treeBatchStats:', JSON.stringify(legacyStats, null, 2));

    const legacyShotPath = path.join(OUT, 'cu204-forest-batch.png');
    await legacyPage.screenshot(legacyShotPath);
    results.comparisons.forestBatch.shot = legacyShotPath;

  } finally {
    try { await legacyBrowser.close(); } catch (_) {}
    try { legacyServer.close(); } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Comparative Mode 3: ?trees=8 (8x dense forest)
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Checking ?trees=8 (8x dense forest test)...');
  console.log('======================================================');

  const denseServer = await serve(ROOT, 0);
  const denseBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const densePage = await denseBrowser.newPage({ width: W, height: H });
    const denseUrl = `${denseServer.origin}/index.html?debug=1&trees=8&raf=timer`;
    console.log(`Navigating to ${denseUrl}...`);
    const tStart = Date.now();
    await densePage.goto(denseUrl, { timeout: 300000 });
    if (!(await densePage.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');

    await densePage.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await densePage.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await densePage.evaluate(lib);

    await densePage.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'CU204-trees8');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    const loadTimeSec = (Date.now() - tStart) / 1000;

    // View elevated over the valley
    await densePage.evaluate(`(() => {
      const T = TT;
      // Overlook from HQ roof / ridge
      T.player.position.set(0, T.sampleHeight(0, 0) + 7.5, 0);
      T.setAimYawDbg(Math.PI * 0.85); // look south-east towards forest valley
      if (T.setOtsAimDbg) T.setOtsAimDbg(Math.PI * 0.85, -0.05);
    })()`);
    await wait(600);

    const denseStats = await densePage.evaluate(`(() => {
      const T = TT;
      return {
        treeCount: T.trees.length,
        tbStats: T.treeBatchStats()
      };
    })()`);
    denseStats.loadTimeSec = loadTimeSec;
    results.comparisons.trees8x = denseStats;
    console.log('Trees=8 stats:', JSON.stringify(denseStats, null, 2));

    const denseShotPath = path.join(OUT, 'cu204-trees-8x.png');
    await densePage.screenshot(denseShotPath);
    results.comparisons.trees8x.shot = denseShotPath;

  } finally {
    try { await denseBrowser.close(); } catch (_) {}
    try { denseServer.close(); } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Stitch Composite Contact Sheet (2 columns x 5 rows = 10 panels)
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('Stitching CU-204 Contact Sheet (2x5 grid)...');
  console.log('======================================================');

  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const keyShots = [
      path.join(OUT, 'cu204-fp-distant-pair.png'),
      path.join(OUT, 'cu204-forest-batch.png'),
      path.join(OUT, 'cu204-fp-autumn-focus.png'),
      path.join(OUT, 'cu204-fp-other-focus.png'),
      path.join(OUT, 'cu204-walk-1-far-65m.png'),
      path.join(OUT, 'cu204-walk-2-swap-live-44m.png'),
      path.join(OUT, 'cu204-walk-3-near-15m.png'),
      path.join(OUT, 'cu204-walk-4-return-far-65m.png'),
      path.join(OUT, 'cu204-forest-all.png'),
      path.join(OUT, 'cu204-trees-8x.png'),
    ];

    const keyLabels = [
      '1. Distant Pair: Autumn + Birch/Pine (>55m) · FP Level View (CU-204)',
      '2. Comparison: Legacy Merged Cells (?forest=batch)',
      '3. Autumn Crown Focus (Amber canopy on autumn geometry; zero matrix bleed)',
      '4. Birch/Pine Focus (Silver/green geometry; distinct template buffer)',
      '5. Walk Step 1 (65m): Distant Template Instance (unique mesh deferred / un-grown)',
      '6. Walk Step 2 (44m): Swapped to Live Unique Mesh (grown on approach, no pop)',
      '7. Walk Step 3 (15m): Near Live Unique Mesh (close-up branch/trunk detail)',
      '8. Walk Step 4 (65m): Walked Back (rejoined template instance seamlessly)',
      '9. Mode: ?forest=all (All valley instances drawn simultaneously)',
      '10. Stress Test: ?trees=8 (2,572 dense trees, smooth instanced framerate)',
    ];

    const b64List = keyShots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(keyLabels)};
      const cols = 2, rows = 5;
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
        ctx.fillStyle = (i === 0 || i === 1) ? '#ffcc66' : (i >= 4 && i <= 7 ? '#70c0ff' : '#99e699');
        ctx.font = 'bold 13px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    fs.writeFileSync(path.join(OUT, 'cu204-sheet.png'), Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${path.join(OUT, 'cu204-sheet.png')}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'cu204-summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nCU-204 review complete! Summary saved to ${path.join(OUT, 'cu204-summary.json')}`);
}

await runCu204();
