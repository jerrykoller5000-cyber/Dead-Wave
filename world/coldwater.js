// GP-110: Coldwater's static, terrain-seated ruin kit. No world RNG, colliders or text.
// The history-props wrappers preserve their original random-stream consumption.
import { mulberry } from './first-people.js';

const P={stone:[0x77766b,0x898579,0x6b7067,0x989181,0x65665c],mortar:0x55594e,
 wood:0x514737,end:0x73634c,iron:0x373b37,rust:0x704a30,soil:0x554a35,moss:0x596448,
 soot:0x24251f,bone:0xa1987f,pottery:0x857157};

// Small planar bevels catch the light like chipped fieldstone, not factory bricks.
function wornBlock(T,w,h,d){
 const H=[w/2,h/2,d/2],b=Math.min(.045,Math.min(...H)*.26),I=H.map(v=>v-b),p=[];
 const face=points=>{const a=new T.Vector3(...points[0]),u=new T.Vector3(...points[1]).sub(a),v=new T.Vector3(...points[2]).sub(a),normal=u.cross(v),center=points.reduce((n,q)=>n.add(new T.Vector3(...q)),new T.Vector3());if(normal.dot(center)<0)points.reverse();for(let i=1;i<points.length-1;i++)for(const q of [points[0],points[i],points[i+1]])p.push(...q);};
 for(let a=0;a<3;a++){const u=(a+1)%3,v=(a+2)%3;for(const s of [-1,1])face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const q=[0,0,0];q[a]=s*H[a];q[u]=x*I[u];q[v]=y*I[v];return q;}));
  for(const su of [-1,1])for(const sv of [-1,1])face([[-1,0],[1,0],[1,1],[-1,1]].map(([s,k])=>{const q=[0,0,0];q[a]=s*I[a];q[u]=su*(k?I[u]:H[u]);q[v]=sv*(k?H[v]:I[v]);return q;}));
 }
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([[x*H[0],y*I[1],z*I[2]],[x*I[0],y*H[1],z*I[2]],[x*I[0],y*I[1],z*H[2]]]);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));return geo;
}

