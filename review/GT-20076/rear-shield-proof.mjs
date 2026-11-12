import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';

export function sampleShield(G,rear,shield,bridge,original){
  const current=shield.geometry;
  shield.geometry=original;const oldSide=sideSkin(G,[rear,shield,bridge]);
  shield.geometry=current;const newSide=sideSkin(G,[rear,shield,bridge]);
  const profile={samples:0,lost:0,added:0,recession:0,expansion:0};
  for(let zi=0;zi<83;zi++)for(let yi=0;yi<426;yi++){
    const z=-.02823+zi*.0001,y=.00981+yi*.000225;
    const a=oldSide(z,y),b=newSide(z,y);
    if(!Number.isFinite(a)&&!Number.isFinite(b))continue;
    profile.samples++;
    if(!Number.isFinite(a)){profile.added++;continue;}
    if(!Number.isFinite(b)){profile.lost++;continue;}
    if(a-b>profile.recession){profile.recession=a-b;profile.deepest=[z,y,a,b];}
    profile.expansion=Math.max(profile.expansion,b-a);
  }
  return profile;
}

export function checkRearShield(T,id,baseline,pictures=false,snapshot=false){
  if(id!=='revolver')throw Error('Unexpected model');
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE;
  let acceptedShield;
  const model=makeRevolverModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,lathe(profile,...rest){
      const mesh=k.lathe(profile,...rest);
      if(profile.length===5&&profile[0][1]===-.028&&profile[2][0]===.046){
        let active=mesh.geometry;
        Object.defineProperty(mesh,'geometry',{configurable:true,enumerable:true,get(){return active;},
          set(v){acceptedShield??=v;active=v;}});
      }
      return mesh;
    }};
  }});
  const [rear,shield,bridge]=model.children,current=shield.geometry,u=model.userData;
  if(!acceptedShield||!rear.isMesh||!bridge.isMesh)throw Error('Missing original shield artwork');
  model.visible=true;model.scale.copy(T.weaponMeshes.revolver.scale);
  const show=phase=>{shield.geometry=phase==='before'?acceptedShield:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different prior artwork '+hash+' vs '+baseline);
  show('after');if(pictures)return {model,hash,show};
  const gaps=[rear,bridge].map(p=>visibleSurfaceGap(shield,p,1.8/1.655));
  const cells=visiblePieces(shield,1.8/1.655).map(p=>p.closed);
  const scale=model.scale.toArray(),profile=sampleShield(G,rear,shield,bridge,acceptedShield);
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const ray=new G.Raycaster(),origin=new G.Vector3(),dir=new G.Vector3(0,0,-1),backing=[];
  for(const y of [.013,.025,.057,.087,.096,.099])for(const x of [0,.015,.02599,.027,.0283,.03,.031,.0319,.03201]){
    ray.set(origin.set(x,y,.20),dir);backing.push({x,y,z:ray.intersectObject(rear,false)[0]?.point.z??null});
  }
  function exposedTuples(geometry){
    const {position:p,normal:n,uv}=geometry.attributes,rows=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      if(Math.abs(x)>.032041||Math.abs(z+.0205)<1e-7)rows.push([x,y,z,n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)]);
    }
    return rows;
  }
  const tuples=exposedTuples(current),retained=new Set();
  for(const v of exposedTuples(acceptedShield)){
    if(!tuples.some(q=>v.every((n,i)=>Math.abs(n-q[i])<2e-7)))throw Error('Exposed shield vertex changed '+JSON.stringify(v));
    retained.add(v.join(','));
  }
  if(!retained.size)throw Error('No exposed reference samples');
  const result={hash,cells,gaps,scale,profile,backing,retained:retained.size,triangles:current.attributes.position.count/3};
  if(snapshot){
    result.reference={scale,meshes:[rear,shield,bridge].map(m=>({position:m.position.toArray(),geometry:m.geometry.toJSON()}))};
  }
  return result;
}
