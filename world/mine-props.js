// GP-112: static mine dressing. No world randomness, collision or interaction changes.
const P={wood:0x69553b,old:0x4f4534,light:0x8a7250,split:0x37352b,iron:0x454b44,rust:0x805437,cut:0xc0c2aa,stone:0x777365,rope:0x4c8390,dark:0x272d28};
function kit(T,name){
 const g=new T.Group();g.name=name;const parts=[];
 const add=(geo,c,x,y,z,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(geo);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.updateMatrix();parts.push({m,c});return m;};
 const box=(w,h,d,c,x,y,z,rx=0,ry=0,rz=0)=>add(new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz);
 const bar=(a,b,r,c,sides=6)=>{const v=new T.Vector3(...a),e=new T.Vector3(...b),d=e.clone().sub(v),m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),sides));m.position.copy(v).add(e).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.updateMatrix();parts.push({m,c});};
 const beam=(a,b,w,d,c)=>{const v=new T.Vector3(...a),e=new T.Vector3(...b),delta=e.clone().sub(v),m=new T.Mesh(new T.BoxGeometry(w,delta.length(),d));m.position.copy(v).add(e).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.updateMatrix();parts.push({m,c});};
 const ring=(r,t,c,x,y,z,rx=0,ry=0,rz=0,arc=Math.PI*2)=>add(new T.TorusGeometry(r,t,4,16,arc),c,x,y,z,rx,ry,rz);
 const nail=(x,y,z)=>box(.035,.035,.021,P.iron,x,y,z);
 const stone=(x,y,z,w=.4)=>{const geo=new T.DodecahedronGeometry(1,0);geo.scale(w,.12,w*.7);add(geo,P.stone,x,y,z);};
 function finish(seat=true){const p=[],n=[],c=[];for(const {m,c:color}of parts){const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);geo.computeVertexNormals();const col=new T.Color(color);for(const x of geo.attributes.position.array)p.push(x);for(const x of geo.attributes.normal.array)n.push(x);for(let i=0;i<geo.attributes.position.count;i++)c.push(col.r,col.g,col.b);geo.dispose();m.geometry.dispose();}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(n,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.89,metalness:.13}));mesh.name=name+'-details';mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  if(seat)g.userData.seatHistoryTerrain=height=>{if(g.userData.terrainSeated)return;g.userData.terrainSeated=true;const c=Math.cos(g.rotation.y),s=Math.sin(g.rotation.y),base=height(g.position.x,g.position.z);const delta=(x,z)=>height(g.position.x+c*x+s*z,g.position.z-s*x+c*z)-base;const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,a.getY(i)+delta(a.getX(i),a.getZ(i)));a.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();for(const child of g.children)if(child!==mesh)child.position.y+=delta(child.position.x,child.position.z);};return g;}
 return{g,add,box,bar,beam,ring,nail,stone,finish};
}

export function timbers(T,w=3.2,h=3,{archProfile}={}){
 const k=kit(T,'mine-timbers'),{box,beam,nail,stone}=k;
 for(const s of [-1,1]){
  const x=s*w/2;beam([x,.06,0],[x-s*.065,h,0],.36,.4,P.wood);stone(x,.075,0,.37);
  // Old splits, inset grain and a lighter sistered foot repair.
  box(.085,h*.38,.08,P.light,x+s*.19,h*.2,.03,0,0,s*.035);
  for(let j=0;j<5;j++)box(.012,.22+j%2*.24,.012,P.split,x-.09+j*.04,.44+j*h*.145,.207);
  for(const y of [.31,h-.28]){box(.42,.2,.027,P.iron,x,y,.219);box(.023,.2,.42,P.iron,x+s*.21,y,0);for(const dx of [-.135,.135])for(const dy of [-.057,.057])nail(x+dx,y+dy,.242);box(.11,.055,.008,P.rust,x-.045,y+.043,.24);}
  beam([x,h-.65,.025],[x-s*.56,h-.025,.025],.13,.18,P.old);
  box(.08,.42,.075,P.light,x+s*.09,h+.12,.02,0,0,s*.09);
 }
 beam([-w/2-.3,h+.1,0],[0,h-.005,0],.37,.43,P.old);beam([0,h-.005,0],[w/2+.3,h+.11,0],.37,.43,P.wood);
 box(.65,.22,.03,P.iron,0,h+.01,.23);for(const x of [-.25,.25])nail(x,h+.01,.257);
 for(let j=0;j<8;j++)box(.16+j%3*.08,.012,.013,j%2?P.light:P.split,-w/2+.2+j*w/8,h+.02+(j%3-.7)*.065,.228,0,0,-.025);
 for(const s of [-1,1])for(let j=0;j<3;j++)box(.055,.26,.045,P.light,s*(w/2+.17+j*.035),h+.05,.16,0,0,s*.08);
 const result=k.finish();
 if(archProfile?.length>2)result.add(timberArch(T,w,h,archProfile));
 return result;
}

