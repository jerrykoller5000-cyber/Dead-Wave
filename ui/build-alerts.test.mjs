import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealth, buildAlertMarkers, drawBuildAlerts, createBuildAttackPulses, createFarBuildWarnings } from './build-alerts.js';

const wall = (overrides = {}) => ({ id: 'wall', hp: 100, maxHp: 100, x: 0, z: 10, ...overrides });
const projection = { x: 0, z: 0, yaw: 0, center: 100, scale: 2, rim: 90 };
const toMap = (x, z) => Math.hypot(x, z) <= 50 ? { x: 100 - x * 2, y: 100 - z * 2 } : null;
const markers = builds => buildAlertMarkers(builds, { toMap, projection });

test('health colors change strictly below half and quarter health', () => {
  for (const [hp, severity] of [[100, 'healthy'], [50, 'healthy'], [49, 'damaged'],
    [25, 'damaged'], [24, 'critical'], [.1, 'critical']]) {
    assert.equal(buildHealth(wall({ hp })).severity, severity);
  }
  assert.equal(buildHealth(wall({ hp: 40 })).color, '#e2b45a');
  assert.equal(buildHealth(wall({ hp: 20 })).color, '#ff755e');
  assert.equal(buildHealth(wall({ hp: 150 })).fraction, 1);
});

test('destroyed and malformed builds never create alerts', () => {
  for (const build of [null, {}, wall({ hp: 0 }), wall({ hp: -1 }), wall({ maxHp: 0 }),
    wall({ hp: NaN }), wall({ maxHp: Infinity })]) assert.equal(buildHealth(build), null);
  assert.deepEqual(markers([wall({ x: NaN }), wall({ z: Infinity }), wall({ hp: 0 })]), []);
  assert.deepEqual(buildAlertMarkers(null), []);
  assert.deepEqual(buildAlertMarkers([wall()]), []);
});

test('a 40 percent wall 60 metres behind has an amber pip on its bearing', () => {
  const [mark] = markers([wall({ hp: 40, z: -60 })]);
  assert.equal(mark.color, '#e2b45a'); assert.equal(mark.edge, true);
  assert(Math.abs(mark.x - 100) < 1e-9); assert.equal(mark.y, 190);
  assert(Math.abs(mark.angle - Math.PI / 2) < Math.PI / 12);
  const [turned] = buildAlertMarkers([wall({ hp: 40, z: -60 })],
    { toMap: () => null, projection: { ...projection, yaw: Math.PI / 2 } });
  assert(Math.abs(turned.x - 10) < 1e-9); assert(Math.abs(turned.y - 100) < 1e-9);
});

test('all visible builds remain; far healthy builds are omitted and hurt pips cap at three', () => {
  const builds = [wall({ id: 'near' }), wall({ id: 'full', z: 60 }),
    wall({ id: 'light', hp: 90, z: 70 }), wall({ id: 'critical', hp: 10, z: 90 }),
    wall({ id: 'farther', hp: 30, z: 100 }), wall({ id: 'closer', hp: 30, z: 80 }),
    wall({ id: 'attacked', hp: 80, z: 110, underAttack: true })];
  const before = structuredClone(builds); builds.forEach(Object.freeze); Object.freeze(builds);
  const result = markers(builds);
  assert.deepEqual(result.map(m => m.id), ['near', 'attacked', 'critical', 'closer']);
  assert.deepEqual(builds, before);
  assert.equal(result.filter(m => m.edge).length, 3);
});

test('repair, removal and a new run cannot retain stale bearings', () => {
  assert.equal(markers([wall({ hp: 40, z: 60 })]).length, 1);
  assert.deepEqual(markers([wall({ hp: 100, z: 60 })]), []);
  assert.deepEqual(markers([]), []);
  assert.deepEqual(markers([wall({ hp: 0, z: 60 })]), []);
});

test('map range controls visibility and full map does not need rim projection', () => {
  const result = buildAlertMarkers([wall({ hp: 40, z: 60 })], { toMap: () => ({ x: 12, y: 30 }) });
  assert.equal(result[0].edge, false); assert.equal(result[0].x, 12);
  assert.equal(markers([wall({ hp: 40, z: 50 })])[0].edge, false);
  assert.equal(markers([wall({ hp: 40, z: 50.1 })])[0].edge, true);
  assert.deepEqual(buildAlertMarkers([wall({ hp: 40, z: 60 })],
    { toMap, projection: { ...projection, yaw: NaN } }), []);
});

test('turret firing is never misrepresented as damage; attack input is explicit', () => {
  assert.equal(buildHealth(wall({ flashT: .06 })).underAttack, false);
  assert.equal(buildHealth(wall({ flashT: .12 })).underAttack, false);
  assert.equal(buildHealth(wall({ underAttack: true })).underAttack, true);
});

