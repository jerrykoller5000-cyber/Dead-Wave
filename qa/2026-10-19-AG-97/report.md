# QA Report — AG-97: CL-218 Second Cuts & CL-219 Night Shadows Look + 3× Night 20 Bench (plus GP-19938, GP-19939, GB-199 Looks)

- **Date**: 2026-10-19
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-97` (`CL-218`'s second cuts and `CL-219`'s night shadows look on Jerry's GPU + 3× Night 20 High `--prof --cpu`, plus live GPU looks for `GP-19938`, `GP-19939`, `GB-199`)

---

## 1. Executive Summary

- **Night 20 High (`--night 20 --gfx high --prof --cpu`, 3 runs)**:
  - **Median FPS (Run 1)**: **`55.9 fps`** (up from `47.7 fps` in `AG-96` and `33.7 fps` in `AG-86`, **`+8.2 fps` over `AG-96` / `+22.2 fps` over `AG-86`**).
  - **Peak Run (Run 2)**: **`57.6 fps`** (`1% low: 30.8 fps`, `draws: 257`, `frameMs: 17.36 ms`, `r:render: 6.93 ms`).
  - **3-Run Spread**: `55.9` / `57.6` / `51.1 fps` (1% low `29.6` / `30.8` / `23.6 fps`; hitches `4` / `4` / `12`).
  - **Draws per frame (Median Run 1)**: **`265` draws** (down from `334` in `AG-96` and `917` in `AG-86` — **`-69` draws/frame vs `AG-96`, `-652` draws/frame vs `AG-86`**).
  - **Render time (`r:render`, Median Run 1)**: **`7.00 ms`** (down from `9.24 ms` in `AG-96` and `21.22 ms` in `AG-86` — **`-2.24 ms/frame` vs `AG-96`**).
  - **CPU Profile (`computeBoundingSphere`)**: **Completely eliminated** (`hasComputeBoundingSphere: false` in all 3 runs; saved `~0.6 ms/frame`).

---

## 2. Visual & Functional Checks (`CL-218` & `CL-219`)

1. **Tag wall (`01-tag-wall-before.png` vs `01-tag-wall-after.png`)**:
   - `TT.house.folded = { folded: 10, removed: 81 }` (up from `{ folded: 9, removed: 62 }` in `AG-96`).
   - Tag-wall draws dropped from `27` (`?fold=0`) to `18` (folded): all `9` nail meshes folded into the south wall while all `9` 2-mesh dog tag groups remain visible and toggleable on their nails (`100%` pixel-identical).
2. **Sealed lockdown door (`02-lockdown-door-before.png` vs `02-lockdown-door-after.png`)**:
   - `fob-lockdown-door` draws dropped from `16` to `6` (`-10` draws).
   - Stencilled lettering (`THRESHOLD / LOCKDOWN DO NOT OPEN`), cross-bars, and bolts are `100%` pixel-identical.
   - Total `Group>tag-wall` (HQ house) draws in Night 20 dropped from `92` (`AG-96`) to **`74`** (`-18` draws).
3. **Terrain wedges (`03-terrain-from-hq.png`, `04-terrain-from-dock.png`, `05-terrain-from-lake.png`)**:
   - `ground-sectors` dropped from `39` draws (`12 wedges × 5 bands`) to **`16` draws** (`6 wedges × 3 bands`, **`-23` draws/frame**).
   - Inspected from HQ hill, dock, and far lake shore: zero seams, cracks, or gaps between wedges near or at the far coarse band.
4. **Ground cover (`06-foliage-cell-edge-43m.png`, `07-foliage-cell-edge-46m.png`)**:
   - `45 m` foliage cells (`153` total chunks vs `30 m` cells): stepping across the `x = 45 m` boundary shows identical grass/bushes, zero holes, zero cell-edge pop, and smooth far fade.
5. **Marine cloth (`08-marine-cloth-run.png`, `09-marine-cloth-crouch.png`, `10-marine-cloth-jump-roll.png`)**:
   - Blouse and trousers stay visible and never clip/vanish at screen edges while running, crouching, or jumping/rolling.
   - Hit registration works (`roundHitWorked: true`, `hp: 100 → 90`).
   - `computeBoundingSphere` is completely absent from `--cpu` top functions across all 3 runs.
6. **`CL-219` Night 20 shadows (`11-night20-shadows-t0.png`, `12-night20-shadows-t1_3s.png`, `13-night20-shadows-t2_7s.png`)**:
   - With directional shadow map `autoUpdate = false` at night (`nightFade >= 0.99`), the Night 20 scene holds steady with no shadow pop or shimmer over the 3-second sequence.

---

## 3. Follow-Up Live GPU Looks (`GP-19938`, `GP-19939`, `GB-199`)

1. **`GP-19938` Convoy Ambulance (`14-gp19938-ambulance-closed.png`, `15-gp19938-ambulance-sleeper-open.png`, `16-gp19938-ambulance-raised.png`, plus `review/convoy-GP19938/`)**:
   - `1` merged static mesh (`convoy-ambulance-static`) + `4` animated children (`5` meshes total, `matrixAutoUpdate = false`).
   - Cab door swings cleanly at its front hinge (`cabDoorOpen = 1`), mounted sleeper zombie (`crawler`) emerges smoothly with cyan bioluminescent ribs/eyes, and 8 jack pumps extend the ram (`jackRamY = 0.5`), lift the ambulance (`ambulanceLiftY = 0.24`), and slide the cooler free (`coolerSlideZ = 0.56`).
2. **`GP-19939` Merged Zombie Eyes & Demon Horns (`17-gp19939-merged-zombie-eyes.png`, plus `review/GP19939/before|after/sheet.jpg`)**:
   - All 14 zombie variants in the inspector sheet and live Night 20 shambler, screamer, spitter, and demon keep their bright unlit eye colors (green, magenta, orange-gold) and demon horns/ribs/claws folded into `zombie-skin`.
   - In Night 20 Run 1, `21` regular zombies drew in **`21` draws** (`1.0` draw/zombie) and `8` demons drew in **`16` draws** (`8` `zombie-skin` + `8` `demon-fire-fists`).
3. **`GB-199` Fuel Depot & HQ Generator Props (`19-gb199-fuel-pump-and-jerrycan.png`, `20-gb199-hq-generator.png`)**:
   - Fuel pump (`1` merged static mesh + `1` jerrycan mesh = `2` meshes total) and HQ generator (`3` meshes: body, pull-cord handle, cap; `6` draws in Night 20 `census.draws.byGroup`) preserve all visual detail (red tank, yellow frame, `230V 50Hz 5.5kVA` panel, red pump column, globe, hose, olive jerrycan).

---

## 4. 3× Night 20 High (`--prof --cpu`) Benchmark Table

| Metric | AG-86 (Baseline) | AG-91 (Post-CL-215) | AG-96 (Post-CL-217) | AG-97 Run 1 (Median) | AG-97 Run 2 (Peak) | AG-97 Run 3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **FPS (avg)** | `33.7` | `38.6` | `47.7` | **`55.9`** | **`57.6`** | `51.1` |
| **1% Low FPS** | `24.8` | `25.0` | `27.8` | **`29.6`** | **`30.8`** | `23.6` |
| **Hitches (>33ms)** | `18` | `15` | `8` | **`4`** | **`4`** | `12` |
| **Frame Time (`frameMs`)** | `29.67 ms` | `25.91 ms` | `20.96 ms` | **`17.89 ms`** | **`17.36 ms`** | `19.57 ms` |
| **Draws / frame** | `917` | `596` | `334` | **`265`** | **`257`** | `270` |
| **`r:render`** | `21.22 ms` | `15.79 ms` | `9.24 ms` | **`7.00 ms`** | **`6.93 ms`** | `8.33 ms` |
| **`zombies`** | `3.15 ms` | `2.65 ms` | `2.51 ms` | **`2.48 ms`** | **`2.27 ms`** | `2.91 ms` |
| **`r:matrices`** | `2.18 ms` | `2.14 ms` | `1.84 ms` | **`1.60 ms`** | **`1.64 ms`** | `1.90 ms` |
| **`m:hold`** | `0.81 ms` | `0.78 ms` | `0.76 ms` | **`0.75 ms`** | **`0.68 ms`** | `0.80 ms` |
| **`r:cull`** | `0.58 ms` | `0.52 ms` | `0.48 ms` | **`0.46 ms`** | **`0.51 ms`** | `0.54 ms` |
| **`m:pose`** | `0.51 ms` | `0.49 ms` | `0.45 ms` | **`0.44 ms`** | **`0.41 ms`** | `0.48 ms` |
| **`gpuMs`** | `0.34 ms` | `0.31 ms` | `0.32 ms` | **`0.31 ms`** | **`0.32 ms`** | `0.25 ms` |
| **Scene Nodes (`census.nodes`)** | `22,551` | `14,705` | `9,595` | **`9,397`** | **`9,446`** | `9,428` |

### `census.draws.byGroup` (Median Run 1 — `265` draws)

| Group | AG-96 Draws | AG-97 Run 1 Draws | Delta |
| --- | ---: | ---: | ---: |
| `Group>tag-wall` (HQ house) | `92` | **`74`** | **`-18`** |
| `Group>fitted-pelvis` (Marine) | `52` | **`52`** | `0` |
| `Mesh / (unnamed)` | `54` | **`50`** | `-4` |
| `zombie (Group>zombie-eyes)` | `40` (20z) | **`21`** (21z) | **`-19` (`1.0`/zombie)** |
| `zombie (Group>demon-fire-fist)` | `26` (7d) | **`16`** (8d) | **`-10` (`2.0`/demon)** |
| `ground-sectors` (Terrain wedges) | `39` | **`16`** | **`-23`** |
| `Group / (unnamed)` | `10` | **`10`** | `0` |
| `fuel-depot` (`hq-generator`) | `10` | **`6`** | **`-4`** |
| `feral-motion-echo` | `4` | **`5.5`** | `+1.5` |
| `rock-batch` | `3` | **`3`** | `0` |
| `zombie (Group>concept-surface)` | `2` | **`2`** | `0` |
| `Group>rabbit-skin` | `1` | **`1`** | `0` |
| `spitter-acid-trail-batch` | `1` | **`1`** | `0` |
