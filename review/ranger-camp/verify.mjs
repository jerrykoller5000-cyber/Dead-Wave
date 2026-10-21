// Re-run with: node --import ./studio/node-three.mjs review/ranger-camp/verify.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from 'three';
import * as Fake from '../../tools/tests/fakethree.mjs';
import {buildRangerTruck} from '../../world/history-props.js';
function run(file,variant){
 const context={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);let seed=123,calls=0;const colliders=[];
 const d=context.window.buildCampsiteDetails(T,{cx:3,cz:4,gy:0,variant,random:()=>{calls++;seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},height:(x,z)=>.03*x-.05*z,solid:(...p)=>colliders.push(p)});
 const hash=crypto.createHash('sha256');
 for(const p of d.parts){p.updateMatrix();hash.update(Buffer.from(p.geometry.attributes.position.array.buffer));hash.update(JSON.stringify(p.matrix.toArray()));hash.update(String(p.material.color.getHex()));}
 return {calls,colliders,yaw:d.yaw,style:d.style,hash:hash.digest('hex')};
}
const checks=[];
for(let v=0;v<3;v++){
 const before=run(new URL('./v1/camp-before.js',import.meta.url),v),after=run(new URL('../../assets/world/campsites.js',import.meta.url),v);
 assert.deepEqual(after.colliders,before.colliders);assert.equal(after.calls,before.calls);assert.equal(after.yaw,before.yaw);assert.equal(after.style,before.style);
 if(v!==0)assert.equal(after.hash,before.hash);
 checks.push({variant:v,randomCalls:after.calls,colliders:after.colliders.length,unchangedGeometry:v!==0});
}
assert(buildRangerTruck(Fake,null).getObjectByName('ranger-radio'));
fs.writeFileSync(new URL('./v1/determinism-checks.json',import.meta.url),JSON.stringify(checks,null,2));
console.log('PASS: all three campsite collider layouts/random streams identical; hikers/trapper geometry byte-identical; truck builds with test THREE.');
