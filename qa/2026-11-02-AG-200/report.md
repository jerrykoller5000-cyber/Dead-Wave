# AG-200 — The Sphere Between His Feet, Again (`J52`; `GP-19991` Check)

- **Date**: `2026-11-02`
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Hardware**: NVIDIA GeForce RTX 5080, WebGPU (`1920×1080 @1.00x`)
- **Contact Sheet**: `qa/2026-11-02-AG-200/sheet.jpg`
- **Raw Scene & Vertex Audit**: `qa/2026-11-02-AG-200/probe-summary.json` (`qa/2026-11-02-AG-200/audit-dump-utf8.txt`)
- **Screenshots**:
  1. `qa/2026-11-02-AG-200/fp-unarmed-standing-feet.jpg`
  2. `qa/2026-11-02-AG-200/fp-pistol-standing-feet.jpg`
  3. `qa/2026-11-02-AG-200/fp-pistol-walking-feet.jpg`
  4. `qa/2026-11-02-AG-200/fp-pistol-aiming-feet.jpg`
  5. `qa/2026-11-02-AG-200/tp-standing-feet-closeup.jpg`
  6. `qa/2026-11-02-AG-200/tp-standing-live.jpg`
  7. `qa/2026-11-02-AG-200/tp-walking-feet-closeup.jpg`
  8. `qa/2026-11-02-AG-200/tp-aiming-feet-closeup.jpg`

---

## 1. Executive Summary: What Is Between His Feet in the Training Ground (`J52`)

We audited every mesh in the live WebGPU scene within `0.80 m` of the marine's feet (`feetCenter = [0, -199.95, -640.61]`) across 8 standing, walking, and aiming poses in both **first person** and **third person**, hooking `onBeforeRender` to record `drawnInMainPass` alongside `visibleChain`, `layers.mask`, `vmEyeHide`, `worldOrigin`, and transformed vertex distances (`distActualVerts`).

We found **three distinct sources** of spheres / round geometry between or around his feet:

1. **First-Person Downward View (`fp-pistol-standing-feet.jpg`, `fp-pistol-walking-feet.jpg`, `fp-pistol-aiming-feet.jpg`) — The Round Camo Neck-Cap & Collar Bowl Directly Between the Camera and His Feet (Owner: Claude)**:
   - When the player switches to **first person** (`Digit5`, `FP_EYE = [0, 0.205, 0.12]` in `headG` space → `eye = [0.002, -198.575, -640.50]`, `1.425 m` above the floor) and pitches down (`-1.45 rad`) to look between his feet, `syncFirstPersonHead()` (`index.html:50930-50934`) hides `headG`, **exposing the closed circular top cap of `fitted-uniform` (`studio/marine-body.js:307`, `form(..., 'fitted-uniform', 32)` with default `caps = 'both'`, a 32-segment circular disc of radius `0.092 m × 0.079 m` at `y = 1.21 m`) surrounded by the 40-segment `blouse-collar` ring (`studio/marine-body.js:318-335`, `rx = 0.166..0.092 m` at `y = 1.15..1.25 m`) only `17–21 cm` directly below the first-person eye**.
   - As seen in `fp-pistol-standing-feet.jpg` (and at the bottom of `fp-pistol-walking-feet.jpg` / `fp-pistol-aiming-feet.jpg`), looking down toward his feet in 1P projects this round 32/40-segment camo neck lid + collar into the **dead center of the screen (`~550 px` wide, `ndc ≈ [0, 0]`) right between his feet**, reading as a large camo sphere/bowl.
   - In addition, when `viewmodel` is active (`vmActive = true`), `setEyeHide()` in `game/viewmodel.js:128-137` only sets `vmEyeHide` on `[marine.userData.armLG, marine.userData.armRG, weaponMount, ...stowed]`. It does **not** hide `live-sleeve-live` (`live-sleeve > live-sleeve-live > marine`), `torsoG` (`rig-skin` `wear:shirt` / `wear:carrier` / `wear:pack`), or `marine-flexible-shirt` (`marine-waist-live > marine`), so his 3P shoulders and collar fill the downward 1P view.

