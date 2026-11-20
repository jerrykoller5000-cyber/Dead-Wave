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

// GB-276: where each slung primary's innermost point rests on his side, as |x| in the torso frame, [+x side, -x side].
// GB-220's bars were recorded while the chapel halo (an invisible 0.9 m ellipsoid on the marine) stood in for his body, so
// every sling stopped on it; with the halo hidden (AG-200) the guns were 5-16 cm off his torso and pack (AG-233). These rest
// on the body's real side (measured on the real renderer with t189's inward ray, then a few mm of air), so a slung gun lies
// snug on his back. A gun not listed keeps the old rule (inner edge at .265, wide drums outboard of it).
export const SLING_INNER={m4:[.1999,.1955],ak:[.1947,.2008],aa12:[.2122,.1844],shotgun:[.1314,.1377],sniper:[.1414,.1431],launcher:[.1822,.1822],flamer:[.1824,.2198],chainsaw:[.2271,.1773]};

export function clearCarryPack(T,spot,primary=false) {
  if(primary){
    // The spot starts where the rig put it and is placed afresh for each gun: before, it only ever moved outboard, so the
    // widest gun ever slung left every later gun standing off his back (AG-233).
    const u=spot.g.userData;
    if(u.carryBaseX===undefined)u.carryBaseX=spot.g.position.x;
    spot.g.position.x=u.carryBaseX;spot.g.updateMatrix();
  }
  const b=carryBounds(T,spot);if(!b)return;
  const side=spot.g.position.x<0?-1:1;
  if(primary){
    const inner=side>0?b.min.x:-b.max.x,want=SLING_INNER[spot.kind];
    if(want)spot.g.position.x+=side*(want[side>0?0:1]-inner);
    else spot.g.position.x+=side*Math.max(0,.265-inner);   // reserve the centre of the pack for secondaries; wide drums stay outboard
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

// GP-20151 review-only, derive the band from the existing trouser bind surface.
// No bones, cloth weights, hand targets or animation are changed.
export function fitThighBands(T,{root,legLG,legRG}){
 const cloth=[];root.traverse(o=>{if(o.name==='live-trouser-leg'&&o.userData?.cloth)cloth.push(o.userData.cloth);});
 const records=[];
 for(const leg of [legLG,legRG]){
  const c=cloth.find(c=>c.bones.includes(leg));if(!c)throw Error('Missing actual trouser bind surface');
  const inv=c.bindInv[c.bones.indexOf(leg)],pts=[];
  for(let i=0;i<c.rest.length;i+=3)pts.push(new T.Vector3().fromArray(c.rest,i).applyMatrix4(inv));
  const triangles=[];for(let i=0;i<c.map.length;i+=3){const t=Array.from(c.map.slice(i,i+3),j=>pts[j]);if(t.every(v=>v.y<-.13&&v.y>-.20)||Math.min(...t.map(v=>v.y))<-.15&&Math.max(...t.map(v=>v.y))>-.18)triangles.push(t);}
  const bands=[];leg.traverse(o=>{if(o.name==='holster-thigh-band')bands.push(o);});
  for(const m of bands){
   const p=[],ix=[],n=64,ray=new T.Ray(),hit=new T.Vector3(),dir=new T.Vector3(),origin=new T.Vector3(),radii=[];
   // Four rings, ordered inner-low / outer-low / outer-high / inner-high.
   for(const[dy,gap]of[[-.008,.0015],[-.008,.0028],[.008,.0028],[.008,.0015]]){
    for(let j=0;j<=n;j++){
     const a=j/n*2*Math.PI;dir.set(Math.sin(a),0,Math.cos(a));origin.set(m.position.x,m.position.y+dy,m.position.z);ray.set(origin,dir);
     let radius=-Infinity;for(const t of triangles){if(ray.intersectTriangle(...t,false,hit)){const r=hit.clone().sub(origin).dot(dir);if(r>0&&r<.2)radius=Math.max(radius,r);}}
     if(!Number.isFinite(radius))throw Error('No trouser ray '+j+' at '+origin.y);
     radii.push(radius);p.push(dir.x*(radius+gap),dy,dir.z*(radius+gap));
    }
   }
   const quad=(a,b,c,d)=>ix.push(a,b,c,a,c,d);
   for(let j=0;j<n;j++){const k=n+1;quad(j,j+1,k+j+1,k+j);quad(k+j,k+j+1,2*k+j+1,2*k+j);quad(2*k+j,2*k+j+1,3*k+j+1,3*k+j);quad(3*k+j,3*k+j+1,j+1,j);}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();geo.computeBoundingSphere();
   const old=m.geometry; m.geometry=geo;m.userData.gp20151FittedBand=true;
   records.push({side:Math.sign(leg.position.x),triangles:ix.length/3,bodyRadii:[Math.min(...radii),Math.max(...radii)],oldVertices:old.attributes.position.count,newVertices:p.length/3});
  }
 }
 return records;
}
