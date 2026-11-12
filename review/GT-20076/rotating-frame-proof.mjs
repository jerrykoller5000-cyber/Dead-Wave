import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {makeShotgunModel} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function checkedGap(a,b) {
  const gap=visibleSurfaceGap(a,b,1.8/1.655);
  if(gap.penetrating||gap.upperMm>.5)throw Error('Surface misses its support '+JSON.stringify(gap));
  return gap;
}
function meshAt(G,geom,source) {
  const result=new G.Mesh(geom,source.material);source.updateWorldMatrix(true,false);
  result.matrix.copy(source.matrixWorld);result.matrixAutoUpdate=false;result.updateWorldMatrix(false,false);
  return result;
}
export function checkRotatingFrame(T,id,baseline,forPictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),kit=ctx.gunKit(new G.Group()),previous=new Map();
  const model=({revolver:makeRevolverModel,shotgun:makeShotgunModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(pts,w,m,o){
      const mesh=k.slab(pts,w,m,o);
      if(id==='revolver' && w===.036 && pts[0][0]===-.056){
        previous.set(mesh,kit.slab([[-.056,.1095],[-.044,.1145],[.064,.1145],[.074,.112],[.074,.0975],[-.044,.0975]],w,m,o).geometry);
      }else if(id==='revolver' && w===.06 && pts[0][0]===-.026 && pts[0][1]===.017){
        previous.set(mesh,kit.slab([[-.026,.017],[.072,.017],[.082,.011],[.08,.001],[.062,-.006],[.020,-.008],[-.012,-.007],[-.026,.002]],w,m,o).geometry);
      }else if((id==='revolver'&&w===.0175&&pts[0][0]===-.008)||(id==='shotgun'&&w===.002&&Math.abs(o?.x)===.0281))previous.set(mesh,mesh.geometry.clone());
      return mesh;
    },box(...args){const mesh=k.box(...args);if(id==='shotgun'&&args[0]===.0572&&args[1]===.03)previous.set(mesh,mesh.geometry.clone());return mesh;}};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  if(id==='shotgun'){
    const band=ctx.gunBand([[-.388,-.069],[-.388,-.107],[-.342,-.107],[-.342,-.069],[-.388,-.069]],.003);
    for(const m of model.userData.fpStock.children.slice(2,4))previous.set(m,kit.slab(band,.002,ctx.gunPoly,{bevel:.0006}).geometry);
  }
  if(previous.size!==3)throw Error('Missing original artwork '+previous.size);
  const shapes=[...previous].map(([m,old])=>[m,m.geometry,old]);
  const u=model.userData;
  shapes.forEach(([m,,old])=>m.geometry=old);
  const hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  shapes.forEach(([m,geo])=>m.geometry=geo);
  if(hash!==baseline)throw Error('Whole prior model differs '+hash+' vs '+baseline);
  if(forPictures)return {model,hash,show(phase){
    for(const [mesh,revised,original] of shapes)mesh.geometry=phase==='before'?original:revised;
  }};
  if(id==='shotgun'){
    const stock=model.getObjectByName('shotgun stock body'),trim=u.fpStock.children.slice(1,4);
    const gaps=trim.map(m=>{const pieces=visiblePieces(m);if(pieces.some(p=>!p.closed))throw Error('Open pump trim at '+u.fpStock.children.indexOf(m));return {pieces:pieces.length,gap:checkedGap(m,stock)};});
    const rimBounds=trim.slice(1).map(mesh=>{
      const current=new G.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
      const original=new G.Box3().setFromBufferAttribute(previous.get(mesh).attributes.position);
      const side=Math.sign(mesh.position.x),external=side>0?'max':'min';
      if(Math.abs(current[external].x-original[external].x)>1e-7)throw Error('Exterior trim moved sideways');
      return {original:[original.min.toArray(),original.max.toArray()],current:[current.min.toArray(),current.max.toArray()]};
    });
    return {hash,gaps,rimBounds};
  }
  const drum=u.cylinder.children[0],upper=model.children[2],lower=model.children[4],spur=u.hammer.children[1],body=u.hammer.children[0];
  const shells=visiblePieces(spur,1.8/1.655);
  if(shells.length!==2||shells.some(p=>!p.closed))throw Error('Spur faces are not closed');
  const gaps=shells.map(part=>{
    const shape=new G.BufferGeometry();shape.setAttribute('position',new G.Float32BufferAttribute(part.faces.flatMap(f=>f.p.flatMap(v=>v.toArray())),3));
    // The source shell above is already in metres, so use millimetres with the same transform on its partner.
    const host=meshAt(G,body.geometry,body);host.matrix.premultiply(new G.Matrix4().makeScale(1.8/1.655,1.8/1.655,1.8/1.655));host.updateWorldMatrix(false,false);
    const gap=visibleSurfaceGap(new G.Mesh(shape),host);
    if(gap.penetrating||gap.upperMm>.5)throw Error('Spur face gap '+JSON.stringify(gap));return gap;
  });
  const cylinderGaps=[upper,lower].map(frame=>visibleSurfaceGap(drum,frame,1.8/1.655));
  if(cylinderGaps.some(g=>g.penetrating))throw Error('Frame edge crosses the closed moving drum');
  const trigger=model.getObjectByName(u.controls.trigger),hammerPoses=[];
  for(const [pull,reset] of [[0,false],[.5,false],[.88,false],[.95,false],[1,false],[.5,true]]){
    u.doubleActionPose(trigger,u.hammer,pull,reset);
    model.updateMatrixWorld(true);
    hammerPoses.push({pull,reset,angle:u.hammer.rotation.x,gap:checkedGap(spur,body)});
  }
  return {hash,spurFaces:shells.length,spurGaps:gaps,cylinderGaps,hammerPoses};
}

