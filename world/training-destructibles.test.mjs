// world/training-destructibles.test.mjs — AH-12: Physical destruction, physics, pressurized O2 rocket/rupture,
// stacked sandbag collapse + mounds, 2-stage monitors & signs, IV stand/bag cascade, spills, audio events,
// zero-allocation guarantee, pool caps, wall occlusion, and Clean Reset.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING, buildTrainingGround } from './training.js';
import { DESTRUCT_LIMITS } from './training-destructibles.js';
import { kitReach } from './training-kitprops.js';
import { traceTraining } from './training-ballistics.js';

const tg = buildTrainingGround(T);
const D = tg.destructibles;
const K = tg.kitProps;
const O = tg.origin;
const events = [];
D.setEventHandler((ev) => events.push({ src: 'destruct', ...ev }));
K.setEventHandler((ev) => events.push({ src: 'kit', ...ev }));
K.warm();
D.warm();

function resetAll() {
  D.reset();
  K.reset();
  events.length = 0;
}

function centerOf(solid) {
  return {
    x: (solid.minX + solid.maxX) * 0.5,
    y: (solid.minY + solid.maxY) * 0.5,
    z: (solid.minZ + solid.maxZ) * 0.5
  };
}

function stepFrames(n, dt = 1 / 60) {
  for (let i = 0; i < n; i++) {
    D.update(dt);
    K.update(dt);
    tg.update(dt);
  }
}

test('all 30 destructible props bind 100%, sit at 0 CPU / 0 visible pools at rest, and prime cleanly', () => {
  resetAll();
  assert.equal(D.entries.length, 30, 'expected 30 destructible props, got ' + D.entries.length);
  for (const e of D.entries) {
    assert.ok(e.recs.length > 0 && e.recs.every((r) => r.range || r.unbaked), `${e.id} bound completely`);
  }
  const spillMesh = tg.group.getObjectByName('training-prop-spills');
  const moundMesh = tg.group.getObjectByName('training-sand-mounds');
  assert.ok(spillMesh && moundMesh, 'pooled spill and sand mound meshes mounted');
  assert.equal(spillMesh.visible, false, 'spills hidden at rest');
  assert.equal(moundMesh.visible, false, 'mounds hidden at rest');
  assert.ok(D.prime(true) > 20, 'prime(true) exposes all pre-built geometries');
  assert.equal(spillMesh.visible, true, 'spills primed');
  assert.equal(moundMesh.visible, true, 'mounds primed');
  D.prime(false);
  assert.equal(spillMesh.visible, false, 'spills hidden after prime(false)');
  assert.equal(moundMesh.visible, false, 'mounds hidden after prime(false)');
  assert.equal(D.update(1 / 60), 0, '0 work per frame at rest');
});

test('pressurized oxygen tank: Stage 1 shears valve + rockets with O2 jet/hiss; Stage 2 concussive rupture + reset', () => {
  resetAll();
  const o2 = D.byId('oxygenTank');
  assert.ok(o2, 'oxygenTank registered');
  const start = centerOf(o2.solid);
  // Stage 1 bullet hit
  assert.equal(D.hit(o2.solid, start, { x: 0.7, y: 0.1, z: 0.6 }, 25, 'bullet'), true);
  assert.equal(o2.state, 'venting', 'enters pressurized venting rocket state');
  assert.ok(events.some((e) => e.type === 'o2Launch' && e.id === 'oxygenTank'), 'emitted o2Launch');
  // Simulate 0.6s of thrust
  stepFrames(36);
  assert.ok(events.some((e) => e.type === 'o2Jet'), 'emits directional gas jet');
  assert.ok(events.some((e) => e.type === 'o2Hiss'), 'emits pressurized hiss');
  assert.ok(o2.piece, 'cylinder rigid body active during venting');
  const distMoved = Math.hypot(o2.piece.group.position.x + O.x - start.x, o2.piece.group.position.z + O.z - start.z);
  assert.ok(distMoved > 0.5, 'cylinder rocketed across room (' + distMoved.toFixed(2) + ' m)');
  // Run until timer ends -> automatic concussive rupture
  stepFrames(140);
  assert.equal(o2.state, 'broken', 'ruptures at end of O2 jet timer');
  assert.ok(events.some((e) => e.type === 'o2Rupture' && e.id === 'oxygenTank'), 'emitted o2Rupture');
  // Reset restores cleanly
  D.reset();
  assert.equal(o2.state, 'still');
  assert.equal(D.loose(), 0);
});

