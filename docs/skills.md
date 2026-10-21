# Skills by doing (D-59)

Owner: Claude (CL-88, P-104). For: Jerry to read. Built by Cursor (CU-62, the plumbing), Grokbot (GB-101, the
counters), ChatGPT (GP-76 the panel and toast, GP-77 the economy re-based). Written 2026-09-29.

## The idea

The six perks leave the kiosk. The same six skills now rank up, 0 to 5, from what the marine does, not from Cash.
Nothing is earned by getting hurt, by reloading a full magazine, or by jogging circles in daylight. Ranks last the
run and reset on a fresh start (D-30: no power carried between runs). Each player learns his own (D-58).

## The six skills

| Skill | Key | Earned by (XP) | Each rank gives | At rank 5 |
| --- | --- | --- | --- | --- |
| **Vitality** | `vitality` | 2 for each dawn he lives to see; 1 for a comeback (below 25% health, still alive and back above 50% within 30 s; once a night) | +15 max health (was +20 as a perk); the new health is added, not a full heal | +75 max health |
| **Stopping power** | `power` | 1 for a headshot kill; 1 for a one-shot kill (a zombie at full health killed by one shot or one shell) | +8% damage from every weapon (was +12%) | +40% |
| **Quick hands** | `hands` | 1 for a reload started with the magazine at or under a quarter and a zombie within 8 m | +10% faster reloads and pump or cylinder work (was +12%) | +50% |
| **Fleet foot** | `legs` | 1 for every 10 s running during a wave with a zombie within 15 m and closing; 1 for a dodge roll within 1.5 m of a zombie's attack | +5% walk and run speed | +25% (D-59 cap) |
| **Scavenger** | `scavenger` | 1 for every 10 skulls banked at the HQ window | +6% skull value from kills (was +12%) | +30% (D-59 cap) |
| **Grenadier** | `grenadier` | 1 for an explosion that kills 3 or more; 2 if it kills 5 or more (grenade, launcher, mortar, a drum he set off) | +1 grenade carried and +8% blast radius; from rank 1, a free grenade each dawn | +5 grenades, +40% radius |

The speed rule from D-61 still holds: going unarmed (+10%) and Fleet foot together never give more than +30%.

## Ranks

XP is counted per skill and never goes down during a run. A rank is reached at these totals:

| Skill | Rank 1 | Rank 2 | Rank 3 | Rank 4 | Rank 5 |
| --- | --- | --- | --- | --- | --- |
| Vitality | 6 | 14 | 24 | 36 | 50 |
| Stopping power | 60 | 180 | 400 | 750 | 1,200 |
| Quick hands | 10 | 30 | 60 | 100 | 150 |
| Fleet foot | 20 | 60 | 130 | 230 | 360 |
| Scavenger | 15 | 45 | 100 | 180 | 280 |
| Grenadier | 5 | 15 | 35 | 60 | 90 |

The aim: a good run reaches rank 3 or 4 in most skills by night 20, and rank 5 in the one it leans on. These are
first numbers: GB-101 reports each skill's median XP by night from nightsim (nights 5, 10, 15, 20), and Claude moves
the thresholds to hit the aim. Vitality's are exact: 20 dawns give 40 XP, rank 4; comebacks give rank 5.

## What does not count (no farming)

- **Vitality:** damage never gives XP. A comeback needs the damage to come from zombies (not a fall, fire he lit or
  his own grenade), and pays once a night.
- **Stopping power:** only kills, and only zombies that were a threat (not a debug spawn: `TT` spawns set a flag).
- **Quick hands:** not a reload of a magazine above a quarter, and not with nobody within 8 m. At least one shot fired
  since the last reload.
- **Fleet foot:** only during a wave (not prep, not day fights), only running (not walking), and only while the
  nearest zombie within 15 m is getting closer. A roll counts only within 1.5 m of a zombie that is winding up or
  swinging.
- **Scavenger:** skulls count when banked, not when picked up.
- **Grenadier:** one count per explosion, however many it kills.

## For the builders

**CU-62, the store** (Cursor; after CU-63's players list). One skills object per player, created with the player,
reset by `resetGame`:

```js
p.skills = { vitality: { xp: 0, rank: 0 }, power: {...}, hands: {...}, legs: {...}, scavenger: {...}, grenadier: {...} };
addSkillXp(p, key, n, why)   // adds n XP; on a new rank sends dw-game 'skill-up' { player: p.id, key, rank, why }
skillLvl(p, key)             // 0-5
SKILL_RANKS                   // the table above, one place, in the same module
```

The multipliers read the local player's skills where they read the perks today:
`dmgMult` (power, +8% a rank), `reloadMult` (hands, +10%), `speedMult` (legs, +5%, capped with D-61), `cashMult`
(scavenger, +6%), `maxGrenades` and the blast radius (grenadier), the dawn grenade (grenadier from rank 1), max health
(vitality, +15). `PERKS`, `perkLevels`, `perkCost`, `resetPerks`, `buyPerk` and the kiosk rows go.

**GB-101, the counters** (Grokbot). Each `addSkillXp` call sits where the thing happens: the headshot and one-shot
kill in `damageZombie`/`killZombie`, the reload in `startReload`, the chase and the roll in movement and `tryRoll`, the
explosion's kill count, the dawn, the comeback watch, the HQ bank. A test per skill: the action gives XP, the farm
doesn't.

**GP-76, the words** (ChatGPT). A skills panel in the pause menu and on the death card (six rows, rank and progress to
the next), a toast on `skill-up`: "Fleet foot · rank 2". The streak's own boosts are renamed so they don't clash
with the skills: "fast feet" becomes **"light step"** and "quick hands" becomes **"steady hands"**; "free rounds" and
"thick skin" stay.

**GP-77, the economy** (ChatGPT). Perks were a big Cash sink (six perks, five ranks each). The GP-41 table is redone
without them, before P-46 and P-47, so nights 10-20 still have something worth saving for.

## Co-op (D-58)

Each player has his own skills and earns his own XP: the kill, the reload, the run, the skulls he banks. A comeback is
his own health. The toast shows only on his screen.
