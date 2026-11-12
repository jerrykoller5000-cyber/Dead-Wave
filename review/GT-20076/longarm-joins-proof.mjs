import {makeAkModel,makeSniperModel} from '../../studio/weapon-longarms.js';
import {mapBirchSlab} from '../../studio/weapon-finish.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkLongarmJoins(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let stockSource;
  const panels=[];
  const model=({ak:makeAkModel,sniper:makeSniperModel}[id])({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(points,width,mat,opts){
      const mesh=k.slab(points,width,mat,opts);
      if(id==='ak' && width===.046 && opts?.parent?.name==='fp-stock' && points.length>15){
        stockSource=mesh.clone();stockSource.geometry=mesh.geometry.clone();mapBirchSlab(stockSource,.12,.08);
      }
      if(id==='sniper' && width===.009 && points.length===5 && points[0][0]===.197 && points[0][1]===.041){
        const original=points.map(([z,y],i)=>[z,i<2?.042:y]);
        const prior=ctx.gunKit(new G.Group()).slab(original,width,mat,opts && {...opts,parent:null});
        panels.push({mesh,prior});
      }
      return mesh;
    }};
  }});
  model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.copy(T.weaponMeshes[id].scale);
  model.updateMatrixWorld(true);
  if(id==='sniper'){
    if(panels.length!==2)throw Error('Expected two sniper painted side panels');
    return panels.map(({mesh,prior})=>{
      const a=prior.geometry.attributes.position,b=mesh.geometry.attributes.position,delta=[0,0,0];let max=0,moved=0;
      if(a.count!==b.count)throw Error('Panel tessellation changed');
      for(let i=0;i<a.count;i++){
        const d=[b.getX(i)-a.getX(i),b.getY(i)-a.getY(i),b.getZ(i)-a.getZ(i)];
        const n=Math.hypot(...d);if(n>1e-8)moved++;
        if(n>max){max=n;delta.splice(0,3,...d);}
      }
      const host=model.children[mesh.position.x<0?3:4],pieces=visiblePieces(mesh);
      const gap=visibleSurfaceGap(mesh,host,1.8/1.655);
      if(pieces.length!==1||!pieces[0].closed||!moved||max>.0011||gap.penetrating||gap.upperMm>.5)throw Error('Bad sniper seam '+JSON.stringify({max,gap}));
      return {side:Math.sign(mesh.position.x),samples:a.count,moved,max,delta,gap};
    });
  }
  const stock=model.getObjectByName('KR-7 stock'),collar=model.userData.fpStock.children[0];
  for(const key of ['position','normal','uv']){
    const a=stock.geometry.attributes[key].array,b=stockSource.geometry.attributes[key].array;
    if(a.length!==b.length||a.some((v,i)=>v!==b[i]))throw Error('Birch surface changed: '+key);
  }
  const mag=model.userData.mag,targets=[[stock,collar],[mag.children[0],mag.children[4]],[mag.children[0],mag.children[5]]];
  const gaps=targets.map(([a,b])=>visibleSurfaceGap(a,b,1.8/1.655)),pieces=visiblePieces(collar);
  if(pieces.some(p=>!p.closed)||gaps.some(g=>g.penetrating||g.upperMm>.5))throw Error('Unsupported or crossed model edge '+JSON.stringify({pieces:pieces.length,gaps}));
  return {woodVertices:stock.geometry.attributes.position.count,woodMap:!!stock.material.map,collarPieces:pieces.length,gaps};
}
