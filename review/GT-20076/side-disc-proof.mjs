import {makeMinigunModel} from '../../studio/weapon-heavy.js';
import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkSideDiscs(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  let original;
  const model=({minigun:makeMinigunModel,revolver:makeRevolverModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(id==='revolver'&&o?.x===-.0335&&w===.005&&p.length===7)original=mesh.geometry.clone();
      return mesh;
    }};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  const seat=(a,b)=>{
    const pieces=visiblePieces(a),gap=visibleSurfaceGap(a,b,1.8/1.655);
    if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Unseated or open graphic '+JSON.stringify({id,gap}));
    return gap;
  };
  if(id==='revolver'){
    const face=model.children[18],old=original.attributes,now=face.geometry.attributes;
    let exterior=0,maxShift=0;
    for(let i=0;i<old.position.count;i++){
      const x=old.position.getX(i);
      const delta=now.position.getX(i)-x;
      if(x<.0015-1e-8){if(delta!==0)throw Error('Exposed thumb face moved');exterior++;}
      maxShift=Math.max(maxShift,Math.abs(delta));
      if(old.position.getY(i)!==now.position.getY(i)||old.position.getZ(i)!==now.position.getZ(i))throw Error('Thumb face moved along its mount');
    }
    for(const key of ['normal','uv'])if(old[key].array.some((v,i)=>v!==now[key].array[i]))throw Error('Thumb surface appearance changed');
    if(exterior<20 || Math.abs(maxShift-.001)>1e-7)throw Error('Wrong thumb backing');
    return {exterior,maxShift,gap:seat(face,model.children[0])};
  }
  const discs=['left','right'].map(side=>model.getObjectByName('minigun '+side+' side disc'));
  if(discs.some(m=>!m||m.parent!==model))throw Error('Expected both discs in the housing draw batch');
  const ref=ctx.gunKit(new G.Group()).cyl(.07,.07,.3,ctx.gunDark,0,-.02,-.32,null,12,'x');
  const base=ref.geometry.attributes;
  return discs.map((mesh,sideIndex)=>{
    const side=sideIndex===0?-1:1,attr=mesh.geometry.attributes;
    let exterior=0,tipSamples=0,tipRetreat=0;
    for(const key of ['normal','uv'])if(base[key].array.some((v,i)=>v!==attr[key].array[i]))throw Error('Disc shading or UV changed');
    for(let i=0;i<base.position.count;i++){
      const a=base.position,b=attr.position;
      if(a.getX(i)!==b.getX(i))throw Error('Disc radius moved across original outline');
      if(-side*a.getY(i)<=0)continue;
      if(Math.abs(mesh.position.x/mesh.scale.x-b.getY(i)+a.getY(i))>1e-7)throw Error('Exposed end plane moved');
      const retreat=a.getZ(i)-b.getZ(i);
      if(a.getZ(i)>.069){if(retreat<=0||retreat>.0021)throw Error('Wrong trim at forward facet');tipRetreat=Math.max(tipRetreat,retreat);tipSamples++;}
      else {if(retreat!==0)throw Error('Rim away from panel moved');exterior++;}
    }
    if(exterior<12||tipSamples===0)throw Error('Incomplete disc check');
    return {side,exterior,tipSamples,tipRetreat,gap:seat(mesh,model.children[0])};
  });
}
