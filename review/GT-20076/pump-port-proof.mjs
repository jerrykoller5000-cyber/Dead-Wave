import {makeShotgunModel} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

function checkPortSurface(G,side,original){
  const {position,normal,uv}=side.geometry.attributes;
  const p=[],n=[],t=[];
  const slope=.02,capY=1/Math.hypot(1,slope),radius=.012*Math.cos(Math.PI/16);
  const faces=Array.from({length:16},(_,j)=>(j+.5)*Math.PI/8);
  let capVertices=0,maxOutsideOriginal=0;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
    maxOutsideOriginal=Math.max(maxOutsideOriginal,Math.abs(z)-.05,
      ...faces.map(a=>Math.cos(a)*x/.67+Math.sin(a)*y-radius));
    if(Math.abs(nx)<1e-6&&Math.abs(ny-capY)<1e-6&&Math.abs(nz+slope*capY)<1e-6){
      if(Math.abs(y+side.position.y-.0275-slope*(z+.05))>1e-7)throw Error('Misplaced corner surface');
      capVertices++;
    }else{
      p.push(x,y,z);n.push(nx,ny,nz);t.push(uv.getX(i),uv.getY(i));
    }
  }
  if(maxOutsideOriginal>1e-7)throw Error('Outside original artwork '+maxOutsideOriginal);
  const geometry=new G.BufferGeometry();
  for(const [key,values,size] of [['position',p,3],['normal',n,3],['uv',t,2]]){
    geometry.setAttribute(key,new G.Float32BufferAttribute(values,size));
  }
  const exposed=exteriorSamples({geometry,position:side.position},original,0,1,.0165,true);
  geometry.dispose();
  return {exposed,capVertices,maxOutsideOriginal};
}

export function checkPumpPort(T,id,baseline,pictures=false){
  if(id!=='shotgun')throw Error('Unexpected model');
  const ctx=T.inspectHost().builders.weaponContext();let original;
  const model=makeShotgunModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,cyl(...args){
      const mesh=kit.cyl(...args);
      if(args[0]===.012&&args[2]===.1&&args[7]?.name==='shotgun-bolt')
        original=mesh.geometry.clone().rotateX(mesh.rotation.x).scale(.67,1,1);
      return mesh;
    }};
  }});
  const u=model.userData,receiver=model.getObjectByName('shotgun receiver'),side=u.shotgunBolt.children[0],current=side.geometry;
  if(!original||!receiver||!side)throw Error('Missing display graphics');
  const show=phase=>{side.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  model.visible=true;model.scale.copy(T.weaponMeshes.shotgun.scale);
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original complete pump model differs '+hash+' vs '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const sweep=[];
  for(const back of [0,.003,.01,.02,.04,.06,.065,.06645,.067,.068,.0684,.069,.072,.078,.11,.12,0]){
    u.pump.position.z=u.basePumpPos.z-back;u.pumpPoseHook();model.updateMatrixWorld(true);
    sweep.push({back,visible:side.visible,z:side.position.z,scale:side.scale.z,gap:side.visible?visibleSurfaceGap(side,receiver,1.8/1.655):null});
  }
  const cells=visiblePieces(side,1.8/1.655),surface=checkPortSurface(T.THREE,side,original);
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const G=T.THREE,ray=new G.Raycaster(),p=new G.Vector3(),dir=new G.Vector3(-1,0,0);
  const backing=[[.016,.065],[.016,.100],[.0274,.0625],[.0276,.0625]].map(([y,z])=>{
    ray.set(p.set(.20,y,z),dir);
    const x=ray.intersectObject(receiver,false)[0]?.point.x;
    if(!Number.isFinite(x))throw Error('Missing recess surface');
    return {y,z,x};
  });
  return {hash,closed:cells.map(p=>p.closed),...surface,sweep,backing,pump:u.pump.position.toArray()};
}

export function pumpCycle(T){
  const gun=T.weaponMeshes.shotgun,u=gun.userData,side=u.shotgunBoltParts[0],pairs=new Map(T.viewmodelDbg().gun.pairs);
  if(side.parent!==u.shotgunBolt)throw Error('Live display was batched into static artwork');
  const copy=pairs.get(side),ends=u.shotgunBoltParts.slice(1);
  if(!copy||ends.length!==2||ends.some(m=>!pairs.get(m)||m.parent!==u.shotgunBolt))throw Error('Missing first-person port pieces');
  function read(){
    return {back:u.basePumpPos.z-u.pump.position.z,visible:side.visible,viewVisible:copy.visible,z:side.position.z,viewZ:copy.position.z,scaleZ:side.scale.z,viewScaleZ:copy.scale.z,
      ends:ends.map(m=>({z:m.position.z,viewZ:pairs.get(m).position.z,visible:m.visible,viewVisible:pairs.get(m).visible}))};
  }
  const frames=[],rest=read();T.setAmmoDbg('shotgun',4);let shot=-1;
  try{
    T.setMouseFireDbg(true);
    for(let i=0;i<200;i++){
      T.stepFrame(1/120);frames.push(read());
      if(shot<0&&T.getAmmo().shotgun<4){shot=i;T.setMouseFireDbg(false);}
    }
  }finally{T.setMouseFireDbg(false);}
  const end=frames.at(-1),travel=Math.max(...frames.map(p=>p.back));
  if(shot<0||T.getAmmo().shotgun!==3||travel<.05||Math.abs(end.back-rest.back)>.001||
    !frames.some(p=>!p.visible)||!frames.some(p=>p.visible&&p.scaleZ<rest.scaleZ*.75)||
    frames.some(p=>{
      const length=.0685-p.back;
      return p.visible!==(length>.002)||Math.abs(p.scaleZ-Math.max(length,.002)/.1)>1e-5||
        Math.abs(p.z-(.0625+Math.max(length,.002)/2))>1e-5||
        p.visible!==p.viewVisible||Math.abs(p.z-p.viewZ)>1e-5||Math.abs(p.scaleZ-p.viewScaleZ)>1e-5||
        p.ends.some((e,i)=>Math.abs(e.z-(.137-p.back-(i?.004:.003)))>1e-5||
          e.visible!==e.viewVisible||Math.abs(e.z-e.viewZ)>1e-5||e.visible!==((.137-p.back-.008)>=.0625));
    }))
    throw Error('Incomplete pump cycle '+JSON.stringify({shot,ammo:T.getAmmo().shotgun,travel,rest,end}));
  return {shot,travel,rest,end,frames};
}
