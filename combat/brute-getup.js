// combat/brute-getup.js - GB-277 (J40, GP-19988): the live brute's get-up, from the same keys the studio plays.
// Claude's call (b), 2026-11-05: no rig swap and no change to the zombie builder. studio/motion.js's keyed get-up
// biases the animated body POINTS by studio/motion/zombie/brute.json's getup.keys; here the live brute's own joints
// (the groups makeZombieMesh builds) are turned to those same points on the game's clock. The key blend is
// studio/motion.js's own getupSpan/sampleGetupKeys (one source), the points and the joint segments are the studio's
// own ZOMBIE_BODY (studio/bodies.js), and the joint write is apply()'s own turn (a joint keeps its animated world
// turn, plus the turn from the animated frame/aim to the target one). What the studio's physics did (bones keep their
// length) is a few passes of the same bone pairs on the target points.
//
//   const g = createBruteGetUp(mesh, scale, getup)   once per brute mesh (getup = parseBruteGetUp(json))
//   g.plant(u)            the mesh shift along its facing that keeps the feet where the fall left them (metres)
//   g.pose(u)             after the walk/idle animation wrote its pose: turn the joints to the keyed pose at u of the get-up
//   g.restore()           put the animated joint values back (call before the animation runs again)
//   g.points()            where the joints really are now, by body point name (mesh-local), for tests
//   g.hitH                the column height the posed body needs (the hit box follows)
import * as THREE from 'three';
import { ZOMBIE_BODY } from '../studio/bodies.js';
import { loadMotion, sampleGetupKeys } from '../studio/motion.js';

export const LIE_PITCH = Math.PI / 2 - 0.12;   // index.html's flat knockdown pitch (the brute lies at this when the get-up starts)
export const BLEND = 0.12;                     // share of the get-up spent turning from that flat lie to the first key

const SPEC = ZOMBIE_BODY;
export const NAMES = Object.keys(SPEC.points);
const N = NAMES.length, IDX = Object.fromEntries(NAMES.map((k, i) => [k, i]));
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

// brute.json -> { time, keys }, refusing anything the studio would refuse.
export function parseBruteGetUp(json) {
  const preset = loadMotion(json);
  if (preset.rig !== 'zombie') throw new Error('brute get-up: the preset is for rig "' + preset.rig + '", not "zombie"');
  const keys = preset.getup.keys;
  if (!keys) throw new Error('brute get-up: ' + preset.name + ' has no getup.keys');
  for (const key of keys) for (const p of Object.keys(key.pose)) if (IDX[p] === undefined) throw new Error('brute get-up: no body point "' + p + '"');
  return { time: preset.getup.time, keys };
}

// Fetches studio/motion/zombie/brute.json relative to this module (not to the page: the game, its test page and the renderer differ).
export async function fetchBruteGetUp() {
  const r = await fetch(new URL('../studio/motion/zombie/brute.json', import.meta.url));
  if (!r.ok) throw new Error('studio/motion/zombie/brute.json: ' + r.status);
  return parseBruteGetUp(await r.json());
}

// The mesh's frame (z forward) shift that holds the feet where the fall left them: the keys put the feet behind the
// pelvis's standing place by up to 0.9 m, so the whole body is carried that far forward and walks back to 0 by the end.
const _o1 = [0, 0, 0], _o2 = [0, 0, 0];
export function plantShift(getup, u, scale) {
  sampleGetupKeys(getup.keys, u, 'footL', _o1); sampleGetupKeys(getup.keys, u, 'footR', _o2);
  return -(_o1[2] + _o2[2]) * 0.5 * scale;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3(), _pm = new THREE.Matrix4(), _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4(), _s = new THREE.Vector3();

// A rotation for a frame: x along a->b, up along c->d (made square to x), z = x cross up. (studio/motion.js frameQuat.)
function frameQuat(P, fr, out) {
  const a = IDX[fr.x[0]] * 3, b = IDX[fr.x[1]] * 3, c = IDX[fr.up[0]] * 3, d = IDX[fr.up[1]] * 3;
  _x.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]).normalize();
  _y.set(P[d] - P[c], P[d + 1] - P[c + 1], P[d + 2] - P[c + 2]);
  _y.addScaledVector(_x, -_y.dot(_x)).normalize();
  _z.crossVectors(_x, _y);
  if (!(_z.lengthSq() > 0.5)) return out.identity();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

