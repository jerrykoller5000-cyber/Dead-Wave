// D-244 (Claude 5, CE-26): the colossus's pitch layer on the measured colossus joints (bare groups at the 2.3 build).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { poseColossusPitch, PITCH } from './colossus-pitch.js';

const J = (p, n, x, y, z) => { const o = new T.Group(); o.name = n; o.position.set(x, y, z); p.add(o); return o; };
function colossus() {
  const g = new T.Group(), u = g.userData;
  u.hips = J(g, 'hips', 0, 1.265, 0); u.torso = J(u.hips, 'torso', 0, .644, 0); u.head = J(u.torso, 'head', 0, 1.484, 0);
  for (const [S, x] of [['L', -1], ['R', 1]]) {
    const a = u['arm' + S + 'G'] = J(u.torso, 'arm' + S, x * .996, .966, 0); a.scale.set(.8, .9, 1); a.rotation.set(-.45, 0, x * .2);
    a.userData.elbowG = J(a, 'elbow' + S, 0, -.782, 0);
    const l = u['leg' + S + 'G'] = J(u.hips, 'leg' + S, x * .379, -.046, 0); l.userData.shinG = J(l, 'shin' + S, 0, -.874, 0);
    l.userData.shamblerAnkle = J(l.userData.shinG, 'ankle', 0, -.828, .092);
  }
  const rock = new T.Mesh(); rock.visible = false; u.torso.add(rock);
  const rig = { THREE: T, g, torso: u.torso, scale: 2.3, heldRock: rock };
  g.position.set(3, 0, -2); g.rotation.y = .7;
  return { g, u, rig, z: { mesh: g, alive: true, partsLost: {} } };
}
const joints = (g) => { const js = []; g.traverse((o) => { if (o.isGroup && o !== g) js.push(o); }); return js; };
const stateAt = (t, W = 1.5, R = .6) => t < W ? { kind: 'stone', stage: 'windup', progress: t / W } : t < W + R ? { kind: 'stone', stage: 'recovery', progress: (t - W) / R } : { kind: 'stone', stage: 'cooldown', progress: 0 };
const ankles = (u) => [u.legLG, u.legRG].map((l) => l.userData.shamblerAnkle.getWorldPosition(new T.Vector3()));
// the pivot foot rolls up onto its toe from the stride: its toe (the bind's sole front, ankle space) is what stays put
const toe = (l) => new T.Vector3(0, -.13, .334).applyMatrix4(l.userData.shamblerAnkle.matrixWorld);

test('a whole throw ends exactly in the stance it began in, and lets go', () => {
  const { g, u, rig, z } = colossus(); const js = joints(g), rest = js.map((o) => o.quaternion.clone());
  for (let f = 0; f <= 150; f++) poseColossusPitch(rig, z, stateAt(f / 60), f / 60);
  js.forEach((o, i) => assert(o.quaternion.angleTo(rest[i]) < 1e-6, o.name));
  assert(u.hips.position.distanceTo(new T.Vector3(0, 1.265, 0)) < 1e-9);
  assert.equal(rig.pitch.active, false);
});

