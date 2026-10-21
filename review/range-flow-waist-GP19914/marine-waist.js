// A shirt worn by the pelvis at its hem and the chest above the abdomen.
// The live mesh keeps the existing wardrobe material and bends only when its two joints change.
export function followMarineWaist(T,ud){
 const lower=ud.lowerBody,torso=ud.torsoG;if(!lower||!torso)return;
 lower.updateMatrix();
 const e=lower.matrix.elements,y=ud.torsoPivotY||.7;
 torso.position.set(e[4]*y+e[12],e[5]*y+e[13],e[6]*y+e[14]);
}
export function createMarineWaist(T,root,{lower,torso,projectUV}={}){
 const shirt=torso?.getObjectByName('fitted-uniform');if(!shirt?.geometry||!lower)return null;
 root.updateWorldMatrix(true,true);shirt.updateMatrix();torso.updateMatrix();lower.updateMatrix();
 const bind=new T.Matrix4().multiplyMatrices(torso.matrix,shirt.matrix),lo=.735,hi=.93;
 const src=shirt.geometry.index?shirt.geometry.toNonIndexed():shirt.geometry.clone();src.applyMatrix4(bind);
 const P=src.attributes.position,N=src.attributes.normal,U=src.attributes.uv;
 // Clip the existing triangles into thin height bands through the abdomen; preserve the original surface.
 const cuts=[-Infinity,.755,.78,.805,.83,.855,.88,.905,.93,Infinity],verts=[],normals=[],uv=[];
 const clip=(poly,y,above)=>{
  const out=[];for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ain=above?a[1]>=y:a[1]<=y,bin=above?b[1]>=y:b[1]<=y;
   if(ain)out.push(a);if(ain!==bin){const t=(y-a[1])/(b[1]-a[1]);out.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }return out;
 };
 for(let i=0;i<P.count;i+=3){const tri=[];for(let j=i;j<i+3;j++)tri.push([P.getX(j),P.getY(j),P.getZ(j),N.getX(j),N.getY(j),N.getZ(j),U?.getX(j)||0,U?.getY(j)||0]);
  for(let k=0;k<cuts.length-1;k++){
   let poly=tri;if(Number.isFinite(cuts[k]))poly=clip(poly,cuts[k],true);if(Number.isFinite(cuts[k+1]))poly=clip(poly,cuts[k+1],false);
   for(let j=1;j+1<poly.length;j++)for(const v of [poly[0],poly[j],poly[j+1]]){verts.push(...v.slice(0,3));normals.push(...v.slice(3,6));uv.push(...v.slice(6,8));}
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 if(projectUV)projectUV(verts,uv);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeBoundingSphere();
 const mesh=new T.Mesh(geo,shirt.material);mesh.name='marine-flexible-shirt';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
 mesh.userData.liveShape=true;mesh.userData.aoOwners=[lower,torso];
 const group=new T.Group();group.name='marine-waist-live';root.add(group);group.add(mesh);torso.remove(shirt);src.dispose();
 const bindTorsoInv=torso.matrix.clone().invert(),bindLowerInv=lower.matrix.clone().invert(),A=new T.Matrix4(),B=new T.Matrix4(),NA=new T.Matrix3(),NB=new T.Matrix3();
 const rest=Float32Array.from(geo.attributes.position.array),normal=Float32Array.from(geo.attributes.normal.array),weights=Float32Array.from({length:rest.length/3},(_,i)=>{const x=Math.max(0,Math.min(1,(rest[i*3+1]-lo)/(hi-lo)));return x*x*(3-2*x);}),last=new Float32Array(32).fill(NaN);
 let uploads=0;
 function bend(){
  torso.updateMatrix();lower.updateMatrix();A.multiplyMatrices(torso.matrix,bindTorsoInv);B.multiplyMatrices(lower.matrix,bindLowerInv);
  const a=A.elements,b=B.elements;let same=true;for(let i=0;i<16;i++)if(Math.abs(a[i]-last[i])>1e-5||Math.abs(b[i]-last[16+i])>1e-5||Number.isNaN(last[i])){same=false;break;}if(same)return;
  // AO and wardrobe baking may clone the geometry after the rig is built. Update the live geometry.
  const active=mesh.geometry;if(active.attributes.position.count!==weights.length)return;
  last.set(a);last.set(b,16);NA.getNormalMatrix(A);NB.getNormalMatrix(B);const na=NA.elements,nb=NB.elements,pa=active.attributes.position.array,nn=active.attributes.normal.array;
  for(let i=0;i<weights.length;i++){
   const j=i*3,w=weights[i],v=1-w,x=rest[j],y=rest[j+1],z=rest[j+2];
   pa[j]=w*(a[0]*x+a[4]*y+a[8]*z+a[12])+v*(b[0]*x+b[4]*y+b[8]*z+b[12]);
   pa[j+1]=w*(a[1]*x+a[5]*y+a[9]*z+a[13])+v*(b[1]*x+b[5]*y+b[9]*z+b[13]);
   pa[j+2]=w*(a[2]*x+a[6]*y+a[10]*z+a[14])+v*(b[2]*x+b[6]*y+b[10]*z+b[14]);
   const nx=normal[j],ny=normal[j+1],nz=normal[j+2],xx=w*(na[0]*nx+na[3]*ny+na[6]*nz)+v*(nb[0]*nx+nb[3]*ny+nb[6]*nz),yy=w*(na[1]*nx+na[4]*ny+na[7]*nz)+v*(nb[1]*nx+nb[4]*ny+nb[7]*nz),zz=w*(na[2]*nx+na[5]*ny+na[8]*nz)+v*(nb[2]*nx+nb[5]*ny+nb[8]*nz),l=Math.hypot(xx,yy,zz)||1;
   nn[j]=xx/l;nn[j+1]=yy/l;nn[j+2]=zz/l;
  }
  active.attributes.position.needsUpdate=true;active.attributes.normal.needsUpdate=true;uploads++;
 }
 mesh.onBeforeRender=bend;mesh.onBeforeShadow=bend;
 const api={mesh,bend,rest,weights,debug:()=>({vertices:weights.length,triangles:weights.length/3,uploads}),dispose(){group.removeFromParent();if(mesh.geometry!==geo)mesh.geometry.dispose();geo.dispose();}};
 root.userData.waist=api;return api;
}
