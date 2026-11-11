import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {comparePlanarBack} from './panel-surface.mjs';

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
  const results=panels.map(({mesh,before})=>comparePlanarBack(mesh,before,.136));
  const data=raw.userData;
  const matrices=data.chainTeeth.map(o=>o.matrix.clone());
  data.chainPhase+=.017;
  ctx.layoutChainsawChain(raw);
  const moved=data.chainTeeth.filter((o,i)=>{o.updateMatrix();return !o.matrix.equals(matrices[i]);}).length;
  return {panels:results,instances:data.chainInst.count,moved};
}