export function checkReloadSweep(T){
  const ctx=T.inspectHost().builders.weaponContext();
  const model=makeRevolverModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}}),c=model.userData.cylinder,parts=[model.children[2],model.children[4]];
  model.visible=true;model.scale.copy(T.weaponMeshes.revolver.scale);model.updateMatrixWorld(true);
  const defaults=c.rotation.clone(),rotations=[];
  for(let i=0;i<24;i++){
    c.rotation.z=defaults.z+i*Math.PI/12;model.updateMatrixWorld(true);
    const gaps=parts.map(m=>visibleSurfaceGap(c.children[0],m,1.8/1.655));
    if(gaps.some(g=>g.penetrating))throw Error('Closed drum crosses at '+i);
    rotations.push(gaps.map(g=>g.upperMm));
  }
  c.rotation.copy(defaults);
  T.setAmmoDbg('revolver',0);T.startReload();
  const records=[];
  const phases=[...new Set([...Array.from({length:64},(_,i)=>i/64),.025,.05,.075,.1,.89,.92,.95,.98])].sort((a,b)=>a-b);
  for(const u of phases){
    T.reloadClipDbg.hold(u);for(let n=0;n<3;n++)T.stepFrame(1/60);
    const state=T.getReloadDbg(),drawn=T.viewmodelDbg().gun.cylinder;
    if(state.weapon!=='revolver'||Math.abs((1-state.timer/state.anim)-u)>.002||!drawn)throw Error('Wrong native reload phase');
    c.position.copy(drawn.position);c.quaternion.copy(drawn.quaternion);c.scale.copy(drawn.scale);model.updateMatrixWorld(true);
    const gaps=parts.map(m=>visibleSurfaceGap(c.children[0],m,1.8/1.655));
    records.push({phase:u,at:c.position.toArray(),yaw:c.rotation.y,scale:c.scale.toArray(),crossed:gaps.map(g=>!!g.penetrating)});
  }
  T.reloadClipDbg.hold(null);
  const rest=model.userData.baseCylinderPos;
  const travel=Math.max(...records.map(r=>Math.hypot(r.at[0]-rest.x,r.at[1]-rest.y,r.at[2]-rest.z)));
  return {rotations:rotations.length,travel,records};
}
