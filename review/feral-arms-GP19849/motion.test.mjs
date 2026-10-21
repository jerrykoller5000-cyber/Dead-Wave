import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFeralMotion,feralPose,motionIntensity,FERAL_BLUR} from '../../game/feral-motion.js';
function fixture(n=1){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,2,5);
  const actors=[];let active=true;
  for(let i=0;i<n;i++){
    const mesh=new T.Group(),bone=new T.Bone();mesh.add(bone);bone.position.y=1;
    const geometry=new T.BoxGeometry(.5,1,.4),len=geometry.attributes.position.count;
    const weights=new Float32Array(len*4);for(let j=0;j<len;j++)weights[j*4]=1;
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(len*4),4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skin=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());mesh.add(skin);scene.add(mesh);mesh.position.x=i*.7;
    mesh.updateMatrixWorld(true);skin.bind(new T.Skeleton([bone]));mesh.userData.skinMeshes=[skin];
    actors.push({typeKey:'feral',alive:true,mesh,bone,skin});
  }
  const runtime=createFeralMotion({THREE:T,scene,camera,actors:()=>actors,active:()=>active,inDomain:z=>!z.outside});
  const step=(n=1,speed=0)=>{for(let i=0;i<n;i++){for(const z of actors)z.mesh.position.z+=speed/60;runtime.update(1/60);}};
  const ghosts=()=>scene.children.filter(o=>o.userData.feralEcho);
  return {scene,camera,actors,runtime,step,ghosts,setActive:v=>active=v};
}
test('speed and sharp rotation trigger blur; still and slow remain sharp',()=>{
  assert.equal(motionIntensity(0,0),0);assert.equal(motionIntensity(2,2),0);
  assert.equal(motionIntensity(8,0),1);assert.ok(motionIntensity(0,7)>.4);
});
test('wrapped yaw never produces a false full-turn streak',()=>{
  const f=fixture();f.actors[0].mesh.rotation.y=Math.PI-.001;f.step();f.actors[0].mesh.rotation.y=-Math.PI+.001;f.step();assert.equal(f.ghosts().length,0);f.runtime.clear();
});
test('real sharp rotation without translation produces pose echoes',()=>{
  const f=fixture();f.step();f.actors[0].mesh.rotation.y=.35;f.step(2);assert.equal(f.ghosts().length,3);f.runtime.clear();
});
test('snapshot matches source world vertices and keeps the old pose',()=>{
  const f=fixture(),z=f.actors[0];z.mesh.position.set(3,-200,-632);z.mesh.rotation.y=.8;z.mesh.scale.set(.9,1.15,.9);f.camera.position.copy(z.mesh.position);z.bone.rotation.z=.4;
  f.step();f.step(1,8);const ghost=f.ghosts()[0];assert.ok(ghost);
  z.mesh.updateMatrixWorld(true);z.skin.skeleton.update();ghost.updateMatrixWorld(true);ghost.skeleton.update();
  const source=z.skin.getVertexPosition(0,new T.Vector3()).applyMatrix4(z.skin.matrixWorld);
  const old=ghost.getVertexPosition(0,new T.Vector3()).applyMatrix4(ghost.matrixWorld);
  assert.ok(source.distanceTo(old)<1e-5,`snapshot mismatch ${source.distanceTo(old)}`);
  z.bone.rotation.z=-.7;z.mesh.position.x+=1;z.mesh.updateMatrixWorld(true);z.skin.skeleton.update();
  assert.ok(ghost.getVertexPosition(0,new T.Vector3()).applyMatrix4(ghost.matrixWorld).distanceTo(old)<1e-5);
  assert.equal(ghost.geometry,z.skin.geometry);assert.equal(ghost.castShadow,false);assert.equal(ghost.material.depthWrite,false);f.runtime.clear();
});
test('stopping fades echoes within 0.20 seconds; teleports do not smear',()=>{
  const f=fixture();f.step();f.step(8,8);assert.ok(f.runtime.state().echoes>0);f.step(12);assert.equal(f.runtime.state().echoes,0);
  f.actors[0].mesh.position.z+=50;f.camera.position.z+=50;f.step();assert.equal(f.runtime.state().echoes,0);f.runtime.clear();
});
test('death, domain exit, LOD and disabled session release borrowed resources safely',()=>{
  for(const change of [f=>f.actors[0].alive=false,f=>f.actors[0].outside=true,f=>f.actors[0].farLod=true,f=>f.setActive(false),f=>f.runtime.setEnabled(false)]){
    const f=fixture();let disposed=false;f.actors[0].skin.geometry.addEventListener('dispose',()=>disposed=true);f.step();f.step(5,8);assert.equal(f.ghosts().length,3);change(f);f.step();assert.equal(f.ghosts().length,0);assert.equal(disposed,false);f.runtime.clear();
  }
});
test('only nearest eight Ferals get echoes; no other zombie kind changes',()=>{
  const f=fixture(14);f.actors.at(-1).typeKey='shambler';f.step();f.step(5,8);
  assert.equal(f.runtime.state().actors,FERAL_BLUR.maxActors);assert.equal(f.ghosts().length,24);assert.deepEqual(f.actors.at(-1).mesh.rotation.toArray(),[0,0,0,'XYZ']);f.runtime.clear();
});
test('Feral accents stay bounded and have sharp double tics without numerical instability',()=>{
  let peak=0;for(let i=0;i<1000;i++){const p=feralPose(i/120,i*.12,1,Math.sin(i));for(const [name,x] of Object.entries(p))assert.ok(Number.isFinite(x)&&Math.abs(x)<(name.startsWith('elbow')?.8:.5));peak=Math.max(peak,Math.abs(p.headLoll));}assert.ok(peak>.2);
});
