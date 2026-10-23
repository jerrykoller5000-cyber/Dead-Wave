# Grave Shift: difficulty and economy inventory (source at commit cb2e7e2)

`index.html:N` is a line in `index.html` (at cb2e7e2); other paths
are relative to that folder. "Listed HP" means the type's table HP (`ZOMBIE_TYPES` and `game/hit-balance.js` ZOMBIE_HP
hold the same values). Money is the in-game Cash / skull value ($). Speeds are m/s. Where something was looked for and
not found, it says **not found**.

The nights 1-20 tables in section 2 and the hits-to-kill matrices in section 3 come from running the live code under
node, not from reading it by eye (see "How these were produced" in each section).

---

## 0. How damage reaches a zombie (read this first)

`damageZombie` (index.html:49614) has two paths:

1. **The hit sheet (HIT_PERCENT), most of the player's own weapons.** If the hit carries `hitWeapon` and that weapon
   has a row in `game/hit-balance.js` (pistol, uzi, m4, ak, revolver, sniper, minigun, shotgun, aa12, knife, machete,
   chainsaw, flamer), the damage is `listedHP x percent / 100 / parts` (`listedBodyDamage`, hit-balance.js:36-42). The
   weapon's own `WEAPON_STATS.damage` only scales it (`scale = amount / hitBase`: Power skill +8%/rank, suppressor x0.9,
   pierce falloff x0.85 per body). Index.html:49648-49664. Parts: a shotgun shell is 7 pellets, an AA-12 shell 5
   (`HIT_SHELL`, hit-balance.js:33), so each pellet does 1/7 or 1/5 of the shell's cell.
   - Military: the sheet cell is a chest shot; helmet x(0.6/0.5)=1.2, open limb x(0.8/0.5)=1.6
     (military-behavior.js:3, index.html:49653).
   - Brute: the sheet cell is "with plates on"; a broken plate doubles it (BRUTE_ARMOR exposed 0.9 / protected 0.45,
     brute-armor.js:2; factor applied index.html:49654). Plates have 45 front / 40 back / 30 left / 30 right points and
     wear by the hit's raw amount (x1 bullets, x0.7 blades, x0.6 blasts to every plate) (brute-armor.js:47-61).
   - Cave-role armour/fire resist still scales it (index.html:49655-49660).
   - Because the sheet uses **listed** HP but every zombie spawns with `hp = round(listedHP x U(0.85, 1.15))`
     (index.html:37359-37363), a 100% cell is not a sure one-hit kill (about 61% of ferals die to a 100% hit; observation 5).
2. **The weakness table (everything else).** Launcher, hand grenade, mortar, fuel drum, mines, spikes, turrets, the
   Watchman M240, the katana, bomber blasts, burn ticks: `damage x WEAKNESS[type][damageType]`, clamped 0.2..1.6 (drowned
   fire floor 0.1) (`game/weaknesses.js:4-21`; `weakShare` index.html:49604-49613).

Then, for both paths: headshot bonus +85% of the hit for bullets, +50% for a shell's pellets (once per shell), times
the cave role's headshotMul (chalk 1.35) (index.html:49696-49699); head already gone x1.15 (49665). **Screamer sonic
shield**: while protected a screamer takes only 3% of the final damage (SCREAMER.damageShare 0.03,
screamer-behavior.js:3; applied index.html:49669-49678; burn too, 53635). It is protected at all times except for 2.4 s
after each scream ends (`openSeconds`, screamer-behavior.js:3,7,12) or once its head is off.

---

## 1. Zombies

### 1a. Base stats (ZOMBIE_TYPES, index.html:35652-35727)

| Type | HP (listed) | `speed` field | Radius | Melee dmg | Skull value (cashDrop) | `armor` field* | Tactics | Notes |
|---|---|---|---|---|---|---|---|---|
| Shambler | 24 | 3.19 | 0.42 | 6 | 1 | 0 | direct | |
| Feral | 15 | 5.4 | 0.37 | 7 | 4 | 0 | flank | |
| Leaper | 30 | 4.2 | 0.42 | 10 | 6 | 0 | leap | |
| Spider | 44 | 3.0 | 0.62 | 8 | 10 | 0.08 | spit | no horde profile |
| Drowned | 40 | 2.4 | 0.44 | 10 | 6 | 0.04 | direct | aquatic (lake sinkhole) |
| Military | 50 | 3.15 | 0.46 | 12 | 8 | 0.12 | weave | helmet/chest zones |
| Brute | 85 | 1.85 | 0.64 | 16 | 14 | 0.28 | tank | 4 breakable plates, keepOut |
| Spitter | 34 | 2.45 | 0.46 | 9 | 9 | 0 | creep | |
| Screamer | 28 | 3.5 | 0.40 | 6 | 11 | 0 | scream | sonic shield (sec. 0) |
| Bomber | 34 | 2.8 | 0.78 | 0 | 9 | 0 | bomb | explodes |
| Demon | 130 | 2.5 | 0.66 | 18 | 20 | 0.18 | charge | fireResist 0.8 (superseded by WEAKNESS) |
| Colossus | 520 | 4.0/1.15 | 1.05 | 30 | 120 | 0.32 | boss | |
| Guardian | 420 | 7.0/1.15 | 0.70 | 25 | 150 | 0.30 | boss | fightable; guardian nights only |
| Cave guardian | 999999 | 14 | 0.5 | 999 | 0 | 1 | direct | scripted grab only, never in the horde |

\* The `armor` field is only used for a hit type with no WEAKNESS column ("generic", e.g. the shock beacon); every
fightable kind has a WEAKNESS row (index.html:49615-49647).

Per-body modifiers:
- HP roll x0.85-1.15, minimum 8 (index.html:37359-37363). No per-night HP scaling (**not found**; checked for any
  `hp *=`/`maxHp *=` and `day *` on zombie stats).
- Damage: no per-night scaling (**not found**). Only change: -18% per lost arm (index.html:15157).
- `meleeMult` brute 1.7 / demon 1.5 (index.html:37383) is applied to build damage ("heft", 54265) and in the Hollows
  below-ground fight (52036), **not** to topside hits on the player (54255, 54109, 53512).
- Cave roles (CAVE_ROLES, index.html:35735-35742), applied to anything walking out of that cave from night 2
  (40360): wet speed x0.85, fire resist +0.22; iron speed x0.92, armour +0.10 (off every column); root climbs 1.1 m
  cover; shale speed x1.08, direct -> flank; chalk HP x0.90, headshot x1.35; hill HP x1.08.
- Weakness shares (game/weaknesses.js:4-17; 1 = full damage):

| Type | bullet | pellet | fire | blast | blade | crush | burn |
|---|---|---|---|---|---|---|---|
| brute | 0.45 | 0.45 | 0.9 | 0.9 | 0.45 | 0.9 | 1.0 |
| shambler | 1 | 1 | 1 | 1 | 1.5 | 0.6 | (fire) |
| feral | 1 | 1.4 | 1 | 0.6 | 1 | 1 | |
| leaper | 1.3 | 1 | 1 | 1 | 0.6 | 1 | |
| spider | 0.7 | 1.1 | 1.6 | 0.92 | 0.92 | 0.92 | |
| drowned | 0.96 | 1.3 | 0.1 | 0.96 | 0.96 | 0.96 | |
| military | 0.8 | 0.8 | 0.88 | 0.6 | 0.88 | 0.88 | |
| spitter | 1.3 | 1 | 1 | 1 | 0.6 | 1 | |
| screamer | 1.4 | 0.6 | 1 | 1 | 1 | 1 | |
| bomber | 1 | 1 | 1.5 | 1 | 0.5 | 1 | |
| demon | 1.2 | 0.82 | 0.2 | 0.82 | 0.7 | 0.82 | |
| colossus | 0.5 | 0.68 | 0.68 | 1.3 | 0.68 | 0.68 | |
| guardian | 0.6 | 0.7 | 1.4 | 0.7 | 0.7 | 0.7 | |

  Untagged bullets on a military chest are further x0.5/0.8 (index.html:49629-49630).

### 1b. Effective speed (game/horde.js run under node with PHYS.run = 11.8, index.html:54385)

Walk speed = `speed x ZOMBIE_PACE 1.15` (index.html:35651) x a pace roll, then `speedFor` (horde.js:179-194): x FAST
1.6 capped at 90% of the marine's sprint (10.62), or Jerry's absolute targets for shambler/military/demon
(SPEED_TARGET, horde.js:60-64). Values below are what `speedFor` returns for non-sprinters.