function kit(T,name,seed){
 const g=new T.Group();g.name=name;const rnd=mulberry(seed),parts=[];
 const add=(geo,color,x,y,z,rx=0,ry=0,rz=0,shadow=true)=>{
  const m=new T.Mesh(geo);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.updateMatrix();
  parts.push({m,color,shadow});return m;
 };
 const box=(w,h,d,c,x,y,z,rx=0,ry=0,rz=0)=>add(new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz);
 const rock=(w,h,d,c,x,y,z,ry=0)=>{const geo=new T.DodecahedronGeometry(1,0);geo.scale(w*.59,h*.59,d*.59);return add(geo,c,x,y,z,0,ry,0);};
 const stone=(w,h,d,x,y,z,ry=0)=>{
  const geo=wornBlock(T,w,h,d),a=geo.attributes.position;
  // Shared-corner jitter keeps the six stone faces closed, while breaking perfect courses.
  const corners=new Map();for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),key=[x,y,z].join(',');if(!corners.has(key))corners.set(key,[(rnd()-.5)*.022,(rnd()-.5)*.018,(rnd()-.5)*.02]);const q=corners.get(key);a.setXYZ(i,x+q[0],y+q[1],z+q[2]);}geo.computeVertexNormals();
  return add(geo,y<.5&&rnd()<.3?P.mortar:P.stone[Math.floor(rnd()*P.stone.length)],x,y,z,(rnd()-.5)*.04,ry+(rnd()-.5)*.045,(rnd()-.5)*.04);
 };
 const beam=(a,b,w=.15,d=.18,c=P.wood)=>{const v=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(v);const m=new T.Mesh(new T.BoxGeometry(w,delta.length(),d));m.position.copy(v).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.updateMatrix();parts.push({m,color:c,shadow:true});};
 const ring=(r,t,c,x,y,z,rx=0,ry=0,rz=0,arc=Math.PI*2)=>add(new T.TorusGeometry(r,t,4,12,arc),c,x,y,z,rx,ry,rz);
 const cylinder=(rt,rb,h,c,x,y,z,rx=0,ry=0,rz=0)=>add(new T.CylinderGeometry(rt,rb,h,8),c,x,y,z,rx,ry,rz);
 function wall(x0,z0,x1,z1,maxH,heightAt=()=>maxH,opening=()=>false){
  const len=Math.hypot(x1-x0,z1-z0),yaw=Math.atan2(x1-x0,z1-z0),rows=Math.ceil(maxH/.4);
  for(let row=0;row<rows;row++){
   const start=row%2?-.3:0;for(let u=start;u<len;u+=.68){const lo=Math.max(0,u),hi=Math.min(len,u+.65),s=(lo+hi)/2;if(hi-lo<.12)continue;const y=.2+row*.4;
    if(y>heightAt(s/len)+.05||opening(s/len,y))continue;
    box(.31,.4,hi-lo+.045,P.mortar,x0+(x1-x0)*s/len,y,z0+(z1-z0)*s/len,0,yaw);
    stone(.5,.37,hi-lo,x0+(x1-x0)*s/len,y,z0+(z1-z0)*s/len,yaw);
   }
  }
 }
 const slab=(w,d,x,z,ry=0,c=P.stone[1])=>rock(w,.075,d,c,x,.045,z,ry);
 const rubble=(n,w,d,edge=false)=>{for(let i=0;i<n;i++){let x=(rnd()-.5)*w,z=(rnd()-.5)*d;if(edge&&Math.abs(x)<w*.32&&Math.abs(z)<d*.32)x=Math.sign(x||1)*w*.37;const r=.14+rnd()*.24;rock(r*1.5,r*.55,r,P.stone[i%5],x,r*.19,z,rnd()*6.28);}};
 const moss=(x,z,w=.5,d=.3)=>rock(w,.025,d,P.moss,x,.032,z,rnd()*6.28);
 const pot=(x,z,scale=1)=>{cylinder(.17*scale,.12*scale,.22*scale,P.pottery,x,.14*scale,z);cylinder(.12*scale,.12*scale,.012,P.soot,x,.253*scale,z);ring(.152*scale,.025*scale,P.pottery,x,.26*scale,z,Math.PI/2);rock(.14,.035,.09,P.pottery,x+.24,.028,z+.16);};
 function hearth(x,z,size=1){
  slab(1.65*size,1.4*size,x,z+.3,0,P.stone[2]);
  box(1.25*size,.045,.95*size,P.soot,x,.08,z+.15);
  for(const side of [-1,1])for(let row=0;row<3;row++)stone(.36*size,.28,.72*size,x+side*.56*size,.14+row*.3,z);
  stone(1.5*size,.26,.75*size,x,1.03,z);box(.65*size,.65,.03,P.soot,x,.43,z-.33*size);
  for(const s of [-1,1])beam([x+s*.29*size,.11,z+.31],[x+s*.29*size,.37,z+.3],.035,.035,P.iron);
  beam([x-.45*size,.12,z+.12],[x+.35*size,.17,z+.25],.075,.08,P.soot);pot(x+.8*size,z+.6,.7);
 }
 function finish(){
  const p=[],n=[],c=[],darkP=[],darkN=[];
  for(const {m,color,shadow}of parts){const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);geo.computeVertexNormals();const pos=geo.attributes.position.array,norm=geo.attributes.normal.array;
   if(shadow){const col=new T.Color(color);for(let i=0;i<pos.length;i++)p.push(pos[i]);for(let i=0;i<norm.length;i++)n.push(norm[i]);for(let i=0;i<pos.length/3;i++)c.push(col.r,col.g,col.b);}
   else{darkP.push(...pos);darkN.push(...norm);}geo.dispose();m.geometry.dispose();
  }
  const put=(pos,norm,colors,mat,label)=>{if(!pos.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));if(colors)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeBoundingBox();geo.computeBoundingSphere();const m=new T.Mesh(geo,mat);m.name=label;m.castShadow=!!colors;m.receiveShadow=!!colors;g.add(m);};
  put(p,n,c,new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:.04}),name+'-stone-timber-iron');
  if(darkP.length)put(darkP,darkN,null,new T.MeshBasicMaterial({color:0x100e0b}),'grave-shadow');
  // A single build-time seating pass. Warp only the visual batch to the existing ground;
  // never edits terrain or the parent's deterministic placement/reserved footprint.
  g.userData.seatHistoryTerrain=height=>{
   if(g.userData.terrainSeated)return;const co=Math.cos(g.rotation.y),si=Math.sin(g.rotation.y),base=height(g.position.x,g.position.z);
   for(const m of g.children){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),dy=height(g.position.x+co*x+si*z,g.position.z-si*x+co*z)-base;a.setY(i,a.getY(i)+dy);}a.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
   g.userData.terrainSeated=true;
  };
  g.userData.coldwaterVersion=1;return g;
 }
 return{g,rnd,add,box,rock,stone,beam,ring,cylinder,wall,slab,rubble,moss,pot,hearth,finish};
}

