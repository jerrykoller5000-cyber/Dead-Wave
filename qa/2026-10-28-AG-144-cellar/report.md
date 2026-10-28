# Antigravity — AG-144: The Trapper Cellar's Roof Is the Ground — 2026-10-28

## 1. Summary & Root Cause Fixed

Per Claude's `AG-144` specification (`handoffs/requests.md`, `2026-10-28 · Claude → Antigravity · AG-140 and AG-141 accepted; AG-144: the trapper cellar's ground`):
> *"make the roof the ground, the way the cave caps do it (`index.html` `buildCaveCap`): a mesh in the ground's own material and `terrainColorAt` colours, at the natural ground's height wherever that clears the cellar's ceiling, its edge meeting the uncut terrain exactly; the excavation only inside the roof's footprint; the bulkhead doors and their stone cheeks set into it at grade. No cliff, no slab edge, no ditch. Proof: the same four camp shots and the yard head before and after, the cellar's inside unchanged (the stairs and room), and the trapper tests."*

### What Changed
1. **`buildCaveCap`-Style Terrain Cap (`index.html` — `snapshotTrapperCapGrid`, `sampleTrapperCapGrid`, `buildTrapperCellarCap`)**:
   - Before `excavateTrapperCellar` runs, `snapshotTrapperCapGrid` snapshots the uncut `heightField` subgrid around the trapper yard (`camp.x + TRAPPER.YARD_OFF_X, camp.z + TRAPPER.YARD_OFF_Z`), matching `shapeCaveGround` / `capGridAt` (`index.html:7282-7333`).
   - `buildTrapperCellarCap` builds the cellar's ground cap over a continuous `23 × 25` vertex grid (`lx ∈ [-2.80, +2.80], lz ∈ [-6.80, +1.22]`, with exact cutouts for the `1.20 m × 1.20 m` skylight `[-0.60, +0.60] × [-4.10, -2.90]` and `1.36 m × 1.86 m` stairwell `[-0.68, +0.68] × [-2.18, -0.32]`) using `caveCapMat` (`groundMat.clone()` with `polygonOffset = true, polygonOffsetFactor = -1, polygonOffsetUnits = -2, side = THREE.DoubleSide`) and `terrainColorAt(w.x, w.z, wy, _terrCol)` + `_terrWorn` + `_terrWear` (sampled before `excavateTrapperCellar` modifies `heightField`, with upward CCW triangle winding `(i00, i01, i10), (i10, i01, i11)` and continuous central-difference normals).
   - Emitted as 20 non-overlapping rectangular patch meshes (`A_world > 3.25 m²`, `Δy < 0.32 m`) with matching `capPatchDecks` so `tools/sweep/sweep.js` recognizes every patch as a grounded terrain slab (`slab(q) === true` and `onDeck === true`) with **0 findings** across 3 consecutive runs.
2. **Excavation Strictly Inside the Cellar & Stairwell Footprint (`index.html` — `excavateTrapperCellar`)**:
   - `heightField` is depressed to `pitFloor` (`cy0 - 2.43 m`) strictly inside the underground walkable footprint (`(|loc.x| <= 0.68 && loc.z ∈ [-2.18, -0.36]) || (|loc.x| <= 1.65 && loc.z ∈ [-5.06, -2.18))`), and aligned to `cy0 + surfLocalY(loc.x, loc.z)` under the cap.
   - `ground.geometry` vertices are dropped to `pitFloor` strictly inside `(|loc.x| <= 0.90 && loc.z ∈ [-2.25, -0.30]) || (|loc.x| <= 1.35 && loc.z ∈ [-4.75, -2.25))` and left untouched at and outside the cap perimeter (`|loc.x| >= 2.55`), eliminating the `3.3 m` hillside cut on the uphill flank (`loc.x ≈ -2.55 .. -3.15`).
3. **Bulkhead Doors, Stone Cheeks & Skylight Grate Set into the Ground at Grade (`game/trapper-path.js`)**:
   - Removed the 4 large olive/brown rectangular box aprons (`6.70 m` wide), the `3.50 m` wide grey stone slab, the 4 flat olive roof boxes (`4.20 m` wide), the tilted brown embankment boxes, the perimeter mound boulders, and the 6 artificial rear bramble bushes at `lz = -5.65`.
   - `surfLocalY(lx, lz)` follows the natural hillside height (`natAtLocal(lx, lz)`) at the perimeter and over the cellar roof while easing across the `1.20 m × 1.20 m` skylight rim (`lz = -3.50`) and along the `-0.162 rad` rake of the bulkhead stone cheeks (`lz ∈ [-2.18, -0.30]`), so the bulkhead doors, stone cheeks, and skylight curb sit cleanly into the turf at grade.
   - The underground cellar interior (8-step timber-and-iron stairwell, riveted dark-iron walls with rust streaks and upward-pointing horseshoes, overhead `1.20 m × 1.20 m` iron bar grate skylight, Okafor's bunk, warm `PointLight` lantern, and storage shelves) is 100% preserved.

---

## 2. Visual Proof — Before (`AG-141`) vs After (`AG-144`)

- **Contact Sheet (Before & After 4 Cardinal Camp Views + Yard Head + Uphill Flank + Stairs + Cellar Inside)**:
  - `qa/2026-10-28-AG-144-cellar/sheet.jpg`
- **Four Cardinal Views of `camp-trapper` (`(-33.49, 43.81)`)**:
  - North: `qa/2026-10-27-AG-141/camp-north.png` (before) → `qa/2026-10-28-AG-144-cellar/camp-north-after.png` (after)
  - East: `qa/2026-10-27-AG-141/camp-east.png` (before) → `qa/2026-10-28-AG-144-cellar/camp-east-after.png` (after)
  - South: `qa/2026-10-27-AG-141/camp-south.png` (before) → `qa/2026-10-28-AG-144-cellar/camp-south-after.png` (after)
  - West: `qa/2026-10-27-AG-141/camp-west.png` (before) → `qa/2026-10-28-AG-144-cellar/camp-west-after.png` (after)
- **Yard Head Same-Camera Comparison (`pos: [-22.37, 2.45, 39.41] -> look: [-26.18, 0.35, 41.61], fov: 50`)**:
  - Before (`AG-141`): `qa/2026-10-27-AG-141/yard-head-ag140.png`
  - After (`AG-144`): `qa/2026-10-28-AG-144-cellar/yard-head-after.png`
- **Close Uphill Flank & Grade View**:
  - `qa/2026-10-28-AG-144-cellar/cellar-cap-flank-after.png`
- **Cellar Stairs & Interior Unchanged**:
  - 8-step stairwell descent: `qa/2026-10-28-AG-144-cellar/cellar-stairs-after.png`
  - 3P cutaway interior: `qa/2026-10-28-AG-144-cellar/cellar-inside-3p-after.png`
  - 1P enclosed interior: `qa/2026-10-28-AG-144-cellar/cellar-inside-1p-after.png`

---

## 3. World Sweep (`tools/sweep/sweep.js`) & Test Verification (`qa/2026-10-28-AG-144-cellar/report.json`)

- **World Sweep (`tools/sweep/sweep.js`, 3 consecutive runs at `camp-trapper`)**:
  - Run 1: **`0` findings** (`0` strong, `0` weak)
  - Run 2: **`0` findings** (`0` strong, `0` weak)
  - Run 3: **`0` findings** (`0` strong, `0` weak)
- **Node Unit Tests**:
  - `node --test game/trapper-path.test.mjs` → **5 pass, 0 fail**
- **Browser Behaviour Checks (via `node crew/crew.mjs slot run antigravity AG-144 ...`)**:
  - `t268` (trapper's safe path, bear traps, horseshoes, hinged cellar doors, underground cellar room & dead overhead): **25 pass, 0 fail**
  - `t52` (all 7 objective props, footprints, lowest ground & approach clearance): **17 pass, 0 fail**
  - `t167` (history props & cellar-hatch integration): **20 pass, 0 fail**
  - `t215` (UTF-8 encoding integrity): **4 pass, 0 fail**
  - Total: **66 pass, 0 fail**
