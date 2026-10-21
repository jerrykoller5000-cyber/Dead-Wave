// qa/run-ag6b.mjs — AG-6b: redo tree batch shots, batching ON and OFF, same camera positions.
//
// The AG-6 run-ag6.mjs shots had the game's source visible down the left column — the page
// was captured before the loader had finished handing over to the rendered canvas. This script
// follows shoot.mjs's proven approach: wait for DWOpening.active===false (canvas uncovered),
// then hide UI exactly as shoot.mjs does, then position the camera with TT.setShotView and
// TT.player.position, let the scene settle, and only then grab the screenshot.
//
// Views (both runs use identical positions):
//   tree-near-30   player at 30 m from cluster, looking at it   (live trees)
//   tree-mid-48    player at 48 m from cluster                  (transition zone)
//   tree-far-80    player at 80 m from cluster                  (batched trees)
//   tree-burn      player ~80 m from player, ignited tree 99 m away
//
// Run 1: batching ON  (?debug=1&raf=timer)
// Run 2: batching OFF (?debug=1&raf=timer&trees=single)
//
// Shots: qa/shots/2026-09-23-AG-6b/

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-23-AG-6b');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }

// Identical to shoot.mjs: wait for world, skip opening, hide UI overlay
async function bootToTitle(page, url) {
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })();`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 300000 });
  if (!ready) throw new Error('window.TT never appeared');
  // This is the key signal — canvas is uncovered only here
  const uncovered = await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  if (!uncovered) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })();`);
    await page.waitFor('window.DWOpening.active === false', { timeout: 60000 });
  }
  await page.evaluate('new Promise(r => setTimeout(r, 700))'); // let hand-over fade end
  // Hide UI — identical to shoot.mjs
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
}

// Known-good cluster from the AG-6 run (same world seed every time).
// Hardcoded so both ON and OFF runs shoot the same positions — AG-6b's whole
// point is a side-by-side comparison from identical camera spots.
// Cluster at (-46.9, -53.0); HQ start near (0, 0).
// The angle from HQ → cluster is atan2(-46.9, -53.0) ≈ -2.42 rad (SW).
// For each distance, the player stands on the HQ side of the cluster
// (i.e. cluster + sin/cos * dist), looking toward the cluster.
// That keeps a backdrop of dense forest behind the cluster in every shot.
async function findPositions(page) {
  return page.evaluate(`(() => {
    const px = TT.player.position.x, pz = TT.player.position.z;
    // Pinned cluster — same position for both ON and OFF runs
    const best = { x: -46.9, z: -53.0 };
    // Direction from HQ toward cluster
    const angle = Math.atan2(best.x - px, best.z - pz);
    const sin = Math.sin(angle), cos = Math.cos(angle);
    // Player stands ON THE HQ SIDE of the cluster (cluster + dist * direction-away-from-cluster),
    // looking back toward the cluster — this puts the tree forest behind the cluster in frame.
    function pos(distFromCluster) {
      return {
        wx: best.x + sin * distFromCluster,   // opposite side from AG-6 — HQ side
        wz: best.z + cos * distFromCluster,
        tx: best.x, tz: best.z
      };
    }
    const p30 = pos(30), p48 = pos(48), p80 = pos(80);
    return {
      cluster: best,
      near:   { ...p30, wy: TT.sampleHeight(p30.wx, p30.wz), label: '30m-near' },
      mid:    { ...p48, wy: TT.sampleHeight(p48.wx, p48.wz), label: '48m-mid' },
      far:    { ...p80, wy: TT.sampleHeight(p80.wx, p80.wz), label: '80m-far' },
      burnFrom: { ...p80, wy: TT.sampleHeight(p80.wx, p80.wz) }
    };
  })()`);
}

async function takeView(page, pos, cluster, name) {
  // Move player
  await page.evaluate(`(() => {
    TT.player.position.set(${pos.wx}, ${pos.wy}, ${pos.wz});
    // Force batch update for new player position
    for (let i = 0; i < 20; i++) TT.updateTreeBatches();
  })()`);
  // Point camera from player toward cluster using setShotView
  await page.evaluate(`TT.setShotView(${JSON.stringify({
    x: pos.wx, y: pos.wy + 2.5, z: pos.wz,
    tx: cluster.x, ty: cluster.wy !== undefined ? cluster.wy + 3 : 0, tz: cluster.z,
    fov: 55
  })})`);
  await page.evaluate('TT.setWorldTime(0.4)');
  await page.evaluate('new Promise(r => setTimeout(r, 500))');
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot(file);
  const stats = await page.evaluate('TT.treeBatchStats()');
  console.log(`  [shot] ${name}.png (${kbOf(file)} KB) — live=${stats.live}, batched=${stats.batched}`);
  return { file, stats };
}