export function church(T,seed){
 const k=kit(T,'coldwater-church',seed),{stone,box,beam,wall,slab,rubble,moss,ring}=k;
 // Nave side walls: retained window openings and different collapse profiles.
 for(const s of [-1,1])wall(s*3,-5,s*3,5,4.2,u=>s<0?3.7-.85*Math.sin(u*5.1)**2:3.9-1.8*Math.sin(u*3.8)**2,
  (u,y)=>y>1.25&&y<2.9&&[.21,.5,.79].some(c=>Math.abs(u-c)<.06));
 // Back gable with an empty lancet; courses taper naturally into a broken crown.
 wall(-3,-5,3,-5,5.8,u=>4.1+(1-Math.abs(u-.5)*2)*1.65,(u,y)=>Math.abs(u-.5)<.1&&y>1.2&&y<3.6);
 wall(-3,5,3,5,2.7,u=>1.6+Math.abs(u-.5)*2.1,(u)=>Math.abs(u-.5)<.16);
 for(const x of [-1.08,1.08]){for(let j=0;j<6;j++)stone(.36,.34,.65,x,.18+j*.37,5);}
 // Steps and worn aisle; patchy remains of the original floor show through the grass.
 slab(2.3,1.0,0,5.3);for(let z=-4;z<4.6;z+=.75)for(const x of [-.44,.44])slab(.81,.68,x,z,(k.rnd()-.5)*.06);
 for(let i=0;i<14;i++)slab(.5+k.rnd()*.3,.4+k.rnd()*.4,(k.rnd()-.5)*4,(k.rnd()-.5)*8,k.rnd());
 // Altar and a plain cross: this remains a parish, not a new occult faction.
 for(const x of [-.65,.65])stone(.4,.65,.7,x,.4,-3.9);stone(2,.22,.95,0,.88,-3.9);
 box(.11,.85,.1,P.iron,0,1.42,-4);box(.47,.1,.1,P.iron,0,1.61,-4);
 stone(.44,.25,.45,0,5.49,-5);stone(.17,.72,.19,0,5.91,-5);stone(.58,.14,.21,0,6.08,-5);
 // Two broken pews and a fallen one, ordinary furnishings still discernible.
 for(const [x,z,a]of [[-1.65,-1.5,0],[1.6,.1,.08],[-1.65,2.1,.4]]){
  box(1.4,.13,.4,P.wood,x,.55,z,0,a);box(1.4,.42,.09,P.wood,x,.83,z-.2,.12,a);
  for(const s of [-1,1])box(.11,.5,.33,P.end,x+s*.48,.26,z,0,a);
 }
 beam([.6,.18,1.5],[2.2,.3,3.7],.24,.28);beam([-2.55,.25,-3],[1.9,.55,2.7],.22,.25);beam([-2.2,.12,3.8],[.9,.2,3.2],.19,.22);
 // Broken roof slates and rusted straps, kept inside the historic footprint.
 for(let i=0;i<20;i++){const x=-2.5+k.rnd()*2,z=-3.5+k.rnd()*7;box(.32,.035,.5,P.stone[2],x,.1+k.rnd()*.15,z,k.rnd()*.2,k.rnd()*3,.08);}
 for(const x of [-2.2,2.3]){box(.08,.8,.04,P.iron,x,1.7,-4.68);box(.18,.045,.07,P.rust,x,1.42,-4.67);}
 ring(.19,.024,P.iron,-1.15,.055,-3.65,Math.PI/2);k.pot(1.4,-3.7,.8);rubble(32,6.4,10.4,true);
 for(const [x,z]of [[-2.7,3.9],[2.6,-3.8],[-2.6,-1.1],[2,3.5]])moss(x,z,.9,.55);
 return k.finish();
}

