import {text} from './strings.js';
import {activationPlan,drillsFor} from './range-drills.js';
const beginner=new Set(['first-steps','draw-ready','reload-ready','near-far','seven-on-steel','hot-contact','first-bite','three-taps','six-certainties','spin-and-win']);
const advanced=new Set(['quickdraw','blink','swarm','priority','five-wide','two-mags','stairwell','keyhole','hold-your-breath','five-round-test','collateral','last-stand','deep-teeth','pistol-rifle','three-gun']);
export const drillWeapons=d=>[...new Set(d.weaponCycle||[d.weapon])];
export const drillLevel=d=>beginner.has(d.id)?1:advanced.has(d.id)?3:2;
export const orderedDrills=w=>drillsFor(w).map((d,i)=>({d,i})).sort((a,b)=>drillLevel(a.d)-drillLevel(b.d)||a.i-b.i).map(r=>r.d);
export const targetGoal=d=>Array.from({length:d.waves},(_,i)=>activationPlan(d,i).ids.length).reduce((a,b)=>a+b,0);
export function drillLaneOrder(d){
 if(['precision','groups','ladder'].includes(d.mode))return text('range.guide.groups');
 if(d.mode==='priority')return (d.order||[0,1,2,3,4]).map(n=>n+1).join(' → ');
 return Array.from({length:Math.min(d.waves,10)},(_,i)=>activationPlan(d,i).ids.map(n=>n+1).join(' + ')).join(' → ');
}
export function drillInstruction(d,plan){
 const p=plan||activationPlan(d,0),w=text('range.weapon.'+(p.weapon||d.weapon));
 if(p.priority!=null)return text('range.guide.priority',{lane:p.priority+1,weapon:w});
 if(d.continuous)return text('range.guide.contact',{seconds:d.contact,weapon:w});
 const zone=p.zone?text('training.zone.'+p.zone):text('range.guide.anyZone');
 return text('range.guide.shoot',{weapon:w,zone,hits:d.minHits});
}
export function drillSteps(d){
 const start=d.startHolstered?text('range.guide.holster'):d.initialRounds===0?text('range.guide.empty'):text('range.guide.ready');
 const action=d.startHolstered?text('range.guide.draw'):d.requireReload?text('range.guide.reload'):text('range.guide.wait');
 const shoot=drillInstruction(d);
 const next=d.weaponCycle?text('range.guide.transition',{weapons:drillWeapons(d).map(w=>text('range.weapon.'+w)).join(' → ')}):text('range.guide.next');
 return [start,action,shoot,next];
}
