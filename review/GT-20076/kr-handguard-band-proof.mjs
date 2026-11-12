import {makeAkModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';

export function checkKrBand(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let band,original,lower,upper;
  const model=makeAkModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);return {...kit,slab(points,width,material,opts){
      const m=kit.slab(points,width,material,opts);
      if(width===.062&&points[0][0]===.244)lower=m;
      if(width===.044&&points[0][0]===.248)upper=m;
      return m;
    },box(...args){
      const m=kit.box(...args);if(args[0]===.064&&args[1]===.064&&args[2]===.014&&args[6]===.512){band=m;original=m.geometry;}
      return m;
    }};
  }});
  if(!band||!lower||!upper||model.children[63]!==band)throw Error('Missing or unexpected KR-7 band/wood');
  const latch=model.children[65],tube=model.children[66],u=model.userData;
  const barrel=model.getObjectByName(u.heatParts.barrel).children.find(o=>o.isMesh);
  const current=band.geometry;model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{band.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original KR-7 model differs '+hash+' / '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const parts=[band,lower,upper,latch,tube,barrel],names=['band','lower','upper','latch','tube','barrel'];
  const gaps=parts.slice(1).map(p=>visibleSurfaceGap(band,p,1.8/1.655));
  const closed=visiblePieces(band,1.8/1.655).map(c=>c.closed);
  const inv=model.matrixWorld.clone().invert();
  function localParts(phase){
    show(phase);return parts.map(m=>({position:new G.Vector3(),geometry:m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))}));
  }
  const old=localParts('before'),now=localParts('after'),profiles={};
  for(const [axis,sign] of [['x',1],['x',-1],['y',1],['y',-1],['z',1],['z',-1]]){
    const a=sideSkin(G,old,axis,sign),b=sideSkin(G,now,axis,sign),p={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
    for(let i=0;i<104;i++)for(let j=0;j<91;j++){
      const z=axis==='z'?-.03416+i*.000665:.501113+i*.000204;
      const y=axis==='y'?-.03415+j*.000759:-.04313+j*.00084;
      const v=a(z,y),w=b(z,y);if(!Number.isFinite(v)&&!Number.isFinite(w))continue;
      p.occupied++;if(!Number.isFinite(v)){p.added++;continue;}if(!Number.isFinite(w)){p.lost++;continue;}
      if(v-w>p.maxIn){p.maxIn=v-w;p.worst=[z,y,v,w];}p.maxOut=Math.max(p.maxOut,w-v);
    }profiles[axis+sign]=p;
  }
  for(const m of [...old,...now])m.geometry.dispose();
  const reference=snapshot?{scale:model.scale.toArray(),parts:parts.map((m,i)=>{
    const p=new G.Vector3(),q=new G.Quaternion(),s=new G.Vector3();
    inv.clone().multiply(m.matrixWorld).decompose(p,q,s);
    return {name:names[i],p:p.toArray(),q:q.toArray(),scale:s.toArray(),g:m.geometry.toJSON()};
  })}:undefined;
  return {hash,closed,gaps,profiles,reference,wood:[lower,upper].map(m=>({name:m.material.name,paint:m.material.userData.weaponFinishRole??null,map:!!m.material.map})),
    vertices:current.attributes.position.count,muzzle:u.muzzleLocal.toArray()};
}