| Type | Walk (min-max, mean) | Ceiling | Sprinter band | Other movement |
|---|---|---|---|---|
| Shambler | 3.9-4.7, 4.3 | 5.0 | 12.27-13.22 | lunge 5.0 for 0.35 s at 1.6-4.2 m, cd 2.2-4.0 s (horde.js:36, 61) |
| Feral | 8.15-10.62, 9.52 | 10.62 | 12.27-13.22 | flank; x1.55 burst 0.55-0.9 s inside 7 m (index.html:53021, 53044) |
| Leaper | 6.80-8.81, 7.81 | 10.62 | none | x0.75 on the ground (leaper-motion.js:2,7) = 5.1-6.6; leap below |
| Spider | 3.45 flat | - | none | no horde profile |
| Drowned | 3.44-5.03, 4.22 | 10.62 | 12.27-13.22 | x0.82 on land, x1.6 base swimming (index.html:53149-53154) |
| Military | 5.0-6.0, 5.5 | 6.0 | 12.27-13.22 | weave; x1.35 rush 0.7 s (53026, 53045); behaviour max 6.2 |
| Brute | 3.20-3.61, 3.40 | 10.62 | none | |
| Spitter | 3.97-5.14, 4.55 | 10.62 | none | x0.25 inside 15 m (index.html:53287) |
| Screamer | 5.02-7.34, 6.15 | 10.62 | 12.27-13.22 | stops 1.2 s to scream |
| Bomber | 4.53-5.87 from horde.js, **but hard-capped at 2.8** | 2.8 | none | BOMBER.maxSpeed 2.8 clamp in advanceBomber (bomber-behavior.js:4,20), applied after the x1.45 "sprint" inside 14 m (index.html:53310, 53551-53552) |
| Demon | 5.6-6.4, 6.0 | 10.62 | none | charge 1.15 s at legacy pace x3.1 (13.4-15.1 per comment, 53205) |
| Colossus | 4.0 | - | none | boss, no pace roll |
| Guardian | 7.0 | - | none | boss, no pace roll |

Sprinter share by night (horde.js:41, 97-100): 3.0% night 1, then a straight line to 19% on night 20 (n5 6.4%, n10
10.6%, n15 14.8%, n20 19.0%). A sprinter runs 1.04-1.12 x the marine's 11.8 sprint whatever its type (horde.js:46,
182-185). Crowd/feral pace types only (shambler, drowned, feral, military, screamer).

Global speed modifiers: Ember Night (blood moon) x1.2 on speed and on the ceiling (index.html:53042, 53071); screamer
war-cry x1.4 for 6 s (53048, 53340) but still held under the ceiling (53071); slows x0.5 (53049); stagger x0.3 for
0.4 s (horde.js:42); muster stalk x0.6 then rush x1.3 (horde.js:34-35).

### 1c. Attacks and abilities

| Type | Attack (damage to player) | Timing / range | Damage to builds | Source |
|---|---|---|---|---|
| Generic melee (shambler, feral, leaper, spitter, screamer) | `damage` field | wind-up 0.22 s, cooldown 0.85 s (vs builds 0.95 s); reach radius+0.42+0.15 m, 1.45 m vertical | `damage` (in the way) or `damage x heft` | index.html:54223-54270, 54078-54110 |
| Leaper leap | round(10 x 1.25) = 13 on landing within 2 m | from 5-14 m away, cd 3.2-4.6 s (first 1.2 s), flight 0.5+0.028 x dist s | - | 53161-53185 |
| Demon charge | round(18 x 1.6) = 29 + knock-back | wind-up 0.6 s, 1.15 s run, 4.5-17 m, cd 5-7.5 s (first 2.5-4.5) | 60 | 53190-53233 |
| Demon fireball | 24 direct | 17-34 m, wind-up 0.85, recovery 0.45, cd 5.5-8.5 (first 2-5); one demon cast per 1.2 s across the field | 20 | zombie-abilities.js:4; zombie-ability-runtime.js:217-218 |
| Colossus thrown stone | 80% of the victim's max HP (80 at 100 HP) | 7-38 m, wind-up 1.65, recovery 0.85, cd 8-12 (first 4-8) | 80 | zombie-abilities.js:5, 140-142; runtime:217-218 |
| Boss slam (colossus and guardian) | 26 within 5.2 m + big shove | wind-up 0.75 s, cd 4.2 s; when player < 3.6 m or 2+ builds within 3.8 m | 65 to every build within 5.4 m; house 24 | index.html:53364-53405 |
| Brute smash | 16 (`damage`) | wind 0.78 s, strike 0.24, cooldown 2.65 s, reach 1.72 m | round(16 x 2.2 x 1.7) = 60, build cooldown 1.8 s | brute-behavior.js:3; index.html:53500-53516, 54265 |
| Military bash | 12 | bash wind 0.42 s; attack cd at least 0.9 s; kicks grenades back within 1.35 m | 12 | military-behavior.js:3; index.html:53518-53532 |
| Drowned grab | 10 on the catch, then drags 1.9 m/s for up to 1.9 s / 3.5 m | wind 0.42 s, cooldown 2.2 s; douses fire within 2 m | 10 | drowned-behavior.js:2; index.html:53536-53548 |
| Spider touch | 8 per strike, 3 strikes in a 1.5 s touch (24) | reach radius+0.42+0.45 | 8 | spider-motion.js:10; index.html:54191-54197 |
| Spider web dart | 3 + webbed 2.2 s (move x0.25) | 4-18 m, cd (2.3+1.5r) x 2 + 0.38 = 4.98-7.98 s; ground webs r 1.1 m last 9 s | - | spider-motion.js:12; spider-web.js:2; index.html:51494 |
| Spitter glob | 9 direct within 1.6 m, then puddle 3 per 0.33 s for 4.2 s within 1.6 m | 4.5-16 m, wind 0.6 s, cd 3.6-5.2 s; also acid trail 4 per 0.4 s while standing in it (trail life 6 s, r 0.65) | puddle 2.2 per tick within 1.7 m | index.html:53285-53304, 51495-51516; zombie-abilities.js:6; runtime:235 |
| Screamer scream | none directly | within 32 m, cd 13-18 s (first 3 s), screams 1.2 s; every zombie within 28 m x1.4 speed for 6 s; calls 3 extra bodies (60% shambler / 40% feral) 13-21 m away while under the 48 cap, else pulls far ones in | - | index.html:53326-53360, 39514 |
| Bomber | blast to player 7 + 23 x (1 - d/4.4), within 4.4 m (max 30) | goes off within 1.9 m of the player, 1.0 m of a build/house, or on death (any cause) | 15 + 70 x (1 - d/3.8) within 3.8 m; house 18 | 53308-53321; 37935-37957 |
| Bomber blast on zombies | 46 centre, 4.5 m, falloff, min 12 | | | 37936, 48219-48257 |

Arm loss -18% damage per arm (15157). Defence seekers: brutes, demons and every 4th other spawn go for turrets within
45 m first and hit builds x1.5 (DEF_BUILD_MUL) (index.html:51652, 51680-51685).

### 1d. Kill payout per type (raw skull value; multipliers in section 6)

shambler 1, feral 4, leaper 6, drowned 6, military 8, spitter 9, bomber 9, spider 10, screamer 11, brute 14, demon 20,
colossus 120, guardian 150 (index.html:35654-35717). Per listed HP: shambler 0.042, drowned 0.15, demon 0.154,
military 0.16, brute 0.165, leaper 0.20, spider 0.227, colossus 0.231, spitter/bomber 0.265, feral 0.267, guardian
0.357, screamer 0.393.

Zombie loot: MedPen drops are switched off (`ZOMBIE_MED_DROPS = false`, index.html:41065; the unused odds table is
41066-41071). Ammo drops from zombies: **not found**.

---

## 2. Waves, nights 1-20

**How these were produced.** a node script (Claude's workspace)
cuts `ZOMBIE_PACE`, `ZOMBIE_TYPES`, `HORDE_MULT`, `NIGHT_TIER`, `HEADLINE_PACKS`, `NIGHT_PLAN` and the functions
`zombiesForDay`, `nightPlanFor`, `nightPaceFor`, `nightPushSizes`, `waveComposition`, `isGuardianNight` out of
index.html byte for byte, runs them in a node vm, then applies `planNight`'s boss insertion (index.html:39077-39088).
Counts are deterministic (only the order within a push is shuffled). Bounty guards, screamer calls, mission calls,
POI guards and the wanderer are extra bodies not in these totals.

Sources: NIGHT_PLAN index.html:37205-37227, NIGHT_TIER 37196-37201, waveComposition 37256-37325, nightPushSizes
37245-37255, boss cadence 39077 (colossus every 5th night) and 38559-38561 (guardian every 6th from 6, replaces the
colossus), Ember Night 39065 (every 4th from 4), alive cap MAX_ZOMBIES = 48 (35640).

Column notes: "Lull" is the breather length; the count in brackets is how many breathers actually happen (test
nights run their early pushes straight on, only the one before the last push breathes: 39093, 40378-40385). A
breather's clock starts only once 5 or fewer are alive (LULL_FIELD 38511) or after 30 s (LULL_MAX_WAIT 38512; 45 s on
test nights, LULL_MAX_SURGE 38513; night 19 caps the whole breather at 5 s). Burst = bodies per burst, gap = seconds
between bursts; inside a burst 0.10-0.22 s per body, +2 bodies per burst in the last push (40255-40270). "Paid" =
raw value x1.5 on Ember nights x0.67 from night 11, before streak, Scavenger and dare multipliers.

