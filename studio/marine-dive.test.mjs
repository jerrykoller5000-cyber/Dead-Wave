// studio/marine-dive.test.mjs — CL-193: the shootdodge's state, flight, slow motion and meter, and the lie of the body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DIVE, createDive, startDive, stepDive, diveTimeScale, diveLie, diveBasis, diveKill, canDive, diveBusy, endDive } from './marine-dive.js';

// Fly a dive over flat ground the way index.html does: game time = real time x the dive's own scale.
function fly(d, { steer = [0, 0], frames = 2000, rdt = 1 / 60, wantUpAt = Infinity } = {}) {
  let y = 0, vy = startDive(d, 0, 1).vy, x = 0, z = 0, real = 0, landReal = null, upReal = null, minK = 1;
  for (let i = 0; i < frames; i++) {
    const k = diveTimeScale(d), dt = rdt * k; minK = Math.min(minK, k); real += rdt;
    const grounded = y <= 0 && vy <= 0;
    const ev = stepDive(d, dt, rdt, { grounded, steerX: steer[0], steerZ: steer[1], wantUp: real >= wantUpAt });
    if (ev === 'land') landReal = real;
    if (ev === 'up') upReal = real;
    if (d.phase === 'air' || d.phase === 'down') { x += d.vx * dt; z += d.vz * dt; }
    if (!grounded || d.phase === 'air') { vy -= DIVE.gravity * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0; }
    if (d.phase === 'idle' && i > 5) break;
  }
  return { x, z, landReal, upReal, minK, real };
}

test('a dive flies about 5 m in slow motion, lands, lies, gets up and cools down', () => {
  const d = createDive();
  const r = fly(d);
  assert.ok(r.z > 4.5 && r.z < 6.5, 'travel ' + r.z.toFixed(2));
  assert.ok(Math.abs(r.x) < 1e-9, 'straight with no steering');
  assert.ok(r.minK < DIVE.slow + 0.01, 'slowed to ' + r.minK.toFixed(3));
  assert.ok(r.landReal > 2 && r.landReal < 3.2, 'about 2.5 real seconds in the air: ' + r.landReal.toFixed(2));
  assert.ok(Math.abs(r.upReal - r.landReal - DIVE.downMax) < 0.05, 'up on his own after downMax');
  assert.equal(d.phase, 'idle'); assert.ok(d.cd > 0 && !canDive(d), 'a short cooldown');
  assert.ok(diveTimeScale(d) > 0.999, 'time back to normal');
});

test('a move key gets him up early, but not before downMin', () => {
  const d = createDive();
  const r = fly(d, { wantUpAt: 0 });
  assert.ok(Math.abs(r.upReal - r.landReal - DIVE.downMin) < 0.05, 'up at downMin: ' + (r.upReal - r.landReal).toFixed(2));
});

test('steering bends the flight and keeps the speed in range', () => {
  const d = createDive();
  const r = fly(d, { steer: [1, 0] });
  assert.ok(r.x > 0.5, 'drifted toward the held key: ' + r.x.toFixed(2));
  const e = createDive(); startDive(e, 0, 1);
  for (let i = 0; i < 200; i++) stepDive(e, 1 / 60, 1 / 60, { steerX: 0, steerZ: -1 });
  assert.ok(Math.hypot(e.vx, e.vz) >= DIVE.speedMin - 1e-9, 'never stalls in the air');
});

test('the meter pays for slow motion; empty, the dive is at full speed; it refills idle and with kills', () => {
  const d = createDive();
  fly(d); const after1 = d.meter;
  assert.ok(after1 < 0.75 && after1 > 0.35, 'one dive costs a good part of it: ' + after1.toFixed(2));
  d.meter = 0.05; d.cd = 0;
  const r = fly(d);
  assert.ok(r.minK > 0.999, 'no slow motion on an empty meter');
  const m = d.meter; for (let i = 0; i < 600; i++) stepDive(d, 1 / 60, 1 / 60, {});
  assert.ok(d.meter > m + 0.2, 'refills while idle: ' + m.toFixed(2) + ' -> ' + d.meter.toFixed(2));
  const k = d.meter; diveKill(d); assert.ok(Math.abs(d.meter - Math.min(1, k + DIVE.meter.kill)) < 1e-9, 'a kill tops it up');
});

