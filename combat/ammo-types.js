// CB-294 (J133, Jerry 10 Nov, D-149): the ammo system. "The cartridges must reflect their real-world counterparts on all
// guns. ... For shotgun ammunition types the shell casings are a different color depending on what type has been expended.
// Slugs are most effective and cost the most, buckshot is a little more effective than birdshot (the typical round) and
// more expensive. Use X to change ammunition types. If the player changes ammunition types he will first have to unload
// the current ammunition and put in the new ones. He retains the ejected ammunition."
// J134 (standing, D-150, AGENTS.md rule 16b): no ammo types on a gun that can fire full-auto (the pistol with its sear
// included); there X is the fire selector. Types go only on guns that never fire full-auto, where X changes the ammo.
//
// This file is the numbers and the rules; index.html keeps the counts and applies them. Pure: nothing here knows about the
// page. The numbers are proposals for Jerry to change (docs/ammo.md); they are all here, in one place.
//
//   the pump shotgun (12 gauge, 2 3/4")    pellets x damage   spread   reach   a pack        hull
//   birdshot  #4 shot, the issued round       18 x 3.5 = 63     0.16     22 m    20 for $20    red
//   buckshot  00 buck, a little more           8 x 10 = 80      0.12     26 m    20 for $30    blue (one band)
//   slug      1 oz rifled slug, the most        1 x 100          0.02     44 m    20 for $40    ivory (two bands)
//
// Effect in Jerry's hit sheet (game/hit-balance.js scores a shell as a part of the body's health; shotgunHitBase below
// makes a type count by its shell total against the issued shell's): birdshot x1.00, buckshot x1.27, slug x1.59.
// Birdshot is the shell the game always had (the same sheet, the 12ga pack, the same reserve); buckshot and slug are
// counted on their own. The hulls' colours are ChatGPT 2's art (GT-20080, studio/weapon-casings.js); hullHex is the same colour
// for anything drawn without that geometry.
// CB-327 (J151 note 13, Jerry 13 Nov: "Birdshot needs more pellets hitting the target than buck. Right now both have 8."):
// birdshot is many small pellets, 18 of 3.5 in a looser pattern (was 7 of 9), the same 63 a shell, so its effect stays x1.00.

export const AMMO_TYPES = Object.freeze({
  shotgun: Object.freeze({
    issued: 'birdshot',
    order: Object.freeze(['birdshot', 'buckshot', 'slug']),
    types: Object.freeze({
      birdshot: Object.freeze({ id: 'birdshot', name: 'Birdshot', tag: 'BIRDSHOT', real: '12 ga 2 3/4" #4 shot',
        pellets: 18, damage: 3.5, spread: 0.16, range: 22, pack: 20, price: 20, hull: 'red', hullHex: 0xa8261c }),
      buckshot: Object.freeze({ id: 'buckshot', name: 'Buckshot', tag: 'BUCKSHOT', real: '12 ga 2 3/4" 00 buck',
        pellets: 8, damage: 10, spread: 0.12, range: 26, pack: 20, price: 30, hull: 'blue', hullHex: 0x2c4f9c }),
      slug: Object.freeze({ id: 'slug', name: 'Slug', tag: 'SLUG', real: '12 ga 2 3/4" 1 oz rifled slug',
        pellets: 1, damage: 100, spread: 0.02, range: 44, pack: 20, price: 40, hull: 'ivory', hullHex: 0xe6dcc0 })
    })
  })
});

// Fields a type replaces on the weapon sheet; every other field (name, maxAmmo, reload, interval, speed, auto) stays the gun's.
export const TYPE_FIELDS = Object.freeze(['pellets', 'damage', 'spread', 'range']);

// Seconds a round, real-world: a shell worked out of a pump's tube (rack and catch, or the latch pressed) and one pushed in.
export const SWITCH_TIMING = Object.freeze({ shotgun: Object.freeze({ unload: 0.36, load: 0.42, settle: 0.25 }) });

export const ALIASES = Object.freeze({ std: 'birdshot', issued: 'birdshot', buck: 'buckshot' });

export function typedGuns() { return Object.keys(AMMO_TYPES); }
export function hasTypes(gun) { return Object.prototype.hasOwnProperty.call(AMMO_TYPES, gun); }
export function typeIds(gun) { return hasTypes(gun) ? [...AMMO_TYPES[gun].order] : []; }
export function issuedType(gun) { return hasTypes(gun) ? AMMO_TYPES[gun].issued : null; }
export function canonType(gun, id) {
  if (!hasTypes(gun)) return null;
  const k = ALIASES[id] || id;
  return Object.prototype.hasOwnProperty.call(AMMO_TYPES[gun].types, k) ? k : null;
}
export function typeOf(gun, id) { const k = canonType(gun, id); return k ? AMMO_TYPES[gun].types[k] : null; }

