// studio/motion-battery.js — the standard battery of hits, as numbers (D-42). Claude's (studio/*).
//
// Agents can't watch a reaction, but they can read what it did. The battery is the motion lab's seven
// weapons, each from the front, the back and the side, played on a fresh body standing on its idle
// clip the way the lab stands it. Each run says what came of the hit (none, flinch, stagger, down or
// dead), how many steps it took, how long until it was itself again, how far the chest went, where the
// body ended up and how low it got. The same numbers every time: nothing here is random, so a change
// to a preset shows up as a change in the report and nothing else does.
//
//   runBattery('zombie/shambler')                                   every hit, from every side
//   runBattery(json, { hits: ['shotgun-close'], from: ['front'] })  a preset object, some of it
//   runHit(preset, { kind: 'pellet', power: 4.2, at: 'chest', from: 'back' })   one custom hit
//   sweep(preset, { kinds: ['pellet'] })                            the powers where the outcome changes
//   classify(events)                                                'none' | 'flinch' | 'stagger' | 'down' | 'dead'
//
// The node CLI on top of this is studio/motion-report.mjs; expectations are studio/motion-expect.js.
import * as THREE from 'three';
import { rigs } from './rigs.js';
import { loadClip, createPlayer } from './clip.js';
import { loadMotion, HIT_KINDS, createBody } from './motion.js';
import { presets } from './motion/index.js';
import zombieIdle from './clips/zombie/idle.json' with { type: 'json' };
import marineStand from './clips/marine/stand.json' with { type: 'json' };

// The lab's weapons (studio/motion-lab.html), by name. Power is metres per second at the point hit
// (docs/studio.md §10). The grenade lifts as the lab's does: half a metre up for each one along.
export const BATTERY = [
  { name: 'rifle', label: 'Rifle round', kind: 'bullet', power: 2.5, at: 'chest' },
  { name: 'shotgun-far', label: 'Shotgun, 6 m', kind: 'pellet', power: 3.2, at: 'chest' },
  { name: 'shotgun-close', label: 'Shotgun, close', kind: 'pellet', power: 6.5, at: 'chest' },
  { name: 'machete', label: 'Machete', kind: 'blade', power: 3.5, at: 'chest' },
  { name: 'brute-swing', label: "Brute's swing", kind: 'crush', power: 4.5, at: 'shoulderR' },
  { name: 'grenade', label: 'Grenade', kind: 'blast', power: 8, at: 'pelvis', up: 0.5 },
  { name: 'kill', label: 'Killing shot', kind: 'bullet', power: 3, at: 'head', kill: true }
];
export const BATTERY_NAMES = BATTERY.map((b) => b.name);

// Where a hit comes from, in the body's own frame (it faces +Z; its "R" points are on its +X side).
// The push is the way the hit travels: from the front it pushes the body back.
export const FROM = { front: [0, 0, -1], back: [0, 0, 1], side: [-1, 0, 0] };
export const SIDES = Object.keys(FROM);

// From least to most: nothing, a jolt it shrugs off, a step to keep its feet, a fall, dead.
export const OUTCOMES = ['none', 'flinch', 'stagger', 'down', 'dead'];

// The game's zombie sizes (index.html ZOMBIE_TYPES scale). A preset named after a type is played on
// that type's build at that size; crew: keep these in step with the game.
export const ZOMBIE_SCALES = { shambler: 1, feral: 0.88, leaper: 0.92, drowned: 0.98, military: 1.08, brute: 1.38, spitter: 1.05, screamer: 0.96, bomber: 1.1 };
// What each rig stands on while it waits to be hit: the clips the lab plays.
export const STANDS = { zombie: 'zombie/idle', marine: 'marine/stand' };
const BUILT_IN = { 'zombie/idle': zombieIdle, 'marine/stand': marineStand };

const r3 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? v : Math.round(v * 1000) / 1000);
const nameOf = (e) => (typeof e === 'string' ? e : Array.isArray(e) ? e.find((x) => typeof x === 'string') : e && e.name);

// What a hit did, from the events alone. flinch: it woke and kept its feet without a step (a run
// also says whether it recovered in time); stagger: it stepped and kept its feet; down: it fell;
// dead: it was killed. none: it never woke (a full pool refused it, or nothing hit it). Takes the
// body's own events (['step', {...}]), a run's timed ones ([t, 'step', {...}]) or plain names.
export function classify(events) {
  const seen = new Set((events || []).map(nameOf));
  if (seen.has('dead')) return 'dead';
  if (seen.has('fall') || seen.has('down')) return 'down';
  if (seen.has('stagger') || seen.has('step')) return 'stagger';
  if (seen.has('wake') || seen.has('hit') || seen.has('recovered')) return 'flinch';
  return 'none';
}

