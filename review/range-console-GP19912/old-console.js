import {text} from '/ui/strings.js';
import {RANGE_WEAPONS,drillsFor} from '/ui/range-drills.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(k,p)=>esc(text(k,p));
const label=d=>text(`range.drill.${d.weapon}.${d.id}.name`);
export function mountRangeConsole({owned,signature,records,start,retry,exit,cancel,openSelection}={}){
 if(!document.getElementById('rangeDrillStyle')){const link=document.createElement('link');link.id='rangeDrillStyle';link.rel='stylesheet';link.href=new URL('./old.css',import.meta.url).href;document.head.append(link);}
 const root=document.createElement('section');root.id='rangeConsole';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',text('range.console'));
 const hud=document.createElement('aside');hud.id='rangeDrillHud';hud.hidden=true;
 document.body.append(root,hud);
 let weapon='pistol',selected=null,mode='selection',error='',last='',view=null;
 function boards(d){
  const rows=records.list(d,signature(d.weapon));
  return `<div class="rd-records"><h3>${t('range.boards')}</h3>${rows.length?`<strong>${t('range.best',{score:rows[0].score})}</strong><p class="rd-dim">${t('range.columns')}</p><ol>${rows.map(r=>`<li><b>${r.score}</b><span>${r.time.toFixed(2)}s</span><span>${r.efficiency.toFixed(1)}%</span><time>${esc(new Date(r.at).toLocaleDateString())}</time></li>`).join('')}</ol>`:`<p>${t('range.empty')}</p>`}<p class="rd-dim">${t('range.ties')}</p></div>`;
 }
 function rules(d){return `<p class="rd-dim">${t('range.tuning',{duration:d.duration,waves:d.waves,exposure:d.mode==='precision'?d.duration:d.exposure,gap:d.gap})}</p><p>${d.continuous?t('range.continuous',{contact:d.contact,clear:d.clearBonus}):t('range.points')}</p><p class="rd-dim">${[['clear',d.clearBonus],['speed',d.speedBonus],['pellet',d.pelletBonus],['collateral',d.collateralBonus],['efficiency',d.efficiencyBonus]].filter(([,v])=>v).map(([k,v])=>t('range.bonus.'+k,{amount:v})).join(' · ')}. ${t('range.penalties',{miss:d.missPenalty,wrong:d.wrongZonePenalty})}</p><p>${d.budget!=null?t('range.budget',{budget:d.budget,unit:text(d.weapon==='flamer'?'range.fuel':'range.rounds')}):t('range.unlimited')}</p>`;}
 function render(){
  if(mode!=='selection')return;
  const ds=drillsFor(weapon),d=selected||ds[0],available=owned(weapon);
  root.innerHTML=`<div class="rd-panel"><header><div><small>${t('range.select')}</small><h2>${t('range.console')}</h2></div><button data-close aria-label="${t('range.close')}">×</button></header><p>${t('range.choose')}</p><p class="rd-rules">${t('range.rules')}</p><div class="rd-layout"><nav aria-label="${t('range.weapons')}">${RANGE_WEAPONS.map(w=>`<button data-weapon="${w}" class="${w===weapon?'selected':''}">${t('range.weapon.'+w)}${owned(w)?'':' <span>🔒</span>'}</button>`).join('')}</nav><main><div class="rd-drills">${ds.map(v=>`<article class="range-card ${v===d?'selected':''}"><button data-drill="${v.id}" ${available?'':'disabled'}><b>${esc(label(v))}</b><span>${t(`range.drill.${weapon}.${v.id}.objective`)}</span></button><button class="rd-board-button" data-board="${v.id}">${t('range.boards')}</button></article>`).join('')}</div><div class="rd-details"><h3>${esc(label(d))}</h3>${rules(d)}<p class="rd-dim">${t('range.ammo')}</p>${!available?`<p class="rd-error">${t('range.locked')}</p>`:''}${error?`<p class="rd-error" role="alert">${t('range.'+error)}</p>`:''}${boards(d)}</div></main></div></div>`;
 }
 root.addEventListener('click',e=>{
  e.stopPropagation();const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close')||b.hasAttribute('data-exit')){exit();return;}
  if(b.hasAttribute('data-retry')){const r=retry();if(r&&!r.ok){let alert=root.querySelector('[data-retry-error]');if(!alert){alert=document.createElement('p');alert.dataset.retryError='';alert.className='rd-error';alert.setAttribute('role','alert');root.querySelector('footer').before(alert);}alert.textContent=text('range.'+r.reason);}return;}
  if(b.hasAttribute('data-select')){openSelection();return;}
  if(b.dataset.weapon){weapon=b.dataset.weapon;selected=null;error='';render();return;}
  if(b.dataset.board){selected=drillsFor(weapon).find(d=>d.id===b.dataset.board);render();return;}
  if(b.dataset.drill){selected=drillsFor(weapon).find(d=>d.id===b.dataset.drill);const r=start(selected);if(!r.ok){error=r.reason;render();}}
 });
 for(const event of ['pointerdown','pointerup','mousedown','mouseup','wheel'])root.addEventListener(event,e=>e.stopPropagation());
 const key=e=>{if(root.hidden){if(e.code==='Escape'&&view&&['PREPARING','COUNTDOWN','ACTIVE'].includes(view.state)){e.preventDefault();e.stopImmediatePropagation();cancel();}return;}if(['KeyE','KeyB','KeyG','KeyF','Space','Enter'].includes(e.code)){e.stopImmediatePropagation();if(e.code==='Enter'&&e.target?.tagName==='BUTTON')e.target.click();e.preventDefault();}if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();}};
 window.addEventListener('keydown',key,true);
 return {
  open(){mode='selection';root.hidden=false;hud.hidden=true;error='';render();root.querySelector('[data-weapon="'+weapon+'"]')?.focus();},
  close(){root.hidden=true;},isOpen:()=>!root.hidden,
  results(r,d,entry){mode='results';root.hidden=false;hud.hidden=true;const valid=r.valid;root.innerHTML=`<div class="rd-panel rd-result"><header><h2>${t('range.'+r.state.toLowerCase())}</h2></header><p>${t('range.weapon.'+d.weapon)} / ${esc(label(d))}</p><div class="rd-big ${valid?'':'rd-error'}">${valid?r.score:t('range.void')}</div>${r.reason?`<p class="rd-error">${t('range.reason.'+r.reason)}</p>`:''}<p>${t('range.result',{score:r.score,time:r.time.toFixed(2),efficiency:r.efficiency.toFixed(1),metric:text(d.continuous?'range.contact':'range.accuracy')})}</p><p class="rd-dim">${t('range.breakdown',{base:Math.round(r.base),bonuses:Math.round(r.bonuses),deductions:Math.round(r.deductions)})}</p>${valid&&entry?`<p>${entry.best?t('range.newBest'):entry.rank?t('range.rank',{rank:entry.rank}):''}</p><p class="rd-dim">${t(entry.storageOK?'range.saved':'range.storage')}</p>`:''}${boards(d)}<footer><button data-retry>${t('range.retry')}</button><button data-select>${t('range.back')}</button><button data-exit>${t('range.exit')}</button></footer></div>`;root.querySelector('[data-retry]')?.focus();},
  update(s){view=s;const live=['PREPARING','COUNTDOWN','ACTIVE'].includes(s.state);hud.hidden=!live;hud.classList.toggle('rd-countdown',s.state==='COUNTDOWN');if(!live||!s.drill)return;const d=s.drill,key=JSON.stringify([s.state,Math.ceil(s.countdown),Math.ceil(d.duration-s.elapsed),s.score,s.wave,s.stats.cleared,Math.floor(s.stats.units),s.plan?.zone,s.plan?.priority]);if(last===key)return;last=key;
   hud.innerHTML=`<div><small>${t('range.weapon.'+d.weapon)} / ${esc(label(d))}</small><strong>${t('range.'+s.state.toLowerCase())}</strong></div>${s.state==='COUNTDOWN'?`<b class="rd-count">${Math.ceil(s.countdown)}</b>`:s.state==='ACTIVE'?`<div class="rd-numbers"><b>${t('range.score',{score:s.score})}</b><span>${t('range.time',{time:Math.max(0,Math.ceil(d.duration-s.elapsed))})}</span></div><p>${t('range.progress',{wave:s.wave,waves:d.waves,cleared:s.stats.cleared})}</p><strong class="rd-call">${s.plan?.priority!=null?t('range.call.priority',{lane:s.plan.priority+1}):t('range.call.'+(s.plan?.zone||'any'))}</strong>${d.budget!=null?`<p>${t('range.ammoLeft',{amount:Math.max(0,+(d.budget-s.stats.units).toFixed(1)),unit:text(d.weapon==='flamer'?'range.fuel':'range.rounds')})}</p>`:''}`:''}<small class="rd-dim">${t('range.cancelHint')}</small>`;
  },destroy(){window.removeEventListener('keydown',key,true);root.remove();hud.remove();}
 };
}
