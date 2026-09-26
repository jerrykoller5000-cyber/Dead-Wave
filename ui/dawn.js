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

// D-39 (Jerry, 2026-09-25): the Night N Complete card is a small banner now, not a menu. It
// carries the same numbers (kills, skulls picked up, best streak) and one line of what to
// do next, has no buttons, never pauses the game, sits out of the way at the bottom right and
// goes on its own after DAWN_BANNER_S. The next night is started at the briefing panel only.
const DAWN_BANNER_S = 14;
export function mountDawn({doc=document,bus=window,onShow=()=>{}}={}) {
 const el=doc.createElement('aside');el.id='dawnCard';el.className='dawn-banner';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const heading=doc.createElement('h2');heading.id='dawnTitle';const stats=doc.createElement('dl');
 for(const key of ['kills','skulls','best']){const row=doc.createElement('div'),label=doc.createElement('dt'),value=doc.createElement('dd');label.textContent=text('dawn.'+key);value.dataset.stat=key;row.append(label,value);stats.append(row);}
 const tip=doc.createElement('p');tip.className='dawn-tip';
 el.append(heading,stats,tip);doc.body.append(el);
 // `open` as the dialog had it, so anything that asks whether the card is up still can.
 Object.defineProperty(el,'open',{get:()=>el.classList.contains('on')});
 let shown=null,timer=0;
 function close(){if(!el.classList.contains('on'))return false;el.classList.remove('on');shown=null;doc.body.classList.remove('dawn');if(timer){clearTimeout(timer);timer=0;}return true;}
 return {close,dialog:el,addPickups(n){
  if(!el.classList.contains('on')||!shown||!count(n))return;shown.skulls+=n;
  stats.querySelector('[data-stat="skulls"]').textContent=String(shown.skulls);
  tip.textContent=text(shown.skulls?'dawn.tipBank':'dawn.tipResupply');
 },show(summary){
  if(!summary||!['day','kills','skulls','best'].every(k=>count(summary[k]))||summary.day<1)return false;
  shown={...summary};
  heading.textContent=text('dawn.title',{day:summary.day});
  for(const key of ['kills','skulls','best'])stats.querySelector('[data-stat="'+key+'"]').textContent=String(summary[key]);
  tip.textContent=text(summary.skulls?'dawn.tipBank':'dawn.tipResupply');
  // Restart the slide-in if it is already up.
  el.classList.remove('on');void el.offsetWidth;el.classList.add('on');doc.body.classList.add('dawn');
  if(timer)clearTimeout(timer);timer=setTimeout(()=>{close();},DAWN_BANNER_S*1000);
  try{onShow();}catch{}return true;
 }};
}
