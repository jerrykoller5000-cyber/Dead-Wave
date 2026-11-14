// D-61: each carried magazine keeps its own rounds. Loose shells and 40 mm rounds
// remain outside this store; callers keep those in their existing reserve.
export const MAGAZINE_WEAPONS = Object.freeze(['pistol', 'uzi', 'm4', 'ak', 'sniper', 'aa12', 'minigun', 'flamer', 'revolver']);
export const isMagazineWeapon = weapon => MAGAZINE_WEAPONS.includes(weapon);
export const isLooseRoundWeapon = weapon => weapon === 'revolver' || weapon === 'launcher';

export function createMagazineStore() { return Object.create(null); }

function state(store, weapon) {
  const value = store?.[weapon];
  if (!value || !isMagazineWeapon(weapon)) throw new TypeError('Unknown magazine weapon');
  if (isLooseRoundWeapon(weapon)) {
    // Older run/replay snapshots and legacy debug adapters can still supply loader groups.
    // Fold each old group into the shared pool once, preserving every partial round.
    if (value.reserveKind !== 'rounds') { value.reserveKind = 'rounds'; value.spareRounds = Math.max(0, Number(value.spareRounds) || 0); }
    if (value.spare.length) { for (const item of value.spare) value.spareRounds += Math.max(0, Number(item.rounds) || 0); value.spare.length = 0; }
  }
  return value;
}
function mag(rounds, size) { return { rounds: Math.max(0, Math.min(size, rounds)), size }; }

export function issueMagazines(store, weapon, { size, loaded = size, spareRounds = 0, maxSpare = 0, secondLoaded = null }) {
  if (!isMagazineWeapon(weapon) || !Number.isFinite(size) || size <= 0 || !Number.isSafeInteger(maxSpare) || maxSpare < 0) throw new TypeError('Invalid magazine issue');
  const entry = { size, maxSpare, loaded: [mag(loaded, size)], spare: [] };
  if (secondLoaded != null) entry.loaded.push(mag(secondLoaded, size));
  if (isLooseRoundWeapon(weapon)) { entry.reserveKind = 'rounds'; entry.spareRounds = 0; }
  store[weapon] = entry;
  addMagazineRounds(store, weapon, spareRounds, { allowPartial: true });
  return entry;
}

export function setMagazineSize(store, weapon, size, maxSpare) {
  const entry = state(store, weapon);
  if (!Number.isFinite(size) || size <= 0 || !Number.isSafeInteger(maxSpare) || maxSpare < 0) throw new TypeError('Invalid size');
  entry.size = size; entry.maxSpare = maxSpare;
  for (const item of [...entry.loaded, ...entry.spare]) item.size = size;
  if (entry.spare.length > maxSpare) entry.spare.length = maxSpare;
}

export function addMagazineRounds(store, weapon, rounds, { allowPartial = false } = {}) {
  const entry = state(store, weapon);
  if (!Number.isFinite(rounds) || rounds < 0) throw new TypeError('Invalid rounds');
  if (entry.reserveKind === 'rounds') {
    if (!Number.isSafeInteger(rounds)) throw new TypeError('Loose rounds must be whole');
    const accepted = Math.min(rounds, Math.max(0, entry.size * entry.maxSpare - entry.spareRounds));
    entry.spareRounds += accepted; return accepted;
  }
  let accepted = 0;
  while (entry.spare.length < entry.maxSpare && rounds >= (allowPartial ? 0.001 : entry.size)) {
    const amount = Math.min(entry.size, rounds);
    entry.spare.push(mag(amount, entry.size)); accepted += amount; rounds -= amount;
  }
  return accepted;
}

