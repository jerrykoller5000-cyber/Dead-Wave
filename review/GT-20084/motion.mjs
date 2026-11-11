import {updateArtworkInstances} from '../../studio/weapon-model-hooks.js';

export function setSwitchShot(T,id) {
  const G=T.THREE,gun=T.weaponMeshes[id],control=gun.getObjectByName(gun.userData.controls.lightSwitch),unit=control.parent;
  const target=control.getWorldPosition(new G.Vector3()),axis=new G.Vector3(...gun.userData.lightSwitch.axis);
  const tangent=Math.abs(axis.x)>.8?new G.Vector3(0,.55,1):new G.Vector3(-1,.2,0);
  tangent.addScaledVector(axis,-axis.dot(tangent)).normalize();
  const orientation=unit.getWorldQuaternion(new G.Quaternion()),ray=new G.Raycaster();
  // Identify the genuinely moving triangles by comparing normal vertex data in
  // both poses. This is independent of the implementation of the control.
  const rest=new Map(),moving=new Map(),vertex=new G.Vector3();
  unit.traverseVisible(m=>{
    if(!m.isMesh)return;
    const positions=[];
    for(let i=0;i<m.geometry.attributes.position.count;i++)positions.push(...m.getVertexPosition(i,vertex).toArray());
    rest.set(m,positions);
  });
  setSwitchPress(T,id,true);
  for(const [mesh,p] of rest){
    const indices=new Set();
    for(let i=0;i<p.length/3;i++){
      mesh.getVertexPosition(i,vertex);
      if(Math.hypot(vertex.x-p[i*3],vertex.y-p[i*3+1],vertex.z-p[i*3+2])>1e-7)indices.add(i);
    }
    if(indices.size)moving.set(mesh,indices);
  }
  setSwitchPress(T,id,false);
  const parts=new Set();
  for(const root of [T.player,gun])root.traverseVisible(m=>{if(m.isMesh && !m.isInstancedMesh && m.material?.visible!==false)parts.add(m);});
  for(const tilt of [.54,.72,.88,.96])for(const angle of [0,Math.PI,Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4]){
    const direction=tangent.clone().applyAxisAngle(axis,angle).multiplyScalar(Math.sqrt(1-tilt*tilt)).addScaledVector(axis,-tilt).applyQuaternion(orientation);
    const eye=target.clone().addScaledVector(direction,.135);
    ray.set(eye,direction.clone().negate());ray.far=.138;
    const hits=[];
    for(const mesh of parts)G.Mesh.prototype.raycast.call(mesh,ray,hits);
    const hit=hits.sort((a,b)=>a.distance-b.distance)[0];
    const indices=moving.get(hit?.object);
    if(!indices || !hit.face || ![hit.face.a,hit.face.b,hit.face.c].some(i=>indices.has(i)))continue;
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:24});
    return {tilt,angle,distance:hit.distance};
  }
  throw Error('No unobstructed view of the moving contact surface on '+id);
}

export function switchRenderState(T,id){
  const G=T.THREE,gun=T.weaponMeshes[id],control=gun.getObjectByName(gun.userData.controls.lightSwitch),lamp=control.parent;
  const camera=T.inspectHost().camera,point=control.getWorldPosition(new G.Vector3()).project(camera),draws=[];
  lamp.traverseVisible(m=>{
    if(!m.isMesh)return;
    draws.push({geometry:m.geometry.uuid,material:m.material.name||m.material.type,type:m.material.type,
      activePad:m.geometry.userData?.lightSwitchPress||null});
  });
  const ray=new G.Raycaster();ray.setFromCamera(new G.Vector2(point.x,point.y),camera);
  const hits=[];
  gun.traverseVisible(m=>{
    if(!m.isMesh || m.isInstancedMesh || m.material?.visible===false)return;
    const local=[];G.Mesh.prototype.raycast.call(m,ray,local);
    for(const h of local){
      let p=m;while(p && p!==lamp)p=p.parent;
      hits.push({distance:h.distance,geometry:m.geometry.uuid,inLamp:!!p,activePad:m.geometry.userData?.lightSwitchPress||null,material:m.material.name||m.material.type});
    }
  });
  hits.sort((a,b)=>a.distance-b.distance);
  return {position:control.position.toArray(),projected:point.toArray(),draws,nearest:hits.slice(0,3)};
}

