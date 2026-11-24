# antigravity — AG-406 Buildable Item PBR Texture Overhaul — 2026-11-23
Changed:          Added a lazy-cached procedural PBR texture library (`world/build-textures.js`, 12 PBR material sets + 2 weathered Class 3 / Napalm drum diamond placards) and grain-aligned / shape-aware metre-scale UV projector (`projectBuildUVs`), wired across all 16 buildable types and 51 upgrade/opening forms in `index.html (build meshes)` with zero extra draw calls and baseline-matched RTX 5080 WebGPU frame time.
Files:            `world/build-textures.js` (new), `world/build-textures.test.mjs` (new), `index.html` (`build meshes` section + import line), `qa/AG-406/capture-buildables.mjs` (new), `qa/AG-406/make-sheets.py` (new), `review/AG-406/ba-1.jpg..ba-7.jpg`, `review/AG-406/metrics-before.json`, `review/AG-406/metrics-after.json`
Tests:            `node --test world/build-textures.test.mjs` -> 5 pass, 0 fail; browser regression via crew slot (`node tools/tests/run-all.mjs t11 t13 tag281 t215 --jobs 1 --no-retry`) -> 4 checks: 65 pass, 0 fail (`tag281` 40/40, `t11` 13/13, `t13` 8/8, `t215` 4/4); new tests: `world/build-textures.test.mjs`
Screenshots:      49 native RTX 5080 WebGPU BEFORE/AFTER views (45 studio buildable/tier/opening shots + 40-piece fortified base in Noon, Morning, Dusk, Night) compiled into 7 side-by-side contact sheets: `review/AG-406/ba-1.jpg` through `review/AG-406/ba-7.jpg` (full-res PNGs in `qa/AG-406/before/` and `qa/AG-406/after/`)
Not verified:     Full `npm test` suite (deferred to commit-time cloud suite per AGENTS.md Rule 16 / D-135); `mortar` and `m240` (`studio/weapon-heavy.js`) were intentionally untouched as they belong to ChatGPT 2's weapon lane and already use the weapon-finish PBR system.
Requests:         none
Contract changes: none

## Scope & Material Coverage (All 16 Buildable Types / 51 Variants)
- **5 Master Vertex-Colored Materials (`*VC`, 1-draw-call static baking preserved):**
  - `stoneVC` (512px `bd-stone`): dressed fortification quarry stone / concrete with bush-hammered chisel marks, mineral quartz/mica speckle, porous pits & soft micro-seams (walls T2–T3, floor T1, concrete pillar T1, gabion rocks T2).
  - `woodVC` (512px `bd-wood`, `alignLongAxis: true`): straight-sawn fortification lumber with longitudinal growth rings, fine fiber grain, band-saw marks, tight knots & hairline checks (walls T0–T1, floor T0, stairs T0, doors T0–T1, gate T0, sandbag cap planks, spike trap slats).
  - `burlapVC` (512px `bd-burlap`): 56×56 over-under military hessian jute weave (~7.5 mm yarn pitch) with yarn slubs, soft stuffed-cloth folds & dusty crevices (sandbags T0–T1, platform T2 emplacement bags).
  - `steelVC` (512px `bd-steel`): hot-rolled structural armour steel with mill-scale patina, rolling streaks, fabrication scuffs & calibrated metalness (`0.36–0.60`) so dark steel stays legible outdoors and indoors (wall T4, doors T2–T4, window bars, gates T1–T2, floor T2, platforms, pillars T0/T2, steel/retractable stairs T1–T2, barricades T1–T2, railings, parapets, wire strands).
  - `paintVC` (256px `bd-paint`): sleek sprayed CARC military steel enamel with wiped oil/grime roughness modulation (`0.36–0.78`), delicate scuffs & pinpoint wear flecks (wire T0–T2 pickets/hardware, maintaining `<= 2` baked meshes for `t13`).
- **Dedicated Shared Materials:** `rust` (256px pitted oxidized scrap iron on barricades/hedgehogs/traps), `gunmetal` (256px blasted parkerized ordnance steel on turret barrels/receivers), `wornSteel` (256px burnished bare machined steel on drum chimes/rolling ribs, spikes, blades, turret trim), `brass` (256px tarnished ordnance brass on bungs, valves, fittings), `rubberHose` (256px circumferentially ribbed braided hydraulic hose on flame turrets), `hazardYellow` (256px weathered caution-yellow enamel on drum bands & warning trim), `opticalLens` (128px concentric Fresnel glass normal map on `lensRed`, `lensBlue`, turret `accent`, flame `pilot`, mine `led`, lure `lamp`), plus weathered upright Class 3 `FLAMMABLE` and `NAPALM` diamond placards (`makeDrumPlacardTexture`, 256px) on front & back of Fuel/Napalm drums.
- **UV Projection (`projectBuildUVs`):** Runs prior to `mergeStatic` inside `bakeBuildMesh`, `makeTieredMesh`, `buildDoorLeaves`, `buildGateLeaves`, `addWindowBars`, `makeBarrelBuildMesh`, and `applyBarrelNapalm`. Aligns wood grain along each box's longest local axis, wraps cylinders/cones/tori with integer circumferential repeats (zero UV seam), and assigns deterministic per-block position offsets so adjacent stones, planks and sandbags never look cloned.

