// GP-20101: gameplay placement and lifetime for AG-308's Training dummy.
import { buildTrainingDummy } from '../world/training-dummy.js';

// Behind the bench, between lanes 4 and 5, with walking room on all sides.
// Related practice equipment stays close (world-design rules 1 and 8) while
// the firing paths and the wall terminals retain their negative space (rule 4).
export const TRAINING_DUMMY_SPOT = Object.freeze({ x: -5.0, z: -2.8, yaw: 0 });

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
  return {
    model: dummy,
    solid: dummy.solid,
    enter(scene) { if (dummy.group.parent !== scene) scene.add(dummy.group); dummy.syncTransform(); dummy.reset(); },
    leave() { dummy.group.removeFromParent(); },
    trace: (a, b, pad = 0) => dummy.traceSegment(a, b, pad),
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
