import test from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityCollision } from './zombie-ability-collision.js';
import { sweptSphereHit } from './zombie-abilities.js';

const p = (x, y = 1, z = 0) => ({ x, y, z });
const near = (a, b, epsilon = 1e-8) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const slab = (x, half = .2) => ({ minX: x - half, maxX: x + half, minY: 0, maxY: 4, minZ: -2, maxZ: 2 });
function segmentBox(ax, ay, az, bx, by, bz, cx, cy, cz, hx, hy, hz) {
  let lo = 0, hi = 1;
  for (const [origin, direction, half] of [[ax - cx, bx - ax, hx], [ay - cy, by - ay, hy], [az - cz, bz - az, hz]]) {
    if (Math.abs(direction) < 1e-9) { if (Math.abs(origin) > half) return null; continue; }
    const u = (-half - origin) / direction, v = (half - origin) / direction;
    lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v));
    if (lo > hi) return null;
  }
  return lo;
}
function segmentCylinder(ax, ay, az, bx, by, bz, cx, cz, radius, y0, y1) {
  let lo = 0, hi = 1;
  const dx = bx - ax, dy = by - ay, dz = bz - az, ox = ax - cx, oz = az - cz;
  if (Math.abs(dy) < 1e-9) { if (ay < y0 || ay > y1) return null; }
  else { const u = (y0 - ay) / dy, v = (y1 - ay) / dy; lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v)); }
  const a = dx * dx + dz * dz, c = ox * ox + oz * oz - radius * radius;
  if (a < 1e-9) { if (c > 0) return null; }
  else {
    const b = ox * dx + oz * dz, d = b * b - a * c;
    if (d < 0) return null;
    lo = Math.max(lo, (-b - Math.sqrt(d)) / a); hi = Math.min(hi, (-b + Math.sqrt(d)) / a);
  }
  return lo <= hi ? lo : null;
}
const buildAt = (x, type = 'wall') => ({ x, z: 0, hp: 100, type, radius: 1, mesh: { position: { y: 0 } } });
function make(world = {}, ground = () => 0, build = (b, ...args) => b.open ? null : segmentBox(...args, b.x, 2, b.z, .2, 2, 1)) {
  return createAbilityCollision({ world: () => world, ground, box: segmentBox, cylinder: segmentCylinder, build });
}

test('the nearest obstruction wins irrespective of storage order and player distance', () => {
  const wall = buildAt(5), far = buildAt(9);
  const collision = make({ builds: [far, wall] });
  const hit = collision.trace(p(0), p(12), .2);
  assert.equal(hit.build, wall); near(hit.t, 4.6 / 12);
  const playerT = sweptSphereHit(p(0), p(12), p(8), .6);
  assert(hit.t < playerT);
  assert.equal(collision.lineClear(p(0), p(12)), false);
});

test('Training security door solids close the same route for line and projectile', () => {
  const world = { trainingTg: { solids: [slab(5)], targets: [], floorY: -200 } };
  const collision = make(world, () => -200);
  near(collision.trace(p(0), p(10), .3).t, .45);
  assert.equal(collision.lineClear(p(0), p(10)), false);
  world.trainingTg.solids.length = 0;
  assert.equal(collision.lineClear(p(0), p(10)), true);
});

test('down pop-up targets do not leave invisible collision blocks', () => {
  const target = { ...slab(5), target: 0 };
  const world = { trainingTg: { solids: [target], targets: [{ state: 'down' }] } };
  const collision = make(world);
  assert.equal(collision.trace(p(0), p(10)), null);
  world.trainingTg.targets[0].state = 'up';
  assert.equal(collision.trace(p(0), p(10)).surface, 'training');
});

test('expanded room boxes stop grazing radii and short segments initially inside cover', () => {
  const world = { belowSolids: [slab(5)] }, collision = make(world);
  assert.equal(collision.trace(p(0, 1, 2.2), p(10, 1, 2.2), .1), null);
  assert(collision.trace(p(0, 1, 2.2), p(10, 1, 2.2), .3));
  assert.equal(collision.trace(p(5), p(5.01)).t, 0);
});

test('underground holes stay null and do not fall back to outdoor terrain or props', () => {
  const outdoor = { rocks: [{ x: 5, z: 0, radius: 2, height: 10, alive: true, mesh: { position: { y: -20 }, visible: true } }], worldSolids: [{ x: 6, z: 0, radius: 2, y0: -30, y1: 10 }] };
  assert.equal(make({ ...outdoor, belowSolids: [] }, () => null).trace(p(0, -10), p(10, -10), .3), null);
  assert.equal(make({ ...outdoor, trainingTg: { solids: [], targets: [] } }, () => -200).trace(p(0, -10), p(10, -10), .3), null);
});

test('floor sweep finds the first radius-offset crossing instead of end-of-frame contact', () => {
  const hit = make({}, () => 2).trace(p(0, 4), p(10, 0), .5);
  assert.equal(hit.surface, 'ground'); near(hit.t, .375);
  assert.equal(make({}, () => 2).trace(p(0, 2.3), p(.01, 2.3), .5).t, 0);
});