## Performance & Resource Audit (RTX 5080 WebGPU, 1600×900, 40-Piece Base, 150 Frames)
| Metric | BEFORE (`metrics-before.json`) | AFTER (`metrics-after.json`) | Delta |
| --- | ---: | ---: | ---: |
| Renderer Backend | WebGPU | WebGPU | Same |
| Page Errors | 0 | 0 | 0 |
| Placed Buildables / Meshes | 40 / 691 | 40 / 691 | 0 extra meshes |
| Unique Textured Materials | 0 / 37 | 35 normal / 26 map / 24 ORM (of 39) | Full PBR |
| Unique Textures / VRAM | 0 / 0.00 MB | 36 / 23.75 MB (4× aniso, 8× placards) | +23.75 MB (lazy) |
| Draw Calls / Frame | 15.1 | 15.1 | +0.0 |
| Steady-State Median Frame Time | 33.4 ms | 33.5 ms | +0.1 ms |
| Late Pipeline Compiles | 0 | 0 | 0 |

## Visual Inspection & Polish Pass (Rule 19 — Art Direction & Asset Principles)
- **Art-Direction Families:** Military + Industrial/Field Fortification (muted weathered bases, reserved colors respected, upright industrial hazard iconography).
- **Polish Pass Applied After Initial Render Review:**
  1. Refined `paint` and `hazardYellow` normal relief (`normalStrength 1.9 -> 0.85`, `normalScale 0.74 -> 0.36/0.38`) so drums and turret hulls read as smooth sprayed sheet metal rather than bumpy stucco.
  2. Tightened `burlap` hessian weave from `40×40` to `56×56` threads/tile with softer cloth folds so sandbags read as heavy woven jute fabric rather than coarse rattan.
  3. Straightened `wood` lumber grain warp (`0.16 -> 0.085`) and softened groove relief (`normalScale 0.94 -> 0.74`) for realistic rough-sawn planks.
  4. Softened `stone` Worley micro-seams so ashlar walls and pillars read as solid dressed quarry masonry instead of crazed blocks.
  5. Tuned PBR texture anisotropy to `4×` (keeping `8×` on drum placards), returning steady-state median frame time to baseline (`33.5 ms` vs `33.4 ms`).
- **Four-Light Verification (`review/AG-406/ba-7.jpg`, `qa/AG-406/after/46..49-base-*.png`):**
  - **Noon (`46-base-noon`):** Clear material separation across timber, stone, burlap, rolled steel, rust, CARC paint, and readable drum placards.
  - **Morning Grazing (`47-base-morning`):** Crisp normal relief across parapet steel, sandbag weave, stone window jambs, gunmetal barrels, and Fresnel beacon globe.
  - **Dusk (`48-base-dusk`):** Warm amber sun catches steel/brass highlights without crushing dark tiers to black.
  - **Night (`49-base-night`):** Silhouettes and tiers remain legible under night lighting with clean emissive optics/beacons.

| Asset Principles Category (0–5) | Score | Notes |
| --- | :---: | --- |
| Silhouette & Readability | 5 | Existing geometry & bounds untouched (`tag281` 40/40); steel/dark tiers now far more legible. |
| Material Accuracy & PBR Calibration | 5 | Distinct matte burlap/wood/stone vs brushed rolled steel, pitted rust, parkerized gunmetal, brass, ribbed rubber, CARC enamel & Fresnel glass. |
| Surface Detail & Scale Consistency | 5 | Metre-scale grain-aligned & cylindrical UVs with per-block offsets eliminate stretching and repetition. |
| Lighting Cohesion (4 Lights) | 5 | Balanced across Noon, Morning, Dusk and Night with zero crushed darks or blown-out highlights. |
| Performance & Budget Discipline | 5 | 0 ms title-screen overhead (lazy), +0.0 draw calls, +0.1 ms median frame time, 23.75 MB VRAM, 0 late compiles. |

## Game-Test Slot Rule Record (Rule 16)
- All browser runs executed strictly through `node crew/crew.mjs slot run antigravity AG-406 ...` on Jerry's RTX 5080 PC (`--exclusive` for BEFORE and AFTER 49-view captures + 150-frame perf benchmarks; `--jobs 1 --no-retry` for `t11`, `t13`, `tag281`, `t215`).
