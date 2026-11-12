import {makeLauncherModel,makeFlamerModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function contact(mesh,host){
  const p=visiblePieces(mesh),gap=visibleSurfaceGap(mesh,host,1.8/1.655);
  if(p.length!==1||!p[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Bad join '+JSON.stringify({name:mesh.name,pieces:p.length,closed:p[0].closed,gap}));
  return gap;
}
function wire(mesh,include,positionsOnly=false) {
  const {position:p,normal:n,uv}=mesh.geometry.attributes,keys=new Set();mesh.updateMatrix();
  const point=mesh.position.clone();
  for(let i=0;i<p.count;i++){
    if(!include(p,i,n))continue;
    point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);
    const key=point.toArray().map(v=>Math.round(v*1e7));
    if(!positionsOnly)key.push(n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i));
    keys.add(key.join(','));
  }
  return keys;
}
function same(old,mesh,keep,positionsOnly=false){
  const a=wire(old,keep,positionsOnly),b=wire(mesh,keep,positionsOnly);
  if(a.size<3||a.size!==b.size||[...a].some(k=>!b.has(k)))throw Error('Original outer samples changed '+a.size+'/'+b.size);
  return a.size;
}
export function checkRingsGrip(T,id) {
  const ctx=T.inspectHost().builders.weaponContext(),G=T.THREE,kit=ctx.gunKit(new G.Group()),old=new Map();
  const remember=m=>{const original=m.clone();original.geometry=m.geometry.clone();old.set(m,original);return m;};
  const model=({launcher:makeLauncherModel,flamer:makeFlamerModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(p,w,m,o){const mesh=k.slab(p,w,m,o);return id==='flamer'&&w===.003&&Math.abs(o?.x)===.018?remember(mesh):mesh;},
      box(...args){const mesh=k.box(...args);return (id==='flamer'&&args[0]===.0015&&args[1]===.0025&&args[2]===.022)||(id==='launcher'&&args[0]===.004&&args[1]===.008&&args[2]===.015)?remember(mesh):mesh;},
      cyl(...args){const mesh=k.cyl(...args);return id==='launcher'&&args[0]===.029&&args[2]===.11?remember(mesh):mesh;}};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  const at=i=>model.children[i];
  if(id==='launcher'){
    const pivot=at(39),exterior=same(old.get(pivot),pivot,(p,i)=>p.getZ(i)<-.001);
    const fits=[contact(pivot,at(0))],caps=[];
    for(const [side,i] of [[-1,40],[1,42]]){
      const cap=at(i),tab=at(i+1);
      const orig=kit.cyl(.022,.022,.005,ctx.gunMid,side*.056,.04,-.25,null,12,'x');
      caps.push(same(orig,cap,(p,i,n)=>-side*n.getY(i)>.99999&&p.getZ(i)<-.001));
      fits.push(contact(cap,pivot),contact(cap,at(0)),contact(tab,cap),contact(tab,at(0)));
    }
    return {pivotExterior:exterior,capOuterSamples:caps,fits};
  }
  const wand=at(32),fits=[],outerSamples=[];
  for(const [i,z] of [[2,.371],[3,.667]]){
    const ring=wand.children[i];
    const orig=kit.lathe([[.034,z-.007],[.05,z-.007],[.052,z-.004],[.052,z+.004],[.034,z+.007],[.034,z-.007]],ctx.gunAccent,{y:.05,seg:24});
    const keep=(p,j)=>Math.hypot(p.getX(j),p.getY(j))>.04999&&(i===2?p.getZ(j)<.368:p.getZ(j)>.670);
    outerSamples.push(same(orig,ring,keep,true));
    fits.push(contact(ring,wand.children[0]),contact(ring,wand.children[1]));
  }
  const panels=[];
  for(const [side,i] of [[-1,69],[1,73]])for(let n=0;n<4;n++){
    const mesh=at(i+n),o=old.get(mesh),limit=n?.0195:.018;
    panels.push(same(o,mesh,(p,j)=>side*(mesh.position.x+p.getX(j))>limit+1e-7));
    fits.push(contact(mesh,n?at(i):at(68)));
  }
  return {ringOutsideSamples:outerSamples,gripOutsideSamples:panels,fits};
}
