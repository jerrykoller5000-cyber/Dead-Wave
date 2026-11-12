import {makeShotgunModel,makeSniperModel} from '../../studio/weapon-longarms.js';
import {makeOptic} from '../../studio/weapon-optics.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkPlateRibs(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),edits=[];
  function remember(mesh){edits.push({mesh,old:mesh.geometry.clone()});return mesh;}
  const gun=(id==='shotgun'?makeShotgunModel:makeSniperModel)({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:g=>{
    const kit=ctx.gunKit(g);
    return {...kit,slab(...args){
      const mesh=kit.slab(...args);return id==='shotgun'&&args[1]===.044&&args[0][0][0]===.086?remember(mesh):mesh;
    },box(...args){
      const mesh=kit.box(...args);return id==='sniper'&&args[0]===.0025&&args[1]===.113&&args[2]===.004?remember(mesh):mesh;
    }};
  }});
  if(id==='sniper'){
    gun.getObjectByName('scope').visible=false;const optic=makeOptic('nx8');
    optic.position.copy(T.weaponMeshes.sniper.getObjectByName(optic.name).position);gun.add(optic);
  }
  if(edits.length!==(id==='shotgun'?1:4))throw Error('Unexpected artwork '+id+' '+edits.length);
  gun.visible=true;gun.scale.copy(T.weaponMeshes[id].scale);const u=gun.userData;
  for(const e of edits)e.now=e.mesh.geometry;
  const show=phase=>{for(const e of edits)e.mesh.geometry=phase==='before'?e.old:e.now;gun.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(gun,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));show('after');
  if(hash!==baseline)throw Error('Complete baseline differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {model:gun,show,hash};
  const host=id==='shotgun'?gun.getObjectByName('shotgun receiver'):u.mag.children[0];
  const seats=edits.map(({mesh,old})=>{
    const parts=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
    if(parts.length!==1||!parts[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Bad seat '+JSON.stringify({id,gap,closed:parts[0]?.closed}));
    const exterior=id==='shotgun'?exteriorSamples(mesh,old,1,-1,.031,true):exteriorSamples(mesh,old,0,Math.sign(mesh.position.x),.025);
    return {exterior,gap,triangles:(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3};
  });
  if(id==='shotgun')return {hash,seats,guard:gun.children[18].position.toArray(),pivot:u.triggerPin};
  const top=u.magazineTopRound;u.setMagazineRounds(1);if(!top.visible)throw Error('Missing displayed cartridge');u.setMagazineRounds(0);if(top.visible)throw Error('Displayed empty cartridge');
  return {hash,seats,magazine:u.baseMagPos.toArray(),top:top.position.toArray()};
}
