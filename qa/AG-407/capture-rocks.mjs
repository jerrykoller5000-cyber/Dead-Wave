import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (node crew/crew.mjs slot run ...)');

const TAG = process.argv[2] || 'before';
const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, 'qa', 'AG-407');
const OUT_DIR = path.join(BASE_DIR, TAG);
fs.mkdirSync(OUT_DIR, { recursive: true });

class RockCapture extends Engine {
  async load() {
    const t0 = Date.now();
    const page = this.page;
    await page.goto(this.server.origin + '/index.html?debug=1', { waitUntil: 'none' });
    if (!await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 60000 })) {
      throw new Error('Opening unavailable: ' + JSON.stringify(page.errors));
    }
    await page.evaluate('window.DWOpening?.dismissForTesting?.()');
    if (!await page.waitFor('!!window.TT && !window.DWOpening?.active', { timeout: 100000 })) {
      throw new Error('Game ready timeout: ' + JSON.stringify(page.errors));
    }
    this.backend = await page.evaluate('TT.getRendererBackend()');
    await page.evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const T = window.TT;
      const n = document.getElementById('playerName'); if (n) n.value = 'AG-407';
      document.getElementById('modeHunt')?.click();
      for (let i = 0; i < 120 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
      for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
      await wait(400);
      try { T.runDevCommand('nodead'); } catch {}
      try { T.runDevCommand('godmode'); } catch {}
      try { T.clearZombies(); } catch {}
      try { if (typeof T.setLandRadius === 'function') T.setLandRadius(250); } catch {}
      return T.getPhase?.();
    })()`, 180000);
    await page.evaluate("import('/tools/camera-rig.js').then(m => { window.CamRig = m.install(); return true; })");
    this.renderer = await page.evaluate('CamRig.renderer()');
    this.mode = 'world';
    this.loadSec = (Date.now() - t0) / 1000;
  }
}

async function resolveRockShots(page) {
  return await page.evaluate(`(() => {
    const T = window.TT;
    const gh = (x, z) => T.sampleHeight(x, z);
    const camPt = (x, z, h, tx, tz, th, fov = 56) => ({
      x: +x.toFixed(2), y: +(gh(x, z) + h).toFixed(2), z: +z.toFixed(2),
      tx: +tx.toFixed(2), ty: +(gh(tx, tz) + th).toFixed(2), tz: +tz.toFixed(2), fov
    });

    const trees = (T.trees || []).filter(t => t && t.alive);
    const rocks = (T.rocks || []).filter(r => r && r.alive && r.mesh && r.mesh.visible && Math.hypot(r.x, r.z) < 200);

    // Pick clear camera angle toward a rock avoiding nearby trees
    function clearCamForRock(r, distMul = 3.2, hLift = 0.85, fov = 54) {
      const dist = Math.max(2.6, Math.min(7.5, (r.radius || 0.8) * distMul + 1.2));
      const lookY = Math.max(0.28, (r.height || 0.9) * 0.46);
      let bestA = 0.7, bestScore = -1e9;
      for (let k = 0; k < 12; k++) {
        const a = k * (Math.PI * 2 / 12) + 0.3;
        const cx = r.x + Math.cos(a) * dist, cz = r.z + Math.sin(a) * dist;
        if (T.waterDepthAt(cx, cz) > 0.15) continue;
        let score = 0;
        // Prefer sun-lit side (south/east bias for noon sun)
        score += Math.cos(a - 0.85) * 1.4;
        // Penalize trees between camera and rock or right next to camera
        for (const tr of trees) {
          const dCam = Math.hypot(tr.x - cx, tr.z - cz);
          if (dCam < 3.5) score -= (3.5 - dCam) * 4.5;
          const mx = (cx + r.x) * 0.5, mz = (cz + r.z) * 0.5;
          const dMid = Math.hypot(tr.x - mx, tr.z - mz);
          if (dMid < 2.6) score -= (2.6 - dMid) * 5.0;
        }
        // Gentle downhill or level vantage reads best
        const slopeDiff = gh(cx, cz) - gh(r.x, r.z);
        if (slopeDiff < -1.8) score -= 2.5;
        if (score > bestScore) { bestScore = score; bestA = a; }
      }
      const cx = r.x + Math.cos(bestA) * dist, cz = r.z + Math.sin(bestA) * dist;
      const camH = Math.max(1.05, lookY + hLift);
      return camPt(cx, cz, camH, r.x, r.z, lookY, fov);
    }

    function pickRock(kind, minS = 0.9, exclude = []) {
      const cand = rocks.filter(r => r.kind === kind && !exclude.includes(r));
      cand.sort((a, b) => {
        const sa = Math.abs(a.s - 1.35) + (a.s < minS ? 2 : 0);
        const sb = Math.abs(b.s - 1.35) + (b.s < minS ? 2 : 0);
        return sa - sb;
      });
      return cand[0] || rocks[0];
    }

    const rErratic = pickRock('erratic', 1.0);
    const rAngular = pickRock('angular', 0.95, [rErratic]);
    const rSlab    = pickRock('slab', 0.95, [rErratic, rAngular]);
    const rSpire   = pickRock('spire', 0.95, [rErratic, rAngular, rSlab]);
    const rCluster = pickRock('cluster', 0.85, [rErratic, rAngular, rSlab, rSpire]);

    // Find a hillside rock field with >=3 rocks close together for multi-rock species/identity shot
    let rField = rErratic;
    let bestNeighbors = -1;
    for (const r of rocks) {
      let n = 0;
      for (const o of rocks) if (o !== r && Math.hypot(o.x - r.x, o.z - r.z) < 16) n++;
      if (n > bestNeighbors) { bestNeighbors = n; rField = r; }
    }

    // Caves: all 6 unique rock themes
    const P = T.POI || {};
    const caves = P.caves || [];
    const caveBy = (th) => caves.find(c => c.theme === th) || caves[0];
    const caveCam = (c, dist = 11.5, lift = 2.6, side = 2.4) => {
      const fx = Math.sin(c.yaw || 0), fz = Math.cos(c.yaw || 0);
      return camPt(c.x + fx * dist + fz * side, c.z + fz * dist - fx * side, lift, c.x + fx * 0.6, c.z + fz * 0.6, 2.3, 60);
    };

    // Riverbank pebbles spot: find a dense pebble bar along streamPebbles
    let pebSpot = { x: 20, z: 75 };
    const pebPts = [];
    T.scene.traverse(o => {
      if (o.isMesh && o.parent && o.parent.userData && o.parent.userData.cullKids && o.parent.children.length > 20) {
        const wp = new T.THREE.Vector3();
        o.getWorldPosition(wp);
        if (Math.hypot(wp.x, wp.z) < 180) pebPts.push({ x: wp.x, z: wp.z });
      }
    });
    if (pebPts.length) {
      let bestP = pebPts[0], bestC = -1;
      for (let i = 0; i < pebPts.length; i += 3) {
        const p = pebPts[i];
        let c = 0;
        for (const q of pebPts) if (Math.hypot(q.x - p.x, q.z - p.z) < 4.5) c++;
        if (c > bestC) { bestC = c; bestP = p; }
      }
      pebSpot = bestP;
    }

    // Lake Pit standing stones & scoured shelf
    const pit = T.LAKE_HOLE || { x: -72, z: -72, r: 9 };
    const pitCam = {
      x: +(pit.x + pit.r + 6.5).toFixed(2),
      y: +((T.LAKE?.level ?? -1.5) + 4.8).toFixed(2),
      z: +(pit.z + pit.r + 5.5).toFixed(2),
      tx: +pit.x.toFixed(2),
      ty: +((T.LAKE?.level ?? -1.5) - 2.4).toFixed(2),
      tz: +pit.z.toFixed(2),
      fov: 58,
    };

    // First People Ring Stone & Standing Stone
    let ringObj = null, standObj = null, churchObj = null;
    T.scene.traverse(o => {
      if (o.name === 'first-ring-stone') ringObj = o;
      if (o.name === 'first-standing-stone' && !standObj) standObj = o;
      if (o.name === 'coldwater-church') churchObj = o;
    });
    const objFrontCam = (obj, dist = 5.2, lift = 1.6, lookH = 1.15) => {
      const wp = new T.THREE.Vector3();
      obj.getWorldPosition(wp);
      const yaw = obj.rotation?.y || 0;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      return camPt(wp.x + fx * dist + fz * 1.4, wp.z + fz * dist - fx * 1.4, lift, wp.x, wp.z, lookH, 54);
    };

    const ringCam = ringObj ? objFrontCam(ringObj, 5.4, 1.8, 1.25) : camPt(80, 80, 2.5, 76, 76, 1.2, 54);
    const standCam = standObj ? objFrontCam(standObj, 4.6, 1.7, 1.35) : camPt(-80, 80, 2.5, -76, 76, 1.2, 54);

    // Hikers camp hearth stones + GP-115 outcrop
    const campHiker = (P.campsites && P.campsites[1]) || { x: 22, z: -126 };
    const campRanger = (P.campsites && P.campsites[0]) || { x: 128, z: 0 };
    const churchPos = (() => {
      if (churchObj) { const wp = new T.THREE.Vector3(); churchObj.getWorldPosition(wp); return { x: wp.x, z: wp.z }; }
      const g = P.graveyard || { x: -80, z: 60 };
      return { x: g.x + 18, z: g.z + 12 };
    })();

    // Radio mast grounding rock & Sato note stone
    const mast = P.mast || { x: -100, z: 80 };
    let mastRockCam = camPt(mast.x + 6.5, mast.z + 7.2, 1.8, mast.x + 1.5, mast.z + 1.5, 0.35, 54);
    const satoNote = T.relayDbg?.note?.()?.group;
    let satoCam = mastRockCam;
    if (satoNote) {
      const wp = new T.THREE.Vector3();
      satoNote.getWorldPosition(wp);
      if (Math.hypot(wp.x, wp.z) > 1) {
        satoCam = camPt(wp.x + 1.15, wp.z + 1.15, 0.92, wp.x, wp.z, 0.08, 52);
      }
    }

    // Iron mine portal timbers & base stones
    const caveIron = caveBy('iron');
    const caveWet = caveBy('wet');
    const caveHill = caveBy('hill');
    const caveRoot = caveBy('root');
    const caveShale = caveBy('shale');
    const caveChalk = caveBy('chalk');

    // Hill cave offerings close-up (cairns, bowl, crown-stone)
    const hillFx = Math.sin(caveHill.yaw || 0), hillFz = Math.cos(caveHill.yaw || 0);
    const hillOffCam = camPt(
      caveHill.x + hillFx * 7.8 + hillFz * 3.8,
      caveHill.z + hillFz * 7.8 - hillFx * 3.8,
      1.85,
      caveHill.x + hillFx * 2.2 + hillFz * 1.4,
      caveHill.z + hillFz * 2.2 - hillFx * 1.4,
      0.55,
      54
    );

    // Chalk Marrow door close-up
    const chFx = Math.sin(caveChalk.yaw || 0), chFz = Math.cos(caveChalk.yaw || 0);
    const marrowCam = camPt(
      caveChalk.x + chFx * 8.2 + chFz * 1.6,
      caveChalk.z + chFz * 8.2 - chFx * 1.6,
      2.3,
      caveChalk.x + chFx * 0.2,
      caveChalk.z + chFz * 0.2,
      2.5,
      58
    );

    return [
      // Sheet 1: Valley rock archetypes, species mix & four lights
      { id: '01-valley-erratic-close', cap: 'Valley Erratic boulder close-up (Noon, 1P scale)', time: 'noon', cam: clearCamForRock(rErratic, 2.9, 0.72, 52) },
      { id: '02-valley-angular-close', cap: 'Valley Angular fractured boulder close-up (Noon)', time: 'noon', cam: clearCamForRock(rAngular, 3.0, 0.72, 52) },
      { id: '03-valley-slab-close',    cap: 'Valley Stratified Slab outcrop close-up (Noon)', time: 'noon', cam: clearCamForRock(rSlab, 3.1, 0.80, 52) },
      { id: '04-valley-spire-close',   cap: 'Valley Spire crag blade close-up (Noon)', time: 'noon', cam: clearCamForRock(rSpire, 3.3, 0.95, 54) },
      { id: '05-valley-cluster-close', cap: 'Valley Rock Cluster close-up (Noon)', time: 'noon', cam: clearCamForRock(rCluster, 3.0, 0.75, 54) },
      { id: '06-valley-rock-field',    cap: 'Hillside rock field: multi-rock identity at 3P scale (Noon)', time: 'noon', cam: clearCamForRock(rField, 6.2, 2.8, 60) },
      { id: '07-valley-rock-dusk',     cap: 'Dusk raking light on Erratic boulder (normal & silhouette test)', time: 'dusk', cam: clearCamForRock(rErratic, 2.9, 0.72, 52) },
      { id: '08-valley-rock-night',    cap: 'Night flashlight readability on Angular boulder', time: 'night', cam: clearCamForRock(rAngular, 3.0, 0.72, 52) },

      // Sheet 2: All 6 Cave rock faces & boulders + River cobbles + Lake Pit
      { id: '09-cave-wet',             cap: 'Wet Grotto cave: dripping dark basalt face & mossy boulders', time: 'noon', cam: caveCam(caveWet, 11.2, 2.5, 2.2) },
      { id: '10-cave-hill-dolmen',     cap: 'Hill Barrow cave: megalithic dolmen & offering cairns/bowl/crown', time: 'noon', cam: hillOffCam },
      { id: '11-cave-root',            cap: 'Root Hollow cave: craggy earth-bound ledges & root-clasped rock', time: 'noon', cam: caveCam(caveRoot, 11.2, 2.6, -2.4) },
      { id: '12-cave-shale',           cap: 'Split Rock cave: foliated slate cleft & bladed scree fan', time: 'noon', cam: caveCam(caveShale, 12.2, 2.8, 2.6) },
      { id: '13-cave-iron',            cap: 'Rust Maw cave: iron-stained ore outcrop & fractured red stones', time: 'noon', cam: caveCam(caveIron, 11.8, 2.6, 2.4) },
      { id: '14-cave-chalk-marrow',    cap: 'Bone Arch / Marrow cave: karst limestone, stalactites & cracked door', time: 'noon', cam: marrowCam },
      { id: '15-river-pebbles-close',  cap: 'Riverbank tumbled cobbles & wet stream-bed stones close-up', time: 'noon', cam: camPt(pebSpot.x + 2.6, pebSpot.z + 2.4, 1.45, pebSpot.x, pebSpot.z, -0.05, 54) },
      { id: '16-lake-pit-stones',      cap: 'Lake Pit rim monoliths & scoured abyssal shelf stones', time: 'noon', cam: pitCam },

      // Sheet 3: First People megaliths, Campfire/Outcrop, Coldwater, Sato/Mast, Rain & Night
      { id: '17-first-ring-stone',     cap: 'First People Ring Stone & kerbstones close-up (Noon)', time: 'noon', cam: ringCam },
      { id: '18-first-standing-stone', cap: 'First People Standing Stone menhir & fallen stone (Noon)', time: 'noon', cam: standCam },
      { id: '19-camp-hearth-stones',   cap: 'Ranger Campfire hearth stone ring close-up (Noon)', time: 'noon', cam: camPt(campRanger.x + 2.5, campRanger.z + 2.4, 1.4, campRanger.x, campRanger.z, 0.15, 52) },
      { id: '20-coldwater-ruins-stone',cap: 'Coldwater church ruin: fieldstone walls, slabs & rubble', time: 'noon', cam: camPt(churchPos.x + 8.5, churchPos.z + 9.2, 3.8, churchPos.x, churchPos.z, 0.7, 58) },
      { id: '21-sato-note-stone',      cap: 'Sato note flat stone & pebble close-up (1P scale)', time: 'noon', cam: satoCam },
      { id: '22-valley-rock-rain',     cap: 'Overcast / Rainstorm (wetness=1.0): Slab rock wet sheen', time: 'noon', storm: true, cam: clearCamForRock(rSlab, 3.1, 0.80, 52) },
      { id: '23-first-ring-night',     cap: 'Night view: First People Ring Stone & glowing runes', time: 'night', cam: ringCam },
      { id: '24-hikers-camp-outcrop',  cap: 'Hikers camp hearth & mossy rock boulders overview (Noon)', time: 'noon', cam: camPt(campHiker.x + 6.2, campHiker.z + 5.8, 3.2, campHiker.x, campHiker.z, 0.35, 58) },
    ];
  })()`);
}

async function benchView(page, name, cam, time = 'noon') {
  await page.evaluate(`(async () => {
    await CamRig.aim({ cam: ${JSON.stringify(cam)}, time: ${JSON.stringify(time)}, ui: false, settle: 260 });
  })()`, 30000);
  return await page.evaluate(`(async () => {
    const T = window.TT;
    const frames = [];
    const N = 120;
    const callsStart = T.renderer.info.render.calls;
    await new Promise((resolve) => {
      let prev = performance.now(), n = 0;
      function step(now) {
        if (n > 0) frames.push(now - prev);
        prev = now;
        n++;
        if (n <= N) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
    const sorted = frames.slice().sort((a, b) => a - b);
    const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
    const median = sorted[sorted.length >> 1];
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    const worst = sorted[sorted.length - 1];
    const hitches = frames.filter(dt => dt > 50).length;
    const info = T.renderer.info;
    return {
      name: ${JSON.stringify(name)},
      frames: frames.length,
      meanMs: +mean.toFixed(2),
      meanFps: +(1000 / mean).toFixed(1),
      medianMs: +median.toFixed(2),
      p99Ms: +p99.toFixed(2),
      p99Fps: +(1000 / p99).toFixed(1),
      worstMs: +worst.toFixed(2),
      hitches,
      callsPerFrame: +((info.render.calls - callsStart) / frames.length).toFixed(1),
      tris: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  })()`, 60000);
}

const cam = new RockCapture({ onscreen: true, size: '1920x1080' });
try {
  await cam.open();
  const page = cam.page;
  console.log(`[AG-407 ${TAG}] Backend=${cam.backend} loadSec=${cam.loadSec.toFixed(2)}`);

  const planPath = path.join(BASE_DIR, 'before', 'shots-plan.json');
  let shots;
  if (TAG !== 'before' && fs.existsSync(planPath)) {
    shots = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    console.log(`  reusing locked BEFORE camera plan (${shots.length} views)`);
  } else {
    shots = await resolveRockShots(page);
    if (TAG === 'before') {
      fs.writeFileSync(planPath, JSON.stringify(shots, null, 2));
    }
  }

  // Steady-state noon perf benchmarks BEFORE triggering storm
  const perfField = await benchView(page, 'valley_rock_field', shots[5].cam, 'noon');
  const perfClose = await benchView(page, 'valley_erratic_close', shots[0].cam, 'noon');
  const perfCave  = await benchView(page, 'cave_shale_mouth', shots[11].cam, 'noon');

  // On AFTER runs, capture the 8 bonus unobstructed DRY NOON close-ups BEFORE triggering rainstorm in shot 22!
  const bonusMeta = [];
  if (TAG !== 'before') {
    const bonusShots = await page.evaluate(`(() => {
      const T = window.TT;
      const gh = (x, z) => T.sampleHeight(x, z);
      const camPt = (x, z, h, tx, tz, th, fov = 52) => ({
        x: +x.toFixed(2), y: +(gh(x, z) + h).toFixed(2), z: +z.toFixed(2),
        tx: +tx.toFixed(2), ty: +(gh(tx, tz) + th).toFixed(2), tz: +tz.toFixed(2), fov
      });
      const trees = (T.trees || []).filter(t => t && t.alive);
      const rocks = (T.rocks || []).filter(r => r && r.alive && r.mesh && r.mesh.visible && Math.hypot(r.x, r.z) < 200);
      function clearCam(tx, tz, rad, lookY, dist, hLift) {
        let bestA = 0.8, bestS = -1e9;
        for (let k = 0; k < 16; k++) {
          const a = k * (Math.PI * 2 / 16) + 0.25;
          const cx = tx + Math.cos(a) * dist, cz = tz + Math.sin(a) * dist;
          if (T.waterDepthAt(cx, cz) > 0.15) continue;
          let sc = Math.cos(a - 0.85) * 1.4;
          for (const tr of trees) {
            const dc = Math.hypot(tr.x - cx, tr.z - cz);
            if (dc < 4.5) sc -= (4.5 - dc) * 5.0;
            const dm = Math.hypot(tr.x - (cx + tx) * 0.5, tr.z - (cz + tz) * 0.5);
            if (dm < 3.0) sc -= (3.0 - dm) * 6.0;
          }
          if (sc > bestS) { bestS = sc; bestA = a; }
        }
        return camPt(tx + Math.cos(bestA) * dist, tz + Math.sin(bestA) * dist, Math.max(0.9, lookY + hLift), tx, tz, lookY, 50);
      }
      const out = [];
      for (const geo of ['granite', 'basalt', 'sandstone', 'limestone', 'schist']) {
        const list = rocks.filter(r => r.geology === geo).sort((a, b) => b.s - a.s);
        const pick = list.find(r => r.s >= 0.9 && r.s <= 1.7) || list[0];
        if (pick) {
          const dist = Math.max(2.4, Math.min(4.8, (pick.radius || 0.8) * 2.7 + 1.0));
          out.push({
            id: '25-geo-' + geo,
            cap: geo.toUpperCase() + ' (' + pick.kind + ' / ' + (pick.subStyle || '') + ', s=' + pick.s.toFixed(2) + ')',
            cam: clearCam(pick.x, pick.z, pick.radius, Math.max(0.3, pick.height * 0.48), dist, 0.55),
          });
        }
      }
      // Clear unobstructed Standing Stone close-up (aim directly at its carved +Z face!)
      let standObj = null;
      T.scene.traverse(o => { if (o.name === 'first-standing-stone' && !standObj) standObj = o; });
      if (standObj) {
        const wp = new T.THREE.Vector3(); standObj.getWorldPosition(wp);
        out.push({ id: '30-standing-stone-clear', cap: 'First People Standing Stone menhir (clear angle, dry Noon)', cam: clearCam(wp.x, wp.z, 1.0, 1.25, 3.8, 0.45) });
      }
      // True open riverbank cobble cluster (away from trees!)
      const cobblePts = [];
      T.scene.traverse(o => {
        if (o.isMesh && o.geometry && o.material && o.material.map && String(o.material.map.name || '').includes('riverCobble')) {
          const wp = new T.THREE.Vector3(); o.getWorldPosition(wp);
          if (Math.hypot(wp.x, wp.z) < 160 && T.waterDepthAt(wp.x, wp.z) < 0.08) {
            let minTr = 999;
            for (const tr of trees) minTr = Math.min(minTr, Math.hypot(tr.x - wp.x, tr.z - wp.z));
            if (minTr > 3.2) cobblePts.push({ x: wp.x, z: wp.z, minTr });
          }
        }
      });
      // Pick the pebble with the highest local neighbor density so we see a whole cobble bar!
      let bestPeb = cobblePts[0] || null, bestCnt = -1;
      for (const a of cobblePts) {
        let cnt = 0;
        for (const b of cobblePts) if (Math.hypot(a.x - b.x, a.z - b.z) < 2.4) cnt++;
        if (cnt > bestCnt) { bestCnt = cnt; bestPeb = a; }
      }
      if (bestPeb) {
        out.push({ id: '31-river-cobbles-true', cap: 'Riverbank sculpted water-tumbled cobbles cluster (dry Noon)', cam: clearCam(bestPeb.x, bestPeb.z, 0.5, 0.05, 1.85, 1.05) });
      }
      // Radio mast grounding bedrock outcrop close-up
      const mast = T.POI && T.POI.mast;
      if (mast) {
        const gx = mast.x - 4.2, gz = mast.z - 2.45;
        out.push({ id: '32-mast-ground-rock', cap: 'Radio Mast grounding bedrock outcrop close-up (dry Noon)', cam: clearCam(gx, gz, 0.8, 0.2, 2.5, 0.9) });
      }
      return out;
    })()`);
    for (const s of bonusShots) {
      const outPath = path.join(OUT_DIR, `${s.id}.png`);
      await page.evaluate(`(async () => {
        await CamRig.aim({ cam: ${JSON.stringify(s.cam)}, time: 'noon', ui: false, settle: 160 });
      })()`, 30000);
      await page.screenshot(outPath);
      const bytes = fs.statSync(outPath).size;
      bonusMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-407/${TAG}/${s.id}.png`, bytes, cam: s.cam });
      console.log(`  bonus ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
    }
  }

  const shotMeta = [];
  for (const s of shots) {
    const outPath = path.join(OUT_DIR, `${s.id}.png`);
    const pre = s.storm
      ? `try { T.runDevCommand('storm'); T.windDbg?.update?.(0.2); } catch {} await wait(350);`
      : s.time === 'night'
        ? `try { if (!T.flashlightOn) T.toggleFlashlightDbg?.(); } catch {} await wait(200);`
        : '';
    await page.evaluate(`(async () => {
      await CamRig.aim({
        cam: ${JSON.stringify(s.cam)},
        time: ${JSON.stringify(s.time || 'noon')},
        ui: false,
        pre: ${JSON.stringify(pre)},
        settle: 160,
      });
    })()`, 30000);
    await page.screenshot(outPath);
    const bytes = fs.statSync(outPath).size;
    shotMeta.push({ id: s.id, cap: s.cap, file: `qa/AG-407/${TAG}/${s.id}.png`, bytes, cam: s.cam });
    console.log(`  shot ${s.id} (${(bytes / 1024).toFixed(0)} KB)`);
  }

  const rockStats = await page.evaluate(`(() => {
    const T = window.TT;
    const rocks = T.rocks || [];
    const byKind = {}, byGeo = {};
    let totalTris = 0;
    for (const r of rocks) {
      byKind[r.kind || 'unknown'] = (byKind[r.kind || 'unknown'] || 0) + 1;
      const gName = r.geology || r.stoneName || 'generic';
      byGeo[gName] = (byGeo[gName] || 0) + 1;
      const p = r.mesh?.geometry?.attributes?.position;
      if (p) totalTris += (r.mesh.geometry.index ? r.mesh.geometry.index.count : p.count) / 3;
    }
    let batchMeshes = 0, batchTris = 0;
    T.scene.traverse(o => {
      if (o.isMesh && o.name === 'rock-batch') {
        batchMeshes++;
        const p = o.geometry?.attributes?.position;
        if (p) batchTris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
      }
    });
    return {
      rockCount: rocks.length,
      byKind,
      byGeo,
      totalRockTris: Math.round(totalTris),
      batchMeshes,
      batchTris: Math.round(batchTris),
      memTextures: T.renderer?.info?.memory?.textures || 0,
      memGeos: T.renderer?.info?.memory?.geometries || 0,
    };
  })()`);

  const metrics = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    backend: cam.backend,
    renderer: cam.renderer,
    loadSec: +cam.loadSec.toFixed(2),
    pageErrors: page.errors,
    rockStats,
    perf: { field: perfField, close: perfClose, cave: perfCave },
    shots: shotMeta,
    bonusShots: bonusMeta,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    tag: TAG, backend: cam.backend, loadSec: metrics.loadSec, pageErrors: page.errors.length,
    rockStats, perf: metrics.perf,
  }, null, 2));

  execFileSync('python', ['qa/AG-407/make-sheets.py', TAG], { cwd: ROOT, stdio: 'inherit' });
} finally {
  await cam.close();
}