| Night | Act | Caves | Total (incl. boss) | Pushes: sizes | Lull s (lulls that actually happen) | Burst / gap s | Boss | Ember x1.5 | Mod | Packs / late | Ground risers | Specialist share | Listed HP total | Raw skull value | Paid (Ember, x0.67 from n11) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | teach | 1 | 15 | 1: 15 | - | 5-9 / 0.5-1.1 | - |  |  |  | 7-8 | 0% | 360 | 15 | 15 |
| 2 | teach | 1 | 50 | 2: 19/31 | 9 (1) | 3-6 / 0.9-1.6 | - |  |  | feral:2 | 0 | 16% | 1128 | 74 | 74 |
| 3 | teach | 1 | 100 | 3: 26/32/42 | 9 (2) | 3-6 / 0.9-1.6 | - |  |  |  | 0 | 24% | 2474 | 200 | 200 |
| 4 | build | 2 | 130 | 3: 34/41/55 | 7 (2) | 6-10 / 0.55-1.1 | - | yes |  | late: brute | 0 | 26% | 3454 | 308 | 462 |
| 5 | build | 1 | 221 | 3: 59/69/93 | 7 (2) | 6-10 / 0.55-1.1 | colossus |  |  |  | 0 | 25% | 6464 | 666 | 666 |
| 6 | build | 1 (chalk) | 214 | 3: 57/67/90 | 7 (2) | 6-10 / 0.55-1.1 | guardian |  |  |  | 0 | 27% | 6246 | 709 | 709 |
| 7 | build (rest) | 1 | 300 | 4: 61/68/75/96 | 12 (3) | 7-11 / 0.5-1 | - |  |  | bomber:1 | 40 | 18% | 7190 | 522 | 522 |
| 8 | build | 2 | 350 | 4: 71/79/89/111 | 7 (3) | 6-10 / 0.55-1.1 | - | yes |  | bomber:1 | 0 | 29% | 9718 | 1008 | 1512 |
| 9 | build | 2 | 390 | 4: 79/88/99/124 | 7 (3) | 6-10 / 0.55-1.1 | - |  |  | feral:8 | 0 | 40% | 9672 | 1122 | 1122 |
| 10 | build | 1 | 431 | 4: 87/97/109/138 | 7 (3) | 6-10 / 0.55-1.1 | colossus |  |  | brute:4 | 0 | 31% | 13398 | 1498 | 1498 |
| 11 | test (rest) | all (surround) | 470 | 5: 77/84/90/98/121 | 12 (1) | 7-11 / 0.5-1 | - |  |  | late: demon | 0 | 24% | 11962 | 1056 | 708 |
| 12 | test | 1 (chalk) | 419 | 4: 85/95/105/134 | 5 (1) | 8-12 / 0.4-0.9 | guardian | yes |  |  | 0 | 36% | 12830 | 1574 | 1582 |
| 13 | test | 2 | 560 | 5: 92/100/108/116/144 | 5 (1) | 8-12 / 0.4-0.9 | - |  |  | spitter:4 | 40 | 35% | 16248 | 1833 | 1228 |
| 14 | test (rest) | 1 | 600 | 5: 98/107/116/125/154 | 12 (1) | 7-11 / 0.5-1 | - |  | fog | drowned:5 | 60 | 28% | 16416 | 1526 | 1022 |
| 15 | test | 2 | 641 | 5: 105/114/124/133/165 | 5 (1) | 8-12 / 0.4-0.9 | colossus |  |  | spider:5, screamer:1 | 40 | 37% | 19254 | 2358 | 1580 |
| 16 | test | 2 | 680 | 5: 111/121/132/142/174 | 5 (1) | 8-12 / 0.4-0.9 | - | yes |  | demon:2 | 50 | 37% | 20770 | 2416 | 2428 |
| 17 | test (rest) | all (surround) | 720 | 6: 99/106/113/120/127/155 | 5 (1) | 10-14 / 0.3-0.6 | - |  | swarm |  | 60 | 29% | 18842 | 1874 | 1256 |
| 18 | test | 1 (chalk) | 632 | 5: 103/112/122/132/163 | 5 (1) | 8-12 / 0.4-0.9 | guardian |  |  | brute:3, bomber:3 | 0 | 40% | 20162 | 2565 | 1719 |
| 19 | test | 3 | 810 | 6: 111/119/127/136/143/174 | 3, whole breather max 5 (1) | 8-12 / 0.4-0.9 | - |  |  |  | 30 | 41% | 25064 | 3096 | 2074 |
| 20 | test | 3 | 851 | 6: 117/125/133/142/151/183 | 5 (1) | 8-12 / 0.4-0.9 | colossus | yes |  | demon:2, bomber:2 | 40 | 47% | 28080 | 3766 | 3785 |

Type mix (exact counts; ground risers are inside the shambler count). First nights: feral 2, leaper and drowned 3,
military and brute 4, spider 5, spitter 6, bomber 7, screamer 8, demon 11.

| Night | shambler | feral | leaper | drowned | military | brute | spider | spitter | screamer | bomber | demon | colossus | guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 15 |  |  |  |  |  |  |  |  |  |  |  |  |
| 2 | 42 | 8 |  |  |  |  |  |  |  |  |  |  |  |
| 3 | 76 | 10 | 6 | 8 |  |  |  |  |  |  |  |  |  |
| 4 | 96 | 12 | 8 | 4 | 8 | 2 |  |  |  |  |  |  |  |
| 5 | 166 | 16 | 10 | 6 | 8 | 4 | 10 |  |  |  |  | 1 |  |
| 6 | 157 | 14 | 10 | 6 | 10 | 4 | 6 | 6 |  |  |  |  | 1 |
| 7 | 246 | 30 | 10 | 10 |  |  |  |  |  | 4 |  |  |  |
| 8 | 247 | 24 | 14 | 8 | 24 | 6 | 8 | 6 | 3 | 10 |  |  |  |
| 9 | 234 | 80 | 30 | 8 | 16 |  | 10 | 4 | 2 | 6 |  |  |  |
| 10 | 296 | 30 | 16 | 10 | 30 | 24 | 10 | 6 | 2 | 6 |  | 1 |  |
| 11 | 358 | 50 | 16 | 10 | 16 |  | 8 | 4 | 2 | 4 | 2 |  |  |
| 12 | 269 | 40 | 20 | 10 | 30 | 10 | 12 | 10 | 3 | 8 | 6 |  | 1 |
| 13 | 364 | 50 | 24 | 12 | 50 | 12 | 14 | 20 | 3 | 8 | 3 |  |  |
| 14 | 432 | 40 | 16 | 70 | 16 | 4 | 10 | 4 | 2 | 4 | 2 |  |  |
| 15 | 404 | 60 | 30 | 12 | 40 | 14 | 50 | 10 | 6 | 10 | 4 | 1 |  |
| 16 | 428 | 70 | 30 | 14 | 60 | 16 | 20 | 12 | 4 | 12 | 14 |  |  |
| 17 | 514 | 90 | 30 | 14 | 20 | 8 | 16 | 6 | 4 | 14 | 4 |  |  |
| 18 | 381 | 60 | 30 | 14 | 50 | 30 | 20 | 14 | 4 | 20 | 8 |  | 1 |
| 19 | 478 | 90 | 40 | 18 | 70 | 30 | 30 | 18 | 6 | 18 | 12 |  |  |
| 20 | 454 | 100 | 50 | 24 | 80 | 36 | 36 | 20 | 8 | 24 | 18 | 1 |  |

Other wave rules:
- Alive cap 48 (index.html:35640). When the field is full, spawning holds until 14 are down or 10 s pass, then a
  clump comes (horde.js:49, 242-244; index.html:40236-40242, 40397-40401). The guardian is promoted to the front of the
  queue when the field is one short of the cap (40278-40289).
- The boss is spliced in at the head of the last push, behind any set-piece pack, a few bodies in (min(6, 10% of the
  push)) (39079-39088).
- Packs: headline packs (bomber, brute, demon) lead their push together from one cave (37204, 37311-37318); other
  packs are spread at 20-80% of the push. `late` kinds all go in the last push. Packs lean late (37271).
- First push gets half its share of specialists ("warms up") (37280-37287).
- Ambush (cave nearest the player) from night 2: 35% roll each 8-18 s (40246-40250).
- Nights past 20: test nights 13-20 repeat, scaled to `zombiesForDay(n) x 10` (index.html:37229-37237, 38515-38523;
  night 21 = 890).
- Night 1: 15 shamblers, 7-8 of them claw up out of the ground (37178-37180); POI guards: 2-3 shamblers before the alarm
  (39044). Siege trick night 18: brutes and soldiers go for walls (38537, 40362). Fog night 14 (visibility 6-32 m,
  FOG_NIGHT index.html:2610). Swarm night 17 = faster pacing only (37223).
- Prep window 120 s (38500). A no-spawn grace of 1 game hour at match start only (2391, 2404-2407).
- Silenced-day quest: the next night is halved, no guardian, no Ember Night (39056-39067, 39247).

---

## 3. Weapons

### 3a. Gun stats (WEAPON_STATS index.html:21054-21078, WEAPON_PRICE 21148, GUN_STOCK_NIGHT game/economy.js:5-8)

`damage` below is only the `hitBase` used to scale the sheet (section 0); it is the real damage only against
non-zombie targets (trees, props, training targets). Range = projectile life `range/speed` (index.html:45558-45561).
Cone/climb/wander are WEAPON_RECOIL (index.html:46711-46718); final cone x0.62 crouched, x1.45 akimbo, +45% when
moving (x2 that term with a heavy barrel), +4.5% per round of heat, x0.8 laser, x0.6 on semi for selector guns
(46743-46751).

