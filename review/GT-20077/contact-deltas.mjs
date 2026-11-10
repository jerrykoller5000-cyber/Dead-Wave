import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Triangle, Vector3} from '../../vendor/three/three.core.js';
import {save} from '../GT-20076/save.mjs';

const id = process.argv[2];
assert(/^[a-z0-9-]+$/.test(id));
const folder = new URL('./' + id + '/', import.meta.url);
const read = async phase => {
  const get = file => readFile(new URL(phase + '/' + file, folder), 'utf8').then(JSON.parse);
  const base = await get('contact-surfaces.json');
  try { return Object.assign(base, await get('contact-extra.json')); }
  catch (err) { if (err.code !== 'ENOENT') throw err; return base; }
};
const [before, after] = await Promise.all([read('before'), read('after')]);
assert.deepEqual(Object.keys(before), Object.keys(after));

function triangles(coords) {
  assert(coords.length && coords.length % 9 === 0);
  const faces = [];
  for (let i = 0; i < coords.length; i += 9)
    faces.push(new Triangle(...[0, 3, 6].map(j => new Vector3().fromArray(coords, i + j))));
  return faces.filter(face => face.getArea() > 1e-14);
}

// Sample both boundaries. A changed tessellation alone must not count as a moved surface.
function farthest(source, target) {
  const samples = new Map(), q = new Vector3(), v = new Vector3();
  for (const {a,b,c} of source) {
    for (const p of [a,b,c,a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5),
      a.clone().add(b).add(c).multiplyScalar(1/3)]) samples.set(p.toArray().join(','), p);
  }
  let distance = 0, delta = [0,0,0];
  for (const p of samples.values()) {
    let nearest = Infinity;
    for (const face of target) {
      face.closestPointToPoint(p,q);
      const squared = q.distanceToSquared(p);
      if (squared < nearest) { nearest = squared; v.subVectors(q,p); }
    }
    if (nearest > distance) { distance = nearest; delta = v.toArray(); }
  }
  return {mm: Math.sqrt(distance)*1000, delta: delta.map(x => x*1000)};
}

const result = {};
for (const name of Object.keys(before)) {
  if (before[name].length === after[name].length && before[name].every((v,i) => v === after[name][i])) {
    result[name] = {mm:0,delta:[0,0,0],identical:true};
    continue;
  }
  const oldFaces = triangles(before[name]), newFaces = triangles(after[name]);
  assert(oldFaces.length && newFaces.length);
  const forward = farthest(oldFaces,newFaces), backward = farthest(newFaces,oldFaces);
  result[name] = forward.mm >= backward.mm ? forward : {mm:backward.mm,delta:backward.delta.map(v=>-v)};
}
await save(new URL('contact-deltas.json',folder),JSON.stringify(result,null,2)+'\n');
for (const [name,r] of Object.entries(result)) console.log(name, r.mm.toFixed(2), 'mm', r.delta.map(v=>v.toFixed(2)));
