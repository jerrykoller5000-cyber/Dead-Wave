import {createTrainingBlockers} from './training-infirmary.js';

// Use the actual cabinet, including its counter and surround. The displayed
// weapons are replaced by mirrorTrainingRack, so they must not define its size.
export function createTrainingArmoryCollision(THREE, copy) {
  const bounds=new THREE.Box3(),part=new THREE.Box3();
  copy.updateWorldMatrix(true,true);
  function visit(o) {
    if(o.visible===false || o.name==='armoryRack')return;
    if(o.isMesh && o.geometry)bounds.union(part.setFromObject(o));
    for(const c of o.children)visit(c);
  }
  visit(copy);
  if(bounds.isEmpty())return createTrainingBlockers([]);
  return createTrainingBlockers([{
    minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,
    minY:bounds.min.y,maxY:bounds.max.y
  }]);
}
