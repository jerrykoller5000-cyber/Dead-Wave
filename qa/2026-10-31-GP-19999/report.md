# GP-19999 Visual Acceptance Review — Unified Wildlife Instancing & D-107 Population Halving

- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-10-31
- **Renderer**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, `1280×720`) via shared game-test slot
- **Verdict**: **FAIL — Needs Fix Before Closing** (3 WebGPU instancing / layer-sorting defects found in live rendering)
- **Artifacts Directory**: `qa/2026-10-31-GP-19999/`
  - Contact sheet: `qa/2026-10-31-GP-19999/gp19999-review-sheet.png`
  - Machine metrics: `qa/2026-10-31-GP-19999/gp19999-summary.json`
  - Live multi-instance proofs: `live-butterfly-close-noon.png`, `live-bee-close-noon.png`, `live-flock-close-noon.png`, `diag-butterfly-two-instances-near-origin.png`
  - 4-light close-ups: `butterfly-close-{noon,overcast,dusk,night}.png`, `bee-close-{noon,overcast,dusk,night}.png`, `flock-close-{noon,overcast,dusk,night}.png`, `gameplay-fp-{noon,overcast,dusk,night}.png`

---

## 1. Executive Summary & What Passed

### Passed Checks
1. **Draw-Call Consolidation (`6` Wildlife Instanced Meshes Total)**:
   - All bees, butterflies, and sky flocks now render through exactly 6 `THREE.InstancedMesh` objects (`bird-flock-body-instanced`, `bird-flock-wings-instanced`, `bee-body-instanced`, `bee-wings-instanced`, `butterfly-body-instanced`, `butterfly-wings-instanced`), all with `frustumCulled === false`.
   - Total scene draw calls in Day 1 FP view dropped to **`446`** at `noon`, **`441`** at `overcast` (rain), **`448`** at `dusk`, and **`442`** at `night`.
2. **D-107 Population Halving**:
   - `MAX_BUGS = 12` (`index.html:12095`), active bug roll `9..14` (`9 + Math.floor(Math.random() * 6)` at `index.html:12214`), night floor `5` (`index.html:12277`).
   - Sky flocks reduced to `2` flocks of `4..5` birds (`9` total birds across both flocks in `birdFlocks`, `maxCount = 10`).
3. **Immediate Kill-Frame Count Decrement**:
   - Shooting a live butterfly (`fireRoundDbg` + `stepProjectilesDbg(1/60, 1)`) immediately decremented `butterfly-body-instanced.count` and `butterfly-wings-instanced.count` from `3 -> 2` on the exact impact frame (`decrementedImmediately: true`).
   - Shooting a live bee immediately decremented `bee-body-instanced.count` and `bee-wings-instanced.count` from `3 -> 2` on the exact impact frame (`decrementedImmediately: true`).
4. **Single-Instance Bee Geometry, Materials & TSL Local Hinge Flap**:
   - In `bee-close-{noon,overcast,dusk,night}.png`, a single bee (`instance 0`) exhibits crisp golden-yellow and dark-brown abdomen stripes, fuzzy thorax shading, translucent sky-blue wings (`rgba = [0.791, 0.888, 1.0, 0.48]`) with amber veins, and clean local-space wing rotation around `wingHinge` (`x = ±0.0085, y = 0.011`).

---

## 2. Three Blocking WebGPU Defects Found

### Defect 1 (Critical): All Instances of Each Species Stack on `instanceMatrix[0]` (`index.html:9879` + `vendor/three/three.webgpu.js:13954, 13831`)

- **Symptom / Visual Proof**:
  - In `live-flock-close-noon.png` and `flock-close-noon.png`, all **9 birds** across both flocks (`count = 9`) render stacked at the exact world position of `bird[0]`, creating an 18-winged spiky star where 9 different `wingFlap` phases rotate around one body while the other 8 bird world positions are completely empty.
  - In `live-bee-close-noon.png` (`count = 3`) and `live-butterfly-close-noon.png` (`count = 3`), all 3 active bees/butterflies render stacked on `instance 0` with multiple sets of wings flapping out of phase on a single body.
  - Controlled proof in `diag-butterfly-two-instances-near-origin.png`: `instance 0` was placed at `x = -0.18` (orange, `flap = 0.0`) and `instance 1` was placed at `x = +0.18` (cyan-blue, `flap = 0.35`) with `count = 2`. In the rendered frame, **`x = +0.18` is completely empty**, and both sets of wings (`flap = 0.0` and `flap = 0.35`) render on top of `instance 0` at `x = -0.18`.
