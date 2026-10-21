// studio/clip.js — clips as data, and the player that puts them on a rig. Claude's (D-40).
// The format is docs/studio.md §1; this file is the only code that reads it, so the game and the
// renderer (tools/studio.mjs) always agree about what a clip looks like.
//
//   const clip = loadClip(json);                    // validates; throws a readable error
//   const inst = rigs.get('guardian').create({ design });
//   const player = createPlayer(inst);
//   player.play(clip, { loop: true });
//   const events = player.update(dt, { targets: { ankle: worldVec3 } });
import * as THREE from 'three';
import { ikLimb, worldQuat, slerpTo } from './ik.js';

export const CLIP_FORMAT = 'dw-clip/1';
const D2R = Math.PI / 180;

export const EASES = {
  linear: (u) => u,
  smooth: (u) => u * u * (3 - 2 * u),
  in: (u) => u * u * u,
  out: (u) => 1 - (1 - u) ** 3,
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  back: (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; },
  step: (u) => (u < 1 ? 0 : 1)
};
// What each channel holds: a vec3, a scalar, or a point (a vec3 or a live target).
const CHANNELS = { rot: 'vec3', pos: 'vec3', ik: 'point', pole: 'vec3', plant: 'scalar', level: 'scalar', grip: 'scalar', look: 'point', open: 'scalar', step: 'scalar' };

// --- Loading ----------------------------------------------------------------------------
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
function liveOf(v) {
  if (typeof v === 'string' && v.startsWith('@')) return { at: v.slice(1), offset: [0, 0, 0] };
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.at === 'string' && v.at.startsWith('@')) {
    return { at: v.at.slice(1), offset: isVec3(v.offset) ? v.offset : [0, 0, 0] };
  }
  return null;
}
// Every problem in a clip, as sentences an agent can act on. Empty means it's good.
export function validateClip(json) {
  const errs = [];
  if (!json || typeof json !== 'object') return ['the clip is not a JSON object'];
  if (json.format !== CLIP_FORMAT) errs.push(`"format" must be "${CLIP_FORMAT}" (got ${JSON.stringify(json.format)})`);
  if (typeof json.name !== 'string' || !json.name) errs.push('"name" is missing');
  if (typeof json.rig !== 'string' || !json.rig) errs.push('"rig" is missing');
  if (!(json.length > 0)) errs.push('"length" must be a positive number of seconds');
  if (!json.tracks || typeof json.tracks !== 'object') errs.push('"tracks" is missing');
  else for (const [track, chans] of Object.entries(json.tracks)) {
    if (!chans || typeof chans !== 'object') { errs.push(`track "${track}" must be an object of channels`); continue; }
    for (const [ch, keys] of Object.entries(chans)) {
      const kind = CHANNELS[ch];
      if (!kind) { errs.push(`${track}.${ch}: unknown channel (use ${Object.keys(CHANNELS).join(', ')})`); continue; }
      if (!Array.isArray(keys) || !keys.length) { errs.push(`${track}.${ch}: needs at least one key [time, value]`); continue; }
      let last = -Infinity;
      keys.forEach((k, i) => {
        const at = `${track}.${ch} key ${i}`;
        if (!Array.isArray(k) || k.length < 2) { errs.push(`${at}: a key is [time, value, ease?]`); return; }
        const [t, v, e] = k;
        if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) errs.push(`${at}: time must be a number >= 0`);
        else if (t < last) errs.push(`${at}: keys must be in time order (${t} after ${last})`);
        last = t;
        if (e !== undefined && !EASES[e]) errs.push(`${at}: unknown ease "${e}" (use ${Object.keys(EASES).join(', ')})`);
        if (kind === 'scalar' && !(typeof v === 'number' && Number.isFinite(v))) errs.push(`${at}: value must be a number`);
        if (kind === 'vec3' && !isVec3(v)) errs.push(`${at}: value must be [x, y, z]`);
        if (kind === 'point' && !isVec3(v) && !liveOf(v)) errs.push(`${at}: value must be [x, y, z] or a live target "@name"`);
      });
    }
  }
  if (json.events !== undefined) {
    if (!Array.isArray(json.events)) errs.push('"events" must be a list of [time, name, data?]');
    else json.events.forEach((e, i) => { if (!Array.isArray(e) || typeof e[0] !== 'number' || typeof e[1] !== 'string') errs.push(`event ${i}: [time, name, data?]`); });
  }
  return errs;
}
export function loadClip(json) {
  const errs = validateClip(json);
  if (errs.length) throw new Error(`clip ${json && json.name ? '"' + json.name + '" ' : ''}is not valid:\n  - ` + errs.join('\n  - '));
  const tracks = {};
  for (const [track, chans] of Object.entries(json.tracks)) {
    tracks[track] = {};
    for (const [ch, keys] of Object.entries(chans)) {
      tracks[track][ch] = keys.map(([t, v, e]) => ({ t, v, ease: EASES[e || 'smooth'], live: CHANNELS[ch] === 'point' ? liveOf(v) : null }));
    }
  }
  const events = (json.events || []).map(([t, name, data]) => ({ t, name, data: data || {} })).sort((a, b) => a.t - b.t);
  return { format: json.format, name: json.name, rig: json.rig, length: json.length, loop: !!json.loop, reference: json.reference || null, notes: json.notes || '', tracks, events, source: json };
}