2. **WebGPU `InstancedMesh` `count = 0` Bug Drawing Ghost `rig.grenades` Sphere (`SphereGeometry(0.034, 10, 8)`) + `rig.boxes` + `rig.tanks` (`drawnInMainPass = true` in 1P & 3P) (Owner: Claude / ChatGPT)**:
   - In `vendor/three/three.webgpu.js:25579` (`RenderObject.getDrawParameters`):
     ```js
     const instanceCount = geometry.isInstancedBufferGeometry ? geometry.instanceCount : ( object.count > 1 ? object.count : 1 );
     ```
     Because `0 > 1` is `false`, **Three.js `WebGPURenderer` draws `instanceCount = 1` (instance `0`) for EVERY `InstancedMesh` that has `count === 0` and `visible === true`!**
   - In `index.html:23833-23840` (`carryInstanced`) and `index.html:23931-23932`:
     `rig.grenades = carryInstanced(new THREE.SphereGeometry(0.034, 10, 8), carryMats.grenade, CARRY_SLOTS.grenades, ...)` is added to `hipsG` (`lowerBody`, whose origin is `[0, -199.997, -640.61]`, `distOrigin = 0.047 m` — **right between his feet**).
   - In `applyCarryPlan` (`index.html:24067-24069`), when the player is in the Training Ground with **`G×0` (`p.grenades = 0`)**, `rig.grenades.count` is set to `0` while `rig.grenades.visible` remains `true` (`frustumCulled = false`). As a result, **`rig.grenades` (`SphereGeometry(0.034, 10, 8)`, `MeshStandardMaterial#4b5434`, `99` verts) is drawn every frame (`drawnInMainPass = true`) with `instanceCount = 1` at `[0.1568, -199.307, -640.379]` (`distActualVerts = 0.676 m` from his feet on his right hip)**, along with `rig.boxes` (`count = 0`, `BoxGeometry(0.09, 0.1, 0.13)`) and `rig.tanks` (`count = 0`, `CylinderGeometry(0.05, 0.05, 0.26, 12)`).
   - Furthermore, because `InstancedMeshNode` (`vendor/three/three.webgpu.js:13831`) allocates `buffer(instanceMatrix.array, 'mat4', Math.max(count, 1))` using the `count` at first shader compile (`1` during `trainingWarmCompile` at `index.html:61462`), buying >1 grenade/mag/box later in the Training Ground exceeds the compiled `mat4[1]` UBO length unless `carryInstanced` warms with full capacity `n` and toggles `mesh.visible = count > 0` (or zeroes unused instance scales, like `wildlife` does at `index.html:10163`).

3. **`chapel-glow` Sphere (`SphereGeometry(0.62, 14, 10)`) Always Drawn at `opacity = 0` (`distActualVerts = 0.259 m`) & `marine-idle-props` Spark Sphere (`SphereGeometry(0.016, 5, 4)`) Parked at `[0, 0, 0]` (`distActualVerts = 0.0182 m`)**:
   - **`chapel-glow`** (`index.html:21262-21269`): `SphereGeometry(0.62, 14, 10)` (`165` verts, `scale = [0.72, 1.2, 0.48]`, `MeshBasicMaterial#ffe7a0`, `transparent: true, opacity: 0`), parented to `marine` (`distActualVerts = 0.259 m` from `feetCenter`). Because `updateChapelBless()` (`index.html:21293-21295`) only sets `chapelHalo.material.opacity = 0` and never sets `chapelHalo.visible = false`, `chapel-glow` is submitted and drawn in the main transparent pass (`drawnInMainPass = true`) every single frame.
   - **`marine-idle-props`** (`studio/marine-idle.js:35-56`): `spark` (`SphereGeometry(0.016, 5, 4)`, `MeshBasicMaterial#ff6125`, `distActualVerts = 0.0182 m` — `1.8 cm` from `feetCenter`), `lighter`, `cig`, and `pack` still sit at local `[0, 0, 0]` on `marine` (`worldOrigin = [0, -199.997, -640.61]`, right between his boots). `GP-19991` kept `visibleProperty = false` and `drawnInMainPass = false` across all 8 standing/walking/aiming poses before the 25s idle timer, but parking their rest transform at `[0, -100, 0]` when hidden guarantees they can never appear between his feet even if visibility is ever toggled early.

---

## 2. Complete Table of Every Mesh Within `0.80 m` of His Feet (`feetCenter = [0, -199.95, -640.61]`)

