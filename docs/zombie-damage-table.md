# Zombies vs weapons: what every weapon does to every zombie today (Claude, CL-170, 2026-10-11)

For Jerry and ChatGPT, before making some zombies resistant to certain weapon types. Read from the game as it is now
(index.html, game/weaknesses.js); nothing was changed.

## How damage works right now
- Every weapon hit has a **damage type**: bullet, pellet (shotgun pellets), fire, blast (explosions), blade (knife,
  machete, chainsaw, spikes) or crush (a falling tree). The burning after a flame hit is its own "burn" column (it uses
  the Fire value unless a zombie has its own).
- **There is already a resistance table**: `game/weaknesses.js` (`WEAKNESS`, ChatGPT's GP-80 / D-62, wired in by
  Grokbot's GB-104). For each zombie it gives the share of a hit it takes per type: 1 = normal, 0.45 = takes 45%,
  1.5 = takes 150%. `COUNTER` in the same file names each zombie's best and worst answer (docs/weaknesses.md explains
  them). This is the place to make zombies resistant.
- The final share is clamped to **0.2 .. 1.6** (`WEAK_MIN`, `WEAK_MAX` in index.html), so nothing can be fully immune
  through the table today. A cave role stacks on top: iron (`armorAdd`) off every column, wet (`fireResistAdd`) off
  fire and burn; chalk zombies take 35% more from headshots.
- The old `armor` and `fireResist` numbers in `ZOMBIE_TYPES` (index.html) are **not used** for any zombie that has a
  row in the table (all of them except the Cave Guardian, which is unkillable).
- On top of the table: blades (knife, machete, chainsaw) also do less to the big ones (`MELEE_SIZE_MUL`: military and
  spider 0.8, brute 0.6, demon 0.5, colossus and guardian 0.35). Headshots add 85% for a bullet (50% for one pellet a
  shell). A zombie that has lost its head takes 15% more. The "power" skill adds 8% a level to the marine's own
  weapons. A suppressor takes 10% off. A round that pierces loses 15% per body. Guns lose nothing with range.
- Zombie HP varies ±15% per zombie; the tables use the listed HP.

## Share of each hit taken, by type
| Zombie | HP | Bullet | Pellet | Fire | Burn | Blast | Blade | Crush | Best | Worst |
|---|---|---|---|---|---|---|---|---|---|---|
| Shambler | 24 | 100% | 100% | 100% | 100% | 100% | 150% | 60% | blade | crush |
| Feral | 15 | 100% | 140% | 100% | 100% | 60% | 100% | 100% | pellet | blast |
| Leaper | 30 | 130% | 100% | 100% | 100% | 100% | 60% | 100% | bullet | blade |
| Spider | 44 | 70% | 110% | 160% | 160% | 92% | 92% | 92% | fire | bullet |
| Drowned | 40 | 96% | 130% | 40% | 40% | 96% | 96% | 96% | pellet | fire |
| Military | 50 | 70% | 88% | 88% | 88% | 140% | 88% | 88% | blast | bullet |
| Brute | 85 | 45% | 45% | 90% | 100% | 90% | 45% | 90% | blast | bullet |
| Spitter | 34 | 130% | 100% | 100% | 100% | 100% | 60% | 100% | bullet | blade |
| Screamer | 28 | 140% | 60% | 100% | 100% | 100% | 100% | 100% | bullet | pellet |
| Bomber | 34 | 100% | 100% | 150% | 150% | 100% | 50% | 100% | fire | blade |
| Demon | 130 | 120% | 82% | 20% | 20% | 82% | 70% | 82% | bullet | fire |
| Colossus | 520 | 50% | 68% | 68% | 68% | 130% | 68% | 68% | blast | bullet |
| Guardian | 420 | 60% | 70% | 140% | 140% | 70% | 70% | 70% | fire | bullet |

## Damage per hit (and body hits to kill an average one), every weapon
Body hits, no headshots, no skills, every pellet of a shell landing. Explosives are at the centre of the blast (4.5 m
radius, falling off to the edge, never under 12). The flamethrower is its direct tick only; the burn after it adds
8 a second x the Burn column.

