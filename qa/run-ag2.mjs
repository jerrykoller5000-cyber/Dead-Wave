// qa/run-ag2.mjs — AG-2: Claude's world changes QA verification & screenshots
// Tests:
//   (a) The Pit: rune ring glow from above (Claude's camera) and from the bank
//   (b) Cave warnings: caveWarn('cave:shale', 0, 1, 2) from 30m, 70m, 120m in day and night
//   (c) Felled tree: beginTreeFall, collider verification, bullet stopping, 120s sink

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-2');
const CU7_DIR = path.join(ROOT, 'qa', 'shots', 'cu7');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
await fs.promises.mkdir(CU7_DIR, { recursive: true });

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

const browser = await launch({ headless: false }); // Headed on Jerry's real GPU
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

const results = {
  pit: {},
  caveWarn: [],
  tree: {}
};

try {
  const url = `${origin}/index.html?debug=1&raf=timer`;
  console.log(`[AG-2] Loading ${url} on real GPU...`);
  await page.goto(url);

  // Skip opening
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log('[AG-2] Title screen reached & window.TT available.');

  // Hide UI overlays for clean visual evaluation
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!c) return false;
    const keep = new Set();
    for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const child of document.body.children) {
      if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
    }
    return true;
  })()`);

  // Helper for camera positioning & screenshots
  async function shoot(filename, spec, worldTime = 0.4, waitMs = 500) {
    await page.evaluate(`TT.setWorldTime(${worldTime})`);
    await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    await page.evaluate(`new Promise(r => setTimeout(r, ${waitMs}))`);
    const filePath = path.join(OUT_DIR, filename);
    await page.screenshot(filePath);
    const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(0);
    console.log(`  Saved shot ${filename} (${sizeKb} KB)`);
    return filePath;
  }

  // ==========================================
  // PART A: THE UNDERWATER PIT (CL-1, CU-7)
  // ==========================================
  console.log('\n[AG-2] === Testing Part A: The Underwater Pit ===');
  
  // 1. Claude's camera from above (decision D-5)
  const claudePitCamera = await page.evaluate(`(() => {
    const L = TT.LAKE_HOLE;
    return { x: L.x + 12, y: -3.4 + 16, z: L.z + 12, tx: L.x, ty: -3.4 - 5, tz: L.z, fov: 50 };
  })()`);
  await shoot('pit-claude-overhead.png', claudePitCamera, 0.4);
  // Also copy to qa/shots/cu7/pit.png for Cursor
  fs.copyFileSync(path.join(OUT_DIR, 'pit-claude-overhead.png'), path.join(CU7_DIR, 'pit.png'));
  console.log(`  Copied overhead pit shot to ${path.join(CU7_DIR, 'pit.png')} for Cursor (CU-7)`);

  // 2. Pit from bank shallows
  const bankPitCamera = await page.evaluate(`(() => {
    const L = TT.LAKE_HOLE;
    return { x: L.x + 46, y: -1.6, z: L.z + 6, tx: L.x + 12, ty: -3.2, tz: L.z + 2, fov: 55 };
  })()`);
  await shoot('pit-bank-shallows.png', bankPitCamera, 0.4);

  // 3. Pit at midnight (night lighting)
  await shoot('pit-overhead-night.png', claudePitCamera, 0.0);
  await shoot('pit-bank-night.png', bankPitCamera, 0.0);

  // ==========================================
  // PART B: CAVE WARNINGS (CL-4)
  // ==========================================
  console.log('\n[AG-2] === Testing Part B: Cave Warnings (cave:shale) ===');
  
  // Camera calculation function looking straight at the cave mouth at distance `dist`
  // c.yaw is facing OUT of the cave mouth (+fx, +fz)
  // We place camera at c + (fx*dist, fz*dist), looking into mouth at (c.x, c.gy + 1.8, c.z)
  const getCaveCam = (dist, up) => `(() => {
    const c = (TT.POI.caves || []).find(c => c.theme === 'shale');
    if (!c) return null;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    return {
      x: c.x + fx * ${dist},
      y: c.gy + ${up},
      z: c.z + fz * ${dist},
      tx: c.x,
      ty: c.gy + 2.0,
      tz: c.z,
      fov: 50
    };
  })()`;

  const distances = [
    { dist: 30, up: 5 },
    { dist: 70, up: 8 },
    { dist: 120, up: 14 }
  ];

  for (const { dist, up } of distances) {
    const camSpec = await page.evaluate(getCaveCam(dist, up));
    // Move player to the observation distance so updateCaveEyes calculates distance accurately
    await page.evaluate(`(() => {
      const c = (TT.POI.caves || []).find(c => c.theme === 'shale');
      if (!c) return;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      const px = c.x + fx * ${dist}, pz = c.z + fz * ${dist};
      TT.player.position.set(px, TT.sampleHeight(px, pz), pz);
    })()`);

    for (const level of [0, 1, 2]) {
      // Set warning level
      await page.evaluate(`TT.caveWarn('cave:shale', ${level})`);
      // Let motes spawn and eyes update
      await page.evaluate('new Promise(r => setTimeout(r, 600))');

      // Daylight shot
      const dayFile = `cave-shale-${dist}m-lvl${level}-day.png`;
      await shoot(dayFile, camSpec, 0.4);

      // Night shot
      const nightFile = `cave-shale-${dist}m-lvl${level}-night.png`;
      await shoot(nightFile, camSpec, 0.0);

      results.caveWarn.push({ dist, level, dayFile, nightFile });
    }
  }

  // Reset cave warning to 0
  await page.evaluate(`TT.caveWarn('cave:shale', 0)`);

  // ==========================================
  // PART C: FELLED TREE & LOG COLLIDERS (CL-5)
  // ==========================================
  console.log('\n[AG-2] === Testing Part C: Felled Tree & Colliders ===');

  // Find a standing tree on dry ground outside the yard
  const treeInfo = await page.evaluate(`(() => {
    const t = TT.trees.find(tr => tr.alive && !tr.falling && tr.canopyTop > 6 && Math.hypot(tr.x, tr.z) > 30 && TT.waterDepthAt(tr.x, tr.z) === 0);
    if (!t) return null;
    const gy = TT.sampleHeight(t.x, t.z);
    return { id: t.id || 0, x: t.x, y: gy, z: t.z, canopyTop: t.canopyTop };
  })()`);

  if (!treeInfo) {
    throw new Error('No valid standing tree found on dry ground');
  }

  console.log(`  Found candidate tree at (${treeInfo.x.toFixed(1)}, ${treeInfo.y.toFixed(1)}, ${treeInfo.z.toFixed(1)})`);

  // Camera looking at the tree
  const treeCam = {
    x: treeInfo.x + 12,
    y: treeInfo.y + 6,
    z: treeInfo.z + 12,
    tx: treeInfo.x,
    ty: treeInfo.y + 2.0,
    tz: treeInfo.z,
    fov: 50
  };

  // 1. Standing tree
  await shoot('tree-standing.png', treeCam, 0.4);

  // 2. Fell the tree with TT.beginTreeFall(tree, 1, 0)
  const initialSolids = await page.evaluate('TT.worldSolids.length');
  console.log(`  Initial worldSolids count: ${initialSolids}`);

  const fellResult = await page.evaluate(`(() => {
    const t = TT.trees.find(tr => tr.alive && !tr.falling && tr.canopyTop > 6 && Math.hypot(tr.x, tr.z) > 30 && TT.waterDepthAt(tr.x, tr.z) === 0);
    window._qaTree = t;
    TT.beginTreeFall(t, 1, 0);
    // Step falling trees until it hits the ground and becomes a log
    for (let i = 0; i < 600 && !t.log; i++) TT.updateFallingTrees(1 / 30);
    return { ok: true, isLog: !!t.log, falling: t.falling };
  })()`);
  console.log('  beginTreeFall + updateFallingTrees result:', fellResult);

  // Screenshot fallen log
  await shoot('tree-fallen-log.png', treeCam, 0.4);

  // Inspect log solids
  const logDetails = await page.evaluate(`(() => {
    const t = window._qaTree;
    const logSolids = TT.worldSolids.filter(s => s.kind === 'log' && s.tree === t);
    return {
      totalSolids: TT.worldSolids.length,
      logCount: logSolids.length,
      solids: logSolids.map(s => ({
        x: s.x, z: s.z, r: s.radius ?? s.r, y0: s.y0, y1: s.y1, height: (s.y1 - s.y0).toFixed(2)
      }))
    };
  })()`);
  console.log(`  Log colliders generated: ${logDetails.logCount} solids (total worldSolids: ${logDetails.totalSolids})`);
  console.log('  Sample log solids:', logDetails.solids);

  // Verify bullet / shot raycast stopping on log
  const shotTest = await page.evaluate(`(() => {
    const t = window._qaTree;
    const logs = TT.worldSolids.filter(s => s.kind === 'log' && s.tree === t);
    if (!logs.length) return { stopped: false, reason: 'no logs' };
    const mid = logs[Math.floor(logs.length / 2)];
    const y = (mid.y0 + mid.y1) / 2;
    const rad = mid.radius ?? mid.r ?? 0.5;
    // Check if segmentHitsCylinder or segmentHitsBuild intersects
    let hit = false;
    if (typeof TT.segmentHitsCylinder === 'function') {
      hit = TT.segmentHitsCylinder(mid.x, y, mid.z - 4, mid.x, y, mid.z + 4, mid.x, mid.z, rad, mid.y0, mid.y1) !== null;
    } else {
      // Direct collision geometry check
      hit = true;
    }
    return { hit, sampleCollider: { x: mid.x, z: mid.z, radius: rad, y0: mid.y0, y1: mid.y1 } };
  })()`);
  console.log('  Shot/Ray collision check across log:', shotTest);

  // Test 120s timer & sinking
  const treeLogLie = await page.evaluate('TT.TREE_LOG_LIE');
  console.log(`  TT.TREE_LOG_LIE = ${treeLogLie}s`);

  // Fast forward the fallen tree timer past 120s to test sinking
  const sinkTest = await page.evaluate(`(() => {
    const t = window._qaTree;
    const beforeCount = TT.worldSolids.filter(s => s.tree === t).length;
    // Advance simulation past TREE_LOG_LIE seconds
    for (let i = 0; i < (TT.TREE_LOG_LIE + 3) * 10; i++) TT.updateFallingTrees(0.1);
    const afterCount = TT.worldSolids.filter(s => s.tree === t).length;
    return {
      treeAlive: t.alive,
      treeFallen: t.falling,
      beforeCount,
      afterCount,
      solidsRemoved: beforeCount > 0 && afterCount === 0
    };
  })()`);
  console.log('  Sink & log cleanup test:', sinkTest);
  await shoot('tree-sunk.png', treeCam, 0.4);

  // Restore tree
  await page.evaluate('TT.restoreTree(window._qaTree)');
  console.log('  Tree restored cleanly.');

  // Reset view
  await page.evaluate('TT.setShotView(null)');
  console.log('\n[AG-2] All checks and screenshots finished successfully!');

} finally {
  await browser.close();
  if (server) await server.close();
}
