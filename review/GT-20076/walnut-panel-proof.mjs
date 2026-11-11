import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {comparePlanarBack} from './panel-surface.mjs';

export function checkWalnutPanels(ctx){
  const panels=[];
  makeRevolverModel({...ctx,finishGun:gun=>gun,gunKit:gun=>{
    const kit=ctx.gunKit(gun);
    return {...kit,slab(points,width,material,options){
      const mesh=kit.slab(points,width,material,options);
      if(width===.0012 && Math.abs(options?.x)===.0329)panels.push({mesh,before:mesh.geometry.clone()});
      return mesh;
    }};
  }});
  return panels.map(({mesh,before})=>({...comparePlanarBack(mesh,before,.033),
    woodTexture:!!mesh.material.map,paintRole:mesh.material.userData.weaponFinishRole||null}));
}
