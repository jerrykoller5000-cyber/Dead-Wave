// The Training camera traces from the marine's head to the orbit eye. A wall
// or a visible station face cuts that segment before the eye can enter it.
const CAMERA_MARGIN=.12;
const CAMERA_GAP=.035;

// A pulled-in eye needs to look past the marine at what he faces. The regular
// orbit keeps the feet in view; that framing makes a close eye stare at them.
export function trainingCloseFraming(head,eye,look,forward,pull){
  const distance=Math.hypot(eye.x-head.x,eye.y-head.y,eye.z-head.z);
  const weight=Math.max(0,Math.min(1,(3.2-distance)/1.3));
  if(weight){
    eye.y+=(head.y+.32-eye.y)*weight;
    pull?.(head,eye);
    look.x+=(head.x+forward.x*3.5-look.x)*weight;
    look.y+=(head.y+.15-look.y)*weight;
    look.z+=(head.z+forward.z*3.5-look.z)*weight;
  }
  return distance;
}

// If the old orbit is squeezed between the marine and a station, move to the
// station's player side. Turning the eye alone cannot show a prop behind it.
export function trainingStationShoulder(head,eye,look,stations,pull,forward){
  let chosen=null,best=8.5,sideWeight=0;
  for(const s of Object.values(stations||{})){
    if(!s?.front||!Number.isFinite(s.x)||!Number.isFinite(s.z))continue;
    const nx=s.front.x-s.x,nz=s.front.z-s.z;
    const length=Math.hypot(nx,nz);
    if(length<1e-6)continue;
    if((head.x-s.front.x)*nx+(head.z-s.front.z)*nz<-.2*length)continue;
    // A nearby face across the corridor is not the one being approached.
    // Ease out at its edge so the marine stays in frame while walking past.
    const side=Math.abs((head.x-s.front.x)*nz-(head.z-s.front.z)*nx)/length;
    const across=Math.max(0,Math.min(1,(2.25-side)/.7));
    if(!across)continue;
    const d=Math.hypot(head.x-s.front.x,head.z-s.front.z);
    if(d<best){best=d;chosen=s;sideWeight=across*across*(3-2*across);}
  }
  if(!chosen)return null;
  const dx=chosen.front.x-chosen.x,dz=chosen.front.z-chosen.z;
  const length=Math.hypot(dx,dz)||1,nx=dx/length,nz=dz/length;
  // The station view is for approaching its face. Looking across that face
  // (such as down the firing lane) keeps the ordinary hip/ADS aim camera.
  const facing=forward?nx*forward.x+nz*forward.z:1;
  const facingWeight=Math.max(0,Math.min(1,(facing-.35)/.4));
  if(!facingWeight)return null;
  // Start on the open approach. Waiting for the ray to hit the station's
  // envelope makes a far orbit eye jump to the near face in one frame.
  const distanceWeight=Math.max(0,Math.min(1,(8.5-best)/4.7));
  const u=distanceWeight*distanceWeight*(3-2*distanceWeight)*facingWeight*facingWeight*(3-2*facingWeight)*sideWeight;
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
  let parts=null,keeperRoot=null;
  const materials=new Set(),copies=new Map();
  const fadeCopy=(source,helmet)=>{
    if(!source||source.transparent)return source;
    let pair=copies.get(source);
    if(!pair){pair={};copies.set(source,pair);}
    const key=helmet?'head':'body';
    if(!pair[key]){
      const fade=source.clone();
      fade.transparent=true;fade.depthWrite=false;fade.opacity=Math.min(source.opacity,.999);
      pair[key]=fade;materials.add(fade);
    }
    const fade=pair[key];
    fade.color?.copy(source.color);
    if(source.emissive){fade.emissive.copy(source.emissive);fade.emissiveIntensity=source.emissiveIntensity;}
    return fade;
  };
  function begin(){
    if(parts)return;
    parts=[];
    marine.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material)return;
      let p=mesh,helmet=false;
      while(p&&p!==marine){if(p===head){helmet=true;break;}p=p.parent;}
      const original=mesh.material;
      const faded=Array.isArray(original)?original.map(m=>fadeCopy(m,helmet)):fadeCopy(original,helmet);
      mesh.material=faded;
      parts.push({mesh,original,faded,helmet});
    });
  }
  function end(){
    if(!parts)return;
    for(const p of parts)p.mesh.material=p.original;
    parts=null;
  }
  function prepareWarmup(viewFirst = false){
    if (viewFirst) return () => {};
    end();begin();
    if(keeperRoot?.parent)keeperRoot.parent.remove(keeperRoot);
    keeperRoot=new marine.constructor();
    keeperRoot.name='training-marine-fade-pipeline-keepers';
    const parent=marine.parent;
    if(parent){
      parent.updateWorldMatrix(true,false);
      marine.updateWorldMatrix(true,true);
      const inverse=parent.matrixWorld.clone().invert();
      const seen=new Set();
      const matSig = (m) => {
        if (!m) return 'null';
        const custom = Object.hasOwn(m, 'customProgramCacheKey') ? m.customProgramCacheKey() : '';
        return `${m.type}:${custom}:${m.side}:${m.transparent?1:0}:${m.depthWrite?1:0}:${m.blending}:${m.polygonOffset?1:0}`;
      };
      for(const p of parts){
        if(!p.mesh.geometry||p.faded===p.original)continue;
        const originals=Array.isArray(p.original)?p.original:[p.original];
        const fades=Array.isArray(p.faded)?p.faded:[p.faded];
        if(fades.every((m,i)=>m===originals[i]))continue;
        const attributes=Object.entries(p.mesh.geometry.attributes||{}).map(([k,a])=>`${k}:${a.itemSize}:${a.normalized}:${a.array?.constructor?.name||'B'}`).join('|');
        const signature=`${originals.map(matSig).join(',')}/${fades.map(matSig).join(',')}/${attributes}/${p.mesh.isSkinnedMesh}/${p.mesh.isInstancedMesh}/${p.mesh.castShadow}/${p.mesh.receiveShadow}`;
        if(seen.has(signature))continue;
        seen.add(signature);
        const matsToKeep = [p.original];
        for(const material of matsToKeep){
          // Mesh.clone copies userData with JSON.stringify; the live marine's
          // metadata contains a large object graph and can throw RangeError.
          const keeper=new p.mesh.constructor(p.mesh.geometry,material,p.mesh.isInstancedMesh?1:undefined);
          if(p.mesh.isSkinnedMesh)keeper.bind(p.mesh.skeleton,p.mesh.bindMatrix);
          if(p.mesh.isInstancedMesh)keeper.instanceMatrix=p.mesh.instanceMatrix;
          keeper.castShadow=p.mesh.castShadow;
          keeper.receiveShadow=p.mesh.receiveShadow;
          keeper.frustumCulled=false;
          keeper.matrixAutoUpdate=false;
          keeper.matrix.copy(inverse.clone().multiply(p.mesh.matrixWorld));
          keeper.userData.pipelineKeeper=true;
          keeperRoot.add(keeper);
        }
      }
      parent.add(keeperRoot);
    }
    let restored=false;
    return ()=>{if(restored)return;restored=true;end();if(keeperRoot)keeperRoot.visible=false;};
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
          if(!m||!materials.has(m)||seen.has(m))continue;
          seen.add(m);
          // Head copies are separate even when body and helmet share a fabric.
          m.opacity=Math.min(p.helmet?helmet:body,.999);
        }
      }
      return {helmet,body};
    },
    reset:end,prepareWarmup
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
      // The down-facing range ceiling is a bullet solid, but the overhead
      // third-person eye must keep its existing view into the room.
      for(const b of tg.solids)if(!b.floor&&!b.ceiling&&b.target==null&&(!b.infirmaryFence||raisedFence()))candidates.push(b);
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
