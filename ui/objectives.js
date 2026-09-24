// GP-9: standalone presentation against injected snapshots. No world, inventory,
// timers, save writes or auto-mount. Production wiring waits for CU-4 and CL-12.
import { text } from './strings.js';

export const OBJECTIVE_SITES = Object.freeze([
  ['radio-repair','radioRepair','radio'], ['medical-convoy','medicalConvoy','medical'],
  ['ranger-cache','rangerCache','cache'], ['hikers-cache','hikersCache','medical'],
  ['trapper-cache','trapperCache','cache'], ['fuel-depot','fuelDepot','fuel'],
  ['wreck-salvage','wreckSalvage','cache']
].map(([id,key,icon])=>Object.freeze({id:`objective:${id}`,titleKey:`objectives.${key}`,icon})));
const DEFS = new Map(OBJECTIVE_SITES.map(site=>[site.id,site]));
const STATES = new Set(['undiscovered','available','active','ready-to-claim','claimed','unavailable']);
const OPEN = new Set(['available','active','ready-to-claim']);
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const run = id => (typeof id==='string'&&id.length>0)||(Number.isSafeInteger(id)&&id>=0);
function rewardLabel(reward) {
  if (!reward || typeof reward.key!=='string') return '';
  try { return text(reward.key,reward.params || {}); } catch { return ''; }
}

export function createObjectiveTracker() {
  let runId=null, sequence=-1, active=false, player=null, sites=new Map(), trackedId=null, notice='';
  function reset(id) {
    if(!run(id))return false;
    runId=id;sequence=-1;active=false;player=null;sites=new Map();trackedId=null;notice='';return true;
  }
  function update(snapshot) {
    if(!snapshot || !run(snapshot.runId) || !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence<0 || !Array.isArray(snapshot.sites))return false;
    if(runId===null)reset(snapshot.runId);
    if(snapshot.runId!==runId || snapshot.sequence<=sequence)return false;
    const next=new Map(), duplicates=new Set();
    for(const site of snapshot.sites) {
      if(!site||!DEFS.has(site.id)||!STATES.has(site.state)||!point(site.position))continue;
      if(next.has(site.id)){duplicates.add(site.id);continue;}
      next.set(site.id,{id:site.id,state:site.state,position:{x:site.position.x,z:site.position.z},
        reachable:site.reachable===true,progress:Number.isFinite(site.progress)?Math.max(0,Math.min(1,site.progress)):null,
        feedback:['full','partial','interrupted'].includes(site.feedback)?site.feedback:null,
        reward:rewardLabel(site.reward),remaining:rewardLabel(site.remaining),
        choices:(Array.isArray(site.choices)?site.choices:[]).filter(c=>c&&typeof c.id==='string'&&rewardLabel(c.reward)).map(c=>({id:c.id,label:rewardLabel(c.reward)})),
        choiceId:typeof site.choiceId==='string'?site.choiceId:null,choiceLocked:site.choiceLocked===true});
    }
    for(const id of duplicates)next.delete(id);
    sequence=snapshot.sequence;active=snapshot.active===true;player=point(snapshot.player)?{x:snapshot.player.x,z:snapshot.player.z}:null;sites=next;
    if(trackedId&&!OPEN.has(sites.get(trackedId)?.state)) {
      notice=text(sites.get(trackedId)?.state==='claimed'?'objectives.claimed':'objectives.unavailable');trackedId=null;
    }
    return true;
  }
  function track(id) {
    if(!active||!OPEN.has(sites.get(id)?.state))return false;
    trackedId=id;notice='';return true;
  }
  function untrack(){trackedId=null;notice='';}
  function read() {
    const markers=[...sites.values()].filter(s=>OPEN.has(s.state)).map(site=>{
      const def=DEFS.get(site.id),title=text(def.titleKey);
      const distance=player?Math.round(Math.hypot(site.position.x-player.x,site.position.z-player.z)):null;
      return {id:site.id,icon:def.icon,title,position:{...site.position},selected:site.id===trackedId,distance,
        label:distance===null?title:text('objectives.progress',{objective:title,distance})};
    });
    const site=sites.get(trackedId), marker=markers.find(m=>m.selected);
    let tracker=null;
    if(site&&marker) {
      let status='';
      if(site.feedback==='full')status=text('objectives.full');
      else if(site.feedback==='interrupted')status=text('objectives.interrupted');
      else if(site.state==='active')status=text('objectives.repairing');
      const reward=site.remaining?text('objectives.remaining',{reward:site.remaining}):
        site.reward?text('objectives.reward',{reward:site.reward}):'';
      const repairing=site.id==='objective:radio-repair'&&site.state==='available';
      const action=repairing?text('objectives.radioRepair'):text('objectives.claim');
      tracker={...marker,reward,status,choices:site.choices.map(c=>({...c})),choiceId:site.choiceId,choiceLocked:site.choiceLocked,
        progress:site.state==='active'?site.progress:null,busy:site.state==='active',
        prompt:site.reachable&&site.state!=='active'?(repairing?text('objectives.holdRepair'):text('objectives.interact',{action})):''};
    }
    return {runId,sequence,active,markers:active?markers:[],tracker:active?tracker:null,notice:active?notice:''};
  }
  return {reset,update,track,untrack,read};
}

// Normalized map coordinates come from the caller's projection (north/rotation belong
// to the map). Out-of-frame sites are omitted, never pinned to a false world location.
export function projectObjectiveMarkers(markers,project) {
  if(typeof project!=='function')return [];
  return markers.flatMap(marker=>{
    const p=project({...marker.position});
    return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1?
      [{...marker,mapX:p.x,mapY:p.y}]:[];
  });
}

