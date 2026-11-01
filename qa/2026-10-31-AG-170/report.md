# AG-170 — Fresh 1.2 Profile on RTX 5080: CPU vs GPU (`CL-288`)

- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-10-31
- **Task**: `AG-170` (`CL-288`)
- **Changed**: `qa/2026-10-31-AG-170/` (8 benchmark JSONs/logs, DevTools CPU profiles, `ag170-summary.json`, `run-ag170.mjs`, `report.md`), `handoffs/2026-10-31-antigravity-AG-170.md`
- **Tests**:
  - `node tools/bench.mjs --night 20 --gfx high --prof --cpu --census` (×3 runs: `night20-r1..r3`)
  - `node tools/bench.mjs --scenario day5 --gfx high --prof --cpu --census` (×3 runs: `day5-r1..r3`)
  - `node tools/bench.mjs --night 20 --gfx high --res 0.5 --prof --cpu --census` (`night20-res05`)
  - `node tools/bench.mjs --scenario day5 --gfx high --res 0.5 --prof --cpu --census` (`day5-res05`)
  - Direct CDP Day-1 Noon draw-call census probe (`day1DrawsProbe` in `qa/2026-10-31-AG-170/ag170-summary.json`)
- **Not verified**: N/A (read-only profiling task; all requested runs, `--res 0.5` comparisons, `--cpu` call-tree breakdowns, and Day-1 vs Night-20 draw-call audits completed).

---

## 1. Executive Summary

1. **100% CPU-Bound on Main-Thread JS (`--res 0.5` Proof)**:
   - On the RTX 5080 (`--gfx high`), **GPU execution time (`gpuMs`) is only `0.31–0.33 ms` at `1.0×` render scale** (`50.8–58.6 fps` on `night20`, `59.1–59.3 fps` on `day5`).
   - Halving the preset's render scale (`--res 0.5`, cutting pixel count by **75%**) drops `gpuMs` from `0.31–0.33 ms` to `0.19–0.20 ms` (`-0.13 ms`), while **`day5` FPS barely moves (`59.2 -> 59.8 fps`, `tickMs 13.48 -> 13.11 ms`) and `night20` `tickMs` stays at `14.18 ms` (`last10.tickMs = 14.96 ms`, `59.1 fps`)**.
   - **Verdict**: The GPU is sitting at **~2% utilization (`0.33 ms` out of `16.67 ms`)**. Frame rate is **100% gated by main-thread CPU (`tickMs = 13.2–16.4 ms`, `last10.tickMs = 13.9–18.3 ms`)**.

2. **Where the CPU Time Inside `renderer.render` (`6.7–8.6 ms/frame`) Goes**:
   - Inside `renderFrame` (`8.7–10.4 ms` total CPU time), `PostProcessing.render` takes **`6.37–7.75 ms`**, and **`ShadowNode.updateBefore` (`three.webgpu.js:33666`) alone consumes `5.31–6.60 ms` of CPU time every single frame** (**~75–85% of `r:render`!**), even though **`drawsShadow` is only `13` draws**!
   - Why does `ShadowNode.updateBefore` cost `5.3–6.6 ms` for 13 shadow draws? Because Three.js's `ShadowNode.updateBefore` executes a full shadow-pass render on the shadow-casting light, which runs **a second full-scene `updateMatrixWorld()` traversal AND a second `_projectObject()` scene graph walk across `9,291–9,506` nodes** before issuing those 13 shadow draws.
   - Combined across `updateSceneMatrices` (`1.62–1.90 ms`) + `ShadowNode.updateBefore` (`5.31–6.60 ms`) + the main pass (`~1.0–1.2 ms`), the top self-time functions inside `renderFrame` / `renderer.render` are:
     1. **Matrix hierarchy updates** (`updateMatrixWorld` + `multiplyMatrices` + `updateWorldMatrix`): **`1.85 ms` self-time inside `renderFrame`** (`3.41 ms` whole-tick self-time on `night20-r1`; `2.62 ms` on `day5-r1`).
     2. **Scene graph projection & frustum culling** (`_projectObject` + `intersectsObject` + `Frustum.test`): **`1.39 ms` self-time on `night20-r1`** (`1.19 ms` on `day5-r1`).
     3. **WebGPU draw submission & uniform/buffer writes** (`device.queue.writeBuffer` + `_renderObjectDirect` + `pass.draw` + `setVertexBuffer` + `setBindGroup` + `submit`): **`1.91 ms` self-time on `night20-r1`** (`1.55 ms` on `day5-r1`).
     4. **TSL Node / Binding / Attribute per-object updates** (`updateNode` + `updateByType` + `_updateBindings` + `_update` + `updateAttributes`): **`0.84 ms` self-time on `night20-r1`** (`0.72 ms` on `day5-r1`).

