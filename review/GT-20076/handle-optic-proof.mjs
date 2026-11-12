import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {makeSniperModel} from '../../studio/weapon-longarms.js';
import {makeOptic} from '../../studio/weapon-optics.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkHandleOptic(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const rawContext={...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}};
  const model=(id==='chainsaw'?makeChainsawModel:makeSniperModel)(rawContext);
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  let host,landmarks;
  const changes=[];
  if(id==='chainsaw'){
    const original=ctx.gunKit(new G.Group()).slab(ctx.gunBand([[-.245,.08],[-.445,.08],[-.49,.025],[-.49,-.095],[-.27,-.095]],.014),.07,ctx.gunPoly,{bevel:.007});
    changes.push({part:model.children[72],old:original.geometry});
    host=model.children[0];
  }else{
    const scope=makeOptic('nx8'),issued=T.weaponMeshes.sniper.getObjectByName(scope.name);
    scope.position.copy(issued.position);model.getObjectByName('scope').visible=false;model.add(scope);
    host=scope.getObjectByName('scope rail bridge');
    for(const part of scope.children.filter(m=>m.name==='rail clamp jaw')){
      changes.push({part,old:new G.BoxGeometry(.003,.012,.121)});
    }
    if(changes.length!==2)throw Error('Missing paired optic plates');
    landmarks={position:scope.position.toArray(),eye:scope.userData.sight.eye,dot:scope.userData.sight.dot};
  }
  for(const e of changes)e.now=e.part.geometry;
  const show=phase=>{
    for(const e of changes)e.part.geometry=phase==='before'?e.old:e.now;
    model.updateMatrixWorld(true);
  };
  const u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Complete baseline differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {hash,model,show};
  const seats=changes.map(({part,old})=>{
    const pieces=visiblePieces(part),gap=visibleSurfaceGap(part,host,1.8/1.655);
    if(pieces.length!==1 || !pieces[0].closed || gap.penetrating || gap.upperMm>.5){
      const edges=new Map();
      for(const piece of pieces)for(const face of piece.faces)for(let i=0;i<3;i++){
        const key=[face.p[i],face.p[(i+1)%3]].map(v=>part.worldToLocal(v.clone()).toArray().map(x=>x.toFixed(7)).join(',')).sort().join('|');
        edges.set(key,(edges.get(key)||0)+1);
      }
      throw Error('Bad join '+JSON.stringify({id,closed:pieces[0]?.closed,gap,edges:[...edges].filter(([,n])=>n!==2).slice(0,12)}));
    }
    if(id==='chainsaw')return {gap,grip:exteriorSamples(part,old,2,-1,.33),bottom:exteriorSamples(part,old,1,-1,.07)};
    const side=Math.sign(part.position.x);
    if(part.material.userData.weaponFinishRole!=='optic shell')throw Error('Missing finish role');
    return {gap,outer:exteriorSamples(part,old,0,side,.0211),bottom:exteriorSamples(part,old,1,-1,-.002),role:part.material.userData.weaponFinishRole};
  });
  return {hash,seats,landmarks};
}
