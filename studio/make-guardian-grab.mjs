// studio/make-guardian-grab.mjs — writes the clips for the guardian's grab and drag (CL-64, D-41).
//
//   node studio/make-guardian-grab.mjs
//
// The clips are data (studio/clips/<rig>/*.json); this script is how they were made, so the numbers
// that matter sit in one place with the reasons next to them. Change a number here, run it, render
// the scene (node tools/studio.mjs scene studio/scenes/guardian-grab-drag.json) and read the checks.
//
// How the feet work: a limb's target is in the rig's own frame. While it's planted (plant 1) the
// player pins it where it touched down, so the body moves over it; the scene plays a looped clip at
// the ground's speed (its stride), so a pinned foot ends its stance exactly where the clip's own
// target has swept back to, and the lift carries it forward to plant again. Nothing slides.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const write = (rig, clip) => {
  // Tidy key times (4 places), and drop anything past the end of a loop (it would never play).
  for (const tr of Object.values(clip.tracks)) for (const [c, keys] of Object.entries(tr)) {
    tr[c] = keys.map((k) => [Math.round(k[0] * 10000) / 10000, ...k.slice(1)]).filter((k, i) => !(clip.loop && k[0] > clip.length && i > 0));
  }
  const f = path.join(HERE, 'clips', rig, clip.name + '.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(clip, null, 1).replace(/\n\s+(-?[\d.]+|"[^"]*")(,?)(?=\n)/g, ' $1$2').replace(/\[\s+/g, '[').replace(/\s+\]/g, ']') + '\n');
  console.log('wrote', path.relative(process.cwd(), f));
};

// --- The guardian's rest (studio/clips/guardian/rest.json), rig frame, before its 1.3 scale ------
const REST = {
  pelvisPos: [0, 1.02, 0], pelvisRot: [-28.6, 0, 0],
  spine1: [-9.2, 0, 0], spine2: [-8, 0, 0], chest: [-5.7, 0, 0], neck: [48.1, 13, 0], head: [30.3, 10.6, 0], jaw: 23,
  handL: [-0.699, 0.037, 1.041], handR: [0.699, 0.037, 1.041], poleL: [-0.559, -0.183, -0.808], poleR: [0.559, -0.183, -0.808],
  footL: [-0.34, 0, -0.25], footR: [0.34, 0, -0.25], footPoleL: [-0.021, -0.276, 0.961], footPoleR: [0.021, -0.276, 0.961],
  wrist: -21.5, ankle: -73.6
};
// Hips high on driving hind legs and the chest pitched down into the pull (pelvis 1.2 up and level,
// against rest's 1.02 and -28.6: less negative leans the torso forward), which brings the shoulders
// down to about 1.9 rig units. Hips any lower and the hind legs fold till it's crawling on its knees. the front hand plants nearer under the shoulder than at rest (the arm
// is nearly straight at rest: it needs slack to reach fore and aft).
const HAND_L_HAUL = [-0.7, 0.04, 1.0];
const HOLD_BACK = [1.0, 0.5, -0.25];   // where the right hand holds the ankle while hauling (rig frame): low, out beside its hind leg
const HOLD_FRONT = [0.62, 0.55, 0.95];  // and where it yanks him to while it faces him
const add = (a, b) => a.map((x, i) => x + b[i]);

