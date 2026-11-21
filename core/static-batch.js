// CB-369 (Jerry D-216, "try to work on getting the speed test to pass"): a static prop drawn in far fewer draws.
// A prop built from many small meshes (the relay vault is about a hundred boxes and cylinders) costs one draw per mesh,
// twice when it casts a shadow, and one matrix per mesh every frame. Most of those meshes never move against the group
// they hang in: only the groups move (the vault's door rolls up, the lift rises, the roof and front hide while he is
// inside). So inside each group, the plain meshes that share a material and the same shadow flags become ONE mesh, in
// that group's own space: the group still moves, scales and hides exactly as before, and the look is the same
// (same material object, same vertices, same normals and uvs).
//
//   staticBatchTree(THREE, root, opts) -> { merged, removed, groups }   (counts)
//     opts.skip   a Set of Object3Ds whose subtrees are left alone (a model added from elsewhere, a mesh the game
//                 changes by itself later)
//     opts.name   name prefix for the merged meshes (default root.name)
//
// Merged: Mesh (not Skinned/Instanced/Points/Lines) with no children, visible, a BufferGeometry with position and normal,
// one material (not an array), no morph targets. Meshes that would be alone in their set are left as they are.
// Indexed and non-indexed parts merge together (the merged mesh is indexed). The attribute set must match (uv kept when
// every part has it; a set with a mismatch is split by its attribute names).

export function staticBatchTree(T, root, opts = {}) {
  const skip = opts.skip || new Set(), prefix = opts.name || root.name || 'static';
  const out = { merged: 0, removed: 0, groups: 0 };
  const containers = [];
  (function walk(o) {
    if (skip.has(o)) return;
    containers.push(o);
    for (const c of o.children) if (c.children.length) walk(c);
  })(root);
  const ids = new Map(); const idOf = (mat) => { if (!ids.has(mat)) ids.set(mat, ids.size); return ids.get(mat); };   // by the object itself
  for (const g of containers) {
    const sets = new Map();
    for (const m of g.children) {
      if (!plain(m) || skip.has(m)) continue;
      const a = m.geometry.attributes, names = Object.keys(a).sort().join(',');
      const key = idOf(m.material) + '|' + m.castShadow + '|' + m.receiveShadow + '|' + names + '|' + m.renderOrder + '|' + m.frustumCulled + '|' + m.layers.mask;
      if (!sets.has(key)) sets.set(key, []);
      sets.get(key).push(m);
    }
    let any = false;
    for (const list of sets.values()) {
      if (list.length < 2) continue;
      const mesh = mergeList(T, list);
      mesh.name = prefix + '-batch';
      mesh.userData.staticBatch = list.length;
      // Where the first part sat among its siblings, so draw order inside the group stays about the same.
      const at = g.children.indexOf(list[0]);
      for (const m of list) { g.remove(m); m.geometry.dispose(); }
      g.add(mesh);
      const i = g.children.indexOf(mesh); g.children.splice(i, 1); g.children.splice(Math.min(at, g.children.length), 0, mesh);
      out.merged++; out.removed += list.length; any = true;
    }
    if (any) out.groups++;
  }
  return out;
}

function plain(m) {
  return m && m.isMesh && !m.isSkinnedMesh && !m.isInstancedMesh && !m.children.length && m.visible !== false &&
    m.geometry && m.geometry.isBufferGeometry && m.geometry.attributes.position && m.geometry.attributes.normal &&
    m.material && !Array.isArray(m.material) && !Object.keys(m.geometry.morphAttributes || {}).length && !m.onBeforeRender.length;
}

function mergeList(T, list) {
  const first = list[0], names = Object.keys(first.geometry.attributes);
  let verts = 0, idx = 0;
  for (const m of list) { const g = m.geometry; verts += g.attributes.position.count; idx += g.index ? g.index.count : g.attributes.position.count; }
  const arrays = {};
  for (const n of names) { const a = first.geometry.attributes[n]; arrays[n] = { size: a.itemSize, data: new Float32Array(verts * a.itemSize) }; }
  const I = verts > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  const mat = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3();
  let vo = 0, io = 0;
  for (const m of list) {
    m.updateMatrix(); mat.copy(m.matrix); nm.getNormalMatrix(mat);
    const g = m.geometry, n = g.attributes.position.count;
    for (const name of names) {
      const src = g.attributes[name], dst = arrays[name], s = dst.size;
      for (let i = 0; i < n; i++) {
        if (name === 'position') { v.fromBufferAttribute(src, i).applyMatrix4(mat); dst.data[(vo + i) * 3] = v.x; dst.data[(vo + i) * 3 + 1] = v.y; dst.data[(vo + i) * 3 + 2] = v.z; }
        else if (name === 'normal') { v.fromBufferAttribute(src, i).applyMatrix3(nm).normalize(); dst.data[(vo + i) * 3] = v.x; dst.data[(vo + i) * 3 + 1] = v.y; dst.data[(vo + i) * 3 + 2] = v.z; }
        else if (name === 'tangent') { v.set(src.getX(i), src.getY(i), src.getZ(i)).transformDirection(mat); const w = (vo + i) * 4; dst.data[w] = v.x; dst.data[w + 1] = v.y; dst.data[w + 2] = v.z; dst.data[w + 3] = src.getW(i); }
        else if (!src.isInterleavedBufferAttribute && src.array) for (let k = 0; k < s; k++) dst.data[(vo + i) * s + k] = src.array[i * s + k];
        else { const o = (vo + i) * s; dst.data[o] = src.getX(i); if (s > 1) dst.data[o + 1] = src.getY(i); if (s > 2) dst.data[o + 2] = src.getZ(i); if (s > 3) dst.data[o + 3] = src.getW(i); }
      }
    }
    // A mirrored part (negative scale) flips its winding; put it back so its faces still face out.
    const flip = mat.determinant() < 0;
    if (g.index) { const gi = g.index; for (let k = 0; k < gi.count; k += 3) { const a = gi.getX(k), b = gi.getX(k + 1), c = gi.getX(k + 2); I[io++] = vo + a; I[io++] = vo + (flip ? c : b); I[io++] = vo + (flip ? b : c); } }
    else for (let k = 0; k < n; k += 3) { I[io++] = vo + k; I[io++] = vo + (flip ? k + 2 : k + 1); I[io++] = vo + (flip ? k + 1 : k + 2); }
    vo += n;
  }
  const geo = new T.BufferGeometry();
  for (const n of names) geo.setAttribute(n, new T.BufferAttribute(arrays[n].data, arrays[n].size));
  geo.setIndex(new T.BufferAttribute(I, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  const mesh = new T.Mesh(geo, first.material);
  mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
  mesh.renderOrder = first.renderOrder; mesh.frustumCulled = first.frustumCulled; mesh.layers.mask = first.layers.mask;
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();   // it sits at its group's origin and never moves there
  return mesh;
}
