// CL-210 (docs/budgets.md): the marine in the game drew about 100 meshes and each survivor 90-127, against budgets of
// 40 and 20. Every joint group is its own set of meshes and the wardrobe is many materials, so mergeRigidMeshes (one
// mesh a material a joint) could not go further. This bakes a rig's rigid parts into a few SkinnedMeshes whose bones
// are the very joint groups the pose code turns (each vertex weighted 1 to its own group, as CL-138 did for the dead):
//  - the plain parts (no textures, not glowing, not see-through) into ONE mesh, their colour, roughness and metalness
//    carried per vertex (a node material reads them);
//  - the textured parts (the camo cloth and the detail-mapped kit) into one mesh per material, drawn with that very
//    material, so a camo or colour change on it shows at once.
// Left as they are: the live cloth (its vertices move every frame), anything glowing or see-through, and anything not
// on the rig when it is baked (the guns, the knife, the lights come later and stay separate).
//
// Nothing else has to know. The source meshes stay where they were, with their own `visible` as the game sets it; they
// are only taken off the render layers (layers.mask 0). Each frame syncRigSkins() compares every source with what was
// baked (shown or not, its material, its colour, its place on its joint, its geometry): any change bakes the rig
// again. A source that keeps changing (three bakes in three seconds) is handed back and drawn on its own from then on.
//
// THREE needs SkinnedMesh, Skeleton and MeshStandardNodeMaterial, and TSL `attribute`: without them (the suite's fake
// three) nothing is baked and the rig draws as it always did.

const RIGS = new Set();   // WeakRefs: a figure that is let go (a camp's survivor after the run) is not kept alive here
const CHURN_N = 3, CHURN_S = 3;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

function textured(m) {
  return !!(m.map || m.normalMap || m.roughnessMap || m.metalnessMap || m.aoMap || m.bumpMap || m.alphaMap || m.emissiveMap || m.lightMap || m.displacementMap);
}
// Parts whose materials differ only in colour (a survivor's cap, pack and carrier on the same cloth detail maps).
const T_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap'];
function texKey(m) {
  const r = (v) => Math.round((v || 0) * 10);
  return 'tex|' + T_KEYS.map((k) => (m[k] ? m[k].uuid : '')).join('|') + '|' + m.side + '|' + !!m.flatShading + '|' + r(m.roughness) + '|' + r(m.metalness)
    + '|' + (m.bumpScale || 0) + '|' + (m.normalScale ? m.normalScale.x : 0) + '|' + (m.aoMapIntensity || 0) + '|' + (m.envMapIntensity == null ? 1 : m.envMapIntensity);
}
function glows(m) { return !!(m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity || 0) > 0); }
function bakeable(o, m, live = false) {
  if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.isNodeMaterial && m.userData && m.userData.rigSkin) return false;
  if (m.transparent || m.alphaTest > 0 || m.visible === false || m.wireframe || glows(m)) return false;
  if (o.isSkinnedMesh || o.isInstancedMesh || o.morphTargetInfluences) return false;
  const u = o.userData || {};
  if (u.noRigSkin || (u.liveShape || u.cloth) && !live) return false;
  return !!(o.geometry && o.geometry.attributes && o.geometry.attributes.position);
}