test('a dive with slow: false (a timed range drill) has no bullet time and costs no meter', () => {
  const d = createDive(); startDive(d, 0, 1, { slow: false });
  assert.equal(d.slow, false); assert.equal(d.meter, 1, 'nothing charged at take-off');
  let minK = 1; for (let i = 0; i < 120; i++) { stepDive(d, 1 / 60, 1 / 60, {}); minK = Math.min(minK, diveTimeScale(d)); }
  assert.ok(minK > 0.999, 'full speed: ' + minK.toFixed(3)); assert.equal(d.meter, 1, 'nothing drained');
  const e = createDive(); startDive(e, 0, 1); assert.equal(e.slow, true, 'the default still slows');
});

test('the meter running dry mid-flight eases time back to normal', () => {
  const d = createDive(); d.meter = DIVE.meter.min + 0.01;
  const r = fly(d);
  assert.ok(r.minK < 0.6, 'it did slow');
  assert.equal(d.slow, false, 'drained: the slow motion gave out');
});

test('the body lies flat in the air, lower on the way down, flat on the ground, upright again after', () => {
  const d = createDive(); startDive(d, 1, 0);
  assert.equal(diveLie(d, 3.5).flat, 0);
  stepDive(d, DIVE.tip, DIVE.tip, {});
  const top = diveLie(d, 0), down = diveLie(d, -DIVE.lift);
  assert.ok(top.flat > 0.99 && Math.abs(top.hip - DIVE.hip) < 1e-9, 'flat at hip height at the top');
  assert.ok(Math.abs(down.hip - DIVE.hipDown) < 1e-9, 'meets the ground as he lands');
  stepDive(d, 1, 1, { grounded: true });
  assert.equal(d.phase, 'down'); assert.equal(diveLie(d).flat, 1);
  stepDive(d, 1, DIVE.downMax, {});
  assert.equal(d.phase, 'up');
  stepDive(d, DIVE.getUp, DIVE.getUp, {});
  assert.equal(d.phase, 'idle'); assert.equal(diveLie(d).flat, 0);
  endDive(d); assert.ok(!diveBusy(d));
});

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
test('the chest turns to the aim: sideways dive faces it, forward is belly down, backward is on his back', () => {
  for (const [dir, aim] of [[[1, 0], [0, 0, 1]], [[-1, 0], [0, 0.2, 1]], [[0, 1], [0, 0, 1]], [[0, -1], [0, 0, 1]], [[0.6, 0.8], [-1, 0, 0.3]]]) {
    const b = diveBasis(dir[0], dir[1], aim[0], aim[1], aim[2]);
    assert.ok(Math.abs(Math.hypot(b.u.x, b.u.y, b.u.z) - 1) < 1e-9 && Math.abs(Math.hypot(b.f.x, b.f.y, b.f.z) - 1) < 1e-9, 'unit');
    assert.ok(Math.abs(dot(b.u, b.f)) < 1e-9, 'square');
    assert.ok(b.u.x * dir[0] + b.u.z * dir[1] > 0.9, 'head along the dive');
  }
  const side = diveBasis(1, 0, 0, 0, 1);
  assert.ok(side.f.z > 0.95, 'diving sideways he faces the target: ' + JSON.stringify(side.f));
  const fwd = diveBasis(0, 1, 0, 0, 1);
  assert.ok(fwd.f.y < -0.8, 'diving at the target: belly down ' + fwd.f.y.toFixed(2));
  const back = diveBasis(0, -1, 0, 0, 1);
  assert.ok(back.f.y > 0.8, 'diving away from it: on his back ' + back.f.y.toFixed(2));
});
