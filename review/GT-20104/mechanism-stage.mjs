// Review-only posing of the model contract. This does not change reload gameplay.
let original;
export async function stage(T,version,travel,light){
 await DWInspect.show('weapon.pistol',{view:false,instant:true});
 const H=T.inspectHost(),holder=H.scene.getObjectByName('inspector-subject:weapon.pistol');
 if(!holder?.children.length)throw Error('Missing public scene subject');
 const current=holder.children[0];let gun=current;
 if(version==='before'){
  if(!original){
   let source=await(await fetch('/review/GT-20104/weapon-sidearms.before.js')).text();
   source=source.replace(/from '\.\//g,"from '"+location.origin+"/studio/").replace(/from '\.\.\//g,"from '"+location.origin+"/");
   original=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
  }
  gun=original.makePistolModel(H.builders.weaponContext());
  gun.position.copy(current.position);gun.quaternion.copy(current.quaternion);gun.scale.copy(current.scale);
  for(const key of ['flash','laser','flare','flashLight'])if(gun.userData[key]?.isObject3D)gun.userData[key].visible=false;
  gun.traverse(o=>{if(o.isLight)o.intensity=0;if(o.name==='flash'||o.userData?.isFlash)o.visible=false;});
  current.visible=false;holder.add(gun);
 }
 gun.userData.slide.position.copy(gun.userData.baseSlidePos);gun.userData.slide.position.z-=travel;
 const part=gun.userData.barrelAssembly;
 if(part){
  const joint=Math.min(travel,.004),unlock=Math.max(0,Math.min(1,(travel-.004)/.004));
  part.position.set(0,.05-.010*unlock,.075-joint);part.rotation.set(-.05*unlock,0,0);
 }
 await DWInspect.light(light);gun.updateWorldMatrix(true,true);
 return {version,travel,light,barrel:part?{position:part.position.toArray(),rotation:part.rotation.toArray()}:null};
}
