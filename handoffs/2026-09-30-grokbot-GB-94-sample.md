# GB-94 (partial) — early, reduced balance sample (Grokbot, 2026-09-30)

**Partial, measurement only.** Jerry approved this at 7:00 PM CT as an early, reduced sample because the numbers may change after R5. No balance numbers and no game code were changed. The full GB-94 (medians over 20 nights) still waits for R5 to close; the box stays unticked.

Changed:          nothing in the game. My private sim copy tools/.tmp-gbns.mjs now also records `bankEarned` (cash during the night, net of the bot's ammo top-ups) and `bankEnd`. New data: qa/nightsim/gb94e-n<night>-r<run>.json.
Tests:            none needed (no game code changed); the sim runs are the measurement.
Not verified:     see the end.

## How it was run
- tools/.tmp-gbns.mjs (my copy of tools/nightsim.mjs with the fixes that make the bot actually own its bought guns: guns bought on the stocked day, M4/AK/AA-12 on auto), on a snapshot of index.html taken at 7:03 PM CT (after GB-106 and CL-80).
- One node process at a time, nights round-robin (5, 10, 13, 15, 18, 20, then again), `--cap 900` s of game time, `--wallcap 15` min, a hard kill at 20 min real per run. No run hit any cap.
- For the first hour, Cursor's CU-53 full run (tools/nightsim.mjs --full, started 4:49 PM) was still going on the same machine; it finished before my second round. Only wall-clock time is affected by that; every number below is game time.
- The bot: the loadout by night (night 5: M4, shotgun, knife, armour 75; night 10: AK, shotgun, machete, armour 90; 13 and 15: AK, AA-12, machete, armour 90; 18 and 20: minigun, AA-12, machete, armour 90), at the HQ window, no turrets or walls, reserve topped up. Godmode off: a death is logged and he's set back to full.

- 16 runs in all, 7:04 to 8:57 PM CT: three each of nights 5, 10, 13 and 15, two each of 18 and 20 (the third round stopped at my 8:55 PM start cutoff).

## Results (game time; damage is HP taken, summed across his resets)

| Night | Runs | Loadout | Night length s, median (range) | Damage, median (range) | Deaths, median (range) | Killed / planned | Skull value paid, median (range) |
|---|---|---|---|---|---|---|---|
| 5 | 3 | M4, shotgun, knife, armour 75 | 319 (306-329) | 36 (33-59) | 0 (0-0) | 221/221 ×3 | 812 (785-918) |
| 10 | 3 | AK, shotgun, machete, armour 90 | 542 (470-567) | 201 (62-482) | 0 (0-2) | 431/431, 430/431, 431/431 | 1982 (1918-2066) |
| 13 | 3 | AK, AA-12, machete, armour 90 | 614 (566-637) | 100 (95-100) | 0 (0-0) | 560/560 ×3 | 1719 (1699-1759) |
| 15 | 3 | AK, AA-12, machete, armour 90 | 680 (673-682) | 372 (288-374) | 0 (0-0) | 641/641, 640/641, 641/641 | 2281 (2231-2307) |
| 18 | 2 | minigun, AA-12, machete, armour 90 | 776 (774-779) | 299 (149-448) | 1 (0-2) | 632/632 ×2 | 2235 (2195-2275) |
| 20 | 2 | minigun, AA-12, machete, armour 90 | 750 (727-772) | 145 (81-208) | 0 (0-0) | 851/851 ×2 | 6400 (5751-7048) |

- **Cash:** cash earned is 0 for every night: the bank doesn't move during the wave (kills pay in skulls; turning them into cash happens after the night, which the sim doesn't reach). So I give the skull value the night's kills paid (`skullValueDbg`) as the night's pay. The bank at the end is meaningless here (the sim gives him money to buy his loadout).
- **Killed / planned:** two runs credited one kill fewer than planned (n10 r2, n15 r2) with nothing stuck or lost; one zombie died without a kill being credited (likely a bomber's blast or the colossus). Not a stall.
- **Every death was a brute pack:** n10 r2 at 460 s and 462 s (5 and 4 brutes round him), n18 r1 at 211 s and 215 s (3 brutes, then 1 with shamblers and a feral). No other cause killed him in 16 runs.
- No run hit the 900 s game cap, the wall cap or the hard timeout; no page errors; nothing stuck past 1 (n5 r2) and nothing lost.
- Against yesterday's runs (gb-m95c, gb-post104f, same bot): n13 dmg 97-174, n15 372 with 1 death, n18 141-201, n20 6, n6 415 with 2 deaths. Today's numbers line up; nothing has drifted.

## What stands out
1. **Night 15 (the Nest) hurts the most of the nights sampled, every time:** 288-374 damage in all three runs, against 100 on 13 and 145 on 20. Spiders do most of it (177-236 per run, against 33-123 on the other nights), and 28-32% of his kills are melee (0-25% on the other nights), so the fifty spiders get to him. Bombers add 75-141.
2. **Brute packs are the only killer, and they make nights 10 and 18 swingy:** 62 to 482 damage on night 10, 149 to 448 on 18, depending on whether 3-5 brutes reach him together. Night 10 is "Brute night down one cave" the night before the AA-12 is in stock (the bot carries the AK and the shotgun).
3. **Pay isn't monotonic:** night 13 (Artillery: spitters behind soldiers) pays less than night 10 (1719 vs 1982) with 30% more zombies and a longer night; night 20 pays about 2.9× night 18 (6400 vs 2235) for 35% more zombies.
4. **Night 20 is easier than 18:** less damage (145 vs 299), no deaths, and a slightly shorter night despite 219 more zombies. The minigun carries it; yesterday's night 20 took 6 damage.
5. **Night 5 is gentle** (36 damage, all from spiders). Fine for an early night, and night 6 was the early spike yesterday (415, 2 deaths).

## Suggestions (not applied; GB-94 rules: skull value and packs, never horde size)
- **The Nest (15):** if the spike isn't meant to be this big, split the fifty spiders across two pushes, or trim the spiders' bite on that night; don't cut the horde. If it's meant to be the named night's spike, leave it.
- **Brute packs (10, 18):** stagger brutes so no more than about 3 arrive together (a few seconds between them, same count), or stock the AA-12 for night 10 instead of 11 so the brute night has its counter.
- **Skull value:** check the soldiers' and spitters' skull value (night 13's pay dip); check whether night 20's ~2.9× jump is meant (the colossus and Ember Night's kinds) or should be closer to 1.5× night 18.
- **Night 20:** if the last stand should feel like the hardest night, it needs packs that test a minigun (brutes or bombers), not more bodies.

## Not verified
- Only 2-3 runs a night, and two nights got two: medians will move, especially on 10 and 18 where one brute pack decides the run.
- The bot is not a player: it stands at the HQ window, builds nothing, never runs out of ammo, and is set back to full when it dies. Headless with fake three.js.
- R5 work still to land (the Hollows, the secret's fight, Swarm Night, Fog Night's fog) will change these nights; the full GB-94 waits for R5.
- Cash after dawn isn't measured (the night sim ends at the last kill).
- The sim snapshot is index.html at 7:03 PM CT; anything landed after that isn't in it.
