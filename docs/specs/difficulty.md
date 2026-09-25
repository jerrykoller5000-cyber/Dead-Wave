# Nights 1 to 20 (GB-53)

Grokbot, 2026-09-25. **This replaces the GB-29 proposal** that used to be here (per-day speed and health
scaling, never built). The live code is `NIGHT_PLAN` / `NIGHT_TIER` / `waveComposition` / `startPrep` /
`spawnWaveBatch` in `index.html`; `tools/tests/t78.js` holds it to this page.

## What changed and why

Before GB-53 every night from 2 on was about **90% shamblers** with the same sprinkle of specialists
(9-12% of the horde, the same kinds every night), dealt out evenly by the `HORDE_MULT` swell. Night 12
felt like night 5, only longer, and nothing ever came as a set piece.

Now each night has its own plan:
- **Horde sizes stay** (the totals are exactly the old ones; D-29 changed day 1 only). What changed is what is in
  the horde and how it arrives.
- **Days 1-3 teach, 4-10 build, 11-20 test.** The specialist share climbs: teach 13% on average, build 28%,
  test 35%, night 20 47%.
- **A new kind or a new trick every night or two.** Ferals on 2, leapers and drowned on 3, soldiers and
  brutes on 4, spiders on 5, spitters on 6, bombers on 7, screamers on 8, demons on 11. After that every night
  has its own trick (see the table), and no two nights share one.
- **Set pieces**: packs come out together, late in the night (a bomber pack of ten on 8, eight packs of ten
  ferals from two caves on 9, brute night on 10, spitter packs on 13, the lake surge on 14, the spider nest on
  15, demon night on 16, the siege on 18, the last stand on 20).
- **Rest nights** (7, 11, 14, 17): a lighter mix than the nights either side (18%, 24%, 28%, 29%) and 12 s
  breathers.
- **Pushes and breathers**: a night comes in 1 to 6 pushes, each a little bigger than the one before, and the
  last is the peak (+2 bodies a burst). Between pushes the spawning stops. The breather's clock starts once the field is
  down to 5 (`LULL_FIELD`), then runs its lull (teach 9 s, build 7 s, test 5 s, rest 12 s, gauntlet 3 s). A
  full field waits at most 30 s (`LULL_MAX_WAIT`), so a camper can't hold the night up.
- **The boss heads the last push** (a few bodies in) instead of trailing the whole night.
- The cadences are the old ones: **Ember Night** (blood moon) every fourth night from 4, a **colossus** every
  fifth, the **guardian** every sixth (it replaces the colossus and comes from the chalk cave only, D-13).
- Surround moves from night 9 (by the old `day % 3` rule) to the rest nights 11 and 17. Three caves on 19 and 20.
  Ground risers (GB-40's claw-up, out of the camera's view) come back on 7, 14, 19 and 20.
- Past night 20 the test nights (13-20) come round again, scaled to the old day curve
  (`zombiesForDay(n) x 10`: night 21 is 890, night 23 is 980).

## The 20 nights

Specialists: the counts are exact. **Bold** marks a kind's first night. Shamblers fill the rest. "Risers" are
shamblers that claw up in the treeline instead of walking out of a cave. "+ lake": the drowned surface out of the
sinkhole. Pushes include the boss.