// GP-113: follow the actual rock lip, then close only the margins outside the old portal.
// This batch remains in the cave profile's frame; terrain seating must not warp the arch.
function timberArch(T,w,h,profile){
 const k=kit(T,'mine-outer-arch'),{box,beam,nail}=k;
 const minY=Math.min(...profile.map(p=>p[1])),maxY=Math.max(...profile.map(p=>p[1]));
 const span=y=>{const xs=[];for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];if(y>=Math.min(a[1],b[1])&&y<=Math.max(a[1],b[1])&&Math.abs(a[1]-b[1])>.00001)xs.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));}return xs.length>1?[Math.min(...xs),Math.max(...xs)]:null;};
 // Close-set horizontal lagging, worn to different shades, fills the old black side/top voids.
 for(let y=minY+.14,row=0;y<maxY;y+=.265,row++){
  const a=span(y-.125),b=span(y+.125);if(!a||!b)continue;
  const left=Math.max(a[0],b[0]),right=Math.min(a[1],b[1]);
  const bands=y<h+.2?[[left,-w/2-.04],[w/2+.04,right]]:[[left,right]];
  for(const [lo,hi]of bands){if(hi-lo<.035)continue;box(hi-lo,.257,.17,[0x554a36,0x61513a,0x6c5940,0x584d39][row%4],(lo+hi)/2,y,-.2);
   for(const x of [lo+.08,hi-.08]){if(x<=lo||x>=hi)continue;box(.022,.025,.01,P.iron,x,y,-.108);}
   if(hi-lo>.45)box(Math.min(.37,(hi-lo)*.32),.009,.012,row%2?P.light:P.split,lo+(hi-lo)*.39,y+.053,-.107);
  }
 }
 // Heavy scarf-jointed segments follow the irregular arch rather than a perfect semicircle.
 for(let i=2;i<profile.length;i+=2){const a=profile[i-2],b=profile[i];beam([a[0],a[1],-.075],[b[0],b[1],-.075],.32,.4,i%4?P.wood:P.old);}
 for(let i=2;i<profile.length-1;i+=4){const [x,y]=profile[i];box(.28,.19,.035,P.iron,x,y,.147);nail(x-.085,y,.174);nail(x+.085,y,.174);box(.08,.046,.009,P.rust,x-.04,y+.025,.168);}
 // Trussed crown and side braces join the outer rib back to the original timber doorway.
 const apex=profile.reduce((a,b)=>a[1]>b[1]?a:b);
 beam([0,h+.14,.04],[apex[0],apex[1]-.09,.04],.19,.23,P.wood);
 for(const s of [-1,1]){
  const side=profile.filter(p=>Math.sign(p[0])===s).reduce((a,b)=>Math.abs(a[1]-(h+.85))<Math.abs(b[1]-(h+.85))?a:b);
  beam([s*(w/2+.12),h+.12,.035],[side[0],side[1],.035],.22,.24,P.wood);
  const lower=span(h*.43);if(lower){const ox=s<0?lower[0]:lower[1];beam([s*(w/2+.15),.3,.035],[ox,h*.43,.035],.18,.21,P.old);}
 }
 return k.finish(false);
}

