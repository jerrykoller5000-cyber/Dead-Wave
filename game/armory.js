// D-61 / GP-78: one player's run-long weapon storage. The game supplies each
// gun's current ammo, magazines and upgrades; moving it never refills them.
export const PRIMARY_GUNS = Object.freeze(['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'flamer', 'minigun', 'chainsaw']);
export const SECONDARY_GUNS = Object.freeze(['uzi', 'revolver', 'pistol']);
export const ARMORY_SLOTS = Object.freeze({ primary: 2, secondary: 2 });

export function slotType(kind) {
  if (PRIMARY_GUNS.includes(kind)) return 'primary';
  if (SECONDARY_GUNS.includes(kind)) return 'secondary';
  return null;
}

function copyGun(gun) {
  return { id: gun.id, kind: gun.kind, loaded: gun.loaded,
    magazines: gun.magazines.map(mag => ({ rounds: mag.rounds })),
    rounds: gun.rounds, upgrades: structuredClone(gun.upgrades) };
}

function normalizeGun(input) {
  const gun = typeof input === 'string' ? { id: input, kind: input } : input;
  if (!gun || typeof gun.id !== 'string' || !gun.id || !slotType(gun.kind) ||
      gun.id === 'pistol:base' || (gun.kind === 'pistol' && gun.id === 'pistol')) return null;
  const loaded = Object.hasOwn(gun, 'loaded') ? gun.loaded : 0, rounds = gun.rounds ?? 0, mags = gun.magazines ?? [];
  if ((loaded !== null && (!Number.isSafeInteger(loaded) || loaded < 0)) || !Number.isSafeInteger(rounds) || rounds < 0 ||
      !Array.isArray(mags) || mags.some(mag => !Number.isSafeInteger(mag?.rounds) || mag.rounds < 0) ||
      (gun.upgrades != null && (typeof gun.upgrades !== 'object' || Array.isArray(gun.upgrades)))) return null;
  return { id: gun.id, kind: gun.kind, loaded, magazines: mags.map(mag => ({ rounds: mag.rounds })),
    rounds, upgrades: structuredClone(gun.upgrades || {}) };
}

export function createArmory({ guns = [] } = {}) {
  const slots = { primary: [null, null], secondary: [null, null] };
  const shelf = [];
  const allGuns = () => [...slots.primary, ...slots.secondary, ...shelf].filter(Boolean);
  const validSlot = (type, index) => Object.hasOwn(slots, type) &&
    Number.isSafeInteger(index) && index >= 0 && index < slots[type].length;
  const read = () => ({
    hip: { id: 'pistol:base', kind: 'pistol' },
    slots: Object.fromEntries(Object.entries(slots).map(([type, entries]) =>
      [type, entries.map(gun => gun ? copyGun(gun) : null)])),
    shelf: shelf.map(copyGun)
  });
  function buy(input) {
    const gun = normalizeGun(input);
    if (!gun) return { ok: false, reason: 'invalid' };
    if (allGuns().some(owned => owned.id === gun.id)) return { ok: false, reason: 'owned' };
    const type = slotType(gun.kind), index = slots[type].findIndex(entry => !entry);
    if (index >= 0) slots[type][index] = gun;
    else shelf.push(gun);
    return { ok: true, location: index >= 0 ? type : 'shelf', index: index >= 0 ? index : shelf.length - 1,
      gun: copyGun(gun) };
  }
  function take(id, type, index) {
    if (!validSlot(type, index)) return { ok: false, reason: 'slot' };
    const shelfIndex = shelf.findIndex(gun => gun.id === id);
    if (shelfIndex < 0) return { ok: false, reason: 'missing' };
    const gun = shelf[shelfIndex];
    if (slotType(gun.kind) !== type) return { ok: false, reason: 'kind' };
    const replaced = slots[type][index];
    shelf.splice(shelfIndex, 1);
    slots[type][index] = gun;
    if (replaced) shelf.push(replaced);
    return { ok: true, location: type, index, gun: copyGun(gun), stowed: replaced?.id || null };
  }
  function stow(type, index) {
    if (!validSlot(type, index)) return { ok: false, reason: 'slot' };
    const gun = slots[type][index];
    if (!gun) return { ok: false, reason: 'empty' };
    slots[type][index] = null;
    shelf.push(gun);
    return { ok: true, location: 'shelf', gun: copyGun(gun) };
  }
  const api = { buy, take, stow, read,
    revise(id, patch) {
      const gun = allGuns().find(item => item.id === id);
      if (!gun) return { ok: false, reason: 'missing' };
      if (patch && patch.loaded != null && Number.isSafeInteger(patch.loaded) && patch.loaded >= 0) gun.loaded = patch.loaded;
      if (patch && Array.isArray(patch.magazines)) gun.magazines = patch.magazines.map(mag => ({ rounds: mag.rounds | 0 }));
      return { ok: true, gun: copyGun(gun) };
    },
    has: id => allGuns().some(gun => gun.id === id),
    loadout: () => ({ primary: slots.primary.map(gun => gun?.id || null),
      secondary: slots.secondary.map(gun => gun?.id || null), hip: 'pistol:base' }) };
  for (const gun of guns) api.buy(gun);
  return api;
}
