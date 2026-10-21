// D-59: earned skill progression. The game owns the actions that award XP and
// publishes skill-up events; this store owns thresholds and per-player ranks.
export const SKILL_RANKS = Object.freeze({
  vitality: Object.freeze([6, 14, 24, 36, 50]),
  power: Object.freeze([60, 180, 400, 750, 1200]),
  hands: Object.freeze([10, 30, 60, 100, 150]),
  legs: Object.freeze([20, 60, 130, 230, 360]),
  scavenger: Object.freeze([15, 45, 100, 180, 280]),
  grenadier: Object.freeze([5, 15, 35, 60, 90])
});

const validKey = key => typeof key === 'string' && Object.hasOwn(SKILL_RANKS, key);

export function createSkills() {
  return Object.fromEntries(Object.keys(SKILL_RANKS).map(key => [key, {xp:0,rank:0}]));
}

export function resetSkills(player) {
  if (!player || typeof player !== 'object') throw new TypeError('Player required');
  player.skills = createSkills();
  return player.skills;
}

export function skillLvl(player, key) {
  if (!validKey(key)) throw new TypeError('Unknown skill');
  return player?.skills?.[key]?.rank ?? 0;
}

// Returns each rank crossed so a large grant cannot lose an intermediate toast.
export function addSkillXp(player, key, amount) {
  if (!validKey(key)) throw new TypeError('Unknown skill');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new TypeError('Positive whole XP required');
  const state = player?.skills?.[key];
  if (!state || !Number.isSafeInteger(state.xp) || !Number.isSafeInteger(state.rank)) throw new TypeError('Player skill store required');
  if (!Number.isSafeInteger(state.xp + amount)) throw new RangeError('Skill XP too large');
  state.xp += amount;
  const ranks = [];
  while (state.rank < SKILL_RANKS[key].length && state.xp >= SKILL_RANKS[key][state.rank]) ranks.push(++state.rank);
  return ranks;
}
