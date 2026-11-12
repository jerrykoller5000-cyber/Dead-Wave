import {sideSkin} from './tang-cheek-proof.mjs';
import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkRevolverBridge(T,id,baseline,pictures=false){
  if(id!=='revolver')throw Error('Wrong model');
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let original,oldShield;
  const model=makeRevolverModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,lathe(profile,...args){
      const mesh=kit.lathe(profile,...args);if(profile.length===5&&profile[0][1]===-.028&&profile[2][0]===.046)oldShield=mesh.geometry.clone();return mesh;
    },slab(...args){
      const mesh=kit.slab(...args);
      if(args[1]===.036&&args[0][0][0]===-.056){if(original)throw Error('Ambiguous bridge');original=mesh.geometry.clone();}
      return mesh;
    }};
  }});
  const rear=model.children[0],shield=model.children[1],bridge=model.children[2],current=bridge.geometry,currentShield=shield.geometry,u=model.userData;
  if(!original||!oldShield||!rear.isMesh||!bridge.isMesh)throw Error('Missing frame art');
  model.visible=true;model.scale.copy(T.weaponMeshes.revolver.scale);
  const show=phase=>{bridge.geometry=phase==='before'?original:current;shield.geometry=phase==='before'?oldShield:currentShield;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Original revolver differs '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show};
  const gap=visibleSurfaceGap(rear,bridge,1.8/1.655),shieldGap=visibleSurfaceGap(bridge,shield,1.8/1.655);
  const cells=visiblePieces(bridge,1.8/1.655),shieldCells=visiblePieces(shield,1.8/1.655);
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const ray=new G.Raycaster(),origin=new G.Vector3(),dir=new G.Vector3(0,-1,0);
  const roof=[];
  for(const x of [-.017,0,.017])for(const z of [-.055,-.050,-.044,-.031,-.0211]){
    ray.set(origin.set(x,.2,z),dir);const y=ray.intersectObject(rear,false)[0]?.point.y;
    if(!Number.isFinite(y))throw Error('Missing original backing');roof.push([x,z,y]);
  }
  function tuples(geometry){
    const a=geometry.attributes;
    return Array.from({length:a.position.count},(_,i)=>[a.position.getX(i),a.position.getY(i),a.position.getZ(i),a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i)]);
  }
  const now=tuples(current),exposed=new Set();
  show('before');
  for(const v of tuples(original)){
    ray.set(origin.set(v[0],.2,v[2]),dir);
    const top=ray.intersectObjects([rear,shield],false)[0]?.point.y??-Infinity;
    if(v[1]<=top+1e-7)continue;
    if(!now.some(p=>p.every((n,i)=>Math.abs(v[i]-n)<2e-7)))throw Error('Exposed bridge vertex changed '+JSON.stringify(v));
    exposed.add(v.join(','));
  }
  const oldSurface=sideSkin(G,[rear,shield,bridge]);show('after');const surface=sideSkin(G,[rear,shield,bridge]);
  const profile={samples:0,lost:0,added:0,maxIn:0,maxOut:0,worst:null};
  function compare(z,y){
    const a=oldSurface(z,y),b=surface(z,y);
    if(!Number.isFinite(a)&&!Number.isFinite(b))return;
    profile.samples++;
    if(!Number.isFinite(a)){profile.added++;return;}
    if(!Number.isFinite(b)){profile.lost++;return;}
    if(a-b>profile.maxIn){profile.maxIn=a-b;profile.worst=[z,y,a,b];}
    profile.maxOut=Math.max(profile.maxOut,b-a);
  }
  for(let i=0;i<197;i++)for(let j=0;j<505;j++)compare(-.028173+i*.00004,.089917+j*.00004);
  for(let i=0;i<51;i++)for(let j=0;j<151;j++)compare(-.0205523+i*.0000015,.0973993+j*.000005);

  const lowerShield=new Set(),shieldVertices=tuples(currentShield);
  for(const v of tuples(oldShield)){
    if(v[1]+shield.position.y>=.09747)continue;
    if(!shieldVertices.some(p=>p.every((n,i)=>Math.abs(v[i]-n)<2e-7)))throw Error('Original lower shield surface changed '+JSON.stringify(v));
    lowerShield.add(v.join(','));
  }
  const badEdges=[];
  const metres=T.weaponMeshes.revolver.scale.x*1.8/1.655;
  for(const cell of shieldCells.filter(c=>!c.closed)){
    const edges=new Map();
    for(const f of cell.faces)for(let k=0;k<3;k++){
      const next=(k+1)%3,key=[f.ids[k],f.ids[next]].sort((a,b)=>a-b).join(',');
      const edge=edges.get(key)||{n:0,at:[f.p[k],f.p[next]].map(v=>v.toArray().map(x=>x/metres))};
      edge.n++;edges.set(key,edge);
    }
    badEdges.push(...[...edges.values()].filter(e=>e.n!==2).slice(0,15));
  }
  return {hash,gap,shieldGap,closed:cells.map(p=>p.closed),shieldClosed:shieldCells.map(p=>p.closed),badEdges,roof,profile,lowerShield:lowerShield.size,exposed:exposed.size,triangles:current.attributes.position.count/3,shieldTriangles:currentShield.attributes.position.count/3};
}
