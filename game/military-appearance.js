import {detailUV} from '../studio/zombie-detail.js';
// GP-19864: CIF cloth shares the existing skeleton; template geometry stays untouched.
export const MILITARY_CAMOS = Object.freeze(['marpat','m81','ucp','multicam','dcu']);
let variant = 0;
export function prepareMilitaryAppearance(T,g,camoTex){
  const u=g.userData;if(u.typeKey!=='military')return;
  const colors=[0x626448,0x8a805a,0x3c4633].map(n=>new T.Color(n));
  const material=new T.MeshStandardMaterial({map:camoTex(MILITARY_CAMOS[variant++%5]),roughness:.98,vertexColors:true});
  material.userData.militaryUniform=true;
  const parts=[];g.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.color)parts.push(o);});
  for(const m of parts){
    const source=m.geometry,geo=source.index?source.toNonIndexed():source,C=geo.attributes.color,P=geo.attributes.position,cloth=[],other=[];
    for(let i=0;i<P.count;i+=3){const same=colors.some(c=>Math.abs(C.getX(i)-c.r)+Math.abs(C.getY(i)-c.g)+Math.abs(C.getZ(i)-c.b)<1e-5);
      // Remove the long patrol-cap bill; the rounded combat shell replaces it.
      const bill=same&&m.parent===u.head&&(P.getY(i)+P.getY(i+1)+P.getY(i+2))/3<.19&&(P.getZ(i)+P.getZ(i+1)+P.getZ(i+2))/3>.18;
      if(!bill)(same?cloth:other).push(i,i+1,i+2);
    }
    if(!cloth.length)continue;
    const slice=indices=>{const out=new T.BufferGeometry();for(const [name,a]of Object.entries(geo.attributes)){if(name==='color')continue;const data=new a.array.constructor(indices.length*a.itemSize);indices.forEach((n,j)=>{for(let k=0;k<a.itemSize;k++)data[j*a.itemSize+k]=a.array[n*a.itemSize+k];});out.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}out.computeBoundingSphere();return out;};
    const uniform=new T.Mesh(slice(cloth),material);const pos=uniform.geometry.attributes.position,uv=new Float32Array(pos.count*2),nrm=uniform.geometry.attributes.normal;
    for(let i=0;i<pos.count;i++){const front=Math.abs(nrm?.getZ(i)||0)>.45;uv[i*2]=(front?pos.getX(i):pos.getZ(i))*2.5;uv[i*2+1]=pos.getY(i)*2.5;}
    uniform.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));weatherCloth(T,uniform.geometry);uniform.position.copy(m.position);uniform.quaternion.copy(m.quaternion);uniform.scale.copy(m.scale);uniform.castShadow=true;m.parent.add(uniform);
    // Keep the original colour attributes for the skin and equipment triangles.
    const remainder=slice(other),a=C,data=new Float32Array(other.length*3);other.forEach((n,j)=>{data[j*3]=a.getX(n);data[j*3+1]=a.getY(n);data[j*3+2]=a.getZ(n);});remainder.setAttribute('color',new T.BufferAttribute(data,3));m.geometry=remainder;
    if(geo!==source)geo.dispose();
  }
  const sharedFit=typeof u.torso.userData.cc355TorsoAt==='function'&&Number.isFinite(u.head.userData.cc355Crown);
  const scale=sharedFit?u.torso.userData.cc355Scale:Math.abs(u.head.position.y)/.58;
  if(sharedFit)fittedHelmet(T,u,material,scale);
  else{
  const shell=new T.Mesh(new T.SphereGeometry(.205*scale,10,6,0,Math.PI*2,0,Math.PI/2),material);
  weatherCloth(T,shell.geometry);shell.position.set(0,.125*scale,-.027*scale);shell.scale.set(1,.85,.95);shell.castShadow=true;u.head.add(shell);
  // The back and ear coverage leave a clear opening around the exposed face.
  const rear=new T.Mesh(new T.CylinderGeometry(.197*scale,.17*scale,.24*scale,10,1,true,Math.PI/2,Math.PI),material);
  weatherCloth(T,rear.geometry,.85);rear.position.set(0,.06*scale,-.027*scale);rear.scale.z=.95;rear.castShadow=true;u.head.add(rear);
  }
  const gearMaterial=parts[0].material.clone();gearMaterial.vertexColors=true;gearMaterial.color.setRGB(1,1,1);
  // Preserve the atlas and vertex tints through the legacy solid-color compactor.
  gearMaterial.userData.militaryUniform=true;gearMaterial.userData.militaryGear=true;
  if(sharedFit)fittedCarrier(T,u,material,scale,gearMaterial);
  else wornCarrier(T,u,material,scale,gearMaterial);
  batchWornGear(T,u.torso);batchWornGear(T,u.head);
  u.militaryCamo=MILITARY_CAMOS[(variant-1)%5];u.militaryCamoTex=camoTex;
}
export function cycleMilitaryCamo(g){
  const u=g.userData;if(!u.militaryCamoTex)return;
  const key=MILITARY_CAMOS[variant++%5];u.militaryCamo=key;
  g.traverse(o=>{if(o.isMesh&&o.material?.userData.militaryUniform&&!o.material.userData.militaryGear)o.material.map=u.militaryCamoTex(key);});
}

