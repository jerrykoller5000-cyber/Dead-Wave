import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainingInfirmary} from './training-infirmary.js';
const tg={floorY:-200,bed:{centre:{x:-40.85,z:-650},stand:{x:-40.25,z:-648.7}}};
const c=createTrainingInfirmary(tg),r=.42;
const p=(x,z,y=-200)=>({x,z,y}),near=(a,b)=>assert(Math.abs(a-b)<1e-6,`expected ${a} near ${b}`);

test('walking into the stretcher stops outside the frame, including player width',()=>{
 const a=p(-40.85,-648),v=c.constrain(p(-40.85,-649.4),a,r);near(v.z,-649.06);near(v.x,a.x);assert(v.blockZ&&!v.blockX);
});
test('a roll cannot tunnel through the whole bed when its endpoint is beyond it',()=>{
 const v=c.constrain(p(-38,-650),p(-44,-650),r);near(v.x,-42.51);assert(v.blockX);
});
test('diagonal approach preserves sideways sliding, and tangent motion does not snag corners',()=>{
 const a=p(-41.5,-648),v=c.constrain(p(-40,-649.6),a,r);near(v.x,-40);near(v.z,-649.06);
 const tangent=c.constrain(p(-39,v.z),p(v.x,v.z),r);near(tangent.x,-39);near(tangent.z,v.z);assert(!tangent.moved);
});
test('exact diagonal corner contact cannot pass into furniture',()=>{
 const a=p(-34.23,-645.95),v=c.constrain(p(-37.23,-648.95),a,r);near(v.x,-36.23);near(v.z,-647.95);
});
test('landing or loading inside furniture ejects into the open aisle, not the wall',()=>{
 const bed=p(-40.85,-650),cabinet=p(-38.13,-651.28);
 near(c.constrain(bed,bed,r).z,-649.06);near(c.constrain(cabinet,cabinet,r).z,-650.36);
});
test('IV stand and oxygen cylinder block bodies but the recovery stand point stays free',()=>{
 const oxygen=p(-42.34,-649.2),iv=p(-42.27,-650.66);
 assert(c.constrain(oxygen,oxygen,r).moved);assert(c.constrain(iv,iv,r).moved);
 const stand=p(tg.bed.stand.x,tg.bed.stand.z);assert(!c.constrain(stand,stand,r).moved);
 const exit=c.constrain(p(stand.x,stand.z+3),stand,r);assert(!exit.moved);
});
test('objects are constrained only where the body overlaps their vertical range',()=>{
 const a=p(-40.85,-648,-198.9),b=p(-40.85,-650,-198.9);assert(!c.constrain(b,a,r).moved);
 assert(!c.constrain(p(-40.85,-650,-203),p(-40.85,-648,-203),r).moved);
});
test('walking away after contact is unrestricted and unrelated room positions remain clear',()=>{
 const a=p(-40.85,-649.06),v=c.constrain(p(-40.85,-648),a,r);assert(!v.moved);
 assert(!c.constrain(p(-20,-630),p(-21,-632),r).moved);
});

test('the sagging spare cot also blocks walking without enclosing the infirmary floor',()=>{
 const a=p(-37.6,-646.5),v=c.constrain(p(-37.6,-648.75),a,r);near(v.z,-647.95);assert(v.blockZ);
 const clear=p(-40.25,-647.8);assert(!c.constrain(clear,clear,r).moved);
});
