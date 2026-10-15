import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three/three.core.js';
import {acidTexel,makeAcidTexture,acidJoin,acidPoolAppearance,createSpitterAcid} from './spitter-acid.js';
test('pool corners are transparent, the centre is readable and surface is not solid neon',()=>{
 assert.equal(acidTexel(0,0)[3],0);assert.equal(acidTexel(1,1)[3],0);const c=acidTexel(.5,.5);assert(c[3]>150);assert(c[0]<130&&c[1]<180);
 const edges=Array.from({length:100},(_,i)=>acidTexel(.5+.46*Math.sin(i),.5+.46*Math.cos(i))[3]);assert(Math.max(...edges)-Math.min(...edges)>100);
});
test('acid pixels and shared textures are deterministic and bounded',()=>{
 for(const kind of ['pool','trail']){const a=makeAcidTexture(T,kind,32),b=makeAcidTexture(T,kind,32);assert.deepEqual(a.image.data,b.image.data);
  assert.equal(a.image.data.length,32*32*4);assert.equal(a.colorSpace,T.SRGBColorSpace);assert(a.image.data.some(v=>v===0));assert(a.image.data.some(v=>v>150));}
});
test('corner joints are finite and cannot grow spikes on sharp reversals',()=>{
 for(let i=0;i<360;i++){const j=acidJoin(0,1,Math.sin(i*Math.PI/180),Math.cos(i*Math.PI/180));assert(Number.isFinite(j.x+j.z));assert(Math.hypot(j.x,j.z)<=1.400001);}
 const right=acidJoin(0,1,1,0);assert(right.x<0&&right.z>0);
});
test('puddles settle quickly and fade completely at their existing expiry',()=>{
 const p0=acidPoolAppearance(0,4.2),p1=acidPoolAppearance(.2,4.2),late=acidPoolAppearance(4,4.2),end=acidPoolAppearance(4.2,4.2);
 assert(p1.scale>p0.scale);assert.equal(p1.scale,1);assert(late.opacity<.02);assert.equal(end.opacity,0);
});
test('pooled puddles share geometry/texture and reset stale scale, colour and opacity',()=>{
 const v=createSpitterAcid(T),a=v.makePool(),b=v.makePool();assert.equal(a.geometry,b.geometry);assert.equal(a.material.map,b.material.map);
 v.resetPool(a);v.updatePool(a,4.2,4.2);assert.equal(a.material.opacity,0);a.visible=false;v.resetPool(a);
 assert(a.visible);assert.equal(a.material.opacity,.78);assert.equal(a.scale.x,.94);assert.equal(a.material.color.getHex(),0xffffff);
});


test('walking trail texture meets itself without a bright seam at segment joints',()=>{
 for(let i=0;i<=64;i++)assert.deepEqual(acidTexel(i/64,0,'trail'),acidTexel(i/64,1,'trail'));
});

test('spill ends soften while neighbouring strips share exactly the same corner',async()=>{
 const {createZombieAbilityRuntime}=await import('./zombie-ability-runtime.js');const scene=new T.Scene(),z={typeKey:'spitter',mesh:new T.Group(),alive:true},actors=[z];
 const rt=createZombieAbilityRuntime({THREE:T,scene,actors:()=>actors,active:()=>true,domain:()=>1,canAct:()=>true,
  box:()=>null,cylinder:()=>null,build:()=>null,inDomain:()=>true,ground:()=>0,wet:()=>false,world:()=>({belowSolids:[],builds:[],buildGrid:2.5}),players:()=>[],builds:()=>[],acidMote:()=>{}});
 rt.update(.02);z.mesh.position.set(1,0,0);rt.update(.02);const m=scene.children.find(x=>x.name==='spitter-acid-trail-batch'),g=m.geometry,c=g.getAttribute('acidCaps'),P=g.getAttribute('position');
 assert.equal(c.getX(0),1);assert.equal(c.getY(0),1);const buffers=[P.array,c.array];
 z.mesh.position.set(1,0,1);rt.update(.02);assert.equal(c.getY(0),0);assert.equal(c.getX(6),0);assert.equal(c.getY(6),1);
 assert.equal(P.getX(2),P.getX(7));assert.equal(P.getZ(2),P.getZ(7));assert.equal(P.getX(5),P.getX(6));assert.equal(P.getZ(5),P.getZ(6));
 assert.equal(P.array,buffers[0]);assert.equal(c.array,buffers[1]);rt.clear();assert.equal(m.visible,false);
});


test('dissolving ribbon shares visual age at joins and reuses finite bounded age storage',async()=>{
 const {createZombieAbilityRuntime}=await import('./zombie-ability-runtime.js');const scene=new T.Scene(),z={typeKey:'spitter',mesh:new T.Group(),alive:true},actors=[z];
 const rt=createZombieAbilityRuntime({THREE:T,scene,actors:()=>actors,active:()=>true,domain:()=>1,canAct:()=>true,
  box:()=>null,cylinder:()=>null,build:()=>null,inDomain:()=>true,ground:()=>0,wet:()=>false,world:()=>({belowSolids:[],builds:[],buildGrid:2.5}),players:()=>[],acidMote:()=>{}});
 rt.update(.1);z.mesh.position.x=1;rt.update(.1);rt.update(.5);z.mesh.position.z=1;rt.update(.1);
 const g=scene.children[0].geometry,a=g.getAttribute('acidAge'),storage=a.array,points=g.getAttribute('position').array.slice();
 assert.equal(a.count,576);assert.equal(a.getX(2),a.getX(6));assert.equal(a.getX(5),a.getX(7));assert(a.getX(6)>a.getX(8));
 rt.update(.8);assert.equal(a.getX(2),a.getX(6));assert.deepEqual(g.getAttribute('position').array,points,'age erosion must not shrink the geometry and open joint gaps');
 actors.length=0;rt.update(6);assert.equal(rt.read().trails,0);actors.push(z);z.mesh.position.set(8,0,8);rt.update(.02);z.mesh.position.x+=1;rt.update(.02);
 assert.equal(a.array,storage);assert(storage.every(v=>Number.isFinite(v)&&v>=0&&v<=1));rt.clear();assert.equal(scene.children[0].visible,false);
});