// A limb's steps. `steps` is a list of { up, down, from, to, h }: it leaves the ground at `up` from
// `from`, is carried in an arc `h` high, and plants at `down` on `to`. Between steps it stays planted.
// The release is eased over `ease` seconds (plant 1 → 0.5: the limb slides out of its pin onto the
// clip's path instead of jumping), the touchdown is a hard switch (it pins where it lands).
function stepTrack(steps, length, { loop = false, ease = 0.05 } = {}) {
  const ik = [], plant = [];
  const first = steps[0];
  if (loop) { const last = steps[steps.length - 1]; ik.push([0, r3(sweepAt(steps, 0, length, loop)), 'linear']); plant.push([0, 1]); void last; }
  else { ik.push([0, r3(first.from)]); plant.push([0, 1]); }
  for (const s of steps) {
    ik.push([s.up, r3(s.from), 'linear']);
    plant.push([s.up, 1], [Math.min(s.down, s.up + ease), 0.5, 'smooth'], [Math.min(s.down, s.up + ease) + 0.001, 0, 'step']);
    // Up first, over, then down: a foot leaves and lands vertically, so it never skims the ground.
    const span = s.down - s.up;
    const mid = s.from.map((x, i) => (x + s.to[i]) / 2);
    mid[1] = Math.max(s.from[1], s.to[1]) + s.h;
    ik.push([s.up + span * 0.18, r3([s.from[0], s.from[1] + s.h * 0.4, s.from[2]]), 'smooth']);
    ik.push([s.up + span * 0.5, r3(mid), 'smooth']);
    ik.push([s.up + span * 0.82, r3([s.to[0], s.to[1] + s.h * 0.4, s.to[2]]), 'smooth']);
    ik.push([s.down, r3(s.to), 'smooth']);
    plant.push([s.down - 0.001, 0], [s.down, 1, 'step']);
  }
  if (loop) { ik.push([length, r3(sweepAt(steps, 0, length, loop)), 'linear']); plant.push([length, 1]); }
  // Keys must be in time order (a step that wraps the loop is written that way by the caller).
  return { ik: dedupe(ik), plant: dedupe(plant) };
}
// Where a looping foot's target is at time t while planted: sweeping back from `to` of the last
// step to `from` of the next, at the ground's pace.
function sweepAt(steps, t, length) {
  const s0 = steps[0], sl = steps[steps.length - 1];
  const start = sl.down - length, end = s0.up;      // the stance that wraps round the loop
  const u = (t - start) / Math.max(1e-6, end - start);
  return sl.to.map((x, i) => x + (s0.from[i] - x) * u);
}
const dedupe = (keys) => keys.filter((k, i) => i === 0 || k[0] > keys[i - 1][0] - 1e-9).map((k, i, a) => (i > 0 && k[0] <= a[i - 1][0] ? [a[i - 1][0] + 0.0005, ...k.slice(1)] : k));

// --- 1. The lunge (0.5 s): gather, then stretch low along the ground, right hand to the ankle ----
{
  const L = 0.5;
  const handR = { ik: [[0, REST.handR], [0.08, [0.72, 0.45, 1.2], 'out'], [0.36, '@ankle', 'out']], pole: [[0, REST.poleR], [0.3, [0.7, -0.6, -0.4]]], level: [[0, 1], [0.1, 1], [0.3, 0]],
    grip: [[0, -1], [0.18, 0.1], [0.34, 0.25], [0.42, 1, 'in']], plant: [[0, 1], [0.1, 0.5, 'smooth'], [0.101, 0, 'step']] };
  // The left hand steps forward to take the weight as it stretches out; the hind feet drive, then trail.
  // The scene carries it 1.1 m in 0.38 s: the left hand reaches forward to take the weight, the hind
  // feet push off and trail. Each says where it wants to be and steps for itself when the body has
  // run on far enough past it (the `step` channel), so nothing is dragged over the ground.
  const handL = { ik: [[0, REST.handL], [0.3, add(REST.handL, [0, 0, 0.5]), 'out']], step: [[0, 0.32]] };
  const footL = { ik: [[0, REST.footL], [0.38, add(REST.footL, [-0.04, 0, -0.35]), 'out']], step: [[0, 0.42]] };
  const footR = { ik: [[0, REST.footR], [0.38, add(REST.footR, [0.04, 0, -0.3]), 'out']], step: [[0, 0.46]] };
  write('guardian', {
    format: 'dw-clip/1', name: 'lunge', rig: 'guardian', length: L, reference: 'NinjaJump_Start',
    notes: 'CL-64. Faces the marine (the scene aims it), gathers, then stretches low along the ground and takes the ankle with the right hand. The scene moves it forward about a metre; the hind feet drive off, then trail.',
    tracks: {
      pelvis: { pos: [[0, REST.pelvisPos], [0.14, [0, 0.94, -0.12], 'out'], [0.38, [0, 0.8, 0.28], 'out'], [L, [0, 0.84, 0.22]]],
        rot: [[0, REST.pelvisRot], [0.14, [-24, 0, 0]], [0.38, [-42, 0, -4], 'out'], [L, [-38, 0, -3]]] },
      spine1: { rot: [[0, REST.spine1], [0.14, [-6, 0, 0]], [0.38, [-15, 4, 0], 'out'], [L, [-13, 4, 0]]] },
      spine2: { rot: [[0, REST.spine2], [0.14, [-5, 0, 0]], [0.38, [-12, 6, 0], 'out'], [L, [-11, 6, 0]]] },
      chest: { rot: [[0, REST.chest], [0.14, [-3, 0, 0]], [0.38, [-9, 5, 0], 'out'], [L, [-8, 5, 0]]] },
      neck: { rot: [[0, REST.neck], [0.38, [34, 0, 0]], [L, [34, 0, 0]]], look: [[0, '@ankle']] },
      head: { rot: [[0, REST.head], [0.38, [24, 0, 0]], [L, [24, 0, 0]]] },
      jaw: { open: [[0, 0.1], [0.3, 0.9, 'out'], [L, 0.8]] },
      handR, wristR: { rot: [[0, [REST.wrist, 0, 0]], [0.36, [10, 0, 12]]] },
      handL: { ...handL, pole: [[0, REST.poleL]], grip: [[0, -1]], level: [[0, 1]] }, wristL: { rot: [[0, [REST.wrist, 0, 0]]] },
      footL: { ...footL, pole: [[0, REST.footPoleL]], level: [[0, 1]] }, ankleL: { rot: [[0, [REST.ankle, 0, 0]]] },
      footR: { ...footR, pole: [[0, REST.footPoleR]], level: [[0, 1]] }, ankleR: { rot: [[0, [REST.ankle, 0, 0]]] }
    },
    events: [[0.02, 'roar'], [0.4, 'grab']]
  });
}

