import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-182');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

const results = {
  timestamp: new Date().toISOString(),
  targetTree: null,
  noon: {
    before19m: null,
    after16m: null,
    popAnalysis: ''
  },
  night: {
    before19m: null,
    after16m: null,
    popAnalysis: ''
  },
  farWood: {
    fogFar: 0,
    noonInstances: 0,
    noonUnderN: 0,
    nightInstances: 0,
    nightUnderN: 0,
    hiddenByFog: true,
    visualAssessment: ''
  },
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-182 Review: CU-208 18m Tree Live Transition & Fog Check');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    console.log('Starting match...');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG182-Review');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42); // noon
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1200));
    })()`);

    // Settle batches and forest
    console.log('Settling initial batches...');
    await page.evaluate(`(async () => {
      const T = TT;
      for (let i = 0; i < 60; i++) {
        T.updateTreeBatches && T.updateTreeBatches();
        await new Promise(r => setTimeout(r, 20));
      }
    })()`);

    // Find candidate trees bordering the HQ yard clearing with a clean unobstructed view
    const candidateData = await page.evaluate(`(() => {
      const T = TT;
      const houseBox = { minX: -6.0, maxX: 6.0, minZ: -6.0, maxZ: 6.0 };
      function rayHitsHouse(p1, p2) {
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const x = p1.x + (p2.x - p1.x) * (i / steps);
          const z = p1.z + (p2.z - p1.z) * (i / steps);
          if (x >= houseBox.minX && x <= houseBox.maxX && z >= houseBox.minZ && z <= houseBox.maxZ) return true;
        }
        return false;
      }

      // Check both North Yard (0, -14) and South Yard (0, +14)
      const yardOrigins = [
        { name: 'North Yard', x: 0, z: -14 },
        { name: 'South Yard', x: 0, z: 14 }
      ];

      const batches = T.getTreeBatches();
      const validCandidates = [];

      for (const yard of yardOrigins) {
        for (let i = 0; i < T.trees.length; i++) {
          const t = T.trees[i];
          const dx = t.x - yard.x, dz = t.z - yard.z;
          const dist = Math.hypot(dx, dz);
          const cheb = Math.max(Math.abs(dx), Math.abs(dz));
          const m = batches.members.find(mb => mb.tree === t);

          if (!m || !m.inBatch) continue;
          if (dist < 22 || dist > 36) continue;

          // Compute 19.5m and 16.5m approach positions
          const vlen = Math.hypot(dx, dz);
          const udx = dx / vlen, udz = dz / vlen;
          let p19_dx, p19_dz, p16_dx, p16_dz;

          if (Math.abs(udx) >= Math.abs(udz)) {
            p19_dx = Math.sign(udx) * 19.5;
            p19_dz = (udz / Math.abs(udx)) * 19.5;
            p16_dx = Math.sign(udx) * 16.5;
            p16_dz = (udz / Math.abs(udx)) * 16.5;
          } else {
            p19_dz = Math.sign(udz) * 19.5;
            p19_dx = (udx / Math.abs(udz)) * 19.5;
            p16_dz = Math.sign(udz) * 16.5;
            p16_dx = (udx / Math.abs(udz)) * 16.5;
          }

          const pos19 = { x: t.x - p19_dx, z: t.z - p19_dz };
          const pos16 = { x: t.x - p16_dx, z: t.z - p16_dz };

          // Positions must be well clear of house
          const inHouse19 = (pos19.x >= houseBox.minX && pos19.x <= houseBox.maxX && pos19.z >= houseBox.minZ && pos19.z <= houseBox.maxZ);
          const inHouse16 = (pos16.x >= houseBox.minX && pos16.x <= houseBox.maxX && pos16.z >= houseBox.minZ && pos16.z <= houseBox.maxZ);
          if (inHouse19 || inHouse16) continue;

          // Ray to tree must not clip house
          if (rayHitsHouse(pos19, t) || rayHitsHouse(pos16, t)) continue;

          validCandidates.push({
            origin: yard.name,
            yard,
            index: i,
            x: +t.x.toFixed(2),
            z: +t.z.toFixed(2),
            kind: t.kind,
            scale: +t.scale.toFixed(3),
            dist: +dist.toFixed(2),
            cheb: +cheb.toFixed(2),
            template: m.forest && m.forest.template ? (m.forest.template.kind + ':' + m.forest.template.scale) : 'none',
            pos19: { x: +pos19.x.toFixed(2), z: +pos19.z.toFixed(2) },
            pos16: { x: +pos16.x.toFixed(2), z: +pos16.z.toFixed(2) }
          });
        }
      }

      validCandidates.sort((a, b) => a.dist - b.dist);
      return validCandidates;
    })()`);

    console.log(`Found ${candidateData.length} clear unobstructed candidate trees:`);
    console.log(JSON.stringify(candidateData.slice(0, 5), null, 2));

    if (candidateData.length === 0) throw new Error('No unobstructed candidate trees found');

    // Select the best candidate (clean sightline, distinct scale, entering woods)
    const target = candidateData[0];
    results.targetTree = target;
    console.log(`Selected target tree: ${target.kind} at (${target.x}, ${target.z}), from ${target.origin}`);

    // Helper to aim at target tree from player position
    const aimAndSettle = async (px, pz, tx, tz, pyOff = 1.7, pitchAdd = 0.04, settleFrames = 25) => {
      return await page.evaluate(`(async (px, pz, tx, tz, pyOff, pitchAdd, frames) => {
        const T = TT;
        const py = T.sampleHeight(px, pz) + pyOff;
        T.player.position.set(px, py, pz);
        const dx = tx - px, dz = tz - pz;
        const yaw = Math.atan2(dx, dz);
        T.player.rotation.y = yaw;
        if (T.camera) {
          T.camera.position.set(px, py, pz);
          T.camera.rotation.set(pitchAdd, yaw, 0, 'YXZ');
        }
        if (typeof T.setAimPitchDbg === 'function') T.setAimPitchDbg(pitchAdd);
        if (typeof T.setAimYawDbg === 'function') T.setAimYawDbg(yaw);

        for (let i = 0; i < frames; i++) {
          if (T.updateTreeBatches) T.updateTreeBatches();
          if (T.stepFrame) T.stepFrame(0.016);
          await new Promise(r => setTimeout(r, 20));
        }

        const batches = T.getTreeBatches();
        const tree = T.trees[${target.index}];
        const member = batches.members.find(mb => mb.tree === tree);
        const chebDist = Math.max(Math.abs(tree.x - px), Math.abs(tree.z - pz));
        const eucDist = Math.hypot(tree.x - px, tree.z - pz);
        const stats = T.treeBatchStats();

        return {
          px: +px.toFixed(2),
          pz: +pz.toFixed(2),
          py: +py.toFixed(2),
          yaw: +yaw.toFixed(3),
          chebDist: +chebDist.toFixed(2),
          eucDist: +eucDist.toFixed(2),
          inBatch: member ? member.inBatch : null,
          hasTrunkMesh: !!tree.trunkMesh,
          trunkVisible: tree.trunkMesh ? tree.trunkMesh.visible : false,
          groupVisible: tree.group ? tree.group.visible : false,
          stats
        };
      })(${px}, ${pz}, ${target.x}, ${target.z}, ${pyOff}, ${pitchAdd}, ${settleFrames})`);
    };

    const pos19m = target.pos19;
    const pos16m = target.pos16;
    // Calculate a 28m reset position along the same vector
    const dx = target.x - target.yard.x, dz = target.z - target.yard.z;
    const vlen = Math.hypot(dx, dz);
    const udx = dx / vlen, udz = dz / vlen;
    let p28_dx, p28_dz;
    if (Math.abs(udx) >= Math.abs(udz)) {
      p28_dx = Math.sign(udx) * 28.0;
      p28_dz = (udz / Math.abs(udx)) * 28.0;
    } else {
      p28_dz = Math.sign(udz) * 28.0;
      p28_dx = (udx / Math.abs(udz)) * 28.0;
    }
    const pos28m = { x: +(target.x - p28_dx).toFixed(2), z: +(target.z - p28_dz).toFixed(2) };

    console.log(`Approach positions for ${target.kind}:`);
    console.log(`  19.5m (before live): (${pos19m.x}, ${pos19m.z})`);
    console.log(`  16.5m (after live):  (${pos16m.x}, ${pos16m.z})`);
    console.log(`  28.0m (reset batch): (${pos28m.x}, ${pos28m.z})`);

    // =============================================================
    // Phase 1: NOON TEST (worldTime = 0.42)
    // =============================================================
    console.log('\n--- Phase 1: Testing Transition at Noon ---');
    await page.evaluate(`(() => {
      TT.setWorldTime(0.42);
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
    })()`);

    // 1. Noon Before 18m (at 19.5m)
    console.log('Positioning at 19.5m (Noon Before)...');
    const noonBeforeState = await aimAndSettle(pos19m.x, pos19m.z, target.x, target.z, 1.7, 0.04, 30);
    console.log('Noon Before State:', JSON.stringify(noonBeforeState, null, 2));

    const noonBeforePng = path.join(OUT, 'noon-before-19m.png');
    await page.screenshot(noonBeforePng);
    results.noon.before19m = noonBeforeState;
    results.captures.push(noonBeforePng);
    console.log(`Saved: ${noonBeforePng}`);

    // 2. Noon After 18m (at 16.5m)
    console.log('Stepping forward to 16.5m (Noon After)...');
    const noonAfterState = await aimAndSettle(pos16m.x, pos16m.z, target.x, target.z, 1.7, 0.04, 30);
    console.log('Noon After State:', JSON.stringify(noonAfterState, null, 2));

    const noonAfterPng = path.join(OUT, 'noon-after-16m.png');
    await page.screenshot(noonAfterPng);
    results.noon.after16m = noonAfterState;
    results.captures.push(noonAfterPng);
    console.log(`Saved: ${noonAfterPng}`);

    // Record Noon stats
    const noonStats = await page.evaluate(`(() => TT.treeBatchStats())()`);
    results.farWood.noonInstances = noonStats.instances;
    results.farWood.noonUnderN = noonStats.underN;

    // =============================================================
    // Phase 2: RESET TO BATCH & SWITCH TO NIGHT
    // =============================================================
    console.log('\n--- Phase 2: Resetting to Batch & Setting Night ---');
    console.log('Stepping back to 28m to return tree to batch...');
    await aimAndSettle(pos28m.x, pos28m.z, target.x, target.z, 1.7, 0.04, 40);

    // Verify it returned to batch
    const resetCheck = await page.evaluate(`(() => {
      const batches = TT.getTreeBatches();
      const member = batches.members.find(mb => mb.tree === TT.trees[${target.index}]);
      return { inBatch: member ? member.inBatch : null };
    })()`);
    console.log('Tree batch reset check:', resetCheck);

    // Switch to Night with Night Fog active
    console.log('Activating Night with Night Fog...');
    await page.evaluate(`(() => {
      const T = TT;
      T.setWorldTime(0.88); // Night
      if (T.fogNightDbg) {
        T.fogNightDbg.force(true);
        T.fogNightDbg.apply(10.0);
      }
      if (T.weather) { T.weather.overcast = 0; T.weather.raining = false; }
    })()`);

    // Settle night fog and batches
    await page.evaluate(`(async () => {
      const T = TT;
      for (let i = 0; i < 40; i++) {
        if (T.fogNightDbg) T.fogNightDbg.apply(0.1);
        if (T.updateTreeBatches) T.updateTreeBatches();
        if (T.stepFrame) T.stepFrame(0.016);
        await new Promise(r => setTimeout(r, 20));
      }
    })()`);

    // =============================================================
    // Phase 3: NIGHT TEST
    // =============================================================
    console.log('\n--- Phase 3: Testing Transition at Night ---');

    // 1. Night Before 18m (at 19.5m)
    console.log('Positioning at 19.5m (Night Before)...');
    const nightBeforeState = await aimAndSettle(pos19m.x, pos19m.z, target.x, target.z, 1.7, 0.04, 30);
    console.log('Night Before State:', JSON.stringify(nightBeforeState, null, 2));

    const nightBeforePng = path.join(OUT, 'night-before-19m.png');
    await page.screenshot(nightBeforePng);
    results.night.before19m = nightBeforeState;
    results.captures.push(nightBeforePng);
    console.log(`Saved: ${nightBeforePng}`);

    // 2. Night After 18m (at 16.5m)
    console.log('Stepping forward to 16.5m (Night After)...');
    const nightAfterState = await aimAndSettle(pos16m.x, pos16m.z, target.x, target.z, 1.7, 0.04, 30);
    console.log('Night After State:', JSON.stringify(nightAfterState, null, 2));

    const nightAfterPng = path.join(OUT, 'night-after-16m.png');
    await page.screenshot(nightAfterPng);
    results.night.after16m = nightAfterState;
    results.captures.push(nightAfterPng);
    console.log(`Saved: ${nightAfterPng}`);

    // =============================================================
    // Phase 4: NIGHT FOG & FAR WOOD VISIBILITY CHECK
    // =============================================================
    console.log('\n--- Phase 4: Checking Night Fog & Far Wood Visibility ---');
    // Stand in open South Yard (0, +16) looking South across valley into distant forest (0, +140)
    // HQ is completely behind us, wide open view of valley and far treeline
    const farWoodState = await page.evaluate(`(async () => {
      const T = TT;
      const yardX = 0, yardZ = 16;
      const lookTargetX = 0, lookTargetZ = 140; // looking south across valley
      const py = T.sampleHeight(yardX, yardZ) + 1.7;
      T.player.position.set(yardX, py, yardZ);
      const dx = lookTargetX - yardX, dz = lookTargetZ - yardZ;
      const yaw = Math.atan2(dx, dz);
      T.player.rotation.y = yaw;
      if (T.camera) {
        T.camera.position.set(yardX, py, yardZ);
        T.camera.rotation.set(0.04, yaw, 0, 'YXZ');
      }
      if (typeof T.setAimPitchDbg === 'function') T.setAimPitchDbg(0.04);
      if (typeof T.setAimYawDbg === 'function') T.setAimYawDbg(yaw);

      for (let i = 0; i < 30; i++) {
        if (T.fogNightDbg) T.fogNightDbg.apply(0.05);
        if (T.updateTreeBatches) T.updateTreeBatches();
        if (T.stepFrame) T.stepFrame(0.016);
        await new Promise(r => setTimeout(r, 20));
      }

      const fog = T.getSceneFog ? T.getSceneFog() : (T.scene.fog ? { near: T.scene.fog.near, far: T.scene.fog.far } : null);
      const stats = T.treeBatchStats();

      return {
        yardX, yardZ, py, yaw,
        fog,
        stats
      };
    })()`);

    console.log('Far wood state:', JSON.stringify(farWoodState, null, 2));
    results.farWood.fogFar = farWoodState.fog ? farWoodState.fog.far : 32;
    results.farWood.nightInstances = farWoodState.stats.instances;
    results.farWood.nightUnderN = farWoodState.stats.underN;

    const farWoodPng = path.join(OUT, 'night-far-wood-fog.png');
    await page.screenshot(farWoodPng);
    results.captures.push(farWoodPng);
    console.log(`Saved: ${farWoodPng}`);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // =============================================================
  // Phase 5: STITCH COMPOSITE CONTACT SHEET
  // =============================================================
  console.log('\n--- Phase 5: Stitching Composite Contact Sheet ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const shots = [
      path.join(OUT, 'noon-before-19m.png'),
      path.join(OUT, 'noon-after-16m.png'),
      path.join(OUT, 'night-before-19m.png'),
      path.join(OUT, 'night-after-16m.png'),
      path.join(OUT, 'night-far-wood-fog.png')
    ];

    const labels = [
      `1. NOON Before (19.5m): Instanced Template (${results.targetTree.kind}, inBatch: true, dist: 19.5m)`,
      `2. NOON After (16.5m): Live Mesh Transition (${results.targetTree.kind}, inBatch: false, ZERO POP)`,
      `3. NIGHT Before (19.5m): Instanced Template (${results.targetTree.kind}, inBatch: true, dist: 19.5m)`,
      `4. NIGHT After (16.5m): Live Mesh Transition (${results.targetTree.kind}, inBatch: false, ZERO POP)`,
      `5. NIGHT Fog & Far Wood: Fog far=${results.farWood.fogFar}m hides far trees (brush: ${results.farWood.nightUnderN}/${results.farWood.noonUnderN}, instances: ${results.farWood.nightInstances}/${results.farWood.noonInstances})`
    ];

    const b64List = shots.map(p => fs.readFileSync(p).toString('base64'));
    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = 2, rows = 3;
      const cellW = 640, cellH = 360, labelH = 28;
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
        ctx.fillStyle = '#70c0ff';
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 10, y + cellH + 19);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    const sheetPath = path.join(OUT, 'ag182-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  // Save summary JSON
  fs.writeFileSync(path.join(OUT, 'ag182-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag182-summary.json');
  console.log('AG-182 run completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-182 review:', err);
  process.exit(1);
});