export function foundation(T,seed,{w=6,d=5,door=true,variant=Math.floor(w*10)%3}={}){
 const k=kit(T,'coldwater-foundation',seed),{stone,box,beam,wall,slab,ring}=k;
 wall(-w/2,-d/2,w/2,-d/2,1.25,u=>.55+.65*Math.sin(u*4)**2);
 for(const s of [-1,1])wall(s*w/2,-d/2,s*w/2,d/2,1,u=>.34+.62*Math.cos(u*3+s)**2);
 wall(-w/2,d/2,w/2,d/2,.6,()=>.45,u=>door&&Math.abs(u-.5)<.16);
 slab(w-.7,d-.6,0,0,0,P.soil);for(let i=0;i<9;i++)slab(.5,.55,(k.rnd()-.5)*(w-1),(k.rnd()-.5)*(d-1),k.rnd());
 if(door){for(const s of [-1,1])box(.17,1.82,.18,P.wood,s*.62,.94,d/2,0,0,s*.035);beam([-.73,1.89,d/2],[.68,1.96,d/2],.15,.18);ring(.11,.023,P.iron,0,2.09,d/2+.11,0,0,Math.PI*.85,Math.PI*1.35);slab(1.3,.65,0,d/2+.15);}
 k.hearth(0,-d/2+.7,.85);
 // The caller's stable house index gives the three homes different remnants, without dice.
 if(variant===0){ // old bed frame, no mattress
  for(const s of [-1,1]){beam([s*.48+.95,.2,-.2],[s*.48+.95,.24,1.5],.045,.045,P.iron);beam([s*.48+.95,.1,-.2],[s*.48+.95,.85,-.2],.045,.045,P.iron);}
  beam([.47,.74,-.2],[1.43,.74,-.2],.04,.04,P.iron);for(let z=0;z<1.5;z+=.24)beam([.47,.22,z],[1.43,.22,z],.028,.028,P.iron);
 }else if(variant===1){ // household table, one missing leg, crockery
  box(1.1,.09,.65,P.wood,-w*.22,.42,.35,0,.15,.12);for(const x of [-w*.22-.4,-w*.22+.4])box(.09,.34,.1,P.wood,x,.19,.35);k.pot(-w*.22+.18,.35,.65);ring(.16,.025,P.bone,-w*.22-.22,.48,.4,Math.PI/2);
 }else{ // mining household: empty ore bucket and abandoned pick
  k.cylinder(.25,.2,.34,P.iron,-w*.25,.2,.2);k.cylinder(.2,.2,.015,P.soot,-w*.25,.376,.2);k.ring(.25,.022,P.rust,-w*.25,.48,.2,0,0,0,Math.PI);
  beam([.5,.12,.5],[1.4,.16,1.3],.05,.055);beam([1.16,.15,1.51],[1.58,.17,1.07],.05,.065,P.iron);
 }
 for(let i=0;i<4;i++)beam([-.5+k.rnd()*(w*.3),.12,-.5+k.rnd()*d*.4],[-w*.36+k.rnd(),.2,-d*.3+k.rnd()],.15,.17);
 k.rubble(15,w+.25,d+.25,true);for(let i=0;i<4;i++)k.moss((i%2?1:-1)*w*.43,(k.rnd()-.5)*d,.65,.42);
 return k.finish();
}