// --- 2. The pull (0.45 s): it rears back on braced hind legs and yanks him off his feet ------------
{
  const L = 0.45;
  write('guardian', {
    format: 'dw-clip/1', name: 'pull', rig: 'guardian', length: L, reference: 'Zombie_Scratch',
    notes: 'CL-64. Holding the ankle, it sits back on braced hind legs and throws its weight backwards; the scene moves it back and tows him with it.',
    tracks: {
      pelvis: { pos: [[0, [0, 0.84, 0.22]], [0.2, [0, 0.9, -0.18], 'out'], [L, [0, 0.95, -0.1]]],
        rot: [[0, [-38, 0, -3]], [0.2, [-14, 0, 4], 'out'], [L, [-20, 0, 2]]] },
      spine1: { rot: [[0, [-13, 4, 0]], [0.2, [2, -6, 0], 'out'], [L, [-2, -4, 0]]] },
      spine2: { rot: [[0, [-11, 6, 0]], [0.2, [4, -8, 0], 'out'], [L, [0, -6, 0]]] },
      chest: { rot: [[0, [-8, 5, 0]], [0.2, [6, -10, 0], 'out'], [L, [2, -8, 0]]] },
      // No look here: he's yanked too fast to track; it throws its head back with the heave instead.
      neck: { rot: [[0, [34, 0, 0]], [0.2, [20, 0, 0]], [L, [28, 0, 0]]] },
      head: { rot: [[0, [24, 0, 0]], [0.2, [8, 0, 0]], [L, [16, 0, 0]]] },
      jaw: { open: [[0, 0.8], [0.15, 1, 'out'], [L, 0.6]] },
      // The hand keeps the ankle and hauls it in toward its chest: the scene tows him along with it.
      handR: { ik: [[0, '@ankle'], [0.45, HOLD_FRONT, 'inout']], grip: [[0, 1]], pole: [[0, [0.7, -0.6, -0.4]], [L, [0.6, 0.6, -0.4]]] }, wristR: { rot: [[0, [10, 0, 12]]] },
      // It sits back 0.55 m (the scene moves it): the front hand steps back under it as it goes.
      handL: { ik: [[0, add(REST.handL, [0, 0, 0.5])], [0.3, REST.handL]], step: [[0, 0.3]], level: [[0, 1]], pole: [[0, REST.poleL]], grip: [[0, -1]] }, wristL: { rot: [[0, [REST.wrist, 0, 0]]] },
      footL: { ik: [[0, add(REST.footL, [-0.04, 0, -0.35])], [0.3, add(REST.footL, [-0.06, 0, -0.1])]], step: [[0, 0.35]], level: [[0, 1]], pole: [[0, REST.footPoleL]] }, ankleL: { rot: [[0, [REST.ankle, 0, 0]]] },
      footR: { ik: [[0, add(REST.footR, [0.04, 0, -0.3])], [0.3, add(REST.footR, [0.06, 0, -0.1])]], step: [[0, 0.35]], level: [[0, 1]], pole: [[0, REST.footPoleR]] }, ankleR: { rot: [[0, [REST.ankle, 0, 0]]] }
    },
    events: [[0.12, 'yank']]
  });
}