export function bars(T,w=3,h=2.9,allCut=false){
 const k=kit(T,'mine-bars-cut'),{box,bar,nail}=k;
 const rod=(a,b)=>{bar(a,b,.043,P.iron,8);const d=new T.Vector3(...b).sub(new T.Vector3(...a)).normalize().multiplyScalar(.008);bar([b[0]-d.x,b[1]-d.y,b[2]-d.z],[b[0]+d.x,b[1]+d.y,b[2]+d.z],.046,P.cut,8);};
 for(const s of [-1,1]){
  box(.13,h,.12,P.iron,s*w/2,h/2,-.035);
  for(const y of [.2,h-.18]){box(.28,.18,.1,P.rust,s*w/2,y,-.035);nail(s*w/2,y,.03);}
  for(const y of [.18,h-.22]){box(w*.22,.08,.095,P.iron,s*w*.39,y,-.025);box(.018,.08,.1,P.cut,s*w*.28,y,-.025);}
 }
 for(let i=0;i<10;i++){
  const x=(i-4.5)*w/10,cut=allCut||Math.abs(i-4.5)<=2,lo=.14+(i%3)*.035,hi=h-.24-(i%2)*.07;
  if(!cut)bar([x,0,0],[x,h,0],.043,P.iron,8);
  else{rod([x,0,0],[x,lo,.018]);rod([x,h,0],[x,hi,-.025]);}
  // Rust scales remain beside the silver, recently exposed cut ends.
  box(.051,.075,.025,P.rust,x,lo*.5,.033);
 }
 // Removed sections are piled beyond the walking gap, with irregular bent ends.
 for(const s of [-1,1])for(let j=0;j<4;j++){
  const a=[s*(w/2+.11+j*.07),.07+j*.053,.34+(j%2)*.09],b=[s*(w/2+.48+j*.055),.17+j*.055,1.55-(j%3)*.08],c=[s*(w/2+.69+j*.04),.31+j*.045,1.76-(j%3)*.09];
  bar(a,b,.043,P.iron,8);rod(b,c);bar([a[0],a[1],a[2]-.005],[a[0],a[1],a[2]+.008],.046,P.cut,8);
  const q=t=>a.map((v,i)=>v+(b[i]-v)*t);bar(q(.25),q(.42),.044,P.rust,8);
 }
 // Bolt cutters abandoned on the near-left edge, with handles splayed from the hinge.
 const cx=-w/2+.18,cz=.9;
 for(const s of [-1,1]){bar([cx+s*.025,.07,cz],[cx+s*.19,.052,cz+.65],.025,P.iron);bar([cx+s*.145,.052,cz+.48],[cx+s*.205,.052,cz+.74],.043,0x965641);bar([cx+s*.035,.071,cz],[cx+s*.10,.073,cz-.16],.042,P.iron);bar([cx+s*.10,.073,cz-.16],[cx+s*.025,.073,cz-.23],.037,P.cut);}
 box(.14,.035,.13,P.iron,cx,.073,cz);nail(cx,.095,cz);
 return k.finish();
}

export function boards(T,face){
 const k=kit(T,'iron-below'),{g,box,beam,nail}=k;
 // The old warning is a dismantled barricade leaning on its snapped uprights.
 for(const x of [-.77,.76])beam([x,.03,-.19],[x,.99,-.1],.11,.11,P.old);
 const edge=new T.MeshStandardMaterial({color:P.old,roughness:.95});
 const sign=new T.Mesh(new T.BoxGeometry(2.02,.48,.055),[edge,edge,edge,edge,face,edge]);sign.position.set(0,.94,0);sign.rotation.z=-.055;sign.name='iron-below-warning';sign.castShadow=true;g.add(sign);
 // Keep the warning face intact, with weathered edges and a pulled lower slat.
 for(const y of [.7,1.185])box(2.06,.034,.07,P.old,0,y,0,0,0,-.055);
 box(2.15,.2,.085,P.wood,.05,.4,.12,0,0,-.24);
 for(const x of [-.94,.94]){nail(x,.93-x*.055,.044);box(.065,.23,.023,P.iron,x,.94,.045);for(const y of [.87,1.01])nail(x,y,.065);}
 for(let j=0;j<6;j++)box(.11+j%2*.06,.009,.016,P.light,-.8+j*.3,.74-j*.014,.046);
 beam([-.78,.06,.17],[-.45,.43,.13],.05,.04,P.light);
 box(.41,.035,.15,P.old,.77,.035,.35,0,.2,0);box(.23,.02,.06,P.light,.42,.02,.33,0,-.3,0);
 return k.finish(false); // caller leans the entire discarded board against the rock
}

