import {createTrainingBlockers} from './training-infirmary.js';

// The visible station copies define the player's footprints. The Armory has its
// own collision, and the range console supplies its own through RangeFeature.
export function createTrainingStationCollision(THREE, tg, copies) {
  tg.group.updateMatrixWorld(true);
  const boxes = [];
  for (const name of ['cif', 'kiosk', 'hqPanel', 'skullWindow']) {
    const copy = copies[name]?.copy;
    if (!copy) continue;
    const b = new THREE.Box3().setFromObject(copy);
    if (!b.isEmpty()) boxes.push({name,minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});
  }
  const switchRoot = tg.group.getObjectByName('training-light-switch-lever')?.parent;
  if (switchRoot) {
    const b = new THREE.Box3().setFromObject(switchRoot);
    if (!b.isEmpty()) boxes.push({name:'lightSwitch',minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});
  }
  return {...createTrainingBlockers(boxes), boxes};
}
