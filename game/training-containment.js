// GP-19879: training-only death cleanup. These fixtures never join the player's builds.
import {bakeStatic} from '../world/bake.js';

export const CONTAINMENT=Object.freeze({perWall:1,height:5.6,gateHeight:9.65,scale:1.55,spinup:.4,interval:1/12,speed:100,hits:3,minSweep:1.6});
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export function containmentMounts(room,floorY){
 const out=[];
 for(const wall of ['west','east','south','north'])for(let i=0;i<CONTAINMENT.perWall;i++){
  const t=(i+.5)/CONTAINMENT.perWall,vertical=wall==='west'||wall==='east';
  out.push({wall,x:vertical?(wall==='west'?room.minX+.8:room.maxX-.8):room.minX+(room.maxX-room.minX)*t,
   z:vertical?room.minZ+(room.maxZ-room.minZ)*t:(wall==='south'?room.minZ+.8:room.maxZ-.8),
   y:floorY+(wall==='north'?CONTAINMENT.gateHeight:CONTAINMENT.height),home:wall==='west'?Math.PI/2:wall==='east'?-Math.PI/2:wall==='north'?Math.PI:0});
 }
 return out;
}

export function createContainmentController({room,floorY,getZombies,onHit=()=>{},onShot=()=>{}}){
 const turrets=containmentMounts(room,floorY).map((p,i)=>({...p,yaw:p.home,pitch:.18,spin:0,spinVelocity:0,flash:0,cd:i*.003,target:null,fired:0}));
 let active=false,clock=0,hits=new WeakMap(),flights=[],shots=0,impacts=0;
 const belongs=z=>!!z?.alive&&!!z.mesh&&(z.trainingZ||Math.abs(z.mesh.position.y-floorY)<12&&z.mesh.position.x>=room.minX&&z.mesh.position.x<=room.maxX&&z.mesh.position.z>=room.minZ&&z.mesh.position.z<=room.maxZ);
 const occupants=()=>getZombies().filter(belongs);
 const read=()=>({active,clock,remaining:occupants().length,shots,impacts,inFlight:flights.length,turrets:turrets.map(t=>({wall:t.wall,x:t.x,y:t.y,z:t.z,yaw:t.yaw,pitch:t.pitch,spin:t.spin,fired:t.fired}))});
 function reset(){active=false;clock=0;hits=new WeakMap();flights=[];shots=impacts=0;for(const [i,t]of turrets.entries()){t.yaw=t.home;t.pitch=.18;t.spin=t.spinVelocity=t.flash=t.fired=0;t.cd=i*.003;t.target=null;}}
 function start(){if(active)return false;reset();if(!occupants().length)return false;active=true;return true;}
 function tick(dt){
  if(!(dt>0)||!Number.isFinite(dt))return;dt=Math.min(dt,.1);
  if(!active&&!flights.length&&turrets.every(t=>t.spinVelocity<.01))return;
  if(active)clock+=dt;
  const live=occupants(),set=new Set(live);
  for(let i=flights.length-1;i>=0;i--){const f=flights[i];f.age+=dt;if(f.age>=f.duration){flights.splice(i,1);if(active&&set.has(f.target)&&belongs(f.target)&&f.target.mesh===f.mesh){const n=(hits.get(f.target)||0)+1;hits.set(f.target,n);impacts++;onHit(f.target,f,n);}}}
  const eligible=live.filter(z=>belongs(z)&&!z.trainingEntry&&z.mesh.visible!==false);
  for(const [i,t]of turrets.entries()){
   t.flash=Math.max(0,t.flash-dt);t.spinVelocity+=(Number(active)*45-t.spinVelocity)*(1-Math.exp(-8*dt));t.spin=(t.spin+t.spinVelocity*dt)%(Math.PI*2);
   if(!active){t.target=null;continue;}
   if(!eligible.includes(t.target)||!t.target.alive)t.target=eligible[(i+Math.floor(clock*.7))%eligible.length]||null;
   const z=t.target;if(!z||!belongs(z))continue;
   const p=z.mesh.position,dx=p.x-t.x,dz=p.z-t.z,dy=p.y+Math.max(.15,(z.hitH||1.4)*.5)-t.y;
   const yaw=Math.atan2(dx,dz),pitch=Math.atan2(-dy,Math.hypot(dx,dz));
   t.yaw=angle(t.yaw+angle(yaw-t.yaw)*(1-Math.exp(-14*dt)));t.pitch+=(pitch-t.pitch)*(1-Math.exp(-14*dt));
   if(clock<CONTAINMENT.spinup)continue;
   t.cd-=dt;if(t.cd>0||Math.abs(angle(yaw-t.yaw))>.025||Math.abs(pitch-t.pitch)>.025)continue;
   t.yaw=yaw;t.pitch=pitch;
   t.cd+=CONTAINMENT.interval;t.flash=.065;t.fired++;shots++;
   const cp=Math.cos(t.pitch),dir={x:Math.sin(t.yaw)*cp,y:-Math.sin(t.pitch),z:Math.cos(t.yaw)*cp};
   const muzzle=1.01*CONTAINMENT.scale,origin={x:t.x+dir.x*muzzle,y:t.y+dir.y*muzzle,z:t.z+dir.z*muzzle};
   const distance=Math.hypot(p.x-origin.x,p.y+Math.max(.15,(z.hitH||1.4)*.5)-origin.y,p.z-origin.z);
   // A cleanup burst owns its target, rather than feeding ordinary combat rounds through the recovered player.
   const f={origin,dir,target:z,mesh:z.mesh,age:0,duration:Math.max(.03,distance/CONTAINMENT.speed)};flights.push(f);onShot(t,f);
  }
  if(active&&clock>=CONTAINMENT.minSweep&&!occupants().length&&!flights.length){active=false;for(const t of turrets)t.target=null;}
 }
 return {start,reset,tick,read,turrets,active:()=>active,time:()=>clock,flights:()=>flights};
}

