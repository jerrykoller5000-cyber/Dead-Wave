import {makeShotgunModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {topTuples} from './surface-tuples.mjs';
export function checkPumpStock(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),originals=new WeakMap();
  const model=makeShotgunModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(...args){const mesh=k.slab(...args);originals.set(mesh,mesh.geometry);return mesh;}};
  }});
  const stock=model.getObjectByName('shotgun stock body'),receiver=model.getObjectByName('shotgun receiver'),plate=model.children[17],grip=model.getObjectByName('shotgun grip');
  const old=originals.get(stock),now=stock.geometry,u=model.userData;
  if(!old||!receiver||!grip||!plate.isMesh)throw Error('Missing pump stock joint');
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{stock.geometry=phase==='before'?old:now;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original pump differs '+hash+' / '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const gap=visibleSurfaceGap(stock,receiver,1.8/1.655),plateGap=visibleSurfaceGap(stock,plate,1.8/1.655),closed=visiblePieces(stock,1.8/1.655).map(p=>p.closed);
  const parts=[stock,receiver,plate,grip],ref=m=>({p:m.position.toArray(),q:m.quaternion.toArray(),g:m.geometry.toJSON()});
  const surfaces={};
  for(const [axis,sign] of [['x',1],['x',-1],['y',1],['y',-1],['z',1],['z',-1]]){
    show('before');const a=sideSkin(G,parts,axis,sign);show('after');const b=sideSkin(G,parts,axis,sign);
    const s={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
    for(let i=0;i<125;i++)for(let j=0;j<151;j++){
      const u=axis==='z'?-.028113+i*.00045:-.049113+i*.00021;
      const v=axis==='y'?-.026097+j*.00035:-.040097+j*.00061;
      const p=a(u,v),q=b(u,v);
      if(!Number.isFinite(p)&&!Number.isFinite(q))continue;s.occupied++;
      if(!Number.isFinite(p)){s.added++;continue;}if(!Number.isFinite(q)){s.lost++;continue;}
      if(p-q>s.maxIn){s.maxIn=p-q;s.worst=[u,v,p,q];}s.maxOut=Math.max(s.maxOut,q-p);
    }surfaces[axis+sign]=s;
  }
  const oldTop=topTuples(old),newTop=topTuples(now),backing=sideSkin(G,[receiver,plate,grip],'y');
  const finish={visible:0,retained:0,maxHeight:0,maxNormal:0,maxUV:0,role:stock.material.userData.weaponFinishRole};
  for(let i=0;i<113;i++)for(let j=0;j<101;j++){
    const x=-.02413+i*.00043,z=-.08017+j*.00052,p=oldTop(x,z),q=newTop(x,z);
    if(!p||p[0]<=backing(z,x)+1e-7)continue;finish.visible++;if(!q)continue;finish.retained++;
    finish.maxHeight=Math.max(finish.maxHeight,Math.abs(p[0]-q[0]));
    for(let k=1;k<=3;k++)finish.maxNormal=Math.max(finish.maxNormal,Math.abs(p[k]-q[k]));
    for(let k=4;k<=5;k++)finish.maxUV=Math.max(finish.maxUV,Math.abs(p[k]-q[k]));
  }
  return {hash,closed,gap,plateGap,surfaces,finish,reference:snapshot?{parts:parts.map(ref),scale:model.scale.toArray()}:undefined};
}
