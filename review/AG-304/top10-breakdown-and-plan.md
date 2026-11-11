# AG-307 (`AG-304` Follow-Up) — Top-10 Breakdown of the ~9 s Training Blackout & Plan to Reach ~5 s

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Raw Profiler Receipt:** `review/AG-304/blackout-top10-breakdown.json` (measured in `--exclusive` slot on RTX 5080 WebGPU via `qa/2026-11-11-AG-304/ag304-top10-breakdown.mjs` with recursion-guarded hooks on `renderer._objects`, `_nodes`, `_bindings`, `_pipelines`, `compileAsync`, `render`, and `device.queue.onSubmittedWorkDone`).

---

## (a) Top-10 Breakdown of the ~9 s Blackout (`8,803.1 ms` Cold 3P / `6,783.6 ms` Cold 1P)

### Macro Timeline Summary
- **`mode3P` (`8,803.1 ms` wall; up to `~9.2–10.4 s` on cold browser start):**
  1. `startTraining() + enterTraining()` synchronous scene/station/collider build: **`1,132.4 ms`**
  2. `renderer.compileAsync` synchronous main-thread JS CPU: **`6,435.1 ms`**
  3. Dawn background async pipeline queue wait beyond sync CPU: **`202.9 ms`** *(GPU driver threads finish almost completely behind JS CPU!)*
  4. `warmFrame('training-clean')` synchronous pipeline misses (`384.6 + 386.6 ms`): **`771.2 ms`**
  5. `device.queue.onSubmittedWorkDone()` + initial frame overhead: **`192.4 ms`**
- **`mode1P` (`6,783.6 ms` wall; `~9.2 s` on cold browser start):**
  1. `startTraining() + enterTraining()` synchronous build: **`894.3 ms`**
  2. `renderer.compileAsync` synchronous main-thread JS CPU: **`4,845.9 ms`**
  3. Dawn background async pipeline queue wait beyond sync CPU: **`276.7 ms`**
  4. `warmFrame('training-clean')` synchronous pipeline misses (`288.7 + 290.3 ms`): **`579.0 ms`**
  5. `device.queue.onSubmittedWorkDone()` + initial frame overhead: **`130.3 ms`**

### Ranked Top-10 Compile / Load Steps

