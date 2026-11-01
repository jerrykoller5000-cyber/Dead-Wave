# AG-179 GPU Visual & Architectural Inspection Report
**Hardware:** NVIDIA GeForce RTX 5080 (D3D12 / WebGPU Dawn backend)  
**Date:** 2026-11-01  
**Inspector:** Antigravity (Gemini 4 Argon High)  
**Targets Evaluated:**  
1. **Cursor CU-205**: The four camps moved to Claude's coordinates (`campsites.0` rangers, `campsites.1` hikers, `campsites.2` trapper, `sheds.2` fuel depot).
2. **Cursor CU-206**: The woods mask, canopy thickness, clearing radii, instanced understory (brush, saplings, logs), and sightline reductions.
3. **ChatGPT GP-20003**: The distant skyline pulls (trapper chimney smoke, fuel depot column, hikers circling crows, mast red beacon, four-light verification).

---

## Executive Summary & Verdict: 5.0 / 5.0 PASS

All three deliverables were verified on real RTX 5080 WebGPU hardware under actual match conditions with the active world pipeline.

- **CU-205 (The Four Camps Moved)**: **5.0 / 5.0 PASS**. Verified the rangers' camp at `(128, 0)`, the hikers' camp at `(22, -126)` by the fire tower, the trapper's camp at `(-12, 140)` north across the river, and the fuel depot at `(-116, 10)` east along the road toward the mast. Captured approach, yard, and roof perspectives for each. Confirmed the hikers' first-aid kit hangs at `(34.87, 15.45, -120.81)` in a tree at `(36.81, 10.06, -120.56)`, exactly 5.00 m up from the ground, on completely dry terrain with `waterDepth = 0.00` (zero water clipping or river immersion).
- **CU-206 (The Woods Mask & Density)**: **5.0 / 5.0 PASS**. Verified that default world generation yields 2,132 trees with dense instanced templates beyond the HQ shadow square. Verified clearings at each place with a 24 m perimeter around the HQ, a bare mast hilltop, and clean verges along all trails. Verified 3 instanced understory draws (`understory:brush` with 467 instances, `understory:sap` with 250 instances, `understory:log` with 149 instances) kept completely off trails. Mathematical raycast sightline analysis verified:
  - HQ Yard: **1 of 12** places open (the dock at 104.0 m; all other 11 sites occluded by trees/terrain).
  - HQ Roof: **2 of 12** places open (the graveyard at 126.7 m and cabin:1 at 113.2 m; all others occluded).
- **GP-20003 (Skyline Pulls & Four Lights)**: **5.0 / 5.0 PASS**.
  - **Trapper Chimney**: Soft grey plume (`0x92958f`, opacity 0.50) rising 44 m from the cabin's rotated stovepipe (`-3.52, -3.15` in cabin space), wind-bent with the game's wind vector; active at noon and dusk; completely ceases at night (`count = 0`).
  - **Fuel Depot Column**: Dark industrial column (`0x292b2a`, opacity 0.55); full capacity (15 puffs, width 2.2) while generator lead is active; automatically thins to capacity 5, width 1.5 once `fuelRun.read().done` fires via `TT.worldChangeDbg.pour()`.
  - **Hikers Crows**: 7 body instances + 14 wing instances orbiting at `+28 m` above the camp with animated wingbeats; active at noon and overcast; completely absent at night (`daylight = false`).
  - **Mast Red Beacon**: Above canopy at `+15.3 m` (`0xff2416`, scale 2.3). Story-gated: unlit before relay repair (`relayUp = false`); active and pulsing with manual distance fade once `setRelayUpDbg(true)`, cleanly visible from the HQ roof through the 65 m night fog.
  - **Four-Light Progression**: Verified High Noon, Overcast, Dusk, and Night against D-89 visual standards. Zero light leaking, proper fog blending, crisp silhouettes.

---

## Detailed Findings & Measurements

### 1. CU-205 Four Camps

| Camp Name | POI Entity | Author Coordinates (x, z) | Measured World (x, y, z) | Approach Shot | Yard View | Roof View | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Rangers' Camp** | `campsites.0` | `(128, 0)` | `(128.00, -3.85, 0.00)` | `camps-rangers-approach.png` | `camps-rangers-from-yard.png` | `camps-rangers-from-roof.png` | Clean approach from east spur; tents face clearing; cache stands at `(123.0, 4.0)`. |
| **Hikers' Camp** | `campsites.1` | `(22, -126)` | `(22.00, 9.83, -126.00)` | `camps-hikers-approach.png` | `camps-hikers-from-yard.png` | `camps-hikers-from-roof.png` | Sits on elevated plateau by fire tower; tents oriented clear of trail. |
| **Trapper's Camp** | `campsites.2` | `(-12, 140)` | `(-12.00, 4.10, 140.00)` | `camps-trapper-approach.png` | `camps-trapper-from-yard.png` | `camps-trapper-from-roof.png` | North across river; cabin, fenced yard, and stovepipe sitting firmly in ground. |
| **Fuel Depot** | `sheds.2` | `(-116, 10)` | `(-116.00, 0.35, 10.00)` | `camps-fuel-approach.png` | `camps-fuel-from-yard.png` | `camps-fuel-from-roof.png` | Along road east to mast; shed door faces approach; tanks clear of road bed. |

#### Hikers' First-Aid Kit Tree Verification:
- **Bag Position**: `(34.87, 15.45, -120.81)`
- **Tree Position**: `(36.81, 10.06, -120.56)` (Camp-tree variant, ~16.8 m from camp centre)
- **Hang Height**: `5.00 m` above ground (`sampleHeight = 10.45 m`)
- **Water Depth**: `0.00 m` (Dry ground; lake is 110 m away, river is >120 m away).
- **Shot**: `camps-hikers-kit-tree.png` shows the bag hanging cleanly from the authored bough with proper rope stub and fray geometry.

