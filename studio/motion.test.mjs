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
    for (const e of body.update(1 / 60)) events.push(e[0]);
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
