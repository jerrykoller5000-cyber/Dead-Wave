// GP-11 objective state, independent of world/input/inventory. Adapters must use
// approved owner contracts; this module never infers reach through a wall.
const RADIO = 'objective:radio-repair';
export const OBJECTIVE_IDS = Object.freeze(['radio-repair','medical-convoy','ranger-cache',
  'hikers-cache','trapper-cache','fuel-depot','wreck-salvage'].map(id=>'objective:'+id));
const FIXED = {
  'objective:medical-convoy': {id:'medpen',kind:'medpen',quantity:2},
  'objective:hikers-cache': {id:'medpen',kind:'medpen',quantity:1},
  'objective:trapper-cache': {id:'grenade',kind:'grenade',quantity:1}
};
const STATES = new Set(['undiscovered','available','active','ready-to-claim','claimed','unavailable']);
const clone = value => structuredClone(value);
const validRun = id => (typeof id==='string'&&id.length>0)||(Number.isSafeInteger(id)&&id>=0);
const quantity = n => Number.isFinite(n)&&n>0;
const row = id => ({id,state:'undiscovered',progress:0,feedback:null,pack:null,remaining:null,attempt:0,pending:null});

export function createObjectives(initialRunId) {
  let runId, sequence, revealed, sites, active=false, reachable=new Set(), damageRevision=null;
  function reset(id) {
    if(!validRun(id))throw new TypeError('Objective run id required');
    runId=id;sequence=0;revealed=false;sites=new Map(OBJECTIVE_IDS.map(id=>[id,row(id)]));
    active=false;reachable.clear();damageRevision=null;
  }
  reset(initialRunId);
  function interrupt(site) {
    if(site.state==='active'){site.state='available';site.progress=0;site.feedback='interrupted';}
  }
  // sites is an authoritative owner snapshot. Discovery and reachable are supplied
  // independently; visibility on a map does not imply the player can use a site.
  function update(input) {
    if(!input||input.runId!==runId||!Array.isArray(input.sites))return false;
    active=input.active===true;reachable.clear();
    const damaged=damageRevision!==null&&input.damageRevision!==damageRevision;
    damageRevision=input.damageRevision;
    const rows=new Map(input.sites.map(s=>[s.id,s]));
    for(const site of sites.values()) {
      const fact=rows.get(site.id);
      if(fact?.exists===false){site.state='unavailable';site.progress=0;site.feedback=null;continue;}
      if(site.state==='unavailable'||site.state==='claimed')continue;
      if(fact?.exists!==true){interrupt(site);continue;}
      if(site.state==='undiscovered'&&(fact.discovered===true||revealed))site.state='available';
      if(active&&fact.reachable===true)reachable.add(site.id);
    }
    const radio=sites.get(RADIO);
    if(['available','active'].includes(radio.state)) {
      const holding=active&&reachable.has(RADIO)&&input.targetId===RADIO&&input.held===true&&!damaged;
      if(!holding)interrupt(radio);
      else {
        radio.state='active';radio.feedback=null;
        // The caller supplies gameplay elapsed time, never wall-clock/modal time.
        const dt=Number.isFinite(input.dt)&&input.dt>0?Math.min(input.dt,.25):0;
        radio.progress=Number.isFinite(input.holdSeconds)&&input.holdSeconds>=0
          ? Math.min(6,input.holdSeconds) : Math.min(6,radio.progress+dt);
        if(radio.progress>=6) {
          radio.state='ready-to-claim';revealed=true;
          for(const site of sites.values())if(site.state==='undiscovered')site.state='available';
        }
      }
    }
    sequence++;return true;
  }
  function eligible(id,choices) {
    if(FIXED[id])return [clone(FIXED[id])];
    const seen=new Set();
    return (Array.isArray(choices)?choices:[]).filter(p=>{
      if(!p||typeof p.id!=='string'||!p.id||seen.has(p.id)||!quantity(p.quantity))return false;
      if(p.kind!=='ammo'&&!(id==='objective:fuel-depot'&&p.kind==='fuel'))return false;
      seen.add(p.id);return true;
    }).map(p=>clone(p));
  }
  // Prepare/settle lets inventory apply its own receipt once, then report accepted
  // units. A lost response retries the same request, rather than creating supplies.
  function beginClaim({id,choiceId,choices=[]}={}) {
    const site=sites.get(id);
    if(!site||!active||!reachable.has(id)||!['available','ready-to-claim'].includes(site.state)||id===RADIO&&site.state!=='ready-to-claim')return null;
    if(site.pending)return clone(site.pending);
    const options=eligible(id,choices);
    const pack=site.pack||options.find(p=>p.id===choiceId)||(FIXED[id]?options[0]:null);
    if(!pack)return null;
    site.state='ready-to-claim';site.feedback=null;site.attempt++;
    site.pending={runId,siteId:id,receiptId:`${id}:claim:${site.attempt}`,pack:clone(pack),quantity:site.remaining??pack.quantity};
    sequence++;return clone(site.pending);
  }
  function settleClaim({runId:claimRun,siteId,receiptId,accepted,remaining}={}) {
    const site=sites.get(siteId),pending=site?.pending;
    if(claimRun!==runId||!pending||pending.receiptId!==receiptId)return false;
    const total=pending.quantity;
    if(!Number.isFinite(accepted)||!Number.isFinite(remaining)||accepted<0||remaining<0||accepted>total||Math.abs(accepted+remaining-total)>1e-7)return false;
    if(['medpen','grenade'].includes(pending.pack.kind)&&(!Number.isInteger(accepted)||!Number.isInteger(remaining)))return false;
    if(accepted>0){site.pack=clone(pending.pack);site.remaining=remaining;}
    // A site removed during inventory delivery still records the grant, but cannot
    // reappear as an available target. Inventory must also persist this transaction.
    if(site.state!=='unavailable')site.state=remaining===0?'claimed':'ready-to-claim';
    site.feedback=remaining===0?null:accepted===0?'full':'partial';site.pending=null;
    sequence++;return true;
  }
  function snapshot() {
    return {runId,sequence,revealed,active,sites:[...sites.values()].map(site=>({...clone(site),reachable:active&&reachable.has(site.id)}))};
  }
  function save() {
    return {version:1,runId,revealed,sites:[...sites.values()].map(clone)};
  }
  // Cursor must restore this in the same transaction as inventory and its receipts.
  // Validate the entire blob before replacing anything; partial restore is forbidden.
  function restore(blob) {
    if(!blob||blob.version!==1||!validRun(blob.runId)||typeof blob.revealed!=='boolean'||!Array.isArray(blob.sites)||blob.sites.length!==OBJECTIVE_IDS.length)return false;
    const next=new Map();
    for(const saved of blob.sites) {
      if(!saved||!OBJECTIVE_IDS.includes(saved.id)||next.has(saved.id)||!STATES.has(saved.state)||!Number.isFinite(saved.progress)||saved.progress<0||saved.progress>6||!Number.isSafeInteger(saved.attempt)||saved.attempt<0)return false;
      if(saved.pack!==null&&(!saved.pack||typeof saved.pack.id!=='string'||!quantity(saved.pack.quantity)||!['ammo','fuel','medpen','grenade'].includes(saved.pack.kind)))return false;
      if(saved.remaining!==null&&(!saved.pack||!Number.isFinite(saved.remaining)||saved.remaining<0||saved.remaining>saved.pack.quantity))return false;
      if(saved.pending!==null) {
        const p=saved.pending;
        if(!p||p.runId!==blob.runId||p.siteId!==saved.id||p.receiptId!==`${saved.id}:claim:${saved.attempt}`||!quantity(p.quantity)||!p.pack||!quantity(p.pack.quantity)||p.quantity>p.pack.quantity||typeof p.pack.id!=='string'||!['ammo','fuel','medpen','grenade'].includes(p.pack.kind))return false;
      }
      const site=clone(saved);interrupt(site);next.set(site.id,site);
    }
    runId=blob.runId;revealed=blob.revealed;sites=next;sequence++;active=false;reachable.clear();damageRevision=null;
    return true;
  }
  return {reset,update,beginClaim,settleClaim,snapshot,save,restore};
}