// A preset by "rig/name" (the list in studio/motion/index.js), or the JSON itself.
export function resolvePreset(ref) {
  if (ref && typeof ref === 'object') return ref.source && ref.format ? ref.source : ref;
  const json = presets.json(ref);
  if (!json) throw new Error(`no motion preset "${ref}" (there are ${presets.names().join(', ')}); pass the preset's JSON to run one that isn't listed`);
  return json;
}
export const presetRef = (json) => `${json.rig}/${json.name}`;

// How a preset's body is built and stood: the zombie type and size its name says (or opts.create),
// its idle clip, and how far up it stands so its boots are on the floor as in the lab.
export function stanceFor(json, opts = {}) {
  const create = { ...(opts.create || {}) };
  if (json.rig === 'zombie' && create.type === undefined) create.type = ZOMBIE_SCALES[json.name] !== undefined ? json.name : 'shambler';
  if (json.rig === 'zombie' && create.scale === undefined) create.scale = ZOMBIE_SCALES[create.type] ?? 1;
  const clip = opts.stand === null ? null : opts.stand || STANDS[json.rig] || null;
  return { rig: json.rig, create, clip };
}

// Where a battery entry (or a custom hit) lands and which way it pushes.
function hitSpec(entry) {
  const base = typeof entry === 'string' ? BATTERY.find((b) => b.name === entry) : entry.hit ? BATTERY.find((b) => b.name === entry.hit) : null;
  if ((typeof entry === 'string' || entry.hit) && !base) throw new Error(`"${typeof entry === 'string' ? entry : entry.hit}" is not a battery hit (${BATTERY_NAMES.join(', ')})`);
  const e = { ...(base || {}), ...(typeof entry === 'string' ? {} : entry) };
  const from = e.from || 'front';
  if (!FROM[from]) throw new Error(`"from" is one of ${SIDES.join(', ')} (got ${JSON.stringify(from)})`);
  if (!HIT_KINDS.includes(e.kind)) throw new Error(`hit kind "${e.kind}": kinds are ${HIT_KINDS.join(', ')}`);
  if (!(Number.isFinite(e.power) && e.power >= 0)) throw new Error(`hit power must be a number from 0 (m/s at the point hit; got ${JSON.stringify(e.power)})`);
  const d = FROM[from];
  return {
    hit: e.name || e.hit || null, from, kind: e.kind, power: e.power, at: e.at || 'chest', kill: !!e.kill,
    dir: [d[0], d[1] + (e.up || 0), d[2]]
  };
}

// The clip a rig plays: the built-in stand clips, or the host's own loader (Node reads files; a page
// fetches them first). Returns a loaded clip, or null when there's no such clip to be had.
function clipGetter(opts) {
  const cache = new Map();
  return (ref) => {
    if (!ref) return null;
    if (cache.has(ref)) return cache.get(ref);
    let json = null;
    try { json = (opts.clipOf && opts.clipOf(ref)) || null; } catch { json = null; }
    json ||= BUILT_IN[ref] || null;
    const clip = json ? loadClip(json) : null;
    cache.set(ref, clip);
    return clip;
  };
}

const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
const alongPush = (dir, dx, dz) => { const L = Math.hypot(dir[0], dir[2]) || 1; return (dx * dir[0] + dz * dir[2]) / L; };

