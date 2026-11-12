import {makeAkModel} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkPortFinish(T) {
  const gun=T.weaponMeshes.ak,parts=gun.userData.recoilBoltParts;
  const before=T.armoryFinishDbg.list('ak').current||'';
  try {
    if(!T.armoryFinishDbg.paint('ak','m81'))throw Error('M81 unavailable in Training');
    for(let i=0;i<30;i++)T.stepFrame(1/30);
    const view=new Map(T.viewmodelDbg().gun.pairs);
    const moving=parts.map(o=>({world:o.material.userData.gunPaintId||null,map:!!o.material.map,eyeMap:!!view.get(o)?.material.map,drawn:!!view.get(o)}));
    const wood=[];gun.traverse(o=>{if(o.material?.name==='KR-7 walnut')wood.push({map:!!o.material.map,painted:!!o.material.userData.gunPaintId});});
    const registry=T.getGunFurniture().ak;
    if(!wood.length||wood.some(m=>!m.map||m.painted)||moving.some(m=>!m.drawn||m.map||m.eyeMap||m.world)||!registry.every(m=>m.map))throw Error('KR-7 port or wood finish changed '+JSON.stringify({moving,wood}));
    return {moving,wood,coatedMaterials:registry.length};
  }finally{T.armoryFinishDbg.paint('ak',before);}
}

export function checkKrPort(T,id,baseline,pictures=false){
  if(id!=='ak')throw Error('Wrong model');
  const ctx=T.inspectHost().builders.weaponContext(),original=new Map();
  const model=makeAkModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,box(...args){
      const m=kit.box(...args);
      if((args[0]===.004&&args[1]===.028&&args[2]===.072)||args[10]?.name==='recoil-bolt')original.set(m,m.geometry.clone());
      return m;
    }};
  }});
  const edits=[...original].map(([mesh,old])=>({mesh,old,now:mesh.geometry}));
  if(edits.length!==3)throw Error('Missing port graphics '+edits.length);
  model.visible=true;model.scale.copy(T.weaponMeshes.ak.scale);const u=model.userData;
  const show=phase=>{for(const e of edits)e.mesh.geometry=phase==='before'?e.old:e.now;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original model fingerprint differs '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show};
  const panel=edits[0].mesh,receiver=model.children[0];
  const gap=visibleSurfaceGap(panel,receiver,1.8/1.655),closed=edits.map(e=>visiblePieces(e.mesh,1.8/1.655).map(p=>p.closed));
  const exposed=edits.slice(1).map(e=>exteriorSamples(e.mesh,e.old,0,1,.02435,true));
  const sweep=[];
  for(const fraction of [0,.15,.4,.65,.9,.99,1,0]){
    u.recoilBoltPose(u.recoilBolt,u.portStroke*fraction);model.updateMatrixWorld(true);
    sweep.push({fraction,parts:u.recoilBoltParts.filter(o=>o.visible).map(o=>visibleSurfaceGap(o,panel,1.8/1.655))});
  }
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const ray=new T.THREE.Raycaster(),origin=new T.THREE.Vector3(),direction=new T.THREE.Vector3(-1,0,0);
  const current=panel.geometry.attributes,prior=edits[0].old.attributes;
  function vertex(a,i){return [a.position.getX(i),a.position.getY(i),a.position.getZ(i),a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i)];}
  const retained=new Set(),targetX=.02435;let faceDepth=0;
  const candidates=Array.from({length:current.position.count},(_,i)=>vertex(current,i));
  for(let i=0;i<prior.position.count;i++){
    const v=vertex(prior,i),x=v[0]+panel.position.x;
    ray.set(origin.set(.2,v[1]+panel.position.y,v[2]+panel.position.z),direction);
    const host=ray.intersectObject(receiver,false)[0]?.point.x??-Infinity;
    if(x<=host+1e-7)continue;
    if(x>targetX+1e-7){faceDepth=Math.max(faceDepth,x-targetX);continue;}
    if(!candidates.some(w=>w.every((n,k)=>Math.abs(n-v[k])<1e-7)))throw Error('Missing exposed edge '+JSON.stringify(v));
    retained.add(v.join(','));
  }
  return {hash,gap,closed,exposed,sweep,retainedPanelEdges:retained.size,maxFaceRecession:faceDepth};
}
