import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingBuildBlocked} from './training-build-policy.js';
const b={grid:2,offset:1,minGX:-22,maxGX:-5,minGZ:-326,maxGZ:-307};
const base={active:true,build:b,position:{x:-26,y:-200,z:-635},floorY:-200};
test('training build controls are restricted to the room, including the shared threshold',()=>{
 assert.equal(trainingBuildBlocked(base),null);
 for(const position of [{x:0,y:-200,z:-645},{x:-8,y:-200,z:-648},{x:-26,y:0,z:-635},{x:-26,y:-200,z:-610}])assert.equal(trainingBuildBlocked({...base,position}),'range');
 assert.equal(trainingBuildBlocked({...base,active:false,position:{x:0,y:0,z:0}}),null);
});
test('alarm countdown, any living zombie and the whole recovery hold the lock',()=>{
 for(const state of [{pending:{remaining:5}},{alive:1},{recovering:true},{pending:null,alive:0,recovering:true}])assert.equal(trainingBuildBlocked({...base,...state}),'encounter');
 assert.equal(trainingBuildBlocked({...base,pending:null,alive:0,recovering:false}),null);
});
