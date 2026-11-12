import {makeMinigunModel,makeChainsawModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkOutlineJoins(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const g=({minigun:makeMinigunModel,chainsaw:makeChainsawModel}[id])({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{}});
  g.visible=true;g.scale.copy(T.weaponMeshes[id].scale);g.updateMatrixWorld(true);
  const parts=id==='minigun'?[50,80]:[86],host=g.children[0];
  const fits=parts.map(i=>{
    const mesh=g.children[i],pieces=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
    if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Unseated graphic '+JSON.stringify({id,i,pieces:pieces.length,gap}));
    return {index:i,closed:true,gap};
  });
  const kit=ctx.gunKit(new G.Group());
  const old=id==='minigun'?kit.slab(ctx.gunBand([[-.36,.095],[-.51,.095],[-.55,.045],[-.55,-.11],[-.46,-.13],[-.40,-.09]],.018),.065,ctx.gunPoly,{bevel:.008}):
    kit.slab([[.075,.055],[.102,.055],[.135,.219],[.109,.225]],.16,ctx.gunMid,{bevel:.007});
  const mesh=g.children[parts[0]];
  const untouched=(p,i)=>id==='minigun'?p.getZ(i)<-.47:p.getY(i)>.17;
  function samples(geo){
    const {position:p,normal:n,uv:u}=geo.attributes,s=new Set();
    for(let i=0;i<p.count;i++)if(untouched(p,i))s.add([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),u.getX(i),u.getY(i)].join(','));
    return s;
  }
  const a=samples(old.geometry),b=samples(mesh.geometry);
  if(a.size<8||a.size!==b.size||[...a].some(v=>!b.has(v)))throw Error('Outer handle/guard samples changed '+id+' '+a.size+'/'+b.size);
  old.geometry.computeBoundingBox();mesh.geometry.computeBoundingBox();
  const end=id==='minigun'?geo=>geo.boundingBox.max.z:geo=>geo.boundingBox.min.y;
  return {fits,stationaryOutwardTuples:a.size,originalEndpoint:end(old.geometry),newEndpoint:end(mesh.geometry),visibleScale:mesh.scale.toArray()};
}
