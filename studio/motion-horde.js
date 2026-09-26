// studio/motion-horde.js — reactions for a crowd: the game's horde and its marine (D-42, P-70 to
// P-72). Claude's (studio/*). docs/drafts/horde.md says how the game wires it in.
//
// The game has up to 48 zombies and a marine, and at most `max` of them simulate at once (a pool,
// AGENTS.md rule 12). A zombie is adopted as the studio's 'zombie' rig the first time something hits
// it, and keeps that body for as long as its mesh lives: meshes are pooled, so each adopts once. The
// host hands every hit and every death here; once a frame, after it has animated its bodies and before
// it draws, update(dt) reads each reacting body's animated pose, simulates it and writes it back.
//
//   const horde = createHorde({ presets, ground: (x, z, y) => groundY, lodFor: (x, z) => 0 | 1 | 2 });
//   horde.hit(z, { at: [x, y, z] | 'chest', dir: [x, y, z], power, kind, shot })
//        false: refused (full pool, or a body that doesn't react): the host plays its old reaction.
//        Hits with the same `shot` on one body before the next update() are one hit (a shell's pellets).
//   horde.kill(z, { ...same })   true: it dies as a ragdoll. Keep the corpse; 'settled' says it is still.
//   horde.busy(z)                true while it falls, lies or gets up: the host's AI leaves it alone.
//   horde.update(dt)             → [{ key, name, data }], every body's events this frame.
//   horde.adopt(key, { rig, preset, group, move, ground })   a body of the host's own (the marine).
//   horde.release(z) / horde.releaseAll()   its mesh goes back to the pool, or the match resets.
//
// The drift (how far a reaction moved a body over the ground) is taken on before the body is drawn:
// by the adopt() call's own `move(dx, dz)`, else by the `move(key, dx, dz, group)` option, else by
// moving the rig's group. No randomness in here: the same hits give the same horde every time.
import * as THREE from 'three';
import { rigs } from './rigs.js';
import { loadMotion, createBody, createMotionPool, HIT_KINDS } from './motion.js';
import { loadClip, createPlayer } from './clip.js';
import { ZOMBIE } from './zombie.js';

// Which preset each of the game's zombie types reacts with (z.typeKey). Any humanoid not named here is
// a shambler. The guardian is a 420-hp boss on the zombie mesh: it reacts like a brute, not a shambler.
export const HORDE_PRESETS = { brute: 'zombie/brute', demon: 'zombie/brute', guardian: 'zombie/brute', feral: 'zombie/feral' };
// Not humanoid (spiders), too big to be moved (the colossus), or never in the horde (the cave guardian).
export const NEVER_REACT = ['spider', 'colossus', 'caveguard'];
// The game's partsLost keys, which are also the engine's lose() parts (contract 3).
export const HORDE_PARTS = ['armL', 'armR', 'legL', 'legR', 'head'];
const BUSY = new Set(['fall', 'down', 'getup']);
// The ground under a body is a plane through three samples a frame at its group, not a lookup for every
// point on every physics step (about 17 points × 4 passes × 2 steps). Slopes past 1.5 are a deck's edge.
const PLANE_STEP = 0.5, PLANE_SLOPE = 1.5;

export function hordePresetFor(z) {
  if (!z || z.spider || NEVER_REACT.includes(z.typeKey)) return null;
  return HORDE_PRESETS[z.typeKey] || 'zombie/shambler';
}

// A get-up clip is authored on the studio's rig, which is scaled as a whole. The game bakes each type's
// size into its joint offsets instead (a brute's hips sit at 0.55 × 1.38), so the clip's positions are
// scaled to match the body that plays it.
function scaleClipJson(json, s) {
  if (Math.abs(s - 1) < 1e-3) return json;
  const out = JSON.parse(JSON.stringify(json));
  for (const chans of Object.values(out.tracks || {})) {
    for (const ch of ['pos', 'ik']) for (const k of chans[ch] || []) if (Array.isArray(k[1])) k[1] = k[1].map((v) => v * s);
  }
  return out;
}

