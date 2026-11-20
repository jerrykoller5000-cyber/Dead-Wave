// J154 Zombie Pass 4 stage A (Claude 5, ZP4 design approved 15 Nov, Claude outputs/ZP4/design.md): the reaction layer.
// Per zombie, a small set of damped angular springs on the shared rig's bones (hips, torso, head, each upper arm and
// forearm, each thigh and shin, the jaw where there is one), ADDED on top of whatever pose the gait and the per-kind
// modules wrote this frame. It never sets a pose outright, so a hit shows through any attack, idle or walk without those
// modules knowing. Fed by events (reactHit / reactShove / reactState, stage B's tables in game/zombie-clips.js); with no
// events it adds exactly nothing (the springs sleep and the bones are not touched).
//
// Call order (one call, Claude 2's index.html loan after CB-336 stage 2): after the per-kind modules have posed the
// zombie and BEFORE applyZombieFeet / applyZombieLean, so the feet still land: stepReact(z, dt).
// Pure: no THREE, no DOM; bones are anything with rotation {x,y,z} (and position {y} for the hips' dip).

// The channels: a bone (by its userData name on the zombie's mesh), an axis, and the anatomy bound of what the layer may
// ADD there (radians; rule 25 for the player has no zombie table yet: these keep every added bend inside what a body does,
// and the pose underneath keeps its own). Signs (the rig faces its +z, +x is his LEFT): +x on the torso and head folds /
// nods forward (makeZombieMesh's hunch, applyZombieLean); +x on a hanging arm, leg or shin swings it back (the shin: the
// knee bends); +z on the torso leans him to his right; +y turns his left shoulder back.
// J159 (Claude 5, 17 Nov): the rig's 'L' groups sit at -x (his RIGHT; the names are mirrored). An arm channel's sense is OUT,
// away from its own side; its sign turns that onto the bone's z (the old tables crossed the arms in).
export const REACT_CHANNELS = Object.freeze([
  { id: 'hipsX', bone: 'hips', ax: 'x', min: -0.30, max: 0.35 },
  { id: 'hipsY', bone: 'hips', ax: 'y', min: -0.35, max: 0.35 },
  { id: 'hipsZ', bone: 'hips', ax: 'z', min: -0.22, max: 0.22 },
  { id: 'hipsDrop', bone: 'hips', ax: 'py', min: -0.16, max: 0.02 },   // metres (scaled by the zombie's size): a knee buckle sinks the hips
  { id: 'torsoX', bone: 'torso', ax: 'x', min: -0.55, max: 0.75 },
  { id: 'torsoY', bone: 'torso', ax: 'y', min: -0.60, max: 0.60 },
  { id: 'torsoZ', bone: 'torso', ax: 'z', min: -0.40, max: 0.40 },
  { id: 'headX', bone: 'head', ax: 'x', min: -0.70, max: 0.55 },
  { id: 'headY', bone: 'head', ax: 'y', min: -0.80, max: 0.80 },
  { id: 'headZ', bone: 'head', ax: 'z', min: -0.45, max: 0.45 },
  { id: 'armLX', bone: 'armLG', ax: 'x', min: -1.30, max: 1.10 },
  { id: 'armLZ', bone: 'armLG', ax: 'z', min: -0.30, max: 1.20, sign: -1 },   // + out (J159: armLG sits at -x, so out is its -z; the kicks crossed the arms in)
  { id: 'armRX', bone: 'armRG', ax: 'x', min: -1.30, max: 1.10 },
  { id: 'armRZ', bone: 'armRG', ax: 'z', min: -1.20, max: 0.30, sign: -1 },   // - out (armRG at +x: out is its +z)
  { id: 'elbowLX', bone: 'armLG.elbowG', ax: 'x', min: -0.90, max: 0.05 },   // the elbow bends one way (more negative = more bent: the forearm forward)
  { id: 'elbowRX', bone: 'armRG.elbowG', ax: 'x', min: -0.90, max: 0.05 },
  { id: 'legLX', bone: 'legLG', ax: 'x', min: -0.55, max: 0.45 },
  { id: 'legRX', bone: 'legRG', ax: 'x', min: -0.55, max: 0.45 },
  { id: 'shinLX', bone: 'legLG.shinG', ax: 'x', min: 0, max: 0.90 },   // the knee bends one way only
  { id: 'shinRX', bone: 'legRG.shinG', ax: 'x', min: 0, max: 0.90 },
  { id: 'jawX', bone: 'jaw', ax: 'x', min: 0, max: 0.45 },
]);
const NCH = REACT_CHANNELS.length;
export const CH = Object.freeze(Object.fromEntries(REACT_CHANNELS.map((c, i) => [c.id, i])));