3. **Why Day 1 in the `AG-168` v2 / `AG-171` v3 Shots Had `931–1,193` Draws vs `265` at Night 20**:
   - In `bench.mjs` (`night20` / `day5`), the camera is in **3rd-person (`pitch ≈ -25°`)** looking down at the HQ floor with the **starter loadout** (`draws = 261–271` on `night20`, `233–234` on `day5`; `main = 220–278.5`, `shadow = 13`).
   - In `vmsheet.mjs` (`vm-hip.png`, Day 1 at Noon `worldTime = 0.42`, inside HQ looking North in **1st-person horizontal pitch `0°`** after `T.grantAllWeapons()`), our CDP census probe (`day1DrawsProbe.hqNoon1pHip`) measures **`1,055` draws (`867` main-pass + `188` shadow-pass)** (`1,101` with `renderer.info.render.calls`).
   - The **`+790` extra draws** over `night20` (`265`) come from **four exact sources**:
     1. **Daytime Insects & Birds in the 1P Horizon Frustum (`+350` main-pass draws)**: `bee` (`190` draws — multi-part unbatched meshes across the valley!), `butterfly` (`111` draws), `bird-flock` (`36` draws), `fish-skin` (`8`), `bird-skin` (`4`), `turtle-skin` (`1`). At night, bees/butterflies are hidden (`0` draws), and in 3P angled down (`-25°`), the horizon frustum clips almost all of them out (`38` bees, `0` butterflies).
     2. **Daytime Sun `OrthographicCamera` Shadow Pass (`+175` shadow-pass draws: `188` at Noon vs `13` at Night)**: At Noon (`worldTime = 0.42`), the sun directional shadow pass runs every frame (`188` shadow draws vs `13` at night), led by `player` (`71` shadow draws because `T.grantAllWeapons()` stows every weapon on the marine with `castShadow = true`!), `Group>tag-wall` (`28`), `Mesh` (`27`), `Group` (`23`), `history-props / ranger-truck` (`15`), and `Group>bird-skin` (`12`).
     3. **`T.grantAllWeapons()` Populating the HQ Armory Wall Rack (`+74` main-pass draws)**: Calling `T.grantAllWeapons()` in `vmsheet.mjs` mounts every weapon in the game onto the HQ Armory wall behind/around the player, jumping `Group>tag-wall / hq-armory` from **`19` draws** (starter loadout in `bench.mjs`) to **`93` draws** (`Group>tag-wall` total `80 -> 150`).
     4. **Unculled Distant Valley Micro-Props in the 1P Horizontal Frustum (`+191` main-pass draws)**: Looking horizontally North (`pitch = 0°`) brings distant valley micro-props into the camera frustum that have no distance cull (`maxDist`), whereas 3P (`pitch = -25°`) points into the floor: `history-props` (`72` draws: `brass = 36`, `leghold-traps = 14`, `survey-board:shale = 10`, `horseshoe = 3`, `dropped-helmet = 2`, `open-grave = 2`), `Mesh / (unnamed)` (`100` vs `40` in 3P = `+60`), `trapper-path` (`33` draws: `trapper-cellar-roof-cap = 21`, `trapper-horseshoe = 8`), `streamGroup` (`33` vs `0` = `+33`), `holy-reliquary / holy-grenade` (`12`), and `viewmodel / vm-space` (`24`).

---

## 2. Benchmark Results (`--gfx high --prof --cpu --census`, 8 Runs)

