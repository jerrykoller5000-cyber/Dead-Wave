import {makeAa12Model,makeM4Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';

function join(mesh,host){
  const parts=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
  if(parts.length!==1||!parts[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Unseated surface '+JSON.stringify({count:parts.length,closed:parts[0]?.closed,gap}));
  return gap;
}
function capSamples(G,mesh,geometry,centreZ,side){
  const {position:p,normal:n,uv}=geometry.attributes,keys=new Set();
  const point=new G.Vector3(),normal=new G.Vector3();
  for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyQuaternion(mesh.quaternion);point.z+=centreZ;
    normal.fromBufferAttribute(n,i).applyQuaternion(mesh.quaternion);
    if(Math.abs(point.z-side*.0675)<1e-7 && normal.z*side>.999999){
      keys.add([...point.toArray(),...normal.toArray(),uv.getX(i),uv.getY(i)].map(v=>Math.round(v*1e6)).join(','));
    }
  }
  return keys;
}
export function checkDrumOptic(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),edits=[];
  const kit=ctx.gunKit(new G.Group());
  const model=({aa12:makeAa12Model,m4:makeM4Model}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,box(...args){
      const m=k.box(...args);
      if(id==='m4'&&args[0]===.046&&args[1]===.016&&args[2]===.04&&args[5]===.118){
        edits.push({m,old:m.geometry.clone(),oldZ:m.position.z});
      }
      return m;
    },cyl(...args){
      const m=k.cyl(...args);
      if(id==='aa12'&&args[0]===.137&&args[1]===.137&&args[7]?.name==='magazineBody'){
        const oldZ=Math.sign(args[6])*.065;
        const old=kit.cyl(.137,.137,.005,args[3],0,0,oldZ,null,32);
        edits.push({m,old:old.geometry,oldZ});
      }
      return m;
    }};
  }});
  if(edits.length!==(id==='m4'?1:2))throw Error('Original sources missing '+id+' '+edits.length);
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  for(const e of edits){e.now=e.m.geometry;e.nowZ=e.m.position.z;}
  function show(phase){
    for(const e of edits){e.m.geometry=phase==='before'?e.old:e.now;e.m.position.z=phase==='before'?e.oldZ:e.nowZ;}
    model.updateMatrixWorld(true);
  }
  const u=model.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Complete prior model differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {hash,model,show};
  if(id==='m4'){
    const {m,old}=edits[0],optic=u.defaultSight,glass=optic.children.find(n=>n.material?.transparent&&n.material?.opacity===.18);
    if(m!==optic.children[2]||m.material.userData.weaponFinishRole!=='optic shell'||!glass)throw Error('Incorrect optic artwork');
    const marks=optic.children.filter(m=>m.position.y===.134&&m.position.z===.0455);
    if(marks.length!==2)throw Error('Dot or ring moved');
    return {hash,exterior:exteriorSamples(m,old,1,1,.118),role:m.material.userData.weaponFinishRole,gap:join(m,optic.children[1]),glass:glass.position.toArray(),dot:marks[0].position.toArray()};
  }
  const shells=edits.map(e=>{
    const side=Math.sign(e.nowZ),a=capSamples(G,e.m,e.old,e.oldZ,side),b=capSamples(G,e.m,e.now,e.nowZ,side);
    if(a.size<32||a.size!==b.size||[...a].some(key=>!b.has(key)))throw Error('Visible magazine face changed '+a.size+'/'+b.size);
    return {side,outside:a.size,gap:join(e.m,u.magStretch.children[0])};
  });
  const top=u.magazineTopRound,p=top.position.toArray();u.setMagazineRounds(1);
  if(!top.visible)throw Error('Missing displayed round');u.setMagazineRounds(0);
  if(top.visible)throw Error('Round remained when empty');
  return {hash,shells,roundPosition:p,magazineAnchor:u.baseMagPos.toArray()};
}