| Rank | Step / Subsystem | Cold 3P (`ms`) | Cold 1P (`ms`) | Drawable Visits / Unique Mats / New Async Pipes | Exact Cause |
|---:|---|---:|---:|---|---|
| **1** | **Training Cutaway & Containment Fade Materials** (`tg.cutaway` + `containment`) | **`1,962.3 ms`** | **`1,515.5 ms`** | `366` visits · `62` mats · `22` pipes | `world/training-cutaway.js:58-68` clones `solid` & `fade` separately per wall group (`11` groups × ~6 materials = `62` fade material instances) + containment fixtures; every distinct `RenderObject` runs `getMaterialCacheKey()` + uniform/bind-group setup across main + shadow passes. |
| **2** | **Marine Fade Pipeline Keepers (`trainingMarineFade.prepareWarmup`)** | **`1,580.9 ms`** | **`1,014.6 ms`** | `106` visits · `62` mats · `39` pipes | `game/training-camera-collision.js:101-135` swaps live `marine` to `p.faded` **and simultaneously** adds `106` `SkinnedMesh`/`Mesh` keepers (`53` `p.original` + `53` `p.faded` duplicates of live `marine`!), deduplicating by `material.id` instead of shader signature (`getMaterialCacheKey`), and runs even in `1P`. |
| **3** | **`enterTraining()` Sync Build (Room, HQ Copies, Perimeter, Wreck)** | **`1,132.4 ms`** | **`894.3 ms`** | `buildTrainingGround` + `trainingCopies` + `perimeter` + `wreck` | Synchronous first-visit construction + `bakeStatic` on room, 5 HQ station copies (`CIF`, `Armory`, `Kiosk`, `hqPanel`, `skullWindow`), concertina razor perimeter, colliders, and `refreshArmoryRack(true)`. |
| **4** | **`3P` Carried Gear, Slings & Pouches (`updateCarriedGear`)** | **`796.6 ms`** | **`452.0 ms`** | `197` visits · `37` mats · `19` pipes | Live `marine` carried pouches/slings/holsters traversed with fade materials (`walkDedupe` did not deduplicate `SkinnedMesh`/`InstancedMesh` or exact Three.js material cache keys). |
| **5** | **`warmFrame('training-clean')` Synchronous Pipeline Misses** | **`771.2 ms`** | **`579.0 ms`** | 2 render passes (`384.6 + 386.6 ms` 3P) | `drawablePipelineSig` in `index.html:64980` checked `typeof m.customProgramCacheKey === 'function'`, which is **always `true` on `THREE.Material.prototype`** (returning `''`), collapsing `cutawayKeepers` to **1 mesh** (`39.4 ms`) and hiding distinct solid materials (`metalness !== 0`, `emissiveIntensity !== 0`, `map`, `vertexColors`) so `warmFrame` compiled them synchronously! |
| **6** | **Training Ground Architecture & Props (`tg.group` opaque)** | **`544.1 ms`** | **`433.2 ms`** | `377` visits · `70` mats · `2` pipes | Remaining `tg.group` architectural meshes + ballistics/char/wreck `InstancedMesh` warmups. |
| **7** | **`3P` Other 11 Unissued Weapons (`weaponMeshes` + `offhandMeshes`)** | **`474.0 ms`** | **`469.1 ms`** | `31` visits · `11` mats · `11` pipes | All 11 unissued 3P weapons + offhands compiled during blackout; each weapon's exterior artwork `InstancedMesh` (`count > 1`) hashes `object.uuid` into Three.js `getMaterialCacheKey()` (`three.webgpu.js:25777`), forcing 11 separate `NodeBuilder` + async pipeline builds. |
| **8** | **`3P` Marine Body & Rig (`SkinnedMesh`)** | **`466.4 ms`** | **`328.4 ms`** | `50` visits · `16` mats · `8` pipes | Live marine `SkinnedMesh` body + `marineShadowProxy` (`96/128` padded bones). |
| **9** | **`1P` Other 11 Unissued Weapons (`viewmodel.prepareWarmup` 11 clones)** | **`412.1 ms`** | **`353.3 ms`** | `14` visits · `10` mats · `11` pipes | `viewmodel.prepareWarmup(WEAPON_ORDER)` clones & compiles all 12 1P guns (`vmMaterial` clones + `count > 1` `InstancedMesh` artwork with per-UUID shaders) during blackout even though only `'pistol'` is holstered on entry. |
| **10** | **Copied HQ Stations (`339.5 ms`) + `1P` Blade/Grenade Hands (`283.1 ms`)** | **`622.6 ms`** | **`556.5 ms`** | `62` station visits (`5` pipes) + `7` 1P blade/grenade visits (`7` pipes) | Baked station copies + `armoryRack` weapon clones (`339.5 ms` 3P / `361.8 ms` 1P) and 1P blade/grenade hands (`283.1 ms` 3P / `194.7 ms` 1P). *(Next: Dawn queue tail `202.9 ms` 3P / `276.7 ms` 1P; Perimeter fence `86.0 ms`.)* |

---

## (b) Concrete Plan to Reach `~4.6 – 5.2 s` Safely (`0` Inspector Errors, `0` Live Hitches)

The breakdown shows that **GPU async compilation is NOT the bottleneck (`203 ms` tail)** — **`84%` of the blackout is main-thread JS inside `compileAsync` + `warmFrame` misses (`7,206 ms` in 3P)** caused by three concrete issues we can fix cleanly:

### 1. What's Duplicated (Immediate `~2,750 ms` Blackout Savings — Zero Deferral Risk)
1. **Fix `drawablePipelineSig(o)` to match `RenderObject.getMaterialCacheKey()` (`vendor/three/three.webgpu.js:25695-25784`) (`-650 ms` on `warmFrame`, `0` misses):**
   - Replace the broken `typeof m.customProgramCacheKey === 'function'` check (which returned `''` for every standard material and collapsed `cutawayKeepers` to 1 object!) with Three.js's exact shader signature: `m.type`, `m.customProgramCacheKey()`, non-zero vs zero numeric flags (`metalness`, `roughness`, `emissiveIntensity`, `alphaTest`, `clearcoat`, `polygonOffsetFactor`), texture/map presence + mapping, `side`, `transparent`, `depthWrite`, `blending`, `polygonOffset`, `vertexColors`, `flatShading`, `toneMapped`, `fog`, custom TSL node UUIDs, `skeleton.bones.length` (for `SkinnedMesh`!), and **never** deduplicating `InstancedMesh` with `count > 1` (since `three.webgpu.js:25777` hashes `object.uuid` when `count > 1`).
   - Result: `cutawayKeepers` preserves all ~22 true solid shader variants (`warmFrame` drops from **`771 ms` -> `< 45 ms`**) AND `walkDedupe` safely deduplicates redundant `Mesh` and same-bone-count `SkinnedMesh` drawables!
