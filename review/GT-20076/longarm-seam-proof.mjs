import {makeM4Model,makeAkModel} from '../../studio/weapon-longarms.js';

export function checkLongarmSeam(T,id) {
  const G=T.THREE, ctx=T.inspectHost().builders.weaponContext();
  const model=({m4:makeM4Model,ak:makeAkModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const box=o=>new G.Box3().setFromObject(o,true);
  // The same root transform applies to the source panels. Measure in builder units.
  model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);model.updateMatrixWorld(true);
  if(id==='m4'){
    const trim=box(model.getObjectByName('GW-4 rear face'));
    const work=model.userData.work,checks=[];
    for(const pos of [0,-.05,-.1]){
      work.position.z=-.195+pos;model.updateMatrixWorld(true);
      const gaps=[0,2].map(i=>box(work.children[i]).min.y-trim.max.y);
      if(gaps.some(n=>n<0))throw Error('Moving drawing crossed the top of the fixed trim');
      checks.push({offsetZ:pos,gaps});
    }
    // Sample the local tube cross section at the trim, away from the higher end collar.
    const tube=model.getObjectByName('GW-4 tube'),geo=tube.geometry.attributes.position,local=new G.Vector3();
    let support=-Infinity;
    for(let i=0;i<geo.count;i++){
      local.fromBufferAttribute(geo,i).applyMatrix4(tube.matrixWorld);
      if(Math.abs(local.z+.19)<.00001) support=Math.max(support,local.y);
    }
    if(!Number.isFinite(support)||Math.abs(trim.min.y-support)>.0005)throw Error('Lost contact with rear tube');
    return {trimBottom:trim.min.y,trimTop:trim.max.y,support,checks};
  }
  const lowerTop=box(model.children[1]).max.y,upper=model.children[0],pos=upper.geometry.attributes.position;
  const local=new G.Vector3();let upperFloor=Infinity;
  for(let i=0;i<pos.count;i++){
    local.fromBufferAttribute(pos,i).applyMatrix4(upper.matrixWorld);
    if(local.z>=-.11)upperFloor=Math.min(upperFloor,local.y);
  }
  const gap=upperFloor-lowerTop;
  if(Math.abs(gap)>1e-6)throw Error('KR-7 shell seam is separated or crossing');
  return {upperFloor,lowerTop,gap};
}
