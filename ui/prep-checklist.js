import { text, hasText } from './strings.js';

const CALIBRES = { '9mm':'9mm', '5.56mm':'556', '7.62mm':'762', '.44':'44', '.338':'338',
  '12ga':'12ga', '40mm':'40mm', '7.62 belt':'belt762', Fuel:'fuel', '60mm':'60mm' };
const amount = value => Number.isFinite(value) && value >= 0;
const validAmmo = a => a && a.owned === true && Object.hasOwn(CALIBRES,a.calibre) && typeof a.id === 'string' &&
  amount(a.loaded) && amount(a.reserve) && amount(a.threshold) && a.threshold > 0;

// All targets are frozen at prep entry. This observer never grants rewards, starts
// waves or chooses tactical areas. Repair candidates must come from their owner.
export function createPrepChecklist() {
  let runId = null, day = null, revision = null, rows = [], phase = '', alarm = false;
  const receipts = new Set();
  function snapshot(s = {}) {
    if (!Number.isSafeInteger(s.day) || s.day < 1 || s.runId == null) return read();
    if (runId != null && s.runId !== runId) return read();
    if (day != null && s.day < day) return read();
    phase = s.phase;
    if (s.phase !== 'prep') return read();
    if (day !== s.day) {
      runId = s.runId; day = s.day; revision = s.revision ?? s.day; rows = []; receipts.clear(); alarm = !!s.alarm;
      if (s.skulls > 0 || s.pendingCount > 0) {
        rows.push({id:'bank', kind:'bank', done:false});
        if (s.pendingCount > 0 && s.pendingReceiptId) receipts.add(s.pendingReceiptId);
      }
      const a = (s.ammo || []).find(a => validAmmo(a) && a.loaded + a.reserve < a.threshold &&
        ((amount(a.cost) && amount(s.cash) && s.cash >= a.cost) || a.cacheAvailable === true));
      if (a) rows.push({id:`ammo:${a.id}`,kind:'ammo',target:a.id,calibre:a.calibre,threshold:a.threshold,done:false});
      const r = (s.repairs || []).find(r => r && typeof r.id === 'string' && r.reachable === true &&
        r.exists === true && hasText(`build.${r.buildId}.name`) && amount(r.hp) && amount(r.requiredHp) &&
        r.hp < r.requiredHp && amount(r.cost) && amount(s.cash) && s.cash >= r.cost);
      if(r) rows.push({id:`repair:${r.id}`,kind:'repair',target:r.id,buildId:r.buildId,threshold:r.requiredHp,done:false});
      if (rows.length < 3 && s.canAlarm === true) rows.push({id:'alarm',kind:'alarm',done:alarm});
    }
    // A revised plan invalidates unfinished tactical repair targets, not completed
    // work or unrelated banking/ammo. Never silently replace a row under the player.
    if ((s.revision ?? s.day) !== revision) {
      for (const row of rows) if(row.kind==='repair'&&!row.done)row.unavailable=true;
      revision = s.revision ?? s.day;
    }
    for (const row of rows) {
      if (row.done || row.unavailable) continue;
      if (row.kind === 'ammo') {
        const a = (s.ammo || []).find(a => a.id === row.target);
        if (!validAmmo(a)) row.unavailable = true;
        else if (a.loaded + a.reserve >= row.threshold) row.done = true;
      } else if (row.kind === 'repair') {
        const r = (s.repairs || []).find(r => r.id === row.target);
        if (!r || !r.exists) row.unavailable = true;
        else if (amount(r.hp) && r.hp >= row.threshold) row.done = true;
      }
    }
    return read();
  }
  function handle(e = {}) {
    if(e.type==='run-reset') {
      runId=e.runId;day=null;revision=null;rows=[];receipts.clear();phase='';alarm=false;return read();
    }
    if (e.runId !== runId || !day || (e.day != null && e.day !== day)) return read();
    if(e.type==='deposit-accepted' && e.count>0 && e.receiptId)receipts.add(e.receiptId);
    if(e.type==='deposit-complete' && e.count>0 && e.value>0 && receipts.has(e.receiptId)) {
      const row=rows.find(r=>r.kind==='bank');if(row)row.done=true;receipts.delete(e.receiptId);
    }
    if(e.type==='alarm-started') { alarm=true;const row=rows.find(r=>r.kind==='alarm');if(row)row.done=true; }
    return read();
  }
  function read() {
    const goals=rows.map(row=>({...row,label:row.kind==='ammo'?text('prep.ammo',{calibre:text(`calibre.${CALIBRES[row.calibre]}`)}):
      row.kind==='repair'?text('prep.repair',{buildName:text(`build.${row.buildId}.name`)}):text(`prep.${row.kind}`)}));
    return {runId,day,revision,visible:phase==='prep'&&goals.length>0,collapse:alarm,
      goals, summary:text('prep.summary',{done:goals.filter(r=>r.done).length,total:goals.length})};
  }
  return {snapshot,handle,read};
}

