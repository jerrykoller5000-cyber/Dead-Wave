import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';

export function checkWaspBase(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let grip,bell,cap,old,oldBand;
  const model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(points,width,mat,o){
      const m=k.slab(points,width,mat,o);
      if(width===.062&&points.length===15){grip=m;old=m.geometry;}
      return m;
    },box(...args){
      const m=k.box(...args);
      if(args[0]===.068&&args[1]===.01&&args[2]===.108){bell=m;oldBand=m.geometry;}
      if(args[0]===.050&&args[1]===.003&&args[2]===.090)cap=m;
      return m;
    }};
  }});
  if(!grip||!bell||!cap)throw Error('Missing fixed grip artwork');
  const current=grip.geometry,band=bell.geometry,u=model.userData;model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{grip.geometry=phase==='before'?old:current;bell.geometry=phase==='before'?oldBand:band;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original Wasp mismatch '+hash+' / '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const gap=visibleSurfaceGap(grip,bell,1.8/1.655),sections=visiblePieces(grip,1.8/1.655),closed=sections.map(p=>p.closed);
  const sectionGaps=sections.map(cell=>{
    const vertices=[];
    for(const face of cell.faces)for(const p of face.p){
      vertices.push(...grip.worldToLocal(p.clone().multiplyScalar(1.655/1.8)).toArray());
    }
    const geometry=new G.BufferGeometry();
    geometry.setAttribute('position',new G.Float32BufferAttribute(vertices,3));
    const mesh=new G.Mesh(geometry,grip.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(grip.matrixWorld);
    const g=visibleSurfaceGap(mesh,bell,1.8/1.655);geometry.dispose();return g;
  });
  const parts=[grip,bell,cap];
  const relative=bell.matrix.clone().invert();
  const ref=m=>({p:m.position.toArray(),q:m.quaternion.toArray(),g:m.geometry.toJSON()});
  const reference=snapshot?{scale:model.scale.toArray(),parts:parts.map(ref)}:undefined;
  const proxies=(geometry,rim)=>parts.map(m=>({position:new G.Vector3(),geometry:(m===grip?geometry:m===bell?rim:m.geometry).clone().applyMatrix4(relative.clone().multiply(m.matrix))}));
  const before=proxies(old,oldBand),after=proxies(current,band),surfaces={};
  for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1],['y',-1],['y',1]]){
    const a=sideSkin(G,before,axis,sign),b=sideSkin(G,after,axis,sign),s={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
    for(let i=0;i<127;i++)for(let j=0;j<83;j++){
      const h=axis==='y'?-.03507+j*.00085:-.01113+j*.00028;
      const z=axis==='z'?-.03504+i*.000556:-.05517+i*.000875;
      const p=a(z,h),q=b(z,h);
      if(!Number.isFinite(p)&&!Number.isFinite(q))continue;
      s.occupied++;if(!Number.isFinite(p)){s.added++;continue;}if(!Number.isFinite(q)){s.lost++;continue;}
      s.maxIn=Math.max(s.maxIn,p-q);s.maxOut=Math.max(s.maxOut,q-p);
    }
    surfaces[axis+sign]=s;
  }
  for(const m of [...before,...after])m.geometry.dispose();
  return {hash,gap,sectionGaps,gripUnchanged:grip.geometry===old,closed,bandClosed:visiblePieces(bell,1.8/1.655).map(p=>p.closed),surfaces,reference,magBase:u.baseMagPos.toArray(),grip:grip.position.toArray(),bell:bell.position.toArray(),cap:cap.position.toArray()};
}
