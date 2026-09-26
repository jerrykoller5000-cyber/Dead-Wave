// studio/motion.test.mjs — reacting bodies (D-42). Real three.js maths in Node:
//   node --import ./studio/node-three.mjs --test studio/motion.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { rigs, loadMotion, validateMotion, createBody, createMotionPool, loadScene, createScene, HIT_KINDS } from './index.js';
import { presets } from './motion/index.js';

const clipOf = (r) => JSON.parse(fs.readFileSync(new URL(`./clips/${r}.json`, import.meta.url), 'utf8'));
const preset = (ref) => loadMotion(presets.json(ref));

// Plays a body for `secs` at 60 fps with an action at 0.5 s; returns what happened.
function play(rig, ref, action, secs = 4, opts = {}) {
  const inst = rigs.get(rig).create(opts.create || {});
  const body = createBody(inst, preset(ref), opts);
  const events = [];
  let minY = Infinity, bad = false;
  body.follow();
  for (let f = 0; f < secs * 60; f++) {
    body.follow();
    if (f === 30) action(body);
    for (const e of body.update(1 / 60, { lod: opts.lod || 0 })) events.push(e[0]);
    body.apply();
    for (const p of Object.values(body.points())) { minY = Math.min(minY, p[1]); if (!p.every(Number.isFinite)) bad = true; }
    inst.group.traverse((o) => { if (o.isObject3D && !(Number.isFinite(o.quaternion.x) && Number.isFinite(o.position.x))) bad = true; });
  }
  return { body, inst, events, minY, bad };
}

test('every preset on disk is valid, and a bad one says what is wrong in sentences', () => {
  for (const ref of presets.names()) assert.deepEqual(validateMotion(presets.json(ref)), [], ref);
  const errs = validateMotion({ format: 'dw-motion/1', name: 'x', rig: 'zombie', tone: { legs: 2 }, hits: { laser: {} }, balance: { step: 0.5, fall: 0.2 } });
  assert.ok(errs.some((e) => /tone\.legs must be a number from 0 to 1/.test(e)), errs.join('; '));
  assert.ok(errs.some((e) => /hit kinds are/.test(e)));
  assert.ok(errs.some((e) => /balance\.fall must be more than balance\.step/.test(e)));
  assert.throws(() => createBody(rigs.get('zombie').create({}), preset('marine/marine')), /is for rig "marine"/);
});

test('an animated body is left alone: follow and apply change nothing until it is hit', () => {
  const inst = rigs.get('zombie').create({});
  const body = createBody(inst, preset('zombie/shambler'));
  const before = new Map();
  inst.group.traverse((o) => before.set(o, o.quaternion.clone()));
  for (let f = 0; f < 30; f++) { body.follow(); assert.deepEqual(body.update(1 / 60), []); body.apply(); }
  inst.group.traverse((o) => assert.ok(o.quaternion.equals(before.get(o))));
  assert.equal(body.state, 'animated');
});

for (const rig of ['zombie', 'marine']) {
  const ref = rig === 'zombie' ? 'zombie/shambler' : 'marine/marine';
  test(`${rig}: woken with no push it stands, and gives itself back to the animation`, () => {
    const r = play(rig, ref, (b) => b.hit({ at: 'chest', dir: [0, 0, -1], power: 0 }), 2);
    assert.ok(!r.bad);
    assert.deepEqual(r.events.filter((e) => ['stagger', 'fall'].includes(e)), []);
    assert.ok(r.events.includes('recovered'), r.events.join(' '));
  });
  test(`${rig}: a rifle round is a flinch; it keeps its feet`, () => {
    const r = play(rig, ref, (b) => b.hit({ at: 'chest', dir: [0, 0, -1], power: 2.5, kind: 'bullet' }), 3);
    assert.ok(!r.events.includes('fall'), r.events.join(' '));
    assert.ok(r.events.includes('recovered'));
  });
  test(`${rig}: a hard shove staggers it a step, and it recovers`, () => {
    const r = play(rig, ref, (b) => b.hit({ at: 'chest', dir: [0, 0, -1], power: 4.5, kind: 'pellet' }), 3);
    assert.ok(r.events.includes('stagger') && r.events.includes('step'), r.events.join(' '));
    assert.ok(!r.events.includes('fall'), r.events.join(' '));
    assert.ok(r.events.includes('recovered'));
  });
  test(`${rig}: a blast puts it down, and it gets up again`, () => {
    const r = play(rig, ref, (b) => b.hit({ at: 'pelvis', dir: [0, 0.3, -1], power: 8, kind: 'blast' }), 5);
    const order = ['fall', 'down', 'getup', 'recovered'].map((e) => r.events.indexOf(e));
    assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), r.events.join(' '));
    assert.equal(r.body.state, 'animated');
    assert.ok(!r.bad);
  });
  test(`${rig}: killed, it goes limp, lies on the ground and settles`, () => {
    const r = play(rig, ref, (b) => b.kill({ at: 'head', dir: [0, 0, -1], power: 3 }), 5);
    assert.ok(r.events.includes('dead') && r.events.includes('settled'), r.events.join(' '));
    const p = r.body.points();
    assert.ok(p.pelvis[1] < 0.3 && p.chest[1] < 0.35, `pelvis ${p.pelvis[1]}, chest ${p.chest[1]}`);
    assert.ok(r.minY > -0.45, `nothing sinks through the floor (lowest ${r.minY.toFixed(2)})`);
    assert.ok(r.body.sleeping);
  });
}