| Gun | Price | Buyable from night | Calibre | Interval s (rounds/s) | Mag | Reload s | Base cone / climb / wander (rad) | Own spread | Pellets | Pierce | Bullet speed / range m | `damage` (hitBase) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pistol | 0 (start) | 1 | .45 | 0.28 (3.57); auto sear 0.05 (20/s) | 12 | 1.35 | 0.004/0.007/0.010 | - | - | - | 75 / 40 | 24 |
| Wasp SMG (uzi) | 75 | 2 | 9mm | 1/14 (14) | 32 | 1.40 | 0.011/0.004/0.022 | - | - | - | 80 / 35 | 11 |
| Shotgun | 110 | 2 | 12ga | 0.70 (1.43) | 8 | 0.42 per shell (3.36 empty) | 0/0.012/0.009 | 0.14 | 7 | - | 60 / 22 | 9 |
| Revolver | 145 | 3 | .44 | 0.45 (2.22) | 6 | 1.80 | 0.003/0.011/0.012 | 0.02 | - | 2 | 80 / 50 | 52 |
| GW-4 Carbine (m4) | 180 | 4 | 5.56mm | 0.10 (10) | 30 | 1.55 | 0.004/0.0045/0.016 | - | - | - | 100 / 75 | 19 |
| Chainsaw | 190 | 4 | gas (s) | 0.12 tick (8.33) | 60 s tank | - | reach 3.1 m, arc cos > 0.20, 3 bodies/tick | - | - | - | - | 14 |
| KR-7 Rifle (ak) | 245 | 5 | 7.62mm | 0.11 (9.09) | 30 | 2.00 | 0.009/0.0065/0.025 | 0.016 | - | - | 100 / 70 | 27 |
| Sniper | 320 | 6 | .338 | 0.90 (1.11) | 5 | 2.35 | 0.0015/0.014/0.003 | 0.004 | - | 3 | 130 / 125 | 92 |
| Flamethrower | 340 | 8 | Fuel | 0.08 tick (12.5) | 60 fuel (0.5/tick: 120 ticks, 9.6 s) | 2.40 | - | - | - | - | stream 7.5 m | 4 |
| Launcher (40 mm) | 480 | 9 | 40mm | 0.55 (1.82) | 6 | 0.40 per round (2.4 empty) | 0.007/0.012/0.009 | - | - | - | 32 / 62, contact fuse | 80 (blast) |
| Breacher-12 (aa12) | 650 | 10 | 12ga | 0.19 (5.26) | 20 | 2.60 | 0/0.009/0.018 | 0.17 | 5 | - | 60 / 24 | 7 |
| Rotary gun (minigun) | 850 | 14 | 7.62 belt | 1/15 (15) | 300 | 1.15 | 0.014/0.002/0.025 | - | - | - | 90 / 50; ~0.11 s spin-up | 10 |

Reload sources: shell-by-shell shotgun 0.42 and launcher 0.40 (index.html:44826, 44836); everything else
`WEAPON_STATS.reload` (44814, 44842). x1.25 with an extended mag (21204, 44853), x1.5 akimbo (44783), /(1+0.1 x Hands
rank) (24920), x0.75 on a 10+ streak (37463).

Akimbo (pistol, uzi, revolver; DUAL_PRICE 120/155/185, index.html:20898-20899): fire interval x0.5 (47842), two mags,
spread x2 + 0.028 rad (47866), reload x1.5. Fire selector on m4/ak/aa12 (21086); pistol auto sear $70 (21087-21088).
Pierce falloff x0.85 per extra body (49865). Suppressor damage x0.9 (39653). 20+ streak: 34% of shots free (37464).

### 3b. Hit sheet: percent of listed HP per hit, and body hits to kill

**How produced:** `scratchpad/weapons.mjs` imports `game/hit-balance.js`, `game/economy.js` and the index.html tables.
Cell = percent per hit (whole shell for shotgun/AA-12, one swing, one chainsaw tick, one flamer tick) -> hits to kill
listed HP; in brackets, hits to kill the worst HP roll (x1.15) where different. No headshots, plates on, chest for
military, hit-balance.js:16-30.

| Weapon | shambler | feral | leaper | spider | drowned | military | brute | spitter | screamer | bomber | demon | colossus | guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pistol | 80% → 2 | 100% → 1 (2) | 90% → 2 | 50% → 2 (3) | 50% → 2 (3) | 20% → 5 (6) | 10% → 10 (12) | 60% → 2 | 70% → 2 | 70% → 2 | 20% → 5 (6) | 2% → 50 (58) | 4% → 25 (29) |
| uzi | 45% → 3 | 70% → 2 | 50% → 2 (3) | 15% → 7 (8) | 25% → 4 (5) | 10% → 10 (12) | 5% → 20 (23) | 35% → 3 (4) | 30% → 4 | 30% → 4 | 12% → 9 (10) | 1% → 100 (115) | 2% → 50 (58) |
| shotgun | 270% → 1 | 580% → 1 | 280% → 1 | 150% → 1 | 205% → 1 | 55% → 2 (3) | 30% → 4 | 200% → 1 | 140% → 1 | 220% → 1 | 75% → 2 | 8% → 13 (15) | 10% → 10 (12) |
| revolver | 220% → 1 | 350% → 1 | 250% → 1 | 90% → 2 | 125% → 1 | 50% → 2 (3) | 25% → 4 (5) | 200% → 1 | 170% → 1 | 170% → 1 | 30% → 4 | 5% → 20 (23) | 7% → 15 (17) |
| m4 | 85% → 2 | 120% → 1 | 95% → 2 | 60% → 2 | 60% → 2 | 25% → 4 (5) | 15% → 7 (8) | 70% → 2 | 80% → 2 | 80% → 2 | 25% → 4 (5) | 3% → 34 (39) | 5% → 20 (23) |
| ak | 110% → 1 (2) | 180% → 1 | 120% → 1 | 65% → 2 | 70% → 2 | 28% → 4 (5) | 17% → 6 (7) | 80% → 2 | 90% → 2 | 90% → 2 | 26% → 4 (5) | 4% → 25 (29) | 6% → 17 (20) |
| sniper | 400% → 1 | 600% → 1 | 500% → 1 | 150% → 1 | 200% → 1 | 90% → 2 | 45% → 3 | 350% → 1 | 150% → 1 | 150% → 1 | 50% → 2 (3) | 8% → 13 (15) | 15% → 7 (8) |
| aa12 | 150% → 1 | 330% → 1 | 170% → 1 | 88% → 2 | 115% → 1 | 35% → 3 (4) | 15% → 7 (8) | 102.9% → 1 (2) | 75% → 2 | 102.9% → 1 (2) | 40% → 3 | 4% → 25 (29) | 6% → 17 (20) |
| minigun | 40% → 3 | 70% → 2 | 60% → 2 | 13% → 8 (9) | 30% → 4 | 10% → 10 (12) | 4% → 25 (29) | 35% → 3 (4) | 35% → 3 (4) | 35% → 3 (4) | 6% → 17 (20) | 1% → 100 (115) | 2% → 50 (58) |
| knife | 90.5% → 2 | 173.3% → 1 | 88% → 2 | 45% → 3 | 62.5% → 2 | 36% → 3 (4) | 8.2% → 13 (15) | 47.1% → 3 | 92.9% → 2 | 38.2% → 3 (4) | 7% → 15 (17) | 1% → 100 (115) | 1.5% → 67 (77) |
| machete | 100.3% → 1 (2) | 460% → 1 | 136.7% → 1 | 115.9% → 1 | 165% → 1 | 98% → 2 | 16% → 7 (8) | 120.6% → 1 | 246.4% → 1 | 102.9% → 1 (2) | 14% → 8 (9) | 3.1% → 33 (38) | 4% → 25 (29) |
| chainsaw | 80.5% → 2 | 100% → 1 (2) | 95% → 2 | 22.7% → 5 (6) | 32.5% → 4 | 19.8% → 6 | 4.5% → 23 (26) | 24.7% → 5 | 50% → 2 (3) | 20.6% → 5 (6) | 20% → 5 (6) | 0.6% → 167 (192) | 0.8% → 125 (144) |
| flamer | 16.7% → 6 (7) | 26.7% → 4 (5) | 20% → 5 (6) | 14.5% → 7 (8) | 1% → 100 (115) | 10% → 10 (12) | 4.2% → 24 (28) | 11.8% → 9 (10) | 17% → 6 (7) | 40% → 3 | 0.6% → 167 (192) | 2% → 50 (58) | 3% → 34 (39) |

Screamer column: those percents land in full only during the 2.4 s open window after a scream; otherwise x0.03
(section 0).

### 3c. Sustained output, percent of listed HP per second (single target, body hits, including reload downtime)

`percent / interval x (time firing a magazine / (that + reload))`; melee has no reload; the chainsaw ignores the heat
stall (8 s in a body then a stall until cooled, SAW_HEAT_BITE 1/8, SAW_COOL 1/3, restart at 0.45, index.html:21218)
and its 3 bodies per tick.

