# grokbot - GB-38 day-1 audit - 2026-09-25
Changed:          audit only, no code changed. 9 problems: 1 S1, 5 S2, 3 S3.
Files:            handoffs/audit-day1/grokbot.md
Tests:            npm test -- (my 31 combat checks: t0-t13, t15, t17, t18, t21, t23-t25, t29, t34, t49, t51, t53, t57, t59, t63, t68) --jobs 2 -> 477 pass, 0 fail, 7 report no assertions (t0 t1 t2 t3 t4 t6a t8). Two headless day-1 probes, run from %TEMP% with the page served from memory (nothing written in the repo): probe 1 played the day-1 wave at the HQ with godmode (spawns, travel, stuck zombies, kills, finisher, day 2); probe 2 stood 12 m in front of the assault cave during the wave. Both: no page errors.
Screenshots:      none (headless probes with the stand-in renderer; Antigravity owns real-GPU shots)
Not verified:     Real-GPU fps and feel; hit damage to the marine (probes ran godmode); real aiming accuracy (kills were scripted body shots); the day scavenging income before the first wave.
Requests:         none (the audit goes to Claude)
Contract changes: none

## Top 5
1. GB-A1 (S1): during a wave, one round into the assault cave's mouth from within 20 m sets off the guardian chase and a certain death. Fighting the horde where the banner says it comes from gets you killed.
2. GB-A2 (S2): about a minute of nothing after the alarm. The day-1 horde walks ~190 m from its cave, and first contact comes ~60 s after the alarm.
3. GB-A3 (S2): day-1 kills pay two $8 skulls that vanish after 30 s, 30-45 m out in the dark, mid-fight. The economy spec assumes 17 of 20 banked.
4. GB-A4 (S2): day-1 difficulty depends on which cave rolls. From an iron or hill cave most shamblers need two pistol body shots (37 shots for 20 kills), so the 62 starting rounds are tight.
5. GB-A5 (S2): the day-1 difficulty tuning (GB-29) is still an undecided proposal. Day 1 runs at full speed and damage and sends all 20 in 6 s as one column.

## S1

