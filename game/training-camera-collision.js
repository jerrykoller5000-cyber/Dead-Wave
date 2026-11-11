// The Training camera traces from the marine's head to the orbit eye. A wall
// or a visible station face cuts that segment before the eye can enter it.
const CAMERA_MARGIN=.12;
const CAMERA_GAP=.035;

export function trainingCameraContact(from,to,boxes,margin=CAMERA_MARGIN){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  const length=Math.hypot(dx,dy,dz);
  if(length<1e-6)return null;
  let nearest=1,found=null;
  for(const b of boxes){
    if(!b||b.target!=null||b.floor||!Number.isFinite(b.minX)||!Number.isFinite(b.maxX)||
      !Number.isFinite(b.minY)||!Number.isFinite(b.maxY)||!Number.isFinite(b.minZ)||!Number.isFinite(b.maxZ))continue;
    const minX=b.minX-margin,maxX=b.maxX+margin,minY=b.minY-margin,maxY=b.maxY+margin,minZ=b.minZ-margin,maxZ=b.maxZ+margin;
    // The head can start inside a high fixture. Its own collider handles that;
    // this ray should only stop at a face the camera moves into from outside.
    if(from.x>minX&&from.x<maxX&&from.y>minY&&from.y<maxY&&from.z>minZ&&from.z<maxZ)continue;
    let entry=0,exit=nearest,a,c;
    if(Math.abs(dx)<1e-9){if(from.x<minX||from.x>maxX)continue;}
    else {a=(minX-from.x)/dx;c=(maxX-from.x)/dx;if(a>c){const t=a;a=c;c=t;}entry=Math.max(entry,a);exit=Math.min(exit,c);if(entry>exit)continue;}
    if(Math.abs(dy)<1e-9){if(from.y<minY||from.y>maxY)continue;}
    else {a=(minY-from.y)/dy;c=(maxY-from.y)/dy;if(a>c){const t=a;a=c;c=t;}entry=Math.max(entry,a);exit=Math.min(exit,c);if(entry>exit)continue;}
    if(Math.abs(dz)<1e-9){if(from.z<minZ||from.z>maxZ)continue;}
    else {a=(minZ-from.z)/dz;c=(maxZ-from.z)/dz;if(a>c){const t=a;a=c;c=t;}entry=Math.max(entry,a);exit=Math.min(exit,c);if(entry>exit)continue;}
    if(entry>=0&&entry<nearest&&entry<=exit){nearest=entry;found=b;}
  }
  if(!found)return null;
  return {t:Math.max(0,nearest-CAMERA_GAP/length),box:found};
}

export function createTrainingCameraCollision(THREE,tg,stations,armoryCopy,raisedFence=()=>false){
  const extra=[...(stations?.boxes||[])];
  if(armoryCopy){
    const bounds=new THREE.Box3(),part=new THREE.Box3();
    armoryCopy.updateWorldMatrix(true,true);
    const visit=o=>{
      if(o.visible===false||o.name==='armoryRack')return;
      if(o.isMesh&&o.geometry)bounds.union(part.setFromObject(o));
      for(const child of o.children)visit(child);
    };
    visit(armoryCopy);
    if(!bounds.isEmpty())extra.push({name:'armory',minX:bounds.min.x,maxX:bounds.max.x,minY:bounds.min.y,maxY:bounds.max.y,minZ:bounds.min.z,maxZ:bounds.max.z});
  }
  const candidates=[];
  return {diveSolids:extra,boxes:extra,
    pull(from,eye){
      candidates.length=0;
      for(const b of tg.solids)if(!b.floor&&b.target==null&&(!b.infirmaryFence||raisedFence()))candidates.push(b);
      candidates.push(...extra);
      const hit=trainingCameraContact(from,eye,candidates);
      if(!hit)return null;
      eye.x=from.x+(eye.x-from.x)*hit.t;
      eye.y=from.y+(eye.y-from.y)*hit.t;
      eye.z=from.z+(eye.z-from.z)*hit.t;
      return hit;
    }
  };
}