// One hit on a fresh body. The host loop is the scenes' (studio/scene.js): pose the clip, follow,
// hit, update, apply, then take on the body's drift so the body stays where the reaction put it.
// The get-up (contract: ['getup', { side, heading }]) turns the rig and plays the preset's get-up
// clip when there is one and the host can load it; otherwise the body gets up its own way.
function play(json, preset, stance, spec, opts, clipOf) {
  const dt = opts.dt ?? 1 / 60, lead = opts.lead ?? 0.5, window = opts.window ?? 8, lod = opts.lod ?? 0;
  const inst = rigs.get(stance.rig).create(stance.create);
  const def = inst.def.body;
  const names = Object.keys(def.points), feet = new Set(def.feet || []);
  const pts = names.map((k) => ({ k, j: inst.R[def.points[k].joint], at: new THREE.Vector3(...(def.points[k].at || [0, 0, 0])), foot: feet.has(k) }));
  const shown = (p) => _v.copy(p.at).applyMatrix4(p.j.matrixWorld);
  const player = createPlayer(inst);
  const stand = clipOf(stance.clip);
  if (stand) player.play(stand, { loop: true });
  player.update(0);
  // Boots on the floor: the game stands a zombie 0.2 m into the ground; the lab lifts it out, and so
  // does the battery, so heights read from the floor.
  inst.group.updateWorldMatrix(true, true);
  let footY = Infinity;
  for (const p of pts) if (p.foot) footY = Math.min(footY, shown(p).y);
  inst.group.position.y = Number.isFinite(footY) && footY < 0 ? -footY : 0;
  inst.group.updateWorldMatrix(true, true);
  const body = createBody(inst, preset, { ground: () => 0 });
  const getup = (json.getup && typeof json.getup === 'object') ? json.getup : {};
  const chestP = pts.find((p) => p.k === 'chest') || pts[0], pelvisP = pts.find((p) => p.k === (def.root || 'pelvis')) || pts[0];

  const hitF = Math.round(lead / dt), lastF = hitF + Math.round(window / dt);
  const events = [], times = {};
  let chest0 = null, pelvis0 = null, chest = 0, drop = 0, low = { point: null, y: Infinity }, off = 0, bad = false, overClip = null, stop = null;
  let fell = null, lying = false;
  // Coming back: how smoothly the body is handed back to its animation, from the get-up (or, standing,
  // the blend back) until `tail` seconds after it recovered. World turns, so the host turning the rig
  // to the get-up's heading doesn't count; a body that pops shows as one big turn.
  const joints = Object.entries(inst.R).filter(([, j]) => j && j.isObject3D);
  const prevQ = new Map(), snap = { rad: 0, joint: null, at: null, swing: null };
  // A limb's own direction (its aim points), to tell a limb swinging fast from one rolling about its
  // length: a roll is the animation's twist jumping under a simulated limb, and shows as a flip.
  const aimOf = new Map(def.segments.filter((sg) => sg.aim).map((sg) => [sg.joint, sg.aim.map((k) => pts.find((p) => p.k === k))]));
  const prevDir = new Map();
  const dirOf = (jn) => { const ab = aimOf.get(jn); if (!ab) return null; const a = shown(ab[0]).clone(); return shown(ab[1]).clone().sub(a).normalize(); };
  const tailF = opts.until ? 0 : Math.round((opts.tail ?? 0.25) / dt);
  let back = false, endF = Infinity;
  // Which way it lies: its chest from its hips, over the ground, along the push. More than 0, it went
  // down the way it was hit (on its back from a shot in the chest, on its face from one in the back).
  const lie = () => { const c = shown(chestP).clone(), h = shown(pelvisP); return alongPush(spec.dir, c.x - h.x, c.z - h.z); };
  body.follow();
  for (const part of opts.lose || []) {
    if (typeof body.lose !== 'function') throw new Error(`this engine has no body.lose (lost limbs, contract 3), so the battery can't take off "${part}"`);
    body.lose(part);
  }
  for (let f = 0; f <= lastF; f++) {
    player.update(dt);
    if (overClip && player.done) { player.crossfade(stand, 0.3, { loop: true }); overClip = null; }
    body.follow();
    if (f === hitF) {
      chest0 = shown(chestP).clone(); pelvis0 = shown(pelvisP).clone();
      const h = { at: spec.at, dir: spec.dir, power: spec.power, kind: spec.kind };
      if (spec.kill) body.kill(h); else body.hit(h);
    }
    const t = r3((f - hitF + 1) * dt);
    for (const e of body.update(dt, { lod })) {
      const [name, data] = e;
      events.push(data ? [t, name, data] : [t, name]);
      if (times[name] === undefined) times[name] = t;
      if (name === 'getup' && data && typeof data.heading === 'number' && typeof getup[data.side] === 'string') {
        const clip = clipOf(getup[data.side]);
        if (clip) {
          inst.group.rotation.y = data.heading;
          player.play(clip, { loop: false, speed: clip.length / Math.max(0.05, preset.getup.time) });
          overClip = clip;
        }
      }
      if ((name === 'fall' || name === 'dead') && overClip) { player.crossfade(stand, 0.3, { loop: true }); overClip = null; }
      if (name === 'down') lying = true;
      if (name === 'recovered') endF = f + tailF;
      if (name === 'settled' || (opts.until && opts.until(name))) stop = name;
    }
    if (!back && f >= hitF && (body.state === 'getup' || body.recovering > 0 || times.recovered !== undefined)) back = true;
    body.apply();
    if (f >= hitF) {
      inst.group.updateWorldMatrix(true, true);
      const c = shown(chestP);
      chest = Math.max(chest, c.distanceTo(chest0));
      drop = Math.max(drop, chest0.y - c.y);
      for (const p of pts) {
        const y = shown(p).y;
        if (!Number.isFinite(y)) bad = true;
        else if (!p.foot && y < low.y) low = { point: p.k, y };
      }
      if (body.offBalance > off) off = body.offBalance;
      if (lying && fell === null) fell = lie();
      for (const [jn, j] of joints) {
        j.matrixWorld.decompose(_p, _q, _s);
        const q0 = prevQ.get(j), d = dirOf(jn), d0 = prevDir.get(jn);
        if (q0 && back) {
          const a = 2 * Math.acos(Math.min(1, Math.abs(q0.dot(_q)))) * (1 / 60) / dt;
          if (a > snap.rad) {
            snap.rad = a; snap.joint = jn; snap.at = t;
            snap.swing = d && d0 ? Math.acos(Math.max(-1, Math.min(1, d.dot(d0)))) * (1 / 60) / dt : null;
          }
        }
        (q0 ? q0.copy(_q) : prevQ.set(j, _q.clone()));
        if (d) prevDir.set(jn, d);
      }
    }
    if (body.awake && !body.sleeping) { inst.group.position.x += body.drift.x; inst.group.position.z += body.drift.z; }
    if (stop || f >= endF) break;
  }
  inst.group.updateWorldMatrix(true, true);
  const outcome = classify(events);
  if (fell === null && (outcome === 'dead' || outcome === 'down')) fell = lie();
  const end = shown(pelvisP);
  const recovered = times.recovered !== undefined;
  return {
    hit: spec.hit, from: spec.from, kind: spec.kind, power: spec.power, at: spec.at, kill: spec.kill,
    outcome, recovered, settled: times.settled !== undefined,
    steps: events.filter((e) => e[1] === 'step').length,
    time: outcome === 'dead' ? (times.settled ?? null) : (times.recovered ?? null),
    chest: r3(chest), drop: r3(drop),
    moved: pelvis0 ? r3(Math.hypot(end.x - pelvis0.x, end.z - pelvis0.z)) : 0,
    // The same, along the way the hit pushed: more than 0 went with the hit, less than 0 came back
    // against it (hips that slide back as the knees fold forward).
    along: pelvis0 ? r3(alongPush(spec.dir, end.x - pelvis0.x, end.z - pelvis0.z)) : 0,
    fell: fell === null ? null : r3(fell),
    lowest: { point: low.point, y: r3(low.y) },
    offBalance: r3(off),
    // The biggest one-frame turn of a joint (rad at 60 fps) while it came back; over 0.3 is a snap
    // (the t79 rule). swing is how far that limb's own direction turned in the same frame: much less
    // than rad means it rolled about its length. null if it never came back (dead, or still down).
    snap: back ? { rad: r3(snap.rad), joint: snap.joint, at: snap.at, swing: snap.swing === null ? null : r3(snap.swing) } : null,
    bad, events, times
  };
}

