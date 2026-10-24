# The 1.0 balance pass (D-86)

Claude, 2026-10-23. Jerry: "a big balance pass. Everything starting relatively easy and progressively getting harder by
day 20 ... weapons, HP, zombies, ammo, buildable items, the works." His calls (in chat): a **first pass now**, before his
weekend playthrough, which then fine-tunes it; **night 20 brutal**; today the difficulty feels **uneven, spiky**; Grokbot
is offline, so his weapons and combat numbers are **reassigned for this pass** (Grokbot reviews when he is back).

The numbers below come from the live code at cb2e7e2, run under node (`docs/specs/balance-1.0-inventory.md`, the
full inventory with file:line for every value). The playthrough is the judge: this pass smooths and sets the curve,
it does not replace Jerry's notes (D-71 stands for what comes after).

## What was uneven

1. **The nights went down as well as up.** Night 6 had fewer bodies than night 5, 12 than 11, 18 than 17. By weight
   of what comes (below), nights 6, 11, 14 and 17 were lighter than the night before (rest nights at 18-29 %
   specialists between nights at 26-40 %), and night 9 jumped to 40 % then night 10 fell back to 31 %.
2. **Pay fell off a cliff on night 11** (the x0.67 late trim): 1,498 on night 10, 708 on night 11.
3. **The last two guns were not upgrades.** The rotary gun ($850, night 14) about tied the GW-4 carbine ($180, night 4)
   and did less than the Wasp SMG ($75) to spiders, brutes and demons; the Breacher-12 ($650, night 10) did less a
   second than the KR-7 ($245).
4. **Screamers were close to unkillable** outside the 2.4 s after each scream (3 % of every hit).
5. **The Watchman MG** did about 200 a second, six or seven turrets' worth, for $220 all in.
6. **Shamblers paid 1 skull for 24 HP**; every other kind pays 6-9 times more per HP, so the first nights pay $15 and
   $74 and the first gun waits until night 3.
7. **A "100 %" hit on Jerry's sheet was not always a kill**: the sheet takes a share of the kind's listed HP, but each
   body rolls 85-115 % of it, so about 40 % of ferals took a second pistol shot.
8. **Bombers never ran faster than 2.8 m/s** (a speed clamp under their sprint).
9. **Nothing got deadlier late**: zombie damage was the same on night 20 as on night 2; the late nights were longer,
   not harder per minute.

## The curve

"Threat" is a weight per body (shambler 1, feral 1.3, drowned 1.6, leaper 1.8, spitter 2.2, soldier, spider and bomber
2.5, screamer 3, brute 4, demon 6, colossus and guardian 40) summed over the night. It is a rough guide, not a model:
the targets are that **no night is lighter than the one before** (rest nights hold level, within 3 %, and keep their
longer breathers), that the climb is steady (x1.0-1.4 a night after the teach nights), and that night 20 is the
heaviest by a clear step. Every night keeps its trick, its set pieces, its caves and its cadences (Ember Night,
colossus, guardian); only how many come and how many of them are specialists changes.

