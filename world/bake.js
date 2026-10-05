// CL-117 (Jerry overnight, 2026-10-02: fps and hitching). A prop built from dozens of little boxes is dozens of draw
// calls, and every draw costs the main thread the same whether the box is a bolt or a wall. The HQ alone was over a
// hundred; the Training Ground two hundred. bakeStatic merges a group's still meshes into one mesh per material
// (their positions, normals and uvs carried through), leaving anything that moves exactly as it was.
//
//   bakeStatic(THREE, group, { skip?: (object) => boolean, enter?: (object) => boolean }) -> { merged, removed }
//     `enter` lets a named object be walked into anyway (its own children can still be merged).
//     Everything under `group` that is a Mesh, visible, with a single material and a plain geometry, and not under a
//     skipped object, is merged. Skipped: anything `skip` says, any named object (a name means someone holds it),
//     InstancedMesh and SkinnedMesh, and anything with morph targets. The merged meshes are added to `group` itself.

export function bakeStatic(THREE, group, { skip = () => false, enter = () => false } = {}) {
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();   // material -> [{ mesh, rel }]
  const rel = new THREE.Matrix4();
  const walk = (o, blocked) => {
    const stop = blocked || skip(o) || (!!o.name && o !== group && !enter(o));
    if (o.isMesh && !stop && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !Array.isArray(o.material) && o.geometry
      && o.geometry.attributes && o.geometry.attributes.position && !o.morphTargetInfluences && !(o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length)) {
      const m = o.material;
      let list = byMat.get(m); if (!list) { list = []; byMat.set(m, list); }
      list.push({ mesh: o, rel: new THREE.Matrix4().multiplyMatrices(invRoot, o.matrixWorld) });
    }
    for (const c of o.children) walk(c, stop);
  };
  for (const c of group.children) walk(c, false);
  let merged = 0, removed = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    let total = 0, anyUv = true;
    for (const { mesh } of list) { const g = mesh.geometry; total += g.index ? g.index.count : g.attributes.position.count; if (!g.attributes.uv) anyUv = false; }
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = anyUv ? new Float32Array(total * 2) : null;
    let at = 0;
    for (const { mesh, rel: M } of list) {
      const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, idx = g.index;
      nm.getNormalMatrix(M);
      const count = idx ? idx.count : P.count;
      for (let k = 0; k < count; k++) {
        const i = idx ? idx.getX(k) : k;
        v.fromBufferAttribute(P, i).applyMatrix4(M);
        pos[(at + k) * 3] = v.x; pos[(at + k) * 3 + 1] = v.y; pos[(at + k) * 3 + 2] = v.z;
        if (N) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nrm[(at + k) * 3] = n.x; nrm[(at + k) * 3 + 1] = n.y; nrm[(at + k) * 3 + 2] = n.z; }
        if (uv) { uv[(at + k) * 2] = U.getX(i); uv[(at + k) * 2 + 1] = U.getY(i); }
      }
      at += count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (!list.every(({ mesh }) => mesh.geometry.attributes.normal)) geo.computeVertexNormals();
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const out = new THREE.Mesh(geo, mat);
    out.name = '';
    out.castShadow = list.some(({ mesh }) => mesh.castShadow);
    out.receiveShadow = list.some(({ mesh }) => mesh.receiveShadow);
    out.userData.baked = list.length;
    group.add(out);
    merged++;
    for (const { mesh } of list) { if (mesh.parent) mesh.parent.remove(mesh); removed++; }
  }
  return { merged, removed };
}
