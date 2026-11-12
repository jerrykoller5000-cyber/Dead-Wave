import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const folder=new URL('visible-repairs/shotgun/',import.meta.url);
const reference=JSON.parse(await readFile(new URL('clear-pump-grip-web-before/reference.json',folder),'utf8'));
const baked=JSON.parse(await readFile(new URL('clear-pump-grip-web-after/trim-stock.json',folder),'utf8'));
const geometry=reference.parts.find(p=>p.name==='grip').g.data;
assert(!geometry.index);
const channels=['position','normal','uv'].map(name=>geometry.attributes[name]);
const original=Array.from({length:channels[0].array.length/3},(_,i)=>
  channels.flatMap(attr=>attr.array.slice(i*attr.itemSize,(i+1)*attr.itemSize)));
const key=row=>row.map(x=>Math.round(x*1e12)).join(',');
const faceKey=rows=>{
  const [a,b,c]=rows.map(key);
  return [[a,b,c],[b,c,a],[c,a,b]].map(vertices=>vertices.join('|')).sort()[0];
};
const originalVertex=new Map(original.map((row,i)=>[key(row),i]));
const originalFace=new Map();
for(let i=0;i<original.length;i+=3)originalFace.set(faceKey(original.slice(i,i+3)),i/3);

const kept=new Set(),vertices=[],ids=new Map(),faces=[];
for(let i=0;i<baked.indices.length;i+=3){
  const rows=baked.indices.slice(i,i+3).map(id=>baked.vertices[id]);
  const existing=originalFace.get(faceKey(rows));
  if(existing!==undefined){
    assert(!kept.has(existing));kept.add(existing);continue;
  }
  faces.push(rows.map(row=>{
    const id=key(row);
    if(originalVertex.has(id))return -1-originalVertex.get(id);
    if(!ids.has(id)){ids.set(id,vertices.length);vertices.push(row);}
    return ids.get(id);
  }));
}
const runs=[];
for(const face of [...kept].sort((a,b)=>a-b)){
  const last=runs.at(-1);
  if(last && last[0]+last[1]===face)last[1]++;
  else runs.push([face,1]);
}
const float=value=>{
  for(let digits=1;digits<=9;digits++){
    const n=Number(value.toPrecision(digits));
    if(Math.fround(n)===value)return String(n);
  }
  throw Error('Invalid vertex coordinate');
};
const lines=(rows,format)=>rows.map(row=>'  '+format(row)+',').join('\n');
const source=`// Pump stock-to-grip seam. These ranges copy the original grip's triangles in order.
// Only the fitted joint needs additional vertices (position, normal, UV).
// Rebuild with bake-kr-band.py --pump-grip-web and export-pump-grip.mjs in review/GT-20076.
const originalTriangleRuns = [
${lines(runs,r=>'['+r.join(', ')+']')}
];

const webVertices = [
${lines(vertices,r=>'['+r.map(float).join(', ')+']')}
];

// Negative entries reuse an original grip vertex. The others address webVertices.
const webFaces = [
${lines(faces,r=>r.join(', '))}
];

const cached = new WeakMap();
export function pumpGripWebGeometry(T, source) {
  let geometry = cached.get(T);
  if (geometry) return geometry;

  geometry = new T.BufferGeometry();
  const vertexCount = ${kept.size*3} + webFaces.length;
  for (const [name, first, width] of [['position', 0, 3], ['normal', 3, 3], ['uv', 6, 2]]) {
    const original = source.attributes[name].array;
    const values = new Float32Array(vertexCount * width);
    let cursor = 0;
    for (const [start, count] of originalTriangleRuns) {
      values.set(original.subarray(start * 3 * width, (start + count) * 3 * width), cursor);
      cursor += count * 3 * width;
    }
    for (const id of webFaces) {
      const row = id < 0 ? original : webVertices[id];
      const begin = id < 0 ? (-1 - id) * width : first;
      for (let i = 0; i < width; i++) values[cursor++] = row[begin + i];
    }
    geometry.setAttribute(name, new T.BufferAttribute(values, width));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.shared = true;
  cached.set(T, geometry);
  return geometry;
}
`;
const output=new URL('../../studio/weapon-pump-grip.js',import.meta.url);
const previous=await readFile(output,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(previous!==null)assert(previous.startsWith('// Pump grip at the stock web.')||previous.startsWith('// Pump stock-to-grip seam.'));
if(process.argv.includes('--write')&&previous===null){
  await writeFile(output,source,{encoding:'utf8',flag:'wx'});
}else if(process.argv.includes('--write')&&previous!==source){
  const temp=new URL('weapon-pump-grip.'+randomUUID()+'.tmp',output);
  await writeFile(temp,source,{encoding:'utf8',flag:'wx'});
  assert.equal(await readFile(output,'utf8'),previous,'Pump artwork changed during export');
  await rename(temp,output);
}else assert.equal(source,previous);
console.log(kept.size,'original triangles in',runs.length,'runs;',vertices.length,'new vertices;',faces.length,'new triangles;',Buffer.byteLength(source),'bytes');
