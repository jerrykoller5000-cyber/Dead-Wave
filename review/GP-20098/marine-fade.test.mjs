import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.webgpu.js';
import {createTrainingMarineFade} from '../../game/training-camera-collision.js';

test('Training near-camera fade reuses transparent marine materials after retreat', () => {
  const scene=new T.Scene(),marine=new T.Group(),head=new T.Group();
  marine.userData.headG=head;
  const source=new T.MeshStandardMaterial({color:0x668855});
  const bodyMesh=new T.Mesh(new T.BoxGeometry(1,1,1),source);
  const headMesh=new T.Mesh(new T.BoxGeometry(.5,.5,.5),source);
  bodyMesh.userData.liveMarine=marine; // renderer keepers must not JSON-copy the live rig
  marine.add(bodyMesh,head);head.add(headMesh);scene.add(marine);
  const fade=createTrainingMarineFade(marine);
  const restore=fade.prepareWarmup();
  const bodyFade=bodyMesh.material,headFade=headMesh.material;
  assert.notEqual(bodyFade,source);
  assert.notEqual(headFade,bodyFade);
  assert.equal(bodyFade.transparent,true);
  assert.equal(headFade.transparent,true);
  assert.ok(bodyFade.opacity<1&&headFade.opacity<1);
  const keepers=scene.getObjectByName('training-marine-fade-pipeline-keepers');
  assert.ok(keepers?.visible);
  assert.equal(keepers.children.length,4);
  restore();
  assert.equal(keepers.visible,false);
  assert.equal(bodyMesh.material,source);
  assert.equal(headMesh.material,source);

  for(let i=0;i<3;i++){
    fade.update(.4);
    assert.equal(bodyMesh.material,bodyFade);
    assert.equal(headMesh.material,headFade);
    assert.ok(headFade.opacity<bodyFade.opacity);
    fade.update(1);
    assert.equal(bodyMesh.material,source);
    assert.equal(headMesh.material,source);
    assert.equal(bodyFade.transparent,true);
  }
  source.color.setHex(0x335577);
  fade.update(.4);
  assert.equal(bodyFade.color.getHex(),0x335577);
  assert.equal(headFade.color.getHex(),0x335577);
  fade.reset();
});
