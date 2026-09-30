// GP-82 (D-66): profile-only camo rewards. A run's gear and combat values never live here.
import { CAMO_KEYS } from '../core/camo.js';
import { text } from './strings.js';

export const UNLOCKS_KEY = 'tt_unlocks';
export const FREE_CAMOS = Object.freeze(['m81', 'coyoteBrown', 'oliveDrab', 'marpat']);
const count = n => Number.isSafeInteger(n) && n >= 0;
const thresholds = Object.freeze([
  ['day', [['khaki', 2], ['tan', 3], ['armyGreen', 4], ['drab', 5], ['fieldDrab', 6],
    ['foliageGreen', 8], ['darkOliveGreen', 10], ['battleshipGrey', 12], ['gunmetal', 14],
    ['dbdu', 16], ['dcu', 18], ['multicam', 20]]],
  ['runs', [['ecru', 3], ['desertSand', 10]]],
  ['streak', [['camouflageGreen', 8], ['rifleGreen', 12], ['charcoal', 16],
    ['tigerStripe', 20], ['zaireLeopard', 25], ['giraffe', 30]]],
  ['kills', [['darkKhaki', 100], ['olive', 200], ['forestGreen', 300],
    ['dpmWoodland', 400], ['flecktarn', 500]]],
  ['headshots', [['sandyBrown', 25], ['airForceBlueRaf', 50], ['swissTaz', 100]]],
  ['skulls', [['feldgrau', 100], ['navyBlue', 250], ['papDigital', 500]]],
  ['evacuated', [['mccuu', 1], ['greenMulticam', 3]]]
]);
const badgeRules = Object.freeze([
  ['prussianBlue', 'first-bank'], ['airForceBlueUsaf', 'relay-online'],
  ['ucp', 'night-five'], ['m14Woodland', 'night-ten'], ['cadpat', 'night-twenty'],
  ['sumpftarn', 'fog-survivor'], ['cactus', 'kicked-free'], ['m14Desert', 'out-on-the-boat'],
  ['serbianKarst', 'thousand-skulls'], ['french', 'thousand-kills'],
  ['teloMimetico', 'hundred-headshots'], ['dpmDesert', 'streak-twenty']
]);
const rules = new Map();
for (const [field, entries] of thresholds) for (const [key,minimum] of entries) rules.set(key, {field,minimum});
for (const [key,badge] of badgeRules) rules.set(key, {badge});
const camoSet = new Set(CAMO_KEYS);
const ordered = ids => CAMO_KEYS.filter(key => ids.has(key));

// Read only the persisted best-run snapshot and badge list. Invalid or absent data
// cannot grant a pattern; the four issued camos are always present.
export function unlockedCamos(records, badges) {
  const found = new Set(FREE_CAMOS);
  for (const [field, entries] of thresholds) {
    const value = records?.[field];
    if (count(value)) for (const [key,minimum] of entries) if (value >= minimum) found.add(key);
  }
  const ownedBadges = new Set(Array.isArray(badges?.unlocked) ? badges.unlocked : []);
  for (const [key,badge] of badgeRules) if (ownedBadges.has(badge)) found.add(key);
  return ordered(found);
}

export function camoUnlockHint(key) {
  if (!camoSet.has(key)) return null;
  if (FREE_CAMOS.includes(key)) return text('unlocks.free');
  const rule = rules.get(key);
  if (rule.badge) {
    const badgeKey = rule.badge.replace(/-([a-z])/g, (_,letter) => letter.toUpperCase());
    return text('unlocks.badge', {name: text(`badges.${badgeKey}.name`)});
  }
  return text(`unlocks.${rule.field}`, {count: rule.minimum});
}

export function camoUnlockToast(keys) {
  const names = [...new Set(keys)].filter(key => camoSet.has(key)).map(key => text(`cif.pattern.${key}`));
  if (!names.length) return null;
  return text(names.length === 1 ? 'unlocks.toastOne' : 'unlocks.toastMany',
    {name:names[0],more:names.length - 1});
}

export function createUnlocks({load=()=>null,save=()=>{}}={}) {
  const unlocked = new Set(FREE_CAMOS);
  try {
    const value = JSON.parse(load());
    if (value?.version === 1 && Array.isArray(value.unlocked))
      for (const key of value.unlocked) if (camoSet.has(key)) unlocked.add(key);
  } catch { /* corrupt or denied storage cannot block the dressing room */ }
  const read = () => ({version:1,unlocked:ordered(unlocked)});
  const persist = () => { try { save(JSON.stringify(read())); } catch { /* keep this session's rewards */ } };
  const add = keys => {
    const fresh = keys.filter(key => !unlocked.has(key));
    if (fresh.length) { for (const key of fresh) unlocked.add(key); persist(); }
    return fresh;
  };
  return {
    read,
    isUnlocked: key => camoSet.has(key) && unlocked.has(key),
    finish({eligibleRun=false,records,badges}={}) {
      return eligibleRun === true ? add(unlockedCamos(records,badges)) : [];
    },
    unlockAll: () => add(CAMO_KEYS)
  };
}
