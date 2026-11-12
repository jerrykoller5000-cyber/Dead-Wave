import {sideSkin} from './tang-cheek-proof.mjs';
import {topTuples} from './surface-tuples.mjs';
import {makeAa12Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkDrumRibs(T,id,baseline,pictures=false){
  const ctx=T.inspectHost().builders.weaponContext(),ribs=[];
  const model=makeAa12Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,box(...args){
      const mesh=kit.box(...args);
      if(args[0]===.006&&args[1]===.003&&args[2]===.05&&mesh.parent.name==='magazineBody'){
        ribs.push({mesh,old:mesh.geometry});
      }
      return mesh;
    }};
  }});
  const u=model.userData,body=u.magStretch,host=body.children[0];
  if(ribs.length!==24)throw Error('Expected 24 drum decorations, got '+ribs.length);
  for(const rib of ribs)rib.now=rib.mesh.geometry;
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{
    for(const rib of ribs)rib.mesh.geometry=phase==='before'?rib.old:rib.now;
    model.updateMatrixWorld(true);
  };
  show('before');
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Earlier drum differs '+hash+' vs '+baseline);
  show('after');
  if(pictures)return {model,hash,show};
  const data=ribs.map(({mesh})=>{
    const parts=visiblePieces(mesh,1.8/1.655);
    const n=ribs.findIndex(r=>r.mesh===mesh);
    const latch=n===6?58:n===18?52:null;
    const latchGaps=latch===null?[]:body.children.slice(latch,latch+2).map(p=>visibleSurfaceGap(mesh,p,1.8/1.655));
    return {closed:parts.length===1&&parts[0].closed,gap:visibleSurfaceGap(mesh,host,1.8/1.655),latchGaps};
  });
  const exterior={samples:0,maxY:0,maxNormal:0,maxUV:0};
  for(const {old,now} of ribs.slice(0,3)){
    const before=topTuples(old),after=topTuples(now);
    for(let i=0;i<55;i++)for(let j=0;j<125;j++){
      const x=-.00297+i*.0001099,z=-.02493+j*.000402;
      const p=before(x,z),q=after(x,z);
      if(!p&&!q)continue;
      if(!p||!q)throw Error('Missing or added rib silhouette');
      exterior.samples++;exterior.maxY=Math.max(exterior.maxY,Math.abs(p[0]-q[0]));
      for(let k=1;k<=3;k++)exterior.maxNormal=Math.max(exterior.maxNormal,Math.abs(p[k]-q[k]));
      for(let k=4;k<=5;k++)exterior.maxUV=Math.max(exterior.maxUV,Math.abs(p[k]-q[k]));
    }
  }
  if(exterior.samples<10000||exterior.maxY>1e-7||exterior.maxNormal>.0001||exterior.maxUV>.0001)throw Error('Exterior changed '+JSON.stringify(exterior));
  u.setMagazineRounds(1);if(!u.magazineTopRound.visible)throw Error('Displayed shell missing');
  u.setMagazineRounds(0);if(u.magazineTopRound.visible)throw Error('Displayed shell failed to hide');
  const latchProfiles=[6,18].map(index=>{
    const {mesh,old,now}=ribs[index],latch=index===6?58:52;
    const inverse=mesh.matrixWorld.clone().invert(),G=T.THREE;
    const neighbours=[host,...body.children.slice(latch,latch+6)].map(part=>{
      const geometry=part.geometry.clone().applyMatrix4(inverse.clone().multiply(part.matrixWorld));
      return {geometry,position:new G.Vector3()};
    });
    const compare=geometry=>sideSkin(G,[...neighbours,{geometry,position:new G.Vector3()}],'y');
    const before=compare(old),after=compare(now);
    const diff={samples:0,lost:0,maxIn:0,maxOut:0};
    for(let i=0;i<62;i++)for(let j=0;j<125;j++){
      const x=-.00306+i*.0001,z=-.02521+j*.0001;
      const a=before(z,x),b=after(z,x);
      if(!Number.isFinite(a)||!Number.isFinite(b)){diff.lost++;continue;}
      diff.samples++;diff.maxIn=Math.max(diff.maxIn,a-b);diff.maxOut=Math.max(diff.maxOut,b-a);
    }
    for(const {geometry} of neighbours)geometry.dispose();
    return diff;
  });
  return {hash,ribs:data,exterior,latchProfiles,shell:u.magazineTopRound.position.toArray(),base:u.baseMagPos.toArray(),
    host:host.geometry.toJSON(),source:ribs[0].old.toJSON(),scale:model.scale.toArray()};
}