test('the simulated pose is what the rig shows: joints land on their points', () => {
  const r = play('zombie', 'zombie/shambler', (b) => b.kill({ at: 'chest', dir: [1, 0, 0], power: 3 }), 1.2);
  const p = r.body.points(), R = r.inst.R, v = new THREE.Vector3();
  for (const [pt, j] of [['hipL', 'hipL'], ['kneeL', 'kneeL'], ['shoulderR', 'shoulderR'], ['elbowR', 'elbowR'], ['waist', 'spine']]) {
    R[j].getWorldPosition(v);
    assert.ok(v.distanceTo(new THREE.Vector3(...p[pt])) < 0.06, `${j} is ${v.distanceTo(new THREE.Vector3(...p[pt])).toFixed(3)} m off its point`);
  }
});

test('the same hit plays the same way every time (a scene replays exactly)', () => {
  const a = play('zombie', 'zombie/shambler', (b) => b.hit({ at: 'chest', dir: [0.3, 0, -1], power: 5, kind: 'pellet' }), 2).body.points();
  const b = play('zombie', 'zombie/shambler', (b) => b.hit({ at: 'chest', dir: [0.3, 0, -1], power: 5, kind: 'pellet' }), 2).body.points();
  assert.deepEqual(a, b);
});

test('a brute shrugs off what drops a shambler', () => {
  const sh = play('zombie', 'zombie/shambler', (b) => b.hit({ at: 'chest', dir: [0, 0, -1], power: 6.5, kind: 'pellet' }), 3);
  const br = play('zombie', 'zombie/brute', (b) => b.hit({ at: 'chest', dir: [0, 0, -1], power: 6.5, kind: 'pellet' }), 3, { create: { type: 'brute', scale: 1.38 } });
  assert.ok(sh.events.includes('fall'), sh.events.join(' '));
  assert.ok(!br.events.includes('fall') && !br.events.includes('stagger'), br.events.join(' '));
});

test('the pool caps how many bodies simulate; a full pool sleeps the oldest one lying down first', () => {
  const pool = createMotionPool({ max: 2 });
  const make = () => { const b = createBody(rigs.get('zombie').create({}), preset('zombie/shambler'), { pool }); b.follow(); return b; };
  const [a, b, c] = [make(), make(), make()];
  assert.ok(a.kill({ power: 2 }) && b.hit({ power: 2 }));
  assert.equal(pool.active, 2);
  assert.ok(c.hit({ power: 2 }), 'the dead one gives up its slot');
  assert.ok(a.sleeping);
  const d = make();
  assert.equal(d.hit({ power: 2 }), false, 'everyone left is mid-reaction: refused');
});

test('48 reacting zombies cost a few milliseconds a frame', () => {
  const bodies = [];
  for (let i = 0; i < 48; i++) {
    const inst = rigs.get('zombie').create({}); inst.group.position.set(i * 2, 0, 0);
    const b = createBody(inst, preset('zombie/shambler')); b.follow(); b.hit({ power: 4.5, kind: 'pellet' }); bodies.push(b);
  }
  const t0 = performance.now();
  for (let f = 0; f < 60; f++) for (const b of bodies) { b.follow(); b.update(1 / 60); b.apply(); }
  const ms = (performance.now() - t0) / 60;
  console.log(`  48 bodies: ${ms.toFixed(2)} ms a frame`);
  assert.ok(ms < 12, `${ms.toFixed(2)} ms a frame`);
});

test('the review scenes play: every reaction happens where the scene says', () => {
  const run = (name) => {
    const sp = createScene(loadScene(JSON.parse(fs.readFileSync(new URL(`./scenes/${name}.json`, import.meta.url), 'utf8')), clipOf));
    const ev = {};
    while (!sp.done) for (const e of sp.update(1 / 60).events) (ev[e.actor] ||= []).push(e.name.replace('motion:', ''));
    return { sp, ev };
  };
  const { ev, sp } = run('zombie-reactions');
  assert.ok(ev.rifle.includes('recovered') && !ev.rifle.includes('fall'));
  assert.ok(ev.shotgunFar.includes('step') && !ev.shotgunFar.includes('fall'));
  assert.ok(ev.shotgunClose.includes('fall') && ev.shotgunClose.includes('getup'));
  assert.ok(ev.grenade.includes('fall'));
  assert.ok(ev.killed.includes('settled'));
  assert.ok(!ev.brute.includes('fall'));
  assert.equal(Object.values(sp.worst).filter((w) => w.bad).length, 0);
  // seek replays from 0: the same pose at the same time.
  const at = sp.seek(2.1) && sp.actors.shotgunClose.body.points();
  assert.deepEqual(sp.seek(2.1) && sp.actors.shotgunClose.body.points(), at);
  const m = run('marine-knocked').ev;
  assert.ok(m.swiped.includes('step') && !m.swiped.includes('fall'), m.swiped.join(' '));
  assert.ok(m.blasted.includes('down') && m.blasted.includes('recovered'));
});

