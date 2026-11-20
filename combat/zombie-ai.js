// CB-336 (J154 Zombie Pass 2, Jerry 15 Nov 2026; D-184/D-185): the zombies' own minds and bodies in a crowd. Jerry: "If
// they bump or hit another zombie it physically moves or affects that other one" and "they should not clip into each
// other. (Too much)". Pure: no three.js, no DOM. index.html (updateZombies) fills the solver's arrays once a frame, calls
// it, and writes the results back; nothing here allocates per frame.
//
// Stage 1, the body contact (review/CB-336/design.md):
//   AI_MASS[typeKey]                  how heavy each kind is in a crowd (a brute shoves a shambler aside, not the reverse)
//   createContactSolver(cap)          the reusable arrays (x, z, y, r, inverse mass, velocity, flags; outputs)
//   solveContacts(S, dt[, opts])      separates the bodies on a uniform grid, splits each overlap by mass, hands the lighter
//                                     body a shove (a short velocity, applied by the walk next frame so the walls still
//                                     hold it), flags a stagger or a knock-down when something heavy and fast runs into
//                                     something light, and keeps GB-94's room nudges. Returns the frame's stats.
//   queueSteer(sx, sz, prx, prz, side, out)   a body pressed back by friends in front slides round them instead of stacking
//   shoveDecay(dt)                    the factor a shove velocity keeps over dt
//
// A pair where either body is not on the AI (FLAG_AI clear: a TT spawn a test placed, GB-94's way) is separated exactly as
// before (0.58 of the overlap each way, once, at any height), so the older checks see the old crowd.

export const AI_MASS = Object.freeze({
  shambler: 1, feral: 0.7, leaper: 0.9, spider: 2, drowned: 1.1, military: 1.4, brute: 3.5, spitter: 1, screamer: 1,
  bomber: 1.6, demon: 3.5, colossus: 12, guardian: 6, caveguard: 6,
});
export function massOf(typeKey) { return AI_MASS[typeKey] || 1; }

export const CONTACT = Object.freeze({
  CELL: 2.8,          // grid cell (m): the widest crowd pair (two bombers) plus GB-94's room fits inside one cell's reach
  BIG_R: 0.8,         // bodies wider than this (the colossus) are checked against everyone, not through the grid
  ITER: 4,            // passes over the AI pairs (the legacy pairs: one, as before); 4 keeps a 48-body crush under ~11% (2: 24%)
  SLACK: 0.05,        // of the summed radii: a squash this small is left (bodies in a crush touch and press, they are not rigid)
  POS_K: 1,           // of the overlap past the slack, put right in position this pass ...
  VEL_K: 0.35,        // ... and of the rest (none at POS_K 1), handed on as a shove velocity (per second of overlap)
  CARRY: 0.85,        // of the closing speed passed into the lighter body (the "it physically moves" part)
  SHOVE_MAX: 3.2,     // m/s, the most shove a body can carry
  SHOVE_TAU: 0.22,    // s, how fast a shove dies away
  STAGGER_C: 1.3,     // m/s closing speed for a stagger (with a mass ratio of at least STAGGER_RATIO)
  STAGGER_RATIO: 2,
  KNOCK_C: 4.5,       // m/s closing speed for a knock-down (a charging demon, a brute's rush)
  KNOCK_RATIO: 2.5,
  DY: 1.6,            // m: AI bodies further apart than this up or down (a platform over a crowd) don't touch
  LEGACY_K: 0.58,     // the old split
});

export const FLAG_AI = 1, FLAG_HZ = 2, FLAG_AIR = 4, FLAG_PLAYER = 8;   // PLAYER: the marine, pinned (inverse mass 0), so the crowd is solved round him, not pushed into him afterwards
const BUCKETS = 512, BMASK = BUCKETS - 1;