### 2.1 Meshes Actively Drawn in the Main Render Pass (`drawnInMainPass = true`) Within `0.80 m` (Vertex Distance)

| # | Name | Type | Parent Chain | Geometry | Material | Instanced | `dOrig` (m) | `dVert` (m) | Status / Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 3960)` | `wear:boots` (`MeshStandardMaterial#1c1c16`) | no | `0.047` | `0.063` | Baked boot uppers (`L=1`) |
| 2 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 5928)` | `wear:boots` (`MeshStandardMaterial#121210`) | no | `0.047` | `0.067` | Baked boot soles/lugs (`L=1`) |
| 3 | `marine-shadow` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 45714 / 66870)` | `MeshBasicMaterial#000000` | no | `0.047` | `0.069` | Shadow-camera-only proxy (`layers.test` = shadow cam) |
| 4 | `live-trouser-leg` (×2) | `Mesh` | `live-trouser-leg-live > marine > rollPivot > player > Scene` | `BufferGeometry (verts: 4950)` | `wear:trousers` (`MeshStandardMaterial#d2cebd`) | no | `0.047` | `0.100` | Live-cloth left & right trouser legs |
| 5 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 7212 in 1P / 19992 in 3P)` | `rig-skin-plain` (`MeshStandardNodeMaterial#ffffff`) | no | `0.047` | `0.131` | Baked untextured kit (laces, buckles, straps, pouches) |
| 6 | `training-impact-marks` | `Mesh` | `training-ground > Scene` | `BufferGeometry (verts: 768)` | `training-impact-mark` (`MeshBasicMaterial#ffffff`) | no | `0.245–0.612` | `0.243–0.611` | Range floor decal pool |
| 7 | **`chapel-glow`** | **`Mesh`** | **`marine > rollPivot > player > Scene`** | **`SphereGeometry (radius: 0.62, 14×10, verts: 165)`** | **`MeshBasicMaterial#ffe7a0` (`opacity: 0`)** | **no** | **`1.003`** | **`0.258`** | **Sphere (`scale [0.72, 1.2, 0.48]`) drawn every frame at `opacity: 0` because `visible` is never set `false` (`index.html:21262-21295`)** |
| 8 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 2040)` | `wear:trousers` (`MeshStandardMaterial#d2cebd`) | no | `0.047` | `0.425` | Baked rigid pelvis (`fitted-pelvis`) + thigh pocket folds |
| 9 | `live-seat` | `Mesh` | `live-seat-live > marine > rollPivot > player > Scene` | `BufferGeometry (verts: 1848)` | `wear:trousers` (`MeshStandardMaterial#d2cebd`) | no | `0.047` | `0.433` | Live-cloth seat/crotch (`studio/marine-body.js:302`) |
| 10 | `open-molded-holster` | `Mesh` | `hip > legLG > lowerBody > marine > rollPivot > player > Scene` | `BufferGeometry (verts: 32)` | `MeshStandardMaterial#3b3326` | no | `0.583` | `0.450` | Drop-leg holster shell on left thigh |
| 11 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 72)` | `wear:holster` (`MeshStandardMaterial#34382c`) | no | `0.047` | `0.494` | Baked thigh holster mount |
| 12 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 1572)` | `wear:belt` (`MeshStandardMaterial#2b2e24`) | no | `0.047` | `0.521` | Baked belt & belt pouches |
| 13 | **`marine-flexible-shirt`** | **`Mesh`** | **`marine-waist-live > marine > rollPivot > player > Scene`** | **`BufferGeometry (verts: 6720)`** | **`wear:shirt` (`MeshStandardMaterial#e2ded0`)** | **no** | **`0.047`** | **`0.667`** | **Live waist shirt (`studio/marine-waist.js:31`); stays visible in 1P when looking down** |
| 14 | **`(unnamed)` (`rig.grenades`)** | **`InstancedMesh`** | **`lowerBody > marine > rollPivot > player > Scene`** | **`SphereGeometry (radius: 0.034, 10×8, verts: 99)`** | **`MeshStandardMaterial#4b5434` (`carryMats.grenade`)** | **`yes (count=0)`** | **`0.047`** | **`0.675`** | **GHOST SPHERE DRAWN IN WEBGPU: `count = 0` (`G×0`), `visible = true`; `three.webgpu.js:25579` draws `instanceCount = 1` at `[0.157, -199.307, -640.379]`, and mesh origin is at `[0, -199.997, -640.61]` between his feet!** |
| 15 | `(unnamed)` (`rig.mags`) | `InstancedMesh` | `torsoG > marine > rollPivot > player > Scene` | `BoxGeometry (0.045×0.05×0.024, verts: 24)` | `MeshStandardMaterial#24272b` (`carryMats.mag`) | `yes (count=5)` | `0.652` | `0.683` | Belt & carrier magazine tops (`count = 5`) |
| 16 | `(unnamed)` | `Mesh` | `torsoG > marine > rollPivot > player > Scene` | `BufferGeometry (verts: 1956)` | `wear:pack` (`MeshStandardMaterial#4a5538`) | no | `0.652` | `0.761` | Pack trim |
| 17 | `rig-skin` | `SkinnedMesh` | `marine > rollPivot > player > Scene` | `BufferGeometry (verts: 3312)` | `wear:pack` (`MeshStandardMaterial#5a6b3e`) | no | `0.047` | `0.768` | Baked pack body |
| 18 | **`rig-skin` (`fitted-uniform` + `blouse-collar`)** | **`SkinnedMesh`** | **`marine > rollPivot > player > Scene`** | **`BufferGeometry (verts: 5640)` (`torsoG` `wear:shirt`: `7584` verts)** | **`wear:shirt` (`MeshStandardMaterial#e2ded0`)** | **no** | **`0.047` (`0.652`)** | **`0.601–1.016`** | **Contains the 32-seg circular top cap of `fitted-uniform` (`y=1.21m`) + 40-seg `blouse-collar` (`y=1.15..1.25m`) that fills the center of the 1P downward view (`fp-pistol-standing-feet.jpg`)** |
| 19 | **`live-sleeve` (×2)** | **`Mesh`** | **`live-sleeve-live > marine > rollPivot > player > Scene`** | **`BufferGeometry (verts: 5238)`** | **`wear:shirt` (`MeshStandardMaterial#e2ded0`)** | **no** | **`0.047`** | **`0.605–0.898`** | **3P live-cloth sleeves; NOT hidden by `viewmodel.js` `setEyeHide`, visible when looking down in 1P (`fp-pistol-standing-feet.jpg`)** |
| 20 | `viewmodel` (`vm-gun` + `vm-arm-l/r`) | `Mesh` (×13) | `vm-gun / vm-arms > vm-space > viewmodel > Scene` | `BufferGeometry` (pistol + hands + sleeves) | `vm:*` (`MeshStandardNodeMaterial`) | no | `0.735–0.917` | `0.708–0.786` | 1P viewmodel meshes when pitching down (`-1.45 rad`) in poses 2–4 |

