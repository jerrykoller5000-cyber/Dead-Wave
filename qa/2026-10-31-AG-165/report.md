# QA Report: AG-165 — The Trapper's Path, Sealed and Wider (Jerry J45)

**Date**: 2026-10-31  
**Agent**: Antigravity (Gemini 4 Argon High)  
**Host**: Jerry's PC (DESKTOP-2KHQF9J, NVIDIA GeForce RTX 5080)  
**Task**: AG-165 · The trapper's path, sealed and wider (J45)  
**Status**: DONE (Verified on Real GPU, Unit Tests 5/5 PASS, Browser Suite t268 27/27 PASS)

---

## 1. Executive Summary & Jerry's Notes (J45)

Jerry's J45 directive:
> *"Players can clip through the cellar door at the end of the trapper's path and get stuck; seal the back half completely so the only way in is the bear-trap route. Four traps wide instead of two would be more fun."*

Board Specification:
> *"The cellar's back half sealed so nobody clips in or gets stuck (only the bear-trap route reaches the hatch), and the rows four stones wide instead of two (still one safe stone a row, marked by its horseshoe); the tests and the dev command updated."*

This task expands the trapper's stepping-stone yard from 2 stones wide to 4 stones wide (32 stones total across 8 rows, with 32 matching fence posts and 8 forged iron horseshoes), expands the leaf bed and hidden bear traps to match, and completely seals the back half and flanks of the cellar mound behind heavy split-log fence rails, stacked logs, thorny brambles, and 30+ solid surface colliders so players cannot clip into the cellar doors from the rear or sides.

---

## 2. Key Architecture & Geometry Changes

### A. Four Stones & Four Posts Per Row (32 Stones, 32 Posts)
- **Geometry**:
  - 8 rows at `lz = [8.45, 7.55, 6.65, 5.75, 4.85, 3.95, 3.05, 2.15]`.
  - 4 stone columns per row at `lx = [-1.35, -0.45, 0.45, 1.35]` (spacing 0.90 m, radius `STONE_R = 0.38`).
  - 4 posts per row at `lx = [-1.80, -0.90, 0.90, 1.80]` with backing plaques facing player approach (+Z).
  - Walkable corridors between consecutive rows are completely open and unobstructed.
  - Safe stone pattern: randomly dealt pattern across 4 columns (`0 = far-left`, `1 = mid-left`, `2 = mid-right`, `3 = far-right`). Exactly one forged iron horseshoe per row is nailed to the post matching that row's safe stone.
- **Leaf Bed & Hidden Traps**:
  - Expanded `BED_HALF_W = 1.65` (covers stones from -1.35 to +1.35).
  - 5 hidden bear trap columns across the width (`x = [-1.55, -0.90, 0.0, 0.90, 1.55]`).
  - Stepping off safe stones into the leaves or onto wrong stones snaps a bear trap (25 damage, 3 s hold, calls 4–6 zombies).

### B. Cellar Back-Half Complete Seal (Zero Clipping)
- **Root Cause**: Previously, fence colliders only reached `lz = 0.42`; behind `lz = 0.42` to `-5.5`, cellar room colliders were underground only (`y1 = cy0 - 0.05`). A player in the woods could walk onto the cellar mound from the side/rear, step on the sloped bulkhead doors, clip into the stairwell, and get permanently trapped behind the locked doors.
- **Sealing Structure**:
  - **Flank Enclosure**: Extended split-log fence rails, heavy posts, dense thorny brambles, and solid surface colliders (`r = 0.36`, `y0 = cy0 - 0.10`, `y1 = cy0 + 1.65`) along `lx = -2.15` and `lx = +2.15` from `lz = 0.42` all the way back to `lz = -5.70`.
  - **Rear Perimeter Wall**: Continuous heavy log fence line, posts, brambles, and 5 solid surface colliders spanning the full rear boundary at `lz = -5.70` from `lx = -2.15` to `lx = +2.15`.
  - **Bulkhead Retaining Colliders**: Surface colliders across the rear of the door frame at `lz = -2.25`.
  - **Total Yard Colliders**: Increased from 20 to 80 colliders. Nobody can enter the cellar area from the woods or drop into the stairwell from the rear/flanks; the only entrance is through the bear-trap route.

### C. Dev Commands & Helpers
- Dev command `site trapper pattern` updated to map 4 columns (`['L', 'ML', 'MR', 'R']` / 1–4).
- `syncTrapperHorseshoes` accurately tracks matching post positions for all 4 columns.
- `trapper.toLocal` and `trapper.toWorld` exposed for coordinate conversion.

---

## 3. Test Suite Verification

