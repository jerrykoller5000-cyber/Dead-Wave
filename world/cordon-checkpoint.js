// GP-121: static checkpoint dressing and ground-following convoy approaches.
// The route is local to the existing gate (+z inward); no world RNG or terrain edits.
export function planConvoyRoute({start,end,height,clear,step=2}) {
  const loX=-56,hiX=56,loZ=Math.min(start.z,end.z)-10,hiZ=Math.max(start.z,end.z)+12;
  const key=(x,z)=>x+','+z,cache=new Map(),nodes=new Map(),open=[];
  const at=(i,j)=>({x:start.x+i*step,z:start.z+j*step});
  const terrain=(i,j)=>{const k=key(i,j);if(cache.has(k))return cache.get(k);const p=at(i,j),y=height(p.x,p.z);const slope=Math.max(Math.abs(height(p.x+1,p.z)-height(p.x-1,p.z)),Math.abs(height(p.x,p.z+1)-height(p.x,p.z-1)))/2;const v={...p,y,slope,ok:p.x>=loX&&p.x<=hiX&&p.z>=loZ&&p.z<=hiZ&&clear(p.x,p.z)};cache.set(k,v);return v;};
  const first={i:0,j:0,g:0,f:0,parent:null};nodes.set(key(0,0),first);open.push(first);let last=null;
  while(open.length){open.sort((a,b)=>b.f-a.f);const n=open.pop();if(n.closed)continue;n.closed=true;const p=terrain(n.i,n.j);if(Math.hypot(p.x-end.x,p.z-end.z)<step*1.5){last=n;break;}
    for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const i=n.i+di,j=n.j+dj,q=terrain(i,j);if(!q.ok)continue;const midX=(p.x+q.x)/2,midZ=(p.z+q.z)/2;if(!clear(midX,midZ))continue;const cost=n.g+Math.hypot(di,dj)*step*(1+q.slope*q.slope*22)+Math.abs(q.y-p.y)*5,k=key(i,j),old=nodes.get(k);if(old&&cost>=old.g)continue;const next={i,j,g:cost,f:cost+Math.hypot(q.x-end.x,q.z-end.z),parent:n};nodes.set(k,next);open.push(next);}
  }
  if(!last)throw Error('No clear convoy approach to the existing trail');
  const raw=[];for(let n=last;n;n=n.parent)raw.unshift(at(n.i,n.j));raw.push(end);
  const lineClear=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.6);for(let i=0;i<=n;i++){const t=i/(n||1);if(!clear(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;};
  const reduced=[raw[0]];for(let i=0;i<raw.length-1;){let j=Math.min(raw.length-1,i+6);while(j>i+1&&!lineClear(raw[i],raw[j]))j--;reduced.push(raw[j]);i=j;}
  let smooth=reduced;
  for(let pass=0;pass<2;pass++){const next=[smooth[0]];for(let i=0;i<smooth.length-1;i++){const a=smooth[i],b=smooth[i+1];next.push({x:.75*a.x+.25*b.x,z:.75*a.z+.25*b.z},{x:.25*a.x+.75*b.x,z:.25*a.z+.75*b.z});}next.push(smooth.at(-1));if(next.every((p,i)=>!i||lineClear(next[i-1],p)))smooth=next;}
  const points=[];for(let i=0;i<smooth.length-1;i++){const a=smooth[i],b=smooth[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.65));for(let k=0;k<n;k++)points.push({x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n});}points.push(end);return points;
}

// Sample the rendered triangles rather than the collision heightfield. They differ
// slightly on the outer slopes; matching the mesh prevents holes through the track.
export function groundSurfaceSampler(geometry,fallback,bounds=null) {
  const p=geometry.attributes.position,idx=geometry.index,buckets=new Map(),size=8;
  const count=idx?idx.count:p.count;
  for(let k=0;k<count;k+=3){const ids=[0,1,2].map(j=>idx?idx.getX(k+j):k+j),a=ids.map(i=>[p.getX(i),p.getY(i),p.getZ(i)]),xs=a.map(v=>v[0]),zs=a.map(v=>v[2]);
    if(bounds&&(Math.max(...xs)<bounds[0]||Math.min(...xs)>bounds[2]||Math.max(...zs)<bounds[1]||Math.min(...zs)>bounds[3]))continue;
    for(let x=Math.floor(Math.min(...xs)/size);x<=Math.floor(Math.max(...xs)/size);x++)for(let z=Math.floor(Math.min(...zs)/size);z<=Math.floor(Math.max(...zs)/size);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(a);}}
  return(x,z)=>{for(const[a,b,c]of buckets.get(Math.floor(x/size)+','+Math.floor(z/size))||[]){const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)continue;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d;if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)return u*a[1]+v*b[1]+(1-u-v)*c[1];}return fallback(x,z);};
}