test('a scene refuses hits without a preset, and a bad hit, in sentences', () => {
  const bad = { format: 'dw-scene/1', name: 'x', length: 1, actors: { z: { rig: 'zombie', at: [0, 0, 0], clips: [[0, 'zombie/idle']], hits: [[0.2, { kind: 'laser', dir: [1, 0] }]] } } };
  assert.throws(() => loadScene(bad, clipOf), (e) => /needs "motion"/.test(e.message) && /"kind" is one of/.test(e.message) && /"dir" is \[x, y, z\]/.test(e.message));
  assert.equal(HIT_KINDS.length, 5);
});

// --- Held, lost, getting up, level of detail (the engine package: contracts 1 to 4) ------------
// What studio/index.js doesn't export yet comes straight from its file.
import { BODY_PARTS } from './motion.js';
import { sceneClipRefs } from './scene.js';
import { loadClip, createPlayer } from './clip.js';

const clipAt = (r) => loadClip(clipOf(r));
// Every simulated point's height over the ground less its own radius (studio/bodies.js): never
// under 0. Only while the body simulates (its points mean nothing before it first wakes), and only
// the parts it still has. Feet stand as deep as the rig's own sole does at rest (the marine's sole
// point is 4 cm under its radius; the engine keeps that depth), so a foot is only held to the ground.
const RADIUS = { pelvis: 0.12, waist: 0.11, chest: 0.13, head: 0.08, crown: 0.12, hipL: 0.09, hipR: 0.09, kneeL: 0.07, kneeR: 0.07, footL: 0, footR: 0, shoulderL: 0.08, shoulderR: 0.08, elbowL: 0.06, elbowR: 0.06, handL: 0.05, handR: 0.05 };
const GONE = { armL: ['elbowL', 'handL'], armR: ['elbowR', 'handR'], legL: ['kneeL', 'footL'], legR: ['kneeR', 'footR'], head: ['head', 'crown'] };
const underGround = (body) => {
  if (!body.awake) return Infinity;
  const skip = new Set(body.lost.flatMap((p) => GONE[p]));
  let m = Infinity;
  for (const [k, v] of Object.entries(body.points())) if (!skip.has(k)) m = Math.min(m, v[1] - RADIUS[k]);
  return m;
};

test('a held body: its point stays on a moving hand, the rest hangs off it, and nothing goes through the ground', () => {
  const inst = rigs.get('marine').create({});
  const body = createBody(inst, preset('marine/held'));
  const player = createPlayer(inst).play(clipAt('marine/stand'), { loop: true });
  const hand = new THREE.Vector3();
  const events = [];
  let worst = 0, under = Infinity, gone = 0;
  for (let f = 0; f < 60 * 5; f++) {
    const t = f / 60;
    player.update(1 / 60);
    body.follow();
    // A hand takes his ankle at 0.5 s, lifts it to 0.7 m and walks off with it at 2 m/s, swinging
    // it side to side, and lets go at 3.2 s.
    hand.set(0.13 + 0.25 * Math.sin(t * 5), 0.1 + Math.min(0.6, Math.max(0, t - 0.5) * 1.5), 0.02 + Math.max(0, t - 0.8) * 2);
    if (f === 30) assert.ok(body.hold('footL', hand), 'the hold takes');
    if (f === 192) assert.ok(body.release('footL'));
    for (const e of body.update(1 / 60)) events.push(e[0]);
    body.apply();
    const p = body.points();
    if (f > 30 && f < 192) worst = Math.max(worst, Math.hypot(p.footL[0] - hand.x, p.footL[1] - hand.y, p.footL[2] - hand.z));
    under = Math.min(under, underGround(body));
    gone = Math.max(gone, Math.hypot(p.pelvis[0], p.pelvis[2]));
    for (const v of Object.values(p)) assert.ok(v.every(Number.isFinite));
  }
  assert.ok(worst < 0.03, `the held point stays within 3 cm of the hand (worst ${worst.toFixed(4)} m)`);
  assert.ok(under > -0.002, `nothing goes through the ground (lowest point ${under.toFixed(4)} m under its radius)`);
  assert.ok(gone > 3, `the body goes with the hand (pelvis ${gone.toFixed(2)} m from where it stood)`);
  for (const e of ['held', 'released', 'fall', 'down', 'getup']) assert.ok(events.includes(e), e + ' in ' + events.join(' '));
  assert.ok(events.indexOf('released') < events.indexOf('fall'), 'let go of, it drops');
});

