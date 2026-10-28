# Antigravity — AG-140 Report: East Cave Flanks & Trapper Cache Approach — 2026-10-27

## 1. East Cave Flanks (`review/sweep/jobs/cave-4-flank.json` → `review/sweep/cave-4-flank/`)

Executed `node tools/camera.mjs job review/sweep/jobs/cave-4-flank.json` on Jerry's RTX 5080 GPU through the game-test slot:
- `review/sweep/cave-4-flank/sheet.jpg` (3x2 contact sheet)
- `review/sweep/cave-4-flank/cave4-oblique.png` (`cam -178.97, 5.42, -15.54 -> -186.99, 4.92, -8.70 fov 55`)
- `review/sweep/cave-4-flank/cave4-side.png` (`cam -187.00, 5.42, -18.32 -> -186.58, 4.92, -9.27 fov 55`)
- `review/sweep/cave-4-flank/cave4-side-close.png` (`cam -184.74, 4.92, -13.62 -> -187.15, 4.92, -9.69 fov 55`)
- `review/sweep/cave-4-flank/cave4-high.png` (`cam -183.91, 10.92, -14.76 -> -186.92, 3.92, -8.21 fov 55`)
- `review/sweep/cave-4-flank/cave4-other-side.png` (`cam -183.56, 5.42, 3.41 -> -185.95, 4.92, -5.32 fov 55`)
- `review/sweep/cave-4-flank/cave4-front.png` (`cam -176.88, 4.42, -8.79 -> -186.76, 4.92, -7.22 fov 55`)

### Visual Notes on `cave-4` Flanks
- In `cave4-oblique.png`, `cave4-side.png`, `cave4-side-close.png`, and `cave4-high.png`, the `+x` (south-left) cheek join between the grey stone arch ring and the green hillside shows a pale sawtooth sliver / unbacked edge along the outer rib, plus one small moss tuft floating inside the dark mouth opening.

---

## 2. Trapper Cache Approach (`objective:trapper-cache`, `docs/world-design.md` Rule 8)

### Root Cause
1. **Offending Camp Piece (`r = 0.48 m`, `y = 0.44..2.09 m` at `(-38.43, 45.73)`)**:
   - In `assets/world/landmark-details.js:689-694` (`kind === 'camp'`, `variant % 3 === 2`), the trapper camp's hide-curing frame sits at camp-local `(x = 4.5, z = -2.8)` with collider `solid(4.5, -2.8, 0.48, y, 1.65)`.
   - When `campYawOffTrail` (`index.html:5527`) turned `campsites[2]` (`(-33.49, 43.81)`) by `-8 * Math.PI / 12` to `yaw = 2.9561 rad`, it only scored `buildCampsiteDetails` (`assets/world/campsites.js`) and not `buildLandmarkDetails`, rotating the curing frame to world `(-38.43, 45.73)` — **`0.78 m`** from `objective:trapper-cache`'s `objectiveSitesFrom` approach at `(-38.06, 46.42)`.
2. **Why It Reappeared in 3/3 Cloud Runs and 1/3 PC Runs**:
   - `setupTrapperMission` (`game/trapper-path.js:1048`) was called lazily from `updateTrapper(dt)` (`index.html:29977`) and only spliced colliding solids from `worldSolids`, leaving them inside `s.landmark.spawnColliders` and `s.landmark.colliders` (and leaving the curing frame's triangles in `s.landmark.mesh.geometry`).
   - Whenever `updateTrapper(dt)` ran on a pre-match menu frame before `startMatch()` (`index.html:58402`), `startMatch()` restored `lm.spawnColliders` back into `worldSolids` after `trapper.built` was already `true`.

### Fix (`game/trapper-path.js`, `game/trapper-path.test.mjs`, `index.html`)
- In `setupTrapperMission` (`game/trapper-path.js:1048-1102`), when any camp collider falls inside the trapper yard or within `nearCl6` (`(-37.49, 47.81)` / `(-38.06, 46.42)`):
  - Strips the piece's triangles (`hypot(cxTri - lx0, czTri - lz0) <= s.radius + 0.43`) directly from `s.landmark.mesh.geometry` so the curing frame mesh is skipped together with its collider.
  - Removes the collider from `worldSolids`, `s.landmark.colliders`, and `s.landmark.spawnColliders` so `startMatch()` never re-inserts it.
- In `index.html:29927`, invokes `buildTrapperMission` immediately during world setup once `objectiveProps` is constructed.
- Added unit test coverage in `game/trapper-path.test.mjs` (`5/5` passing).

### Verification Across 3 Runs (`qa/2026-10-27-AG-140/proof.json`)

| Run | `name` | `place` | `x, z` | `openOf12` | `ring` | `standClear` | `crowd` | `solidsNearCount` |
| :---: | --- | --- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1 / 3** | `objective:trapper-cache` | `camp-trapper` | `-37.49, 47.81` | `12 / 12` | `0.95 m` | **`true`** | `[]` | `0` |
| **2 / 3** | `objective:trapper-cache` | `camp-trapper` | `-37.49, 47.81` | `12 / 12` | `0.95 m` | **`true`** | `[]` | `0` |
| **3 / 3** | `objective:trapper-cache` | `camp-trapper` | `-37.49, 47.81` | `12 / 12` | `0.95 m` | **`true`** | `[]` | `0` |

### Screenshots
- `qa/2026-10-27-AG-140/trapper-yard-head.png` — The trapper yard's head (`(-25.49, 41.21)`): cellar bulkhead doors, threshold cache, and Row 7 approach clear.
- `qa/2026-10-27-AG-140/trapper-cl6-approach.png` — The `objective:trapper-cache` (`(-38.06, 46.42)`) approach: curing frame mesh and collider cleanly skipped while the adjacent repair bench and log stack remain intact.
- `qa/2026-10-27-AG-140/sheet.jpg` — Side-by-side contact sheet of both trapper shots.
