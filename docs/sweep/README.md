# The world sweep

The placement and transition sweeps (Jerry, 2026-10-24, D-88): `docs/world-design.md`. Claude runs them location by location (CL-256); Antigravity shoots each place on Jerry's GPU (AG-122).

**How it works.** `tools/sweep/sweep.js` (run by `tools/sweep/run.mjs`, real three.js) lists every placed thing in the world with its footprint, its height and the ground under it, and flags suspects: floating, hanging off a slope, sunk, things through each other, branches through roofs, colliders with nothing to see, solid things with no collider, things on trails or in water, prompts walled in, trees in a grid. `tools/sweep/report.mjs` writes the numbers per place (`docs/sweep/numbers/`) and a camera job per place (`review/sweep/jobs/`). The findings, judged by eye against the sweeps and the 15 rules, are written by hand in `docs/sweep/<place>.md`, with the fixes.

This sweep: 2026-10-25 00:54 UTC, 1994 things (12641 pieces), 430 trees, 150 rocks, 1175 colliders. Suspects: 11 hangs, 1 water, 17 overlap, 15 invisible-wall, 24 no-collider, 7 on-trail, 3 reach, 9 even-spacing.

## Places

| Place | Strong | All | Things | Kinds | Numbers |
| --- | --- | --- | --- | --- | --- |
| Northeast Cave | 6 | 8 | 46 | invisible-wall, reach, overlap | [numbers](numbers/cave-3.md) |
| Northwest Cave | 4 | 4 | 4 | invisible-wall | [numbers](numbers/cave-1.md) |
| East Cave | 4 | 4 | 5 | invisible-wall | [numbers](numbers/cave-4.md) |
| cordon-gate | 2 | 10 | 60 | overlap, no-collider | [numbers](numbers/h-cordon-gate.md) |
| Trapper Camp | 2 | 6 | 46 | hangs, overlap, on-trail | [numbers](numbers/camp-trapper.md) |
| Hikers Camp | 1 | 2 | 26 | on-trail | [numbers](numbers/camp-hikers.md) |
| FOB Threshold (the HQ) | 1 | 1 | 44 | on-trail | [numbers](numbers/hq.md) |
| Watchtower | 1 | 1 | 2 | on-trail | [numbers](numbers/tower.md) |
| Dock | 1 | 1 | 21 | on-trail | [numbers](numbers/dock.md) |
| Bridge 2 | 1 | 1 | 67 | on-trail | [numbers](numbers/bridge-2.md) |
| Hut 3 (fuel depot) | 1 | 1 | 26 | reach | [numbers](numbers/hut-3.md) |
| Southwest Cave | 1 | 1 | 3 | invisible-wall | [numbers](numbers/cave-6.md) |
| Graveyard | 0 | 3 | 30 | overlap, no-collider | [numbers](numbers/graveyard.md) |
| Cabin 1 | 0 | 1 | 42 | overlap | [numbers](numbers/cabin-1.md) |
| Ambulance wreck (medical convoy) | 0 | 1 | 9 | overlap | [numbers](numbers/wreck-1.md) |
| Radio mast | 0 | 1 | 43 | reach | [numbers](numbers/mast.md) |
| Ranger Camp | 0 | 0 | 52 |  | [numbers](numbers/camp-ranger.md) |
| Cabin 2 | 0 | 0 | 41 |  | [numbers](numbers/cabin-2.md) |
| Bridge 1 | 0 | 0 | 7 |  | [numbers](numbers/bridge-1.md) |
| Hut 1 | 0 | 0 | 7 |  | [numbers](numbers/hut-1.md) |
| Hut 2 | 0 | 0 | 11 |  | [numbers](numbers/hut-2.md) |
| Utility truck wreck | 0 | 0 | 33 |  | [numbers](numbers/wreck-2.md) |
| North Cave | 0 | 0 | 6 |  | [numbers](numbers/cave-2.md) |
| South Cave | 0 | 0 | 9 |  | [numbers](numbers/cave-5.md) |
| coldwater-foundation | 0 | 0 | 4 |  | [numbers](numbers/h-coldwater-foundation.md) |

## The wild (50 m squares)

| Square | Strong | All | Kinds | Numbers |
| --- | --- | --- | --- | --- |
| -150,-100 | 2 | 15 | hangs, no-collider | [numbers](numbers/wild-m150_m100.md) |
| 200,50 | 1 | 1 | hangs | [numbers](numbers/wild-200_50.md) |
| -100,-200 | 1 | 1 | hangs | [numbers](numbers/wild-m100_m200.md) |
| 150,-150 | 1 | 1 | hangs | [numbers](numbers/wild-150_m150.md) |
| -150,50 | 1 | 1 | invisible-wall | [numbers](numbers/wild-m150_50.md) |
| -100,-100 | 0 | 5 | no-collider | [numbers](numbers/wild-m100_m100.md) |
| -150,150 | 0 | 2 | hangs | [numbers](numbers/wild-m150_150.md) |
| 200,100 | 0 | 2 | no-collider, water | [numbers](numbers/wild-200_100.md) |
| -50,200 | 0 | 1 | hangs | [numbers](numbers/wild-m50_200.md) |
| 200,-100 | 0 | 1 | hangs | [numbers](numbers/wild-200_m100.md) |
| 200,-50 | 0 | 1 | hangs | [numbers](numbers/wild-200_m50.md) |
| 50,100 | 0 | 1 | overlap | [numbers](numbers/wild-50_100.md) |

## Tree spacing (Clark-Evans R per 80 m square: about 1 is natural, under 1 clustered, over 1.45 a grid)

80, 80: 1.46 (22 trees) **grid-like** · 160, -80: 1.38 (23 trees) · -160, 0: 1.32 (26 trees) · 0, -80: 1.33 (9 trees) · 80, 160: 1.41 (17 trees) · 80, 0: 1.35 (17 trees) · 0, 0: 1.19 (15 trees) · 80, -160: 1.18 (15 trees) · 80, -80: 1.38 (9 trees) · -80, 80: 1.57 (13 trees) **grid-like** · 0, -240: 1.64 (9 trees) **grid-like** · -80, 160: 1.41 (16 trees) · -80, -160: 1.21 (16 trees) · 0, -160: 1.58 (12 trees) **grid-like** · -80, 0: 1.28 (13 trees) · 0, 160: 1.22 (10 trees) · -160, 80: 1.31 (15 trees) · 160, 80: 1.45 (16 trees) · -160, 160: 1.46 (10 trees) **grid-like** · 160, -160: 1.29 (13 trees) · 160, 0: 1.34 (20 trees) · 0, 80: 1.37 (15 trees) · 160, 160: 1.51 (12 trees) **grid-like** · -80, -80: 1.42 (9 trees) · 80, 240: 1.38 (9 trees) · -240, 0: 1.43 (9 trees) · 240, 80: 1.51 (10 trees) **grid-like** · 240, 0: 1.87 (9 trees) **grid-like** · 0, 240: 1.84 (8 trees) **grid-like**