| Weapon | Type | Dmg | Shambler | Feral | Leaper | Spider | Drowned | Military | Brute | Spitter | Screamer | Bomber | Demon | Colossus | Guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pistol | bullet | 24 | 24 (1) | 24 (1) | 31 (1) | 17 (3) | 23 (2) | 17 (3) | 11 (8) | 31 (2) | 34 (1) | 24 (2) | 29 (5) | 12 (44) | 14 (30) |
| Wasp SMG | bullet | 11 | 11 (3) | 11 (2) | 14 (3) | 8 (6) | 11 (4) | 8 (7) | 5 (18) | 14 (3) | 15 (2) | 11 (4) | 13 (10) | 6 (95) | 7 (64) |
| GW-4 Carbine | bullet | 19 | 19 (2) | 19 (1) | 25 (2) | 13 (4) | 18 (3) | 13 (4) | 9 (10) | 25 (2) | 27 (2) | 19 (2) | 23 (6) | 10 (55) | 11 (37) |
| KR-7 Rifle | bullet | 27 | 27 (1) | 27 (1) | 35 (1) | 19 (3) | 26 (2) | 19 (3) | 12 (7) | 35 (1) | 38 (1) | 27 (2) | 32 (5) | 14 (39) | 16 (26) |
| Revolver | bullet | 52 | 52 (1) | 52 (1) | 68 (1) | 36 (2) | 50 (1) | 36 (2) | 23 (4) | 68 (1) | 73 (1) | 52 (1) | 62 (3) | 26 (20) | 31 (14) |
| Sniper | bullet | 92 | 92 (1) | 92 (1) | 120 (1) | 64 (1) | 88 (1) | 64 (1) | 41 (3) | 120 (1) | 129 (1) | 92 (1) | 110 (2) | 46 (12) | 55 (8) |
| Rotary Gun | bullet | 10 | 10 (3) | 10 (2) | 13 (3) | 7 (7) | 10 (5) | 7 (8) | 4 (19) | 13 (3) | 14 (2) | 10 (4) | 12 (11) | 5 (104) | 6 (70) |
| Watchman MG | bullet | 18 | 18 (2) | 18 (1) | 23 (2) | 13 (4) | 17 (3) | 13 (4) | 8 (11) | 23 (2) | 25 (2) | 18 (2) | 22 (7) | 9 (58) | 11 (39) |
| Shotgun (7 pellets) | pellet | 9×7 | 63 (1) | 88 (1) | 63 (1) | 69 (1) | 82 (1) | 55 (1) | 28 (3) | 63 (1) | 38 (1) | 63 (1) | 52 (3) | 43 (13) | 44 (10) |
| Breacher-12 (5 pellets) | pellet | 7×5 | 35 (1) | 49 (1) | 35 (1) | 38 (2) | 46 (1) | 31 (2) | 16 (6) | 35 (1) | 21 (2) | 35 (1) | 29 (5) | 24 (22) | 24 (18) |
| Launcher (direct) | blast | 80 | 80 (1) | 48 (1) | 80 (1) | 74 (1) | 77 (1) | 112 (1) | 72 (2) | 80 (1) | 80 (1) | 80 (1) | 66 (2) | 104 (5) | 56 (8) |
| Grenade (centre) | blast | 55 | 55 (1) | 33 (1) | 55 (1) | 51 (1) | 53 (1) | 77 (1) | 50 (2) | 55 (1) | 55 (1) | 55 (1) | 45 (3) | 72 (8) | 38 (11) |
| Mortar (centre) | blast | 120 | 120 (1) | 72 (1) | 120 (1) | 110 (1) | 115 (1) | 168 (1) | 108 (1) | 120 (1) | 120 (1) | 120 (1) | 98 (2) | 156 (4) | 84 (5) |
| Knife | blade | 26 | 39 (1) | 26 (1) | 16 (2) | 19 (3) | 25 (2) | 18 (3) | 7 (13) | 16 (3) | 26 (2) | 13 (3) | 9 (15) | 6 (85) | 6 (66) |
| Machete | blade | 69 | 104 (1) | 69 (1) | 41 (1) | 51 (1) | 66 (1) | 49 (2) | 19 (5) | 41 (1) | 69 (1) | 34 (1) | 24 (6) | 16 (32) | 17 (25) |
| Chainsaw (per 0.12 s bite) | blade | 14 | 21 (2) | 14 (2) | 8 (4) | 10 (5) | 13 (3) | 10 (6) | 4 (23) | 8 (5) | 14 (2) | 7 (5) | 5 (27) | 3 (157) | 3 (123) |
| Flamethrower (per 0.08 s tick) | fire | 4 | 4 (6) | 4 (4) | 4 (8) | 6 (7) | 2 (25) | 4 (15) | 4 (24) | 4 (9) | 4 (7) | 6 (6) | 1 (163) | 3 (192) | 6 (75) |
| Light turret | bullet | 8 | 8 (3) | 8 (2) | 10 (3) | 6 (8) | 8 (6) | 6 (9) | 4 (24) | 10 (4) | 11 (3) | 8 (5) | 10 (14) | 4 (130) | 5 (88) |
| Heavy turret | bullet | 22 | 22 (2) | 22 (1) | 29 (2) | 15 (3) | 21 (2) | 15 (4) | 10 (9) | 29 (2) | 31 (1) | 22 (2) | 26 (5) | 11 (48) | 13 (32) |

## Quick view: hits to kill, the main weapons
| Zombie | Pistol | Carbine | Rifle | Revolver | Sniper | Shotgun | Launcher | Machete | Flamer ticks |
|---|---|---|---|---|---|---|---|---|---|
| Shambler | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| Feral | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 4 |
| Leaper | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 8 |
| Spider | 3 | 4 | 3 | 2 | 1 | 1 | 1 | 1 | 7 |
| Drowned | 2 | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 25 |
| Military | 3 | 4 | 3 | 2 | 1 | 1 | 1 | 2 | 15 |
| Brute | 8 | 10 | 7 | 4 | 3 | 3 | 2 | 5 | 24 |
| Spitter | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 9 |
| Screamer | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 7 |
| Bomber | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 6 |
| Demon | 5 | 6 | 5 | 3 | 2 | 3 | 2 | 6 | 163 |
| Colossus | 44 | 55 | 39 | 20 | 12 | 13 | 5 | 32 | 192 |
| Guardian | 30 | 37 | 26 | 14 | 8 | 10 | 8 | 25 | 75 |

## Where to change things
- Resistances: `game/weaknesses.js` rows (and `COUNTER` if the best/worst answer changes; game/weaknesses.test.mjs tests the table).
- The clamp: `WEAK_MIN` / `WEAK_MAX` in index.html (lower WEAK_MIN if something should be close to immune).
- Which weapon counts as which type: `weakTypeOf` in index.html (e.g. the chainsaw is "blade" today; the turrets'
  rounds are "bullet").
- Weapon damage: `WEAPON_STATS`, `BLADE_STATS`, `BUILD_STATS` (turrets), `MORTAR_DAMAGE` in index.html.