| Night | Act | Total (boss) | Shamblers | Specialists | Caves | Ember | Boss | Pushes (bodies) | Breather | The trick |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | teach | 15 | 15 | - (0%) | 1 cave + 7-8 claw up |  |  | 15 | - | Fifteen shamblers; half claw up out of the ground (D-29) |
| 2 | teach | 50 | 42 | **feral 8 (new)** in 2 packs (16%) | 1 cave |  |  | 19 / 31 | 9 s | Runners: the first ferals, in two packs |
| 3 | teach | 100 | 76 | feral 10, **leaper 6 (new)**, **drowned 8 (new)** (24%) | 1 cave + lake |  |  | 26 / 32 / 42 | 9 s | The lake wakes: drowned from the sinkhole, and the first leapers |
| 4 | build | 130 | 96 | feral 12, leaper 8, drowned 4, **soldier 8 (new)**, **brute 2 (new)** (last push) (26%) | 2 caves + lake | yes |  | 34 / 41 / 55 | 7 s | Ember Night: two caves at once, the first soldiers and brutes |
| 5 | build | 220 + 1 | 166 | feral 16, leaper 10, drowned 6, soldier 8, brute 4, **spider 10 (new)** (25%) | 1 cave + lake |  | colossus | 59 / 69 / 93 | 7 s | The first spiders, and a colossus heads the last push |
| 6 | build | 213 + 1 | 157 | feral 14, leaper 10, drowned 6, soldier 10, brute 4, spider 6, **spitter 6 (new)** (26%) | chalk only + lake |  | guardian | 57 / 67 / 90 | 7 s | Guardian night: it comes out of the chalk cave; the first spitters |
| 7 (rest) | build | 300 | 206 + 40 risers | feral 30, leaper 10, drowned 10, **bomber 4 (new)** in 1 pack (18%) | 1 cave + 40 claw up + lake |  |  | 61 / 68 / 75 / 96 | 12 s | Rest night: forty claw up in the treeline, and one pack of the first bombers |
| 8 | build | 350 | 247 | feral 24, leaper 14, drowned 8, soldier 24, brute 6, spider 8, spitter 6, bomber 10 in 1 pack, **screamer 3 (new)** (29%) | 2 caves + lake | yes |  | 71 / 79 / 89 / 111 | 7 s | Ember Night: a bomber pack of ten, and the first screamers |
| 9 | build | 390 | 234 | feral 80 in 8 packs, leaper 30, drowned 8, soldier 16, spider 10, spitter 4, bomber 6, screamer 2 (40%) | 2 caves + lake |  |  | 79 / 88 / 99 / 124 | 7 s | Runners from two caves: eight packs of ten ferals |
| 10 | build | 430 + 1 | 296 | feral 30, leaper 16, drowned 10, soldier 30, brute 24 in 4 packs, spider 10, spitter 6, bomber 6, screamer 2 (31%) | 1 cave + lake |  | colossus | 87 / 97 / 109 / 138 | 7 s | Brute night down one cave, and a colossus |
| 11 (rest) | test | 470 | 358 | feral 50, leaper 16, drowned 10, soldier 16, spider 8, spitter 4, bomber 4, screamer 2, **demon 2 (new)** (last push) (24%) | all six (surround) + lake |  |  | 77 / 84 / 90 / 98 / 121 | 12 s | Rest night, but from every cave; the first demons |
| 12 | test | 418 + 1 | 269 | feral 40, leaper 20, drowned 10, soldier 30, brute 10, spider 12, spitter 10, bomber 8, screamer 3, demon 6 (36%) | chalk only + lake | yes | guardian | 85 / 95 / 105 / 134 | 5 s | The guardian on Ember Night, with demons |
| 13 | test | 560 | 364 | feral 50, leaper 24, drowned 12, soldier 50, brute 12, spider 14, spitter 20 in 4 packs, bomber 8, screamer 3, demon 3 (35%) | 2 caves + lake |  |  | 92 / 100 / 108 / 116 / 144 | 5 s | Artillery: twenty spitters behind a line of soldiers |
| 14 (rest) | test | 600 | 372 + 60 risers | feral 40, leaper 16, drowned 70 in 5 packs, soldier 16, brute 4, spider 10, spitter 4, bomber 4, screamer 2, demon 2 (28%) | 1 cave + 60 claw up + lake |  |  | 98 / 107 / 116 / 125 / 154 | 12 s | Rest night: the lake surges (seventy drowned) and sixty claw up |
| 15 | test | 640 + 1 | 404 | feral 60, leaper 30, drowned 12, soldier 40, brute 14, spider 50 in 5 packs, spitter 10, bomber 10, screamer 6 in 1 pack, demon 4 (37%) | 2 caves + lake |  | colossus | 105 / 114 / 124 / 133 / 165 | 5 s | The nest: fifty spiders, a screamer pack, and a colossus |
| 16 | test | 680 | 428 | feral 70, leaper 30, drowned 14, soldier 60, brute 16, spider 20, spitter 12, bomber 12, screamer 4, demon 14 in 2 packs (37%) | 2 caves + lake | yes |  | 111 / 121 / 132 / 142 / 174 | 5 s | Ember Night, demon night: fourteen demons in two packs |
| 17 (rest) | test | 720 | 514 | feral 90, leaper 30, drowned 14, soldier 20, brute 8, spider 16, spitter 6, bomber 14, screamer 4, demon 4 (29%) | all six (surround) + lake |  |  | 99 / 106 / 113 / 120 / 127 / 155 | 12 s | Rest night from every cave: the fast ones |
| 18 | test | 631 + 1 | 381 | feral 60, leaper 30, drowned 14, soldier 50, brute 30 in 3 packs, spider 20, spitter 14, bomber 20 in 3 packs, screamer 4, demon 8 (40%) | chalk only + lake |  | guardian | 103 / 112 / 122 / 132 / 163 | 5 s | Guardian night, the siege: brutes behind a bomber screen |
| 19 | test | 810 | 448 + 30 risers | feral 90, leaper 40, drowned 18, soldier 70, brute 30, spider 30, spitter 18, bomber 18, screamer 6, demon 12 (41%) | 3 caves + 30 claw up + lake |  |  | 111 / 119 / 127 / 136 / 143 / 174 | 3 s | The gauntlet: three caves and the treeline, short breathers |
| 20 | test | 850 + 1 | 414 + 40 risers | feral 100, leaper 50, drowned 24, soldier 80, brute 36, spider 36, spitter 20, bomber 24 in 2 packs, screamer 8, demon 18 in 2 packs (47%) | 3 caves + 40 claw up + lake | yes | colossus | 117 / 125 / 133 / 142 / 151 / 183 | 5 s | Last stand: Ember Night, a colossus, three caves, the treeline and the lake |

