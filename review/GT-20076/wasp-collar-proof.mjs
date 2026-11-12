import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {applyGlowToNode,findGunHeatParts,getHeatGlow} from '../../game/barrel-heat.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkWaspCollar(T,id,baseline,pictures=false,snapshot=false){
  if(id!=='uzi')throw Error('Wrong model');
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE;
  let host,collar,barrel,oldCollar,oldBarrel;
  const model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(points,w,mat,o){
      const m=k.slab(points,w,mat,o);if(w===.08&&points[0][0]===.18&&points[0][1]===-.002)host=m;return m;
    },lathe(points,mat,o){
      const m=k.lathe(points,mat,o);
      if(points[0][1]===.325&&points[1][0]===.035){collar=m;oldCollar=m.geometry.clone();}
      if(points[0][1]===.34&&points[1][0]===.017){barrel=m;oldBarrel=m.geometry.clone();}
      return m;
    }};
  }});
  if(!host||!collar||!barrel)throw Error('Original artwork not found');
  const nowCollar=collar.geometry,nowBarrel=barrel.geometry,u=model.userData;
  model.visible=true;model.scale.copy(T.weaponMeshes.uzi.scale);
  const show=phase=>{
    collar.geometry=phase==='before'?oldCollar:nowCollar;
    barrel.geometry=phase==='before'?oldBarrel:nowBarrel;model.updateMatrixWorld(true);
  };
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different original Wasp '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show};
  const closed=[collar,barrel].map(m=>visiblePieces(m,1.8/1.655).map(p=>p.closed));
  const gaps=[host,barrel].map(m=>visibleSurfaceGap(m,collar,1.8/1.655));
  const exposed=exteriorSamples(collar,oldCollar,2,1,.34001,true),barrelExposed=exteriorSamples(barrel,oldBarrel,2,1,.35501,true);
  show('before');const oldSide=sideSkin(G,[host,collar,barrel]);show('after');const after=sideSkin(G,[host,collar,barrel]);
  const profile={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
  for(let i=0;i<218;i++)for(let j=0;j<226;j++){
    const z=.324073+i*.00015,y=-.006117+j*.000325,a=oldSide(z,y),b=after(z,y);
    if(!Number.isFinite(a)&&!Number.isFinite(b))continue;profile.occupied++;
    if(!Number.isFinite(a)){profile.added++;continue;}if(!Number.isFinite(b)){profile.lost++;continue;}
    profile.maxIn=Math.max(profile.maxIn,a-b);profile.maxOut=Math.max(profile.maxOut,b-a);
  }
  const scale=model.scale.toArray();model.scale.setScalar(1);model.updateMatrixWorld(true);
  const ray=new G.Raycaster(),dir=new G.Vector3(0,0,-1),backing=[];
  for(let j=0;j<64;j++){
    const a=j*Math.PI/32,x=.035*Math.cos(a),y=.03+.035*Math.sin(a);
    ray.set(new G.Vector3(x,y,.6),dir);backing.push(ray.intersectObject(host,false)[0]?.point.z??null);
  }
  const result={hash,closed,gaps,exposed,barrelExposed,profile,backing,scale,
    triangles:[nowCollar,nowBarrel].map(g=>g.attributes.position.count/3)};
  if(snapshot)result.reference={scale,meshes:[host,collar,barrel].map(m=>({position:m.position.toArray(),geometry:m.geometry.toJSON()}))};
  return result;
}

export function checkCollarHeat(T,baseline){
  return checkNativeHeatProfile(T,'uzi',checkWaspCollar(T,'uzi',baseline,true));
}

export function checkNativeHeatProfile(T,id,original){
  const G=T.THREE;
  original.show('before');
  const oldNode=findGunHeatParts(original.model,id,original.model).barrel,oldMeshes=[];
  oldNode.traverse(m=>{if(m.isMesh)oldMeshes.push(m);});
  if(oldMeshes.length!==1)throw Error('Unexpected source glow meshes '+id);
  const reference=new G.Mesh(oldMeshes[0].geometry.clone(),oldMeshes[0].material.clone());
  applyGlowToNode(G,reference,getHeatGlow(.9,0),null,{kind:'barrel'});
  const ref=reference.geometry.attributes;
  const zAt=goal=>{for(let i=0;i<ref.uv1.count;i++)if(ref.uv1.getX(i)===goal)return ref.position.getZ(i);throw Error('Missing reference endpoint');};
  const lo=zAt(0),hi=zAt(1);
  const world=T.weaponMeshes[id],eye=T.viewmodelDbg().gun.root;
  T.setBarrelHeatDbg(id,.9);
  try{
    for(let i=0;i<6;i++)T.stepFrame(1/60);
    const samples=[world,eye].map(root=>{
      const node=findGunHeatParts(root,id,world).barrel,rows=[];
      node.traverse(m=>{
        if(!m.isMesh)return;
        const mat=Array.isArray(m.material)?m.material[0]:m.material;
        const {position,uv1}=m.geometry.attributes;
        if(!uv1||!mat.emissive?.getHex()||mat.emissiveIntensity<=0||mat.emissiveMap?.channel!==1)throw Error('Visible heat mapping missing '+m.name);
        let error=0;
        for(let i=0;i<position.count;i++)error=Math.max(error,Math.abs(uv1.getX(i)-(position.getZ(i)-lo)/(hi-lo)),Math.abs(uv1.getY(i)-.5));
        if(error>1e-6)throw Error('Gradient moved on exposed artwork '+error);
        rows.push({count:position.count,error,intensity:mat.emissiveIntensity});
      });
      if(!rows.length)throw Error('Missing heated Wasp artwork');return rows;
    });
    return {range:[lo,hi],samples};
  }finally{T.setBarrelHeatDbg(id,0);T.stepFrame(1/60);}
}
