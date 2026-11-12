import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,artworkFingerprint,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {topTuples} from './surface-tuples.mjs';

export function checkSawBoot(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let cowl,boot,intake,original;
  const model=makeChainsawModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,
      slab(points,width,mat,options){const m=k.slab(points,width,mat,options);if(width===.22&&points[0][0]===-.25)cowl=m;return m;},
      box(...args){
        const m=k.box(...args);
        if(args[0]===.028&&args[1]===.024&&args[5]===.168){boot=m;original=m.geometry;}
        if(args[0]===.105&&args[1]===.003&&args[5]===.181)intake=m;
        return m;
      }
    };
  }});
  if(!boot||!cowl||!intake)throw Error('Missing saw boot or adjacent covers');
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  if(!original.userData.shared)throw Error('Original rounded box lost its renderer cache flag');
  const now=boot.geometry,u=model.userData,show=phase=>{boot.geometry=phase==='before'?original:now;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Saw original differs '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show};
  const reference=mesh=>({p:mesh.position.toArray(),q:mesh.quaternion.toArray(),g:mesh.geometry.toJSON()});
  const contacts=[cowl,intake].map(host=>visibleSurfaceGap(boot,host,1.8/1.655)),closed=visiblePieces(boot,1.8/1.655).map(c=>c.closed);
  const toModel=(mesh,geometry=mesh.geometry)=>geometry.clone().applyMatrix4(mesh.matrix);
  const skins=[toModel(cowl),toModel(intake),toModel(boot,original),toModel(boot,now)];
  const [roof,plate,previous,current]=skins.map(topTuples);
  const rawNormals=geometry=>{
    const transformed=geometry.clone();
    transformed.attributes.position.applyMatrix4(boot.matrix);
    transformed.attributes.normal.applyMatrix3(new G.Matrix3().getNormalMatrix(boot.matrix));
    const sample=topTuples(transformed);transformed.dispose();return sample;
  };
  const oldNormals=rawNormals(original),newNormals=rawNormals(now);
  const exterior={maxRawNormal:0,occupied:0,originalExposed:0,exposedBoot:0,missing:0,maxIn:0,maxOut:0,maxNormal:0,maxUV:0};
  for(let i=0;i<74;i++)for(let j=0;j<112;j++){
    const x=.030071+i*.00041,z=-.254079+j*.00040;
    const host=Math.max(roof(x,z)?.[0]??-Infinity,plate(x,z)?.[0]??-Infinity);
    const a=previous(x,z),b=current(x,z),pa=Math.max(host,a?.[0]??-Infinity),pb=Math.max(host,b?.[0]??-Infinity);
    if(!Number.isFinite(pa)&&!Number.isFinite(pb))continue;
    exterior.occupied++;
    if(!Number.isFinite(pa)||!Number.isFinite(pb)){exterior.missing++;continue;}
    exterior.maxIn=Math.max(exterior.maxIn,pa-pb);exterior.maxOut=Math.max(exterior.maxOut,pb-pa);
    if(a&&a[0]>host+1e-7)exterior.originalExposed++;
    if(!a||!b||a[0]<=host+1e-7||Math.abs(a[0]-b[0])>1e-7)continue;
    exterior.exposedBoot++;
    const aRaw=oldNormals(x,z),bRaw=newNormals(x,z);
    for(let k=1;k<=3;k++)exterior.maxRawNormal=Math.max(exterior.maxRawNormal,Math.abs(aRaw[k]-bRaw[k]));
    for(let k=1;k<=3;k++)exterior.maxNormal=Math.max(exterior.maxNormal,Math.abs(a[k]-b[k]));
    for(let k=4;k<=5;k++)exterior.maxUV=Math.max(exterior.maxUV,Math.abs(a[k]-b[k]));
  }
  for(const skin of skins)skin.dispose();
  const currentHash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  return {hash,currentHash,sourceShared:original.userData.shared,contacts,closed,exterior,cap:u.fuelCap.position.toArray(),chain:u.chainTeeth.length,
    reference:snapshot?{meshes:[cowl,intake,boot].map(reference),scale:model.scale.toArray()}:undefined};
}
