// game/utilities.js - CL-289 (D-106, Jerry: "the generator unlocks electricity might be fun for one to unlock plumbing";
// after Myst): each mini-game of the story chain switches one of the HQ's utilities back on, the change seen in the
// world, and some need another first (the pump, the bench and the siren run on the generator's power).
// Pure rules: no DOM, no three. The page says which lead is done and when he sets a thing up at the HQ; this says
// what is on, what is waiting and on what.
//
// A utility is 'off' until its lead is done, then 'earned'. One that sets itself up ('auto') comes on as soon as what it
// needs is on; one with an install (E at the HQ's pump, the bench, the roof's siren) comes on when he does it, and only
// with what it needs on. Iron is a supply, not a switch: earned, it gives him horseshoe sets to hang over gaps (W2).

export const UTILITIES = Object.freeze([
  { id: 'power', lead: 'generator', needs: [], setup: 'auto' },
  { id: 'comms', lead: 'relay', needs: [], setup: 'auto' },
  { id: 'infirmary', lead: 'medical', needs: [], setup: 'auto' },
  { id: 'plumbing', lead: 'missing', needs: ['power'], setup: 'install', at: 'hq-pump' },
  { id: 'workshop', lead: 'truck', needs: ['power'], setup: 'install', at: 'hq-bench' },
  { id: 'alarm', lead: 'search', needs: ['power'], setup: 'install', at: 'hq-roof-siren' },
  { id: 'iron', lead: 'oldman', needs: [], setup: 'auto', supply: { horseshoes: 4 } },
  { id: 'hush', lead: 'below', needs: [], setup: 'auto' },
].map((u) => Object.freeze(u)));

const byId = new Map(UTILITIES.map((u) => [u.id, u]));
const byLead = new Map(UTILITIES.map((u) => [u.lead, u]));
export function utilityOf(id) { return byId.get(id) || null; }
export function utilityOfLead(lead) { return byLead.get(lead) || null; }

export function createUtilities(options = {}) {
  const list = options.utilities || UTILITIES;
  let st = null;
  const fresh = () => { st = { state: {}, supply: {} }; for (const u of list) st.state[u.id] = 'off'; };
  const missing = (u) => u.needs.filter((n) => st.state[n] !== 'on');
  // Anything earned and set to come on by itself, with what it needs on, comes on (in a chain: power then the rest).
  function settle() {
    const on = [];
    for (let pass = 0; pass < list.length; pass++) {
      let moved = false;
      for (const u of list) if (st.state[u.id] === 'earned' && u.setup === 'auto' && !missing(u).length) {
        st.state[u.id] = 'on'; on.push(u.id); moved = true;
        if (u.supply) for (const [k, v] of Object.entries(u.supply)) st.supply[k] = (st.supply[k] || 0) + v;
      }
      if (!moved) break;
    }
    return on;
  }
  const api = {
    // A lead's mission was done: its utility is earned. Returns the utilities that came on because of it.
    leadDone(lead) {
      const u = byLead.get(lead); if (!u || st.state[u.id] !== 'off') return [];
      st.state[u.id] = 'earned';
      return settle();
    },
    // He sets it up at the HQ (E at its spot). False (and why: whyOff) when it isn't earned or waits on another.
    install(id) {
      const u = byId.get(id); if (!u || u.setup !== 'install' || st.state[id] !== 'earned' || missing(u).length) return false;
      st.state[id] = 'on'; settle(); return true;
    },
    state(id) { return st.state[id] || null; },
    isOn(id) { return st.state[id] === 'on'; },
    // Why it is off: 'on' | 'not-earned' | 'needs:<id>' | 'install' (earned, everything it needs on, waiting on him).
    whyOff(id) {
      const u = byId.get(id); if (!u) return null;
      if (st.state[id] === 'on') return 'on';
      if (st.state[id] === 'off') return 'not-earned';
      const m = missing(u); if (m.length) return 'needs:' + m[0];
      return 'install';
    },
    // What he can set up at this HQ spot now (for the E prompt), or null.
    installAt(spot) { const u = list.find((x) => x.at === spot); return u && api.whyOff(u.id) === 'install' ? u.id : null; },
    supply(k) { return st.supply[k] || 0; },
    use(k, n = 1) { if ((st.supply[k] || 0) < n) return false; st.supply[k] -= n; return true; },
    read() { return { state: { ...st.state }, supply: { ...st.supply } }; },
    load(saved) {
      fresh(); if (!saved) return;
      for (const [k, v] of Object.entries(saved.state || {})) if (k in st.state && ['off', 'earned', 'on'].includes(v)) st.state[k] = v;
      for (const [k, v] of Object.entries(saved.supply || {})) if (Number.isFinite(v) && v >= 0) st.supply[k] = v | 0;
    },
    reset() { fresh(); },
  };
  fresh();
  return api;
}
