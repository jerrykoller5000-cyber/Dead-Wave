import {text} from './strings.js';

const LABELS = new Set(['ranger','hikers','trapper','campsite','cabin','shed','wreck','tower','graveyard','mast','dock'].map(k=>'world.'+k));
export function createCampNotice() {
 let runId=null, current=null, seen=new Set();
 return {
  receive(event,now) {
   if(event?.type==='run-reset'){runId=event.runId;current=null;seen.clear();return false;}
   if(event?.type!=='poi-cleared'||runId===null||event.runId!==runId||!LABELS.has(event.labelKey)||!Number.isFinite(now)||!Number.isInteger(event.index)||event.index<0||!Number.isInteger(event.day)||event.day<1)return false;
   const id=event.day+':'+event.kind+':'+event.index;
   if(seen.has(id))return false;
   seen.add(id);current={label:text('poi.cleared',{name:text(event.labelKey)}),until:now+2000};return true;
  },
  read(now) {if(current&&now>=current.until)current=null;return current?.label||'';}
 };
}

export function mountCampNotice({doc=document,bus=window,now=()=>performance.now()}={}) {
 const model=createCampNotice(),el=doc.createElement('div');el.id='campCleared';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 (doc.getElementById('hudNotices')||doc.body).append(el);let timer;
 const paint=()=>{el.textContent=model.read(now());el.hidden=!el.textContent;};
 const receive=({detail})=>{if(model.receive(detail,now())){clearTimeout(timer);timer=setTimeout(paint,2000);}paint();};
 bus.addEventListener('dw-game',receive);
 return {element:el,destroy(){clearTimeout(timer);bus.removeEventListener('dw-game',receive);el.remove();}};
}

if(typeof document!=='undefined')mountCampNotice();