### A. Unit Tests (`node --test game/trapper-path.test.mjs`)
- **Result**: **5/5 PASS** (0 failures, 85 ms)
  1. `✔ trapper-path deals 8 rows of four-column safe stones and horseshoes, new each run (0.95ms)`
  2. `✔ walking the safe stones from row 0 to row 7 unlocks the hatch without snapping (1.40ms)`
  3. `✔ a wrong stone or stepping into the leaves snaps a bear trap (25 damage, 3 s hold, 4-6 dead) (0.34ms)`
  4. `✔ calledForDay scales from 4 on day 1 to 6 on day 20, and helpers work (0.15ms)`
  5. `✔ buildTrapperYardParts constructs 8-row trapper yard with 32 stones, 32 posts, horseshoes, leaf traps and sealed back half colliders (16.64ms)`

### B. Browser Suite (`tools/tests/t268.js` on RTX 5080)
- **Result**: **27/27 PASS** (0 failures)
  - `PASS the trapper mission is built at campsites.2`
  - `PASS eight rows of four stepping stones (32), 32 side posts, and 8 horseshoes`
  - `PASS fence, bramble, and rear seal colliders close both sides and cellar back half (80)`
  - `PASS each row's horseshoe sits on the post beside that row's safe stone (3,2,0,1,3,2,0,0)`
  - `PASS the trapper cache is locked before crossing the safe path`
  - `PASS AG-135: cellar doors start shut with iron locking bar and door collider in place`
  - `PASS rear fence seal colliders block rear entry into cellar back half (15)`
  - `PASS flank fence seal colliders enclose the cellar mound (15)`
  - `PASS objectives cannot reach the hatch while locked (locked)`
  - `PASS at the locked hatch: "Trapped path."`
  - `PASS wrong stone snaps a bear trap (snap)`
  - `PASS bear trap deals 25 damage (100 -> 75)`
  - `PASS bear trap holds the marine for 3 s (3.00s)`
  - `PASS bear trap calls 4-6 dead (4 spawned)`
  - `PASS sprung bear trap mesh appears at the foot (1)`
  - `PASS held prompt shows bear trap timer: "Bear trap! (3s)"`
  - `PASS row 0 safe stone advances progress to 1`
  - `PASS stepping off the stones into the leaves snaps a trap (leaves)`
  - `PASS walking all eight safe stones unlocks the cellar hatch`
  - `PASS AG-135: unlocking folds open both iron-lined cellar door leaves and clears the stair collider`
  - `PASS cellar hatch is now reachable (null)`
  - `PASS trapper lock prompt clears once unlocked`
  - `PASS AG-135: trapper.cellarSpot is exposed inside the underground cellar (-2.05)`
  - `PASS AG-135: marine stands on the iron-lined cellar floor (-2.05 vs -2.05)`
  - `PASS AG-135: dead on the cellar roof walk straight past overhead (moved 1.56m at dy=2.21m)`
  - `PASS reset deals a new safe pattern, re-closes the cellar doors, and re-syncs horseshoes`
  - `PASS no uncaught errors`

---

## 4. Visual Inspection & Contact Sheet

Contact sheet generated at:
`qa/2026-10-31-AG-165/sheet.jpg` (213,454 bytes, 1440x590 JPEG).

### Shots Overview:
1. `shots/01-trapper-gate.png`: Eye-level entry view at yard gate entrance (`site trapper`) looking down the wide yard with 4 stones per row in the leaf bed, posts with mounted iron horseshoes, and side fence rails.
2. `shots/02-trapper-overhead-rows.png`: Elevated overhead perspective showing all 8 rows across 4 columns (32 stones total), posts with horseshoes, and leaf bed.
3. `shots/03-cellar-back-sealed.png`: Rear and flank view of the cellar mound at `lz = -5.70`, showing the continuous split-rail fence, stacked logs, brambles, and colliders completely sealing off the back half.
4. `shots/04-rear-clipping-blocked.png`: Camera in the woods behind the cellar mound showing the player stopped against the sealed perimeter fence/colliders (unable to penetrate or reach the cellar doors from the rear).
5. `shots/05-cellar-doors-open.png`: Unlocked cellar bulkhead doors folded wide open with crossbar removed, looking down the stairwell into the cellar.
6. `shots/06-inside-cellar.png`: Interior view inside the iron-lined underground cellar at `site trapper cellar` looking at the bunk, shelves, iron stove, and stone walls.

---

## 5. Files Touched
- `game/trapper-path.js` (4-column geometry, 32 stones, 32 posts, sealed back-half fence & colliders, 4-col classifyPoint & bridges)
- `game/trapper-path.test.mjs` (5 unit tests updated for 4 columns, 32 stones, 32 posts, rear seal)
- `tools/tests/t268.js` (integration suite updated for 4-stone width, 32 stones, 32 posts, rear seal checks)
- `index.html` (`site trapper pattern` banner 4-column display, `syncTrapperHorseshoes` post matching)
- `qa/2026-10-31-AG-165/run-ag165.mjs` (GPU verification runner)
- `qa/2026-10-31-AG-165/build-sheet.py` (contact sheet builder)
- `qa/2026-10-31-AG-165/sheet.jpg` (contact sheet)
- `qa/2026-10-31-AG-165/t268-output.txt` (browser test output)
- `qa/2026-10-31-AG-165/report.md` (this report)