| Run | Scale | FPS | 1% Low | Worst (ms) | Hitches | `frameMs` | `tickMs` (`last10`) | `outsideMs` (`last10`) | `gpuMs` | Draws (`Main` + `Shad`) | Triangles | Zombies |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`night20-r1`** | `1.0×` | `50.8` | `31.0` | `59.3` | `1` | `19.69` | `16.40` (`18.34`) | `3.29` (`1.34`) | **`0.33`** | `266` (`278.5` + `13`) | `747,891` | `48` |
| **`night20-r2`** | `1.0×` | `58.6` | `41.1` | `25.0` | `1` | `17.06` | `14.35` (`15.61`) | `2.71` (`1.45`) | **`0.33`** | `271` (`263.5` + `13`) | `825,647` | `48` |
| **`night20-r3`** | `1.0×` | `56.1` | `37.6` | `32.4` | `0` | `17.83` | `15.46` (`16.66`) | `2.37` (`1.16`) | **`0.33`** | `261` (`273.0` + `13`) | `718,759` | `48` |
| **`night20` Mean** | **`1.0×`** | **`55.2`** | **`36.6`** | **`38.9`** | **`0.7`** | **`18.19`** | **`15.40` (`16.87`)** | **`2.79` (`1.32`)** | **`0.33`** | **`266` (`271.7` + `13`)** | **`764,099`** | **`48`** |
| **`night20-res05`** | **`0.5×`** | **`59.1`** | **`46.0`** | **`22.6`** | **`0`** | **`16.92`** | **`14.18` (`14.96`)** | **`2.74` (`1.96`)** | **`0.20`** | **`256` (`262.5` + `13`)** | **`695,922`** | **`48`** |
| **`day5-r1`** | `1.0×` | `59.3` | `46.1` | `19.8` | `1` | `16.86` | `13.19` (`13.88`) | `3.67` (`2.98`) | **`0.31`** | `234` (`225.0` + `13`) | `642,109` | `48` |
| **`day5-r2`** | `1.0×` | `59.1` | `37.6` | `20.3` | `1` | `16.92` | `13.59` (`14.48`) | `3.33` (`2.44`) | **`0.32`** | `233` (`220.0` + `13`) | `635,209` | `48` |
| **`day5-r3`** | `1.0×` | `59.3` | `40.3` | `24.0` | `0` | `16.86` | `13.65` (`14.02`) | `3.21` (`2.84`) | **`0.32`** | `234` (`221.0` + `13`) | `647,731` | `48` |
| **`day5` Mean** | **`1.0×`** | **`59.2`** | **`41.3`** | **`21.4`** | **`0.7`** | **`16.88`** | **`13.48` (`14.13`)** | **`3.40` (`2.75`)** | **`0.32`** | **`234` (`222.0` + `13`)** | **`641,683`** | **`48`** |
| **`day5-res05`** | **`0.5×`** | **`59.8`** | **`40.3`** | **`21.6`** | **`0`** | **`16.72`** | **`13.11` (`13.33`)** | **`3.61` (`3.40`)** | **`0.19`** | **`232` (`222.0` + `13`)** | **`629,501`** | **`48`** |

---

## 3. Top `PROF` Sections (`night20` vs `day5`, Whole-Run Avg / `last10` Avg)

