import test from 'node:test';
import assert from 'node:assert/strict';
import {restockRows,createCacheIntel,drawCacheMarks} from './cache-intel.js';
const cache=(extra={})=>({id:'objective:hikers-cache',state:'available',restockDay:2,position:{x:100,z:0},reward:{key:'supply.medpens',params:{count:2}},remaining:null,...extra});

test("HQ rows name only today's restocked caches and show remaining supplies",()=>{
 const rows=restockRows({sites:[cache(),cache({id:'objective:radio-repair'}),cache({restockDay:1}),cache({state:'unavailable'})]},2);
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Hikers Camp');assert(rows[0].reward.includes('2'));
 assert.deepEqual(restockRows({sites:[cache()]},1),[]);
 const partial=restockRows({sites:[cache({remaining:{key:'supply.medpens',params:{count:1}}})]},2);
 assert(partial[0].reward.includes('1'));assert.equal(restockRows({sites:[cache({state:'claimed'})]},2)[0].collected,true);
});
test('map marks need this board reading and clear on collection, day change, removal or reset',()=>{
 const intel=createCacheIntel(),s=cache(),input={runId:1,day:2,sites:[s]};intel.receive({type:'run-reset',runId:1});
 assert.deepEqual(intel.markers(input),[]);
 intel.receive({type:'briefing-open',runId:0,day:2,restocks:restockRows({sites:[s]},2)});assert.deepEqual(intel.markers(input),[]);
 intel.receive({type:'briefing-open',runId:1,day:2,restocks:restockRows({sites:[s]},2)});assert.equal(intel.markers(input).length,1);
 for(const state of ['claimed','unavailable'])assert.deepEqual(intel.markers({...input,sites:[cache({state})]}),[]);
 assert.deepEqual(intel.markers({...input,day:3}),[]);assert.deepEqual(intel.markers({...input,sites:[]}),[]);
 intel.receive({type:'run-reset',runId:2});assert.deepEqual(intel.markers({...input,runId:2}),[]);
});
test('an empty board does not disclose later stock and the square projects to the rim',()=>{
 const intel=createCacheIntel();intel.receive({type:'run-reset',runId:1});intel.receive({type:'briefing-open',runId:1,day:2,restocks:[]});
 assert.deepEqual(intel.markers({runId:1,day:2,sites:[cache()]}),[]);
 const calls=[],ctx=new Proxy({}, {get:(_,k)=>(...args)=>calls.push([k,...args]),set:()=>true});
 drawCacheMarks(ctx,[{x:100,z:0}],{x:0,z:0,yaw:0,center:100,scale:2,rim:60});
 const point=calls.find(c=>c[0]==='translate');assert.equal(point[1],40);assert(Math.abs(point[2]-100)<1e-8);
 assert.equal(calls[0][0],'save');assert.equal(calls.at(-1)[0],'restore');
});
