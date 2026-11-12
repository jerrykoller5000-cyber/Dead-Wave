import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {boxProjectUV} from '../../core/geometry.js';

function triangles(G,root){
  root.updateWorldMatrix(true,true);
  const inv=root.matrixWorld.clone().invert(),v=new G.Vector3(),faces=new Set();
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry.attributes.position)return;
    const p=o.geometry.attributes.position,ix=o.geometry.index,points=[],m=inv.clone().multiply(o.matrixWorld);
    for(let i=0;i<p.count;i++)points.push(v.fromBufferAttribute(p,i).applyMatrix4(m).toArray().map(n=>Math.round(n*1e5+.173)).join(','));
    for(let i=0;i<(ix?ix.count:p.count);i+=3)faces.add([0,1,2].map(j=>points[ix?ix.getX(i+j):i+j]).sort().join('|'));
  });
  return faces;
}
function intersections(G,mesh,geometry,x,y){
  const ray=new G.Ray(new G.Vector3(x,y,-.40),new G.Vector3(0,0,1));
  const p=geometry.attributes.position,ix=geometry.index,v=[new G.Vector3(),new G.Vector3(),new G.Vector3()],hit=new G.Vector3(),z=[];
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
    for(let j=0;j<3;j++)v[j].fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
    if(ray.intersectTriangle(...v,false,hit))z.push(hit.z);
  }
  return z.sort((a,b)=>a-b);
}
export function verifyGuardFront(T,beforeHash,afterHash){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();let guard,old;
  const g=makeRevolverModel({...ctx,finishGun:r=>r,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(w===.013&&p.length===16&&!o?.parent){if(guard)throw Error('Ambiguous guard');guard=mesh;old=mesh.geometry.clone();}
      return mesh;
    }};
  }});
  if(!guard)throw Error('Guard not found');
  const final=guard.geometry,a=old.attributes.position,b=final.attributes.position;
  let moved=0,peak=0,landmark,stationary=0,attachment=0;
  for(let i=0;i<a.count;i++){
    if(a.getX(i)!==b.getX(i)||a.getY(i)!==b.getY(i))throw Error('A non-forward coordinate changed');
    const d=b.getZ(i)-a.getZ(i);
    if(d<0||d>.00800001)throw Error('Front travel outside brief '+d);
    if(d>1e-8)moved++;else stationary++;
    if(a.getY(i)>=-.006||a.getZ(i)<=.029){if(d!==0)throw Error('Rear or upper attachment moved');attachment++;}
    if(d>peak){peak=d;landmark={before:[a.getX(i),a.getY(i),a.getZ(i)],after:[b.getX(i),b.getY(i),b.getZ(i)]};}
  }
  if(Math.abs(peak-.008)>1e-7||!moved||!attachment)throw Error('Required front displacement missing');
  const rebuiltUV=new Float32Array(b.count*2);boxProjectUV(b.array,rebuiltUV);
  if(rebuiltUV.some((v,i)=>v!==final.attributes.uv.array[i]))throw Error('New guard UVs do not follow the final drawing');
  g.visible=true;g.scale.copy(T.weaponMeshes.revolver.scale);g.updateMatrixWorld(true);
  const u=g.userData,ignored=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  guard.geometry=old;const baseline=artworkFingerprint(visiblePieces(g,1.8/1.655,ignored));
  guard.geometry=final;const current=artworkFingerprint(visiblePieces(g,1.8/1.655,ignored));
  if(baseline!==beforeHash||current!==afterHash)throw Error('Unexpected other model changes '+JSON.stringify({baseline,current,beforeHash,afterHash}));
  const expected=triangles(G,guard),copies={};
  for(const [name,model] of Object.entries({world:T.weaponMeshes.revolver,eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg('revolver').children[0]})){
    const actual=triangles(G,model);copies[name]=[...expected].filter(k=>actual.has(k)).length;
    if(copies[name]!==expected.size)throw Error('Missing guard faces in '+name);
  }
  const spin=u.cylinder.rotation.clone();let minCylinderGap=Infinity;
  for(let i=0;i<72;i++){
    u.cylinder.rotation.z=spin.z+i*Math.PI/36;g.updateMatrixWorld(true);
    const gap=visibleSurfaceGap(guard,u.cylinder,1.8/1.655);
    if(gap.penetrating||gap.lowerMm<.5)throw Error('Cylinder contacts the guard at '+i*5+' degrees');
    minCylinderGap=Math.min(minCylinderGap,gap.lowerMm);
  }
  u.cylinder.rotation.copy(spin);
  g.scale.set(1,1,1);g.updateMatrixWorld(true);
  const trigger=u.trigger,blade=trigger.children.find(c=>c.isMesh),widths=[];
  if(g.getObjectByName(u.controls.trigger)!==trigger||u.triggerPin.some((v,i)=>v!==trigger.position.toArray()[i]))
    throw Error('Trigger contract and pivot disagree');
  for(const x of [-.003,0,.003])for(const y of [-.018,-.022,-.026,-.030,-.034]){
    const face=intersections(G,blade,blade.geometry,x,y).at(-1);
    const before=intersections(G,guard,old,x,y).find(z=>z>face);
    const after=intersections(G,guard,final,x,y).find(z=>z>face);
    if(![face,before,after].every(Number.isFinite))throw Error('Missing inner edge at '+JSON.stringify([x,y]));
    widths.push({x,y,before:before-face,after:after-face,forward:after-before});
  }
  return {baseline,current,vertices:a.count,moved,stationary,attachment,peak,landmark,expectedFaces:expected.size,copies,
    triggerPin:u.triggerPin,pivot:trigger.position.toArray(),cylinderAngles:72,minCylinderGapMm:minCylinderGap,widths};
}
