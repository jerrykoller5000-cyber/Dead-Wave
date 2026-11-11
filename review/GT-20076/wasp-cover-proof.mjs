import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {comparePlanarBack} from './panel-surface.mjs';

export function compareWaspCovers(ctx){
  const panels=[];
  makeUziModel({...ctx,finishGun:gun=>gun,gunKit:gun=>{
    const kit=ctx.gunKit(gun);
    return {...kit,slab(points,width,material,options){
      const mesh=kit.slab(points,width,material,options);
      const rib=width===.003 && Math.abs(options?.x)===.0496;
      const top=width===.09 && points[0][0]===-.13 && points[0][1]===.074;
      if(rib || top)panels.push({mesh,before:mesh.geometry.clone(),rib});
      return mesh;
    }};
  }});
  return panels.map(({mesh,before,rib})=>{
    const back=comparePlanarBack(mesh,before,rib ? .049 : .078,rib ? 'x' : 'y',rib ? Math.sign(mesh.position.x) : 1);
    return {part:rib ? 'side strip' : 'top cover',...back};
  });
}
