import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const b=JSON.parse(await readFile(new URL('baseline.json',import.meta.url),'utf8')),a=JSON.parse(await readFile(new URL('trial.json',import.meta.url),'utf8'));
const B=b.guard.data.attributes,A=a.guard.data.attributes;
assert.equal(A.position.array.length,B.position.array.length);
assert.deepEqual(A.uv,B.uv);assert.deepEqual(a.grip.data,b.grip.data);
assert.deepEqual(a.pin,b.pin);assert.deepEqual(a.triggerPosition,b.triggerPosition);
const edges=new Map(),p=A.position.array,n=A.normal.array;
let upper=0,moved=0,maxNormalError=0,maxMove=0;
const key=i=>p.slice(i,i+3).map(v=>Math.round(v*1e6)).join(',');
for(let i=0;i<p.length;i+=9)for(const [j,k] of [[i,i+3],[i+3,i+6],[i+6,i]]){
 const u=key(j),v=key(k),e=[u,v].sort().join('|');edges.set(e,(edges.get(e)||0)+1);
}
assert([...edges.values()].every(v=>v===2),'Guard has an open or nonmanifold edge');
for(let i=0;i<p.length;i+=3){
 assert(p.slice(i,i+3).every(Number.isFinite));assert(n.slice(i,i+3).every(Number.isFinite));
 maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(...n.slice(i,i+3))-1));
 const d=Math.hypot(...p.slice(i,i+3).map((v,j)=>v-B.position.array[i+j]));maxMove=Math.max(maxMove,d);
 if(d>1e-9)moved++;
 if(B.position.array[i+1]>=-.0359){assert.equal(d,0,'Upper attachment moved');upper++;}
}
assert(maxNormalError<1e-6);
const oldHits=b.contacts.filter(c=>c.gap.penetrating).map(c=>c.label),newHits=a.contacts.filter(c=>c.gap.penetrating).map(c=>c.label);
assert.deepEqual(newHits,oldHits,'Guard gains another weapon contact');
const result={vertices:p.length/3,closedEdges:edges.size,unchangedUpperVertices:upper,movedVertices:moved,maxMoveMm:maxMove*1000,maxNormalError,pin:a.pin,baselineBox:b.guardBox,candidateBox:a.guardBox,oldHits,newHits};
await writeFile(new URL('guard-proof.json',import.meta.url),JSON.stringify(result,null,2));console.log('PASS guard closed, unit normals, original UVs/grip/pin/attachments; no new weapon contact',result);
