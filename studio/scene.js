// studio/scene.js — scenes: several bodies in one moment (D-41, CL-63; docs/studio.md §9). Claude's.
//
// A clip is one body moving in place. A scene says who is in a moment, what each plays, what holds
// what, how they travel and what to check, as data. This file plays one: the renderer (CU-46) draws
// it into a review folder, and the game plays the same file where the moment happens, handing over
// its own bodies. A new moment is a new scene file, not new code here.
import * as THREE from 'three';
import { loadClip, sampleClip, blendPoses, clipEvents, clipTime, applyPose, solveChain, EASES } from './clip.js';
import { rigs } from './rigs.js';
import { worldQuat, worldScale, slerpTo } from './ik.js';

export const SCENE_FORMAT = 'dw-scene/1';
const D2R = Math.PI / 180;
const WEIGHTS = ['reach', 'tow', 'lift'];
const DEFAULT_CHECKS = { gap: 0.05, slide: 0.05, snap: 0.3 };
const STEP = 1 / 60;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

// --- Keys: [time, value, ease?], the clip format's ----------------------------------------------
function keyErrors(keys, kind, at, { min = -Infinity, max = Infinity } = {}) {
  const errs = [];
  if (!Array.isArray(keys) || !keys.length) return [`${at}: needs at least one key [time, value, ease?]`];
  let last = -Infinity;
  keys.forEach((k, i) => {
    const w = `${at} key ${i}`;
    if (!Array.isArray(k) || k.length < 2) { errs.push(`${w}: a key is [time, value, ease?]`); return; }
    const [t, v, e] = k;
    if (!isNum(t) || t < 0) errs.push(`${w}: time must be a number >= 0`);
    else if (t < last) errs.push(`${w}: keys must be in time order (${t} after ${last})`);
    last = t;
    if (e !== undefined && !EASES[e]) errs.push(`${w}: unknown ease "${e}" (use ${Object.keys(EASES).join(', ')})`);
    if (kind === 'scalar') { if (!isNum(v)) errs.push(`${w}: value must be a number`); else if (v < min || v > max) errs.push(`${w}: value must be between ${min} and ${max}`); }
    if (kind === 'vec3' && !isVec3(v)) errs.push(`${w}: value must be [x, y, z]`);
  });
  return errs;
}
const normKeys = (keys) => keys.map(([t, v, e]) => ({ t, v, ease: EASES[e || 'smooth'] }));
function sampleKeys(keys, t) {
  if (!keys) return undefined;
  if (t <= keys[0].t || keys.length === 1) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  let i = 1;
  while (keys[i].t < t) i++;
  const a = keys[i - 1], b = keys[i];
  const u = b.ease((t - a.t) / Math.max(1e-6, b.t - a.t));
  return Array.isArray(a.v) ? a.v.map((x, k) => x + (b.v[k] - x) * u) : a.v + (b.v - a.v) * u;
}

// "actor.name" → { actor, name }
function splitRef(ref) {
  if (typeof ref !== 'string') return null;
  const i = ref.indexOf('.');
  if (i <= 0 || i === ref.length - 1) return null;
  return { actor: ref.slice(0, i), name: ref.slice(i + 1) };
}

