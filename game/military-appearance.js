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
  const scale=Math.abs(u.head.position.y)/.58;
  const shell=new T.Mesh(new T.SphereGeometry(.205*scale,16,10,0,Math.PI*2,0,Math.PI/2),material);
  weatherCloth(T,shell.geometry);shell.position.set(0,.125*scale,-.027*scale);shell.scale.set(1,.85,.95);shell.castShadow=true;u.head.add(shell);
  // The back and ear coverage leave a clear opening around the exposed face.
  const rear=new T.Mesh(new T.CylinderGeometry(.197*scale,.17*scale,.24*scale,14,1,true,Math.PI/2,Math.PI),material);
  weatherCloth(T,rear.geometry,.85);rear.position.set(0,.06*scale,-.027*scale);rear.scale.z=.95;rear.castShadow=true;u.head.add(rear);
  const gearMaterial=parts[0].material.clone();gearMaterial.vertexColors=true;gearMaterial.color.setRGB(1,1,1);
  // Preserve the atlas and vertex tints through the legacy solid-color compactor.
  gearMaterial.userData.militaryUniform=true;gearMaterial.userData.militaryGear=true;
  wornCarrier(T,u,material,scale,gearMaterial);
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
  for(const [z,direction]of[[.225,1],[-.324,-1]]){
    const v=[],colors=[];const tri=(a,b,c,tint)=>{for(const p of[a,b,c]){v.push(p[0]*s,p[1]*s,p[2]*s);const C=new T.Color(tint);colors.push(C.r,C.g,C.b);}};
    for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length,A=[...outline[i],z],B=[...outline[j],z],C=[...inner[i],z+direction*.012],D=[...inner[j],z+direction*.012];if(direction>0){tri(A,C,B,0xbcb498);tri(B,C,D,0xaaa68b);}else{tri(A,B,C,0xbcb498);tri(B,D,C,0xaaa68b);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();const m=put(u.torso,geo,0xffffff);m.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    // Parallel rows of webbing, worn binding and individual repair stitches.
    for(let row=0;row<4;row++){const y=.247+row*.037;box(u.torso,0x7f8067,0,y,z+direction*.018,.287,.012,.006);for(let x=-.125;x<.13;x+=.05)box(u.torso,0xc3bba0,x,y,z+direction*.023,.003,.014,.002);}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];for(let t=.2;t<1;t+=.3){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;rod(u.torso,0xc9c1a3,[x-.003,y-.004,z+direction*.003],[x+.003,y+.004,z+direction*.003],.0014);}}
  }
  for(const side of[-1,1]){
    // Overlaid padded shoulders have frayed ends and a scratched buckle.
    const strap=box(u.torso,0xa8a185,side*.174,.407,.221,.037,.136,.022);strap.rotation.z=side*.07;
    box(u.torso,0x454738,side*.174,.356,.24,.046,.027,.012);box(u.torso,0xc6bfaa,side*.174,.365,.247,.031,.004,.003);
    for(let j=0;j<3;j++){const x=side*(.165+j*.005);rod(u.torso,0xbdb396,[x,.343,.235],[x+side*.004,.324-j*.006,.238],.0015);}
    // Pocket seams, worn flap corners and a torn lower tie.
    for(let j=0;j<2;j++){const x=side*(.048+j*.1);box(u.torso,0x555842,x,.116,.273,.066,.0025,.003);box(u.torso,0xbab196,x,.189,.284,.048,.0025,.003);for(let k=0;k<3;k++)rod(u.torso,0xb7ac8b,[x-.028+k*.006,.173,.278],[x-.032+k*.006,.153-k*.006,.28],.0012);}
    const pts=[[side*.2,.047,.181],[side*.21,.014,.186],[side*.195,-.036,.216],[side*.215,-.059,.21]],v=[];
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],w=.009*(1-i*.2);for(const p of[[a[0]-w,a[1],a[2]],[b[0]-w,b[1],b[2]],[a[0]+w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]-w,b[1],b[2]],[b[0]+w,b[1],b[2]]])v.push(...p.map(n=>n*s));}
    const faces=[...v];for(let i=0;i<v.length;i+=9)faces.push(...v.slice(i+6,i+9),...v.slice(i+3,i+6),...v.slice(i,i+3));
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(faces,3));geo.computeVertexNormals();put(u.torso,geo,0x8b886d);
  }
  // Thin shell scuffs sit on the helmet surface and do not cover the exposed face.
  for(let j=0;j<5;j++){const a=-.9+j*.37,y=.198+(j%2)*.022,r=.205*Math.sqrt(Math.max(0,1-((y-.125)/.174)**2));rod(u.head,0xd4cbb0,[Math.sin(a)*r,y,Math.cos(a)*r*.95-.027],[Math.sin(a+.09)*r,y+.002,Math.cos(a+.09)*r*.95-.027],.0017);}
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
