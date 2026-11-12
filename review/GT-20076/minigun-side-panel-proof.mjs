import {makeMinigunModel} from '../../studio/weapon-heavy.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';

export function checkMinigunFinish(T){
  const id='minigun',gun=T.weaponMeshes[id],finish=T.armoryFinishDbg;
  const initial=finish.list(id).current||'';
  function factoryParts(){
    const pairs=new Map(T.viewmodelDbg().gun.pairs);
    const materialMap=new Map();
    for(const group of [gun.userData.ammoBox,gun.userData.barrelAssembly]){
      group.traverse(o=>{
        if(!o.isMesh)return;
        const world=o.material,eye=pairs.get(o)?.material;
        if(!eye)throw Error('No eye counterpart for '+o.name);
        materialMap.set(o,[world.map,world.color.getHex(),eye.map,eye.color.getHex()]);
      });
    }
    return materialMap;
  }
  try{
    finish.paint(id,'');for(let i=0;i<12;i++)T.stepFrame(1/30);
    const before=factoryParts();
    if(!finish.paint(id,'m81'))throw Error('No M81 finish');
    for(let i=0;i<16;i++)T.stepFrame(1/30);
    const after=factoryParts(),registry=T.getGunFurniture()[id];
    if(!before.size||before.size!==after.size||!registry.length||registry.some(m=>!m.map))throw Error('Missing factory artwork or painted material');
    for(const [mesh,values] of before){
      if(values.some((v,i)=>v!==after.get(mesh)[i]))throw Error('Factory finish changed on '+mesh.name);
    }
    return {factoryWorldAndEyeMeshes:before.size,coatedMaterials:registry.length};
  }finally{finish.paint(id,initial);}
}

export function extensionReference(T){
  const {model}=checkMinigunPanel(T,'minigun','e70f29b6',true);
  T.inspectHost().builders.gunExtLook(model,'minigun',true);
  model.updateMatrixWorld(true);
  const body=model.userData.magStretch,neck=body.children[9],drum=body.children[0],G=T.THREE;
  const relative=model.matrixWorld.clone().invert(),parts=[];
  for(const [name,mesh] of [['extended-neck',neck],['extended-drum',drum]]){
    // The extension applies non-uniform scaling. Preserve the actual matrix, including shear.
    const matrix=relative.clone().multiply(mesh.matrixWorld);
    const geometry=new G.BufferGeometry().copy(mesh.geometry).applyMatrix4(matrix);
    parts.push({name,p:[0,0,0],q:[0,0,0,1],scale:[1,1,1],g:geometry.toJSON()});
    geometry.dispose();
  }
  return parts;
}

export function minigunPanelSweep(T,baseline){
  const {model,show}=checkMinigunPanel(T,'minigun',baseline,true);
  const holder=model.userData.ammoBox,drum=holder.children[0],plate=model.children[10];
  const world=T.weaponMeshes.minigun.userData.ammoBox;
  const eye=new Map(T.viewmodelDbg().gun.pairs).get(world);
  if(!eye)throw Error('Missing first-person drum');
  const rest=holder.position.clone(),records=[];
  T.setAmmoDbg('minigun',0);T.startReload();
  try{
    for(let i=0;i<48;i++){
      const phase=i/48;T.reloadClipDbg.hold(phase);
      for(let j=0;j<3;j++)T.stepFrame(1/60);
      const state=T.getReloadDbg();
      if(state.weapon!=='minigun'||Math.abs(1-state.timer/state.anim-phase)>.002)throw Error('Wrong reload phase');
      const record={phase};
      for(const [label,drawn] of [['world',world],['eye',eye]]){
        holder.position.copy(drawn.position);holder.quaternion.copy(drawn.quaternion);holder.scale.copy(drawn.scale);
        const hits={};
        for(const version of ['before','after']){
          show(version);
          const gap=visibleSurfaceGap(drum,plate,1.8/1.655);
          hits[version]={crossed:!!gap.penetrating,upperMm:gap.upperMm};
        }
        record[label]={...hits,position:holder.position.toArray(),quaternion:holder.quaternion.toArray(),scale:holder.scale.toArray(),travel:rest.distanceTo(holder.position),visible:drawn.visible};
      }
      records.push(record);
    }
  }finally{T.reloadClipDbg.hold(null);}
  return records;
}