test('a hold can be a function, is a spring under strength 1, and a lost part can\'t be held', () => {
  const make = () => { const inst = rigs.get('zombie').create({}); const b = createBody(inst, preset('zombie/shambler')); b.follow(); return b; };
  // A hand that takes it by the wrist and walks off at 1.5 m/s.
  const lag = (strength) => {
    const b = make();
    let t = 0, worst = 0;
    b.hold('handR', () => [0.3 + t * 1.5, 1.2, 0.5], { strength });
    for (let f = 0; f < 90; f++) { t = f / 60; b.follow(); b.update(1 / 60); b.apply(); const p = b.points().handR; if (f > 20) worst = Math.max(worst, Math.hypot(p[0] - (0.3 + t * 1.5), p[1] - 1.2, p[2] - 0.5)); }
    assert.equal(b.state, 'held');
    return { worst, went: b.points().pelvis[0] };
  };
  const hard = lag(1), soft = lag(0.4);
  assert.ok(hard.worst < 0.01, 'hard: on the target, ' + hard.worst.toFixed(4));
  // Soft, it trails the hand like a spring, and still pulls the body after it.
  assert.ok(soft.worst > hard.worst * 3, 'soft: trails it, ' + soft.worst.toFixed(3));
  assert.ok(soft.went > 0.4 && hard.went > soft.went, `both pull the body along (hard ${hard.went.toFixed(2)} m, soft ${soft.went.toFixed(2)} m)`);
  const b = make();
  b.lose('armR');
  assert.equal(b.hold('handR', [0, 1, 0]), false);
  assert.throws(() => b.hold('tail', [0, 1, 0]), /no such point/);
});

test('the flop scene: the hand keeps his ankle within 3 cm while it has him, he never goes through the ground, and it seeks the same every time', () => {
  const json = JSON.parse(fs.readFileSync(new URL('./scenes/guardian-grab-drag-flop.json', import.meta.url), 'utf8'));
  const plain = JSON.parse(fs.readFileSync(new URL('./scenes/guardian-grab-drag.json', import.meta.url), 'utf8'));
  assert.equal(plain.actors.marine.motion, undefined, 'the scene the game plays is untouched');
  assert.equal(json.actors.marine.motion, 'marine/held');
  const sc = loadScene(json, clipOf);
  assert.deepEqual(sc.warnings, []);
  const sp = createScene(sc);
  const body = sp.actors.marine.body;
  let worst = 0, at = 0, under = Infinity, heldFrom = null;
  const states = new Set();
  while (!sp.done) {
    const r = sp.update(1 / 60);
    states.add(body.state);
    if (body.holding && heldFrom === null) heldFrom = sp.t;
    under = Math.min(under, underGround(body));
    // From 0.6 s the hold is at its full weight (its tow keys): the hand has him.
    const g = r.checks.gap['guardian.handR>marine.footL'];
    if (sp.t >= 0.6 && body.holding && g && g.value > worst) { worst = g.value; at = sp.t; }
  }
  console.log(`  flop: held from ${heldFrom.toFixed(2)} s, worst grip gap ${(worst * 100).toFixed(1)} cm at ${at.toFixed(2)} s`);
  assert.ok(worst < 0.03, `grip gap ${worst.toFixed(3)} m at ${at.toFixed(2)} s`);
  assert.ok(under > -0.002, 'nothing through the ground: ' + under.toFixed(4));
  assert.ok(Math.abs(heldFrom - 0.42) < 0.03, 'the hand takes him as the tow starts: ' + heldFrom);
  assert.ok(states.has('held') && body.state === 'held', [...states].join(' '));
  assert.ok(body.points().pelvis[2] > 7, 'hauled off with it: ' + body.points().pelvis[2].toFixed(2));
  // The marine adds no failing check of his own (the guardian's are its clips', as in the plain scene).
  assert.deepEqual(Object.values(sp.worst).filter((w) => w.bad && w.key.startsWith('marine')).map((w) => w.kind + ':' + w.key), []);
  // seek replays from 0 in fixed steps: the same body and the same joints every time.
  const snap = () => [JSON.stringify(body.points()), Object.values(sp.actors.marine.inst.R).map((j) => j.quaternion.toArray().map((x) => x.toFixed(9)).join()).join('|')];
  sp.seek(3.1); const a = snap();
  sp.seek(1.2); sp.seek(3.1); const b = snap();
  assert.deepEqual(a, b);
});

test('a lost leg drops a standing body; a lost arm doesn\'t, and a rifle round still only rocks it', () => {
  const leg = play('zombie', 'zombie/shambler', (b) => b.lose('legL'), 4);
  assert.ok(leg.events.includes('lost') && leg.events.includes('fall') && leg.events.includes('down'), leg.events.join(' '));
  assert.ok(underGround(leg.body) > -0.002 && !leg.bad, 'what it has left lies on the ground: ' + underGround(leg.body).toFixed(4));
  const arm = play('zombie', 'zombie/shambler', (b) => { b.lose('armL'); b.hit({ at: 'chest', dir: [0, 0, -1], power: 2.5, kind: 'bullet' }); }, 3);
  assert.ok(!arm.events.includes('fall') && arm.events.includes('recovered'), arm.events.join(' '));
  assert.deepEqual(arm.body.lost, ['armL']);
  // The lost arm doesn't simulate: it rides with its shoulder, as far off it as the animation has it.
  const p = arm.body.points(), a = arm.body.animPoints();
  const far = (q) => Math.hypot(...[0, 1, 2].map((i) => q.handL[i] - q.shoulderL[i]));
  assert.ok(Math.abs(far(p) - far(a)) < 1e-9, 'the hand kept its place off the shoulder');
  // A marine who loses a leg goes down too; a zombie that loses its head and is shot there dies.
  const m = play('marine', 'marine/marine', (b) => b.lose('legR'), 3);
  assert.ok(m.events.includes('fall'), m.events.join(' '));
  const h = play('zombie', 'zombie/shambler', (b) => { b.lose('head'); b.kill({ at: 'head', dir: [0, 0, -1], power: 3 }); }, 4);
  assert.ok(h.events.includes('dead') && h.events.includes('settled') && !h.bad, h.events.join(' '));
  assert.deepEqual(BODY_PARTS, ['armL', 'armR', 'legL', 'legR', 'head']);
  assert.throws(() => leg.body.lose('tail'), /parts are armL, armR, legL, legR, head/);
  // reset() puts it back together.
  leg.body.reset();
  assert.deepEqual(leg.body.lost, []);
});