export function hikers(T,{ropePath=[]}={}){
 const k=kit(T,'hikers-cache'),{g,box,bar,ring,add}=k;
 // Neatly set-down outdoor packs, matching the hikers' ochre and blue canvas.
 for(const [x,z,c,lean]of [[-.55,.55,0xa7653f,-.08],[.16,.64,0x536d78,.05],[.86,.44,0x6e7954,-.13]]){
  const body=new T.CylinderGeometry(.245,.225,.51,8);body.scale(1,1,.68);add(body,c,x,.315,z,0,0,lean);
  box(.38,.18,.13,c,x,.24,z+.19,0,0,lean);box(.43,.1,.29,c,x,.605,z-.012,0,0,lean);
  for(const s of [-1,1]){box(.042,.43,.025,P.dark,x+s*.135,.34,z+.26);box(.065,.048,.025,0x96988a,x+s*.135,.39,z+.281);bar([x+s*.14,.52,z-.17],[x+s*.14,.18,z-.19],.031,P.dark);}
  add(new T.CylinderGeometry(.115,.115,.49,10),0x867e60,x,.735,z,0,0,Math.PI/2);for(const s of [-1,1])ring(.117,.017,P.dark,x+s*.15,.735,z,0,Math.PI/2);
  ring(.052,.013,P.dark,x,.665,z-.045);box(.11,.18,.09,0x999f91,x+.25,.28,z+.04);box(.045,.035,.045,P.dark,x+.25,.388,z+.04);
 }
 for(let j=0;j<4;j++)ring(.29-j*.045,.021,P.rope,.85,.06+j*.028,1.65,Math.PI/2);
 // Route around the existing mouth boulder rather than through its visual shell.
 const path=[[1.1,1.65],[2.3,1.75],[3.05,1.3],[3.4,.25],...ropePath];if(!ropePath.length)path.push([3.35,-.8],[3.5,-1.7]);
 for(let j=1;j<path.length;j++){
  const a=path[j-1],b=path[j],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.18));
  for(let i=0;i<n;i++){const u=i/n,v=(i+1)/n,wob=t=>Math.sin(t*Math.PI)*.065;bar([a[0]+(b[0]-a[0])*u,.036,a[1]+(b[1]-a[1])*u+wob(u)],[a[0]+(b[0]-a[0])*v,.036,a[1]+(b[1]-a[1])*v+wob(v)],.02,P.rope,5);}
 }
 // Unlit headlamp with its loose elastic strap and one climbing carabiner.
 ring(.105,.015,P.dark,.63,.025,1.1,Math.PI/2);
 const lamp=new T.Mesh(new T.BoxGeometry(.14,.08,.09),new T.MeshStandardMaterial({color:0x353c38,roughness:.8}));lamp.name='hikers-headlamp';lamp.position.set(.63,.06,1.2);lamp.castShadow=true;g.add(lamp);
 box(.074,.046,.012,0xb5c1b8,.63,.063,1.25);ring(.073,.012,P.cut,1.02,.029,1.03,Math.PI/2,0,.4,Math.PI*1.7);
 bar([1.071,.029,1.008],[1.082,.029,1.069],.008,P.iron,5);
 box(.14,.022,.19,0x928666,-.15,.025,1.16,0,.17,0);box(.065,.012,.06,P.dark,-.15,.042,1.16,0,.17,0);
 return k.finish();
}
