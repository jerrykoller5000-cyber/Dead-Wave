# Every kind has a weakness (D-62)

Owner: Claude (CL-91, P-118). For: Jerry to read. Grokbot builds it into the fight (GB-104, P-119), ChatGPT puts the
counters into words (GP-80, P-120). Written 2026-09-29 from `ZOMBIE_TYPES` and `damageZombie` in `index.html`.

## The idea

Today almost every kind takes every hit the same way: a flat `armor` cut (0 to 0.32) off everything. Only the
demon shrugs off fire (`fireResist` 0.8). So one good gun answers everything. D-62: each kind gets **one clear
weakness and one clear resistance** by damage type, so each needs its own answer and a varied loadout pays.

## The six damage types

| Type | What deals it today |
| --- | --- |
| **Bullet** | Pistol, revolver, Uzi, M4, AK-47, minigun, sniper, the turrets, the M240B (`kind: 'bullet'`) |
| **Pellet** | Shotgun, AA-12 (`'pellet'`) |
| **Fire** | The flamer's stream, burning, ground fires, fire traps (today `'generic'` scaled by `fireResist`) |
| **Blast** | Grenades, the launcher, the mortar, mines, fuel drums, a bomber's chain (`'explosive'`) |
| **Blade** | Knife, machete, chainsaw, the spikes upgrade (`'melee'`, `'chainsaw'`) |
| **Crush** | Falling trees (`'crush'`); bodies thrown into others once P-7's knock-on deals damage |

A defence counts as the type it deals: a turret is Bullet, spikes are Blade, a mine is Blast, a fire trap is Fire. Some defences pass `'generic'` today; GB-104 gives each its type. Lightning (P-122)
stays outside the table: it kills what it hits.

## The table

The number is **how much of the hit the zombie takes** (1 = all of it). **Bold** is its weakness, *italic* its
resistance. The plain numbers are today's armour (1 - `armor`), so a kind is no tougher or weaker overall except
where the table says so.

