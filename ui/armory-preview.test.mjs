import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three/three.core.js';
import {createArmoryPreview} from './armory-preview.js';
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
 const copy=new Function('THREE','weaponMeshes','cloneLean','return ('+copySource+');')(THREE,meshes,obj=>obj.clone(true));
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

test('workbench zoom responds to wheel and pinch, eases to clamps, and resets for another gun',async()=>{
 const frames=new Map();let frameId=0,now=0;
 const host={requestAnimationFrame(fn){frames.set(++frameId,fn);return frameId;},cancelAnimationFrame(id){frames.delete(id);}};
 const doc={defaultView:host,createElement(){
  const handlers=new Map();return {dataset:{},style:{},children:[],attributes:new Map(),hidden:false,
   append(...nodes){this.children.push(...nodes);},addEventListener(type,fn){handlers.set(type,fn);},
   fire(type,event={}){handlers.get(type)?.({preventDefault(){},stopPropagation(){},...event});},
   setAttribute(key,value){this.attributes.set(key,value);},removeAttribute(key){this.attributes.delete(key);},
   setPointerCapture(){},hasPointerCapture(){return false;},focus(){},remove(){}};
 }};
 const views=[];
 const preview=createArmoryPreview({doc,render:async(_gun,view)=>{views.push(view);return 'data:image/png;base64,fixture';},
  labels:{hint:'hint',left:'left',front:'front',right:'right',unavailable:'unavailable'}});
 const stage=preview.element.children[0];
 async function advance(count=30){for(let i=0;i<count;i++){
  if(!frames.size)break;now+=16;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(now);
  await Promise.resolve();await Promise.resolve();
 }}
 preview.show('m4','M4');await advance();
 stage.fire('wheel',{deltaY:-10000});await advance();
 assert(Math.abs(views.at(-1).zoom-2.5)<.01,'wheel zoom reaches upper clamp');
 stage.fire('wheel',{deltaY:10000});await advance();
 assert(Math.abs(views.at(-1).zoom-1)<.01,'wheel zoom reaches lower clamp');
 stage.fire('pointerdown',{pointerId:1,pointerType:'touch',clientX:0,clientY:0});
 stage.fire('pointerdown',{pointerId:2,pointerType:'touch',clientX:100,clientY:0});
 stage.fire('pointermove',{pointerId:2,pointerType:'touch',clientX:180,clientY:0});await advance();
 assert(views.at(-1).zoom>1.7&&views.at(-1).zoom<1.9,'pinch zoom follows finger separation');
 preview.show('pistol','Pistol');await advance();
 assert.equal(views.at(-1).zoom,1,'another gun opens at its own full view');
 preview.hide();assert.equal(frames.size,0,'hidden view stops rendering');preview.dispose();
});

function fixture(){
 const frames=new Map(),pending=[];let id=0;
 const host={requestAnimationFrame:f=>(frames.set(++id,f),id),cancelAnimationFrame:i=>frames.delete(i)};
 const doc={defaultView:host,createElement(){const handlers={};return {children:[],dataset:{},hidden:false,append(...a){this.children.push(...a)},addEventListener(k,f){handlers[k]=f},fire(k,e){handlers[k]?.({preventDefault(){},stopPropagation(){},...e})},setAttribute(){},removeAttribute(k){delete this[k]},setPointerCapture(){},hasPointerCapture(){return false},focus(){},remove(){}}}};
 const preview=createArmoryPreview({doc,render:(gun,view)=>new Promise(resolve=>pending.push({gun,view,resolve})),labels:{hint:'Turn',left:'Left',front:'Front',right:'Right',unavailable:'Unavailable'}});
 const stage=preview.element.children[0],image=stage.children[0];
 const step=()=>{const a=[...frames.values()];frames.clear();for(const f of a)f(16);};
 const flush=async()=>{await Promise.resolve();await Promise.resolve();};
 return {preview,stage,image,pending,step,flush};
}
test('continuous pointer input presents completed angles while coalescing the next render',async()=>{
 const f=fixture();f.preview.show('m4','GW-4');f.step();
 f.stage.fire('pointerdown',{pointerType:'mouse',button:0,pointerId:1,clientX:0,clientY:0});
 f.stage.fire('pointermove',{pointerId:1,clientX:30,clientY:0});
 f.pending[0].resolve('angle-0');await f.flush();
 assert.equal(f.image.src,'angle-0','a completed frame must show during continuing drag');
 f.step();assert.equal(f.pending.length,2);assert(f.pending[1].view.yaw>0);
 f.stage.fire('pointermove',{pointerId:1,clientX:60,clientY:0});
 f.pending[1].resolve('angle-1');await f.flush();assert.equal(f.image.src,'angle-1');
 f.preview.dispose();
});
test('a completed old gun or old appearance cannot replace the current preview',async()=>{
 const f=fixture();f.preview.show('m4','GW-4');f.step();f.preview.show('uzi','Wasp');
 f.pending[0].resolve('old-gun');await f.flush();assert.notEqual(f.image.src,'old-gun');
 f.step();f.pending[1].resolve('current-gun');await f.flush();assert.equal(f.image.src,'current-gun');
 f.preview.show('uzi','Wasp repainted');f.step();f.preview.show('uzi','Wasp refitted');
 f.pending[2].resolve('old-appearance');await f.flush();assert.notEqual(f.image.src,'old-appearance');
 f.preview.hide();f.step();assert.notEqual(f.image.src,'old-appearance');
});
