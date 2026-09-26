// studio/bake-guardian.mjs — turns the guardian's procedural beats (world/cave-guardian.js, CL-56)
// into clip files, so its animation as it is today becomes data the crew can edit and Jerry can
// review (D-40). Run once; after this the clips are the source and the procedural poses retire.
//
//   node --import ./studio/node-three.mjs studio/bake-guardian.mjs [--check]
//
// For each beat it poses the rig by the old code at evenly spaced times and records every joint
// the old code moves: the body's rotations, and each limb as an IK target (where its end is) plus
// the pole its middle joint bends toward, so the player's IK lands the hand where the old code did.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import * as G from '../world/cave-guardian.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'clips', 'guardian');
fs.mkdirSync(OUT, { recursive: true });

const R2D = 180 / Math.PI;
const r1 = (n) => Math.round(n * 10) / 10, r3 = (n) => Math.round(n * 1000) / 1000;
const BODY = ['pelvis', 'spine1', 'spine2', 'chest', 'neck', 'head', 'jaw'];
const ENDS = { handL: ['shoulderL', 'elbowL', 'wristL'], handR: ['shoulderR', 'elbowR', 'wristR'], footL: ['hipL', 'kneeL', 'ankleL'], footR: ['hipR', 'kneeR', 'ankleR'] };

const g = G.makeCaveGuardianRig({});
const R = g.userData.rig;
g.updateWorldMatrix(true, true);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const world = (j, out) => { j.updateWorldMatrix(true, false); return out.setFromMatrixPosition(j.matrixWorld); };
const eul = (o) => { const e = new THREE.Euler().setFromQuaternion(o.quaternion, 'XYZ'); return [r1(e.x * R2D), r1(e.y * R2D), r1(e.z * R2D)]; };
function gripOf(S) {
  const rx = R['fingers' + S][0].rotation.x;
  return r3(rx < 0 ? rx / 1.35 : rx / 0.55);
}

// Pose by `fn(u)` at n+1 evenly spaced u in [0, 1]; returns the tracks.
function bake(fn, n, length, { live = {} } = {}) {
  const tracks = {};
  const push = (track, ch, t, v) => { ((tracks[track] || (tracks[track] = {}))[ch] || (tracks[track][ch] = [])).push([t, v, 'linear']); };
  const lastPole = {};
  for (let i = 0; i <= n; i++) {
    const u = i / n, t = r3(u * length);
    fn(u);
    g.updateWorldMatrix(true, true);
    push('pelvis', 'pos', t, [r3(R.pelvis.position.x), r3(R.pelvis.position.y), r3(R.pelvis.position.z)]);
    for (const j of BODY) push(j, 'rot', t, eul(R[j]));
    for (const [chain, [root, mid, end]] of Object.entries(ENDS)) {
      if (live[chain]) continue;
      const S = world(R[root], _a), M = world(R[mid], _b), E = world(R[end], _c);
      push(chain, 'ik', t, [r3(E.x), r3(E.y), r3(E.z)]);
      // The pole: where the middle joint sits off the line from root to end.
      const d = E.clone().sub(S).normalize();
      const m = M.clone().sub(S);
      const perp = m.addScaledVector(d, -m.dot(d));
      let pole = lastPole[chain];
      if (perp.length() > 0.04) pole = perp.normalize().toArray().map(r3);
      if (!pole) pole = chain.startsWith('hand') ? [chain.endsWith('L') ? -0.6 : 0.6, 0.3, -0.75] : [0, 0.2, 1];
      lastPole[chain] = pole;
      push(chain, 'pole', t, pole);
      push(end, 'rot', t, eul(R[end]));
      if (chain.startsWith('hand')) push(chain, 'grip', t, gripOf(chain.slice(-1)));
    }
    for (const chain of Object.keys(live)) push(ENDS[chain][2], 'rot', t, eul(R[ENDS[chain][2]]));
    for (const chain of Object.keys(live)) if (chain.startsWith('hand')) push(chain, 'grip', t, gripOf(chain.slice(-1)));
  }
  // Drop keys a channel doesn't need: a middle key that sits on the straight line between its
  // neighbours adds nothing (within 0.05 degrees or 0.5 mm).
  for (const chans of Object.values(tracks)) for (const [ch, keys] of Object.entries(chans)) chans[ch] = thin(keys, ch === 'rot' ? 0.05 : ch === 'grip' ? 0.002 : 0.0005);
  return tracks;
}
function thin(keys, tol) {
  if (keys.length <= 2) return keys;
  const val = (k) => (Array.isArray(k[1]) ? k[1] : [k[1]]);
  const out = [keys[0]];
  for (let i = 1; i < keys.length - 1; i++) {
    const a = out[out.length - 1], b = keys[i], c = keys[i + 1];
    const u = (b[0] - a[0]) / (c[0] - a[0]);
    const va = val(a), vb = val(b), vc = val(c);
    if (va.some((x, k) => Math.abs(x + (vc[k] - x) * u - vb[k]) > tol)) out.push(b);
  }
  out.push(keys[keys.length - 1]);
  // A channel that never moves is one key.
  if (out.length === 2 && JSON.stringify(out[0][1]) === JSON.stringify(out[1][1])) return [[0, out[0][1]]];
  return out;
}
function write(name, clip) {
  const json = { format: 'dw-clip/1', name, rig: 'guardian', ...clip };
  const f = path.join(OUT, name + '.json');
  // One key per line: readable and diffable, without a 5,000-line file.
  const tracks = Object.entries(json.tracks).map(([tr, chans]) => `    ${JSON.stringify(tr)}: {\n` + Object.entries(chans).map(([ch, keys]) => `      ${JSON.stringify(ch)}: [\n` + keys.map((k) => '        ' + JSON.stringify(k)).join(',\n') + '\n      ]').join(',\n') + '\n    }').join(',\n');
  const head = { ...json }; delete head.tracks; delete head.events;
  let text = '{\n' + Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  text += ',\n  "tracks": {\n' + tracks + '\n  }';
  if (json.events) text += ',\n  "events": [\n' + json.events.map((e) => '    ' + JSON.stringify(e)).join(',\n') + '\n  ]';
  text += '\n}\n';
  fs.writeFileSync(f, text);
  console.log('wrote', path.relative(process.cwd(), f), (text.length / 1024).toFixed(1) + ' KB');
  return json;
}

