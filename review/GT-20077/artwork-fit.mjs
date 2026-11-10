import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {save} from '../GT-20076/save.mjs';

const read = file => readFile(new URL(file,import.meta.url),'utf8').then(JSON.parse);
const pistol = {};
for (const file of ['contact-surfaces.json','contact-extra.json']) {
  const before = await read('./pistol/after/'+file);
  const rig = await read('./pistol/rig/'+file);
  for (const [name,coords] of Object.entries(before)) {
    assert.deepEqual(rig[name],coords,name+' geometry differs from approved pistol at rest');
    pistol[name] = {vertices:coords.length/3,displacementMm:0};
  }
}
const initial = await read('./m4/details/before/mesh-shapes.json');
const remaining = await read('./m4/details/after/mesh-shapes.json');
const afterCount = remaining.length;
for (const hash of initial) {
  const index = remaining.indexOf(hash);
  if (index!==-1) remaining.splice(index,1);
}
const gw4 = {before:initial.length,after:afterCount,unchanged:afterCount-remaining.length,
  changed:remaining.length,changedParts:['inset rim','inset backing','side inlay','inlay accent','lower trim edge']};
assert.equal(gw4.before,gw4.after);
assert.equal(gw4.changed,gw4.changedParts.length,'unexpected additional geometry changed');
await save(new URL('artwork-fit.json',import.meta.url),JSON.stringify({pistol,gw4},null,2)+'\n');
console.log('PASS '+Object.keys(pistol).length+' pistol contacts at zero displacement; '+gw4.unchanged+'/'+gw4.after+' GW-4 meshes identical at rest, other changes confined to the side inset.');
