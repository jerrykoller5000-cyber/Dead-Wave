// studio/inspector/subjects.js — a catalog entry, on the stage (CL-196). Claude's (studio/*).
//
// Three kinds:
//   marine  the player himself, in the Training Ground, run by the game (kit and moves in marine.js)
//   zombie  a zombie the game spawns and runs (its own AI, gait and abilities, the marine as its target), or the
//           same body as a statue (makeZombieMesh at rest, out of the game's list so nothing moves it)
//   model   anything else: an Object3D from its builder, standing at the stage's centre, with its own motion if it
//           has one in the game (entry.tick)
//
// A subject answers: focus() (what the camera frames: centre, size, facing), rig() (what the rewind records and the
// overlays measure), origin() (its own origin, for the axes), joints() (named joints, for the dots), update(dt, t)
// (its own motion), info() and dispose().

import { updateZombieAbilityVisuals } from '../../game/zombie-ability-visuals.js';

const ZJOINTS = ['hips', 'torso', 'head', 'armLG', 'armRG', 'legLG', 'legRG'];
const MJOINTS = ['hip', 'lowerBody', 'torsoG', 'headG', 'armLG', 'armRG', 'elbowLG', 'elbowRG', 'gripL', 'gripR', 'legLG', 'legRG', 'kneeLG', 'kneeRG', 'ankleLG', 'ankleRG', 'weaponMount'];

// Builders can borrow the game's cached gun geometry, kit materials and textures. Only release resources that
// were introduced by this subject, and that no remaining game/subject root uses. Removing an Object3D alone does
// not release its GPU allocations. Live zombies return to the game's pool and are deliberately outside this scope.
function resources(value, out = new Set(), seen = new Set(), depth = 0) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (value.isTexture || value.isBufferGeometry || value.isMaterial) {
    out.add(value);
    if (value.isMaterial) for (const k of Object.keys(value)) {
      const v = value[k];
      if (v && (v.isTexture || v.isTextureNode)) resources(v.isTextureNode ? v.value : v, out, seen);
      if (k === 'uniforms' && v) for (const u of Object.values(v)) resources(u && u.value, out, seen);
    }
    return out;
  }
  if (value.isObject3D) {
    value.traverse((o) => {
      resources(o.geometry, out, seen); resources(o.material, out, seen);
      if (o.skeleton) resources(o.skeleton.boneTexture, out, seen);
    });
    return out;
  }
  if (depth >= 4) return out;
  if (Array.isArray(value)) for (const v of value) resources(v, out, seen, depth + 1);
  else if (value instanceof Map || value instanceof Set) for (const v of value.values()) resources(v, out, seen, depth + 1);
  else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    for (const d of Object.values(Object.getOwnPropertyDescriptors(value))) if ('value' in d) resources(d.value, out, seen, depth + 1);
  return out;
}
export function subjectResources(ix) {
  // TT.weaponMeshes and detached carried/kit roots may not currently belong to scene. Plain data containers are
  // searched too; renderer internals and functions (including opaque builder caches) are never traversed.
  let weaponKit = null;
  // This existing host getter returns the game's cached weapon materials (including finishes not currently
  // attached to any gun). It constructs no model and allocates no GPU resource.
  try { if (ix.host.builders && ix.host.builders.weaponContext) weaponKit = ix.host.builders.weaponContext(); } catch (_) {}
  return resources([ix.host.scene, ix.host, ix.T, weaponKit]);
}
export function createResourceScope(ix) {
  const borrowed = subjectResources(ix);
  let done = false;
  return {
    release(root, extras = []) {
      if (done) return;
      done = true;
      if (root) root.removeFromParent();
      const kept = subjectResources(ix), owned = resources([root, extras]);
      // Explicit shared ownership is already used by marine-body, weapon-heavy, the cargo plane and the PGB patch.
      // A shared material also owns its maps; those must remain available even if its first mesh was this subject.
      for (const r of owned) if (r.userData && r.userData.shared) for (const s of resources(r)) kept.add(s);
      for (const r of owned) if (!borrowed.has(r) && !kept.has(r) && typeof r.dispose === 'function') r.dispose();
      borrowed.clear();
    }
  };
}