*(Note: 102 additional static `training-ground` world meshes have their group origin `[0, -200, -640]` within `0.612 m` of `feetCenter`, with their actual vertices `1.9 m–94.1 m` away; all 102 are listed in `probe-summary.json`.)*

---

### 2.2 Hidden / Baked-Source Meshes Within `0.80 m` of His Feet (`drawnInMainPass = false`)

| Group / Name | Type | Parent Chain | Geometry | Material | `visChain` | `layers` | `vmEyeHide` | `dOrig` (m) | `dVert` (m) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **`(unnamed)` (`spark`)** | **`Mesh`** | **`marine-idle-props > marine > rollPivot > player > Scene`** | **`SphereGeometry (radius: 0.016, 5×4, verts: 30)`** | **`MeshBasicMaterial#ff6125`** | **`false`** | **`1`** | **`false`** | **`0.047`** | **`0.0182`** | **Lighter spark sphere at `[0, -199.968, -640.61]` (`1.8 cm` from feet); hidden by `GP-19991` until 25s idle** |
| `(unnamed)` (`lighter`) | `Mesh` | `marine-idle-props > marine > rollPivot > player > Scene` | `BoxGeometry (0.026×0.05×0.02, verts: 24)` | `MeshStandardMaterial#ad713d` | `false` | `1` | `false` | `0.047` | `0.0274` | Lighter body parked at feet origin `[0, 0, 0]` |
| `(unnamed)` (`cig` ×3) | `Mesh` | `Group > marine-idle-props > marine > rollPivot > player > Scene` | `CylinderGeometry (r: 0.0037, verts: 52)` ×3 | `#ad713d`, `#e9dec7`, `#ff6125` | `false` | `1` | `false` | `0.048–0.089` | `0.043–0.086` | Cigarette filter, paper, ember parked at feet origin |
| `(unnamed)` (`pack` ×3) | `Mesh` | `Group > marine-idle-props > marine > rollPivot > player > Scene` | `BoxGeometry (verts: 24)` ×3 | `#e9dec7`, `#9c3930` | `false` | `1` | `false` | `0.027–0.064` | `0.048–0.061` | Cigarette pack box, band, lid parked at feet origin |
| `boot-shaft` & boot sources (×12) | `Mesh` | `boot-shaft / ankle > knee > legG > lowerBody > marine` | `BufferGeometry (verts: 36–1548)` | `wear:boots` (`#1c1c16`, `#121210`, `#5f5846`, `#2b2e24`) | `true` | `0` | `false` | `0.140–0.332` | `0.063–0.180` | Source meshes baked into `rig-skin` (`layers.mask = 0`) |
| `fitted-pelvis`, `holster-thigh-band`, belt & trouser sources (×15) | `Mesh` | `lowerBody / legG > marine` | `BufferGeometry` / `BoxGeometry` | `wear:trousers`, `wear:belt`, `wear:holster` | `true` | `0` | `false` | `0.047–0.666` | `0.425–0.662` | Source meshes baked into `rig-skin` (`layers.mask = 0`) |
| Stowed / holstered / unequipped weapons (`weaponMeshes` & `carryRig`) | `Mesh` (×360) | `weaponMount` / `carryRig.hip` / `carryRig.slings` / `carryRig.holsters` | `BufferGeometry` / `SphereGeometry` / `CylinderGeometry` | `furniture:*`, `fold-static`, metals | `false` (or `vmEyeHide: true` in 1P) | `1` | `true` in 1P | `0.488–0.895` | `0.432–0.805` | Hidden or `vmEyeHide = true` (layer `31`) in 1P |

