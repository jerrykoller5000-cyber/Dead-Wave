import test from 'node:test';
import assert from 'node:assert/strict';
import {createRangeSession} from '../../ui/range-session.js';
import {findDrill} from '../../ui/range-drills.js';
import {drillHitFeedback} from '../../ui/range-hit-feedback.js';
import {hitPopText} from '../../ui/training-hit-pops.js';
function setup(w,id){
 const ready=new Set(),d=findDrill(w,id),s=createRangeSession({targets:{lowerAll(){ready.clear();},allDown:()=>!ready.size,raise(ids){ids.forEach(i=>ready.add(i));},ready:i=>ready.has(i),lower(ids){ids.forEach(i=>ready.delete(i));}}});
 s.start(d,{position:{x:0,z:-2}});for(let i=0;i<34;i++)s.tick(.25);s.tick(.01);
 return {s,d};
}
function hit(s,index,sc,event=1,token=s.attack(s.snapshot().drill.weapon)){
 const before=s.snapshot(),accepted=s.hit(index,{token,event,zone:sc.zone,points:sc.total}),after=s.snapshot();
 return {accepted,before,after,popup:drillHitFeedback(before,after,index,sc,token,accepted),token};
}
const head={zone:'head',total:10,mult:1},bull={zone:'bull',total:10,mult:1};
test('a real head hit rejected by a bull-only drill explains the deduction instead of going silent',()=>{
 const {s}=setup('pistol','bullseye'),r=hit(s,0,head);
 assert.equal(r.accepted,false);assert.equal(r.after.stats.base,0);assert.equal(r.after.stats.deductions,2);
 assert.equal(r.popup.main,'−2');assert.equal(r.popup.sub,'Hit Head · Aim at Bullseye');assert.equal(r.popup.tone,'red');
 assert.equal(hitPopText({...head,popup:r.popup}).sub,r.popup.sub);
});
test('a wrong priority lane explains which visible plate should be shot next',()=>{
 const {s}=setup('m4','priority'),r=hit(s,0,bull);
 assert.equal(r.accepted,false);assert.equal(r.after.stats.deductions,6);assert.equal(r.popup.main,'−6');assert.equal(r.popup.sub,'Wrong order · Shoot lane 5');
});
test('four-count shows partial progress while leaving the plate up until all four actual hits',()=>{
 const {s}=setup('ak','four-count');
 for(let i=1;i<=4;i++){const r=hit(s,0,bull,i);assert.equal(r.accepted,true);assert.equal(r.popup.sub,`Bullseye · ${i}/4 hits`);assert.equal(r.after.targets[0].done,i===4);}
 assert.equal(s.snapshot().stats.base,40);assert.equal(s.snapshot().stats.cleared,1);
});
test('legal single-hit credit and bull-as-ring rules retain their original feedback and score',()=>{
 const {s}=setup('ak','torso-ladder'),r=hit(s,0,bull);assert(r.accepted);assert.equal(r.popup,null);assert.equal(r.after.stats.base,10);
});
test('a previous activation or run cannot generate either points or a misleading rejection popup',()=>{
 const {s}=setup('pistol','bullseye'),token=s.attack('pistol');
 for(const bad of [{...token,activation:token.activation-1},{...token,run:'old'},{...token,phase:'COUNTDOWN'},{...token,weapon:'ak'}]){
  const r=hit(s,0,head,1,bad);assert(!r.accepted);assert.equal(r.popup,null);assert.equal(r.after.stats.deductions,0);
 }
});
test('a duplicate accepted contact does not manufacture progress or points',()=>{
 const {s}=setup('ak','four-count'),r=hit(s,0,bull,7),again=hit(s,0,bull,7,r.token);
 assert(!again.accepted);assert.equal(again.popup,null);assert.equal(again.after.stats.base,10);assert.equal(again.after.targets[0].hits,1);
});
test('a shot at the already cleared plate is identified without increasing its score',()=>{
 const {s}=setup('m4','five-wide');hit(s,0,bull);const r=hit(s,0,bull,2);
 assert(!r.accepted);assert.equal(r.popup.sub,'Plate already cleared');assert.equal(r.popup.main,'HIT');assert.equal(r.after.stats.base,10);
});
