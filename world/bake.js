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
//     (CL-218: nor a folded mesh, nor any whose material reads vertex colours: their colours aren't carried.)

export function bakeStatic(THREE, group, { skip = () => false, enter = () => false } = {}) {
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();   // material -> [{ mesh, rel }]
  const rel = new THREE.Matrix4();
  const walk = (o, blocked) => {
    const stop = blocked || skip(o) || (!!o.name && o !== group && !enter(o));
    if (o.isMesh && !stop && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !Array.isArray(o.material) && o.geometry
      && o.geometry.attributes && o.geometry.attributes.position && !o.morphTargetInfluences && !(o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length)
      && !o.userData.folded && !(o.material.vertexColors && o.geometry.attributes.color)) {   // CL-218: colours per vertex aren't carried here
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

// CL-218 (AG-91's census: the HQ house was 145 of night 20's 396 draws). bakeStatic leaves one mesh per material, and
// a prop built from a dozen plain colours is still a dozen draws. foldStatic goes further: every still mesh under
// `group` whose material is plain (a MeshStandardMaterial with no texture, no glow, opaque) is merged into one mesh
// per (side, castShadow, receiveShadow), its colour, roughness and metalness carried per vertex, drawn by one node
// material that reads them (TSL's attribute()). A prop of plain boxes is one draw, whatever colours it has.
//
//   foldStatic(THREE, TSL, group, { skip?, enter?, hold? }) -> { folded, removed }
//     THREE must be three/webgpu (MeshStandardNodeMaterial), TSL three/tsl. `skip` and `enter` as bakeStatic's;
//     `hold` is a Set of materials something changes at runtime (never folded). Named objects are left as they are,
//     with what is under them, unless `enter` says so. Shared by every fold: one material per side.
const FOLD_MATS = new Map();   // side -> the node material
function foldMaterial(THREE, TSL, side) {
  let m = FOLD_MATS.get(side);
  if (m) return m;
  m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, side });
  const rm = TSL.attribute('foldRM', 'vec2');
  m.roughnessNode = rm.x;
  m.metalnessNode = rm.y;
  m.name = 'fold-static';
  FOLD_MATS.set(side, m);
  return m;
}
const PLAIN_MAPS = ['map', 'normalMap', 'bumpMap', 'aoMap', 'lightMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'displacementMap', 'envMap'];
function plainMaterial(m, hold) {
  if (!m || hold.has(m) || m.type !== 'MeshStandardMaterial' || m.transparent || m.opacity !== 1 || m.alphaTest > 0 || m.wireframe || m.flatShading) return false;
  if (m.vertexColors || m.polygonOffset || m.depthWrite === false || m.depthTest === false || m.visible === false) return false;
  for (const k of PLAIN_MAPS) if (m[k]) return false;
  if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b) && m.emissiveIntensity > 0) return false;   // a glow: lamps change theirs
  if (Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile')) return false;   // someone customised its shader
  return true;
}
export function foldStatic(THREE, TSL, group, { skip = () => false, enter = () => false, hold = new Set() } = {}) {
  if (!THREE.MeshStandardNodeMaterial || !TSL || !TSL.attribute) return { folded: 0, removed: 0 };
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();   // key -> [{ mesh, rel }]
  const walk = (o, blocked) => {
    // (a hidden group's meshes are someone's to show later: a hidden thing and all under it stay as they are)
    const stop = blocked || !o.visible || skip(o) || (!!o.name && o !== group && !enter(o));
    if (o.isMesh && !stop && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && o.geometry
      && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.normal && !o.geometry.attributes.color
      && !o.morphTargetInfluences && !(o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length)
      && plainMaterial(o.material, hold)) {
      const key = o.material.side + '|' + !!o.castShadow + '|' + !!o.receiveShadow;
      let list = buckets.get(key); if (!list) { list = []; buckets.set(key, list); }
      list.push({ mesh: o, rel: new THREE.Matrix4().multiplyMatrices(invRoot, o.matrixWorld) });
    }
    for (const c of o.children) walk(c, stop);
  };
  for (const c of group.children) walk(c, false);
  let folded = 0, removed = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    let total = 0;
    for (const { mesh } of list) { const g = mesh.geometry; total += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3), rmv = new Float32Array(total * 2);
    let at = 0;
    for (const { mesh, rel: M } of list) {
      const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, idx = g.index, mat = mesh.material;
      const cr = mat.color ? mat.color.r : 1, cg = mat.color ? mat.color.g : 1, cb = mat.color ? mat.color.b : 1;   // linear, as vertex colours are
      const r = mat.roughness ?? 1, me = mat.metalness ?? 0;
      nm.getNormalMatrix(M);
      const count = idx ? idx.count : P.count;
      for (let k = 0; k < count; k++) {
        const i = idx ? idx.getX(k) : k, j = at + k;
        v.fromBufferAttribute(P, i).applyMatrix4(M);
        pos[j * 3] = v.x; pos[j * 3 + 1] = v.y; pos[j * 3 + 2] = v.z;
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nrm[j * 3] = n.x; nrm[j * 3 + 1] = n.y; nrm[j * 3 + 2] = n.z;
        col[j * 3] = cr; col[j * 3 + 1] = cg; col[j * 3 + 2] = cb;
        rmv[j * 2] = r; rmv[j * 2 + 1] = me;
      }
      at += count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('foldRM', new THREE.BufferAttribute(rmv, 2));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const first = list[0].mesh;
    const out = new THREE.Mesh(geo, foldMaterial(THREE, TSL, first.material.side));
    out.name = '';
    out.castShadow = !!first.castShadow; out.receiveShadow = !!first.receiveShadow;
    out.userData.folded = list.length;
    group.add(out);
    folded++;
    for (const { mesh } of list) { if (mesh.parent) mesh.parent.remove(mesh); removed++; }
  }
  return { folded, removed };
}