| Weapon | shambler | feral | leaper | spider | drowned | military | brute | spitter | screamer | bomber | demon | colossus | guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pistol | 204 | 255 | 229 | 127 | 127 | 51 | 25 | 153 | 178 | 178 | 51 | 5 | 10 |
| uzi | 391 | 608 | 434 | 130 | 217 | 87 | 43 | 304 | 260 | 260 | 104 | 9 | 17 |
| shotgun | 241 | 518 | 250 | 134 | 183 | 49 | 27 | 179 | 125 | 196 | 67 | 7 | 9 |
| revolver | 293 | 467 | 333 | 120 | 167 | 67 | 33 | 267 | 227 | 227 | 40 | 7 | 9 |
| m4 | 560 | 791 | 626 | 396 | 396 | 165 | 99 | 462 | 527 | 527 | 165 | 20 | 33 |
| ak | 623 | 1019 | 679 | 368 | 396 | 158 | 96 | 453 | 509 | 509 | 147 | 23 | 34 |
| sniper | 292 | 438 | 365 | 109 | 146 | 66 | 33 | 255 | 109 | 109 | 36 | 6 | 11 |
| aa12 | 469 | 1031 | 531 | 275 | 359 | 109 | 47 | 322 | 234 | 322 | 125 | 12 | 19 |
| minigun | 567 | 993 | 851 | 184 | 426 | 142 | 57 | 496 | 496 | 496 | 85 | 14 | 28 |
| knife | 165 | 315 | 160 | 82 | 114 | 65 | 15 | 86 | 169 | 69 | 13 | 2 | 3 |
| machete | 201 | 920 | 273 | 232 | 330 | 196 | 32 | 241 | 493 | 206 | 28 | 6 | 8 |
| chainsaw | 671 | 833 | 792 | 189 | 271 | 165 | 38 | 206 | 417 | 172 | 167 | 5 | 7 |
| flamer | 167 | 267 | 200 | 145 | 10 | 100 | 42 | 118 | 170 | 400 | 6 | 20 | 30 |

### 3d. Ammo cost per kill (body hits x price per round from AMMO_PACK; magazine guns are sold by the magazine, which
rounds the price up slightly, see 4)

| Weapon | shambler | feral | leaper | spider | drowned | military | brute | spitter | screamer | bomber | demon | colossus | guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pistol | $0.44 | $0.22 | $0.44 | $0.44 | $0.44 | $1.11 | $2.22 | $0.44 | $0.44 | $0.44 | $1.11 | $11.11 | $5.56 |
| uzi | $0.70 | $0.47 | $0.47 | $1.63 | $0.93 | $2.33 | $4.67 | $0.70 | $0.93 | $0.93 | $2.10 | $23.33 | $11.67 |
| shotgun | $1 | $1 | $1 | $1 | $1 | $2 | $4 | $1 | $1 | $1 | $2 | $13 | $10 |
| revolver | $1.25 | $1.25 | $1.25 | $2.50 | $1.25 | $2.50 | $5 | $1.25 | $1.25 | $1.25 | $5 | $25 | $18.75 |
| m4 | $0.67 | $0.33 | $0.67 | $0.67 | $0.67 | $1.33 | $2.33 | $0.67 | $0.67 | $0.67 | $1.33 | $11.33 | $6.67 |
| ak | $0.40 | $0.40 | $0.40 | $0.80 | $0.80 | $1.60 | $2.40 | $0.80 | $0.80 | $0.80 | $1.60 | $10 | $6.80 |
| sniper | $2.80 | $2.80 | $2.80 | $2.80 | $2.80 | $5.60 | $8.40 | $2.80 | $2.80 | $2.80 | $5.60 | $36.40 | $19.60 |
| aa12 | $1 | $1 | $1 | $2 | $1 | $3 | $7 | $1 | $2 | $1 | $3 | $25 | $17 |
| minigun | $0.48 | $0.32 | $0.32 | $1.28 | $0.64 | $1.60 | $4 | $0.48 | $0.48 | $0.48 | $2.72 | $16 | $8 |
| flamer | $1.20 | $0.80 | $1.00 | $1.40 | $20 | $2 | $4.80 | $1.80 | $1.20 | $0.60 | $33.40 | $10 | $6.80 |

Compare with the skull values in 1d: a shambler pays $1 (x0.67 = $0.67 from night 11); revolver, sniper, shotgun, AA-12
and flamer ammo cost as much or more than a shambler kill pays.

### 3e. Melee

| Blade | Price | Damage path | Reach / arc | Cooldown | Max bodies | Source |
|---|---|---|---|---|---|---|
| Knife | start | sheet row `knife` | 2.4 m, cos > 0.40 (~66 deg) | 0.55 s | 2 | BLADE_STATS index.html:20768 |
| Machete | $85 (MACHETE_PRICE 20752) | sheet row `machete` | 2.45 m, cos > 0.69 (~46 deg) | 0.50 s | 3 | 20769 |
| Red katana | relay vault on night 20 only (relay-vault.js:43) | **not on the sheet**: 240 x blade share x MELEE_SIZE_MUL | 3.3 m, half circle | 0.34 s | unlimited | 20773 |
| Chainsaw | $190, night 4 | sheet row `chainsaw` per 0.12 s tick | 3.1 m, cos > 0.20 | tick 0.12 s | 3 nearest | 21077, 46822-46850 |

MELEE_SIZE_MUL (military 0.8, spider 0.8, brute 0.6, demon 0.5, colossus 0.35, guardian 0.35, index.html:21221) is
multiplied into the swing, but the sheet path replaces the amount with `hitScale = dmgMult()` (index.html:46844, 48464,
49651), so it only has an effect on the katana. Chainsaw gas: 60 s tank (SAW_FUEL_BASE 21211), burns 1 s/s plus 1.5 s/s
more while cutting (24 s of cutting a tank), $18 per 45 s (AMMO_PACK.chainsaw), bigger tank +50% $85 (21212).

### 3f. Flamethrower extras

Each particle hits a zombie at most once per 0.08 s with the `flamer` sheet cell and ignites it for 2.4 s
(index.html:47057-47067). Burning: 8 HP/s x the burn share (WEAKNESS burn, else fire; drowned floor 0.1), x0.03 on a
shielded screamer (53633-53636); rain shortens burns by up to x2.8 (RAIN_BURN_MUL 1.8, 46886). Ground fires last 6.5 s
(46883). Fuel 60 a tank, 0.5 per tick.

### 3g. Explosives, emplaced and untagged weapons (weakness-table path)

Blast falloff is linear from the centre to 0 at the radius, at least 12 per zombie inside it (index.html:48219-48257).
Your own blasts hurt you: max(6, base x 0.55 x (1 - d/radius)) (48225).

| Source | Damage | Radius / range | Rate | Cost | Notes and source |
|---|---|---|---|---|---|
| Hand grenade | 55 x Power skill | 4.5 m x (1 + 0.08 x Grenadier) | thrown (hold G up to 3 s) | $12 each (25427); start with 3, max 5 (+1/Grenadier rank) | +1 every even dawn, every dawn with Grenadier (39050); 48220-48221 |
| 40 mm launcher round | 80 (no Power skill) | 4.5 m | 0.55 s, 6 rounds | $44 per 6 = $7.33/round | 46768-46809 |
| Mortar shell | 120 x tier blast 1/1.25/1.5 (radius scales too) | 5-48 m | 2.4 s x tier 1/0.8/0.65 | $34 per 4 = $8.50; first mortar placed with 0 shells gives 8 | 34195, 34606-34633, 33908, 33200 |
| Watchman M240 | 18 per round x Power skill, bullet | speed 110, life 0.35 s (~38 m) | 0.09 s (11.1 rounds/s), spread 0.012 | 7.62 belt $48 per 300 ($0.16); belt holds 1000, comes with 500; feed 3.2 s | must be manned; 34583-34605, game/watchman-mg.js:5, 33905 |
| Fuel drum (placed/map) | 70 (napalm drum radius x1.2 + burning pool) | 4.5 m | once | place $18 | 6480 |
| Land mine | 85 / 110 / 150 by tier, blast x1/1.3/1.3 | 4.5 m | once, 0.3 s fuse | place $14 | 33203, 51180-51195 |
| Spike trap | 160 / 160 / 200 (blade) | its cell | 1 / 3 / unlimited uses, re-arm -/20/10 s | place $12 | 33202, 30605-30628 |
| Barbed wire bite | 7 / 12 / 18 to the zombie tearing it (razor also slows 1.2 s) | - | per hit it takes | place $9 | 33194, 54088-54097 |
| Shock beacon (lure Mk III) | 15 generic every 2 s within 2.2 m | - | - | | 51205-51216 |
| Bomber blast | 46 to zombies | 4.5 m | | | 37936 |

Hits to kill at the centre (listed HP; turret/M240 bullets on a military chest; brute plates on):