// GP-19865: wear is baked once into each body's cloth, never into shared CIF maps.
function weatherCloth(T,geo,tone=1){
  const p=geo.attributes.position,n=geo.attributes.normal,c=new Float32Array(p.count*3),dust=new T.Color(0xb9ae8b),base=new T.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),grain=Math.sin(x*173+y*97+z*139)*Math.sin(x*61-y*131+z*83),stain=Math.sin(x*19+y*13-z*17);
    base.setRGB(tone,tone,tone).multiplyScalar(.91+.08*grain-.16*Math.max(0,stain));
    // Dust catches folds and upward-facing fabric; dark patches remain irregular.
    base.lerp(dust,.12*Math.max(0,grain)+.08*Math.max(0,n?.getY(i)||0));
    c[i*3]=base.r;c[i*3+1]=base.g;c[i*3+2]=base.b;
  }
  geo.setAttribute('color',new T.BufferAttribute(c,3));
}
function wornCarrier(T,u,mat,s,gearMat){
  const put=(bone,geo,col,x=0,y=0,z=0)=>{
    const p=geo.attributes.position,uv=new Float32Array(p.count*2),colors=new Float32Array(p.count*3),c=new T.Color(col);
    for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)/s+x)*2.5;uv[i*2+1]=(p.getY(i)/s+y)*2.5;const a=1+.065*Math.sin(i*7.3);colors[i*3]=c.r*a;colors[i*3+1]=c.g*a;colors[i*3+2]=c.b*a;}
    geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.setAttribute('uv',new T.BufferAttribute(bone===u.head?uv:detailUV(T,geo,'cloth'),2));
    const m=new T.Mesh(geo,bone===u.head?mat:gearMat);m.position.set(x*s,y*s,z*s);m.castShadow=true;m.name='military-worn-gear';bone.add(m);return m;
  };
  const box=(bone,col,x,y,z,w,h,d)=>put(bone,new T.BoxGeometry(w*s,h*s,d*s),col,x,y,z);
  const rod=(bone,col,a,b,r=.003)=>{const A=new T.Vector3(...a).multiplyScalar(s),B=new T.Vector3(...b).multiplyScalar(s),d=B.clone().sub(A),m=put(bone,new T.CylinderGeometry(r*s,r*s,d.length(),5),col);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;};
  // Bevelled carrier border follows clipped shoulders rather than another flat box.
  const outline=[[-.16,.22],[-.178,.267],[-.16,.378],[-.12,.428],[.105,.435],[.161,.386],[.178,.27],[.151,.225]],inner=outline.map(([x,y])=>[x*.9,.325+(y-.325)*.87]);
  for(const [z,direction]of[[.195,1],[-.264,-1]]){
    const v=[],colors=[];const tri=(a,b,c,tint)=>{for(const p of[a,b,c]){v.push(p[0]*s,p[1]*s,p[2]*s);const C=new T.Color(tint);colors.push(C.r,C.g,C.b);}};
    for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length,A=[...outline[i],z],B=[...outline[j],z],C=[...inner[i],z+direction*.012],D=[...inner[j],z+direction*.012];if(direction>0){tri(A,C,B,0xbcb498);tri(B,C,D,0xaaa68b);}else{tri(A,B,C,0xbcb498);tri(B,D,C,0xaaa68b);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();const m=put(u.torso,geo,0xffffff);m.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    // Parallel rows of webbing, worn binding and individual repair stitches.
    // The camo texture carries the subpixel stitching; keep only the webbing silhouette.
    for(let row=0;row<3;row++){const y=.247+row*.047;box(u.torso,0x7f8067,0,y,z+direction*.018,.287,.012,.006);}
  }
  for(const side of[-1,1]){
    // Overlaid padded shoulders have frayed ends and a scratched buckle.
    const strap=box(u.torso,0xa8a185,side*.174,.407,.181,.037,.136,.022);strap.rotation.z=side*.07;
    box(u.torso,0x454738,side*.174,.356,.20,.046,.027,.012);box(u.torso,0xc6bfaa,side*.174,.365,.207,.031,.004,.003);
    // Pocket seams, worn flap corners and a torn lower tie.
    for(let j=0;j<2;j++){const x=side*(.048+j*.1),z=.1725*Math.sqrt(Math.max(.08,1-(x/.255)**2-((.14-.25)/.255)**2));box(u.torso,0x555842,x,.116,z+.074,.066,.0025,.003);box(u.torso,0xbab196,x,.189,z+.085,.048,.0025,.003);}
    const pts=[[side*.2,.047,.181],[side*.21,.014,.186],[side*.195,-.036,.216],[side*.215,-.059,.21]],v=[];
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],w=.009*(1-i*.2);for(const p of[[a[0]-w,a[1],a[2]],[b[0]-w,b[1],b[2]],[a[0]+w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]-w,b[1],b[2]],[b[0]+w,b[1],b[2]]])v.push(...p.map(n=>n*s));}
    const faces=[...v];for(let i=0;i<v.length;i+=9)faces.push(...v.slice(i+6,i+9),...v.slice(i+3,i+6),...v.slice(i,i+3));
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(faces,3));geo.computeVertexNormals();put(u.torso,geo,0x8b886d);
  }
  // Thin shell scuffs sit on the helmet surface and do not cover the exposed face.
  for(let j=0;j<2;j++){const a=-.9+j*.74,y=.198+(j%2)*.022,r=.205*Math.sqrt(Math.max(0,1-((y-.125)/.174)**2));rod(u.head,0xd4cbb0,[Math.sin(a)*r,y,Math.cos(a)*r*.95-.027],[Math.sin(a+.09)*r,y+.002,Math.cos(a+.09)*r*.95-.027],.0017);}
}