## Before and after

The totals are unchanged. The mix and the caves changed. "Before" is the average of 200 rolls of the old
`waveComposition`, since its tail was random.

| Night | Total before | Total after | Shamblers before | Shamblers after | Specialists before | Specialists after | Caves before | Caves after |
|---|---|---|---|---|---|---|---|---|
| 1 | 15 | 15 | 15 | 15 | 0 (0%) | 0 (0%) | 1 | 1 |
| 2 | 50 | 50 | 48 | 42 | 2 (4%) | 8 (16%) | 1 | 1 |
| 3 | 100 | 100 | 94 | 76 | 6 (6%) | 24 (24%) | 1 | 1 |
| 4 | 130 | 130 | 119 | 96 | 11 (8%) | 34 (26%) | 2 | 2 |
| 5 | 221 | 221 | 200 | 166 | 20 (9%) | 54 (25%) | 1 | 1 |
| 6 | 214 | 214 | 189 | 157 | 24 (11%) | 56 (26%) | chalk | chalk |
| 7 | 300 | 300 | 272 | 246 | 28 (9%) | 54 (18%) | 1 | 1 |
| 8 | 350 | 350 | 317 | 247 | 33 (9%) | 103 (29%) | 2 | 2 |
| 9 | 390 | 390 | 353 | 234 | 37 (9%) | 156 (40%) | all | 2 |
| 10 | 431 | 431 | 389 | 296 | 41 (10%) | 134 (31%) | 2 | 1 |
| 11 | 470 | 470 | 425 | 358 | 45 (10%) | 112 (24%) | 1 | all |
| 12 | 419 | 419 | 369 | 269 | 49 (12%) | 149 (36%) | chalk | chalk |
| 13 | 560 | 560 | 506 | 364 | 54 (10%) | 196 (35%) | 1 | 2 |
| 14 | 600 | 600 | 542 | 432 | 58 (10%) | 168 (28%) | 2 | 1 |
| 15 | 641 | 641 | 579 | 404 | 61 (10%) | 236 (37%) | 1 | 2 |
| 16 | 680 | 680 | 616 | 428 | 64 (9%) | 252 (37%) | 2 | 2 |
| 17 | 720 | 720 | 652 | 514 | 68 (9%) | 206 (29%) | 1 | all |
| 18 | 632 | 632 | 558 | 381 | 73 (12%) | 250 (40%) | chalk | chalk |
| 19 | 810 | 810 | 733 | 478 | 77 (10%) | 332 (41%) | 1 | 3 |
| 20 | 851 | 851 | 770 | 454 | 80 (9%) | 396 (47%) | 2 | 3 |

## Money and weight (for GP-41)

Cash drops are the sum of `cashDrop` over the night's bodies at today's values (shambler 1, feral 4, leaper
6, drowned 6, soldier 8, spitter 9, bomber 9, spider 10, screamer 11, brute 14, demon 20, colossus 120,
guardian 150). Zombie hp is the sum of base hp (before cave roles). **The horde's hp only climbs 0-22%, but a
night pays up to 2.3x what it did**, because specialists pay 4-20 against a shambler's 1. The payout is
ChatGPT's call (GP-41): scale `cashDrop`, the skull accumulator, or the kiosk prices. The mix doesn't need
to change for it.

