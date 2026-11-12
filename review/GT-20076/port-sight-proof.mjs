import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {makeM4Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {exteriorSamples} from './stock-mount-proof.mjs';


export function firstPersonPortCycle(T){
  const frames=[],parts=T.viewmodelDbg().gun.recoilBolt?.children;
  if(T.getCurrentWeapon()!=='uzi'||parts?.length!==2)throw Error('Missing equipped Wasp artwork');
  T.setAmmoDbg('uzi',8);
  function read(){
    return parts.map(m=>{
      const p=m.geometry.attributes.position;
      let minX=Infinity;
      for(let i=0;i<p.count;i++)minX=Math.min(minX,m.position.x+p.getX(i)*m.scale.x);
      if(Math.abs(minX-.0516)>1e-6)throw Error('View copy has a different back surface '+minX);
      return {visible:m.visible,scaleZ:m.scale.z,z:m.position.z,minX};
    });
  }
  const rest=read();let shotFrame=null;
  try{
    T.setMouseFireDbg(true);
    for(let i=0;i<100;i++){
      T.stepFrame(1/120);frames.push(read());
      if(shotFrame===null&&T.getAmmo().uzi<8){shotFrame=i;T.setMouseFireDbg(false);}
      if(shotFrame!==null&&i>shotFrame+40)break;
    }
  }finally{T.setMouseFireDbg(false);}
  const end=frames.at(-1);
  if(shotFrame===null||T.getAmmo().uzi!==7||!frames.some(r=>r.some(p=>p.scaleZ<.55))||
    end.some((p,i)=>!p.visible||Math.abs(p.scaleZ-rest[i].scaleZ)>1e-6||Math.abs(p.z-rest[i].z)>1e-6))
    throw Error('Incomplete fired Wasp viewmodel cycle '+JSON.stringify({shotFrame,ammo:T.getAmmo().uzi,rest,end,min:Math.min(...frames.flatMap(r=>r.map(p=>p.scaleZ)))}));
  return {shotFrame,rest,end,frames};
}

export function portSightProof(T,id,baseline,pictures=false){
  const ctx=T.inspectHost().builders.weaponContext(),previous=new Map();
  const remember=mesh=>{previous.set(mesh,mesh.geometry.clone());return mesh;};
  const model=({uzi:makeUziModel,m4:makeM4Model}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(points,w,mat,options){
      const mesh=k.slab(points,w,mat,options);
      return id==='m4'&&w===.03&&points[0][0]===-.165&&points[0][1]===.092?remember(mesh):mesh;
    },box(...args){
      const mesh=k.box(...args);
      return id==='uzi'&&((args[0]===.002&&args[1]===.024&&args[2]===.05)||args[10]?.name==='recoil-bolt')?remember(mesh):mesh;
    }};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  const d=model.userData,edits=[...previous].map(([m,old])=>[m,old,m.geometry]);
  if(edits.length!==(id==='uzi'?3:1))throw Error('Original surface identification: '+edits.length);
  for(const [m,old] of edits)m.geometry=old;
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[d.flash,d.flashLight,d.laser,d.flare].filter(Boolean)));
  for(const [m,,now] of edits)m.geometry=now;
  if(hash!==baseline)throw Error('Incomplete prior model '+hash+' / '+baseline);
  if(pictures)return {hash,model,show(phase){for(const [m,old,now] of edits)m.geometry=phase==='before'?old:now;}};
  function join(m,host){
    const cells=visiblePieces(m),gap=visibleSurfaceGap(m,host,1.8/1.655);
    if(cells.length!==1||!cells[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Surface seating '+JSON.stringify({name:m.name,count:cells.length,closed:cells[0]?.closed,gap}));
    return gap;
  }
  if(id==='m4'){
    const [m,old]=edits[0];
    return {hash,exterior:exteriorSamples(m,old,1,1,.096),supports:[2,4].map(i=>join(m,model.children[i]))};
  }
  const backing=model.children[112],panel=model.children[113],parts=d.recoilBoltParts;
  const exterior=[panel,...parts].map((mesh,i)=>exteriorSamples(mesh,previous.get(mesh),0,1,i?.0516:.0512));
  const fixed=join(panel,backing),sweep=[];
  for(let i=0;i<=32;i++){
    const travel=d.portStroke*i/32;
    d.recoilBoltPose(d.recoilBolt,travel);model.updateMatrixWorld(true);
    sweep.push({travel,shown:parts.map(m=>m.visible),gaps:parts.map(m=>m.visible?join(m,panel):null)});
  }
  if(sweep[0].shown.some(v=>!v)||sweep.at(-1).shown.some(Boolean))throw Error('The artwork did not traverse the window');
  return {hash,exterior,fixed,sweep};
}
