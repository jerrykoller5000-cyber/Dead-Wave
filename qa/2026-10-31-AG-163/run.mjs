import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import { analyze } from './analyze.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OLD_ROOT = 'C:/Users/Zero/Desktop/dw-ag163-82d75118';
const OUT_DIR = path.resolve(REPO_ROOT, 'qa/2026-10-31-AG-163');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'AG163';
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

// Deterministic 48 cohort matching MU-2's Night-20 composition
const SETUP_DETERMINISTIC_48 = `(() => {
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

// Measure zombie types
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

// Full scene walk probe
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

  // 1. Houses
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
  // CL-280 FOB yard batch
  (sc || window.scene).traverse((o) => {
    if (o.name === 'fob-yard-batch') {
      markRoot(o, 'landmarks', 'landmark:fob-batch', 'fob-yard-batch');
    }
  });

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

  // 4. History props
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

  // 5. Trees and foliage
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

  // 7. Player
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
    const ud = top.userData || {};
    const nm = top.name || o.name || '';
    if (ud.rockBatch) return { owner: 'trees and foliage', topName: 'rock-batch', childName: 'rock-batch:' + ud.rockBatch };
    if (ud.treeBatch) return { owner: 'trees and foliage', topName: 'tree-batch', childName: nm || 'tree-batch' };
    if (nm === 'fob-yard-batch') return { owner: 'landmarks', topName: 'landmark:fob-batch', childName: 'fob-yard-batch' };
    if (/^fob-/.test(nm)) return { owner: 'landmarks', topName: 'fob-pads', childName: nm };
    if (/^mast-/.test(nm)) return { owner: 'landmarks', topName: 'landmark:mast', childName: nm };
    if (/zombie-skin/.test(nm) || (top.children && top.children.some((c) => c.name === 'zombie-skin'))) {
      return { owner: 'zombies', topName: 'zombie-pooled-or-other', childName: nm || 'zombie-skin' };
    }
    if (top.children && top.children.some((c) => c.name === 'marine-skin')) {
      return { owner: 'the player and his gun', topName: 'roof-crew', childName: nm || 'roof-crew-member' };
    }
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

  const origAutoReset = r.info ? r.info.autoReset : true;
  if (r.info) {
    r.info.autoReset = false;
    r.info.reset();
  }
  try {
    TT.renderFrame();
  } finally {
    r.renderObject = origRenderObject;
    r.info.update = origInfoUpdate;
    if (r.info) r.info.autoReset = origAutoReset;
  }

  const inf = (r.info && r.info.render) || {};
  let draws = inf.drawCalls != null && inf.drawCalls > 0 ? inf.drawCalls : (inf.calls != null && inf.calls > 0 ? inf.calls : 0);
  let tris = inf.triangles != null && inf.triangles > 0 ? Math.round(inf.triangles) : 0;
  if (!draws && infoEvents.length > 0) {
    draws = infoEvents.length;
    tris = Math.round(infoEvents.reduce((s, e) => s + e.tris, 0));
  }
  const rendererInfoTotals = {
    drawCalls: draws,
    triangles: tris
  };

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
    owners: [...byOwner.values()].map(roundRow),
    children: [...byChild.values()].map(roundRow)
  };
})()`;

