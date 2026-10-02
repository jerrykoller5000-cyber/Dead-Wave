// GP-65: approved record/event adapters supply these milestone facts. This persists accomplishments, never inventory, power or a saved run.
export const BADGES_KEY = 'tt_badges';
const count = n => Number.isSafeInteger(n) && n >= 0;
const atLeast = (n,threshold) => count(n) && n >= threshold;
const RULES = Object.freeze({
  'choir-practice': f => f.rabbitKilled === true,
  'brought-them-home': f => f.tagsRecovered === 9,
  'nobody-left-behind': f => f.evacuated === true && f.trueEnding !== true && Array.isArray(f.survivorsAboard) && ['okafor','brandt','pike'].every(id=>f.survivorsAboard.includes(id)),
  'silence': f => f.trueEnding === true,
  'first-bank': f => f.firstBank === true,
  'relay-online': f => f.relayOnline === true,
  'night-five': f => atLeast(f.nightReached,5),
  'night-ten': f => atLeast(f.nightReached,10),
  'night-twenty': f => atLeast(f.nightReached,20),
  'fog-survivor': f => f.nightCleared === 14 && f.nightKind === 'fog',
  'kicked-free': f => f.kickedFree === true,
  'out-on-the-boat': f => f.evacuated === true,
  'thousand-skulls': f => atLeast(f.skullsBanked,1000),
  'thousand-kills': f => atLeast(f.kills,1000),
  'hundred-headshots': f => atLeast(f.headshots,100),
  'streak-twenty': f => atLeast(f.streak,20)
});
export const BADGE_IDS = Object.freeze(Object.keys(RULES));
export function qualifyingBadges(facts) {
  if(facts?.eligibleRun !== true)return [];
  return BADGE_IDS.filter(id=>RULES[id](facts));
}
export function createBadges({load=()=>null,save=()=>{}}={}) {
  const unlocked=new Set();
  try {
    const value=JSON.parse(load());
    if(value?.version===1&&Array.isArray(value.unlocked))
      for(const id of value.unlocked)if(BADGE_IDS.includes(id))unlocked.add(id);
  } catch { /* corrupt or denied storage cannot stop play */ }
  const read=()=>({version:1,unlocked:BADGE_IDS.filter(id=>unlocked.has(id))});
  return {
    read,
    observe(facts) {
      const added=qualifyingBadges(facts).filter(id=>!unlocked.has(id));
      if(!added.length)return [];
      for(const id of added)unlocked.add(id);
      try { save(JSON.stringify(read())); } catch { /* retain session badges */ }
      return added;
    }
  };
}
