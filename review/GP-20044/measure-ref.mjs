// Reference-only GLB bounding-box measurements. Never copies source geometry.
import fs from 'node:fs';
import * as THREE from 'three';

const file = 'Claude outputs/refs/models/flamethrower.glb';
const data = fs.readFileSync(file);
if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
const chunkLength = data.readUInt32LE(12);
const json = JSON.parse(data.toString('utf8', 20, 20 + chunkLength));
const scene = json.scenes[json.scene || 0];
const whole = new THREE.Box3();
const rows = [];
function walk(i, parent) {
  const n = json.nodes[i], local = new THREE.Matrix4();
  if (n.matrix) local.fromArray(n.matrix);
  else local.compose(new THREE.Vector3(...(n.translation || [0, 0, 0])),
    new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])),
    new THREE.Vector3(...(n.scale || [1, 1, 1])));
  const world = new THREE.Matrix4().multiplyMatrices(parent, local);
  if (n.mesh !== undefined) {
    const box = new THREE.Box3();
    for (const p of json.meshes[n.mesh].primitives) {
      const acc = json.accessors[p.attributes.POSITION];
      if (acc.min && acc.max) box.union(new THREE.Box3(new THREE.Vector3(...acc.min), new THREE.Vector3(...acc.max)).applyMatrix4(world));
    }
    whole.union(box);
    const size = box.getSize(new THREE.Vector3());
    rows.push({ name: n.name || json.meshes[n.mesh].name || `node ${i}`, size: size.toArray().map(x => +x.toFixed(3)), center: box.getCenter(new THREE.Vector3()).toArray().map(x => +x.toFixed(3)) });
  }
  for (const child of n.children || []) walk(child, world);
}
for (const i of scene.nodes) walk(i, new THREE.Matrix4());
console.log(JSON.stringify({ source: file, license: json.asset?.extras?.license || json.asset?.extras, size: whole.getSize(new THREE.Vector3()).toArray(), rows: rows.slice(0, 60) }, null, 2));
