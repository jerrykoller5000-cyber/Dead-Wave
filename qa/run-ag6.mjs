// qa/run-ag6.mjs — AG-6: Claude's tree batches (CL-10) on a real GPU
//
// Checks:
//   1. treeBatchStats() at the HQ: how many trees are live vs batched
//   2. Walk player from HQ outward in steps, screenshot at ~30 m, 45 m, 52 m, 70 m from a
//      nearby tree group — straddling the batch swap distance (SHADOW_NEAR+4 = 46 m, back
//      out at SHADOW_NEAR+10 = 52 m) — looking for pops, flickers, doubles, colour shifts.
//   3. FPS measurement: 120 frames timed at each of two positions (near and far) with
//      batching ON, then the same with ?trees=single (batching OFF). Report the ratio.
//   4. Burn a tree 100 m away through the scope: does the batch copy stay or vanish?
//
// Usage: node qa/run-ag6.mjs
// Shots: qa/shots/2026-09-23-AG-6/

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-6');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

// ── helpers ──────────────────────────────────────────────────────────────────

function kbOf(file) { return (fs.statSync(file).size / 1024).toFixed(0); }

async function waitForTitle(page, origin) {
  const url = `${origin}/index.html?debug=1&raf=timer`;
  console.log(`[AG-6] Navigating: ${url}`);
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })();`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  console.log('[AG-6] Title screen ready. World built.');
}

async function hideUI(page) {
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!c) return;
    const keep = new Set();
    for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const child of document.body.children) {
      if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
    }
  })()`);
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot(file);
  console.log(`  [shot] ${name}.png (${kbOf(file)} KB)`);
  return file;
}

async function measureFPS(page, frames = 120) {
  const fps = await page.evaluate(`(async () => {
    const n = ${frames};
    return new Promise(resolve => {
      let count = 0;
      const t0 = performance.now();
      function tick() {
        count++;
        if (count >= n) {
          const elapsed = performance.now() - t0;
          resolve(Math.round(n / (elapsed / 1000)));
        } else {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    });
  })()`);
  return fps;
}

// Check if the server is already up
let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

const results = { batching: {}, single: {} };

