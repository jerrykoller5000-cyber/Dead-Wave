// The Training camera traces from the marine's head to the orbit eye. A wall
// or a visible station face cuts that segment before the eye can enter it.
const CAMERA_MARGIN=.12;
const CAMERA_GAP=.035;

// A pulled-in eye needs to look past the marine at what he faces. The regular
// orbit keeps the feet in view; that framing makes a close eye stare at them.
export function trainingCloseFraming(head,eye,look,forward){
  const distance=Math.hypot(eye.x-head.x,eye.y-head.y,eye.z-head.z);
  const weight=Math.max(0,Math.min(1,(3.2-distance)/1.3));
  if(weight){
    look.x+=(head.x+forward.x*3.5-look.x)*weight;
    look.y+=(head.y+.15-look.y)*weight;
    look.z+=(head.z+forward.z*3.5-look.z)*weight;
  }
  return distance;
}

// If the old orbit is squeezed between the marine and a station, move to the
// station's player side. Turning the eye alone cannot show a prop behind it.
export function trainingStationShoulder(head,eye,look,stations,pull){
  let chosen=null,best=3.8;
  for(const s of Object.values(stations||{})){
    if(!s?.front||!Number.isFinite(s.x)||!Number.isFinite(s.z))continue;
    const d=Math.hypot(head.x-s.front.x,head.z-s.front.z);
    if(d<best){best=d;chosen=s;}
  }
  if(!chosen)return null;
  const dx=chosen.front.x-chosen.x,dz=chosen.front.z-chosen.z;
  const length=Math.hypot(dx,dz)||1,nx=dx/length,nz=dz/length;
  const distanceWeight=Math.max(0,Math.min(1,(3.8-best)/2));
  const u=distanceWeight*distanceWeight*(3-2*distanceWeight);
  eye.x+=(head.x+nx*1.5+nz*.45-eye.x)*u;
  eye.y+=(head.y+.32-eye.y)*u;
  eye.z+=(head.z+nz*1.5-nx*.45-eye.z)*u;
  pull(head,eye);
  look.x+=(chosen.x-look.x)*u;
  look.y+=(chosen.y+1.55-look.y)*u;
  look.z+=(chosen.z-look.z)*u;
  return chosen;
}

// The helmet goes first; at the closest pull the rest of the marine follows.
// Material copies keep the world gun, other marines and shared clothing opaque.
export function createTrainingMarineFade(marine){
  const head=marine.userData.headG;
  let parts=null,materials=null,owned=null;
  function begin(){
    parts=[];materials=[];owned=new Set();
    const copies=new Map();
    marine.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material)return;
      let p=mesh,helmet=false;
      while(p&&p!==marine){if(p===head){helmet=true;break;}p=p.parent;}
      const original=mesh.material;
      const clone=m=>{
        if(!m||m.transparent)return m;
        const key=helmet?'head':'body';
        let pair=copies.get(m);
        if(!pair){pair={};copies.set(m,pair);}
        if(!pair[key]){pair[key]=m.clone();pair[key].transparent=true;pair[key].depthWrite=false;pair[key].needsUpdate=true;materials.push(pair[key]);owned.add(pair[key]);}
        return pair[key];
      };
      mesh.material=Array.isArray(original)?original.map(clone):clone(original);
      parts.push({mesh,original,helmet});
    });
  }
  function end(){
    if(!parts)return;
    for(const p of parts)p.mesh.material=p.original;
    for(const m of materials)m.dispose();
    parts=materials=owned=null;
  }
  return {
    update(distance){
      const helmet=Math.max(0,Math.min(1,(distance-.35)/.45));
      const body=Math.max(0,Math.min(1,(distance-.25)/.35));
      if(helmet>=1&&body>=1){end();return {helmet:1,body:1};}
      if(!parts)begin();
      const seen=new Set();
      for(const p of parts){
        const ms=Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material];
        for(const m of ms){
          if(!m||!owned.has(m)||seen.has(m))continue;
          seen.add(m);
          // Head copies are separate even when body and helmet share a fabric.
          m.opacity=p.helmet?helmet:body;
        }
      }
      return {helmet,body};
    },
    reset:end
  };
}

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