// Landmark close-up targets in FOB yard
const FOB_LANDMARKS = [
  { id: 'fob-guard-post', name: 'guard-post', pos: { x: 0.85, z: -12.6 }, view: { dist: 4.5, yaw: 0.3, pitch: 0.25 } },
  { id: 'fob-threshold-sign', name: 'sign-plate', pos: { x: 3.75, z: -12.4 }, view: { dist: 4.0, yaw: 0.1, pitch: 0.2 } },
  { id: 'fob-hesco-sw1', name: 'hesco-sw1', pos: { x: -3.2, z: -12.6 }, view: { dist: 5.0, yaw: -0.2, pitch: 0.3 } },
  { id: 'fob-hesco-sw2', name: 'hesco-sw2', pos: { x: -8.2, z: -9.8 }, view: { dist: 5.0, yaw: -0.4, pitch: 0.3 } },
  { id: 'fob-hesco-w', name: 'hesco-w', pos: { x: -13.6, z: 2.6 }, view: { dist: 5.0, yaw: -1.2, pitch: 0.3 } },
  { id: 'fob-hesco-nw', name: 'hesco-nw', pos: { x: -2.8, z: 12.8 }, view: { dist: 5.0, yaw: 2.8, pitch: 0.3 } },
  { id: 'fob-hesco-ne-breach', name: 'hesco-ne-breach', pos: { x: 5.6, z: 11.8 }, view: { dist: 5.0, yaw: 2.4, pitch: 0.3 } },
  { id: 'fob-hesco-e', name: 'hesco-e', pos: { x: 13.0, z: -1.6 }, view: { dist: 5.0, yaw: 1.5, pitch: 0.3 } },
  { id: 'fob-fuel-drums', name: 'fuel-drums', pos: { x: -4.55, z: 6.65 }, view: { dist: 4.0, yaw: -0.8, pitch: 0.3 } },
  { id: 'fob-armory-crates', name: 'armory-crates', pos: { x: 6.58, z: 0.05 }, view: { dist: 4.0, yaw: 1.2, pitch: 0.3 } },
  { id: 'fob-toppled-floodlight', name: 'toppled-floodlight', pos: { x: 3.2, z: 10.2 }, view: { dist: 4.5, yaw: 2.2, pitch: 0.3 } },
  { id: 'fob-burned-tent', name: 'burned-tent', pos: { x: 9.4, z: -1.2 }, view: { dist: 5.5, yaw: 1.4, pitch: 0.3 } }
];

async function takeLandmarkShot(page, lm, suffix) {
  const code = `(() => {
    const lx = ${lm.pos.x}, lz = ${lm.pos.z};
    const gy = TT.sampleHeight ? TT.sampleHeight(lx, lz) : 0;
    const dist = ${lm.view.dist};
    const yaw = ${lm.view.yaw};
    const pitch = ${lm.view.pitch};
    const cx = lx + Math.sin(yaw) * dist;
    const cz = lz + Math.cos(yaw) * dist;
    const cy = gy + Math.sin(pitch) * dist + 1.2;
    TT.setShotView({ x: cx, y: cy, z: cz, tx: lx, ty: gy + 0.6, tz: lz, fov: 45 });
    return true;
  })()`;
  await page.evaluate(code);
  await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const file = path.join(OUT_DIR, `${lm.name}-${suffix}.png`);
  await page.screenshot(file);
  console.log(`Captured ${file}`);
}

