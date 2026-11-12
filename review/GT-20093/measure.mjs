export async function measureWasp(T){
 const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),{makeUziModel}=await import('/studio/weapon-sidearms.js');
 let guard,grip;
 const model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
  const k=ctx.gunKit(root);return {...k,slab(...args){
   const mesh=k.slab(...args);
   if(args[1]===.032&&args[3]?.bevel===.005)guard=mesh;
   if(args[1]===.062&&args[3]?.bevel===.007)grip=mesh;
   return mesh;
  }};
 }});
 if(!guard||!grip)throw Error('Missing Wasp guard/grip');
 model.updateMatrixWorld(true);
 const trigger=model.getObjectByName(model.userData.controls.trigger);
 function triangles(root){
  const result=[];
  root.traverse(m=>{
   if(!m.isMesh)return;
   const p=m.geometry.attributes.position,index=m.geometry.index;
   for(let i=0;i<(index?.count??p.count);i+=3)result.push([0,1,2].map(j=>new G.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(m.matrixWorld)));
  });
  return result;
 }
 const loop=triangles(guard),blade=triangles(trigger);
 const {visibleSurfaceGap}=await import('/tools/tests/weapon-seating.js');
 const guardBox=new G.Box3().setFromObject(guard),near=guardBox.clone().expandByScalar(.002),contacts=[];
 let ordinal=0;
 model.traverse(mesh=>{
  if(!mesh.isMesh||mesh===guard)return;
  const label=(mesh.name||'mesh')+'#'+ordinal++;
  if(!near.intersectsBox(new G.Box3().setFromObject(mesh)))return;
  contacts.push({label,gap:visibleSurfaceGap(guard,mesh),box:new G.Box3().setFromObject(mesh)});
 });
 function crossings(tris,y){
  const ray=new G.Ray(new G.Vector3(0,y,-.3),new G.Vector3(0,0,1)),hit=new G.Vector3(),points=[];
  for(const [a,b,c] of tris)if(ray.intersectTriangle(a,b,c,false,hit))points.push(hit.z);
  return points.sort((a,b)=>a-b).filter((z,i,all)=>!i||z-all[i-1]>1e-7);
 }
 const rows=[];
 for(let i=0;i<=16;i++){
  const y=-.035-i*.004,g=crossings(loop,y),t=crossings(blade,y);
  rows.push({y,guard:g,blade:t,frontRoom:g.length===4&&t.length?g[2]-t.at(-1):null});
 }
 return {contacts,pin:model.userData.triggerPin,rows,guardBox:new G.Box3().setFromObject(guard),gripBox:new G.Box3().setFromObject(grip),
  guard:guard.geometry.toJSON(),grip:grip.geometry.toJSON(),triggerPosition:trigger.position.toArray()};
}