// The joints the body points sit on, by the studio's joint names, on the game's own zombie groups. The end groups
// (hand and foot) are added once at the game's own scaled offsets (studio/zombie.js adoptZombie adds them unscaled).
function jointsOf(mesh, s) {
  const u = mesh.userData;
  for (const k of ['hips', 'torso', 'head', 'armLG', 'armRG', 'legLG', 'legRG']) if (!u[k] || !u[k].isObject3D) throw new Error('brute get-up: the mesh has no userData.' + k);
  const end = (parent, name, at) => {
    let e = parent.children.find((c) => c.name === name);
    if (!e) { e = new THREE.Group(); e.name = name; e.position.set(at[0] * s, at[1] * s, at[2] * s); parent.add(e); }
    return e;
  };
  return {
    pelvis: u.hips, spine: u.torso, head: u.head,
    hipL: u.legLG, kneeL: u.legLG.userData.shinG, ankleL: end(u.legLG.userData.shinG, 'footEndL', [0, -0.36, 0.04]),
    hipR: u.legRG, kneeR: u.legRG.userData.shinG, ankleR: end(u.legRG.userData.shinG, 'footEndR', [0, -0.36, 0.04]),
    shoulderL: u.armLG, elbowL: u.armLG.userData.elbowG, handL: end(u.armLG.userData.elbowG, 'handEndL', [0, -0.34, 0.01]),
    shoulderR: u.armRG, elbowR: u.armRG.userData.elbowG, handR: end(u.armRG.userData.elbowG, 'handEndR', [0, -0.34, 0.01])
  };
}

