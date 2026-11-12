import {makeM4Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function buildArtwork(T){
  const ctx=T.inspectHost().builders.weaponContext();
  let grip,guard;
  const model=makeM4Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:parent=>{
    const kit=ctx.gunKit(parent);
    return {...kit,slab(points,w,mat,opt){
      const m=kit.slab(points,w,mat,opt);
      if(w===.047&&opt?.bevel===.011)grip=m;
      if(w===.03&&points.length===12&&opt?.bevel===.003)guard=m;
      return m;
    }};
  }});
  if(!grip||!guard)throw Error('Missing grip or guard');
  model.visible=true;return {model,grip,guard,pivot:model.getObjectByName(model.userData.controls.trigger)};
}
function faces(G,root,subtree){
  root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),v=new G.Vector3(),keys=new Set();
  subtree.traverse(m=>{
    if(!m.isMesh)return;
    const g=m.geometry,p=g.attributes.position,i=g.index,M=inv.clone().multiply(m.matrixWorld),vertices=[];
    for(let n=0;n<p.count;n++)vertices.push(v.fromBufferAttribute(p,n).applyMatrix4(M).toArray().map(x=>Math.round(x*1e5+.173)).join(','));
    for(let n=0;n<(i?i.count:p.count);n+=3)keys.add([0,1,2].map(j=>vertices[i?i.getX(n+j):n+j]).sort().join('|'));
  });
  return keys;
}
function hits(G,mesh,y){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
  const ray=new G.Ray(new G.Vector3(0,y,-1),new G.Vector3(0,0,1)),v=[new G.Vector3(),new G.Vector3(),new G.Vector3()],at=new G.Vector3(),z=[];
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
    for(let j=0;j<3;j++)v[j].fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
    if(ray.intersectTriangle(...v,false,at))z.push(at.z);
  }
  return z.sort((a,b)=>a-b);
}
export function check(T,phase,baseline){
  const {model,pivot,guard,grip}=buildArtwork(T),G=T.THREE,u=model.userData,blade=pivot.children[0];
  const pin=phase==='after'?[0,-.05,-.049]:[0,-.05,-.034];
  const close=(a,b)=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<1e-8);
  if(!close(pin,pivot.position.toArray())||!close(pin,u.triggerPin)||!close(pin,pivot.userData.restPosition))throw Error('Inconsistent trigger pivot '+JSON.stringify({pin,actual:u.triggerPin}));
  const pose=pivot.position.clone(),ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  model.scale.copy(T.weaponMeshes.m4.scale);
  const hash=()=>{model.updateMatrixWorld(true);return artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));};
  const current=hash();pivot.position.z=-.034;const old=hash();pivot.position.copy(pose);
  if(old!==baseline)throw Error('Other art differs from the original '+old+' / '+baseline);
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const expected=faces(G,model,pivot),copies={};
  for(const [key,g] of Object.entries({world:T.weaponMeshes.m4,eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg('m4').children[0]})){
    const actual=faces(G,g,g);
    copies[key]=[...expected].filter(k=>actual.has(k)).length;
    if(copies[key]!==expected.size)throw Error('Missing translated faces on '+key+' '+copies[key]+'/'+expected.size);
  }
  const widths=[];
  for(const y of [-.068,-.073,-.078,-.083,-.088,-.093]){
    const b=hits(G,blade,y),front=hits(G,guard,y).find(z=>z>b.at(-1)),strap=hits(G,grip,y).at(-1);
    if(![b[0],b.at(-1),front,strap].every(Number.isFinite))throw Error('Missing surface at '+y);
    widths.push({y,bladeBack:b[0],bladeFront:b.at(-1),guardGap:front-b.at(-1),strapGap:b[0]-strap});
  }
  const angles=[];
  for(let i=0;i<17;i++){
    pivot.rotation.x=.1494*i/16;model.updateMatrixWorld(true);
    const gaps=[guard,grip].map(m=>visibleSurfaceGap(blade,m));
    if(gaps.some(g=>g.penetrating))throw Error('Model intersects through trigger pose '+i);
    angles.push(gaps.map(g=>g.lowerMm));
  }
  return {current,old,pin,faces:expected.size,copies,widths,angles};
}
