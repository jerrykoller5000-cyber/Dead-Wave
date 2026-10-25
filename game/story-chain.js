// CL-263: the story chain (docs/specs/story-chain.md). The day missions are the twelve's unfinished business, picked up
// one a dawn from day 2 in the order the valley hands them over: each lead opens at the first dawn after the lead
// before it is done (its cause), never before its earliest day, at most one new lead a dawn and never more than two
// open; a lead left undone for two dawns lets the next one open anyway, so he is never stuck. Pure rules: no DOM, no
// three. The page tells it what got done (done(id)) and when a dawn comes (dawn(day)); it answers what is open.

export const LEADS = Object.freeze([
  { id: 'generator', site: 'objective:fuel-depot', thread: 'threshold', earliest: 2, after: null, by: 'Price' },
  { id: 'relay', site: 'objective:radio-repair', thread: 'spine', earliest: 3, after: 'generator', by: 'Sato' },
  { id: 'medical', site: 'objective:medical-convoy', thread: 'threshold', earliest: 4, after: 'relay', by: 'Hale' },
  { id: 'missing', site: 'objective:hikers-cache', thread: 'valley', earliest: 5, after: 'medical', by: 'Pike' },
  { id: 'truck', site: 'objective:wreck-salvage', thread: 'threshold', earliest: 6, after: 'missing', by: 'Clarke' },
  { id: 'search', site: 'objective:ranger-cache', thread: 'valley', earliest: 7, after: 'missing', by: 'Brandt' },
  { id: 'oldman', site: 'objective:trapper-cache', thread: 'valley', earliest: 8, after: 'search', by: 'Okafor' },
  { id: 'below', site: null, thread: 'both', earliest: 9, after: 'oldman', by: null },
].map((l) => Object.freeze(l)));

export const CHAIN_RULES = Object.freeze({ maxOpen: 2, fallbackDawns: 2, firstDay: 2 });

const byId = new Map(LEADS.map((l) => [l.id, l]));
export function leadOf(id) { return byId.get(id) || null; }
export function leadForSite(site) { return LEADS.find((l) => l.site === site) || null; }

export function createStoryChain(options = {}) {
  const rules = { ...CHAIN_RULES, ...(options.rules || {}) };
  const leads = options.leads || LEADS;
  // Per lead: 'closed' | 'open' | 'done'; when it opened (day) and when it was done (day).
  let st = null;
  const fresh = () => {
    st = { day: 0, leads: {}, log: [] };
    for (const l of leads) st.leads[l.id] = { state: 'closed', openedDay: null, doneDay: null };
  };
  fresh();
  const s = (id) => st.leads[id];
  const openCount = () => leads.filter((l) => s(l.id).state === 'open').length;
  // Could this lead open at this dawn? Its day has come, and its cause is done, or its cause has been open (undone)
  // for `fallbackDawns` dawns.
  const ready = (l, day) => {
    if (s(l.id).state !== 'closed' || day < Math.max(l.earliest, rules.firstDay)) return false;
    if (!l.after) return true;
    const a = s(l.after);
    if (!a) return true;
    if (a.state === 'done') return a.doneDay == null || a.doneDay < day;   // done before this dawn
    return a.state === 'open' && a.openedDay != null && day - a.openedDay >= rules.fallbackDawns;
  };
  const api = {
    // A new day starts: open at most one lead (the first ready one in the chain's order), if fewer than maxOpen are
    // open. Days skipped (a dev jump) are walked one by one, so the chain never opens two at one dawn. Returns the
    // leads opened.
    dawn(day) {
      const opened = [];
      day = Math.floor(day);
      for (let d = Math.max(st.day + 1, 1); d <= day; d++) {
        st.day = d;
        if (openCount() >= rules.maxOpen) continue;
        const l = leads.find((x) => ready(x, d));
        if (!l) continue;
        s(l.id).state = 'open'; s(l.id).openedDay = d;
        st.log.push({ day: d, id: l.id, what: 'open' });
        opened.push(l.id);
      }
      if (day > st.day) st.day = day;
      return opened;
    },
    // A lead's mission was done (whenever it happens; a lead done while still closed counts as done too: the player
    // found it on his own, and the chain moves on from it).
    done(id) {
      const x = s(id);
      if (!x || x.state === 'done') return false;
      if (x.openedDay == null) x.openedDay = st.day;
      x.state = 'done'; x.doneDay = st.day;
      st.log.push({ day: st.day, id, what: 'done' });
      return true;
    },
    // Dev and tests: open one now (or all).
    open(id) {
      const x = s(id);
      if (!x || x.state !== 'closed') return false;
      x.state = 'open'; x.openedDay = st.day;
      st.log.push({ day: st.day, id, what: 'open' });
      return true;
    },
    openAll() { let n = 0; for (const l of leads) if (api.open(l.id)) n++; return n; },
    stateOf(id) { const x = s(id); return x ? x.state : null; },
    isOpen(id) { const x = s(id); return !!x && x.state !== 'closed'; },
    siteOpen(site) { const l = leads.find((x) => x.site === site); return !l || api.isOpen(l.id); },
    open_() { return leads.filter((l) => s(l.id).state === 'open').map((l) => l.id); },
    read() {
      return { day: st.day, open: api.open_(), done: leads.filter((l) => s(l.id).state === 'done').map((l) => l.id),
        leads: leads.map((l) => ({ ...l, ...s(l.id) })), log: st.log.slice() };
    },
    reset() { fresh(); },
  };
  return api;
}