2. **Eliminate Duplicate `p.faded` Keepers & Share `solid`/`fade` Clones Across Cutaway Sides (`-2,100 ms` JS CPU):**
   - In `game/training-camera-collision.js` (`trainingMarineFade.prepareWarmup`): live `marine` is **already** swapped to `p.faded` during `begin()`, so `keeperRoot` creating 53 `p.faded` keepers duplicates live `marine` 1:1 (`-790 ms`), and keying `keeperRoot`'s `p.original` keepers by shader signature (`skeleton.bones.length` + material shader key) instead of `material.id` collapses 53 `p.original` keepers to ~10 unique keepers (`-550 ms`).
   - In `world/training-cutaway.js` (`partitionTrainingShell`): share one `(solid, fade)` material pair per `(sourceMaterial, sideGroupOpacityBucket)` or deduplicate across cutaway groups during `compileForLiveTarget()` via the fixed `drawablePipelineSig` (`-760 ms`).

### 2. What Moves to Background Safely Now That We Pinpointed the Exact Three.js WebGPU Bug (`-900 ms` Blackout Savings)
- **Why earlier background `compileAsync` broke `DWInspect` (`setPipeline(undefined)` + read/write texture scope error):**
  - Confirmed in `vendor/three/three.webgpu.js:27341 & 67326`: during `compileAsync`, `_getRenderPipeline` **synchronously** inserts `new RenderPipeline` into `renderer._pipelines.caches` and assigns `renderObject.pipeline = pipeline` while `pipelineData.pipeline` is still `undefined` awaiting `device.createRenderPipelineAsync()`. Any `render()` on an overlapping cache key or `RenderObject` before that promise resolves calls `passEncoder.setPipeline(undefined)`, aborting the render pass while `scenePassNode.renderTarget` is still writable!
- **How to move the 11 unissued weapons (`3P` `weaponMeshes` `474 ms` + `1P` `viewmodel` `412 ms` = `~886 ms`) to post-blackout background slices with 100% mathematical safety:**
  1. **Blackout warms only `['pistol']`** (the sole holstered weapon on entry; the other 11 require walking to CIF/Kiosk/Armory).
  2. **Guard:** Never run background slices when `!training.active || INSPECT || window.DWInspect || window.DWInspectHost`.
  3. **Atomic Pipeline Cache Staging:** Around each 1-weapon background `compileForLiveTarget()` slice (~35 ms sync JS for 1 weapon), snapshot `renderer._pipelines.caches` keys before the call, **immediately delete** any newly added key whose `renderer.backend.get(pipe)?.pipeline` is `undefined` in the same JS turn (before yielding to `requestAnimationFrame`), and re-insert `[key, pipe]` into `renderer._pipelines.caches` inside `pSlice.then()` **only after** `createRenderPipelineAsync` has populated `pipelineData.pipeline`! Keep the 1P `bgGroup` unattached (`visible = false`) and 3P weapon hidden until `pSlice.then()` resolves so no live `RenderObject` can ever reference an unready pipeline.

### 3. What Could Be Cached Across Re-Entries (`~800 ms` Saved on 2nd+ Entry)
- `enterTraining()` already caches `training.tg`, `training.copies`, `training.perimeter`, and `training.wreck` after the first visit (`1,132 ms` -> `< 120 ms` on re-entry). Caching the built `cutawayKeepers` group on `training.tg` and keeping `gunCache` populated in `viewmodel` makes subsequent Training entries `< 1.2 s`.

### ProjectedCold Entry Result on RTX 5080 WebGPU
- **Cold 3P Blackout:** `8,803 ms` − `650 ms` (`warmFrame` misses) − `2,100 ms` (duplicate marine/cutaway fade keepers) − `890 ms` (11 unissued 1P+3P weapons moved to atomic background slices) = **`~5.1 s`** (`~4.2 s` in Cold 1P), with `0` Inspector/gameplay renderer errors and `< 25 ms` post-blackout / cutaway / first-draw frames.
