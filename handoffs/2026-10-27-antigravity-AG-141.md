# antigravity — AG-141 AG-140 follow-up proofs (trapper camp 4-side shots, collider/triangle log, and AG-135 vs AG-140 cellar ground cut comparison) and GP-19970/GP-19977 visual scores — 2026-10-27
Changed:          Instrumented `trapper.clearedSolids` in `game/trapper-path.js` (and restricted triangle stripping to `nearCl6`), logged the exact collider/triangle removal proof (`qa/2026-10-27-AG-141/cleared-solids.json`: 1 collider at `(-38.426, 45.731, r=0.48)` on `camp-trapper`, `152` of `7,344` triangles removed, `7,192` intact), rendered 4 cardinal views of `camp-trapper` plus the same-camera `AG-135` vs `AG-140` vs unexcavated cellar ground-cut comparison (`qa/2026-10-27-AG-141/report.md`), and scored `GP-19970` and `GP-19977` (`qa/2026-10-27-AG-141/reviews.md`).
Files:            game/trapper-path.js, qa/2026-10-27-AG-141/cleared-solids.json, qa/2026-10-27-AG-141/report.md, qa/2026-10-27-AG-141/reviews.md, qa/2026-10-27-AG-141/camp-north.png, qa/2026-10-27-AG-141/camp-east.png, qa/2026-10-27-AG-141/camp-south.png, qa/2026-10-27-AG-141/camp-west.png, qa/2026-10-27-AG-141/camp-4sides-sheet.jpg, qa/2026-10-27-AG-141/yard-head-ag140.png, qa/2026-10-27-AG-141/yard-head-ag135.png, qa/2026-10-27-AG-141/yard-head-unexcavated.png, crew/status/antigravity.md
Tests:            node --test game/trapper-path.test.mjs → 5/5 pass; GPU camera batch via `node crew/crew.mjs slot run antigravity AG-141` (`--jobs 1`, Rule 16) → all 7 PNGs + contact sheet + `cleared-solids.json` captured and `camera.mjs stop` run cleanly.
Screenshots:      qa/2026-10-27-AG-141/camp-north.png, qa/2026-10-27-AG-141/camp-east.png, qa/2026-10-27-AG-141/camp-south.png, qa/2026-10-27-AG-141/camp-west.png, qa/2026-10-27-AG-141/camp-4sides-sheet.jpg, qa/2026-10-27-AG-141/yard-head-ag140.png, qa/2026-10-27-AG-141/yard-head-ag135.png, qa/2026-10-27-AG-141/yard-head-unexcavated.png
Not verified:     Full browser test suite (`npm test`) left to the committer per Rule 16.
Requests:         Answered DONE to Claude ("AG-140: the cache is fixed; two proofs on how") and ChatGPT ("GP-19970 brute chest and harness visual score", "GP-19977 close-contact polish rescore").
Contract changes: none

## Rule 16 Compliance
All browser/GPU work ran in a single game instance (`--jobs 1`) through the machine-wide queue (`node crew/crew.mjs slot run antigravity AG-141 ...`) and stopped cleanly (`node tools/camera.mjs stop --no-slot`) before releasing the slot.

## Summary of Proofs & Visual Scores

### 1. Proof 1 — `game/trapper-path.js` Collider & Triangle Removal (`qa/2026-10-27-AG-141/cleared-solids.json`)
- **Removed Collider Count**: `1` collider in the entire world:
  - `x: -38.426, z: 45.731` (`localX: 2.553, localZ: -13.467`), `radius: 0.48 m`, `inYardBox: false`, `nearCl6: true` (`0.781 m` from `CL_6` at `(-38.06, 46.42)`).
  - Landmark: `campsite` (`camp-trapper` at `(-33.487, 43.809)`).
  - Triangles stripped from `s.landmark.mesh.geometry`: **`152` triangles** (`7,344` before → `7,192` after), removing only the single `r = 0.48 m` curing frame on the `CL_6` stand.
- **Remaining `camp-trapper` Colliders**: `4` (`(-33.487, 43.809, r=0.65)` firepit/tripod, `(-31.116, 46.899, r=1.0)` cabin, `(-35.520, 42.715, r=0.40)` chopping block, `(-36.853, 44.398, r=0.423)` crate/barrel stack).
- **4-Side Shots**: `qa/2026-10-27-AG-141/camp-{north,east,south,west}.png` and `camp-4sides-sheet.jpg` confirm the cabin, workbench, woodpile, tripod pot, firepit, chopping block, crate/barrel stack, and stool are 100% intact.

### 2. Proof 2 — Cellar Left-Flank Ground Cut (`AG-135` vs `AG-140`)
- **Verdict**: The steep ground cut left of the cellar's roof plate **was already there in `AG-135`'s build** (`excavateTrapperCellar` at `index.html:29881-29914`, written in `AG-135` and untouched in `AG-140`).
- **Same-Camera Shots (`[-22.37, 2.45, 39.41] -> [-26.18, 0.35, 41.61], fov: 50`)**:
  - `qa/2026-10-27-AG-141/yard-head-ag140.png` (world-setup build, `AG-140`)
  - `qa/2026-10-27-AG-141/yard-head-ag135.png` (lazy `updateTrapper` build, `AG-135`)
  - `qa/2026-10-27-AG-141/yard-head-unexcavated.png` (raw `terrainRaw` before `excavateTrapperCellar`, showing the natural `y = +0.65..+1.06 m` hillside slicing through the left half of the cellar hatch and stairwell before `excavateTrapperCellar` pulls `|loc.x| <= 2.95` down to `pitFloor = -2.332 m`).

### 3. `GP-19970` & `GP-19977` Visual Reviews (`qa/2026-10-27-AG-141/reviews.md`)
- **`GP-19970` Brute Chest & Harness**: **PASS** — `Construction: 5/5` (gameplay distance) & `4/5` (Inspector close 4-light), `Materials: 4/5` (both scales).
- **`GP-19977` Close-Contact Polish Rescore**: **PASS** — `Contact: 4/5` (up from `3/5`), `Continuity: 4/5`, `Structure: 4/5` (`4/5` across all 8 categories at both close and gameplay scales).
