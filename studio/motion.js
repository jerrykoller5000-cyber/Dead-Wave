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
//     const events = body.update(dt); simulate (does nothing while the body is only animating)
//     body.apply();                   write the simulated pose onto the rig, by body.weight
//   body.hit({ at: 'chest' | [x, y, z], dir: [x, y, z], power, kind })   power: m/s at the hit point
//   body.kill({ dir, power, at, kind })                                   limp from now on
//
// Units: metres, seconds. Deterministic: no randomness inside, so a scene replays the same every time.
import * as THREE from 'three';

export const MOTION_FORMAT = 'dw-motion/1';
export const HIT_KINDS = ['bullet', 'pellet', 'blast', 'blade', 'crush'];
const TONE_GROUPS = ['legs', 'spine', 'arms', 'head'];
const SUB = 1 / 120;           // fixed physics step
const ITER = 4;                // constraint passes per step
// A muscle is a damped spring toward the animated pose. Its stiffness (ω², 1/s²) is MUSCLE × tone²:
// at tone 1 a limb sags 3 mm under its own weight, at 0.3 about 4 cm, at 0.1 a third of a metre,
// and at 0.03 it's limp. Damped at ZETA of critical, so a muscle pulls back without wobbling.
const MUSCLE = 3000, ZETA = 0.8;
const springK = (tone, h) => Math.min(0.5, MUSCLE * tone * tone * h * h);
const springC = (tone, h) => Math.min(0.9, 2 * ZETA * Math.sqrt(MUSCLE) * tone * h);

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
  fall: { tone: { legs: 0.04, spine: 0.12, arms: 0.3, head: 0.15 }, catch: 0.7 },
  down: { time: 1.4, height: 0.4 },
  getup: { time: 0.8 },
  death: { tone: 0.03, settle: 0.5 }
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };

// --- Presets --------------------------------------------------------------------------------
// Every problem as a sentence, so an agent can fix a preset from the error alone.
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
  if (json.fall !== undefined) { tones(json.fall.tone, 'fall.tone'); num(json.fall.catch, 'fall.catch', 0, 1); }
  if (json.down !== undefined) { num(json.down.time, 'down.time', 0, 30); num(json.down.height, 'down.height', 0.05, 2); }
  if (json.getup !== undefined) num(json.getup.time, 'getup.time', 0.05, 5);
  if (json.death !== undefined) { num(json.death.tone, 'death.tone', 0, 1); num(json.death.settle, 'death.settle', 0.05, 10); }
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
    fall: { tone: toneObj(json.fall && json.fall.tone, D.fall.tone), catch: (json.fall && json.fall.catch) ?? D.fall.catch },
    down: { ...D.down, ...(json.down || {}) },
    getup: { ...D.getup, ...(json.getup || {}) },
    death: { ...D.death, ...(json.death || {}) },
    source: json
  };
}