| Night | Cash drops before | Cash drops after | Change | Zombie hp before | Zombie hp after | Change |
|---|---|---|---|---|---|---|
| 1 | 15 | 15 | x1.00 | 360 | 360 | x1.00 |
| 2 | 56 | 74 | x1.32 | 1182 | 1128 | x0.95 |
| 3 | 126 | 200 | x1.59 | 2416 | 2474 | x1.02 |
| 4 | 199 | 308 | x1.55 | 3305 | 3454 | x1.05 |
| 5 | 480 | 666 | x1.39 | 6195 | 6464 | x1.04 |
| 6 | 556 | 709 | x1.28 | 6139 | 6246 | x1.02 |
| 7 | 524 | 522 | x1.00 | 7893 | 7190 | x0.91 |
| 8 | 638 | 1008 | x1.58 | 9384 | 9718 | x1.04 |
| 9 | 695 | 1122 | x1.61 | 10315 | 9672 | x0.94 |
| 10 | 889 | 1498 | x1.69 | 11900 | 13398 | x1.13 |
| 11 | 835 | 1056 | x1.26 | 12400 | 11962 | x0.96 |
| 12 | 992 | 1574 | x1.59 | 11877 | 12830 | x1.08 |
| 13 | 999 | 1833 | x1.83 | 14840 | 16248 | x1.09 |
| 14 | 1062 | 1526 | x1.44 | 15866 | 16416 | x1.03 |
| 15 | 1236 | 2358 | x1.91 | 17369 | 19254 | x1.11 |
| 16 | 1217 | 2416 | x1.99 | 18138 | 20770 | x1.15 |
| 17 | 1252 | 1874 | x1.50 | 18964 | 18842 | x0.99 |
| 18 | 1337 | 2565 | x1.92 | 17290 | 20162 | x1.17 |
| 19 | 1400 | 3096 | x2.21 | 21285 | 25064 | x1.18 |
| 20 | 1607 | 3766 | x2.34 | 23024 | 28080 | x1.22 |

## Pacing (for CL-38)

This is when each push starts, in seconds after the first body walks out. The model is a player who kills
everything as fast as it arrives, so walking time is ignored and a real night runs longer: the bodies still
have to walk to you, and you have to kill them. The breathers are real, though. When a push is out, the spawning
stops until the field is down to 5, then waits the lull. The music can read it live:
`TT.getWaveDirectorState().pace` is `{ push, pushes, left, inLull, lullT, lullWait }`, and
`TT.getWavePreview().night` is `{ act, rest, trick, label, caves, pushes, lull, ground }`, frozen at prep.

| Night | Pushes start (s after the first spawn) | Arrival done (s) |
|---|---|---|
| 1 | 8 s; one push | 8 |
| 2 | 0, 18 | 32 |
| 3 | 0, 24, 48 | 66 |
| 4 | 0, 17, 37 | 58 |
| 5 | 0, 25, 55 | 93 |
| 6 | 0, 24, 49 | 81 |
| 7 | 0, 28, 59, 92 | 116 |
| 8 | 0, 28, 58, 91 | 123 |
| 9 | 0, 31, 63, 98 | 133 |
| 10 | 0, 33, 70, 109 | 147 |
| 11 | 0, 34, 69, 106, 144 | 176 |
| 12 | 0, 26, 56, 89 | 121 |
| 13 | 0, 28, 59, 93, 129 | 164 |
| 14 | 0, 38, 79, 124, 169 | 211 |
| 15 | 0, 32, 66, 105, 143 | 182 |
| 16 | 0, 34, 70, 108, 149 | 192 |
| 17 | 0, 39, 80, 124, 169, 215 | 256 |
| 18 | 0, 32, 65, 103, 143 | 182 |
| 19 | 0, 32, 66, 103, 140, 179 | 222 |
| 20 | 0, 34, 71, 109, 151, 195 | 240 |

## Spawn pacing by act (`NIGHT_TIER`)

| Act | Bodies a burst | Gap between bursts (s) | Breather (s) |
|---|---|---|---|
| Day 1 (D-29, unchanged) | 5-9 | 0.5-1.1 | one push |
| Teach (2-3) | 3-6 | 0.9-1.6 | 9 |
| Build (4-10) | 6-10 | 0.55-1.1 | 7 |
| Test (11-20) | 8-12 | 0.4-0.9 | 5 (gauntlet 3) |
| Rest (7, 11, 14, 17) | 7-11 | 0.5-1.0 | 12 |

Before, every day used 5-9 a burst (7-11 from day 4) and 0.5-1.1 s gaps, with no pushes and no breathers.
The spawn step within a burst is unchanged (0.1-0.22 s), and so is `MAX_ZOMBIES` (48 at once).

## Hooks

- `TT.NIGHT_PLAN[n]`, `TT.nightPlanFor(n)` (any night, including past 20), `TT.NIGHT_TIER`, `TT.nightPushSizes(total, pushes)`.
- `TT.getWavePace()`: the live pace object. `getWaveDirectorState().pace`: its public fields.
- `wavePreview.night`: the frozen plan for the briefing (the trick's `label` is plain English for now; a
  `dwText` key is ChatGPT's if the briefing should show it).

## Not verified

- Nobody has played these on a real GPU yet. CU-38 (Cursor, nights 1 to 10 on Jerry's GPU) is the play pass;
  the numbers here are first guesses.
- Night 20 has 36 brutes, 18 demons and 24 bombers in 851 bodies, at most 48 up at once. Performance with
  more heavy bodies on the field needs CU-38's eyes.