// Spring tunings by body region: f (Hz) the natural frequency, zeta the damping ratio (under 1: a little overshoot, the
// follow-through; the limbs looser than the core, so the arms come back late).
export const REACT_SPRINGS = Object.freeze({
  // ZP4 (b), Director 16 Nov: core/head were 2.6/3.2 Hz, which read as a flicker at 8 m (fold peak .05, gone by .16)
  core: { f: 1.8, zeta: 0.55 }, head: { f: 2.2, zeta: 0.42 }, arm: { f: 1.9, zeta: 0.32 }, fore: { f: 2.2, zeta: 0.30 },
  leg: { f: 2.8, zeta: 0.60 }, jaw: { f: 3.6, zeta: 0.35 },
});
const REGION = REACT_CHANNELS.map((c) => (c.bone === 'hips' || c.bone === 'torso' ? 'core' : c.bone === 'head' ? 'head' : c.bone === 'jaw' ? 'jaw'
  : /elbowG/.test(c.bone) ? 'fore' : /^arm/.test(c.bone) ? 'arm' : 'leg'));
// beyond FAR_M from the eye only the core and head channels run (the budget, design §4)
export const FAR_M = 30;
const FAR_ON = REACT_CHANNELS.map((c) => c.bone === 'torso' || c.bone === 'head' || c.id === 'hipsDrop');
const SLEEP = 1e-5, SLEEP_V = 1e-4, MAX_DT = 0.05, SUB = 1 / 120;

function boneOf(ud, path) {
  const dot = path.indexOf('.');
  if (dot < 0) return ud[path] || null;
  const b = ud[path.slice(0, dot)]; return (b && b.userData && b.userData[path.slice(dot + 1)]) || null;
}

// The per-zombie state, made on the first event (a zombie that is never hit never carries one).
export function reactStateOf(z) {
  let R = z._react;
  if (!R) {
    R = z._react = { x: new Float64Array(NCH), v: new Float64Array(NCH), applied: new Float64Array(NCH), left: new Float64Array(NCH).fill(NaN), tgt: new Float64Array(NCH), awake: false, bones: null, size: 1,
      sustain: null, aware: null, mass: 1, seed: 0 };
    const ud = z.mesh && z.mesh.userData;
    R.bones = REACT_CHANNELS.map((c) => (ud ? boneOf(ud, c.bone) : null));
    R.size = (z.mesh && z.mesh.userData && z.mesh.userData.hitH ? z.mesh.userData.hitH / 1.7 : 1) || 1;
    R.seed = (z.id != null ? (z.id * 2654435761) >>> 0 : (Math.random() * 4294967296) >>> 0) || 1;
  }
  return R;
}
// a small deterministic noise per zombie (the sustained shudders): xorshift on its own seed
function rnd(R) { let s = R.seed; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; R.seed = s || 1; return (s / 4294967296) * 2 - 1; }

// Add an angular velocity kick (rad/s, or m/s on hipsDrop) to channels: kicks { channelId: value }.
export function reactKick(z, kicks, scale = 1) {
  const R = reactStateOf(z);
  for (const id in kicks) { const i = CH[id]; if (i == null || !R.bones[i] && REACT_CHANNELS[i].ax !== 'py') continue; R.v[i] += kicks[id] * scale; }
  R.awake = true;
  return R;
}
// A sustained source (a saw in contact, burning): until t runs out, each frame's kicks come from fn(R, dt, rnd).
export function reactSustain(z, kind, seconds, fn) {
  const R = reactStateOf(z);
  if (R.sustain && R.sustain.kind === kind) R.sustain.t = Math.max(R.sustain.t, seconds);
  else R.sustain = { kind, t: seconds, fn, age: 0 };
  R.awake = true;
  return R;
}

