import {makeAkModel} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function intersections(G,meshes,x,y){
  const result=[],corners=[new G.Vector3(),new G.Vector3(),new G.Vector3()],point=new G.Vector3();
  const ray=new G.Ray(new G.Vector3(x,y,-.4),new G.Vector3(0,0,1));
  for(const mesh of meshes){
    const geometry=mesh.geometry,p=geometry.attributes.position,ix=geometry.index;
    for(let i=0;i<(ix?.count??p.count);i+=3){
      corners.forEach((v,k)=>v.fromBufferAttribute(p,ix?ix.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
      if(ray.intersectTriangle(...corners,false,point))result.push(point.z);
    }
  }
  return result.sort((a,b)=>a-b);
}

export function buildReviewArt(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let guard;
  const model=makeAkModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);return {...kit,slab(points,width,material,options){
      const mesh=kit.slab(points,width,material,options);
      if(width===.022&&points.length===12&&options?.bevel===.003)guard=mesh;
      return mesh;
    }};
  }});
  if(!guard)throw Error('Guard artwork missing');
  model.visible=true;
  return {model,guard,trigger:model.getObjectByName(model.userData.controls.trigger)};
}

export async function measure(T,phase,baseline){
  const G=T.THREE,{model,guard,trigger}=buildReviewArt(T),u=model.userData,blade=trigger.children.find(o=>o.isMesh);
  const ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  model.scale.copy(T.weaponMeshes.ak.scale);model.updateMatrixWorld(true);
  const fingerprint=()=>artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));
  const hash=fingerprint(),pin=trigger.position.toArray(),old=phase==='before'?null:await fetch('/review/GT-20096/before/guard.json').then(r=>r.json());
  if(JSON.stringify(pin)!==JSON.stringify(u.triggerPin)||JSON.stringify(pin)!==JSON.stringify(trigger.userData.restPosition))throw Error('Animated pivot metadata does not match');
  if(old){
    trigger.position.fromArray(old.pin);model.updateMatrixWorld(true);
    if(fingerprint()!==baseline)throw Error('Changing only the pivot back did not restore the original model');
    trigger.position.fromArray(pin);
  }else if(hash!==baseline)throw Error('Original model differs');
  const world=T.weaponMeshes.ak,eye=T.viewmodelDbg().gun,worldTrigger=world.getObjectByName(world.userData.controls.trigger),eyeTrigger=new Map(eye.pairs).get(worldTrigger);
  if(!eyeTrigger||worldTrigger.position.distanceTo(trigger.position)>1e-7||eyeTrigger.position.distanceTo(trigger.position)>1e-7)throw Error('World or eye trigger differs');
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const magazines=[];u.mag.traverse(m=>{if(m.isMesh&&m.visible)magazines.push(m);});
  const rows=[];
  for(const x of [-.006,-.003,0,.003,.006])for(const y of [-.044,-.048,-.052,-.0543,-.056,-.060,-.064]){
    const b=intersections(G,[blade],x,y),g=intersections(G,[guard],x,y),m=intersections(G,magazines,x,y);
    const front=b.at(-1),rear=b[0];
    const gFront=g.filter(z=>z>-.015)[0],mFront=m.filter(z=>z>-.015)[0];
    const boundary=Math.min(gFront??Infinity,mFront??Infinity);
    rows.push({x,y,face:front??null,back:rear??null,guard:gFront??null,mag:mFront??null,boundary,
      room:front===undefined?null:boundary-front});
  }
  const targetRows=rows.filter(r=>r.y===-.0543&&r.room!==null);
  if(targetRows.length!==3||targetRows.some(r=>!Number.isFinite(r.room)))throw Error('Contact slice missing');
  if(phase==='after'){
    if(targetRows.some(r=>r.room<.028))throw Error('Insufficient clearance at the index contact');
    for(const r of rows){
      const prev=old.rows.find(o=>o.x===r.x&&o.y===r.y);
      if(r.guard!==prev.guard||r.mag!==prev.mag)throw Error('Front artwork moved');
    }
  }
  const rest=trigger.rotation.x,sweep=[];
  for(const angle of [0,-.04,-.08,-.12,.04,.08,.12]){
    trigger.rotation.x=angle;model.updateMatrixWorld(true);
    sweep.push({angle,guard:visibleSurfaceGap(blade,guard,1.8/1.655)});
  }
  trigger.rotation.x=rest;
  return {hash,pin,world:worldTrigger.position.toArray(),eye:eyeTrigger.position.toArray(),rows,targetRows,sweep,mag:u.baseMagPos.toArray()};
}
