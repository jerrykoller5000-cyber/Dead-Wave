import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { zombieSurface } from '../game/zombie-headshots.js';

test('a round intersects the hidden rigid surface retained under a skinned zombie', () => {
  const root = new T.Group();
  const hips = new T.Group(), torso = new T.Group(), head = new T.Group();
  hips.position.y = 0.9;
  torso.position.y = 0.45;
  root.add(hips); hips.add(torso); torso.add(head);
  root.userData = { hips, torso, head };
  const retained = new T.Mesh(new T.BoxGeometry(0.55, 0.65, 0.35), new T.MeshBasicMaterial());
  retained.visible = false;
  retained.userData.skinSrc = true;
  torso.add(retained);
  const z = { mesh: root, typeKey: 'shambler' };
  const hit = zombieSurface(T, z, new T.Vector3(0, 1.35, -2), new T.Vector3(0, 1.35, 2));
  assert(hit, 'the retained collision surface remains raycastable while hidden for rendering');
  assert(hit.t > 0 && hit.t < 1);
  assert.equal(hit.headHit, false);

});

test('posed forearms in front of the chest own their hits and exact entry points', () => {
  const mesh=new T.Group(), torso=new T.Group(), armLG=new T.Group(), armRG=new T.Group();
  mesh.userData={torso,armLG,armRG};
  mesh.add(torso); torso.add(armLG,armRG);
  const box=(w,h,d)=>new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());
  torso.add(box(.8,.6,.2));
  for (const [arm,x] of [[armLG,-.25],[armRG,.25]]) {
    const elbow=new T.Group();
    arm.position.set(x,0,-.2); arm.add(elbow); elbow.add(box(.15,.23,.12));
  }
  const z={mesh,typeKey:'shambler'};
  for (const [x,part,depth] of [[-.25,'armL',-.26],[.25,'armR',-.26],[0,'torso',-.10]]) {
    const hit=zombieSurface(T,z,new T.Vector3(x,0,-1),new T.Vector3(x,0,1));
    assert.equal(hit.part,part);
    assert(Math.abs(hit.point.z-depth)<1e-5);
  }
  armLG.visible=false;
  assert.equal(zombieSurface(T,z,new T.Vector3(-.25,0,-1),new T.Vector3(-.25,0,1)).part,'torso');
});
