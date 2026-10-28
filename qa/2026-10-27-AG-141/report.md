# Antigravity — AG-141 (AG-140 Follow-Up Proofs & GP-19970 / GP-19977 Visual Scores) — 2026-10-27

## 1. Proof 1 — Trapper Clearing Collider & Triangle Log + 4-Side `camp-trapper` Shots

### Collider & Triangle Removal Log (`qa/2026-10-27-AG-141/cleared-solids.json`)
In `game/trapper-path.js`, `trapper.clearedSolids` logs every collider removed by the clearing loop (`(Math.abs(loc.x) < Math.max(rule.POST_X + 0.25, 2.2) && loc.z > -5.5 && loc.z < rule.ENTRY_Z + 0.6) || nearCl6(s.x, s.z, s.radius || 0)`) and restricts triangle stripping strictly to `nearCl6`. Across the entire world, **only 1 collider** is matched and removed:

| Field | Value |
| --- | --- |
| **World `(x, z)`** | `(-38.426, 45.731)` |
| **Trapper Local `(localX, localZ)`** | `(2.553, -13.467)` |
| **Radius** | `0.48 m` |
| **Match Branch** | `inYardBox: false`, `nearCl6: true` (`0.781 m` from `CL_6` cache stand at `(-38.06, 46.42)`) |
| **Landmark** | `campsite` (`camp-trapper` at `(-33.487, 43.809)`) |
| **Triangles Before** | `7,344` |
| **Triangles Removed** | **`152`** (the single `r = 0.48 m` wooden curing frame at `(-38.426, 45.731)`) |
| **Triangles After** | `7,192` |

### Remaining `camp-trapper` Colliders (`4` intact)
1. `(-33.487, 43.809)`, `r = 0.65 m` (`5.266 m` from `CL_6`) — firepit & tripod pot
2. `(-31.116, 46.899)`, `r = 1.00 m` (`6.961 m` from `CL_6`) — trapper cabin
3. `(-35.520, 42.715)`, `r = 0.40 m` (`4.492 m` from `CL_6`) — chopping block & axe
4. `(-36.853, 44.398)`, `r = 0.423 m` (`2.354 m` from `CL_6`) — crate & barrel stack

### Four Cardinal Shots of `camp-trapper` (`(-33.49, 43.81)`)
- North view: `qa/2026-10-27-AG-141/camp-north.png` (`cam: [-33.49, 5.20, 30.30] -> [-33.49, 1.20, 43.81], fov: 55`)
- East view: `qa/2026-10-27-AG-141/camp-east.png` (`cam: [-20.00, 5.20, 43.81] -> [-33.49, 1.20, 43.81], fov: 55`)
- South view: `qa/2026-10-27-AG-141/camp-south.png` (`cam: [-33.49, 5.20, 57.30] -> [-33.49, 1.20, 43.81], fov: 55`)
- West view: `qa/2026-10-27-AG-141/camp-west.png` (`cam: [-47.00, 5.20, 43.81] -> [-33.49, 1.20, 43.81], fov: 55`)
- Contact sheet: `qa/2026-10-27-AG-141/camp-4sides-sheet.jpg`

All four views confirm that the cabin, workbench, woodpile, tripod pot, firepit, chopping block, crate/barrel stack, and stool are 100% intact.

---

## 2. Proof 2 — Steep Ground Cut Left of the Cellar Roof Plate (`AG-135` vs `AG-140`)

### Verdict
The steep cut in the ground left of the cellar's roof plate **was already there in `AG-135`'s build** (`excavateTrapperCellar` at `index.html:29881-29914`, introduced in `AG-135` and untouched in `AG-140`).

### Same-Camera Comparison (`pos: [-22.37, 2.45, 39.41] -> look: [-26.18, 0.35, 41.61], fov: 50`)
1. **`AG-140` World-Setup Build**: `qa/2026-10-27-AG-141/yard-head-ag140.png`
2. **`AG-135` Lazy `updateTrapper` Build**: `qa/2026-10-27-AG-141/yard-head-ag135.png`
3. **Unexcavated `terrainRaw` Baseline (before `excavateTrapperCellar`)**: `qa/2026-10-27-AG-141/yard-head-unexcavated.png`

### Why It Happens
- As shown in `yard-head-unexcavated.png` and `cleared-solids.json` (`cellarTerrainVertices`), the natural hillside on the left (`locX < 0`, rising toward the trapper cabin at `(-31.12, 46.90)`) sits at `terrainRawY = +0.65 m .. +1.06 m`, whereas the trapper yard origin (`(-25.8, 42.0)`) sits at `cy0 = -0.10 m`. Without `excavateTrapperCellar`, the natural hillside triangles slice straight through the left half of the cellar hatch, stairwell, and roof plate (`yard-head-unexcavated.png`).
- `excavateTrapperCellar` (`AG-135`, `index.html:29905-29906`) pulls every polar terrain vertex with `Math.abs(loc.x) <= 2.95 && loc.z >= -6.95 && loc.z <= -0.45` down to `pitFloor = -2.332 m` (`cy0 - 2.43 m`).
- On the left flank (`locX < 0`), five polar vertices (`vi = 32939, 33452, 33965, 34478, 34991` at `locX = -2.485 .. -2.602 m`) are pulled down from `terrainRawY = +0.26 .. +0.98 m` to `-2.332 m` (`deltaY = -2.59 .. -3.31 m`), while the next ring of vertices just outside `|loc.x| <= 2.95` (`vi = 32938, 33451, 33964, 34477, 34990` at `locX = -3.01 .. -3.19 m`) stays at `+0.685 .. +1.062 m`. The triangles spanning between `locX ≈ -3.15 m` (`y ≈ +0.92 m`) and `locX ≈ -2.59 m` (`y = -2.332 m`) form the steep green cut visible along the left edge of the cellar roof plate in both `yard-head-ag135.png` and `yard-head-ag140.png`.