// --- Validation: every problem, as sentences an agent can act on --------------------------------
export function validateScene(json) {
  const errs = [];
  if (!json || typeof json !== 'object') return ['the scene is not a JSON object'];
  if (json.format !== SCENE_FORMAT) errs.push(`"format" must be "${SCENE_FORMAT}" (got ${JSON.stringify(json.format)})`);
  if (typeof json.name !== 'string' || !json.name) errs.push('"name" is missing');
  if (!(json.length > 0)) errs.push('"length" must be a positive number of seconds');
  const paths = json.paths && typeof json.paths === 'object' ? json.paths : {};
  if (json.paths !== undefined && (typeof json.paths !== 'object' || Array.isArray(json.paths))) errs.push('"paths" must be an object of named paths');
  for (const [n, p] of Object.entries(paths)) {
    if (!p || !Array.isArray(p.points) || p.points.length < 2 || !p.points.every(isVec3)) errs.push(`path "${n}": "points" needs at least two [x, y, z]`);
    if (p && p.speed !== undefined) errs.push(...keyErrors(p.speed, 'scalar', `path "${n}".speed`));
    else errs.push(`path "${n}": "speed" is missing (keys of metres per second)`);
  }
  const actors = json.actors && typeof json.actors === 'object' && !Array.isArray(json.actors) ? json.actors : null;
  if (!actors || !Object.keys(actors).length) { errs.push('"actors" is missing: name each body in the moment'); return errs; }
  for (const [n, a] of Object.entries(actors)) {
    const at = `actor "${n}"`;
    if (!a || typeof a !== 'object') { errs.push(`${at} must be an object`); continue; }
    const def = typeof a.rig === 'string' ? rigs.def(a.rig) : null;
    if (!def) errs.push(`${at}: "rig" must be a registered rig (${rigs.names().join(', ')}); got ${JSON.stringify(a.rig)}`);
    if (a.path !== undefined && !paths[a.path]) errs.push(`${at}: no path "${a.path}" in "paths"`);
    const keyedAt = Array.isArray(a.at) && Array.isArray(a.at[0]);
    if (a.at !== undefined) { if (keyedAt) errs.push(...keyErrors(a.at, 'vec3', `${at}.at`)); else if (!isVec3(a.at)) errs.push(`${at}: "at" must be [x, y, z] or keys of it`); }
    if (a.onPath !== undefined) { if (!a.path) errs.push(`${at}: "onPath" blends from "at" onto a path, so it needs "path"`); else errs.push(...keyErrors(a.onPath, 'scalar', `${at}.onPath`, { min: 0, max: 1 })); }
    if (a.aim !== undefined) {
      const r = a.aim && typeof a.aim.at === 'string' ? (a.aim.at.includes('.') ? splitRef(a.aim.at) : { actor: a.aim.at }) : null;
      if (!r || !actors[r.actor] || r.actor === n) errs.push(`${at}: "aim.at" names another actor (or "actor.joint") to face`);
      if (!a.aim || a.aim.w === undefined) errs.push(`${at}: "aim.w" is keyed weights, 0 (its own heading) to 1 (facing the target)`);
      else errs.push(...keyErrors(a.aim.w, 'scalar', `${at}.aim.w`, { min: 0, max: 1 }));
      if (a.aim && a.aim.turn !== undefined && a.aim.turn !== 1 && a.aim.turn !== -1) errs.push(`${at}: "aim.turn" is 1 (turn to its left) or -1 (to its right)`);
    }
    for (const k of ['along', 'side', 'scale']) if (a[k] !== undefined && !isNum(a[k])) errs.push(`${at}: "${k}" must be a number`);
    if (a.face !== undefined && !isNum(a.face) && a.face !== 'forward' && a.face !== 'back') errs.push(`${at}: "face" is "forward", "back" or degrees`);
    if (a.tilt !== undefined) errs.push(...keyErrors(a.tilt, 'vec3', `${at}.tilt`));
    if (a.rise !== undefined) errs.push(...keyErrors(a.rise, 'scalar', `${at}.rise`));
    if (!Array.isArray(a.clips) || !a.clips.length) errs.push(`${at}: "clips" needs at least one [time, "rig/clip", options?]`);
    else {
      let last = -Infinity;
      a.clips.forEach((c, i) => {
        const w = `${at} clip ${i}`;
        if (!Array.isArray(c) || !isNum(c[0]) || typeof c[1] !== 'string') { errs.push(`${w}: [time, "rig/clip", options?]`); return; }
        if (c[0] < last) errs.push(`${w}: clips must be in time order`);
        last = c[0];
        if (!/^[\w-]+\/[\w-]+$/.test(c[1])) errs.push(`${w}: "${c[1]}" should be "rig/clip" (studio/clips/<rig>/<clip>.json)`);
        const o = c[2] || {};
        if (o.stride !== undefined && !(o.stride > 0)) errs.push(`${w}: "stride" is metres per play of the clip, above 0`);
        if (o.fade !== undefined && !(o.fade >= 0)) errs.push(`${w}: "fade" is seconds, 0 or more`);
        if (o.speed !== undefined && !(o.speed > 0)) errs.push(`${w}: "speed" must be above 0`);
      });
    }
    if (a.targets !== undefined) {
      if (typeof a.targets !== 'object') errs.push(`${at}: "targets" maps a clip's live target to "actor.joint"`);
      else for (const [k, v] of Object.entries(a.targets)) { const r = splitRef(v); if (!r || !actors[r.actor]) errs.push(`${at}.targets.${k}: "${v}" must be "actor.joint" naming an actor in the scene`); }
    }
  }
  const holds = json.holds === undefined ? [] : json.holds;
  if (!Array.isArray(holds)) errs.push('"holds" must be a list');
  else holds.forEach((h, i) => {
    const at = `hold ${i}`;
    const f = splitRef(h && h.from), to = splitRef(h && h.to);
    if (!f || !actors[f.actor]) { errs.push(`${at}: "from" must be "actor.limb" naming an actor in the scene`); return; }
    if (!to || !actors[to.actor]) { errs.push(`${at}: "to" must be "actor.joint" or "actor.limb" naming an actor in the scene`); return; }
    if (f.actor === to.actor) errs.push(`${at}: an actor can't hold itself`);
    const fd = rigs.def(actors[f.actor].rig), td = rigs.def(actors[to.actor].rig);
    if (fd && !fd.chains[f.name]) errs.push(`${at}: "${f.name}" is not a limb of ${actors[f.actor].rig} (${Object.keys(fd.chains).join(', ')})`);
    if (!WEIGHTS.some((k) => h[k] !== undefined)) errs.push(`${at}: give at least one of ${WEIGHTS.join(', ')} (keyed weights 0 to 1)`);
    for (const k of WEIGHTS) if (h[k] !== undefined) errs.push(...keyErrors(h[k], 'scalar', `${at}.${k}`, { min: 0, max: 1 }));
    if (h.trail !== undefined) { if (h.tow === undefined) errs.push(`${at}: "trail" swings a towed body round, so it needs "tow"`); errs.push(...keyErrors(h.trail, 'scalar', `${at}.trail`, { min: 0, max: 1 })); }
    if (h.lift !== undefined && td && !td.chains[to.name]) errs.push(`${at}: "lift" needs "to" to be a limb (${Object.keys(td.chains).join(', ')}), not "${to.name}"`);
    if (h.offset !== undefined && !isVec3(h.offset)) errs.push(`${at}: "offset" must be [x, y, z] metres in the held joint's frame`);
  });
  if (json.checks !== undefined) {
    const c = json.checks;
    for (const k of ['gap', 'slide', 'snap']) if (c[k] !== undefined && !(c[k] > 0)) errs.push(`checks.${k} must be a number above 0`);
    if (c.speed !== undefined) for (const [n, r] of Object.entries(c.speed)) if (!actors[n] || !Array.isArray(r) || r.length < 2 || r.length > 4 || !r.every(isNum)) errs.push(`checks.speed.${n}: [lowest, highest, from?, to?] m/s (from and to in seconds) for an actor in the scene`);
  }
  if (!errs.length) { const cyc = orderActors(json); if (!Array.isArray(cyc)) errs.push(cyc); }
  return errs;
}