function prepare(ref, opts) {
  const json = resolvePreset(ref);
  const preset = loadMotion(json);
  const stance = stanceFor(json, opts);
  if (!rigs.def(stance.rig) || !rigs.def(stance.rig).body) throw new Error(`rig "${stance.rig}" has no "body" in studio/rigs.js, so it can't be hit`);
  return { json, preset, stance, clipOf: clipGetter(opts) };
}

// One hit: a battery name ('grenade'), { hit: 'grenade', from: 'back' }, or a custom
// { kind, power, at, from, up, kill }. opts: dt (1/60), lead (0.5 s standing first), window (8 s
// after the hit at most), lod (0, 1, 2), lose (['armL', ...]), create ({ type, scale }), stand (a clip,
// or null for the rest pose), clipOf (ref => clip JSON, for get-up clips), until (event name => stop).
export function runHit(ref, entry, opts = {}) {
  const { json, preset, stance, clipOf } = prepare(ref, opts);
  return play(json, preset, stance, hitSpec(entry), opts, clipOf);
}

// The battery: opts.hits (names; all seven by default) from opts.from (front, back and side by
// default), or opts.entries ([{ hit, from }], exactly those). Returns the preset's name and version,
// how its body was built, and a run for each entry in order.
export function runBattery(ref, opts = {}) {
  const { json, preset, stance, clipOf } = prepare(ref, opts);
  let entries = opts.entries;
  if (!entries) {
    const hits = opts.hits || BATTERY_NAMES, from = opts.from || SIDES;
    entries = hits.flatMap((h) => from.map((s) => ({ hit: h, from: s })));
  }
  const runs = entries.map((e) => play(json, preset, stance, hitSpec(e), opts, clipOf));
  return { preset: presetRef(json), version: json.version || 1, rig: json.rig, build: stance.create, stand: stance.clip, lod: opts.lod ?? 0, runs };
}

