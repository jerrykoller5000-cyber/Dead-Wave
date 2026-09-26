// studio/motion-battery.test.mjs — the standard battery, classify and the sweep (D-42). Real three.js
// maths in Node:  node --import ./studio/node-three.mjs --test studio/motion-battery.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTERY, BATTERY_NAMES, FROM, SIDES, OUTCOMES, SWEPT, classify, runBattery, runHit, sweep, marginAt, stanceFor } from './motion-battery.js';
import { presets } from './motion/index.js';
import { rigs, createBody, loadMotion, HIT_KINDS } from './index.js';

test('the battery is the lab\'s seven hits (contract 6): names, kinds, powers, points, three sides', () => {
  const want = {
    rifle: ['bullet', 2.5, 'chest'], 'shotgun-far': ['pellet', 3.2, 'chest'], 'shotgun-close': ['pellet', 6.5, 'chest'],
    machete: ['blade', 3.5, 'chest'], 'brute-swing': ['crush', 4.5, 'shoulderR'], grenade: ['blast', 8, 'pelvis'], kill: ['bullet', 3, 'head']
  };
  assert.deepEqual(BATTERY_NAMES, Object.keys(want));
  for (const b of BATTERY) assert.deepEqual([b.kind, b.power, b.at], want[b.name], b.name);
  assert.ok(BATTERY.find((b) => b.name === 'grenade').up > 0, 'the grenade lifts');
  assert.ok(BATTERY.find((b) => b.name === 'kill').kill);
  assert.deepEqual(SIDES, ['front', 'back', 'side']);
  // The body faces +Z: from the front pushes it back, from behind pushes it on, from the side across.
  assert.deepEqual(FROM.front, [0, 0, -1]); assert.deepEqual(FROM.back, [0, 0, 1]); assert.equal(FROM.side[2], 0);
  for (const k of HIT_KINDS) assert.ok(SWEPT[k] && !SWEPT[k].kill, `the sweep has a hit for ${k}`);
  assert.deepEqual(OUTCOMES, ['none', 'flinch', 'stagger', 'down', 'dead']);
});

test('classify reads the events alone, in any of their shapes', () => {
  assert.equal(classify([]), 'none');
  assert.equal(classify(['wake', 'hit', 'recovered']), 'flinch');
  assert.equal(classify([['wake'], ['hit', { kind: 'bullet', power: 2.5 }], ['recovered']]), 'flinch');
  assert.equal(classify([[0.02, 'wake'], [0.02, 'hit'], [0.3, 'stagger'], [0.6, 'step', { foot: 'footL' }], [1, 'recovered']]), 'stagger');
  assert.equal(classify(['wake', 'hit', 'stagger', 'step', 'fall', 'land', 'down', 'getup', 'recovered']), 'down', 'a fall after a step is down');
  assert.equal(classify(['wake', 'hit', 'fall']), 'down', 'falling is down, before it lands');
  assert.equal(classify(['wake', 'hit', 'fall', 'dead', 'settled']), 'dead');
  assert.equal(classify([{ name: 'wake' }, { name: 'step' }]), 'stagger');
});

test('the shambler from the front: a flinch, a stagger, a knockdown, a throw and a kill, with the numbers to match', () => {
  const r = runBattery('zombie/shambler', { from: ['front'] });
  assert.equal(r.preset, 'zombie/shambler'); assert.equal(r.version, presets.json('zombie/shambler').version || 1);
  assert.deepEqual(r.build, { type: 'shambler', scale: 1 });
  const by = Object.fromEntries(r.runs.map((x) => [x.hit, x]));
  assert.deepEqual(r.runs.map((x) => x.hit), BATTERY_NAMES);
  assert.deepEqual(Object.fromEntries(r.runs.map((x) => [x.hit, x.outcome])),
    { rifle: 'flinch', 'shotgun-far': 'stagger', 'shotgun-close': 'down', machete: 'stagger', 'brute-swing': 'down', grenade: 'down', kill: 'dead' });
  for (const x of r.runs) {
    assert.ok(!x.bad, `${x.hit}: nothing went NaN`);
    assert.equal(x.from, 'front');
    if (x.outcome === 'dead') assert.ok(x.settled && x.time > 0.5 && x.time < 8, `${x.hit} settles (${x.time})`);
    else assert.ok(x.recovered && x.time > 0.1 && x.time < 8, `${x.hit} is itself again within the run (${x.time})`);
    assert.equal(x.events[0][1], 'wake');
    assert.ok(x.lowest.y > -0.05, `${x.hit}: nothing goes through the floor (${x.lowest.point} ${x.lowest.y})`);
  }
  assert.equal(by.rifle.steps, 0); assert.ok(by['shotgun-far'].steps >= 1);
  assert.equal(by.rifle.fell, null, 'a body that stays up has no lie');
  // A flinch barely moves it; a knockdown puts the chest near the floor; a grenade throws it metres.
  assert.ok(by.rifle.chest < 0.1 && by.rifle.moved < 0.02, JSON.stringify(by.rifle));
  assert.ok(by['shotgun-far'].moved > 0.05 && by['shotgun-far'].along > 0.05, 'a stagger steps back the way it was pushed');
  assert.ok(by['shotgun-close'].drop > 0.6 && by['shotgun-close'].lowest.y < 0.2, JSON.stringify(by['shotgun-close']));
  assert.ok(by.grenade.moved > 1 && by.grenade.along > 1, `a grenade throws it (${by.grenade.moved} m)`);
  assert.ok(by.kill.drop > 1 && Number.isFinite(by.kill.fell));
  // Get-up order and the times on the events are from the hit.
  const names = by['shotgun-close'].events.map((e) => e[1]);
  for (const [a, b] of [['fall', 'down'], ['down', 'getup'], ['getup', 'recovered']]) assert.ok(names.indexOf(a) < names.indexOf(b), names.join(' '));
  assert.equal(by['shotgun-close'].times.recovered, by['shotgun-close'].time);
  assert.ok(by['shotgun-far'].offBalance > loadMotion(presets.json('zombie/shambler')).balance.step, 'it stepped because it was off balance');
});

