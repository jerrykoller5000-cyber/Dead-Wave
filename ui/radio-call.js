// GP-55 preparation. IDs only; the board and reward adapter wait for the lead's
// delivery contract. This never grants supplies or emits a gameplay event.
export function drawCalls(rng, night, owned = {}) {
  if (typeof rng !== 'function' || !Number.isSafeInteger(night) || night < 1) return [];
  const pool = ['ammo', 'medical'];
  if (owned.allTurrets !== true) pool.push('hardware');
  if (owned.fieldIntel !== true) pool.push('intel');
  if (night >= 4) pool.push('blackout');
  // Do not invent a replacement reward or show a duplicate/useless card. The
  // all-unlocks pre-night-4 case needs the lead's fallback decision.
  if (pool.length < 3) return [];
  for (let i = pool.length - 1; i > 0; i--) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) return [];
    const j = Math.floor(value * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function createDailyCall({ rng = Math.random, claim = () => null } = {}) {
  let runId = null, day = 0, cards = [], closed = false, available = false, picked = null, busy = false;
  let owned = {};
  const eligible = card => card !== 'hardware' || owned.allTurrets !== true;
  function reset(id) { runId = id; day = 0; cards = []; closed = false; available = false; picked = null; busy = false; owned = {}; }
  return {
    reset,
    update(state = {}) {
      if (state.runId !== runId || !Number.isSafeInteger(state.day) || state.day < 1 || state.day < day) return false;
      if (state.day > day) { day = state.day; cards = []; closed = false; picked = null; }
      owned = { ...state.owned };
      if (state.alarm === true || state.phase === 'wave') closed = true;
      available = state.phase === 'prep' && state.repaired === true && state.callable === true && !closed && !picked;
      if (available && !cards.length) cards = drawCalls(rng, day, owned);
      return true;
    },
    read() {
      return { runId, day, cards: available ? cards.map(id => ({ id, enabled: eligible(id) && (id !== 'intel' || owned.fieldIntel !== true) })) : [],
        picked, unavailable: available && cards.length !== 3 };
    },
    pick(card) {
      if (busy || !available || picked || !cards.includes(card) || !eligible(card) ||
          (card === 'intel' && owned.fieldIntel === true)) return null;
      busy = true;
      try {
        const receipt = claim({ runId, day, card });
        if (!receipt || receipt.runId !== runId || receipt.day !== day || receipt.card !== card ||
            typeof receipt.receiptId !== 'string' || !receipt.receiptId) return null;
        picked = card; available = false; return { ...receipt };
      } finally { busy = false; }
    }
  };
}
