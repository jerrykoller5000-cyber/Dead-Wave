// game/chain-gates.js - CL-285 part C (D-102, Jerry: the story map's blockers and keys stand, "In play we will see if
// they hold"): every mini-game of the story chain sits behind a physical blocker, and its key comes from the one before
// (docs: the story map's table "The mini-games, in chain order"; the words are GP-19995's chain.<lead>.* strings).
// Pure rules: no DOM, no three. The page says where he has been and what he picked up; this says which keys he can
// take, which gates he can open, and whether a lead's site is open (its lead open, game/story-chain.js, and its gate).
//
// A key lies at a source (a prop at the place before). A source is 'ready' once he can get at it (the HQ radio's drawer
// only once the HQ has power; the vault's first lift once it has run). He takes a ready key (E there). A held key opens
// its gate (E at the gate). A 'knowledge' key (the trapper's combination) is learned by reading its source, not carried.
// Keys are never used up: a gate once open stays open for the run.
//
// The chain's own fallback (story-chain.js: a lead left undone two dawns lets the next open) would leave a gate whose
// key sits behind an unfinished place shut for good. So a gate whose lead has been open SPARE_DAWNS dawns while its key
// was never ready gets a spare: the key is ready at the HQ's duty board ('hq-board'), as if the twelve left one there.

export const SPARE_DAWNS = 2;

// lead: game/story-chain.js's lead id; gate: the blocker; key: what opens it; source: where it lies (a prop at the place
// before, or the HQ); ready: when the source can be got at ('start' from day 1, else the event the page reports);
// kind: 'carried' | 'knowledge' | 'tool' (the bolt cutters: CL-216's own pickup, as now).
export const GATES = Object.freeze([
  { lead: 'generator', gate: 'depot-shed', blocker: 'padlock', key: 'price-key', source: 'hq-generator', ready: 'start', kind: 'carried' },
  { lead: 'relay', gate: 'mast-yard', blocker: 'chain', key: 'sato-key', source: 'hq-radio-drawer', ready: 'hq-power', kind: 'carried' },
  { lead: 'medical', gate: 'road-barrier', blocker: 'pins', key: 'barrier-key', source: 'relay-vault-lift', ready: 'vault-first-lift', kind: 'carried' },
  { lead: 'missing', gate: 'trail-chain', blocker: 'chain', key: 'chain-key', source: 'ambulance-glovebox', ready: 'ambulance-reached', kind: 'carried' },
  { lead: 'truck', gate: 'toolbox-chain', blocker: 'chain', key: 'bolt-cutters', source: 'mine-mouth', ready: 'start', kind: 'tool' },
  { lead: 'search', gate: 'ranger-gate', blocker: 'padlock', key: 'ranger-gate-key', source: 'clarke-toolbox', ready: 'toolbox-open', kind: 'carried' },
  { lead: 'oldman', gate: 'trapper-fence', blocker: 'combination', key: 'trapper-combination', source: 'search-log', ready: 'search-log-read', kind: 'knowledge' },
  { lead: 'below', gate: 'mine-iron-gate', blocker: 'chain', key: 'trapper-keyring', source: 'trapper-cellar', ready: 'cellar-open', kind: 'carried', also: 'hush-wired' },
].map((g) => Object.freeze(g)));

// CL-303 (D-116, ?gates=1; Claude, CU-200's file taken under D-115): the story places' new locks. The mast yard's gate is
// grown over with vines: a blade cuts them (the machete, a find in the depot shed, inside the depot's own ring; the katana
// too, which the page reports through hasTool). The hikers' trail is blocked by a crashed truck: the winch off the
// convoy's escort truck drags it clear. Both lie from day 1 at the place before; the line keeps them waiting their turn. The rest as GATES. With the line (LINE_RULES in
// story-chain.js) there are no spares, and no gate opens before its own lead is open (leadOpen), so a key or a tool got
// early (the bolt cutters lie at the mine from day 1) still waits its turn.
export const LINE_GATES = Object.freeze(GATES.map((g) => {
  if (g.gate === 'mast-yard') return Object.freeze({ ...g, blocker: 'vines', key: 'machete', source: 'depot-shed', ready: 'start', kind: 'tool' });
  if (g.gate === 'trail-chain') return Object.freeze({ ...g, blocker: 'crashed-truck', key: 'winch', source: 'convoy-escort-truck', ready: 'start', kind: 'tool' });
  return g;
}));

const byLead = new Map(GATES.map((g) => [g.lead, g]));
const byGate = new Map(GATES.map((g) => [g.gate, g]));
const byKey = new Map(GATES.map((g) => [g.key, g]));
const lineByKey = new Map(LINE_GATES.map((g) => [g.key, g]));
// The line's specs when `line` (the page passes STORY_GATES_ON); else the old ones.
export function gateOfLead(lead, line = false) { return (line ? LINE_GATES.find((g) => g.lead === lead) : byLead.get(lead)) || null; }
export function gateById(id, line = false) { return (line ? LINE_GATES.find((g) => g.gate === id) : byGate.get(id)) || null; }
export function gateOfKey(key, line = false) { return (line ? lineByKey.get(key) : byKey.get(key)) || null; }