| Source | shambler | feral | leaper | spider | drowned | military | brute | spitter | screamer* | bomber | demon | colossus | guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| launcher | 80/1 | 48/1 | 80/1 | 73.6/1 | 76.8/1 | 48/2 | 72/2 | 80/1 | 80/1 | 80/1 | 65.6/2 | 104/5 | 56/8 |
| hand grenade | 55/1 | 33/1 | 55/1 | 50.6/1 | 52.8/1 | 33/2 | 49.5/2 | 55/1 | 55/1 | 55/1 | 45.1/3 | 71.5/8 | 38.5/11 |
| mortar Mk I | 120/1 | 72/1 | 120/1 | 110.4/1 | 115.2/1 | 72/1 | 108/1 | 120/1 | 120/1 | 120/1 | 98.4/2 | 156/4 | 84/5 |
| fuel drum | 70/1 | 42/1 | 70/1 | 64.4/1 | 67.2/1 | 42/2 | 63/2 | 70/1 | 70/1 | 70/1 | 57.4/3 | 91/6 | 49/9 |
| mine Mk I | 85/1 | 51/1 | 85/1 | 78.2/1 | 81.6/1 | 51/1 | 76.5/2 | 85/1 | 85/1 | 85/1 | 69.7/2 | 110.5/5 | 59.5/8 |
| M240 round | 18/2 | 18/1 | 23.4/2 | 12.6/4 | 17.3/3 | 9/6 | 8.1/11 | 23.4/2 | 25.2/2 | 18/2 | 21.6/7 | 9/58 | 10.8/39 |
| light turret Mk I | 8/3 | 8/2 | 10.4/3 | 5.6/8 | 7.7/6 | 4/13 | 3.6/24 | 10.4/4 | 11.2/3 | 8/5 | 9.6/14 | 4/130 | 4.8/88 |
| light turret Mk III | 16/2 | 16/1 | 20.8/2 | 11.2/4 | 15.4/3 | 8/7 | 7.2/12 | 20.8/2 | 22.4/2 | 16/3 | 19.2/7 | 8/65 | 9.6/44 |
| heavy turret Mk I | 22/2 | 22/1 | 28.6/2 | 15.4/3 | 21.1/2 | 11/5 | 9.9/9 | 28.6/2 | 30.8/1 | 22/2 | 26.4/5 | 11/48 | 13.2/32 |
| heavy turret Mk III | 44/1 | 44/1 | 57.2/1 | 30.8/2 | 42.2/1 | 22/3 | 19.8/5 | 57.2/1 | 61.6/1 | 44/1 | 52.8/3 | 22/24 | 26.4/16 |
| flame turret Mk I tick | 5/5 | 5/3 | 5/6 | 8/6 | 0.5/80 | 4.4/12 | 4.5/19 | 5/7 | 5/6 | 7.5/5 | 1/130 | 3.4/153 | 7/60 |
| spike trap Mk I | 240/1 | 160/1 | 96/1 | 147.2/1 | 153.6/1 | 140.8/1 | 72/2 | 96/1 | 160/1 | 80/1 | 112/2 | 108.8/5 | 112/4 |
| katana swing | 360/1 | 240/1 | 144/1 | 176.6/1 | 230.4/1 | 169/1 | 64.8/2 | 144/1 | 240/1 | 120/1 | 84/2 | 57.1/10 | 58.8/8 |

\* screamer: x0.03 outside its open window. (Produced by `scratchpad/untagged.mjs` from WEAKNESS and MELEE_SIZE_MUL.)

---

## 4. Ammo

AMMO_PACK index.html:21183-21188; RESERVE_CAP_BASE 21190-21193; caps x1.4 (SPARE_CAP_MULT 21197-21198); extended mag
x1.5 on size and cap (21235-21250, 21766-21768); a magazine costs ceil(pack cost x mag size / pack size)
(`magazinePrice` 25377-25380); spare magazines = floor(cap / mag size) (21767).

| Calibre | Pack | Pack price | $/round | Cap (base -> live) | Feeds | Spare mags (std / ext) | Mag price (std / ext) | Full refill of spares |
|---|---|---|---|---|---|---|---|---|
| .45 | 36 | 8 | 0.222 | 120 -> 168 | pistol | 14 / 14 | 3 / 4 | 42 / 56 |
| 9mm | 60 | 14 | 0.233 | 220 -> 308 | uzi | 9 / 9 | 8 / 12 | 72 / 108 |
| 5.56mm | 60 | 20 | 0.333 | 180 -> 252 | m4 | 8 / 8 | 10 / 15 | 80 / 120 |
| 7.62mm | 60 | 24 | 0.40 | 180 -> 252 | ak | 8 / 8 | 12 / 18 | 96 / 144 |
| .44 | 12 | 15 | 1.25 | 36 -> 50 | revolver (no ext mag) | 8 | 8 (=$1.33/round) | 64 |
| .338 | 10 | 28 | 2.80 | 30 -> 42 | sniper | 8 / 7 | 14 / 23 | 112 / 161 |
| 12ga | 20 | 20 | 1.00 | 110 -> 154 | shotgun (loose), aa12 (drums) | aa12 7 / 7 | 20 / 30 | 140 / 210 |
| 40mm | 6 | 44 | 7.33 | 18 -> 25 | launcher (loose) | - | - | - |
| 7.62 belt | 300 | 48 | 0.16 | 900 -> 1260 | minigun (boxes), Watchman (loose) | minigun 4 / 4 | 48 / 72 | 192 / 288 |
| Fuel | 60 | 24 | 0.40 (0.20 per tick) | 240 -> 336 | flamer | 5 / 5 | 24 / 36 | 120 / 180 |
| 60mm | 4 | 34 | 8.50 | 16 -> 22 | mortar (loose) | - | - | - |
| Chainsaw gas | 45 s | 18 | - | 60 s tank (90 with $85 tank) | chainsaw | - | - | - |

- A bought gun arrives loaded with its spare reserve full (buyWeapon index.html:25355-25374), so the gun price
  includes a full load.
- Starting ammo: pistol 12 loaded + 50 spare .45 (START_RESERVE_45 = round(36 x 1.4), 21199; issued 22066): four full
  magazines and one of 2 rounds. Everything else 0 (21224).
- Drops from zombies: **not found**. Ammo comes from the kiosk, crates and caches:
  - Random supply crate, one per night until the relay is repaired, 40-180 s into the wave (40408, 40510): 2 magazines
    per owned magazine gun, 2 packs per owned loose calibre, +45 s gas, 1-2 MedPens (40593-40611).
  - With the relay up: the day's radio call crate (ammo / medical = 2 MedPens + 2 grenades / hardware = cheapest
    unowned turret blueprint, 40614-40640, 40645) and from night 3 one breather crate a night (ammo + 1 MedPen, 40698).
  - Objective caches (game/objectives.js): medical convoy 2 MedPens, hikers 1 MedPen, trapper 1 grenade, others an
    ammo pack of your choice (lines 12-16, 69-77); restocks from night 2 (105-119).

---

## 5. Player

| Item | Value | Source |
|---|---|---|
| Max HP | 100; +15 per Vitality rank (5 ranks, 175 max); a rank-up also heals 15 | index.html:40845, 24873-24876; game/skills.js:4 |
| Vitality XP | 2 per dawn survived, 1 per "comeback" (under 25% to over 50% within 30 s); ranks at 6/14/24/36/50 XP (so about +15 HP after dawn 3, 7, 12, 18) | 39023, 24910-24913 |
| Natural regen | 2.2 HP/s after 5 s unhurt, only up to 40% of max | 21137-21139, 40997-41003 |
| MedPen | $35, carry 3, heals 60% of max on the jab (0.8 s); a pickup with full pockets heals 50% | 21135-21136, 20933-20943, 41056 |
| Streak heal | from the 5th kill of a streak +1 HP per own kill (+2 from 20th), up to 70% of max | 37466-37481 |
| Okafor (rescued survivor) | full heal once per day at the roof | 40070, 40078-40086 |
| Armor | helmet +25 ($70), plate carrier +50 ($120), pads +15 ($50); max 90 | GEAR 21976-21983 |
| Armor soak | 65% of each hit while any armor is left | ARMOR_ABSORB 22037, damagePlayer 40929-40935 |
| Armor repair | $0.5 per point, min $5; Pike survivor x0.75 is on build repair, not armor | 22038-22040 |
| Armor refill | refilled to full free at every dawn | 39033 |
| Other gear | NVG $130 (needs helmet), laser $60 (cone x0.8), gun flashlight $45 | 21980-21982, 46729 |
| 30+ streak | -25% to every hit before armor | 37465, 40928 |
| Dodge dive | zombie melee misses while in the dive's flight | 40923 |
| Movement | walk 7.4, sprint 11.8, crouch 2.2; Fleet foot +5%/rank (max x1.30); 5+ streak x1.1 | PHYS 54383-54386, 24921-24925, 37462 |
| Death | HP <= 0 ends the run (`endGame(false, 'You were overrun…')`); revive **not found** | 40978-40983 |
| Start | $40, pistol + knife, 3 grenades, 0 MedPens, no armor; barricade, shovel and upgrade tool unlocked | 55615-55616, 21129, 55823, 29848 |