// ── Run 1: batching ON ────────────────────────────────────────────────────────
console.log('\n[AG-6] ===== RUN 1: Tree batching ON =====');
{
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

  try {
    await waitForTitle(page, origin);
    await page.evaluate('TT.setWorldTime(0.4)');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');

    const statsAtHQ = await page.evaluate('TT.treeBatchStats()');
    console.log('\n[AG-6] treeBatchStats() at HQ:', JSON.stringify(statsAtHQ, null, 2));
    results.batching.statsAtHQ = statsAtHQ;

    const cluster = await page.evaluate(`(() => {
      const px = TT.player.position.x, pz = TT.player.position.z;
      const tb = TT.getTreeBatches();
      let best = null, bestDist = Infinity;
      for (const m of tb.members) {
        const t = m.tree;
        if (!t || !t.group) continue;
        const dx = t.group.position.x - px, dz = t.group.position.z - pz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 70 && d < 150 && d < bestDist) { bestDist = d; best = { x: t.group.position.x, z: t.group.position.z, d }; }
      }
      if (!best && tb.members.length > 0) {
        const t = tb.members[Math.floor(tb.members.length / 2)].tree;
        const dx = t.group.position.x - px, dz = t.group.position.z - pz;
        best = { x: t.group.position.x, z: t.group.position.z, d: Math.sqrt(dx * dx + dz * dz) };
      }
      return best || { x: px + 100, z: pz + 30, d: 100 };
    })()`);
    console.log(`\n[AG-6] Target tree cluster at (${cluster.x.toFixed(1)}, ${cluster.z.toFixed(1)}), dist=${cluster.d.toFixed(1)} m`);

    const tx = cluster.x, tz = cluster.z;
    const px0 = await page.evaluate('TT.player.position.x');
    const pz0 = await page.evaluate('TT.player.position.z');
    const angle = Math.atan2(tx - px0, tz - pz0);

    async function walkerShot(label, distFromCluster) {
      const wx = tx - Math.sin(angle) * distFromCluster;
      const wz = tz - Math.cos(angle) * distFromCluster;
      await page.evaluate(`(() => {
        const y = TT.sampleHeight(${wx}, ${wz});
        TT.player.position.set(${wx}, y, ${wz});
        const dx = ${tx} - ${wx}, dz = ${tz} - ${wz};
        const yaw = Math.atan2(dx, dz);
        if (TT.setCameraYaw) TT.setCameraYaw(yaw);
        else if (TT.controls && TT.controls.yaw !== undefined) TT.controls.yaw = yaw;
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 600))');
      await page.evaluate(`for (let i = 0; i < 15; i++) TT.updateTreeBatches();`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await hideUI(page);
      await page.evaluate('TT.setWorldTime(0.4)');
      await page.evaluate('new Promise(r => setTimeout(r, 400))');
      await shot(page, label);
      const stats = await page.evaluate('TT.treeBatchStats()');
      console.log(`    stats at ${label}: live=${stats.live}, batched=${stats.batched}`);
      return stats;
    }

    console.log('\n[AG-6] --- Walking toward tree cluster ---');
    results.batching.stats80 = await walkerShot('batch-on-d080-far', 80);
    results.batching.stats55 = await walkerShot('batch-on-d055-approaching', 55);
    results.batching.stats48 = await walkerShot('batch-on-d048-transition', 48);
    results.batching.stats40 = await walkerShot('batch-on-d040-live', 40);
    results.batching.stats25 = await walkerShot('batch-on-d025-close', 25);

    console.log('\n[AG-6] --- Walking back out ---');
    results.batching.stats45back = await walkerShot('batch-on-d045-exit', 45);
    results.batching.stats60back = await walkerShot('batch-on-d060-exited', 60);

    // FPS near (live trees)
    await page.evaluate(`(() => {
      const wx = ${tx} - Math.sin(${angle}) * 30;
      const wz = ${tz} - Math.cos(${angle}) * 30;
      TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const fps_near_on = await measureFPS(page, 120);
    console.log(`\n[AG-6] FPS near (30 m, batching ON): ${fps_near_on}`);
    results.batching.fps_near = fps_near_on;

    // FPS far (batched trees)
    await page.evaluate(`(() => {
      const wx = ${tx} - Math.sin(${angle}) * 80;
      const wz = ${tz} - Math.cos(${angle}) * 80;
      TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const fps_far_on = await measureFPS(page, 120);
    console.log(`[AG-6] FPS far (80 m, batching ON): ${fps_far_on}`);
    results.batching.fps_far = fps_far_on;

    // Burn test: tree ~100 m away
    console.log('\n[AG-6] --- Burn test: tree ~100 m from player ---');
    await page.evaluate(`(() => {
      const wx = ${tx} - Math.sin(${angle}) * 80;
      const wz = ${tz} - Math.cos(${angle}) * 80;
      TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');

    const burnResult = await page.evaluate(`(() => {
      const px = TT.player.position.x, pz = TT.player.position.z;
      const tb = TT.getTreeBatches();
      let target = null, targetDiff = Infinity;
      for (const m of tb.members) {
        const t = m.tree;
        if (!t || !t.group || !t.alive) continue;
        const dx = t.group.position.x - px, dz = t.group.position.z - pz;
        const d = Math.sqrt(dx * dx + dz * dz);
        const diff = Math.abs(d - 100);
        if (diff < targetDiff) { targetDiff = diff; target = t; }
      }
      if (!target) return { error: 'no tree near 100 m', tbSize: tb.members.length };
      const dist = Math.sqrt((target.group.position.x-px)**2 + (target.group.position.z-pz)**2);
      TT.igniteTree(target);
      return {
        treePos: { x: target.group.position.x.toFixed(1), z: target.group.position.z.toFixed(1) },
        dist: dist.toFixed(1), ignited: true
      };
    })()`);
    console.log('[AG-6] Burn result:', JSON.stringify(burnResult));
    results.batching.burnResult = burnResult;

    await page.evaluate('new Promise(r => setTimeout(r, 1500))');
    if (!burnResult.error) {
      await page.evaluate(`(() => {
        const t = TT.getTreeBatches().members.find(m => m.tree && m.tree.burnT > 0);
        if (t) {
          const dx = t.tree.group.position.x - TT.player.position.x;
          const dz = t.tree.group.position.z - TT.player.position.z;
          const yaw = Math.atan2(dx, dz);
          if (TT.setCameraYaw) TT.setCameraYaw(yaw);
          else if (TT.controls && TT.controls.yaw !== undefined) TT.controls.yaw = yaw;
        }
      })()`);
    }
    await hideUI(page);
    await page.evaluate('new Promise(r => setTimeout(r, 400))');
    await shot(page, 'batch-on-burn-100m');
    const afterBurnStats = await page.evaluate('TT.treeBatchStats()');
    console.log('[AG-6] Stats after igniting tree ~100 m away:', JSON.stringify(afterBurnStats));
    results.batching.statsAfterBurn = afterBurnStats;

  } finally {
    await browser.close();
  }
}

// ── Run 2: batching OFF (?trees=single) ───────────────────────────────────────
console.log('\n\n[AG-6] ===== RUN 2: Tree batching OFF (?trees=single) =====');
{
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

  try {
    const singleUrl = `${origin}/index.html?debug=1&raf=timer&trees=single`;
    console.log(`[AG-6] Navigating: ${singleUrl}`);
    await page.goto(singleUrl, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })();`);
      await page.evaluate('new Promise(r => setTimeout(r, 300))');
    }
    await page.waitFor('!!window.TT', { timeout: 300000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await page.evaluate('new Promise(r => setTimeout(r, 800))');
    console.log('[AG-6] Title screen ready (batching OFF).');
    await page.evaluate('TT.setWorldTime(0.4)');

    const batchOff = await page.evaluate('TT.getTreeBatches().off');
    console.log(`[AG-6] getTreeBatches().off = ${batchOff} (expected true)`);
    results.single.batchOff = batchOff;

    const statsAtHQ = await page.evaluate('TT.treeBatchStats()');
    console.log('[AG-6] treeBatchStats() (single mode):', JSON.stringify(statsAtHQ));
    results.single.statsAtHQ = statsAtHQ;

    const cluster2 = await page.evaluate(`(() => {
      const px = TT.player.position.x, pz = TT.player.position.z;
      const trees = TT.getTreeBatches ? TT.getTreeBatches().members : [];
      let best = null, bestDist = Infinity;
      for (const m of trees) {
        const t = m.tree;
        if (!t || !t.group) continue;
        const dx = t.group.position.x - px, dz = t.group.position.z - pz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 70 && d < 150 && d < bestDist) { bestDist = d; best = { x: t.group.position.x, z: t.group.position.z, d }; }
      }
      return best || { x: px + 100, z: pz + 30, d: 100 };
    })()`);
    const tx2 = cluster2.x, tz2 = cluster2.z;
    const px02 = await page.evaluate('TT.player.position.x');
    const pz02 = await page.evaluate('TT.player.position.z');
    const angle2 = Math.atan2(tx2 - px02, tz2 - pz02);

    async function walkerShot2(label, distFromCluster) {
      const wx = tx2 - Math.sin(angle2) * distFromCluster;
      const wz = tz2 - Math.cos(angle2) * distFromCluster;
      await page.evaluate(`(() => {
        const y = TT.sampleHeight(${wx}, ${wz});
        TT.player.position.set(${wx}, y, ${wz});
        const dx = ${tx2} - ${wx}, dz = ${tz2} - ${wz};
        const yaw = Math.atan2(dx, dz);
        if (TT.setCameraYaw) TT.setCameraYaw(yaw);
        else if (TT.controls && TT.controls.yaw !== undefined) TT.controls.yaw = yaw;
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 600))');
      await hideUI(page);
      await page.evaluate('TT.setWorldTime(0.4)');
      await page.evaluate('new Promise(r => setTimeout(r, 400))');
      const file = path.join(OUT_DIR, `${label}.png`);
      await page.screenshot(file);
      console.log(`  [shot] ${label}.png (${kbOf(file)} KB)`);
      return file;
    }

    await walkerShot2('single-d080-far', 80);
    await walkerShot2('single-d048-transition', 48);
    await walkerShot2('single-d025-close', 25);

    await page.evaluate(`(() => {
      const wx = ${tx2} - Math.sin(${angle2}) * 30;
      const wz = ${tz2} - Math.cos(${angle2}) * 30;
      TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const fps_near_off = await measureFPS(page, 120);
    console.log(`\n[AG-6] FPS near (30 m, batching OFF): ${fps_near_off}`);
    results.single.fps_near = fps_near_off;

    await page.evaluate(`(() => {
      const wx = ${tx2} - Math.sin(${angle2}) * 80;
      const wz = ${tz2} - Math.cos(${angle2}) * 80;
      TT.player.position.set(wx, TT.sampleHeight(wx, wz), wz);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const fps_far_off = await measureFPS(page, 120);
    console.log(`[AG-6] FPS far (80 m, batching OFF): ${fps_far_off}`);
    results.single.fps_far = fps_far_off;

  } finally {
    await browser.close();
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n\n[AG-6] ===== SUMMARY =====');
console.log('\n--- Batch stats at HQ ---');
console.log('  Batching ON :', JSON.stringify(results.batching.statsAtHQ));
console.log('  Batching OFF:', JSON.stringify(results.single.statsAtHQ));

console.log('\n--- FPS comparison ---');
console.log(`  Near trees (30 m)  — ON: ${results.batching.fps_near} fps  |  OFF: ${results.single.fps_near} fps`);
console.log(`  Far trees  (80 m)  — ON: ${results.batching.fps_far} fps  |  OFF: ${results.single.fps_far} fps`);
if (results.batching.fps_far && results.single.fps_far) {
  const pctFar = ((results.batching.fps_far - results.single.fps_far) / results.single.fps_far * 100).toFixed(1);
  console.log(`  Far FPS gain from batching: ${pctFar}%`);
}

console.log('\n--- Walk stats (batching ON) ---');
const walk = results.batching;
for (const [label, stats] of [
  ['80 m from cluster', walk.stats80],
  ['55 m', walk.stats55],
  ['48 m (transition)', walk.stats48],
  ['40 m (live zone)', walk.stats40],
  ['25 m (close)', walk.stats25],
  ['45 m (exiting)', walk.stats45back],
  ['60 m (exited)', walk.stats60back],
]) {
  if (stats) console.log(`  ${label.padEnd(22)}: live=${stats.live}, batched=${stats.batched}`);
}

console.log('\n--- Burn test ---');
console.log('  ', JSON.stringify(results.batching.burnResult));
if (results.batching.statsAfterBurn) {
  console.log('  After ignite:', JSON.stringify(results.batching.statsAfterBurn));
}

console.log(`\n[AG-6] All shots in: ${OUT_DIR}`);
console.log('[AG-6] Done.');

if (server) await server.close();