| Kind | Bullet | Pellet | Fire | Blast | Blade | Crush | The counter, in a line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Brute** (P-26's plates) | *0.45* | 0.45 | 0.9 (burning 1.0) | **0.9** | 0.45 | 0.9 | Plates stop bullets. Blow it up or burn it. |
| Shambler | 1 | 1 | 1 | 1 | **1.5** | *0.6* | Save your ammo: the knife does the job. |
| Feral | 1 | **1.4** | 1 | *0.6* | 1 | 1 | Too quick for grenades. Let it close and use the shotgun. |
| Leaper | **1.3** | 1 | 1 | 1 | *0.6* | 1 | Shoot it before it lands. Don't try to knife it. |
| Spider | *0.7* | 1.1 (GB-96) | **1.6** | 0.92 | 0.92 | 0.92 | Its shell turns bullets. Burn it off the wall. |
| Drowned | 0.96 | **1.3** | *0.4* | 0.96 | 0.96 | 0.96 | Too wet to burn. The shotgun tears it apart. |
| Military | *0.7* | 0.88 | 0.88 | **1.4** | 0.88 | 0.88 | Vests stop bullets. They move together: throw a grenade. |
| Spitter | **1.3** | 1 | 1 | 1 | *0.6* | 1 | Shoot it while it creeps in. Don't get close. |
| Screamer | **1.4** | *0.6* | 1 | 1 | 1 | 1 | Kill the screamer first, with a rifle. It stays out of shotgun range. |
| Bomber | 1 | 1 | **1.5** | 1 | *0.5* | 1 | Burn it or shoot it far away. Never let it reach you. |
| Demon | **1.2** | 0.82 | *0.2* | 0.82 | 0.7 | 0.82 | Fire does nothing. Pour rifle fire into it. |
| Colossus | *0.5* | 0.68 | 0.68 | **1.3** | 0.68 | 0.68 | Bullets barely scratch it. Mortar and launcher. |
| Guardian (the fightable one) | *0.6* | 0.7 | **1.4** | 0.7 | 0.7 | 0.7 | It lives in the dark. Fire drives it back. |

The cave guardian at the mouths stays out of the table: it can't be hurt (D-26, D-46).

Notes on the rows:
- **Brute:** exactly P-26 as GB-75 builds it now (0.55 armour against bullets, pellets and blades; 0.1 against
  blasts and the flame; burning at full). The table only writes it down. Its "weakness" is the one type that gets
  through the plates.
- **Spider:** its pellet 1.1 is GB-96's small spider-only shotgun edge; fire is its real weakness.
- **Demon:** its 0.2 fire is today's `fireResist` 0.8, folded into the table.
- **Military:** the one kind that gets a little tougher against bullets (0.88 to 0.7): the vest. Headshots still
  count the same, so aiming high still works.

## How it stacks with what's already there

1. **The table replaces `armor` and `fireResist`** for these kinds. `damageZombie` takes `amount × table[kind][type]`
   instead of `amount × (1 - armor)`; the three burn sites (`fireResist`) read the Fire column.
2. **Cave roles still stack on top** (GB-4): iron's `armorAdd` 0.10 takes 10% off every column; wet's
   `fireResistAdd` 0.22 takes 22% off Fire. So an iron-cave military is 0.63 against bullets.
3. **Headshots, the head-gone bonus and dismemberment** work as today, on the damage after the table.
4. **Nothing below 0.2 or above 1.6.** No kind is immune to anything, and no weakness makes a kind trivial.

For GB-104, the whole table as data (one place; `ui/scouting.js` can import the same file for GP-80):

```js
// Share of a hit each kind takes, by damage type (docs/weaknesses.md, D-62).
export const WEAKNESS = {
  //          bullet pellet fire  blast blade crush
  brute:    { bullet: 0.45, pellet: 0.45, fire: 0.9,  blast: 0.9,  blade: 0.45, crush: 0.9,  burn: 1.0 },
  shambler: { bullet: 1,    pellet: 1,    fire: 1,    blast: 1,    blade: 1.5,  crush: 0.6 },
  feral:    { bullet: 1,    pellet: 1.4,  fire: 1,    blast: 0.6,  blade: 1,    crush: 1 },
  leaper:   { bullet: 1.3,  pellet: 1,    fire: 1,    blast: 1,    blade: 0.6,  crush: 1 },
  spider:   { bullet: 0.7,  pellet: 1.1,  fire: 1.6,  blast: 0.92, blade: 0.92, crush: 0.92 },
  drowned:  { bullet: 0.96, pellet: 1.3,  fire: 0.4,  blast: 0.96, blade: 0.96, crush: 0.96 },
  military: { bullet: 0.7,  pellet: 0.88, fire: 0.88, blast: 1.4,  blade: 0.88, crush: 0.88 },
  spitter:  { bullet: 1.3,  pellet: 1,    fire: 1,    blast: 1,    blade: 0.6,  crush: 1 },
  screamer: { bullet: 1.4,  pellet: 0.6,  fire: 1,    blast: 1,    blade: 1,    crush: 1 },
  bomber:   { bullet: 1,    pellet: 1,    fire: 1.5,  blast: 1,    blade: 0.5,  crush: 1 },
  demon:    { bullet: 1.2,  pellet: 0.82, fire: 0.2,  blast: 0.82, blade: 0.7,  crush: 0.82 },
  colossus: { bullet: 0.5,  pellet: 0.68, fire: 0.68, blast: 1.3,  blade: 0.68, crush: 0.68 },
  guardian: { bullet: 0.6,  pellet: 0.7,  fire: 1.4,  blast: 0.7,  blade: 0.7,  crush: 0.7 },
};
// Each kind's one weakness and one resistance, for the words (GP-80).
export const COUNTER = {
  brute: ['blast', 'bullet'], shambler: ['blade', 'crush'], feral: ['pellet', 'blast'], leaper: ['bullet', 'blade'],
  spider: ['fire', 'bullet'], drowned: ['pellet', 'fire'], military: ['blast', 'bullet'], spitter: ['bullet', 'blade'],
  screamer: ['bullet', 'pellet'], bomber: ['fire', 'blade'], demon: ['bullet', 'fire'], colossus: ['blast', 'bullet'],
  guardian: ['fire', 'bullet'],
};
```

Where the file lives is Grokbot's call in GB-104 (a `combat/` module is the natural home). ChatGPT imports it
rather than copying the numbers.

## Done means

- **GB-104:** a test per row (one hit of each type on each kind comes out at the table's share, within 1%);
  nightsim medians for nights 5-20 before and after, and the handoff says if any night got more than 15% longer
  or shorter. If one does, Grokbot proposes the fix and Claude signs it off.
- **GP-80:** the scouting report and the first-use card for each kind say its counter line (above, in the
  strings), and unit tests read the same `COUNTER` data.
- Jerry reads the table. Anything he wants changed is one number here.
