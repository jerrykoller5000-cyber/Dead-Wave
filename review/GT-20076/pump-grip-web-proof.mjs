import {makeShotgunModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './side-skin.mjs';
import {topTuples} from './surface-tuples.mjs';

export function checkPumpGripWeb(T,id,baseline,pictures=false,snapshot=false,measureFinish=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),originals=new WeakMap();
  const model=makeShotgunModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,slab(...args){const mesh=kit.slab(...args);originals.set(mesh,mesh.geometry);return mesh;}};
  }});
  const grip=model.getObjectByName('shotgun grip'),stock=model.getObjectByName('shotgun stock body');
  const receiver=model.getObjectByName('shotgun receiver'),plate=model.children[17];
  const original=originals.get(grip),current=grip.geometry,u=model.userData;
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{grip.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  show('before');
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Unexpected pump original '+hash);
  show('after');if(pictures)return {model,show,hash};
  const pieces=[grip,stock,receiver,plate],names=['grip','stock','receiver','plate'];
  const profiles={};
  for(const axis of ['x','y','z'])for(const sign of [-1,1]){
    show('before');const before=sideSkin(G,pieces,axis,sign);
    show('after');const after=sideSkin(G,pieces,axis,sign);
    let occupied=0,lost=0,added=0,maxDepth=0;
    for(let i=0;i<103;i++)for(let j=0;j<97;j++){
      const a=axis==='z'?-.027169+i*.000535:-.11719+i*.00107;
      const b=axis==='y'?-.026171+j*.000543:-.1763+j*.00232;
      const old=before(a,b),now=after(a,b);
      if(Number.isFinite(old)){occupied++;if(!Number.isFinite(now))lost++;else maxDepth=Math.max(maxDepth,Math.abs(now-old));}
      else if(Number.isFinite(now))added++;
    }
    profiles[axis+sign]={occupied,lost,added,maxDepth};
  }
  let exterior;
  if(measureFinish){
    exterior={visible:0,retained:0,maxHeight:0,maxNormal:0,maxUV:0};
    function facing(geometry,side){
      const shape=geometry.clone(),p=shape.attributes.position;
      for(let i=0;i<p.count;i++)p.setXYZ(i,p.getY(i),side*p.getX(i),p.getZ(i));
      const sample=topTuples(shape);shape.dispose();return sample;
    }
    for(const side of [-1,1]){
      const before=facing(original,side),after=facing(current,side),back=sideSkin(G,[stock,receiver,plate],'x',side);
      for(let i=0;i<135;i++)for(let j=0;j<117;j++){
        const z=-.13127+i*.00096,y=-.18713+j*.00178;
        const a=before(y,z);
        if(!a||a[0]<=back(z,y)+1e-6)continue;
        exterior.visible++;
        const b=after(y,z);if(!b)continue;exterior.retained++;
        exterior.maxHeight=Math.max(exterior.maxHeight,Math.abs(a[0]-b[0]));
        for(let k=1;k<4;k++)exterior.maxNormal=Math.max(exterior.maxNormal,Math.abs(a[k]-b[k]));
        for(let k=4;k<6;k++)exterior.maxUV=Math.max(exterior.maxUV,Math.abs(a[k]-b[k]));
      }
    }
  }
  const reference=snapshot?{scale:model.scale.toArray(),parts:pieces.map((mesh,i)=>({
    name:names[i],p:mesh.position.toArray(),q:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),g:new G.BufferGeometry().copy(mesh.geometry).toJSON()
  }))}:undefined;
  return {hash,reference,profiles,exterior,gaps:pieces.slice(1).map(m=>visibleSurfaceGap(grip,m,1.8/1.655)),
    stockSeat:visibleSurfaceGap(stock,receiver,1.8/1.655),closed:visiblePieces(grip).map(p=>p.closed),
    vertices:current.attributes.position.count,grip:grip.position.toArray(),stock:stock.position.toArray(),pump:u.pump?.position.toArray(),trigger:u.triggerPin,
    finish:grip.material.userData.weaponFinishRole,stockFinish:stock.material.userData.weaponFinishRole};
}