export function createContactSolver(cap = 96) {
  const F = (n) => new Float64Array(n);
  return {
    cap, n: 0,
    x: F(cap), z: F(cap), y: F(cap), r: F(cap), im: F(cap), vx: F(cap), vz: F(cap), hzD: F(cap), flag: new Uint8Array(cap),
    // outputs (cleared by solveContacts)
    spx: F(cap), spz: F(cap),        // GB-94 room nudges (headings, not positions)
    shx: F(cap), shz: F(cap),        // shove velocity to add (m/s)
    prx: F(cap), prz: F(cap),        // contact pressure (summed push normals x overlap), for queueSteer
    ev: new Uint8Array(cap), evx: F(cap), evz: F(cap), evc: F(cap),   // 1 stagger, 2 knock-down; the push direction; closing speed
    head: new Int32Array(BUCKETS), next: new Int32Array(cap), big: new Int32Array(cap), nBig: 0,
    stats: { pairs: 0, touching: 0, maxOver: 0, sumOver: 0, overN: 0, staggers: 0, knocks: 0 },
  };
}

function bucketOf(cx, cz) { return ((cx * 73856093) ^ (cz * 19349663)) & BMASK; }

// One pair. pass 0 is the full treatment; later passes only position. Returns nothing; writes S.
function pairAB(S, a, b, pass, dt, room, freeD, K) {
  const dx = S.x[b] - S.x[a], dz = S.z[b] - S.z[a];
  const fa = S.flag[a], fb = S.flag[b];
  const ai = (fa & FLAG_AI) && (fb & FLAG_AI), pl = (fa | fb) & FLAG_PLAYER;
  if (!ai && (pass > 0 || pl)) return;   // a legacy body and the marine: the walk's contact ring, as before
  const minD = S.r[a] + S.r[b];
  const roomD = ((fa | fb) & FLAG_HZ) && !pl ? minD + room : minD;
  // !(|d| <= roomD) rather than > roomD, so a NaN is skipped (Claude 2026-09-28's rule in the old pass)
  if (!(Math.abs(dx) <= roomD && Math.abs(dz) <= roomD)) return;
  if (ai && ((fa | fb) & FLAG_AIR || Math.abs(S.y[b] - S.y[a]) > K.DY)) return;
  if (pass === 0) S.stats.pairs++;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.0001;
  const ux = dx / dist, uz = dz / dist;
  if (dist >= minD) {
    if (pass === 0 && dist < roomD) {   // GB-94's hordeRoom: neighbours nudge each other's heading on the way in
      const w = (roomD - dist) / room;
      if ((fa & FLAG_HZ) && S.hzD[a] > freeD) { S.spx[a] -= ux * w; S.spz[a] -= uz * w; }
      if ((fb & FLAG_HZ) && S.hzD[b] > freeD) { S.spx[b] += ux * w; S.spz[b] += uz * w; }
    }
    return;
  }
  if (!ai) {   // the old split, exactly
    const push = (minD - dist) * K.LEGACY_K;
    S.x[a] -= ux * push; S.z[a] -= uz * push;
    S.x[b] += ux * push; S.z[b] += uz * push;
    if (pass === 0) S.stats.touching++;
    return;
  }
  const ima = S.im[a], imb = S.im[b], ims = ima + imb;
  if (!(ims > 0)) return;   // two pinned bodies
  const wa = ima / ims, wb = imb / ims;
  const over = minD - dist - (ima > 0 && imb > 0 ? K.SLACK * minD : 0);   // against a pinned body (the marine, a climber): no squash
  if (pass === 0) {
    S.stats.touching++;
    const o = Math.max(0, minD - dist) / minD;
    if (o > S.stats.maxOver) S.stats.maxOver = o;
    S.stats.sumOver += o; S.stats.overN++;
  }
  if (over > 0) {
    const pos = over * K.POS_K;
    S.x[a] -= ux * pos * wa; S.z[a] -= uz * pos * wa;
    S.x[b] += ux * pos * wb; S.z[b] += uz * pos * wb;
    if (pass === 0) { S.prx[a] -= ux * over; S.prz[a] -= uz * over; S.prx[b] += ux * over; S.prz[b] += uz * over; }
  }
  if (pass !== 0) return;
  // The shove: the closing speed along the contact goes into the bodies by mass (the lighter takes most of it), plus a
  // spring on what is left of the overlap. Applied next frame by the walk, before the walls, so nothing is shoved through one.
  if (!(ima > 0 && imb > 0)) return;   // against the marine or a pinned climber: positions only (nothing bounces off him, he bowls nobody)
  const close = (S.vx[a] - S.vx[b]) * ux + (S.vz[a] - S.vz[b]) * uz;   // > 0: a is running into b
  const spring = over > 0 ? over * (1 - K.POS_K) * K.VEL_K / Math.max(dt, 1 / 120) : 0;
  const c = Math.max(0, close) * K.CARRY;
  S.shx[b] += ux * (c + spring) * wb; S.shz[b] += uz * (c + spring) * wb;
  S.shx[a] -= ux * (c + spring) * wa; S.shz[a] -= uz * (c + spring) * wa;
  // Something heavy and fast into something light: a stagger, or bowled over. Whichever way the hit runs.
  const mA = ima > 0 ? 1 / ima : Infinity, mB = imb > 0 ? 1 / imb : Infinity;
  if (close > K.STAGGER_C && mA >= mB * K.STAGGER_RATIO) mark(S, b, close >= K.KNOCK_C && mA >= mB * K.KNOCK_RATIO ? 2 : 1, ux, uz, close);
  else if (-close > K.STAGGER_C && mB >= mA * K.STAGGER_RATIO) mark(S, a, -close >= K.KNOCK_C && mB >= mA * K.KNOCK_RATIO ? 2 : 1, -ux, -uz, -close);
}
function mark(S, i, lvl, ux, uz, c) {
  if (lvl < S.ev[i] || (lvl === S.ev[i] && c <= S.evc[i])) return;
  S.ev[i] = lvl; S.evx[i] = ux; S.evz[i] = uz; S.evc[i] = c;
}

