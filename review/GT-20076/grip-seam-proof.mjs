import {makePistolModel} from '../../studio/weapon-sidearms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkGripSeam(T,id,baseline,pictures=false){
  if(id!=='pistol')throw Error('Expected pistol');
  const ctx=T.inspectHost().builders.weaponContext(),before=[];
  const model=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},
    gunKit:root=>{
      const kit=ctx.gunKit(root);
      return {...kit,slab(...args){
        const mesh=kit.slab(...args);
        if(args[1]===.052&&args[3]?.bevel===.009){
          const cover=root.getObjectByName('pistol dust cover');
          before.push(cover.geometry.clone(),mesh.geometry.clone());
        }
        return mesh;
      }};
    }
  });
  const parts=['pistol dust cover','pistol grip'].map(n=>model.getObjectByName(n)),after=parts.map(m=>m.geometry);
  if(before.length!==2)throw Error('Ambiguous pistol seam');
  const u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  model.visible=true;model.scale.copy(T.weaponMeshes.pistol.scale);
  const show=phase=>{parts.forEach((p,i)=>{p.geometry=(phase==='before'?before:after)[i];});model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Previous complete pistol model differs '+hash+' vs '+baseline);
  if(pictures)return {hash,model,show};
  const cells=parts.map(p=>visiblePieces(p,1.8/1.655));
  const gap=visibleSurfaceGap(parts[0],parts[1],1.8/1.655);
  const geo=m=>Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(m.geometry.attributes[k].array)]));
  return {hash,gap,cells:cells.map(a=>a.map(s=>({closed:s.closed,faces:s.faces.length}))),grip:geo(parts[1]),cover:geo(parts[0]),tang:geo(model.getObjectByName('pistol rear tang'))};
}