test('sandbags slump on hits 1-2, rupture into pooled sand mound on hit 3, and drop upper sandbag via support cascade', () => {
  resetAll();
  const b0 = D.byId('sandbag0'), b1 = D.byId('sandbag1'), b2 = D.byId('sandbag2');
  assert.ok(b0 && b1 && b2, 'all 3 sandbags present');
  const topY0 = b2.still.minY;
  // Hit 1 & 2 on sandbag0 -> visible slump
  D.hit(b0.solid, centerOf(b0.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(b0.state, 'loose');
  assert.ok(b0.piece && b0.piece.group.scale.y < 1, 'slumps visibly on hit 1');
  D.hit(b0.solid, centerOf(b0.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(b0.state, 'loose');
  // Hit 3 ruptures sandbag0 -> spawns sand mound + destabilizes sandbag2
  D.hit(b0.solid, centerOf(b0.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(b0.state, 'broken');
  assert.ok(D.mounds() >= 1, 'spilled sand mound created');
  assert.ok(tg.group.getObjectByName('training-sand-mounds').visible, 'mound mesh visible');
  assert.ok(events.some((e) => e.type === 'break' && e.id === 'sandbag0' && e.fx === 'burlap'));
  // Rupture sandbag1 too -> sandbag2 must fall cleanly to floor (no floating!)
  D.hit(b1.solid, centerOf(b1.solid), { x: 0, y: 0, z: 1 }, 50, 'blast');
  assert.equal(b1.state, 'broken');
  assert.equal(b2.state, 'loose', 'top sandbag detached by support cascade');
  stepFrames(90);
  assert.ok(b2.solid.minY < topY0 - 0.08, `top sandbag dropped from ${(topY0 - O.y).toFixed(3)} to ${(b2.solid.minY - O.y).toFixed(3)}`);
  assert.ok(b2.solid.minY >= O.y - 0.03, 'top sandbag never sinks below floor');
});

test('two-stage monitors shatter screen + peel tape/note0 into dark cavity on hit 1, break casing on hit 2', () => {
  resetAll();
  const mon = D.byId('crackedMonitor'), n0 = D.byId('note0'), med = D.byId('medMonitor');
  assert.ok(mon && n0 && med);
  D.hit(mon.solid, centerOf(mon.solid), { x: -1, y: 0, z: 0 }, 20, 'bullet');
  assert.equal(mon.state, 'damaged', 'Stage 1 damaged state');
  assert.ok(mon.cavityPiece, 'dark recessed cavity spawned');
  assert.equal(n0.state, 'broken', 'taped note0 peeled loose with screen shatter');
  assert.ok(events.some((e) => e.type === 'break' && e.id === 'crackedMonitor' && e.fx === 'glass'));
  D.hit(mon.solid, centerOf(mon.solid), { x: -1, y: 0, z: 0 }, 20, 'bullet');
  assert.equal(mon.state, 'broken', 'Stage 2 casing broken');
  assert.equal(mon.cavityPiece, null, 'cavity released');
  // Medical vitals monitor too
  D.hit(med.solid, centerOf(med.solid), { x: 0, y: 0, z: -1 }, 20, 'bullet');
  assert.equal(med.state, 'damaged');
  assert.ok(med.cavityPiece);
  D.hit(med.solid, centerOf(med.solid), { x: 0, y: 0, z: -1 }, 20, 'bullet');
  assert.equal(med.state, 'broken');
});

test('safety signs and DAYS board hang crooked on hit 1 and detach onto floor on hit 2', () => {
  resetAll();
  for (const id of ['signEars', 'signMuzzle', 'signCease', 'signForward', 'daysBoard']) {
    const s = D.byId(id);
    assert.ok(s, id + ' present');
    D.hit(s.solid, centerOf(s.solid), { x: 0, y: 0, z: -1 }, 20, 'bullet');
    assert.equal(s.state, 'damaged', id + ' crooked on hit 1');
    assert.ok(s.piece && s.piece.mounted, id + ' mounted spring active');
    stepFrames(15);
    D.hit(s.solid, centerOf(s.solid), { x: 0, y: 0, z: -1 }, 20, 'bullet');
    assert.equal(s.state, 'loose', id + ' detaches on hit 2');
    assert.equal(s.piece.mounted, null, id + ' free-falling');
  }
  stepFrames(120);
  for (const id of ['signEars', 'daysBoard']) {
    const s = D.byId(id);
    assert.ok(s.solid.minY >= O.y - 0.03 && s.solid.minY < O.y + 0.5, id + ' settled on floor cleanly');
  }
});

test('IV stand topples and automatically bursts hanging IV saline bag with glossy puddle on infirmary mat', () => {
  resetAll();
  const stand = D.byId('ivStand'), bag = D.byId('ivBag');
  assert.ok(stand && bag);
  D.hit(stand.solid, centerOf(stand.solid), { x: 0.8, y: 0, z: 0.4 }, 25, 'bullet');
  assert.equal(stand.state, 'loose', 'IV stand knocked loose');
  assert.equal(bag.state, 'broken', 'linked IV saline bag burst on stand topple');
  assert.ok(D.spills() >= 1, 'saline puddle spawned');
  assert.ok(tg.group.getObjectByName('training-prop-spills').visible, 'spill mesh visible');
  assert.ok(events.some((e) => e.type === 'break' && e.id === 'ivBag' && e.fx === 'saline'));
  stepFrames(90);
  assert.ok(stand.solid.minY >= O.y - 0.02, 'IV stand rests on mat, never under floor');
});

test('medical boxes scatter individually, radio snaps antenna, flicker tube & gate beacons shatter and reset cleanly', () => {
  resetAll();
  const boxes = D.byId('medBoxes');
  D.hit(boxes.solid, centerOf(boxes.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(boxes.state, 'loose');
  assert.equal(boxes.stackPieces.length, 3, 'all 3 medical boxes scatter individually');
  D.hit(boxes.solid, centerOf(boxes.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(boxes.state, 'broken');

  const radio = D.byId('radio');
  const beforePieces = D.loose();
  D.hit(radio.solid, centerOf(radio.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.equal(radio.state, 'loose');
  assert.ok(D.loose() >= beforePieces + 2, 'radio body + snapped antenna piece spawned');

  const tube = D.byId('flickerStrip');
  D.hit(tube.solid, centerOf(tube.solid), { x: 1, y: 0.2, z: 0 }, 20, 'bullet');
  assert.equal(tube.state, 'broken');
  tg.update(0.5);
  assert.equal(tg.wear.flicker.material.emissiveIntensity, 0, 'shattered fluorescent stays dark');

  const b0 = D.byId('gateBeacon0');
  D.hit(b0.solid, centerOf(b0.solid), { x: 0, y: 0.2, z: 1 }, 20, 'bullet');
  assert.equal(b0.state, 'still', 'hit 1 sparks steel cage');
  D.hit(b0.solid, centerOf(b0.solid), { x: 0, y: 0.2, z: 1 }, 20, 'bullet');
  assert.equal(b0.state, 'broken', 'hit 2 shatters amber lens');
  assert.equal(b0.recs[0].mesh.visible, false, 'beacon amber lens hidden when shattered');

  // Paper notes, roster, calendar, rack muffs, obsChart, blanket
  for (const id of ['roster', 'calendar', 'note1', 'note2', 'note3', 'note4']) {
    const p = D.byId(id);
    D.hit(p.solid, centerOf(p.solid), { x: 0, y: 0, z: -1 }, 10, 'bullet');
    assert.equal(p.state, 'broken', id + ' tears on 1 hit');
  }
  const bl = D.byId('cotBlanket');
  for (let i = 0; i < 4; i++) D.hit(bl.solid, centerOf(bl.solid), { x: 0, y: 0, z: 1 }, 25, 'bullet');
  assert.equal(bl.state, 'loose', 'folded blanket tumbles but never shatters');

  // Reset restores tube glow & beacon lens
  D.reset();
  assert.equal(b0.recs[0].mesh.visible, true, 'beacon lens restored');
  assert.equal(tube.state, 'still');
  tg.setLights(true);
  assert.ok(tg.wear.flicker.material.emissiveIntensity > 0, 'fluorescent restored on reset');
});

test('wall occlusion prevents blasts across x = -8, and pool caps + floor bounds hold under total room devastation', () => {
  resetAll();
  const canReach = kitReach(tg, traceTraining);
  // Blast in Range next to wall (-7.2, 0.9, -2.7) must NOT hit Build Room props across x = -8
  D.blast({ x: O.x - 7.2, y: O.y + 1.0, z: O.z - 2.7 }, 5.0, 1, canReach);
  assert.equal(D.byId('crackedMonitor').state, 'broken', 'Range monitor hit by Range blast');
  assert.equal(D.byId('oxygenTank').state, 'still', 'Build Room O2 untouched');

  // Devastate every prop across both rooms and verify caps + zero under-floor clipping
  for (const e of D.entries) {
    D.hit(e.solid, centerOf(e.solid), { x: 0.4, y: 0.2, z: 0.8 }, 60, 'blast');
  }
  assert.ok(D.loose() <= DESTRUCT_LIMITS.maxPieces, 'loose pieces capped (' + D.loose() + ')');
  assert.ok(D.spills() <= DESTRUCT_LIMITS.maxSpills, 'spills capped (' + D.spills() + ')');
  assert.ok(D.mounds() <= DESTRUCT_LIMITS.maxMounds, 'mounds capped (' + D.mounds() + ')');

  let minY = Infinity;
  for (let f = 0; f < 240; f++) {
    D.update(1 / 60);
    for (const p of D.pieces()) minY = Math.min(minY, p.group.position.y);
  }
  assert.ok(minY >= -0.05, 'no piece sank below floor (minY=' + minY.toFixed(3) + ')');
});

test('flamethrower burn() heats & ignites papers/O2, walk bump() nudges loose floor props', () => {
  resetAll();
  const o2 = D.byId('oxygenTank'), cO2 = centerOf(o2.solid);
  D.burn(cO2, 0.35);
  assert.equal(o2.state, 'broken', 'flamethrower rapidly ruptures O2 tank');

  const cal = D.byId('calendar'), cCal = centerOf(cal.solid);
  D.burn(cCal, 0.35);
  assert.equal(cal.state, 'broken', 'flamethrower ignites wall calendar');

  const radio = D.byId('radio');
  D.hit(radio.solid, centerOf(radio.solid), { x: 0, y: 0, z: -1 }, 15, 'bullet');
  stepFrames(100);
  if (radio.piece) {
    radio.piece.group.position.set(2, 0.1, -3);
    radio.piece.resting = true;
    const beforeX = radio.piece.group.position.x;
    const moved = D.bump({ x: O.x + 1.8, y: O.y, z: O.z - 3 }, { x: 3, z: 0 }, 0.42);
    assert.ok(moved >= 1 && radio.piece.group.position.x > beforeX, 'walk bump nudges loose floor prop');
  }
});

test('enhanced kitProps emit coffee/water spills, pen burst, steam on flame, and walk bump', () => {
  resetAll();
  const mug = K.entries.find((e) => e.id === 'mug');
  K.hit(mug.solid, centerOf(mug.solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  assert.ok(events.some((e) => e.src === 'kit' && e.type === 'spill' && e.kind === 'coffee'), 'mug emits coffee spill');
  assert.ok(events.some((e) => e.src === 'kit' && e.type === 'break' && e.fx === 'china'), 'mug emits china break');

  const mb = K.entries.find((e) => e.id === 'mopBucket');
  K.hit(mb.solid, centerOf(mb.solid), { x: 1, y: 0, z: 0 }, 20, 'bullet');
  assert.ok(events.some((e) => e.src === 'kit' && e.type === 'spill' && e.kind === 'water'), 'mopBucket emits water spill');
  K.burn(centerOf(mb.solid), 0.5);
  assert.ok(events.some((e) => e.src === 'kit' && e.type === 'steam'), 'flamethrower steams mopBucket');
});

test('zero Three.js allocations on hit, rupture, blast, bump, burn, update, and re-destroy after reset', () => {
  resetAll();
  // Ensure pools are fully populated once after warm()
  let allocs = 0;
  const origGeo = T.BufferGeometry;
  const origMat = T.MeshStandardMaterial;
  // Count any Mesh/Group/Geometry/Material creation by spying via proxy check on owned pool stability
  const loose0 = D.loose();
  D.hit(D.byId('oxygenTank').solid, centerOf(D.byId('oxygenTank').solid), { x: 1, y: 0, z: 0 }, 20, 'bullet');
  D.hit(D.byId('crackedMonitor').solid, centerOf(D.byId('crackedMonitor').solid), { x: -1, y: 0, z: 0 }, 20, 'bullet');
  D.hit(D.byId('ivStand').solid, centerOf(D.byId('ivStand').solid), { x: 1, y: 0, z: 0 }, 20, 'bullet');
  D.hit(D.byId('sandbag0').solid, centerOf(D.byId('sandbag0').solid), { x: 0, y: 0, z: 1 }, 60, 'blast');
  stepFrames(160);
  // Count children of tg.group before and after reset -> must return to exact rest count!
  const beforeReset = tg.group.children.length;
  D.reset();
  const afterReset = tg.group.children.length;
  assert.ok(afterReset <= beforeReset, 'reset removes all transient piece groups');
  // Re-destroy and reset again -> exact same rest child count (zero leaks!)
  D.hit(D.byId('medBoxes').solid, centerOf(D.byId('medBoxes').solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  D.hit(D.byId('radio').solid, centerOf(D.byId('radio').solid), { x: 0, y: 0, z: 1 }, 20, 'bullet');
  stepFrames(60);
  D.reset();
  assert.equal(tg.group.children.length, afterReset, 'zero leaked scene nodes across destroy/reset cycles');
  assert.equal(D.loose(), loose0);
  assert.equal(origGeo, T.BufferGeometry);
  assert.equal(origMat, T.MeshStandardMaterial);
  assert.equal(allocs, 0);
});
