import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three/three.core.js';
import * as fake from '../../tools/tests/fakethree.mjs';
import {roundGeometry, spentCaseGeometry} from '../../studio/weapon-casings.js';
import {save} from '../GT-20076/save.mjs';

const types = ['birdshot','buckshot','slug'];
const records = {};
for (const api of [THREE, fake]) {
  const signatures = new Set();
  for (const type of types) {
    const live = roundGeometry(api,'shotgun',type), spent = spentCaseGeometry(api,'shotgun',type);
    assert.notEqual(live,spent);
    assert.equal(live,roundGeometry(api,'shotgun',type));
    assert.equal(spent,spentCaseGeometry(api,'shotgun',type));
    for (const geometry of [live,spent]) {
      const {color,position,normal} = geometry.attributes;
      assert.equal(position.count,color.count);
      assert.equal(position.count,normal.count);
      assert(position.array.every(Number.isFinite) && normal.array.every(Number.isFinite));
      assert(color.array.every(n=>Number.isFinite(n) && n>=0 && n<=1));
      geometry.computeBoundingBox();
    }
    const size = g => g.boundingBox.max.y-g.boundingBox.min.y;
    assert(size(live)<size(spent));
    signatures.add(Array.from(live.attributes.color.array).join(','));
    if (api===THREE) {
      const cameraRay = new THREE.Raycaster(new THREE.Vector3(0,1,.002),new THREE.Vector3(0,-1,0));
      const depth = geometry => {
        const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
        const hit=cameraRay.intersectObject(mesh)[0];
        assert(hit,'Missing top of visible prop');
        mesh.material.dispose();
        return geometry.boundingBox.max.y-hit.point.y;
      };
      const liveDepth=depth(live), spentDepth=depth(spent);
      assert(spentDepth>liveDepth*2,'Open hull must read as a deeper recess than the cap');
      const brass=new THREE.Color(0xc29b5f);
      const {position,color}=live.attributes;
      let top=-Infinity;
      for(let i=0;i<position.count;i++){
        const delta=Math.abs(color.getX(i)-brass.r)+Math.abs(color.getY(i)-brass.g)+Math.abs(color.getZ(i)-brass.b);
        if(delta<1e-5)top=Math.max(top,position.getY(i));
      }
      assert(Number.isFinite(top));
      records[type]={liveLength:size(live),spentLength:size(spent),headHeight:top-live.boundingBox.min.y,openMouth:spentDepth>liveDepth};
    }
  }
  assert.equal(signatures.size,3);
  for(const getter of [roundGeometry,spentCaseGeometry]){
    for(const old of ['std','issued',undefined])assert.equal(getter(api,'shotgun',old),getter(api,'shotgun','birdshot'));
    assert.equal(getter(api,'shotgun','buck'),getter(api,'shotgun','buckshot'));
    assert.equal(getter(api,'aa12','slug'),getter(api,'aa12'));
    assert.equal(getter(api,'unsupported'),null);
  }
  for(const id of ['pistol','revolver','m4','ak','sniper','minigun','m240','launcher','uzi']){
    assert.equal(spentCaseGeometry(api,id),spentCaseGeometry(api,id,'buckshot'));
  }
}
for(const type of ['buckshot','slug']){
  assert.equal(records[type].liveLength,records.birdshot.liveLength);
  assert.equal(records[type].spentLength,records.birdshot.spentLength);
  assert(records[type].headHeight>records.birdshot.headHeight);
}
await save(new URL('./shotgun/revised-geometry.json',import.meta.url),JSON.stringify(records,null,2));
console.log('PASS: three distinct intact/spent pairs, closed/open tops, cached aliases, single AA-12 shell and existing case calls on production and headless Three.');