- **Root Cause**:
  - In `wildlifeBatch()` (`index.html:9879`), `body.count = wing.count = 0;` is assigned right after creating the `THREE.InstancedMesh` objects, **before** startup `compileInSlices()` (`index.html:62176`) compiles the scene's WebGPU shaders.
  - In Three.js r175 WebGPU (`vendor/three/three.webgpu.js:13954` & `:13831`), `InstancedMeshNode.setup()` reads `const { count, instanceMatrix } = this.instancedMesh;` **once** at shader-build time and allocates `buffer( instanceMatrix.array, 'mat4', Math.max( count, 1 ) )`.
  - Because `count` is `0` during `compileInSlices()`, the WGSL shader is permanently compiled with a **1-element uniform buffer** (`array<mat4x4<f32>, 1>`) for `instanceMatrix`!
  - At runtime, when `wildlifeFinish()` sets `count = 3..9`, Dawn/WGSL clamps `instanceIndex` to index `0` of the 1-element `instanceMatrix` uniform buffer, while vertex-step `InstancedBufferAttribute`s (`wingFlap` and `wingTint`) advance normally across `0..count-1`. Thus every instance `i > 0` gets `instanceMatrix[0]`'s world transform combined with `instance i`'s `wingFlap` and `wingTint`!
- **Exact Fix**:
  - In `wildlifeBatch()` (`index.html:9872-9881`), **do not** set `body.count = wing.count = 0` before shader compilation. Keep `body.count = wing.count = count` (`maxCount`: `10` for flocks, `12` for bees/butterflies) and pre-fill all `0..count-1` slots of `body.instanceMatrix` and `wing.instanceMatrix` with `_wildlifeZero` (`new THREE.Matrix4().makeScale(0, 0, 0)`), matching the pattern already used by `motes-instanced` (`index.html:15434`) and `debris-chunks` (`index.html:15729`).

---

### Defect 2 (High): Ghost `instance 0` Still Renders When `count === 0`, and Flocks Never Hide in Rain/Night (`index.html:9892-9901, 10015` + `vendor/three/three.webgpu.js:25579`)

- **Symptom / Visual Proof**:
  - In `bee-close-noon.png`, even when `butterfly.body.count = butterfly.wing.count = 0` was set, `butterfly[0]` still rendered in the background behind `bee[0]`.
  - In `gp19999-summary.json`, during `overcast` (rain) and `night`, `bee-body-instanced` and `butterfly-body-instanced` have `count: 0, visible: true`, which in Three.js r175 WebGPU still draws `instance 0` at its last matrix!
  - Furthermore, `bird-flock-body-instanced` and `bird-flock-wings-instanced` have `count: 6..9, visible: true` during both `overcast` (rain) and `night` (`updateBirds(dt)` at `index.html:10015` never checks `bugsShouldHide()`).
- **Root Cause**:
  - In Three.js r175 WebGPU (`vendor/three/three.webgpu.js:25579`), `RenderObject.getDrawParameters()` computes:
    ```js
    const instanceCount = geometry.isInstancedBufferGeometry ? geometry.instanceCount : ( object.count > 1 ? object.count : 1 );
    ```
  - Because `InstancedMesh.geometry` is a standard `BufferGeometry` (`isInstancedBufferGeometry` is `undefined`), whenever `object.count === 0`, `object.count > 1` is `false` and Three.js passes **`instanceCount = 1`** to `drawIndexed()`! Unless `object.visible = false` (or `instanceMatrix[0]` is zeroed with `_wildlifeZero`), `instance 0` is always drawn when `count === 0`.