export function solveContacts(S, dt, opts = {}) {
  const K = opts.K || CONTACT, room = opts.space != null ? opts.space : 1.2, freeD = opts.freeD != null ? opts.freeD : 3.5;
  const n = S.n, st = S.stats;
  st.pairs = 0; st.touching = 0; st.maxOver = 0; st.sumOver = 0; st.overN = 0; st.staggers = 0; st.knocks = 0;
  for (let i = 0; i < n; i++) { S.spx[i] = 0; S.spz[i] = 0; S.shx[i] = 0; S.shz[i] = 0; S.prx[i] = 0; S.prz[i] = 0; S.ev[i] = 0; S.evc[i] = 0; }
  const C = K.CELL, seen = _seen;
  for (let pass = 0; pass < K.ITER; pass++) {
    S.head.fill(-1); S.nBig = 0;
    for (let i = 0; i < n; i++) {
      if (S.r[i] > K.BIG_R) { S.big[S.nBig++] = i; continue; }
      if (!Number.isFinite(S.x[i]) || !Number.isFinite(S.z[i])) { S.next[i] = -2; continue; }
      const bk = bucketOf(Math.floor(S.x[i] / C), Math.floor(S.z[i] / C));
      S.next[i] = S.head[bk]; S.head[bk] = i;
    }
    for (let i = 0; i < n; i++) {
      if (S.r[i] > K.BIG_R || S.next[i] === -2) continue;
      const cx = Math.floor(S.x[i] / C), cz = Math.floor(S.z[i] / C);
      let ns = 0;
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const bk = bucketOf(cx + ox, cz + oz);
        let dup = false; for (let k = 0; k < ns; k++) if (seen[k] === bk) { dup = true; break; }
        if (dup) continue; seen[ns++] = bk;
        for (let j = S.head[bk]; j >= 0; j = S.next[j]) if (j > i) pairAB(S, i, j, pass, dt, room, freeD, K);
      }
    }
    for (let k = 0; k < S.nBig; k++) {   // the big ones against everybody
      const a = S.big[k];
      for (let j = 0; j < n; j++) {
        if (j === a) continue;
        if (S.r[j] > K.BIG_R && j < a) continue;   // a big pair once
        if (j < a) pairAB(S, j, a, pass, dt, room, freeD, K); else pairAB(S, a, j, pass, dt, room, freeD, K);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const l = Math.sqrt(S.shx[i] * S.shx[i] + S.shz[i] * S.shz[i]);
    if (l > K.SHOVE_MAX) { S.shx[i] *= K.SHOVE_MAX / l; S.shz[i] *= K.SHOVE_MAX / l; }
    if (S.ev[i] === 1) st.staggers++; else if (S.ev[i] === 2) st.knocks++;
  }
  return st;
}
const _seen = new Int32Array(9);

export function shoveDecay(dt, K = CONTACT) { return Math.exp(-Math.max(0, dt) / K.SHOVE_TAU); }

// A body walking (sx, sz) and pressed back by friends in front of it (pressure prx, prz against its heading) turns part
// of its walk along them, to the side it picked (side +-1), so a queue at a wall or round him spreads along it instead
// of piling up behind. Returns out { x, z, pressed }.
export const QUEUE = Object.freeze({ MIN_P: 0.05, K: 1.4, MAX: 0.85 });
export function queueSteer(sx, sz, prx, prz, side, out = { x: 0, z: 0, pressed: false }) {
  const back = -(prx * sx + prz * sz);   // how hard it is pushed against where it is going
  if (!(back > QUEUE.MIN_P)) { out.x = sx; out.z = sz; out.pressed = false; return out; }
  const k = Math.min(QUEUE.MAX, (back - QUEUE.MIN_P) * QUEUE.K + 0.25), s = side < 0 ? -1 : 1;
  let x = sx * (1 - k) - sz * s * k, z = sz * (1 - k) + sx * s * k;
  const l = Math.sqrt(x * x + z * z) || 1;
  out.x = x / l; out.z = z / l; out.pressed = true;
  return out;
}

// ======================================================================================================================
// Stage 2, the senses (review/CB-336/design.md, "Per type" and "Perception and awareness"). Each kind sees, hears and
// smells in its own way; each zombie's awareness runs idle -> suspicious -> hunting -> searching -> idle on what it
// senses, and every step up has a tell he can read within a second (a stop and a head turn, a groan, a scream).
//   AI_TYPES[typeKey]   role, sight [day, night] m and cone (deg), hearing x, smell m, memory s, the tell, its idles
//   sightRange(t, ctx)  how far this kind sees him right now (night, fog, his light in its cone, crouched in cover)
//   hearRange(t, r)     how far it hears a sound of radius r
//   stepAware(a, t, dt, cue)   one think tick of the awareness machine; returns what changed ('notice', 'hunt', 'lost', 'calm', or '')
export const AI_TYPES = Object.freeze({
  shambler: { role: 'mass', sight: [30, 12], cone: 140, hear: 1.0, smell: 8, memory: 6, notice: 0.8, tell: 'groan', idle: ['sway', 'wander', 'feed', 'wall', 'slump'], call: 10, rank: 1 },
  feral: { role: 'flank', sight: [35, 18], cone: 160, hear: 1.5, smell: 25, memory: 9, notice: 0.3, tell: 'snap', idle: ['sniff', 'prowl', 'perch'], call: 10, rank: 1 },
  leaper: { role: 'ambush', sight: [40, 20], cone: 120, hear: 1.2, smell: 0, memory: 10, notice: 0.5, tell: 'still', idle: ['lurk', 'twitch'], call: 6, rank: 1 },
  spider: { role: 'artillery', sight: [30, 22], cone: 200, hear: 1.0, feel: 1.5, smell: 0, memory: 8, notice: 0.5, tell: 'rear', idle: ['hang', 'flex'], call: 0, rank: 2 },
  drowned: { role: 'lurk', sight: [20, 14], cone: 120, hear: 1.0, feelWater: 2, smell: 20, memory: 8, notice: 0.6, tell: 'sink', idle: ['submerge', 'drift', 'drip'], call: 6, rank: 1 },
  military: { role: 'lead', sight: [40, 20], cone: 120, hear: 1.2, smell: 0, memory: 12, notice: 0.4, tell: 'point', idle: ['patrol', 'sentry'], call: 18, rank: 4 },
  brute: { role: 'breach', sight: [25, 12], cone: 110, hear: 0.8, smell: 0, memory: 8, notice: 0.7, tell: 'roar', idle: ['breathe', 'tear', 'pound'], call: 14, rank: 3 },
  spitter: { role: 'support', sight: [30, 14], cone: 120, hear: 1.0, smell: 0, memory: 8, notice: 0.6, tell: 'retch', idle: ['hunch', 'retch'], call: 8, rank: 1 },
  screamer: { role: 'caller', sight: [45, 24], cone: 150, hear: 1.3, smell: 0, memory: 12, notice: 0.4, tell: 'stare', idle: ['sway', 'face'], call: 40, rank: 2 },
  bomber: { role: 'sapper', sight: [20, 10], cone: 120, hear: 0.8, smell: 0, memory: 6, notice: 0.7, tell: 'pulse', idle: ['rock'], call: 8, rank: 1 },
  demon: { role: 'shock', sight: [35, 20], cone: 140, hear: 1.0, smell: 15, memory: 10, notice: 0.5, tell: 'flare', idle: ['pace'], call: 14, rank: 3 },
  colossus: { role: 'boss', boss: true, sight: [999, 999], cone: 360, hear: 9, smell: 0, memory: 999, notice: 0, tell: 'roar', idle: ['breathe'], call: 30, rank: 5 },
  guardian: { role: 'boss', boss: true, sight: [999, 999], cone: 360, hear: 9, smell: 0, memory: 999, notice: 0, tell: 'roar', idle: ['breathe'], call: 30, rank: 5 },
  caveguard: { role: 'scripted', boss: true, sight: [999, 999], cone: 360, hear: 9, smell: 0, memory: 999, notice: 0, tell: 'roar', idle: ['breathe'], call: 0, rank: 0 },
});
export function aiType(k) { return AI_TYPES[k] || AI_TYPES.shambler; }

export const SENSE = Object.freeze({
  FEEL_R: 2.5,             // anything this close knows he is there (breath, the ground, the smell of him)
  FIGHT_R: 22,             // in a wave, within this of him in a fight it knows (the noise of it)
  LIGHT_MUL: 2.5,          // his flashlight / laser-light: seen this much further inside its beam
  CROUCH_COVER_MUL: 0.5,   // crouched in cover: seen at half the range
  FOG_MIN: 6,              // fog never cuts sight below this
  STEP: { sprint: 14, walk: 7, crouch: 2.5 },   // the radius of his steps (x the listener's hearing)
  BUILD_R: 25, BLAST_R: 60, DOOR_R: 12, TURRET_R: 35, SAW_R: 40,
  SUSPECT: 0.5,            // a heard sound lifts awareness to this at once (suspicious, goes to look)
  SEARCH_S: [20, 40],      // a lost trail is searched this long, then it calms down
});

// How far kind t sees him now. ctx: { night 0..1, fogFar (m, or Infinity), lit (his light points at it), crouchCover }
export function sightRange(t, ctx) {
  const T = typeof t === 'string' ? aiType(t) : t;
  let r = T.sight[0] + (T.sight[1] - T.sight[0]) * Math.max(0, Math.min(1, ctx.night || 0));
  if (ctx.lit) r *= SENSE.LIGHT_MUL;
  if (ctx.crouchCover) r *= SENSE.CROUCH_COVER_MUL;
  if (ctx.fogFar != null && Number.isFinite(ctx.fogFar)) r = Math.min(r, Math.max(SENSE.FOG_MIN, ctx.fogFar));
  return r;
}
export function hearRange(t, r) { const T = typeof t === 'string' ? aiType(t) : t; return (r || 0) * T.hear; }
// Inside its cone? fx,fz its facing (unit), dx,dz to him.
export function inCone(t, fx, fz, dx, dz) {
  const T = typeof t === 'string' ? aiType(t) : t; if (T.cone >= 360) return true;
  const l = Math.sqrt(dx * dx + dz * dz); if (!(l > 1e-6)) return true;
  return (fx * dx + fz * dz) / l >= Math.cos(T.cone * Math.PI / 360);
}

// The awareness machine, one think tick. a: { state, aware, known: {x, z, t}, lostT, searchT, noticeT }.
// cue: { now, sees, seeD, seeX, seeZ, feel, heard: {x, z} | null, told: {x, z} | null, wave, fightNear, hqX, hqZ, rnd }
// sees: in range, in the cone, a clear line (the caller's ray). Returns '' or the change.
export function stepAware(a, t, dt, cue) {
  const T = typeof t === 'string' ? aiType(t) : t, was = a.state;
  if (T.boss) { a.state = 'hunting'; a.aware = 1; if (cue.seeX != null) a.known = { x: cue.seeX, z: cue.seeZ, t: cue.now }; return was === 'hunting' ? '' : 'hunt'; }
  if (a.noticeT > 0) a.noticeT = Math.max(0, a.noticeT - dt);
  const direct = cue.feel || (cue.wave && cue.fightNear);
  if (cue.sees || direct) {
    // Seen: awareness climbs, faster close (a body at a third of its range knows him at once, at the edge in about 1.5 s).
    const k = direct ? 99 : (1.5 / Math.max(0.15, (cue.seeD || 0) / Math.max(1, cue.seeR || 20))) * dt;
    a.aware = Math.min(1, a.aware + k);
    if (cue.seeX != null) a.known = { x: cue.seeX, z: cue.seeZ, t: cue.now };
    a.lostT = 0;
    if (a.state !== 'hunting' && a.aware < 1 && a.state === 'idle') { a.state = 'suspicious'; a.noticeT = T.notice; return 'notice'; }
    if (a.aware >= 1 && a.state !== 'hunting') { const fromIdle = a.state === 'idle'; a.state = 'hunting'; a.noticeT = fromIdle || was === 'suspicious' ? T.notice : 0; return 'hunt'; }
    return '';
  }
  if (cue.told) {   // a friend's call: it knows where he was (a hunter takes the fresher news), goes there hunting
    a.known = { x: cue.told.x, z: cue.told.z, t: cue.now }; a.aware = 1; a.lostT = Math.min(a.lostT, T.memory * 0.5);
    if (a.state !== 'hunting') { a.state = 'hunting'; a.lostT = 0; a.noticeT = T.notice * 0.5; return 'hunt'; }
    return '';
  }
  if (cue.heard && a.state === 'hunting') { a.known = { x: cue.heard.x, z: cue.heard.z, t: cue.now }; a.lostT = 0; }   // a hunter hears him: fresh news
  else if (cue.heard) {
    a.known = { x: cue.heard.x, z: cue.heard.z, t: cue.now }; a.aware = Math.max(a.aware, SENSE.SUSPECT);
    if (a.state !== 'suspicious') { a.state = 'suspicious'; a.noticeT = T.notice; return 'notice'; }
    return '';
  }
  if (cue.wave && a.state === 'idle') {   // a wave walks in suspicious of the HQ
    a.state = 'suspicious'; a.aware = SENSE.SUSPECT; a.known = { x: cue.hqX || 0, z: cue.hqZ || 0, t: cue.now }; return 'notice';
  }
  if (a.state === 'hunting') {
    a.lostT += dt;
    if (a.lostT >= T.memory) { a.state = 'searching'; a.aware = 0.6; a.searchT = SENSE.SEARCH_S[0] + (cue.rnd != null ? cue.rnd : 0.5) * (SENSE.SEARCH_S[1] - SENSE.SEARCH_S[0]); return 'lost'; }
    return '';
  }
  if (a.state === 'searching' || a.state === 'suspicious') {
    if (cue.wave) return '';   // a wave never calms down
    a.aware = Math.max(0, a.aware - dt * 0.02);
    a.searchT = (a.searchT || SENSE.SEARCH_S[0]) - dt;
    if (a.searchT <= 0) { a.state = 'idle'; a.aware = 0; return 'calm'; }
  }
  return '';
}
export function newAware() { return { state: 'idle', aware: 0, known: null, lostT: 0, searchT: 0, noticeT: 0 }; }
// Where a hunter goes: at him while it has him (seen, felt or heard within TRACK_S), else to the last place it knew.
export const TRACK_S = 1.0;
export function tracking(a) { return a.state === 'hunting' && a.lostT < TRACK_S; }