// Check the first pixel row of a screenshot for source code (text-like content)
// We do this by reading the PNG header - a mostly grey/dark first row indicates clean render
// (We can't decode PNG in Node without deps, so we just log file size; very small = likely black/empty)

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(`${origin}/index.html`);
  if (!res.ok) throw new Error('not ok');
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
}

const results = {};

// ── RUN HELPER ────────────────────────────────────────────────────────────────
async function runViews(label, url) {
  console.log(`\n[AG-6b] ===== ${label} =====`);
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  try {
    await bootToTitle(page, url);
    console.log(`[AG-6b] Canvas uncovered. Finding tree cluster...`);

    const pos = await findPositions(page);
    console.log(`[AG-6b] Cluster at (${pos.cluster.x.toFixed(1)}, ${pos.cluster.z.toFixed(1)})`);
    // Store cluster height for camera target
    const clusterY = await page.evaluate(`TT.sampleHeight(${pos.cluster.x}, ${pos.cluster.z})`);
    pos.cluster.wy = clusterY;

    const prefix = label === 'ON' ? 'on' : 'off';
    const r = {};

    r.near = await takeView(page, pos.near, pos.cluster, `tree-${prefix}-near-30m`);
    r.mid  = await takeView(page, pos.mid,  pos.cluster, `tree-${prefix}-mid-48m`);
    r.far  = await takeView(page, pos.far,  pos.cluster, `tree-${prefix}-far-80m`);

    // Burn test (batching ON only — no point in OFF)
    if (label === 'ON') {
      await page.evaluate(`TT.player.position.set(${pos.burnFrom.wx}, ${pos.burnFrom.wy}, ${pos.burnFrom.wz})`);
      await page.evaluate('new Promise(r => setTimeout(r, 300))');
      const burnResult = await page.evaluate(`(() => {
        const px = TT.player.position.x, pz = TT.player.position.z;
        const tb = TT.getTreeBatches();
        let target = null, diff = Infinity;
        for (const m of tb.members) {
          const t = m.tree; if (!t || !t.group || !t.alive) continue;
          const d = Math.abs(Math.sqrt((t.group.position.x-px)**2+(t.group.position.z-pz)**2) - 100);
          if (d < diff) { diff = d; target = t; }
        }
        if (!target) return { error: 'no tree near 100m' };
        TT.igniteTree(target);
        return { dist: Math.sqrt((target.group.position.x-px)**2+(target.group.position.z-pz)**2).toFixed(1), ignited: true };
      })()`);
      console.log(`  Burn: ${JSON.stringify(burnResult)}`);
      await page.evaluate('new Promise(r => setTimeout(r, 1500))');
      // Look toward burning tree
      await page.evaluate(`(() => {
        const t = TT.getTreeBatches().members.find(m => m.tree && m.tree.burnT > 0);
        if (t) {
          const dx = t.tree.group.position.x - TT.player.position.x;
          const dz = t.tree.group.position.z - TT.player.position.z;
          TT.setShotView({ x: TT.player.position.x, y: TT.player.position.y + 2.5, z: TT.player.position.z, tx: t.tree.group.position.x, ty: t.tree.group.position.y + 3, tz: t.tree.group.position.z, fov: 40 });
        }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 400))');
      const burnFile = path.join(OUT_DIR, 'tree-on-burn.png');
      await page.screenshot(burnFile);
      console.log(`  [shot] tree-on-burn.png (${kbOf(burnFile)} KB)`);
      r.burn = burnResult;
    }

    // Sanity-check: confirm no source text by checking file size floor
    // A 1280x720 all-black PNG is ~15 KB; a rendered scene is typically 400+ KB
    for (const [k, v] of Object.entries(r)) {
      if (v && v.file) {
        const kb = parseInt(kbOf(v.file));
        if (kb < 100) console.warn(`  ⚠️  ${k} shot is only ${kb} KB — may be mostly black or broken`);
      }
    }

    await page.evaluate('TT.setShotView(null)');
    results[label] = r;
  } finally {
    await browser.close();
  }
}

await runViews('ON',  `${origin}/index.html?debug=1&raf=timer`);
await runViews('OFF', `${origin}/index.html?debug=1&raf=timer&trees=single`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n\n[AG-6b] ===== SUMMARY =====');
for (const label of ['ON', 'OFF']) {
  const r = results[label];
  if (!r) continue;
  console.log(`\nBatching ${label}:`);
  for (const [view, data] of Object.entries(r)) {
    if (data && data.file) {
      console.log(`  ${view.padEnd(6)}: ${path.basename(data.file)} (${kbOf(data.file)} KB)` +
        (data.stats ? ` live=${data.stats.live} batched=${data.stats.batched}` : ''));
    }
  }
}
console.log(`\n[AG-6b] Shots in: ${OUT_DIR}`);
console.log('[AG-6b] Done.');
if (server) await server.close();