export function countInfo(root, camera = null) {
  let meshes = 0, tris = 0, points = 0, segments = 0; const mats = new Set();
  if (root) root.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isSprite || o.isPoints || o.isLine) || !o.geometry) return;   // anything drawn
    for (let n = o; n; n = n.parent) { if (n.visible === false) return; if (n === root) break; }
    if (camera?.layers && o.layers && !o.layers.test(camera.layers)) return;
    meshes++;
    const g = o.geometry, idx = g.index, pos = g.attributes && g.attributes.position;
    const count = idx ? idx.count : pos ? pos.count : 0;
    if (o.isPoints) points += count;
    else if (o.isLine) segments += o.isLineSegments ? Math.floor(count / 2) : o.isLineLoop ? count : Math.max(0, count - 1);
    else tris += count / 3 * (o.isInstancedMesh ? o.count : 1);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) mats.add(m);
  });
  return { meshes, drawables: meshes, tris: Math.round(tris), points, segments, materials: mats.size };
}
function jointList(ud, names) {
  const out = [];
  for (const k of names) if (ud[k] && ud[k].isObject3D) out.push({ name: k, obj: ud[k] });
  for (const k of ['armLG', 'armRG']) { const e = ud[k] && ud[k].userData && ud[k].userData.elbowG; if (e) out.push({ name: k.replace('arm', 'elbow'), obj: e }); }
  for (const k of ['legLG', 'legRG']) { const s = ud[k] && ud[k].userData && ud[k].userData.shinG; if (s) out.push({ name: k.replace('leg', 'shin'), obj: s }); }
  return out;
}

// --- the marine ---------------------------------------------------------------------------------------------------
export function marineSubject(ix, entry) {
  const T = ix.T, P = T.player, C = ix.stage.center;
  ix.host.placePlayer(C.x, C.z, 0);
  const v = new ix.THREE.Vector3();
  let measured = null, measuredAt = -Infinity, measuredBase = null, coreOffset = null;
  const base = () => { P.getWorldPosition(v); return { x: v.x, y: v.y, z: v.z }; };
  function jointPoint(key, offset = [0, 0, 0]) {
    const o = T.marine.userData[key]; if (!o || !o.isObject3D) return null;
    v.set(...offset); o.localToWorld(v); return [v.x, v.y, v.z].every(Number.isFinite) ? { x: v.x, y: v.y, z: v.z } : null;
  }
  function midpoint(a, b) { return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 } : a || b; }
  function bodyCenter() {
    return midpoint(jointPoint('headG', [0, 0.22, 0.04]), midpoint(jointPoint('ankleLG'), jointPoint('ankleRG')));
  }
  function bounds(force = false) {
    const now = performance.now(), p = base(), core = bodyCenter();
    if (force || !measured || now - measuredAt >= 100) {
      const m = ix.stage.measure(P); measuredAt = now;
      if (m) { measured = m; measuredBase = p; coreOffset = core ? { x: m.center.x - core.x, y: m.center.y - core.y, z: m.center.z - core.z } : null; }
    }
    if (!measured) return null;
    // Full mesh measurement is throttled; cheap named joints follow a jump/dive every frame. The residual puts the
    // target at the measured visible center without zooming the camera on every breath or gait frame.
    const center = core && coreOffset ? { x: core.x + coreOffset.x, y: core.y + coreOffset.y, z: core.z + coreOffset.z } :
      { x: measured.center.x + p.x - measuredBase.x, y: measured.center.y + p.y - measuredBase.y, z: measured.center.z + p.z - measuredBase.z };
    const d = { x: center.x - measured.center.x, y: center.y - measured.center.y, z: center.z - measured.center.z };
    return { ...measured, center, min: { x: measured.min.x + d.x, y: measured.min.y + d.y, z: measured.min.z + d.z }, max: { x: measured.max.x + d.x, y: measured.max.y + d.y, z: measured.max.z + d.z } };
  }
  function bookmark(name) {
    let center, size = null;
    if (name === 'head') center = jointPoint('headG', [0, 0.22, 0.04]);
    else if (name === 'torso') center = jointPoint('torsoG', [0, 0.34, 0.05]);
    else if (name === 'back') center = jointPoint('torsoG', [0, 0.28, -0.08]);
    else if (name === 'hands') {
      const a = jointPoint('gripL'), b = jointPoint('gripR'); center = midpoint(a, b);
      if (a && b) size = { x: Math.abs(a.x - b.x) + 0.25, y: Math.abs(a.y - b.y) + 0.25, z: Math.abs(a.z - b.z) + 0.25 };
    } else if (name === 'boots') {
      center = midpoint(midpoint(jointPoint('kneeLG'), jointPoint('kneeRG')), midpoint(jointPoint('ankleLG'), jointPoint('ankleRG')));
      if (center) center.y += 0.135;   // keep the upright bookmark's lower-shin framing
    }
    return center ? { center, size } : null;
  }
  return {
    entry, kind: 'marine', live: true, root: null,
    base, bounds, bookmark,
    focus: (force = false) => { const b = bounds(force), p = base(); return { center: b ? b.center : { x: p.x, y: p.y + 0.9, z: p.z }, size: b ? b.size : { x: 0.9, y: 1.85, z: 0.7 }, yaw: P.rotation.y }; },
    rig: () => P,
    origin: () => P,
    joints: () => jointList(T.marine.userData, MJOINTS),
    update() {},
    info: () => countInfo(P, ix.host.camera || T.camera),
    dispose() {}
  };
}

