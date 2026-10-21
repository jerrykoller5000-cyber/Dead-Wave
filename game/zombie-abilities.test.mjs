import test from 'node:test';
import assert from 'node:assert/strict';
import { ABILITY_CONFIG, createRangedAbility, stepRangedAbility, createAcidTrail, sampleAcidTrail, solveBallisticLaunch, stepBallistic, sweptSphereHit, colossusImpactDamage } from './zombie-abilities.js';

const near = (a, b, epsilon = 1e-8) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const point = (x, y = 0, z = 0) => ({ x, y, z });
const ready = kind => ({ ...createRangedAbility(kind, () => 0), remaining: 0 });

test('demon fireball range excludes its charge and respects a clear line', () => {
  for (const distance of [0, 4.5, 16.999, 34.001]) assert.equal(stepRangedAbility(ready('demon'), .01, { distance }).started, false);
  assert.equal(stepRangedAbility(ready('demon'), .01, { distance: 17 }).started, true);
  assert.equal(stepRangedAbility(ready('demon'), .01, { distance: 34 }).started, true);
  assert.equal(stepRangedAbility(ready('demon'), .01, { distance: 25, hasLine: false }).started, false);
  assert.equal(stepRangedAbility(ready('demon'), .01, { distance: 25, blocked: true }).started, false);
});

test('colossus stands outside slam range and telegraphs before throwing', () => {
  const s = ready('colossus');
  assert.equal(stepRangedAbility(s, .01, { distance: 3.6 }).started, false);
  const start = stepRangedAbility(s, .01, { distance: 20 });
  assert.equal(start.started, true); assert.equal(start.fired, false); assert(start.progress > 0);
  const middle = stepRangedAbility(s, 1, { distance: 20 });
  assert.equal(middle.fired, false); assert(middle.progress > .5);
  const end = stepRangedAbility(s, .65, { distance: 20 });
  assert.equal(end.fired, true); assert.equal(end.stage, 'recovery'); assert.equal(s.shots, 1);
});

test('initial and repeated cooldowns are staggered once, with no random reroll each frame', () => {
  let rolls = 0;
  const random = () => { rolls++; return .5; };
  const demon = createRangedAbility('demon', random), colossus = createRangedAbility('colossus', random);
  assert.equal(demon.remaining, 3.5); assert.equal(colossus.remaining, 6); assert.equal(rolls, 2);
  for (let i = 0; i < 20; i++) stepRangedAbility(demon, .01, { distance: 25 }, random);
  assert.equal(rolls, 2);
  stepRangedAbility(demon, 20, { distance: 25 }, random);
  assert.equal(demon.shots, 1); assert.equal(demon.stage, 'cooldown'); assert.equal(demon.remaining, 7); assert.equal(rolls, 3);
});

test('a long frame emits one shot and retains a complete cooldown', () => {
  const s = ready('demon');
  const event = stepRangedAbility(s, 60, { distance: 25 }, () => 0);
  assert(event.started && event.fired); assert.equal(s.shots, 1); assert.equal(event.stage, 'cooldown');
  assert.equal(s.remaining, ABILITY_CONFIG.demon.cooldownMin);
  assert.equal(stepRangedAbility(s, .01, { distance: 25 }).fired, false);
});

test('losing action or line permission cancels one wind-up without a phantom shot', () => {
  for (const permission of [{ canAct: false }, { hasLine: false }, { blocked: true }]) {
    const s = ready('colossus'); stepRangedAbility(s, .1, { distance: 20 });
    const event = stepRangedAbility(s, 20, { distance: 20, ...permission }, () => 0);
    assert(event.cancelled); assert.equal(event.fired, false); assert.equal(s.shots, 0);
    assert.equal(s.remaining, 8);
    assert.equal(stepRangedAbility(s, .1, { distance: 20, ...permission }).cancelled, false);
  }
});

test('crossing a range boundary during the wind-up retains its committed attack', () => {
  const s = ready('demon'); stepRangedAbility(s, .1, { distance: 25 });
  const event = stepRangedAbility(s, 1, { distance: 5 });
  assert(event.fired); assert.equal(event.cancelled, false);
});

test('attack wind-up agrees at 30, 60 and 144 Hz; invalid time cannot fire', () => {
  for (const hz of [30, 60, 144]) {
    const s = ready('demon'), dt = 1 / hz;
    let seconds = 0, fired = false;
    while (!fired && seconds < 2) { fired = stepRangedAbility(s, dt, { distance: 25 }).fired; seconds += dt; }
    assert(fired); assert(seconds >= .85 - 1e-8 && seconds <= .85 + dt + 1e-8);
  }
  const s = ready('demon');
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(stepRangedAbility(s, dt, { distance: 25 }).fired, false);
  assert.equal(s.elapsed, 0);
});

