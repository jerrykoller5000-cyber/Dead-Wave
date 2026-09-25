import { text } from './strings.js';
const count = n => Number.isSafeInteger(n) && n >= 0;

// Presentation-only per-night record. Cumulative kills provide a baseline; best
// streak is sampled for this night, never copied from the run's lifetime best.
export function createNightRecord() {
 let night = null;
 return {
  begin(day, kills) { if(count(day)&&day>0&&count(kills))night={day,baseline:kills,kills:0,skulls:0,best:0}; },
  observe(kills, streak) { if(!night)return; if(count(kills))night.kills=Math.max(night.kills,kills-night.baseline);if(count(streak))night.best=Math.max(night.best,streak); },
  pickup(n) { if(night&&count(n))night.skulls+=n; },
  finish(day) { if(!night||day!==night.day)return null;const result={day:night.day,kills:night.kills,skulls:night.skulls,best:night.best};night=null;return result; },
  reset() { night=null; }
 };
}

export function mountDawn({doc=document,bus=window,onMorning=()=>{},onNextNight=()=>{},onShow=()=>{}}={}) {
 const dialog=doc.createElement('dialog');dialog.id='dawnCard';dialog.setAttribute('aria-labelledby','dawnTitle');
 const heading=doc.createElement('h2');heading.id='dawnTitle';const stats=doc.createElement('dl');
 for(const key of ['kills','skulls','best']){const row=doc.createElement('div'),label=doc.createElement('dt'),value=doc.createElement('dd');label.textContent=text('dawn.'+key);value.dataset.stat=key;row.append(label,value);stats.append(row);}
 const tip=doc.createElement('p');tip.className='dawn-tip';const footer=doc.createElement('footer');
 const skip=doc.createElement('button'),next=doc.createElement('button');skip.type=next.type='button';skip.textContent=text('dawn.nextNight');next.textContent=text('dawn.morning');next.className='primary';
 footer.append(skip,next);dialog.append(heading,stats,tip,footer);doc.body.append(dialog);let returnFocus=null,shown=null;
 function close(){if(!dialog.open)return false;dialog.close();shown=null;doc.body.classList.remove('dawn');if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});return true;}
 function proceed(){if(close())onMorning();}
 next.addEventListener('click',proceed);skip.addEventListener('click',()=>{if(close())onNextNight();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();proceed();});
 for(const type of ['keydown','keyup','mousedown','mouseup','wheel','contextmenu'])bus.addEventListener(type,e=>{
  if(!dialog.open)return;e.stopImmediatePropagation();
  if(type==='keydown'&&e.code==='Escape'){e.preventDefault();if(!e.repeat)proceed();}
 },true);
 return {close,dialog,addPickups(n){
  if(!dialog.open||!shown||!count(n))return;shown.skulls+=n;
  stats.querySelector('[data-stat="skulls"]').textContent=String(shown.skulls);
  tip.textContent=text(shown.skulls?'dawn.tipBank':'dawn.tipResupply');
 },show(summary){
  if(dialog.open||!summary||!['day','kills','skulls','best'].every(k=>count(summary[k]))||summary.day<1)return false;
  shown={...summary};
  heading.textContent=text('dawn.title',{day:summary.day});
  for(const key of ['kills','skulls','best'])stats.querySelector('[data-stat="'+key+'"]').textContent=String(summary[key]);
  tip.textContent=text(summary.skulls?'dawn.tipBank':'dawn.tipResupply');returnFocus=doc.activeElement;
  doc.body.classList.add('dawn');dialog.showModal();next.focus();try{onShow();}catch{}return true;
 }};
}
