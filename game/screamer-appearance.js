// GP-19872: prepare the real concept surfaces before the rigid skin merge.
import {screamerProtected} from './screamer-behavior.js';
const dark=0x000000,tongueHex=[0xae6671,0xd89299];
const VAPOR_PUFFS=36; // same instanced draw: half cling to the body, half trail behind
export function prepareScreamerAppearance(T,g,s=1){
 const u=g.userData;if(u.typeKey!=='screamer'||u.screamerJaw)return;
 const eyes=new Set([...(u.eyes||[]),u.eyeBatch].filter(Boolean)),materials=new Map(),tongueColors=tongueHex.map(h=>new T.Color(h)),bruise=new T.Color(0x8e6f77);
 const jawColors=[0xb4a592,0x664036,0xc7bd9f].map(h=>new T.Color(h));
 const toothColors=[0xc8bea0,0xc7bd9f].map(h=>new T.Color(h)),bone=new T.Color(0x5e665c);
 const jaw=new T.Group(),tongue=new T.Group();jaw.name='screamer-jaw';jaw.position.set(0,-.10*s,.06*s);u.head.add(jaw);
 tongue.name='screamer-tongue';tongue.position.set(0,-.11*s,.13*s);jaw.add(tongue);
 const clone=m=>{if(!materials.has(m)){const c=m.clone();if(c.emissive)c.emissive.setHex(0);c.emissiveIntensity=0;materials.set(m,c);}return materials.get(m);};
 const part=(src,ids)=>{const geo=new T.BufferGeometry();for(const [name,a]of Object.entries(src.attributes)){const data=new a.array.constructor(ids.length*a.itemSize);ids.forEach((v,i)=>{for(let j=0;j<a.itemSize;j++)data[i*a.itemSize+j]=a.array[v*a.itemSize+j];});geo.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}geo.computeBoundingSphere();return geo;};
 const meshes=[];g.traverse(o=>{if(o.isMesh&&!eyes.has(o))meshes.push(o);});
 for(const m of meshes){
  const src=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone(),C=src.attributes.color,P=src.attributes.position,mat=clone(m.material);
  const matches=(i,colors)=>colors.some(c=>C?Math.abs(C.getX(i)-c.r)+Math.abs(C.getY(i)-c.g)+Math.abs(C.getZ(i)-c.b)<.00001:m.material.color?.equals(c));
  const mask=Array.from({length:P.count},(_,i)=>matches(i,tongueColors));
  const jawMask=Array.from({length:P.count},(_,i)=>matches(i,jawColors));
  const face=m.parent===u.head;
  if(C){for(let i=0;i<C.count;i++){
   if(mask[i])C.setXYZ(i,bruise.r,bruise.g,bruise.b);
   else if(face&&matches(i,toothColors))C.setXYZ(i,bone.r,bone.g,bone.b);
   else if(face){const value=(C.getX(i)+C.getY(i)+C.getZ(i))/3*.045;C.setXYZ(i,value*.85,value,value*.93);}
   else C.setXYZ(i,0,0,0);
  }mat.color.setHex(0xffffff);mat.vertexColors=true;}
  else mat.color.setHex(mask[0]?0x8e6f77:dark);
  m.material=mat;
  if(m.parent!==u.head){m.geometry=src;continue;}
  m.updateMatrix();src.applyMatrix4(m.matrix);const upper=[],lower=[],tip=[];
  // Whole authored surfaces follow the hinge. A height cut through triangles tore
  // the cheek and mouth wall open as the old jaw rotated.
  for(let i=0;i<P.count;i+=3)(mask[i]?tip:jawMask[i]?lower:upper).push(i,i+1,i+2);
  for(const [parent,ids]of [[jaw,lower],[tongue,tip]])if(ids.length){const geo=part(src,ids),piece=new T.Mesh(geo,mat);piece.position.copy(jaw.position).multiplyScalar(-1);if(parent===tongue)piece.position.sub(tongue.position);piece.castShadow=true;parent.add(piece);}
  if(upper.length){m.geometry=part(src,upper);m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.setScalar(1);}else m.removeFromParent();src.dispose();
 }
 // A statue, a newly spawned body and a restored reaction also need her own
 // resting silhouette. This runs before the game's rest snapshot and skin bind.
 for(const [i,arm]of [u.armLG,u.armRG].entries())if(arm){
  const side=i?-1:1;arm.rotation.set(.28,side*.06,-side*.28);
  arm.userData.baseRotX=.28;arm.userData.elbowG?.rotation.set(-.12,0,0);
 }
 u.bodyMats=(u.bodyMats||[]).map(m=>materials.get(m)||m);u.screamerJaw=jaw;u.screamerTongue=tongue;u.concept.skin=0;u.skinColor=0;
}
let mistTexture=null;
function vaporTexture(T){
 if(mistTexture)return mistTexture;const n=64,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(x+.5)/n*2-1,dy=(y+.5)/n*2-1,r=Math.hypot(dx,dy),cloud=.78+.22*Math.sin(x*.29+y*.17)*Math.sin(y*.23-x*.19),i=(y*n+x)*4;
  data[i]=data[i+1]=data[i+2]=0;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),.85)*cloud);}
 mistTexture=new T.DataTexture(data,n,n);mistTexture.needsUpdate=true;return mistTexture;
}
export function attachScreamerAppearance(T,N,g,s=1){
 if(g.userData.typeKey!=='screamer'||g.userData.screamerFx)return;
 const clock=N.uniform(0),strength=N.uniform(1),hit=N.uniform(0);
 const mat=new T.MeshBasicNodeMaterial({color:0x8a9d90,transparent:true,depthWrite:false,toneMapped:false});
 // A loose sonic membrane: patchy arcs instead of a continuous tinted shell.
 const P=N.positionGeometry,F=N.varying(P);
 const wobble=N.sin(P.y.mul(5).add(P.x.mul(3)).sub(clock.mul(1.6)))
  .mul(N.cos(P.z.mul(4).add(P.x.mul(2)).add(clock.mul(.9)))).mul(.14)
  .add(N.sin(P.z.mul(7).sub(P.x.mul(5)).add(clock.mul(1.2))).mul(.05));
 mat.positionNode=P.mul(N.vec3(wobble.add(1),wobble.mul(.32).add(1),wobble.mul(.85).add(1)))
  .add(N.vec3(N.sin(P.y.mul(4).add(clock)).mul(.035),0,N.sin(P.y.mul(5).sub(clock.mul(.8))).mul(.04)));
 const rim=N.float(1).sub(N.abs(N.dot(N.normalWorld,N.normalize(N.cameraPosition.sub(N.positionWorld))))).pow(3.2);
 const patches=N.sin(F.x.mul(5).add(F.y.mul(3)).add(clock.mul(.8)))
  .mul(N.cos(F.z.mul(6).sub(F.y.mul(5)).sub(clock.mul(.5))));
 const coverage=N.smoothstep(-.3,.45,patches);
 const wave=N.sin(F.y.mul(22).add(F.x.mul(5)).add(N.sin(F.z.mul(5).sub(clock)).mul(2)).sub(clock.mul(5))).abs().pow(18);
 const pulse=N.sin(clock.mul(Math.PI)).mul(.5).add(.5); // two-second breathing cycle
 mat.opacityNode=rim.mul(.10).add(wave.mul(.034)).add(hit.mul(.035)).min(.14)
  .mul(coverage).mul(strength).mul(pulse.mul(.45).add(.55));
 const hull=new T.SphereGeometry(1,12,8);hull.computeBoundingSphere();hull.boundingSphere.radius=1.3; // includes shader displacement
 const shield=new T.Mesh(hull,mat);shield.name='screamer-sonic-shield';shield.position.y=1.10*s;shield.scale.set(.72*s,1.13*s,.69*s);shield.castShadow=false;g.add(shield);
 const geo=new T.PlaneGeometry(1,1),fades=new Float32Array(VAPOR_PUFFS);geo.setAttribute('mistOpacity',new T.InstancedBufferAttribute(fades,1));
 const smokeMat=new T.MeshBasicNodeMaterial({color:0x000000,transparent:true,depthWrite:false,toneMapped:false});smokeMat.opacityNode=N.texture(vaporTexture(T),N.uv()).a.mul(N.attribute('mistOpacity','float'));
 const smoke=new T.InstancedMesh(geo,smokeMat,VAPOR_PUFFS);smoke.name='screamer-black-vapor';smoke.frustumCulled=false;smoke.castShadow=false;smoke.instanceMatrix.setUsage?.(T.DynamicDrawUsage);g.add(smoke);
 const M=new T.Matrix4(),inv=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),aq=new T.Quaternion(),scale=new T.Vector3();
 const particles=Array.from({length:VAPOR_PUFFS},(_,i)=>({cycle:-1,origin:new T.Vector3(),phase:i*.61803398875%1,angle:i*2.399963}));
 const fx={clock:0,shield,smoke,particles,hide(){shield.visible=smoke.visible=false;fx.clock=0;for(const p of particles)p.cycle=-1;strength.value=0;},update(z,dt,camera){
  const show=z.alive&&!z.below&&!z.farLod;smoke.visible=show;shield.visible=show&&!z.partsLost?.head;
  if(!show){shield.visible=false;return;}fx.clock+=Math.min(.1,Math.max(0,dt));clock.value=fx.clock;
  const target=screamerProtected(z)?1:0;strength.value=target?Math.min(1,strength.value+dt*5):Math.max(0,strength.value-dt*9);hit.value=z.sonicHitT>0?z.sonicHitT/.18:0;
  shield.visible&&=strength.value>.001;shield.castShadow=smoke.castShadow=false;
  const breath=Math.sin(fx.clock*Math.PI)*.018;
  shield.scale.set((.72+breath)*s,(1.13+breath*.5)*s,(.69+breath)*s);
  g.updateWorldMatrix(true,false);inv.copy(g.matrixWorld).invert();g.getWorldQuaternion(aq).invert();camera.getWorldQuaternion(q);q.premultiply(aq);
  for(let i=0;i<particles.length;i++){const puff=particles[i],life=1.55,phase=fx.clock/life+puff.phase,cycle=Math.floor(phase),age=phase-cycle;
   if(puff.cycle!==cycle||i%2===0){puff.cycle=cycle;puff.origin.set(Math.cos(puff.angle)*.31*s,(.30+(i%6)*.21)*s,Math.sin(puff.angle)*.29*s).applyMatrix4(g.matrixWorld);}
   p.copy(puff.origin);p.y+=age*.70*s;p.x+=Math.sin(age*3+puff.angle)*age*.2*s;p.z+=Math.cos(age*3+puff.angle)*age*.2*s;p.applyMatrix4(inv);
   const size=(.58+age*.85)*s;scale.set(size,size,1);M.compose(p,q,scale);smoke.setMatrixAt(i,M);
   const face=Math.max(0,1-Math.abs(p.y/s-1.72)/.25); // eyes still peek through the shroud
   fades[i]=Math.sin(age*Math.PI)*.88*(1-.4*face);
  }
  smoke.instanceMatrix.needsUpdate=true;geo.attributes.mistOpacity.needsUpdate=true;
 }};g.userData.screamerFx=fx;
}
export function updateScreamerAppearance(z,dt,camera){if(z.typeKey==='screamer')z.mesh.userData.screamerFx?.update(z,dt,camera);}
