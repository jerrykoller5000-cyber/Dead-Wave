import {makeM4Model} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {topTuples} from './surface-tuples.mjs';
export function checkGwGrip(T,id,baseline,pictures=false,snapshot=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let grip,lower,guard,old;
  const model=makeM4Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(points,width,mat,o){
      const m=k.slab(points,width,mat,o);
      if(width===.047&&points.length===18){grip=m;old=m.geometry;}
      if(width===.0475&&points[0][0]===-.172)lower=m;
      return m;
    }};
  }});
  if(!grip||!lower)throw Error('Missing grip or lower housing');
  guard=model.children[53];
  const current=grip.geometry,u=model.userData;model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{grip.geometry=phase==='before'?old:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original GW-4 mismatch '+hash+' vs '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const parts=[grip,lower,guard],ref=m=>({p:m.position.toArray(),q:m.quaternion.toArray(),g:m.geometry.toJSON()});
  const gap=visibleSurfaceGap(grip,lower,1.8/1.655),guardGap=visibleSurfaceGap(grip,guard,1.8/1.655),closed=visiblePieces(grip,1.8/1.655).map(p=>p.closed);
  const surfaces={};
  for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1]]){
    show('before');const a=sideSkin(G,parts,axis,sign);show('after');const b=sideSkin(G,parts,axis,sign);
    const s={occupied:0,added:0,lost:0,maxIn:0,maxOut:0};
    for(let i=0;i<117;i++)for(let j=0;j<94;j++){
      const z=axis==='x'?-.18013+i*.00117:-.02507+i*.000429,y=-.08417+j*.00072;
      const p=a(z,y),q=b(z,y);
      if(!Number.isFinite(p)&&!Number.isFinite(q))continue;
      s.occupied++;if(!Number.isFinite(p)){s.added++;continue;}if(!Number.isFinite(q)){s.lost++;continue;}
      s.maxIn=Math.max(s.maxIn,p-q);s.maxOut=Math.max(s.maxOut,q-p);
    }
    surfaces[axis+sign]=s;
  }
  const finish={exposed:0,retained:0,maxHeight:0,maxNormal:0,maxUV:0};
  function sideTuples(geometry,sign){
    const rotated=geometry.clone();
    for(const attr of [rotated.attributes.position,rotated.attributes.normal])for(let i=0;i<attr.count;i++){
      const x=attr.getX(i);attr.setX(i,-sign*attr.getY(i));attr.setY(i,sign*x);
    }
    const at=topTuples(rotated);rotated.dispose();return (z,y)=>at(-sign*y,z);
  }
  for(const sign of [-1,1]){
    const previous=sideTuples(old,sign),now=sideTuples(current,sign),housing=sideSkin(G,[lower,guard],'x',sign);
    for(let i=0;i<123;i++)for(let j=0;j<116;j++){
      const z=-.17511+i*.00092,y=-.12409+j*.00071,a=previous(z,y),b=now(z,y);
      if(!a||a[0]<=housing(z,y)+1e-7)continue;
      finish.exposed++;if(!b)continue;
      finish.retained++;finish.maxHeight=Math.max(finish.maxHeight,Math.abs(a[0]-b[0]));
      for(let k=1;k<=3;k++)finish.maxNormal=Math.max(finish.maxNormal,Math.abs(a[k]-b[k]));
      for(let k=4;k<6;k++)finish.maxUV=Math.max(finish.maxUV,Math.abs(a[k]-b[k]));
    }
  }
  if(grip.material.userData.weaponFinishRole!=='furniture')throw Error('Grip lost its existing paint role');
  return {hash,gap,guardGap,closed,surfaces,finish,role:grip.material.userData.weaponFinishRole,reference:snapshot?{scale:model.scale.toArray(),parts:parts.map(ref)}:undefined};
}
