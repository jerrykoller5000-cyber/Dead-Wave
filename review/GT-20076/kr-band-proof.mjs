import {makeAkModel} from '../../studio/weapon-longarms.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

function exterior(geometry, side, face){
  const {position,normal,uv}=geometry.attributes, tuples=new Set();
  for(let i=0;i<position.count;i++){
    const x=position.getX(i);
    if(side*x<=face+1e-7)continue;
    tuples.add([x,position.getY(i),position.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)].join(','));
  }
  return tuples;
}

export function verifyRaisedGraphics(ctx){
  const panels=[];
  makeAkModel({...ctx,finishGun:g=>g,gunKit:gun=>{
    const k=ctx.gunKit(gun);
    return {...k,slab(points,width,material,options){
      const mesh=k.slab(points,width,material,options);
      if(width===.037 && options?.bevel===.0012 && points.length===12)
        panels.push({mesh,before:mesh.geometry.clone()});
      return mesh;
    }};
  }});
  return panels.map(({mesh,before})=>{
    const pieces=visiblePieces(mesh), after=mesh.geometry;
    return {priorTriangles:before.attributes.position.count/3,triangles:after.attributes.position.count/3,
      islands:pieces.length,closed:pieces.every(p=>p.closed),sides:[-1,1].map(side=>{
        const a=exterior(before,side,.017),b=exterior(after,side,.017);
        let back=Infinity,outer=0;
        const pos=after.attributes.position;
        for(let i=0;i<pos.count;i++){
          const x=side*pos.getX(i);if(x<0)continue;
          back=Math.min(back,x);outer=Math.max(outer,x);
        }
        return {side,before:a.size,after:b.size,lost:[...a].filter(x=>!b.has(x)).length,
          added:[...b].filter(x=>!a.has(x)).length,back,outer};
      })};
  });
}
