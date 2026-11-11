// node --test core/body-limits.test.mjs   (CB-289: the third person's arm limits; rule 25, D-139)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { elbowBend, ARM_LIMITS, BODY_EXCEPTIONS, DEG, wristAngles, wristOver, clampWrist, clampElbowHinge, wristInside, exceptionOver } from './body-limits.js';

const qAxis = (ax, a) => { const l = Math.hypot(...ax), s = Math.sin(a / 2); return { x: ax[0] / l * s, y: ax[1] / l * s, z: ax[2] / l * s, w: Math.cos(a / 2) }; };
const mul = (a, b) => ({ x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z });
let seed = 289; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const randQ = () => { const u = [rnd(), rnd(), rnd()];
  return { x: Math.sqrt(1 - u[0]) * Math.sin(2 * Math.PI * u[1]), y: Math.sqrt(1 - u[0]) * Math.cos(2 * Math.PI * u[1]),
    z: Math.sqrt(u[0]) * Math.sin(2 * Math.PI * u[2]), w: Math.sqrt(u[0]) * Math.cos(2 * Math.PI * u[2]) }; };
const close = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);

test('the table is the card\'s numbers and the first person\'s (game/viewmodel.js WRIST_LIMITS)', () => {
  close(ARM_LIMITS.wrist.flex, 75 * DEG, 1e-9, 'flex 75'); close(ARM_LIMITS.wrist.ext, 70 * DEG, 1e-9, 'ext 70');
  close(ARM_LIMITS.wrist.radial, 20 * DEG, 1e-9, 'radial 20'); close(ARM_LIMITS.wrist.ulnar, 35 * DEG, 1e-9, 'ulnar 35');
  close(ARM_LIMITS.twist, 85 * DEG, 1e-9, 'twist 85'); close(ARM_LIMITS.elbow[0], 0, 0, 'elbow 0'); close(ARM_LIMITS.elbow[1], 150 * DEG, 1e-9, 'elbow 150');
  const vm = fs.readFileSync(new URL('../game/viewmodel.js', import.meta.url), 'utf8');
  const m = vm.match(/WRIST_LIMITS\s*=\s*\{\s*flex:\s*([\d.]+),\s*ext:\s*([\d.]+),\s*radial:\s*([\d.]+),\s*ulnar:\s*([\d.]+)/);
  assert.ok(m, 'viewmodel.js has WRIST_LIMITS');
  const [flex, ext, radial, ulnar] = m.slice(1).map(Number);
  for (const [k, v] of Object.entries({ flex, ext, radial, ulnar })) close(ARM_LIMITS.wrist[k], v, 0.006, 'the first person\'s ' + k);
});

test('BODY_EXCEPTIONS lists the support hand on a vertical foregrip or a pump, and nothing else', () => {
  assert.equal(BODY_EXCEPTIONS.length, 1, 'exactly one exception: ' + BODY_EXCEPTIONS.map((e) => e.id).join(', '));
  const e = BODY_EXCEPTIONS[0];
  assert.equal(e.id, 'support-foregrip');
  assert.deepEqual([...e.joints].sort(), ['twist', 'wrist']);
  assert.equal(e.side, 'support');
  close(e.over, 60 * DEG, 1e-9, 'up to 60 deg over the table');
  assert.match(e.when, /foregrip/); assert.match(e.when, /pump/);
  assert.ok(e.reason && e.reason.length > 20, 'it says why');
  assert.ok(Object.isFrozen(BODY_EXCEPTIONS) && Object.isFrozen(e), 'frozen: nothing adds one at run time');
  assert.equal(exceptionOver('support-foregrip', 'wrist'), e.over);
  assert.equal(exceptionOver('support-foregrip', 'elbow'), 0, 'the elbow gets no allowance');
  assert.equal(exceptionOver(null, 'wrist'), 0); assert.equal(exceptionOver('anything-else', 'wrist'), 0);
});

test('the angles read the way a wrist bends: flexion toward the palm (+z), radial toward the thumb (+x * side)', () => {
  // the hand turned toward its palm: its fingers (-y) swing toward +z, so the forearm leans toward the palm, seen from it
  const f = wristAngles(qAxis([-1, 0, 0], 0.5), 1);
  close(f.flex, 0.5, 1e-9, 'flex'); close(f.dev, 0, 1e-9, 'no dev'); close(f.twist, 0, 1e-9, 'no twist');
  const e = wristAngles(qAxis([1, 0, 0], 0.4), 1); close(e.flex, -0.4, 1e-9, 'extension: the fingers toward the back of the hand');
  // toward the thumb (+x on the right hand: studio/marine-hand.js puts the thumb and the index at +x * s): the fingers
  // swing toward +x, about +z
  const r = wristAngles(qAxis([0, 0, 1], 0.3), 1); close(r.dev, 0.3, 1e-9, 'radial, right'); close(r.flex, 0, 1e-9, 'no flex');
  const rl = wristAngles(qAxis([0, 0, -1], 0.3), -1); close(rl.dev, 0.3, 1e-9, 'radial, left (mirrored)');
  const t = wristAngles(qAxis([0, 1, 0], 0.7), 1); close(t.twist, 0.7, 1e-9, 'twist'); close(t.flex, 0, 1e-9, 'twist bends nothing');
  // a twist after a bend leaves the bend as it was
  const tb = wristAngles(mul(qAxis([0, 1, 0], 0.6), qAxis([-1, 0, 0], 0.5)), 1);
  close(tb.flex, 0.5, 1e-9, 'bend kept'); close(tb.twist, 0.6, 1e-9, 'twist kept');
});

test('inside the table nothing moves; past it, the wrist comes back onto the edge, keeping its direction', () => {
  for (const [ax, a] of [[[-1, 0, 0], 1.0], [[1, 0, 0], 1.0], [[0, 0, 1], 0.3], [[0, 0, -1], 0.5], [[0, 1, 0], 1.2]]) {
    const q = qAxis(ax, a), q0 = { ...q };
    const r = clampWrist(q, 1, 0, null);
    assert.equal(r.held, null, 'inside: untouched ' + ax + ' ' + a);
    for (const k of 'xyzw') close(q[k], q0[k], 1e-9, 'unchanged ' + k);
  }
  const q = qAxis([-1, 0, 0], 2.0);   // 115 deg toward the palm
  const r = clampWrist(q, 1, 0, null);
  assert.ok(r.held, 'held');
  const a = wristAngles(q, 1);
  close(a.flex, ARM_LIMITS.wrist.flex, 1e-4, 'on the flexion limit'); close(a.dev, 0, 1e-6, 'no sideways bend added');
  const q2 = qAxis([0, 0, 1], 0.8);   // 46 deg toward the thumb
  clampWrist(q2, 1, 0, null); close(wristAngles(q2, 1).dev, ARM_LIMITS.wrist.radial, 1e-4, 'on the radial limit');
});

test('the forearm\'s roll and the wrist\'s twist together stay inside 85 deg', () => {
  const q = qAxis([0, 1, 0], 1.2);
  clampWrist(q, 1, 0.6, null);
  close(wristAngles(q, 1).twist, ARM_LIMITS.twist - 0.6, 1e-6, 'roll 0.6: the wrist keeps 0.88 rad');
  const q2 = qAxis([0, 1, 0], -1.2);
  clampWrist(q2, 1, 0.6, null);
  close(wristAngles(q2, 1).twist, -1.2, 1e-6, 'the other way round, 0.6 - 1.2 is inside: kept');
  const q3 = qAxis([0, 1, 0], -1.2);
  clampWrist(q3, 1, -0.6, null);
  close(wristAngles(q3, 1).twist, -(ARM_LIMITS.twist - 0.6), 1e-6, 'roll -0.6: -0.88');
});

test('the support-foregrip exception allows up to 60 deg more on the wrist and the twist, and no more', () => {
  const over = 60 * DEG;
  const q = qAxis([-1, 0, 0], ARM_LIMITS.wrist.flex + 0.5);   // 29 deg past
  const r = clampWrist(q, -1, 0, 'support-foregrip');
  assert.equal(r.held, null, 'inside the allowance: untouched');
  const q2 = qAxis([-1, 0, 0], ARM_LIMITS.wrist.flex + 1.5);  // 86 deg past
  clampWrist(q2, -1, 0, 'support-foregrip');
  close(wristAngles(q2, -1).flex, ARM_LIMITS.wrist.flex + over, 1e-4, 'held at the table + 60');
  const q3 = qAxis([0, 1, 0], 2.5);
  clampWrist(q3, -1, 0.3, 'support-foregrip');
  close(wristAngles(q3, -1).twist, ARM_LIMITS.twist + over - 0.3, 1e-6, 'twist: the table + 60 with the roll');
  const q4 = qAxis([-1, 0, 0], ARM_LIMITS.wrist.flex + 0.5);
  clampWrist(q4, -1, 0, null);
  close(wristAngles(q4, -1).flex, ARM_LIMITS.wrist.flex, 1e-4, 'without the exception the same bend is held at the table');
});

test('any turn at all comes out inside the table (2000 random turns, each side, with and without the exception)', () => {
  for (const side of [1, -1]) for (const ex of [null, 'support-foregrip']) for (let i = 0; i < 2000; i++) {
    const q = randQ(), roll = (rnd() - 0.5) * 1.6;
    clampWrist(q, side, roll, ex);
    const w = wristInside(q, side, roll, ex, 0.002);
    assert.ok(w.ok, `side ${side} ${ex} #${i}: flex ${w.flex.toFixed(3)} dev ${w.dev.toFixed(3)} twist ${w.twist.toFixed(3)} roll ${roll.toFixed(3)} over ${w.over.toFixed(3)}`);
    close(Math.hypot(q.x, q.y, q.z, q.w), 1, 1e-9, 'unit');
  }
});

test('the elbow: 0 to 150 deg, never backwards', () => {
  close(clampElbowHinge(-0.8), -0.8, 0, 'a natural bend kept');
  close(clampElbowHinge(0.3), 0, 0, 'backwards: straight');
  close(clampElbowHinge(-3.0), -150 * DEG, 1e-12, 'past 150: 150');
  // the rig's forearm leans 0.4 rad forward at hinge 0: straight is hinge 0.4, 150 deg is hinge 0.4 - 2.618
  close(clampElbowHinge(0.3, 0.4), 0.3, 1e-12, 'a forearm that leans forward may straighten past hinge 0'); close(clampElbowHinge(0.6, 0.4), 0.4, 1e-12, 'but not past straight');
  close(clampElbowHinge(-2.5, 0.4), 0.4 - 150 * DEG, 1e-12, '150 deg counted from its lean');
  assert.ok(wristOver(0, 0) === 0); close(elbowBend(-0.5, 0.4), 0.9, 1e-12, 'bend = lean - hinge');
});

test('CB-291: the trunk, limb and hinge holds put a pose back inside its row and leave one inside untouched', async () => {
  const { BODY_LIMITS: L, clampTrunk, clampLimb, clampHinge, trunkAngles, limbAngles, hingeAngle, outside } = await import('./body-limits.js');
  for (let i = 0; i < 1500; i++) {
    const q = randQ();
    clampTrunk(q, L.spine); assert.deepEqual(outside(L.spine, trunkAngles(q), 1e-6), [], 'spine #' + i);
    const n = randQ(); clampTrunk(n, L.neck); assert.deepEqual(outside(L.neck, trunkAngles(n), 1e-6), [], 'neck #' + i);
    for (const side of [1, -1]) { const h = randQ(); clampLimb(h, side, L.hip); assert.deepEqual(outside(L.hip, limbAngles(h, side), 1e-6), [], 'hip #' + i); }
    const k = randQ(); clampHinge(k, L.knee.bend); assert.deepEqual(outside(L.knee, { bend: hingeAngle(k) }, 1e-6), [], 'knee #' + i);
  }
  const inside = qAxis([1, 0, 0], 0.3), keep = { ...inside };
  assert.deepEqual(clampTrunk(inside, L.spine), []); for (const c of 'xyzw') close(inside[c], keep[c], 1e-12, 'untouched ' + c);
  const hip = qAxis([-1, 0, 0], 0.5), hk = { ...hip };   // the thigh 29 deg forward
  assert.deepEqual(clampLimb(hip, 1, L.hip), []); for (const c of 'xyzw') close(hip[c], hk[c], 1e-12, 'hip untouched ' + c);
  const back = qAxis([0, 0, 1], 0); const kn = qAxis([1, 0, 0], -0.4);   // a knee bent backwards
  assert.deepEqual(clampHinge(kn, L.knee.bend), ['bend']); close(hingeAngle(kn), 0, 1e-12, 'straight'); void back;
  const far = qAxis([-1, 0, 0], 2.6);   // the thigh 149 deg forward
  clampLimb(far, 1, L.hip); close(limbAngles(far, 1).flex, L.hip.flex[1], 1e-9, 'held at 125');
});

test('CB-291: the shoulder reads its turn from where the elbow points (its hinge); shoulderHold puts any arm back inside its row', async () => {
  const { BODY_LIMITS: L, shoulderAngles, shoulderPast, shoulderHold } = await import('./body-limits.js');
  const D = Math.PI / 180;
  // hanging, the hinge along +x (the elbow bends forward): no turn; the hinge along +z (the forearm across him): 90 deg in
  close(shoulderAngles([0, -1, 0], [1, 0, 0], 1).turn, 0, 1e-9, 'hanging, bending forward');
  close(shoulderAngles([0, -1, 0], [0, 0, 1], 1).turn, 90 * D, 1e-9, 'right arm (+x), forearm across');
  close(shoulderAngles([0, -1, 0], [0, 0, -1], -1).turn, 90 * D, 1e-9, 'left arm (-x), forearm across');
  close(shoulderAngles([0, 0, 1], [1, 0, 0], 1).turn, 0, 1e-9, 'raised forward, the forearm would bend up');
  assert.equal(shoulderAngles([0, 1, 0], [1, 0, 0], 1).turn, null, 'straight up: no turn');
  close(shoulderAngles([0, 0, -1], [1, 0, 0], 1).back, 90 * D, 1e-9, 'straight back');
  close(shoulderAngles([-1, 0, 0], [0, 0, 1], 1).across, 90 * D, 1e-9, 'right arm straight across');
  const rotv = (q, v) => { const { x, y, z, w } = q; const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]); return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)]; };
  for (let i = 0; i < 3000; i++) for (const side of [1, -1]) {
    const q = randQ();
    shoulderHold(q, [0, -0.28, 0], side);
    const a = shoulderAngles(rotv(q, [0, -0.28, 0]), rotv(q, [1, 0, 0]), side);
    assert.ok(shoulderPast(a, L.shoulder) < 1e-6, 'held #' + i + ' ' + JSON.stringify(a));
  }
  const inside = qAxis([1, 0, 0], -0.6), keep = { ...inside };   // the arm 34 deg forward: inside
  assert.deepEqual(shoulderHold(inside, [0, -0.28, 0], 1), []);
  for (const c of 'xyzw') close(inside[c], keep[c], 1e-12, 'untouched ' + c);
});