// Who must be posed before whom: a held body before its holder, a live target's body before the
// actor aiming at it. A loop can't be played and is refused.
function orderActors(json) {
  const names = Object.keys(json.actors);
  const before = new Map(names.map((n) => [n, new Set()]));
  for (const h of json.holds || []) before.get(splitRef(h.from).actor).add(splitRef(h.to).actor);
  for (const [n, a] of Object.entries(json.actors)) for (const v of Object.values(a.targets || {})) { const r = splitRef(v); if (r.actor !== n) before.get(n).add(r.actor); }
  for (const [n, a] of Object.entries(json.actors)) if (a.aim && typeof a.aim.at === 'string') { const t = a.aim.at.split('.')[0]; if (t !== n && before.has(t) && !(json.holds || []).some((h) => splitRef(h.to).actor === n && splitRef(h.from).actor === t)) before.get(n).add(t); }
  const out = [], state = new Map();
  const visit = (n, trail) => {
    if (state.get(n) === 2) return true;
    if (state.get(n) === 1) return `holds or targets go round in a loop (${[...trail, n].join(' → ')}): one body has to lead`;
    state.set(n, 1);
    for (const m of before.get(n)) { const r = visit(m, [...trail, n]); if (r !== true) return r; }
    state.set(n, 2); out.push(n); return true;
  };
  for (const n of names) { const r = visit(n, []); if (r !== true) return r; }
  return out;
}

// --- Loading ----------------------------------------------------------------------------------
// clipOf("guardian/drag") returns that clip's JSON (studio/clips/guardian/drag.json): the caller
// reads files (Node) or fetches them (browser), so this file does neither.
export function loadScene(json, clipOf) {
  const errs = validateScene(json);
  const clips = new Map();
  if (!errs.length) for (const a of Object.values(json.actors)) for (const c of a.clips) {
    if (clips.has(c[1])) continue;
    try {
      const cj = clipOf(c[1]);
      if (!cj) throw new Error('not found');
      const clip = loadClip(cj);
      if (clip.rig !== c[1].split('/')[0]) errs.push(`clip "${c[1]}" is for rig "${clip.rig}"`);
      clips.set(c[1], clip);
    } catch (e) { errs.push(`clip "${c[1]}": ${String(e.message || e).split('\n').join(' ')}`); }
  }
  if (errs.length) throw new Error(`scene ${json && json.name ? '"' + json.name + '" ' : ''}is not valid:\n  - ` + errs.join('\n  - '));
  const paths = {};
  for (const [n, p] of Object.entries(json.paths || {})) paths[n] = makePath(p, json.length);
  const actors = {};
  for (const [n, a] of Object.entries(json.actors)) {
    actors[n] = {
      name: n, rig: a.rig, path: a.path || null, along: a.along || 0, side: a.side || 0,
      at: Array.isArray(a.at) && Array.isArray(a.at[0]) ? normKeys(a.at) : normKeys([[0, a.at || [0, 0, 0]]]), hasAt: a.at !== undefined,
      onPath: a.onPath ? normKeys(a.onPath) : null,
      aim: a.aim ? { ref: a.aim.at.includes('.') ? splitRef(a.aim.at) : { actor: a.aim.at, name: null }, w: normKeys(a.aim.w), turn: a.aim.turn || 0 } : null,
      face: a.face === undefined ? 'forward' : a.face, scale: a.scale,
      tilt: a.tilt ? normKeys(a.tilt) : null, rise: a.rise ? normKeys(a.rise) : null,
      clips: a.clips.map(([t, ref, o]) => ({ t, ref, clip: clips.get(ref), fade: (o && o.fade) ?? 0.15, loop: o && o.loop !== undefined ? !!o.loop : null, stride: (o && o.stride) || 0, speed: (o && o.speed) || 0, minRate: (o && o.minRate) ?? 0.2 })),
      targets: a.targets || {}
    };
  }
  const holds = (json.holds || []).map((h) => {
    const f = splitRef(h.from), to = splitRef(h.to);
    return { key: `${h.from}>${h.to}`, from: f, to, offset: h.offset || null, taut: !!h.taut, reach: h.reach ? normKeys(h.reach) : null, tow: h.tow ? normKeys(h.tow) : null, lift: h.lift ? normKeys(h.lift) : null, trail: h.trail ? normKeys(h.trail) : null };
  });
  const c = json.checks || {};
  return {
    format: SCENE_FORMAT, name: json.name, length: json.length, actors, paths, holds, order: orderActors(json),
    checks: { gap: c.gap ?? DEFAULT_CHECKS.gap, slide: c.slide ?? DEFAULT_CHECKS.slide, snap: c.snap ?? DEFAULT_CHECKS.snap, speed: c.speed || {} },
    source: json
  };
}

