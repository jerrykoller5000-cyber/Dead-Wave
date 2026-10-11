import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traceTraining } from '../../world/training-ballistics.js';
const src=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const body=src.match(/function shotBlocked\(from, to\) \{[\s\S]*?\n    \}/)[0];
const tg={origin:{x:0,y:-200,z:-640},floorY:-200,targets:[],solids:[]};
const ctx={training:{active:true,tg},traceTraining,sampleHeight:()=>-200,house:{present:false},rocks:[],trees:[],builds:[],worldSolids:[]};
vm.runInNewContext(body,ctx);
const wall={minX:-8.3,maxX:-7.7,minY:-201,maxY:-176,minZ:-652,maxZ:-610,wall:true};
test('plain-coordinate spider and spitter LOS detects the wall without throwing',()=>{
  tg.solids=[wall];
  assert.equal(ctx.shotBlocked({x:-26,y:-199,z:-632},{x:0,y:-198.7,z:-632}),true);
});
test('plain-coordinate clear LOS remains clear',()=>{
  tg.solids=[wall];
  assert.equal(ctx.shotBlocked({x:-26,y:-199,z:-632},{x:-20,y:-198.7,z:-632}),false);
});
test('a wall in the final 0.3 metres is the aimed surface, not an obstruction',()=>{
  tg.solids=[wall];
  assert.equal(ctx.shotBlocked({x:-26,y:-199,z:-632},{x:-8.1,y:-198.7,z:-632}),false);
});
test('existing Vector3-style inputs retain their coordinate behavior',()=>{
  tg.solids=[wall];
  const a={x:-26,y:-199,z:-632,distanceTo(){throw Error('Method must not be required');}};
  assert.equal(ctx.shotBlocked(a,{x:0,y:-198.7,z:-632}),true);
});
