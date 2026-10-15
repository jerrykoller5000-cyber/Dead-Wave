// studio/marine-gait-feel.test.mjs — CL-186: the weight laid over the marine's gait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAIT_WEIGHT as F, footRoll, gaitExtras, leanFromAccel } from './marine-gait-feel.js';

test('the heel lands toe-up, the heel comes off ahead of the toe, the toe hangs in the swing', () => {
  assert.ok(footRoll(0, 0, 1, 0) < -0.12, 'toe up at the strike: ' + footRoll(0, 0, 1, 0));
  assert.ok(Math.abs(footRoll(0.2, 0, 1, 0)) < 0.03, 'flat through mid-stance: ' + footRoll(0.2, 0, 1, 0));
  const push = footRoll(0.45, 0.037, 0.9, 0);
  assert.ok(push > 0.18 && push < 0.3, 'the heel off the ground late in the stance, the ball of the foot still down: ' + push);
  assert.ok(footRoll(0.45, 0, 1, 0) < 0.02, 'no push without a lift');
  // The push-off keeps the toe on the ground: the toe drops by what the ankle lifted.
  const y = 0.05, drop = Math.sin(footRoll(0.4, y, 0.9, 0)) * F.footLen;
  assert.ok(Math.abs(drop - y) < 0.006, 'the toe stays down through the push: ' + drop + ' vs ' + y);
  assert.ok(footRoll(0.75, 0.07, 0, 0) > 0.08 && footRoll(0.75, 0.07, 0, 0) < 0.2, 'a hanging toe mid-swing, the lift ignored: ' + footRoll(0.75, 0.07, 0, 0));
  assert.ok(footRoll(0.88, 0.02, 0.9, 0) > -0.05 && footRoll(0.88, 0.02, 0.9, 0) < 0.05, 'nearly flat well before the strike: ' + footRoll(0.88, 0.02, 0.9, 0));
  assert.ok(footRoll(0.06, 0, 1, 0) < -0.06, 'still toe-up just after the heel is down: ' + footRoll(0.06, 0, 1, 0));
  // The run: a shorter stance, so the push comes sooner and the strike lands flatter.
  assert.ok(footRoll(0.18, 0.05, 0.6, 1) > 0.2, 'run push-off at 0.18: ' + footRoll(0.18, 0.05, 0.6, 1));
  assert.ok(footRoll(0.5, 0.2, 0, 1) < 0.15, 'the run swing hangs the toe less: ' + footRoll(0.5, 0.2, 0, 1));
  assert.ok(footRoll(0, 0, 1, 1) > footRoll(0, 0, 1, 0), 'the run lands flatter');
});

test('the pelvis sits over the planted foot and the legs keep the boots where they are', () => {
  const L = 0.52;
  const atL = gaitExtras(F.swayMid.walk, 0, null, L), atR = gaitExtras(F.swayMid.walk + 0.5, 0, null, L);
  assert.ok(atL.swayX < -0.015, 'over the left foot (-x): ' + atL.swayX);
  assert.ok(atR.swayX > 0.015, 'over the right foot: ' + atR.swayX);
  assert.ok(Math.abs(atL.legZ * L + atL.swayX) < 1e-9, 'the legs counter the shift exactly');
  const run = gaitExtras(F.swayMid.run, 1, null, L);
  assert.ok(Math.abs(run.swayX) < Math.abs(atL.swayX), 'less sway at a run');
  assert.ok(atL.chestRoll > 0 && atR.chestRoll < 0, 'the shoulder over the planted foot settles: ' + atL.chestRoll);
});

test('the hips turn with the stride and the chest and the thighs scissor back', () => {
  const g0 = gaitExtras(0, 0, null), g5 = gaitExtras(0.5, 0, null);
  assert.ok(g0.pelvisYaw > 0.04 && g5.pelvisYaw < -0.04, 'the left hip forward at the left strike, the right at the right');
  assert.ok(Math.sign(g0.chestYaw) === -Math.sign(g0.pelvisYaw) && Math.abs(g0.chestYaw) < Math.abs(g0.pelvisYaw));
  assert.ok(Math.sign(g0.legYaw) === -Math.sign(g0.pelvisYaw) && Math.abs(g0.legYaw) <= Math.abs(g0.pelvisYaw) * 0.5 + 1e-9);
  assert.ok(Math.abs(gaitExtras(0, 1, null).pelvisYaw) > Math.abs(g0.pelvisYaw), 'more at a run');
  // The run's strike is later in the cycle, and the yaw peaks with it.
  const r = gaitExtras(F.strike.run, 1, null);
  assert.ok(r.pelvisYaw > F.pelvisYaw.run - 1e-9, 'the run peaks at its own strike');
  // The feet's own numbers go through to each foot's roll.
  const w = gaitExtras(0.45, 0, { footL: 0.037, footR: 0.02, levelL: 0.9, levelR: 0.9 });
  assert.ok(w.ankleL > 0.18 && Math.abs(w.ankleR) < 0.08, 'left pushing off, right about to land: ' + w.ankleL + ' ' + w.ankleR);
  const m = gaitExtras(0.25, 0, { footL: 0, footR: 0.07, levelL: 1, levelR: 0 });
  assert.ok(Math.abs(m.ankleL) < 0.03 && m.ankleR > 0.08 && m.ankleR < 0.2, 'left flat mid-stance, right swinging: ' + m.ankleL + ' ' + m.ankleR);
});

test('he leans into a start, back against a stop, sideways into a strafe, in his own frame', () => {
  const s = {};
  for (let i = 0; i < 60; i++) leanFromAccel(s, 0, 40, 0, 1 / 60);
  assert.ok(s.fwd > 0.07 && s.fwd <= F.lean.max, 'a hard start forward: ' + s.fwd);
  for (let i = 0; i < 60; i++) leanFromAccel(s, 0, -40, 0, 1 / 60);
  assert.ok(s.fwd < -0.07, 'a stop leans back: ' + s.fwd);
  for (let i = 0; i < 60; i++) leanFromAccel(s, 40, 0, 0, 1 / 60);
  assert.ok(s.side > 0.05 && Math.abs(s.fwd) < 0.02, 'a start toward +x leans toward +x: ' + s.side);
  // Facing +x (yaw pi/2), the same world acceleration is forward.
  const t = {}; for (let i = 0; i < 60; i++) leanFromAccel(t, 40, 0, Math.PI / 2, 1 / 60);
  assert.ok(t.fwd > 0.07 && Math.abs(t.side) < 0.01, 'the lean is in his own frame');
  // Running +z and curving toward +x: the centripetal pull is a lean toward +x.
  const c = {}; for (let i = 0; i < 60; i++) leanFromAccel(c, 20, 0, 0, 1 / 60);
  assert.ok(c.side > 0.03, 'banks into the turn: ' + c.side);
  // Nothing from nothing.
  const z = {}; for (let i = 0; i < 10; i++) leanFromAccel(z, 0, 0, 1.2, 1 / 60);
  assert.ok(Math.abs(z.fwd) < 1e-9 && Math.abs(z.side) < 1e-9);
});
