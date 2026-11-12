import {makeAa12Model} from '../../studio/weapon-longarms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function triangleKeys(G,root){
  root.updateWorldMatrix(true,true);
  const inv=root.matrixWorld.clone().invert(),v=new G.Vector3(),faces=new Set();
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes.position)return;
    const p=o.geometry.attributes.position,ix=o.geometry.index,m=inv.clone().multiply(o.matrixWorld),points=[];
    for(let i=0;i<p.count;i++)points.push(v.fromBufferAttribute(p,i).applyMatrix4(m).toArray().map(n=>Math.round(n*1e5+.173)).join(','));
    for(let i=0;i<(ix?ix.count:p.count);i+=3)faces.add([0,1,2].map(j=>points[ix?ix.getX(i+j):i+j]).sort().join('|'));
  });return faces;
}
function wall(G,mesh,x,y){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,hits=[];
  const ray=new G.Ray(new G.Vector3(x,y,-.4),new G.Vector3(0,0,1)),corners=[0,1,2].map(()=>new G.Vector3()),hit=new G.Vector3();
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
    for(let j=0;j<3;j++)corners[j].fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
    if(ray.intersectTriangle(...corners,false,hit))hits.push(hit.z);
  }return hits.sort((a,b)=>a-b);
}
export async function measure(T,phase,baseline){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let guard;
  const g=makeAa12Model({...ctx,finishGun:r=>r,mergeRigidMeshes:()=>{},gunKit:r=>{
    const k=ctx.gunKit(r);return {...k,slab(p,w,m,o){
      const part=k.slab(p,w,m,o);if(w===.03&&p.length===12&&o?.bevel===.0035){if(guard)throw Error('Ambiguous guard');guard=part;}
      return part;
    }};
  }});
  if(!guard)throw Error('Missing guard');g.visible=true;g.scale.copy(T.weaponMeshes.aa12.scale);g.updateMatrixWorld(true);
  const u=g.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  const hash=artworkFingerprint(visiblePieces(g,1.8/1.655,ignore)),p=guard.geometry.attributes.position;
  const points=Array.from(p.array),faces=triangleKeys(G,guard),copies={};
  for(const [name,root] of Object.entries({world:T.weaponMeshes.aa12,eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg('aa12').children[0]})){
    const keys=triangleKeys(G,root);copies[name]=[...faces].filter(k=>keys.has(k)).length;
    if(copies[name]!==faces.size)throw Error(name+' misses guard triangles '+copies[name]+'/'+faces.size);
  }
  const trigger=g.getObjectByName(u.controls.trigger);
  if(!trigger||trigger.position.distanceTo(new G.Vector3(...u.triggerPin))>1e-8)throw Error('Trigger pivot changed');
  const pieces=visiblePieces(guard,1.8/1.655);if(pieces.length!==1||!pieces[0].closed)throw Error('Open guard');
  const magGap=visibleSurfaceGap(guard,u.mag,1.8/1.655);
  g.scale.setScalar(1);g.updateMatrixWorld(true);const blade=trigger.children.find(n=>n.isMesh),widths=[];
  for(const x of [-.003,0,.003])for(const y of [-.098,-.102,-.106,-.11,-.114,-.118]){
    const bladeZ=wall(G,blade,x,y).at(-1);
    if(!Number.isFinite(bladeZ))continue;
    const front=wall(G,guard,x,y).find(z=>z>bladeZ);
    if(!Number.isFinite(front))throw Error('Missing guard boundary');
    widths.push({x,y,blade:bladeZ,front,width:front-bladeZ});
  }
  if(widths.length<12)throw Error('Incomplete width profile '+widths.length);
  const result={hash,faces:faces.size,copies,pivot:u.triggerPin,widths,magGap};
  if(phase==='before'){
    if(hash!==baseline)throw Error('Original fingerprint differs '+hash+' / '+baseline);
    return {...result,points};
  }
  const old=await fetch('/review/GT-20092/before/guard.json').then(r=>r.json());
  if(old.hash!==baseline||old.points.length!==points.length)throw Error('Baseline changed');
  guard.geometry.attributes.position=new G.Float32BufferAttribute(old.points,3);g.scale.copy(T.weaponMeshes.aa12.scale);g.updateMatrixWorld(true);
  const restored=artworkFingerprint(visiblePieces(g,1.8/1.655,ignore));guard.geometry.attributes.position=p;
  if(restored!==baseline)throw Error('Other parts changed '+restored);
  let peak=0,moved=0,fixed=0;
  for(let i=0;i<points.length;i+=3){
    const [x,y,z]=old.points.slice(i,i+3),shift=points[i+2]-z;
    if(points[i]!==x||points[i+1]!==y||shift<0||shift>.00400001)throw Error('Unexpected guard displacement');
    if((y>=-.092||z<=-.085)&&shift!==0)throw Error('Rear or upper attachment moved');
    if(shift>1e-8)moved++;else fixed++;peak=Math.max(peak,shift);
  }
  if(Math.abs(peak-.004)>1e-7||!moved||!fixed)throw Error('Missing full smooth displacement');
  if(JSON.stringify(old.pivot)!==JSON.stringify(result.pivot)||old.widths.length!==widths.length)throw Error('Pivot or blade profile changed');
  result.delta={peak,moved,fixed,restored,widths:widths.map((r,i)=>{
    const o=old.widths[i];if(r.x!==o.x||r.y!==o.y||Math.abs(r.blade-o.blade)>1e-8||r.width<o.width-1e-8)throw Error('Unexpected opening');
    return {x:r.x,y:r.y,before:o.width,after:r.width,forward:r.width-o.width};
  })};
  return result;
}