async function runSession(label, rootDir, isNew) {
  console.log(`\n======================================================`);
  console.log(`Starting ${label} at ${rootDir}`);
  console.log(`======================================================`);
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
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    const suffix = isNew ? 'new' : 'old';

    // 1. FOB Yard Overview Day & Night
    console.log(`${label}: Capturing FOB Yard Overview (Day & Night)...`);
    await page.evaluate(`(() => {
      TT.setWorldTime(0.5); // Day / noon
      TT.setShotView(TT.shotHQ());
    })()`);
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await page.screenshot(path.join(OUT_DIR, `fob-day-${suffix}.png`));

    await page.evaluate(`(() => {
      TT.setWorldTime(0.0); // Night / midnight
      TT.setShotView(TT.shotHQ());
    })()`);
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await page.screenshot(path.join(OUT_DIR, `fob-night-${suffix}.png`));

    // Reset to day for landmark close-ups
    await page.evaluate(`TT.setWorldTime(0.5)`);

    // 2. FOB Landmark Close-ups (12 landmarks)
    console.log(`${label}: Capturing 12 FOB Landmark close-ups...`);
    for (const lm of FOB_LANDMARKS) {
      await takeLandmarkShot(page, lm, suffix);
    }

    // 3. Debris Chunks (in flight & landing)
    console.log(`${label}: Capturing Debris Chunks (in flight & landing)...`);
    await page.evaluate(`(() => {
      const P = TT.player.position;
      TT.setShotView({ x: P.x + 2.5, y: P.y + 1.8, z: P.z + 3.2, tx: P.x, ty: P.y + 0.8, tz: P.z, fov: 50 });
      TT.spawnChunks(P.x, P.y + 1.4, P.z, 0x8a2020, 20, 4.5);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 120))');
    await page.screenshot(path.join(OUT_DIR, `debris-flight-${suffix}.png`));

    await page.evaluate('new Promise(r => setTimeout(r, 550))');
    await page.screenshot(path.join(OUT_DIR, `debris-landing-${suffix}.png`));

    if (isNew) {
      // In new build, also capture debris shrinking out
      await page.evaluate(`(() => {
        const P = TT.player.position;
        TT.spawnChunks(P.x, P.y + 1.4, P.z, 0x5a2020, 20, 4.5);
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 1500))');
      await page.screenshot(path.join(OUT_DIR, `debris-shrink-new.png`));
    }

    // 4. Motes (Dust, Splash, Embers)
    console.log(`${label}: Capturing Dust, Splash, and Embers...`);
    // Dust
    await page.evaluate(`(() => {
      const P = TT.player.position;
      TT.setShotView({ x: P.x + 1.8, y: P.y + 1.2, z: P.z + 2.4, tx: P.x, ty: P.y + 0.4, tz: P.z, fov: 45 });
      for (let i = 0; i < 16; i++) {
        TT.spawnMote(P.x + (i - 8) * 0.12, P.y + 0.1, P.z + (i % 3) * 0.1, TT.dustMat, {
          vx: (Math.random() - 0.5) * 0.4, vy: 0.6 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.4,
          grav: 0.6, drag: 1.0, life: 1.5, scale: 1.5
        });
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 100))');
    await page.screenshot(path.join(OUT_DIR, `dust-${suffix}.png`));

    // Splash
    await page.evaluate(`(() => {
      const P = TT.player.position;
      for (let i = 0; i < 16; i++) {
        TT.spawnMote(P.x + (i - 8) * 0.12, P.y + 0.1, P.z + (i % 3) * 0.1, TT.splashMat, {
          vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random() * 1.0, vz: (Math.random() - 0.5) * 0.8,
          grav: 8.0, drag: 0.5, life: 1.0, scale: 1.2
        });
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 80))');
    await page.screenshot(path.join(OUT_DIR, `splash-${suffix}.png`));

    // Embers
    await page.evaluate(`(() => {
      const P = TT.player.position;
      for (let i = 0; i < 20; i++) {
        TT.spawnMote(P.x + (i - 10) * 0.12, P.y + 0.2, P.z + (i % 4) * 0.1, TT.emberMat, {
          vx: (Math.random() - 0.5) * 0.5, vy: 1.2 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.5,
          grav: -0.2, drag: 0.6, life: 1.2, scale: 0.8
        });
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 100))');
    await page.screenshot(path.join(OUT_DIR, `embers-${suffix}.png`));

    // 5. Special New Build Tests: Batch Rebuild on Blast & Fresh Match
    let batchBlastInfo = null;
    let batchFreshInfo = null;
    if (isNew) {
      console.log(`${label}: Testing Batch Rebuild on blast and fresh match...`);
      batchBlastInfo = await page.evaluate(`(() => {
        const fob = TT.landmarks.filter((l) => l.batch);
        const b = fob[0] && fob[0].batch;
        const v0 = b.mesh.geometry.attributes.position.count;
        const h = fob.find((l) => l.kind === 'fence' && l.mesh && l.mesh.name === 'fob-hesco-sw1') || fob.find((l) => l.kind === 'fence');
        const hv = h.batchBody.geometry.attributes.position.count;
        
        // Aim camera at this HESCO
        const pos = h.mesh.position;
        TT.setShotView({ x: pos.x - 3, y: pos.y + 2, z: pos.z + 4, tx: pos.x, ty: pos.y + 0.6, tz: pos.z, fov: 45 });
        
        // Damage landmark to destroy it
        TT.damageLandmark(h, 1e6, true);
        const v1 = b.mesh.geometry.attributes.position.count;
        return { initialVerts: v0, hescoVerts: hv, afterBlastVerts: v1, destroyed: !h.alive };
      })()`);
      console.log(`${label}: Blown HESCO result:`, batchBlastInfo);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(OUT_DIR, 'hesco-broken-blast.png'));

      // Test fresh match rebuild
      batchFreshInfo = await page.evaluate(`(() => {
        if (TT.resetGame) TT.resetGame();
        const fob = TT.landmarks.filter((l) => l.batch);
        const b = fob[0] && fob[0].batch;
        return {
          allAlive: fob.every((l) => l.alive),
          rebuiltVerts: b && b.mesh ? b.mesh.geometry.attributes.position.count : 0
        };
      })()`);
      console.log(`${label}: Fresh match result:`, batchFreshInfo);
      await page.evaluate('new Promise(r => setTimeout(r, 400))');
      await page.evaluate(`(() => {
        TT.setShotView(TT.shotHQ());
      })()`);
      await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      await page.screenshot(path.join(OUT_DIR, 'fob-fresh-match.png'));
      // Restart match after TT.resetGame() so gameStarted is true for devJumpToNight
      await startMatch(page);
      await page.evaluate(`TT.runDevCommand('godmode')`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
    }

    // 6. Run Probe B: Zombie Types, Night 20 Peak Live & Det
    console.log(`${label}: Running Probe B (Zombie Types + Night 20 Scene Walk)...`);
    const zombieTypes = await page.evaluate(MEASURE_ZOMBIE_TYPES, 60000);
    console.log(`${label}: Measured ${Object.keys(zombieTypes).length} zombie types`);

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
    console.log(`${label}: Night 20 push ${state.push + 1}/${state.pushes}, out=${state.zombies}`);
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');

    // Top up to 48 if needed
    await page.evaluate(ADVANCE, 60000);
    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');

    const livePeak = await page.evaluate(WALK_SCENE_PROBE, 60000);
    console.log(`${label} livePeak: renderer.info draws=${livePeak.rendererInfoTotals.drawCalls}, tris=${livePeak.rendererInfoTotals.triangles}, alive=${livePeak.aliveZombies}`);

    await page.evaluate(SETUP_DETERMINISTIC_48, 60000);
    const detPeak = await page.evaluate(WALK_SCENE_PROBE, 60000);
    console.log(`${label} detPeak:  renderer.info draws=${detPeak.rendererInfoTotals.drawCalls}, tris=${detPeak.rendererInfoTotals.triangles}, alive=${detPeak.aliveZombies}`);

    return {
      label,
      rootDir,
      batchBlastInfo,
      batchFreshInfo,
      zombieTypes,
      livePeak,
      detPeak
    };
  } finally {
    await browser.close();
    await server.close();
  }
}

console.log('Starting AG-163 Master QA Run (82d75118 vs HEAD)...');
const oldResult = await runSession('old (82d75118)', OLD_ROOT, false);
const newResult = await runSession('new (HEAD)', REPO_ROOT, true);

const fullData = { old: oldResult, new: newResult };
const jsonPath = path.join(OUT_DIR, 'probe-b.json');
fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf8');
console.log(`Saved full probe data to ${jsonPath}`);

console.log('Running analysis and generating report.md...');
analyze();

try {
  console.log('Generating contact sheet.jpg...');
  execSync('python sheet.py', { cwd: OUT_DIR, stdio: 'inherit' });
} catch (e) {
  console.error('Contact sheet generation failed:', e.message);
}
