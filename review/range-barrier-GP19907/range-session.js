// GP-19901. No timers or engine globals: targets and session share the game's paused clock.
import {RANGE_RULES,activationPlan} from './range-drills.js';
let serial=0;
const running=s=>['PREPARING','COUNTDOWN','ACTIVE'].includes(s);
const ruled=s=>s==='COUNTDOWN'||s==='ACTIVE';
export function createRangeSession({targets,cue=()=>{},onEnd=()=>{},now=()=>Date.now()}={}){
 let state='IDLE',d=null,id='',loadout='',elapsed=0,countdown=8,wave=-1,activation=0,plan=null;
 let phase='gap',gap=0,exposed=0,drain=null,shot=0,stats={},slots=new Map(),seen=new Set(),wrong=new Set(),successful=new Set(),shotTargets=new Map(),result=null;
 const zero=()=>({base:0,bonuses:0,deductions:0,shots:0,units:0,attackSeconds:0,contactSeconds:0,cleared:0,missed:0});
 const score=()=>Math.max(0,Math.round(stats.base+stats.bonuses-stats.deductions));
 const efficiency=()=>d?.continuous?Math.min(100,100*stats.contactSeconds/Math.max(.00001,stats.attackSeconds)):Math.min(100,100*successful.size/Math.max(1,stats.shots));
 function finish(kind,reason=''){
  if(!running(state))return false;
  state=kind;targets.lowerAll();slots.clear();phase='ended';
  if(kind==='COMPLETED')stats.bonuses+=Math.round((d.efficiencyBonus||0)*efficiency()/100);
  result=Object.freeze({id,state,reason,valid:kind==='COMPLETED',score:score(),time:elapsed,efficiency:efficiency(),weapon:d.weapon,drill:d.id,loadout,at:now(),...stats});
  cue(kind==='COMPLETED'?'end':kind==='DISQUALIFIED'?'void':'abort');onEnd(result);return true;
 }
 function checkPosition(p){
  if(!ruled(state)||!p)return;
  if(p.x< -8||p.x>8||p.z< -12||p.z>30)finish('ABORTED','left-range');
 }
 function activate(){
  wave++;activation++;plan=activationPlan(d,wave);slots.clear();seen.clear();wrong.clear();shotTargets.clear();
  for(const index of plan.ids)slots.set(index,{hits:0,contact:0,done:false,clearAt:null,bonus:false});
  targets.raise(plan.ids,plan);phase='raising';exposed=0;cue('wave');
 }
 function clear(index,s){
  if(s.done)return;s.done=true;s.clearAt=elapsed+RANGE_RULES.settle;stats.cleared++;
  stats.bonuses+=d.clearBonus+(d.speedBonus?Math.round(d.speedBonus*Math.max(0,1-exposed/Math.max(.01,plan.exposure))):0);
  if(d.mode==='priority')plan.priority=(d.order||[0,1,2,3,4]).find(i=>slots.has(i)&&!slots.get(i).done)??null;
 }
 function start(drill,{position,loadout:signature='base'}={}){
  if(!drill||!position||position.x< -8||position.x>8||position.z< -12||position.z>30)return {ok:false,reason:'start-position'};
  if(running(state))finish('ABORTED','replaced');
  d=drill;id=`${now()}-${++serial}`;loadout=signature;elapsed=0;countdown=RANGE_RULES.countdown;wave=-1;activation=0;phase='gap';gap=0;drain=null;shot=0;stats=zero();slots.clear();seen.clear();successful.clear();shotTargets.clear();result=null;
  state='PREPARING';targets.lowerAll();cue('prepare');return {ok:true,id};
 }
 function canAttack(weapon,units=1,source='weapon'){
  if(!ruled(state))return true;
  if(source==='throwable'){finish('DISQUALIFIED','grenade');return false;}
  if(weapon!==d.weapon){finish('DISQUALIFIED','weapon');return false;}
  return state!=='ACTIVE'||d.budget==null||stats.units+units<=d.budget+.000001;
 }
 function attack(weapon,{units=1,seconds=0,source='weapon'}={}){
  if(!canAttack(weapon,units,source))return null;
  if(!ruled(state))return null;
  const token=Object.freeze({run:id,phase:state,weapon,shot:++shot,activation});
  if(state==='ACTIVE'){
   stats.shots++;stats.units+=units;stats.attackSeconds+=seconds;
   if(d.budget!=null&&stats.units>=d.budget-.000001&&drain==null)drain=RANGE_RULES.drain;
  }
  return token;
 }
 const eligible=t=>state==='ACTIVE'&&t?.run===id&&t.phase==='ACTIVE'&&t.weapon===d.weapon&&t.activation===activation;
 function hit(index,{token,event,zone,points=0}={}){
  const s=slots.get(index);
  if(!eligible(token)||!s||!targets.ready(index)||s.clearAt!=null&&elapsed>s.clearAt||d.continuous)return false;
  const key=`${token.shot}/${event}/${index}`;if(seen.has(key))return false;seen.add(key);
  const zoneOK=!plan.zone||zone===plan.zone||plan.zone==='ring'&&zone==='bull';
  if(!zoneOK||plan.priority!=null&&plan.priority!==index){const penalty=token.shot+'/'+index;if(!wrong.has(penalty)){wrong.add(penalty);stats.deductions+=d.wrongZonePenalty;}return false;}
  if(s.hits>=d.maxEvents)return false;
  s.hits++;successful.add(token.shot);stats.base+=Math.max(0,points);
  let touched=shotTargets.get(token.shot);if(!touched)shotTargets.set(token.shot,touched=new Set());
  if(!touched.has(index)&&touched.size)stats.bonuses+=d.collateralBonus||0;touched.add(index);
  if(s.hits>1)stats.bonuses+=d.pelletBonus||0;
  if(s.hits>=d.minHits)clear(index,s);
  return true;
 }
 function contact(indices,dt,token){
  if(!eligible(token)||!d.continuous||!Number.isFinite(dt)||dt<=0)return false;
  const live=[...new Set(indices)].filter(i=>slots.has(i)&&!slots.get(i).done&&targets.ready(i));
  if(!live.length)return false;
  // Per-frame union, never per blob. Only active firing time can earn contact credit.
  const credit=Math.min(dt,Math.max(0,stats.attackSeconds-stats.contactSeconds));
  if(!credit)return false;stats.contactSeconds+=credit;
  for(const i of live){const s=slots.get(i),step=Math.min(credit,d.contact-s.contact);s.contact+=step;stats.base+=step*25/d.contact;if(s.contact>=d.contact-.000001)clear(i,s);}
  return true;
 }
 function tick(dt,{position,paused=false,alive=true,inTraining=true,signature}={}){
  if(!running(state))return;
  if(!alive||!inTraining){finish('ABORTED',alive?'left-training':'death');return;}
  if(signature!=null&&signature!==loadout){finish('ABORTED','loadout');return;}
  checkPosition(position);if(!running(state)||paused)return;
  dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));
  if(state==='PREPARING'){if(targets.allDown()){if(position&&(position.x< -8||position.x>8||position.z< -12||position.z>30)){finish('ABORTED','start-position');return;}state='COUNTDOWN';cue('countdown');}return;}
  if(state==='COUNTDOWN'){
   const before=Math.ceil(countdown);countdown=Math.max(0,countdown-dt);
   if(countdown===0){state='ACTIVE';cue('start');activate();}
   else if(Math.ceil(countdown)!==before)cue('count');return;
  }
  elapsed+=dt;
  if(elapsed>=d.duration){finish('COMPLETED');return;}
  if(drain!=null){drain-=dt;if(drain<=0){finish('COMPLETED');return;}}
  for(const [i,s] of slots)if(s.clearAt!=null&&elapsed>=s.clearAt)targets.lower([i]);
  if(phase==='raising'){
   if(plan.ids.every(i=>targets.ready(i))){phase='exposed';exposed=0;}return;
  }
  if(phase==='exposed'){
   exposed+=dt;
   if([...slots.values()].every(s=>s.done&&elapsed>=s.clearAt)||exposed>=plan.exposure){
    for(const s of slots.values())if(!s.done){stats.missed++;stats.deductions+=d.missPenalty;}
    targets.lower(plan.ids);phase='lowering';
   }
  }else if(phase==='lowering'&&targets.allDown()){
   if(wave+1>=d.waves){finish('COMPLETED');return;}
   phase='gap';gap=d.gap;
  }else if(phase==='gap'){
   gap-=dt;if(gap<=0&&drain==null)activate();
  }
 }
 function reset(){if(running(state))finish('ABORTED','exit');state='IDLE';d=null;result=null;slots.clear();targets.release?.();}
 return {start,tick,canAttack,attack,hit,contact,checkPosition,abort:r=>finish('ABORTED',r||'cancel'),reset,
  snapshot:()=>({state,drill:d,id,loadout,elapsed,countdown,wave:wave+1,activation,plan,phase,score:d?score():0,efficiency:d?efficiency():0,stats:{...stats},result,targets:[...slots].map(([index,s])=>({index,...s}))}),
  owns:()=>state!=='IDLE',running:()=>running(state),ruled:()=>ruled(state),eligible};
}