// --- a zombie -----------------------------------------------------------------------------------------------------
// mode: 'live' (spawned, chasing the marine), 'walk' (live, and the marine keeps stepping away so it keeps walking),
// 'statue' (the body at rest). The marine stands 9 m to its left (+x), so a camera in front of it sees it turn and walk
// across the frame with him off to the side (godmode on: it can hit him, nothing comes of it).
export function zombieSubject(ix, entry, mode = 'live') {
  const T = ix.T, C = ix.stage.center, key = entry.typeKey;
  const st = { z: null, mesh: null, mode, kite: 1, t: 0, scope: null };
  function clearOurs() {
    try { T.clearZombies && T.clearZombies(); } catch (_) {}
  }
  function spawn() {
    clearOurs(); st.box = null; st.lift = 0;
    if (st.mesh && st.mode === 'statue') { st.scope && st.scope.release(st.mesh); st.scope = null; st.mesh = null; }
    if (mode === 'statue') {
      const make = ix.host.builders.zombie;
      if (!make) throw new Error('the game has no makeZombieMesh (index.html inspectHost)');
      st.scope = createResourceScope(ix);
      const m = make(key);
      const vr = m.userData.variant || { height: 1, width: 1 };
      m.scale.set(vr.width || 1, vr.height || 1, vr.width || 1);
      m.position.set(C.x, C.y, C.z); m.rotation.set(0, 0, 0);
      ix.host.scene.add(m);
      st.mesh = m; st.z = null;
      ix.host.placePlayer(C.x, C.z + 30, Math.PI);   // out of the way (the backdrop hides him)
      return;
    }
    ix.host.placePlayer(C.x + 9, C.z, -Math.PI / 2);
    const z = T.spawnZombie(C.x - 2, C.z, key, true, mode !== 'rise');
    if (!z) throw new Error('the game would not spawn a ' + key);
    z.trainingZ = true;   // the Training Ground's own: its sweep leaves these alone, and the abilities count them
    z.mesh.rotation.y = 0;
    st.z = z; st.mesh = z.mesh;
  }
  spawn();
  return {
    entry, kind: 'zombie', live: mode !== 'statue', mode, root: null,
    get z() { return st.z; },
    respawn: spawn,
    // what the camera frames: its measured size (skinned, a guardian's rig included), taken when it is first seen and
    // every two seconds after; the centre rides on the body's own position at a fixed height, so the camera never jitters
    focus() {
      const m = st.mesh; if (!m) return { center: { ...C, y: C.y + 1 }, size: { x: 1, y: 2, z: 1 }, yaw: 0 };
      const now = performance.now();
      if (!st.box || now - st.boxT > 2000) {
        const b = ix.stage.measure(m); st.boxT = now;
        if (b) { if (!st.box) st.lift = Math.max(0.3, b.center.y - m.position.y); st.box = b; }
      }
      const sz = st.box ? st.box.size : { x: 0.9, y: 1.8, z: 0.9 }, lift = st.lift || sz.y * 0.5;
      return { center: { x: m.position.x, y: m.position.y + lift, z: m.position.z }, size: sz, yaw: m.rotation.y };
    },
    rig: () => st.mesh,
    origin: () => st.mesh,
    joints: () => (st.mesh ? jointList(st.mesh.userData, ZJOINTS) : []),
    update(dt) {
      st.t += dt;
      const z = st.z;
      // A statue keeps its rest pose, but its fire follows the inspector clock.
      // Idle ability visuals do not move bones; pause and frame-step work normally.
      if (!z && key === 'demon' && st.mesh) updateZombieAbilityVisuals(st.mesh, st.t);
      if (!z) return;
      if (!z.alive && st.mode !== 'statue') return;
      // walk: when it gets near him, he steps to the far side, so it turns and walks again
      if (mode === 'walk' && z.alive && z.mesh) {
        const p = T.player.position, d = Math.hypot(p.x - z.mesh.position.x, p.z - z.mesh.position.z);
        if (d < 3.2) { st.kite = -st.kite; ix.host.placePlayer(C.x + 9 * st.kite, C.z, st.kite > 0 ? -Math.PI / 2 : Math.PI / 2); }
      }
    },
    info: () => countInfo(st.mesh, ix.host.camera || T.camera),
    dispose() {
      clearOurs();
      if (st.mesh && st.mode === 'statue') st.scope && st.scope.release(st.mesh);
      st.scope = null;
      st.mesh = null; st.z = null;
    }
  };
}