export function createBruteGetUp(mesh, scale, getup) {
  const R = jointsOf(mesh, scale);
  const joints = NAMES.map((k) => R[SPEC.points[k].joint]);
  const offs = NAMES.map((k) => new THREE.Vector3(...(SPEC.points[k].at || [0, 0, 0])).multiplyScalar(scale));
  const mass = NAMES.map((k) => SPEC.points[k].mass || 1);
  const pairs = (list) => (list || []).map((e) => ({ a: IDX[e[0]], b: IDX[e[1]], lo: e[2] ?? 1, hi: e[3] ?? 1, len: 0 }));
  const bones = pairs(SPEC.bones), braces = pairs(SPEC.braces);
  const segs = SPEC.segments.map((sg) => ({
    ...sg, j: R[sg.joint], animW: new THREE.Matrix4(), saveQ: new THREE.Quaternion(), saveP: new THREE.Vector3(),
    aimI: sg.aim ? sg.aim.map((k) => IDX[k]) : null, posI: sg.pos !== undefined ? IDX[sg.pos] : null
  }));
  const AB = new Float64Array(N * 3), L = new Float64Array(N * 3), T = new Float64Array(N * 3), S = new Float64Array(N * 3);
  const out = { overridden: false, hitH: 0, u: 0, b: 0, shift: 0, time: getup.time, keys: getup.keys };
  let margin = null;   // how far the hit column's top stands over the body's highest point when it stands

  const off = [0, 0, 0];
  // The bones keep their (animated) length on the keyed target points: the studio's physics did that.
  function relax() {
    for (const c of bones) c.len = Math.hypot(AB[c.b * 3] - AB[c.a * 3], AB[c.b * 3 + 1] - AB[c.a * 3 + 1], AB[c.b * 3 + 2] - AB[c.a * 3 + 2]);
    for (const c of braces) c.len = Math.hypot(AB[c.b * 3] - AB[c.a * 3], AB[c.b * 3 + 1] - AB[c.a * 3 + 1], AB[c.b * 3 + 2] - AB[c.a * 3 + 2]);
    for (let it = 0; it < 40; it++) {
      for (const list of [bones, braces]) for (const c of list) {
        const a = c.a * 3, b = c.b * 3;
        const dx = S[b] - S[a], dy = S[b + 1] - S[a + 1], dz = S[b + 2] - S[a + 2], d = Math.hypot(dx, dy, dz) || 1e-9;
        const want = d < c.len * c.lo ? c.len * c.lo : d > c.len * c.hi ? c.len * c.hi : d;
        if (want === d) continue;
        const k = (d - want) / d, wa = (1 / mass[c.a]) / (1 / mass[c.a] + 1 / mass[c.b]), wb = 1 - wa;
        S[a] += dx * k * wa; S[a + 1] += dy * k * wa; S[a + 2] += dz * k * wa;
        S[b] -= dx * k * wb; S[b + 1] -= dy * k * wb; S[b + 2] -= dz * k * wb;
      }
    }
  }

  out.restore = () => {
    if (!out.overridden) return;
    for (const sg of segs) { sg.j.quaternion.copy(sg.saveQ); if (sg.posI !== null) sg.j.position.copy(sg.saveP); }
    out.overridden = false;
  };

  // u of the get-up (0 to 1). The mesh is upright at its (shifted) place; the joints still hold the animation's pose.
  out.pose = (u, hitH0) => {
    u = Math.max(0, Math.min(1, u));
    mesh.updateWorldMatrix(true, true);
    const MW = mesh.matrixWorld;
    _inv.copy(MW).invert();
    for (let i = 0; i < N; i++) {
      _v.copy(offs[i]).applyMatrix4(joints[i].matrixWorld);
      AB[i * 3] = _v.x; AB[i * 3 + 1] = _v.y; AB[i * 3 + 2] = _v.z;
      _v.applyMatrix4(_inv); T[i * 3] = _v.x; T[i * 3 + 1] = _v.y; T[i * 3 + 2] = _v.z;   // T: the animated point, mesh-local
    }
    if (margin === null) {   // the first call finds him standing, so this is his full height
      let top = -Infinity; for (let i = 0; i < N; i++) top = Math.max(top, AB[i * 3 + 1] - mesh.position.y);
      margin = (hitH0 || 0) - top;
    }
    for (const sg of segs) { sg.animW.copy(sg.j.matrixWorld); sg.saveQ.copy(sg.j.quaternion); sg.saveP.copy(sg.j.position); }
    const b = smooth(u / BLEND), pz = plantShift(getup, u, scale), c = Math.cos(LIE_PITCH), sn = Math.sin(LIE_PITCH);
    for (let i = 0; i < N; i++) {
      const x = T[i * 3], y = T[i * 3 + 1], z = T[i * 3 + 2];
      sampleGetupKeys(getup.keys, u, NAMES[i], off);
      // the flat lie the fall left (the mesh pitched about its origin), carried back by the plant shift; and the keyed pose
      const lx = x, ly = y * c - z * sn, lz = y * sn + z * c - pz;
      _v.set(lx * (1 - b) + (x + off[0] * scale) * b, ly * (1 - b) + (y + off[1] * scale) * b, lz * (1 - b) + (z + off[2] * scale) * b).applyMatrix4(MW);
      S[i * 3] = _v.x; S[i * 3 + 1] = _v.y; S[i * 3 + 2] = _v.z;
    }
    relax();
    // apply(): each joint keeps its animated world turn, plus the turn from the animated frame (or aim) to the target one.
    for (const sg of segs) {
      const j = sg.j;
      sg.animW.decompose(_pp, _qa, _s);
      if (sg.frame) {
        frameQuat(AB, sg.frame, _qb);
        frameQuat(S, sg.frame, _qc);
        _q.copy(_qc).multiply(_qb.invert()).multiply(_qa);
      } else if (sg.aim) {
        const a = sg.aimI[0] * 3, e = sg.aimI[1] * 3;
        _x.set(AB[e] - AB[a], AB[e + 1] - AB[a + 1], AB[e + 2] - AB[a + 2]).normalize();
        // aimed from where this joint's pivot really is now (its parents have already turned), not from where its target is, so a chain
        // whose bones were kept to length still lands each end as near its target as the bones allow
        _pm.copy(j.parent.matrixWorld); _w.copy(j.position).applyMatrix4(_pm);
        _y.set(S[e] - _w.x, S[e + 1] - _w.y, S[e + 2] - _w.z).normalize();
        _q.setFromUnitVectors(_x, _y).multiply(_qa);
      } else continue;
      _qa.copy(_q);
      const parent = j.parent;
      parent.updateWorldMatrix(false, false);
      parent.matrixWorld.decompose(_pp, _pq, _ps);
      j.quaternion.copy(_pq).invert().multiply(_qa);
      if (sg.posI !== null) {
        const o = sg.posI * 3;
        _w.set(S[o], S[o + 1], S[o + 2]);
        _v.copy(offs[sg.posI]).multiply(_s).applyQuaternion(_qa);
        _w.sub(_v);
        _pm.copy(parent.matrixWorld).invert();
        j.position.copy(_w.applyMatrix4(_pm));
      }
      j.updateMatrix();
      j.updateWorldMatrix(false, false);
    }
    mesh.updateWorldMatrix(false, true);
    out.overridden = true; out.u = u; out.b = b; out.shift = pz;
    let top = -Infinity; for (let i = 0; i < N; i++) top = Math.max(top, S[i * 3 + 1] - mesh.position.y);
    out.hitH = Math.max(0.45 * scale, Math.min(hitH0 || Infinity, top + margin));
  };

  // The targets the last pose() aimed at (world), and where the joints really are now (world), by point name.
  out.targets = () => Object.fromEntries(NAMES.map((k, i) => [k, [S[i * 3], S[i * 3 + 1], S[i * 3 + 2]]]));
  out.points = () => {
    mesh.updateWorldMatrix(true, true);
    return Object.fromEntries(NAMES.map((k, i) => { _v.copy(offs[i]).applyMatrix4(joints[i].matrixWorld); return [k, [_v.x, _v.y, _v.z]]; }));
  };
  out.animated = () => Object.fromEntries(NAMES.map((k, i) => [k, [AB[i * 3], AB[i * 3 + 1], AB[i * 3 + 2]]]));
  out.plant = (u) => plantShift(getup, u, scale);
  return out;
}