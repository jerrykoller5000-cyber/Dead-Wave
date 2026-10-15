// GP-19879: training-only death cleanup. These fixtures never join the player's builds.
import {bakeStatic} from '../world/bake.js';

export const CONTAINMENT=Object.freeze({perWall:1,height:5.6,scale:1.55,spinup:.4,interval:1/12,speed:100,hits:3,minSweep:1.6});
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export function containmentMounts(room,floorY){
 const out=[];
 for(const wall of ['west','east','south','north'])for(let i=0;i<CONTAINMENT.perWall;i++){
  const t=(i+.5)/CONTAINMENT.perWall,vertical=wall==='west'||wall==='east';
  out.push({wall,x:vertical?(wall==='west'?room.minX+.8:room.maxX-.8):room.minX+(room.maxX-room.minX)*t,
   z:vertical?room.minZ+(room.maxZ-room.minZ)*t:(wall==='south'?room.minZ+.8:room.maxZ-.8),
   y:floorY+CONTAINMENT.height,home:wall==='west'?Math.PI/2:wall==='east'?-Math.PI/2:wall==='north'?Math.PI:0});
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
 const parts=[];template.traverse(o=>{if(!o.isMesh||!o.visible)return;let inBarrel=false;for(let n=o;n;n=n.parent)if(n===barrel)inBarrel=true;
  const mesh=new T.InstancedMesh(o.geometry,o.material,count);mesh.name='training-containment-'+(inBarrel?'rotor':'gun');mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
  parts.push({mesh,rotor:inBarrel,local:new T.Matrix4().multiplyMatrices(inBarrel?invBarrel:inv,o.matrixWorld)});
 });
 const ownedGeo=[],ownedMat=[],mat=new T.MeshStandardMaterial({color:0x343a37,roughness:.8,metalness:.6});ownedMat.push(mat);
 function fixture(geo,material,name){ownedGeo.push(geo);const m=new T.InstancedMesh(geo,material,count);m.name=name;m.frustumCulled=false;root.add(m);return m;}
 const plate=fixture(new T.BoxGeometry(.85,.8,.14),mat,'training-containment-mount');
 const beam=fixture(new T.BoxGeometry(.19,.2,.75),mat,'training-containment-arm');
 const swivel=fixture(new T.CylinderGeometry(.22,.22,.22,12),mat,'training-containment-swivel');
 const ledMat=new T.MeshBasicMaterial({color:0xffffff});ownedMat.push(ledMat);
 const led=fixture(new T.SphereGeometry(.06,6,4),ledMat,'training-containment-status');
 const flashMat=new T.MeshBasicMaterial({color:0xffdd8b,transparent:true,opacity:.9,depthWrite:false});ownedMat.push(flashMat);
 const flash=fixture(new T.SphereGeometry(.13,6,4),flashMat,'training-containment-flash');
 const pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3(),m=new T.Matrix4(),base=new T.Matrix4(),rotor=new T.Matrix4(),ry=new T.Matrix4(),rx=new T.Matrix4(),rz=new T.Matrix4(),color=new T.Color();
 const geo=new T.BufferGeometry(),P=new T.Float32BufferAttribute(new Float32Array(256*6),3);P.setUsage(T.DynamicDrawUsage);geo.setAttribute('position',P);geo.setDrawRange(0,0);ownedGeo.push(geo);
 const tracerMat=new T.LineBasicMaterial({color:0xffc87b,transparent:true,opacity:.9,depthWrite:false});ownedMat.push(tracerMat);const tracers=new T.LineSegments(geo,tracerMat);tracers.name='training-containment-tracers';tracers.frustumCulled=false;root.add(tracers);
 function fixed(mesh,i,t,x,y,z){pos.set(t.x-tg.origin.x,t.y-tg.origin.y,t.z-tg.origin.z);q.setFromAxisAngle(new T.Vector3(0,1,0),t.home);const offset=new T.Vector3(x,y,z).applyQuaternion(q);pos.add(offset);scale.set(1,1,1);m.compose(pos,q,scale);mesh.setMatrixAt(i,m);}
 for(const [i,t]of controller.turrets.entries()){fixed(plate,i,t,0,-.25,-.69);fixed(beam,i,t,0,-.5,-.32);fixed(swivel,i,t,0,-.33,0);fixed(led,i,t,.29,-.08,-.59);}
 function draw(){
  const active=controller.active(),clock=controller.time();
  for(const [i,t]of controller.turrets.entries()){
   base.makeTranslation(t.x-tg.origin.x,t.y-tg.origin.y,t.z-tg.origin.z);ry.makeRotationY(t.yaw);rx.makeRotationX(t.pitch);base.multiply(ry).multiply(rx).multiply(m.makeScale(CONTAINMENT.scale,CONTAINMENT.scale,CONTAINMENT.scale));
   rotor.copy(base).multiply(m.makeTranslation(0,0,.27)).multiply(rz.makeRotationZ(t.spin));
   for(const part of parts){m.multiplyMatrices(part.rotor?rotor:base,part.local);part.mesh.setMatrixAt(i,m);}
   m.copy(base).multiply(rx.makeTranslation(0,0,1.01)).multiply(ry.makeScale(t.flash>0?1.2:0,t.flash>0?.8:0,t.flash>0?2:0));flash.setMatrixAt(i,m);
   color.setHex(active?(Math.sin(clock*12+i)>.1?0xff3624:0x7d170e):0x51b59a);led.setColorAt(i,color);
  }
  for(const p of parts)p.mesh.instanceMatrix.needsUpdate=true;flash.instanceMatrix.needsUpdate=true;if(led.instanceColor)led.instanceColor.needsUpdate=true;
  let n=0;for(const f of controller.flights().slice(-256)){const end=Math.min(f.age*CONTAINMENT.speed,f.duration*CONTAINMENT.speed),start=Math.max(0,end-2.5);
   for(const d of [start,end])P.setXYZ(n++,f.origin.x-tg.origin.x+f.dir.x*d,f.origin.y-tg.origin.y+f.dir.y*d,f.origin.z-tg.origin.z+f.dir.z*d);}
  P.needsUpdate=true;geo.setDrawRange(0,n);tracers.visible=n>0;
 }
 draw();let wasMoving=false;
 return {group:root,read:controller.read,start(){const ok=controller.start();draw();return ok;},reset(){controller.reset();draw();wasMoving=false;},
  tick(dt){const moving=controller.active()||controller.turrets.some(t=>t.spinVelocity>.01);controller.tick(dt);if(moving||wasMoving)draw();wasMoving=moving;},
  dispose(){controller.reset();root.removeFromParent();ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());},parts:parts.length};
}