// A path: the line, and how far along it is at any time (the speed keys, integrated).
function makePath(p, length) {
  const pts = p.points.map(([x, , z]) => new THREE.Vector2(x, z));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const speed = normKeys(p.speed);
  const dt = 1 / 240, n = Math.ceil((length + 1) / dt) + 1, dist = new Float64Array(n);
  let prev = sampleKeys(speed, 0);
  for (let i = 1; i < n; i++) { const v = sampleKeys(speed, i * dt); dist[i] = dist[i - 1] + (prev + v) * 0.5 * dt; prev = v; }
  const total = cum[cum.length - 1];
  return {
    total, speed,
    // Past the end of the table (a host playing a haul on until it arrives) it carries on at the last speed.
    distAt(t) {
      const f = Math.max(0, t) / dt;
      if (f >= n - 1) return dist[n - 1] + sampleKeys(speed, (n - 1) * dt) * (Math.max(0, t) - (n - 1) * dt);
      const i = Math.floor(f), u = f - i;
      return dist[i] + (dist[i + 1] - dist[i]) * u;
    },
    speedAt(t) { return sampleKeys(speed, t); },
    // A point s metres along (straight on past either end), into out (x, z).
    pointAt(s, out) {
      let i = 1;
      if (s <= 0) i = 1; else if (s >= total) i = pts.length - 1; else while (cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i], L = Math.max(1e-6, cum[i] - cum[i - 1]);
      const u = (s - cum[i - 1]) / L;
      return out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    }
  };
}

// --- Playing ----------------------------------------------------------------------------------
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _h = new THREE.Vector3(), _g = new THREE.Vector3();
const _p2 = new THREE.Vector2(), _q2 = new THREE.Vector2();
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _qy = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _e = new THREE.Euler();
const _s = new THREE.Vector3(), _gv = new THREE.Vector3();
const lerpAngle = (a, b, w) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * w;

// How low each limb's end sits when the rig stands at rest, plus a margin: at or under that it's on
// the ground. Limbs that don't stand on anything at rest (the marine's hands) get null. Per rig, once.
const CONTACT = new Map();
function contactHeights(rig) {
  if (CONTACT.has(rig)) return CONTACT.get(rig);
  const inst = rigs.get(rig).create({});
  inst.group.updateWorldMatrix(true, true);
  const out = {};
  for (const [cn, ch] of Object.entries(inst.def.chains)) {
    const y = inst.R[ch.end] ? new THREE.Vector3().setFromMatrixPosition(inst.R[ch.end].matrixWorld).y : Infinity;   // metres, at display scale
    out[cn] = y < 0.26 ? y + 0.06 : null;
  }
  CONTACT.set(rig, out);
  return out;
}

