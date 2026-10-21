import test from 'node:test';import assert from 'node:assert/strict';import{createTrainingDeployment}from'./training-deployment.js';
test('five complete active seconds before a single deployment, with 5/4/3/2/1 updates',()=>{
 const shown=[],spawned=[],d=createTrainingDeployment({onChange:p=>shown.push(p?.seconds??null),onDeploy:p=>spawned.push(p)});
 assert(d.start('shambler',3));assert.equal(spawned.length,0);
 for(let i=0;i<4;i++)d.tick(1);
 d.tick(.999);assert.equal(spawned.length,0);d.tick(.001);
 assert.deepEqual(shown,[5,4,3,2,1,null]);assert.deepEqual(spawned,[{kind:'shambler',count:3}]);d.tick(10);assert.equal(spawned.length,1);
});
test('clearing or leaving cancels pending work, and a fresh request gets all five seconds',()=>{
 const spawned=[],d=createTrainingDeployment({onDeploy:p=>spawned.push(p)});d.start('feral',5);d.tick(4);assert(d.cancel());d.tick(20);assert.equal(spawned.length,0);assert.equal(d.read(),null);
 assert(d.start('soldier',1));assert.equal(d.read().seconds,5);d.tick(5);assert.deepEqual(spawned,[{kind:'soldier',count:1}]);
});
test('duplicate clicks cannot multiply or replace the pending group',()=>{
 const spawned=[],d=createTrainingDeployment({onDeploy:p=>spawned.push(p)});d.start('shambler',3);d.tick(2);assert.equal(d.start('feral',10),false);assert.equal(d.read().remaining,3);d.tick(3);assert.deepEqual(spawned,[{kind:'shambler',count:3}]);
});
test('invalid deltas do not advance time; large frames deploy only once and snapshots cannot mutate state',()=>{
 let spawned=0;const d=createTrainingDeployment({onDeploy:()=>spawned++});assert.equal(d.start('',3),false);assert.equal(d.start('feral',NaN),false);d.start('feral',100);d.read().remaining=0;
 for(const dt of [NaN,Infinity,-1,0])d.tick(dt);assert.equal(d.read().seconds,5);assert.equal(d.read().count,10);d.tick(20);assert.equal(spawned,1);d.tick(20);assert.equal(spawned,1);
});
