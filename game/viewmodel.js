// game/viewmodel.js - CL-281 (J10-J17; docs/specs/first-person-1.2.md): the first-person view gun.
//
// In first person the eye used to look out of his head at his own arms and the gun they hold, so whatever the body
// did (the stride, the hold's reach, a wall in front of him) showed in the view. With a gun listed in
// game/viewmodel-poses.js the view now has its own forearms and hands (studio/fp-arms.js) on a copy of that gun,
// placed in the camera's space and drawn with their own projection (VM.fov, near 1 cm) pressed into the front of the
// depth range: in the world's one pass, lit by the world's own lights, shadows and the night's goggles, never through
// a wall. His body's arms and gun stay where they are for his shadow and are only left out of the eye's pass.
//
// The hands sit on the gun where the third-person hold has them (each wrist's place on the gun, read off his body
// while the hold is settled), the fingers as his fingers are. The forearms run from the wrists toward elbows below
// the view, the wrists bending at most VM.wristMax. On top: the sights onto the view's line (right-click), the sway
// of a turn and a strafe, the walk's bob, breathing, a landing's dip, the recoil and the slide's kick, and the reload
// worked in front of the eye (VM_RELOADS).
//
// index.html calls update(dt, state) each frame before it draws and place() in renderFrame; it asks muzzleWorld()
// where the view gun's muzzle appears (the laser leaves from there).
import { VM, VM_POSES, VM_RELOADS } from './viewmodel-poses.js';
import { SIGHT } from './sight-points.js';
import { buildViewArm, wristSpacePoint, HAND_SCALE } from '../studio/fp-arms.js';
import { copyPose, lerpPose, HAND_POSES } from '../studio/marine-hand.js';
import { ITEM_POSES, gripPose } from '../studio/hand-grips.js';
import { flippedTwin, needsFlip } from './vm-flip.js';

const smooth = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ARM_CLOTH = new Set(['live-sleeve', 'live-sleeve-rolled', 'live-bare-arm']);