const ICONS = {
  radio:'M8 7v7 M4 14h8 M5 3Q2 6 5 9 M11 3Q14 6 11 9 M7 5h2v2H7z',
  medical:'M6 2h4v4h4v4h-4v4H6v-4H2V6h4z',
  cache:'M2 5h12v9H2z M1 2h14v3H1z M6 7h4v3H6z',
  fuel:'M5 2h6v3l2 2v7H3V4h2z M6 6h4v5H6z'
};
function icon(doc,type) {
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('aria-hidden','true');
  const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',ICONS[type]);svg.append(path);return svg;
}

export function mountObjectives({mapRoot,hudRoot,project,onTrack=()=>{},onChoose=()=>{},doc=mapRoot?.ownerDocument}={}) {
  if(!mapRoot||!hudRoot||!doc)throw new TypeError('Objective UI needs map and HUD containers');
  const model=createObjectiveTracker(), buttons=new Map();
  const layer=doc.createElement('div');layer.className='objective-markers';layer.setAttribute('role','group');layer.setAttribute('aria-label',text('a11y.map'));layer.tabIndex=-1;
  const card=doc.createElement('aside');card.className='objective-tracker';card.hidden=true;
  const title=doc.createElement('h2'),distance=doc.createElement('span'),reward=doc.createElement('p'),status=doc.createElement('p'),prompt=doc.createElement('p');
  const progress=doc.createElement('progress');progress.max=1;progress.setAttribute('aria-label',text('objectives.repairing'));
  const stop=doc.createElement('button');stop.type='button';stop.textContent=text('objectives.untrack');
  const choiceLabel=doc.createElement('label'),choice=doc.createElement('select');
  choiceLabel.className='objective-choice';choiceLabel.append(doc.createTextNode(text('objectives.choosePack')),choice);choiceLabel.hidden=true;
  let choiceSignature='';
  choice.addEventListener('change',()=>{const t=model.read().tracker;if(t&&!t.choiceLocked)onChoose(t.id,choice.value);});
  const announcement=doc.createElement('p');announcement.className='objective-notice';announcement.setAttribute('role','status');
  status.className='objective-status';prompt.className='objective-prompt';distance.className='objective-distance';
  card.append(title,distance,choiceLabel,reward,status,progress,prompt,stop);mapRoot.append(layer);hudRoot.append(card,announcement);
  function label(el,value){if(el.textContent!==value)el.textContent=value;el.hidden=!value;}
  function paint() {
    const view=model.read(), markers=projectObjectiveMarkers(view.markers,project), ids=new Set(markers.map(m=>m.id));
    for(const [id,button] of buttons)if(!ids.has(id)) {
      if(button===doc.activeElement)layer.focus({preventScroll:true});button.remove();buttons.delete(id);
    }
    for(const marker of markers) {
      let button=buttons.get(marker.id);
      if(!button) {
        button=doc.createElement('button');button.type='button';button.className='objective-marker';button.dataset.site=marker.id;
        button.append(icon(doc,marker.icon));button.addEventListener('click',()=>{if(model.track(marker.id)){paint();onTrack(marker.id);}});
        layer.append(button);buttons.set(marker.id,button);
      }
      button.title=marker.label;button.setAttribute('aria-label',marker.label);button.setAttribute('aria-pressed',String(marker.selected));
      button.style.left=`${marker.mapX*100}%`;button.style.top=`${marker.mapY*100}%`;
    }
    layer.hidden=!view.active;card.hidden=!view.tracker;
    if(view.tracker) {
      const t=view.tracker;label(title,t.title);label(distance,t.distance===null?'':text('objectives.distance',{distance:t.distance}));
      choiceLabel.hidden=!t.choices.length;
      const signature=JSON.stringify(t.choices);
      if(signature!==choiceSignature){choiceSignature=signature;choice.replaceChildren(...t.choices.map(c=>{const option=doc.createElement('option');option.value=c.id;option.textContent=c.label;return option;}));}
      choice.value=t.choiceId||'';choice.disabled=t.choiceLocked||t.busy;
      label(reward,t.reward);label(status,t.status);label(prompt,t.prompt);progress.hidden=!t.busy;
      if(t.progress===null)progress.removeAttribute('value');else progress.value=t.progress;
    }
    label(announcement,view.notice);
    return view;
  }
  stop.addEventListener('click',()=>{model.untrack();paint();onTrack(null);layer.focus({preventScroll:true});});
  function guard(e) {
    if(e.type==='keydown'||e.type==='keyup') {
      if(e.target===choice&&e.code!=='Escape'){e.stopPropagation();return;}
      if(!['Enter','Space','Tab','Escape'].includes(e.code)){doc.activeElement?.blur();return;}
      if(e.type==='keydown'&&e.code==='Escape'){e.preventDefault();doc.activeElement?.blur();}
    }
    e.stopPropagation();
  }
  for(const parent of [layer,card])for(const type of ['keydown','keyup','mousedown','mouseup','pointerdown','pointerup','wheel','contextmenu'])parent.addEventListener(type,guard);
  paint();
  return {
    update:s=>{const accepted=model.update(s);if(accepted)paint();return accepted;},
    reset:id=>{model.reset(id);paint();},
    track:id=>{const accepted=model.track(id);if(accepted){paint();onTrack(id);}return accepted;},
    refresh:paint, read:model.read,
    destroy:()=>{layer.remove();card.remove();announcement.remove();buttons.clear();}
  };
}
