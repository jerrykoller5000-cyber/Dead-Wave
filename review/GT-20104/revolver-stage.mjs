import {updateArtworkInstances} from '/studio/weapon-model-hooks.js';
let original;
export async function stage(T,version,part,light){
 await DWInspect.show('weapon.revolver',{view:false,instant:true});
 const H=T.inspectHost(),G=T.THREE,holder=H.scene.getObjectByName('inspector-subject:weapon.revolver'),current=holder.children[0];let gun=current;
 if(version==='before'){
  if(!original){let s=await(await fetch('/review/GT-20104/weapon-sidearms.before.js')).text();s=s.replace(/from '\.\//g,"from '"+location.origin+"/studio/").replace(/from '\.\.\//g,"from '"+location.origin+"/");original=await import(URL.createObjectURL(new Blob([s],{type:'text/javascript'})));}
  gun=original.makeRevolverModel(H.builders.weaponContext());
  gun.position.copy(current.position);gun.quaternion.copy(current.quaternion);gun.scale.setScalar(.7755247933884297);
  for(const k of ['flash','laser','flare','flashLight'])if(gun.userData[k]?.isObject3D)gun.userData[k].visible=false;
  gun.traverse(o=>{if(o.isLight)o.intensity=0;if(o.name==='flash'||o.userData?.isFlash)o.visible=false;});
  current.visible=false;holder.add(gun);gun.updateWorldMatrix(true,true);
  const box=new G.Box3();gun.traverseVisible(o=>{if(o.isMesh)box.expandByObject(o);});
  gun.position.y+=holder.position.y+1.1-box.getCenter(new G.Vector3()).y;
 }
 const u=gun.userData;
 if(part!=='hammer'){
  for(const node of u.chamberRounds||[])node.visible=false;
  for(const node of u.chamberNoses||[])node.visible=false;
  u.cylinder.position.copy(u.baseCylinderPos).add(new G.Vector3(-.095,-.008,.010));u.cylinder.rotation.y=-.16;
  if(u.empties)u.empties.visible=false;if(u.speedloader)u.speedloader.visible=false;if(u.palmRounds)u.palmRounds.visible=false;
 }
 updateArtworkInstances(G,gun);gun.updateWorldMatrix(true,true);await DWInspect.light(light);
 const point=part==='hammer'?new G.Vector3(0,.101,-.104).applyMatrix4(gun.matrixWorld):u.cylinder.getWorldPosition(new G.Vector3());
 const direction=part==='hammer'?new G.Vector3(.055,.045,-.085).normalize():new G.Vector3(.12,.12,part==='cylinder-rear'?-1:1).normalize().applyQuaternion(u.cylinder.getWorldQuaternion(new G.Quaternion()));
 const distance=part==='hammer'?.13:.19,eye=point.clone().addScaledVector(direction,distance);
 return {version,part,light,camera:{x:eye.x,y:eye.y,z:eye.z,tx:point.x,ty:point.y,tz:point.z,fov:35},scale:gun.scale.toArray()};
}