export function createChainGates(options = {}) {
  const line = !!options.line;
  const gates = options.gates || (line ? LINE_GATES : GATES), spareDawns = options.spareDawns ?? (line ? Infinity : SPARE_DAWNS);
  const leadOpen = options.leadOpen || (() => true), hasTool = options.hasTool || (() => false);
  const gByGate = new Map(gates.map((g) => [g.gate, g])), gByKey = new Map(gates.map((g) => [g.key, g]));
  let st = null;
  const fresh = () => {
    st = { events: new Set(['start']), keys: {}, gates: {}, spare: {} };
    for (const g of gates) { st.keys[g.key] = 'unseen'; st.gates[g.gate] = 'locked'; }
    sync();
  };
  // A key whose source's event has come is 'ready' (unless he already has it).
  function sync() {
    for (const g of gates) if (st.keys[g.key] === 'unseen' && (st.events.has(g.ready) || st.spare[g.gate])) st.keys[g.key] = 'ready';
  }
  const api = {
    // Something happened the keys wait on ('hq-power', 'vault-first-lift', 'ambulance-reached', 'toolbox-open',
    // 'search-log-read', 'cellar-open', 'hush-wired'). Returns the keys that became ready.
    event(name) {
      if (st.events.has(name)) return [];
      const before = gates.filter((g) => st.keys[g.key] === 'ready').map((g) => g.key);
      st.events.add(name); sync();
      return gates.filter((g) => st.keys[g.key] === 'ready' && !before.includes(g.key)).map((g) => g.key);
    },
    happened(name) { return st.events.has(name); },
    // Take a ready key at its source (a knowledge key is learned). False if it isn't there to take.
    take(key) {
      if (st.keys[key] !== 'ready') return false;
      st.keys[key] = 'held'; return true;
    },
    keyState(key) { return st.keys[key] || null; },
    // Held, or (a tool) in his hands another way (the katana for the vines: the page's hasTool).
    has(key) { const g = gByKey.get(key); return st.keys[key] === 'held' || (!!g && g.kind === 'tool' && !!hasTool(key)); },
    line,
    // Where the key is to be had now: its source, or the HQ's duty board for a spare.
    keySource(key) { const g = gByKey.get(key); if (!g) return null; return st.spare[g.gate] && !st.events.has(g.ready) ? 'hq-board' : g.source; },
    // Can he open this gate now (the key in hand or in his head, and anything else it needs)?
    canOpen(gate) {
      const g = gByGate.get(gate); if (!g || st.gates[gate] !== 'locked') return false;
      if (line && !leadOpen(g.lead)) return false;   // CL-303: not before its turn
      return api.has(g.key) && (!g.also || st.events.has(g.also));
    },
    // Why not: 'open' | 'no-key' | 'needs:<event>' | null (he can).
    whyShut(gate) {
      const g = gByGate.get(gate); if (!g) return null;
      if (st.gates[gate] === 'open') return 'open';
      if (line && !leadOpen(g.lead)) return 'not-yet';
      if (!api.has(g.key)) return 'no-key';
      if (g.also && !st.events.has(g.also)) return 'needs:' + g.also;
      return null;
    },
    open(gate) {
      if (!api.canOpen(gate)) return false;
      st.gates[gate] = 'open'; return true;
    },
    isOpen(gate) { return st.gates[gate] === 'open'; },
    // Is this lead's site open past its blocker? (A lead with no gate: yes.)
    leadPast(lead) { const g = byLead.get(lead); return !g || st.gates[g.gate] === 'open'; },
    // A dawn, with the chain's state (story-chain.js read()): a gate whose lead has been open spareDawns dawns while its
    // key was never ready gets a spare at the HQ. Returns the gates that got one.
    dawn(day, chain) {
      const got = [];
      for (const g of gates) {
        if (st.spare[g.gate] || st.keys[g.key] !== 'unseen') continue;
        const l = chain && chain.leads && chain.leads.find((x) => x.id === g.lead);
        if (!l || l.state === 'closed' || l.openedDay == null) continue;
        if (day - l.openedDay >= spareDawns) { st.spare[g.gate] = true; got.push(g.gate); }
      }
      if (got.length) sync();
      return got;
    },
    read() {
      return { events: [...st.events], keys: { ...st.keys }, gates: { ...st.gates }, spare: Object.keys(st.spare).filter((k) => st.spare[k]) };
    },
    load(saved) {
      fresh();
      if (!saved) return;
      for (const e of saved.events || []) st.events.add(e);
      for (const [k, v] of Object.entries(saved.keys || {})) if (k in st.keys && ['unseen', 'ready', 'held'].includes(v)) st.keys[k] = v;
      for (const [k, v] of Object.entries(saved.gates || {})) if (k in st.gates && (v === 'open' || v === 'locked')) st.gates[k] = v;
      for (const k of saved.spare || []) if (k in st.gates) st.spare[k] = true;
      sync();
    },
    reset() { fresh(); },
  };
  fresh();
  return api;
}
