// D-66 / CU-70: one profile's dressing room. Looks only. A bad save falls back to
// the default for that item, so it can never break the marine.
export const WARDROBE_STORE = 'tt_wardrobe';
export const CAMO_ITEMS = Object.freeze(['cap', 'helmet', 'mask', 'shirt', 'trousers', 'gloves', 'carrier', 'pads', 'holster', 'belt', 'pack']);
export const BOOT_COLOURS = Object.freeze(['black', 'brown', 'tan']);
export const BOOT_HEX = Object.freeze({ black: 0x1c1c16, brown: 0x5a3a24, tan: 0xa07a48 });
export const DRESS_TABS = Object.freeze([
  { id: 'head', items: ['cap', 'helmet', 'mask', 'eyewear'] },
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
// CL-97 reads these. The new meshes are his; the profile keeps the picks now.
export const KIT_PLAIN = Object.freeze(['carrier', 'pads', 'holster', 'belt', 'pack']);
export const CAP_STYLES = Object.freeze(['cover', 'boonie', 'ballcap', 'ballcapBack']);
export const EYEWEAR_STYLES = Object.freeze(['none', 'aviators', 'pitViper', 'wayfarer', 'goggles']);
export const SLEEVES = Object.freeze(['down', 'rolled']);
export const TROUSER_CUTS = Object.freeze(['trousers', 'shorts']);

function camoOf(item, seed) {
  return item === 'mask' ? 'coyoteBrown' : seed;
}

export function defaultWardrobe(seedCamo = 'm81') {
  const items = {};
  for (const id of CAMO_ITEMS) items[id] = KIT_PLAIN.includes(id) ? {} : { camo: camoOf(id, seedCamo) };
  items.cap.style = 'cover';
  items.shirt.sleeves = 'down';
  items.trousers.cut = 'trousers';
  items.gloves.worn = true;
  items.eyewear = { style: 'none' };
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
    const src = raw.items[id] || {};
    const item = {};
    if (ok(src.camo)) item.camo = src.camo;
    else if (!KIT_PLAIN.includes(id) && base.items[id].camo) item.camo = base.items[id].camo;
    items[id] = item;
  }
  items.cap.style = CAP_STYLES.includes(raw.items.cap && raw.items.cap.style) ? raw.items.cap.style : 'cover';
  items.shirt.sleeves = SLEEVES.includes(raw.items.shirt && raw.items.shirt.sleeves) ? raw.items.shirt.sleeves : 'down';
  items.trousers.cut = TROUSER_CUTS.includes(raw.items.trousers && raw.items.trousers.cut) ? raw.items.trousers.cut : 'trousers';
  items.gloves.worn = !(raw.items.gloves && raw.items.gloves.worn === false);
  const eye = raw.items.eyewear && raw.items.eyewear.style;
  items.eyewear = { style: EYEWEAR_STYLES.includes(eye) ? eye : 'none' };
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
  if (!patch || typeof patch !== 'object') return null;
  if (id === 'eyewear') {
    if (!EYEWEAR_STYLES.includes(patch.style)) return null;
    next.items.eyewear = { style: patch.style };
    return next;
  }
  if (id === 'boots') {
    if (!BOOT_COLOURS.includes(patch.colour)) return null;
    next.items.boots = { colour: patch.colour };
    return next;
  }
  if (!CAMO_ITEMS.includes(id)) return null;
  const item = { ...next.items[id] };
  let touched = false;
  if (patch.camo != null) {
    if (typeof patch.camo !== 'string' || !patch.camo || !isCamo(patch.camo)) return null;
    item.camo = patch.camo;
    touched = true;
  }
  if (patch.style != null) {
    if (id !== 'cap' || !CAP_STYLES.includes(patch.style)) return null;
    item.style = patch.style;
    touched = true;
  }
  if (patch.sleeves != null) {
    if (id !== 'shirt' || !SLEEVES.includes(patch.sleeves)) return null;
    item.sleeves = patch.sleeves;
    touched = true;
  }
  if (patch.cut != null) {
    if (id !== 'trousers' || !TROUSER_CUTS.includes(patch.cut)) return null;
    item.cut = patch.cut;
    touched = true;
  }
  if (patch.worn != null) {
    if (id !== 'gloves' || typeof patch.worn !== 'boolean') return null;
    item.worn = patch.worn;
    touched = true;
  }
  if (!touched) return null;
  next.items[id] = item;
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
