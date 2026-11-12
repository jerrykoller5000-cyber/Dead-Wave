import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkLugVents(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),edits=[];
  function capture(m){edits.push({m,old:m.geometry.clone()});return m;}
  const model=(id==='revolver'?makeRevolverModel:makeChainsawModel)({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(...args){
      const m=k.slab(...args);
      return id==='revolver'&&args[1]===.021&&args[0][0][0]===.234?capture(m):m;
    },box(...args){
      const m=k.box(...args);
      return id==='chainsaw'&&args[0]===.014&&args[1]===.004&&args[2]===.058&&args[6]===-.195?capture(m):m;
    }};
  }});
  if(edits.length!==(id==='revolver'?1:10))throw Error('Expected all artwork '+id+' '+edits.length);
  for(const e of edits)e.now=e.m.geometry;
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{
    for(const e of edits)e.m.geometry=phase==='before'?e.old:e.now;
    model.updateMatrixWorld(true);
  };
  const u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Prior art differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {hash,model,show};
  const results=edits.map(({m,old})=>{
    const side=Math.sign(m.position.x);
    const host=id==='revolver'?model.getObjectByName('heatParts-barrel'):
      model.children.find(n=>n.material===ctx.gunDark&&Math.abs(n.position.x-side*.15)<1e-9&&n.position.z===-.195);
    if(!host)throw Error('Missing backing');
    const pieces=visiblePieces(m),gap=visibleSurfaceGap(m,host,1.8/1.655);
    if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Bad seat '+JSON.stringify({id,part:model.children.indexOf(m),closed:pieces[0]?.closed,gap}));
    const exterior=id==='revolver'?exteriorSamples(m,old,1,-1,-.065,true):exteriorSamples(m,old,0,side,.156);
    return {part:model.children.indexOf(m),exterior,gap,trianglesBefore:(old.index?.count||old.attributes.position.count)/3,trianglesAfter:(m.geometry.index?.count||m.geometry.attributes.position.count)/3};
  });
  return {hash,results};
}