---

### 2. CU-206 Woods Mask, Density & Sightlines

- **Total Tree Count**: 2,132 trees (exact match to CU-206 target).
- **Batching & Performance**: 2,056 trees batched into 29 template instances across 58 draw calls; 76 near trees in live shadow square; frame time average 0.85 ms.
- **Understory Mesh Distribution**:
  - `understory:brush`: 467 instances
  - `understory:sap`: 250 instances
  - `understory:log`: 149 instances
  - Total Understory Draws: 3 instanced draw calls (zero CPU allocation per frame).
- **Clearing Dimensions**: 24 m circular clearing around HQ; 12-15 m clearings around camps; 20 m bare summit on mast hill; 2.2 m + 1.5 m verge along trails.
- **Sightlines Audit (Raycast vs Ground, Canopies, HQ Walls)**:
  - **Yard Eye `(0.00, -1.47, -6.50)`**: **1 / 12 Open**
    - `dock`: OPEN (dist 104.0 m)
    - `tower`, `graveyard`, `cabin:0`, `cabin:1`, `radio-repair`, `convoy`, `ranger-cache`, `hikers-cache`, `trapper-cache`, `fuel-depot`, `wreck-salvage`: BLOCKED (10 by tree canopy, 1 by ground ridge).
  - **Roof Eye `(0.00, 3.83, 0.00)`**: **2 / 12 Open**
    - `graveyard`: OPEN (dist 126.7 m)
    - `cabin:1`: OPEN (dist 113.2 m)
    - All other 10 places: BLOCKED by dense canopy.

---

### 3. GP-20003 Skyline Pulls & Four Lights

| Element | Day Appearance | Night Appearance | Wind / Distance Response | Gating / State Transition | Shot References |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trapper Chimney Smoke** | Soft grey instanced plume (`0x92958f`, opacity 0.50) rising 44 m | Completely absent (`count = 0`, mesh hidden) | Bends with `wind.dirX/Z * (0.12 + strength * 0.16)`; smooth sine dispersal | Aligned to rotated stovepipe `(-3.52, -3.15)` | `skyline-trapper-noon.png`, `skyline-trapper-night.png` |
| **Fuel Depot Smoke Column** | Dark industrial column (`0x292b2a`, opacity 0.55) rising 33 m | Remains active as night marker | Bends with wind; manual fade at peak | Full capacity (15 puffs) -> thinned capacity (5 puffs, width 1.5) on `fuelRun.read().done` | `skyline-fuel-noon-thick.png`, `skyline-fuel-noon-thinned.png` |
| **Hikers Circling Crows** | 7 bodies + 14 wings orbiting at `+28 m` radius 8.5 m | Completely absent (`daylight = false`) | Orbits at `t * 0.14`, wing flap angle `0.2 + 0.47 * sin(5.1t)` | Gated on `!isNight` | `skyline-crows-noon.png`, `skyline-crows-night.png` |
| **Mast Red Beacon** | Unlit during day / unpowered | Red glowing disc (`0xff2416`, scale 2.3) | Visible through 65 m night fog via custom distance attenuation `1 - (d-45)/260` | Story-gated: off before relay (`relayUp = false`), active after `setRelayUpDbg(true)` | `skyline-mast-night-off.png`, `skyline-mast-night-on.png` |

#### Four-Light Photographic Progression:
- **Noon (`worldTime = 0.42`)**: Sharp directional sunlight, crisp tree shadows, atmospheric depth haze, smoke plumes legible against sky and canopy (`skyline-fourlights-noon.png`).
- **Overcast (`worldTime = 0.42, overcast = 1`)**: Diffuse ambient sky, reduced specular contrast, smoke silhouettes provide strong navigational cues (`skyline-fourlights-overcast.png`).
- **Dusk (`worldTime = 0.73`)**: Warm horizon sunset illumination, long terrain shadows, beacon begins gradual activation (`skyline-fourlights-dusk.png`).
- **Night (`worldTime = 0.88`)**: Deep blue/black sky with stars, ground fog active, crows and trapper smoke absent, mast red beacon clearly visible above canopy (`skyline-fourlights-night.png`).

---

## Contact Sheet Gallery

1. **`ag179-sheet1-camps.png` (2x7 grid, 4.1 MB)**: The Four Camps Moved (CU-205)
   - Approach trails, yard perspectives, and roof perspectives for Rangers, Hikers, Trapper, and Fuel Depot, plus Hikers kit tree close-up.
2. **`ag179-sheet2-woods.png` (2x3 grid, 1.6 MB)**: The Woods Mask & Understory (CU-206)
   - HQ yard clearing at noon/dusk, HQ roof canopy overlook at noon/dusk, trail view into understory at noon/dusk.
3. **`ag179-sheet3-skyline.png` (2x5 grid, 2.6 MB)**: Skyline Pulls & Four Lights (GP-20003)
   - Trapper smoke noon vs night, fuel column thick vs thinned, crows circling noon vs night, mast beacon night off vs on, four-light progression.

---

## Conclusion & Recommendations

1. **Cursor (CU-205 & CU-206)**: Both tasks are 100% verified. The new camp placements feel balanced, natural, and well-integrated into the trails. The woods mask dramatically enhances immersion by enclosing the HQ yard while preserving navigation through the trail network and sightline clearings.
2. **ChatGPT (GP-20003)**: The skyline pulls successfully solve the "lost in the woods" navigational problem without cluttering the screen or spoiling POI discovery. The distance-attenuated mast beacon fix completely solves the night fog issue.
3. **No regressions or performance drops detected**: Tree batching holds ~60 fps with 0.85 ms average frame time on RTX 5080 WebGPU.
