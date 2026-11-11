import assert from 'node:assert/strict';
import test from 'node:test';
import {trainingCameraContact} from '../../game/training-camera-collision.js';

const box={minX:-1,maxX:1,minY:0,maxY:3,minZ:-.5,maxZ:.5};
const from={x:0,y:1.6,z:3};

test('pulls the orbit camera before a wall face',()=>{
  const hit=trainingCameraContact(from,{x:0,y:4,z:-3},[box]);
  assert(hit);
  assert.equal(hit.box,box);
  const z=from.z+(-3-from.z)*hit.t;
  assert(z>.5);
  assert(z<.7);
});

test('looks over a low fixture without pulling in',()=>{
  assert.equal(trainingCameraContact(from,{x:0,y:5,z:-3},[{...box,maxY:1}]),null);
});

test('ignores firing targets and floor metadata',()=>{
  assert.equal(trainingCameraContact(from,{x:0,y:4,z:-3},[{...box,target:0},{...box,floor:true}]),null);
});

test('does not trap an eye whose head begins inside a fixture',()=>{
  assert.equal(trainingCameraContact({x:0,y:1,z:0},{x:0,y:2,z:3},[box]),null);
});

test('nearest face wins and the tangent path stays clear',()=>{
  const farther={...box,minZ:-2,maxZ:-1.5};
  assert.equal(trainingCameraContact(from,{x:0,y:2,z:-3},[farther,box])?.box,box);
  assert.equal(trainingCameraContact({x:1.2,y:1.6,z:3},{x:1.2,y:2,z:-3},[box]),null);
});
