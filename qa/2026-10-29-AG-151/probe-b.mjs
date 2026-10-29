import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OLD_ROOT = 'C:/Users/Zero/Desktop/dw-ag151-82d75118';
const OUT_DIR = path.resolve(REPO_ROOT, 'qa/2026-10-29-AG-151');
fs.mkdirSync(OUT_DIR, { recursive: true });

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
    zombies: up(),
    spawned: st().waveSpawned,
    total: st().waveTotal
  };
})()`;

// Measure one of each Night-20 zombie type (plus colossus/guardian/caveguard).
const MEASURE_ZOMBIE_TYPES = `(() => {
  const types = [
    'shambler', 'feral', 'military', 'leaper', 'brute',
    'spider', 'drowned', 'bomber', 'spitter', 'demon', 'screamer',
    'colossus', 'guardian', 'caveguard'
  ];
  const triOf = (geo) => {
    if (!geo) return 0;
    if (geo.index) return geo.index.count / 3;
    const pos = geo.attributes && geo.attributes.position;
    return pos ? pos.count / 3 : 0;
  };
  const px = TT.player.position.x, pz = TT.player.position.z;
  const results = {};
  TT.clearZombies();
  for (const tk of types) {
    if (!TT.ZOMBIE_TYPES || !TT.ZOMBIE_TYPES[tk]) continue;
    const z = TT.spawnZombie(px, pz + 8, tk);
    if (!z || !z.mesh) continue;
    const root = z.mesh;
    let drawnMeshes = 0, drawnTris = 0;
    let skinSrcMeshes = 0, skinSrcTris = 0;
    let totalMeshes = 0, totalTris = 0;
    const drawnParts = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const t = triOf(o.geometry) * (o.isInstancedMesh ? o.count : 1);
      totalMeshes++;
      totalTris += t;
      let vis = true;
      for (let p = o; p && p !== root.parent; p = p.parent) {
        if (!p.visible) { vis = false; break; }
      }
      if (vis) {
        drawnMeshes++;
        drawnTris += t;
        drawnParts.push({
          name: o.name || (o.isSkinnedMesh ? 'SkinnedMesh' : 'Mesh'),
          skinned: !!o.isSkinnedMesh,
          tris: t
        });
      }
      if (o.userData && o.userData.skinSrc) {
        skinSrcMeshes++;
        skinSrcTris += t;
      } else if (vis && !(o.userData && o.userData.zombieSkin)) {
        skinSrcMeshes++;
        skinSrcTris += t;
      }
    });
    results[tk] = {
      drawnMeshes,
      drawnTris: Math.round(drawnTris),
      skinSrcMeshes,
      skinSrcTris: Math.round(skinSrcTris),
      totalMeshes,
      totalTris: Math.round(totalTris),
      drawnParts
    };
    TT.clearZombies();
  }
  return results;
})()`;

// Walk the scene at Night 20 peak and hook renderer.info.update + renderer.renderObject for 1 exact frame.
const WALK_SCENE_PROBE = `(() => {
  const THREE = TT.THREE;
  const sc = TT.scene;
  const cam = TT.camera;
  const r = TT.renderer;

  const triOf = (o) => {
    const geo = o && o.geometry;
    if (!geo) return 0;
    const base = geo.index ? geo.index.count / 3 : (geo.attributes && geo.attributes.position ? geo.attributes.position.count / 3 : 0);
    const inst = o.isInstancedMesh ? (o.count != null ? o.count : 1) : 1;
    return base * inst;
  };

  // Build lookup tables from root/child objects to owner and named child one level down.
  const rootMap = new Map();
  const markRoot = (obj, owner, topName, childHint) => {
    if (!obj || typeof obj !== 'object') return;
    let top = obj;
    while (top.parent && top.parent !== sc) top = top.parent;
    if (!rootMap.has(top)) {
      rootMap.set(top, { owner, topName: topName || top.name || top.type, subMap: new Map(), defaultChild: childHint || topName || top.name || top.type });
    }
    if (obj !== top && childHint) {
      rootMap.get(top).subMap.set(obj, childHint);
    }
  };

  // 1. Houses (HQ house)
  if (TT.house && TT.house.group) {
    markRoot(TT.house.group, 'houses', 'house (HQ)', 'house-main');
    for (const c of TT.house.group.children) {
      markRoot(c, 'houses', 'house (HQ)', c.name || c.userData?.kind || c.type);
    }
  }

  // 2. Landmarks
  for (const lm of (TT.landmarks || [])) {
    const kind = lm.kind || 'landmark';
    if (lm.mesh) markRoot(lm.mesh, 'landmarks', 'landmark:' + kind, kind);
    if (lm.emberMesh) markRoot(lm.emberMesh, 'landmarks', 'landmark:' + kind, kind + '-ember');
    if (lm.bar) markRoot(lm.bar, 'landmarks', 'landmark:' + kind, kind + '-bar');
  }
  if (TT.POI) {
    for (const d of (TT.POI.docks || [])) if (d.mesh) markRoot(d.mesh, 'landmarks', 'landmark:dock', 'dock');
    for (const b of (TT.POI.bridges || [])) if (b.mesh) markRoot(b.mesh, 'landmarks', 'landmark:bridge', 'bridge');
    for (const w of (TT.POI.wrecks || [])) if (w.mesh) markRoot(w.mesh, 'landmarks', 'landmark:wreck', w.mesh.userData?.landmarkTheme || 'wreck');
    if (TT.POI.mast) {
      if (TT.POI.mast.mesh) markRoot(TT.POI.mast.mesh, 'landmarks', 'landmark:mast', 'mast');
      if (TT.POI.mast.perch) markRoot(TT.POI.mast.perch, 'landmarks', 'landmark:mast', 'mast-perch');
      if (TT.POI.mast.skeleton) markRoot(TT.POI.mast.skeleton, 'landmarks', 'landmark:mast', 'mast-skeleton');
    }
  }
  for (const d of (TT.getMapDrums ? TT.getMapDrums() : [])) {
    if (d.mesh) markRoot(d.mesh, 'landmarks', 'landmark:drum', 'explosive-drum');
  }

  // 3. Buildables and turrets + Wire
  if (TT.KIOSK && TT.KIOSK.group) {
    markRoot(TT.KIOSK.group, 'buildables and turrets', 'kiosk', 'kiosk');
  }
  for (const b of (TT.builds || [])) {
    const isWire = b.type === 'wire' || b.kind === 'wire';
    const owner = isWire ? 'wire' : 'buildables and turrets';
    const bName = b.type || b.kind || 'build';
    if (b.group) markRoot(b.group, owner, bName, bName);
    if (b.mesh) markRoot(b.mesh, owner, bName, bName);
    if (b.barGroup) markRoot(b.barGroup, owner, bName, bName + '-bar');
  }

  // 4. History props & Objective props
  if (TT.historyProps && TT.historyProps.group) {
    const hg = TT.historyProps.group;
    markRoot(hg, 'history props', 'history-props', 'history-prop');
    const partNames = new Map();
    if (TT.historyProps.parts) {
      for (const [k, v] of Object.entries(TT.historyProps.parts)) {
        if (v) partNames.set(v, k);
      }
    }
    for (const c of hg.children) {
      const cname = partNames.get(c) || c.name || c.userData?.id || c.userData?.kind || 'unnamed-history-prop';
      markRoot(c, 'history props', 'history-props', cname);
    }
  }
  const objProps = TT.getObjectiveProps ? TT.getObjectiveProps() : null;
  if (objProps && objProps.group) {
    markRoot(objProps.group, 'history props', 'objective-props', 'objective-prop');
    if (objProps.props) {
      for (const [siteKey, prop] of Object.entries(objProps.props)) {
        if (prop && prop.group) markRoot(prop.group, 'history props', 'objective-props', 'site:' + siteKey);
      }
    }
  }
  if (TT.relayDbg) {
    const v = TT.relayDbg.vault && TT.relayDbg.vault();
    if (v && v.group) markRoot(v.group, 'history props', 'relay-vault', 'radio-locker');
    const n = TT.relayDbg.note && TT.relayDbg.note();
    if (n && n.group) markRoot(n.group, 'history props', 'relay-note', 'sato-note');
  }
  if (TT.rabbitDbg) {
    const rb = TT.rabbitDbg.state && TT.rabbitDbg.state();
    if (rb) {
      if (rb.mound) markRoot(rb.mound, 'history props', 'rabbit-mound', 'mound');
      if (rb.reliquary) markRoot(rb.reliquary, 'history props', 'rabbit-mound', 'reliquary');
      if (rb.rabbit) markRoot(rb.rabbit, 'history props', 'rabbit-mound', 'killer-rabbit');
    }
  }

  // 5. Trees and foliage (+ rocks, ground and water)
  const tb = TT.getTreeBatches ? TT.getTreeBatches() : null;
  if (tb && tb.cells) {
    for (const [key, cell] of tb.cells.entries()) {
      if (cell.wood && cell.wood.mesh) markRoot(cell.wood.mesh, 'trees and foliage', 'tree-batch', 'tree-batch-wood');
      if (cell.leaf && cell.leaf.mesh) markRoot(cell.leaf.mesh, 'trees and foliage', 'tree-batch', 'tree-batch-leaf');
    }
  }
  for (const t of (TT.trees || [])) {
    if (t.group) markRoot(t.group, 'trees and foliage', 'tree-individual', 'tree');
  }
  for (const fc of (TT.foliageChunks || [])) {
    markRoot(fc, 'trees and foliage', 'foliage-chunks', fc.name || 'foliage-chunk');
  }
  if (TT.windDbg && TT.windDbg.mesh) {
    markRoot(TT.windDbg.mesh, 'trees and foliage', 'gale-leaves', 'gale-leaves');
  }
  for (const rk of (TT.rocks || [])) {
    if (rk.mesh) markRoot(rk.mesh, 'trees and foliage', 'rocks', 'rock-individual');
  }
  if (TT.ground) markRoot(TT.ground, 'ground and water', 'ground', 'ground');
  if (TT.streamGroup) markRoot(TT.streamGroup, 'ground and water', 'streamGroup', 'river-and-stream');
  for (const pud of (TT.getPuddles ? TT.getPuddles() : [])) {
    if (pud.mesh) markRoot(pud.mesh, 'ground and water', 'puddles', 'puddle');
  }

  // 6. Zombies
  for (const z of (TT.zombies || [])) {
    if (z.mesh) markRoot(z.mesh, 'zombies', 'zombie:' + z.typeKey, z.typeKey);
  }
  for (const c of (TT.corpses || [])) {
    if (c.mesh) markRoot(c.mesh, 'zombies', 'corpse', 'corpse-body');
    if (c.pool) markRoot(c.pool, 'zombies', 'corpse', 'corpse-pool');
  }
  for (const g of (TT.gibPieces || [])) {
    if (g.mesh) markRoot(g.mesh, 'zombies', 'gibs', 'gib-piece');
  }

  // 7. The player and his gun (+ roof crew & survivors)
  if (TT.player) {
    markRoot(TT.player, 'the player and his gun', 'player', 'player-root');
    if (TT.marine) markRoot(TT.marine, 'the player and his gun', 'player', 'marine');
    if (TT.weaponMeshes) {
      for (const [wk, wm] of Object.entries(TT.weaponMeshes)) {
        if (wm) markRoot(wm, 'the player and his gun', 'player', 'weapon:' + wk);
      }
    }
    if (TT.offhandMeshes) {
      for (const [wk, wm] of Object.entries(TT.offhandMeshes)) {
        if (wm) markRoot(wm, 'the player and his gun', 'player', 'offhand:' + wk);
      }
    }
    if (TT.knife) markRoot(TT.knife, 'the player and his gun', 'player', 'knife');
    const ms = TT.marineShadowDbg && TT.marineShadowDbg();
    if (ms && ms.proxy) markRoot(ms.proxy, 'the player and his gun', 'player', 'marine-shadow-proxy');
  }
  for (const surv of (TT.getSurvivors ? TT.getSurvivors() : [])) {
    if (surv.mesh) markRoot(surv.mesh, 'the player and his gun', 'survivors', 'survivor:' + (surv.who || surv.id || 'npc'));
  }

  // Classify any Object3D in scene
  const classifyObject = (o) => {
    let top = o;
    const chain = [o];
    while (top.parent && top.parent !== sc) {
      top = top.parent;
      chain.unshift(top);
    }
    const info = rootMap.get(top);
    if (info) {
      for (let i = chain.length - 1; i >= 1; i--) {
        if (info.subMap.has(chain[i])) {
          return { owner: info.owner, topName: info.topName, childName: info.subMap.get(chain[i]) };
        }
      }
      const oneDown = chain[1];
      const cName = (oneDown && oneDown.name) || o.name || info.defaultChild;
      return { owner: info.owner, topName: info.topName, childName: cName };
    }
    // Heuristic fallback for top-level scene children not in explicit arrays
    const ud = top.userData || {};
    const nm = top.name || o.name || '';
    if (ud.rockBatch) return { owner: 'trees and foliage', topName: 'rock-batch', childName: 'rock-batch:' + ud.rockBatch };
    if (ud.treeBatch) return { owner: 'trees and foliage', topName: 'tree-batch', childName: nm || 'tree-batch' };
    if (/^fob-/.test(nm)) return { owner: 'landmarks', topName: 'fob-pads', childName: nm };
    if (/^mast-/.test(nm)) return { owner: 'landmarks', topName: 'landmark:mast', childName: nm };
    if (/zombie-skin/.test(nm) || (top.children && top.children.some((c) => c.name === 'zombie-skin'))) {
      return { owner: 'zombies', topName: 'zombie-pooled-or-other', childName: nm || 'zombie-skin' };
    }
    if (top.children && top.children.some((c) => c.name === 'marine-skin')) {
      return { owner: 'the player and his gun', topName: 'roof-crew', childName: nm || 'roof-crew-member' };
    }
    // Check if it is ground sectors, boundary wall, cave mouths, sky, or effects
    const geoType = o.geometry ? o.geometry.type : '';
    const matType = o.material ? (Array.isArray(o.material) ? o.material[0].type : o.material.type) : '';
    if (top.isInstancedMesh) {
      return { owner: 'effects', topName: 'instanced:' + (nm || geoType), childName: nm || geoType };
    }
    const tris = triOf(o);
    if (tris > 8000 && top.position.x === 0 && top.position.z === 0) {
      return { owner: 'landmarks', topName: 'boundary-wall-or-terrain', childName: nm || geoType + '(' + Math.round(tris) + 't)' };
    }
    return {
      owner: 'effects',
      topName: nm || top.type,
      childName: (chain[1] && chain[1].name) || o.name || (geoType + ':' + matType)
    };
  };

  // Run one clean renderFrame while hooking renderer.renderObject and renderer.info.update
  const origRenderObject = r.renderObject;
  const origInfoUpdate = r.info.update;
  let activePass = 'other';
  const mainDrawnSet = new Set();
  const shadowDrawnSet = new Set();
  const infoEvents = [];

  r.renderObject = function (object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId) {
    const prevPass = activePass;
    if (camera === cam) activePass = 'main';
    else if (camera && camera.isOrthographicCamera) activePass = 'shadow';
    else activePass = 'post';
    if (activePass === 'main') mainDrawnSet.add(object);
    else if (activePass === 'shadow') shadowDrawnSet.add(object);
    try {
      return origRenderObject.call(this, object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId);
    } finally {
      activePass = prevPass;
    }
  };

  r.info.update = function (object, count, instanceCount) {
    const tris = (object.isMesh || object.isSprite) ? instanceCount * (count / 3) : 0;
    infoEvents.push({ pass: activePass, object, draws: 1, tris });
    return origInfoUpdate.call(this, object, count, instanceCount);
  };

  try {
    TT.renderFrame();
  } finally {
    r.renderObject = origRenderObject;
    r.info.update = origInfoUpdate;
  }

  const rendererInfoTotals = {
    drawCalls: r.info.render.drawCalls,
    triangles: Math.round(r.info.render.triangles)
  };

  // Build camera frustum for direct scene walk check
  cam.updateMatrixWorld();
  const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projScreenMatrix);

  const byOwner = new Map();
  const byChild = new Map();

  const ensureBucket = (map, key, extra = {}) => {
    if (!map.has(key)) {
      map.set(key, {
        key,
        ...extra,
        frustumDraws: 0,
        frustumTris: 0,
        mainPassDraws: 0,
        mainPassTris: 0,
        shadowPassDraws: 0,
        shadowPassTris: 0,
        visibleSceneMeshes: 0,
        visibleSceneTris: 0,
        totalSceneMeshes: 0,
        totalSceneTris: 0
      });
    }
    return map.get(key);
  };

  // Walk TT.scene
  for (const top of sc.children) {
    top.traverse((o) => {
      if (!o.isMesh) return;
      const cls = classifyObject(o);
      const t = triOf(o);
      const ob = ensureBucket(byOwner, cls.owner, { owner: cls.owner });
      const ck = cls.owner + ' / ' + cls.topName + (cls.childName && cls.childName !== cls.topName ? ' -> ' + cls.childName : '');
      const cb = ensureBucket(byChild, ck, { owner: cls.owner, topName: cls.topName, childName: cls.childName });

      ob.totalSceneMeshes++;
      ob.totalSceneTris += t;
      cb.totalSceneMeshes++;
      cb.totalSceneTris += t;

      let vis = true;
      for (let p = o; p && p !== sc; p = p.parent) {
        if (!p.visible) { vis = false; break; }
      }
      if (!vis) return;

      ob.visibleSceneMeshes++;
      ob.visibleSceneTris += t;
      cb.visibleSceneMeshes++;
      cb.visibleSceneTris += t;

      let inFrustum = true;
      if (o.frustumCulled !== false) {
        try {
          if (o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          inFrustum = frustum.intersectsObject(o);
        } catch (_) {
          inFrustum = true;
        }
      }
      if (inFrustum) {
        ob.frustumDraws++;
        ob.frustumTris += t;
        cb.frustumDraws++;
        cb.frustumTris += t;
      }
    });
  }

  // Also attribute every info.update event to its owner & child bucket
  let postDraws = 0, postTris = 0;
  for (const ev of infoEvents) {
    let inScene = false;
    for (let p = ev.object; p; p = p.parent) {
      if (p === sc) { inScene = true; break; }
    }
    if (!inScene) {
      postDraws += ev.draws;
      postTris += ev.tris;
      continue;
    }
    const cls = classifyObject(ev.object);
    const ob = ensureBucket(byOwner, cls.owner, { owner: cls.owner });
    const ck = cls.owner + ' / ' + cls.topName + (cls.childName && cls.childName !== cls.topName ? ' -> ' + cls.childName : '');
    const cb = ensureBucket(byChild, ck, { owner: cls.owner, topName: cls.topName, childName: cls.childName });
    if (ev.pass === 'main') {
      ob.mainPassDraws += ev.draws;
      ob.mainPassTris += ev.tris;
      cb.mainPassDraws += ev.draws;
      cb.mainPassTris += ev.tris;
    } else if (ev.pass === 'shadow') {
      ob.shadowPassDraws += ev.draws;
      ob.shadowPassTris += ev.tris;
      cb.shadowPassDraws += ev.draws;
      cb.shadowPassTris += ev.tris;
    }
  }

  // Count active zombies by type and how many of each type are in-frustum
  const zombieBreakdown = {};
  for (const z of (TT.zombies || [])) {
    if (!z.alive || z.dying) continue;
    const tk = z.typeKey || 'unknown';
    if (!zombieBreakdown[tk]) zombieBreakdown[tk] = { alive: 0, inFrustum: 0, mainPassDrawn: 0, trisInFrustum: 0 };
    zombieBreakdown[tk].alive++;
    let drewMain = false;
    let zTris = 0;
    if (z.mesh) {
      z.mesh.traverse((o) => {
        if (mainDrawnSet.has(o)) {
          drewMain = true;
          zTris += triOf(o);
        }
      });
    }
    if (drewMain) {
      zombieBreakdown[tk].inFrustum++;
      zombieBreakdown[tk].mainPassDrawn++;
      zombieBreakdown[tk].trisInFrustum += Math.round(zTris);
    }
  }

  const roundRow = (r) => ({
    ...r,
    frustumTris: Math.round(r.frustumTris),
    mainPassTris: Math.round(r.mainPassTris),
    shadowPassTris: Math.round(r.shadowPassTris),
    visibleSceneTris: Math.round(r.visibleSceneTris),
    totalSceneTris: Math.round(r.totalSceneTris)
  });

  return {
    rendererInfoTotals,
    postPass: { draws: postDraws, tris: Math.round(postTris) },
    aliveZombies: (TT.zombies || []).filter((z) => z.alive && !z.dying).length,
    zombieBreakdown,
    owners: [...byOwner.values()].map(roundRow),
    children: [...byChild.values()].map(roundRow)
  };
})()`;

// Also create a deterministic 48-zombie Night-20 cohort in the camera frustum so random wave spawn/wander differences
// can be separated from true geometry changes.
const SETUP_DETERMINISTIC_48 = `(() => {
  // Night 20 fixed representative 48-zombie cohort matching MU-2's Night-20 composition
  const cohort = [
    ['shambler', 9],
    ['feral', 6],
    ['military', 5],
    ['leaper', 5],
    ['brute', 4],
    ['spider', 4],
    ['drowned', 4],
    ['bomber', 3],
    ['spitter', 3],
    ['demon', 3],
    ['screamer', 2]
  ];
  TT.clearZombies();
  if (TT.clearCorpses) TT.clearCorpses();
  const px = TT.player.position.x, pz = TT.player.position.z;
  let idx = 0;
  for (const [tk, count] of cohort) {
    for (let i = 0; i < count; i++) {
      const col = (idx % 8) - 3.5;
      const row = Math.floor(idx / 8);
      const x = px + col * 1.8;
      const z = pz - 4.0 - row * 2.2;
      const zb = TT.spawnZombie(x, z, tk);
      if (zb) {
        zb.riseT = 0;
        zb.hp = 999999;
        if (zb.mesh) {
          zb.mesh.position.set(x, TT.sampleHeight(x, z), z);
          zb.mesh.visible = true;
        }
      }
      idx++;
    }
  }
  return idx;
})()`;

async function runBuild(label, rootDir) {
  console.log(`\n=== Running probe-b on ${label} (${rootDir}) ===`);
  const server = await serve(rootDir, 0);
  const browser = await launch({ headless: false, args: ['--enable-precise-memory-info'] });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    const url = `${server.origin}/index.html?debug=1`;
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    const applied = await page.evaluate(`(() => {
      TT.applyGraphicsPreset('high');
      return TT.getGfx();
    })()`);
    console.log(`${label}: graphics preset = ${applied}`);

    await startMatch(page);
    await page.evaluate(`TT.runDevCommand('godmode')`);

    // 1. Measure one of each Night-20 zombie type
    const zombieTypes = await page.evaluate(MEASURE_ZOMBIE_TYPES, 60000);
    console.log(`${label}: measured ${Object.keys(zombieTypes).length} zombie types`);

    // 2. Jump to Night 20 and advance to peak (push 6/6, 48 zombies)
    const jumped = await page.evaluate(`(() => {
      const ok = !!TT.devJumpToNight(20, true);
      const st = TT.getWaveDirectorState();
      return { ok, phase: st.phase, day: st.day };
    })()`);
    if (!jumped.ok) throw new Error(`${label}: devJumpToNight(20, true) failed`);

    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      if (state.done) break;
    }
    console.log(`${label}: night 20 push ${state.push + 1}/${state.pushes}, out=${state.zombies}`);
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');

    // Top up to 48 if roof crew killed 1-2 during the 3s sky settle
    await page.evaluate(ADVANCE, 60000);
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');

    // Capture live Night-20 peak scene walk
    const livePeak = await page.evaluate(WALK_SCENE_PROBE, 60000);
    console.log(`${label} livePeak: renderer.info draws=${livePeak.rendererInfoTotals.drawCalls}, tris=${livePeak.rendererInfoTotals.triangles}, alive=${livePeak.aliveZombies}`);

    // Capture deterministic 48-zombie Night-20 peak scene walk (same camera, fixed 48 cohort in frustum)
    await page.evaluate(SETUP_DETERMINISTIC_48, 60000);
    const detPeak = await page.evaluate(WALK_SCENE_PROBE, 60000);
    console.log(`${label} detPeak:  renderer.info draws=${detPeak.rendererInfoTotals.drawCalls}, tris=${detPeak.rendererInfoTotals.triangles}, alive=${detPeak.aliveZombies}`);

    return { label, rootDir, zombieTypes, livePeak, detPeak };
  } finally {
    await browser.close();
    await server.close();
  }
}

const oldRes = await runBuild('old (82d75118)', OLD_ROOT);
const newRes = await runBuild('new (HEAD)', REPO_ROOT);

const outFile = path.join(OUT_DIR, 'probe-b.json');
fs.writeFileSync(outFile, JSON.stringify({ old: oldRes, new: newRes }, null, 2), 'utf8');
console.log(`\nSaved raw probe output to ${outFile}`);
