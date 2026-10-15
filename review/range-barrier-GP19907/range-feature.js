import {text} from './strings.js';
import {createRangeSession} from './range-session.js';
import {createRangeRecords,RANGE_RECORDS_KEY} from './range-records.js';
import {createRangeTargets,createRangeProp} from './range-targets.js';
import {mountRangeConsole} from './range-console.js';
export function createRangeFeature(T,tg,env){
 const targets=createRangeTargets(T,tg),records=createRangeRecords({load:()=>localStorage.getItem(RANGE_RECORDS_KEY),save:s=>localStorage.setItem(RANGE_RECORDS_KEY,s)});
 const prop=createRangeProp(T,tg,{title:text('range.prop.title'),subtitle:text('range.prop.subtitle')});
 let lease=null,lastDrill=null,pending=null,entry=null,ui;
 const position=()=>{const p=env.context().position;return{x:p.x-tg.origin.x,z:p.z-tg.origin.z};};
 const session=createRangeSession({targets,cue:kind=>{if(kind==='start')env.refill(lastDrill?.weapon);env.cue(kind);env.publish(kind,session.snapshot());},onEnd:r=>{
  env.stop();if(lease){env.restore(lease);lease=null;}pending=r;entry=r.valid?records.commit(lastDrill,r.loadout,r):null;
 }});
 function start(d){
  const c=env.context(),p=position();
  if(c.busy)return {ok:false,reason:'busy'};
  if(p.x< -8||p.x>8||p.z< -12||p.z>30)return {ok:false,reason:'start-position'};
  if(!env.owned(d.weapon))return {ok:false,reason:'locked'};
  session.reset();pending=null;entry=null;
  lease=env.equip(d.weapon);if(!lease)return {ok:false,reason:'equip'};
  lastDrill=d;targets.prepare(d);const r=session.start(d,{position:p,loadout:env.signature(d.weapon)});
  if(!r.ok){env.restore(lease);lease=null;session.reset();return r;}
  ui.close();env.pause(false);env.stop();ui.update(session.snapshot());return r;
 }
 function exit(){session.reset();pending=null;entry=null;ui.close();env.pause(false);env.stop();ui.update(session.snapshot());}
 function open(){if(session.running())session.abort('cancel');session.reset();pending=null;entry=null;env.stop();env.pause(true);ui.open();env.cue('open');}
 ui=mountRangeConsole({owned:env.owned,signature:env.signature,records,start,retry:()=>start(lastDrill),exit,cancel:()=>session.abort('cancel'),openSelection:open});
 return {
  open,start,exit,isOpen:()=>ui.isOpen(),owns:session.owns,ruled:session.ruled,
  canAttack:(w,u=1,source='weapon')=>session.canAttack(w,u,source),attack:(w,o)=>session.attack(w,o),
  hit(index,point,token,event){if(!session.owns())return false;const i=targets.localIndex(index);if(i<0)return false;const sc=tg.scoreHit(index,point);const ok=sc&&session.hit(i,{token,event,zone:sc.zone,points:sc.total});if(ok)env.feedback(index,point,sc);return !!ok;},
  blast(g,radius){if(!session.owns())return;for(const h of targets.blast(g.pos,radius))this.hit(h.index,null,g.rangePacket,'blast');},
  flame(a,b,token){return session.eligible(token)?targets.flame(a,b):null;},
  contact:(ids,dt,token)=>session.contact(ids,dt,token),
  saw(dt,hits){const token=session.attack('chainsaw',{units:dt,seconds:dt});return session.contact(hits.map(h=>targets.localIndex(h.index)).filter(i=>i>=0),dt,token);},
  check(){const c=env.context();session.checkPosition(position());if(c.pairChanged&&session.ruled())session.abort('loadout');if(session.running()&&(!c.alive||!c.inTraining))session.abort(c.alive?'left-training':'death');},
  tick(dt){const c=env.context();prop.update(c.camera,c.position,dt);if(c.pairChanged&&session.ruled())session.abort('loadout');session.tick(dt,{...c,position:position(),signature:lastDrill?env.signature(lastDrill.weapon):undefined});if(pending&&['death','left-training'].includes(pending.reason)){pending=null;session.reset();ui.close();}const s=session.snapshot();ui.update(s);if(pending&&targets.allDown()){const r=pending;pending=null;env.stop();env.pause(true);ui.results(r,lastDrill,entry);}},
  abort:session.abort,read:session.snapshot,records,
  dispose(){session.reset();if(lease){env.restore(lease);lease=null;}ui.destroy();prop.dispose();pending=null;env.pause(false);},
 };
}
