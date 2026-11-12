import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
import {exteriorSamples} from './stock-mount-proof.mjs';

export function checkWaspPad(T,id,baseline,pictures=false){
  if(id!=='uzi')throw Error('Wrong model');
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let pad,original;
  const model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(points,width,material,options){
      const m=k.slab(points,width,material,options);
      if(width===.028&&options?.x===.051&&points[0][0]===-.150){
        if(pad)throw Error('Ambiguous side pad');pad=m;original=m.geometry.clone();
      }
      return m;
    }};
  }});
  if(!pad||!original)throw Error('Pad missing');
  const host=model.children[0],current=pad.geometry,u=model.userData;
  model.visible=true;model.scale.copy(T.weaponMeshes.uzi.scale);
  const show=phase=>{pad.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different original Wasp '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show};
  const gap=visibleSurfaceGap(pad,host,1.8/1.655),closed=visiblePieces(pad,1.8/1.655).map(p=>p.closed);
  const exposed=exteriorSamples(pad,original,0,1,.049,true);
  show('before');const oldSide=sideSkin(G,[host,pad]);show('after');const newSide=sideSkin(G,[host,pad]);
  const profile={samples:0,lost:0,added:0,recession:0,expansion:0};
  for(let i=0;i<240;i++)for(let j=0;j<200;j++){
    const z=-.157113+i*.00019,y=.015137+j*.00019,a=oldSide(z,y),b=newSide(z,y);
    if(!Number.isFinite(a)&&!Number.isFinite(b))continue;profile.samples++;
    if(!Number.isFinite(a)){profile.added++;continue;}if(!Number.isFinite(b)){profile.lost++;continue;}
    profile.recession=Math.max(profile.recession,a-b);profile.expansion=Math.max(profile.expansion,b-a);
  }
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const ray=new G.Raycaster(),p=new G.Vector3(),dir=new G.Vector3(-1,0,0),backing=[];
  for(const y of [.016,.032,.05])for(const z of [-.14002,-.13999,-.139,-.136,-.134,-.131,-.123]){
    ray.set(p.set(.15,y,z),dir);backing.push({y,z,x:ray.intersectObject(host,false)[0]?.point.x??null});
  }
  return {hash,exposed,closed,gap,profile,backing,triangles:current.attributes.position.count/3};
}