test('attack outline flashes without hiding health color or leaking canvas state', () => {
  function draw(timeMs, underAttack) {
    const calls = [], ctx = new Proxy({}, {
      get: (_, k) => (...args) => calls.push([k, ...args]),
      set: (_, k, v) => { calls.push([k, v]); return true; }
    });
    drawBuildAlerts(ctx, markers([wall({ hp: 40, underAttack })]), { timeMs });
    return calls;
  }
  const bright = draw(0, true), dim = draw(160, true), idle = draw(0, false);
  assert.equal(bright.filter(c => c[0] === 'strokeRect').length, 2);
  assert.equal(dim.filter(c => c[0] === 'strokeRect').length, 1);
  assert.equal(idle.filter(c => c[0] === 'strokeRect').length, 1);
  for (const calls of [bright, dim, idle]) {
    assert(calls.some(c => c[0] === 'fillStyle' && c[1] === '#e2b45a'));
    assert.equal(calls[0][0], 'save'); assert.equal(calls.at(-1)[0], 'restore');
  }
});

test('only damage events pulse for 800ms; reset, expiry and replacements clear them', () => {
 const pulses=createBuildAttackPulses(), b=wall({id:7,hp:40});
 pulses.handle({type:'run-reset',runId:1});
 pulses.handle({type:'build-hit',id:7,runId:0,x:b.x,z:b.z},[b],0);
 assert.equal(pulses.snapshot([b],0)[0].underAttack,false);
 pulses.handle({type:'build-hit',id:7,runId:1,x:b.x,z:b.z},[b],0);
 assert.equal(pulses.snapshot([b],799)[0].underAttack,true);
 assert.equal(pulses.snapshot([b],800)[0].underAttack,false);
 pulses.handle({type:'build-hit',id:7,runId:1,x:b.x,z:b.z},[b],1000);
 assert.equal(pulses.snapshot([{...b}],1001)[0].underAttack,false);
 pulses.handle({type:'build-hit',id:7,runId:1,x:b.x,z:b.z},[b],1100);
 pulses.handle({type:'build-hit',id:7,runId:1,x:b.x,z:b.z,broke:true},[b],1101);
 assert.equal(pulses.snapshot([b],1102)[0].underAttack,false);
 pulses.handle({type:'build-hit',id:7,runId:1,x:b.x,z:b.z},[b],1200);
 pulses.handle({type:'run-reset',runId:2});
 assert.equal(pulses.snapshot([b],1201)[0].underAttack,false);
});


test('stable build identity separates defenses stacked at the same coordinates', () => {
 const pulses=createBuildAttackPulses(), a=wall({id:1}), b=wall({id:2});
 pulses.handle({type:'build-hit',id:1,x:0,z:10},[a,b],0);
 assert.deepEqual(pulses.snapshot([a,b],1).map(b=>b.underAttack),[true,false]);
 pulses.handle({type:'run-reset',runId:2});
 pulses.handle({type:'build-hit',x:0,z:10},[a,b],0);
 assert.deepEqual(pulses.snapshot([a,b],1).map(b=>b.underAttack),[false,false]);
});

const farHit = (extra={}) => ({type:'build-hit',runId:1,id:7,x:60,z:0,frac:.4,broke:false,...extra});
const ears = (extra={}) => ({active:true,x:0,z:0,yaw:0,...extra});
test('far build cue is panned with the camera and limited to one per two seconds', () => {
 const cues=createFarBuildWarnings(); cues.handle({type:'run-reset',runId:1});
 assert.equal(cues.handle(farHit(),ears(),0).pan,-.85);
 assert.equal(cues.handle(farHit({id:8,broke:true}),ears(),1999),null);
 assert.equal(cues.handle(farHit({broke:true}),ears({yaw:Math.PI}),2000).pan,.85);
 assert.equal(cues.handle(farHit({x:0,z:60}),ears(),4000).pan,0);
});
test('warning excludes near, healthy, stale, inactive and invalid events without using cooldown', () => {
 const cues=createFarBuildWarnings(); cues.handle({type:'run-reset',runId:1});
 for(const change of [{x:40},{frac:.5},{frac:1},{runId:0},{frac:NaN},{id:undefined},{type:'purchase-delivered'}])
   assert.equal(cues.handle(farHit(change),ears(),0),null);
 assert.equal(cues.handle(farHit(),ears({active:false}),0),null);
 assert.equal(cues.handle(farHit(),ears({yaw:NaN}),0),null);
 assert.equal(cues.handle(farHit({broke:true,frac:0}),ears(),0).broke,true);
 cues.handle({type:'run-reset',runId:2});
 assert(cues.handle(farHit({runId:2}),ears(),1));
});