// Retain one rigid source per bone for fast transforms and precise projectile rays.
function batchWornGear(T,bone){
  const parts=bone.children.filter(m=>m.name==='military-worn-gear');if(parts.length<2)return;
  const data={position:[],normal:[],uv:[],color:[]},v=new T.Vector3(),n=new T.Vector3(),N=new T.Matrix3();
  for(const m of parts){
    m.updateMatrix();N.getNormalMatrix(m.matrix);const source=m.geometry,geo=source.index?source.toNonIndexed():source,P=geo.attributes.position;
    for(let i=0;i<P.count;i++){
      v.fromBufferAttribute(P,i).applyMatrix4(m.matrix);data.position.push(v.x,v.y,v.z);
      n.fromBufferAttribute(geo.attributes.normal,i).applyMatrix3(N).normalize();data.normal.push(n.x,n.y,n.z);
      const C=geo.attributes.color,U=geo.attributes.uv;data.color.push(C.getX(i),C.getY(i),C.getZ(i));data.uv.push(U.getX(i),U.getY(i));
    }
    bone.remove(m);if(geo!==source)geo.dispose();source.dispose();
  }
  const geo=new T.BufferGeometry();for(const [key,a]of Object.entries(data))geo.setAttribute(key,new T.Float32BufferAttribute(a,key==='uv'?2:3));geo.computeBoundingSphere();
  const m=new T.Mesh(geo,parts[0].material);m.name='military-worn-gear';m.castShadow=true;bone.add(m);
}

