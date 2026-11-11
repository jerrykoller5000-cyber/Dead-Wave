import {applyViewGloveOutline} from './first-eye-only.mjs';
import {makeM4Model,makeAa12Model} from '../../studio/weapon-longarms.js';
import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {auditWeapon} from '../../tools/tests/weapon-seating.js';

export function inspectEye(T,id){
  const vm=T.viewmodelDbg(),g=vm.gun,G=T.THREE;
  if(g.key!==id || !vm.info.active)throw Error('Wrong eye copy');
  const pairs=g.pairs.filter(([,o])=>o.geometry?.userData?.viewGloveOutline);
  if(!pairs.length)throw Error('No fitted geometry in native eye copy '+id);
  const points=[],delta=new G.Vector3(),original=new G.Vector3(),revised=new G.Vector3();
  for(const [source,eye] of pairs){
    if(source.geometry===eye.geometry || source.geometry.userData.viewGloveOutline)throw Error('Source geometry changed');
    const a=source.geometry.attributes.position,b=eye.geometry.attributes.position;
    if(a.count!==b.count)throw Error('Tessellation changed');
    const m=new G.Matrix4();
    for(let n=eye;n && n!==g.root;n=n.parent){n.updateMatrix();m.premultiply(n.matrix);}
    for(let i=0;i<a.count;i++){
      original.fromBufferAttribute(a,i).applyMatrix4(m);revised.fromBufferAttribute(b,i).applyMatrix4(m);
      delta.subVectors(revised,original);
      if(delta.lengthSq()>1e-14)points.push({from:original.toArray(),to:revised.toArray(),delta:delta.toArray()});
    }
  }
  if(!points.length)throw Error('Display correction did not move native vertices');
  const axis=id==='aa12'?2:1,max=points.reduce((a,b)=>Math.abs(a.delta[axis])>Math.abs(b.delta[axis])?a:b);
  if(max.delta[axis]>=0 || points.some(p=>p.delta.some((x,j)=>j!==axis && Math.abs(x)>1e-5)))throw Error('Unexpected movement direction');
  const build={m4:makeM4Model,uzi:makeUziModel,aa12:makeAa12Model}[id];
  const raw=build({...T.inspectHost().builders.weaponContext(),finishGun:x=>x,mergeRigidMeshes:()=>{}});
  raw.visible=true;raw.scale.copy(T.weaponMeshes[id].scale);
  const u=raw.userData,options={metresPerUnit:1.8/1.655,ignore:[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)};
  const before=auditWeapon(raw,options);
  if(applyViewGloveOutline(G,raw,id)!==1)throw Error('Expected one affected part in the unbatched fit export');
  const after=auditWeapon(raw,options),key=r=>[r.a,r.b].sort().join('|'),old=new Set(before.rawOverlaps.map(key));
  const added=after.rawOverlaps.filter(r=>!old.has(key(r)));
  return {id,copies:pairs.length,moved:points.length,max,raw:{before:before.rawOverlaps.length,after:after.rawOverlaps.length,added,
    loose:[before.loose.length,after.loose.length],open:[before.openSurfaces,after.openSurfaces],parts:[before.parts,after.parts]},
    visibleFromEye:vm.gun.root.visible,trigger:vm.gun.ctrls?.trigger?.position.toArray()};
}