export function buildCordonCheckpoint(T,{height,inside,outside,surface=height,doc=null}) {
  const root=new T.Group();root.name='cordon-checkpoint';const pieces=[];
  const C={concrete:0x73766b,edge:0x9b9b87,steel:0x48514b,dark:0x242c2a,rust:0x785541,olive:0x555f49,pale:0xbcb99f,yellow:0xb8a65c};
  const box=(w,h,d,c,x,y,z,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c}));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);pieces.push(m);return m;};
  const bar=(a,b,r,c)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),6),new T.MeshStandardMaterial({color:c}));m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());pieces.push(m);};
  // Cast-concrete piers and steel repairs bind the military gate into the wall.
  for(const s of[-1,1]){
    const x=s*2.65,y=height(x,0);
    box(.95,4.95,1.75,C.concrete,x,y+2.37,-.3);box(1.13,.2,1.95,C.edge,x,y+4.89,-.3);
    box(1.24,.25,2.1,C.concrete,x,y+.08,-.3);
    for(const z of[.62,-1.21]){box(.35,3.9,.09,C.steel,x,y+2.25,z);for(const h of[.55,1.8,3.2,4.05])box(.12,.12,.12,C.edge,x,y+h,z+(z>0?.06:-.06));}
    for(const h of[.72,3.4])box(1.08,.22,.11,C.rust,x,y+h,.63);
    // Dark, disconnected floodlight; no extra runtime light.
    bar([x,y+4.6,.5],[x,y+4.6,1.2],.045,C.steel);box(.52,.25,.28,C.dark,x,y+4.58,1.25,.3);box(.39,.15,.012,C.pale,x,y+4.54,1.398,.3);
  }
  box(6.35,.26,1.6,C.concrete,0,4.64,-.28);
  // Exterior face sits outside the masonry backing. Both sides read as the same shut gate.
  for(const s of[-1,1]){
    box(2.04,4.05,.13,C.steel,s*1.06,2.08,-.86);
    for(const y of[.55,2.2,3.85])box(1.92,.14,.09,C.dark,s*1.06,y,-.96);
    bar([s*.18,.68,-1.01],[s*1.91,3.7,-1.01],.055,C.dark);
    for(const y of[.65,2.12,3.6])box(.24,.13,.15,C.rust,s*1.93,y,-.98);
    // Front diagonal repair braces stay clear of the existing stencil.
    bar([s*.22,.39,.17],[s*1.91,1.17,.17],.04,C.steel);
    for(let k=0;k<8;k++)box(.12+k%3*.04,.017,.018,C.rust,s*(.28+(k%4)*.45),.32+Math.floor(k/4)*3.58,.18);
  }
  box(1.38,.14,.13,C.dark,0,1.31,-1.04);box(.17,.2,.16,C.rust,0,1.14,-1.1);
  // Small abandoned guard booth, beside the lane, with an open window and door.
  const bx=-4.8,bz=7.5,by=height(bx,bz);
  box(2.25,.17,2.4,C.concrete,bx,by+.035,bz);
  box(1.95,.08,2.12,C.dark,bx,by+.17,bz);
  for(const x of[-.96,.96])for(const z of[-1.03,1.03])box(.09,2.5,.09,C.steel,bx+x,by+1.39,bz+z);
  box(.075,2.35,2.03,C.olive,bx-.98,by+1.34,bz);
  box(1.89,2.35,.075,C.olive,bx,by+1.34,bz-1.05);
  box(.075,.92,2.04,C.olive,bx+.98,by+.7,bz);
  box(.075,.42,2.04,C.olive,bx+.98,by+2.29,bz);
  box(.11,.95,.07,C.steel,bx+.99,by+1.66,bz);
  box(.85,2.3,.075,C.olive,bx-.53,by+1.34,bz+1.05);
  box(.17,.08,2.15,C.edge,bx+1.04,by+1.21,bz);
  box(2.4,.11,2.53,C.dark,bx,by+2.62,bz,0,0,.025);
  for(let k=0;k<9;k++)box(.047,.032,2.52,C.steel,bx-1.08+k*.27,by+2.7,bz);
  // Desk, radio, logbook and a chair remain visible through the window.
  box(.65,.08,1.48,C.edge,bx+.54,by+1.13,bz);
  box(.24,.19,.34,C.dark,bx+.56,by+1.26,bz-.38);bar([bx+.5,by+1.35,bz-.4],[bx+.5,by+1.82,bz-.4],.008,C.dark);
  box(.27,.025,.34,C.pale,bx+.53,by+1.19,bz+.23,0,.13);
  box(.43,.075,.44,C.dark,bx-.2,by+.65,bz+.18);box(.43,.4,.065,C.olive,bx-.2,by+.89,bz-.03);
  for(const dx of[-.16,.16])for(const dz of[-.16,.16])bar([bx-.2+dx,by+.22,bz+.18+dz],[bx-.2+dx,by+.63,bz+.18+dz],.018,C.steel);
  // Raised inspection arm and roadside blocks imply former truck traffic.
  const ay=height(-2.9,6);box(.45,.95,.48,C.olive,-2.9,ay+.46,6);
  bar([-2.9,ay+.95,6],[-2.2,ay+4.5,6],.055,C.pale);
  for(let k=0;k<7;k++)box(.12,.18,.13,k%2?0x874c38:C.pale,-2.9+k*.1,ay+.98+k*.5,6,0,0,-.19);
  for(const[x,z]of[[3.55,7],[3.9,11],[-3.45,12],[3.4,-4],[-3.4,-4]]){
    const y=height(x,z);box(.54,.48,1.55,C.concrete,x,y+.21,z);box(.29,.25,1.5,C.edge,x,y+.55,z);box(.3,.045,.24,C.yellow,x,y+.7,z);
  }
  // Merge all untextured fittings into one static draw.
  const pos=[],cols=[];
  for(const m of pieces){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry;geo.applyMatrix4(m.matrix);const a=geo.attributes.position,c=m.material.color;for(let i=0;i<a.count;i++){pos.push(a.getX(i),a.getY(i),a.getZ(i));cols.push(c.r,c.g,c.b);}geo.dispose();m.material.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();const fixtures=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));fixtures.castShadow=true;fixtures.receiveShadow=true;root.add(fixtures);
  // Ragged feathered shoulders, darker wheel ruts, and a grassy centre outside.
  const pp=[],cc=[],uv=[],bands=Array.from({length:25},(_,k)=>k/12-1);
  const makeRoad=(points,outer)=>{
    const rows=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len;
      const w=(outer?2.15:2.35)+(outer?0:Math.max(0,1-p.z/12)*.65);
      return bands.map((u,k)=>{const edge=.055*Math.sin(i*.73+k*.7),x=p.x+nx*(w*u+edge*Math.abs(u)),z=p.z+nz*(w*u+edge*Math.abs(u));return{v:[x,surface(x,z)+.035,z],c:[1,1,1],uv:[(outer?.5:0)+.002+(u+1)*.248,i/(points.length-1)]};});});
    for(let i=0;i<rows.length-1;i++)for(let k=0;k<bands.length-1;k++)for(const [r,j]of[[i,k],[i+1,k],[i+1,k+1],[i,k],[i+1,k+1],[i,k+1]]){pp.push(...rows[r][j].v);cc.push(...rows[r][j].c);uv.push(...rows[r][j].uv);}
  };
  makeRoad(inside,false);makeRoad(outside,true);
  const roadGeo=new T.BufferGeometry();roadGeo.setAttribute('position',new T.Float32BufferAttribute(pp,3));roadGeo.setAttribute('color',new T.Float32BufferAttribute(cc,3));roadGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));roadGeo.computeVertexNormals();
  let map=null;
  if(doc){const cv=doc.createElement('canvas');cv.width=512;cv.height=2048;const ctx=cv.getContext('2d'),im=ctx.createImageData(cv.width,cv.height);let seed=291;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296,outer=x>=256,u=((x%256)/255)*2-1,wob=.035*Math.sin(y*.041)+.025*Math.sin(y*.127),r=Math.abs(u-wob),rut=Math.exp(-Math.pow((r-.49)/.17,4)),edge=Math.max(0,Math.min(1,(.99-r-noise*.07)/.15));const grain=.84+noise*.26+.04*Math.sin(y*.047+x*.1),base=outer?112-rut*18:122-rut*11,alpha=edge*(outer?.07+rut*.88:.9)*((outer&&y<200)?y/200:1),i=(y*cv.width+x)*4;im.data[i]=base*grain;im.data[i+1]=(base-15)*grain;im.data[i+2]=(base-34)*grain;im.data[i+3]=255*alpha;}
    ctx.putImageData(im,0,0);map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;}
  const road=new T.Mesh(roadGeo,new T.MeshStandardMaterial({map,color:map?0xffffff:0x7f6b4e,transparent:true,depthWrite:false,roughness:1,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));road.name='convoy-approach-tracks';road.receiveShadow=true;root.add(road);root.userData.routes={inside,outside};root.userData.solids=[{x:bx,z:bz,r:1.45,y:by,h:2.75},...[[3.55,7],[3.9,11],[-3.45,12],[3.4,-4],[-3.4,-4]].map(([x,z])=>({x,z,r:.66,y:height(x,z),h:.72}))];return root;
}