// A host that plays clips, as the contract has it: on 'getup' it turns the rig's group to the
// heading and plays the preset's clip for that side from its start (at length / getup.time), then
// goes back to its own clip. It takes on the body's drift while the body reacts.
function hostGetsUp(rig, ref, base, hit, secs = 6) {
  const inst = rigs.get(rig).create({});
  const p = preset(ref);
  const body = createBody(inst, p);
  const player = createPlayer(inst).play(clipAt(base), { loop: true });
  let getup = null, back = false;
  const events = [];
  for (let f = 0; f < secs * 60; f++) {
    player.update(1 / 60);
    body.follow();
    if (f === 30) body.hit(hit);
    for (const e of body.update(1 / 60)) {
      events.push(e[0]);
      if (e[0] === 'getup') {
        getup = e[1];
        assert.deepEqual(body.lying, e[1], 'body.lying is what the event says');
        inst.group.rotation.y = e[1].heading;
        const c = clipAt(p.getup[e[1].side]);
        player.play(c, { speed: c.length / p.getup.time });
      }
    }
    body.apply();
    if (body.awake) inst.group.position.add(body.drift);
    if (body.state === 'down') assert.ok(body.lying && ['front', 'back'].includes(body.lying.side));
    if (getup && player.done && !back) { back = true; player.crossfade(clipAt(base), 0.3, { loop: true, speed: 1 }); }
  }
  inst.group.updateWorldMatrix(true, true);
  const y = (j) => new THREE.Vector3().setFromMatrixPosition(inst.R[j].matrixWorld).y;
  return { body, events, getup, back, pelvisY: y('pelvis'), headY: y('head') };
}

test('knocked down face down it gets up from the front, on its back from the back, and ends standing on its animation', () => {
  const cases = [
    ['zombie', 'zombie/shambler', 'zombie/idle', { at: 'chest', dir: [0, 0.1, 1], power: 8, kind: 'pellet' }, 'front', 0.55, 1.41],
    ['zombie', 'zombie/shambler', 'zombie/idle', { at: 'chest', dir: [0, 0.1, -1], power: 8, kind: 'pellet' }, 'back', 0.55, 1.41],
    ['marine', 'marine/marine', 'marine/stand', { at: 'chest', dir: [0, 0.1, 1], power: 8, kind: 'pellet' }, 'front', 0, 1.22],
    ['marine', 'marine/marine', 'marine/stand', { at: 'chest', dir: [0, 0.1, -1], power: 8, kind: 'pellet' }, 'back', 0, 1.22]
  ];
  for (const [rig, ref, base, hit, side, pelvisY, headY] of cases) {
    const r = hostGetsUp(rig, ref, base, hit);
    const what = `${rig} pushed ${hit.dir[2] > 0 ? 'forward' : 'back'}`;
    const order = ['fall', 'down', 'getup', 'recovered'].map((e) => r.events.indexOf(e));
    assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), what + ': ' + r.events.join(' '));
    assert.equal(r.getup.side, side, what);
    // It faces the way it went over, give or take the twist of the fall: a heading of about 0 (+Z).
    assert.ok(Math.abs(Math.atan2(Math.sin(r.getup.heading), Math.cos(r.getup.heading))) < 0.8, what + ' heading ' + r.getup.heading.toFixed(2));
    assert.ok(r.back, what + ': the clip played through');
    assert.equal(r.body.state, 'animated'); assert.equal(r.body.weight, 0); assert.equal(r.body.lying, null);
    assert.ok(Math.abs(r.pelvisY - pelvisY) < 0.02 && Math.abs(r.headY - headY) < 0.03, `${what}: standing (pelvis ${r.pelvisY.toFixed(3)}, head ${r.headY.toFixed(3)})`);
  }
});

