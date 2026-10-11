// CL-140 (Jerry, 2026-10-09: "walking around the map the framerate fluctuates like crazy"). Many small meshes on a
// rig, drawn as one. The game's figures are built from parts under joint groups: a rabbit is twenty meshes, a bird
// ten, the marine ninety, and under the WebGPU renderer each one is a draw with its own cost on the main thread,
// twice when it casts a shadow. CL-138 did this for the zombies by hand (skinZombieMesh in index.html); this is the
// same idea for anything: the parts become one SkinnedMesh whose bones are the objects the parts hang from (or the
// parts themselves), so whatever the rig animates, the merged body follows exactly, and the parts are hidden.
//
//   skinMergeGroup(THREE, group, opts) -> { meshes: [SkinnedMesh], bones, parts }  (or null when nothing merged)
//     opts.bones     'parent' (default): each part's parent is its bone, as skinZombieMesh does;
//                    'self': each part is its own bone, exact for parts that move on their own
//     opts.keep      a Set of materials or meshes to leave alone (eyes that glow, things recoloured later)
//     opts.name      the merged mesh's name
//     opts.shadowOnly  true: one mesh of every part with no material detail, for casting the rig's shadow in one
//                    draw while the parts keep drawing themselves (they stop casting). It is drawn only by the
//                    camera given in opts.shadowCamera (three copies the view camera's layer mask onto the shadow
//                    camera, so a layer could not tell them apart: this answers to that camera's own Layers object).
//     opts.radius    bounding sphere radius about the group (default: measured, with a margin)
//
// Parts merged: opaque meshes (no transparency, alpha test or emission) whose materials share textures, sidedness and
// shading. Colours go into vertex colours; roughness and metalness are averaged. A part hidden at the time is left
// out. The parts stay in the tree, hidden, with userData.skinSrc = true (the game flings severed limbs from them).
// skinUnmerge(group) puts everything back.

