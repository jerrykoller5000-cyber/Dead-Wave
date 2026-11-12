import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,artworkFingerprint,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {topTuples} from './surface-tuples.mjs';

export function checkWaspCatch(T,id,baseline,pictures=false,snapshot=false){
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE,ribs=[];let cover,button,old;
  const model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,
      slab(points,width,material,options){const m=k.slab(points,width,material,options);if(width===.09&&points[0][0]===-.13)cover=m;return m;},
      box(...args){const m=k.box(...args);
        if(args[0]===.026&&args[1]===.008&&args[2]===.016&&args[6]===-.118){button=m;old=m.geometry;}
        if(args[0]===.002&&args[1]===.001&&args[6]===-.118)ribs.push(m);return m;
      }};
  }});
  if(!cover||!button||ribs.length!==3)throw Error('Missing upper cover artwork');
  const current=button.geometry,u=model.userData;model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{button.geometry=phase==='before'?old:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Earlier Wasp does not match '+hash+' / '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const closed=visiblePieces(button,1.8/1.655).map(c=>c.closed),gap=visibleSurfaceGap(button,cover,1.8/1.655);
  const ribGaps=ribs.map(m=>visibleSurfaceGap(m,button,1.8/1.655)),parts=[button,cover,...ribs];
  const profiles={};
  for(const [axis,sign] of [['x',1],['x',-1],['y',1],['z',-1]]){
    show('before');const oldSurface=sideSkin(G,parts,axis,sign);show('after');const surface=sideSkin(G,parts,axis,sign);
    const stats={occupied:0,lost:0,added:0,maxIn:0,maxOut:0};
    for(let i=0;i<104;i++)for(let j=0;j<77;j++){
      const z=axis==='z'?-.01417+i*.00027:-.13007+i*.000235,y=axis==='y'?-.01413+j*.00037:.093113+j*.00017;
      const p=oldSurface(z,y),q=surface(z,y);if(!Number.isFinite(p)&&!Number.isFinite(q))continue;
      stats.occupied++;if(!Number.isFinite(p)){stats.added++;continue;}if(!Number.isFinite(q)){stats.lost++;continue;}
      stats.maxIn=Math.max(stats.maxIn,p-q);stats.maxOut=Math.max(stats.maxOut,q-p);
    }
    profiles[axis+sign]=stats;
  }
  const a=topTuples(old),b=topTuples(current),roof=sideSkin(G,[cover,...ribs],'y'),finish={visible:0,retained:0,maxHeight:0,maxNormal:0,maxUV:0};
  for(let i=0;i<81;i++)for(let j=0;j<71;j++){
    const x=-.01297+i*.00032,z=-.00797+j*.000227,p=a(x,z),q=b(x,z);
    if(!p||p[0]+button.position.y<=roof(z+button.position.z,x)+1e-7)continue;
    finish.visible++;if(!q)continue;finish.retained++;finish.maxHeight=Math.max(finish.maxHeight,Math.abs(p[0]-q[0]));
    for(let k=1;k<=3;k++)finish.maxNormal=Math.max(finish.maxNormal,Math.abs(p[k]-q[k]));
    for(let k=4;k<6;k++)finish.maxUV=Math.max(finish.maxUV,Math.abs(p[k]-q[k]));
  }
  const ref=m=>({p:m.position.toArray(),q:m.quaternion.toArray(),g:m.geometry.toJSON()});
  return {hash,closed,gap,ribGaps,profiles,finish,reference:snapshot?{parts:parts.map(ref),scale:model.scale.toArray()}:undefined};
}
