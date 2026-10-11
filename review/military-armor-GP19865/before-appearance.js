// GP-19864: CIF cloth shares the existing skeleton; template geometry stays untouched.
export const MILITARY_CAMOS = Object.freeze(['marpat','m81','ucp','multicam','dcu']);
let variant = 0;
export function prepareMilitaryAppearance(T,g,camoTex){
  const u=g.userData;if(u.typeKey!=='military')return;
  const colors=[0x626448,0x8a805a,0x3c4633].map(n=>new T.Color(n));
  const material=new T.MeshStandardMaterial({map:camoTex(MILITARY_CAMOS[variant++%5]),roughness:.95});
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
    uniform.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));uniform.position.copy(m.position);uniform.quaternion.copy(m.quaternion);uniform.scale.copy(m.scale);uniform.castShadow=true;m.parent.add(uniform);
    // Keep the original colour attributes for the skin and equipment triangles.
    const remainder=slice(other),a=C,data=new Float32Array(other.length*3);other.forEach((n,j)=>{data[j*3]=a.getX(n);data[j*3+1]=a.getY(n);data[j*3+2]=a.getZ(n);});remainder.setAttribute('color',new T.BufferAttribute(data,3));m.geometry=remainder;
    if(geo!==source)geo.dispose();
  }
  const scale=Math.abs(u.head.position.y)/.58;
  const shell=new T.Mesh(new T.SphereGeometry(.205*scale,16,10,0,Math.PI*2,0,Math.PI/2),material);
  shell.position.set(0,.125*scale,-.027*scale);shell.scale.set(1,.85,.95);shell.castShadow=true;u.head.add(shell);
  // The back and ear coverage leave a clear opening around the exposed face.
  const rear=new T.Mesh(new T.CylinderGeometry(.197*scale,.17*scale,.24*scale,14,1,true,Math.PI/2,Math.PI),material);
  rear.position.set(0,.06*scale,-.027*scale);rear.scale.z=.95;rear.castShadow=true;u.head.add(rear);
  u.militaryCamo=MILITARY_CAMOS[(variant-1)%5];u.militaryCamoTex=camoTex;
}
export function cycleMilitaryCamo(g){
  const u=g.userData;if(!u.militaryCamoTex)return;
  const key=MILITARY_CAMOS[variant++%5];u.militaryCamo=key;
  g.traverse(o=>{if(o.isMesh&&o.material?.userData.militaryUniform)o.material.map=u.militaryCamoTex(key);});
}