const LOOK = V(1.5, 1.0, 8);
const TAU = Math.PI * 2;
const baked = {};

// Rest: standing on all fours, looking ahead. Its first frame is the rig's rest pose.
baked.rest = write('rest', {
  length: 1, loop: false, notes: 'The rest pose: on all fours, looking ahead. Joints a clip leaves alone sit here.',
  tracks: bake(() => G.guardianStand(g, R, 0, LOOK, { open: 0.3 }), 1, 1)
});
baked.stand = write('stand', {
  length: 3.7, loop: true, notes: 'Baked from the CL-56 stand: breathing on all fours, looking ahead, the jaw working.',
  tracks: bake((u) => G.guardianStand(g, R, u * 3.7, LOOK, { open: 0.3 }), 36, 3.7)
});
// The bound: the chase ran it off the distance (a stride every 8.4 m at 27 m/s, 0.31 s).
const GALLOP_L = 0.32;
baked.gallop = write('gallop', {
  length: GALLOP_L, loop: true, reference: 'Sprint_Loop',
  notes: 'Baked from the CL-56 chase: a flat-out bound on all fours. The chase moves the creature; the clip plays in place.',
  tracks: bake((u) => G.guardianGallop(g, R, u * TAU, 1, u * Math.PI / 9, LOOK), 32, GALLOP_L),
  events: [[0, 'footfall', { limb: 'handL' }], [r3(0.3 / TAU * GALLOP_L), 'footfall', { limb: 'handR' }],
    [r3(((Math.PI - 0.35 + 0.2) / TAU) * GALLOP_L), 'footfall', { limb: 'footL' }], [r3(((Math.PI - 0.35) / TAU) * GALLOP_L), 'footfall', { limb: 'footR' }]]
});
// The pounce: rears up and takes the leg. The body is baked; the grabbing hand goes to the live
// ankle (the marine's, in the game; the dummy's, in the renderer).
const ANKLE = V(0.4, 0.3, 2.6);
const POUNCE_L = 0.5;
{
  const tracks = bake((u) => G.guardianRearGrab(g, R, u, 'R', ANKLE, u * 1.1, u > 0.6 ? Math.min(1, (u - 0.6) / 0.3) : 0, ANKLE), 20, POUNCE_L, { live: { handR: true } });
  G.guardianStand(g, R, 0, LOOK, {}); g.updateWorldMatrix(true, true);
  const start = world(R.wristR, _a).toArray().map(r3);
  tracks.handR = { ...(tracks.handR || {}), ik: [[0, start], [0.42, '@ankle', 'out']], pole: [[0, [0.6, 0.3, -0.75]], [0.42, [0.8, 0.5, -0.2]]] };
  baked.pounce = write('pounce', {
    length: POUNCE_L, loop: false, reference: 'Zombie_Scratch',
    notes: 'Baked from the CL-56 grab: rears up on its hind legs and one long arm goes for the leg; the other braces. The hand ends on the live @ankle.',
    stage: { ankle: [0.4, 0.3, 2.6] },
    tracks, events: [[0.42, 'grab', { hand: 'R' }]]
  });
}
// The drag: for the mouth on three limbs, the leg held out behind in the right hand.
const DRAG_L = 0.9, DRAG_ANKLE = V(-0.5, 0.35, -2.4);
{
  const tracks = bake((u) => G.guardianDragWalk(g, R, u * DRAG_L, 'R', DRAG_ANKLE, u * TAU, 0.7, V(0, 1, -8)), 24, DRAG_L, { live: { handR: true } });
  tracks.handR = { ...(tracks.handR || {}), ik: [[0, '@ankle']], pole: [[0, [0.5, 1, 0]]] };
  baked.drag = write('drag', {
    length: DRAG_L, loop: true, reference: 'Push_Loop',
    notes: 'Baked from the CL-56 drag: back toward the mouth on three limbs, heaving, the marine\'s leg held out behind in the right hand (@ankle).',
    stage: { ankle: [-0.5, 0.35, -2.4] },
    tracks, events: [[0, 'heave', {}], [r3(DRAG_L / 2), 'heave', {}]]
  });
}
// The walk-out with what is left, held low in both hands.
const WALK_L = 0.9, CARRY = V(0, 1.2, 0.85);
baked.carry = write('carry', {
  length: WALK_L, loop: true, reference: 'Walk_Carry_Loop',
  notes: 'Baked from the CL-56 walk-out: upright, carrying the remains low in both hands.',
  tracks: bake((u) => G.guardianWalkUpright(g, R, u * WALK_L, u * TAU, CARRY, LOOK), 24, WALK_L),
  events: [[0, 'footfall', { limb: 'footL' }], [r3(WALK_L / 2), 'footfall', { limb: 'footR' }]]
});
// The throw: hauled back over its head, then whipped through.
const THROW_L = 1.2, WIND = 0.55;
baked.throw = write('throw', {
  length: THROW_L, loop: false, reference: 'OverhandThrow',
  notes: 'Baked from the CL-56 throw: the remains hauled back over its head, then thrown out onto the apron. Release at the event.',
  tracks: bake((u) => { const t = u * THROW_L; G.guardianCarryThrow(g, R, t, CARRY, Math.min(1, t / WIND), Math.max(0, (t - WIND) / 0.65), LOOK); }, 30, THROW_L),
  events: [[WIND, 'throw', {}], [r3(WIND + 0.45 * 0.65), 'release', {}]]
});
// Going back in: upright, arms swinging.
baked.walk = write('walk', {
  length: WALK_L, loop: true, reference: 'Zombie_Walk_Fwd_Loop',
  notes: 'Baked from the CL-56 walk back into the cave: upright, long arms swinging low.',
  tracks: bake((u) => G.guardianWalkUpright(g, R, u * WALK_L, u * TAU, null, LOOK), 24, WALK_L),
  events: [[0, 'footfall', { limb: 'footL' }], [r3(WALK_L / 2), 'footfall', { limb: 'footR' }]]
});