export function setSwitchPress(T,id,pressed){
  const gun=T.weaponMeshes[id],control=gun.getObjectByName(gun.userData.controls.lightSwitch),spec=gun.userData.lightSwitch;
  control.position.fromArray(control.userData.restPosition);
  if(pressed)control.position.addScaledVector(new T.THREE.Vector3(...spec.axis),spec.travel);
  updateArtworkInstances(T.THREE,gun);
}

export function inspectSwitches(T,id) {
  const source=T.weaponMeshes[id],vm=T.viewmodelDbg().gun,name=source.userData.controls?.lightSwitch;
  const copies={held:source,eye:vm.root,carry:T.carryGunCopyDbg(id)};
  if(T.offhandMeshes[id])copies.offhand=T.offhandMeshes[id];
  if(vm.ctrls.lightSwitch!==vm.root.getObjectByName(name))throw Error('Missing mapped eye control '+id);
  return inspectSwitchCopies(T,id,source,copies);
}

export function inspectSwitchCopies(T,id,source,copies){
  const G=T.THREE,name=source.userData.controls?.lightSwitch,spec=source.userData.lightSwitch;
  if(!name || !spec?.axis || !(spec.travel>0))throw Error('Missing light control '+id);
  const axis=new G.Vector3(...spec.axis);
  const result={id,name,axis:spec.axis,travel:spec.travel,copies:{}};

  function snapshot(unit) {
    const points=[];
    unit.updateWorldMatrix(true,true);
    const inverse=unit.matrixWorld.clone().invert();
    unit.traverseVisible(mesh=>{
      if(!mesh.isMesh || !mesh.geometry?.attributes?.position)return;
      const matrix=inverse.clone().multiply(mesh.matrixWorld),point=new G.Vector3();
      const position=mesh.geometry.attributes.position;
      for(let i=0;i<position.count;i++){
        mesh.getVertexPosition(i,point);point.applyMatrix4(matrix);points.push(...point.toArray());
      }
    });
    return points;
  }
  const originalCopies=new Map();
  for(const [key,root] of Object.entries(copies)){
    const lamp=root?.getObjectByName('laserLightUnit');
    if(!lamp)throw Error('Missing fitted copy '+id+'/'+key);
    originalCopies.set(key,snapshot(lamp));
  }
  for(const [copy,root] of Object.entries(copies)){
    const unit=root?.getObjectByName('laserLightUnit'),control=root?.getObjectByName(name);
    if(!unit || !control || control.parent!==unit)throw Error('Missing light or switch on '+id+'/'+copy);
    if(!unit.visible)throw Error('Light is not fitted on '+id+'/'+copy);
    updateArtworkInstances(G,root);
    const rest=control.userData.restPosition;
    if(!Array.isArray(rest) || rest.length!==3)throw Error('Missing rest position '+id+'/'+copy);
    const before=snapshot(unit),pose=control.position.clone();
    control.position.fromArray(rest).addScaledVector(axis,spec.travel);
    const start=performance.now();updateArtworkInstances(G,root);const pressSetupMs=performance.now()-start;
    const pressed=snapshot(unit);
    let otherCopyDrift=0;
    for(const [key,other] of Object.entries(copies)){
      if(key===copy)continue;
      const now=snapshot(other.getObjectByName('laserLightUnit')),original=originalCopies.get(key);
      if(now.length!==original.length) throw Error('Sibling copy changed vertex count');
      for(let i=0;i<now.length;i++)otherCopyDrift=Math.max(otherCopyDrift,Math.abs(now[i]-original[i]));
    }
    if(otherCopyDrift>1e-7)throw Error('Switch moved another fitted copy '+id+'/'+copy);
    control.position.copy(pose);updateArtworkInstances(G,root);
    const released=snapshot(unit);
    if(before.length!==pressed.length || before.length!==released.length)throw Error('Drawn vertex count changed');
    let moved=0,stationary=0,furthest=0,lateral=0,reset=0;
    const delta=new G.Vector3(),old=new G.Vector3(),after=new G.Vector3();
    for(let i=0;i<before.length;i+=3){
      old.fromArray(before,i);delta.fromArray(pressed,i).sub(old);
      const distance=delta.length(),along=delta.dot(axis);
      if(distance>1e-7)moved++;else stationary++;
      furthest=Math.max(furthest,along);
      lateral=Math.max(lateral,delta.addScaledVector(axis,-along).length());
      reset=Math.max(reset,after.fromArray(released,i).distanceTo(old));
    }
    result.copies[copy]={rest,moved,stationary,furthest,lateral,reset,otherCopyDrift,pressSetupMs};
  }
  return result;
}
