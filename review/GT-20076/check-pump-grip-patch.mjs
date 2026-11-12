import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Real from '../../vendor/three/three.core.js';
import * as Light from '../../tools/tests/fakethree.mjs';
import {pumpGripWebGeometry} from '../../studio/weapon-pump-grip.js';

assert(process.env.DW_GAME_TEST_TOKEN);
const folder=new URL('visible-repairs/shotgun/',import.meta.url);
const raw=JSON.parse(await readFile(new URL('clear-pump-grip-web-before/reference.json',folder),'utf8'));
const source=raw.parts.find(p=>p.name==='grip').g.data.attributes;
const baked=JSON.parse(await readFile(new URL('clear-pump-grip-web-after/trim-stock.json',folder),'utf8'));
function triangles(rows){
  const keys=[];
  for(let i=0;i<rows.length;i+=3){
    const [a,b,c]=rows.slice(i,i+3).map(row=>row.map(x=>Math.round(x*1e12)).join(','));
    keys.push([[a,b,c],[b,c,a],[c,a,b]].map(v=>v.join('|')).sort()[0]);
  }
  return keys.sort();
}
const expected=triangles(baked.indices.map(i=>baked.vertices[i]));
for(const [name,T] of [['native',Real],['lightweight',Light]]){
  const original=new T.BufferGeometry();
  for(const [key,attr] of Object.entries(source))original.setAttribute(key,new T.BufferAttribute(new Float32Array(attr.array),attr.itemSize));
  const mesh=pumpGripWebGeometry(T,original),channels=['position','normal','uv'].map(k=>mesh.attributes[k]);
  const rows=Array.from({length:channels[0].count},(_,i)=>channels.flatMap(a=>Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))));
  assert.deepEqual(triangles(rows),expected);
  assert.equal(pumpGripWebGeometry(T,original),mesh);
  assert.equal(mesh.userData.shared,true);
  console.log('PASS',name,expected.length,'oriented triangles with all original or fitted attributes, cached identity');
}
