import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-90');
fs.mkdirSync(OUT_DIR, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const url = `${server.origin}/index.html?debug=1`;

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

const ADVANCE = `(() => {
  const st = () => TT.getWaveDirectorState();
  const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
  const cap = TT.MAX_ZOMBIES || 48;
  let steps = 0;
  while (steps++ < 250) {
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    if (onLast) {
      if (up() >= cap) break;
      if (pc.left <= 0 && up() > 0) break;
      TT.spawnWaveBatch(0.25);
      continue;
    }
    if (!pc || pc.inLull || up() > 6) TT.clearZombies();
    TT.spawnWaveBatch(0.5);
  }
  const pc = st().pace;
  const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
  const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
  return {
    done: onLast && out,
    day: st().day,
    phase: st().phase,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : null,
    left: pc ? pc.left : null,
    zombies: up()
  };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  await page.evaluate(`TT.applyGraphicsPreset('high')`);
  await startMatch(page);
  const jumped = await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    const ok = !!TT.devJumpToNight(20, true);
    const st = TT.getWaveDirectorState();
    return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
  })()`);
  if (!jumped.ok || jumped.phase !== 'wave') {
    throw new Error('devJumpToNight refused night 20 (' + JSON.stringify(jumped) + ')');
  }
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = await page.evaluate(ADVANCE, 180000);
    console.log(`night ${state.day} push ${state.push == null ? '?' : state.push + 1}/${state.pushes} out ${state.zombies}`);
    if (state.done) break;
  }
  if (!state || !state.done) {
    throw new Error('night 20 never reached its last push with the horde out (' + JSON.stringify(state) + ')');
  }

  // Let the wave settle for 3 seconds just like bench.mjs warmup
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');

  // Record initial transforms on all scene.children & their children, wait 2 seconds, then run full census
  await page.evaluate(`(() => {
    for (const c of TT.scene.children) {
      c.userData.__ag90_pos0 = c.position.toArray();
      c.userData.__ag90_rot0 = [c.rotation.x, c.rotation.y, c.rotation.z];
      c.userData.__ag90_vis0 = c.visible;
      let childSnap = [];
      c.traverse((o) => {
        if (o !== c && childSnap.length < 8) {
          childSnap.push([o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y, o.rotation.z, o.visible]);
        }
      });
      c.userData.__ag90_ch0 = childSnap;
    }
  })()`);

  await page.evaluate('new Promise(r => setTimeout(r, 2000))');

  const report = await page.evaluate(`(() => {
    const sc = TT.scene;
    const zm = new Set((TT.zombies || []).map((z) => z.mesh).filter(Boolean));
    const treeGroups = new Set((TT.trees || []).map((t) => t.group).filter(Boolean));
    const treeStumps = new Set((TT.trees || []).map((t) => t.stumpMesh).filter(Boolean));
    const rockMeshes = new Set((TT.rocks || []).map((r) => r.mesh).filter(Boolean));
    const buildMeshes = new Set((TT.builds || []).map((b) => b.mesh).filter(Boolean));
    const buildBars = new Set((TT.builds || []).map((b) => b.bar).filter(Boolean));
    const corpseMeshes = new Set((TT.corpses || []).map((c) => c.mesh).filter(Boolean));
    const corpsePools = new Set((TT.corpses || []).map((c) => c.pool).filter(Boolean));
    const gibMeshes = new Set((TT.gibPieces || []).map((g) => g.mesh).filter(Boolean));
    const moteActive = new Set((TT.motes || []).map((m) => m.mesh).filter(Boolean));
    const motePooled = new Set((TT.motePool || []).filter(Boolean));
    const rippleActive = new Set((TT.ripples || []).map((r) => r.mesh).filter(Boolean));
    const ripplePooled = new Set((TT.ripplePool || []).filter(Boolean));
    const acidGlobPooled = new Set((TT.acidGlobPool || []).filter(Boolean));
    const acidGlobActive = new Set((TT.acidGlobs || []).map((a) => a.mesh).filter(Boolean));
    const acidPuddlePooled = new Set((TT.acidPuddlePool || []).filter(Boolean));
    const groundFirePooled = new Set((TT.groundFirePool || []).filter(Boolean));
    const groundFireActive = new Set((TT.groundFires || []).map((f) => f.mesh).filter(Boolean));
    const casingActive = new Set((TT.casings || []).map((c) => c.mesh).filter(Boolean));
    const campfireFlames = new Set((TT.campfires || []).map((f) => f.flames).filter(Boolean));
    const campfireLights = new Set((TT.campfires || []).map((f) => f.light).filter(Boolean));
    const campfireBulbs = new Set((TT.campfires || []).map((f) => f.bulb).filter(Boolean));
    const caveGroups = new Set(((TT.POI && TT.POI.caves) || []).map((c) => c.group).filter(Boolean));

    const landmarkMap = new Map();
    for (const lm of (TT.landmarks || [])) {
      if (lm.mesh) landmarkMap.set(lm.mesh, 'landmark:' + lm.kind + (lm.houseStyle ? ':' + lm.houseStyle : '') + (lm.campStyle ? ':' + lm.campStyle : ''));
      if (lm.rubbleMesh) landmarkMap.set(lm.rubbleMesh, 'landmark-rubble:' + lm.kind);
      if (lm.emberMesh) landmarkMap.set(lm.emberMesh, 'landmark-ember:' + lm.kind);
      if (lm.light) landmarkMap.set(lm.light, 'landmark-light:' + lm.kind);
      if (lm.scorch) landmarkMap.set(lm.scorch, 'landmark-scorch:' + lm.kind);
      if (lm.bar) landmarkMap.set(lm.bar, 'landmark-bar:' + lm.kind);
    }

    // Build POI list for nearest-place lookup
    const places = [{ name: 'HQ (0,0)', x: 0, z: 0 }];
    const P = TT.POI || {};
    if (P.houses) P.houses.forEach((h, i) => places.push({ name: 'house#' + i + (h.style ? '(' + h.style + ')' : ''), x: h.x, z: h.z }));
    if (P.campsites) P.campsites.forEach((c, i) => places.push({ name: 'camp#' + i + (c.style ? '(' + c.style + ')' : ''), x: c.x, z: c.z }));
    if (P.caves) P.caves.forEach((c, i) => places.push({ name: 'cave#' + i, x: c.x, z: c.z }));
    if (P.docks) P.docks.forEach((d, i) => places.push({ name: 'dock#' + i, x: d.x, z: d.z }));
    if (P.bridges) P.bridges.forEach((b, i) => places.push({ name: 'bridge#' + i, x: b.x, z: b.z }));
    for (const k of ['graveyard', 'mast', 'watchtower', 'outpost', 'station', 'quarry', 'mill', 'lakeHole', 'shrine', 'bunker']) {
      if (P[k] && typeof P[k].x === 'number') places.push({ name: k, x: P[k].x, z: P[k].z });
    }

    function nearestPlace(x, z) {
      if (x === 0 && z === 0) return 'origin (0,0)';
      let best = null, bestD = Infinity;
      for (const p of places) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < bestD) { bestD = d; best = p.name; }
      }
      return best ? best + ' (' + bestD.toFixed(1) + 'm)' : 'unknown';
    }

    const nameIn = (c) => { let n = ''; c.traverse((o) => { if (!n && o !== c && o.name) n = o.name; }); return n; };

    function hexOf(col) {
      if (!col || typeof col.getHexString !== 'function') return null;
      return '#' + col.getHexString();
    }

    function classifyKnown(c) {
      if (zm.has(c)) return 'TT.zombies[].mesh';
      if (treeGroups.has(c)) {
        const t = TT.trees.find((x) => x.group === c);
        return 'TT.trees[].group' + (t && t._tbInBatch ? ' (batched)' : ' (live)') + (t && t.deadWood ? ' [deadWood]' : '');
      }
      if (treeStumps.has(c)) return 'TT.trees[].stumpMesh';
      if (rockMeshes.has(c)) return 'TT.rocks[].mesh';
      if (landmarkMap.has(c)) return landmarkMap.get(c);
      if ( caveGroups.has(c)) return 'TT.POI.caves[].group';
      if (P.lakeHole === c) return 'TT.POI.lakeHole';
      if (P.mast && P.mast.perch === c) return 'TT.POI.mast.perch';
      if (TT.house && TT.house.group === c) return 'TT.house.group';
      if (TT.house && TT.house.bar === c) return 'TT.house.bar';
      if (TT.KIOSK && TT.KIOSK.group === c) return 'TT.KIOSK.group';
      if (TT.player === c) return 'TT.player';
      if (TT.ground === c) return 'TT.ground';
      if (buildMeshes.has(c)) return 'TT.builds[].mesh';
      if (buildBars.has(c)) return 'TT.builds[].bar';
      if (corpseMeshes.has(c)) return 'TT.corpses[].mesh';
      if (corpsePools.has(c)) return 'TT.corpses[].pool (bloodPoolMesh)';
      if (gibMeshes.has(c)) return 'TT.gibPieces[].mesh';
      if (moteActive.has(c)) return 'TT.motes[].mesh (active)';
      if (motePooled.has(c)) return 'TT.motePool[] (pooled mote)';
      if (rippleActive.has(c)) return 'TT.ripples[].mesh (active)';
      if (ripplePooled.has(c)) return 'TT.ripplePool[] (pooled ripple)';
      if (acidGlobActive.has(c)) return 'TT.acidGlobs[].mesh (active)';
      if (acidGlobPooled.has(c)) return 'TT.acidGlobPool[] (pooled acid glob)';
      if (acidPuddlePooled.has(c)) return 'TT.acidPuddlePool[] (pooled acid puddle)';
      if (groundFireActive.has(c)) return 'TT.groundFires[].mesh (active)';
      if (groundFirePooled.has(c)) return 'TT.groundFirePool[] (pooled ground fire)';
      if (casingActive.has(c)) return 'TT.casings[].mesh (active)';
      if (campfireFlames.has(c)) return 'TT.campfires[].flames';
      if (campfireLights.has(c)) return 'TT.campfires[].light';
      if (campfireBulbs.has(c)) return 'TT.campfires[].bulb';
      return null;
    }

    const items = [];
    for (let idx = 0; idx < sc.children.length; idx++) {
      const c = sc.children[idx];
      const ud = c.userData || {};
      let censusKey = c.name || ud.kind || ud.type || '';
      if (!censusKey) { const inner = nameIn(c); censusKey = c.type + (inner ? '>' + inner : ''); }
      if (zm.has(c)) censusKey = 'zombie (' + censusKey + ')';

      let nodes = 0, auto = 0, meshes = 0, shown = 0, casters = 0, receivers = 0, bones = 0, lights = 0, sprites = 0;
      const geoSigs = [];
      const matSigs = [];
      const childTypes = {};
      const udKeys = Object.keys(ud).filter((k) => !k.startsWith('__ag90_'));

      let moved = false;
      const p0 = ud.__ag90_pos0 || [c.position.x, c.position.y, c.position.z];
      const r0 = ud.__ag90_rot0 || [c.rotation.x, c.rotation.y, c.rotation.z];
      if (Math.hypot(c.position.x - p0[0], c.position.y - p0[1], c.position.z - p0[2]) > 1e-4) moved = true;
      if (Math.hypot(c.rotation.x - r0[0], c.rotation.y - r0[1], c.rotation.z - r0[2]) > 1e-4) moved = true;
      if (ud.__ag90_vis0 !== undefined && c.visible !== ud.__ag90_vis0) moved = true;

      let chIdx = 0;
      const ch0 = ud.__ag90_ch0 || [];
      c.traverse((o) => {
        nodes++;
        childTypes[o.type] = (childTypes[o.type] || 0) + 1;
        if (o.matrixAutoUpdate) auto++;
        if (o.isBone) bones++;
        if (o.isLight) lights++;
        if (o.isSprite) sprites++;
        if (o !== c && chIdx < ch0.length) {
          const s0 = ch0[chIdx++];
          if (Math.hypot(o.position.x - s0[0], o.position.y - s0[1], o.position.z - s0[2]) > 1e-4) moved = true;
          if (Math.hypot(o.rotation.x - s0[3], o.rotation.y - s0[4], o.rotation.z - s0[5]) > 1e-4) moved = true;
        }
        if (o.isMesh || o.isLine || o.isPoints || o.isInstancedMesh) {
          meshes++;
          if (o.visible) shown++;
          if (o.castShadow) casters++;
          if (o.receiveShadow) receivers++;
          const g = o.geometry;
          if (g && geoSigs.length < 6) {
            const verts = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
            const idxCount = g.index ? g.index.count : 0;
            const attrs = g.attributes ? Object.keys(g.attributes).sort().join('+') : '';
            geoSigs.push({
              type: g.type,
              uuid: g.uuid.slice(0, 8),
              verts,
              idxCount,
              attrs,
              instanced: o.isInstancedMesh ? o.count : null
            });
          }
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          if (m && matSigs.length < 6) {
            matSigs.push({
              type: m.type,
              name: m.name || '',
              uuid: m.uuid.slice(0, 8),
              color: hexOf(m.color),
              emissive: hexOf(m.emissive),
              emissiveIntensity: m.emissiveIntensity ?? null,
              roughness: m.roughness ?? null,
              metalness: m.metalness ?? null,
              transparent: !!m.transparent,
              opacity: m.opacity ?? 1,
              vertexColors: !!m.vertexColors,
              hasMap: !!m.map,
              udKeys: Object.keys(m.userData || {})
            });
          }
        }
      });

      const known = classifyKnown(c);
      const safeUd = {};
      for (const k of udKeys) {
        const v = ud[k];
        if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') safeUd[k] = v;
        else if (Array.isArray(v)) safeUd[k] = 'Array(' + v.length + ')';
        else if (v.isObject3D) safeUd[k] = 'Object3D(' + v.type + ')';
        else safeUd[k] = typeof v;
      }

      items.push({
        idx,
        censusKey,
        type: c.type,
        name: c.name || '',
        known,
        visible: c.visible,
        culled: !!(ud._cull && ud._cull.hidden),
        matrixAutoUpdate: c.matrixAutoUpdate,
        frustumCulled: c.frustumCulled,
        renderOrder: c.renderOrder || 0,
        pos: [Number(c.position.x.toFixed(2)), Number(c.position.y.toFixed(2)), Number(c.position.z.toFixed(2))],
        nearest: nearestPlace(c.position.x, c.position.z),
        nodes,
        auto,
        meshes,
        shown,
        casters,
        receivers,
        bones,
        lights,
        sprites,
        moved,
        udKeys,
        safeUd,
        childTypes,
        geoSigs,
        matSigs
      });
    }

    return {
      totalTop: sc.children.length,
      items
    };
  })()`);

  fs.writeFileSync(path.join(OUT_DIR, 'raw-scene-items.json'), JSON.stringify(report, null, 2));
  console.log('Saved raw-scene-items.json with', report.items.length, 'top-level children.');
} finally {
  await browser.close();
  await server.close();
}