// One step: integrate the springs (semi-implicit, fixed 1/120 s substeps so 30 and 144 fps agree), clamp each channel to
// its anatomy bound, and ADD the change since last frame to the bones (so whatever wrote the pose this frame keeps it).
// far: true past FAR_M (the limbs' channels decay at once and stop). Returns true while anything is moving.
export function stepReact(z, dt, far = false) {
  const R = z._react; if (!R || !R.awake) return false;
  if (!(dt > 0)) return true;
  dt = Math.min(MAX_DT, dt);
  const sz = R.size;
  let left = dt, live = false;
  while (left > 1e-9) {
    const h = Math.min(SUB, left); left -= h;
    if (R.sustain) {
      const S = R.sustain; S.age += h; S.t -= h;
      if (S.fn) S.fn(R, h, () => rnd(R), S);
      if (S.t <= 0) { R.sustain = null; R.tgt.fill(0); }
    }
    for (let i = 0; i < NCH; i++) {
      if (far && !FAR_ON[i]) { R.x[i] = 0; R.v[i] = 0; continue; }
      const sp = REACT_SPRINGS[REGION[i]], w = 2 * Math.PI * sp.f, c = REACT_CHANNELS[i];
      R.v[i] += (-w * w * (R.x[i] - R.tgt[i]) - 2 * sp.zeta * w * R.v[i]) * h;   // tgt: a sustained source's hold (a limp arm, the saw's claw), 0 otherwise
      R.x[i] += R.v[i] * h;
      const lo = c.ax === 'py' ? c.min * sz : c.min, hi = c.ax === 'py' ? c.max * sz : c.max;
      if (R.x[i] < lo) { R.x[i] = lo; if (R.v[i] < 0) R.v[i] *= -0.2; }
      else if (R.x[i] > hi) { R.x[i] = hi; if (R.v[i] > 0) R.v[i] *= -0.2; }
    }
  }
  // asleep when every channel is all but still: snap to exactly zero so a rested zombie's pose is untouched
  for (let i = 0; i < NCH; i++) if (Math.abs(R.x[i]) > SLEEP || Math.abs(R.v[i]) > SLEEP_V || R.tgt[i] !== 0) { live = true; break; }
  if (!live && !R.sustain) { R.x.fill(0); R.v.fill(0); }
  applyReact(z, R);
  if (!live && !R.sustain) { R.awake = false; R.applied.fill(0); R.left.fill(NaN); }
  return live || !!R.sustain;
}
// The bones get the layer's value ADDED on top of the pose written this frame. Most bones are re-posed by the gait and the
// per-kind modules every frame; some are left alone (a jaw on most types, the hips' height on some paths). Each channel
// keeps the value it left on the bone: if the bone still holds it, nobody re-posed it and last frame's addition comes off
// first; otherwise this frame's pose is the base. Either way the bone ends as base + the layer, and back to its base when
// the layer sleeps.
function applyReact(z, R) {
  for (let i = 0; i < NCH; i++) {
    const b = R.bones[i]; if (!b) continue;
    const ax = REACT_CHANNELS[i].ax, o = ax === 'py' ? b.position : b.rotation, k = ax === 'py' ? 'y' : ax;
    if (!o) continue;
    if (R.x[i] === 0 && R.applied[i] === 0) { R.left[i] = NaN; continue; }
    const v = R.x[i] * (REACT_CHANNELS[i].sign || 1);   // the channel's sense onto the bone's axis (J159: the arms' out)
    const cur = o[k], base = cur === R.left[i] ? cur - R.applied[i] : cur;
    o[k] = base + v;
    R.left[i] = o[k]; R.applied[i] = v;
  }
}
// What the layer adds now (for the checks and the AI's read of a flinch: Claude 2's knob, design §2 C/F)
export function reactNow(z) {
  const R = z._react; if (!R) return null;
  const o = {}; for (let i = 0; i < NCH; i++) if (R.x[i] !== 0) o[REACT_CHANNELS[i].id] = R.x[i];
  return o;
}
// How hard he is reeling right now, 0..1 (the AI may hold a wind-up while it is high: design §2 F)
export function reactFlinch(z) {
  const R = z._react; if (!R || !R.awake) return 0;
  const t = Math.abs(R.x[CH.torsoX]) / 0.5 + Math.abs(R.x[CH.torsoY]) / 0.5 + Math.abs(R.x[CH.headX]) / 0.6;
  return Math.min(1, t);
}
export function reactReset(z) { if (z && z._react) { const R = z._react; R.x.fill(0); R.v.fill(0); R.tgt.fill(0); R.applied.fill(0); R.left.fill(NaN); R.sustain = null; R.awake = false; } }
