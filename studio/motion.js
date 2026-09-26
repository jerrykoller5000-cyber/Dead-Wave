// studio/motion.js — reactive bodies: light active ragdolls (D-42). Claude's (studio/*).
//
// Euphoria's idea, cut down to what a browser horde can afford. A body plays its animation until
// something hits it. Then it becomes a handful of points joined by bones, held in its pose by muscles
// whose strength (tone) drops when it's hit and comes back as it recovers. Planted feet stay where they
// are; when its weight leaves its feet it takes stagger steps; past a limit it falls, puts its hands out,
// lies there, and gets up (or, dead, goes limp and settles). What it looks like is data: a preset file,
// studio/motion/<rig>/<name>.json (docs/studio.md §10). What a body is made of is data too: the rig's
// `body` entry in studio/rigs.js. The game, the studio's scenes and the motion lab all run this file.
//
//   const body = createBody(inst, loadMotion(json), { ground: (x, z) => y, pool });
//   each frame, after the animation posed the rig:
//     body.follow();                  read the animated pose (cheap; call it every frame)
//     const events = body.update(dt, { lod }); simulate (does nothing while the body is only animating)
//     body.apply();                   write the simulated pose onto the rig, by body.weight
//   body.hit({ at: 'chest' | [x, y, z], dir: [x, y, z], power, kind })   power: m/s at the hit point
//   body.kill({ dir, power, at, kind })                                   limp from now on
//   body.hold('footL', target, { strength })   a point pinned to a moving target (a Vector3, or a
//   body.release('footL')                      function returning [x, y, z]); the rest hangs off it
//   body.lose('legL')                          a part gone (armL, armR, legL, legR, head)
//
// Getting up: a body that goes down emits ['getup', { side, heading }] when it starts to rise. `side`
// is 'front' (it lies face down) or 'back'; `heading` is the world yaw its rig's group should turn to
// so that a get-up clip that starts lying (the preset's getup.front or getup.back) lies where the
// body does. A host that plays clips turns the group, plays the clip from its start, and the body's
// muscles follow it while its weight goes to 0 over getup.time. A host that doesn't keeps the old blend.
//
// Level of detail: update(dt, { lod }) with lod 0 (every step), 1 (half the steps, twice as long) or
// 2 (the pose holds still; its timers still run, so it still gets up, recovers or settles).
//
// Units: metres, seconds. Deterministic: no randomness inside, so a scene replays the same every time.
import * as THREE from 'three';
import { slerpTo } from './ik.js';

export const MOTION_FORMAT = 'dw-motion/1';
export const HIT_KINDS = ['bullet', 'pellet', 'blast', 'blade', 'crush'];
// The parts a body can lose: the game's partsLost keys (index.html emptyPartsLost).
export const BODY_PARTS = ['armL', 'armR', 'legL', 'legR', 'head'];
const TONE_GROUPS = ['legs', 'spine', 'arms', 'head'];
const SUB = 1 / 120;           // fixed physics step
const ITER = 4;                // constraint passes per step
// A body a hand hauls stretches along the pull: twice the passes keep its limbs their length (the
// grip stays in the hand while it swings). Held bodies are few; this costs nothing elsewhere.
const ITER_HELD = 8;
// A muscle is a damped spring toward the animated pose. Its stiffness (ω², 1/s²) is MUSCLE × tone²:
// at tone 1 a limb sags 3 mm under its own weight, at 0.3 about 4 cm, at 0.1 a third of a metre,
// and at 0.03 it's limp. Damped at ZETA of critical, so a muscle pulls back without wobbling.
const MUSCLE = 3000, ZETA = 0.8;
const springK = (tone, h) => Math.min(0.5, MUSCLE * tone * tone * h * h);
const springC = (tone, h) => Math.min(0.9, 2 * ZETA * Math.sqrt(MUSCLE) * tone * h);
const CLIP_REF = /^[\w-]+\/[\w-]+$/;