// --- 3. The turn (1 s): it walks round the leg it holds to face its cave ------------------------------
// The scene turns and moves the body (aim, and the keyed "at" that tune-grab-turn.mjs solves so the
// holding hand stays put); the clip only says where each limb should stand under the body, and lets
// them step for themselves (the `step` channel): a limb picks up when the body has moved 0.3 rig
// units off it and puts down where the clip wants it.
{
  const L = 1.0;
  const STEP = [[0, 0.24]];
  write('guardian', {
    format: 'dw-clip/1', name: 'turn', rig: 'guardian', length: L,
    notes: 'CL-64. Walks its body round the leg it holds, from facing him to facing home; the limbs step for themselves under it. The right arm keeps the ankle and carries it from its front round behind its hip.',
    tracks: {
      pelvis: { pos: [[0, [0, 0.95, -0.1]], [0.5, [0, 1.08, 0]], [L, [0, 1.2, 0.04]]], rot: [[0, [-20, 0, 2]], [0.5, [-10, 6, 0]], [L, [0, -3, 0]]] },
      spine1: { rot: [[0, [-2, -4, 0]], [0.5, [-1, -6, 0]], [L, [0, -3, 0]]] },
      spine2: { rot: [[0, [0, -6, 0]], [0.5, [-6, -8, 0]], [L, [-13, -4, 0]]] },
      chest: { rot: [[0, [2, -8, 0]], [0.5, [-5, -9, 0]], [L, [-11, -5, 0]]] },
      neck: { rot: [[0, [28, 0, 0]], [L, [42, 0, 0]]], look: [[0, '@ankle'], [0.55, [0, 2.8, 6]]] },
      head: { rot: [[0, [16, 0, 0]], [L, [24, 0, 0]]] },
      jaw: { open: [[0, 0.6], [L, 0.35]] },
      // As the body turns away from him, the holding hand goes from its front round to behind its hip.
      handR: { ik: [[0, HOLD_FRONT], [0.5, [1.1, 0.55, 0.4]], [L, HOLD_BACK, 'inout']], grip: [[0, 1]], pole: [[0, [0.6, 0.6, -0.4]], [L, [0.5, 1, 0]]] }, wristR: { rot: [[0, [10, 0, 12]], [L, [17, 0, 17]]] },
      footR: { ik: [[0, REST.footR]], step: STEP, pole: [[0, REST.footPoleR]], level: [[0, 1]] },
      handL: { ik: [[0, REST.handL], [L, HAND_L_HAUL]], step: STEP, pole: [[0, REST.poleL]], grip: [[0, -1]], level: [[0, 1]] },
      footL: { ik: [[0, REST.footL]], step: STEP, pole: [[0, REST.footPoleL]], level: [[0, 1]] },
      wristL: { rot: [[0, [REST.wrist, 0, 0]]] }, ankleR: { rot: [[0, [REST.ankle, 0, 0]]] }, ankleL: { rot: [[0, [REST.ankle, 0, 0]]] }
    }
  });
}