// --- a model ------------------------------------------------------------------------------------------------------
export async function modelSubject(ix, entry, variant, { isCurrent = () => true } = {}) {
  const c = ix.ctx, C = ix.stage.center;
  const scope = createResourceScope(ix);
  const root = await entry.build(c, variant);
  if (!root || !root.isObject3D) throw new Error('its builder returned ' + (root == null ? 'nothing' : typeof root));
  if (!isCurrent()) { scope.release(root); return null; }
  let controls;
  try { controls = entry.controls ? entry.controls(c, root) : []; }
  catch (e) { scope.release(root); throw e; }
  const holder = new ix.THREE.Group(); holder.name = 'inspector-subject:' + entry.id;
  try {
  holder.add(root);
  holder.position.set(C.x, C.y, C.z);
  ix.host.scene.add(holder);
  holder.updateMatrixWorld(true);
  // stand it on the floor (or float it at its height): its lowest point on the floor, its centre over the stage's
  const m0 = ix.stage.measure(holder, { skinned: false });
  if (m0) {
    if (entry.float != null) root.position.y += C.y + entry.float - m0.center.y;
    else root.position.y += C.y - m0.min.y;
  }
  holder.updateMatrixWorld(true);
  ix.host.placePlayer(C.x, C.z + 30, Math.PI);   // the marine steps off the stage (the backdrop hides him)
  const tickState = { variant };
  let t = 0, spin = 0;
  const s = {
    entry, kind: 'model', live: false, root, holder, variant,
    focus() { const m = ix.stage.measure(holder, { skinned: false }) || { center: { ...C, y: C.y + 0.5 }, size: { x: 1, y: 1, z: 1 } }; return { center: m.center, size: m.size, yaw: holder.rotation.y }; },
    rig: () => holder,
    origin: () => root,
    joints: () => {
      const out = [], ud = root.userData || {};
      for (const k of Object.keys(ud)) { const v = ud[k]; if (v && v.isObject3D && v !== root) out.push({ name: k, obj: v }); }
      const J = ud.joints; if (J && typeof J === 'object') for (const k of Object.keys(J)) if (J[k] && J[k].isObject3D) out.push({ name: k, obj: J[k] });
      return out.slice(0, 40);
    },
    controls,
    turntable: 0,   // radians a second
    setYaw(angle) { if (!Number.isFinite(angle)) throw new Error('model yaw must be finite'); spin = angle; holder.rotation.y = angle; holder.updateMatrixWorld(true); },
    update(dt) {
      t += dt;
      if (s.turntable) { spin += s.turntable * dt; holder.rotation.y = spin; }
      if (entry.tick) entry.tick(root, dt, t, c, tickState);
    },
    info: () => countInfo(holder, ix.host.camera || ix.T.camera),
    dispose() { scope.release(holder); }
  };
  return s;
  } catch (e) { scope.release(holder); throw e; }
}
