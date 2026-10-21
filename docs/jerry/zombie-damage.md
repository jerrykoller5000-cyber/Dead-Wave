# Zombie damage, as the game is now

- Body hit on an average zombie. No headshot, no skills, no suppressor, no pierce falloff.
- The number is damage from that one shot. The number in parentheses is how many of those shots drop the listed HP.
- Military bullets and pellets are a chest hit (50%). A helmet hit is 60% of the raw round. An arm, leg, or unplaced hit is 80%.
- The Brute is still wearing its plates (45% of a bullet, pellet, or blade). After a plate breaks, that spot takes twice as much from those.
- Blades are also scaled down on the bigger bodies: Military and Spider 80%, Brute 60%, Demon 50%, Colossus and Guardian 35%.
- A real zombie's HP is the listed number, give or take 15%.
- The Cave Guardian is not on this sheet. Nothing fights it.
- Read from the game on 12 Oct 2026: game/weaknesses.js, game/military-behavior.js, game/brute-armor.js, WEAPON_STATS and BLADE_STATS in index.html.

## How much of a hit each zombie keeps

100% is a normal hit. 150% hurts more than the gun says. 10% almost ignores it.

| Zombie | HP | Bullet | Pellet | Fire | Burn | Blast | Blade | Crush |
|---|---|---|---|---|---|---|---|---|
| Shambler | 24 | 100% | 100% | 100% | 100% | 100% | 150% | 60% |
| Feral | 15 | 100% | 140% | 100% | 100% | 60% | 100% | 100% |
| Leaper | 30 | 130% | 100% | 100% | 100% | 100% | 60% | 100% |
| Spider | 44 | 70% | 110% | 160% | 160% | 92% | 92% | 92% |
| Drowned | 40 | 96% | 130% | 10% | 10% | 96% | 96% | 96% |
| Military | 50 | 50% | 50% | 88% | 88% | 60% | 88% | 88% |
| Brute | 85 | 45% | 45% | 90% | 100% | 90% | 45% | 90% |
| Spitter | 34 | 130% | 100% | 100% | 100% | 100% | 60% | 100% |
| Screamer | 28 | 140% | 60% | 100% | 100% | 100% | 100% | 100% |
| Bomber | 34 | 100% | 100% | 150% | 150% | 100% | 50% | 100% |
| Demon | 130 | 120% | 82% | 20% | 20% | 82% | 70% | 82% |
| Colossus | 520 | 50% | 68% | 68% | 68% | 130% | 68% | 68% |
| Guardian | 420 | 60% | 70% | 140% | 140% | 70% | 70% | 70% |

## Damage from each weapon

