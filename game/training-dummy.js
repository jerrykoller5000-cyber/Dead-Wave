// GP-20101: gameplay placement and lifetime for AG-308's Training dummy.
import { buildTrainingDummy } from '../world/training-dummy.js';
import { bladeColumn } from '../combat/saw-blade.js';

// J151 note 19: between the range console and bench, facing into the room.
// The weighted base clears the inner wall by .53 m (1.74 ft); the console and
// bench keep their approach space (world-design rules 1, 4 and 8).
export const TRAINING_DUMMY_SPOT = Object.freeze({ x: -6.85, z: -2.1, yaw: Math.PI / 2 });
// The saw uses the same forgiving upright-column rule as it does on zombies.
// Its practice column is wider than the walk collider; marks still project to
// the actual sculpted surface, while a direct chain contact takes precedence.
export const TRAINING_DUMMY_SAW_RADIUS = 0.52;

export function createTrainingDummyExercise(THREE, tg) {
  const spot = TRAINING_DUMMY_SPOT;
  const dummy = buildTrainingDummy(THREE, {
    x: tg.origin.x + spot.x,
    y: tg.floorY,
    z: tg.origin.z + spot.z,
    yaw: spot.yaw
  });
  // This is a prop collider, not a scored plate. Ballistics, aim and the
  // third-person wall hold share this descriptor; direct contact refines it.
  tg.solids.push(dummy.solid);
  const sawPoint = { x: 0, y: 0, z: 0, d: 0 };
  function sawContact(bl) {
    const from = { x: bl.ax, y: bl.ay, z: bl.az };
    const to = { x: bl.bx, y: bl.by, z: bl.bz };
    const exact = dummy.traceSegment(from, to, bl.r);
    if (exact) return exact;
    if (!bladeColumn(bl, dummy.solid.cx, dummy.solid.cz, TRAINING_DUMMY_SAW_RADIUS,
      dummy.solid.minY, dummy.solid.maxY, sawPoint)) return null;
    return { point: { x: sawPoint.x, y: sawPoint.y, z: sawPoint.z }, source: 'zombie-column' };
  }
  return {
    model: dummy,
    solid: dummy.solid,
    enter(scene) { if (dummy.group.parent !== scene) scene.add(dummy.group); dummy.syncTransform(); dummy.reset(); },
    leave() { dummy.group.removeFromParent(); },
    trace: (a, b, pad = 0) => dummy.traceSegment(a, b, pad),
    sawContact,
    strike: (hit) => dummy.strike(hit),
    pushOut: (pos, radius) => dummy.pushOut(pos, radius),
    reset: () => dummy.reset(),
    update: (dt) => dummy.update(dt),
    state: () => dummy.state(),
    prepareWarmup: () => dummy.prepareWarmup(),
    dispose() {
      dummy.dispose();
      const i = tg.solids.indexOf(dummy.solid);
      if (i >= 0) tg.solids.splice(i, 1);
    }
  };
}