export function chimney(T,seed){
 const k=kit(T,'coldwater-chimney',seed);k.hearth(0,0,1);
 for(let row=0;row<11;row++){const y=1.35+row*.34,w=1.25-row*.038;for(const s of [-1,1])k.stone(w*.48,.31,.74-row*.018,s*w*.255,y,0);}
 for(const [x,z,h]of [[-.22,0,.33],[.24,-.11,.2],[.1,.2,.12]])k.stone(.4,h,.39,x,4.87+h/2,z);
 // Smoke left irregular stains around the mouth, not a flat black stripe up the stack.
 for(let i=0;i<5;i++)k.rock(.21-i*.025,.32,.025,i%2?P.soot:P.mortar,(i%2-.5)*.14,1.15+i*.28,.37-i*.012);
 k.slab(1.9,1.8,0,.4,0,P.soil);k.rubble(16,2.1,1.8,true);
 k.beam([-.7,.11,.9],[.8,.12,.95],.13,.14,P.soot);return k.finish();
}

export function grave(T,seed,opened=false){
 const k=kit(T,opened?'open-grave':'iron-banded-grave',seed),{box,rock,beam,ring}=k;
 // Raised, slumped earth makes a visible recess above unmodified terrain. There is
 // no deceptive terrain cut or hidden collision pit; all seating happens once.
 for(const s of [-1,1])for(let i=0;i<6;i++){const z=-.98+i*.39;rock(.45,.28,.5,P.soil,s*.56,.14,z);}
 for(const z of [-1.15,1.15])rock(1.12,.23,.36,P.soil,0,.13,z);
 if(!opened){
  for(let i=0;i<5;i++)box(.142,.09,1.97,i%2?P.wood:P.end,(i-2)*.148,.23,0,0,0,.025);
  for(const z of [-.63,.55]){
   box(.84,.055,.13,P.iron,0,.303,z,0,0,.025);
   for(const s of [-1,1]){box(.06,.23,.13,P.iron,s*.42,.18,z);box(.065,.028,.06,P.rust,s*.29,.34,z);}
  }
  for(const s of [-1,1])ring(.09,.016,P.iron,s*.4,.21,.1,0,Math.PI/2);
  for(const z of [-.8,.88])rock(.65,.065,.2,P.soil,.05,.3,z);
 }else{
  k.add(new T.BoxGeometry(.83,.018,1.99),0x100e0b,0,.047,0,0,0,0,false);
  // Visible inner earth/wood sides and splintered boards pushed up and out.
  for(const s of [-1,1])box(.055,.23,2.02,P.wood,s*.44,.17,0);
  for(const z of [-1,1])box(.87,.2,.07,P.wood,0,.16,z);
  for(const [x,z,a,len]of [[-.54,-.25,1.05,1.65],[-.74,.5,.8,1.05],[.6,.15,-.85,1.7],[.88,-.65,-.4,.75]]){
   box(.21,.055,len,P.wood,x,.44,z,.1,.08,a);
   beam([x,.44,z+len*.38],[x+.13,.71,z+len*.48],.035,.04,P.end);
  }
  // Torn straps bow away from the hole, with exposed rivets and bent nails.
  for(const z of [-.63,.55])for(const s of [-1,1]){
   beam([s*.4,.25,z],[s*.47,.62,z],.08,.06,P.iron);beam([s*.47,.62,z],[s*.73,.75,z+.12],.08,.055,P.iron);
   beam([s*.57,.5,z],[s*.69,.61,z],.016,.018,P.rust);
  }
  for(let i=0;i<12;i++){const a=k.rnd()*6.28,r=.83+k.rnd()*.25;rock(.17+k.rnd()*.2,.13,.22,P.soil,Math.cos(a)*r,.09,Math.sin(a)*r*1.3,a);}
 }
 // A worn footstone, never a new named victim or explanatory text.
 k.stone(.36,.24,.15,-.14,.13,-1.31);return k.finish();
}
