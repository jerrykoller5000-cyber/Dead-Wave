import test from 'node:test';import assert from 'node:assert/strict';
import {createRangeSession} from '../../ui/range-session.js';
import {findDrill,boardKey} from '../../ui/range-drills.js';
import {orderedDrills,drillLevel,targetGoal} from '../../ui/range-guide.js';
import {createRangeRecords} from '../../ui/range-records.js';
function rig(id,w='pistol'){
 const d=findDrill(w,id),live=new Set(),s=createRangeSession({targets:{lowerAll(){live.clear();},allDown:()=>!live.size,raise(ids){ids.forEach(i=>live.add(i));},ready:i=>live.has(i),lower(ids){ids.forEach(i=>live.delete(i));}}});s.start(d,{position:{x:0,z:-2}});s.tick(.01);
 const step=(n,c={})=>{for(let i=0;i<n;i++)s.tick(1/60,{position:{x:0,z:-2},...c});};return{s,d,step};
}
test('menu starts with an easy any-zone lesson and never reverses the difficulty order',()=>{
 const ds=orderedDrills('pistol');assert.equal(ds[0].id,'first-steps');assert.equal(ds[0].zone,undefined);
 assert(ds.every((d,i)=>!i||drillLevel(ds[i-1])<=drillLevel(d)));
});
test('drawing during countdown voids the draw challenge; firing waits for a real post-beep draw',()=>{
 const early=rig('draw-ready');early.s.tick(.01,{holstered:false});assert.equal(early.s.snapshot().result.reason,'early-draw');
 const r=rig('draw-ready');r.step(481,{holstered:true,weapon:'pistol'});assert.equal(r.s.attack('pistol'),null);
 r.s.tick(.01,{holstered:false,weapon:'pistol'});assert(r.s.attack('pistol'));assert.equal(r.s.snapshot().stats.draws,1);
});
test('reload challenge cannot be bypassed by merely presenting a loaded weapon',()=>{
 const r=rig('reload-ready','m4');r.step(481,{weapon:'m4',reloading:false,loaded:30});assert.equal(r.s.attack('m4'),null);
 r.s.tick(.1,{weapon:'m4',reloading:true,loaded:0});assert.equal(r.s.attack('m4'),null);
 r.s.tick(.1,{weapon:'m4',reloading:false,loaded:0});assert.equal(r.s.attack('m4'),null);
 r.s.tick(.1,{weapon:'m4',reloading:false,loaded:30});assert(r.s.attack('m4'));assert.equal(r.s.snapshot().stats.reloads,1);
});
test('relay tokens follow the current weapon call and old activation tokens stay invalid',()=>{
 const r=rig('pistol-rifle');r.step(481);const token=r.s.attack('pistol');assert(r.s.hit(0,{token,event:1,zone:'bull',points:10}));
 for(let i=0;i<150&&r.s.snapshot().activation===1;i++)r.s.tick(1/60);
 assert.equal(r.s.snapshot().expectedWeapon,'m4');assert(r.s.attack('m4'));assert.equal(r.s.hit(1,{token,event:2,zone:'bull',points:10}),false);
 assert.equal(r.s.attack('pistol'),null);assert.equal(r.s.snapshot().state,'DISQUALIFIED');
});
test('v1 score history survives migration without fabricating full-clear speed records',()=>{
 const d=findDrill('pistol','bullseye'),value=JSON.stringify({version:1,boards:{[boardKey(d,'base')]:[{id:'old',score:60,time:2,efficiency:100,at:1}]}}),r=createRangeRecords({load:()=>value});
 assert.equal(r.summary(d,'base').score.score,60);assert.equal(r.summary(d,'base').speed,undefined);
});
test('speed/accuracy bests exclude incomplete runs and survive when outside the top-ten scores',()=>{
 const d=findDrill('pistol','first-steps');let data;const r=createRangeRecords({save:s=>data=s,now:()=>3});
 const full={state:'COMPLETED',cleared:targetGoal(d),missed:0};
 r.commit(d,'base',{...full,id:'fast',score:1,time:2,efficiency:95});
 for(let i=0;i<11;i++)r.commit(d,'base',{...full,id:'score'+i,score:100+i,time:20+i,efficiency:80});
 r.commit(d,'base',{id:'incomplete',state:'COMPLETED',score:999,time:1,efficiency:100,cleared:1,missed:4});
 const restored=createRangeRecords({load:()=>data});assert.equal(restored.summary(d,'base').speed.id,'fast');assert.equal(restored.summary(d,'base').accuracy.id,'fast');assert.equal(restored.summary(d,'base').score.id,'incomplete');assert.equal(restored.list(d,'base').length,10);
});
test('draw response is recorded independently from total run speed and survives reload',()=>{
 const d=findDrill('pistol','draw-ready');let data;const r=createRangeRecords({save:s=>data=s,now:()=>4}),full={state:'COMPLETED',cleared:1,missed:0,draws:1,efficiency:100,score:30};
 r.commit(d,'base',{...full,id:'quick-draw',time:5,firstShot:1});r.commit(d,'base',{...full,id:'quick-run',time:3,firstShot:2});
 const restored=createRangeRecords({load:()=>data});assert.equal(restored.summary(d,'base').draw.id,'quick-draw');assert.equal(restored.summary(d,'base').speed.id,'quick-run');
});