// Loads the get-up clips the presets name (browser; relative to this file, like studio/load.js). A clip
// that isn't there is skipped: those bodies keep the engine's own blend back to their animation.
export async function fetchHordeClips(presets) {
  const refs = new Set();
  for (const n of presets.names()) {
    const g = (presets.json(n) || {}).getup;
    if (g) for (const side of ['front', 'back']) if (typeof g[side] === 'string') refs.add(g[side]);
  }
  const out = new Map();
  await Promise.all([...refs].map(async (ref) => {
    try {
      const r = await fetch(new URL(`./clips/${ref}.json`, import.meta.url));
      if (r.ok) out.set(ref, await r.json());
    } catch (_) { /* not there: no clip for that side */ }
  }));
  return out;
}

const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

export function createHorde(opts = {}) {
  const presets = opts.presets;
  if (!presets || typeof presets.json !== 'function') throw new Error('createHorde: needs presets (studio/motion/index.js)');
  const max = opts.max ?? 8;
  const pool = createMotionPool({ max });
  const groundFn = opts.ground || (() => 0);
  const lodFor = opts.lodFor || null;
  const onEvent = opts.onEvent || null;
  const moveFn = opts.move || null;
  const clipsFn = opts.clips || null;
  const presetOf = opts.presetFor || hordePresetFor;
  const now = opts.now || (() => performance.now());
  // Adopting a mesh costs about 0.4 ms (rigs.create builds the studio's own rig to read its rest pose
  // from), once in the mesh's life. A grenade into a fresh crowd would pay it a dozen times in one frame,
  // so at most this many adopt a frame; the rest keep the old reaction until a later hit.
  const adoptMax = opts.adoptsPerFrame ?? 3;
  let adoptedNow = 0;
  const self = {};
  const recs = new Map();          // key (a zombie, or one of the host's own bodies) → its record
  const loaded = new Map();        // preset ref → loadMotion(json), shared by every body that uses it
  const clipCache = new Map();     // "ref@scale" → a loaded clip
  const later = [];                // events from outside update() (a corpse frozen to make room)
  let frame = 0, lastMs = 0, avgMs = 0, refused = 0, lastAwake = 0;
  const lodN = [0, 0, 0];

  const planeY = (pl, x, z) => pl.y + (x - pl.x) * pl.sx + (z - pl.z) * pl.sz;
  function samplePlane(pl, ground, x, y, z) {
    const g0 = ground(x, z, y);
    const y0 = Number.isFinite(g0) ? g0 : y;
    const gx = ground(x + PLANE_STEP, z, y), gz = ground(x, z + PLANE_STEP, y);
    const clampS = (d) => Math.max(-PLANE_SLOPE, Math.min(PLANE_SLOPE, Number.isFinite(d) ? d : 0));
    pl.x = x; pl.z = z; pl.y = y0;
    pl.sx = clampS((gx - y0) / PLANE_STEP); pl.sz = clampS((gz - y0) / PLANE_STEP);
  }

  function presetFor(ref) {
    let p = loaded.get(ref);
    if (!p) { const j = presets.json(ref); if (!j) return null; p = loadMotion(j); loaded.set(ref, p); }
    return p;
  }

  // The adopted rig and its body, kept on the mesh so a pooled mesh adopts once. The rig belongs to
  // the mesh; the body to this horde (its pool), so a new horde makes new bodies on the same rigs.
  function bodyFor(group, rig, ref, pooled) {
    const ud = group.userData || (group.userData = {});
    let c = ud.hordeBody;
    if (c === false) return null;
    const preset = presetFor(ref);
    if (!preset || preset.rig !== rig) return null;
    if (!c || c.rig !== rig) {
      let inst;
      try { inst = rigs.get(rig).create({ group }); } catch (_) { ud.hordeBody = false; return null; }
      if (!inst.def.body) { ud.hordeBody = false; return null; }
      c = { rig, inst, plane: { x: 0, z: 0, y: 0, sx: 0, sz: 0 }, s: 1, posJ: [], joints: [], anim: [], owner: null, player: null, rec: null };
      adoptFix(c, group);
      ud.hordeBody = c;
    }
    if (c.owner !== self || c.ref !== ref || c.pooled !== pooled || c.lostAny) {
      c.body = createBody(c.inst, preset, { ground: (x, z) => planeY(c.plane, x, z), pool: pooled ? pool : undefined });
      c.owner = self; c.ref = ref; c.pooled = pooled; c.preset = preset; c.lostAny = false;
    }
    return c;
  }

  // What the host's own mesh needs before its body is right:
  // - The game bakes a type's size into its joint offsets. adoptZombie() puts the hand and foot ends
  //   at the shambler's offsets; a brute's hands hang 1.38 times further down its forearms.
  // - Its rest (what a clip leaves alone) keeps the host's own joint offsets, not the studio's.
  // - The joints the body moves by position (the hips) are reset to their rest across the ground each
  //   frame the host poses them, because the host only ever poses their height (see fixPosJoints).
  function adoptFix(c, group) {
    const inst = c.inst, R = inst.R;
    if (c.rig === 'zombie' && R.elbowL) {
      const s = Math.abs(R.elbowL.position.y) / Math.abs(ZOMBIE.elbow);
      c.s = Number.isFinite(s) && s > 0.2 ? s : 1;
      const ends = group.userData.motionEnds;
      if (ends && Math.abs(c.s - 1) > 1e-3) {
        for (const k of ['handL', 'handR']) ends[k].position.set(...ZOMBIE.hand).multiplyScalar(c.s);
        for (const k of ['footL', 'footR']) ends[k].position.set(...ZOMBIE.foot).multiplyScalar(c.s);
      }
    }
    for (const j of Object.values(R)) {
      if (!j || !j.isObject3D) continue;
      c.joints.push(j);
      const r = inst.rest.get(j);
      if (r) r.p.copy(j.position);
    }
    if (c.rig === 'zombie' && R.pelvis && group.userData.baseHipsY != null) {
      const r = inst.rest.get(R.pelvis);
      if (r) r.p.y = group.userData.baseHipsY;
    }
    for (const sg of inst.def.body.segments) {
      const j = R[sg.joint];
      if (!j) continue;
      c.anim.push([j, new THREE.Quaternion(), new THREE.Vector3()]);
      if (sg.pos !== undefined) c.posJ.push({ j, x: j.position.x, z: j.position.z, w: null });
    }
  }

  function makeRec(key, c, o) {
    const b = c.body;
    if (b.state !== 'animated' || b.sleeping || !b.alive) b.reset();
    const rec = {
      key, c, body: b, inst: c.inst, group: c.inst.group, preset: c.preset, pooled: !!o.pooled,
      zombie: o.zombie || null, move: o.move || null, ground: o.ground || groundFn, keepYaw: !o.zombie,
      queue: [], reserved: false, frozen: false, killed: false, deadAt: -1, lost: new Set(),
      clip: null, snap: null, yaw0: null, heading: 0, applied: false
    };
    // One body per mesh: a record the host forgot to release (its zombie is gone, the mesh is back
    // out of the pool on another) lets go before the new one takes over.
    if (c.rec && c.rec !== rec && recs.get(c.rec.key) === c.rec) releaseRec(c.rec);
    c.rec = rec;
    recs.set(key, rec);
    return rec;
  }

  function attachZombie(z) {
    if (!z || !z.mesh) return null;
    const ref = presetOf(z);
    if (!ref) return null;
    const fresh = !z.mesh.userData || z.mesh.userData.hordeBody === undefined;
    if (fresh && adoptedNow >= adoptMax) { refused++; return null; }
    const c = bodyFor(z.mesh, 'zombie', ref, true);
    if (fresh) adoptedNow++;
    return c ? makeRec(z, c, { pooled: true, zombie: z }) : null;
  }

  function emit(rec, name, data, out) {
    const ev = { key: rec.key, name, data: data || null };
    (out || later).push(ev);
    if (onEvent) onEvent(rec.key, name, data || null);
  }

  // A corpse lying on the ground: what gives up its slot when the pool is full. Never one still in the
  // air (it would hang there), never one that is down but alive (sleep() stands it straight back up).
  function lyingCorpse(r) {
    const b = r.body;
    if (!r.pooled || r.frozen || b.state !== 'dead' || b.sleeping || r.queue.length) return false;
    const p = b.points().pelvis;
    return !!p && p[1] - planeY(r.c.plane, p[0], p[2]) < r.preset.down.height;
  }
  function freezeRec(rec, why, out) {
    if (rec.frozen) return;
    if (!rec.body.sleeping) rec.body.sleep();
    rec.frozen = true;
    if (why) emit(rec, why, null, out);
  }
  // A slot for this body: it already has one, there is a free one, or the longest-dead corpse on the
  // ground gives its up (frozen where it lies). Held for the hit until update() flushes it.
  function canTake(rec) {
    if (!rec.pooled) return true;
    const b = rec.body;
    if (rec.reserved || (b.state !== 'animated' && !b.sleeping)) return true;
    if (pool.active >= max) {
      let victim = null;
      for (const r of recs.values()) if (lyingCorpse(r) && (!victim || r.deadAt < victim.deadAt)) victim = r;
      if (!victim) { refused++; return false; }
      freezeRec(victim, 'frozen');
    }
    if (!pool.take(b)) { refused++; return false; }
    rec.reserved = true;
    return true;
  }

  const unit = (d) => { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
  // Two hits of one shot become one: the powers add, the direction and the point are their average by power.
  function merge(a, b) {
    const pa = a.power, pb = b.power, pt = pa + pb || 1;
    const da = unit(a.dir), db = unit(b.dir);
    a.dir = [0, 1, 2].map((i) => (da[i] * pa + db[i] * pb) / pt);
    if (Array.isArray(a.at) && Array.isArray(b.at)) a.at = a.at.map((v, i) => (v * pa + b.at[i] * pb) / pt);
    a.power = pa + pb; a.n += b.n;
  }
  function enqueue(rec, h, kill) {
    const e = {
      kind: h.kind || 'bullet', power: Number.isFinite(h.power) ? Math.max(0, h.power) : 3,
      at: h.at ?? 'chest', dir: Array.isArray(h.dir) ? h.dir.slice(0, 3) : [0, 0, 1], shot: h.shot ?? null, kill, n: 1
    };
    if (e.shot !== null) {
      const i = rec.queue.findIndex((o) => o.shot === e.shot && !o.kill);
      if (i >= 0 && !kill) { merge(rec.queue[i], e); return; }
      // The killing pellet takes the rest of its shell with it: the corpse is thrown by all of it.
      if (i >= 0 && kill) { const [q] = rec.queue.splice(i, 1); merge(e, q); e.kind = h.kind || q.kind; }
    }
    rec.queue.push(e);
  }

  // The host posed these joints' height but never their place across the ground (the game sets
  // hips.position.y and nothing else), so what the body last wrote there would read as the animation.
  // A joint still exactly as the body wrote it wasn't posed at all: the engine puts that one back itself.
  function fixPosJoints(rec) {
    for (const pj of rec.c.posJ) {
      const p = pj.j.position;
      if (pj.w && p.equals(pj.w)) continue;
      p.x = pj.x; p.z = pj.z;
    }
  }
  function notePosJoints(rec) {
    const on = rec.body.weight > 0;
    for (const pj of rec.c.posJ) { if (on) (pj.w || (pj.w = new THREE.Vector3())).copy(pj.j.position); else pj.w = null; }
  }

  // Contract 3: the parts the game has shot off stop simulating (only with an engine that has lose()).
  function loseParts(rec) {
    const b = rec.body, pl = rec.zombie && rec.zombie.partsLost;
    if (!pl || typeof b.lose !== 'function') return;
    for (const k of HORDE_PARTS) {
      if (!pl[k] || rec.lost.has(k)) continue;
      rec.lost.add(k); rec.c.lostAny = true;
      b.lose(k);
    }
  }

  function clipFor(ref, s) {
    const key = `${ref}@${s.toFixed(3)}`;
    if (clipCache.has(key)) return clipCache.get(key);
    const json = clipsFn ? clipsFn(ref) : null;
    let clip = null;
    if (json) { try { clip = loadClip(scaleClipJson(json, s)); } catch (_) { clip = null; } }
    clipCache.set(key, clip);
    return clip;
  }
  // The world yaw `heading`, as the group's own yaw under whatever it hangs from (the marine hangs
  // off the player, who turns with the aim).
  function faceHeading(g, heading) {
    let py = 0;
    if (g.parent) {
      g.parent.updateWorldMatrix(true, false);
      g.parent.matrixWorld.decompose(_p, _q, _s);
      py = _e.setFromQuaternion(_q, 'YXZ').y;
    }
    g.rotation.y = heading - py;
    g.updateWorldMatrix(false, true);
  }
  // Contract 1: a body getting up says which way it lies and which way to face; a preset that names a
  // clip for that side gets it, played from its start on the adopted rig, lined up with the body.
  function startGetup(rec, data) {
    if (!data || (data.side !== 'front' && data.side !== 'back') || !Number.isFinite(data.heading)) return;
    const ref = rec.preset.getup && rec.preset.getup[data.side];
    if (typeof ref !== 'string') return;
    const clip = clipFor(ref, rec.c.s);
    if (!clip) return;
    const g = rec.group;
    if (rec.keepYaw && rec.yaw0 === null) rec.yaw0 = g.rotation.y;
    rec.heading = data.heading;
    faceHeading(g, data.heading);
    rec.snap = rec.c.joints.map((j) => [j, j.quaternion.clone(), j.position.clone()]);
    const player = rec.c.player || (rec.c.player = createPlayer(rec.inst));
    player.play(clip, { loop: false });
    rec.clip = { player, ref };
  }
  // Back to the pose it had before the clip, for the host to animate from; the marine's group faces
  // the way it did (the zombie's AI turns its own).
  function stopGetup(rec) {
    if (!rec.clip) return;
    for (const [j, q, p] of rec.snap) { j.quaternion.copy(q); j.position.copy(p); }
    if (rec.keepYaw && rec.yaw0 !== null) { rec.group.rotation.y = rec.yaw0; rec.yaw0 = null; }
    rec.group.updateWorldMatrix(false, true);
    rec.clip = null; rec.snap = null;
  }

  function takeDrift(rec, dx, dz) {
    const g = rec.group;
    if (rec.move) rec.move(dx, dz);
    else if (moveFn) moveFn(rec.key, dx, dz, g);
    else { g.position.x += dx; g.position.z += dz; }
    g.updateWorldMatrix(true, false);
  }

  function stepRec(rec, dt, out) {
    const b = rec.body, c = rec.c, g = rec.group;
    g.updateWorldMatrix(true, false);
    _v.setFromMatrixPosition(g.matrixWorld);
    samplePlane(c.plane, rec.ground, _v.x, _v.y, _v.z);
    const lod = lodFor ? Math.max(0, Math.min(2, lodFor(_v.x, _v.z) | 0)) : 0;
    lodN[lod]++;
    // Asleep until now: it starts from where the animation has it this frame, not moving (its last
    // reading could be seconds old). reset() hands back the slot canTake() held; hit() takes it again.
    if (b.state === 'animated') b.reset();
    if (rec.clip) {
      if (rec.keepYaw) faceHeading(g, rec.heading);
      rec.clip.player.update(dt);
    } else fixPosJoints(rec);
    // Far bodies' joints don't update their own matrices (the game's render LOD): read them fresh.
    if (c.joints.length && c.joints[0].matrixAutoUpdate === false) for (const j of c.joints) j.updateMatrix();
    b.follow();
    loseParts(rec);
    while (rec.queue.length) {
      const e = rec.queue.shift();
      const hit = { at: e.at, dir: e.dir, power: e.power, kind: e.kind };
      if (e.kill) b.kill(hit); else b.hit(hit);
    }
    rec.reserved = false;
    for (const [name, data] of b.update(dt, { lod })) {
      emit(rec, name, data, out);
      if (name === 'getup') startGetup(rec, data);
      else if (name === 'settled') rec.frozen = true;
    }
    if (rec.clip && b.state !== 'getup') stopGetup(rec);
    // Where the reaction moved it, taken on before it is drawn, so the body is drawn where it is.
    if (b.state !== 'animated' && !b.sleeping && (b.drift.x || b.drift.z)) takeDrift(rec, b.drift.x, b.drift.z);
    // What the animation left on the joints the body writes, for beginFrame() to hand back.
    for (const e of c.anim) { e[1].copy(e[0].quaternion); e[2].copy(e[0].position); }
    b.apply();
    rec.applied = true;
    rec.wrote = b.weight > 0;
    notePosJoints(rec);
  }

  // The animated pose back on every joint a body wrote last frame, before the host animates again. A
  // host that sets only some of a joint's Euler angles (the game sets a leg's swing, never its twist,
  // and the marine's hips' roll and yaw, never their pitch) otherwise sets them on top of the reaction:
  // the reaction becomes part of what the body reads as the animation, and feeds on itself (the marine
  // knocked flat by a brute flew up metres, frame on frame). A corpse lying still keeps its pose.
  function unapply(rec) {
    if (!rec.wrote) return;
    rec.wrote = false;
    if (rec.frozen) return;
    for (const [j, q, p] of rec.c.anim) { j.quaternion.copy(q); j.position.copy(p); }
  }

  function releaseRec(rec) {
    if (rec.clip) stopGetup(rec);
    unapply(rec);
    const b = rec.body;
    // follow() puts back the animated pose on any joint the host hasn't posed since the last apply().
    if (rec.applied) b.follow();
    b.reset();
    for (const pj of rec.c.posJ) { pj.j.position.x = pj.x; pj.j.position.z = pj.z; pj.w = null; }
    if (rec.c.rec === rec) rec.c.rec = null;
    recs.delete(rec.key);
  }

  Object.assign(self, {
    hit(key, h = {}) {
      const rec = recs.get(key) || attachZombie(key);
      if (!rec || rec.frozen || rec.killed) return false;
      if (rec.zombie && rec.zombie.crawling) return false;
      if (!HIT_KINDS.includes(h.kind || 'bullet')) return false;
      if (!canTake(rec)) return false;
      enqueue(rec, h, false);
      return true;
    },
    kill(key, h = {}) {
      const rec = recs.get(key) || attachZombie(key);
      if (!rec || rec.frozen) return false;
      if (rec.killed) return true;
      if (rec.zombie && rec.zombie.crawling) return false;
      if (!HIT_KINDS.includes(h.kind || 'bullet')) return false;
      if (!canTake(rec)) return false;
      enqueue(rec, h, true);
      rec.killed = true; rec.deadAt = frame;
      return true;
    },
    adopt(key, o = {}) {
      if (recs.has(key)) return true;
      if (!o.group || !o.rig || !o.preset) return false;
      const c = bodyFor(o.group, o.rig, o.preset, false);
      if (!c) return false;
      makeRec(key, c, { pooled: false, move: o.move, ground: o.ground });
      return true;
    },
    update(dt) {
      const t0 = now();
      frame++;
      adoptedNow = 0;
      const out = later.splice(0);
      lodN.fill(0);
      let awake = 0;
      for (const rec of recs.values()) {
        if (rec.frozen) continue;
        const b = rec.body;
        if (!rec.queue.length && (b.state === 'animated' || b.sleeping)) continue;
        awake++;
        stepRec(rec, dt, out);
      }
      lastAwake = awake;
      lastMs = now() - t0;
      avgMs += (lastMs - avgMs) * 0.1;
      return out;
    },
    // Call at the start of each frame, before the host animates its bodies (see unapply).
    beginFrame() { for (const r of recs.values()) unapply(r); },
    busy(key) { const r = recs.get(key); return !!r && !r.frozen && BUSY.has(r.body.state); },
    state(key) { const r = recs.get(key); return r ? r.body.state : null; },
    has(key) { return recs.has(key); },
    frozen(key) { const r = recs.get(key); return !!r && r.frozen; },
    body(key) { const r = recs.get(key); return r ? r.body : null; },
    // Stop simulating it and leave it as it lies (a corpse sinking away).
    freeze(key) { const r = recs.get(key); if (r) freezeRec(r); },
    release(key) { const r = recs.get(key); if (r) releaseRec(r); },
    releaseAll() { for (const r of [...recs.values()]) releaseRec(r); later.length = 0; }
  });
  // (A getter, defined on its own: Object.assign would copy what it returned once, not the getter.)
  Object.defineProperty(self, 'stats', {
    enumerable: true,
    get() {
      let active = pool.active;
      for (const r of recs.values()) if (!r.pooled && !r.frozen && r.body.state !== 'animated' && !r.body.sleeping) active++;
      return { attached: recs.size, active, awake: lastAwake, ms: lastMs, msAvg: avgMs, lod: lodN.slice(), refused, max };
    }
  });
  return self;
}
