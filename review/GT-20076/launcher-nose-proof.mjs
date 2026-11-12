import {makeLauncherModel} from '../../studio/weapon-heavy.js';
import {visibleSurfaceGap,visiblePieces,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {exteriorSamples} from './stock-mount-proof.mjs';
import {checkNativeHeatProfile} from './wasp-collar-proof.mjs';

export function checkLauncherNose(T,id,baseline,pictures=false){
  if(id!=='launcher')throw Error('Wrong model');
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE;let barrel,cap,original;
  const model=makeLauncherModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,lathe(profile,mat,o){
      const mesh=k.lathe(profile,mat,o);
      if(profile.length===8&&profile[0][1]===.2&&profile[1][0]===.052){barrel=mesh;original=mesh.geometry.clone();}
      if(profile.length===6&&profile[0][1]===.65&&profile[1][0]===.062)cap=mesh;
      return mesh;
    }};
  }});
  if(!barrel||!cap)throw Error('Missing model artwork');
  model.visible=true;model.scale.copy(T.weaponMeshes.launcher.scale);
  const u=model.userData,current=barrel.geometry;
  const show=phase=>{barrel.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different original launcher '+hash+' '+baseline);
  show('after');if(pictures)return {model,show,hash};
  const closed=[barrel,cap].map(m=>visiblePieces(m,1.8/1.655).map(p=>p.closed)),gap=visibleSurfaceGap(barrel,cap,1.8/1.655);
  const anchor=barrel.parent.position.toArray(),muzzle=u.muzzleLocal.toArray();
  const exposed=exteriorSamples({geometry:current,position:new G.Vector3()},original,2,-1,-.64999,true);
  const proxy=m=>({geometry:m.geometry,position:model.worldToLocal(m.getWorldPosition(new G.Vector3()))});
  show('before');const a=sideSkin(G,[proxy(barrel),proxy(cap)]);show('after');const b=sideSkin(G,[proxy(barrel),proxy(cap)]);
  const profile={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
  for(let i=0;i<181;i++)for(let j=0;j<218;j++){
    const z=.641033+i*.000235,y=-.023127+j*.00058,old=a(z,y),now=b(z,y);
    if(!Number.isFinite(old)&&!Number.isFinite(now))continue;profile.occupied++;
    if(!Number.isFinite(old)){profile.added++;continue;}if(!Number.isFinite(now)){profile.lost++;continue;}
    profile.maxIn=Math.max(profile.maxIn,old-now);profile.maxOut=Math.max(profile.maxOut,now-old);
  }
  return {hash,closed,gap,exposed,profile,anchor,muzzle,triangles:[original,current].map(g=>g.attributes.position.count/3)};
}

export function checkLauncherHeat(T,baseline){
  const original=checkLauncherNose(T,'launcher',baseline,true);
  return checkNativeHeatProfile(T,'launcher',original);
}