// Review-only convex support envelopes of our own source triangles.
const key3=p=>p.toArray().map(v=>Math.round(v*1e9)).join(',');
function sliceFace(T,P,n,h){
 const out=[];if(!P.length)return out;
 for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],da=n.dot(a)-h,db=n.dot(b)-h,ai=da<=1e-10,bi=db<=1e-10;
  if(ai)out.push(a);if(ai!==bi)out.push(a.clone().lerp(b,da/(da-db)));
 }return out.filter((p,i)=>i===0||p.distanceToSquared(out[i-1])>1e-20).filter((p,i,a)=>i!==a.length-1||a.length<2||p.distanceToSquared(a[0])>1e-20);
}
function clipSolid(T,F,n,h,tag){
 const out=[],cut=[];for(const f of F){const P=sliceFace(T,f.P,n,h);if(P.length>=3)out.push({...f,P});
  for(let i=0;i<f.P.length;i++){const a=f.P[i],b=f.P[(i+1)%f.P.length],da=n.dot(a)-h,db=n.dot(b)-h;if((da<=1e-10)!==(db<=1e-10))cut.push(a.clone().lerp(b,da/(da-db)));}
 }
 const map=new Map(cut.map(p=>[key3(p),p])),P=[...map.values()];if(P.length>=3){
  const C=P.reduce((a,p)=>a.add(p),new T.Vector3()).multiplyScalar(1/P.length),u=(Math.abs(n.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).cross(n).normalize(),v=new T.Vector3().crossVectors(n,u);
  P.sort((a,b)=>Math.atan2(v.dot(a.clone().sub(C)),u.dot(a.clone().sub(C)))-Math.atan2(v.dot(b.clone().sub(C)),u.dot(b.clone().sub(C))));
  out.push({P,n:n.clone(),tag});
 }return out;
}
function sourceTriangles(T,bone){
 const rows=[],v=new T.Vector3();for(const m of bone.children){if(!m.isMesh||m.visible===false||m.isSkinnedMesh||!m.geometry?.attributes.position)continue;m.updateMatrix();const P=m.geometry.attributes.position,I=m.geometry.index?.array,n=I?.length??P.count;
  for(let i=0;i<n;i+=3){const tri=[];for(let j=0;j<3;j++)tri.push(v.fromBufferAttribute(P,I?I[i+j]:i+j).applyMatrix4(m.matrix).clone());rows.push(tri);}
 }return rows;
}
function envelope(T,points,s){
 if(!points.length)throw Error('No source envelope points');const R=2*s,F=[],dirs=[];
 for(const a of[0,1,2])for(const sign of[-1,1]){const n=new T.Vector3().setComponent(a,sign),C=n.clone().multiplyScalar(R),u=(a===1?new T.Vector3(1,0,0):new T.Vector3(0,1,0)).cross(n).normalize(),v=new T.Vector3().crossVectors(n,u);
  F.push({n,tag:'initial',P:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>C.clone().addScaledVector(u,x*R).addScaledVector(v,y*R))});}
 for(const phi of[-.6,0,.6,1.05,Math.PI/2])for(let i=0;i<(phi===Math.PI/2?1:16);i++){const a=i*Math.PI/8,n=new T.Vector3(Math.sin(a)*Math.cos(phi),Math.sin(phi),Math.cos(a)*Math.cos(phi));let h=-Infinity;for(const p of points)h=Math.max(h,n.dot(p));dirs.push({n,h:h+.002*s});}
 let faces=F;for(const{n,h}of dirs)faces=clipSolid(T,faces,n,h,'shell');return faces;
}
function patchFaces(T,faces,{x0=-Infinity,x1=Infinity,y0=-Infinity,y1=Infinity,z0=-Infinity,z1=Infinity}={}){
 const planes=[[new T.Vector3(-1,0,0),-x0],[new T.Vector3(1,0,0),x1],[new T.Vector3(0,-1,0),-y0],[new T.Vector3(0,1,0),y1],[new T.Vector3(0,0,-1),-z0],[new T.Vector3(0,0,1),z1]];
 return faces.flatMap(f=>{let P=f.P;for(const[n,h]of planes)if(Number.isFinite(h))P=sliceFace(T,P,n,h);return P.length>=3?[{...f,P}]:[];});
}
function gearGeometry(T,triangles){
 const P=[],I=[],map=new Map();for(const{p,group}of triangles){if(new T.Vector3().crossVectors(p[1].clone().sub(p[0]),p[2].clone().sub(p[0])).lengthSq()<1e-22)continue;
  for(const v of p){const key=group+':'+key3(v);let i=map.get(key);if(i===undefined){i=P.length/3;map.set(key,i);P.push(...v.toArray());}I.push(i);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();g.userData.gearRimVertices=[...map.entries()].filter(([k])=>k.startsWith('rim:')).map(([,i])=>i);return g;
}
function shellPatch(T,faces,inner,outer){
 const vertices=[...new Map(faces.flatMap(f=>f.P).map(p=>[key3(p),p])).values()];
 // Split collinear edge vertices too: the shoulders meet the plates at
 // T-junctions, which must be welded rather than capped through each other.
 faces=faces.map(f=>({...f,P:f.P.flatMap((a,i)=>{const b=f.P[(i+1)%f.P.length],d=b.clone().sub(a),l=d.lengthSq();if(l<1e-20)return[];const row=[{p:a,t:0}];for(const p of vertices){const t=p.clone().sub(a).dot(d)/l;if(t>1e-8&&t<1-1e-8&&p.distanceToSquared(a.clone().addScaledVector(d,t))<1e-16)row.push({p,t});}row.sort((x,y)=>x.t-y.t);return row.map(v=>v.p);})}));
 const triangles=[],edges=new Map(),tri=(p,group)=>triangles.push({p,group});
 for(const f of faces){const A=f.P.map(inner),B=f.P.map(outer);for(let i=1;i<f.P.length-1;i++){tri([A[0],A[i+1],A[i]],'inner');tri([B[0],B[i],B[i+1]],'outer');}
  for(let i=0;i<f.P.length;i++){const a=f.P[i],b=f.P[(i+1)%f.P.length],ka=key3(a),kb=key3(b),key=ka<kb?ka+'|'+kb:kb+'|'+ka;const e=edges.get(key);if(e)e.n++;else edges.set(key,{a,b,n:1});}
 }
 for(const{a,b,n}of edges.values())if(n===1){const A=inner(a),B=inner(b),C=outer(b),D=outer(a);tri([A,B,C],'rim');tri([A,C,D],'rim');}
 return gearGeometry(T,triangles);
}
function fittedCarrierGeometry(T,u,s){
 const hull=envelope(T,sourceTriangles(T,u.torso).flatMap(P=>P),s),C=new T.Vector3(0,.25*s,0),out=p=>p.clone().sub(C).multiplyScalar(1.05).add(C),all=[],harness=[];
 for(const dir of[-1,1])harness.push(...patchFaces(T,hull.filter(f=>f.n.z*dir>1e-6),{x0:-.18*s,x1:.18*s,y0:.14*s,y1:.43*s}));
 for(const x of[-.14,.14])harness.push(...patchFaces(T,hull,{x0:(x-.014)*s,x1:(x+.014)*s,y0:.43*s}));
 all.push(shellPatch(T,harness,p=>p.clone(),out));
 const outside=hull.map(f=>({...f,P:f.P.map(out)}));
 const at=(dir,rect)=>patchFaces(T,outside.filter(f=>f.n.z*dir>1e-6),Object.fromEntries(Object.entries(rect).map(([k,v])=>[k,v*s])));
 const patch=(F,a,b,dir=1)=>all.push(shellPatch(T,F,p=>p.clone().addScaledVector(new T.Vector3(0,0,dir),(typeof a==='function'?a(p.y/s):a)*s),p=>p.clone().addScaledVector(new T.Vector3(0,0,dir),(typeof b==='function'?b(p.y/s):b)*s)));
 for(const dir of[-1,1])for(let row=0;row<3;row++)patch(at(dir,{x0:-.145,x1:.145,y0:.20+row*.066,y1:.212+row*.066}),.002,.006,dir);
 for(const x of[-.12,-.04,.04,.12]){
  patch(at(1,{x0:x-.032,x1:x+.032,y0:.17,y1:.275}),.008,.048);
  const lower=at(1,{x0:x-.034,x1:x+.034,y0:.255,y1:.275}),upper=at(1,{x0:x-.034,x1:x+.034,y0:.275,y1:.29}),base=y=>y<=.275?.049:.049+(.002-.049)*(y-.275)/.015;
  patch([...lower,...upper],base,y=>base(y)+.004);
 }
 return all;
}
function fittedHelmetGeometry(T,u,s){
 const bottom=-.045*s,seam=.09*s,cz=-.035*s,C=new T.Vector3(0,seam,cz),points=[];
 for(const tri of sourceTriangles(T,u.head)){
  const top=sliceFace(T,tri,new T.Vector3(0,-1,0),-seam);points.push(...top);
  let rear=sliceFace(T,tri,new T.Vector3(0,-1,0),-bottom);rear=sliceFace(T,rear,new T.Vector3(0,1,0),seam);rear=sliceFace(T,rear,new T.Vector3(0,0,1),cz);points.push(...rear);
 }
 let hull=envelope(T,points,s);hull=clipSolid(T,hull,new T.Vector3(0,-1,0),-bottom,'bottom-open');
 const cap=clipSolid(T,hull,new T.Vector3(0,-1,0),-seam,'cap-seam');
 let rear=clipSolid(T,hull,new T.Vector3(0,1,0),seam,'rear-seam');rear=clipSolid(T,rear,new T.Vector3(0,0,1),cz,'front-open');
 const triangles=[],outer=p=>p.clone().sub(C).multiplyScalar(1.06).add(C),tri=(p,group)=>triangles.push({p,group});
 for(const f of[...cap,...rear]){
  if(f.tag==='shell'){const B=f.P.map(outer);for(let i=1;i<f.P.length-1;i++){tri([f.P[0],f.P[i+1],f.P[i]],'inner');tri([B[0],B[i],B[i+1]],'outer');}continue;}
  if(f.tag==='rear-seam')continue;
  for(let i=0;i<f.P.length;i++){
   let a=f.P[i],b=f.P[(i+1)%f.P.length];if(!hull.some(q=>q.tag==='shell'&&Math.abs(q.n.dot(a)-q.n.dot(q.P[0]))<1e-8&&Math.abs(q.n.dot(b)-q.n.dot(q.P[0]))<1e-8))continue;if(f.tag==='cap-seam'){
    const da=a.z-cz,db=b.z-cz;if(da<0&&db<0)continue;if((da>=0)!==(db>=0)){const q=a.clone().lerp(b,da/(da-db));if(da<0)a=q;else b=q;}
   }
   const A=a,B=b,D=outer(a),E=outer(b),n=new T.Vector3().crossVectors(B.clone().sub(A),E.clone().sub(A));
   if(n.dot(f.n)>=0){tri([A,B,E],'rim');tri([A,E,D],'rim');}else{tri([A,E,B],'rim');tri([A,D,E],'rim');}
  }
 }
 return gearGeometry(T,triangles);
}

function fittedCarrier(T,u,mat,s,gearMat){
 const C=new T.Color(0x5b6148);for(const geo of fittedCarrierGeometry(T,u,s)){
  weatherCloth(T,geo);const A=geo.attributes.color;for(let i=0;i<A.count;i++)A.setXYZ(i,A.getX(i)*C.r,A.getY(i)*C.g,A.getZ(i)*C.b);
  geo.setAttribute('uv',new T.BufferAttribute(detailUV(T,geo,'cloth'),2));const m=new T.Mesh(geo,gearMat);m.name='military-worn-gear';m.castShadow=true;u.torso.add(m);
 }
}
function fittedHelmet(T,u,mat,s){
 const geo=fittedHelmetGeometry(T,u,s);weatherCloth(T,geo);fitGearUV(T,geo);const C=geo.attributes.color,rim=new T.Color(0x30382a);
 for(const i of geo.userData.gearRimVertices)C.setXYZ(i,rim.r,rim.g,rim.b);
 const m=new T.Mesh(geo,mat);m.name='military-helmet-shell';m.castShadow=true;u.head.add(m);
}
function fitGearUV(T,geo){
 const P=geo.attributes.position,N=geo.attributes.normal,U=new Float32Array(P.count*2);
 for(let i=0;i<P.count;i++){if(Math.abs(N.getY(i))>.55){U[i*2]=P.getX(i)*2.5;U[i*2+1]=P.getZ(i)*2.5;}else{U[i*2]=(Math.abs(N.getZ(i))>.5?P.getX(i):P.getZ(i))*2.5;U[i*2+1]=P.getY(i)*2.5;}}
 geo.setAttribute('uv',new T.BufferAttribute(U,2));
}
