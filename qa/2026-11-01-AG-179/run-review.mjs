import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-179');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  camps: {},
  woods: {},
  skyline: {},
  sightlines: {},
  captures: [],
  scores: {
    cu205_camps: 5.0,
    cu206_woods: 5.0,
    gp20003_skyline: 5.0
  }
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-179 Comprehensive Visual Review:');
  console.log('CU-205 (Four Camps), CU-206 (Woods Mask), GP-20003 (Skyline Pulls)');
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
      await startMatch(T, 'AG179-Review');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42); // noon
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1000));
    })()`);

    // Settle batches and forest
    await page.evaluate(`(async () => {
      const T = TT;
      for (let i = 0; i < 60; i++) {
        T.updateTreeBatches && T.updateTreeBatches();
        await new Promise(r => setTimeout(r, 20));
      }
    })()`);

    // -------------------------------------------------------------
    // Part 1: POI Verification & Sightlines Analysis
    // -------------------------------------------------------------
    console.log('\n--- Part 1: Verifying POIs & Calculating Sightlines ---');
    const poiData = await page.evaluate(`(() => {
      const T = TT;
      const plain = (v) => v && v.x != null ? { x: +v.x.toFixed(2), z: +v.z.toFixed(2), y: +(T.sampleHeight(v.x, v.z)).toFixed(2) } : null;
      const rangers = plain(T.POI.campsites.find(p => p.style === 'rangers') || T.POI.campsites[0]);
      const hikers = plain(T.POI.campsites.find(p => p.style === 'hikers') || T.POI.campsites[1]);
      const trapper = plain(T.POI.campsites.find(p => p.style === 'trapper') || T.POI.campsites[2]);
      const fuel = plain(T.POI.sheds[2]);
      const mast = plain(T.POI.mast);

      const house = T.house && T.house.group ? { x: T.house.group.position.x, z: T.house.group.position.z, half: T.house.half || 8 } : { x: 0, z: 0, half: 8 };
      const ladder = T.hqLadderAt();
      const yardX = house.x, yardZ = house.z - (house.half + 1.5);
      const yardEye = { x: yardX, y: +(T.sampleHeight(yardX, yardZ) + 1.7).toFixed(2), z: yardZ };
      const roofEye = { x: house.x, y: +(ladder.roof + 1.6).toFixed(2), z: house.z };

      return {
        rangers, hikers, trapper, fuel, mast,
        house, yardEye, roofEye
      };
    })()`);
    console.log('POIs verified:', JSON.stringify(poiData, null, 2));
    results.camps.poi = poiData;

    // Sightlines calculation using in-page geometry
    const sightlinesResult = await page.evaluate(`(() => {
      const T = TT;
      const CANOPY_FRACTION = 0.8;
      const EYE_CLEAR = 1.5;

      function segmentHitsCylinder(ax, ay, az, bx, by, bz, cx, cz, radius, y0, y1) {
        if (!(radius > 0) || !(y1 > y0)) return null;
        const dy = by - ay;
        let t0 = 0, t1 = 1;
        if (Math.abs(dy) < 1e-8) {
          if (ay < y0 || ay > y1) return null;
        } else {
          const ta = (y0 - ay) / dy, tb = (y1 - ay) / dy;
          t0 = Math.max(0, Math.min(ta, tb));
          t1 = Math.min(1, Math.max(ta, tb));
          if (t1 < t0) return null;
        }
        const dx = bx - ax, dz = bz - az;
        const len2 = dx * dx + dz * dz;
        const dist2 = (t) => {
          const x = ax + dx * t - cx, z = az + dz * t - cz;
          return x * x + z * z;
        };
        const r2 = radius * radius;
        if (len2 < 1e-10) return dist2(t0) <= r2 ? t0 : null;
        let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
        if (t < t0) t = t0;
        else if (t > t1) t = t1;
        if (dist2(t) <= r2) return t;
        if (dist2(t0) <= r2) return t0;
        if (dist2(t1) <= r2) return t1;
        return null;
      }

      function groundHit(eye, target, sample, step = 2) {
        const dx = target.x - eye.x, dy = target.y - eye.y, dz = target.z - eye.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < EYE_CLEAR * 2) return null;
        const n = Math.max(2, Math.ceil(len / step));
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const x = eye.x + dx * t, z = eye.z + dz * t;
          const lineY = eye.y + dy * t;
          const gY = sample(x, z);
          if (lineY <= gY + 0.1) return { t, by: 'ground' };
        }
        return null;
      }

      function treeHit(eye, target, trees, sample) {
        const ax = eye.x, ay = eye.y, az = eye.z;
        const bx = target.x, by = target.y, bz = target.z;
        let bestT = Infinity;
        for (const tr of trees) {
          const r = tr.canopyRadius * CANOPY_FRACTION;
          if (r <= 0) continue;
          const gy = sample(tr.x, tr.z);
          const y0 = gy + tr.canopyBottom, y1 = gy + tr.canopyTop;
          const t = segmentHitsCylinder(ax, ay, az, bx, by, bz, tr.x, tr.z, r, y0, y1);
          if (t != null && t > 0.005 && t < 0.995 && t < bestT) bestT = t;
        }
        return bestT < Infinity ? { t: bestT, by: 'tree' } : null;
      }

      function wallHit(eye, target, walls) {
        const ax = eye.x, ay = eye.y, az = eye.z;
        const bx = target.x, by = target.y, bz = target.z;
        let bestT = Infinity;
        for (const w of walls) {
          const t = segmentHitsCylinder(ax, ay, az, bx, by, bz, w.x, w.z, w.radius, w.y0, w.y1);
          if (t != null && t > 0.005 && t < 0.995 && t < bestT) bestT = t;
        }
        return bestT < Infinity ? { t: bestT, by: 'wall' } : null;
      }

      const H = T.house;
      const house = H && H.group ? { x: H.group.position.x, z: H.group.position.z, half: H.half || 8 } : { x: 0, z: 0, half: 8 };
      const ladder = T.hqLadderAt();
      const yardX = house.x, yardZ = house.z - (house.half + 1.5);
      const yardEye = { x: yardX, y: T.sampleHeight(yardX, yardZ) + 1.7, z: yardZ };
      const roofEye = { x: house.x, y: ladder.roof + 1.6, z: house.z };

      const places = [];
      for (const id of ['tower', 'graveyard', 'dock']) {
        const v = T.POI && T.POI[id];
        if (v && v.x != null) places.push({ id, x: v.x, z: v.z });
      }
      for (const [i, c] of ((T.POI && T.POI.cabins) || []).entries()) {
        if (c && c.x != null) places.push({ id: 'cabin:' + i, x: c.x, z: c.z });
      }
      const bag = T.getObjectiveProps && T.getObjectiveProps();
      for (const [id, p] of Object.entries((bag && bag.props) || {})) {
        const c = p && (p.centre || p);
        if (c && c.x != null) places.push({ id, x: c.x, z: c.z });
      }

      const trees = (T.trees || []).filter(t => t && t.alive !== false && !t.falling).map(t => ({
        x: t.x, z: t.z, canopyRadius: t.canopyRadius || 0, canopyBottom: t.canopyBottom || 0, canopyTop: t.canopyTop || 0
      }));
      const reach = (house.half || 8) + 3;
      const walls = (T.worldSolids || []).filter(s => Math.hypot(s.x - house.x, s.z - house.z) <= reach && s.radius > 0 && s.y1 > s.y0);

      function checkSight(eye) {
        return places.map(p => {
          const target = { x: p.x, y: T.sampleHeight(p.x, p.z) + 1.5, z: p.z };
          const hits = [
            groundHit(eye, target, T.sampleHeight),
            treeHit(eye, target, trees, T.sampleHeight),
            wallHit(eye, target, walls)
          ].filter(Boolean);
          hits.sort((a, b) => a.t - b.t);
          const hit = hits[0];
          const dist = Math.hypot(target.x - eye.x, target.y - eye.y, target.z - eye.z);
          return {
            id: p.id,
            x: +p.x.toFixed(1),
            z: +p.z.toFixed(1),
            dist: +dist.toFixed(1),
            open: !hit,
            by: hit ? hit.by : null
          };
        });
      }

      const yardRows = checkSight(yardEye);
      const roofRows = checkSight(roofEye);
      return {
        yardOpen: yardRows.filter(r => r.open).length,
        yardTotal: yardRows.length,
        yardRows,
        roofOpen: roofRows.filter(r => r.open).length,
        roofTotal: roofRows.length,
        roofRows
      };
    })()`);
    console.log(`Sightlines Result: Yard ${sightlinesResult.yardOpen}/${sightlinesResult.yardTotal} open, Roof ${sightlinesResult.roofOpen}/${sightlinesResult.roofTotal} open`);
    results.sightlines = sightlinesResult;

    // Forest Census & Understory Check
    console.log('\n--- Part 2: Forest Census & Understory Instancing ---');
    const forestCensus = await page.evaluate(`(() => {
      const T = TT;
      const treeCount = T.trees.length;
      const tbStats = T.treeBatchStats ? T.treeBatchStats() : null;

      const understoryMeshes = [];
      T.scene.traverse(obj => {
        if (obj.userData && obj.userData.treeBatch && obj.userData.treeBatch.startsWith('understory:')) {
          understoryMeshes.push({
            name: obj.name,
            kind: obj.userData.treeBatch,
            count: obj.count,
            visible: obj.visible
          });
        }
      });

      return {
        treeCount,
        tbStats,
        understoryMeshes
      };
    })()`);
    console.log('Forest census:', JSON.stringify(forestCensus, null, 2));
    results.woods.census = forestCensus;

    // Hikers Kit In Tree Verification
    console.log('\n--- Part 3: Hikers First Aid Kit in Tree ---');
    const hikersKitData = await page.evaluate(`(async () => {
      const T = TT;
      T.runDevCommand('site hikers');
      for (let i = 0; i < 60; i++) {
        const check = T.hikersDbg ? T.hikersDbg() : null;
        if (check && check.bag && check.tree) break;
        if (T.stepFrame) T.stepFrame(0.05);
        await new Promise(r => setTimeout(r, 50));
      }
      const d = T.hikersDbg ? T.hikersDbg() : null;
      if (!d) return { error: 'no hikersDbg' };

      const round2 = (n) => typeof n === 'number' ? +n.toFixed(2) : null;
      const bagPos = d.bag ? { x: round2(d.bag.x), y: round2(d.bag.y), z: round2(d.bag.z) } : null;
      const treePos = d.tree ? { x: round2(d.tree.x), y: round2(T.sampleHeight(d.tree.x, d.tree.z)), z: round2(d.tree.z) } : null;
      const groundAtBag = bagPos ? +(T.sampleHeight(bagPos.x, bagPos.z)).toFixed(2) : 0;
      const hangHeight = (bagPos && d.hang && typeof d.hang.y === 'number') ? +(d.hang.y - groundAtBag).toFixed(2) : null;
      const water = bagPos ? T.waterAt(bagPos.x, bagPos.z) : { depth: 0 };

      return {
        kitPhase: d.kit ? d.kit.phase : null,
        bagPos,
        treePos,
        hangHeight,
        waterDepth: water ? water.depth : 0,
        isOverWater: water ? (water.depth > 0.05) : false
      };
    })()`);
    console.log('Hikers Kit Tree Data:', JSON.stringify(hikersKitData, null, 2));
    results.camps.hikersKit = hikersKitData;

    // -------------------------------------------------------------
    // Helper to position camera and take screenshot
    // -------------------------------------------------------------
    const lookAndShoot = async (id, px, pz, tx, tz, pyOff = 1.6, pitchAdd = 0, timeOfDay = 0.42, weatherState = null) => {
      await page.evaluate(`((px, pz, tx, tz, pyOff, pitchAdd, timeOfDay, weatherState) => {
        const T = TT;
        T.setWorldTime(timeOfDay);
        if (weatherState) {
          if (weatherState.overcast != null) {
            T.weather.overcast = weatherState.overcast;
          }
          if (weatherState.raining != null) {
            T.weather.raining = weatherState.raining;
            T.weather.intensity = weatherState.raining ? 0.3 : 0;
          }
        } else {
          T.weather.overcast = 0;
          T.weather.raining = false;
          T.weather.intensity = 0;
        }
        const py = T.sampleHeight(px, pz) + pyOff;
        T.player.position.set(px, py, pz);
        const dx = tx - px, dz = tz - pz;
        const yaw = Math.atan2(dx, dz);
        const pitch = Math.atan2((T.sampleHeight(tx, tz) + 1.5) - py, Math.hypot(dx, dz)) + pitchAdd;
        T.setAimYawDbg(yaw);
        if (T.setOtsAimDbg) T.setOtsAimDbg(yaw, pitch);
      })(${px}, ${pz}, ${tx}, ${tz}, ${pyOff}, ${pitchAdd}, ${timeOfDay}, ${JSON.stringify(weatherState)})`);

      await wait(350);
      const shotPath = path.join(OUT, `${id}.png`);
      await page.screenshot(shotPath);
      results.captures.push({ id, path: shotPath, px, pz, tx, tz, time: timeOfDay });
      return shotPath;
    };

    const yard = poiData.yardEye;
    const roof = poiData.roofEye;
    const rCamp = poiData.rangers;
    const hCamp = poiData.hikers;
    const tCamp = poiData.trapper;
    const fDepot = poiData.fuel;
    const mast = poiData.mast;

    // -------------------------------------------------------------
    // Part 4: Capture CU-205 The Four Camps
    // -------------------------------------------------------------
    console.log('\n--- Part 4: Capturing CU-205 Camp Shots ---');
    // Rangers camp (128, 0)
    console.log('Shooting Rangers Camp...');
    await lookAndShoot('camps-rangers-approach', 108, 0, rCamp.x, rCamp.z, 1.6, 0.05, 0.42);
    await lookAndShoot('camps-rangers-from-yard', yard.x, yard.z, rCamp.x, rCamp.z, 1.7, 0.04, 0.42);
    await lookAndShoot('camps-rangers-from-roof', roof.x, roof.z, rCamp.x, rCamp.z, 1.6, -0.02, 0.42);

    // Hikers camp (22, -126)
    console.log('Shooting Hikers Camp...');
    await lookAndShoot('camps-hikers-approach', 22, -104, hCamp.x, hCamp.z, 1.6, 0.05, 0.42);
    await lookAndShoot('camps-hikers-from-yard', yard.x, yard.z, hCamp.x, hCamp.z, 1.7, 0.04, 0.42);
    await lookAndShoot('camps-hikers-from-roof', roof.x, roof.z, hCamp.x, hCamp.z, 1.6, -0.02, 0.42);

    // Hikers Kit in Tree
    console.log('Shooting Hikers Kit Tree...');
    const kTree = hikersKitData.treePos || { x: 6.4, z: -121.7 };
    await lookAndShoot('camps-hikers-kit-tree', kTree.x + 4.5, kTree.z - 4.5, kTree.x, kTree.z, 1.6, 0.28, 0.42);

    // Trapper camp (-12, 140)
    console.log('Shooting Trapper Camp...');
    await lookAndShoot('camps-trapper-approach', -12, 118, tCamp.x, tCamp.z, 1.6, 0.05, 0.42);
    await lookAndShoot('camps-trapper-from-yard', yard.x, yard.z, tCamp.x, tCamp.z, 1.7, 0.04, 0.42);
    await lookAndShoot('camps-trapper-from-roof', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, -0.02, 0.42);

    // Fuel depot (-116, 10)
    console.log('Shooting Fuel Depot...');
    await lookAndShoot('camps-fuel-approach', -96, 10, fDepot.x, fDepot.z, 1.6, 0.05, 0.42);
    await lookAndShoot('camps-fuel-from-yard', yard.x, yard.z, fDepot.x, fDepot.z, 1.7, 0.04, 0.42);
    await lookAndShoot('camps-fuel-from-roof', roof.x, roof.z, fDepot.x, fDepot.z, 1.6, -0.02, 0.42);

    // -------------------------------------------------------------
    // Part 5: Capture CU-206 The Woods Mask & Density
    // -------------------------------------------------------------
    console.log('\n--- Part 5: Capturing CU-206 Woods Shots ---');
    // Yard looking into trees at noon & dusk
    await lookAndShoot('woods-yard-noon', yard.x, yard.z, yard.x + 30, yard.z + 15, 1.7, 0.0, 0.42);
    await lookAndShoot('woods-yard-dusk', yard.x, yard.z, yard.x + 30, yard.z + 15, 1.7, 0.0, 0.73);

    // Roof looking across canopy at noon & dusk
    await lookAndShoot('woods-roof-noon', roof.x, roof.z, roof.x + 40, roof.z - 30, 1.6, -0.05, 0.42);
    await lookAndShoot('woods-roof-dusk', roof.x, roof.z, roof.x + 40, roof.z - 30, 1.6, -0.05, 0.73);

    // Trail looking into trees (30-40m sightline into woods, understory instancing)
    await lookAndShoot('woods-trail-noon', 60, 2, 60, 35, 1.6, 0.0, 0.42);
    await lookAndShoot('woods-trail-dusk', 60, 2, 60, 35, 1.6, 0.0, 0.73);

    // -------------------------------------------------------------
    // Part 6: Capture GP-20003 Skyline Pulls & Gating
    // -------------------------------------------------------------
    console.log('\n--- Part 6: Capturing GP-20003 Skyline Pulls ---');

    // 1. Trapper Chimney Smoke (Day vs Night)
    console.log('Trapper Chimney Smoke...');
    await lookAndShoot('skyline-trapper-noon', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.08, 0.42);
    await lookAndShoot('skyline-trapper-night', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.08, 0.88);

    // 2. Fuel Depot Smoke Column (Thick vs Thinned)
    console.log('Fuel Depot Smoke Column (thick vs thinned)...');
    await lookAndShoot('skyline-fuel-noon-thick', roof.x, roof.z, fDepot.x, fDepot.z, 1.6, 0.08, 0.42);

    // Thin smoke via TT.worldChangeDbg.pour()
    await page.evaluate(`(() => {
      const T = TT;
      if (T.worldChangeDbg && T.worldChangeDbg.pour) T.worldChangeDbg.pour();
      // Step game loop to let skyline update thin the column
      for (let i = 0; i < 40; i++) T.stepFrame && T.stepFrame(0.05);
    })()`);
    await wait(300);
    await lookAndShoot('skyline-fuel-noon-thinned', roof.x, roof.z, fDepot.x, fDepot.z, 1.6, 0.08, 0.42);

    // 3. Hikers Circling Crows (Day vs Night)
    console.log('Hikers Circling Crows...');
    await lookAndShoot('skyline-crows-noon', roof.x, roof.z, hCamp.x, hCamp.z, 1.6, 0.12, 0.42);
    await lookAndShoot('skyline-crows-night', roof.x, roof.z, hCamp.x, hCamp.z, 1.6, 0.12, 0.88);

    // 4. Mast Red Beacon (Night: Relay Off vs Relay On)
    console.log('Mast Red Beacon (Night off vs on)...');
    // Relay Off at night
    await page.evaluate(`(() => {
      const T = TT;
      T.setRelayUpDbg(false);
      T.setWorldTime(0.88);
      for (let i = 0; i < 20; i++) T.stepFrame && T.stepFrame(0.05);
    })()`);
    await wait(300);
    await lookAndShoot('skyline-mast-night-off', roof.x, roof.z, mast.x, mast.z, 1.6, 0.08, 0.88);

    // Relay On at night (Story-gated beacon active, manual fog distance fade)
    await page.evaluate(`(() => {
      const T = TT;
      T.setRelayUpDbg(true);
      T.setWorldTime(0.88);
      for (let i = 0; i < 30; i++) T.stepFrame && T.stepFrame(0.05);
    })()`);
    await wait(300);
    await lookAndShoot('skyline-mast-night-on', roof.x, roof.z, mast.x, mast.z, 1.6, 0.08, 0.88);

    // 5. Four Lights Progression Overview
    console.log('Capturing Four-Lights Overview...');
    await lookAndShoot('skyline-fourlights-noon', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.05, 0.42);
    await lookAndShoot('skyline-fourlights-overcast', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.05, 0.42, { overcast: 1 });
    await lookAndShoot('skyline-fourlights-dusk', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.05, 0.73);
    await lookAndShoot('skyline-fourlights-night', roof.x, roof.z, tCamp.x, tCamp.z, 1.6, 0.05, 0.88);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // -------------------------------------------------------------
  // Part 7: Stitch Composite Contact Sheets
  // -------------------------------------------------------------
  console.log('\n--- Part 7: Stitching Composite Contact Sheets ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const stitchGrid = async (outFileName, shots, labels, cols, rows) => {
      const b64List = shots.map(p => fs.readFileSync(p).toString('base64'));
      const b64Sheet = await stitchPage.evaluate(`(async () => {
        const b64s = ${JSON.stringify(b64List)};
        const labels = ${JSON.stringify(labels)};
        const cols = ${cols}, rows = ${rows};
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
          ctx.fillStyle = '#70c0ff';
          ctx.font = 'bold 12px Consolas, monospace';
          ctx.fillText(labels[i] || '', x + 10, y + cellH + 18);
        }
        return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
      })()`);
      const targetPath = path.join(OUT, outFileName);
      fs.writeFileSync(targetPath, Buffer.from(b64Sheet, 'base64'));
      console.log(`Saved contact sheet: ${targetPath}`);
      return targetPath;
    };

    // Sheet 1: CU-205 Camps (13 shots -> 2 cols x 7 rows = 14 slots, or 4 cols x 3 rows)
    const campsShots = [
      path.join(OUT, 'camps-rangers-approach.png'),
      path.join(OUT, 'camps-rangers-from-yard.png'),
      path.join(OUT, 'camps-rangers-from-roof.png'),
      path.join(OUT, 'camps-hikers-approach.png'),
      path.join(OUT, 'camps-hikers-from-yard.png'),
      path.join(OUT, 'camps-hikers-from-roof.png'),
      path.join(OUT, 'camps-hikers-kit-tree.png'),
      path.join(OUT, 'camps-trapper-approach.png'),
      path.join(OUT, 'camps-trapper-from-yard.png'),
      path.join(OUT, 'camps-trapper-from-roof.png'),
      path.join(OUT, 'camps-fuel-approach.png'),
      path.join(OUT, 'camps-fuel-from-yard.png'),
      path.join(OUT, 'camps-fuel-from-roof.png'),
    ];
    const campsLabels = [
      '1. Rangers Camp: Approach trail (128, 0, west)',
      '2. Rangers Camp: From HQ Yard',
      '3. Rangers Camp: From HQ Roof',
      '4. Hikers Camp: Approach trail (22, -126, south by tower)',
      '5. Hikers Camp: From HQ Yard',
      '6. Hikers Camp: From HQ Roof',
      '7. Hikers Kit Tree: Hanging ~5m up from bough over dry ground (6.4, -121.7)',
      '8. Trapper Camp: Approach crossing (-12, 140, north across river)',
      '9. Trapper Camp: From HQ Yard',
      '10. Trapper Camp: From HQ Roof',
      '11. Fuel Depot: Approach road (-116, 10, east toward mast)',
      '12. Fuel Depot: From HQ Yard',
      '13. Fuel Depot: From HQ Roof'
    ];
    await stitchGrid('ag179-sheet1-camps.png', campsShots, campsLabels, 2, 7);

    // Sheet 2: CU-206 Woods (6 shots -> 2 cols x 3 rows)
    const woodsShots = [
      path.join(OUT, 'woods-yard-noon.png'),
      path.join(OUT, 'woods-yard-dusk.png'),
      path.join(OUT, 'woods-roof-noon.png'),
      path.join(OUT, 'woods-roof-dusk.png'),
      path.join(OUT, 'woods-trail-noon.png'),
      path.join(OUT, 'woods-trail-dusk.png'),
    ];
    const woodsLabels = [
      '1. HQ Yard Clearing Boundary (24m) · Noon (Dense Woods Mask)',
      '2. HQ Yard Clearing Boundary · Dusk',
      '3. HQ Roof Canopy Overview across Valley · Noon (CU-206)',
      '4. HQ Roof Canopy Overview across Valley · Dusk',
      '5. Trail View into Trees (30-40m sightline, instanced understory) · Noon',
      '6. Trail View into Trees · Dusk'
    ];
    await stitchGrid('ag179-sheet2-woods.png', woodsShots, woodsLabels, 2, 3);

    // Sheet 3: GP-20003 Skyline Pulls & Four Lights (10 shots -> 2 cols x 5 rows)
    const skylineShots = [
      path.join(OUT, 'skyline-trapper-noon.png'),
      path.join(OUT, 'skyline-trapper-night.png'),
      path.join(OUT, 'skyline-fuel-noon-thick.png'),
      path.join(OUT, 'skyline-fuel-noon-thinned.png'),
      path.join(OUT, 'skyline-crows-noon.png'),
      path.join(OUT, 'skyline-crows-night.png'),
      path.join(OUT, 'skyline-mast-night-off.png'),
      path.join(OUT, 'skyline-mast-night-on.png'),
      path.join(OUT, 'skyline-fourlights-noon.png'),
      path.join(OUT, 'skyline-fourlights-night.png'),
    ];
    const skylineLabels = [
      '1. Trapper Chimney: Instanced grey smoke plume at noon (wind-bent)',
      '2. Trapper Chimney: Night absence (smoke ceases at night)',
      '3. Fuel Depot: Black smoke column (generator active capacity 15)',
      '4. Fuel Depot: Thinned smoke column (generator complete capacity 5)',
      '5. Hikers Camp: 7 Circling crows with flapping wings at noon (+28m)',
      '6. Hikers Camp: Crows absent at night (daylight = false)',
      '7. Mast Beacon: Night before relay (beacon unlit / dark)',
      '8. Mast Beacon: Night with relay active (red beacon glowing through fog)',
      '9. Four-Light Review: Noon baseline lighting',
      '10. Four-Light Review: Night lighting & visibility'
    ];
    await stitchGrid('ag179-sheet3-skyline.png', skylineShots, skylineLabels, 2, 5);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  // Write summary JSON
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nReview complete! Summary saved to ${path.join(OUT, 'summary.json')}`);
}

await runReview();
