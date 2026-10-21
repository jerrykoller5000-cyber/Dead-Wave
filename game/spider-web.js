// GP-19857: pooled silk darts and visible, temporary web snares. No acid geometry/materials are changed.
export const SPIDER_WEB=Object.freeze({radius:1.1,life:9,max:48,pace:.25,linger:.35,speed:17,gravity:5});
let current=null;
export const spiderWebState=()=>current?.state()||{patches:[],darts:[]}; // private QA snapshot
export function webContains(p,point){return Math.abs(point.y-p.y)<.65&&Math.hypot(point.x-p.x,point.z-p.z)<SPIDER_WEB.radius;}
function ribbon(positions,a,b,width){
  const dx=b[0]-a[0],dz=b[2]-a[2],n=Math.hypot(dx,dz)||1,x=-dz/n*width/2,z=dx/n*width/2;
  const p=[a[0]+x,a[1],a[2]+z],q=[a[0]-x,a[1],a[2]-z],r=[b[0]-x,b[1],b[2]-z],s=[b[0]+x,b[1],b[2]+z];positions.push(...p,...q,...r,...p,...r,...s);
}
export function createSpiderWebs(T,scene){
  const positions=[];
  // Spokes and offset polygon rings read as woven silk rather than a painted disk.
  const N=10;
  for(let i=0;i<N;i++){const a=i*Math.PI*2/N;ribbon(positions,[0,0,0],[Math.sin(a),0,Math.cos(a)],.018);}
  for(let j=1;j<=5;j++)for(let i=0;i<N;i++){
    const a=i*Math.PI*2/N,b=(i+1)*Math.PI*2/N,r=j/5*(.90+.07*Math.sin(i*2.3+j));
    const rb=j/5*(.90+.07*Math.sin((i+1)*2.3+j));ribbon(positions,[Math.sin(a)*r,0,Math.cos(a)*r],[Math.sin(b)*rb,0,Math.cos(b)*rb],.016);
  }
  const patchGeo=new T.BufferGeometry();patchGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));patchGeo.computeVertexNormals();patchGeo.computeBoundingSphere();
  const cone=new T.ConeGeometry(.065,.48,5);cone.rotateX(Math.PI/2);
  const tail=[];
  for(let i=0;i<3;i++){
    const x=(i-1)*.026;
    ribbon(tail,[x,.012*(i-1),-.02],[x+.025*Math.sin(i+1),.012*(i-1),-.42-i*.07],.015);
    ribbon(tail,[x+.025*Math.sin(i+1),.012*(i-1),-.42-i*.07],[x-.035,.012*(i-1),-.69-i*.045],.009);
  }
  const src=cone.index?cone.toNonIndexed():cone,vertex=[...src.attributes.position.array,...tail];
  const dartGeo=new T.BufferGeometry();dartGeo.setAttribute('position',new T.Float32BufferAttribute(vertex,3));dartGeo.computeVertexNormals();dartGeo.computeBoundingSphere();
  if(src!==cone)src.dispose();cone.dispose();
  const dartMat=new T.MeshStandardMaterial({color:0xe8e6dc,emissive:0x88887e,emissiveIntensity:.35,roughness:.85,side:T.DoubleSide});
  const patches=[],patchPool=[],dartPool=[],darts=new Set(),axis=new T.Vector3(0,0,1),velocity=new T.Vector3(),up=new T.Vector3(0,1,0);
  function acquireDart(){let mesh=dartPool.pop();if(!mesh){mesh=new T.Mesh(dartGeo,dartMat);mesh.name='spider-web-dart';mesh.userData.spiderDart=true;scene.add(mesh);}mesh.visible=true;mesh.scale.setScalar(1);mesh.quaternion.identity();darts.add(mesh);return mesh;}
  function releaseDart(mesh){if(!darts.delete(mesh))return;mesh.visible=false;dartPool.push(mesh);}
  function orientDart(mesh,vx,vy,vz){velocity.set(vx,vy,vz);if(velocity.lengthSq()>1e-8)mesh.quaternion.setFromUnitVectors(axis,velocity.normalize());}
  function releasePatch(p){p.mesh.visible=false;patchPool.push(p.mesh);}
  function add(x,y,z,normal=up){
    if(!Number.isFinite(x+y+z))return null;
    if(patches.length>=SPIDER_WEB.max)releasePatch(patches.shift());
    let mesh=patchPool.pop();if(!mesh){mesh=new T.Mesh(patchGeo,new T.MeshBasicMaterial({color:0xe8e6dc,transparent:true,opacity:.78,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.name='spider-ground-web';mesh.userData.spiderWeb=true;mesh.renderOrder=2;scene.add(mesh);}
    mesh.visible=true;mesh.material.opacity=.78;mesh.position.set(x,y+.045,z);mesh.scale.setScalar(SPIDER_WEB.radius);mesh.quaternion.setFromUnitVectors(up,normal);
    const p={mesh,x,y,z,age:0};patches.push(p);return p;
  }
  function update(dt,point){let tangled=false;for(let i=patches.length-1;i>=0;i--){const p=patches[i];p.age+=Math.max(0,dt);if(p.age>=SPIDER_WEB.life){releasePatch(p);patches.splice(i,1);continue;}p.mesh.material.opacity=.78*Math.min(1,(SPIDER_WEB.life-p.age)/2);if(point&&webContains(p,point))tangled=true;}return tangled;}
  function clear(){for(const p of patches.splice(0))releasePatch(p);for(const d of [...darts])releaseDart(d);}
  function state(){return {patches:patches.map(p=>({x:p.x,y:p.y,z:p.z,age:p.age,visible:p.mesh.visible})),darts:[...darts].map(d=>({position:d.position.toArray(),quaternion:d.quaternion.toArray(),origin:d.userData.spiderOrigin})),patchPool:patchPool.length,dartPool:dartPool.length};}
  const api={acquireDart,releaseDart,orientDart,add,update,clear,state};current=api;return api;
}