// --check: play each baked clip back through the studio player and compare with the old code.
if (process.argv.includes('--check')) {
  const { rigs } = await import('./rigs.js');
  const { loadClip, sampleClip, applyPose } = await import('./clip.js');
  const inst = rigs.get('guardian').create({ scale: 1 });
  // Hands, feet and head must land where the old code put them; elbows and knees may swing a
  // little wider between keys (a limb's middle joint follows the interpolated target).
  const joints = { wristL: 0.03, wristR: 0.03, ankleL: 0.03, ankleR: 0.03, head: 0.03, elbowL: 0.1, elbowR: 0.1, kneeL: 0.1, kneeR: 0.1 };
  const fns = {
    gallop: [(u) => G.guardianGallop(g, R, u * TAU, 1, u * Math.PI / 9, LOOK), GALLOP_L],
    carry: [(u) => G.guardianWalkUpright(g, R, u * WALK_L, u * TAU, CARRY, LOOK), WALK_L],
    walk: [(u) => G.guardianWalkUpright(g, R, u * WALK_L, u * TAU, null, LOOK), WALK_L],
    throw: [(u) => { const t = u * THROW_L; G.guardianCarryThrow(g, R, t, CARRY, Math.min(1, t / WIND), Math.max(0, (t - WIND) / 0.65), LOOK); }, THROW_L]
  };
  let worst = 0;
  for (const [name, [fn, L]] of Object.entries(fns)) {
    const clip = loadClip(JSON.parse(fs.readFileSync(path.join(OUT, name + '.json'), 'utf8')));
    let w = 0, at = '';
    const N = +(process.env.CHECK_N || 40);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      fn(u); g.updateWorldMatrix(true, true);
      applyPose(inst, sampleClip(clip, u * L));
      for (const [j, lim] of Object.entries(joints)) {
        const d = world(R[j], _a).distanceTo(world(inst.R[j], _b)) / lim;
        if (d > w) { w = d; at = `${j} ${(d * lim * 100).toFixed(1)} cm at ${(u * L).toFixed(2)} s`; }
      }
    }
    console.log(`check ${name}: worst ${(w * 100).toFixed(0)}% of its limit (${at})`);
    worst = Math.max(worst, w);
  }
  if (worst > 1) { console.log('CHECK FAILED: a joint is off the old code by more than its limit'); process.exitCode = 1; } else console.log('check: every joint within its limit (hands, feet, head 3 cm; elbows, knees 10 cm)');
}