test('the brute shrugs off the shells that drop a shambler, from every side', () => {
  const r = runBattery('zombie/brute', { hits: ['shotgun-close'] });
  assert.deepEqual(r.build, { type: 'brute', scale: 1.38 });
  assert.deepEqual(r.runs.map((x) => `${x.from}:${x.outcome}`), ['front:flinch', 'back:flinch', 'side:flinch']);
});

test('the battery replays exactly: the same numbers and events every run', () => {
  const a = runBattery('zombie/feral', { hits: ['shotgun-far', 'kill'], from: ['side'] });
  const b = runBattery('zombie/feral', { hits: ['shotgun-far', 'kill'], from: ['side'] });
  assert.deepEqual(a, b);
});

test('it takes a preset object, exact entries and custom hits; mistakes come back as sentences', () => {
  const json = structuredClone(presets.json('zombie/shambler'));
  json.hits.pellet.knockdown = 20;           // the close shell no longer drops it at once
  const r = runBattery(json, { entries: [{ hit: 'shotgun-close', from: 'back' }, { hit: 'rifle' }] });
  assert.deepEqual(r.runs.map((x) => [x.hit, x.from]), [['shotgun-close', 'back'], ['rifle', 'front']]);
  assert.notEqual(r.runs[0].outcome, 'dead');
  const one = runHit('zombie/shambler', { kind: 'pellet', power: 0.5, at: 'chest', from: 'side' });
  assert.equal(one.hit, null); assert.equal(one.outcome, 'flinch');
  assert.throws(() => runBattery('zombie/nobody'), /no motion preset "zombie\/nobody"/);
  assert.throws(() => runBattery('zombie/shambler', { hits: ['bazooka'] }), /"bazooka" is not a battery hit \(rifle, /);
  assert.throws(() => runBattery('zombie/shambler', { entries: [{ hit: 'rifle', from: 'above' }] }), /"from" is one of front, back, side/);
  assert.throws(() => runHit('zombie/shambler', { kind: 'laser', power: 3 }), /hit kind "laser": kinds are bullet/);
  assert.throws(() => runHit('zombie/shambler', { kind: 'bullet', power: -1 }), /power must be a number from 0/);
});

test('a body is built as the game builds that zombie, and stood on its idle with its boots on the floor', () => {
  assert.deepEqual(stanceFor(presets.json('zombie/feral')).create, { type: 'feral', scale: 0.88 });
  assert.deepEqual(stanceFor(presets.json('zombie/brute'), { create: { scale: 1 } }).create, { type: 'brute', scale: 1 });
  assert.deepEqual(stanceFor({ ...presets.json('zombie/shambler'), name: 'newcomer' }).create, { type: 'shambler', scale: 1 });
  assert.equal(stanceFor(presets.json('marine/marine')).clip, 'marine/stand');
  assert.equal(stanceFor(presets.json('zombie/shambler'), { stand: null }).clip, null);
  // Standing, its lowest point that isn't a foot is a knee, about 0.4 m up (the lab's view).
  const r = runHit('zombie/shambler', 'rifle');
  assert.ok(r.lowest.y > 0.3 && r.lowest.y < 0.5 && /^knee/.test(r.lowest.point), JSON.stringify(r.lowest));
});

test('the sweep finds where a shell turns a flinch into a stagger and a stagger into a fall', () => {
  const s = sweep('zombie/shambler', { kinds: ['pellet'] }).sweeps[0];
  assert.equal(s.kind, 'pellet'); assert.equal(s.at, 'chest'); assert.equal(s.from, 'front');
  assert.deepEqual(s.bands.map((b) => b.outcome), ['flinch', 'stagger', 'down']);
  assert.ok(s.monotone);
  const [, st, dn] = s.bands;
  assert.ok(st.from > 2.5 && st.from < 3.2, `the far shell (3.2) staggers it, a rifle's worth (2.5) doesn't: ${st.from}`);
  assert.equal(dn.from, 5.5, 'past the knockdown (5.5 / scale 1 × mass 1) it always falls');
  assert.equal(s.knockdown, 5.5);
  // Either side of the edge the battery agrees, to the sweep's tolerance.
  assert.equal(runHit('zombie/shambler', { kind: 'pellet', power: st.from - 0.03, at: 'chest' }).outcome, 'flinch');
  assert.equal(runHit('zombie/shambler', { kind: 'pellet', power: st.from, at: 'chest' }).outcome, 'stagger');
  const m = marginAt(s, 3.2);
  assert.equal(m.outcome, 'stagger');
  assert.equal(m.lower.outcome, 'flinch'); assert.ok(Math.abs(m.lower.by - (3.2 - st.from)) < 1e-3);
  assert.equal(m.upper.outcome, 'down'); assert.ok(Math.abs(m.upper.by - 2.3) < 1e-3);
  assert.deepEqual(marginAt(s, 0.5).lower, null);
});

test('margins read either side of a band that goes back down the scale; a kind that never changes has one band', () => {
  const s = { bands: [{ outcome: 'flinch', from: 0 }, { outcome: 'down', from: 2 }, { outcome: 'stagger', from: 2.5 }] };
  assert.deepEqual(marginAt(s, 2.2), { outcome: 'down', lower: { outcome: 'flinch', at: 2, by: 0.2 }, upper: { outcome: 'stagger', at: 2.5, by: 0.3 } });
  const b = sweep('zombie/brute', { kinds: ['blade'], max: 8, step: 2 }).sweeps[0];
  assert.deepEqual(b.bands, [{ outcome: 'flinch', from: 0 }]);
  assert.equal(b.max, 8);
  assert.ok(b.monotone);
});

test('snap: how hard a body is handed back to its animation, and whether a limb swung or rolled', () => {
  const r = runBattery('zombie/shambler', { hits: ['rifle', 'shotgun-close', 'kill'], from: ['front'] });
  const [rifle, close, kill] = r.runs;
  assert.equal(kill.snap, null, 'the dead never come back');
  for (const x of [rifle, close]) {
    assert.ok(x.snap && x.snap.rad >= 0 && typeof x.snap.joint === 'string' && x.snap.at > 0, JSON.stringify(x.snap));
    assert.ok(x.snap.at <= x.time + 0.26, 'measured up to a quarter second after it recovered');
  }
  // Getting up in 0.05 s instead of the preset's own time throws the pose from lying to standing
  // in three frames: a snap well over 0.3 rad and more than twice the size, and the limbs swing
  // rather than roll. (Twice, not more: an engine whose own get-up is rougher still passes.)
  const json = structuredClone(presets.json('zombie/shambler'));
  json.getup = { ...json.getup, time: 0.05 };
  const fast = runHit(json, 'shotgun-close');
  assert.equal(fast.outcome, 'down');
  assert.ok(fast.snap.rad > 0.5 && fast.snap.rad > 2 * close.snap.rad, `${fast.snap.rad} against ${close.snap.rad}`);
  assert.ok(fast.snap.swing > fast.snap.rad / 3, `a swing, not a roll: ${JSON.stringify(fast.snap)}`);
});

test('options reach the body: a far body (lod) and lost limbs, when the engine has them', () => {
  // lod is passed to body.update; an engine without it ignores it and plays the same.
  const near = runHit('zombie/shambler', 'shotgun-far');
  const far = runHit('zombie/shambler', 'shotgun-far', { lod: 1 });
  assert.equal(far.outcome, near.outcome);
  const probe = createBody(rigs.get('zombie').create({}), loadMotion(presets.json('zombie/shambler')));
  if (typeof probe.lose === 'function') {
    const r = runHit('zombie/shambler', 'rifle', { lose: ['legL'] });
    assert.equal(r.outcome, 'down', 'a body that loses a leg standing falls (contract 3)');
  } else {
    assert.throws(() => runHit('zombie/shambler', 'rifle', { lose: ['legL'] }), /no body\.lose \(lost limbs, contract 3\)/);
  }
});
