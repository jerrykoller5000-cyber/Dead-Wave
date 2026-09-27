import { BADGE_IDS } from './badges.js';
import { text } from './strings.js';
const count=n=>Number.isSafeInteger(n)&&n>=0;
const validRun=id=>Number.isSafeInteger(id)&&id>=0||typeof id==='string'&&id.length>0;
const receipt=id=>typeof id==='string'&&id.length>0;
const copyKey=id=>id.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());

// Only this adapter turns approved facts into awards. Live counters cannot award
// end-of-run badges; a dawn clear cannot impersonate a run record.
export function createBadgeAdapter({store,getEligible=()=>undefined,onAward=()=>{}}) {
  let runId=null,disqualified=false,relaySeen=false;
  const finished=new Set(),earned=new Set();
  const eligible=explicit=>{
    if(explicit===false||getEligible()===false)disqualified=true;
    return !disqualified;
  };
  function award(facts,moment,explicit) {
    if(!eligible(explicit))return [];
    const ids=store.observe({eligibleRun:true,...facts});
    for(const id of ids)earned.add(id);
    if(ids.length)onAward(ids,{moment});
    return ids;
  }
  return {
    reset(id){if(!validRun(id))return false;runId=id;disqualified=false;relaySeen=false;earned.clear();return true;},
    earned:()=>[...earned],
    receive(event) {
      if(event?.type==='run-reset'){this.reset(event.runId);return [];}
      if(runId===null||event?.runId!==runId||finished.has(runId))return [];
      if(event.type==='deposit-complete'&&receipt(event.receiptId)&&count(event.count)&&event.count>0)
        return award({firstBank:true},true,event.eligible);
      if(event.type==='guardian-kick-free'&&receipt(event.receiptId)&&count(event.day)&&event.day>0)
        return award({kickedFree:true},true,event.eligible);
      if(event.type==='night-cleared'&&event.day===14&&event.kind==='fog')
        return award({nightCleared:event.day,nightKind:event.kind},true,event.eligible);
      return [];
    },
    relay(snapshot) {
      if(runId===null||snapshot?.runId!==runId||finished.has(runId)||relaySeen||snapshot.radioCall?.repaired!==true)return [];
      relaySeen=true;return award({relayOnline:true},true,snapshot.eligible);
    },
    finish(id,record) {
      if(id!==runId||finished.has(id)||!record||!['day','kills','streak','headshots','skulls'].every(k=>count(record[k]))||record.day<1||typeof record.evacuated!=='boolean')return [];
      finished.add(id);
      return award({nightReached:record.day,kills:record.kills,headshots:record.headshots,
        streak:record.streak,skullsBanked:record.skulls,evacuated:record.evacuated},false,record.eligible);
    }
  };
}

export function badgeCollection(snapshot,newIds=[]) {
  const unlocked=new Set(snapshot?.unlocked||[]),fresh=new Set(newIds);
  const rows=BADGE_IDS.map(id=>({id,name:text('badges.'+copyKey(id)+'.name'),description:text('badges.'+copyKey(id)+'.description'),
    unlocked:unlocked.has(id),isNew:unlocked.has(id)&&fresh.has(id)}));
  return {summary:text('badges.summary',{count:rows.filter(r=>r.unlocked).length,total:rows.length}),rows};
}
export function renderBadgeCollection(host,snapshot,newIds=[]) {
  if(!host)return;
  const doc=host.ownerDocument,view=badgeCollection(snapshot,newIds);
  const expanded=host.querySelector('.badge-toggle')?.getAttribute('aria-expanded')==='true';
  host.replaceChildren();host.classList.add('lifetime-badges');
  const toggle=doc.createElement('button');toggle.type='button';toggle.className='badge-toggle';
  toggle.textContent=view.summary;toggle.setAttribute('aria-expanded',String(expanded));
  const grid=doc.createElement('span');grid.className='badge-grid';grid.id=host.id+'-list';grid.setAttribute('role','list');grid.hidden=!expanded;
  toggle.setAttribute('aria-controls',grid.id);
  for(const row of view.rows){
    const item=doc.createElement('span');item.className='lifetime-badge'+(row.unlocked?' earned':' locked');item.dataset.badge=row.id;item.setAttribute('role','listitem');
    const label=doc.createElement('strong');label.textContent=row.name;
    const status=doc.createElement('span');status.className='badge-state';status.textContent=text(row.isNew?'badges.new':row.unlocked?'badges.earned':'badges.locked');
    const description=doc.createElement('span');description.className='badge-description';description.textContent=row.description;
    item.append(label,status,description);grid.append(item);
  }
  toggle.addEventListener('click',()=>{grid.hidden=!grid.hidden;toggle.setAttribute('aria-expanded',String(!grid.hidden));});
  host.append(toggle);
  const fresh=view.rows.filter(r=>r.isNew);
  if(fresh.length){const notice=doc.createElement('span');notice.className='badges-new';notice.textContent=text('badges.newList',{names:fresh.map(r=>r.name).join(' · ')});host.append(notice);}
  host.append(grid);
}
