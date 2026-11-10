import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as THREE from '../../vendor/three/three.core.js';
import {makeKatanaModel} from '../../studio/katana.js';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const gun=makeKatanaModel({THREE});
gun.updateMatrixWorld(true);
const values=[];
const ray=new THREE.Raycaster();
for(let i=0;i<=100;i++) {
  const z=-.228+i*.002;
  for(let k=0;k<64;k++) {
    const a=k*Math.PI/32, dx=Math.cos(a), dy=Math.sin(a);
    ray.set(new THREE.Vector3(.08*dx,.08*dy,z),new THREE.Vector3(-dx,-dy,0));
    const hit=ray.intersectObject(gun,true)[0];
    assert(hit,'missing grip surface');
    values.push(+(.08-hit.distance).toFixed(7));
  }
}
await writeFile(new URL('./'+phase+'/katana-grip.json',import.meta.url),JSON.stringify(values));
console.log('Captured',values.length,'katana contact radii');
