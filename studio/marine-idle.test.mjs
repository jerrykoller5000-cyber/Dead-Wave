import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIdleClock, createMarineIdle } from './marine-idle.js';
import { makeMarineRig } from './marine.js';
import { ikLimb } from './ik.js';

test('bored after 5s, pack after 25s, each lit cigarette lasts 60s', () => {
  const c = createIdleClock();
  c.step(5); assert.equal(c.state.phase, 'ready');
  c.step(.01); assert.equal(c.state.phase, 'bored');
  c.step(19.99); assert.equal(c.state.phase, 'bored');
  c.step(.01); assert.equal(c.state.phase, 'pack');
  c.step(3.99); assert.equal(c.state.phase, 'smoking'); assert(c.state.lit);
  c.step(59.99); assert.equal(c.state.phase, 'smoking');
  assert(c.step(.01).spent); assert.equal(c.state.phase, 'pack'); assert(!c.state.lit);
  c.step(4); assert.equal(c.state.number, 2); assert(c.state.lit);
});
test('movement cancels immediately and drops only one lit cigarette', () => {
  const c = createIdleClock(); c.step(31);
  assert(c.step(.016, { active: true }).drop);
  assert(!c.step(.016, { active: true }).drop);
  assert.equal(c.state.quiet, 0); c.step(24); assert.equal(c.state.phase, 'bored');
  c.step(2); assert.equal(c.state.phase, 'pack');
  assert(!c.step(.016, { active: true }).drop);
});
test('pause freezes the cigarette; death, menus and reset remove it without fire', () => {
  const c = createIdleClock(); c.step(42); const before = {...c.state};
  c.step(90, { paused: true, active: true }); assert.deepEqual(c.state, before);
  assert(!c.step(.016, { eligible: false }).drop); assert.equal(c.state.quiet, 0);
  c.step(40); c.reset(); assert.equal(c.state.phase, 'ready'); assert(!c.state.lit);
});
test('frame-rate independent timing across repeated cigarettes', () => {
  const a = createIdleClock(), b = createIdleClock(); a.step(220.123);
  for (let i = 0; i < 220123; i++) b.step(.001);
  assert.equal(a.state.phase, b.state.phase); assert.equal(a.state.number, b.state.number);
  assert(Math.abs(a.state.time - b.state.time) < 1e-6);
});
function fixture() {
  const marine = makeMarineRig(), scene = new THREE.Scene(); scene.add(marine);
  const r = marine.userData.rig;
  Object.assign(marine.userData, { lowerBody:r.pelvis, torsoG:r.spine, headG:r.head, kneeLG:r.kneeL, kneeRG:r.kneeR,
    armLG:r.shoulderL, armRG:r.shoulderR, elbowLG:r.elbowL, elbowRG:r.elbowR, gripL:r.handL, gripR:r.handR });
  let fires = 0, smokes = 0;
  const idle = createMarineIdle({ THREE, marine, scene, ground: () => 0, ignite: () => fires++, smoke: () => smokes++,
    solveArm: (side, target) => ikLimb(r['shoulder'+side], r['elbow'+side], .28, .3, target,
      new THREE.Vector3(side === 'R' ? 1 : -1, -.4, -.5), 1, r['hand'+side].position) });
  return {idle, marine, fires:()=>fires, smokes:()=>smokes};
}
test('props show extraction and smoking, emitted smoke and landing fire, all clear on reset', () => {
  const f = fixture(), c = f.idle;
  c.step(26.8, {}); c.pose(.016);
  assert(c.props.pack.visible && c.props.cig.visible && c.props.root.visible);
  c.step(3.8, {}); c.pose(.016);
  assert(!c.props.pack.visible && c.state.lit); assert(f.smokes() > 0);
  c.step(.016, {active:true}); assert.equal(c.drops.length,1); assert(!c.props.root.visible);
  for(let i=0;i<120;i++) c.step(1/60,{active:true});
  assert.equal(f.fires(),1); assert(c.drops[0].landed);
  c.reset(); assert.equal(c.drops.length,0); assert(!c.props.root.visible);
});
test('long sessions keep discarded cigarette objects bounded', () => {
  const f = fixture(), c = f.idle;
  for(let i=0;i<100;i++) { c.step(31,{}); c.pose(.016); c.step(.016,{active:true}); }
  assert(c.drops.length <= 8);
  const before = f.fires(); c.reset(); c.step(4,{active:true}); assert.equal(f.fires(),before);
});
