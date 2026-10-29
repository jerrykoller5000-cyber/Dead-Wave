import test from 'node:test';import assert from 'node:assert/strict';import {BRUTE,stepBrute,resetBrute} from './brute-behavior.js';
// GB-246 (ChatGPT GP-19970 live probe): the wind began at 1.95 m but the strike checks 1.72 m, so a brute walking up to a still marine always whiffed.
const ctx=t=>({x:0,z:1,speed:1.85,target:t,valid:true,canStart:true,dodging:()=>false,blocked:()=>false});
test('the planted wind starts inside the strike reach',()=>{assert(BRUTE.startRange<BRUTE.reach);});
test('a brute walking straight at a still marine lands the smash',()=>{
  const t={position:{x:0,y:0,z:10},alive:true,hp:100},z={typeKey:'brute',alive:true,attackCd:0,mesh:{position:{x:0,y:0,z:0},rotation:{y:0},userData:{}}};
  let hit=false,dt=1/60;
  for(let i=0;i<60*12&&!hit;i++){const r=stepBrute(z,dt,ctx(t));if(r?.hit)hit=true;if(!r?.busy){const sp=r?r.speed:1.85;z.mesh.position.z=Math.min(z.mesh.position.z+sp*dt,t.position.z-1.0);if(r)z.mesh.rotation.y=r.yaw;}}
  assert(hit,'still target was whiffed');resetBrute(z);
});