| `PROF` Section | `night20-r1` (`last10` / `max`) | `night20-r2` (`last10` / `max`) | `night20-r3` (`last10` / `max`) | `night20-res05` (`last10`) | `day5-r1` (`last10` / `max`) | `day5-r2` (`last10` / `max`) | `day5-r3` (`last10` / `max`) | `day5-res05` (`last10`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`r:render`** | `7.83` (`8.59` / `28.2`) | `6.74` (`7.11` / `14.5`) | `7.18` (`7.61` / `23.5`) | `6.66` (`7.06`) | `6.56` (`6.97` / `13.2`) | `6.66` (`6.98` / `32.8`) | `6.76` (`6.84` / `14.4`) | `6.57` (`6.64`) |
| **`zombies`** | `2.73` (`3.72` / `15.4`) | `2.36` (`3.24` / `8.5`) | `2.65` (`3.63` / `13.4`) | `2.37` (`3.18`) | `1.13` (`1.44` / `4.9`) | `1.21` (`1.57` / `8.0`) | `1.29` (`1.72` / `5.5`) | `1.10` (`1.21`) |
| **`r:matrices`** | `1.99` (`2.08` / `7.2`) | `1.77` (`1.77` / `5.3`) | `1.91` (`1.89` / `7.1`) | `1.76` (`1.78`) | `1.65` (`1.76` / `4.4`) | `1.73` (`1.97` / `4.8`) | `1.68` (`1.77` / `6.4`) | `1.62` (`1.73`) |
| **`m:hold`** | `0.73` (`0.47` / `3.7`) | `0.71` (`0.43` / `3.0`) | `0.76` (`0.46` / `3.1`) | `0.72` (`0.42`) | `0.69` (`0.47` / `3.2`) | `0.69` (`0.50` / `2.4`) | `0.87` (`0.53` / `19.4`) | `0.68` (`0.46`) |
| **`m:pose`** | `0.57` (`0.55` / `2.0`) | `0.55` (`0.50` / `2.2`) | `0.58` (`0.55` / `2.1`) | `0.54` (`0.49`) | `0.57` (`0.58` / `2.6`) | `0.61` (`0.64` / `2.3`) | `0.59` (`0.57` / `2.1`) | `0.57` (`0.59`) |
| **`r:cull`** | `0.55` (`0.58` / `2.9`) | `0.48` (`0.49` / `2.2`) | `0.52` (`0.51` / `2.0`) | `0.48` (`0.49`) | `0.50` (`0.53` / `2.2`) | `0.55` (`0.55` / `8.6`) | `0.52` (`0.51` / `1.6`) | `0.50` (`0.51`) |
| **`w:stairs+roof+birds+bugs+wildlife`** | `0.23` (`0.21` / `1.0`) | `0.23` (`0.20` / `1.1`) | `0.23` (`0.20` / `0.9`) | `0.23` (`0.19`) | `0.24` (`0.23` / `0.8`) | `0.24` (`0.24` / `0.8`) | `0.26` (`0.26` / `0.9`) | `0.24` (`0.24`) |
| **`hud+audio`** | `0.22` (`0.21` / `2.6`) | `0.20` (`0.18` / `1.0`) | `0.22` (`0.19` / `1.2`) | `0.20` (`0.19`) | `0.20` (`0.20` / `1.5`) | `0.21` (`0.21` / `1.0`) | `0.21` (`0.21` / `1.1`) | `0.20` (`0.19`) |
| **`w:minimap`** | `0.18` (`0.20` / `2.1`) | `0.14` (`0.15` / `0.4`) | `0.16` (`0.16` / `0.5`) | `0.14` (`0.15`) | `0.16` (`0.17` / `2.5`) | `0.16` (`0.17` / `2.8`) | `0.16` (`0.16` / `2.9`) | `0.15` (`0.15`) |
| **`w:treeFall+leaves+batches`** | `0.15` (`0.14` / `1.0`) | `0.14` (`0.13` / `0.6`) | `0.15` (`0.13` / `0.7`) | `0.14` (`0.13`) | `0.15` (`0.15` / `0.8`) | `0.16` (`0.16` / `0.7`) | `0.15` (`0.15` / `0.6`) | `0.15` (`0.14`) |
| **`m:idle`** | `0.12` (`0.39` / `2.9`) | `0.15` (`0.39` / `2.5`) | `0.14` (`0.40` / `3.2`) | `0.15` (`0.39`) | `0.16` (`0.39` / `2.6`) | `0.16` (`0.38` / `2.9`) | `0.16` (`0.38` / `2.5`) | `0.16` (`0.38`) |
| **`drops+hud`** | `0.13` (`0.14` / `1.3`) | `0.13` (`0.13` / `1.3`) | `0.13` (`0.13` / `1.3`) | `0.13` (`0.13`) | `0.13` (`0.13` / `1.3`) | `0.14` (`0.13` / `1.4`) | `0.14` (`0.14` / `1.5`) | `0.13` (`0.13`) |

---

## 4. Inside `renderer.render` & `renderFrame`: Shadow Pass, `updateMatrixWorld`, `_projectObject`, and Draw/Bind Time

Using the DevTools CPU profiles (`qa/2026-10-31-AG-170/cpu-night20-r1.json` and `cpu-day5-r1.json`), here is the exact hierarchical total-time and self-time breakdown inside `renderFrame` (`index.html:2397`):

### 4.1 Total-Time Call Hierarchy Inside `renderFrame`

| Call-Tree Node | `night20-r1` Total (`ms/frame`) | `day5-r1` Total (`ms/frame`) | Role & Explanation |
| :--- | :---: | :---: | :--- |
| **`renderFrame` (`index.html:2397`)** | **`10.41 ms`** | **`8.70 ms`** | Full render step (`r:cull` + `r:matrices` + `r:render`) |
| ├─ **`updateSceneMatrices` (`index.html:2373`)** | **`1.90 ms`** | **`1.62 ms`** | Explicit pre-render matrix update (`r:matrices`) across dynamic roots (`auto = 6,932` on `night20`, `5,941` on `day5`) |
| ├─ **`sceneCull` (`index.html:2275`)** | **`0.55 ms`** | **`0.50 ms`** | Custom top-level distance/sector cull (`r:cull`, culling `264 / 1,487` top groups) |
| └─ **`PostProcessing.render` (`three.webgpu.js:70584`)** | **`7.75 ms`** | **`6.37 ms`** | `r:render` (`passScene` + `ShadowNode` + `BloomNode` + composite) |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ `_renderScene` -> `_renderObjects` -> `updateBefore` (`47077`) | `7.55 ms` | `6.19 ms` | Pre-pass node updates for `PassNode` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ **`ShadowNode.updateBefore` (`three.webgpu.js:33666`)** | **`6.60 ms`** (`5.56–6.60` across r1..r3) | **`5.31 ms`** (`5.31–5.58` across r1..r3) | **#1 CPU Bottleneck (`~85%` of `r:render`)**: Runs shadow pass (`drawsShadow = 13`), doing a full `scene.updateMatrixWorld()` + `_projectObject` walk across all `9,300+` scene nodes! |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ **`BloomNode.updateBefore` (`BloomNode.js:287`)** | **`0.95 ms`** | **`0.88 ms`** | Mipmap blur chain render passes |

### 4.2 Top Self-Time Functions Inside `renderFrame` / `renderer.render` (Grouped by Subsystem)

| Subsystem / Function (`file:line`) | `night20-r1` Self (`ms/frame`) | `day5-r1` Self (`ms/frame`) | Notes |
| :--- | :---: | :---: | :--- |
| **1. Matrix Hierarchy (`updateMatrixWorld` family)** | **`1.85 ms`** *(in `renderFrame`)* / **`3.41 ms`** *(whole tick)* | **`1.52 ms`** *(in `renderFrame`)* / **`2.62 ms`** *(whole tick)* | Called in `updateSceneMatrices`, again inside `ShadowNode.updateBefore`, and in gameplay (`updateZombies` / `marine`) |
| ├─ `updateMatrixWorld` (`three.core.js:13980`) | `1.37 ms` (`2.13 ms` tick) | `1.14 ms` (`1.63 ms` tick) | Traversing `9,506` (`night20`) / `9,291` (`day5`) `Object3D` children |
| ├─ `multiplyMatrices` (`three.core.js:11564`) | `0.48 ms` (`0.77 ms` tick) | `0.38 ms` (`0.50 ms` tick) | `matrixWorld.multiplyMatrices(parent.matrixWorld, matrix)` |
| └─ `updateWorldMatrix` (`three.core.js:14027`) | *(in gameplay: `0.51 ms`)* | *(in gameplay: `0.49 ms`)* | Triggered by IK / weapon / zombie bone queries |
| **2. Scene Projection & Frustum Test (`_projectObject` family)** | **`1.39 ms`** | **`1.19 ms`** | Walks `shown = 3,178` (`night20`) / `3,076` (`day5`) visible meshes in both main pass and shadow pass |
| ├─ `_projectObject` (`three.webgpu.js:51838`) | `1.05 ms` | `0.86 ms` | Recursive visibility, layer check, and render-list insertion |
| ├─ `intersectsObject` (`three.core.js:26138`) | `0.22 ms` | `0.22 ms` | Bounding sphere world transform + frustum intersection |
| └─ `Frustum.test` / `intersectsSphere` (`three.core.js:12844`) | `0.12 ms` | `0.11 ms` | 6-plane dot-product loop |
| **3. WebGPU Draw / Bind / Buffer Upload Submission** | **`1.91 ms`** | **`1.55 ms`** | Per-draw WebGPU command encoding & uniform buffer writes |
| ├─ `GPUQueue.writeBuffer` (`native :0`) | `0.67 ms` | `0.51 ms` | Uploading per-object uniform buffers to Dawn/WebGPU |
| ├─ `_renderObjectDirect` (`three.webgpu.js:52172`) | `0.57 ms` | `0.45 ms` | Per-draw state orchestration |
| ├─ `GPURenderPassEncoder.setVertexBuffer` (`native :0`) | `0.21 ms` | `0.19 ms` | Vertex buffer binding |
| ├─ `WebGPUBackend.draw` (`three.webgpu.js:69261`) + `pass.drawIndexed` | `0.19 ms` | `0.15 ms` | Draw call encoding |
| ├─ `GPUQueue.submit` (`native :0`) | `0.14 ms` | `0.14 ms` | Submitting command buffers to GPU |
| └─ `GPURenderPassEncoder.setBindGroup` (`native :0`) | `0.13 ms` | `0.11 ms` | Bind group switches |
| **4. Three.js Node / Uniform / Attribute Updates** | **`0.84 ms`** | **`0.72 ms`** | Updating per-frame/per-object TSL nodes and bindings |
| ├─ `NodeFrame.updateNode` (`three.webgpu.js:45491`) | `0.26 ms` | `0.20 ms` | Frame/render/object node update dispatch |
| ├─ `RenderObject.updateByType` (`three.webgpu.js:52705`) | `0.24 ms` | `0.20 ms` | Scanning object nodes by update type |
| ├─ `Attributes.update` (`three.webgpu.js:26491`) | `0.12 ms` | `0.10 ms` | Checking buffer attribute versions |
| ├─ `Bindings._updateBindings` (`three.webgpu.js:27602`) | `0.11 ms` | `0.11 ms` | Checking uniform group dirty state |
| └─ `Bindings._update` (`three.webgpu.js:27644`) | `0.11 ms` | `0.11 ms` | Packing uniform buffers |

> [!IMPORTANT]
> **Key Actionable Takeaway for `CL-288`**:
> `ShadowNode.updateBefore` (`three.webgpu.js:33666`) is taking **`5.31–6.60 ms` of CPU time per frame** to render just **`13` shadow draws** (`drawsShadow: 13`). Because `renderer.shadowMap` / `ShadowNode` calls `scene.updateMatrixWorld()` and traverses the entire `scene` (`9,291–9,506` nodes, `1,626–2,067` shadow casters) inside the shadow pass right after `updateSceneMatrices` already updated matrices, suppressing redundant `updateMatrixWorld` inside the shadow pass (or restricting the shadow pass scene/layer traversal to actual nearby shadow-casting roots) can recover **`~3–4 ms/frame` (`+20–25%` CPU frame budget)**.

---

## 5. Draws by Owner (`night20` vs `day5` Census)

| Owner Group (`drawsByGroup`) | `night20-r1` (`278.5` main) | `day5-r1` (`225.0` main) | Top Constituent Parts (`drawsByPart`) |
| :--- | :---: | :---: | :--- |
| **`Group>tag-wall`** | `80` | `80` | `(unnamed)` (`26`), `hq-armory` (`19`), `hq-skull-intake` (`13`), `fob-lockdown-door` (`6`), `hq-alarm-cabinet` (`5`), `hq-cif` (`4`), `hq-duty-board` (`3`), `hq-radio-set` (`2`) |
| **`Group>fitted-pelvis` (Player Marine)** | `52` | `52` | `(unnamed)` (`22`), `rig-skin` (`10`), `wrist` (`4`), `balaclava` (`3`), `live-sleeve-live` (`2`), `live-trouser-leg-live` (`2`), `marine-facial-features` (`2`) |
| **`Mesh` (Top-level unnamed meshes)** | `47` | `40` | `Mesh / (unnamed)` (`47` on `night20`, `40` on `day5`) |
| **`zombie (Group>demon-fire-fist)`** | `22` | `0` | `zombie-skin` (`11`), `(unnamed)` (`11`) — visible Night-20 wave zombies near HQ |
| **`zombie (Group>zombie-eyes)`** | `19` | `3` | `zombie-skin` (`19` on `night20`, `3` on `day5`) |
| **`ground-sectors`** | `16` | `16` | `ground-sectors / (unnamed)` (`16`) |
| **`Group` (Top-level unnamed groups)** | `14` | `10` | `Group / (unnamed)` (`14` on `night20`, `10` on `day5`) |
| **`fuel-depot`** | `6` | `6` | `hq-generator` (`6`) |
| **`feral-motion-echo`** | `5.5` | `6` | `feral-motion-echo` (`5.5–6`) |
| **`rock-batch`** | `5` | `3` | `rock-batch` (`5` on `night20`, `3` on `day5`) |
| **`zombie (Group>concept-surface)`** | `2` | `1` | `zombie-skin` (`1`), ` brute-tendril` (`1`) |
| **`motes-instanced`** | `2` | `2` | `motes-instanced` (`2`) |
| **FOB Ground / Decals / Other (`8` groups)** | `8` | `6` | `fob-yard-batch` (`1`), `fob-ground-wear` (`1`), `debris-chunks` (`1`), `fob-threshold-sign` (`1`), `fob-ground-blend` (`1`), `fob-tyre-ruts` (`1`), `spitter-acid-trail-batch` (`1`), `Group>rabbit-skin` (`1`) |
| **Shadow Pass (`drawsShadow`)** | **`13`** | **`13`** | Local HQ point/spot shadow casters |

---

## 6. Where the `931–1,193` Draws on Day 1 in the v2/v3 Shots Come From (`day1DrawsProbe`)

In the `AG-168` v2 (`CL-281` v2) and `AG-171` v3 (`CL-281` v3) viewmodel sheets (`tools/vmsheet.mjs`), the debug overlay at the bottom-left showed:
- **`draws: 1101` (`tris: 889,223`)** on `vm-hip.png`, `vm-reload-start.png`, `vm-reload-magout.png`, `vm-reload-magin.png`, `vm-reload-slide.png`, `vm-swing.png`
- **`draws: 931` (`tris: 817,051`)** on `vm-ads.png` (tighter ADS FOV `50°` culls peripheral meshes)
- **`draws: 1193` (`tris: 944,060`)** on `vm-sprint.png` (wider sprint FOV `79°` pulls in more peripheral meshes)
- **`draws: 294` (`tris: 605,720`)** on `vm-look-down.png` (`pitch = -65°`, looking down at the HQ floor!)

Wait — notice that last bullet! When `vmsheet.mjs` pitches the camera down to `-65°` (`vm-look-down.png`), draws immediately drop from **`1,101` to `294`** — right back in line with `bench.mjs` (`265` at Night 20)!

To quantify every single draw call in those `1,055–1,101` Day-1 Noon shots, we ran `day1DrawsProbe` in `qa/2026-10-31-AG-170/run-ag170.mjs` under the exact `vmsheet.mjs` setup (`worldTime = 0.42` Noon, `T.grantAllWeapons()`, 1st-person horizontal pitch `0°` looking North from HQ vs 3rd-person `bench.mjs` pitch `-25°`):

### 6.1 Side-by-Side Comparison Across Camera & Time States

| Configuration | Total Draws (`Main` + `Shadow`) | `drawsMain` | `drawsShadow` | Why It Differs |
| :--- | :---: | :---: | :---: | :--- |
| **1. `bench.mjs --night 20` (3P `pitch = -25°`, starter gear, Night)** | **`266`** | `278.5` *(avg)* | **`13`** | Downward 3P pitch clips out valley horizon; Night hides bees/butterflies & disables sun shadow pass; starter gear has only `19` `hq-armory` draws |
| **2. `bench.mjs --scenario day5` (3P `pitch = -25°`, starter gear, Night/Dawn)** | **`234`** | `225.0` | **`13`** | Same 3P downward camera, fewer zombies inside HQ view |
| **3. Day 1 Noon (`worldTime = 0.42`), 3P `pitch = -25°`, `grantAllWeapons()` (`hqNoon3p`)** | **`533`** | `333` | **`200`** | Noon activates **Sun `OrthographicCamera` shadow pass (`+187` shadow draws)** + `grantAllWeapons()` adds **`+74` `hq-armory` rack draws** + **`38` bees** |
| **4. Day 1 Noon (`worldTime = 0.42`), 1P `pitch = 0°` Hip (`vmsheet.mjs` `vm-hip.png`, `hqNoon1pHip`)** | **`1,055`** *(`1,101` w/ post)* | **`867`** | **`188`** | Switching from 3P (`pitch = -25°`) to 1P horizontal (`pitch = 0°` looking North across the valley) adds **`+534` main-pass draws** from unculled valley bees, butterflies, bird flocks, streams, and micro-props! |
| **5. Day 1 Noon (`worldTime = 0.42`), 1P `pitch = -65°` (`vmsheet.mjs` `vm-look-down.png`)** | **`294`** | `~106` | `~188` | Looking down at the floor clips the entire North valley horizon frustum out of the main pass (`-761` main draws)! |

### 6.2 Exact Breakdown of the `1,055` (`867` Main + `188` Shadow) Draws in `hqNoon1pHip` (`vm-hip.png`)

| Category / Owner Group | `night20` Draws (`266`) | `vm-hip` Day 1 Noon Draws (`1,055`) | Delta (`+789`) | Exact Constituent Parts (`day1DrawsProbe.hqNoon1pHip`) |
| :--- | :---: | :---: | :---: | :--- |
| **A. Daytime Wildlife & Insects in 1P Horizon Frustum** | **`1`** | **`350`** | **`+349`** | **`bee` (`190` draws)**, **`butterfly` (`111` draws)**, **`bird-flock / flock-bird` (`36` draws)**, `Group>fish-skin` (`8`), `Group>bird-skin` (`4`), `Group>turtle-skin` (`1`). *(Bees & butterflies are multi-mesh unbatched groups with no tight distance cull; looking North at `pitch = 0°` puts dozens of valley bees/butterflies in the camera frustum!)* |
| **B. Daytime Sun `OrthographicCamera` Shadow Pass** | **`13`** | **`188`** | **`+175`** | **`player` (`71` shadow draws** — `T.grantAllWeapons()` attaches all stowed weapons to the player rig with `castShadow = true`!), **`Group>tag-wall` (`28`)**, **`Mesh` (`27`)**, **`Group` (`23`)**, **`history-props / ranger-truck` (`15`)**, **`Group>bird-skin` (`12`)**, `trapper-path` (`5`), `fuel-depot` (`4`), `fob-lockdown-door` (`2`), `fob-threshold-sign` (`1`). |
| **C. `T.grantAllWeapons()` on HQ Armory Wall (`Group>tag-wall`)** | **`80`** | **`150`** | **`+70`** | **`Group>tag-wall / hq-armory` jumps from `19` draws to `93` draws (`+74`)** when `T.grantAllWeapons()` populates every weapon slot on the HQ Armory wall! Other `tag-wall` parts: `(unnamed)` (`33`), `hq-skull-intake` (`13`), `hq-alarm-cabinet` (`5`), `hq-duty-board` (`3`), `hq-radio-set` (`2`). |
| **D. Unculled Valley Micro-Props in 1P North Horizon Frustum** | **`125`** | **`343`** | **`+218`** | • **`Mesh / (unnamed)` (`100` vs `47` = `+53`)**<br>• **`history-props` (`72` vs `0` = `+72`)**: `brass` (`36` individual shell-casing meshes!), `leghold-traps` (`14`), `survey-board:shale` (`10`), `horseshoe` (`3`), `dropped-helmet` (`2`), `open-grave` (`2`)<br>• **`trapper-path` (`33` vs `0` = `+33`)**: `trapper-cellar-roof-cap` (`21`), `trapper-horseshoe` (`8`), `trapper-cellar` (`2`), `trapper-B` (`2`)<br>• **`streamGroup` (`33` vs `0` = `+33`)**: `33` individual water/bank meshes along the valley stream<br>• **`Group / (unnamed)` (`49` vs `14` = `+35`)**<br>• **`ground-sectors` (`29` vs `16` = `+13`)**<br>• **`holy-reliquary / holy-grenade` (`12` vs `0` = `+12`)** |
| **E. 1P Viewmodel vs 3P Marine + Night Zombies** | **`99.5`** | **`24`** | **`-75.5`** | In 1P (`vm-hip`), `Group>fitted-pelvis` (`52` draws) is hidden for the main pass and replaced by **`viewmodel / vm-space` (`24` draws: `vm-gun = 14`, `vm-rig = 10`)**, while Night-20 zombies (`48.5` draws) are absent on Day 1 Noon. |

> [!TIP]
> **Highest-Leverage Draw-Call Wins Identified by the Day-1 Census**:
> 1. **`bee` (`190` draws) & `butterfly` (`111` draws) = `301` draws**: Give `bee` and `butterfly` groups a `maxDist` cull (e.g. `25–35 m` — a 2 cm bee is sub-pixel beyond `20 m`!) or merge/instance them. That alone cuts **~300 main-pass draws** in daytime 1P views.
> 2. **Unculled micro-props in `history-props` (`72` draws, including `36` individual `brass` casings and `14` `leghold-traps`), `trapper-path` (`33` draws, including `21` `trapper-cellar-roof-cap`), `streamGroup` (`33` draws), and `holy-grenade` (`12` draws) = `150` draws**: Adding `maxDist` culling to small props (`brass`, `horseshoe`, `leghold-traps`, `holy-grenade`) or merging static sub-parts (`trapper-cellar-roof-cap`, `streamGroup`, `hq-armory`) eliminates another **150–220 draws**.
> 3. **Player stowed weapons in Sun Shadow Pass (`71` shadow draws)**: Only the active equipped weapon should cast shadows (`castShadow = true`), or stowed weapons hidden in 1P should not cast `71` separate mesh draws into the sun shadow map.
