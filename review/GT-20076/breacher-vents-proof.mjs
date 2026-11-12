import {makeAa12Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';
import {sideSkin} from './side-skin.mjs';

export function checkBreacherVents(T,id,baseline,pictures=false){
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE,vents=[];
  const model=makeAa12Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,box(...args){
      const mesh=kit.box(...args);
      if(args[0]===.004 && args[1]===.03 && args[2]===.045 && args[5]===.06){
        vents.push({mesh,before:mesh.geometry});
      }
      return mesh;
    }};
  }});
  const casing=model.children[47],u=model.userData;
  if(vents.length!==6||casing.userData.clipPart!=='breacher-opaque-front-casing')throw Error('Unexpected forearm artwork');
  for(const v of vents)v.after=v.mesh.geometry;
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{for(const v of vents)v.mesh.geometry=v[phase];model.updateMatrixWorld(true);};
  show('before');
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Unexpected Breacher original '+hash);
  show('after');if(pictures)return {model,hash,show};
  const seats=vents.map(({mesh,before})=>({
    closed:visiblePieces(mesh).map(p=>p.closed),gap:visibleSurfaceGap(mesh,casing,1.8/1.655),
    side:Math.sign(mesh.position.x),z:mesh.position.z,
    exterior:exteriorSamples(mesh,before,0,Math.sign(mesh.position.x),.045,true)
  }));
  function layers(phase){
    show(phase);
    return [casing,...vents.map(v=>v.mesh)].map(m=>({position:m.position,geometry:m.geometry}));
  }
  const a=layers('before'),b=layers('after'),profiles=[];
  for(const sign of [-1,1]){
    const before=sideSkin(G,a,'x',sign),after=sideSkin(G,b,'x',sign);
    let occupied=0,lost=0,added=0,maxDepth=0;
    for(let i=0;i<141;i++)for(let j=0;j<61;j++){
      const z=.26513+i*.00144,y=.03014+j*.00091,old=before(z,y),current=after(z,y);
      if(Number.isFinite(old)){occupied++;if(!Number.isFinite(current))lost++;else maxDepth=Math.max(maxDepth,Math.abs(old-current));}
      else if(Number.isFinite(current))added++;
    }
    profiles.push({sign,occupied,lost,added,maxDepth});
  }
  return {hash,seats,profiles,skins:new Set(vents.map(v=>v.after)).size,ventMaterial:vents[0].mesh.material.name,
    paint:vents[0].mesh.material.userData.weaponFinishRole??null,casingPaint:casing.material.userData.weaponFinishRole??null,trigger:u.triggerPin,drum:u.mag.position.toArray(),casing:casing.position.toArray(),muzzle:u.muzzleLocal.toArray()};
}
