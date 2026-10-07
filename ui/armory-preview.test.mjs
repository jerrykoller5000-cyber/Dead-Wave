import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three/three.core.js';
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const take=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const copySource=take('function carryGunCopy(kind) {','    function carryInstanced(');
const previewSource=take('async function armoryPreview(kind, view = {}) {','    // CL-114: the finishes');
function setup(){
 const material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(.15,.3,1.7);
 const gun=new THREE.Group(),body=new THREE.Mesh(geometry,material);gun.add(body);
 const mod=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.4),material);mod.position.z=1.04;gun.add(mod);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(50,50,50),material);hidden.visible=false;gun.add(hidden);
 const light=new THREE.PointLight();gun.add(light);
 const meshes={m4:gun};let renders=0,fail=false,ready=true,disposals=0;
 for(const r of [geometry,mod.geometry,hidden.geometry,material])r.addEventListener('dispose',()=>disposals++);
 const cam=new THREE.PerspectiveCamera(20,2,.05,30),scene=new THREE.Scene();
 const pics={scene,cam,canvas:{},cache:new Map(),r:{render(scene,camera){
  renders++;if(fail)throw Error('renderer fixture failure');camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const model=scene.children[0];assert.equal(scene.children.length,1);
  model.traverseVisible(o=>{
   if(!o.isMesh)return;assert.equal(o.material,material,'shared materials preserved');
   const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);
    assert(Math.abs(v.x)<1&&Math.abs(v.y)<1&&Math.abs(v.z)<1,'entire visible gun stays in the frustum');
   }
  });
 }}};
 const copy=new Function('THREE','weaponMeshes','return ('+copySource+');')(THREE,meshes);
 const doc={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/png;base64,fixture'})};
 const preview=new Function('THREE','weaponMeshes','armoryPicsReady','armoryPics','carryGunCopy','document','return ('+previewSource+');')(
  THREE,meshes,async()=>ready,pics,copy,doc);
 return {preview,pics,gun,mod,setFail:v=>fail=v,setReady:v=>ready=v,read:()=>({renders,disposals})};
}
test('actual preview adapter fits every turn and tilt without modifying the game gun or caching angles',async()=>{
 const f=setup(),before=JSON.stringify(f.gun.toJSON());
 for(const yaw of [0,.7,Math.PI/2,Math.PI,Math.PI*1.6])for(const pitch of [-Math.PI/3,0,Math.PI/3]){
  assert.match(await f.preview('m4',{yaw,pitch}),/^data:image\/png/);
  assert.equal(f.pics.scene.children.length,0,'display copy always detached');
 }
 assert.equal(JSON.stringify(f.gun.toJSON()),before);
 assert.equal(f.pics.cache.size,0);assert.deepEqual(f.read(),{renders:15,disposals:0});
});
test('updated attachments appear on the next request; invalid input and renderer failures are isolated',async()=>{
 const f=setup();await f.preview('m4',{});const firstDistance=f.pics.cam.position.length();
 f.mod.position.z=2;await f.preview('m4',{yaw:NaN,pitch:Infinity});
 assert(f.pics.cam.position.length()>firstDistance,'fresh fitted geometry changes framing');
 assert.equal(await f.preview('missing',{}),null);
 f.setFail(true);assert.equal(await f.preview('m4',{yaw:1,pitch:.2}),null);
 assert.equal(f.pics.scene.children.length,0);assert.equal(f.read().disposals,0);
 f.setFail(false);f.setReady(false);const previous=f.read().renders;
 assert.equal(await f.preview('m4',{}),null);assert.equal(f.read().renders,previous);
});