| n | act | bodies old > new | specialists % old > new | threat old (step) > new (step) | listed HP old > new | threat per body old > new |
|---|---|---|---|---|---|---|
| 1 | teach | 15 > 15 | 0 > 0 | 15 > 15 | 360 > 360 | 1.00 > 1.00 |
| 2 | teach | 50 > 50 | 16 > 16 | 52 (x3.47) > 52 (x3.47) | 1128 > 1128 | 1.05 > 1.05 |
| 3 | teach | 100 > 100 | 24 > 22 | 113 (x2.17) > 112 (x2.15) | 2474 > 2467 | 1.13 > 1.12 |
| 4 | build | 130 > 140 | 26 > 24 | 160 (x1.42) > 170 (x1.52) | 3454 > 3694 | 1.23 > 1.22 |
| 5 | build | 221 > 186 | 25 > 27 | 315 (x1.97) > 276 (x1.62) | 6464 > 5581 | 1.43 > 1.49 |
| 6 | build | 214 > 226 | 26 > 29 | 312 (x0.99) > 336 (x1.22) | 6246 > 6687 | 1.46 > 1.49 |
| 7 | build (rest) | 300 > 270 | 18 > 38 | 329 (x1.05) > 326 (x0.97) | 7190 > 6465 | 1.10 > 1.21 |
| 8 | build | 350 > 315 | 29 > 33 | 467 (x1.42) > 432 (x1.33) | 9718 > 8878 | 1.34 > 1.37 |
| 9 | build | 390 > 360 | 40 > 41 | 500 (x1.07) > 460 (x1.06) | 9672 > 8830 | 1.28 > 1.28 |
| 10 | build | 431 > 406 | 31 > 34 | 650 (x1.30) > 627 (x1.36) | 13398 > 12815 | 1.51 > 1.55 |
| 11 | test (rest) | 470 > 445 | 24 > 44 | 565 (x0.87) > 614 (x0.98) | 11962 > 11932 | 1.20 > 1.38 |
| 12 | test | 419 > 481 | 36 > 38 | 645 (x1.14) > 747 (x1.22) | 12830 > 14807 | 1.54 > 1.56 |
| 13 | test | 560 > 520 | 35 > 40 | 790 (x1.22) > 766 (x1.03) | 16248 > 15475 | 1.41 > 1.47 |
| 14 | test (rest) | 600 > 560 | 28 > 39 | 743 (x0.94) > 756 (x0.99) | 16416 > 15927 | 1.24 > 1.35 |
| 15 | test | 641 > 601 | 37 > 42 | 965 (x1.30) > 944 (x1.25) | 19254 > 18463 | 1.51 > 1.57 |
| 16 | test | 680 > 640 | 37 > 45 | 1012 (x1.05) > 1011 (x1.07) | 20770 > 20236 | 1.49 > 1.58 |
| 17 | test (rest) | 720 > 680 | 29 > 54 | 914 (x0.90) > 1025 (x1.01) | 18842 > 19098 | 1.27 > 1.51 |
| 18 | test | 632 > 721 | 40 > 48 | 1011 (x1.11) > 1232 (x1.20) | 20162 > 24075 | 1.60 > 1.71 |
| 19 | test | 810 > 790 | 41 > 52 | 1240 (x1.23) > 1322 (x1.07) | 25064 > 25930 | 1.53 > 1.67 |
| 20 | test | 851 > 861 | 47 > 58 | 1422 (x1.15) > 1575 (x1.19) | 28080 > 30289 | 1.67 > 1.83 |

Specialist counts per night (shamblers fill the rest; risers, packs and late kinds as before):

| n | kinds |
|---|---|
| 1 | - |
| 2 | feral 8 |
| 3 | feral 9, leaper 6, drowned 7 |
| 4 | feral 12, leaper 8, drowned 4, military 8, brute 2 |
| 5 | feral 15, leaper 9, drowned 6, military 7, brute 4, spider 9 |
| 6 | feral 16, leaper 12, drowned 7, military 12, brute 5, spider 7, spitter 7 |
| 7 | feral 57, leaper 19, drowned 19, bomber 8 |
| 8 | feral 24, leaper 14, drowned 8, military 24, brute 6, spider 8, spitter 6, screamer 3, bomber 10 |
| 9 | feral 80, leaper 26, drowned 7, military 14, spider 9, spitter 4, screamer 2, bomber 5 |
| 10 | feral 31, leaper 16, drowned 10, military 31, brute 24, spider 10, spitter 6, screamer 2, bomber 6 |
| 11 | feral 88, leaper 28, drowned 18, military 28, spider 14, spitter 7, screamer 4, bomber 7, demon 4 |
| 12 | feral 49, leaper 24, drowned 12, military 37, brute 12, spider 15, spitter 12, screamer 4, bomber 10, demon 7 |
| 13 | feral 54, leaper 26, drowned 13, military 54, brute 13, spider 15, spitter 20, screamer 3, bomber 9, demon 3 |
| 14 | feral 61, leaper 25, drowned 70, military 25, brute 6, spider 15, spitter 6, screamer 3, bomber 6, demon 3 |
| 15 | feral 66, leaper 33, drowned 13, military 44, brute 15, spider 50, spitter 11, screamer 7, bomber 11, demon 4 |
| 16 | feral 80, leaper 34, drowned 16, military 69, brute 18, spider 23, spitter 14, screamer 5, bomber 14, demon 14 |
| 17 | feral 160, leaper 53, drowned 25, military 36, brute 14, spider 29, spitter 11, screamer 7, bomber 25, demon 7 |
| 18 | feral 83, leaper 42, drowned 19, military 69, brute 42, spider 28, spitter 19, screamer 6, bomber 27, demon 11 |
| 19 | feral 111, leaper 50, drowned 22, military 87, brute 37, spider 37, spitter 22, screamer 7, bomber 22, demon 15 |
| 20 | feral 126, leaper 63, drowned 30, military 101, brute 45, spider 45, spitter 25, screamer 10, bomber 30, demon 24 |