test('every preset\'s get-up clips are on disk, start lying and end standing, and none snaps at the rate it plays', () => {
  for (const ref of presets.names()) {
    const p = preset(ref);
    for (const side of ['front', 'back']) {
      const cref = p.getup[side];
      if (!cref) continue;
      const clip = clipAt(cref);
      assert.equal(clip.rig, p.rig, `${ref} getup.${side}`);
      const inst = rigs.get(p.rig).create({});
      const player = createPlayer(inst).play(clip);
      const rate = clip.length / p.getup.time, prev = new Map();
      let worst = 0;
      const steps = Math.ceil(p.getup.time * 60);
      for (let i = 0; i <= steps; i++) {
        player.update(i === 0 ? 0 : clip.length / steps);
        for (const o of Object.values(inst.R)) { if (!o || !o.isObject3D) continue; const q = prev.get(o); if (q) worst = Math.max(worst, 2 * Math.acos(Math.min(1, Math.abs(q.dot(o.quaternion))))); prev.set(o, o.quaternion.clone()); }
        inst.group.updateWorldMatrix(true, true);
        const head = new THREE.Vector3().setFromMatrixPosition(inst.R.head.matrixWorld).y;
        if (i === 0) assert.ok(head < 0.45, `${cref} starts lying (head ${head.toFixed(2)})`);
        if (i === steps) assert.ok(head > 1.1, `${cref} ends standing (head ${head.toFixed(2)})`);
      }
      assert.ok(worst < 0.3, `${cref} at ${rate.toFixed(2)}x (${ref}): worst one-frame turn ${worst.toFixed(3)} rad`);
    }
  }
  // A preset names them, and is told in sentences when it's wrong; fields it doesn't know are left alone.
  const base = { format: 'dw-motion/1', name: 'x', rig: 'zombie' };
  assert.deepEqual(validateMotion({ ...base, expect: [{ hit: 'rifle', want: 'flinch' }], getup: { time: 1, front: 'zombie/getup-front' }, held: { tone: 0.1, friction: 0.2, upright: 0.5, absorb: 0.8 } }), []);
  const errs = validateMotion({ ...base, getup: { front: 'marine/getup-front', back: 'nope' }, held: { tone: { tail: 1 }, absorb: 2 } }).join('; ');
  for (const want of ['getup.front: "marine/getup-front" is a clip for rig "marine"', 'getup.back is a clip "rig/name"', 'held.tone.tail', 'held.absorb must be a number from 0 to 1']) assert.ok(errs.includes(want), 'missing: ' + want + '\n' + errs);
});

test('in a scene a body gets up on its clip, turned the way it lies, and the scene takes it back standing', () => {
  const json = JSON.parse(fs.readFileSync(new URL('./scenes/zombie-reactions.json', import.meta.url), 'utf8'));
  assert.ok(sceneClipRefs(json).includes('zombie/getup-front') && sceneClipRefs(json).includes('zombie/getup-back'));
  const sp = createScene(loadScene(json, clipOf));
  let getup = null;
  while (!sp.done) for (const e of sp.update(1 / 60).events) if (e.actor === 'shotgunClose' && e.name === 'motion:getup') getup = e.data;
  assert.ok(getup && getup.side === 'back', 'shot in the chest from in front, it lay on its back: ' + JSON.stringify(getup));
  const a = sp.actors.shotgunClose;
  assert.equal(a.body.state, 'animated');
  a.inst.group.updateWorldMatrix(true, true);
  const yaw = new THREE.Euler().setFromQuaternion(a.inst.group.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  assert.ok(Math.abs(Math.atan2(Math.sin(yaw - getup.heading), Math.cos(yaw - getup.heading))) < 1e-6, 'it stands facing the heading it got up on');
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixPosition(a.inst.R.pelvis.matrixWorld).y - 0.55) < 0.02, 'standing');
  // A page that fetches only the actors' clips still plays the scene; the body gets up the old way.
  const bare = loadScene(json, (r) => (r.includes('getup') ? undefined : clipOf(r)));
  assert.ok(bare.warnings.length > 0 && /get-up clip/.test(bare.warnings[0]));
  const sp2 = createScene(bare);
  while (!sp2.done) sp2.update(1 / 60);
  assert.equal(sp2.actors.shotgunClose.body.state, 'animated');
});

test('the new review scenes play: each body gets up from the side it fell on, and what\'s left of a body reacts', () => {
  const run = (name) => {
    const sp = createScene(loadScene(JSON.parse(fs.readFileSync(new URL(`./scenes/${name}.json`, import.meta.url), 'utf8')), clipOf));
    const ev = {}, getup = {};
    while (!sp.done) for (const e of sp.update(1 / 60).events) {
      if (!e.name.startsWith('motion:')) continue;
      (ev[e.actor] ||= []).push(e.name.slice(7));
      if (e.name === 'motion:getup') getup[e.actor] = e.data;
    }
    assert.deepEqual(Object.values(sp.worst).filter((w) => w.bad).map((w) => w.kind + ':' + w.key), [], name);
    return { sp, ev, getup };
  };
  const g = run('getting-up');
  for (const [actor, side] of [['zombieFront', 'front'], ['zombieBack', 'back'], ['marineFront', 'front'], ['marineBack', 'back']]) {
    assert.equal(g.getup[actor] && g.getup[actor].side, side, actor + ': ' + (g.ev[actor] || []).join(' '));
    assert.ok(g.ev[actor].includes('recovered') && g.sp.actors[actor].body.state === 'animated', actor + ' is up by the end');
    // Shot from ±X, facing +X: it gets up facing +X, give or take the twist of the fall.
    assert.ok(Math.abs(g.getup[actor].heading - Math.PI / 2) < 0.8, actor + ' heading ' + g.getup[actor].heading.toFixed(2));
  }
  const d = run('zombie-dismembered');
  assert.ok(d.ev.legless.includes('fall') && d.ev.legless.includes('getup'), d.ev.legless.join(' '));
  assert.ok(!d.ev.armless.includes('fall') && d.ev.armless.includes('recovered'), d.ev.armless.join(' '));
  assert.ok(d.ev.headless.includes('dead') && d.ev.headless.includes('settled'), d.ev.headless.join(' '));
});