// --- The budget ------------------------------------------------------------------------------
// At most `max` bodies simulate at once. A new hit on a full pool first puts the oldest settled or
// lying body to sleep; if every slot is mid-reaction, the hit is refused and the host plays its old
// reaction instead. The game's 48-zombie frame is the budget (AGENTS.md rule 12).
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
        for (const b of live) if ((b.state === 'dead' || b.state === 'down') && (!victim || b._order < victim._order)) victim = b;
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
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
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
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
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
  const P = new Float64Array(n * 3), Q = new Float64Array(n * 3);      // now, and a step ago (Verlet)
  const A = new Float64Array(n * 3), A0 = new Float64Array(n * 3);     // the animated pose, and the one before
  const pairs = (list, kind) => (list || []).map((e) => {
    for (const k of e.slice(0, 2)) if (idx[k] === undefined) throw new Error(`body ${kind} [${e.join(', ')}]: no point "${k}"`);
    return { a: idx[e[0]], b: idx[e[1]], lo: e[2] ?? 1, hi: e[3] ?? 1, len: 0 };
  });
  const bones = pairs(spec.bones, 'bone'), braces = pairs(spec.braces, 'brace');
  const hinges = (spec.hinges || []).map(([a, m, c, side, fr]) => ({ a: idx[a], m: idx[m], c: idx[c], side: new THREE.Vector3(...side), upper: fr === 'upper', min: 0 }));
  const feet = (spec.feet || []).map((k) => idx[k]), hands = (spec.hands || []).map((k) => idx[k]);
  const root = idx[spec.root || 'pelvis'];
  const segs = spec.segments.map((s) => ({
    ...s, j: inst.R[s.joint], animW: new THREE.Matrix4(),
    aimI: s.aim ? s.aim.map((k) => idx[k]) : null, posI: s.pos !== undefined ? idx[s.pos] : null
  }));
  for (const s of segs) if (!s.j) throw new Error(`body segment: the rig has no joint "${s.joint}"`);
  const lower = spec.frame.lower, upper = spec.frame.upper;

  const body = {
    state: 'animated', weight: 0, alive: true, sleeping: false, preset,
    drift: new THREE.Vector3(), events: [], names,
    get awake() { return this.state !== 'animated'; }
  };
  let t = 0, acc = 0, stateT = 0, followed = false, hasPrev = false;
  let tone = { ...preset.tone }, slump = null, fallDir = new THREE.Vector3(0, 0, 1);
  let sink = 0, sinkNow = 0, still = 0, steps = 0, stepping = null, landed = false, woke = 0;
  const pin = feet.map(() => null);
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
    for (const f of feet) s = Math.min(s, A[f * 3 + 1] - rad[f] - ground(A[f * 3], A[f * 3 + 2]));
    sink = Number.isFinite(s) ? Math.max(-0.4, Math.min(0.15, s)) : 0;
    sinkNow = sink;
  };

  // From animating to simulating: the points start where the animation has them, moving as it moved.
  const wake = () => {
    if (body.state !== 'animated') return true;
    if (opts.pool && !opts.pool.take(body)) return false;
    if (!followed) body.follow();
    measure();
    P.set(A); Q.set(A0);
    body.state = 'react'; stateT = 0; woke = 0; steps = 0; stepping = null; still = 0; landed = false;
    body.sleeping = false; body.drift.set(0, 0, 0);
    feet.forEach((f, k) => { pin[k] = [P[f * 3], P[f * 3 + 2]]; });
    emit('wake');
    return true;
  };

  const nearest = (at) => {
    if (typeof at === 'string') { if (idx[at] === undefined) throw new Error(`hit at "${at}": no such point (${names.join(', ')})`); return idx[at]; }
    let best = root, bd = Infinity;
    const [x, y, z] = at;
    for (let i = 0; i < n; i++) { const d = (P[i * 3] - x) ** 2 + (P[i * 3 + 1] - y) ** 2 + (P[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const push = (i, dx, dy, dz, k) => { Q[i * 3] -= dx * k * SUB; Q[i * 3 + 1] -= dy * k * SUB; Q[i * 3 + 2] -= dz * k * SUB; };
  const impulse = (hitAt, dir, power, spread, lift) => {
    const i = nearest(hitAt ?? 'chest');
    const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const dx = dir[0] / L * power, dy = dir[1] / L * power + (lift || 0) * power, dz = dir[2] / L * power;
    const g = grp[i];
    for (let k = 0; k < n; k++) {
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
    if (body.state === 'getup') { body.state = 'react'; stateT = 0; }
    if (pw >= h.knockdown && (body.state === 'react')) fall();
    return true;
  };

  body.kill = ({ at, dir = [0, 0, 1], power = 2, kind = 'bullet' } = {}) => {
    if (!body.alive) return body.hit({ at, dir, power, kind });
    body.alive = false;
    if (!wake()) { body.alive = true; return false; }
    const h = preset.hits[kind] || preset.hits.bullet;
    impulse(at, dir, power * h.scale / preset.mass, h.spread, h.lift);
    body.state = 'dead'; stateT = 0; still = 0;
    for (let k = 0; k < pin.length; k++) pin[k] = null;
    stepping = null;
    emit('dead');
    return true;
  };

  function fall() {
    if (body.state === 'fall' || body.state === 'down' || body.state === 'dead') return;
    body.state = 'fall'; stateT = 0; stepping = null;
    for (let k = 0; k < pin.length; k++) pin[k] = null;
    emit('fall');
  }

  body.sleep = () => {
    body.sleeping = true;
    if (opts.pool) opts.pool.give(body);
    if (body.alive && body.state !== 'animated') { body.state = 'animated'; body.weight = 0; }
  };
  body.reset = () => {
    body.state = 'animated'; body.weight = 0; body.alive = true; body.sleeping = false; slump = null;
    body.drift.set(0, 0, 0); stepping = null; hasPrev = false; followed = false;
    if (opts.pool) opts.pool.give(body);
  };

  // --- One physics step ---
  const com = new THREE.Vector3(), comV = new THREE.Vector3();
  const qLow = new THREE.Quaternion(), qUp = new THREE.Quaternion();
  const toneFor = (g) => {
    const s = body.state;
    if (s === 'dead') return preset.death.tone;
    if (s === 'fall' || s === 'down') return preset.fall.tone[g];
    let v = preset.tone[g];
    if (slump) v *= 1 - (slump.tone[g] || 0) * (1 - smooth(slump.t / slump.dur));
    if (s === 'getup') v = v * smooth(stateT / preset.getup.time) + preset.fall.tone[g] * (1 - smooth(stateT / preset.getup.time));
    return v;
  };
  const floorAt = (i) => {
    const x = P[i * 3], z = P[i * 3 + 2];
    return ground(x, z) + rad[i] + (feet.includes(i) ? sinkNow : 0);
  };

  function stepOnce(h) {
    const st = body.state;
    const g = preset.gravity;
    // Verlet: carry on moving, fall, lose a little to the air.
    const keep = 1 - preset.damping;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      for (let a = 0; a < 3; a++) {
        const v = (P[o + a] - Q[o + a]) * keep;
        Q[o + a] = P[o + a];
        P[o + a] += v + (a === 1 ? -g * h * h : 0);
      }
    }
    // Muscles: every point toward where the animation has it, relative to the body's own root point,
    // with the animation's own world orientation (so tone keeps it upright). Planted feet stay put.
    const rx = P[root * 3], ry = P[root * 3 + 1], rz = P[root * 3 + 2];
    const ax = A[root * 3], ay = A[root * 3 + 1], az = A[root * 3 + 2];
    const TT = {};
    const str = Math.sqrt(preset.strength);
    for (const gname of TONE_GROUPS) TT[gname] = toneFor(gname) * str;
    const vrx = P[root * 3] - Q[root * 3], vry = P[root * 3 + 1] - Q[root * 3 + 1], vrz = P[root * 3 + 2] - Q[root * 3 + 2];
    for (let i = 0; i < n; i++) {
      if (i === root) continue;
      const fk = feet.indexOf(i);
      if (fk >= 0 && pin[fk] && !(stepping && stepping.k === fk)) continue;
      const tn = TT[grp[i]], k = springK(tn, h), c = springC(tn, h);
      const o = i * 3;
      // Spring toward the pose, and damp the point's motion relative to the root.
      Q[o] += ((P[o] - Q[o]) - vrx) * c; Q[o + 1] += ((P[o + 1] - Q[o + 1]) - vry) * c; Q[o + 2] += ((P[o + 2] - Q[o + 2]) - vrz) * c;
      P[o] += (rx + A[o] - ax - P[o]) * k;
      P[o + 1] += (ry + A[o + 1] - ay - P[o + 1]) * k;
      P[o + 2] += (rz + A[o + 2] - az - P[o + 2]) * k;
    }
    // The root: held up by the legs while it stands; drawn back toward the animation's place.
    if (st === 'react' || st === 'getup') {
      const tl = TT.legs * Math.sqrt(preset.balance.support);
      const o = root * 3, k = springK(tl, h), c = springC(tl, h);
      Q[o + 1] += (P[o + 1] - Q[o + 1]) * c;
      P[o + 1] += (ay + (sinkNow - sink) - P[o + 1]) * k;
      const ka = springK(Math.sqrt(preset.balance.anchor) * TT.legs, h), ca = springC(Math.sqrt(preset.balance.anchor) * TT.legs, h);
      Q[o] += (P[o] - Q[o]) * ca * 0.5; Q[o + 2] += (P[o + 2] - Q[o + 2]) * ca * 0.5;
      // Over its feet, as the animation stands over its own (wherever a stagger has put the feet).
      let fx = 0, fz = 0, gx = 0, gz = 0;
      for (const f of feet) { fx += P[f * 3]; fz += P[f * 3 + 2]; gx += A[f * 3]; gz += A[f * 3 + 2]; }
      const nf = feet.length || 1;
      const tx = feet.length ? fx / nf + ax - gx / nf : ax, tz = feet.length ? fz / nf + az - gz / nf : az;
      P[o] += (tx - P[o]) * ka; P[o + 2] += (tz - P[o + 2]) * ka;
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
    // Falling: the hands go out toward the ground ahead.
    if (st === 'fall' && preset.fall.catch > 0) {
      const k = springK(preset.fall.catch, h);
      for (const hI of hands) {
        const x = rx + fallDir.x * 0.45, z = rz + fallDir.z * 0.45;
        P[hI * 3] += (x - P[hI * 3]) * k; P[hI * 3 + 1] += (ground(x, z) + rad[hI] - P[hI * 3 + 1]) * k; P[hI * 3 + 2] += (z - P[hI * 3 + 2]) * k;
      }
    }
    // Constraints: bones hold their length, braces stay within their range, knees and elbows bend
    // one way, points stay above the ground, planted feet stay pinned.
    for (let it = 0; it < ITER; it++) {
      for (const c of bones) solveDist(c, c.len, c.len, 1);
      for (const c of braces) solveDist(c, c.len * c.lo, c.len * c.hi, 0.5);
      if (hinges.length) {
        frameQuat(P, lower, idx, qLow); frameQuat(P, upper, idx, qUp);
        for (const hg of hinges) solveHinge(hg, hg.upper ? qUp : qLow);
      }
      feet.forEach((f, k) => { if (pin[k] && !(stepping && stepping.k === k)) { P[f * 3] = pin[k][0]; P[f * 3 + 2] = pin[k][1]; } });
      for (let i = 0; i < n; i++) {
        const fl = floorAt(i);
        if (P[i * 3 + 1] < fl) {
          P[i * 3 + 1] = fl;
          const fr = preset.friction;
          Q[i * 3] = P[i * 3] - (P[i * 3] - Q[i * 3]) * (1 - fr);
          Q[i * 3 + 2] = P[i * 3 + 2] - (P[i * 3 + 2] - Q[i * 3 + 2]) * (1 - fr);
          if (Q[i * 3 + 1] < P[i * 3 + 1]) Q[i * 3 + 1] = P[i * 3 + 1];
        }
      }
    }
    // Nothing flies apart: a runaway point (a bad preset) is put back where the animation has it.
    for (let i = 0; i < n * 3; i++) {
      if (!Number.isFinite(P[i]) || Math.abs(P[i] - Q[i]) > 60 * h) { P.set(A); Q.set(A); break; }
    }
  }

  function solveDist(c, lo, hi, stiff) {
    const a = c.a * 3, b = c.b * 3;
    const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
    const d = Math.hypot(dx, dy, dz);
    if (d < 1e-9) return;
    const want = d < lo ? lo : d > hi ? hi : d;
    if (want === d) return;
    const wa = inv[c.a], wb = inv[c.b], s = ((d - want) / d) * stiff / (wa + wb);
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
    const fix = hg.min - along, wm = inv[hg.m], wo = (inv[hg.a] + inv[hg.c]) / 2, s = fix / (wm + wo);
    P[m] += _v.x * s * wm; P[m + 1] += _v.y * s * wm; P[m + 2] += _v.z * s * wm;
    for (const o of [a, c]) { P[o] -= _v.x * s * wo * 0.5; P[o + 1] -= _v.y * s * wo * 0.5; P[o + 2] -= _v.z * s * wo * 0.5; }
  }

  // Balance: where the weight is against where the planted feet are. Step under it, or fall.
  function balance(h) {
    com.set(0, 0, 0); comV.set(0, 0, 0);
    let M = 0;
    for (let i = 0; i < n; i++) {
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
    let ax = 0, az = 0, am = 0, fx = 0, fz = 0;
    for (let i = 0; i < n; i++) { ax += A[i * 3] * mass[i]; az += A[i * 3 + 2] * mass[i]; am += mass[i]; }
    for (const f of feet) { fx += A[f * 3]; fz += A[f * 3 + 2]; }
    ax = ax / am - fx / feet.length; az = az / am - fz / feet.length;
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

  body.update = (dt) => {
    if (body.state === 'animated' || body.sleeping) return drain();
    dt = Math.max(0, Math.min(dt, 0.1));
    acc += dt;
    while (acc >= SUB - 1e-12) {
      acc -= SUB; t += SUB; stateT += SUB; woke += SUB;
      if (slump) { slump.t += SUB; if (slump.t >= slump.dur) slump = null; }
      const st = body.state;
      // The feet's own depth (the game stands zombies 0.2 m into the ground): kept while standing,
      // let go while down, and taken back up while getting up.
      if (st === 'react') sinkNow = sink;
      else sinkNow += ((st === 'getup' ? sink : 0) - sinkNow) * Math.min(1, SUB / (st === 'getup' ? preset.getup.time * 0.5 : 0.5));
      stepOnce(SUB);
      if (st === 'react') balance(SUB);
      transitions();
    }
    // Weight: in fast on waking, out on recovering, all the way while down or dead.
    const s = body.state;
    if (s === 'react') body.weight = body.recovering ? Math.max(0, 1 - body.recovering / preset.blendOut) : Math.min(1, woke / Math.max(1e-3, preset.blendIn));
    else if (s === 'getup') body.weight = 1 - smooth(stateT / preset.getup.time);
    else if (s !== 'animated') body.weight = Math.min(1, Math.max(body.weight, woke / Math.max(1e-3, preset.blendIn)));
    // How far the reaction has moved the body over the ground, for the host to take on as its own
    // place: where its feet went while it stands (a stagger step), where its hips went once it's down.
    if (s === 'react' && feet.length) {
      let dx = 0, dz = 0;
      for (const f of feet) { dx += P[f * 3] - A[f * 3]; dz += P[f * 3 + 2] - A[f * 3 + 2]; }
      body.drift.set(dx / feet.length, 0, dz / feet.length);
    } else body.drift.set(P[root * 3] - A[root * 3], 0, P[root * 3 + 2] - A[root * 3 + 2]);
    return drain();
  };

  function speedOf(i) { return Math.hypot(P[i * 3] - Q[i * 3], P[i * 3 + 1] - Q[i * 3 + 1], P[i * 3 + 2] - Q[i * 3 + 2]) / SUB; }
  function transitions() {
    const s = body.state;
    const rh = P[root * 3 + 1] - ground(P[root * 3], P[root * 3 + 2]);
    if (s === 'fall') {
      if (!landed && rh < preset.down.height * 1.4) { landed = true; emit('land'); }
      if (rh < preset.down.height && speedOf(root) < 0.6) { body.state = 'down'; stateT = 0; emit('down'); }
    } else if (s === 'down') {
      if (body.alive && stateT >= preset.down.time) { body.state = 'getup'; stateT = 0; emit('getup'); }
    } else if (s === 'getup') {
      if (stateT >= preset.getup.time) recover();
    } else if (s === 'react') {
      if (body.recovering) {
        body.recovering += SUB;
        if (body.recovering >= preset.blendOut) recover();
      } else if (!slump && !stepping && woke > 0.2 && (body.offBalance || 0) < preset.balance.step * 0.6 && speedOf(root) < 0.35) {
        body.recovering = 1e-6;
      }
    } else if (s === 'dead') {
      let e = 0;
      for (let i = 0; i < n; i++) e = Math.max(e, speedOf(i));
      still = e < 0.08 ? still + SUB : 0;
      if (still >= preset.death.settle && !body.sleeping) { emit('settled'); body.sleep(); }
    }
  }
  function recover() {
    body.state = 'animated'; body.weight = 0; body.recovering = 0; slump = null; stepping = null;
    if (opts.pool) opts.pool.give(body);
    emit('recovered');
  }

  // --- Writing the pose back onto the rig ---
  const S = new Float64Array(n * 3);
  body.apply = () => {
    const w = body.weight;
    if (!(w > 0) || !followed) return;
    S.set(P);
    const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), ps = new THREE.Vector3(), pp = new THREE.Vector3();
    for (const s of segs) {
      const j = s.j;
      s.animW.decompose(_p, _qa, _s);               // the animated world pose of this joint
      if (s.frame) {
        frameQuat(A, s.frame, idx, _qb);
        frameQuat(S, s.frame, idx, _qc);
        _q.copy(_qc).multiply(_qb.invert()).multiply(_qa);
      } else if (s.aim) {
        const a = s.aimI[0] * 3, b = s.aimI[1] * 3;
        _x.set(A[b] - A[a], A[b + 1] - A[a + 1], A[b + 2] - A[a + 2]).normalize();
        _y.set(S[b] - S[a], S[b + 1] - S[a + 1], S[b + 2] - S[a + 2]).normalize();
        _q.setFromUnitVectors(_x, _y).multiply(_qa);
      } else continue;
      _qa.slerp(_q, w);                              // the world rotation it ends with
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
  return body;
}