---

## 3. Recommended Fixes by Owner

1. **Claude (`index.html`, `studio/marine-body.js`, `game/viewmodel.js`)**:
   - **First-Person Body/Collar Clipping When Looking Down (`fp-pistol-standing-feet.jpg`)**:
     - When `viewFirst && OTS.w > 0.6` (or inside `viewmodel.js` `setEyeHide`), hide the upper-body/collar meshes that sit directly below `FP_EYE` (`blouse-collar`, `fitted-uniform`'s top cap or `torsoG` / `live-sleeve-live` / `marine-waist-live` in 1P), or open `fitted-uniform` with `caps = 'low'` so there is no solid camo disc lid at `y = 1.21 m` right under the 1P camera.
   - **WebGPU `InstancedMesh` `count = 0` Ghost Draws (`index.html:23833-23840`, `24067-24069`)**:
     - In `applyCarryPlan` (`index.html:24067-24069`), set `.visible = count > 0` alongside `.count` for `rig.mags`, `rig.grenades`, `rig.shells`, `rig.rounds40`, `rig.boxes`, and `rig.tanks` (because `vendor/three/three.webgpu.js:25579` evaluates `object.count > 1 ? object.count : 1`, drawing `1` instance whenever `count === 0` and `visible === true`!).
     - In `trainingWarmCompile` (`index.html:61462`), warm `emptyInst` with their full slot count (or zero-scale matrices) and set `.visible = false` when restoring `o.count = 0`.
   - **`chapel-glow` (`index.html:21262-21295`)**:
     - Set `chapelHalo.visible = false` initially and in `updateChapelBless` whenever `chapelGlowT <= 0`, so the `0.62 m` sphere is not drawn at `opacity = 0` every frame.
2. **ChatGPT (`studio/marine-idle.js`)**:
   - In `hide()` (`studio/marine-idle.js:151`), also park `root.position.set(0, -100, 0)` (and restore `root.position.set(0, 0, 0)` when `root.visible = true` at line 208) so `spark` (`SphereGeometry(0.016, 5, 4)`), `lighter`, `cig`, and `pack` never sit at `[0, 0, 0]` (`1.8 cm` from his feet) while hidden.