// --- 4. The haul (0.8 s loop, 1.6 m a loop): three limbs walking, the right arm dragging him --------
// Stance 0.55 s of every 0.8 s; at the design pace (2 m/s, rate 1) the body goes 1.1 m over a planted
// limb = 0.85 rig units, so a limb plants 0.42 ahead of its rest spot and lifts 0.42 behind it.
const HAUL = { length: 0.8, stride: 1.6, reach: 0.42 };
{
  const L = HAUL.length, R = HAUL.reach;
  const gait = (homeP, up, h) => {
    const from = add(homeP, [0, 0, -R]), to = add(homeP, [0, 0, R]);
    return stepTrack([{ up, down: up + 0.25, from, to, h }], L, { loop: true });
  };
  const pelvisY = [];
  for (let i = 0; i <= 8; i++) { const t = (i / 8) * L; pelvisY.push([t, [0, 1.2 + 0.035 * Math.cos((t / L) * Math.PI * 4 + 0.6), 0.04], 'smooth']); }
  write('guardian', {
    format: 'dw-clip/1', name: 'haul', rig: 'guardian', length: L, loop: true, reference: 'Push_Loop',
    notes: `CL-64. Plays at the ground's speed: stride ${HAUL.stride} m a loop. Right foot, left hand, left foot, each lifted a quarter of the loop and planted the rest; the right arm holds the ankle behind it. Low and leaning into the pull.`,
    tracks: {
      pelvis: { pos: pelvisY, rot: [[0, [0, -3, 0]], [0.4, [0, 3, 0]], [L, [0, -3, 0]]] },
      spine1: { rot: [[0, [0, -3, 0]], [0.4, [0, 1, 0]], [L, [0, -3, 0]]] },
      spine2: { rot: [[0, [-13, -4, 0]], [0.4, [-13, 0, 0]], [L, [-13, -4, 0]]] },
      chest: { rot: [[0, [-11, -5, 0]], [0.4, [-11, -1, 0]], [L, [-11, -5, 0]]] },
      neck: { rot: [[0, [44, 0, 0]], [0.4, [40, -4, 0]], [L, [44, 0, 0]]] },
      head: { rot: [[0, [26, 0, 0]], [0.4, [22, -6, 0]], [L, [26, 0, 0]]] },
      jaw: { open: [[0, 0.25], [0.2, 0.5], [0.4, 0.25], [0.6, 0.5], [L, 0.25]] },
      // The right hand, holding him, trails low behind its hip: the scene tows him to it.
      handR: { ik: [[0, HOLD_BACK], [0.4, add(HOLD_BACK, [0, 0.06, 0.04])], [L, HOLD_BACK]], grip: [[0, 1]], pole: [[0, [0.5, 1, 0]]] }, wristR: { rot: [[0, [17, 0, 17]]] },
      footR: { ...gait(REST.footR, 0.0, 0.28), pole: [[0, REST.footPoleR]], level: [[0, 1]] }, ankleR: { rot: [[0, [REST.ankle, 0, 0]]] },
      handL: { ...gait(HAND_L_HAUL, 0.27, 0.4), pole: [[0, REST.poleL]], grip: [[0, -1]], level: [[0, 1]] }, wristL: { rot: [[0, [REST.wrist, 0, 0]]] },
      footL: { ...gait(REST.footL, 0.54, 0.28), pole: [[0, REST.footPoleL]], level: [[0, 1]] }, ankleL: { rot: [[0, [REST.ankle, 0, 0]]] }
    },
    events: [[0.25, 'step'], [0.52, 'step'], [0.79, 'step']]
  });
}