Skills (game/skills.js:3-10; effects index.html:24919-24925, 25042, 25050-25051): Power +8% damage/rank (XP: headshot
kills and one-shot kills; 60/180/400/750/1200), Hands reload /(1+0.1 rank) (10/30/60/100/150), Fleet foot +5% speed
(20/60/130/230/360), Scavenger +6% skull value (1 XP per 10 skulls banked; 15/45/100/180/280), Grenadier +1 grenade cap,
+8% radius, a grenade every dawn (5/15/35/60/90). Skills cannot be bought.

---

## 6. Economy

### 6a. Kill payout

`skull value = cashDrop x streak x Scavenger x late trim x night pay` (index.html:38410-38413):
- Streak (COMBO_WINDOW 2.6 s, 37455-37461): x1.25 at 5, x1.5 at 10, x2 at 20, x2.5 at 30. Turret, mine, trap and wire
  kills get no streak multiplier (38408).
- Scavenger: x(1 + 0.06 x rank) (25042).
- Late trim: x0.67 from night 11 (LATE_CASH_NIGHT/FACTOR, 25047-25048).
- Night pay: Ember Night x1.5; Lights-out dare (radio "blackout" card) x1.25; both together capped at x1.75
  (38893-38897).
- Fractions carry between kills (game/economy.js:44-61).

### 6b. Skulls to cash

- A kill drops a skull of its value; under $8 is pooled until $8 is reached (CASH_DROP_MIN 24622, awardCash
  24637-24641); night 1 drops every skull and they don't expire (24634).
- Skulls last 45 s on the ground; from night 2 one under 100 within 4 m zips to you (24617, 24777-24780); at the end of
  each night the loose skulls fly to you (37642).
- Skulls in the bag are worth nothing until turned in at the HQ window: 3.4 s processing, then the value goes to Cash
  (HQ_PROCESS_S 28879, 28842-28852).

### 6c. Other income (all are skull value or items; none is a flat "night survived" payment: **not found**)

| Source | Value | Source line |
|---|---|---|
| Starting cash | $40 | 55615 |
| Bounty posts (prep, from night 2) | one skull worth 25 (nights 2-3), 60 (4-7), 150 (8-13), 300 (14+); 1 post nights 2-7, 2 posts from 8; guards 3-4 / 4-5 / 5-6 + brute / 6-8 + brute or demon shamblers (their kills pay too) | 39679-39690 |
| Wanderer colossus (odd nights from 7, not colossus or guardian nights) | max(150, bounty) + its 120 skulls | 40125-40127 |
| Guardian first kill (planned guardian, once a run) | mortar blueprint ($120 value), or 80 skulls if owned | game/economy.js:63-103 (80 at line 87); index.html:38425-38447 |
| Relay vault (once a run) | a random unowned item from the day's tier; cash only if nothing is left: 120 (day 1-3), 200 (4-7), 320 (8-11), 480 (12-15), 700 (16-19); day 20 = red katana | game/relay-vault.js:32-44, 55-75 |
| Scrap a build | 60% of what was spent x its HP fraction | 35583-35590 |
| Field Intel | costs $120 (or the radio "intel" card) | 25060, 28886 |

Upper-bound income curve (all wave kills banked, no streak/Scavenger, all bounties taken, no spending; produced from
the section 2 run):

| Night | Kill pay (paid) | Bounties (all posts) | Cash available at this night's prep | Guns arriving this night |
|---|---|---|---|---|
| 1 | 15 | 0 | 40 | pistol |
| 2 | 74 | 25 | 55 | uzi $75, shotgun $110 |
| 3 | 200 | 25 | 154 | revolver $145 |
| 4 | 462 | 60 | 379 | m4 $180, chainsaw $190 |
| 5 | 666 | 60 | 901 | ak $245 |
| 6 | 709 | 60 | 1627 | sniper $320 |
| 7 | 522 | 60 | 2396 | |
| 8 | 1512 | 300 | 2978 | flamer $340 |
| 9 | 1122 | 300 | 4790 | launcher $480 |
| 10 | 1498 | 300 | 6212 | aa12 $650 |
| 11 | 708 | 300 | 8010 | |
| 12 | 1582 | 300 | 9018 | |
| 13 | 1228 | 300 | 10900 | |
| 14 | 1022 | 600 | 12428 | minigun $850 |
| 15 | 1580 | 600 | 14050 | |
| 16 | 2428 | 600 | 16230 | |
| 17 | 1256 | 600 | 19258 | |
| 18 | 1719 | 600 | 21114 | |
| 19 | 2074 | 600 | 23433 | |
| 20 | 3785 | 600 | 26107 | |

### 6d. Shop prices (no night markup: `equipmentPrice` returns the base price, game/economy.js:13-22)

- Guns: WEAPON_PRICE above (index.html:21148).
- Extended mag / bigger tank (+50% size and reserve cap, reload x1.25): pistol 45, uzi 70, shotgun 80, m4 95, ak 100,
  aa12 130, sniper 90, minigun 140, flamer 90; none for revolver or launcher (21208).
- Heavy barrel (half the climb, 0.45 s draw, double move spread): uzi 70, m4 95, ak 100, minigun 140 (21203).
- Suppressor (x0.9 damage, quieter): pistol 40, uzi 60, shotgun 75, m4 85, ak 90, sniper 95 (21210, 39653).
- Akimbo pair: pistol 120, uzi 155, revolver 185 (20899). Pistol auto sear 70 (21087). Saw tank 85 (21212). Machete 85
  (20752).
- Consumables: MedPen 35 (21136), hand grenade 12 (25427), ammo as section 4.
- Gear: helmet 70, vest 120, pads 50, NVG 130, laser 60, flashlight 45 (21976-21983). Armor repair 0.5/point (22038).
- Build blueprints and placement: section 7.
- Field Intel 120 (25060).

### 6e. Unlocks per night

Guns only (GUN_STOCK_NIGHT, game/economy.js:5-8): pistol 1, uzi 2, shotgun 2, revolver 3, m4 4, chainsaw 4, ak 5,
sniper 6, flamer 8, launcher 9, aa12 10, minigun 14. Gear, mods, blueprints and upgrades have no night gate (**not
found**; they are price-gated only, apart from each tier needing the one before it). Laser colours open on nights
1/4/7/10/13/16/18 (cosmetic, game/laser-colors.js:3-11).

---

## 7. Buildables and turrets

COST (placement) index.html:29672; BUILD_UNLOCK_PRICE (blueprint) 29828; BUILD_STATS (HP, turret stats) 31947-31965;
UPGRADE_TRACKS 33180-33205; TURRET_TIER 33208. None has a night gate. Barricade, shovel and the upgrade tool start
unlocked (29848).

| Build | Blueprint | Place | HP (tier 0) | Tier HP | Upgrade blueprints (tier 1, 2, ...) | Upgrade cost per piece | Notes |
|---|---|---|---|---|---|---|---|
| Barricade | free | 8 | 40 | 40/90/170 | 100, 220 | 16, 28 | Mk II knocks attackers back |
| Wall | 25 | 14 | 130 | 130/210/330/480/680 | 140, 300, 520, 800 | 22, 40, 60, 85 | window -30 HP, door -45 HP |
| Window | 45 | 10 | (cuts wall) | mesh: 160 bp, 18 per piece | | | ground windows let small zombies climb in |
| Door | 55 | 14 | (cuts wall) | +45/100/170/260 on its wall | 110, 240, 400, 620 | 16, 28, 42, 60 | |
| Gate | 60 | 16 | 70 | 70/150/260 | 220, 500 | 28, 55 | |
| Sandbag | 20 | 10 | 90 | 90/160/260 | 110, 240 | 18, 32 | adds 25/40/60 HP to what it stands on |
| Platform | 60 | 22 | 70 | 70/140/230 | 180, 400 | 35, 60 | tier 2 "Gun emplacement": a turret on it fires 10% faster (51090-51094); +15 HP to support |
| Floor | 70 | 26 | 85 | 85/170/290 | 240, 560 | 30, 60 | +20 HP to support |
| Pillar | 50 | 20 | 110 | 110/200/320 | 200, 450 | 35, 65 | |
| Stairs | 65 | 30 | 60 | 60/120/180 | 160, 420 | 40, 70 | |
| Barbed wire | 35 | 9 | 22 | 22/40/60 | 120, 280 | 16, 30 | bites 7/12/18 (razor slows) |
| Railing | 40 | 12 | 30 | 30/60/110 | 100, 230 | 20, 36 | Mk III blocks acid/silk |
| Spike trap | 30 | 12 | 70 | 70/110/160 | 220, 500 | 25, 45 | 160/160/200 dmg, uses 1/3/unlimited |
| Fuel drum | 40 | 18 | landmark 14 | napalm 240 bp, 30 per piece | | | 70 blast |
| Land mine | 45 | 14 | 20 | 20/24/30 | 200, 460 | 20, 36 | 85/110/150 dmg |
| Decoy beacon (lure) | 70 | 30 | 25 | 25/40/60 | 180, 420 | 35, 60 | lasts 20/35/45 s, pull 40/60/60 m; Mk III shock 15 per 2 s |
| Light turret | 55 | 24 | 30 | x1/1.8/2.8 | 260, 600 | 45, 90 | 8 dmg, 0.28 s, 11 m |
| Flame turret | 75 | 36 | 34 | x1/1.8/2.8 | 300, 680 | 55, 110 | 5 fire dmg to every zombie in a +-0.5 rad cone, 0.25 s, 7.5 m, ignites 1.3 s |
| Heavy turret | 110 | 45 | 55 | x1/1.8/2.8 | 380, 850 | 70, 140 | 22 dmg, 0.70 s, 14 m |
| Mortar | 120 (or guardian reward) | 60 | 80 | 80/150/240 | 400, 900 | 90, 160 | blast x1/1.25/1.5, reload x1/0.8/0.65; manned |
| Watchman MG (m240) | 140 | 80 | 120 | - | - | - | manned; 18/round, 11.1 rounds/s |

