# The world sweep

The placement and transition sweeps (Jerry, 2026-10-24, D-88): `docs/world-design.md`. Claude runs them location by location (CL-256); Antigravity shoots each place on Jerry's GPU (AG-122).

**How it works.** `tools/sweep/sweep.js` (run by `tools/sweep/run.mjs`, real three.js) lists every placed thing in the world with its footprint, its height and the ground under it, and flags suspects: floating, hanging off a slope, sunk, things through each other, branches through roofs, colliders with nothing to see, solid things with no collider, things on trails or in water, prompts walled in, trees in a grid. `tools/sweep/report.mjs` writes the numbers per place (`docs/sweep/numbers/`) and a camera job per place (`review/sweep/jobs/`). The findings, judged by eye against the sweeps and the 15 rules, are written by hand in `docs/sweep/<place>.md`, with the fixes.

This sweep: 2026-10-27 21:00 UTC, 2031 things (13228 pieces), 430 trees, 150 rocks, 1209 colliders. Suspects: 3 hangs, 17 overlap, 1 branches, 15 hill-ring, 1 no-collider, 3 reach, 9 even-spacing.

## Places

| Place | Strong | All | Things | Kinds | Numbers |
| --- | --- | --- | --- | --- | --- |
| Northeast Cave | 1 | 8 | 46 | reach, overlap, hill-ring | [numbers](numbers/cave-3.md) |
| Trapper Camp | 1 | 2 | 76 | hangs, overlap | [numbers](numbers/camp-trapper.md) |
| cordon-gate | 0 | 9 | 60 | overlap | [numbers](numbers/h-cordon-gate.md) |
| Northwest Cave | 0 | 4 | 4 | hill-ring | [numbers](numbers/cave-1.md) |
| East Cave | 0 | 4 | 5 | hill-ring | [numbers](numbers/cave-4.md) |
| Ranger Camp | 0 | 1 | 53 | reach | [numbers](numbers/camp-ranger.md) |
| Cabin 1 | 0 | 1 | 42 | overlap | [numbers](numbers/cabin-1.md) |
| Graveyard | 0 | 1 | 30 | overlap | [numbers](numbers/graveyard.md) |
| Hut 3 (fuel depot) | 0 | 1 | 27 | overlap | [numbers](numbers/hut-3.md) |
| Ambulance wreck (medical convoy) | 0 | 1 | 9 | overlap | [numbers](numbers/wreck-1.md) |
| Radio mast | 0 | 1 | 44 | reach | [numbers](numbers/mast.md) |
| Southwest Cave | 0 | 1 | 3 | hill-ring | [numbers](numbers/cave-6.md) |
| FOB Threshold (the HQ) | 0 | 0 | 45 |  | [numbers](numbers/hq.md) |
| Hikers Camp | 0 | 0 | 28 |  | [numbers](numbers/camp-hikers.md) |
| Cabin 2 | 0 | 0 | 41 |  | [numbers](numbers/cabin-2.md) |
| Watchtower | 0 | 0 | 2 |  | [numbers](numbers/tower.md) |
| Dock | 0 | 0 | 21 |  | [numbers](numbers/dock.md) |
| Bridge 1 | 0 | 0 | 7 |  | [numbers](numbers/bridge-1.md) |
| Bridge 2 | 0 | 0 | 67 |  | [numbers](numbers/bridge-2.md) |
| Hut 1 | 0 | 0 | 7 |  | [numbers](numbers/hut-1.md) |
| Hut 2 | 0 | 0 | 11 |  | [numbers](numbers/hut-2.md) |
| Utility truck wreck | 0 | 0 | 34 |  | [numbers](numbers/wreck-2.md) |
| North Cave | 0 | 0 | 6 |  | [numbers](numbers/cave-2.md) |
| South Cave | 0 | 0 | 9 |  | [numbers](numbers/cave-5.md) |
| coldwater-foundation | 0 | 0 | 4 |  | [numbers](numbers/h-coldwater-foundation.md) |

## The wild (50 m squares)

| Square | Strong | All | Kinds | Numbers |
| --- | --- | --- | --- | --- |
| -150,-100 | 2 | 2 | hangs | [numbers](numbers/wild-m150_m100.md) |
| -100,0 | 0 | 2 | branches, no-collider | [numbers](numbers/wild-m100_0.md) |
| 50,100 | 0 | 1 | overlap | [numbers](numbers/wild-50_100.md) |
| -150,50 | 0 | 1 | hill-ring | [numbers](numbers/wild-m150_50.md) |

## Tree spacing (Clark-Evans R per 80 m square: about 1 is natural, under 1 clustered, over 1.45 a grid)

80, 80: 1.46 (22 trees) **grid-like** · 160, -80: 1.38 (23 trees) · -160, 0: 1.32 (26 trees) · 0, -80: 1.33 (9 trees) · 80, 160: 1.41 (17 trees) · 80, 0: 1.35 (17 trees) · 0, 0: 1.19 (15 trees) · 80, -160: 1.18 (15 trees) · 80, -80: 1.38 (9 trees) · -80, 80: 1.57 (13 trees) **grid-like** · 0, -240: 1.64 (9 trees) **grid-like** · -80, 160: 1.41 (16 trees) · -80, -160: 1.21 (16 trees) · 0, -160: 1.58 (12 trees) **grid-like** · -80, 0: 1.28 (13 trees) · 0, 160: 1.22 (10 trees) · -160, 80: 1.31 (15 trees) · 160, 80: 1.45 (16 trees) · -160, 160: 1.46 (10 trees) **grid-like** · 160, -160: 1.29 (13 trees) · 160, 0: 1.34 (20 trees) · 0, 80: 1.37 (15 trees) · 160, 160: 1.51 (12 trees) **grid-like** · -80, -80: 1.42 (9 trees) · 80, 240: 1.38 (9 trees) · -240, 0: 1.43 (9 trees) · 240, 80: 1.51 (10 trees) **grid-like** · 240, 0: 1.87 (9 trees) **grid-like** · 0, 240: 1.84 (8 trees) **grid-like**
