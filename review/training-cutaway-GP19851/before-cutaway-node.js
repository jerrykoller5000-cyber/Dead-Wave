// GP-197: preserve solids; batch the foreground architectural shell separately.
import { bakeStatic } from '../../world/bake.js';

export function partitionTrainingShell(T, tgGroup, origin) {
  const sides = new Map(), owned = [];
  const classify = b => {
    if (b.max.x < -42.5 && b.min.z >= -12.7 && b.max.z <= 28.7) return 'west';
    if (b.min.x > -9.5 && b.max.x < -7.4 && b.min.z >= -12.7 && b.max.z <= 30.7) return 'east';
    if (b.max.z < -10.5 && b.min.x >= -44.7 && b.max.x <= -7.4) return 'south';
    if (b.min.z > 26.5 && b.min.x >= -44.7 && b.max.x <= -7.4) return 'north';
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
    if (!/^training-(gate-frame|gate-leaf-|security-shutter)/.test(group.name)) continue;
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
    });
    entries.push({ side, group, mats, opacity: 1, hidden: false });
  }
  let enabled = false;
  function syncMaterials() {
    for (const e of entries) for (const [source, mat] of e.mats) {
      mat.opacity = source.opacity * e.opacity;
      mat.color?.copy(source.color); if (source.emissive) { mat.emissive.copy(source.emissive); mat.emissiveIntensity = source.emissiveIntensity; }
      const transparent = e.opacity < .995 || source.transparent;
      if (mat.transparent !== transparent) { mat.transparent = transparent; mat.depthWrite = transparent ? false : source.depthWrite; mat.needsUpdate = true; }
    }
  }
  function update(camera, player, dt = 1 / 60) {
    const x = player.x - origin.x, z = player.z - origin.z;
    enabled = x > -44 && x < -8 && z > -12 && z < 28;
    const cx = camera.x - origin.x, cz = camera.z - origin.z;
    for (const e of entries) {
      e.hidden = enabled && (e.side === 'overhead' || (e.side === 'west' && cx < -43) || (e.side === 'east' && cx > -9) || (e.side === 'south' && cz < -11) || (e.side === 'north' && cz > 27));
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
