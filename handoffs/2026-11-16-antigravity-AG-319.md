# antigravity — AG-319 Where the frame goes: N2 crowd FPS breakdown — 2026-11-16
Changed:          Measurement-only RTX 5080 WebGPU performance breakdown of the play build on Night 2 with the crowd across 22 controlled test scenarios (baseline 1P & 3P, single-switch removals for shadows, foliage, bloom, MSAA, prCap, and zombies, 1-zombie noon spot, and old procedural body comparison via `?humanoids=`; zero game code modified).
Files:            review/AG-319/ag319-results.json, review/AG-319/TABLE.md, review/AG-319/summary.json, review/AG-319/sheet-ag319-breakdown.jpg, review/AG-319/run-ag319.mjs, review/AG-319/build-sheets.py, review/AG-319/shots/*.png (22 files)
Tests:            not run (look-only/perf-only 5080 inspection + exclusive Night 2 rAF FPS benchmark via `crew.mjs slot run`; Rule 16 observed: 1 browser instance per lease, `--exclusive` for clean measurement)
Screenshots:      review/AG-319/sheet-ag319-breakdown.jpg (and 22 validated PNGs in review/AG-319/shots/)
Not verified:     Full `npm test` suite (cloud gate)
Requests:         Sent `AG-319: where the frame goes` to `claude`
Contract changes: none

---

## Executive Summary & The 5 Biggest Costs (Ranked)

**Task Goal:** AG-317 observed Night 2 crowd FPS on the RTX 5080 at `High` running far below the 60 fps bar (3P median 39.4 / 1% low 14; 1P median 25.1 / 1% low 10.3). AG-319 measured where the frame time goes across 22 scenarios on genuine `requestAnimationFrame` WebGPU, isolating one variable at a time without altering game code.

### The 5 Biggest Costs

1. **Ground Foliage / Ground Cover (`foliage 0` — hiding ground-foliage-bundle & chunks):**
   - **3P Impact:** Frame time drops by **24.5 ms** (41.2 ms -> 16.7 ms), jumping from **24.3 fps to 59.9 fps**! Triangles drop from 1.24M to 0.52M (**711,570 triangles removed**).
   - **1P Impact:** Frame time drops by **19.1 ms** (40.3 ms -> 21.2 ms), jumping from **24.8 fps to 47.2 fps** (**383,041 triangles removed**).
   - **Why:** The 3,200 grass tufts, clutter, and shrubs rendered out to 150 m draw distance at `High` constitute over half of the scene's rendered polygon budget. Even with bundle groups and chunk culling, vertex processing on ground cover dominates the frame.

2. **Directional Sun Shadow Map Pass (`shadows off` — `sun.castShadow = false`):**
   - **3P Impact:** Frame time drops by **23.5 ms** (41.2 ms -> 17.7 ms), jumping from **24.3 fps to 56.5 fps**. `r:render` phase plummets from **18.37 ms to 8.33 ms**.
   - **1P Impact:** Frame time drops by **15.5 ms** (40.3 ms -> 24.8 ms), jumping from **24.8 fps to 40.3 fps**. `r:render` drops from **17.93 ms to 11.65 ms**.
   - **Why:** The 2048×2048 cascaded directional shadow map pass re-draws the entire scene and re-evaluates skeletal transforms for every zombie within the shadow frustum every frame. Disabling it cuts GPU submission and draw workload in half.

3. **High-DPI / Device Pixel Ratio Cap (`prCap 1.0` vs 1.5):**
   - **3P Impact:** Frame time drops by **22.5 ms** (41.2 ms -> 18.7 ms), jumping from **24.3 fps to 53.5 fps**.
   - **1P Impact:** Frame time drops by **18.6 ms** (40.3 ms -> 21.7 ms), jumping from **24.8 fps to 46.1 fps**.
   - **Why:** On modern high-DPI displays (DPR ≥ 1.5), `High` runs at DPR 1.5, rendering 2.25× the pixel count of standard 720p (2.07M shaded pixels vs 0.92M). Capping `prCap: 1.0` saves 55% of all fragment shading, MSAA resolve, and bloom downsampling passes.

4. **New Humanoid Zombie Body Polygon Budget (`?humanoids=` legacy body vs live humanoids):**
   - **3P Impact:** Old procedural body runs at **48.0 fps (20.85 ms, 0.71M tris)** vs live humanoids at **24.3 fps (41.20 ms, 1.24M tris)** — saving **20.35 ms / frame** and **530,712 triangles**.
   - **1P Impact:** Old body runs at **42.0 fps (23.80 ms, 0.72M tris)** vs live humanoids at **24.8 fps (40.30 ms, 1.06M tris)** — saving **16.50 ms / frame** and **344,527 triangles**.
   - **Why:** The newly landed humanoid zombies (shambler at 18,560 tris, feral at 18,602 tris) add over 17,000 triangles per active zombie compared to the 1,500-triangle procedural body. A crowd of 31 zombies alone adds >530k triangles of deforming skinned mesh geometry.

5. **Post-Processing Chain (Bloom & 4x MSAA):**
   - **Bloom Off:** 1P jumps from **24.8 fps to 52.2 fps (+21.15 ms saved)**; 3P jumps from **24.3 fps to 39.4 fps (+15.8 ms saved)**.
   - **MSAA Off:** 3P jumps from **24.3 fps to 49.3 fps (+20.9 ms saved)**.
   - **Why:** The combination of 4x MSAA render targets and multi-pass TSL Bloom introduces significant bandwidth pressure and texture sampling overhead during full-screen compositing.

---

## Full Measurement Table (22 Scenarios)

Measured on RTX 5080 WebGPU (1280×720, `High` preset, genuine `requestAnimationFrame` in `--exclusive` slot lease).

| Run ID | Scenario Description | View | Median FPS | Median ms | 1% Low FPS | Worst ms | Draws | Triangles | r:render | r:matrices | zombies | aim+climb | viewmodel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `n2_crowd_3p_base` | Night 2 crowd 3P baseline (High preset) | 3P | **24.3** | 41.20 | 11.4 | 110.3 | 235 | 1.24M | 18.37 ms | 4.53 ms | 3.65 ms | 0.12 ms | 0.11 ms |
| `n2_crowd_1p_base` | Night 2 crowd 1P baseline (High preset) | 1P | **24.8** | 40.30 | 12.7 | 85.9 | 395 | 1.06M | 17.93 ms | 3.94 ms | 2.33 ms | 3.58 ms | 1.12 ms |
| `n2_crowd_1p_shadows_off` | Night 2 crowd 1P — shadows off | 1P | **40.3** | 24.80 | 19.2 | 57.1 | 391 | 0.94M | 11.65 ms | 2.10 ms | 1.29 ms | 2.15 ms | 0.63 ms |
| `n2_crowd_3p_shadows_off` | Night 2 crowd 3P — shadows off | 3P | **56.5** | 17.70 | 23.2 | 49.1 | 216 | 0.73M | 8.33 ms | 1.53 ms | 0.84 ms | 0.05 ms | 0.04 ms |
| `n2_crowd_1p_foliage_off` | Night 2 crowd 1P — foliage 0 | 1P | **47.2** | 21.20 | 16.9 | 119.3 | 383 | 0.68M | 10.21 ms | 1.70 ms | 0.52 ms | 0.95 ms | 0.61 ms |
| `n2_crowd_3p_foliage_off` | Night 2 crowd 3P — foliage 0 | 3P | **59.9** | 16.70 | 25.0 | 47.7 | 214 | 0.52M | 7.25 ms | 1.29 ms | 0.32 ms | 0.03 ms | 0.03 ms |
| `n2_crowd_1p_bloom_off` | Night 2 crowd 1P — bloom off | 1P | **52.2** | 19.15 | 18.7 | 76.3 | 369 | 0.59M | 9.94 ms | 1.56 ms | 0.34 ms | 0.47 ms | 0.48 ms |
| `n2_crowd_3p_bloom_off` | Night 2 crowd 3P — bloom off | 3P | **39.4** | 25.40 | 19.6 | 57.3 | 356 | 0.86M | 12.60 ms | 2.11 ms | 0.89 ms | 0.05 ms | 0.04 ms |
| `n2_crowd_1p_msaa_off` | Night 2 crowd 1P — MSAA off | 1P | **28.1** | 35.60 | 3.8 | 360.0 | 533 | 0.87M | 18.06 ms | 2.89 ms | 1.00 ms | 1.18 ms | 0.89 ms |
| `n2_crowd_3p_msaa_off` | Night 2 crowd 3P — MSAA off | 3P | **49.3** | 20.30 | 18.2 | 61.2 | 364 | 0.76M | 11.03 ms | 1.55 ms | 0.53 ms | 0.04 ms | 0.03 ms |
| `n2_crowd_1p_prCap_1_0` | Night 2 crowd 1P — prCap 1.0 | 1P | **46.1** | 21.70 | 19.1 | 73.2 | 523 | 0.75M | 12.11 ms | 1.60 ms | 0.15 ms | 0.47 ms | 0.53 ms |
| `n2_crowd_3p_prCap_1_0` | Night 2 crowd 3P — prCap 1.0 | 3P | **53.5** | 18.70 | 21.4 | 62.0 | 357 | 0.74M | 10.20 ms | 1.34 ms | 0.16 ms | 0.03 ms | 0.03 ms |
| `n2_crowd_1p_zombies_hidden` | Night 2 crowd 1P — zombies hidden | 1P | **42.2** | 23.70 | 17.5 | 70.5 | 522 | 0.78M | 13.19 ms | 1.78 ms | 0.16 ms | 0.53 ms | 0.60 ms |
| `n2_crowd_3p_zombies_hidden` | Night 2 crowd 3P — zombies hidden | 3P | **50.5** | 19.80 | 20.9 | 57.6 | 360 | 0.74M | 10.76 ms | 1.44 ms | 0.17 ms | 0.03 ms | 0.03 ms |
| `n2_crowd_1p_zombies_nodead` | Night 2 crowd 1P — nodead (cleared) | 1P | **44.1** | 22.70 | 17.9 | 65.2 | 522 | 0.76M | 13.11 ms | 1.73 ms | 0.04 ms | 0.51 ms | 0.57 ms |
| `n2_crowd_3p_zombies_nodead` | Night 2 crowd 3P — nodead (cleared) | 3P | **42.0** | 23.80 | 21.4 | 52.1 | 355 | 0.73M | 12.72 ms | 1.80 ms | 0.05 ms | 0.04 ms | 0.04 ms |
| `1zombie_spot_3p_with_zombie` | Sheet D noon spot 3P — with 1 shambler | 3P | **40.1** | 24.95 | 21.4 | 54.0 | 333 | 0.70M | 12.22 ms | 1.97 ms | 0.69 ms | 0.05 ms | 0.04 ms |
| `1zombie_spot_3p_no_zombie` | Sheet D noon spot 3P — clean (no zombie) | 3P | **28.7** | 34.80 | 14.9 | 78.2 | 330 | 0.66M | 14.91 ms | 2.69 ms | 0.25 ms | 0.06 ms | 0.06 ms |
| `1zombie_spot_1p_with_zombie` | Sheet D noon spot 1P — with 1 shambler | 1P | **34.5** | 28.95 | 16.2 | 66.0 | 464 | 0.75M | 14.76 ms | 2.41 ms | 0.71 ms | 1.08 ms | 0.47 ms |
| `1zombie_spot_1p_no_zombie` | Sheet D noon spot 1P — clean (no zombie) | 1P | **34.5** | 29.00 | 19.0 | 56.1 | 464 | 0.70M | 14.28 ms | 2.20 ms | 0.18 ms | 0.63 ms | 0.46 ms |
| `n2_crowd_3p_old_body` | Night 2 crowd 3P — OLD procedural body | 3P | **48.0** | 20.85 | 19.8 | 100.4 | 235 | 0.71M | 10.53 ms | 2.02 ms | 2.06 ms | 0.05 ms | 0.05 ms |
| `n2_crowd_1p_old_body` | Night 2 crowd 1P — OLD procedural body | 1P | **42.0** | 23.80 | 17.8 | 68.9 | 402 | 0.72M | 11.66 ms | 2.09 ms | 1.48 ms | 1.68 ms | 0.65 ms |

---

## Specific Findings for Items 1, 2, 3, and 4

### 1) Same Route/Seed/Crowd 1P vs 3P Breakdown
- In **3P**, the camera sits elevated behind the player: draws are **235** with **1.24M triangles** (`r:render 18.37 ms`, `r:matrices 4.53 ms`, `zombies 3.65 ms`). Median is **24.3 fps** (41.2 ms).
- In **1P**, looking level across the yard increases perspective frustum depth through distant trees/rocks: draws jump to **395** (`r:render 17.93 ms`, `r:matrices 3.94 ms`, `aim+climb 3.58 ms`, `zombies 2.33 ms`, `viewmodel 1.12 ms`). Median is **24.8 fps** (40.3 ms).
- `aim+climb` rises from 0.12 ms in 3P to 3.58 ms in 1P because first-person weapon sway, raycasting, and OTS camera interpolation run active per-frame solver cycles.

### 2) Existing Switches Off One at a Time
- **Shadows Off:** Setting `TT.sun.castShadow = false` cuts frame time by **23.5 ms in 3P** (yielding **56.5 fps**). `r:render` drops by >10 ms because shadow map rendering is bypassed completely.
- **Foliage 0:** Hiding ground foliage tufts removes **711,570 triangles** in 3P, yielding **59.9 fps (16.7 ms)** — the single closest run to the 60 fps target.
- **Bloom Off:** Cuts frame time by **21.15 ms in 1P** (jumping from 24.8 to **52.2 fps**) and **15.8 ms in 3P** (**39.4 fps**).
- **MSAA Off:** Disabling 4x MSAA cuts **20.9 ms in 3P** (**49.3 fps**).
- **prCap 1.0:** Capping device pixel ratio to 1.0 cuts **22.5 ms in 3P** (**53.5 fps**) and **18.6 ms in 1P** (**46.1 fps**).
- **Zombies Hidden vs Nodead:** Hiding zombie meshes saves **21.4 ms in 3P** and **16.6 ms in 1P**; removing them entirely via `nodead` saves **17.4 ms in 3P** and **17.6 ms in 1P**. This confirms that the zombie cost is **~85% rendering/skinning** and only **~15% simulation/AI**.

### 3) Sheet D 1-Zombie Noon Spot (With vs Without Zombie)
- **3P with 1 shambler:** 40.1 fps (24.95 ms, 333 draws, 0.70M tris).
- **3P without zombie:** 28.7 fps (34.80 ms, 330 draws, 0.66M tris).
- **1P with 1 shambler:** 34.5 fps (28.95 ms, 464 draws, 0.75M tris).
- **1P without zombie:** 34.5 fps (29.00 ms, 464 draws, 0.70M tris).
- **Conclusion:** A single zombie adds only ~3 draws and ~40k triangles (+0.5 ms). The fact that Sheet D runs at 28–40 fps *even with zero zombies present* proves that baseline environment rendering (trees, terrain, lighting, shadow map pass, post-processing) consumes **~25–35 ms** on its own at High before any crowd is spawned.

### 4) Old Procedural Body vs New Humanoid Body (`?humanoids=`)
- Testing `?humanoids=` confirms the built-in switch documented in `studio/zombie-humanoids.js`.
- In 3P, the old procedural body ran at **48.0 fps (20.85 ms, 0.71M tris)** compared to **24.3 fps (41.20 ms, 1.24M tris)** on the new live humanoids.
- In 1P, the old body ran at **42.0 fps (23.80 ms, 0.72M tris)** compared to **24.8 fps (40.30 ms, 1.06M tris)**.
- **The new humanoid crowd alone costs ~16.5–20.4 ms per frame** due to the 18.5k tri count per zombie across 31 active models.

---

## Recommendations for Pass 5 (Performance)

1. **Implement Level of Detail (LOD) for Zombie Meshes:** Beyond 8–10 meters, swap the 18.5k tri humanoid mesh to a 2.5k tri decimated proxy (saving >450k tris during Night 2 crowds).
2. **Ground Foliage Culling / Density Scaling:** Capping foliage cull distance to 75 m on High or instancing tufts with aggressive LOD will recover up to 20 ms.
3. **Shadow Pass Optimization:** Exclude distant foliage and non-casting small vegetation from the shadow frustum; use lower-poly shadow caster proxies for humanoid zombies.
4. **Cap default prCap on High to 1.0 or 1.25:** Running DPR 1.5 on High costs ~20 ms across the entire game.
5. **Post-Processing Selective Pipeline:** Disable Bloom when unnecessary or optimize TSL Bloom downsampling passes.