- **Exact Fix**:
  1. In `wildlifeFinish(batch, count)` (`index.html:9892-9901`), after startup compilation (`_preRollDone`), set `batch.body.visible = batch.wing.visible = count > 0;` **and** when `count === 0`, write `_wildlifeZero` into slot `0` (`batch.body.setMatrixAt(0, _wildlifeZero); batch.wing.setMatrixAt(0, _wildlifeZero)`).
  2. In `updateBirds(dt)` (`index.html:10015`), check `if (bugsShouldHide()) { wildlifeFinish(_birdFlockBatch, 0); return; }` (or hide flocks during rain/night alongside bugs).

---

### Defect 3 (High): Butterfly Wings Render Solid Dark Brown (`#221a14`) Because `foreBorder`/`hindBorder` Overdraw `foreColor`/`hindColor` and `sp` (`index.html:9810, 9847, 12000-12032`)

- **Symptom / Visual Proof**:
  - In `butterfly-close-noon.png`, `butterfly-close-overcast.png`, `butterfly-close-dusk.png`, `butterfly-close-night.png`, and `live-butterfly-close-noon.png`, the butterfly wings are completely opaque dark brown (`#221a14`, matching `butteBodyMat`) with **zero** visible orange/blue/yellow palette tint (`wingTint`) and **zero** visible ivory wing spots (`butteSpotMat`).
- **Root Cause**:
  - In `makeButterflyMesh()` (`index.html:12000-12032`), each wing is built from stacked parallel planes in local `Y`:
    - `foreBorder` / `hindBorder`: full `1.0`-scale silhouette, `butteBodyMat` (`0x221a14`, `opacity: 1.0`, `transparent: false`), positioned at `|y| <= 0.0005` (added **last** to `pivot` at lines `12026-12031`).
    - `foreColor` / `hindColor`: `0.88` / `0.87`-scale inner fill, `wingMat` (`opacity: 0.9`, `transparent: true`, `wingTintable = 1`), positioned at `|y| = 0.0008..0.0018` (added first to `pivot` at lines `12001-12006`).
    - `sp` / `spBot`: ivory spots, `butteSpotMat` (`0xfaf0dc`, `opacity: 1.0`), positioned at `|y| = 0.0020..0.0024` (added second to `pivot` at lines `12011-12023`).
  - `butterfly-wings-instanced` uses a single merged material with `transparent: true, depthWrite: false` (`index.html:9847`). Because `depthWrite` is `false`, triangles within the wing mesh do **not** depth-buffer against each other; whichever triangles appear **last** in the merged vertex buffer paint on top of all earlier triangles.
  - In `wildlifeShape(root, true)` (`index.html:9810`), wing parts are sorted by:
    ```js
    parts.sort((a, b) => (a.part.material?.opacity ?? 1) - (b.part.material?.opacity ?? 1));
    ```
  - This puts `foreColor`/`hindColor` (`opacity: 0.9`) **first** (drawn at the bottom), `sp`/`spBot` (`opacity: 1.0`, earlier in child order) **second**, and `foreBorder`/`hindBorder` (`opacity: 1.0`, last in child order) **last** (drawn on top of everything)! Because `foreBorder`/`hindBorder` are full `1.0`-scale dark-brown shapes covering the entire wing area, they completely overwrite `foreColor`, `hindColor`, and `sp`/`spBot`.
- **Exact Fix**:
  - In `wildlifeShape(root, true)` (`index.html:9810`), sort wing sub-parts from inner base layer (`|y| ≈ 0`) to outer detail layer (`|y| > 0`), or sort by `Math.abs(a.part.position.y) - Math.abs(b.part.position.y)`:
    ```js
    if (wings) parts.sort((a, b) => Math.abs(a.part.position.y) - Math.abs(b.part.position.y));
    ```
    With `|y|` sorting:
    1. `foreBorder` / `hindBorder` (`|y| = 0..0.0005`) draw **first** as the dark-brown outer rim backing;
    2. `foreColor` / `hindColor` (`|y| = 0.0008..0.0018`, `0.88` scale, `wingTintable = 1`) draw **second** over the center of the border, leaving the `12%` dark-brown margin around the perimeter;
    3. `sp` / `spBot` (`|y| = 0.0020..0.0024`) draw **third** on top of the colored wing panels!