const DEFAULTS = {
  mass: 1,
  strength: 1,
  tone: { legs: 0.85, spine: 0.8, arms: 0.6, head: 0.7 },
  blendIn: 0.05, blendOut: 0.3,
  damping: 0.012, friction: 0.85, gravity: 9.81,
  balance: { step: 0.13, fall: 0.5, steps: 3, stepTime: 0.26, lift: 0.1, lead: 0.18, anchor: 0.2, support: 0.8 },
  hits: {
    bullet: { scale: 1, spread: 0.4, slump: { spine: 0.5, arms: 0.4, head: 0.5, legs: 0.15 }, recover: 0.45, knockdown: 7 },
    pellet: { scale: 1, spread: 0.7, slump: { spine: 0.6, arms: 0.5, head: 0.6, legs: 0.3 }, recover: 0.7, knockdown: 5 },
    blast: { scale: 1, spread: 1, slump: { spine: 0.85, arms: 0.8, head: 0.8, legs: 0.8 }, recover: 1.2, knockdown: 3.5, lift: 0.4 },
    blade: { scale: 1, spread: 0.5, slump: { spine: 0.4, arms: 0.3, head: 0.4, legs: 0.2 }, recover: 0.5, knockdown: 8 },
    crush: { scale: 1, spread: 0.8, slump: { spine: 0.7, arms: 0.6, head: 0.6, legs: 0.6 }, recover: 0.9, knockdown: 4 }
  },
  // `upright`: how much its muscles still hold the animation's own way up (1, as it does standing)
  // rather than just its shape, whichever way up it now is (0: it topples and lies flat).
  fall: { tone: { legs: 0.04, spine: 0.12, arms: 0.3, head: 0.15 }, catch: 0.7, upright: 0 },
  down: { time: 1.4, height: 0.4 },
  getup: { time: 0.8, front: null, back: null },
  // Hanging off something that holds it (a hand round its ankle): arms that trail, a head that
  // bounces, legs that catch on the ground, and a ground it slides over instead of sticking to.
  held: { tone: { legs: 0.1, spine: 0.18, arms: 0.06, head: 0.1 }, friction: 0.3, upright: 0, absorb: 0.8 },
  death: { tone: 0.03, settle: 0.5 }
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// --- Presets --------------------------------------------------------------------------------
// Every problem as a sentence, so an agent can fix a preset from the error alone. Fields it doesn't
// know are left alone (other tools add their own, like "expect").
export function validateMotion(json) {
  const errs = [];
  if (!json || typeof json !== 'object') return ['the preset is not a JSON object'];
  if (json.format !== MOTION_FORMAT) errs.push(`"format" must be "${MOTION_FORMAT}" (got ${JSON.stringify(json.format)})`);
  if (typeof json.name !== 'string' || !json.name) errs.push('"name" is missing');
  if (typeof json.rig !== 'string' || !json.rig) errs.push('"rig" is missing: the registered rig this preset is for');
  if (json.version !== undefined && !(Number.isInteger(json.version) && json.version >= 1)) errs.push('"version" is a whole number from 1: bump it with each change Jerry should look at');
  if (json.owner !== undefined && !/^[a-z]+$/.test(json.owner)) errs.push('"owner" is the agent who tunes it (cursor, claude, grokbot, chatgpt)');
  const num = (v, at, lo, hi) => { if (v !== undefined && (!isNum(v) || v < lo || v > hi)) errs.push(`${at} must be a number from ${lo} to ${hi} (got ${JSON.stringify(v)})`); };
  const tones = (t, at) => {
    if (t === undefined) return;
    if (isNum(t)) { num(t, at, 0, 1); return; }
    if (!t || typeof t !== 'object') { errs.push(`${at} is a number 0..1 or { legs, spine, arms, head } of them`); return; }
    for (const [k, v] of Object.entries(t)) { if (!TONE_GROUPS.includes(k)) errs.push(`${at}.${k}: tone groups are ${TONE_GROUPS.join(', ')}`); else num(v, `${at}.${k}`, 0, 1); }
  };
  num(json.mass, '"mass"', 0.1, 20); num(json.strength, '"strength"', 0.05, 5);
  tones(json.tone, 'tone');
  num(json.blendIn, '"blendIn"', 0, 2); num(json.blendOut, '"blendOut"', 0, 3);
  num(json.damping, '"damping"', 0, 0.5); num(json.friction, '"friction"', 0, 1); num(json.gravity, '"gravity"', 0, 30);
  const b = json.balance;
  if (b !== undefined) {
    if (!b || typeof b !== 'object') errs.push('"balance" must be an object');
    else {
      num(b.step, 'balance.step', 0.01, 2); num(b.fall, 'balance.fall', 0.02, 3); num(b.steps, 'balance.steps', 0, 10);
      num(b.stepTime, 'balance.stepTime', 0.05, 2); num(b.lift, 'balance.lift', 0, 1); num(b.lead, 'balance.lead', 0, 2);
      num(b.anchor, 'balance.anchor', 0, 1); num(b.support, 'balance.support', 0, 1);
      if (isNum(b.step) && isNum(b.fall) && b.fall <= b.step) errs.push('balance.fall must be more than balance.step (a body steps before it falls)');
    }
  }
  if (json.hits !== undefined) {
    if (!json.hits || typeof json.hits !== 'object') errs.push('"hits" must be an object keyed by kind');
    else for (const [k, h] of Object.entries(json.hits)) {
      const at = `hits.${k}`;
      if (!HIT_KINDS.includes(k)) { errs.push(`${at}: hit kinds are ${HIT_KINDS.join(', ')}`); continue; }
      if (!h || typeof h !== 'object') { errs.push(`${at} must be an object`); continue; }
      num(h.scale, `${at}.scale`, 0, 10); num(h.spread, `${at}.spread`, 0, 1); num(h.recover, `${at}.recover`, 0.05, 5);
      num(h.knockdown, `${at}.knockdown`, 0, 100); num(h.lift, `${at}.lift`, 0, 2);
      tones(h.slump, `${at}.slump`);
    }
  }
  if (json.fall !== undefined) {
    if (!isObj(json.fall)) errs.push('"fall" must be an object: { tone, catch }');
    else { tones(json.fall.tone, 'fall.tone'); num(json.fall.catch, 'fall.catch', 0, 1); num(json.fall.upright, 'fall.upright', 0, 1); }
  }
  if (json.down !== undefined) {
    if (!isObj(json.down)) errs.push('"down" must be an object: { time, height }');
    else { num(json.down.time, 'down.time', 0, 30); num(json.down.height, 'down.height', 0.05, 2); }
  }
  if (json.getup !== undefined) {
    if (!isObj(json.getup)) errs.push('"getup" must be an object: { time, front, back }');
    else {
      num(json.getup.time, 'getup.time', 0.05, 5);
      for (const side of ['front', 'back']) {
        const c = json.getup[side];
        if (c === undefined || c === null) continue;
        if (typeof c !== 'string' || !CLIP_REF.test(c)) errs.push(`getup.${side} is a clip "rig/name" (studio/clips/<rig>/<name>.json) that starts lying ${side === 'front' ? 'face down' : 'face up'} and ends standing (got ${JSON.stringify(c)})`);
        else if (typeof json.rig === 'string' && c.split('/')[0] !== json.rig) errs.push(`getup.${side}: "${c}" is a clip for rig "${c.split('/')[0]}", not "${json.rig}"`);
      }
    }
  }
  if (json.held !== undefined) {
    if (!isObj(json.held)) errs.push('"held" must be an object: { tone, friction, upright }, how the body hangs while something holds it');
    else { tones(json.held.tone, 'held.tone'); num(json.held.friction, 'held.friction', 0, 1); num(json.held.upright, 'held.upright', 0, 1); num(json.held.absorb, 'held.absorb', 0, 1); }
  }
  if (json.death !== undefined) {
    if (!isObj(json.death)) errs.push('"death" must be an object: { tone, settle }');
    else { num(json.death.tone, 'death.tone', 0, 1); num(json.death.settle, 'death.settle', 0.05, 10); }
  }
  return errs;
}

const toneObj = (t, base) => {
  if (t === undefined) return { ...base };
  if (isNum(t)) return Object.fromEntries(TONE_GROUPS.map((g) => [g, t]));
  return { ...base, ...t };
};

export function loadMotion(json) {
  const errs = validateMotion(json);
  if (errs.length) throw new Error(`motion preset${json && json.name ? ' "' + json.name + '"' : ''}: ` + errs.join('; '));
  const D = DEFAULTS;
  const hits = {};
  for (const k of HIT_KINDS) {
    const h = { ...D.hits[k], ...((json.hits || {})[k] || {}) };
    h.slump = toneObj((json.hits || {})[k] && json.hits[k].slump, D.hits[k].slump);
    hits[k] = h;
  }
  return {
    format: MOTION_FORMAT, name: json.name, rig: json.rig, notes: json.notes || '', version: json.version || 1, owner: json.owner || 'grokbot',
    mass: json.mass ?? D.mass, strength: json.strength ?? D.strength,
    tone: toneObj(json.tone, D.tone),
    blendIn: json.blendIn ?? D.blendIn, blendOut: json.blendOut ?? D.blendOut,
    damping: json.damping ?? D.damping, friction: json.friction ?? D.friction, gravity: json.gravity ?? D.gravity,
    balance: { ...D.balance, ...(json.balance || {}) },
    hits,
    fall: { tone: toneObj(json.fall && json.fall.tone, D.fall.tone), catch: (json.fall && json.fall.catch) ?? D.fall.catch, upright: (json.fall && json.fall.upright) ?? D.fall.upright },
    down: { ...D.down, ...(json.down || {}) },
    getup: { ...D.getup, ...(json.getup || {}) },
    held: { tone: toneObj(json.held && json.held.tone, D.held.tone), friction: (json.held && json.held.friction) ?? D.held.friction, upright: (json.held && json.held.upright) ?? D.held.upright, absorb: (json.held && json.held.absorb) ?? D.held.absorb },
    death: { ...D.death, ...(json.death || {}) },
    source: json
  };
}

// --- The budget ------------------------------------------------------------------------------
// At most `max` bodies simulate at once. A new hit on a full pool first puts the oldest settled or
// lying body to sleep (never one something is holding: it would freeze in the hand); if every slot
// is mid-reaction, the hit is refused and the host plays its old reaction instead. The game's
// 48-zombie frame is the budget (AGENTS.md rule 12).
export function createMotionPool({ max = 8 } = {}) {
  const live = new Set();
  let order = 0;
  return {
    max,
    get active() { return live.size; },
    take(body) {
      if (live.has(body)) return true;
      if (live.size >= max) {
        let victim = null;
        for (const b of live) if ((b.state === 'dead' || b.state === 'down') && !b.holding && (!victim || b._order < victim._order)) victim = b;
        if (victim) victim.sleep(); else return false;
      }
      body._order = order++;
      live.add(body);
      return true;
    },
    give(body) { live.delete(body); }
  };
}

// --- Bodies -------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();

// A rotation for a frame: x along a→b, up along c→d (made square to x), z = x × up.
function frameQuat(P, fr, idx, out) {
  const a = idx[fr.x[0]] * 3, b = idx[fr.x[1]] * 3, c = idx[fr.up[0]] * 3, d = idx[fr.up[1]] * 3;
  _x.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]).normalize();
  _y.set(P[d] - P[c], P[d + 1] - P[c + 1], P[d + 2] - P[c + 2]);
  _y.addScaledVector(_x, -_y.dot(_x)).normalize();
  _z.crossVectors(_x, _y);
  if (!(_z.lengthSq() > 0.5)) return out.identity();
  // makeBasis(x, y, z), written into the elements (column-major) so the game's test stand-in for
  // three, whose makeBasis does nothing, gets the same rotation (studio/ik.js does the same).
  const me = _m.identity().elements;
  me[0] = _x.x; me[1] = _x.y; me[2] = _x.z; me[4] = _y.x; me[5] = _y.y; me[6] = _y.z; me[8] = _z.x; me[9] = _z.y; me[10] = _z.z;
  return out.setFromRotationMatrix(_m);
}

// A hold's target, read into out: a Vector3, a function returning [x, y, z] (or a Vector3), or [x, y, z].
// A target that isn't a finite point this frame (a hand not placed yet: NaN) leaves `out` where it
// was: one NaN let in spread to every point and into the rig, for good.
function readTarget(tg, out) {
  let v = typeof tg === 'function' ? tg() : tg;
  let x, y, z;
  if (v && v.isVector3) { x = v.x; y = v.y; z = v.z; }
  else if (Array.isArray(v) && v.length >= 3) { x = v[0]; y = v[1]; z = v[2]; }
  else throw new Error('a hold\'s target is a THREE.Vector3, [x, y, z], or a function returning either');
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) { out[0] = x; out[1] = y; out[2] = z; }
}