On top of that, **zombies hit harder late**: from night 11 every hit a zombie lands on the player is
x(1 + 0.025 x (night - 10)): x1.025 on 11, x1.125 on 15, x1.25 on 20 (capped at x1.5 past 20). The ramp starts once
every gun is in the shop and the player's cash outruns the prices.

## The changes

| What | Before | After | Why | Who |
|---|---|---|---|---|
| Night totals and specialist counts | the table's "old" | the table's "new" | 1, 9 | Claude (CL-244) |
| Zombie damage to the player from night 11 | x1 | x(1 + 0.025 (n - 10)), x1.25 on 20 | 9 | Claude (CL-244) |
| Shambler skull | 1 | 2 | 6 | ChatGPT (GP-19955) |
| Late pay trim | x1 to night 10, x0.67 from 11 | x1 to night 8, then -4 % a night to x0.60 on 18 | 2 | ChatGPT |
| Rotary gun (minigun) sheet row | Jerry's row | x1.6 | 3 | ChatGPT |
| Breacher-12 (aa12) sheet row | Jerry's row | x1.4 | 3 | ChatGPT |
| Hit sheet base | the kind's listed HP | this body's own HP ("100 is the whole bar") | 7 | ChatGPT |
| Screamer shield | 3 % of a hit | 25 % of a hit | 4 | ChatGPT |
| Bomber top speed | 2.8 m/s | 4.0 m/s | 8 | ChatGPT |
| Watchman MG | 18 a round, blueprint $140 | 10 a round, blueprint $260 | 5 | ChatGPT |

D-87 (Jerry's friends' playtest, 2026-10-23): ferals walk at 6.0-7.6 m/s, top at 8.0, lunge at 9.0, and their sprinters run at 0.85-0.92 of the player's 11.8 m/s sprint. Shamblers, including their sprinters, take x0.75 speed on nights 1-2, rise evenly to x1.0 on night 14, and stay there afterward.

Not changed: the rest of Jerry's hit sheet (his New-Hit.xlsx), zombie HP, the guns' prices and stock nights, ammo
prices, gear, builds and turrets (other than the Watchman), the alive cap (48), the cadences, the set pieces and the
night 20 boss (one colossus; a second boss on the finale was considered and left out: the guardian's rules are tied to
the chalk cave and the story).

## Checking it

- t78 holds the night plan to this table (it held it to docs/specs/difficulty.md, updated with it).
- The tests that pin the changed numbers move with them, each with `--review` (rule 13).
- Antigravity runs the suite again on Jerry's PC before the checkpoint; ChatGPT a night-20 bench (frame time: the
  new night 20 has 11 more bodies and more specialists).
- Jerry's playthrough, 24-25 October: his notes (`Night Packs/Night Pack Notes.txt`) tune it from there.

Undo: every change is its own constant; the old values are in this page.
