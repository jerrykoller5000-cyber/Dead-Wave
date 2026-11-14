import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import {createBarrelHeat,getHeatGlow} from './barrel-heat.js';
function fixture({view=false,suppressed=false}={}){
 const scene=new T.Scene(),root=new T.Group(),shared=new T.MeshStandardMaterial({color:0x556677,emissive:0,metalness:.8,roughness:.4});
 const barrel=new T.Mesh(new T.CylinderGeometry(.03,.03,.4,8),shared),can=new T.Mesh(new T.CylinderGeometry(.05,.05,.15,8),shared),receiver=new T.Mesh(new T.BoxGeometry(.2,.1,.2),shared);
 barrel.name='heatParts-barrel';can.name='suppressor';can.visible=suppressed;root.add(barrel,can,receiver);root.userData.heatParts={barrel,suppressor:can};root.userData.suppressed=suppressed;root.position.set(1,2,3);root.rotation.set(.1,.2,.3);scene.add(root);
 if(view){barrel.material=shared.clone();barrel.material.userData.vm281=true;can.material=barrel.material.clone();can.material.userData.vm281=true;}
 const heat=createBarrelHeat({THREE:T,scene,weaponMeshes:{ak:root}});return{scene,root,shared,barrel,can,receiver,heat};
}
test('loader primes actual heat/smoke resources, preserves state and caches prepared materials',()=>{
 const f=fixture(),{root,shared,barrel,can,receiver,heat}=f,transform=root.matrix.clone(),position=root.position.toArray(),vis=[barrel.visible,can.visible];
 const stage=heat.primeVisuals();assert.equal(stage.meshes.length,50);assert.equal(heat.getHeat('ak'),0);assert(heat._wisps.every(w=>!w.active&&w.mesh.visible&&w.mat.opacity===.35));assert.notEqual(barrel.material,shared);assert.equal(receiver.material,shared);assert.equal(shared.emissiveIntensity,1);assert(barrel.material.emissiveIntensity>0);assert(barrel.geometry.attributes.uv1);
 const prepared=[barrel.material,can.material];stage.cleanup();stage.cleanup();assert.equal(heat.getHeat('ak'),0);assert.deepEqual(root.position.toArray(),position);assert(root.matrix.equals(transform));assert.deepEqual([barrel.visible,can.visible],vis);assert(heat._wisps.every(w=>!w.active&&!w.mesh.visible&&w.mat.opacity===0));assert.equal(barrel.material.emissiveIntensity,0);assert.equal(can.material.emissiveIntensity,0);assert(barrel.material.emissiveMap);
 const again=heat.primeVisuals();assert.equal(barrel.material,prepared[0]);assert.equal(can.material,prepared[1]);again.cleanup();heat.dispose();
});
test('priming preserves two hand heat and an existing smoke simulation state',()=>{
 const f=fixture({suppressed:true}),other=fixture({suppressed:false}),{root,heat,barrel,can}=f;
 heat.setHeat('ak',.7,0);heat.setHeat('ak',.4,1);heat.update(0,{currentWeapon:'ak',weaponMesh:root,offhandMesh:other.root,daylight:1,suppressWisp:true});const w=heat._wisps[0];w.active=true;w.age=.2;w.mesh.visible=true;w.mat.opacity=.12;
 const stage=heat.primeVisuals([{root,key:'ak',hand:0},{root:other.root,key:'ak',hand:1}]);assert.equal(heat.getHeat('ak',0),.7);assert.equal(heat.getHeat('ak',1),.4);stage.cleanup();assert.equal(w.active,true);assert.equal(w.age,.2);assert.equal(w.mat.opacity,.12);assert.equal(w.mesh.visible,true);assert.equal(barrel.material.emissiveIntensity,0);assert.equal(can.material.emissiveIntensity,getHeatGlow(.7,1).intensity);assert.equal(other.barrel.material.emissiveIntensity,getHeatGlow(.4,1).intensity);heat.dispose();other.heat.dispose();
});
test('a view material retains its vertex hook and cold glint after hot staging',()=>{
 const f=fixture({view:true}),{heat,root,barrel}=f,mat=barrel.material,glint={name:'cold-view-glint'},vertex=()=>{};mat.emissiveNode=glint;mat.setupModelViewProjection=vertex;
 const stage=heat.primeVisuals([{key:'ak',root,viewCopy:true}]);assert.equal(barrel.material,mat);assert.equal(mat.emissiveNode,null);assert.equal(mat.setupModelViewProjection,vertex);stage.cleanup();assert.equal(mat.emissiveNode,glint);assert.equal(mat.setupModelViewProjection,vertex);assert.equal(heat.getHeat('ak'),0);heat.dispose();
});
test('an explicit smoke-only stage does not touch any weapon material',()=>{
 const {root,barrel,can,heat}=fixture(),m=[barrel.material,can.material],stage=heat.primeVisuals([]);assert.equal(stage.meshes.length,48);stage.cleanup();assert.equal(barrel.material,m[0]);assert.equal(can.material,m[1]);assert.equal(root.userData.suppressed,false);heat.dispose();
});
