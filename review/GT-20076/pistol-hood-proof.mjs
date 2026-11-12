import {makePistolModel} from '../../studio/weapon-sidearms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {sideSkin} from './tang-cheek-proof.mjs';
// Sample the drawn top triangles; the rounded source has only one vertex above the centre stripe.
import {topTuples} from './surface-tuples.mjs';

export function checkPistolHood(T,id,baseline,pictures=false,snapshot=false){
  if(id!=='pistol')throw Error('Wrong model');
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE;let panel,original,body,barrel;
  const model=makePistolModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,box(...args){
      const m=k.box(...args);
      if(args[0]===.026&&args[1]===.014&&args[2]===.05&&args[5]===.068){panel=m;original=m.geometry.clone();}
      return m;
    },slab(points,width,material,options){
      const m=k.slab(points,width,material,options);
      if(width===.046&&points[0][0]===-.14&&points[0][1]===-.044)body=m;return m;
    },lathe(points,material,options){
      const m=k.lathe(points,material,options);
      if(points.length===4&&points[0][1]===-.02&&points[2][1]===.311)barrel=m;return m;
    }};
  }});
  const u=model.userData,slide=u.slide,grooves=slide.children.filter(m=>m.geometry?.type==='BoxGeometry'&&m.geometry.parameters?.width===.0007);
  if(!panel||!original||!barrel||!body||grooves.length!==2)throw Error('Missing slide or top details '+grooves.length);
  const current=panel.geometry,rest=slide.position.clone();model.visible=true;model.scale.copy(T.weaponMeshes.pistol.scale);
  const show=phase=>{panel.geometry=phase==='before'?original:current;model.updateMatrixWorld(true);};
  show('before');const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  if(hash!==baseline)throw Error('Different original pistol '+hash+' vs '+baseline);
  show('after');if(pictures)return {hash,model,show,panel,body,barrel,grooves};
  const cells=visiblePieces(panel,1.8/1.655).map(p=>p.closed);
  const panelPoint=model.worldToLocal(panel.getWorldPosition(new G.Vector3()));
  const originalTop=topTuples(original),currentTop=topTuples(current);
  const exposed={samples:0,maxY:0,maxNormal:0,maxUV:0};
  for(let i=0;i<65;i++)for(let j=0;j<100;j++){
    const x=-.012853+i*.0004,z=-.024818+j*.0005,p=originalTop(x,z);
    const floor=Math.abs(x+panelPoint.x)<.00036?.0745:.074;
    if(!p||p[0]+panelPoint.y<=floor+1e-7)continue;
    const q=currentTop(x,z);
    if(!q)throw Error('Visible top surface missing');
    exposed.samples++;exposed.maxY=Math.max(exposed.maxY,Math.abs(q[0]-p[0]));
    for(let k=1;k<=3;k++)exposed.maxNormal=Math.max(exposed.maxNormal,Math.abs(q[k]-p[k]));
    for(let k=4;k<=5;k++)exposed.maxUV=Math.max(exposed.maxUV,Math.abs(q[k]-p[k]));
  }
  if(exposed.samples<100||exposed.maxY>2e-7||exposed.maxNormal>.0002||exposed.maxUV>.00015)throw Error('Top surface changed '+JSON.stringify(exposed));
  const proxy=m=>({geometry:m.geometry,position:model.worldToLocal(m.getWorldPosition(new G.Vector3()))});
  const profile={occupied:0,lost:0,added:0,maxIn:0,maxOut:0},sweep=[];
  for(let i=0;i<=26;i++){
    slide.position.copy(rest);slide.position.z-=i*.005;model.updateMatrixWorld(true);
    sweep.push({travel:i*.005,roof:visibleSurfaceGap(panel,body,1.8/1.655),grooves:grooves.map(g=>visibleSurfaceGap(panel,g,1.8/1.655)),barrel:visibleSurfaceGap(panel,barrel,1.8/1.655)});
    if(i%5&&i!==26)continue;
    const surface=()=>sideSkin(G,[body,panel,...grooves,barrel].map(proxy),'y',1);
    show('before');const a=surface();show('after');const b=surface();
    for(let j=0;j<111;j++)for(let k=0;k<73;k++){
      const z=.044117+j*.0005,x=-.014113+k*.00039,old=a(z,x),now=b(z,x);
      if(!Number.isFinite(old)&&!Number.isFinite(now))continue;profile.occupied++;
      if(!Number.isFinite(old)){profile.added++;continue;}if(!Number.isFinite(now)){profile.lost++;continue;}
      profile.maxIn=Math.max(profile.maxIn,old-now);profile.maxOut=Math.max(profile.maxOut,now-old);
    }
  }
  slide.position.copy(rest);show('after');
  const result={hash,cells,exposed,sweep,profile,slide:rest.toArray(),muzzle:u.muzzleLocal.toArray(),heat:panel.parent.position.toArray(),triangles:current.attributes.position.count/3};
  if(snapshot)result.reference={scale:model.scale.toArray(),meshes:[body,panel,barrel,...grooves].map(m=>({position:proxy(m).position.toArray(),geometry:m.geometry.toJSON()}))};
  return result;
}

