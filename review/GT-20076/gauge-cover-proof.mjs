import {makeMinigunModel,makeFlamerModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {comparePlanarBack} from './panel-surface.mjs';

export function checkGaugeCovers(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),targets=[];
  const g=({minigun:makeMinigunModel,flamer:makeFlamerModel}[id])({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,box(...args){
      const m=k.box(...args);
      if(id==='minigun' && ((args[0]===.061&&args[1]===.007&&args[2]===.19)||(args[0]===.055&&args[1]===.008&&args[2]===.184)))
        targets.push({mesh:m,old:m.geometry.clone(),localCut:(args[0]===.061?.13:.1325)-args[5]});
      return m;
    }};
  }});
  g.visible=true;g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.set(1,1,1);g.updateMatrixWorld(true);
  if(id==='flamer'){
    const surround=g.children[38],dial=g.children[39],host=g.children[0];
    const rear=new G.Box3().setFromObject(surround,true).min.z,gap=visibleSurfaceGap(surround,host,1),faceGap=visibleSurfaceGap(dial,surround,1);
    if(visiblePieces(surround).length!==1 || Math.abs(rear+.183)>1e-7 || gap.penetrating || gap.upperMm>.5 || faceGap.penetrating || faceGap.upperMm>.5)
      throw Error('Gauge seating '+JSON.stringify({rear,gap,faceGap}));
    return {rear,gap,faceGap};
  }
  if(targets.length!==4)throw Error('Missing cover art');
  return targets.map(({mesh,old,localCut},i)=>{
    const retained=comparePlanarBack(mesh,old,mesh.position.y+localCut,'y',1);
    const host=i%2===0?g.children[0]:targets[i-1].mesh,gap=visibleSurfaceGap(mesh,host,1);
    if(!retained.closed||retained.before===0||retained.missing+retained.added!==0||retained.outerMotion!==0||gap.penetrating||gap.upperMm>.5)
      throw Error('Top cover seating '+JSON.stringify({retained,gap}));
    return {...retained,gap};
  });
}