export function skinMergeGroup(T, g, opts = {}) {
  if (!T.SkinnedMesh || !T.Skeleton) return null;
  const keep = opts.keep || new Set(), boneMode = opts.bones || 'parent', shadowOnly = !!opts.shadowOnly;
  g.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(g.matrixWorld).invert();
  const sig = (m) => shadowOnly ? 'all' : [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap, m.bumpMap, m.alphaMap].map((t) => (t ? t.uuid : '')).join('|') + '|' + m.side + '|' + !!m.flatShading + '|' + (m.type || '');
  const sets = new Map();
  g.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.visible || !o.parent || keep.has(o)) return;
    if (opts.skip && opts.skip(o)) return;
    for (let n = o.parent; n && n !== g; n = n.parent) if (!n.visible) return;
    const m = o.material, geo = o.geometry;
    if (!m || Array.isArray(m) || keep.has(m) || !geo || !geo.attributes.position) return;
    if (!shadowOnly && (m.transparent || m.alphaTest > 0 || m.emissiveMap || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity || 0) > 0))) return;
    if (shadowOnly && (m.transparent && (m.opacity || 1) < 0.5)) return;
    const k = sig(m);
    let set = sets.get(k); if (!set) sets.set(k, set = []);
    set.push(o);
  });
  const made = [], parts = [], allBones = new Set();
  const M = new T.Matrix4(), NM = new T.Matrix3(), v = new T.Vector3(), n = new T.Vector3(), c = new T.Color();
  const minParts = shadowOnly ? 1 : (opts.minParts || 2);
  for (const list of sets.values()) {
    if (list.length < minParts) continue;
    const bones = [], boneIdx = new Map(), prep = [];
    let total = 0;
    for (const o of list) {
      const b = boneMode === 'self' ? o : o.parent;
      if (!boneIdx.has(b)) { boneIdx.set(b, bones.length); bones.push(b); }
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      prep.push({ o, geo, b }); total += geo.attributes.position.count;
    }
    const first = list[0].material;
    const textured = !shadowOnly && !!(first.map || first.normalMap || first.roughnessMap || first.aoMap || first.bumpMap || first.metalnessMap || first.alphaMap);
    const pos = new Float32Array(total * 3), nrm = shadowOnly ? null : new Float32Array(total * 3), col = shadowOnly ? null : new Float32Array(total * 3);
    const uvs = textured ? new Float32Array(total * 2) : null;
    const si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
    let k = 0, rough = 0, metal = 0;
    for (const { o, geo, b } of prep) {
      M.multiplyMatrices(inv, o.matrixWorld); NM.getNormalMatrix(M);
      const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color, U = geo.attributes.uv, bi = boneIdx.get(b);
      const mc = o.material.color; if (mc) c.copy(mc); else c.setRGB(1, 1, 1);
      const vc = !!(C && o.material.vertexColors);
      for (let i = 0; i < P.count; i++, k++) {
        v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        if (nrm) { if (N) n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize(); else n.set(0, 1, 0); nrm[k * 3] = n.x; nrm[k * 3 + 1] = n.y; nrm[k * 3 + 2] = n.z; }
        if (col) { if (vc) { col[k * 3] = C.getX(i) * c.r; col[k * 3 + 1] = C.getY(i) * c.g; col[k * 3 + 2] = C.getZ(i) * c.b; } else { col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } }
        if (uvs) { uvs[k * 2] = U ? U.getX(i) : 0; uvs[k * 2 + 1] = U ? U.getY(i) : 0; }
        si[k * 4] = bi; sw[k * 4] = 1;
      }
      rough += o.material.roughness != null ? o.material.roughness : 0.9; metal += o.material.metalness || 0;
      if (geo !== o.geometry) geo.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    if (nrm) geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
    if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3));
    if (uvs) geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
    geo.computeBoundingSphere();
    let mat;
    if (shadowOnly) mat = new T.MeshBasicMaterial({ color: 0x000000 });
    else {
      mat = first.clone();
      mat.vertexColors = true; if (mat.color) mat.color.setRGB(1, 1, 1);
      mat.roughness = rough / prep.length; mat.metalness = metal / prep.length;
      if (mat.emissive) { mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0; }
    }
    mat.userData = { ...(mat.userData || {}), skinMerged: true };
    const skin = new T.SkinnedMesh(geo, mat);
    skin.name = opts.name || 'skin';
    skin.castShadow = true; skin.receiveShadow = !shadowOnly && !!list[0].receiveShadow;
    skin.userData.skinMerged = true;
    g.add(skin);
    g.updateMatrixWorld(true);
    skin.bind(new T.Skeleton(bones));
    for (const b of bones) allBones.add(b);
    const r = opts.radius || Math.max(0.5, geo.boundingSphere.radius * 1.5 + 0.3);
    skin.boundingSphere = new T.Sphere(geo.boundingSphere.center.clone(), r);
    if (shadowOnly) {
      // Drawn by the shadow camera only (see the top). Nothing else reads these layers.
      const cam = opts.shadowCamera;
      skin.layers = { mask: 1, test: (layers) => !!cam && layers === cam.layers, enable() {}, disable() {}, set() {}, toggle() {}, enableAll() {}, disableAll() {}, isEnabled() { return true; } };
      for (const { o } of prep) { o.userData.skinShadowSrc = true; o.userData._castBefore = o.castShadow; o.castShadow = false; }
    } else {
      for (const { o } of prep) { o.visible = false; o.userData.skinSrc = true; }
    }
    for (const { o } of prep) parts.push(o);
    made.push(skin);
  }
  if (!made.length) return null;
  return { meshes: made, bones: [...allBones], parts };
}

export function skinUnmerge(g) {
  const dead = [];
  g.traverse((o) => {
    if (o.isSkinnedMesh && o.userData.skinMerged) dead.push(o);
    else if (o.isMesh && o.userData.skinSrc) { o.visible = true; o.userData.skinSrc = false; }
    else if (o.isMesh && o.userData.skinShadowSrc) { o.castShadow = o.userData._castBefore !== false; o.userData.skinShadowSrc = false; }
  });
  for (const d of dead) { if (d.parent) d.parent.remove(d); d.geometry.dispose(); d.material.dispose(); }
  return dead.length;
}

// A number that changes when the set of visible parts under g changes (a hat swapped, a magazine hidden): the shadow
// proxy is rebuilt when it does. Cheap: a walk of the tree.
export function skinSignature(g, skip) {
  let s = 0, n = 0;
  g.traverseVisible((o) => { if (o.isMesh && !o.userData.skinMerged && !(skip && skip(o))) { s = (s * 31 + o.id) | 0; n++; } });
  return s + ':' + n;
}