test('acid is deposited per distance, giving identical trails at different frame rates', () => {
  let baseline;
  for (const hz of [30, 60, 144]) {
    const s = createAcidTrail(point(0)), points = [];
    for (let i = 1; i <= hz * 3; i++) points.push(...sampleAcidTrail(s, point(3 * i / hz)));
    assert.equal(points.length, 12);
    points.forEach((p, i) => near(p.x, .75 * (i + 1)));
    if (baseline) points.forEach((p, i) => near(p.x, baseline[i].x)); else baseline = points;
  }
});

test('acid follows corners and interpolates height without flooding while stationary', () => {
  const s = createAcidTrail(point(0));
  assert.deepEqual(sampleAcidTrail(s, point(.5)), []);
  const corner = sampleAcidTrail(s, point(.5, 1, 1));
  assert.equal(corner.length, 2); near(corner[0].x, .5); near(corner[0].z, .25); near(corner[0].y, .25);
  near(corner[1].z, 1); near(corner[1].y, 1);
  for (let i = 0; i < 100; i++) assert.deepEqual(sampleAcidTrail(s, point(.5, 1, 1)), []);
});

test('spawn, teleport and invalid coordinates reset acid sampling without joining distant rooms', () => {
  const s = createAcidTrail();
  assert.deepEqual(sampleAcidTrail(s, point(30)), []);
  sampleAcidTrail(s, point(30.5));
  assert.deepEqual(sampleAcidTrail(s, point(100)), []);
  assert.deepEqual(sampleAcidTrail(s, point(100.5)), []);
  assert.deepEqual(sampleAcidTrail(s, point(100.5, 10)), []);
  assert.deepEqual(sampleAcidTrail(s, point(NaN)), []);
  assert.deepEqual(sampleAcidTrail(s, point(1)), []);
  assert.throws(() => sampleAcidTrail(s, point(2), { spacing: 0 }), RangeError);
});

test('acid samples remain bounded on a large frame', () => {
  const s = createAcidTrail(point(0));
  assert.equal(sampleAcidTrail(s, point(6)).length, 8);
  const capped = createAcidTrail(point(0));
  assert.equal(sampleAcidTrail(capped, point(5), { maxSamples: 2 }).length, 2);
  assert.deepEqual(sampleAcidTrail(capped, point(5)), []);
  assert.equal(ABILITY_CONFIG.spitter.maxActive, 96);
});

test('ballistic launch lands on its fixed target regardless of frame subdivision', () => {
  const origin = point(-4, 3, 2), target = point(19, 1, -8), flightTime = 2.4;
  for (const steps of [1, 24, 144]) {
    const p = { ...origin, ...solveBallisticLaunch(origin, target, flightTime), age: 0 };
    for (let i = 0; i < steps; i++) stepBallistic(p, flightTime / steps);
    near(p.x, target.x); near(p.y, target.y); near(p.z, target.z); near(p.age, flightTime);
  }
  const p = { ...origin, ...solveBallisticLaunch(origin, origin, 1, 0) };
  stepBallistic(p, Infinity, 0); assert.deepEqual(point(p.x, p.y, p.z), origin);
  assert.throws(() => solveBallisticLaunch(origin, target, 0), RangeError);
  assert.throws(() => solveBallisticLaunch(point(NaN), target, 1), RangeError);
});

test('swept collision detects fast crossings and returns the earliest wall or target fraction', () => {
  const start = point(0), end = point(30);
  const wall = sweptSphereHit(start, end, point(10), 2), player = sweptSphereHit(start, end, point(20), 1);
  near(wall, 8 / 30); near(player, 19 / 30); assert(wall < player);
  assert.equal(sweptSphereHit(start, end, point(15, 4), 1), null);
  assert.equal(sweptSphereHit(start, end, point(-10), 1), null);
});

test('swept collision handles zero-length, initial overlap, tangent and invalid input', () => {
  const p = point(2);
  assert.equal(sweptSphereHit(p, p, p, 1), 0);
  assert.equal(sweptSphereHit(p, p, point(10), 1), null);
  near(sweptSphereHit(point(0), point(10), point(5, 1), 1), .5);
  assert.equal(sweptSphereHit(point(0), point(10), point(10), 0), 1);
  assert.equal(sweptSphereHit(point(NaN), point(10), p, 1), null);
  assert.equal(sweptSphereHit(point(0), point(10), p, -1), null);
});

test('boulder raw contact damage is 80% of max health, independent of current health', () => {
  assert.equal(colossusImpactDamage(100), 80); assert.equal(colossusImpactDamage(150), 120);
  assert.equal(colossusImpactDamage(0), 0); assert.equal(colossusImpactDamage(NaN), 0);
});