export function createTrainingContainment(T,tg,{makeGun,getZombies,onHit,onShot}){
 const root=new T.Group();root.name='training-containment';tg.group.add(root);
 const controller=createContainmentController({room:tg.zombieRoom,floorY:tg.floorY,getZombies,onHit,onShot});
 const count=controller.turrets.length,template=makeGun(),barrel=template.userData.barrelAssembly;
 for(const key of ['flash','flashLight','laser'])template.userData[key]?.removeFromParent();
 bakeStatic(T,barrel,{enter:()=>true});bakeStatic(T,template,{skip:o=>o===barrel,enter:()=>true});template.updateMatrixWorld(true);
 const inv=new T.Matrix4().copy(template.matrixWorld).invert(),invBarrel=new T.Matrix4().copy(barrel.matrixWorld).invert();
 // GP-19881: each instance follows its own wall cutaway; source gun surfaces stay private.
 const ownedGeo=[],ownedMat=[],N=T.TSL,fadeValues=new Float32Array(count).fill(1);
 const fadeAttribute=new T.InstancedBufferAttribute(fadeValues,1);fadeAttribute.setUsage(T.DynamicDrawUsage);
 const fadeGeometries=new Map(),fadeMaterials=new Map();
 function fadedGeometry(source){if(!fadeGeometries.has(source)){const g=source.clone();g.setAttribute('containmentOpacity',fadeAttribute);ownedGeo.push(g);fadeGeometries.set(source,g);}return fadeGeometries.get(source);}
 function fadedMaterial(source){if(!fadeMaterials.has(source)){
  const basic=source.isMeshBasicMaterial||source.isMeshBasicNodeMaterial;
  const mat=source.isNodeMaterial?source.clone():new (basic?T.MeshBasicNodeMaterial:T.MeshStandardNodeMaterial)();
  if(!source.isNodeMaterial)(basic?T.MeshBasicMaterial:T.MeshStandardMaterial).prototype.copy.call(mat,source);
  mat.opacityNode=N.attribute('containmentOpacity','float').mul(source.opacityNode||N.materialOpacity);
  mat.transparent=true;mat.depthWrite=false; // GP-19883: stable fade pipeline, including solid instances
  ownedMat.push(mat);fadeMaterials.set(source,mat);
 }return fadeMaterials.get(source);}
 function syncCutaway(){
  const walls=tg.cutaway?.state()||[];let changed=false;
  for(const [i,t]of controller.turrets.entries()){const opacity=walls.find(e=>e.side===t.wall)?.opacity??1;if(Math.abs(fadeValues[i]-opacity)>1e-6){fadeValues[i]=opacity;changed=true;}}
  if(changed)fadeAttribute.needsUpdate=true;
 }
 const parts=[];template.traverse(o=>{if(!o.isMesh||!o.visible)return;let inBarrel=false;for(let n=o;n;n=n.parent)if(n===barrel)inBarrel=true;
  const mesh=new T.InstancedMesh(fadedGeometry(o.geometry),fadedMaterial(o.material),count);mesh.name='training-containment-'+(inBarrel?'rotor':'gun');mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
  parts.push({mesh,rotor:inBarrel,local:new T.Matrix4().multiplyMatrices(inBarrel?invBarrel:inv,o.matrixWorld)});
 });
 const mat=new T.MeshStandardMaterial({color:0x343a37,roughness:.8,metalness:.6});ownedMat.push(mat);
 function fixture(geo,material,name){ownedGeo.push(geo);geo.setAttribute('containmentOpacity',fadeAttribute);const m=new T.InstancedMesh(geo,fadedMaterial(material),count);m.name=name;m.frustumCulled=false;root.add(m);return m;}
 // CC-363 (D-218 E3, for Claude 7): a real wall mount, in three rigid sets (metres, the mount's own frame: z out of the
 // wall, the wall face at z -.80, the gun's aim pivot at 0). FIXED: a wall plate flush on the tile with four bolts,
 // a box arm and a diagonal gusset, a cable conduit and junction box, the turntable base. YAW: the turntable ring, a
 // pintle post and a fork carrying the elevation axle .26 m under the receiver. PITCH: a cradle bolted under the
 // receiver (its lugs round the axle) and a bearing collar where the barrel cluster meets the face plate. The gun
 // elevates about that axle, so nothing cuts into anything at any aim. One merged geometry per set (3 draws, was 3).
 const AXLE=.26;
 function merged(parts){const pos=[],nor=[];for(const [geo,x,y,z,rx=0,ry=0,rz=0]of parts){const g=geo.index?geo.toNonIndexed():geo;
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1)));
  pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);geo.dispose();if(g!==geo)g.dispose();}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));return out;}
 const B=(w,h,d)=>new T.BoxGeometry(w,h,d),C=(r0,r1,h,n=14)=>new T.CylinderGeometry(r0,r1,h,n);
 const brace=Math.hypot(.48,.34),braceTilt=Math.atan2(.34,.48);
 const mountGeo=merged([
  [B(.56,.70,.03),0,-.80,-.785],                                                  // wall plate, back face on the tile
  ...[[-.21,-.51],[.21,-.51],[-.21,-1.09],[.21,-1.09]].map(([x,y])=>[C(.024,.024,.02,8),x,y,-.76,Math.PI/2]),   // bolts
  [B(.16,.14,.84),0,-.64,-.37],                                                   // box arm out to the turntable
  [B(.10,.08,brace),0,(-1.05-.71)/2,(-.77-.30)/2,-braceTilt],                      // gusset brace, plate to arm
  [C(.15,.15,.05,20),0,-.545,0],                                                  // turntable base
  [B(.034,.034,.70),.10,-.60,-.40],                                               // conduit along the arm
  [B(.034,.30,.034),.10,-.76,-.76],                                               //   down the plate
  [B(.13,.13,.07),.16,-.97,-.735],                                                // junction box
 ]);
 const yokeGeo=merged([
  [C(.13,.13,.04,20),0,-.50,0],                                                   // turntable ring
  [C(.055,.055,.15,12),0,-.405,0],                                                // pintle post
  [B(.30,.04,.12),0,-.35,0],                                                      // fork base
  ...[-1,1].map(sx=>[B(.03,.11,.10),sx*.135,-.28,0]),                             // fork cheeks
  [C(.025,.025,.30,10),0,-AXLE,0,0,0,Math.PI/2],                                  // elevation axle
 ]);
 const cradleGeo=merged([
  [B(.30,.03,.40),0,-.215,0],                                                     // cradle plate under the receiver (its floor is y -.20)
  ...[-1,1].map(sx=>[B(.03,.08,.12),sx*.09,-.25,0]),                              // lugs round the axle
  [new T.CylinderGeometry(.07,.07,.045,14,1,true),0,0,.4275,Math.PI/2],              // bearing collar (a sleeve), face plate to barrel cluster
 ]);
 const mount=fixture(mountGeo,mat,'training-containment-mount');
 const yoke=fixture(yokeGeo,mat,'training-containment-yoke');
 const cradle=fixture(cradleGeo,mat,'training-containment-cradle');
 const ledMat=new T.MeshBasicMaterial({color:0xffffff});ownedMat.push(ledMat);
 const led=fixture(new T.SphereGeometry(.03,8,6),ledMat,'training-containment-status');
 const flashMat=new T.MeshBasicMaterial({color:0xffdd8b,transparent:true,opacity:.9,depthWrite:false});ownedMat.push(flashMat);
 const flash=fixture(new T.SphereGeometry(.13,6,4),flashMat,'training-containment-flash');
 const pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3(),m=new T.Matrix4(),base=new T.Matrix4(),rotor=new T.Matrix4(),ry=new T.Matrix4(),rx=new T.Matrix4(),rz=new T.Matrix4(),color=new T.Color();
 // the barrel cluster turns on its own bearing: its true place in the gun, not a fixed .27 guess
 const barrelLocal=new T.Matrix4().multiplyMatrices(inv,barrel.matrixWorld),aim=new T.Matrix4();
 const geo=new T.BufferGeometry(),P=new T.Float32BufferAttribute(new Float32Array(256*6),3);P.setUsage(T.DynamicDrawUsage);geo.setAttribute('position',P);geo.setDrawRange(0,0);ownedGeo.push(geo);
 const tracerMat=new T.LineBasicMaterial({color:0xffc87b,transparent:true,opacity:.9,depthWrite:false});ownedMat.push(tracerMat);const tracers=new T.LineSegments(geo,tracerMat);tracers.name='training-containment-tracers';tracers.frustumCulled=false;root.add(tracers);
 function fixed(mesh,i,t,x,y,z){pos.set(t.x-tg.origin.x,t.y-tg.origin.y,t.z-tg.origin.z);q.setFromAxisAngle(new T.Vector3(0,1,0),t.home);const offset=new T.Vector3(x,y,z).applyQuaternion(q);pos.add(offset);scale.set(1,1,1);m.compose(pos,q,scale);mesh.setMatrixAt(i,m);}
 for(const [i,t]of controller.turrets.entries()){fixed(mount,i,t,0,0,0);fixed(led,i,t,.16,-.95,-.695);}
 function draw(){
  syncCutaway();
  const active=controller.active(),clock=controller.time();
  for(const [i,t]of controller.turrets.entries()){
   base.makeTranslation(t.x-tg.origin.x,t.y-tg.origin.y,t.z-tg.origin.z);ry.makeRotationY(t.yaw);base.multiply(ry);yoke.setMatrixAt(i,base);
   rx.makeRotationX(t.pitch);base.multiply(m.makeTranslation(0,-AXLE,0)).multiply(rx).multiply(m.makeTranslation(0,AXLE,0));aim.copy(base);cradle.setMatrixAt(i,aim);
   base.multiply(m.makeScale(CONTAINMENT.scale,CONTAINMENT.scale,CONTAINMENT.scale));
   rotor.copy(base).multiply(barrelLocal).multiply(rz.makeRotationZ(t.spin));
   for(const part of parts){m.multiplyMatrices(part.rotor?rotor:base,part.local);part.mesh.setMatrixAt(i,m);}
   m.copy(base).multiply(rx.makeTranslation(0,0,1.01)).multiply(ry.makeScale(t.flash>0?1.2:0,t.flash>0?.8:0,t.flash>0?2:0));flash.setMatrixAt(i,m);
   color.setHex(active?(Math.sin(clock*12+i)>.1?0xff3624:0x7d170e):0x51b59a);led.setColorAt(i,color);
  }
  for(const p of parts)p.mesh.instanceMatrix.needsUpdate=true;flash.instanceMatrix.needsUpdate=true;yoke.instanceMatrix.needsUpdate=true;cradle.instanceMatrix.needsUpdate=true;if(led.instanceColor)led.instanceColor.needsUpdate=true;
  let n=0;for(const f of controller.flights().slice(-256)){const end=Math.min(f.age*CONTAINMENT.speed,f.duration*CONTAINMENT.speed),start=Math.max(0,end-2.5);
   for(const d of [start,end])P.setXYZ(n++,f.origin.x-tg.origin.x+f.dir.x*d,f.origin.y-tg.origin.y+f.dir.y*d,f.origin.z-tg.origin.z+f.dir.z*d);}
  P.needsUpdate=true;geo.setDrawRange(0,n);tracers.visible=n>0;
 }
 draw();let wasMoving=false;
 return {group:root,read:controller.read,start(){const ok=controller.start();draw();return ok;},reset(){controller.reset();draw();wasMoving=false;},
  tick(dt){syncCutaway();const moving=controller.active()||controller.turrets.some(t=>t.spinVelocity>.01);controller.tick(dt);if(moving||wasMoving)draw();wasMoving=moving;},
  dispose(){controller.reset();root.removeFromParent();ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());},parts:parts.length};
}
