// GP-197: preserve solids; batch the foreground architectural shell separately.
import { bakeStatic } from '../../world/bake.js';

// A bounded plane between the camera and its focus, from either direction.
// Pure geometry: the same test can be used for another room's tagged shell.
export function viewCrossesPlane(camera, focus, axis, at, bounds, margin = .6) {
  const delta = focus[axis] - camera[axis];
  let t = Math.abs(delta) > 1e-9 ? (at - camera[axis]) / delta : -1;
  if (t < 0 || t > 1) {
    if (Math.abs(camera[axis] - at) > margin) return false;
    t = 0; // The camera itself is in the wall's thickness/near plane.
  }
  for (const [key, lo, hi] of bounds) {
    const p = camera[key] + (focus[key] - camera[key]) * t;
    if (p < lo - margin || p > hi + margin) return false;
  }
  return true;
}

export function partitionTrainingShell(T, tgGroup, origin) {
  const sides = new Map(), owned = [];
  const classify = b => {
    if (b.max.x < -42.5 && b.min.z >= -12.7 && b.max.z <= 28.7) return 'west';
    if (b.min.x > -9.5 && b.max.x < -7.4 && b.min.z >= -12.7 && b.max.z <= 30.7) return 'east';
    if (b.max.z < -10.5 && b.min.x >= -44.7 && b.max.x <= -7.4) return 'south';
    if (b.min.z > 26.5 && b.min.x >= -44.7 && b.max.x <= -7.4) return 'north';
    if (b.max.z < -10.5 && b.min.x >= -8.3 && b.max.x <= 8.3 && b.max.y <= 6.2) return 'rangeSouth';   // GB-161: the range's back wall and what hangs on it
    if (b.min.y > 7.5 && b.min.x >= -44.7 && b.max.x <= -7.4 && b.min.z >= -12.7 && b.max.z <= 28.7) return 'overhead';
    return null;
  };
  tgGroup.updateMatrixWorld(true);
  for (const mesh of [...tgGroup.children]) {
    if (!mesh.isMesh || mesh.name || Array.isArray(mesh.material)) continue;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    box.min.sub(origin); box.max.sub(origin);
    const side = classify(box);
    if (!side) continue;
    let group = sides.get(side);
    if (!group) { group = new T.Group(); group.name = 'training-cutaway-' + side; tgGroup.add(group); sides.set(side, group); }
    group.add(mesh);
  }
  const entries = [];
  const groups = [...sides];
  for (const group of tgGroup.children) {
    if (!/^training-(gate-frame|gate-leaf-|security-shutter|wear-locker-door)/.test(group.name)) continue;
    const box = new T.Box3().setFromObject(group); box.min.sub(origin); box.max.sub(origin);
    const side = classify(box);
    if (side) groups.push([side, group]);
  }
  for (const [side, group] of groups) {
    bakeStatic(T, group);
    const mats = new Map();
    group.traverse(mesh => {
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const source = mesh.material;
      let material = mats.get(source);
      if (!material) { material = source.clone(); material.transparent = true; material.depthWrite = false; mats.set(source, material); owned.push(material); }
      mesh.material = material;
      // Blended solid bases must precede their transparent decal overlays.
      if (!source.transparent) mesh.renderOrder = -1;
    });
    entries.push({ side, group, mats, opacity: 1, hidden: false });
  }
  let enabled = false;
  const walls = {
    west: ['x', -44, [['z', -12, 28], ['y', 0, 24]]],
    east: ['x', -8, [['z', -12, 30], ['y', 0, 24]]],
    south: ['z', -12, [['x', -44, -8], ['y', 0, 24]]],
    north: ['z', 28, [['x', -44, -8], ['y', 0, 24]]],
    rangeSouth: ['z', -12, [['x', -8, 8], ['y', 0, 6]]]   // GB-161
  };
  function syncMaterials() {
    for (const e of entries) for (const [source, mat] of e.mats) {
      mat.opacity = source.opacity * e.opacity;
      mat.color?.copy(source.color); if (source.emissive) { mat.emissive.copy(source.emissive); mat.emissiveIntensity = source.emissiveIntensity; }
      // GP-19883: keep the fade pipeline stable through a camera orbit.
      // Opacity is a uniform; changing transparent/needsUpdate rebuilds shaders.
      // Blending stays enabled; solid surfaces still write depth as before.
      mat.depthWrite = e.opacity >= .995 && source.depthWrite;
    }
  }
  function update(camera, player, dt = 1 / 60) {
    const x = player.x - origin.x, z = player.z - origin.z;
    const inBuild = x >= -44 && x <= -8 && z >= -12 && z <= 28;
    const inRange = x >= -8 && x <= 8 && z >= -12 && z <= 30;
    enabled = inBuild || inRange;
    const c = { x: camera.x - origin.x, y: camera.y - origin.y, z: camera.z - origin.z };
    const focus = { x, y: player.y - origin.y, z };
    const shared = enabled && viewCrossesPlane(c, focus, ...walls.east);
    for (const e of entries) {
      // GB-163 (Jerry: "This range backwall sometimes switches back and forth from one texture to another"): the camera
      // rides its collision against the wall it is behind; at the plane's 0.6 m margin a wall faded (so the camera ignored
      // it and slid back) then lit (so it collided and came forward) every few frames. A faded wall now holds until the
      // view is clear by a wider margin (1.6 m), and a change has to last a moment before it shows.
      const margin = e.hidden ? 1.6 : .6;
      const sharedNow = enabled && viewCrossesPlane(c, focus, ...walls.east, margin);
      const next = enabled && (e.side === 'overhead' ? inBuild || sharedNow : e.side === 'east' ? sharedNow : viewCrossesPlane(c, focus, ...walls[e.side], margin));
      if (next !== e.hidden) { e.pend = (e.pend || 0) + Math.max(0, dt); if (e.pend >= (next ? .06 : .35)) { e.hidden = next; e.pend = 0; } } else e.pend = 0;
      const want = e.hidden ? (e.side === 'overhead' ? 0 : .06) : 1;
      e.opacity += Math.sign(want - e.opacity) * Math.min(Math.abs(want - e.opacity), Math.max(0, dt) * 6);
      e.group.visible = e.opacity > .001;
    }
    syncMaterials();
  }
  return {
    update, syncMaterials,
    // Only the third-person camera query uses this; rounds, laser and scoped aim remain solid.
    ignoreSolid(s) {
      if (!enabled || s.target != null || s.door || s.gate) return false;
      const box = { min: { x: s.minX-origin.x, y: s.minY-origin.y, z: s.minZ-origin.z }, max: { x: s.maxX-origin.x, y: s.maxY-origin.y, z: s.maxZ-origin.z } };
      const side = classify(box);
      return entries.some(e => e.side === side && e.hidden);
    },
    state: () => entries.map(e => ({ side: e.side, opacity: e.opacity, hidden: e.hidden })),
    dispose() { owned.forEach(m => m.dispose()); }
  };
}