test('a scene can take a part off a body on cue', () => {
  const sc = loadScene({ format: 'dw-scene/1', name: 'x', length: 3, actors: { z: { rig: 'zombie', at: [0, 0, 0], clips: [[0, 'zombie/idle']], motion: 'zombie/shambler', lose: [[0.5, 'legR']] } } }, clipOf);
  const sp = createScene(sc);
  const ev = [];
  while (!sp.done) for (const e of sp.update(1 / 60).events) ev.push(e.name);
  assert.ok(ev.includes('motion:lost') && ev.includes('motion:fall'), ev.join(' '));
  assert.equal(sp.actors.z.inst.R.hipR.visible, false, 'the studio body stops drawing it');
  sp.seek(0.2);
  assert.equal(sp.actors.z.inst.R.hipR.visible, true, 'and has it back on a seek');
  assert.throws(() => loadScene({ format: 'dw-scene/1', name: 'x', length: 1, actors: { z: { rig: 'zombie', at: [0, 0, 0], clips: [[0, 'zombie/idle']], lose: [[0.5, 'tail']] } } }, clipOf), (e) => /"lose" needs "motion"/.test(e.message) && /the part one of armL/.test(e.message));
});

test('level of detail: lod 1 costs clearly less and still falls and gets up; lod 2 holds the pose while its timers run', () => {
  const crowd = () => Array.from({ length: 48 }, (_, i) => {
    const inst = rigs.get('zombie').create({}); inst.group.position.set(i * 2, 0, 0);
    const b = createBody(inst, preset('zombie/shambler')); b.follow(); b.hit({ power: 4.5, kind: 'pellet' }); return b;
  });
  // The best of five runs each, taken in turn, so a busy machine slows both alike.
  const once = (lod) => {
    const bodies = crowd();
    let ms = 0;
    for (let f = 0; f < 40; f++) for (const b of bodies) { b.follow(); const t0 = performance.now(); b.update(1 / 60, { lod }); ms += performance.now() - t0; b.apply(); }
    return ms / 40;
  };
  const best = [Infinity, Infinity, Infinity];
  for (let rep = 0; rep < 5; rep++) for (const lod of [0, 1, 2]) best[lod] = Math.min(best[lod], once(lod));
  const [c0, c1, c2] = best;
  console.log(`  48 bodies, update only: lod 0 ${c0.toFixed(2)} ms, lod 1 ${c1.toFixed(2)} ms, lod 2 ${c2.toFixed(2)} ms a frame`);
  assert.ok(c1 < c0 * 0.75, `lod 1 ${c1.toFixed(2)} ms against lod 0 ${c0.toFixed(2)} ms`);
  assert.ok(c2 < c0 * 0.25);
  // Stable at half rate: a knockdown still falls, lies, gets up and stands, all finite, above ground.
  const r = play('zombie', 'zombie/shambler', (b) => b.hit({ at: 'chest', dir: [0, 0.1, 1], power: 8, kind: 'pellet' }), 6, { lod: 1 });
  const order = ['fall', 'down', 'getup', 'recovered'].map((e) => r.events.indexOf(e));
  assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), r.events.join(' '));
  assert.ok(!r.bad && r.minY > -0.45);
  // lod 2: the pose doesn't move, but a body that's down still gets up and recovers on time.
  const inst = rigs.get('zombie').create({});
  const b = createBody(inst, preset('zombie/shambler'));
  b.follow(); b.hit({ at: 'chest', dir: [0, 0.1, 1], power: 8, kind: 'pellet' });
  const ev = [];
  for (let f = 0; f < 600 && b.state !== 'down'; f++) { b.follow(); ev.push(...b.update(1 / 60).map((e) => e[0])); b.apply(); }
  const still = JSON.stringify(b.points());
  let moved = false;
  for (let k = 0; k < 60; k++) { b.follow(); ev.push(...b.update(1 / 60, { lod: 2 }).map((e) => e[0])); b.apply(); if (b.state === 'down' && JSON.stringify(b.points()) !== still) moved = true; }
  assert.ok(!moved, 'held still');
  for (let k = 0; k < 240 && b.state !== 'animated'; k++) { b.follow(); ev.push(...b.update(1 / 60, { lod: 2 }).map((e) => e[0])); b.apply(); }
  assert.ok(ev.includes('getup') && ev.includes('recovered'), ev.join(' '));
  // A corpse far away settles and sleeps on its timer.
  const d = play('zombie', 'zombie/shambler', (x) => x.kill({ power: 3 }), 2, { lod: 2 });
  assert.ok(d.events.includes('settled') && d.body.sleeping, d.events.join(' '));
});

// --- Review fixes (CL-66/67 review, 2026-09-26) ------------------------------------------------