test('the planted feet stay put: the pivot foot through the wind-up, the front foot from the stomp', () => {
  const { g, u, rig, z } = colossus(); g.updateMatrixWorld(true); const start = ankles(u), toe0 = toe(u.legRG);
  let plant = null, prevToe = null;
  for (let f = 0; f <= 126; f++) {
    const t = f / 60, st = stateAt(t); poseColossusPitch(rig, z, st, t); g.updateMatrixWorld(true);
    const [L, R] = ankles(u), key = st.stage === 'windup' ? st.progress * 1.65 : st.stage === 'recovery' ? 1.65 + st.progress * .85 : 9;
    if (key < 1.20) assert(R.distanceTo(start[1]) < .01, `pivot foot moved ${R.distanceTo(start[1]).toFixed(3)} m at ${t.toFixed(2)} s`);
    const tn = toe(u.legRG);
    if (key < 1.50) assert(tn.distanceTo(toe0) < .02, `pivot toe moved ${tn.distanceTo(toe0).toFixed(3)} m at ${t.toFixed(2)} s`);
    // from the whip the toe drags forward on purpose (the follow-through). Heel down it is a planted foot: under the feet
    // rules' slide (0.3 m/s, game/zombie-limits.js); up on its toe, a drag under 0.5 m/s, the toe on the ground.
    const heelUp = new T.Vector3(0, -.13, -.311).applyMatrix4(u.legRG.userData.shamblerAnkle.matrixWorld).y - (toe0.y) > .04;
    if (prevToe) assert(tn.distanceTo(prevToe) * 60 < (heelUp ? .5 : .3), `pivot toe dragged ${(tn.distanceTo(prevToe) * 60).toFixed(2)} m/s at ${t.toFixed(2)} s`);
    assert(Math.abs(tn.y - toe0.y) < .03, `pivot toe off the ground ${(tn.y - toe0.y).toFixed(3)} at ${t.toFixed(2)} s`);
    prevToe = tn;
    if (key <= .70) assert(L.distanceTo(start[0]) < .01, `front foot moved before the tell at ${t.toFixed(2)} s`);
    if (key >= 1.45 && key <= 2.0) { plant ??= L.clone(); assert(L.distanceTo(plant) < .01, `front foot slid ${L.distanceTo(plant).toFixed(3)} m at ${t.toFixed(2)} s`); }
    if (key >= .95 && key <= 1.10) assert(L.y - start[0].y > .7, 'the knee comes up high for the tell');
  }
});

test('no joint jumps: under 30 deg a frame at 60 fps (the whip included), the rock shows from the sack to the release', () => {
  const { g, rig, z } = colossus(); const js = joints(g); let prev = null, shown = null, hid = null;
  for (let f = 0; f <= 130; f++) {
    const t = f / 60, st = stateAt(t); poseColossusPitch(rig, z, st, t);
    const cur = js.map((o) => o.quaternion.clone());
    if (prev) cur.forEach((q, i) => assert(q.angleTo(prev[i]) < 30 * Math.PI / 180, `${js[i].name} jumped at ${t.toFixed(3)} s`));
    prev = cur;
    if (rig.heldRock.visible && shown == null) shown = t; if (!rig.heldRock.visible && shown != null && hid == null) hid = t;
  }
  assert(shown > 0 && shown < .35, `rock shows in the sack ${shown}`); assert(hid >= 1.49 && hid <= 1.52, `rock leaves the hand at the release ${hid}`);
});

test('a cancelled throw fades back to the stance in 0.3 s, and an arms-only rig still pitches', () => {
  const { g, rig, z } = colossus(); const js = joints(g), rest = js.map((o) => o.quaternion.clone());
  let f = 0; for (; f <= 60; f++) poseColossusPitch(rig, z, stateAt(f / 60), f / 60);
  for (let k = 1; k <= 24; k++) poseColossusPitch(rig, z, { stage: 'cooldown' }, (f + k) / 60);
  js.forEach((o, i) => assert(o.quaternion.angleTo(rest[i]) < 1e-6, o.name)); assert.equal(rig.pitch.active, false);
  const bare = colossus(); bare.u.hips.remove(bare.u.legLG, bare.u.legRG); delete bare.u.legLG; delete bare.u.legRG;
  for (let k = 0; k <= 90; k++) poseColossusPitch(bare.rig, bare.z, stateAt(k / 60), k / 60);
  assert(bare.u.armRG.quaternion.angleTo(new T.Quaternion().setFromEuler(new T.Euler(-.45, 0, .2))) > .3, 'the arm moved');
  assert.equal(PITCH.plantAt, 1.40);
});

test('in-place gameplay damping cannot accumulate the forward pitch lunge', () => {
  for (const hz of [60, 120]) {
    const active = colossus(), control = colossus();
    let base = .18;
    active.u.hips.position.z = base;
    const fade = 1 - 10 / hz;
    for (let f = 0; f <= Math.ceil(2.5 * hz); f++) {
      const t = f / hz;
      active.u.hips.position.z *= fade;
      base *= fade;
      const state = stateAt(t);
      poseColossusPitch(active.rig, active.z, state, t);
      poseColossusPitch(control.rig, control.z, state, t);
      const actual = active.u.hips.position.z;
      assert(Math.abs(actual - control.u.hips.position.z - base) < 1e-8,
        'pitch displaced the native hips at ' + hz + ' Hz and ' + t.toFixed(3) + ' s: ' + actual);
      assert(actual < .65, 'fore-aft drive stays within the authored lunge');
    }
  }
});
