import {makeM4Model} from '../../studio/weapon-longarms.js';
import {visibleSurfaceGap,visiblePieces,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';

export function bandProfiles(G,parts,bands,show){
  const results={};
  for(const [name,axis,sign] of [['right','x',1],['left','x',-1],['front','z',1],['rear','z',-1]]){
    show('before');const old=sideSkin(G,parts,axis,sign);show('after');const current=sideSkin(G,parts,axis,sign);
    const result={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
    for(const band of bands)for(let j=0;j<22;j++){
      const y=band.position.y-.002093+j*.0002;
      const isSide=axis==='x',base=isSide?band.position.z-.042093:-.020093;
      for(let i=0;i<(isSide?225:158);i++){
        const p=base+i*(isSide?.000375:.000255);
        const a=old(p,y),b=current(p,y);if(!Number.isFinite(a)&&!Number.isFinite(b))continue;
        result.occupied++;
        if(!Number.isFinite(a)){result.added++;continue;}if(!Number.isFinite(b)){result.lost++;continue;}
        if(a-b>result.maxIn){result.maxIn=a-b;result.worst=[p,y,a,b];}
        if(b-a>result.maxOut){result.maxOut=b-a;result.outerAt=[p,y,a,b];}
      }
    }
    results[name]=result;
  }
  return results;
}

export function checkMagazineFinish(T,id="m4"){
  const gun=T.weaponMeshes[id],prior=T.armoryFinishDbg.list(id).current||'';
  function read(){
    const world=gun.userData.mag,eye=new Map(T.viewmodelDbg().gun.pairs).get(world);
    if(!eye)throw Error('No first-person magazine');
    return [world,eye].map(mag=>{
      const names=[];
      mag.traverse(m=>{if(m.isMesh)for(const mat of (Array.isArray(m.material)?m.material:[m.material])){
        names.push([mat.name,mat.userData.gunPaintId||null,mat.color?.getHex(),mat.map?.uuid||null]);
      }});
      return names;
    });
  }
  const before=read();
  try{
    if(!T.armoryFinishDbg.paint(id,'m81'))throw Error('Training M81 unavailable');
    for(let i=0;i<20;i++)T.stepFrame(1/30);
    const current=read(),registry=T.getGunFurniture()[id];
    if(!registry.some(m=>m.map))throw Error('Paint did not apply');
    if(JSON.stringify(before)!==JSON.stringify(current))throw Error('Magazine finish changed '+JSON.stringify({before,current}));
    return {worldMaterials:current[0].length,eyeMaterials:current[1].length,coatedMaterials:registry.length};
  }finally{T.armoryFinishDbg.paint(id,prior);}
}

export function checkMagBands(T,id,baseline,pictures=false,snapshot=false){
  if(id!=='m4')throw Error('Unexpected model');
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE,bands=[],originals=[];
  const model=makeM4Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,box(...args){
      const m=k.box(...args);
      if(args[0]===.039&&args[1]===.004&&args[2]===.082){bands.push(m);originals.push(m.geometry.clone());}
      return m;
    }};
  }});
  const u=model.userData,mag=u.mag,host=mag.children[0],now=bands.map(m=>m.geometry);
  if(bands.length!==3||!bands.every((m,i)=>m===mag.children[13+i]))throw Error('Wrong magazine bands');
  const parts=mag.children.filter(c=>c.isMesh),ribs=[1,2,3,7,8,9].map(i=>mag.children[i]);
  model.visible=true;model.scale.copy(T.weaponMeshes.m4.scale);
  const show=phase=>{bands.forEach((m,i)=>m.geometry=phase==='before'?originals[i]:now[i]);model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different original GW-4 '+hash+' vs '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const solids=bands.map(m=>visiblePieces(m,1.8/1.655));
  const closed=solids.map(s=>s.map(p=>p.closed));
  const islandGaps=solids.map((pieces,i)=>pieces.map(cell=>{
    const mesh=bands[i],vertices=[];
    for(const face of cell.faces)for(const p of face.p){
      const local=mesh.worldToLocal(p.clone().multiplyScalar(1.655/1.8));vertices.push(local.x,local.y,local.z);
    }
    const geometry=new G.BufferGeometry();geometry.setAttribute('position',new G.Float32BufferAttribute(vertices,3));
    const part=new G.Mesh(geometry,mesh.material);part.matrixAutoUpdate=false;part.matrix.copy(mesh.matrixWorld);
    const gap=visibleSurfaceGap(part,host,1.8/1.655);geometry.dispose();return gap;
  }));
  const gaps=bands.map(m=>[host,...ribs].map(p=>visibleSurfaceGap(m,p,1.8/1.655)));
  const marks=bands.map((m,j)=>[4+j,10+j].map(i=>visibleSurfaceGap(m,mag.children[i],1.8/1.655)));
  const profile=bandProfiles(G,parts,bands,show);
  const result={hash,closed,islandGaps,gaps,marks,profile,triangles:now.map(g=>(g.index?.count??g.attributes.position.count)/3)};
  if(snapshot)result.reference={scale:model.scale.toArray(),indices:bands.map(m=>parts.indexOf(m)),ribs:ribs.map(m=>parts.indexOf(m)),meshes:parts.map(m=>({position:m.position.toArray(),geometry:m.geometry.toJSON()}))};
  return result;
}