// The battery entry each kind is swept with: its point and its lift.
export const SWEPT = Object.fromEntries(HIT_KINDS.map((k) => [k, BATTERY.find((b) => b.kind === k && !b.kill)]));

// For each kind, the powers where the outcome changes, found by stepping up the power and then
// halving the gap at each change: e.g. pellet: flinch, stagger from 2.94, down from 5.23. Past its
// knockdown a hit always drops the body, so the search stops there. opts: kinds (all), from
// ('front'), max (24 m/s), step (0.5), tol (0.02), and runHit's options.
export function sweep(ref, opts = {}) {
  const { json, preset, stance, clipOf } = prepare(ref, opts);
  const kinds = opts.kinds || HIT_KINDS, from = opts.from || 'front';
  const max = opts.max ?? 24, step = opts.step ?? 0.5, tol = opts.tol ?? 0.02;
  // A sweep only needs the outcome: stop at the fall, and don't wait out a long get-up.
  const fast = { ...opts, until: (n) => n === 'fall' || n === 'dead' };
  const out = [];
  for (const kind of kinds) {
    const b = SWEPT[kind];
    if (!b) throw new Error(`hit kind "${kind}": kinds are ${HIT_KINDS.join(', ')}`);
    const at = (power) => play(json, preset, stance, hitSpec({ kind, power, at: b.at, up: b.up, from }), fast, clipOf).outcome;
    const h = preset.hits[kind];
    const drops = h.scale > 0 ? h.knockdown * preset.mass / h.scale : Infinity;   // the power that always drops it
    const top = Math.min(max, drops);
    // Steps up to the top, and the top itself (the knockdown power, when it's under the max).
    const points = [];
    for (let k = 1; k * step < top - 1e-9; k++) points.push(k * step);
    points.push(top);
    const bands = [];
    let lo = 0, prev = at(0);
    bands.push({ outcome: prev, from: 0 });
    for (const p of points) {
      const o = at(p);
      if (o !== prev) {
        // Halve the gap until it is within tol: the change lies between a and c.
        let a = lo, c = p;
        while (c - a > tol) { const m = (a + c) / 2; if (at(m) === prev) a = m; else c = m; }
        bands.push({ outcome: o, from: r3(c) });
        prev = o;
      }
      lo = p;
    }
    const order = bands.map((x) => OUTCOMES.indexOf(x.outcome));
    out.push({
      kind, at: b.at, from, max: r3(top), knockdown: r3(drops), bands,
      // Each change should be to something worse. One that goes back (down, then stagger at more
      // power) means the preset is balanced on an edge there: worth a look.
      monotone: order.every((o, i) => i === 0 || o > order[i - 1])
    });
  }
  return { preset: presetRef(json), version: json.version || 1, rig: json.rig, build: stance.create, sweeps: out };
}

// What a sweep says about one power: the outcome there, and how far it is from the changes either
// side. For a shambler's shotgun at 6 m: stagger, 0.26 m/s over the flinch below it and 2.03 under
// the fall above it. That's how far a preset is from changing what a battery hit does.
export function marginAt(sw, power) {
  let i = 0;
  while (i + 1 < sw.bands.length && sw.bands[i + 1].from <= power) i++;
  const lower = i > 0 ? { outcome: sw.bands[i - 1].outcome, at: sw.bands[i].from, by: r3(power - sw.bands[i].from) } : null;
  const up = sw.bands[i + 1];
  const upper = up ? { outcome: up.outcome, at: up.from, by: r3(up.from - power) } : null;
  return { outcome: sw.bands[i].outcome, lower, upper };
}