test('a limb doesn\'t spin when the animation under a reaction turns it about its own bone (a clip starting mid-fall)', () => {
  const inst = rigs.get('zombie').create({});
  const body = createBody(inst, preset('zombie/shambler'));
  const arm = inst.R.shoulderL, rest = arm.quaternion.clone();
  const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);  // about the arm's own bone (it hangs along -Y)
  const world = new THREE.Quaternion();
  let worst = 0, last = null;
  body.follow();
  for (let f = 0; f < 150; f++) {
    if (f >= 90) arm.quaternion.copy(rest).multiply(twist);   // the host's new clip, a half turn off
    body.follow();
    if (f === 30) body.kill({ at: 'chest', dir: [0, 0, 1], power: 3 });
    body.update(1 / 60); body.apply();
    arm.getWorldQuaternion(world);
    if (f > 80 && last) worst = Math.max(worst, last.angleTo(world));
    last = world.clone();
  }
  assert.ok(worst < 0.35, `the arm turned ${worst.toFixed(2)} rad in one frame`);
});

test('a fall with no hit behind it goes the same way every time, and a reset forgets the last one', () => {
  const run = (first) => {
    const inst = rigs.get('zombie').create({});
    const body = createBody(inst, preset('zombie/shambler'));
    body.follow();
    if (first) { for (let f = 0; f < 90; f++) { body.follow(); if (f === 10) first(body); body.update(1 / 60); body.apply(); } body.reset(); }
    for (let f = 0; f < 150; f++) { body.follow(); if (f === 10) body.lose('legL'); body.update(1 / 60); body.apply(); }
    return body.points().pelvis;
  };
  const fresh = run(null);
  const after = run((b) => b.hit({ at: 'chest', dir: [1, 0, -1], power: 9, kind: 'pellet' }));
  const d = Math.hypot(fresh[0] - after[0], fresh[1] - after[1], fresh[2] - after[2]);
  assert.ok(d < 1e-6, `the pelvis ended ${d.toFixed(3)} m from a fresh body's`);
});

test('a corpse killed far away (lod 2) falls before it sleeps: it never sleeps standing', () => {
  const d = play('zombie', 'zombie/shambler', (x) => x.kill({ power: 3 }), 4, { lod: 2 });
  assert.ok(d.events.includes('settled') && d.body.sleeping, d.events.join(' '));
  assert.ok(d.body.points().pelvis[1] < preset('zombie/shambler').down.height, `pelvis at ${d.body.points().pelvis[1].toFixed(2)} m`);
});

test('a hand keeps its grip at any display rate: the flop scene at 60, 144, 165 and 240 Hz', () => {
  // A fixed 120 Hz step left some frames of a faster display with no step at all, and the grip
  // opened up to 6 cm at 144 Hz. Held, a body steps once a frame instead.
  const json = JSON.parse(fs.readFileSync(new URL('./scenes/guardian-grab-drag-flop.json', import.meta.url), 'utf8'));
  for (const hz of [60, 144, 165, 240]) {
    const sp = createScene(loadScene(json, clipOf));
    const body = sp.actors.marine.body;
    let worst = 0, under = Infinity;
    while (!sp.done) {
      const r = sp.update(1 / hz);
      const g = r.checks.gap['guardian.handR>marine.footL'];
      if (sp.t >= 0.6 && body.holding && g) worst = Math.max(worst, g.value);
      under = Math.min(under, underGround(body));
    }
    assert.ok(worst < 0.03, `${hz} Hz: grip gap ${(worst * 100).toFixed(1)} cm`);
    assert.ok(under > -0.002, `${hz} Hz: nothing through the ground (${under.toFixed(4)})`);
  }
});

test('a hold target that is not a point this frame (NaN) is ignored; the body stays finite and held', () => {
  const inst = rigs.get('zombie').create({});
  const body = createBody(inst, preset('zombie/shambler'));
  body.follow();
  let t = 0;
  body.hold('handR', () => (t > 0.2 && t < 0.4) || t < 0.02 ? [NaN, 1, 0] : [0.3 + t, 1.2, 0.4], { strength: 1 });
  let bad = false;
  for (let f = 0; f < 60; f++) {
    t = f / 60; body.follow(); body.update(1 / 60); body.apply();
    for (const p of Object.values(body.points())) if (!p.every(Number.isFinite)) bad = true;
    inst.group.traverse((o) => { if (!Number.isFinite(o.quaternion.x)) bad = true; });
  }
  assert.ok(!bad, 'a NaN target made the body non-finite');
  assert.equal(body.state, 'held');
  const h = body.points().handR;
  assert.ok(Math.hypot(h[0] - (0.3 + t), h[1] - 1.2, h[2] - 0.4) < 0.02, 'back on the hand once the target is a point again');
});

test('a body that loses a leg while it gets up falls again', () => {
  const inst = rigs.get('zombie').create({});
  const body = createBody(inst, preset('zombie/shambler'));
  const ev = [];
  body.follow();
  let lostAt = -1;
  for (let f = 0; f < 600; f++) {
    body.follow();
    if (f === 30) body.hit({ at: 'chest', dir: [0, 0.1, 1], power: 8, kind: 'pellet' });
    if (lostAt < 0 && body.state === 'getup') { body.lose('legL'); lostAt = ev.length; }
    for (const e of body.update(1 / 60)) ev.push(e[0]);
    body.apply();
  }
  assert.ok(lostAt >= 0, 'it got up: ' + ev.join(' '));
  assert.ok(ev.slice(lostAt).includes('fall'), 'after the leg went: ' + ev.slice(lostAt).join(' '));
});
