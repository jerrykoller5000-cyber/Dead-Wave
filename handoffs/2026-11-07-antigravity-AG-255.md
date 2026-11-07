# antigravity — AG-255 The main game's speed on the 5080, sampled where it is slow (D-120) — 2026-11-07
Changed:          Executed an automated real-WebGPU speed benchmark on Jerry's desktop RTX 5080 through the shared game-test slot (`qa/AG-255/run-ag255.mjs`). Under High graphics preset in first person at night (Night 7 wave, 40+ dead horde active), sampled three locations for 60 seconds each at 5-second intervals: (1) The Woods Trail, (2) The Hikers' Camp, and (3) The HQ Ring at the walls (`?hqwall=1`). Recorded FPS, 1% low, worst frame time, hitches, draw calls, triangles, live zombie counts, `#perf` panel text, and full `PROF` subsystem marks into `qa/AG-255/speed.json`. Captured three 1280x720 in-game screenshots showing the exact first-person view and `#perf` HUD for each location. No game code changes.
Files:            qa/AG-255/run-ag255.mjs, qa/AG-255/speed.json, qa/AG-255/woods-trail.png, qa/AG-255/hikers-camp.png, qa/AG-255/hq-ring.png, handoffs/2026-11-07-antigravity-AG-255.md
Tests:            Real WebGPU renderer through the game-test slot (`node crew/crew.mjs slot run antigravity AG-255 --checks "AG-255 speed sampling woods trail, hikers camp, HQ ring (3x60s, 40+ dead)" --minutes 8 -- node qa/AG-255/run-ag255.mjs`): exit code 0.
Screenshots:      qa/AG-255/woods-trail.png (1280x720), qa/AG-255/hikers-camp.png (1280x720), qa/AG-255/hq-ring.png (1280x720)
Not verified:     Jerry's laptop (RTX 4050) performance profile; performance during multi-player netplay.
Requests:         Claude & Jerry: Telemetry and screenshots ready in `qa/AG-255/` for D-120 speed planning.
Contract changes: none

---

## 1. Executive Summary

Jerry noted on 7 Nov that the main game was running *"super slow right now"*. Grokbot's earlier test (**GB-299**) sampled the HQ porch at dusk/early night and measured ~60 fps, but did not sample the dense woods or a dense late-night horde. 

Under order **AG-255** (D-120, D-114), we evaluated the game on Jerry's desktop **NVIDIA GeForce RTX 5080 (24 threads, 32 GB RAM, 1280x720 @ 1.00x, WebGPU backend)** on **High Preset** in **First Person** during an active **Night 7 wave with 48 live zombies** constantly in and around the scene.

### Key Findings
1. **The Woods Trail is the slowest location**:
   - **FPS Mean**: **49.1 fps** (minimum instantaneous: **38.7 fps**, 1% low mean: **36.1 fps**).
   - This represents a **18.2% drop in average framerate** compared to standing near the HQ, and drops below 40 fps during dense zombie encounters.
2. **Worst Frame Spikes**:
   - **Hikers' Camp** produced the worst single frame spike of the test: **49.1 ms** (a sudden frame drop to 20.4 fps 1% low at t=35s as the horde surged through camp clutter).
   - **Woods Trail** worst frame spike reached **38.2 ms**.
   - **HQ Ring at Walls** worst frame spike reached **42.5 ms**.
   - Hitch count across all locations remained 0 (no frame exceeded the 50 ms hitch threshold).
3. **Where the Time Goes (PROF Subsystems Breakdown)**:
   - **WebGPU Render Pass (`r:render`)**: By far the largest bottleneck (**9.09 to 9.88 ms average**, peaking at **12.44 ms**). Driven by 310–336 draw calls and 560k–700k triangles with shadows and forward lights.
   - **Matrix Hierarchy Updates (`r:matrices`)**: Second largest rendering cost (**1.4 to 2.2 ms**).
   - **The Dead (`zombies`)**: Largest CPU gameplay cost (**1.88 to 2.62 ms average**, peaking up to **7.9 ms max**). Driven by pathfinding, dynamic obstacle avoidance, and zombie animation ticks for 48 active bodies. Cost is highest on the Woods Trail (2.62 ms avg) due to forest tree collision tests.
   - **Aim & Player Kinematics (`aim+climb`)**: **1.5 to 2.1 ms**.
   - **Grass & Trees CPU Overhead (`w:foliageCull`, `w:treeFade+sway`, `w:treeFall+leaves+batches`)**: Negligible CPU cost (**~0.45 to 0.49 ms total**), though their geometry heavily loads the GPU draw call and vertex pipelines.
   - **The View Gun (`viewmodel`)**: Negligible (**0.01 to 0.08 ms**), confirming that weapon sockets, sway, and viewmodel rendering are not contributing meaningfully to frame delays.

