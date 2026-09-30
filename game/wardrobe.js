// D-66 / CU-70: one profile's dressing room. Looks only. A bad save falls back to
// the default for that item, so it can never break the marine.
export const WARDROBE_STORE = 'tt_wardrobe';
export const CAMO_ITEMS = Object.freeze(['cap', 'helmet', 'mask', 'shirt', 'trousers', 'gloves', 'carrier', 'pads', 'holster', 'belt', 'pack']);
export const BOOT_COLOURS = Object.freeze(['black', 'brown', 'tan']);
export const BOOT_HEX = Object.freeze({ black: 0x1c1c16, brown: 0x5a3a24, tan: 0xa07a48 });
export const DRESS_TABS = Object.freeze([
  { id: 'head', items: ['cap', 'helmet', 'mask'] },
  { id: 'body', items: ['shirt', 'trousers', 'gloves', 'boots'] },
  { id: 'kit', items: ['carrier', 'pads', 'holster', 'belt', 'pack'] },
  { id: 'him', items: [] },
  { id: 'guns', items: [] },
]);
export const GUNS = Object.freeze(['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'flamer', 'minigun', 'chainsaw', 'uzi', 'revolver', 'pistol']);
export const BODY_CHOICES = Object.freeze({
  hair: ['black', 'darkBrown', 'brown', 'auburn', 'blond', 'grey'],
  eyes: ['brown', 'hazel', 'green', 'blue', 'grey'],
  skin: [0, 1, 2, 3, 4, 5],
});

function camoOf(item, seed) {
  return item === 'mask' ? 'coyoteBrown' : seed;
}

export function defaultWardrobe(seedCamo = 'm81') {
  const items = {};
  for (const id of CAMO_ITEMS) items[id] = { camo: camoOf(id, seedCamo) };
  items.boots = { colour: 'black' };
  return {
    version: 1,
    items,
    guns: {},
    body: { hair: 'darkBrown', eyes: 'brown', skin: 3 },
  };
}

export function normalizeWardrobe(raw, seedCamo = 'm81', isCamo = () => true) {
  const base = defaultWardrobe(seedCamo);
  if (!raw || raw.version !== 1 || !raw.items || typeof raw.items !== 'object') return base;
  const ok = (key) => typeof key === 'string' && key && isCamo(key);
  const items = {};
  for (const id of CAMO_ITEMS) {
    const pick = raw.items[id] && raw.items[id].camo;
    items[id] = { camo: ok(pick) ? pick : base.items[id].camo };
  }
  const colour = raw.items.boots && raw.items.boots.colour;
  items.boots = { colour: BOOT_COLOURS.includes(colour) ? colour : 'black' };
  const guns = {};
    if (raw.guns && typeof raw.guns === 'object') {
    for (const id of GUNS) if (ok(raw.guns[id])) guns[id] = raw.guns[id];
  }
  const body = { ...base.body };
  if (raw.body && typeof raw.body === 'object') {
    if (BODY_CHOICES.hair.includes(raw.body.hair)) body.hair = raw.body.hair;
    if (BODY_CHOICES.eyes.includes(raw.body.eyes)) body.eyes = raw.body.eyes;
    if (BODY_CHOICES.skin.includes(raw.body.skin)) body.skin = raw.body.skin;
  }
  return { version: 1, items, guns, body };
}

function copy(state) {
  return normalizeWardrobe(state, 'm81', () => true);
}

export function withItem(state, id, patch, isCamo = () => true) {
  const next = copy(state);
  if (id === 'boots') {
    if (!BOOT_COLOURS.includes(patch && patch.colour)) return null;
    next.items.boots = { colour: patch.colour };
    return next;
  }
  if (!CAMO_ITEMS.includes(id)) return null;
  if (!patch || typeof patch.camo !== 'string' || !patch.camo || !isCamo(patch.camo)) return null;
  next.items[id] = { camo: patch.camo };
  return next;
}

export function withBody(state, key, value) {
  const next = copy(state);
  if (!BODY_CHOICES[key] || !BODY_CHOICES[key].includes(value)) return null;
  next.body[key] = value;
  return next;
}

export function withGun(state, id, camo, isCamo = () => true) {
  const next = copy(state);
  if (!GUNS.includes(id) || typeof camo !== 'string' || !isCamo(camo)) return null;
  next.guns[id] = camo;
  return next;
}

export function resetTab(state, tabId, seedCamo = 'm81') {
  const tab = DRESS_TABS.find((t) => t.id === tabId);
  if (!tab) return null;
  const next = copy(state);
  const fresh = defaultWardrobe(seedCamo);
  if (tabId === 'him') next.body = fresh.body;
  else if (tabId === 'guns') next.guns = {};
  else for (const id of tab.items) next.items[id] = fresh.items[id];
  return next;
}
