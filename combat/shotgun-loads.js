// CB-248 (J114, Jerry's 9 Nov playtest: "Add 3 1/2 inch slug and buckshot ammo options to shotgun. Not AA-12. Just regular
// Shotgun."). The pump shotgun takes two magnum shells besides the one it is issued with. Each is bought once at the Armory's
// workbench (like a suppressor) and fitted there, one at a time; with neither fitted the gun fires its issued shell, unchanged.
// This file is the numbers and the rule that turns a base weapon sheet and a chosen load into the sheet the gun fires with;
// index.html applies it to WEAPON_STATS.shotgun when a load is fitted or taken off. Pure: nothing here knows about the page.
//
//   issued shell     7 pellets x 9      spread 0.14   reaches 22 m   (the sheet in index.html, the base)
//   3.5" buckshot   10 pellets x 10     spread 0.16   reaches 26 m   a bigger, wider pattern: more of it lands close up
//   3.5" slug        1 slug    x 70     spread 0.02   reaches 44 m   one heavy, accurate round: a rifle's reach, no pattern
//
// Claude signs off the numbers (Jerry gave none). They are all here, in one place, and nothing else reads them.

export const SHOTGUN_LOAD_IDS = ['buck', 'slug'];

// Fields a load replaces on the weapon sheet; every other field (name, maxAmmo, reload, interval, speed, auto) stays the gun's.
export const LOAD_FIELDS = ['pellets', 'damage', 'spread', 'range', 'interval'];

export const SHOTGUN_LOADS = {
  buck: {
    id: 'buck', name: '3.5" magnum buckshot', tag: '3.5" BUCKSHOT', price: 85,
    pellets: 10, damage: 10, spread: 0.16, range: 26,
    help: 'Ten pellets of 10 a shell, a wider pattern, 26 m. Fit one load at a time.',
  },
  slug: {
    id: 'slug', name: '3.5" magnum slug', tag: '3.5" SLUG', price: 95,
    pellets: 1, damage: 70, spread: 0.02, range: 44, interval: 0.85,
    help: 'One 70-damage slug, tight and long: 44 m. A slower pump. Fit one load at a time.',
  },
};

export function isShotgunLoad(id) { return Object.prototype.hasOwnProperty.call(SHOTGUN_LOADS, id); }

// The sheet the gun fires with: the base with the load's fields laid over it. 'std' (or anything unknown) is the base as it
// is. The base is never changed, so a fitted load can be taken off again.
export function shotgunLoadStats(base, id) {
  const out = { ...base };
  if (!isShotgunLoad(id)) return out;
  const load = SHOTGUN_LOADS[id];
  for (const k of LOAD_FIELDS) if (load[k] != null) out[k] = load[k];
  return out;
}

// What the bench says: the load against the issued shell, as numbers for the strings (armory.mod.load.<id>Help takes them).
export function shotgunLoadParams(base, id) {
  const s = shotgunLoadStats(base, id);
  return { pellets: s.pellets, damage: s.damage, spread: s.spread, range: s.range, total: s.pellets * s.damage,
    basePellets: base.pellets, baseDamage: base.damage, baseRange: base.range, baseTotal: base.pellets * base.damage };
}

// Jerry's hit sheet (game/hit-balance.js, New-Hit.xlsx) scores a shotgun hit as a part of the body's health: the cell is the WHOLE
// shell (270% of a shambler), shared out over the pellets of the shot (pelletOf), and a lone round with no pellet count is taken
// as one pellet of the issued shell (HIT_SHELL.shotgun = 7). The shot's damage is then that share times (amount / hitBase), where
// amount is the round's damage and hitBase the number the shot is tagged with. So that a load's own numbers count, the tag is
//   hitBase = (the issued shell's total) / (the parts the sheet shares a shell over)
// which scores a load at (its shell total / the issued shell's total) of the sheet's cell, however it is cut into pellets:
//   issued 63/7 = 9 (as it was), buckshot 63/10 = 6.3 (each of its 10 pellets x1.59), slug 63/7 = 9 (the lone round x7.8 of one
//   pellet's share, which is x1.11 of the whole shell).
export function shotgunHitBase(base, st, wholeShell = 7) {
  const parts = st.pellets > 1 ? st.pellets : wholeShell;
  return (base.pellets * base.damage) / parts;
}