// opts.parent: where the scene's own bodies go (the host's group at the moment's place; scene space
// is that group's space). opts.bodies: { actor: instance } for bodies the host already has, made with
// rigs.get(rig).create({ group }); they're moved in their own parent's frame, wherever that is.
export function createScene(scene, opts = {}) {
  const root = new THREE.Group();
  root.name = 'scene:' + scene.name;
  // opts.paths: { name: [[x, y, z], ...] } lays a path where the host needs it (to this cave's mouth),
  // keeping the scene's speed keys.
  const paths = { ...scene.paths };
  for (const [n, pts] of Object.entries(opts.paths || {})) {
    if (!scene.paths[n]) throw new Error(`scene "${scene.name}" has no path "${n}" to lay out`);
    paths[n] = makePath({ points: pts, speed: scene.source.paths[n].speed }, scene.length);
  }
  if (opts.parent) opts.parent.add(root);
  const A = {};
  for (const [n, a] of Object.entries(scene.actors)) {
    const given = opts.bodies && opts.bodies[n];
    const inst = given || rigs.get(a.rig).create(a.scale !== undefined ? { scale: a.scale } : {});
    if (!given) root.add(inst.group);
    inst.group.updateWorldMatrix(true, false);
    const scale = worldScale(inst.group, new THREE.Vector3());
    A[n] = { spec: a, inst, given: !!given, scale, contact: contactHeights(a.rig), towed: false, pos: new THREE.Vector3(), yaw: 0, clipIdx: -1, ct: 0, fade: null, rate: 1, speed: 0, lastXZ: null, slides: {}, prevQ: new Map() };
  }
  // A joint by name: a limb's name means its end (a hand, an ankle).
  const jointOf = (ref) => {
    const a = A[ref.actor];
    const ch = a.inst.def.chains[ref.name];
    const j = ch ? a.inst.R[ch.end] : a.inst.R[ref.name];
    if (!j) throw new Error(`scene "${scene.name}": ${ref.actor} has no joint or limb "${ref.name}"`);
    return j;
  };
  for (const h of scene.holds) { h.fromJ = jointOf({ actor: h.from.actor, name: h.from.name }); h.toJ = jointOf(h.to); }
  for (const a of Object.values(A)) a.targetJ = Object.fromEntries(Object.entries(a.spec.targets).map(([k, v]) => [k, jointOf(splitRef(v))]));

  const gripPoint = (h, out) => {
    out.setFromMatrixPosition(h.toJ.matrixWorld);
    if (h.offset) out.add(_v2.set(...h.offset).applyQuaternion(worldQuat(h.toJ, _qt)));
    return out;
  };
  // Put a body where the scene says, in its own parent's frame (the host's marine hangs off the player).
  const placeBody = (a) => {
    const g = a.inst.group;
    root.updateWorldMatrix(true, false);
    _qy.setFromAxisAngle(_v.set(0, 1, 0), a.yaw);
    const tilt = a.spec.tilt ? sampleKeys(a.spec.tilt, T) : null;
    if (tilt) _qy.multiply(_qt.setFromEuler(_e.set(tilt[0] * D2R, tilt[1] * D2R, tilt[2] * D2R, 'XYZ')));
    _m.compose(a.pos, _qy, _s.set(1, 1, 1)).premultiply(root.matrixWorld);   // scene → world (unit scale)
    if (g.parent) { g.parent.updateWorldMatrix(true, false); _m.premultiply(_mi.copy(g.parent.matrixWorld).invert()); }
    _m.decompose(g.position, g.quaternion, _v2);
    // Keep the body's own size: its world scale when the scene took it, in its parent's frame.
    const ps = g.parent ? worldScale(g.parent, _v2) : _v2.set(1, 1, 1);
    g.scale.set(a.scale.x / ps.x, a.scale.y / ps.y, a.scale.z / ps.z);
    g.updateWorldMatrix(false, true);
  };
  // The ground under a point in scene space, as a scene-space height (0 without a ground).
  const groundAt = (x, z) => {
    if (!opts.ground) return 0;
    root.updateWorldMatrix(true, false);
    root.localToWorld(_gv.set(x, 0, z));
    const gy = opts.ground(_gv.x, _gv.z);
    return root.worldToLocal(_gv.set(_gv.x, gy, _gv.z)).y;
  };
  const place = (a) => {
    const s = a.spec;
    const at = sampleKeys(s.at, T);
    let yaw = (typeof s.face === 'number' ? s.face : 0) * D2R;
    a.pos.set(at[0], at[1], at[2]);
    if (s.path) {
      const P = paths[s.path];
      const d = P.distAt(T) + s.along;
      P.pointAt(d, _p2);
      const ahead = P.pointAt(d + 0.25, _q2), bx = ahead.x, bz = ahead.y;
      const behind = P.pointAt(d - 0.25, _q2);
      const heading = Math.atan2(bx - behind.x, bz - behind.y);
      const py = heading + (s.face === 'back' ? Math.PI : s.face === 'forward' ? 0 : s.face * D2R);
      const px = _p2.x - Math.cos(heading) * s.side, pz = _p2.y + Math.sin(heading) * s.side;
      // On the path, or blending onto it from "at" (a lunge that ends where the haul starts).
      const w = s.onPath ? sampleKeys(s.onPath, T) : 1;
      a.pos.set(at[0] + (px - at[0]) * w, at[1] * (1 - w), at[2] + (pz - at[2]) * w);
      yaw = s.onPath ? lerpAngle(yaw, py, w) : py;
    }
    // Facing another body: a creature grabs facing what it grabs, then turns away to go.
    if (s.aim) {
      const w = sampleKeys(s.aim.w, T);
      if (w > 0) {
        const t = A[s.aim.ref.actor];
        if (s.aim.ref.name) { const j = jointOf(s.aim.ref); j.updateWorldMatrix(true, false); _gv.setFromMatrixPosition(j.matrixWorld); }
        else t.inst.group.getWorldPosition(_gv);
        root.worldToLocal(_gv);
        const dx = _gv.x - a.pos.x, dz = _gv.z - a.pos.z;
        if (Math.hypot(dx, dz) > 1e-3) {
          // Which way round it turns between facing the target and its own heading: the short way, or
          // the way "turn" says (1 turns to its left, -1 to its right), for a turn near 180°.
          let d = Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw));
          if (s.aim.turn && Math.sign(d) !== Math.sign(s.aim.turn) && Math.abs(d) > Math.PI * 0.5) d -= Math.sign(d) * Math.PI * 2;
          yaw += d * Math.min(1, w);
        }
      }
    }
    // Handed over from gameplay: start where the host's body really was, and ease into the scene.
    const en = opts.enter && opts.enter[s.name];
    if (en && en.time > 0 && T < en.time) {
      const u = EASES.smooth(T / en.time);
      if (!a.enterFrom) {
        root.updateWorldMatrix(true, false);
        const p0 = root.worldToLocal(en.position.clone());
        _qt.setFromRotationMatrix(root.matrixWorld);
        const rootYaw = new THREE.Euler().setFromQuaternion(_qt, 'YXZ').y;
        a.enterFrom = { p: p0, yaw: (en.yaw ?? yaw + rootYaw) - rootYaw };
      }
      a.pos.lerpVectors(a.enterFrom.p, a.pos, u);
      yaw = lerpAngle(a.enterFrom.yaw, yaw, u);
    }
    a.yaw = yaw;
    a.pos.y += groundAt(a.pos.x, a.pos.z);
    if (s.rise) a.pos.y += sampleKeys(s.rise, T);
    placeBody(a);
  };
  // The clip an actor plays now, its rate, and the pose.
  const poseActor = (a, dt, reach) => {
    const s = a.spec;
    let idx = -1;
    for (let i = 0; i < s.clips.length; i++) if (s.clips[i].t <= T + 1e-9) idx = i;
    if (idx < 0) idx = 0;
    const entry = s.clips[idx];
    if (idx !== a.clipIdx) {
      if (a.clipIdx >= 0 && entry.fade > 0) { const pe = s.clips[a.clipIdx]; a.fade = { entry: pe, ct: a.ct, age: 0, dur: entry.fade }; }
      a.clipIdx = idx; a.ct = 0;   // pins carry over: a foot planted at the change stays planted
    }
    const clip = entry.loop === null ? entry.clip : { ...entry.clip, loop: entry.loop };
    // Stepping at the ground's speed: a stride is metres per play of the clip.
    a.rate = entry.speed || (entry.stride ? Math.max(entry.minRate, (a.speed * clip.length) / entry.stride) : 1);
    const ct0 = a.ct;
    a.ct += dt * a.rate;
    const events = clipEvents(clip, ct0, a.ct).map((e) => ({ actor: s.name, t: T, name: e.name, data: e.data }));
    let pose = sampleClip(clip, a.ct);
    if (a.fade) {
      a.fade.age += dt; a.fade.ct += dt * a.rate;
      const fe = a.fade.entry, fc = fe.loop === null ? fe.clip : { ...fe.clip, loop: fe.loop };
      const w = Math.min(1, a.fade.age / a.fade.dur);
      pose = blendPoses(sampleClip(fc, a.fade.ct), pose, EASES.smooth(w));
      if (w >= 1) a.fade = null;
    }
    const targets = {};
    for (const [k, j] of Object.entries(a.targetJ)) targets[k] = new THREE.Vector3().setFromMatrixPosition(j.matrixWorld);
    // A limb another body holds (towing or lifting it) isn't planted by its own clip any more.
    const free = {};
    // By as much as the hold has it: the lift when there is one (the limb is going to the hand), else the tow.
    for (const h of scene.holds) if (h.to.actor === s.name && a.inst.def.chains[h.to.name]) {
      const w = h.lift ? sampleKeys(h.lift, T) || 0 : sampleKeys(h.tow, T) || 0;
      if (w > 0) free[h.to.name] = Math.max(free[h.to.name] || 0, w);
    }
    // A body still easing in from gameplay doesn't pin its feet yet: a pin taken where the game had
    // the foot would hold it there while the body slides into the scene under it (a knee folds up,
    // then springs when the pin lets go). It pins where it stands once it has arrived.
    const en = opts.enter && opts.enter[s.name];
    if (a.given && en && en.time > 0 && T < en.time) {
      for (const st of Object.values(a.inst.plants)) { st.at = null; st.carry = null; st.pin = null; st.swing = null; }
      a.inst.stepping = 0;
    }
    applyPose(a.inst, pose, { targets, reach, dt, free });
    return events;
  };

  let T = 0;
  const worst = {};
  const noteWorst = (kind, key, value, extra) => {
    const k = kind + ':' + key;
    if (!worst[k] || value > worst[k].value) worst[k] = { kind, key, value, t: T, ...extra };
  };
  const step = (dt) => {
    T += dt;
    const events = [];
    const checks = { gap: {}, slide: {}, speed: {}, snap: {}, bad: false };
    for (const n of scene.order) {
      const a = A[n];
      // Ground speed from the path: what a stride is matched against.
      place(a);
      // Ground speed of where the scene puts it (a path, a keyed "at", or both): what a stride matches.
      a.speed = a.lastBase && dt > 0 ? Math.hypot(a.pos.x - a.lastBase.x, a.pos.z - a.lastBase.z) / dt
        : (a.spec.path ? Math.abs(paths[a.spec.path].speedAt(T)) : 0);
      a.lastBase = a.pos.clone();
      const reach = {};
      for (const h of scene.holds) if (h.from.actor === n) {
        const w = sampleKeys(h.reach, T) || 0;
        if (w > 0) { h.toJ.parent.updateWorldMatrix(true, true); reach[h.from.name] = { at: gripPoint(h, new THREE.Vector3()), w }; }
      }
      a.reaching = reach;
      events.push(...poseActor(a, dt, reach));
      // This actor's holds on bodies already posed: tow them along the ground, lift the held limb.
      for (const h of scene.holds) if (h.from.actor === n) {
        const b = A[h.to.actor];
        const tow = sampleKeys(h.tow, T) || 0, lift = sampleKeys(h.lift, T) || 0, trail = sampleKeys(h.trail, T) || 0;
        _h.setFromMatrixPosition(h.fromJ.matrixWorld);
        b.towed = tow > 0;
        // Lift, then tow, then lift again: lifting a leg moves the ankle over the ground too, so the
        // body is towed to where the lifted ankle ends up, and the leg settles onto the hand from there.
        // Trail: a body hauled by one limb swings round to stretch out behind the grip, away from
        // whoever has it (its own +Z, feet to head, points from the holder to it).
        if (trail > 0 && tow > 0) {
          root.worldToLocal(_v.copy(_h));
          A[h.from.actor].inst.group.getWorldPosition(_v2); root.worldToLocal(_v2);
          const dx = _v.x - _v2.x, dz = _v.z - _v2.z;
          if (Math.hypot(dx, dz) > 1e-3) { b.yaw = lerpAngle(b.yaw, Math.atan2(dx, dz), Math.min(1, trail)); placeBody(b); }
        }
        if (lift > 0) solveChain(b.inst, h.to.name, _h, lift);
        for (let k = 0; tow > 0 && k < 4; k++) {
          gripPoint(h, _g);
          root.worldToLocal(_v.copy(_h)); root.worldToLocal(_v2.copy(_g));
          const dx = (_v.x - _v2.x) * tow, dz = (_v.z - _v2.z) * tow;
          if (Math.hypot(dx, dz) < 1e-4) break;
          const g0 = groundAt(b.pos.x, b.pos.z);
          b.pos.x += dx; b.pos.z += dz;
          b.pos.y += groundAt(b.pos.x, b.pos.z) - g0;
          placeBody(b);
          b.inst.group.updateWorldMatrix(false, true);
          if (lift > 0) solveChain(b.inst, h.to.name, _h, lift);
        }
          // Taut: a body hauled by a limb stretches it. Slide the body back from the hand (along the
        // ground, the way it trails) until that limb could just reach, so it's pulled straight.
        for (let k = 0; h.taut && tow > 0 && lift > 0 && k < 2; k++) {
          const ch = b.inst.def.chains[h.to.name];
          const L = (ch.lengths[0] + ch.lengths[1]) * (b.inst.group.scale.x || 1) * 0.985;
          const hip = _v.setFromMatrixPosition(b.inst.R[ch.root].matrixWorld);
          const dy = _h.y - hip.y, dh = Math.hypot(_h.x - hip.x, _h.z - hip.z);
          const want = Math.sqrt(Math.max(0, L * L - dy * dy));
          if (dh > 1e-3 && want > dh + 1e-3) {
            root.worldToLocal(hip); root.worldToLocal(_v2.copy(_h));
            const ux = (hip.x - _v2.x), uz = (hip.z - _v2.z), ul = Math.hypot(ux, uz) || 1;
            const tw = tow * Math.min(1, lift) ** 2;   // it tightens as the leg is lifted, not in one jerk
            b.pos.x += (ux / ul) * (want - dh) * tw; b.pos.z += (uz / ul) * (want - dh) * tw;
            placeBody(b); b.inst.group.updateWorldMatrix(false, true);
            solveChain(b.inst, h.to.name, _h, lift);
          }
        }
        // Hung by it: if the held limb, pulled straight, still doesn't reach up to the hand, the body
        // comes off the ground by the difference (up to 0.8 m): it's being lifted by the leg.
        if (tow > 0 && lift > 0) {
          gripPoint(h, _g);
          const up = (_h.y - _g.y) * tow;
          if (up > 0.01) {
            root.worldToLocal(_v.set(0, 0, 0).add(_h)); root.worldToLocal(_v2.copy(_g));
            b.pos.y += Math.min(0.8, _v.y - _v2.y) * Math.min(1, lift) ** 2;   // only once the leg is really held up
            placeBody(b); b.inst.group.updateWorldMatrix(false, true);
            solveChain(b.inst, h.to.name, _h, lift);
          }
        }
      }
    }
    // A body handed over mid-pose (the marine was running with his rifle up) eases from that pose
    // into the scene's over its "enter" time, joint by joint, instead of jumping to it in one frame.
    for (const a of Object.values(A)) {
      const en = opts.enter && opts.enter[a.spec.name];
      if (!a.given || !en || !(en.time > 0) || T >= en.time || !a.inst.before) continue;
      const u = EASES.smooth(Math.min(1, T / en.time));
      for (const [o, r] of a.inst.before) {
        _qt.copy(o.quaternion); _v.copy(o.position);   // the scene's pose, before it's overwritten
        slerpTo(o.quaternion.copy(r.q), _qt, u);
        o.position.lerpVectors(r.p, _v, u);
      }
      a.inst.group.updateWorldMatrix(false, true);
    }
    // Checks, after everyone is where they end up this frame.
    for (const h of scene.holds) {
      const w = Math.max(sampleKeys(h.reach, T) || 0, sampleKeys(h.tow, T) || 0);
      if (w < 0.99) continue;
      _h.setFromMatrixPosition(h.fromJ.matrixWorld);
      const gap = _h.distanceTo(gripPoint(h, _g));
      const bad = gap > scene.checks.gap;
      checks.gap[h.key] = { value: gap, bad };
      checks.bad ||= bad;
      noteWorst('gap', h.key, gap, { bad });
    }
    for (const [n, a] of Object.entries(A)) {
      // Feet on the ground: how far each has moved over the ground since it touched down. On the
      // ground is a limb the clip plants, or one whose end is down at its standing height (a clip
      // that plants nothing still gets caught gliding). A body being towed slides by design: skipped.
      let ws = 0, wc = null;
      for (const [cn, ch] of Object.entries(a.inst.def.chains)) {
        const st = a.inst.plants[cn];
        const end = a.inst.R[ch.end];
        // A limb holding something goes where the hold puts it; its gap is the check, not slide.
        if (!end || a.towed || (a.reaching && a.reaching[cn])) { delete a.slides[cn]; continue; }
        root.worldToLocal(_v.setFromMatrixPosition(end.matrixWorld));
        const ch0 = a.contact[cn];
        const down = (st && st.planted) || (ch0 !== null && _v.y <= ch0);
        if (!down) { delete a.slides[cn]; continue; }
        if (!a.slides[cn]) a.slides[cn] = new THREE.Vector2(_v.x, _v.z);
        const d = Math.hypot(_v.x - a.slides[cn].x, _v.z - a.slides[cn].y);
        noteWorst('slide', `${n}.${cn}`, d, { limb: cn, bad: d > scene.checks.slide });
        if (d > ws) { ws = d; wc = cn; }
      }
      const sb = ws > scene.checks.slide;
      checks.slide[n] = { value: ws, limb: wc, bad: sb };
      checks.bad ||= sb;
      // Ground speed, from where the body actually went (a tow counts).
      a.inst.group.getWorldPosition(_v); root.worldToLocal(_v);
      const sp = a.lastXZ && dt > 0 ? Math.hypot(_v.x - a.lastXZ.x, _v.z - a.lastXZ.y) / dt : 0;
      a.lastXZ = new THREE.Vector2(_v.x, _v.z);
      // [lowest, highest] m/s, optionally only from a time (and to one): a lunge is allowed to be fast.
      const range = scene.checks.speed[n];
      const inWindow = range && T >= (range[2] ?? 0) - 1e-9 && T <= (range[3] ?? Infinity) + 1e-9;
      const vb = !!inWindow && dt > 0 && (sp < range[0] - 1e-6 || sp > range[1] + 1e-6);
      checks.speed[n] = { value: sp, bad: vb };
      checks.bad ||= vb;
      noteWorst('speed', n, sp, { bad: vb });
      // The biggest one-frame joint turn, at 60 fps.
      let wt = 0, wj = null;
      for (const [jn, j] of Object.entries(a.inst.R)) {
        if (!j || !j.isObject3D) continue;
        const q = a.prevQ.get(j);
        if (q) { const ang = 2 * Math.acos(Math.min(1, Math.abs(q.dot(j.quaternion)))) * (STEP / Math.max(1e-4, dt)); if (ang > wt) { wt = ang; wj = jn; } }
        a.prevQ.set(j, j.quaternion.clone());
      }
      const nb = wt > scene.checks.snap;
      checks.snap[n] = { value: wt, joint: wj, bad: nb };
      checks.bad ||= nb;
      if (wj) noteWorst('snap', n, wt, { joint: wj, bad: nb });
    }
    return { t: T, events, checks };
  };
  const reset = () => {
    T = 0;
    for (const k of Object.keys(worst)) delete worst[k];
    for (const a of Object.values(A)) { a.clipIdx = -1; a.ct = 0; a.fade = null; a.lastXZ = null; a.slides = {}; a.prevQ.clear(); a.inst.plants = {}; a.inst.stepping = 0; a.enterFrom = null; a.lastBase = null; }
    // Time 0: everyone placed and posed, nothing moved yet.
    return step(0);
  };
  const first = reset();
  return {
    root, actors: Object.fromEntries(Object.entries(A).map(([n, a]) => [n, { inst: a.inst, get speed() { return a.speed; }, get rate() { return a.rate; } }])),
    get t() { return T; },
    get done() { return T >= scene.length - 1e-9; },
    // How far along a path the scene is (metres), and how long the path is: the host ends a haul on arrival.
    path(name) { const P = paths[name]; return P ? { distance: P.distAt(T), total: P.total } : null; },
    // The worst of each check since the last reset/seek, keyed "kind:what": gap:guardian.handR>marine.footL,
    // slide:guardian.footL, speed:guardian, snap:guardian. Each { kind, key, value, t, bad, ... }.
    get worst() { return { ...worst }; },
    first,
    update(dt) { return step(Math.max(0, dt)); },
    // Replays from 0 in fixed 1/60 s steps, so the pose at t is the same every time.
    seek(t) {
      let r = reset();
      const target = Math.max(0, Math.min(scene.length, t));
      while (T < target - 1e-9) r = step(Math.min(STEP, target - T));
      return r;
    },
    reset,
    // Done with it: the host's own bodies go back exactly as they were handed over, the scene's
    // own bodies and its root leave the world.
    dispose() {
      for (const a of Object.values(A)) if (a.given && a.inst.restore) a.inst.restore();
      root.removeFromParent();
    }
  };
}
