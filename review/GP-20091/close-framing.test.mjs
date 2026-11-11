import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingCloseFraming,trainingStationShoulder,createTrainingMarineFade} from '../../game/training-camera-collision.js';

test('a contact against a station moves the eye to the player side and centers its face',()=>{
  const head={x:0,y:1.6,z:0},eye={x:0,y:1.8,z:2},look={x:0,y:0,z:0};
  const s={x:0,y:0,z:1,front:{x:0,z:.4}};
  let pulled=false;
  const chosen=trainingStationShoulder(head,eye,look,{cif:s},()=>{pulled=true;});
  assert.equal(chosen,s);
  assert.ok(pulled);
  assert.ok(eye.z<0,'eye must stay on the player side of the station');
  assert.ok(Math.hypot(eye.x-head.x,eye.y-head.y,eye.z-head.z)>1.5);
  assert.deepEqual(look,{x:0,y:1.55,z:1});
});

test('a tight non-station pull raises the sight line along the facing direction',()=>{
  const head={x:0,y:1.6,z:0},eye={x:0,y:1.9,z:-.3},look={x:0,y:1.3,z:0};
  trainingCloseFraming(head,eye,look,{x:0,z:1});
  assert.ok(look.z>3);
  assert.ok(look.y>1.6);
});

test('the station-side to shoulder change is continuous on approach',()=>{
  const s={x:0,y:0,z:1,front:{x:0,z:.4}};
  let previous=null;
  for(let d=3.9;d>=0;d-=.1){
    const head={x:0,y:1.6,z:s.front.z-d};
    const eye={x:0,y:1.9,z:1.2},look={x:0,y:1.2,z:head.z};
    trainingStationShoulder(head,eye,look,{cif:s},()=>{});
    if(previous)assert.ok(Math.hypot(eye.x-previous.x,eye.y-previous.y,eye.z-previous.z)<.55,`jump at ${d.toFixed(1)} m`);
    previous={...eye};
  }
});

test('the near helmet fades before the torso and shared materials restore at distance',()=>{
  const original={opacity:1,transparent:false,clone(){return {...this,dispose(){this.disposed=true;}}}};
  const marine={userData:{},traverse(fn){fn(headMesh);fn(bodyMesh);}};
  const head={parent:marine};marine.userData.headG=head;
  const headMesh={isMesh:true,material:original,parent:head};
  const bodyMesh={isMesh:true,material:original,parent:marine};
  const fade=createTrainingMarineFade(marine);
  const values=fade.update(.6);
  assert.ok(values.helmet<values.body);
  assert.notEqual(headMesh.material,bodyMesh.material);
  assert.equal(original.opacity,1);
  fade.update(2);
  assert.equal(headMesh.material,original);
  assert.equal(bodyMesh.material,original);
});