// --- Sampling ---------------------------------------------------------------------------
// Where t falls among the keys: the pair either side and how far between them (eased).
function segment(keys, t) {
  if (t <= keys[0].t || keys.length === 1) return [keys[0], keys[0], 0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return [last, last, 0];
  let i = 1;
  while (keys[i].t < t) i++;
  const a = keys[i - 1], b = keys[i];
  const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  return [a, b, b.ease(u)];
}
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
function sampleVec3(keys, t) { const [a, b, u] = segment(keys, t); return lerp3(a.v, b.v, u); }
function sampleScalar(keys, t) { const [a, b, u] = segment(keys, t); return a.v + (b.v - a.v) * u; }
// A point is kept as a weighted list of parts (fixed rig-frame points and live targets), and only
// resolved to the world when it's applied: that's what lets a key blend from a spot on the ground
// to the marine's moving ankle, and two clips blend through the same machinery.
function samplePoint(keys, t) {
  const [a, b, u] = segment(keys, t);
  const part = (k, w) => (k.live ? { w, live: k.live } : { w, fixed: k.v });
  if (a === b || u <= 0) return [part(a, 1)];
  if (u >= 1) return [part(b, 1)];
  return [part(a, 1 - u), part(b, u)];
}
// Clip time for a play time: wrapped for a loop, held at the ends otherwise.
export function clipTime(clip, t) {
  if (clip.loop) { const L = clip.length; return ((t % L) + L) % L; }
  return Math.max(0, Math.min(clip.length, t));
}
// The pose at time t: { root, joints: { name: { rot: Quaternion?, pos: [x,y,z]? } }, chains, head }.
const _e = new THREE.Euler();
export function sampleClip(clip, t) {
  const tt = clipTime(clip, t);
  const pose = { root: null, joints: {}, chains: {}, head: {} };
  for (const [track, chans] of Object.entries(clip.tracks)) {
    if (track === 'root') { if (chans.pos) pose.root = sampleVec3(chans.pos, tt); continue; }
    const j = {};
    if (chans.rot) { const r = sampleVec3(chans.rot, tt); j.rot = new THREE.Quaternion().setFromEuler(_e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ')); }
    if (chans.pos) j.pos = sampleVec3(chans.pos, tt);
    if (j.rot || j.pos) pose.joints[track] = j;
    const c = {};
    if (chans.ik) c.ik = samplePoint(chans.ik, tt);
    if (chans.pole) c.pole = sampleVec3(chans.pole, tt);
    for (const s of ['plant', 'level', 'grip', 'step']) if (chans[s]) c[s] = sampleScalar(chans[s], tt);
    if (Object.keys(c).length) pose.chains[track] = c;
    if (chans.look) pose.head.look = samplePoint(chans.look, tt);
    if (chans.open) pose.head.open = sampleScalar(chans.open, tt);
  }
  return pose;
}
// Blend two poses: w 0 is all a, 1 is all b. A channel only one side has comes through whole.
export function blendPoses(a, b, w) {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const out = { root: null, joints: {}, chains: {}, head: {} };
  out.root = a.root && b.root ? lerp3(a.root, b.root, w) : (b.root || a.root);
  for (const n of new Set([...Object.keys(a.joints), ...Object.keys(b.joints)])) {
    const ja = a.joints[n], jb = b.joints[n];
    if (!ja || !jb) { out.joints[n] = ja || jb; continue; }
    out.joints[n] = {
      rot: ja.rot && jb.rot ? slerpTo(ja.rot.clone(), jb.rot, w) : (jb.rot || ja.rot),
      pos: ja.pos && jb.pos ? lerp3(ja.pos, jb.pos, w) : (jb.pos || ja.pos)
    };
  }
  const mixPts = (pa, pb) => (pa && pb ? pa.map((p) => ({ ...p, w: p.w * (1 - w) })).concat(pb.map((p) => ({ ...p, w: p.w * w }))) : (pb || pa));
  const mixS = (x, y) => (x !== undefined && y !== undefined ? x + (y - x) * w : (y !== undefined ? y : x));
  for (const n of new Set([...Object.keys(a.chains), ...Object.keys(b.chains)])) {
    const ca = a.chains[n] || {}, cb = b.chains[n] || {};
    // A limb only one side places fades its IK in or out over the blend (instead of dropping it at
    // the end of the fade, which pops the limb back to its rest).
    const ikW = ca.ik && !cb.ik ? (1 - w) * (ca.ikW ?? 1) : !ca.ik && cb.ik ? w * (cb.ikW ?? 1) : (ca.ikW ?? 1) * (1 - w) + (cb.ikW ?? 1) * w;
    out.chains[n] = {
      ik: mixPts(ca.ik, cb.ik), ikW,
      pole: ca.pole && cb.pole ? lerp3(ca.pole, cb.pole, w) : (cb.pole || ca.pole),
      plant: mixS(ca.plant, cb.plant), level: mixS(ca.level, cb.level), grip: mixS(ca.grip, cb.grip), step: mixS(ca.step, cb.step)
    };
  }
  // Looking at something fades in or out over the blend too, when only one side looks.
  const la = a.head.look, lb = b.head.look;
  const lookW = la && !lb ? (1 - w) * (a.head.lookW ?? 1) : !la && lb ? w * (b.head.lookW ?? 1) : (a.head.lookW ?? 1) * (1 - w) + (b.head.lookW ?? 1) * w;
  out.head = { look: mixPts(la, lb), lookW, open: mixS(a.head.open, b.head.open) };
  return out;
}
// Events with a time in (t0, t1], for a clip played from t0 to t1 (loops wrap).
export function clipEvents(clip, t0, t1) {
  if (!clip.events.length || t1 <= t0) return [];
  if (!clip.loop) return clip.events.filter((e) => e.t > t0 && e.t <= t1);
  const out = [], L = clip.length;
  for (let base = Math.floor(t0 / L) * L; base <= t1; base += L) {
    for (const e of clip.events) { const at = base + e.t; if (at > t0 && at <= t1) out.push(e); }
  }
  return out;
}

// --- Applying a pose to a rig instance ---------------------------------------------------
const _w = new THREE.Vector3(), _p = new THREE.Vector3(), _pole = new THREE.Vector3(), _up = new THREE.Vector3(), _f = new THREE.Vector3();
const _q = new THREE.Quaternion();
// A point part's world position. Fixed parts are rig frame; live parts are the caller's targets
// (world), plus a world offset.
function resolvePoint(inst, parts, targets, out) {
  out.set(0, 0, 0);
  let wsum = 0;
  for (const p of parts) {
    if (p.fixed) _p.set(p.fixed[0], p.fixed[1], p.fixed[2]).applyMatrix4(inst.group.matrixWorld);
    else {
      const tv = targets && targets[p.live.at];
      if (!tv) continue;   // a live target the caller didn't give: that part drops out
      _p.set(tv.x + p.live.offset[0], tv.y + p.live.offset[1], tv.z + p.live.offset[2]);
    }
    out.addScaledVector(_p, p.w); wsum += p.w;
  }
  if (wsum <= 0) return null;
  return out.divideScalar(wsum);
}
// Turn a joint about its local X so its +Z lies level with the rig's ground.
// Quaternion in, quaternion out (never reading .rotation after a quaternion was written: the game's
// test stand-in for three.js doesn't keep the two in step, real three does, and this is the same
// maths either way).
const _le = new THREE.Euler(), _lq = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0);
function levelJoint(inst, joint, amt) {
  if (!(amt > 0)) return;
  _le.setFromQuaternion(joint.quaternion, 'XYZ');
  const keep = _le.x, ey = _le.y, ez = _le.z;
  joint.quaternion.setFromEuler(_le.set(0, ey, ez, 'XYZ'));
  joint.updateWorldMatrix(true, false);
  _f.set(0, 0, 1).transformDirection(joint.matrixWorld);
  _up.set(0, 1, 0).transformDirection(inst.group.matrixWorld);
  const tip = Math.asin(Math.max(-1, Math.min(1, _f.dot(_up))));
  joint.quaternion.setFromEuler(_le.set(keep + (tip - keep) * amt, ey, ez, 'XYZ'));
}
// Solve one limb onto a world point (the scene player's lift, and applyPose below). `weight` < 1
// eases from where the limb is now.
export function solveChain(inst, name, target, weight = 1, pole = null) {
  const ch = inst.def.chains[name], R = inst.R;
  if (!ch || !R[ch.root] || !R[ch.mid]) return false;
  const pv = pole || ch.pole;
  _pole.set(pv[0], pv[1], pv[2]).transformDirection(inst.group.matrixWorld);
  if (ch.exact && R[ch.end]) ikLimb(R[ch.root], R[ch.mid], R[ch.mid].position.length(), ch.lengths[1], target, _pole, weight, R[ch.end].position);
  else ikLimb(R[ch.root], R[ch.mid], ch.lengths[0], ch.lengths[1], target, _pole, weight);
  inst.group.updateWorldMatrix(true, true);
  return true;
}
// `reach` (the scene player's holds): { chain: { at: Vector3 (world), w } } pulls a limb's target
// toward a point, over whatever the clip says, even if the clip doesn't place that limb.
// `dt` (seconds since the last pose) drives limbs that step for themselves (the `step` channel).
// `free` (the scene player's holds): { chain: w } for a limb something else has hold of, 0 to 1
// (true is 1): its clip's plant lets go by that much (a foot that's been grabbed isn't standing on
// anything), so a hold easing in eases the foot off the ground instead of jerking it off.
export function applyPose(inst, pose, { targets = null, rootMotion = false, reach = null, dt = 0, free = null } = {}) {
  const def = inst.def, R = inst.R;
  // Everything back to rest first, so a joint the clip doesn't mention sits where the rig's rest
  // pose puts it, not wherever the last clip left it.
  for (const [j, rest] of inst.rest) { j.quaternion.copy(rest.q); j.position.copy(rest.p); }
  // Root motion moves the rig's root from where its owner put it; without it the clip plays in place.
  if (rootMotion && pose.root) {
    if (!inst.rootBase) inst.rootBase = inst.group.position.clone();
    inst.group.position.copy(inst.rootBase).add(_p.set(pose.root[0], pose.root[1], pose.root[2]).multiplyScalar(inst.group.scale.x));
  } else if (inst.rootBase) { inst.group.position.copy(inst.rootBase); inst.rootBase = null; }
  for (const [n, j] of Object.entries(pose.joints)) {
    const o = R[n];
    if (!o) continue;
    if (j.rot) o.quaternion.copy(j.rot);
    if (j.pos) o.position.set(j.pos[0], j.pos[1], j.pos[2]);
  }
  inst.group.updateWorldMatrix(true, true);
  // Limbs, in the order the rig lists them (arms after the spine they hang from is automatic:
  // the spine was posed above).
  for (const [name, ch] of Object.entries(def.chains)) {
    const c = pose.chains[name] || null;
    const state = inst.plants[name] || (inst.plants[name] = { at: null });
    const rc = reach && reach[name] && reach[name].w > 0 ? reach[name] : null;
    if ((!c || !c.ik) && !rc) { state.at = null; state.planted = false; continue; }
    let target = c && c.ik ? resolvePoint(inst, c.ik, targets, _w) : null;
    if (!target && !rc) continue;
    // A limb that steps for itself (`step` > 0: how far, in rig units, its planted foot may fall from
    // where the clip wants it before it picks it up). It stays pinned, and when the body has moved
    // or turned far enough off it, it lifts, swings to the clip's spot in `STEP_TIME` and plants
    // there. One limb of a body in the air at a time, unless one is falling far behind. This is what
    // lets a clip say "stand here" while the scene turns and moves the body under it.
    if (target && c && c.step > 0 && !rc) {
      // Coming from a planted clip, it starts pinned where it was planted, not where this clip wants it.
      if (!state.pin && !state.swing && state.at) state.pin = state.at.clone();
      target = autoStep(inst, name, state, target, c.step, dt, ch);
      state.planted = !state.swing;
      solveChain(inst, name, target, 1, (c && c.pole) || ch.pole);
      if (R[ch.end]) (state.endLast || (state.endLast = new THREE.Vector3())).setFromMatrixPosition(R[ch.end].matrixWorld);
      if (R[ch.end]) levelJoint(inst, R[ch.end], c.level !== undefined ? c.level : 1);
      if (c.grip !== undefined && def.grip) def.grip(R, name, c.grip);
      state.at = null;
      continue;
    }
    // Leaving a stepping clip: a planted limb stays where it stands (the next clip's plant keeps it).
    if (state.swing || state.pin) {
      if (state.swing) inst.stepping = Math.max(0, (inst.stepping || 1) - 1);
      else if (state.pin) state.carry = state.pin.clone();
      state.swing = null; state.pin = null;
    }
    // Held by another body, it lets go of its own plant as the hold takes it (a weight: `true` is 1).
    const held = free && free[name] ? Math.min(1, +free[name]) : 0;
    const plant = ((c && c.plant) || 0) * (1 - held);
    if (target && plant >= 0.5) {
      // Pinned where it was when the plant came on: the body moves over it, it doesn't slide.
      if (!state.at) state.at = state.carry ? state.carry : target.clone();
      state.carry = null;
      target = _w.copy(target).lerp(state.at, Math.min(1, (plant - 0.5) * 2));
    } else state.at = null;
    state.planted = !!target && plant >= 0.99 && !rc;   // fully pinned; a limb easing out of its pin is lifting
    // A limb something has hold of is pulled straight by it: it keeps the clip's direction from its
    // root, but not the clip's bend (a grabbed leg doesn't go on running), by as much as it's held.
    if (held > 0 && target && R[ch.root]) {
      const rp = _hr.setFromMatrixPosition(R[ch.root].matrixWorld);
      const len = (ch.lengths[0] + ch.lengths[1]) * (_hs.setFromMatrixColumn(R[ch.root].matrixWorld, 1).length() || 1) * 0.985;
      const d = _hd.copy(target).sub(rp), dl = d.length();
      if (dl > 1e-4) target = _w.copy(target).lerp(d.multiplyScalar(len / dl).add(rp), held);
    }
    let ikW = c && c.ikW !== undefined ? c.ikW : 1;
    if (rc) {
      if (target) target = _w.copy(target).lerp(rc.at, Math.min(1, rc.w));
      else { target = _w.copy(rc.at); ikW = Math.min(1, rc.w); }
      if (c && c.ik) ikW = Math.max(ikW, Math.min(1, rc.w));
    }
    solveChain(inst, name, target, ikW, (c && c.pole) || ch.pole);
    if (!c) { state.last = target.clone(); continue; }
    // Levelled as much as the limb is placed (a limb fading out of a clip lets go of its level too).
    const level = (c.level !== undefined ? c.level : (plant >= 0.5 ? 1 : 0)) * Math.min(1, ikW);
    if (level > 0 && R[ch.end]) levelJoint(inst, R[ch.end], level);
    if (c.grip !== undefined && def.grip) def.grip(R, name, c.grip);
    state.last = target.clone();
  }
  // Head: turn to look at a point (on top of the neck's and head's own rotation), and the jaw.
  const hd = def.head;
  if (hd && pose.head.look) {
    const at = resolvePoint(inst, pose.head.look, targets, _w);
    if (at) lookAt(inst, hd, at, pose.head.lookW ?? 1);
  }
  // Open: a turn about X added in front (what rotation.x += a does to an XYZ rotation).
  if (hd && pose.head.open !== undefined && R[hd.jaw]) R[hd.jaw].quaternion.premultiply(_lq.setFromAxisAngle(_X, pose.head.open * (hd.jawOpenDeg || 55) * D2R));
  inst.group.updateWorldMatrix(true, true);
}
const _hr = new THREE.Vector3(), _hs = new THREE.Vector3(), _hd = new THREE.Vector3();
export const STEP_TIME = 0.25;
const _st = new THREE.Vector3(), _sf = new THREE.Vector3();
function autoStep(inst, name, state, want, thr, dt, ch) {
  const sc = inst.group.scale.x || 1;
  if (!state.pin && !state.swing) { state.pin = want.clone(); return state.pin; }
  if (state.swing) {
    const sw = state.swing;
    sw.age += dt;
    const u = Math.min(1, sw.age / sw.dur);
    // Over first, then down: it gets where it's going by three quarters of the step and puts the foot
    // down from above, so a landing never skims the ground.
    const uh = Math.min(1, u / 0.75), e = uh * uh * (3 - 2 * uh);
    _st.copy(sw.from).lerp(want, e);
    _st.y += Math.sin(Math.PI * u) * Math.max(0.12, thr * 0.7) * sc;
    if (u >= 1) { state.pin = want.clone(); state.swing = null; inst.stepping = Math.max(0, (inst.stepping || 1) - 1); return state.pin; }
    return _st;
  }
  const drift = _sf.copy(state.pin).sub(want).setY(0).length() / sc;
  const busy = (inst.stepping || 0) > 0;
  // A pin the limb can no longer reach has to be picked up whatever the threshold says.
  const root = inst.R[ch.root];
  const far = root && _sf.setFromMatrixPosition(root.matrixWorld).distanceTo(state.pin) / sc > (ch.lengths[0] + ch.lengths[1]) * 0.96;
  if ((far && (inst.stepping || 0) < 2) || drift > thr * (busy ? 1.6 : 1) && (inst.stepping || 0) < 2) {
    // A long step takes longer (up to 1.8 times), so a big stride isn't a flick.
    // It lifts from where the limb really is (a pin it could no longer reach, it had already let go of).
    const from = state.endLast ? state.endLast.clone() : state.pin.clone();   // where it was drawn last frame
    state.swing = { from, age: 0, dur: STEP_TIME * Math.min(1.8, Math.max(1, drift / 0.5)) };
    inst.stepping = (inst.stepping || 0) + 1;
  }
  return state.pin;
}

// Split the turn between neck and head, clamped: a creature looks, it doesn't spin its skull.
function lookAt(inst, hd, at, w = 1) {
  const neck = inst.R[hd.neck], head = inst.R[hd.head];
  if (!neck || !head) return;
  neck.updateWorldMatrix(true, false);
  _p.setFromMatrixPosition(neck.matrixWorld);
  _f.copy(at).sub(_p);
  worldQuat(neck, _q).invert();
  _f.applyQuaternion(_q).normalize();
  const lim = (hd.limitDeg || 70) * D2R;
  // A target behind the neck is looked at over the shoulder on its own side (|z|), not flipped from one
  // side to the other as it crosses straight behind.
  // And a target straight above or below the neck has no sideways to turn to: the turn fades out
  // as it lines up, instead of spinning the head round.
  const yaw = Math.max(-lim, Math.min(lim, Math.atan2(_f.x, Math.abs(_f.z)))) * w * Math.min(1, Math.hypot(_f.x, _f.z) * 3);
  const pitch = Math.max(-lim, Math.min(lim, -Math.atan2(_f.y, Math.hypot(_f.x, _f.z)))) * w;
  // rotateY / rotateX, spelled as the quaternion products they are.
  neck.quaternion.multiply(_lq.setFromAxisAngle(_Y, yaw * 0.5)).multiply(_lq.setFromAxisAngle(_X, pitch * 0.4));
  head.quaternion.multiply(_lq.setFromAxisAngle(_Y, yaw * 0.5)).multiply(_lq.setFromAxisAngle(_X, pitch * 0.6));
}

// --- The player ----------------------------------------------------------------------------
export function createPlayer(inst) {
  let cur = null, t = 0, speed = 1, rootMotion = false;
  let fade = null;   // { clip, t, dur, age }
  return {
    get clip() { return cur; },
    get time() { return t; },
    play(clip, opts = {}) {
      cur = clip; t = opts.at || 0; speed = opts.speed ?? 1; rootMotion = !!opts.rootMotion; fade = null;
      if (opts.loop !== undefined) cur = { ...clip, loop: !!opts.loop };
      inst.plants = {};
      return this;
    },
    crossfade(clip, dur = 0.2, opts = {}) {
      if (cur) fade = { clip: cur, t, dur: Math.max(1e-3, dur), age: 0 };
      cur = opts.loop !== undefined ? { ...clip, loop: !!opts.loop } : clip;
      t = opts.at || 0; speed = opts.speed ?? speed;
      return this;
    },
    // Moves time on by dt, poses the rig, and returns the events passed on the way.
    update(dt, { targets = null } = {}) {
      if (!cur) return [];
      const t0 = t;
      t += dt * speed;
      const events = clipEvents(cur, t0, t);
      let pose = sampleClip(cur, t);
      if (fade) {
        fade.age += dt; fade.t += dt * speed;
        const w = Math.min(1, fade.age / fade.dur);
        pose = blendPoses(sampleClip(fade.clip, fade.t), pose, EASES.smooth(w));
        if (w >= 1) fade = null;
      }
      applyPose(inst, pose, { targets, rootMotion, dt });
      return events;
    },
    // Pose the rig at a given time without moving the clock (the renderer's frames).
    poseAt(time, { targets = null } = {}) {
      if (!cur) return;
      applyPose(inst, sampleClip(cur, time), { targets, rootMotion });
    },
    get done() { return !!cur && !cur.loop && t >= cur.length; }
  };
}
