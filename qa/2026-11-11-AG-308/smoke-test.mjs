import fs from 'node:fs';
import * as THREE from '../../vendor/three/three.core.js';
import { buildTrainingDummy, DUMMY_SPEC, RECOMMENDED_DUMMY_SPOT } from '../../world/training-dummy.js';

const rawBuf = fs.readFileSync('world/training-dummy.js');
let crCount = 0, lfCount = 0;
for (let i = 0; i < rawBuf.length; i++) {
  if (rawBuf[i] === 13) crCount++;
  if (rawBuf[i] === 10) lfCount++;
}
console.log('Line endings:', { bytes: rawBuf.length, crCount, lfCount });
if (crCount !== 0) throw new Error(`Expected pure LF (crCount=0), got crCount=${crCount}`);

const d = buildTrainingDummy(THREE, {
  x: RECOMMENDED_DUMMY_SPOT.x,
  y: 0,
  z: RECOMMENDED_DUMMY_SPOT.z,
  yaw: RECOMMENDED_DUMMY_SPOT.yaw
});

const countVisibleMeshes = () => {
  let visible = 0, total = 0, tris = 0;
  d.group.traverse((o) => {
    if (o.isMesh) {
      total++;
      if (o.visible) {
        visible++;
        const g = o.geometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      }
    }
  });
  return { visible, total, tris };
};

const box = new THREE.Box3();
d.group.updateMatrixWorld(true);
d.group.traverse((o) => {
  if (o.isMesh && o.visible) box.expandByObject(o);
});

const unmarked = countVisibleMeshes();
console.log('Unmarked bounds & cost:', {
  minY: +box.min.y.toFixed(6),
  maxY: +box.max.y.toFixed(4),
  spanX: +(box.max.x - box.min.x).toFixed(4),
  spanZ: +(box.max.z - box.min.z).toFixed(4),
  ...unmarked
});
if (Math.abs(box.min.y) > 0.0005) throw new Error(`Base not flush on y=0: minY=${box.min.y}`);
if (Math.abs(box.max.y - DUMMY_SPEC.height) > 0.01) throw new Error(`Unexpected height: maxY=${box.max.y}`);
if (unmarked.visible > 4) throw new Error(`Expected <= 4 visible draws unmarked, got ${unmarked.visible}`);

// Warmup check
const restoreWarmup = d.prepareWarmup();
const duringWarmup = countVisibleMeshes();
restoreWarmup();
const afterWarmup = countVisibleMeshes();
console.log('Warmup draws:', { during: duringWarmup.visible, restored: afterWarmup.visible });
if (afterWarmup.visible !== unmarked.visible) throw new Error('Warmup restore mismatch');

// Raycast all 4 vertical zones
const ox = RECOMMENDED_DUMMY_SPOT.x, oz = RECOMMENDED_DUMMY_SPOT.z, yaw = RECOMMENDED_DUMMY_SPOT.yaw;
const frontX = ox + Math.sin(yaw) * 1.4, frontZ = oz + Math.cos(yaw) * 1.4;
for (const [expectedZone, y] of [['head', 1.68], ['torso', 1.25], ['post', 0.56], ['base', 0.08]]) {
  const hit = d.traceSegment({ x: frontX, y, z: frontZ }, { x: ox, y, z: oz });
  console.log(`traceSegment(${expectedZone}, y=${y}):`, hit ? { zone: hit.zone, t: +hit.t.toFixed(3), py: +hit.point.y.toFixed(3) } : null);
  if (!hit || hit.zone !== expectedZone) throw new Error(`Expected zone ${expectedZone}, got ${hit && hit.zone}`);
}

// PushOut solid collision check
const actorPos = { x: ox + 0.20, y: 0, z: oz + 0.15 };
const pushed = d.pushOut(actorPos, 0.36);
const distAfter = Math.hypot(actorPos.x - ox, actorPos.z - oz);
console.log('pushOut:', { pushed, distAfter: +distAfter.toFixed(4), expectedMin: +(DUMMY_SPEC.baseRadius + 0.36).toFixed(4) });
if (!pushed || Math.abs(distAfter - (DUMMY_SPEC.baseRadius + 0.36)) > 0.002) throw new Error('pushOut failed');

// Strike all weapon kinds & inspect wobble curve
const chestHit = d.traceSegment({ x: frontX, y: 1.28, z: frontZ }, { x: ox, y: 1.28, z: oz });
d.strike({ kind: 'knife', point: chestHit.point, direction: { x: ox - frontX, y: -0.1, z: oz - frontZ }, slashDir: { x: 0.7, y: -0.5, z: 0 }, damage: 25 });
d.strike({ kind: 'machete', point: { x: chestHit.point.x + 0.06, y: 1.18, z: chestHit.point.z }, direction: { x: ox - frontX, y: -0.2, z: oz - frontZ }, slashDir: { x: -0.8, y: -0.45, z: 0 }, damage: 55 });
d.strike({ kind: 'katana', point: { x: chestHit.point.x - 0.04, y: 1.34, z: chestHit.point.z }, direction: { x: ox - frontX, y: -0.2, z: oz - frontZ }, slashDir: { x: -0.7, y: -0.7, z: 0 }, damage: 70 });
d.strike({ kind: 'chainsaw', point: { x: chestHit.point.x, y: 1.06, z: chestHit.point.z }, direction: { x: ox - frontX, y: 0, z: oz - frontZ }, slashDir: { x: 0.9, y: 0.1, z: 0 }, damage: 18, forceMark: true });
d.strike({ kind: 'scorch', point: { x: chestHit.point.x + 0.03, y: 1.04, z: chestHit.point.z }, damage: 8 });
d.strike({ kind: 'bullet', point: { x: chestHit.point.x - 0.08, y: 1.66, z: chestHit.point.z }, direction: { x: ox - frontX, y: 0, z: oz - frontZ }, damage: 30 });

const marked = countVisibleMeshes();
console.log('Marked cost & state:', { ...marked, state: d.state() });
if (marked.visible !== 5) throw new Error(`Expected 5 visible draws when marked, got ${marked.visible}`);

const wobbleSamples = [];
for (let i = 0; i <= 16; i++) {
  if (i > 0) d.update(0.08);
  wobbleSamples.push(+(d.state().tiltRad * 180 / Math.PI).toFixed(2));
}
console.log('Wobble deg @ 80ms steps (0..1.28s):', wobbleSamples.join(' -> '));

d.reset();
const afterReset = countVisibleMeshes();
console.log('After reset:', { visible: afterReset.visible, state: d.state() });
if (afterReset.visible !== 4 || d.state().hits !== 0 || d.state().markCount !== 0) throw new Error('Reset failed');
d.dispose();
console.log('ALL SMOKE CHECKS PASSED!');