export function renderPrepRows(container, view, doc = document) {
  container.replaceChildren();
  for(const goal of view?.goals || []) {
    const row=doc.createElement('li'), mark=doc.createElement('span'), label=doc.createElement('span');
    row.dataset.goal=goal.id;row.dataset.state=goal.done?'done':goal.unavailable?'unavailable':'pending';
    mark.textContent=goal.done?'✓':'○';mark.setAttribute('aria-hidden','true');
    label.textContent=goal.label;
    if(goal.done||goal.unavailable) {
      const status=doc.createElement('small');status.textContent=text(goal.done?'prep.complete':'prep.unavailable');label.append(status);
    }
    row.append(mark,label);container.append(row);
  }
}

export function mountPrepChecklist({doc=document,bus=window}={}) {
  const hud=doc.getElementById('hud');if(!hud)return;
  const controller=createPrepChecklist(), panel=doc.createElement('details'), summary=doc.createElement('summary'), list=doc.createElement('ul');
  panel.id='prepChecklist';panel.hidden=true;panel.setAttribute('aria-label',text('a11y.prep'));
  list.className='prep-goals';panel.append(summary,list);hud.append(panel);
  let ready=false, current=null, lastRender='', active=false;
  const suppressed=()=>['opening','frontend','deploying','cine','briefing'].some(c=>doc.body.classList.contains(c))||
    !!doc.querySelector('#pause.show,#shop.show,#win.show,#devConsole.show');
  function render(view) {
    current=view;panel.hidden=!ready||!active||!view.visible||suppressed();
    const signature=JSON.stringify(view);
    if(signature===lastRender)return;
    lastRender=signature;summary.textContent=view.summary;renderPrepRows(list,view,doc);
    if(view.collapse)panel.open=false;
    bus.dispatchEvent(new CustomEvent('dw-game',{detail:{type:'prep-checklist-view',view}}));
  }
  bus.addEventListener('dw-game',({detail:e})=>{
    if(!e||e.type==='prep-checklist-view')return;
    if(e.type==='controls-ready')ready=true;
    if(e.type==='prep-state') {
      active=e.active===true;
      if(ready)render(controller.snapshot(e));
    } else if(['run-reset','deposit-accepted','deposit-complete','alarm-started'].includes(e.type))render(controller.handle(e));
  });
  // Let native keyboard/click disclosure work without sending fire/movement to the game.
  for(const type of ['keydown','keyup','mousedown','mouseup','wheel','contextmenu'])bus.addEventListener(type,e=>{
    if(!panel.contains(e.target))return;
    if((type==='keydown'||type==='keyup')&&!['Space','Enter','Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      summary.blur();return; // Movement/interact returns immediately to play after a click.
    }
    e.stopImmediatePropagation();
    if(type==='keydown'&&e.code==='Escape'){e.preventDefault();panel.open=false;summary.blur();}
  },true);
  const observer=new MutationObserver(()=>{if(current)render(current);});
  for(const target of [doc.body,...doc.querySelectorAll('#pause,#shop,#win,#devConsole')])observer.observe(target,{attributes:true,attributeFilter:['class']});
  return {controller,panel};
}

if(typeof window!=='undefined'&&typeof document!=='undefined')mountPrepChecklist();