Turret tiers (TURRET_TIER 33208): damage x1/1.45/2.0, range x1/1.15/1.3, interval x1/0.85/0.7, HP x1/1.8/2.8.
Turret DPS on a full-share target, tier 0: light 28.6, flame 20 per target in the cone (+ burn 8/s), heavy 31.4;
Watchman 200 (x Power). Turret rounds are untagged bullets (weakness table; 51322) and need a clear line (CU-116,
51128-51160). Firing draws the target and its pack to the turret for 8 s (51652).

Repair: ceil(missing HP x 0.12 x 0.75 with Pike on the roof) (31710-31712, 39934). Scrap refund: 60% of spend x HP
fraction (35583-35590). Damage taken by builds: see 1c (zombie melee in the way = `damage`; out of reach = `damage x
heft`, heft = 2.2 brute x 5 boss x meleeMult: brute 60, demon 27, colossus 150, guardian 125; x1.5 when defence-minded;
index.html:54255-54268, 54098, 51652).

Roof survivors (index.html:39937-39941): Brandt 14 dmg x4-round bursts every 1.4 s (~30 dps), Okafor and Pike 19 dmg
every 0.9 s, within 26 m.

---

## 8. Everything else that scales with the night

| What | How it scales | Source |
|---|---|---|
| Night plan | totals, mix, caves, pushes, packs, lulls per night (section 2) | index.html:37196-37227 |
| Past night 20 | test nights 13-20 repeat at zombiesForDay(n) x 10 | 37229-37237, 38515-38523 |
| Sprinter share | 3% night 1 -> 19% night 20 | game/horde.js:41, 97-100 |
| Ember Night (4, 8, 12, 16, 20) | zombie speed and ceiling x1.2, kill pay x1.5 | 39065, 53042, 53071, 38895 |
| Colossus / guardian | colossus every 5th night; guardian every 6th from 6 (chalk cave only, replaces the colossus) | 39077, 38559-38561 |
| Late pay trim | kill skulls x0.67 from night 11 | 25047-25048 |
| Gun stock | GUN_STOCK_NIGHT | game/economy.js:5-8 |
| Bounties | reward 25/60/150/300 from nights 2/4/8/14; posts 1 then 2 from 8; guard size and a brute (8-13) or brute/demon (14+) | 39679-39690 |
| Wanderer colossus | odd nights from 7, not %5, not guardian nights | 40125-40126 |
| Grenades | +1 at every even dawn | 39050 |
| Skull handling | night 1: no pooling, no expiry; zip from night 2 | 24634, 24777 |
| Cave roles | not on night 1 | 40360 |
| Ambush | from night 2 | 40247 |
| Breather crate | from night 3 (relay up) | 40698 |
| Player max HP | +15 per Vitality rank, 2 XP per dawn | 39023, 24875 |
| Relay repair (day mission) | boot 20 s + 3.5 s/day (86.5 s on 20); first call 3 + day bodies, then one every max(2, 6 - 0.22 x (day-1)) s, cap min(48, ...): 7 on day 1, 25 on day 10, 48 from day 17; mix from the next night's plan | game/relay-puzzle.js:25-56 |
| Truck mission | calls 6 bodies on day 1 rising to 10 on day 20 | game/truck-mission.js:14-15, 52 |
| Convoy mission | each pump/slip calls 1 body (x2 from night 6, x3 from 15) | index.html:26920-26925 |
| Relay vault tier | by the day opened (1/4/8/12/16/20) | game/relay-vault.js:32-44 |
| Extra spawns' type | pickZombieType draws from that night's plan weights | index.html:37330-37344 |
| Zombie HP / damage | no night scaling (**not found**) | |

---

## 9. Observations

1. **Screamers are close to unkillable outside a short window.** A shielded screamer takes 3% of every hit
   (SCREAMER.damageShare, screamer-behavior.js:3; index.html:49669-49678), which makes its 28 HP behave like ~933. The
   shield drops for 2.4 s after each scream, and it screams every 13-18 s within 32 m. That is roughly 13-18% of the
   time. It pays 11 skulls, so most of its HIT_PERCENT cells (pistol 70%, sniper 150%) only count during that window.
   Each scream also adds up to 3 extra bodies that are not in the night's total.
2. **Night 11's kill income drops by more than half.** Kill pay goes from 1,498 on night 10 to 708 on night 11 (-53%),
   while bodies go up from 431 to 470. The cause is the x0.67 trim from night 11 (index.html:25047). Later nights swing
   with Ember Night: 1,582 on night 12, 1,022 on 14, 2,428 on 16, 1,256 on 17, 3,785 on 20.
3. **Shamblers pay far less per HP than any other type.** A shambler is 1 skull for 24 HP (0.042 per HP). Every other
   kind pays 0.15-0.39 per HP. Shamblers are 53-100% of each night's bodies, so night 1 pays $15 in total and night 2
   pays $74. With the revolver, sniper, shotgun, AA-12 or flamer, the ammo for one shambler kill costs as much as or
   more than the kill pays (section 3d).
4. **The two most expensive guns are not better than the night-4/5 rifles.** Sustained % of listed HP per second,
   taken from 3c:
   - **Minigun** ($850, night 14) against the **M4** ($180, night 4): shambler 567 vs 560, military 142 vs 165, brute
     57 vs 99, demon 85 vs 165.
   - **AA-12** ($650, night 10) against the **AK** ($245, night 5): shambler 469 vs 623, brute 47 vs 96, guardian 19
     vs 34.

   The minigun's cells are lower than the uzi's ($75) against spider (13 vs 15), brute (4 vs 5) and demon (6 vs 12).
5. **"100%" in the sheet is not a one-hit kill.** The sheet removes a share of the *listed* HP, but each body spawns
   with round(listed x U(0.85-1.15)) HP (index.html:37359-37363). With that rounding, the share of bodies that need a
   second body hit is:
   - pistol or chainsaw vs feral (100%): about 39%;
   - machete vs shambler (100.3%): about 43%;
   - AA-12 or machete vs bomber or spitter (102.9%): about 45%;
   - AK vs shambler (110%): about 15%.

   A hill cave's x1.08 HP makes this worse.
6. **MELEE_SIZE_MUL only affects the katana.** It is multiplied into the swing, but the sheet path then uses `hitScale`
   in place of the amount (index.html:46844, 48464, 49651). So the knife, machete and chainsaw are not cut against
   big kinds, although the GB-52 comment at 20763 says they are. The katana is off the sheet. It does 240 x share x
   size at 0.34 s with no body limit: one swing kills every non-boss kind except the brute and the demon (2 swings
   each); a colossus takes 10 and a guardian 8. It is the
   day-20 vault reward.
7. **The Watchman MG far out-damages every turret, at a similar price.** It does 18 dmg x 11.1 rounds/s = ~200 dmg/s
   (x Power). That is about 7x a light turret (28.6/s) and 6.4x a heavy turret (31.4/s, both tier 0), for a blueprint
   of $140 + $80. It needs to be manned. It kills a colossus in 58 rounds (~5.2 s); the minigun needs 100 rounds.
8. **The bomber never runs faster than 2.8 m/s.** advanceBomber clamps speed to BOMBER.maxSpeed 2.8 (bomber-behavior.js:4,
   20). This applies after the horde pace (4.5-5.9) and the "suicide sprint" x1.45 inside 14 m (index.html:53310), so
   both of those have no effect, and Ember Night's x1.2 doesn't help either. Separately, the brute's meleeMult 1.7 and
   the demon's 1.5 apply only to builds and the Hollows fight. A topside brute smash on the player is 16, its plain
   `damage` (53512).
9. **Night size does not rise steadily.** In total bodies:
   - night 6 (214) < night 5 (221);
   - night 12 (419) < night 11 (470);
   - night 18 (632) < night 17 (720).

   In total listed HP, night 11 (11,962) < night 10 (13,398) and night 17 (18,842) < night 16 (20,770). The specialist
   share also dips on the rest nights: 18% on night 7, 24% on 11, 28% on 14, 29% on 17.
10. **Shop prices stay flat while income keeps rising.** Guns, gear and blueprints have one price all run
    (game/economy.js:13-22). Upper-bound cash at prep: 379 on night 4 (when the M4 and chainsaw arrive), 6,212 on night
    10, 12,428 on night 14 (the $850 minigun's night). The dearest single items are the mortar Mk III blueprint
    ($900), the heavy turret Mk III blueprint and the minigun ($850 each) and the steel wall blueprint ($800). Armour
    also refills free every dawn (39033), so the $0.5/point repair only matters for damage taken during prep, for
    example at bounty posts.