export function loadedMagazineRounds(store, weapon, dual = false) {
  const entry = state(store, weapon);
  return entry.loaded[0].rounds + (dual ? (entry.loaded[1]?.rounds || 0) : 0);
}
export function spareMagazineRounds(store, weapon) { const entry = state(store, weapon); return entry.reserveKind === 'rounds' ? entry.spareRounds : entry.spare.reduce((n, item) => n + item.rounds, 0); }
export function magazineSnapshot(store, weapon) {
  const entry = state(store, weapon);
  return { size: entry.size, maxSpare: entry.maxSpare,
    loaded: entry.loaded.map(item => item.rounds), spare: entry.spare.map(item => item.rounds),
    ...(entry.reserveKind === 'rounds' ? { reserveKind: 'rounds', spareRounds: entry.spareRounds } : {}) };
}

export function issueSecondGun(store, weapon, rounds = null) {
  const entry = state(store, weapon);
  if (!entry.loaded[1]) entry.loaded[1] = mag(rounds == null ? entry.size : rounds, entry.size);
}

export function setLoadedMagazineRounds(store, weapon, rounds, dual = false) {
  const entry = state(store, weapon);
  if (!Number.isFinite(rounds) || rounds < 0) throw new TypeError('Invalid loaded rounds');
  entry.loaded[0].rounds = Math.min(entry.size, rounds);
  if (dual && entry.loaded[1]) entry.loaded[1].rounds = Math.min(entry.size, Math.max(0, rounds - entry.size));
}

export function chooseMagazineHand(store, weapon, preferred = 0, dual = false) {
  const entry = state(store, weapon);
  const first = dual && preferred === 1 ? 1 : 0;
  if ((entry.loaded[first]?.rounds || 0) > 0) return first;
  if (dual && (entry.loaded[1 - first]?.rounds || 0) > 0) return 1 - first;
  return -1;
}

export function useMagazineRound(store, weapon, hand = 0, amount = 1) {
  const entry = state(store, weapon), item = entry.loaded[hand];
  if (!item || !Number.isFinite(amount) || amount <= 0 || item.rounds < amount) return false;
  item.rounds = Math.max(0, item.rounds - amount);
  return true;
}

// Move the fullest carried magazine into each active gun. A partial old magazine
// returns to the pouch on R, or becomes recoverable ground loot on a double tap.
export function reloadMagazines(store, weapon, { dual = false, drop = false, discardOld = false } = {}) {
  const entry = state(store, weapon), dropped = [];
  let swapped = 0;
  if (entry.reserveKind === 'rounds') {
    for (let hand = 0; hand < (dual ? 2 : 1); hand++) {
      const current = entry.loaded[hand]; if (!current) continue;
      const take = Math.min(Math.max(0, entry.size - current.rounds), entry.spareRounds);
      if (take > 0) { current.rounds += take; entry.spareRounds -= take; swapped++; }
    }
    return { swapped, dropped };
  }
  for (let hand = 0; hand < (dual ? 2 : 1); hand++) {
    const current = entry.loaded[hand];
    if (!current || !entry.spare.length || current.rounds >= entry.size) continue;
    let best = 0;
    for (let i = 1; i < entry.spare.length; i++) if (entry.spare[i].rounds > entry.spare[best].rounds) best = i;
    const next = entry.spare.splice(best, 1)[0];
    entry.loaded[hand] = next; swapped++;
    if (current.rounds > 0 && !discardOld) {
      if (drop) dropped.push({ weapon, rounds: current.rounds, size: current.size, hand });
      else if (entry.spare.length < entry.maxSpare) entry.spare.push(current);
    }
  }
  return { swapped, dropped };
}

export function pickUpMagazine(store, item) {
  if (!item || !isMagazineWeapon(item.weapon) || !Number.isFinite(item.rounds) || item.rounds <= 0) return false;
  const entry = state(store, item.weapon);
  if (entry.reserveKind === 'rounds') {
    if (item.rounds > Math.max(0, entry.size * entry.maxSpare - entry.spareRounds)) return false;
    return addMagazineRounds(store, item.weapon, item.rounds) === item.rounds;
  }
  if (entry.spare.length >= entry.maxSpare) return false;
  entry.spare.push(mag(item.rounds, entry.size));
  return true;
}
