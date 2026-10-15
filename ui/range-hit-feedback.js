// Physical plate contact and drill credit are separate. Report rejected contact
// without awarding points or letting a stale/duplicate projectile farm feedback.
import {text} from './strings.js';
export function drillHitFeedback(before,after,index,sc,token,accepted){
 if(!sc||before.state!=='ACTIVE'||token?.phase!=='ACTIVE'||token.run!==before.id||
    token.activation!==before.activation||token.weapon!==before.drill?.weapon)return null;
 const slot=before.targets.find(t=>t.index===index);
 if(!slot||slot.clearAt!=null&&before.elapsed>slot.clearAt)return null;
 const zone=text('training.zone.'+sc.zone),mult=sc.mult&&sc.mult!==1?' ×'+sc.mult:'';
 if(accepted){
  if(before.drill.minHits<=1)return null;
  const hits=after.targets.find(t=>t.index===index)?.hits||0;
  return {kind:'progress',main:'+'+Math.round(sc.total),sub:text('range.hit.progress',{zone,mult,hits,required:before.drill.minHits}),tone:sc.zone==='head'||sc.zone==='bull'?'gold':sc.zone==='ring'?'amber':'grey'};
 }
 let kind,sub;
 if(before.plan.zone&&sc.zone!==before.plan.zone&&!(before.plan.zone==='ring'&&sc.zone==='bull')){
  kind='zone';sub=text('range.hit.zone',{zone,required:text('training.zone.'+before.plan.zone)});
 }else if(before.plan.priority!=null&&before.plan.priority!==index){
  kind='priority';sub=text('range.hit.priority',{lane:before.plan.priority+1});
 }else if(slot.done||slot.hits>=before.drill.maxEvents){kind='cleared';sub=text('range.hit.cleared');}
 else return null; // duplicates and other session refusals are not new impacts
 const penalty=Math.max(0,after.stats.deductions-before.stats.deductions);
 return {kind,main:penalty?'−'+penalty:text('range.hit.contact'),sub,tone:kind==='cleared'?'grey':'red'};
}
