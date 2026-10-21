import { text } from './strings.js';

export const TURRET_BLUEPRINTS = Object.freeze(['light', 'flame', 'heavy', 'mortar']);
export function cheapestTurretBlueprint(prices = {}, unlocked = {}) {
  return TURRET_BLUEPRINTS.filter(id => !unlocked[id] && Number.isFinite(prices[id]) && prices[id] >= 0)
    .sort((a,b) => prices[a] - prices[b] || TURRET_BLUEPRINTS.indexOf(a) - TURRET_BLUEPRINTS.indexOf(b))[0] ?? null;
}

export function drawCalls(rng, night, owned = {}) {
  if (typeof rng !== 'function' || !Number.isSafeInteger(night) || night < 1) return [];
  const pool = ['ammo', 'medical'];
  if (owned.allTurrets !== true) pool.push('hardware');
  if (owned.fieldIntel !== true) pool.push('intel');
  if (night >= 4) pool.push('blackout');
  for (let i = pool.length - 1; i > 0; i--) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) return [];
    const j = Math.floor(value * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Owns the offer, never inventory. claim commits the objective's daily receipt;
// publish runs once after commitment, including under synchronous re-entry.
export function createDailyCall({ rng = Math.random, claim = () => null, publish = () => {} } = {}) {
  let runId = null, day = 0, cards = [], drawn = false, closed = false, available = false;
  let receipt = null, busy = false, owned = {}, blueprint = null, repaired = false;
  const eligible = card => card === 'hardware' ? TURRET_BLUEPRINTS.includes(blueprint) && !owned.blueprints?.[blueprint] && !owned.allTurrets :
    card !== 'intel' || !owned.fieldIntel;
  const validReceipt = r => r && r.runId === runId && r.day === day &&
    ['ammo','medical','hardware','intel','blackout'].includes(r.card) && typeof r.receiptId === 'string' && !!r.receiptId;
  function reset(id) {
    runId=id;day=0;cards=[];drawn=false;closed=false;available=false;receipt=null;busy=false;owned={};blueprint=null;repaired=false;
  }
  return {
    reset,
    update(state = {}) {
      if (state.runId !== runId || !Number.isSafeInteger(state.day) || state.day < 1 || state.day < day) return false;
      if (state.day > day) { day=state.day;cards=[];drawn=false;closed=false;receipt=null;blueprint=null; }
      owned = { ...state.owned, blueprints: { ...state.owned?.blueprints } };
      repaired = state.repaired === true;
      if (!receipt && validReceipt(state.receipt)) receipt = { ...state.receipt };
      if (state.alarm === true || state.phase === 'wave') closed = true;
      available = state.phase === 'prep' && repaired && state.callable === true && !closed && !receipt;
      if (available && !drawn) {
        blueprint = TURRET_BLUEPRINTS.includes(state.hardwareBlueprint) ? state.hardwareBlueprint : null;
        cards = drawCalls(rng, day, { ...owned, allTurrets: !blueprint || owned.allTurrets === true });
        drawn = true;
      }
      return true;
    },
    read() {
      return { runId, day, repaired, status: !repaired ? 'down' : closed ? 'closed' : receipt ? 'picked' : available ? 'available' : 'closed',
        cards: available ? cards.map(id => ({id,enabled:eligible(id),...(id==='hardware'?{blueprint}:{})})) : [],
        picked: receipt?.card ?? null, receipt: receipt ? {...receipt} : null };
    },
    pick(card) {
      if (receipt) return receipt.card === card ? {...receipt} : null;
      if (busy || !available || !cards.includes(card) || !eligible(card)) return null;
      busy=true;
      try {
        const result=claim({runId,day,card});
        if (!validReceipt(result) || result.card !== card) return null;
        receipt={...result,...(card==='hardware'?{blueprint}:{})};available=false;
        publish({...receipt});
        return {...receipt};
      } finally { busy=false; }
    }
  };
}

export function buildRadioCallView(call) {
  if (!call) return null;
  const view={title:text('radioCall.title'),note:'',cards:[]};
  if(call.status==='down')view.note=text('radioCall.down');
  else if(call.status==='closed')view.note=text('radioCall.closed');
  else if(call.status==='picked')view.note=text(call.picked==='intel'?'radioCall.intelGranted':'radioCall.requested',
    {card:text('radioCall.'+call.picked+'.name')});
  else {
    view.note=text(call.cards?.length?'radioCall.ready':'radioCall.empty');
    view.cards=(call.cards||[]).map(card=>({id:card.id,enabled:card.enabled,
      name:text('radioCall.'+card.id+'.name'),
      description:text('radioCall.'+card.id+'.description',card.id==='hardware'?{blueprint:text('build.'+card.blueprint+'.name')}:{})}));
  }
  return view;
}