// --- The marine: running from it, falling forward when his leg is taken, dragged face down ---------
// Marine rig frame (studio/marine.js): hips at 0.62, ankles rest 0.1 up (the boot is under them).
const M = { footL: [-0.13, 0.1, 0.01], footR: [0.13, 0.1, 0.01] };
{
  // A scrambling run: 0.6 s and 0.84 m a loop (1.4 m/s), each foot down half of it. His legs are
  // straight at rest (hip 0.62 over an ankle 0.1 up: the leg's whole length), so the run carries his
  // hips and torso 8 cm lower (pelvis and spine pos), which gives a foot ±0.21 of reach fore and aft.
  const L = 0.6, R = 0.21;
  const run = (homeP, up) => stepTrack([{ up, down: up + 0.3, from: add(homeP, [0, 0, -R]), to: add(homeP, [0, 0, R]), h: 0.22 }], L, { loop: true, ease: 0.08 });
  write('marine', {
    format: 'dw-clip/1', name: 'flee', rig: 'marine', length: L, loop: true, reference: 'Sprint_Loop',
    notes: 'CL-64. Scrambling away, crouched 8 cm: stride 0.84 m a loop (1.4 m/s at rate 1), arms pumping.',
    tracks: {
      pelvis: { pos: [[0, [0, -0.08, 0]]] },
      spine: { pos: [[0, [0, 0.62, 0]]], rot: [[0, [12, 6, 0]], [0.3, [12, -6, 0]], [L, [12, 6, 0]]] },
      head: { rot: [[0, [-8, 0, 0]]] },
      footL: { ...run(M.footL, 0.0), pole: [[0, [0, 0, 1]]], level: [[0, 1]] },
      footR: { ...run(M.footR, 0.3), pole: [[0, [0, 0, 1]]], level: [[0, 1]] },
      shoulderL: { rot: [[0, [-50, 0, 8]], [0.3, [35, 0, 8]], [L, [-50, 0, 8]]] },
      shoulderR: { rot: [[0, [35, 0, -8]], [0.3, [-50, 0, -8]], [L, [35, 0, -8]]] },
      elbowL: { rot: [[0, [-80, 0, 0]]] }, elbowR: { rot: [[0, [-80, 0, 0]]] }
    }
  });
  write('marine', {
    format: 'dw-clip/1', name: 'fall', rig: 'marine', length: 0.35, reference: 'Hit_Knockback',
    notes: 'CL-64. His leg is taken from behind: arms thrown out to catch himself, the free leg kicking back.',
    tracks: {
      spine: { rot: [[0, [12, 0, 0]], [0.35, [-10, 0, 0]]] },
      head: { rot: [[0, [-8, 0, 0]], [0.35, [-30, 0, 0]]] },
      shoulderL: { rot: [[0, [-50, 0, 8]], [0.35, [-150, 0, 20]]] },
      shoulderR: { rot: [[0, [35, 0, -8]], [0.35, [-145, 0, -20]]] },
      elbowL: { rot: [[0, [-80, 0, 0]], [0.35, [-20, 0, 0]]] }, elbowR: { rot: [[0, [-80, 0, 0]], [0.35, [-25, 0, 0]]] },
      hipR: { rot: [[0, [0, 0, 0]], [0.35, [25, 0, 0]]] }, kneeR: { rot: [[0, [20, 0, 0]], [0.35, [70, 0, 0]]] }
    },
    events: [[0.3, 'hit-ground']]
  });
  write('marine', {
    format: 'dw-clip/1', name: 'dragged', rig: 'marine', length: 1.1, loop: true,
    notes: 'CL-64. Face down, dragged by one ankle: clawing at the dirt over his head, one hand then the other; the free leg kicking; head up to look back.',
    tracks: {
      spine: { rot: [[0, [-12, 0, 0]], [0.55, [-18, 4, 0]], [1.1, [-12, 0, 0]]] },
      head: { rot: [[0, [-34, 10, 0]], [0.55, [-28, -8, 0]], [1.1, [-34, 10, 0]]] },
      shoulderL: { rot: [[0, [-150, 0, 20]], [0.3, [-120, 0, 30]], [0.55, [-160, 0, 16]], [1.1, [-150, 0, 20]]] },
      shoulderR: { rot: [[0, [-160, 0, -16]], [0.55, [-150, 0, -20]], [0.85, [-120, 0, -30]], [1.1, [-160, 0, -16]]] },
      elbowL: { rot: [[0, [-25, 0, 0]], [0.3, [-70, 0, 0]], [0.55, [-15, 0, 0]], [1.1, [-25, 0, 0]]] },
      elbowR: { rot: [[0, [-15, 0, 0]], [0.55, [-25, 0, 0]], [0.85, [-70, 0, 0]], [1.1, [-15, 0, 0]]] },
      hipR: { rot: [[0, [20, 0, 0]], [0.5, [-10, 0, 0]], [1.1, [20, 0, 0]]] },
      kneeR: { rot: [[0, [80, 0, 0]], [0.5, [20, 0, 0]], [1.1, [80, 0, 0]]] }
    }
  });
}
console.log('haul stride', HAUL.stride, 'm per', HAUL.length, 's loop');
