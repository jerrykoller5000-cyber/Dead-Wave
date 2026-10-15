// GP-19920: fit carry copies, never change the weapon builder or its firing grip.
export function carryBounds(T, spot) {
  if (!spot.gun) return null;
  spot.g.updateWorldMatrix(true,true);
  const inv=spot.g.parent.matrixWorld.clone().invert(),v=new T.Vector3(),m=new T.Matrix4(),b=new T.Box3();
  spot.gun.traverseVisible(o=>{
    const p=o.geometry?.attributes?.position;if(!o.isMesh||!p)return;
    m.multiplyMatrices(inv,o.matrixWorld);
    for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(m));
  });
  return Number.isFinite(b.min.x)?b:null;
}

export function clearCarryPack(T,spot,primary=false) {
  const b=carryBounds(T,spot);if(!b)return;
  const side=spot.g.position.x<0?-1:1;
  if(primary){
    // Reserve the centre of the pack for secondaries; wide drums stay outboard.
    const inner=side>0?b.min.x:-b.max.x;
    spot.g.position.x+=side*Math.max(0,.265-inner);
  }else{
    // The pack, MOLLE, and crossing bands end at z=-.333. Fit the nearest
    // visible weapon surface, not its origin; stocks/drums/attachments count.
    spot.g.position.z-=Math.max(0,b.max.z+.345);
  }
  spot.g.updateMatrix();
}

// Hollow molded shell in the carried gun's local frame: open mouth, inner wall,
// solid muzzle end and an exposed grip. Geometry is refreshed only with the kit.
export function fitCarryHolster(T,spot,material){
  if(!spot.gun)return;
  spot.gun.updateMatrixWorld(true);
  const inv=spot.g.matrixWorld.clone().invert(),m=new T.Matrix4(),v=new T.Vector3(),points=[];
  spot.gun.traverseVisible(o=>{const p=o.geometry?.attributes?.position;if(!o.isMesh||!p)return;
    m.multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);points.push(v.clone());}});
  if(!points.length)return;
  const whole=new T.Box3();for(const p of points)whole.expandByPoint(p);
  const length=whole.max.z-whole.min.z;
  const mouth=whole.min.z+length*.40,end=whole.max.z+.008;
  const b=new T.Box3();for(const p of points)if(p.z>=mouth)b.expandByPoint(p);
  const cx=(b.min.x+b.max.x)/2,cy=(b.min.y+b.max.y)/2;
  const rx=(b.max.x-b.min.x)/2+.004,ry=(b.max.y-b.min.y)/2+.004,wall=.004;
  const key=[spot.kind,cx,cy,rx,ry,mouth,end].join(':');
  if(spot.shell?.userData.fitKey===key)return;
  if(spot.shell){spot.g.remove(spot.shell);if(spot.shell.userData.fittedHolster)spot.shell.geometry.dispose();}
  const outline=(x,y)=>[[-x*.8,-y],[x*.8,-y],[x,-y*.8],[x,y*.8],[x*.8,y],[-x*.8,y],[-x,y*.8],[-x,-y*.8]];
  const p=[],ix=[];
  for(const [x,y,z]of [[rx+wall,ry+wall,mouth],[rx+wall,ry+wall,end],[rx,ry,mouth],[rx,ry,end-wall]])
    for(const[a,b]of outline(x,y))p.push(cx+a,cy+b,z);
  const quad=(a,b,c,d)=>ix.push(a,b,c,a,c,d);
  for(let i=0;i<8;i++){const j=(i+1)%8;quad(i,j,8+j,8+i);quad(16+j,16+i,24+i,24+j);quad(j,i,16+i,16+j);}
  for(let i=1;i<7;i++){ix.push(8,8+i,8+i+1);ix.push(24,24+i+1,24+i);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();
  const shell=new T.Mesh(geo,material);shell.name='open-molded-holster';shell.castShadow=shell.receiveShadow=true;
  shell.userData={fitKey:key,fittedHolster:true,mouth,end,clearance:.004};spot.g.add(shell);spot.shell=shell;
}

// Bridge the stationary forearm to the turning wrist. The proximal ring stays
// sewn to the arm, the distal ring follows the palm, and four rings share bend.
export function wristTransition(T,elbow,wrist,material,{ox,oz,gz,scale=1.18}){
  const n=120,rows=4,p=[],uv=[],ix=[],rest=[],weights=[];
  // Match the actual polygon boundaries, including the palm's half-segment
  // angular offset. Scaling happens about the wrist pivot, not the elbow.
  const boundary=(a,count,phase,exponent,rx,rz,cx,cy,cz)=>{
    const f=a/(Math.PI*2)*count-phase,k=Math.floor(f),t=f-k;
    const point=j=>{const q=(j+phase)/count*Math.PI*2,x=Math.sin(q),z=Math.cos(q);
      return [cx+Math.sign(x)*Math.abs(x)**exponent*rx,cy,cz+Math.sign(z)*Math.abs(z)**exponent*rz];};
    const A=point(k),B=point(k+1);return A.map((v,i)=>v+(B[i]-v)*t);
  };
  for(let r=0;r<=rows;r++){
    const t=r/rows;
    for(let j=0;j<=n;j++){
      const a=j/n*Math.PI*2,A=boundary(a,24,0,.88,.037,.036,ox,-.18,oz);
      const B=boundary(a,10,.5,.7,.029,.016,ox,-.214,gz-.022);
      for(let c=0;c<3;c++){const o=[wrist.position.x,wrist.position.y,wrist.position.z][c];B[c]=o+(B[c]-o)*scale;}
      p.push(...A.map((v,c)=>v+(B[c]-v)*t));uv.push(j/n,t);weights.push(t*t*(3-2*t));
    }
  }
  rest.push(...p);
  for(let r=0;r<rows;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;ix.push(a,b,a+1,a+1,b,b+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,material);mesh.name='wrist-continuous-skin';mesh.userData.liveShape=true;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.add(new T.Object3D());
  const last=new T.Quaternion(0,0,0,0),v=new T.Vector3(),origin=wrist.position.clone();let active=null;
  const bend=()=>{const q=wrist.quaternion;if(active===mesh.geometry&&last.x===q.x&&last.y===q.y&&last.z===q.z&&last.w===q.w)return;active=mesh.geometry;last.copy(q);const P=active.attributes.position;
    for(let i=0;i<weights.length;i++){v.fromArray(rest,i*3).sub(origin).applyQuaternion(wrist.quaternion).add(origin);const w=weights[i];P.setXYZ(i,rest[i*3]*(1-w)+v.x*w,rest[i*3+1]*(1-w)+v.y*w,rest[i*3+2]*(1-w)+v.z*w);}
    P.needsUpdate=true;active.computeVertexNormals();};
  mesh.onBeforeRender=bend;mesh.onBeforeShadow=bend;mesh.userData.bend=bend;elbow.add(mesh);return mesh;
}