export function checkMinigunPanel(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  let plate,original;
  const strips=[];
  const model=makeMinigunModel({...ctx,finishGun:gun=>gun,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,box(...args){
      const mesh=kit.box(...args);
      if(args[0]===.012&&args[1]===.009&&args[2]===.26&&args[4]>0&&args[5]<0){
        const strip={mesh,original:null};let geometry=mesh.geometry;
        // The original artwork first seats the strip on the flat side of the plate.
        Object.defineProperty(mesh,'geometry',{configurable:true,get:()=>geometry,set:next=>{
          strip.original??=next;geometry=next;
        }});
        strips.push(strip);
      }
      return mesh;
    },slab(outline,width,mat,options){
      const mesh=kit.slab(outline,width,mat,options);
      if(width===.020 && options?.x===.150){
        plate=mesh; original=mesh.geometry;
      }
      return mesh;
    }};
  }});
  const u=model.userData,drum=u.ammoBox.children[0],current=plate?.geometry;
  if(!plate||plate!==model.children[10]||model.children[90]!==u.ammoBox)throw Error('Unexpected minigun artwork');
  model.scale.copy(T.weaponMeshes[id].scale);model.visible=true;
  if(strips.length!==2||strips.some(s=>!s.original))throw Error('Missing original side strips');
  for(const s of strips)s.current=s.mesh.geometry;
  const show=phase=>{
    plate.geometry=phase==='before'?original:current;
    for(const s of strips)s.mesh.geometry=phase==='before'?s.original:s.current;
    model.updateMatrixWorld(true);
  };
  show('before');
  const ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));
  if(hash!==baseline)throw Error('Original minigun artwork differs '+hash);
  show('after');if(pictures)return {model,show,hash};
  const local=model.matrixWorld.clone().invert();
  const parts=[plate,drum,model.children[0],...model.children.slice(11,19)];
  const poseOf=mesh=>local.clone().multiply(mesh.matrixWorld);
  const reference=snapshot?{scale:model.scale.toArray(),parts:parts.map((mesh,i)=>{
    const p=new G.Vector3(),q=new G.Quaternion(),s=new G.Vector3();
    poseOf(mesh).decompose(p,q,s);
    const g=new G.BufferGeometry().copy(mesh.geometry).toJSON();
    return {name:['plate','drum','housing'][i]??'trim'+i,p:p.toArray(),q:q.toArray(),scale:s.toArray(),g};
  })}:undefined;
  const surfaces=phase=>{
    show(phase);
    return parts.map(mesh=>({position:new G.Vector3(),geometry:mesh.geometry.clone().applyMatrix4(poseOf(mesh))}));
  };
  const a=surfaces('before'),b=surfaces('after'),profiles={};
  for(const axis of ['x','y','z'])for(const sign of [-1,1]){
    const before=sideSkin(G,a,axis,sign),after=sideSkin(G,b,axis,sign);
    const range=axis==='x'?[-.185,.12,-.183,.081]:axis==='y'?[-.185,.12,.080,.222]:[.080,.222,-.183,.081];
    let occupied=0,lost=0,added=0,maxDepth=0;
    for(let i=0;i<95;i++)for(let j=0;j<89;j++){
      const v=range[0]+(range[1]-range[0])*(i+.31)/95,w=range[2]+(range[3]-range[2])*(j+.27)/89;
      const old=before(v,w),now=after(v,w);
      if(Number.isFinite(old)){occupied++;if(!Number.isFinite(now))lost++;else maxDepth=Math.max(maxDepth,Math.abs(now-old));}
      else if(Number.isFinite(now))added++;
    }
    profiles[axis+sign]={occupied,lost,added,maxDepth};
  }
  for(const mesh of [...a,...b])mesh.geometry.dispose();
  function stripContacts(mesh){
    const islands=visiblePieces(mesh);
    return islands.map(island=>{
      const geometry=new G.BufferGeometry();
      geometry.setAttribute('position',new G.Float32BufferAttribute(island.faces.flatMap(f=>f.p.flatMap(v=>v.toArray())),3));
      const piece=new G.Mesh(geometry,mesh.material);
      const contact=visibleSurfaceGap(piece,plate,1.8/1.655);
      geometry.dispose();
      return {closed:island.closed,plate:contact};
    });
  }
  return {hash,reference,profiles,closed:visiblePieces(plate,1.8/1.655).map(p=>p.closed),
    strips:strips.map(s=>({islands:stripContacts(s.mesh),closed:visiblePieces(s.mesh,1.8/1.655).map(p=>p.closed),drum:visibleSurfaceGap(s.mesh,drum,1.8/1.655),plate:visibleSurfaceGap(s.mesh,plate,1.8/1.655)})),
    gap:visibleSurfaceGap(plate,drum,1.8/1.655),vertices:current.attributes.position.count,
    paint:plate.material.userData.weaponFinishRole,drumRest:u.ammoBox.position.toArray(),hold:u.triggerPin};
}