test('a floor entry in the last partial sample still wins over a wall immediately behind it', () => {
  const wall = buildAt(5.15);
  const ground = () => .05;
  const hit = make({ builds: [wall] }, ground).trace(p(0, 2), p(10, -2));
  assert.equal(hit.surface, 'ground'); near(hit.t, .4875);
});

test('raised ground entered horizontally is detected within one quarter-metre sample', () => {
  const hit = make({}, x => x < 3 ? 0 : 2).trace(p(0), p(10), .1);
  assert.equal(hit.surface, 'ground'); assert(hit.t >= .275 && hit.t <= .3);
});

test('ground uses local projectile height to distinguish a roof or deck from overhead floors', () => {
  const references = [];
  const ground = (x, z, y) => { references.push(y); return y >= 6 ? 6 : 0; };
  assert.equal(make({}, ground).trace(p(0, 2), p(5, 2), .2), null);
  const roof = make({}, ground).trace(p(0, 8), p(5, 5), .5);
  assert.equal(roof.surface, 'ground'); assert(roof.t < .6);
  assert(references.every(Number.isFinite));
});

test('an unknown floor interval is not interpolated as if it were solid', () => {
  const collision = make({ belowSolids: [] }, x => x < 2 ? null : 0);
  const hit = collision.trace(p(0, -.5), p(4, -.5));
  near(hit.t, .5);
});

test('outdoor house, rocks, trunks, canopy, stumps and world solids block their actual height range', () => {
  const house = { present: true, half: 1, group: { position: p(5, 0) } };
  near(make({ house, houseHeight: 5.4 }).trace(p(0), p(10), .2).t, .38);
  const rock = { x: 5, z: 0, radius: 1, height: 2, alive: true, mesh: { position: p(5, 0), visible: true } };
  near(make({ rocks: [rock] }).trace(p(0), p(10), .2).t, .38);
  assert.equal(make({ rocks: [{ ...rock, alive: false }] }).trace(p(0), p(10)), null);
  const tree = { x: 5, z: 0, alive: true, group: { position: p(5, 0) }, trunkRadius: .3, canopyRadius: 2, canopyBottom: 3, canopyTop: 6, leafHealth: 10 };
  assert.equal(make({ trees: [tree] }).trace(p(0), p(10)).surface, 'tree');
  near(make({ trees: [tree] }).trace(p(0, 5), p(10, 5)).t, .32);
  assert.equal(make({ trees: [{ ...tree, falling: true }] }).trace(p(0), p(10)), null);
  const stump = { ...tree, alive: false, stump: true, stumpMesh: { position: p(5, 0) } };
  assert.equal(make({ trees: [stump] }).trace(p(0, .3), p(10, .3)).surface, 'tree');
  assert.equal(make({ trees: [stump] }).trace(p(0, 2), p(10, 2)), null);
  const solid = { x: 5, z: 0, radius: 1, y0: 1, y1: 3 };
  assert.equal(make({ worldSolids: [solid] }).trace(p(0, 2), p(10, 2)).surface, 'world');
  assert.equal(make({ worldSolids: [solid] }).trace(p(0, 5), p(10, 5)), null);
});

test('build shape callback preserves open doors/windows and wire while railings remain solid', () => {
  const door = buildAt(5), collision = make({ builds: [door] });
  door.open = true; assert.equal(collision.trace(p(0), p(10), .4), null);
  door.open = false; assert.equal(collision.trace(p(0), p(10), .4).build, door);
  assert.equal(make({ builds: [buildAt(5, 'wire')] }).trace(p(0), p(10)), null);
  assert.equal(make({ builds: [buildAt(5, 'railing')] }).trace(p(0), p(10)).build.type, 'railing');
  const window = buildAt(5);
  const windowQuery = (b, ax, ay, az, bx, by, bz) => ay > 1 && ay < 3 && by > 1 && by < 3 ? null : segmentBox(ax, ay, az, bx, by, bz, b.x, 2, 0, .2, 2, 1);
  assert.equal(make({ builds: [window] }, () => 0, windowQuery).trace(p(0, 2), p(10, 2), .4), null);
  assert(make({ builds: [window] }, () => 0, windowQuery).trace(p(0, 2), p(10, 2), 1.1));
});

test('segment bounds reject far objects while retaining linked build arms', () => {
  let calls = 0;
  const arm = buildAt(5), far = buildAt(500);
  const collision = make({ builds: [far, arm], buildGrid: 2.5 }, () => 0, (b, ...args) => { calls++; return segmentBox(...args, b.x - 1.5, 2, 0, .2, 2, 1); });
  assert(collision.trace(p(0), p(3.5))); assert.equal(calls, 1);
});

test('invalid points and radii produce no bogus collision fraction', () => {
  const collision = make({ belowSolids: [slab(5)] });
  assert.equal(collision.trace(p(NaN), p(10)), null);
  assert.equal(collision.trace(p(0), p(10), Infinity), null);
  assert.equal(collision.trace(p(0), p(10), -1), null);
  assert.equal(collision.trace(p(0), p(0)), null);
  assert.throws(() => createAbilityCollision({}), TypeError);
});
