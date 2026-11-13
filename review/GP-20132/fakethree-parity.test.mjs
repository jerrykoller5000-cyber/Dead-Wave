import test from 'node:test';import assert from 'node:assert/strict';
import * as Real from '../../vendor/three/three.core.js';import * as Fake from '../../tools/tests/fakethree.mjs';

test('a light-only assembly has no mesh: getObjectByProperty matches three.js',()=>{
 const build=T=>{const root=new T.Group();root.add(new T.SpotLight(),new T.PointLight());return root;};
 const real=build(Real),fake=build(Fake);
 assert.equal(real.getObjectByProperty('isMesh',true),undefined);
 assert.equal(fake.getObjectByProperty('isMesh',true),undefined,'t336 must not classify a pure lighting group as a physical assembly');
 const realMesh=new Real.Mesh(),fakeMesh=new Fake.Mesh();real.add(realMesh);fake.add(fakeMesh);
 assert.equal(real.getObjectByProperty('isMesh',true),realMesh);
 assert.equal(fake.getObjectByProperty('isMesh',true),fakeMesh);
});

test('world bounds include containment instance transforms instead of its floor-level prototype',()=>{
 const bounds=T=>{const root=new T.Group();root.position.set(0,-200,-640);const m=new T.InstancedMesh(new T.BoxGeometry(.28,.26,.88),new T.MeshBasicMaterial(),2);root.add(m);m.setMatrixAt(0,new T.Matrix4().makeTranslation(-43.2,5.6,8));m.setMatrixAt(1,new T.Matrix4().makeTranslation(-8.8,8.6,20));root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root);return [...b.min.toArray(),...b.max.toArray()];};
 const real=bounds(Real),fake=bounds(Fake);
 assert(real[1]>-195,'real instances are mounted above heads, not below the floor');
 fake.forEach((v,i)=>assert(Math.abs(v-real[i])<1e-5,`axis ${i}: fake ${v}, real ${real[i]}`));
});