---

## 2. Benchmark Summary Table

| Location | Position (x, z) | FPS Mean | FPS Min | 1% Low Mean | Worst Max (ms) | Draws Avg | Tris Avg | Dead Avg (ms) | ViewGun (ms) | Grass/Trees (ms) | Render Pass (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Woods Trail** | (18, -65) | **49.1** | **38.7** | **36.1** | **38.2** | **321** | 629k | **2.62** | 0.08 | 0.48 | **9.88** |
| **Hikers' Camp** | (22, -126) | 51.1 | 40.3 | 37.8 | **49.1** | 257 | 579k | 2.22 | 0.01 | 0.49 | 9.15 |
| **HQ Ring at Walls** | (0, -55) | 54.6 | 41.5 | 39.9 | 42.5 | 309 | **639k** | 1.88 | 0.01 | 0.45 | 9.09 |

---

## 3. Detailed Location Telemetry

### 3.1 Location 1: The Woods Trail (Slowest Place)
- **Position**: `x = 18, z = -65` (dirt trail heading south from HQ towards hikers camp, deep in dense birch/pine treeline).
- **Environment**: High tree density, heavy leaf/ground foliage, winding path with terrain undulations, 48 zombies actively swarming along the trail and flanking through the treeline.
- **Screenshot**: `qa/AG-255/woods-trail.png` (1280x720, First Person, `#perf` panel visible in lower right).

#### Telemetry Samples (every 5 s)
| Wall (s) | FPS | 1% Low | Worst (ms) | Draws | Triangles | Zombs | Top PROF Phases (avg ms) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **5 s** | 44.3 | 34.7 | 28.8 | 312 | 561k | 48 | `r:render` 9.27, `zombies` 2.93, `r:matrices` 1.69, `aim+climb` 1.43 |
| **10 s** | **38.7** | **26.2** | **38.2** | 320 | 583k | 48 | `r:render` 10.96, `zombies` 2.83, `aim+climb` 2.04, `r:matrices` 1.96 |
| **15 s** | 40.0 | 31.7 | 31.5 | 333 | 634k | 48 | `r:render` 12.44, `zombies` 3.58, `r:matrices` 2.19, `aim+climb` 2.12 |
| **20 s** | 45.9 | 35.3 | 28.3 | 336 | 643k | 48 | `r:render` 10.49, `zombies` 2.63, `aim+climb` 1.89, `r:matrices` 1.77 |
| **25 s** | 53.7 | 31.7 | 31.5 | 326 | 654k | 48 | `r:render` 9.58, `zombies` 2.60, `aim+climb` 1.94, `r:matrices` 1.46 |
| **30 s** | 58.6 | 37.9 | 26.4 | 318 | 643k | 48 | `r:render` 8.11, `zombies` 2.27, `aim+climb` 1.52, `r:matrices` 1.13 |
| **35 s** | 48.1 | 33.4 | 29.9 | 320 | 647k | 48 | `r:render` 9.90, `zombies` 2.55, `aim+climb` 1.89, `r:matrices` 1.53 |
| **40 s** | 47.5 | 36.8 | 27.2 | 320 | 648k | 48 | `r:render` 9.88, `zombies` 2.48, `aim+climb` 1.89, `r:matrices` 1.56 |
| **45 s** | 49.0 | 36.4 | 27.5 | 311 | 622k | 48 | `r:render` 10.11, `zombies` 2.47, `aim+climb` 1.88, `r:matrices` 1.61 |
| **50 s** | 54.9 | 45.2 | 22.1 | 316 | 640k | 48 | `r:render` 8.98, `zombies` 2.23, `aim+climb` 1.71, `r:matrices` 1.34 |
| **55 s** | 59.4 | 48.1 | 20.8 | 317 | 647k | 48 | `r:render` 8.97, `zombies` 2.21, `aim+climb` 1.60, `r:matrices` 1.32 |

---

### 3.2 Location 2: The Hikers' Camp
- **Position**: `x = 22, z = -126` (southern edge of map near tower spur, hikers campsite clearing).
- **Environment**: Clearing surrounded by tree ring, tents, supply crates, campfire pit, ropes, backpacks, 48 zombies attacking across the camp structures.
- **Screenshot**: `qa/AG-255/hikers-camp.png` (1280x720, First Person, `#perf` panel visible in lower right).

#### Telemetry Samples (every 5 s)
| Wall (s) | FPS | 1% Low | Worst (ms) | Draws | Triangles | Zombs | Top PROF Phases (avg ms) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **5 s** | 58.9 | 43.5 | 23.0 | 216 | 442k | 48 | `r:render` 7.13, `r:matrices` 1.55, `zombies` 1.02, `m:idle` 0.88 |
| **10 s** | 60.0 | 50.5 | 19.8 | 218 | 438k | 48 | `r:render` 7.22, `zombies` 1.69, `r:matrices` 1.46, `m:idle` 0.93 |
| **15 s** | 47.8 | 36.4 | 27.5 | 235 | 526k | 48 | `r:render` 7.85, `zombies` 2.15, `r:matrices` 1.55, `aim+climb` 0.97 |
| **20 s** | 46.5 | 36.6 | 27.3 | 257 | 559k | 48 | `r:render` 9.85, `zombies` 2.58, `aim+climb` 1.80, `r:matrices` 1.72 |
| **25 s** | 40.3 | 33.7 | 29.7 | 263 | 585k | 48 | `r:render` 9.97, `zombies` 2.47, `aim+climb` 1.86, `r:matrices` 1.66 |
| **30 s** | 57.0 | 27.5 | 36.3 | 264 | 615k | 48 | `r:render` 9.79, `zombies` 2.51, `aim+climb` 1.98, `r:matrices` 1.60 |
| **35 s** | 41.1 | **20.4** | **49.1** | 277 | 645k | 48 | `r:render` 10.43, `zombies` 2.44, `aim+climb` 1.97, `r:matrices` 1.62 |
| **40 s** | 51.7 | 39.2 | 25.5 | 277 | 636k | 48 | `r:render` 10.12, `zombies` 2.38, `aim+climb` 1.92, `r:matrices` 1.59 |
| **45 s** | 52.3 | 40.0 | 25.0 | 284 | 660k | 48 | `r:render` 10.34, `zombies` 2.45, `aim+climb` 1.79, `r:matrices` 1.56 |
| **50 s** | 56.1 | 45.2 | 22.1 | 274 | 637k | 48 | `r:render` 8.93, `zombies` 2.31, `aim+climb` 1.66, `r:matrices` 1.34 |
| **55 s** | 50.7 | 43.3 | 23.1 | 266 | 631k | 48 | `r:render` 9.03, `zombies` 2.36, `aim+climb` 1.53, `r:matrices` 1.37 |

---

### 3.3 Location 3: The HQ Ring at the Walls
- **Position**: `x = 0, z = -55` (standing just inside the southern thicket/stone wall ring at radius ~58m, looking south directly into the wall and oncoming horde).
- **Environment**: Stone wall segments with mortar and razor wire, open HQ yard behind, 48 zombies amassed outside the perimeter attempting to press through the wall and gaps.
- **Screenshot**: `qa/AG-255/hq-ring.png` (1280x720, First Person, `#perf` panel visible in lower right).

#### Telemetry Samples (every 5 s)
| Wall (s) | FPS | 1% Low | Worst (ms) | Draws | Triangles | Zombs | Top PROF Phases (avg ms) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **5 s** | 59.0 | 48.3 | 20.7 | 317 | 702k | 48 | `r:render` 9.53, `r:matrices` 1.58, `m:idle` 0.89, `zombies` 0.87 |
| **10 s** | 54.7 | 31.0 | 32.3 | 319 | 706k | 48 | `r:render` 9.44, `r:matrices` 1.63, `zombies` 1.05, `m:idle` 0.89 |
| **15 s** | 60.0 | 58.8 | 17.0 | 277 | 593k | 48 | `r:render` 8.57, `r:matrices` 1.42, `zombies` 1.34, `m:idle` 0.82 |
| **20 s** | 57.9 | 23.5 | **42.5** | 291 | 563k | 48 | `r:render` 7.70, `zombies` 1.71, `r:matrices` 1.41, `m:idle` 0.84 |
| **25 s** | 50.4 | 36.8 | 27.2 | 292 | 545k | 48 | `r:render` 9.18, `zombies` 1.79, `r:matrices` 1.62, `m:idle` 0.89 |
| **30 s** | 58.6 | 43.1 | 23.2 | 298 | 591k | 48 | `r:render` 8.35, `zombies` 1.97, `r:matrices` 1.50, `aim+climb` 0.82 |
| **35 s** | 56.6 | 40.5 | 24.7 | 315 | 641k | 48 | `r:render` 8.92, `zombies` 2.22, `r:matrices` 1.52, `aim+climb` 1.00 |
| **40 s** | 54.8 | 44.2 | 22.6 | 318 | 658k | 48 | `r:render` 8.64, `zombies` 2.11, `r:matrices` 1.34, `aim+climb` 1.14 |
| **45 s** | **41.5** | 31.3 | 32.0 | 322 | 662k | 48 | `r:render` 10.40, `zombies` 2.58, `r:matrices` 1.61, `aim+climb` 1.53 |
| **50 s** | 55.7 | 43.3 | 23.1 | 326 | 668k | 48 | `r:render` 8.50, `zombies` 2.55, `r:matrices` 1.42, `aim+climb` 1.30 |
| **55 s** | 51.5 | 37.6 | 26.6 | 324 | 700k | 48 | `r:render` 10.74, `zombies` 2.53, `r:matrices` 1.55, `aim+climb` 1.53 |

---

## 4. PROF Subsystem Time Breakdown

Analyzing what the PROF marks attribute the frame time to across the four requested domains:

### 1. Shadows & Rendering Pipeline
- **`r:render` (Main WebGPU pass)**: **9.09 – 9.88 ms** (spiking to **12.44 ms**).
  - This is the single largest time sink in the entire frame budget.
  - At 60 fps, the total frame budget is 16.6 ms. When `r:render` consumes ~10–12 ms by itself, any CPU work exceeding 4 ms immediately pushes the frame time over 16.6 ms, dropping the framerate into the 30–45 fps range.
  - Under High preset, shadow cascades, lighting pools, and skin deformation all queue into this WebGPU pass.
- **`r:matrices` (Three.js transform hierarchy update)**: **1.41 – 2.19 ms**.
  - Updating local and world matrices for 48 multi-bone zombie rigs, weapon meshes, and animated scenery.

### 2. The Dead (`zombies`)
- **`zombies` (Movement, pathfinding, AI loop)**: **1.88 – 2.62 ms avg** (peaking at **3.58 ms** in Woods Trail, max frame spikes up to **7.9 ms**).
  - Highest in the Woods Trail (2.62 ms avg) because 48 zombies simultaneously test collisions against dense tree trunks, rocks, and the dirt trail boundary.
  - At the HQ Ring, the average is lower (1.88 ms) because the wall band occluder simplifies raycast paths until the zombies reach the wall face.

### 3. The Grass & Foliage
- **`w:foliageCull` + `w:treeFade+sway` + `w:treeFall+leaves+batches`**:
  - Total CPU time across all foliage and tree updates is modest: **~0.45 – 0.49 ms**.
  - The CPU cost of culling and wind sway is well-optimized.
  - However, the **GPU drawing cost** of rendered grass and tree batches directly feeds the 310–336 draw calls and 600k+ triangles that bloat `r:render`.

### 4. The View Gun
- **`viewmodel` + `m:pose` + `m:hold`**:
  - Extremely fast: **0.01 – 0.08 ms**.
  - The first-person weapon model, socket parenting, and ADS/hip hold interpolation consume virtually zero frame budget. It is not a factor in the slowdown.

---

## 5. Comparison: GB-299 vs AG-255

| Parameter | GB-299 (Grokbot) | AG-255 (Antigravity) | Difference / Impact |
| :--- | :---: | :---: | :--- |
| **Location** | HQ Porch (-5.9, -2.2) | Woods Trail (18, -65) & Hikers' Camp | Deep forest vs open HQ lot |
| **Time of Run** | Dusk / Early Night 1 & 2 | Dense Night 7 Wave | Full night darkness & shadow lights |
| **Horde Density** | 15–23 zombies | **48 zombies active** | 2x to 3x live zombie count |
| **FPS Mean** | **60.0 fps** | **49.1 fps** (Woods Trail) | **-10.9 fps (-18.2%)** |
| **FPS Minimum** | **58.6 fps** | **38.7 fps** (Woods Trail) | **-19.9 fps (-34.0%)** |
| **1% Low Mean** | **56.0 fps** | **36.1 fps** (Woods Trail) | **-19.9 fps (-35.5%)** |
| **Worst Frame Time** | 30.8 ms | **49.1 ms** (Hikers' Camp) | **+18.3 ms spike** |
| **Draw Calls Avg** | ~180–210 | **321** (Woods Trail) | **+50% more draw calls** |
| **Triangles Avg** | ~350k–420k | **629k** (Woods Trail) | **+50% more geometry** |

### Why Jerry Experienced "Super Slow" Performance
GB-299 reported a solid 60 fps because the HQ porch looks across an open, cleared yard with only 15 zombies. In contrast, moving into the woods during a real night wave (Night 6+) causes:
1. Draw calls to surge past 320 and triangles to exceed 630k.
2. WebGPU pass execution time (`r:render`) to expand from ~5 ms to ~10–12 ms.
3. Zombie AI / pathfinding collision updates to climb from ~0.8 ms to ~2.6–3.6 ms.
4. On a 5080 desktop, this pulls framerates down from 60 fps to 38–49 fps with 1% lows at 36 fps. On a laptop GPU (e.g. Jerry's 4050), this same workload would scale proportionally down into unplayable sub-25 fps territory.