### GB-A1 - S1 - combat - Shooting the day-1 horde at its cave mouth calls out the guardian and kills you
- Where:    index.html `updateProjectiles` (the GB-26/D-22 mouth check runs on every player round's segment, before zombie hits); `noteCaveMouthHit`/`triggerCavePoke` (GB-35: one round, 20 m, allowed during `wave`); `spawnWaveBatch` (wave zombies spawn at lz -1.4..-0.2, inside the mouth-shot volume lz -4.5..+1.2)
- Steps:    day 1, read the banner ("From East Cave"), go and meet them at the mouth, and shoot the first ones out (or miss one)
- Expected: you fight the horde. The guardian is a punishment for poking a cave on purpose (D-26), not for fighting the wave you were sent to.
- Seen:     probe 2, East Cave, marine 12 m out. Zombies in the mouth volume over the first 6 s of spawning: 2, 1, 0, 4, 0, 3. One `noteCaveMouthHit(3)` during the wave (what any round through that volume does) returned true, the chase started (27 m/s, 14.8 m away), and 4 s later the drag kill was running (`sk.kind` cave, `drag` true). Rounds that hit a zombie standing within 1.2 m of the lip also count, because the segment test runs before the zombie hit.
- Owner:    Grokbot
- Fix idea: no pokes on the wave's own assault caves while it is spawning, or ignore rounds that hit a zombie and require the round to go deeper than the spawn band (lz < -1.6). Claude and Jerry should say which fits D-26.
- Proof:    probe 2 output: {"cave":{"ci":3,"name":"East Cave"},"band":[... {"t":9.2,"alive":14,"inMouthVolume":4} ...],"phase":"wave","pokeResult":true,"chase":{"speed":27,"dist":14.8},"afterKill":{"kind":"cave","drag":true}}; code: `updateProjectiles` "GB-26 / D-22: player rounds through a cave mouth count toward a poke"; `pointInCaveMouthShot` lz < 1.2 && lz > -4.5.

## S2

### GB-A2 - S2 - combat/flow - A minute of dead air between the alarm and the first zombie
- Where:    index.html `spawnWaveBatch` (spawns just inside the assault cave), cave placement (POI.caves 179-197 m from the start spot at (0,-8.5)), shambler speed 3.19 x ZOMBIE_PACE 1.15 (x0.92 from an iron cave = 3.38 m/s)
- Steps:    fresh profile, Play, stay at the HQ, sound the alarm
- Expected: the alarm, the music swell and the rumble lead into contact within ~20-30 s
- Seen:     the first spawn at 5.8 s, all 20 by 11.7 s, and at 57 s after the alarm the nearest was still 28 m away (spread 28-46 m). Nobody reached the marine inside the probe's window, so contact is ~60-65 s after the alarm. It is a long walk in the dark after the loudest moment of the day.
- Owner:    Grokbot (with Claude for the music timing: CL-29's 10 s fade)
- Fix idea: on day 1 (maybe days 1-2) spawn at a rim point 70-90 m out along the cave's bearing, or give fodder a catch-up speed while far (> 80 m) and unseen.
- Proof:    probe 1: "firstSpawn":5.8, "allSpawnedAt":11.7, "firstContact":null, dists 28..45.9 at ~57 s; caves d 179-197.

### GB-A3 - S2 - combat/economy - Day-1 kills pay almost nothing you can actually pick up
- Where:    index.html `awardCash` (CASH_DROP_MIN 8: pools small rewards into one skull), CASH_LIFE 30 s, walk-over pickup (about 1.2 m), shambler reward 1
- Steps:    fight the day-1 wave from the HQ
- Expected: the first night buys something (economy-balance.md: "End Day 1: 20 kills contribute 20 value; 17 banked")
- Seen:     20 kills make two $8 skulls (the last $4 stays in the pool). They drop where the 8th and 16th died, 30-45 m out in the dark while the fight is on, and expire after 30 s. In probe 1 the bank went 40 -> 40 across the whole wave.
- Owner:    ChatGPT (economy) with Grokbot (rewards)
- Fix idea: let the skulls last until dawn or fly to the marine at wave end (the finisher moment is a natural cue), or bank the leftover pool at dawn.
- Proof:    probe 1: start bank 40, after the wave and into day 2 bank 40 (no pickup attempted; that is the point: a player holding the HQ gets the same). Code: `awardCash`, `CASH_LIFE = 30`.

### GB-A4 - S2 - combat - Day-1 difficulty is a dice roll on the cave; the starting pistol ammo is tight
- Where:    index.html CAVE_ROLES (iron armorAdd 0.10, hill hpMul 1.08), spawnZombie hpVar 0.85-1.15 (shambler 20-28 HP), pistol damage 24, starting rounds 12 + 50
- Steps:    day 1 where the wave's one cave rolls iron or hill, versus any other cave
- Expected: a consistent first night
- Seen:     iron-cave shamblers take 21.6 per pistol body shot: 20 kills cost 37 perfect body shots in probe 1 (only 3 of 20 died to one). From root/shale/wet/chalk caves about half die to one shot (~30 shots for 20). With 60% accuracy the iron case needs ~62 rounds, which is every round the marine starts with (12 + 50).
- Owner:    Grokbot
- Fix idea: no cave roles on day 1 (or days 1-2), or skip the armour/HP roles for shamblers early; or hold day-1 shambler HP at or under 24 so one body shot always kills (a clean "one shot, one kill" first night).
- Proof:    probe 1: 20 spawns, all trait "armoured" from Northeast Cave (iron), HP 20-27; `killB` 37 shots for 20 kills at 24 damage.

### GB-A5 - S2 - combat - Day-1 tuning is still an open proposal: full-speed horde, all 20 in one column
- Where:    index.html `spawnWaveBatch` (bursts of 5-9 at 0.1-0.22 s, 0.5-1.1 s between bursts); docs/specs/difficulty.md (GB-29, my proposal: day-1 speed x0.70, damage x0.45, active cap 8, bursts of 2-3 every 6-9 s)
- Steps:    day 1 wave
- Expected: a gentle first night, per whatever Jerry decides
- Seen:     all 20 are out of the cave in 6 s and walk in as one conga line at full pace and damage. This is not a bug; the decision has waited on Jerry since the 09:10Z night shift (horde sizes fixed; GB-29 and GP-25 are proposals).
- Owner:    Jerry (decision), then Grokbot
- Fix idea: decide GB-29's day-1/2 rows; at least stretch day-1 spawning to two or three groups.
- Proof:    probe 1 spawn times 5.8-11.7 s for all 20; BOARD 09:10Z order; difficulty.md rows for day 1.

### GB-A6 - S2 - combat - D-26: one stray round within 20 m of any cave is an unannounced, certain death for a new player
- Where:    index.html GB-35 block (CAVE_POKE_HITS 1, range 20 m), D-26
- Steps:    day 1, scavenge near a cave in daylight, shoot at anything with the mouth behind it
- Expected: dangerous, but learnable
- Seen:     as decided: one round, no warning beat, can't be outrun, run over. The only tell is the cave's breathing (CL-22). This is working as decided. I list it because on day 1 it can end a first run with no chance to learn, and it compounds GB-A1.
- Owner:    Jerry (decision)
- Fix idea: the first poke of a run only screeches and shows eyes (the aggro cue), and the second comes for you; or a coach line the first time you walk within 30 m of a mouth.
- Proof:    t59 34/0 and AG-13 shots show it working exactly as specified; judgement call, not verified with a new player.

## S3

### GB-A7 - S3 - combat - Wave zombies spawn on top of a marine standing at the mouth
- Where:    index.html `spawnWaveBatch` (no check for the player near the planned cave)
- Steps:    stand just outside the assault cave's grab band when the wave spawns
- Expected: they walk out of the dark
- Seen:     at 12 m out the first zombie was 10.7 m away as it appeared. Closer in (outside the grab band, 1-3 m) they would appear within arm's reach.
- Owner:    Grokbot
- Fix idea: if the marine is within ~8 m of the planned mouth, spawn deeper (lz -3.5) or hold the burst a second.
- Proof:    probe 2 band: nearest 10.7 m at 6.1 s. The 1-3 m case is not verified (inferred from spawn lz -1.4..-0.2).

### GB-A8 - S3 - combat - The guardian chase runs in a straight line through walls and builds
- Where:    index.html GB-35 `updateCaveChase`
- Steps:    poke a cave with a wall or cabin between you and the mouth
- Expected: it goes round, or through with a crash
- Seen:     it passes through solids (my own GB-35 note). On a roof or the tower you're taken by the 6 s cap.
- Owner:    Grokbot
- Fix idea: a smash-through effect on builds it crosses, or a simple steer around static props.
- Proof:    code (no collision in `updateCaveChase`); noted in handoffs/2026-09-24-grokbot-GB-35.md.

### GB-A9 - S3 - tests - Seven of my combat-core checks assert nothing
- Where:    tools/tests/t0, t1, t2, t3, t4, t6a, t8
- Steps:    npm test
- Expected: PASS/FAIL lines that can catch a regression
- Seen:     they print a snapshot ("wall:ok platform:ok light=lv0/null ...", "zombies 0 builds 13 phase idle") and count as "no assertions".
- Owner:    Grokbot
- Fix idea: turn each probe into one or two assertions on what it already prints (never weakening the others).
- Proof:    this run: "31 checks: 477 pass, 0 fail, 7 reported no assertions".

## Checked and fine
- The day-1 plan is 20 shamblers from one cave (`waveComposition(1)`, preview total 20), announced with the cave name.
- No spawns in view from the HQ (all 20 at 188 m, out of the camera cone).
- No stuck zombies over open ground (none held still for 7 s or more while more than 4 m from the marine).
- The finisher fires on the last kill (`getWaveFinisher()` set at once), and the game moves to day-2 prep.
- Guardian D-26 path: t59 34/0; the walk-in grab is unchanged (t36 22/0 last run).
- Knife (GB-31): 2 hits per day-1 shambler (22, or 19.8 from an iron cave, against 20-28 HP). Jerry's feel check is still pending.