// J134: a gun may have types only if it can never fire full-auto. canFireAuto(gun) is the game's answer (its sheet's auto,
// a fire selector, the pistol's sear). Returns the guns that break the rule (none, or the test fails).
export function j134Breaches(canFireAuto) { return typedGuns().filter((g) => canFireAuto(g)); }

// The sheet the gun fires with: the base with the type's fields laid over it. The issued type is the base as it is.
export function typeStats(base, gun, id) {
  const out = { ...base };
  const t = typeOf(gun, id);
  if (!t || canonType(gun, id) === issuedType(gun)) return out;
  for (const k of TYPE_FIELDS) if (t[k] != null) out[k] = t[k];
  return out;
}

// The number a shotgun hit is tagged with, so that a type's own pellets and damage count in Jerry's hit sheet (see
// combat/shotgun-loads.js shotgunHitBase, the same rule): the issued shell's total over the parts the sheet shares a shell over.
export function typeHitBase(base, st, wholeShell = 7) {
  const parts = st.pellets > 1 ? st.pellets : wholeShell;
  return (base.pellets * base.damage) / parts;
}
// A type's effect against the issued round's, in the hit sheet's terms (its shell total over the issued shell's).
export function typeEffect(gun, id) {
  const t = typeOf(gun, id), b = typeOf(gun, issuedType(gun));
  return t && b ? (t.pellets * t.damage) / (b.pellets * b.damage) : 0;
}
export function typeUnitPrice(gun, id) { const t = typeOf(gun, id); return t ? t.price / t.pack : 0; }

// What X goes to next: the next type in the gun's order (round to the start) that he carries any of, other than the one
// loaded; null when there is none (nothing to change to).
export function nextType(gun, loaded, carried) {
  const ids = typeIds(gun), i = ids.indexOf(canonType(gun, loaded));
  if (!ids.length) return null;
  for (let s = 1; s < ids.length; s++) {
    const k = ids[(Math.max(0, i) + s) % ids.length];
    if ((carried[k] | 0) > 0) return k;
  }
  return null;
}

// The change of type, as a small machine the page steps each frame. start() takes what is in the gun (inGun rounds of
// `from`), what he carries of `to` and the gun's capacity; step(dt) returns the rounds that moved this step:
// { unload: n } rounds out of the gun back into `from`'s count, then { load: n } rounds of `to` from his count into the gun.
// The unload comes first and all of it: a tube holds one type (J133). cancel() stops it where it is (the rounds already
// moved stay moved). state() is what the hands (CE-3), the HUD and the checks read.
export function createTypeSwitch(gun, timing = SWITCH_TIMING[gun] || SWITCH_TIMING.shotgun) {
  let s = null, count = 0;
  return {
    start(from, to, inGun, carriedTo, cap) {
      from = canonType(gun, from); to = canonType(gun, to);
      if (!from || !to || from === to) return false;
      const unload = Math.max(0, inGun | 0), load = Math.max(0, Math.min(cap | 0, carriedTo | 0));
      s = { from, to, phase: unload > 0 ? 'unload' : 'load', unload, load, unloaded: 0, loaded: 0, t: 0, round: 0, n: ++count };
      if (!load && !unload) { s = null; return false; }
      return true;
    },
    // dt seconds of work; returns { unload, load, done }
    step(dt) {
      const out = { unload: 0, load: 0, done: false };
      if (!s) return out;
      s.t += dt; s.round += dt;
      for (let guard = 0; guard < 64; guard++) {
        if (s.phase === 'unload') {
          if (s.unloaded >= s.unload) { s.phase = s.load > 0 ? 'load' : 'settle'; s.round = Math.max(0, s.round); continue; }
          if (s.round < timing.unload) break;
          s.round -= timing.unload; s.unloaded++; out.unload++;
        } else if (s.phase === 'load') {
          if (s.loaded >= s.load) { s.phase = 'settle'; continue; }
          if (s.round < timing.load) break;
          s.round -= timing.load; s.loaded++; out.load++;
        } else if (s.phase === 'settle') {
          if (s.round < timing.settle) break;
          s = null; out.done = true; break;
        } else break;
      }
      return out;
    },
    cancel() { const was = s; s = null; return was ? { from: was.from, to: was.to, phase: was.phase, unloaded: was.unloaded, loaded: was.loaded } : null; },
    active() { return !!s; },
    // For the hands and the HUD: the phase, the round in hand (0..1 through it) and the counts.
    state() {
      if (!s) return null;
      const per = s.phase === 'unload' ? timing.unload : s.phase === 'load' ? timing.load : timing.settle;
      return { gun, from: s.from, to: s.to, phase: s.phase, u: Math.max(0, Math.min(1, s.round / per)), unloaded: s.unloaded, unload: s.unload,
        loaded: s.loaded, load: s.load, t: s.t, n: s.n,
        total: s.unload * timing.unload + s.load * timing.load + timing.settle };
    },
    count() { return count; }
  };
}
