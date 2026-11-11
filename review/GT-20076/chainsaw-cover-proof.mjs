import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function compareSideCovers(ctx) {
  const panels=[];
  const raw=makeChainsawModel({...ctx,finishGun:gun=>gun,gunKit:gun=>{
    const kit=ctx.gunKit(gun);
    return {...kit,slab(points,width,material,options){
      const mesh=kit.slab(points,width,material,options);
      if (width===.009 && Math.abs(options?.x)===.139) panels.push({mesh,before:mesh.geometry.clone()});
      return mesh;
    }};
  }});
  const results=panels.map(({mesh,before})=>{
    const side=Math.sign(mesh.position.x);
    function surface(geometry){
      const {position,normal,uv}=geometry.attributes, tuples=new Set();
      let inner=Infinity,outer=-Infinity;
      for(let i=0;i<position.count;i++){
        const dist=side*(mesh.position.x+position.getX(i));
        inner=Math.min(dist,inner);outer=Math.max(dist,outer);
        if(dist>.136+1e-7) tuples.add([position.getX(i),position.getY(i),position.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)].join(','));
      }
      return {tuples,inner,outer};
    }
    const a=surface(before),b=surface(mesh.geometry),pieces=visiblePieces(mesh);
    return {side,before:a.tuples.size,after:b.tuples.size,missing:[...a.tuples].filter(t=>!b.tuples.has(t)).length,
      added:[...b.tuples].filter(t=>!a.tuples.has(t)).length,inner:b.inner,outerMotion:b.outer-a.outer,
      closed:pieces.length===1 && pieces[0].closed};
  });
  const data=raw.userData;
  const matrices=data.chainTeeth.map(o=>o.matrix.clone());
  data.chainPhase+=.017;
  ctx.layoutChainsawChain(raw);
  const moved=data.chainTeeth.filter((o,i)=>{o.updateMatrix();return !o.matrix.equals(matrices[i]);}).length;
  return {panels:results,instances:data.chainInst.count,moved};
}