---

## 3. 4-Light Asset & Motion Scores (`0–5`) — Current Checkout

| Asset Batch | Geometry (`0–5`) | Material across 4 Lights (`0–5`) | Context / Placement (`0–5`) | Motion / Wing Flap (`0–5`) | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Bee (`bee-body-instanced` + `bee-wings-instanced`)** | **4.5 / 5** | **4.5 / 5** | **1.5 / 5** | **3.5 / 5** | Single-bee body stripes, thorax, and translucent sky-blue wings with amber veins look great in all 4 presets (`bee-close-*.png`). Context/Motion penalized by Defect 1 (all active bees stack at `bee[0]`) and Defect 2 (ghost `bee[0]` drawn when `count === 0`). |
| **Butterfly (`butterfly-body-instanced` + `butterfly-wings-instanced`)** | **4.0 / 5** | **1.5 / 5** | **1.5 / 5** | **3.5 / 5** | Material heavily penalized by Defect 3 (`foreBorder`/`hindBorder` paints solid `#221a14` dark brown over `foreColor`/`hindColor` and `sp`). Context/Motion penalized by Defect 1 (all active butterflies stack at `butterfly[0]`) and Defect 2 (ghost at `count === 0`). |
| **Bird Flock (`bird-flock-body-instanced` + `bird-flock-wings-instanced`)** | **4.0 / 5** | **4.0 / 5** | **1.0 / 5** | **2.0 / 5** | Individual bird silhouette and shading across `noon`/`overcast`/`dusk`/`night` are clean, but Defect 1 stacks all 9 birds across both flocks onto `bird[0]` as an 18-winged starburst (`flock-close-*.png`, `live-flock-close-noon.png`), and `updateBirds` stays active in rain and night. |

---

## 4. Bonus Diagnostic: `GP-19988` `brute.json` v3 Get-Up Retake with `body.apply()` (`studio/motion.js`)

Per Grokbot's follow-up note (`handoffs/requests.md:4613`), we re-ran the 6-beat `brute.json` v3 get-up capture calling `body.follow(); body.update(dt); body.apply();` on every substep (`qa/2026-10-31-AG-169/gp19988-brute-getup-applied-sheet.png` and `gp19999-summary.json -> bruteRetake`).

- **Finding**:
  - In `body.points()` (`P`), the simulated physics points at `u = 0.35` (`2-knee-under`) **are** in the low hands-and-knees pose (`pelvisY = 0.12m`, `waistY = 0.456m`, `chestY = 0.409m`, `headY = 0.476m`, `handLY = 0.05m`, `kneeLY = 0.07m`).
  - However, in the rendered screenshots (`gp19988-brute-getup-applied-sheet.png`), the brute mesh's torso and limbs **still remain vertical** and sink waist-deep into the ground!
- **Root Cause in `studio/motion.js:287-300` vs `:723-729`**:
  - In `body.follow()` (`studio/motion.js:287-300`), `getupKeys` offsets are added directly into the animated target positions `A`, while `s.animW` (`_qa`, line 303) stores the **un-offset upright standing** joint world matrices.
  - Then in `body.apply()` (`studio/motion.js:723-729`), the solver computes the rotation delta from `A` to `S` (`_qc * _qb.invert()` for torso/head frames and `setFromUnitVectors(A_dir, S_dir)` for limb aims) and multiplies that delta onto `_qa` (`s.animW`).
  - Because **both** `A` and `S` are in the `getupKeys` hands-and-knees pose (`S ≈ A`), the rotation delta from `A` to `S` is the **identity quaternion** (`0°`), leaving every joint at `_qa` (standing upright) while `pelvis.position` is translated down to `S[pelvis].y = 0.12m`!
- **Fix for `studio/motion.js`**:
  - Keep `A` as the pure un-offset animated joint positions (matching `s.animW`), and apply the `getupKeys` offsets only to the spring targets inside `stepOnce()` (or a separate target buffer `G`) so `body.apply()` computes the true rotation delta from standing (`A`) to simulated (`S`).