export function createBody(inst, preset, opts = {}) {
  const spec = inst.def && inst.def.body;
  if (!spec) throw new Error(`rig "${inst.def ? inst.def.name : '?'}" has no "body" in studio/rigs.js, so it can't react`);
  if (preset.rig !== inst.def.name) throw new Error(`motion preset "${preset.name}" is for rig "${preset.rig}", not "${inst.def.name}"`);
  const ground = opts.ground || (() => 0);
  const names = Object.keys(spec.points);
  const n = names.length;
  const idx = Object.fromEntries(names.map((k, i) => [k, i]));
  const joints = names.map((k) => {
    const j = inst.R[spec.points[k].joint];
    if (!j) throw new Error(`body point "${k}": the rig has no joint "${spec.points[k].joint}"`);
    return j;
  });
  const offs = names.map((k) => new THREE.Vector3(...(spec.points[k].at || [0, 0, 0])));
  const mass = new Float64Array(n), inv = new Float64Array(n), rad = new Float64Array(n), grp = new Array(n);
  names.forEach((k, i) => {
    const p = spec.points[k];
    mass[i] = p.mass || 1; inv[i] = 1 / mass[i]; rad[i] = p.r ?? 0.05; grp[i] = p.group || 'spine';
  });
  // The weight each point has in the constraints: its own, or none while a hand has it hard (it goes
  // where the hand goes; the rest of the body is what gives).
  const iw = Float64Array.from(inv);
  const P = new Float64Array(n * 3), Q = new Float64Array(n * 3);      // now, and a step ago (Verlet)
  const PB = new Float64Array(n * 3);                                   // before a step's constraints (held bodies)
  const A = new Float64Array(n * 3), A0 = new Float64Array(n * 3);     // the animated pose, and the one before
  const pairs = (list, kind) => (list || []).map((e) => {
    for (const k of e.slice(0, 2)) if (idx[k] === undefined) throw new Error(`body ${kind} [${e.join(', ')}]: no point "${k}"`);
    return { a: idx[e[0]], b: idx[e[1]], lo: e[2] ?? 1, hi: e[3] ?? 1, len: 0 };
  });
  const bones = pairs(spec.bones, 'bone'), braces = pairs(spec.braces, 'brace');
  const hinges = (spec.hinges || []).map(([a, m, c, side, fr]) => ({ a: idx[a], m: idx[m], c: idx[c], side: new THREE.Vector3(...side), upper: fr === 'upper', min: 0 }));
  const feet = (spec.feet || []).map((k) => idx[k]), hands = (spec.hands || []).map((k) => idx[k]);
  const root = idx[spec.root || 'pelvis'];
  const segs = spec.segments.map((s) => {
    const uses = [...(s.frame ? [...s.frame.x, ...s.frame.up] : []), ...(s.aim || []), ...(s.pos !== undefined ? [s.pos] : [])].map((k) => idx[k]);
    return { ...s, j: inst.R[s.joint], animW: new THREE.Matrix4(), on: true, uses,
      aimI: s.aim ? s.aim.map((k) => idx[k]) : null, posI: s.pos !== undefined ? idx[s.pos] : null };
  });
  for (const s of segs) if (!s.j) throw new Error(`body segment: the rig has no joint "${s.joint}"`);
  const lower = spec.frame.lower, upper = spec.frame.upper;
  const chestI = idx[upper.up[1]];   // the top of the torso: how far up it is says whether a fall is over
  // What's left of it: every point simulates until its part is lost (body.lose). A lost point rides
  // along with the point it hung from, as the animation has it, and nothing else sees it.
  const parts = spec.parts || {};
  for (const [pn, pd] of Object.entries(parts)) for (const k of [...pd.points, pd.anchor]) if (idx[k] === undefined) throw new Error(`body part "${pn}": no point "${k}"`);
  const live = new Uint8Array(n).fill(1), anchorOf = new Int16Array(n).fill(-1);
  const lost = new Set();
  let lostPts = [], bonesOn = bones, bracesOn = braces, hingesOn = hinges;
  const footOn = feet.map(() => true);

  const body = {
    state: 'animated', weight: 0, alive: true, sleeping: false, preset,
    drift: new THREE.Vector3(), events: [], names, lying: null, lod: 0,
    get awake() { return this.state !== 'animated'; },
    // How many points something holds, and which parts are gone.
    get holding() { return holds.length; },
    get lost() { return [...lost]; }
  };
  let t = 0, acc = 0, stateT = 0, followed = false, hasPrev = false, hNow = SUB;
  let slump = null, fallDir = new THREE.Vector3(0, 0, 1);
  let sink = 0, sinkNow = 0, standH = 1, still = 0, steps = 0, stepping = null, landed = false, woke = 0;
  const pin = feet.map(() => null);
  const holds = [];
  let queue = [];
  const emit = (name, data) => queue.push(data ? [name, data] : [name]);
  const drain = () => { body.events = queue; queue = []; return body.events; };

  // Where each point is in the animated pose (world), and each segment joint's animated world matrix.
  body.follow = () => {
    // A joint the host didn't pose again since apply() still holds the simulated pose: put its
    // animated one back first, or the body would read its own reaction as the animation.
    for (const s of segs) {
      if (!s.wroteQ) continue;
      if (s.j.quaternion.equals(s.wroteQ)) s.j.quaternion.copy(s.prevQ);
      if (s.wroteP && s.j.position.equals(s.wroteP)) s.j.position.copy(s.prevP);
      s.wroteQ = null; s.wroteP = null;
    }
    inst.group.updateWorldMatrix(true, true);
    if (hasPrev) A0.set(A);
    for (let i = 0; i < n; i++) {
      _v.copy(offs[i]).applyMatrix4(joints[i].matrixWorld);
      A[i * 3] = _v.x; A[i * 3 + 1] = _v.y; A[i * 3 + 2] = _v.z;
    }
    if (!hasPrev) { A0.set(A); hasPrev = true; }
    for (const s of segs) s.animW.copy(s.j.matrixWorld);
    followed = true;
  };

  const measure = () => {
    for (const c of bones) c.len = Math.hypot(A[c.b * 3] - A[c.a * 3], A[c.b * 3 + 1] - A[c.a * 3 + 1], A[c.b * 3 + 2] - A[c.a * 3 + 2]);
    for (const c of braces) c.len = Math.hypot(A[c.b * 3] - A[c.a * 3], A[c.b * 3 + 1] - A[c.a * 3 + 1], A[c.b * 3 + 2] - A[c.a * 3 + 2]);
    // A hinge never forces the animation's own bend: its limit is how far the pose already goes.
    if (hinges.length) {
      frameQuat(A, lower, idx, qLow); frameQuat(A, upper, idx, qUp);
      for (const hg of hinges) hg.min = Math.min(0, hingeAlong(A, hg, hg.upper ? qUp : qLow)) - 0.01 * hingeLen(A, hg);
    }
    let s = Infinity;
    feet.forEach((f, k) => { if (footOn[k]) s = Math.min(s, A[f * 3 + 1] - rad[f] - ground(A[f * 3], A[f * 3 + 2])); });
    sink = Number.isFinite(s) ? Math.max(-0.4, Math.min(0.15, s)) : 0;
    sinkNow = sink;
    // How high its root stands in the animation: a body let go of above most of that is on its feet.
    standH = A[root * 3 + 1] - ground(A[root * 3], A[root * 3 + 2]);
  };

  // From animating to simulating: the points start where the animation has them, moving as it moved.
  const wake = () => {
    if (body.state !== 'animated') return true;
    if (opts.pool && !opts.pool.take(body)) return false;
    if (!followed) body.follow();
    measure();
    P.set(A); Q.set(A0);
    body.state = 'react'; stateT = 0; woke = 0; steps = 0; stepping = null; still = 0; landed = false;
    body.sleeping = false; body.drift.set(0, 0, 0); body.lying = null;
    for (const s of segs) s.lastQ = null;           // each reaction's twist starts from the animation's
    feet.forEach((f, k) => { pin[k] = footOn[k] ? [P[f * 3], P[f * 3 + 2]] : null; });
    emit('wake');
    return true;
  };

  const nearest = (at) => {
    if (typeof at === 'string') { if (idx[at] === undefined) throw new Error(`hit at "${at}": no such point (${names.join(', ')})`); return live[idx[at]] ? idx[at] : anchorOf[idx[at]]; }
    let best = root, bd = Infinity;
    const [x, y, z] = at;
    for (let i = 0; i < n; i++) { if (!live[i]) continue; const d = (P[i * 3] - x) ** 2 + (P[i * 3 + 1] - y) ** 2 + (P[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const push = (i, dx, dy, dz, k) => { Q[i * 3] -= dx * k * hNow; Q[i * 3 + 1] -= dy * k * hNow; Q[i * 3 + 2] -= dz * k * hNow; };
  const impulse = (hitAt, dir, power, spread, lift) => {
    const i = nearest(hitAt ?? 'chest');
    const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const dx = dir[0] / L * power, dy = dir[1] / L * power + (lift || 0) * power, dz = dir[2] / L * power;
    const g = grp[i];
    for (let k = 0; k < n; k++) {
      if (!live[k]) continue;
      if (k === i) push(k, dx, dy, dz, 1);
      else {
        const d = Math.hypot(P[k * 3] - P[i * 3], P[k * 3 + 1] - P[i * 3 + 1], P[k * 3 + 2] - P[i * 3 + 2]);
        const w = spread * (grp[k] === g ? 1 : 0.6) * Math.max(0, 1 - d / 0.9);
        if (w > 0) push(k, dx, dy, dz, w);
      }
    }
    fallDir.set(dx, 0, dz); if (fallDir.lengthSq() < 1e-6) fallDir.set(0, 0, 1); fallDir.normalize();
  };

  body.hit = ({ at, dir = [0, 0, 1], power = 3, kind = 'bullet' } = {}) => {
    if (body.sleeping && body.state === 'dead') return false;
    const h = preset.hits[kind];
    if (!h) throw new Error(`hit kind "${kind}": kinds are ${HIT_KINDS.join(', ')}`);
    if (!wake()) return false;
    const pw = power * h.scale / preset.mass;
    impulse(at, dir, pw, h.spread, h.lift);
    emit('hit', { kind, power: pw });
    if (!body.alive) return true;
    slump = { tone: h.slump, t: 0, dur: h.recover };
    if (body.state === 'getup') { body.state = 'react'; stateT = 0; body.lying = null; }
    if (pw >= h.knockdown && (body.state === 'react')) fall();
    return true;
  };

  body.kill = ({ at, dir = [0, 0, 1], power = 2, kind = 'bullet' } = {}) => {
    if (!body.alive) return body.hit({ at, dir, power, kind });
    body.alive = false;
    if (!wake()) { body.alive = true; return false; }
    const h = preset.hits[kind] || preset.hits.bullet;
    impulse(at, dir, power * h.scale / preset.mass, h.spread, h.lift);
    body.state = 'dead'; stateT = 0; still = 0; body.lying = null;
    for (let k = 0; k < pin.length; k++) pin[k] = null;
    stepping = null;
    emit('dead');
    return true;
  };

  function fall() {
    if (body.state === 'fall' || body.state === 'down' || body.state === 'dead') return;
    body.state = 'fall'; stateT = 0; stepping = null; landed = false; body.lying = null;
    for (let k = 0; k < pin.length; k++) pin[k] = null;
    emit('fall');
  }
  // Standing again on whatever feet it has, where they are now.
  function resetPins() { feet.forEach((f, k) => { pin[k] = footOn[k] ? [P[f * 3], P[f * 3 + 2]] : null; }); stepping = null; }

  // --- Held (contract: body.hold / body.release) ---
  // A hold pins one point to a moving target. At strength 1 it's hard: the point is put on the target
  // in every constraint pass, and the rest of the body hangs off it. Under 1 it's a spring of that
  // tone, firming into the pin as it nears 1. The target is read once a frame and eased across the frame's steps, so a hand moving 5 cm
  // a frame drags the point smoothly instead of in jumps. While anything holds it, a living body is
  // `held`: its muscles go to the preset's held tone, its feet let go, and it neither balances nor
  // steps. Let go of, it drops (or, still on its feet, finds them).
  const weights = () => {
    iw.set(inv);
    for (const hd of holds) if (hd.strength >= 1) iw[hd.i] = 0;
  };
  // `offset` (optional, a Vector3 or [x, y, z], world, now): where the hand really has it, from the
  // point (an ankle, where the point is the sole under it). It turns with the point's own bone from
  // here on, every constraint pass, so the grip stays in the hand while the limb swings.
  body.hold = (point, target, { strength = 1, offset = null } = {}) => {
    const i = idx[point];
    if (i === undefined) throw new Error(`hold "${point}": no such point (${names.join(', ')})`);
    if (!live[i]) return false;                     // that part is gone
    let hd = holds.find((x) => x.i === i);
    const fresh = !hd;
    if (fresh) {
      if (body.sleeping && body.state === 'dead') {
        // A settled corpse picked up again simulates again.
        if (opts.pool && !opts.pool.take(body)) return false;
        body.sleeping = false; still = 0;
      } else if (!wake()) return false;
      hd = { i, point, target, strength: 1, ref: refOf(i), off: false, off0: new Float64Array(3), dir0: new Float64Array(3),
        cur: new Float64Array(3), last: new Float64Array(3), t0: new Float64Array(3), t1: new Float64Array(3), goal: new Float64Array(3) };
      holds.push(hd);
      emit('held', { point });
      if (body.alive && body.state !== 'dead' && body.state !== 'held') {
        body.state = 'held'; stateT = 0; stepping = null; body.recovering = 0; body.lying = null;
        for (let k = 0; k < pin.length; k++) pin[k] = null;
      }
    }
    hd.target = target;
    hd.strength = clamp01(strength);
    // Near 1 a spring alone lags a fast hand, and going hard would then jump the point onto it: so
    // the hold also pins by strength⁴ of the way each constraint pass (0.5 barely, 0.95 nearly all),
    // firming up into the hard pin without a step.
    hd.pin = hd.strength >= 1 ? 1 : hd.strength ** 4;
    hd.off = !!offset && hd.ref >= 0;
    if (hd.off) {
      readTarget(offset, hd.off0);
      const o = i * 3, r = hd.ref * 3;
      _v.set(P[o] - P[r], P[o + 1] - P[r + 1], P[o + 2] - P[r + 2]).normalize();
      hd.dir0[0] = _v.x; hd.dir0[1] = _v.y; hd.dir0[2] = _v.z;
    }
    // A new hold's target starts where the hand has it now: the point, or the grip off it.
    if (fresh) { for (let c = 0; c < 3; c++) hd.cur[c] = P[i * 3 + c] + (hd.off ? hd.off0[c] : 0); hd.last.set(hd.cur); hd.t1.set(hd.cur); }
    weights();
    return true;
  };
  // The point a held point's bone runs from (the knee for a foot, the elbow for a hand).
  function refOf(i) { for (const c of bones) { if (c.b === i) return c.a; if (c.a === i) return c.b; } return -1; }
  // Where the held point should be: on the target, or the grip's offset back from it, turned as the
  // point's bone has turned since the offset was given.
  const _d0 = new THREE.Vector3(), _d1 = new THREE.Vector3(), _qo = new THREE.Quaternion();
  function goalOf(hd) {
    const g = hd.goal;
    if (!hd.off) { g[0] = hd.cur[0]; g[1] = hd.cur[1]; g[2] = hd.cur[2]; return g; }
    const o = hd.i * 3, r = hd.ref * 3;
    _d1.set(P[o] - P[r], P[o + 1] - P[r + 1], P[o + 2] - P[r + 2]).normalize();
    _qo.setFromUnitVectors(_d0.set(hd.dir0[0], hd.dir0[1], hd.dir0[2]), _d1);
    _v.set(hd.off0[0], hd.off0[1], hd.off0[2]).applyQuaternion(_qo);
    g[0] = hd.cur[0] - _v.x; g[1] = hd.cur[1] - _v.y; g[2] = hd.cur[2] - _v.z;
    return g;
  }
  body.release = (point) => {
    let any = false;
    for (let k = holds.length - 1; k >= 0; k--) {
      if (point !== undefined && holds[k].point !== point) continue;
      const [hd] = holds.splice(k, 1);
      emit('released', { point: hd.point });
      any = true;
    }
    if (!any) return false;
    weights();
    if (!holds.length && body.state === 'held') {
      const rh = P[root * 3 + 1] - ground(P[root * 3], P[root * 3 + 2]);
      if (rh > standH * 0.8 && footOn.some(Boolean)) { body.state = 'react'; stateT = 0; resetPins(); }
      else { aimFall(); fall(); }
    }
    return true;
  };

  // Which way a fall with no hit behind it goes (a lost leg, a hold let go): the way the hips are
  // moving; else toward the side it lost; else forward. From the body's own state, so a replay is exact.
  function aimFall(lostIdx) {
    const o = root * 3;
    let dx = P[o] - Q[o], dz = P[o + 2] - Q[o + 2];
    if (Math.hypot(dx, dz) < 1e-5 && lostIdx && lostIdx.length) {
      const l = lostIdx[lostIdx.length - 1] * 3;
      dx = A[l] - A[o]; dz = A[l + 2] - A[o + 2];
    }
    if (Math.hypot(dx, dz) < 1e-5) { dx = 0; dz = 1; }
    fallDir.set(dx, 0, dz).normalize();
  }

  // --- Moved by the host (body.shift) ---
  // The host moved the body's group itself (the player walking the marine on while he staggers, a wall
  // pushing a zombie back out): the whole body goes with it, planted feet and a step under way
  // included, keeping its speed. { stop: true } is a wall: the speed into the way it was pushed goes
  // (a body thrown at a wall stops there instead of sliding back in every frame).
  body.shift = (dx, dy = 0, dz = 0, o = {}) => {
    if (![dx, dy, dz].every(Number.isFinite)) return false;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      P[k] += dx; P[k + 1] += dy; P[k + 2] += dz; Q[k] += dx; Q[k + 1] += dy; Q[k + 2] += dz;
      A[k] += dx; A[k + 1] += dy; A[k + 2] += dz; A0[k] += dx; A0[k + 1] += dy; A0[k + 2] += dz;
    }
    for (const p of pin) if (p) { p[0] += dx; p[1] += dz; }
    if (stepping) { stepping.from[0] += dx; stepping.from[1] += dz; stepping.to[0] += dx; stepping.to[1] += dz; }
    const l = Math.hypot(dx, dz);
    if (o.stop && l > 1e-9) {
      const nx = dx / l, nz = dz / l;
      for (let i = 0; i < n; i++) {
        const k = i * 3, vn = (P[k] - Q[k]) * nx + (P[k + 2] - Q[k + 2]) * nz;
        if (vn < 0) { Q[k] += nx * vn; Q[k + 2] += nz * vn; }
      }
    }
    return true;
  };

  // --- Lost parts (contract: body.lose) ---
  function relink() {
    const ok = (c) => live[c.a] && live[c.b];
    bonesOn = lost.size ? bones.filter(ok) : bones;
    bracesOn = lost.size ? braces.filter(ok) : braces;
    hingesOn = lost.size ? hinges.filter((hg) => live[hg.a] && live[hg.m] && live[hg.c]) : hinges;
    lostPts = [];
    for (let i = 0; i < n; i++) if (!live[i]) lostPts.push(i);
    feet.forEach((f, k) => { footOn[k] = !!live[f]; if (!footOn[k]) { pin[k] = null; if (stepping && stepping.k === k) stepping = null; } });
    for (const s of segs) s.on = s.uses.every((i) => live[i]);
  }
  body.lose = (part) => {
    const pd = parts[part];
    if (!pd) throw new Error(`lose "${part}": this body's parts are ${Object.keys(parts).join(', ') || 'none (no "parts" in its studio/bodies.js entry)'}`);
    if (lost.has(part)) return true;
    lost.add(part);
    const a = idx[pd.anchor];
    for (const k of pd.points) { live[idx[k]] = 0; anchorOf[idx[k]] = a; }
    relink();
    for (let k = holds.length - 1; k >= 0; k--) if (!live[holds[k].i]) body.release(holds[k].point);
    emit('lost', { part });
    placeLost();
    // Standing on a leg it no longer has: it goes over.
    const leg = pd.points.some((k) => feet.includes(idx[k]));
    if (leg && body.alive && (body.state === 'animated' || body.state === 'react' || body.state === 'getup')) {
      if (!wake()) return false;
      aimFall(pd.points.map((k) => idx[k]));
      fall();
    }
    return true;
  };
  // A lost point keeps its animated place against the point it hung from, turned with the torso
  // (an arm, the head) or the hips (a leg) as the body lies: as the rig draws a lost part, riding
  // along with its parent.
  const qLostLo = new THREE.Quaternion(), qLostUp = new THREE.Quaternion(), qLostA = new THREE.Quaternion(), _lv = new THREE.Vector3();
  const onUpper = new Set([...upper.x, ...upper.up].map((k) => idx[k]));
  function placeLost() {
    if (!lostPts.length) return;
    frameQuat(P, lower, idx, qLostLo).multiply(frameQuat(A, lower, idx, qLostA).invert());
    frameQuat(P, upper, idx, qLostUp).multiply(frameQuat(A, upper, idx, qLostA).invert());
    for (const i of lostPts) {
      const o = i * 3, oa = anchorOf[i] * 3;
      _lv.set(A[o] - A[oa], A[o + 1] - A[oa + 1], A[o + 2] - A[oa + 2]).applyQuaternion(onUpper.has(anchorOf[i]) ? qLostUp : qLostLo);
      P[o] = P[oa] + _lv.x; P[o + 1] = P[oa + 1] + _lv.y; P[o + 2] = P[oa + 2] + _lv.z;
      Q[o] = Q[oa] + _lv.x; Q[o + 1] = Q[oa + 1] + _lv.y; Q[o + 2] = Q[oa + 2] + _lv.z;
    }
  }

  body.sleep = () => {
    body.sleeping = true;
    if (opts.pool) opts.pool.give(body);
    if (body.alive && body.state !== 'animated') { body.state = 'animated'; body.weight = 0; body.lying = null; }
  };
  // Back to standing on its animation, whole, holding nothing: a fresh start (a scene's seek).
  body.reset = () => {
    body.state = 'animated'; body.weight = 0; body.alive = true; body.sleeping = false; slump = null;
    body.drift.set(0, 0, 0); stepping = null; hasPrev = false; followed = false; body.lying = null; body.recovering = 0;
    fallDir.set(0, 0, 1); body.offBalance = 0;       // a replay starts from nothing the last run left
    for (const s of segs) s.lastQ = null;
    t = 0; acc = 0; hNow = SUB; body.lod = 0;
    holds.length = 0; weights();
    if (lost.size) { lost.clear(); live.fill(1); anchorOf.fill(-1); relink(); }
    if (opts.pool) opts.pool.give(body);
  };

  // --- One physics step ---
  const com = new THREE.Vector3(), comV = new THREE.Vector3();
  const qLow = new THREE.Quaternion(), qUp = new THREE.Quaternion(), qTurn = new THREE.Quaternion(), qAnim = new THREE.Quaternion();
  // How far a frame (the hips', the chest's) has turned from the animation's, less `up` of the way,
  // as a 3×3 row-major matrix: the muscles of a fallen body turn their targets by it.
  const mLo = new Float64Array(9), mUp = new Float64Array(9);
  const hangsOnChest = Uint8Array.from(names, (k, i) => (grp[i] === 'arms' || grp[i] === 'head' ? 1 : 0));
  function turnOf(fr, up, m) {
    frameQuat(P, fr, idx, qTurn); frameQuat(A, fr, idx, qAnim);
    qTurn.multiply(qAnim.invert());                 // the animation's frame onto the body's
    if (up > 0) slerpTo(qTurn, qAnim.identity(), up);
    const x = qTurn.x, y = qTurn.y, z = qTurn.z, w = qTurn.w;
    m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y - w * z); m[2] = 2 * (x * z + w * y);
    m[3] = 2 * (x * y + w * z); m[4] = 1 - 2 * (x * x + z * z); m[5] = 2 * (y * z - w * x);
    m[6] = 2 * (x * z - w * y); m[7] = 2 * (y * z + w * x); m[8] = 1 - 2 * (x * x + y * y);
  }
  const toneFor = (g) => {
    const s = body.state;
    if (s === 'dead') return preset.death.tone;
    if (s === 'held') return preset.held.tone[g];
    if (s === 'fall' || s === 'down') return preset.fall.tone[g];
    let v = preset.tone[g];
    if (slump) v *= 1 - (slump.tone[g] || 0) * (1 - smooth(slump.t / slump.dur));
    if (s === 'getup') v = v * smooth(stateT / preset.getup.time) + preset.fall.tone[g] * (1 - smooth(stateT / preset.getup.time));
    return v;
  };
  const isFoot = new Uint8Array(n);
  for (const f of feet) isFoot[f] = 1;
  const floorAt = (i) => {
    const x = P[i * 3], z = P[i * 3 + 2];
    return ground(x, z) + rad[i] + (isFoot[i] ? sinkNow : 0);
  };

  function stepOnce(h) {
    const st = body.state;
    const g = preset.gravity;
    // Verlet: carry on moving, fall, lose a little to the air.
    const keep = 1 - preset.damping;
    for (let i = 0; i < n; i++) {
      if (!live[i]) continue;
      const o = i * 3;
      for (let a = 0; a < 3; a++) {
        const v = (P[o + a] - Q[o + a]) * keep;
        Q[o + a] = P[o + a];
        P[o + a] += v + (a === 1 ? -g * h * h : 0);
      }
    }
    // Muscles: every point toward where the animation has it, relative to the body's own root point.
    // Standing (and getting up) they keep the animation's own world orientation, so tone keeps it
    // upright. Falling, lying, hanging or dead they keep only its shape, turned with the hips to
    // however the body now lies (by `upright` of the way back), so it topples and lies flat instead of
    // being held up in a sit. Planted feet stay put.
    const rx = P[root * 3], ry = P[root * 3 + 1], rz = P[root * 3 + 2];
    const ax = A[root * 3], ay = A[root * 3 + 1], az = A[root * 3 + 2];
    const up = st === 'fall' || st === 'down' ? preset.fall.upright : st === 'held' ? preset.held.upright : st === 'dead' ? 0 : 1;
    // Turned, the legs and spine keep their shape off the hips, and the arms and head off the chest
    // (kept off the hips, a twisted spine puts the arms' targets in the ground, and they shove the
    // body over).
    const turned = up < 1;
    if (turned) { turnOf(lower, up, mLo); turnOf(upper, up, mUp); }
    const TT = {};
    const str = Math.sqrt(preset.strength);
    for (const gname of TONE_GROUPS) TT[gname] = toneFor(gname) * str;
    const vrx = P[root * 3] - Q[root * 3], vry = P[root * 3 + 1] - Q[root * 3 + 1], vrz = P[root * 3 + 2] - Q[root * 3 + 2];
    for (let i = 0; i < n; i++) {
      if (i === root || !live[i] || iw[i] === 0) continue;
      const fk = isFoot[i] ? feet.indexOf(i) : -1;
      if (fk >= 0 && pin[fk] && !(stepping && stepping.k === fk)) continue;
      const tn = TT[grp[i]], k = springK(tn, h), c = springC(tn, h);
      const o = i * 3;
      // Spring toward the pose, and damp the point's motion relative to the root.
      Q[o] += ((P[o] - Q[o]) - vrx) * c; Q[o + 1] += ((P[o + 1] - Q[o + 1]) - vry) * c; Q[o + 2] += ((P[o + 2] - Q[o + 2]) - vrz) * c;
      if (turned) {
        const onChest = hangsOnChest[i], m = onChest ? mUp : mLo, b = onChest ? chestI * 3 : root * 3;
        const dx = A[o] - A[b], dy = A[o + 1] - A[b + 1], dz = A[o + 2] - A[b + 2];
        P[o] += (P[b] + m[0] * dx + m[1] * dy + m[2] * dz - P[o]) * k;
        P[o + 1] += (P[b + 1] + m[3] * dx + m[4] * dy + m[5] * dz - P[o + 1]) * k;
        P[o + 2] += (P[b + 2] + m[6] * dx + m[7] * dy + m[8] * dz - P[o + 2]) * k;
      } else {
        P[o] += (rx + A[o] - ax - P[o]) * k;
        P[o + 1] += (ry + A[o + 1] - ay - P[o + 1]) * k;
        P[o + 2] += (rz + A[o + 2] - az - P[o + 2]) * k;
      }
    }
    // The root: held up by the legs while it stands; drawn back toward the animation's place.
    if ((st === 'react' || st === 'getup') && footOn.some(Boolean)) {
      const tl = TT.legs * Math.sqrt(preset.balance.support);
      const o = root * 3, k = springK(tl, h), c = springC(tl, h);
      Q[o + 1] += (P[o + 1] - Q[o + 1]) * c;
      P[o + 1] += (ay + (sinkNow - sink) - P[o + 1]) * k;
      const ka = springK(Math.sqrt(preset.balance.anchor) * TT.legs, h), ca = springC(Math.sqrt(preset.balance.anchor) * TT.legs, h);
      Q[o] += (P[o] - Q[o]) * ca * 0.5; Q[o + 2] += (P[o + 2] - Q[o + 2]) * ca * 0.5;
      // Over its feet, as the animation stands over its own (wherever a stagger has put the feet).
      let fx = 0, fz = 0, gx = 0, gz = 0, nf = 0;
      feet.forEach((f, k2) => { if (!footOn[k2]) return; fx += P[f * 3]; fz += P[f * 3 + 2]; gx += A[f * 3]; gz += A[f * 3 + 2]; nf++; });
      const tx = nf ? fx / nf + ax - gx / nf : ax, tz = nf ? fz / nf + az - gz / nf : az;
      P[o] += (tx - P[o]) * ka; P[o + 2] += (tz - P[o + 2]) * ka;
    }
    // Held softly: a spring toward the target, damped against the target's own motion.
    for (const hd of holds) {
      if (hd.strength >= 1) continue;
      const k = springK(hd.strength, h), c = springC(hd.strength, h), o = hd.i * 3, gl = goalOf(hd);
      for (let a = 0; a < 3; a++) {
        Q[o + a] += ((P[o + a] - Q[o + a]) - (hd.cur[a] - hd.last[a])) * c;
        P[o + a] += (gl[a] - P[o + a]) * k;
      }
    }
    // Stepping: the foot swings from where it was to under the weight, lifted in an arc.
    if (stepping) {
      stepping.u = Math.min(1, stepping.u + h / stepping.time);
      const f = feet[stepping.k], u = smooth(stepping.u);
      const x = stepping.from[0] + (stepping.to[0] - stepping.from[0]) * u, z = stepping.from[1] + (stepping.to[1] - stepping.from[1]) * u;
      const y = ground(x, z) + rad[f] + sinkNow + Math.sin(Math.PI * stepping.u) * preset.balance.lift;
      P[f * 3] = x; P[f * 3 + 1] = y; P[f * 3 + 2] = z;
      if (stepping.u >= 1) { pin[stepping.k] = [x, z]; stepping = null; steps++; emit('step', { foot: names[f] }); }
    }
    // Falling: the hands go out toward the ground ahead, to break the fall. As the chest comes down
    // they let go: kept on a body lying on its face, they push it up and over the top of them, again
    // and again, and it never lies still.
    const chestUp = P[chestI * 3 + 1] - ground(P[chestI * 3], P[chestI * 3 + 2]) - rad[chestI];
    if (st === 'fall' && preset.fall.catch > 0 && chestUp > 0.15) {
      const k = springK(preset.fall.catch, h) * smooth((chestUp - 0.15) / 0.3);
      for (const hI of hands) {
        if (!live[hI]) continue;
        const x = rx + fallDir.x * 0.45, z = rz + fallDir.z * 0.45;
        P[hI * 3] += (x - P[hI * 3]) * k; P[hI * 3 + 1] += (ground(x, z) + rad[hI] - P[hI * 3 + 1]) * k; P[hI * 3 + 2] += (z - P[hI * 3 + 2]) * k;
      }
    }
    // Constraints: bones hold their length, braces stay within their range, knees and elbows bend
    // one way, planted feet stay pinned, a hand's hold keeps its point, and points stay above the
    // ground (last, so nothing is ever left under it; the ground wins over a target below it).
    // A body something holds slides over the ground; one standing or lying grips it.
    const fr = holds.length ? preset.held.friction : preset.friction;
    const absorb = holds.length ? preset.held.absorb : 0;
    if (absorb > 0) PB.set(P);
    for (let it = 0, passes = holds.length ? ITER_HELD : ITER; it < passes; it++) {
      for (const c of bonesOn) solveDist(c, c.len, c.len, 1);
      for (const c of bracesOn) solveDist(c, c.len * c.lo, c.len * c.hi, 0.5);
      if (hingesOn.length) {
        frameQuat(P, lower, idx, qLow); frameQuat(P, upper, idx, qUp);
        for (const hg of hingesOn) solveHinge(hg, hg.upper ? qUp : qLow);
      }
      feet.forEach((f, k) => { if (pin[k] && !(stepping && stepping.k === k)) { P[f * 3] = pin[k][0]; P[f * 3 + 2] = pin[k][1]; } });
      for (const hd of holds) {
        const o = hd.i * 3, f = hd.pin, gl = goalOf(hd);
        if (f >= 1) { P[o] = gl[0]; P[o + 1] = gl[1]; P[o + 2] = gl[2]; }
        else if (f > 0) { P[o] += (gl[0] - P[o]) * f; P[o + 1] += (gl[1] - P[o + 1]) * f; P[o + 2] += (gl[2] - P[o + 2]) * f; }
      }
      for (let i = 0; i < n; i++) {
        if (!live[i]) continue;
        const fl = floorAt(i);
        if (P[i * 3 + 1] < fl) {
          P[i * 3 + 1] = fl;
          Q[i * 3] = P[i * 3] - (P[i * 3] - Q[i * 3]) * (1 - fr);
          Q[i * 3 + 2] = P[i * 3 + 2] - (P[i * 3 + 2] - Q[i * 3 + 2]) * (1 - fr);
          if (Q[i * 3 + 1] < P[i * 3 + 1]) Q[i * 3 + 1] = P[i * 3 + 1];
        }
      }
    }
    // Hauled by a hand, each step's pull comes through the bones as a jump in position, and all of
    // it would be kept as speed: the legs and hips fly up the line to the hand and the body streams
    // out behind it like a flag. A held body soaks up `absorb` of it, as a heavy body on the ground
    // does, and keeps the rest (the swing, the flop).
    if (absorb > 0) {
      for (let i = 0; i < n; i++) {
        if (!live[i] || iw[i] === 0) continue;
        const o = i * 3;
        Q[o] += (P[o] - PB[o]) * absorb; Q[o + 1] += (P[o + 1] - PB[o + 1]) * absorb; Q[o + 2] += (P[o + 2] - PB[o + 2]) * absorb;
      }
    }
    // Nothing flies apart: a runaway point (a bad preset) is put back where the animation has it,
    // still, and a body a hand holds hard is put there with the held point on the hand (put back
    // anywhere else, the pin would yank it just as far again the next step).
    for (let i = 0; i < n * 3; i++) {
      if (!Number.isFinite(P[i]) || Math.abs(P[i] - Q[i]) > 60 * h) {
        P.set(A);
        const hd = holds.find((x) => x.strength >= 1);
        if (hd) {
          const o = hd.i * 3, gl = goalOf(hd), dx = gl[0] - A[o], dy = gl[1] - A[o + 1], dz = gl[2] - A[o + 2];
          for (let k = 0; k < n; k++) { P[k * 3] += dx; P[k * 3 + 1] += dy; P[k * 3 + 2] += dz; }
        }
        Q.set(P);
        break;
      }
    }
    if (lostPts.length) placeLost();
  }

  function solveDist(c, lo, hi, stiff) {
    const a = c.a * 3, b = c.b * 3;
    const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
    const d = Math.hypot(dx, dy, dz);
    if (d < 1e-9) return;
    const want = d < lo ? lo : d > hi ? hi : d;
    if (want === d) return;
    const wa = iw[c.a], wb = iw[c.b];
    if (wa + wb === 0) return;
    const s = ((d - want) / d) * stiff / (wa + wb);
    P[a] += dx * s * wa; P[a + 1] += dy * s * wa; P[a + 2] += dz * s * wa;
    P[b] -= dx * s * wb; P[b + 1] -= dy * s * wb; P[b + 2] -= dz * s * wb;
  }
  // How far a hinge's middle point sits off the line between its ends, toward its fold side.
  function hingeAlong(X, hg, q) {
    const a = hg.a * 3, m = hg.m * 3, c = hg.c * 3;
    const lx = X[c] - X[a], ly = X[c + 1] - X[a + 1], lz = X[c + 2] - X[a + 2];
    const L2 = lx * lx + ly * ly + lz * lz;
    if (L2 < 1e-9) return 0;
    const u = ((X[m] - X[a]) * lx + (X[m + 1] - X[a + 1]) * ly + (X[m + 2] - X[a + 2]) * lz) / L2;
    const dx = X[m] - (X[a] + lx * u), dy = X[m + 1] - (X[a + 1] + ly * u), dz = X[m + 2] - (X[a + 2] + lz * u);
    _v.copy(hg.side).applyQuaternion(q);
    return dx * _v.x + dy * _v.y + dz * _v.z;
  }
  function hingeLen(X, hg) { const a = hg.a * 3, c = hg.c * 3; return Math.hypot(X[c] - X[a], X[c + 1] - X[a + 1], X[c + 2] - X[a + 2]); }
  function solveHinge(hg, q) {
    const a = hg.a * 3, m = hg.m * 3, c = hg.c * 3;
    const along = hingeAlong(P, hg, q);          // leaves the fold side in _v
    if (along >= hg.min) return;
    const wm = iw[hg.m], wo = (iw[hg.a] + iw[hg.c]) / 2;
    if (wm + wo === 0) return;
    const fix = hg.min - along, s = fix / (wm + wo);
    P[m] += _v.x * s * wm; P[m + 1] += _v.y * s * wm; P[m + 2] += _v.z * s * wm;
    // Both ends give the same, except one a hand holds hard, which doesn't give at all.
    const ka = iw[hg.a] === 0 ? 0 : wo * 0.5, kc = iw[hg.c] === 0 ? 0 : wo * 0.5;
    P[a] -= _v.x * s * ka; P[a + 1] -= _v.y * s * ka; P[a + 2] -= _v.z * s * ka;
    P[c] -= _v.x * s * kc; P[c + 1] -= _v.y * s * kc; P[c + 2] -= _v.z * s * kc;
  }

  // Balance: where the weight is against where the planted feet are. Step under it, or fall.
  function balance(h) {
    com.set(0, 0, 0); comV.set(0, 0, 0);
    let M = 0;
    for (let i = 0; i < n; i++) {
      if (!live[i]) continue;
      const o = i * 3;
      com.x += P[o] * mass[i]; com.y += P[o + 1] * mass[i]; com.z += P[o + 2] * mass[i];
      comV.x += (P[o] - Q[o]) * mass[i]; comV.z += (P[o + 2] - Q[o + 2]) * mass[i];
      M += mass[i];
    }
    com.divideScalar(M); comV.divideScalar(M * h);
    let sx = 0, sz = 0, np = 0;
    feet.forEach((f, k) => { if (pin[k]) { sx += pin[k][0]; sz += pin[k][1]; np++; } });
    if (!np) return;
    sx /= np; sz /= np;
    // Against the animation's own balance: a zombie's arms out in front aren't it falling over.
    let ax = 0, az = 0, am = 0, fx = 0, fz = 0, nf = 0;
    for (let i = 0; i < n; i++) { if (!live[i]) continue; ax += A[i * 3] * mass[i]; az += A[i * 3 + 2] * mass[i]; am += mass[i]; }
    feet.forEach((f, k) => { if (!footOn[k]) return; fx += A[f * 3]; fz += A[f * 3 + 2]; nf++; });
    ax = ax / am - fx / nf; az = az / am - fz / nf;
    const ox = com.x - sx - ax, oz = com.z - sz - az;
    const px = ox + comV.x * preset.balance.lead, pz = oz + comV.z * preset.balance.lead;
    const off = Math.hypot(ox, oz), pred = Math.hypot(px, pz);
    body.offBalance = off;
    if (off > preset.balance.fall) { fallDir.set(ox, 0, oz).normalize(); fall(); return; }
    if (stepping || pred < preset.balance.step) return;
    if (steps >= preset.balance.steps) { fallDir.set(px, 0, pz).normalize(); fall(); return; }
    // The foot to move: the one furthest behind where the weight is going.
    const dx = px / pred, dz = pz / pred;
    let pick = -1, worst = Infinity;
    feet.forEach((f, k) => { if (!pin[k]) return; const d = (pin[k][0] - sx) * dx + (pin[k][1] - sz) * dz; if (d < worst) { worst = d; pick = k; } });
    if (pick < 0) return;
    // Land it under the weight, a hip's width to its own side.
    frameQuat(P, lower, idx, qLow);
    _v.set(1, 0, 0).applyQuaternion(qLow); _v.y = 0; _v.normalize();
    const side = ((pin[pick][0] - sx) * _v.x + (pin[pick][1] - sz) * _v.z) >= 0 ? 1 : -1;
    const hw = 0.12;
    // Far enough to catch it: past where the weight is heading, as far as a leg can reach.
    const reach = Math.min(0.55, pred * 1.25);
    const to = [com.x - ax + dx * reach + _v.x * side * hw, com.z - az + dz * reach + _v.z * side * hw];
    // A body going over steps faster.
    const hurry = Math.max(0.55, Math.min(1, preset.balance.step * 2 / pred));
    stepping = { k: pick, u: 0, from: pin[pick].slice(), to, time: preset.balance.stepTime * hurry };
    pin[pick] = null;
    if (steps === 0) emit('stagger');
  }

  // Far away (lod 2): the pose holds still, but a body something holds goes where the hand goes.
  function holdStill() {
    let hd = null;
    for (const x of holds) if (!hd || x.strength > hd.strength) hd = x;
    if (hd) {
      const o = hd.i * 3, gl = goalOf(hd), dx = gl[0] - P[o], dy = gl[1] - P[o + 1], dz = gl[2] - P[o + 2];
      for (let i = 0; i < n; i++) { P[i * 3] += dx; P[i * 3 + 1] += dy; P[i * 3 + 2] += dz; }
    }
    Q.set(P);
  }

  body.update = (dt, { lod = 0 } = {}) => {
    if (body.state === 'animated' || body.sleeping) return drain();
    dt = Math.max(0, Math.min(dt, 0.1));
    body.lod = lod;
    // A corpse still on its way down isn't frozen far away: it falls at half rate until it's down, so
    // it never settles and sleeps standing up (it's only for the second or so the fall takes).
    const dropping = lod >= 2 && body.state === 'dead' && !body.sleeping
      && P[root * 3 + 1] - ground(P[root * 3], P[root * 3 + 2]) > preset.down.height;
    const frozen = lod >= 2 && !dropping;
    // Held by a hand on a display faster than the 120 Hz step: one step a frame, of the frame's own
    // length, so the held point is on the hand every frame it's drawn (a fixed step left frames with
    // no step at all, and the grip opened up to 6 cm at 144 Hz).
    const fine = holds.length && lod === 0 && dt > 0 && dt < SUB - 1e-9;
    const h = fine ? Math.max(SUB / 4, dt) : lod === 1 || dropping ? SUB * 2 : SUB;
    // A change of step keeps every point's speed: Verlet keeps speed as the last step's move.
    if (h !== hNow) { const r = h / hNow; for (let i = 0; i < n * 3; i++) Q[i] = P[i] - (P[i] - Q[i]) * r; hNow = h; }
    acc += dt;
    // The steps this frame, counted the way the loop below takes them, so a hold's target can be
    // eased across them.
    let nSteps = 0;
    for (let a = acc; a >= h - 1e-12; a -= h) nSteps++;
    for (const hd of holds) { hd.t0.set(hd.cur); readTarget(hd.target, hd.t1); }
    let k = 0;
    while (acc >= h - 1e-12) {
      acc -= h; t += h; stateT += h; woke += h; k++;
      if (holds.length) {
        const u = k / nSteps;
        for (const hd of holds) { hd.last.set(hd.cur); for (let c = 0; c < 3; c++) hd.cur[c] = hd.t0[c] + (hd.t1[c] - hd.t0[c]) * u; }
      }
      if (slump) { slump.t += h; if (slump.t >= slump.dur) slump = null; }
      const st = body.state;
      if (!frozen) {
        // The feet's own depth (the game stands zombies 0.2 m into the ground): kept while standing,
        // let go while down, and taken back up while getting up.
        if (st === 'react') sinkNow = sink;
        else sinkNow += ((st === 'getup' ? sink : 0) - sinkNow) * Math.min(1, h / (st === 'getup' ? preset.getup.time * 0.5 : 0.5));
        stepOnce(h);
        if (st === 'react') balance(h);
      } else holdStill();
      transitions(h, frozen);
    }
    // Weight: in fast on waking, out on recovering, all the way while down or dead.
    const s = body.state;
    if (s === 'react') body.weight = body.recovering ? Math.max(0, 1 - body.recovering / preset.blendOut) : Math.min(1, woke / Math.max(1e-3, preset.blendIn));
    else if (s === 'getup') body.weight = 1 - smooth(stateT / preset.getup.time);
    else if (s !== 'animated') body.weight = Math.min(1, Math.max(body.weight, woke / Math.max(1e-3, preset.blendIn)));
    // How far the reaction has moved the body over the ground, for the host to take on as its own
    // place: where its feet went while it stands (a stagger step), where its hips went once it's down.
    if (s === 'react' && footOn.some(Boolean)) {
      let dx = 0, dz = 0, nf = 0;
      feet.forEach((f, k2) => { if (!footOn[k2]) return; dx += P[f * 3] - A[f * 3]; dz += P[f * 3 + 2] - A[f * 3 + 2]; nf++; });
      body.drift.set(dx / nf, 0, dz / nf);
    } else body.drift.set(P[root * 3] - A[root * 3], 0, P[root * 3 + 2] - A[root * 3 + 2]);
    return drain();
  };

  function speedOf(i) { return Math.hypot(P[i * 3] - Q[i * 3], P[i * 3 + 1] - Q[i * 3 + 1], P[i * 3 + 2] - Q[i * 3 + 2]) / hNow; }
  const still0 = () => 0;   // a pose held still (lod 2) isn't moving
  // Which way up it lies, and where it should face to get up (contract: the getup event). Face down
  // (its chest faces the ground) it's 'front': a get-up clip lies with its head toward the rig's +Z,
  // so the heading is the way from its hips to its chest. Face up it's 'back': the clip lies with its
  // feet toward +Z, so the heading is the way from its chest to its hips. Curled up with its spine
  // on end, it goes by where its chest faces.
  const _fw = new THREE.Vector3(), _up = new THREE.Vector3();
  function updateLying() {
    frameQuat(P, upper, idx, qUp);
    _fw.set(0, 0, 1).applyQuaternion(qUp);
    _up.set(0, 1, 0).applyQuaternion(qUp);
    const side = _fw.y < 0 ? 'front' : 'back';
    let dx = _up.x, dz = _up.z;
    if (side === 'back') { dx = -dx; dz = -dz; }
    if (Math.hypot(dx, dz) < 0.2) { dx = _fw.x; dz = _fw.z; }
    const heading = Math.atan2(dx, dz);
    if (!body.lying) body.lying = { side, heading };
    else { body.lying.side = side; body.lying.heading = heading; }
  }
  function transitions(h, frozen) {
    const s = body.state;
    const rh = P[root * 3 + 1] - ground(P[root * 3], P[root * 3 + 2]);
    const sp = frozen ? still0 : speedOf;
    if (s === 'fall') {
      if (!landed && rh < preset.down.height * 1.4) { landed = true; emit('land'); }
      // Far away, a fall held in mid-air still ends: it's down once a fall's time has passed.
      if ((rh < preset.down.height && sp(root) < 0.6) || (frozen && stateT > 1.2)) { body.state = 'down'; stateT = 0; updateLying(); emit('down'); }
    } else if (s === 'down') {
      updateLying();
      if (body.alive && stateT >= preset.down.time) {
        body.state = 'getup'; stateT = 0;
        emit('getup', { side: body.lying.side, heading: body.lying.heading });
      }
    } else if (s === 'getup') {
      if (stateT >= preset.getup.time) recover();
    } else if (s === 'react') {
      if (body.recovering) {
        body.recovering += h;
        if (body.recovering >= preset.blendOut) recover();
      } else if (!slump && woke > 0.2 && (frozen || (!stepping && (body.offBalance || 0) < preset.balance.step * 0.6 && sp(root) < 0.35))) {
        body.recovering = 1e-6;
      }
    } else if (s === 'dead') {
      let e = 0;
      if (!frozen) for (let i = 0; i < n; i++) if (live[i]) e = Math.max(e, speedOf(i));
      // Something holding a corpse keeps it awake: it's still being moved.
      still = e < 0.08 && !holds.length ? still + h : 0;
      if (still >= preset.death.settle && !body.sleeping) { emit('settled'); body.sleep(); }
    }
  }
  function recover() {
    body.state = 'animated'; body.weight = 0; body.recovering = 0; slump = null; stepping = null; body.lying = null;
    if (opts.pool) opts.pool.give(body);
    emit('recovered');
  }

  // --- Writing the pose back onto the rig ---
  const S = new Float64Array(n * 3);
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), ps = new THREE.Vector3(), pp = new THREE.Vector3();
  body.apply = () => {
    const w = body.weight;
    if (!(w > 0) || !followed) return;
    S.set(P);
    for (const s of segs) {
      // A segment on a lost part keeps the animation's own turn and rides along with its parent.
      if (!s.on) continue;
      const j = s.j;
      s.animW.decompose(_p, _qa, _s);               // the animated world pose of this joint
      if (s.frame) {
        frameQuat(A, s.frame, idx, _qb);
        frameQuat(S, s.frame, idx, _qc);
        _q.copy(_qc).multiply(_qb.invert()).multiply(_qa);
      } else if (s.aim) {
        const a = s.aimI[0] * 3, b = s.aimI[1] * 3;
        _y.set(S[b] - S[a], S[b + 1] - S[a + 1], S[b + 2] - S[a + 2]).normalize();
        if (s.lastQ) {
          // Keep the bone's twist going on from what it drew last frame: swing that turn onto the
          // bone's new direction. Taking the twist from the animation instead spun a limb half a turn
          // in one frame when a host switched clips mid-reaction (a get-up clip starting); the
          // animation's twist comes back through the weight as the body hands back.
          _q.setFromUnitVectors(s.lastDir, _y).multiply(s.lastQ);
        } else {
          _x.set(A[b] - A[a], A[b + 1] - A[a + 1], A[b + 2] - A[a + 2]).normalize();
          _q.setFromUnitVectors(_x, _y).multiply(_qa);
        }
        (s.lastQ ||= new THREE.Quaternion()).copy(_q);
        (s.lastDir ||= new THREE.Vector3()).copy(_y);
      } else continue;
      slerpTo(_qa, _q, w);                           // the world rotation it ends with, the short way
      const parent = j.parent;
      parent.updateWorldMatrix(false, false);
      parent.matrixWorld.decompose(pp, pq, ps);
      (s.prevQ ||= new THREE.Quaternion()).copy(j.quaternion);
      (s.prevP ||= new THREE.Vector3()).copy(j.position);
      j.quaternion.copy(pq).invert().multiply(_qa);
      (s.wroteQ ||= new THREE.Quaternion()).copy(j.quaternion);
      s.wroteP = null;
      if (s.posI !== null) {
        const o = s.posI * 3;
        _w.set(S[o], S[o + 1], S[o + 2]);
        _v.copy(offs[s.posI]).multiply(_s).applyQuaternion(_qa);
        _w.sub(_v).lerp(_p, 1 - w);                  // the pivot, from the simulated point
        pm.copy(parent.matrixWorld).invert();
        j.position.copy(_w.applyMatrix4(pm));
        (s.wroteP = s.wroteP0 ||= new THREE.Vector3()).copy(j.position);
      }
      j.updateMatrix();
      j.updateWorldMatrix(false, false);
    }
    inst.group.updateWorldMatrix(false, true);
  };

  body.points = () => Object.fromEntries(names.map((k, i) => [k, [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]]));
  body.animPoints = () => Object.fromEntries(names.map((k, i) => [k, [A[i * 3], A[i * 3 + 1], A[i * 3 + 2]]]));
  // One point, into out ([x, y, z] or a Vector3): cheaper than points() for a host that needs one.
  body.pointAt = (name, out = new THREE.Vector3()) => {
    const i = idx[name];
    if (i === undefined) throw new Error(`no point "${name}" (${names.join(', ')})`);
    if (out.isVector3) return out.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    out[0] = P[i * 3]; out[1] = P[i * 3 + 1]; out[2] = P[i * 3 + 2]; return out;
  };
  return body;
}