export function createViewmodel(ctx) {
  const { THREE: T, TSL, renderer, scene, camera, marine } = ctx;
  const weaponMeshes = ctx.weaponMeshes;
  const holdOf = (k) => (ctx.hold ? ctx.hold(k) : null);
  const V3 = () => new T.Vector3(), Q = () => new T.Quaternion(), M4 = () => new T.Matrix4();

  const root = new T.Group(); root.name = 'viewmodel'; root.visible = false; root.matrixAutoUpdate = true;
  scene.add(root);
  // AG-168 (D-75: he is left-handed; his gun hand is his anatomical left): the view shows his hold mirrored, so first
  // person reads as a traditional shooter's (J12), the gun low right, the firing hand from the right. Everything below
  // `space` is his own hold; VM.mirror flips it. The tables are written as the eye sees them (screen terms) and turned
  // into his space here (mx below).
  const MX = VM.mirror ? -1 : 1;
  const space = new T.Group(); space.name = 'vm-space'; space.scale.set(MX, 1, 1); root.add(space);
  const gunHolder = new T.Group(); gunHolder.name = 'vm-gun'; space.add(gunHolder);
  // AG-168 v2: on the WebGPU backend the mirror drew everything below `space` inside out (r175 doesn't flip the front
  // face for a mirrored mesh; game/vm-flip.js). There each mesh below it draws a twin of its geometry wound the other way.
  const FLIP = needsFlip(renderer, MX < 0);
  const geoOf = (g) => (FLIP && g ? flippedTwin(T, g) : g);
  const flipMeshes = (o) => { if (FLIP) o.traverse((m) => { if (m.isMesh && m.geometry) m.geometry = geoOf(m.geometry); }); };

  // --- the projection: in the materials' vertex stage when the renderer has node materials ---------------------
  const zMin = renderer && renderer.coordinateSystem === 2000 ? -1 : 0;   // WebGL clip z runs -w..w, WebGPU 0..w
  const projU = TSL && typeof TSL.uniform === 'function' ? TSL.uniform(new T.Matrix4()) : null;
  const canHack = !!(projU && TSL.positionView && typeof TSL.vec4 === 'function' && renderer && renderer.library && typeof renderer.library.fromMaterial === 'function');
  const proj = { fov: VM.fov, aspect: 1, e: new Float32Array(16) };
  function vmMVP() {
    const c = projU.mul(TSL.positionView);
    return TSL.vec4(c.x, c.y, c.z.sub(c.w.mul(zMin)).mul(VM.depth).add(c.w.mul(zMin)), c.w);
  }
  function updateProjection(fov) {
    const aspect = camera.aspect || 1, n = VM.near, f = VM.far, t = Math.tan(fov * Math.PI / 360);
    proj.fov = fov; proj.aspect = aspect;
    const e = proj.e; e.fill(0);
    e[0] = 1 / (aspect * t); e[5] = 1 / t; e[11] = -1;
    if (zMin < 0) { e[10] = (f + n) / (n - f); e[14] = 2 * f * n / (n - f); } else { e[10] = f / (n - f); e[14] = f * n / (n - f); }
    if (projU && projU.value && projU.value.elements) { const d = projU.value.elements; for (let i = 0; i < 16; i++) d[i] = e[i]; }
  }

  // --- materials: a copy of each source, its vertex stage swapped -----------------------------------------------
  const vmMats = new Map();   // key -> { src, mat, version, map }
  function makeVmMat(src, noVC) {
    let m;
    const ud = src.userData;
    try { m = src.clone(); } catch (_) { src.userData = {}; m = src.clone(); src.userData = ud; }
    if (canHack && !m.isNodeMaterial) { try { m = renderer.library.fromMaterial(m) || m; } catch (_) { /* plain copy */ } }
    if (canHack && m.isNodeMaterial) {
      m.setupModelViewProjection = vmMVP;
      const base = m.customProgramCacheKey;
      m.customProgramCacheKey = function () { return (base ? base.call(this) : '') + '|vm281'; };
    }
    if (noVC) m.vertexColors = false;
    m.fog = false;
    m.name = 'vm:' + (src.name || src.type || '');
    m.userData = { vm281: true };
    return m;
  }
  function vmMaterial(src, noVC = false) {
    if (!src) return src;
    if (Array.isArray(src)) return src.map((s) => vmMaterial(s, noVC));
    const key = noVC ? 'n|' + src.uuid : src.uuid;
    let e = vmMats.get(key);
    if (e && e.version === src.version && e.map === src.map && e.transparent === src.transparent) return e.mat;
    const mat = makeVmMat(src, noVC);
    if (e && e.mat && e.mat.dispose) { try { e.mat.dispose(); } catch (_) {} }
    vmMats.set(key, e = { src, mat, version: src.version, map: src.map, transparent: src.transparent });
    return mat;
  }
  // What the game changes on a material from frame to frame (the flash's fade, a glow's colour).
  function mirrorMaterial(src, m) {
    if (!src || !m || Array.isArray(src)) return;
    if (src.color && m.color) m.color.copy(src.color);
    if (src.emissive && m.emissive) m.emissive.copy(src.emissive);
    if (src.emissiveIntensity != null) m.emissiveIntensity = src.emissiveIntensity;
    if (src.opacity != null) m.opacity = src.opacity;
    m.visible = src.visible !== false;
  }

  // --- his body's arms and gun: out of the eye's pass, still in the shadows' -------------------------------------
  let hidden = new Set(), hideOn = false, filterOn = false, prevFn = null, hideStamp = '';
  const canFilter = !!(renderer && typeof renderer.setRenderObjectFunction === 'function' && typeof renderer.renderObject === 'function');
  const filter = function (object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId) {
    if (hideOn && object.userData && object.userData.vmEyeHide === true) return;
    if (prevFn) prevFn(object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId);
    else renderer.renderObject(object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId);
  };
  function setFilter(on) {
    if (!canFilter || on === filterOn) return;
    if (on) { const f = renderer.getRenderObjectFunction ? renderer.getRenderObjectFunction() : null; prevFn = typeof f === 'function' && f !== filter ? f : null; renderer.setRenderObjectFunction(filter); }
    else { renderer.setRenderObjectFunction(prevFn); prevFn = null; }
    filterOn = on;
  }
  function eyeHideSet(gunSrc) {
    const ud = marine.userData, set = new Set();
    const add = (o) => { if (o && (o.isMesh || o.isSkinnedMesh)) set.add(o); };
    // The lasers' beams stay in (the gun he holds hangs on his right forearm, so its beam is under his arm too).
    const beams = new Set(); for (const k in weaponMeshes) { const g = weaponMeshes[k]; if (g && g.userData && g.userData.laser) beams.add(g.userData.laser); }
    const walkArm = (o) => { if (beams.has(o)) return; add(o); for (const c of o.children) walkArm(c); };
    for (const a of [ud.armLG, ud.armRG]) if (a) walkArm(a);
    // AG-168 (defect 2): the guns slung on his back and holstered under his arms poked into the view (looking down, and
    // over the slide in the reload); out of the eye too.
    for (const g of (ctx.stowed ? ctx.stowed() : [])) if (g) walkArm(g);
    const rig = ud.rigSkin;
    if (rig && rig.skins) for (const s of rig.skins) if (s.userData && s.userData.rigSplit) set.add(s);
    marine.traverse((o) => { if (o.isMesh && ARM_CLOTH.has(o.name)) set.add(o); });
    if (gunSrc) {
      const laser = gunSrc.userData && gunSrc.userData.laser;
      const walk = (o) => { if (o === laser) return; add(o); for (const c of o.children) walk(c); };
      walk(gunSrc);
    }
    return set;
  }
  // MU-11 (finding 1): his gun's nodes are counted once every 15th frame (it was twice a frame), for both the eye-hide's
  // stamp and the copy's rebuild.
  let nodeCount = 0, nodeCountFor = null, nodeAge = 0, stowCount = 0, stowAge = 99;
  function stowedNodes() {
    if (++stowAge < 15) return stowCount;
    stowAge = 0; stowCount = 0;
    for (const g of (ctx.stowed ? ctx.stowed() : [])) if (g) g.traverse(() => { stowCount++; });
    return stowCount;
  }
  function gunNodes(src) {
    if (!src) return 0;
    if (src !== nodeCountFor || ++nodeAge >= 15) { nodeCount = countNodes(src); nodeCountFor = src; nodeAge = 0; }
    return nodeCount;
  }
  function setEyeHide(on, gunSrc) {
    const rig = marine.userData.rigSkin;
    const stamp = on ? (gunSrc ? gunSrc.uuid : '-') + '|' + (rig ? rig.bakes : 0) + '|' + gunNodes(gunSrc) + '|' + stowedNodes() : '';
    if (stamp === hideStamp && on === hideOn) return;
    const next = on ? eyeHideSet(gunSrc) : new Set();
    for (const o of hidden) if (!next.has(o)) o.userData.vmEyeHide = false;
    for (const o of next) o.userData.vmEyeHide = true;
    hidden = next; hideOn = on; hideStamp = stamp;
    setFilter(on);
  }
  function countNodes(o) { let n = 0; o.traverse(() => { n++; }); return n; }

  // --- the arms ---------------------------------------------------------------------------------------------------
  let arms = null;
  // His own lower arm's parts, to read their materials and which are worn (the glove or the bare hand, sleeves down
  // or rolled).
  function bodyArm(side) {
    const ud = marine.userData, elbow = side > 0 ? ud.elbowRG : ud.elbowLG;
    const wrist = elbow && elbow.userData && elbow.userData.wrist;
    if (!wrist) return null;
    let glove = null, bare = null, rolled = null;
    for (const c of wrist.children) {
      const hands = c.children.filter((m) => m.isMesh && m.name === 'gb152-hand');
      if (hands.length >= 2) glove = { g: c, main: hands[0], pads: hands[1] }; else if (hands.length === 1) bare = { g: c, main: hands[0] };
    }
    for (const c of elbow.children) { let has = false; c.traverse((o) => { if (o.name === 'wrist-continuous-skin') has = true; }); if (has && c !== wrist) { rolled = c; break; } }
    return { elbow, wrist, glove, bare, rolled };
  }
  function bodyMats() {
    let uniform = null, skin = null;
    marine.traverse((o) => { if (!o.isMesh) return; if (!uniform && o.name === 'live-sleeve') uniform = o.material; if (!skin && o.name === 'live-bare-arm') skin = o.material; });
    const r = bodyArm(1);
    if (!skin && r && r.bare) skin = r.bare.main.material;
    return { uniform, skin, glove: r && r.glove ? r.glove.main.material : skin, pads: r && r.glove ? r.glove.pads.material : null };
  }
  let matStamp = '', bodyCache = null, bodyAge = 0;
  // His arm's parts and materials, looked up again every half second or so (and after a re-bake of his rig).
  function body() {
    const bakes = marine.userData.rigSkin ? marine.userData.rigSkin.bakes : 0;
    // MU-11 (finding 5): a change of camo, gloves or sleeves bakes him again, so that alone refreshes it (and every 10 s).
    if (!bodyCache || ++bodyAge > 600 || bodyCache.bakes !== bakes) { bodyCache = { mats: bodyMats(), r: bodyArm(1), l: bodyArm(-1), bakes }; bodyAge = 0; }
    return bodyCache;
  }
  function syncArmMaterials() {
    const m = body().mats;
    const stamp = [m.uniform, m.skin, m.glove, m.pads].map((x) => (x ? x.uuid + ':' + x.version + ':' + (x.map ? x.map.uuid : '') : '-')).join('|');
    if (stamp === matStamp && arms) return;
    const vm = { uniform: vmMaterial(m.uniform, true), skin: vmMaterial(m.skin, true), glove: vmMaterial(m.glove, true), pads: vmMaterial(m.pads, true) };
    if (!arms) { arms = { r: buildViewArm(T, 1, vm), l: buildViewArm(T, -1, vm) }; flipMeshes(arms.r.root); flipMeshes(arms.l.root); }
    else { arms.r.setMaterials(vm); arms.l.setMaterials(vm); }
    if (!arms.r.root.parent) space.add(arms.r.root, arms.l.root);
    matStamp = stamp;
  }

  // --- the gun's copy ------------------------------------------------------------------------------------------------
  let gun = null;   // { key, src, root, pairs, slide, mag, flash, nodes, s, foot, magBase }
  function cloneLean(src, pairs, skip) {
    let o;
    if (src.isMesh) {
      o = new T.Mesh(geoOf(src.geometry), vmMaterial(src.material));
      o.castShadow = false; o.receiveShadow = !!src.receiveShadow; o.frustumCulled = false; o.renderOrder = src.renderOrder || 0;
    } else o = new T.Group();
    o.name = src.name; o.position.copy(src.position); o.quaternion.copy(src.quaternion); o.scale.copy(src.scale); o.visible = src.visible;
    pairs.push([src, o]);
    for (const c of src.children) { if (skip.has(c) || c.isLight || c.isCamera) continue; o.add(cloneLean(c, pairs, skip)); }
    return o;
  }
  function dropGun() {
    if (!gun) return;
    gunHolder.remove(gun.root);
    gun = null;
  }
  function buildGun(key) {
    dropGun();
    const src = weaponMeshes[key];
    if (!src) return;
    const ud = src.userData || {}, pairs = [], skip = new Set([ud.laser].filter(Boolean));
    const r = cloneLean(src, pairs, skip);
    r.position.set(0, 0, 0); r.quaternion.set(0, 0, 0, 1); r.scale.set(1, 1, 1);
    gunHolder.add(r);
    const map = new Map(pairs);
    S.lastFlashT = null;
    // MU-11 (finding 3): the palm ride and the slide's grab work in the gun root's space: a magazine or slide deeper in the
    // gun's tree is left to his own gun's animation (mirrored) instead.
    const direct = (o) => (o && o.parent === src ? o : null);
    gun = { key, src, root: r, pairs, map, slide: map.get(direct(ud.slide)) || null, mag: map.get(direct(ud.mag)) || null, flash: map.get(ud.flash) || null,
      nodes: countNodes(src), s: 1, foot: null, magBase: null };
    gun.pairs = pairs.filter(([s]) => s !== src);   // the copy's root is placed here, not mirrored
    if (gun.mag && ud.baseMagPos) {
      const mp = ud.baseMagPos, mr = ud.baseMagRot;
      const q = Q(); if (mr) q.setFromEuler(mr); else q.copy(gun.mag.quaternion);
      gun.magBase = { pos: mp.clone(), quat: q, scale: gun.mag.scale.clone() };
    }
  }
  // An object's own-space bounds from its meshes' vertices (studio code's reloadLocalBox, here for the copy).
  function localBox(obj) {
    obj.updateMatrixWorld(true);
    const inv = M4().copy(obj.matrixWorld).invert(), m = M4(), v = V3(), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    obj.traverse((o) => {
      const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!pa) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pa.count; i++) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
        lo[0] = Math.min(lo[0], v.x); lo[1] = Math.min(lo[1], v.y); lo[2] = Math.min(lo[2], v.z);
        hi[0] = Math.max(hi[0], v.x); hi[1] = Math.max(hi[1], v.y); hi[2] = Math.max(hi[2], v.z);
      }
    });
    return lo[0] === Infinity ? null : { min: new T.Vector3(lo[0], lo[1], lo[2]), max: new T.Vector3(hi[0], hi[1], hi[2]) };
  }

  // --- frames: { p, q, s } (position, rotation, uniform scale) ------------------------------------------------------
  // Scratch objects: nothing below allocates per frame (CL-220's rule: no garbage on the frame's path).
  const _fsc = V3(), _mp = V3(), _mq = Q(), _bm = M4(), _eq = Q(), _sinv = M4(), _dp = V3(), _dq = Q(), _dsc = V3();
  const AX_X = new T.Vector3(1, 0, 0), AX_Y = new T.Vector3(0, 1, 0), AX_Z = new T.Vector3(0, 0, 1);
  const F = () => ({ p: V3(), q: Q(), s: 1 });
  const fromMatrix = (m, f) => { m.decompose(f.p, f.q, _fsc); f.s = Math.abs(_fsc.x) || 1; return f; };
  const mul = (a, b, out) => {   // out = a * b (out may be a or b)
    _mp.copy(b.p).multiplyScalar(a.s).applyQuaternion(a.q).add(a.p);
    _mq.copy(a.q).multiply(b.q);
    const s = a.s * b.s;
    out.p.copy(_mp); out.q.copy(_mq); out.s = s; return out;
  };
  const lerpF = (a, b, t, out) => { out.p.copy(a.p).lerp(b.p, t); out.q.copy(a.q).slerp(b.q, t); out.s = a.s + (b.s - a.s) * t; return out; };
  const basisQ = (x, y, z, q) => {   // a rotation whose columns are x, y, z
    _bm.set(x.x, y.x, z.x, 0, x.y, y.y, z.y, 0, x.z, y.z, z.z, 0, 0, 0, 0, 1); return q.setFromRotationMatrix(_bm);
  };
  // yaw about view y, pitch about view x, roll about view z, applied to a bore that already points ahead.
  const eulerQ = (yaw, pitch, roll, q) => q.setFromAxisAngle(AX_Y, yaw).multiply(_eq.setFromAxisAngle(AX_X, pitch)).multiply(_eq.setFromAxisAngle(AX_Z, roll));
  const BORE_AHEAD = Q().setFromAxisAngle(AX_Y, Math.PI);   // the gun's +z (its bore) onto the view's -z

  // --- where each hand sits on the gun: read off his body while the hold is settled --------------------------------
  const sockets = { key: null, r: null, l: null, poseR: copyPose(HAND_POSES.relaxed), poseL: copyPose(HAND_POSES.relaxed) };
  const _sm = M4(), _sf = F();
  function readSockets(key, settled, dt) {
    const ud = marine.userData, src = weaponMeshes[key];
    const wr = ud.elbowRG && ud.elbowRG.userData.wrist, wl = ud.elbowLG && ud.elbowLG.userData.wrist;
    if (!src || !wr || !wl) return;
    if (wr.userData.hand) copyPose(wr.userData.hand.pose, sockets.poseR);
    if (wl.userData.hand) copyPose(wl.userData.hand.pose, sockets.poseL);
    const first = sockets.key !== key || !sockets.r;
    if (!first && !settled) return;
    src.updateWorldMatrix(true, false); wr.updateWorldMatrix(true, false); wl.updateWorldMatrix(true, false);
    const inv = _sinv.copy(src.matrixWorld).invert();
    const k = first ? 1 : 1 - Math.exp(-4 * dt);
    for (const [side, w] of [['r', wr], ['l', wl]]) {
      _sm.multiplyMatrices(inv, w.matrixWorld); fromMatrix(_sm, _sf);
      if (first || !sockets[side]) sockets[side] = { p: _sf.p.clone(), q: _sf.q.clone(), s: _sf.s };
      else lerpF(sockets[side], _sf, k, sockets[side]);
    }
    sockets.key = key;
  }

  // --- springs ---------------------------------------------------------------------------------------------------
  const spring = (c) => ({ x: [0, 0, 0], v: [0, 0, 0], t: [0, 0, 0], k: c.k, c: 2 * c.z * Math.sqrt(c.k) });
  const sp = { pos: spring(VM.spring.pos), rot: spring(VM.spring.rot) };
  function stepSpring(s, dt) {
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const acc = -s.k * (s.x[a] - s.t[a]) - s.c * s.v[a]; s.v[a] += acc * h; s.x[a] += s.v[a] * h; }
  }

  // --- state ------------------------------------------------------------------------------------------------------
  const S = { raise: 0, want: null, ads: 0, bobPhase: 0, bobW: 0, time: 0, lastFlashT: null, slideT: 9, wasGrounded: true, fallV: 0,
    camQ: null, reloadU: null, shots: 0, lastPlace: null };
  const G = F();                 // the gun's frame in view space this frame
  const WR = F(), WL = F();      // the wrists' frames in view space
  const info = { active: false, key: null, raise: 0, ads: 0, wrist: { r: 0, l: 0 }, magState: 'seated', handPlace: 'fore', reloadU: null, hack: canHack, filter: canFilter, flip: FLIP, wristMax: VM.wristMax };

  const _pz = V3(), _py = V3(), _pat = V3(), _px = V3(), _pinv = Q(), _pg = V3(), _ppalm = V3();
  // The left hand's places through a reload, as wrist frames in the gun's own space.
  function placeFrame(name, R, u, out) {
    const pl = R.places, arm = arms.l, sL = sockets.l;
    if (name === 'fore' || !gun) { out.p.copy(sL.p); out.q.copy(sL.q); out.s = sL.s; return out; }
    const z = _pz, y = _py, at = _pat;
    if (name === 'pouch') {
      const g = G, inv = _pinv.copy(g.q).invert();
      at.set(pl.pouch.at[0] * MX, pl.pouch.at[1], pl.pouch.at[2]).sub(g.p).applyQuaternion(inv).multiplyScalar(1 / g.s);
      z.set(pl.pouch.z[0] * MX, pl.pouch.z[1], pl.pouch.z[2]).applyQuaternion(inv); y.set(pl.pouch.y[0] * MX, pl.pouch.y[1], pl.pouch.y[2]).applyQuaternion(inv);
    } else if (name === 'work' && gun.slide) {
      if (!gun.grab) { const b = localBox(gun.slide); gun.grab = b ? new T.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.25 * (b.max.y - b.min.y), b.min.z + 0.25 * (b.max.z - b.min.z)) : V3(); }
      gun.slide.updateMatrix();
      at.copy(gun.grab).add(_pg.set(pl.work.grab[0], pl.work.grab[1], pl.work.grab[2])).applyMatrix4(gun.slide.matrix);
      z.set(...pl.work.z); y.set(...pl.work.y);
    } else {
      if (!gun.foot) footOf();
      if (gun.foot) at.copy(gun.foot); else at.set(0, 0, 0);
      if (name === 'below') at.y -= pl.below.drop;
      z.set(...pl.well.z); y.set(...pl.well.y);
    }
    z.normalize(); y.addScaledVector(z, -y.dot(z)).normalize();
    const x = _px.crossVectors(y, z);
    basisQ(x, y, z, out.q);
    out.s = sL.s;
    const palm = wristSpacePoint(arm, 'palm', _ppalm).multiplyScalar(out.s).applyQuaternion(out.q);
    out.p.copy(at).sub(palm);
    return out;
  }
  function footOf() {
    if (!gun.mag || !gun.magBase) { gun.foot = null; return; }
    const keep = { p: gun.mag.position.clone(), q: gun.mag.quaternion.clone() };
    gun.mag.position.copy(gun.magBase.pos); gun.mag.quaternion.copy(gun.magBase.quat);
    const b = localBox(gun.mag);
    const inMag = b ? new T.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2) : V3();
    gun.mag.updateMatrix();
    gun.foot = inMag.applyMatrix4(gun.mag.matrix);
    gun.mag.position.copy(keep.p); gun.mag.quaternion.copy(keep.q);
  }
  const POSES = { mag: gripPose(ITEM_POSES.mag), pouch: gripPose(ITEM_POSES.pouch), cup: gripPose(ITEM_POSES.cup), pinch: gripPose(ITEM_POSES.pinch), open: copyPose(HAND_POSES.open) };
  const fingerPose = (name) => (name === 'fore' ? sockets.poseL : POSES[name] || sockets.poseL);
  const _ka = F(), _kb = F(), _pa = copyPose(HAND_POSES.relaxed);
  function reloadHand(R, u, out) {
    const K = R.hand;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    placeFrame(K[i][1], R, u, _ka); placeFrame(K[j][1], R, u, _kb);
    lerpF(_ka, _kb, t, out);
    lerpPose(fingerPose(K[i][2]), fingerPose(K[j][2]), t, _pa);
    info.handPlace = t < 0.5 ? K[i][1] : K[j][1];
    return _pa;
  }
  function reloadGunOffset(R, u, pos, rot) {
    const K = R.gun;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    const a = K[i][1], b = K[j][1];
    for (let c = 0; c < 3; c++) {
      pos[c] = (a ? a.pos[c] : 0) * (1 - t) + (b ? b.pos[c] : 0) * t;
      rot[c] = (a ? a.rot[c] : 0) * (1 - t) + (b ? b.rot[c] : 0) * t;
    }
  }
  function magState(R, u) {
    const m = R.mag;
    if (u == null || u < m.grab || u >= m.seat) return 'seated';
    if (u >= m.swapOut && u < m.swapIn) return 'pouch';
    return 'hand';
  }

  // AG-168 (the GPU's first look: the forearms came straight at the eye, the right one across the body): a hand on a
  // grip may turn round it in its fist, so before the wrist bends, the hand turns round its grip channel (its own x
  // through the channel's middle, which stays put) toward its elbow, at most VM.twistMax.
  const _ta = V3(), _ty = V3(), _td = V3(), _tc = V3(), _tq = Q(), _tp = V3();
  function twistToward(arm, W, hint) {
    _ta.set(1, 0, 0).applyQuaternion(W.q);
    _ty.set(0, 1, 0).applyQuaternion(W.q).addScaledVector(_ta, -_ty.set(0, 1, 0).applyQuaternion(W.q).dot(_ta));
    _td.set(hint[0], hint[1], hint[2]).sub(W.p); _td.addScaledVector(_ta, -_td.dot(_ta));
    if (_ty.lengthSq() < 1e-10 || _td.lengthSq() < 1e-10) return 0;
    _ty.normalize(); _td.normalize();
    let ang = Math.atan2(_tp.crossVectors(_ty, _td).dot(_ta), _ty.dot(_td));
    ang = clamp(ang, -VM.twistMax, VM.twistMax);
    wristSpacePoint(arm, 'grip', _tc).multiplyScalar(W.s).applyQuaternion(W.q).add(W.p);   // the channel's middle
    _tq.setFromAxisAngle(_ta, ang);
    W.q.premultiply(_tq);
    W.p.sub(_tc).applyQuaternion(_tq).add(_tc);
    return ang;
  }
  // Put an arm's wrist on frame W (view space) and point its forearm at the elbow hint, the wrist bending at most max.
  const _y = V3(), _d = V3(), _ax = V3(), _qs = Q(), _qe = Q(), _wp = V3(), _qa = Q();
  function poseArm(arm, W, hint, max) {
    _y.set(0, 1, 0).applyQuaternion(W.q);
    _d.set(hint[0], hint[1], hint[2]).sub(W.p).normalize();
    let ang = Math.acos(clamp(_y.dot(_d), -1, 1));
    if (ang > max) {
      _ax.crossVectors(_y, _d); if (_ax.lengthSq() < 1e-10) _ax.set(1, 0, 0); _ax.normalize();
      _d.copy(_y).applyQuaternion(_qa.setFromAxisAngle(_ax, max)); ang = max;
    }
    _qs.setFromUnitVectors(_y, _d);
    _qe.copy(_qs).multiply(W.q);
    const se = W.s / HAND_SCALE, L = arm.layout;
    arm.root.quaternion.copy(_qe);
    arm.root.scale.set(se, se, se);
    _wp.set(L.wrist[0], L.wrist[1], L.wrist[2]).multiplyScalar(se).applyQuaternion(_qe);
    arm.root.position.copy(W.p).sub(_wp);
    arm.wrist.quaternion.copy(_qe).invert().multiply(W.q);
    arm.wrist.position.set(L.wrist[0], L.wrist[1], L.wrist[2]);
    arm.wrist.scale.setScalar(HAND_SCALE);
    return ang;
  }
  // The worn parts as his: the glove or the bare hand, the sleeve down or rolled.
  function mirrorWorn(arm, side) {
    const b = side > 0 ? body().r : body().l;
    if (!b) return;
    const gloveOn = b.glove ? b.glove.g.visible : !b.bare;
    arm.parts.glove.visible = gloveOn; arm.parts.bare.visible = !gloveOn;
    const rolled = !!(b.rolled && b.rolled.visible);
    arm.parts.rolled.visible = rolled; arm.parts.sleeve.visible = !rolled;
  }

  // The view gun's frame for this frame (view space), from the pose, the springs and the reload.
  const _hipQ = Q(), _adsQ = Q(), _hipP = V3(), _adsP = V3(), _gp = V3(), _rq = Q(), _grip = V3(), _cdq = Q(), _ciq = Q(), _lv = V3(), _off = V3(), _rqq = Q();
  const _rpos = [0, 0, 0], _rrot = [0, 0, 0];
  const adsCache = {};   // per gun: the sights' turn and the rear sight (its own space), constants
  function adsOf(key) {
    if (adsCache[key] !== undefined) return adsCache[key];
    const sg = SIGHT[key];
    if (!sg) return (adsCache[key] = null);
    const f = new T.Vector3(sg.fwd[0], sg.fwd[1], sg.fwd[2]).normalize();
    const u = new T.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize();
    const r = new T.Vector3().crossVectors(f, u);
    // gun basis [r, u, f] onto the view's [x, y, -z]: R = Bv * Bg^T
    const m = M4(); m.set(r.x, r.y, r.z, 0, u.x, u.y, u.z, 0, -f.x, -f.y, -f.z, 0, 0, 0, 0, 1);
    const q = Q().setFromRotationMatrix(m);
    const rear = sg.notch ? new T.Vector3(0, sg.notch[1], sg.notch[0]) : new T.Vector3(sg.pos[0], sg.pos[1], sg.pos[2]);
    return (adsCache[key] = { q, rear });
  }
  function gunFrame(P, key, st, dt) {
    const s = gun.s, H = holdOf(key), grip = H && H.grip ? _grip.set(H.grip[0], H.grip[1], H.grip[2]) : _grip.set(0, 0, 0);
    // hip
    eulerQ(P.hip.yaw * MX, P.hip.pitch, P.hip.roll * MX, _hipQ).multiply(BORE_AHEAD);
    _hipP.set(P.hip.at[0] * MX, P.hip.at[1], P.hip.at[2]).sub(_gp.copy(grip).multiplyScalar(s).applyQuaternion(_hipQ));
    // down the sights: the sight line onto the view's centre line, the rear sight P.ads.rear ahead of the eye
    const ad = adsOf(key);
    if (ad) {
      _adsQ.copy(ad.q);
      _adsP.set(0, 0, -P.ads.rear).sub(_gp.copy(ad.rear).multiplyScalar(s).applyQuaternion(_adsQ));
    } else { _adsQ.copy(_hipQ); _adsP.copy(_hipP); }
    const a = smooth(st.ads || 0);
    G.p.copy(_hipP).lerp(_adsP, a); G.q.copy(_hipQ).slerp(_adsQ, a); G.s = s;
    // the pivot for the offsets' turns: the grip
    const pivot = _gp.copy(grip).multiplyScalar(s).applyQuaternion(G.q).add(G.p);
    // the view's turn since the last frame (camera space), for the sway
    const cq = camera.quaternion;
    let wy = 0, wx = 0;
    if (S.camQ && dt > 0) { const d = _cdq.copy(S.camQ).invert().multiply(cq); const sgn = d.w < 0 ? -1 : 1; wx = 2 * d.x * sgn / dt; wy = 2 * d.y * sgn / dt; }
    S.camQ = (S.camQ || Q()).copy(cq);
    const sw = VM.sway, adsK = 1 + (sw.ads - 1) * a;
    const lim = sw.lookMax;
    // velocity in the view's space
    const vx = st.vx || 0, vz = st.vz || 0, inv = _ciq.copy(cq).invert(), lv = _lv.set(vx, 0, vz).applyQuaternion(inv);
    sp.rot.t[0] = clamp(-wy * sw.look, -lim, lim) * adsK * MX;     // yaw lags the turn (as the eye sees it)
    sp.rot.t[1] = clamp(-wx * sw.look, -lim, lim) * adsK;          // pitch lags
    sp.rot.t[2] = clamp(wy * sw.look * 0.6 - lv.x * sw.move * 1.5, -lim, lim) * adsK * MX;   // a little roll into the turn and the strafe
    sp.pos.t[0] = clamp(-lv.x * sw.move, -0.03, 0.03) * adsK * MX;
    sp.pos.t[1] = 0; sp.pos.t[2] = clamp(-lv.z * sw.move * 0.5, -0.02, 0.02) * adsK;
    // landing
    if (st.grounded && !S.wasGrounded) { const dip = Math.min(VM.land.max, Math.abs(S.fallV) * VM.land.per); sp.pos.v[1] -= dip * 28; sp.rot.v[1] -= dip * 9; }
    S.wasGrounded = !!st.grounded; if (!st.grounded) S.fallV = st.vy || 0;
    // the shot: recoil and the slide
    const ft = gun.src.userData.shots | 0;   // index.html triggerMuzzleFlash counts them
    if (ft !== S.lastFlashT && S.lastFlashT != null) {
      const k = P.kick, m = 1 + (k.ads - 1) * a;
      sp.pos.x[2] += k.back * m; sp.rot.x[1] += k.up * m; sp.rot.x[0] += (Math.random() - 0.5) * 2 * k.side * m; S.slideT = 0; S.shots++;
    }
    S.lastFlashT = ft;
    stepSpring(sp.pos, dt); stepSpring(sp.rot, dt);
    // the walk's bob and breathing
    const speed = Math.hypot(vx, vz), b = VM.bob, bw = st.grounded ? Math.min(1, speed / 4) : 0;
    S.bobW += (bw - S.bobW) * (1 - Math.exp(-8 * dt));
    S.bobPhase += dt * speed * b.rate * Math.PI;
    S.time += dt;
    const bk = S.bobW * (1 + (b.ads - 1) * a), br = VM.breathe, bth = Math.sin(S.time * Math.PI * 2 * br.rate) * (1 + (br.ads - 1) * a);
    const off = _off.set(sp.pos.x[0] + Math.sin(S.bobPhase) * b.x * bk, sp.pos.x[1] + (Math.cos(2 * S.bobPhase) - 1) * 0.5 * b.y * bk + bth * br.y, sp.pos.x[2]);
    const rq = eulerQ(sp.rot.x[0], sp.rot.x[1] + bth * br.pitch, sp.rot.x[2] + Math.sin(S.bobPhase) * b.roll * bk, _rqq);
    // the reload's own moves
    const R = P.reload && VM_RELOADS[P.reload];
    if (R && st.reloadU != null) {
      const pos = _rpos, rot = _rrot;
      reloadGunOffset(R, st.reloadU, pos, rot);
      pos[0] *= MX; rot[0] *= MX; rot[2] *= MX;   // written as the eye sees it
      const k = 1 - a * 0.7;
      off.x += pos[0] * k; off.y += pos[1] * k; off.z += pos[2] * k;
      rq.multiply(eulerQ(rot[0] * k, rot[1] * k, rot[2] * k, _rq));
    }
    // raised from below
    const lo = 1 - smooth(S.raise);
    off.y -= 0.26 * lo; off.z += 0.06 * lo;
    rq.multiply(_eq.setFromAxisAngle(AX_X, -0.85 * lo));
    // turns about the grip, then the offset
    G.p.sub(pivot).applyQuaternion(rq).add(pivot).add(off);
    G.q.premultiply(rq);
  }

  function mirrorParts() {
    for (const [s, o] of gun.pairs) {
      o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.scale.copy(s.scale); o.visible = s.visible;
      if (o.isMesh) { const g = geoOf(s.geometry); if (o.geometry !== g) o.geometry = g; }   // MU-11 (finding 2): a part's shape swapped in place (its twin under the mirror on WebGPU)
      if (o.isMesh && s.material && !Array.isArray(s.material)) {
        const want = vmMaterial(s.material);
        if (o.material !== want) o.material = want;
        mirrorMaterial(s.material, o.material);
      }
    }
  }

  const _eR = [0, 0, 0], _eL = [0, 0, 0];
  const _wm = M4(), _mf = F(), _mrel = F(), _wellF = F(), _localF = F(), _wiF = F(), _local2 = F(), _outF = F(), _gi = Q(), _psc = V3(), _mw = V3();
  function update(dt, st) {
    dt = Math.min(0.05, Math.max(0, dt || 0));
    const key = st && st.want && st.weapon && VM_POSES[st.weapon] && weaponMeshes[st.weapon] ? st.weapon : null;
    // lower before a change; raise once the new one is in
    if ((gun ? gun.key : null) !== key) {
      if (S.raise > 0.02 && gun) S.raise = Math.max(0, S.raise - dt * VM.raise * 1.6);
      else { S.raise = 0; if (key) { syncArmMaterials(); buildGun(key); } else dropGun(); }
    } else if (key) S.raise = Math.min(1, S.raise + dt * VM.raise);
    const active = !!gun && S.raise > 0.001;
    info.active = active; info.key = gun ? gun.key : null; info.raise = S.raise;
    root.visible = active;
    setEyeHide(active, active ? gun.src : null);
    if (!active) { S.camQ = null; S.lastPlace = null; return; }
    syncArmMaterials();
    if (gunNodes(gun.src) !== gun.nodes) buildGun(gun.key);
    if (!sockets.r || !sockets.l || sockets.key !== gun.key) readSockets(gun.key, true, dt);
    if (!sockets.r || !sockets.l || !arms) { root.visible = false; return; }   // MU-11 (finding 7): nothing to hold it with yet
    const P = VM_POSES[gun.key];
    gun.src.updateWorldMatrix(true, false);
    gun.src.matrixWorld.decompose(_dp, _dq, _dsc); gun.s = Math.abs(_dsc.x) || 1;
    readSockets(gun.key, !!st.settled, dt);
    mirrorParts();
    S.ads = st.ads || 0; info.ads = S.ads;
    gunFrame(P, gun.key, st, dt);
    gun.root.position.copy(G.p); gun.root.quaternion.copy(G.q); gun.root.scale.setScalar(G.s);
    // the slide's kick on a shot (the third-person pistol's slide stays still; its rack in a reload is mirrored)
    S.slideT += dt;
    if (gun.slide && P.slideKick) { const t = S.slideT, k = t < 0.018 ? t / 0.018 : t < 0.075 ? 1 - (t - 0.018) / 0.057 : 0; gun.slide.position.z -= P.slideKick * k; }
    // AG-168 (defect 4): the rack, driven here (his own pistol's slide stays put through the reload): back as the hand
    // pulls (rack[0] to rack[1]), held, and forward at the release (rack[2], the slide-forward sound).
    { const Rr = P.reload && VM_RELOADS[P.reload], rk = Rr && Rr.rack, ur = st.reloadU;
      if (gun.slide && rk && ur != null) { const back = smooth((ur - rk[0]) / (rk[1] - rk[0])) * (1 - smooth((ur - rk[2]) / 0.03)); gun.slide.position.z -= rk[3] * back; } }
    // the hands
    const R = P.reload && VM_RELOADS[P.reload];
    const u = R && st.reloadU != null ? clamp(st.reloadU, 0, 1) : null;
    info.reloadU = u;
    const eR = _eR, eL = _eL;
    eR[0] = P.elbows.r[0] * MX; eR[1] = P.elbows.r[1]; eR[2] = P.elbows.r[2];
    eL[0] = P.elbows.l[0] * MX; eL[1] = P.elbows.l[1]; eL[2] = P.elbows.l[2];
    mul(G, sockets.r, WR);
    twistToward(arms.r, WR, eR);
    let poseL = sockets.poseL;
    if (u != null) { poseL = reloadHand(R, u, _localF); mul(G, _localF, WL); }
    else { mul(G, sockets.l, WL); twistToward(arms.l, WL, eL); info.handPlace = 'fore'; }
    mirrorWorn(arms.r, 1); mirrorWorn(arms.l, -1);
    info.wrist.r = poseArm(arms.r, WR, eR, VM.wristMax);
    info.wrist.l = poseArm(arms.l, WL, eL, VM.wristMax);
    arms.r.rig.set(sockets.poseR).update(); arms.l.rig.set(poseL).update();
    for (const a of [arms.r, arms.l]) if (a.bridge && a.parts.rolled.visible && a.bridge.userData.bend) a.bridge.userData.bend();
    // the magazine: seated, in the support palm, or away in the pouch
    if (gun.mag && gun.magBase) {
      const ms = R ? magState(R, u) : 'seated';
      info.magState = ms;
      if (ms === 'hand') {
        placeFrame('well', R, u, _wellF);
        _mf.p.copy(gun.magBase.pos); _mf.q.copy(gun.magBase.quat); _mf.s = gun.magBase.scale.x;
        // the magazine rides the palm as it was when the palm took it at the well: M = W * (Wwell^-1 * Mbase)
        const wi = _wiF; wi.q.copy(_wellF.q).invert(); wi.s = 1 / _wellF.s;
        wi.p.copy(_wellF.p).multiplyScalar(-wi.s).applyQuaternion(wi.q);
        mul(wi, _mf, _mrel);
        const local = placeLocalOfWrist(_local2);
        const out = mul(local, _mrel, _outF);
        gun.mag.position.copy(out.p); gun.mag.quaternion.copy(out.q); gun.mag.scale.setScalar(out.s);
        gun.mag.visible = true;
      } else {
        gun.mag.position.copy(gun.magBase.pos); gun.mag.quaternion.copy(gun.magBase.quat); gun.mag.scale.copy(gun.magBase.scale);
        gun.mag.visible = ms !== 'pouch';
      }
    }
    place();
  }
  // The support wrist's frame in the gun's own space (WL is view space).
  function placeLocalOfWrist(out) {
    const gi = _gi.copy(G.q).invert();
    out.q.copy(gi).multiply(WL.q); out.s = WL.s / G.s;
    out.p.copy(WL.p).sub(G.p).applyQuaternion(gi).multiplyScalar(1 / G.s);
    return out;
  }
  // Onto the camera, with this frame's projection.
  function place() {
    if (!root.visible) return;
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(root.position, root.quaternion, _psc);
    root.scale.set(1, 1, 1);
    updateProjection(VM.fov + (VM.adsFov - VM.fov) * smooth(S.ads));
    root.updateMatrixWorld(true);
  }
  // A point on the view gun (its own space) in view space.
  function viewPoint(local, out = V3()) {
    if (!gun) return out.set(0, 0, 0);
    return out.copy(local).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);
  }
  // A view-space point on screen (ndc), through the view gun's projection.
  function ndc(v, out = { x: 0, y: 0, d: 0 }) {   // v in his space (viewPoint's): mirrored as the eye sees it
    const t = Math.tan(proj.fov * Math.PI / 360), d = -v.z;
    out.x = v.x * MX / (Math.max(1e-6, d) * t * (proj.aspect || 1)); out.y = v.y / (Math.max(1e-6, d) * t); out.d = d;
    return out;
  }
  // The world point the main camera shows where the view gun's muzzle is drawn, at the muzzle's own distance.
  function muzzleWorld(out) {
    if (!gun) return null;
    const mz = gun.src.userData.muzzleLocal;
    if (!mz) return null;
    const v = viewPoint(mz, _mw);
    const k = Math.tan((camera.fov || 60) * Math.PI / 360) / Math.tan(proj.fov * Math.PI / 360);
    v.x *= k * MX; v.y *= k;
    camera.updateMatrixWorld();
    return out.copy(v).applyMatrix4(camera.matrixWorld);
  }
  function showing(key) { return info.active && !!gun && gun.key === key && S.raise > 0.5; }
  function dispose() {
    setEyeHide(false, null);
    dropGun();
    if (root.parent) root.parent.remove(root);
  }
  return {
    root, space, update, place, muzzleWorld, showing, viewPoint, ndc, dispose, info,
    get gun() { return gun; }, get arms() { return arms; }, get sockets() { return sockets; }, get frame() { return G; },
    get wrists() { return { r: WR, l: WL }; }, get proj() { return proj; }, get hidden() { return hidden; }, get filtering() { return filterOn; },
    isEyeHidden: (o) => hideOn && !!(o && o.userData && o.userData.vmEyeHide)
  };
}