export function checkHoodReload(T,baseline){
  const art=checkPistolHood(T,'pistol',baseline,true),raw=art.model.userData.slide;
  const w=T.weaponMeshes.pistol.userData.slide,v=new Map(T.viewmodelDbg().gun.pairs).get(w);
  if(!v)throw Error('Missing eye slide');
  const rest=[w,v].map(m=>({p:m.position.clone(),q:m.quaternion.clone()}));
  const rawP=raw.position.clone(),rawQ=raw.quaternion.clone(),samples=[],tested=new Map(),maxBack=[0,0];
  function sample(phase){
    const row=[phase];
    for(const [i,m] of [w,v].entries()){
      const delta=m.position.clone().sub(rest[i].p),q=m.quaternion.clone().multiply(rest[i].q.clone().invert());
      const key=[...delta.toArray(),...q.toArray()].map(n=>Math.round(n*1e8)).join(',');
      if(!tested.has(key)){
        raw.position.copy(rawP).add(delta);raw.quaternion.copy(q).multiply(rawQ);art.model.updateMatrixWorld(true);
        const roof=visibleSurfaceGap(art.panel,art.body,1.8/1.655);
        const grooves=art.grooves.map(g=>visibleSurfaceGap(art.panel,g,1.8/1.655));
        if(roof.penetrating||roof.upperMm>.01||grooves.some(g=>g.penetrating))throw Error('Slide contact failed '+JSON.stringify({phase,i,delta,roof,grooves}));
        tested.set(key,{roof,grooves});
      }
      maxBack[i]=Math.max(maxBack[i],-delta.z);row.push(delta.toArray(),q.toArray());
    }
    samples.push(row);
  }
  T.setAmmoDbg('pistol',0);T.startReload();
  try{
    for(let i=0;i<72;i++){
      const phase=i/72;T.reloadClipDbg.hold(phase);for(let j=0;j<3;j++)T.stepFrame(1/60);
      const state=T.getReloadDbg();if(state.weapon!=='pistol'||Math.abs(1-state.timer/state.anim-phase)>.002)throw Error('Wrong reload phase');
      sample(phase);
    }
  }finally{T.reloadClipDbg.hold(null);}
  for(let i=0;i<90;i++)T.stepFrame(1/60);
  sample(1);
  if(Math.max(...maxBack)<.06||[w,v].some((m,i)=>m.position.distanceTo(rest[i].p)>.001))throw Error('Incomplete slide travel '+JSON.stringify(maxBack));
  return {maxBack,distinctPoses:tested.size,samples,contacts:[...tested.values()]};
}
