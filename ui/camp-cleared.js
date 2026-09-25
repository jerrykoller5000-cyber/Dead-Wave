import {text} from './strings.js';

const LABELS = new Set(['ranger','hikers','trapper','campsite','cabin','shed','wreck','tower','graveyard','mast','dock'].map(k=>'world.'+k));
export function createCampNotice() {
 let runId=null, current=null, seen=new Set();
 return {
  receive(event,now) {
   if(event?.type==='run-reset'){runId=event.runId;current=null;seen.clear();return false;}
   if(!['poi-cleared','bounty-done'].includes(event?.type)||runId===null||event.runId!==runId||!LABELS.has(event.labelKey)||!Number.isFinite(now)||!Number.isInteger(event.index)||event.index<0||!Number.isInteger(event.day)||event.day<1)return false;
   const bounty=event.type==='bounty-done';
   if(bounty&&(!Number.isSafeInteger(event.reward)||event.reward<=0))return false;
   const id=event.day+':'+event.kind+':'+event.index;
   if(!bounty&&seen.has('bounty:'+id))return false;
   const receipt=(bounty?'bounty:':'clear:')+id;
   if(seen.has(receipt))return false;
   seen.add(receipt);current={label:text(bounty?'bounty.done':'poi.cleared',{name:text(event.labelKey),value:event.reward||0}),until:now+2000};return true;
  },
  read(now) {if(current&&now>=current.until)current=null;return current?.label||'';}
 };
}

export function mountCampNotice({doc=document,bus=window,now=()=>performance.now()}={}) {
 const model=createCampNotice(),el=doc.createElement('div');el.id='campCleared';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 (doc.getElementById('hudNotices')||doc.body).append(el);let timer, pending=false;
 const paint=()=>{const label=model.read(now());if(el.textContent!==label)el.textContent=label;el.hidden=!label;};
 // Combat emits the clear and paid bounty in one turn. Paint their final state once,
 // so the visible/live-region notice is the reward, not two announcements.
 const receive=({detail})=>{
  if(model.receive(detail,now())) {
   clearTimeout(timer);timer=setTimeout(paint,2000);
   if(!pending){pending=true;queueMicrotask(()=>{pending=false;paint();});}
  } else if(detail?.type==='run-reset'){clearTimeout(timer);paint();}
 };
 bus.addEventListener('dw-game',receive);
 return {element:el,destroy(){clearTimeout(timer);bus.removeEventListener('dw-game',receive);el.remove();}};
}

if(typeof document!=='undefined')mountCampNotice();