| Weapon | What one shot is | Shambler | Feral | Leaper | Spider | Drowned | Military | Brute | Spitter | Screamer | Bomber | Demon | Colossus | Guardian |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pistol | one round | 24 (1) | 24 (1) | 31 (1) | 17 (3) | 23 (2) | 12 (5) | 11 (8) | 31 (2) | 34 (1) | 24 (2) | 29 (5) | 12 (44) | 14 (30) |
| Wasp SMG | one round | 11 (3) | 11 (2) | 14 (3) | 7.7 (6) | 11 (4) | 5.5 (10) | 5 (18) | 14 (3) | 15 (2) | 11 (4) | 13 (10) | 5.5 (95) | 6.6 (64) |
| GW-4 Carbine | one round | 19 (2) | 19 (1) | 25 (2) | 13 (4) | 18 (3) | 9.5 (6) | 8.6 (10) | 25 (2) | 27 (2) | 19 (2) | 23 (6) | 9.5 (55) | 11 (37) |
| KR-7 Rifle | one round | 27 (1) | 27 (1) | 35 (1) | 19 (3) | 26 (2) | 14 (4) | 12 (7) | 35 (1) | 38 (1) | 27 (2) | 32 (5) | 14 (39) | 16 (26) |
| Revolver | one round | 52 (1) | 52 (1) | 68 (1) | 36 (2) | 50 (1) | 26 (2) | 23 (4) | 68 (1) | 73 (1) | 52 (1) | 62 (3) | 26 (20) | 31 (14) |
| Sniper | one round | 92 (1) | 92 (1) | 120 (1) | 64 (1) | 88 (1) | 46 (2) | 41 (3) | 120 (1) | 129 (1) | 92 (1) | 110 (2) | 46 (12) | 55 (8) |
| Rotary Gun | one round | 10 (3) | 10 (2) | 13 (3) | 7 (7) | 9.6 (5) | 5 (10) | 4.5 (19) | 13 (3) | 14 (2) | 10 (4) | 12 (11) | 5 (104) | 6 (70) |
| Watchman MG | one round | 18 (2) | 18 (1) | 23 (2) | 13 (4) | 17 (3) | 9 (6) | 8.1 (11) | 23 (2) | 25 (2) | 18 (2) | 22 (7) | 9 (58) | 11 (39) |
| Shotgun | one shell, all 7 pellets | 63 (1) | 88 (1) | 63 (1) | 69 (1) | 82 (1) | 32 (2) | 28 (3) | 63 (1) | 38 (1) | 63 (1) | 52 (3) | 43 (13) | 44 (10) |
| Breacher-12 | one shell, all 5 pellets | 35 (1) | 49 (1) | 35 (1) | 39 (2) | 46 (1) | 18 (3) | 16 (6) | 35 (1) | 21 (2) | 35 (1) | 29 (5) | 24 (22) | 25 (18) |
| Launcher | direct hit | 80 (1) | 48 (1) | 80 (1) | 74 (1) | 77 (1) | 48 (2) | 72 (2) | 80 (1) | 80 (1) | 80 (1) | 66 (2) | 104 (5) | 56 (8) |
| Grenade | centre of the blast | 55 (1) | 33 (1) | 55 (1) | 51 (1) | 53 (1) | 33 (2) | 50 (2) | 55 (1) | 55 (1) | 55 (1) | 45 (3) | 72 (8) | 39 (11) |
| Mortar | centre of the blast | 120 (1) | 72 (1) | 120 (1) | 110 (1) | 115 (1) | 72 (1) | 108 (1) | 120 (1) | 120 (1) | 120 (1) | 98 (2) | 156 (4) | 84 (5) |
| Knife | one swing | 39 (1) | 26 (1) | 16 (2) | 19 (3) | 25 (2) | 18 (3) | 7 (13) | 16 (3) | 26 (2) | 13 (3) | 9.1 (15) | 6.2 (85) | 6.4 (66) |
| Machete | one swing | 104 (1) | 69 (1) | 41 (1) | 51 (1) | 66 (1) | 49 (2) | 19 (5) | 41 (1) | 69 (1) | 35 (1) | 24 (6) | 16 (32) | 17 (25) |
| Chainsaw | one bite, every 0.12 s | 21 (2) | 14 (2) | 8.4 (4) | 10 (5) | 13 (3) | 9.9 (6) | 3.8 (23) | 8.4 (5) | 14 (2) | 7 (5) | 4.9 (27) | 3.3 (157) | 3.4 (123) |
| Flamethrower | one tick, every 0.08 s | 4 (6) | 4 (4) | 4 (8) | 6.4 (7) | 0.4 (100) | 3.5 (15) | 3.6 (24) | 4 (9) | 4 (7) | 6 (6) | 0.8 (163) | 2.7 (192) | 5.6 (75) |
| Light turret | one round | 8 (3) | 8 (2) | 10 (3) | 5.6 (8) | 7.7 (6) | 4 (13) | 3.6 (24) | 10 (4) | 11 (3) | 8 (5) | 9.6 (14) | 4 (130) | 4.8 (88) |
| Heavy turret | one round | 22 (2) | 22 (1) | 29 (2) | 15 (3) | 21 (2) | 11 (5) | 9.9 (9) | 29 (2) | 31 (1) | 22 (2) | 26 (5) | 11 (48) | 13 (32) |