// What a source looks like now, as a flat list compared item by item.
function stateOf(rig, o, out) {
  out.length = 0;
  let shown = o.visible && !!o.parent;
  for (let p = o.parent; shown && p && p !== rig.root; p = p.parent) shown = p.visible;
  const m = o.material, g = o.geometry, c = m && m.color, e = m && m.emissive;
  out.push(shown ? 1 : 0, o.parent, m, g, g && g.attributes.position.version, g && g.attributes.color ? g.attributes.color.version : -1,
    m && m.version, c ? c.r : 0, c ? c.g : 0, c ? c.b : 0, m && m.roughness, m && m.metalness, e ? e.getHex() : 0, m && m.emissiveIntensity,
    m && m.transparent, m && m.opacity, m && m.side, m && m.flatShading, m && m.vertexColors,
    o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z);
  return out;
}
function same(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

// Live cloth (studio/marine-cloth.js, marine-waist.js) bends before its own draw; baked, it is asked here instead. A
// figure that stands still (a survivor at his post) never bends it and it stays baked; one that moves bends it every
// frame, and three bakes in three seconds hand it back to draw (and bend) itself.
function bendOf(root, o) {
  const u = o.userData || {};
  if (u.cloth && typeof u.cloth.bend === 'function') return u.cloth.bend;
  const w = root.userData && root.userData.waist;
  if (u.liveShape && w && w.mesh === o && typeof w.bend === 'function') return w.bend;
  return null;
}
function hide(o) { if (o.userData.rigSkinMask == null) o.userData.rigSkinMask = o.layers.mask; o.layers.mask = 0; }
function unhide(o) { if (o.userData.rigSkinMask != null) { o.layers.mask = o.userData.rigSkinMask; delete o.userData.rigSkinMask; } }

function buildSkins(THREE, TSL, rig) {
  const { root } = rig;
  for (const s of rig.skins) { if (s.parent) s.parent.remove(s); s.geometry.dispose(); }
  rig.skins = [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  // Plain parts by sidedness and shading; textured parts by their material.
  const sets = new Map();
  for (const src of rig.sources) {
    if (rig.out.has(src.o)) continue;
    const o = src.o, m = o.material;
    if (src.bend) src.bend();
    stateOf(rig, o, src.state);
    hide(o);
    if (!src.state[0] || !bakeable(o, m, rig.bakeLive)) { src.baked = false; if (!bakeable(o, m, rig.bakeLive)) unhide(o); continue; }
    src.baked = true;
    const own = textured(m) || m.isMeshPhysicalMaterial || m.isNodeMaterial;   // drawn with its own material
    const key = !own ? 'plain|' + m.side + '|' + !!m.flatShading : rig.mergeTextured && textured(m) && !m.isMeshPhysicalMaterial && !m.isNodeMaterial ? texKey(m) : m;
    let set = sets.get(key); if (!set) sets.set(key, set = []);
    set.push(o);
  }
  const M = new THREE.Matrix4(), NM = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const [key, parts] of sets) {
    const plain = typeof key === 'string' && key.startsWith('plain|'), shared = typeof key === 'string' && !plain;
    if (parts.length < 2) { for (const o of parts) { unhide(o); rig.byObj.get(o).baked = false; } continue; }
    const bones = [], boneIdx = new Map(), prep = [];
    let total = 0;
    for (const o of parts) {
      if (!boneIdx.has(o.parent)) { boneIdx.set(o.parent, bones.length); bones.push(o.parent); }
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      prep.push({ o, geo }); total += geo.attributes.position.count;
    }
    const mat0 = parts[0].material;
    const wantCol = plain || shared || !!mat0.vertexColors, wantUv = !plain;
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3);
    const col = wantCol ? new Float32Array(total * 3) : null, uv = wantUv ? new Float32Array(total * 2) : null;
    const rm = plain ? new Float32Array(total * 2) : null;
    const si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
    let k = 0;
    for (const { o, geo } of prep) {
      M.multiplyMatrices(inv, o.matrixWorld); NM.getNormalMatrix(M);
      const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color, U = geo.attributes.uv, b = boneIdx.get(o.parent);
      const m = o.material, mc = m.color, vc = !!(C && m.vertexColors);
      for (let i = 0; i < P.count; i++, k++) {
        v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        if (N) n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize(); else n.set(0, 1, 0);
        nrm[k * 3] = n.x; nrm[k * 3 + 1] = n.y; nrm[k * 3 + 2] = n.z;
        if (col) {
          let r = vc ? C.getX(i) : 1, gg = vc ? C.getY(i) : 1, bb = vc ? C.getZ(i) : 1;
          if ((plain || shared) && mc) { r *= mc.r; gg *= mc.g; bb *= mc.b; }
          col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = bb;
        }
        if (uv) { uv[k * 2] = U ? U.getX(i) : 0; uv[k * 2 + 1] = U ? U.getY(i) : 0; }
        if (rm) { rm[k * 2] = m.roughness != null ? m.roughness : 1; rm[k * 2 + 1] = m.metalness || 0; }
        si[k * 4] = b; sw[k * 4] = 1;
      }
      if (geo !== o.geometry) geo.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (rm) geo.setAttribute('dwRM', new THREE.BufferAttribute(rm, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.computeBoundingSphere();
    let mat = mat0;
    if (plain) {
      mat = rig.plainMats.get(key);
      if (!mat) {
        mat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, side: mat0.side, flatShading: !!mat0.flatShading });
        const rmA = TSL.attribute('dwRM', 'vec2');
        mat.roughnessNode = rmA.x; mat.metalnessNode = rmA.y;
        mat.name = 'rig-skin-plain'; mat.userData.rigSkin = true;
        rig.plainMats.set(key, mat);
      }
    }
    if (shared) {
      // Same textures, own colours: one copy of the first material, white, the colours in the vertices.
      mat = rig.plainMats.get(key);
      if (!mat) { mat = mat0.clone(); mat.vertexColors = true; if (mat.color) mat.color.setRGB(1, 1, 1); mat.name = 'rig-skin-' + (mat0.name || 'tex'); mat.userData = { ...(mat0.userData || {}), rigSkin: true }; rig.plainMats.set(key, mat); }
    }
    const skin = new THREE.SkinnedMesh(geo, mat);
    skin.name = 'rig-skin'; skin.userData.rigSkin = true; skin.userData.noRigSkin = true;
    skin.castShadow = parts.some((o) => o.castShadow); skin.receiveShadow = parts.some((o) => o.receiveShadow);
    skin.frustumCulled = false;
    root.add(skin);
    skin.updateMatrixWorld(true);
    skin.bind(new THREE.Skeleton(bones));
    rig.skins.push(skin);
  }
  rig.bakes++;
}

// Bake a rig: every mesh on it now (but not under `skip`) is a source from here on.
export function bakeRigSkin(THREE, TSL, root, { skip = [], mergeTextured = false, bakeLive = false } = {}) {
  if (!THREE || !THREE.SkinnedMesh || !THREE.Skeleton || !THREE.MeshStandardNodeMaterial || !TSL || !TSL.attribute || !root) return null;
  if (root.userData.rigSkin) return root.userData.rigSkin;
  const skipSet = new Set(skip.filter(Boolean));
  const sources = [];
  const walk = (o) => {
    if (skipSet.has(o)) return;
    if (o.isMesh && bakeable(o, o.material, bakeLive)) sources.push({ o, state: [], baked: false, hits: [], bend: bendOf(root, o) });
    for (const c of o.children) walk(c);
  };
  for (const c of root.children) walk(c);
  const rig = { THREE, TSL, root, sources, byObj: new Map(sources.map((s) => [s.o, s])), out: new Set(), skins: [], plainMats: new Map(), mergeTextured, bakeLive, bakes: 0, handedBack: 0, _st: [] };
  root.userData.rigSkin = rig;
  buildSkins(THREE, TSL, rig);
  RIGS.add(rig._ref = typeof WeakRef === 'function' ? new WeakRef(rig) : { deref: () => rig });
  return rig;
}

// Undo a bake: the sources draw themselves again.
export function unbakeRigSkin(root) {
  const rig = root && root.userData.rigSkin;
  if (!rig) return;
  for (const s of rig.skins) { if (s.parent) s.parent.remove(s); s.geometry.dispose(); }
  for (const src of rig.sources) unhide(src.o);
  RIGS.delete(rig._ref);
  delete root.userData.rigSkin;
}

function attached(o) { for (let p = o; p; p = p.parent) if (p.isScene) return true; return false; }

// Once a frame, before the render: re-bake any rig whose sources changed.
export function syncRigSkins() {
  const t = now();
  for (const ref of RIGS) {
    const rig = ref.deref();
    if (!rig) { RIGS.delete(ref); continue; }
    if (!attached(rig.root)) continue;
    let changed = null;
    for (const src of rig.sources) {
      if (rig.out.has(src.o)) continue;
      if (src.bend) src.bend();   // live cloth off the render layers bends only when asked
      if (!same(stateOf(rig, src.o, rig._st), src.state)) { changed = changed || []; changed.push(src); }
    }
    if (!changed) continue;
    for (const src of changed) {
      src.hits.push(t);
      while (src.hits.length && t - src.hits[0] > CHURN_S) src.hits.shift();
      if (src.hits.length >= CHURN_N) { rig.out.add(src.o); unhide(src.o); rig.handedBack++; }
    }
    buildSkins(rig.THREE, rig.TSL, rig);
  }
}

export function rigSkinInfo(root) {
  const rig = root && root.userData.rigSkin;
  if (!rig) return null;
  return { skins: rig.skins.length, sources: rig.sources.length, baked: rig.sources.filter((s) => s.baked).length, handedBack: [...rig.out].map((o) => o.name || o.parent && o.parent.name || '-'), bakes: rig.bakes };
}
export function rigSkinCount() { let n = 0; for (const ref of RIGS) if (ref.deref()) n++; return n; }
